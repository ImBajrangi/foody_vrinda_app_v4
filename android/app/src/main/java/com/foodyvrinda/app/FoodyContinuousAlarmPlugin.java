package com.foodyvrinda.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FoodyContinuousAlarm")
public class FoodyContinuousAlarmPlugin extends Plugin {

    private static final String TAG = "FoodyContinuousAlarm";
    private static MediaPlayer activeMediaPlayer = null;
    private static boolean isAlarmRinging = false;
    private static String activeOrderId = null;

    @PluginMethod
    public void startAlarm(PluginCall call) {
        String title = call.getString("title", "New Order Alert");
        String body = call.getString("body", "Incoming order requires your action");
        String sound = call.getString("sound", "kitchen_alert.wav");
        String channelId = call.getString("channelId", "kitchen_urgent");
        String orderId = call.getString("orderId", "");
        int id = call.getInt("id", 108108);

        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        try {
            isAlarmRinging = true;
            activeOrderId = orderId;

            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

            // 1. Resolve Audio Resource
            String soundBaseName = sound != null ? sound.replace(".wav", "").replace(".mp3", "") : "kitchen_alert";
            int soundResId = context.getResources().getIdentifier(soundBaseName, "raw", context.getPackageName());
            Uri soundUri = null;
            if (soundResId != 0) {
                soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/" + soundResId);
            }

            // 2. Ensure Android Notification Channel with USAGE_ALARM
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && notificationManager != null) {
                NotificationChannel channel = notificationManager.getNotificationChannel(channelId);
                if (channel == null) {
                    String channelName = "Urgent Order Alerts";
                    if (channelId.contains("kitchen")) channelName = "Kitchen Order Alerts";
                    else if (channelId.contains("owner")) channelName = "Store Owner Order Alerts";
                    else if (channelId.contains("driver") || channelId.contains("delivery")) channelName = "Delivery Dispatch Alerts";

                    channel = new NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_HIGH);
                    channel.setDescription("High-priority order notifications with repeating sound until app opened");
                    channel.enableVibration(true);
                    channel.setVibrationPattern(new long[]{0, 500, 250, 500, 250, 500});
                    channel.enableLights(true);
                    channel.setLightColor(Color.parseColor("#FD9139"));
                    channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

                    if (soundUri != null) {
                        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .build();
                        channel.setSound(soundUri, audioAttributes);
                    }
                    notificationManager.createNotificationChannel(channel);
                }
            }

            // 3. Create Intent to open MainActivity
            Intent intent = new Intent(context, MainActivity.class);
            intent.setAction(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_LAUNCHER);
            intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            intent.putExtra("orderId", orderId);
            intent.putExtra("fromAlarm", true);

            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent contentIntent = PendingIntent.getActivity(context, id, intent, pendingFlags);

            // 4. Build Notification with FLAG_INSISTENT for continuous repetition
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setSmallIcon(R.drawable.ic_stat_notification)
                    .setColor(Color.parseColor("#FD9139"))
                    .setContentIntent(contentIntent)
                    .setFullScreenIntent(contentIntent, true)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setOngoing(true)
                    .setAutoCancel(true);

            if (soundUri != null) {
                builder.setSound(soundUri, AudioManager.STREAM_ALARM);
            }

            Notification notification = builder.build();
            // Critical: FLAG_INSISTENT instructs Android OS to loop the sound indefinitely until notification is opened or cancelled
            notification.flags |= Notification.FLAG_INSISTENT;
            notification.flags |= Notification.FLAG_ONGOING_EVENT;

            if (notificationManager != null) {
                notificationManager.notify(id, notification);
            }

            // 5. Start Native Looping Audio Stream (Guarantees loud continuous ring even if vendor modifies NotificationPlayer)
            if (soundResId != 0) {
                startNativeLoopingAudio(context, soundResId);
            }

            // 6. Start Native Repeating Haptic Vibration
            startNativeVibration(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("ringing", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start continuous alarm", e);
            call.reject("Error starting alarm: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        Context context = getContext();
        if (context != null) {
            stopActiveAlarm(context);
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("ringing", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void isAlarmActive(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ringing", isAlarmRinging);
        ret.put("orderId", activeOrderId);
        call.resolve(ret);
    }

    /**
     * Globally stop all persistent alarms, cancel ongoing notifications, and silence sound.
     * Called whenever MainActivity resumes (app opened by user) or user acknowledges the order.
     */
    public static synchronized void stopActiveAlarm(Context context) {
        isAlarmRinging = false;
        activeOrderId = null;

        // 1. Stop and release MediaPlayer
        try {
            if (activeMediaPlayer != null) {
                if (activeMediaPlayer.isPlaying()) {
                    activeMediaPlayer.stop();
                }
                activeMediaPlayer.release();
                activeMediaPlayer = null;
            }
        } catch (Exception e) {
            Log.w(TAG, "Error stopping media player", e);
        }

        // 2. Cancel Insistent Ongoing Notifications
        try {
            if (context != null) {
                NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (notificationManager != null) {
                    notificationManager.cancel(108108);
                    notificationManager.cancel(108109);
                    notificationManager.cancel(108110);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error cancelling notification", e);
        }

        // 3. Cancel Vibrator
        try {
            if (context != null) {
                Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator != null) {
                    vibrator.cancel();
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error cancelling vibration", e);
        }
    }

    private static synchronized void startNativeLoopingAudio(Context context, int soundResId) {
        try {
            if (activeMediaPlayer != null) {
                try {
                    activeMediaPlayer.stop();
                    activeMediaPlayer.release();
                } catch (Exception ignored) {}
                activeMediaPlayer = null;
            }

            activeMediaPlayer = MediaPlayer.create(context, soundResId);
            if (activeMediaPlayer != null) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build();
                activeMediaPlayer.setAudioAttributes(audioAttributes);
                activeMediaPlayer.setLooping(true);
                activeMediaPlayer.setVolume(1.0f, 1.0f);
                activeMediaPlayer.start();
            }
        } catch (Exception e) {
            Log.w(TAG, "Native looping audio start error", e);
        }
    }

    private static void startNativeVibration(Context context) {
        try {
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = new long[]{0, 600, 300, 600, 300, 800};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0)); // 0 = repeat indefinite
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Native vibration start error", e);
        }
    }
}
