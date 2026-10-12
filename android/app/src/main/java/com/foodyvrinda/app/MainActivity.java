package com.foodyvrinda.app;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(FoodyContinuousAlarmPlugin.class);
        super.onCreate(savedInstanceState);

        // 1. Enable full hardware acceleration on the Window
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        // 2. Negotiate highest available display refresh rate (90Hz / 120Hz / 144Hz)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Display display = getWindowManager().getDefaultDisplay();
                Display.Mode[] modes = display.getSupportedModes();
                Display.Mode maxMode = null;
                for (Display.Mode mode : modes) {
                    if (maxMode == null || mode.getRefreshRate() > maxMode.getRefreshRate()) {
                        maxMode = mode;
                    }
                }
                if (maxMode != null) {
                    WindowManager.LayoutParams layoutParams = getWindow().getAttributes();
                    layoutParams.preferredDisplayModeId = maxMode.getModeId();
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        layoutParams.preferredRefreshRate = maxMode.getRefreshRate();
                    }
                    getWindow().setAttributes(layoutParams);
                }
            }
        } catch (Exception e) {
            // Graceful fallback
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // User has opened or returned to the app: silence persistent notification alarm immediately
        FoodyContinuousAlarmPlugin.stopActiveAlarm(this);
    }

    @Override
    public void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // User tapped notification or incoming intent: silence persistent notification alarm
        FoodyContinuousAlarmPlugin.stopActiveAlarm(this);
    }
}
