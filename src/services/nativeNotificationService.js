import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

class NativeNotificationService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.initialized = false;
    this.audioCtx = null;
  }

  getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.audioCtx = new AudioCtx();
        } catch {
          // ignore
        }
      }
    }
    return this.audioCtx;
  }

  /**
   * Play an elegant synthesized chime for real-time alerts
   */
  playChime(type = 'customer') {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      if (type === 'kitchen') {
        // High-priority dual-pulse kitchen chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1174, now + 0.12);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.38);
      } else if (type === 'delivery') {
        // Bright 3-note ascending pickup ping
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + idx * 0.09;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.26);
        });
      } else {
        // Resonant Vedic prasad temple bell chime (528 Hz Solfeggio Love frequency)
        [528, 660].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + idx * 0.1;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.65);
        });
      }
    } catch {
      // ignore
    }
  }

  /**
   * Initialize notification channels (Android), listeners, and request permissions
   */
  async init() {
    if (this.initialized) return;

    try {
      if (this.isNative) {
        // 1. Create Android Notification Channels for different roles
        if (Capacitor.getPlatform() === 'android') {
          await LocalNotifications.createChannel({
            id: 'kitchen_urgent',
            name: 'Kitchen New Order Alerts',
            description: 'High-priority alerts with sound for incoming bhog orders',
            importance: 5, // High / Max importance
            visibility: 1,
            vibration: true,
            lights: true,
            lightColor: '#E0FF33',
          });

          await LocalNotifications.createChannel({
            id: 'driver_dispatch',
            name: 'Sarathi Dispatch & Pickup Alerts',
            description: 'Urgent alerts for drivers when order is packed and ready',
            importance: 5,
            visibility: 1,
            vibration: true,
            lights: true,
            lightColor: '#3B82F6',
          });

          await LocalNotifications.createChannel({
            id: 'order_updates',
            name: 'Customer Order Status',
            description: 'Live milestone updates on prasad preparation and delivery',
            importance: 4,
            visibility: 1,
            vibration: true,
          });

          await LocalNotifications.createChannel({
            id: 'system_alerts',
            name: 'Store & Developer Alerts',
            description: 'Important platform and store management notifications',
            importance: 4,
            visibility: 1,
          });
        }

        // 2. Request System Notification Permissions
        try {
          const localPerm = await LocalNotifications.requestPermissions();
          console.log('System notification permissions:', localPerm);
        } catch (e) {
          console.warn('Notification permission request error:', e);
        }

        // 3. Register tap action listener on local notifications
        try {
          LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
            const extra = notificationAction?.notification?.extra;
            if (extra?.orderId && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('foody:open-notification-order', {
                detail: { orderId: extra.orderId, type: extra.type || 'order' }
              }));
            }
          });
        } catch (e) {
          console.warn('Local notification listener registration:', e);
        }
      }

      this.initialized = true;
    } catch (err) {
      console.warn('Native notification initialization error:', err);
    }
  }

  /**
   * Provide immediate tactile feedback on native devices
   */
  async hapticImpact(style = ImpactStyle.Medium) {
    if (this.isNative) {
      try {
        await Haptics.impact({ style });
      } catch {
        // ignore
      }
    }
  }

  async hapticNotification(type = NotificationType.Success) {
    if (this.isNative) {
      try {
        await Haptics.notification({ type });
      } catch {
        // ignore
      }
    }
  }

  /**
   * Kitchen Staff: Alert when a new order is received
   */
  async notifyKitchenNewOrder(order) {
    await this.hapticNotification(NotificationType.Warning);
    this.playChime('kitchen');
    if (!this.isNative) return;

    try {
      const orderId = order.id ? String(order.id).slice(-4).toUpperCase() : '108';
      const itemCount = order.items ? order.items.length : 1;
      const total = order.total_amount || order.totalAmount || 0;

      await LocalNotifications.schedule({
        notifications: [
          {
            title: `🔔 NEW BHOG ORDER #${orderId}`,
            body: `${itemCount} items (₹${total}) received! Tap to start preparing.`,
            id: Math.floor(Date.now() % 100000),
            channelId: 'kitchen_urgent',
            extra: { orderId: order.id, type: 'kitchen' },
          },
        ],
      });
    } catch (e) {
      console.warn('Failed to schedule kitchen notification:', e);
    }
  }

  /**
   * Sarathi / Delivery Partner: Alert when an order is ready for pickup
   */
  async notifyDriverOrderReady(order) {
    await this.hapticNotification(NotificationType.Success);
    this.playChime('delivery');
    if (!this.isNative) return;

    try {
      const orderId = order.id ? String(order.id).slice(-4).toUpperCase() : '108';
      const address = order.delivery_address || 'Vrindavan Dham';

      await LocalNotifications.schedule({
        notifications: [
          {
            title: `🛵 ORDER #${orderId} READY FOR PICKUP`,
            body: `Freshly packed for delivery to ${address}. Tap to navigate.`,
            id: Math.floor(Date.now() % 100000),
            channelId: 'driver_dispatch',
            extra: { orderId: order.id, type: 'driver' },
          },
        ],
      });
    } catch (e) {
      console.warn('Failed to schedule driver notification:', e);
    }
  }

  /**
   * Customer: Alert on milestone changes
   */
  async notifyCustomerOrderUpdate(order, status) {
    await this.hapticImpact(ImpactStyle.Light);
    this.playChime('customer');
    if (!this.isNative) return;

    try {
      const orderId = order.id ? String(order.id).slice(-4).toUpperCase() : '108';
      let title = `🍛 Order #${orderId} Update`;
      let body = `Your order status changed to ${status}`;

      switch (status?.toLowerCase()) {
        case 'cooking':
        case 'preparing':
          title = `🔥 Kitchen Simmering #${orderId}`;
          body = `Your prasad is being cooked in pure Desi Ghee!`;
          break;
        case 'ready':
          title = `✨ Prasad Blessed & Packed #${orderId}`;
          body = `Awaiting Sarathi express pickup.`;
          break;
        case 'out_for_delivery':
        case 'dispatched':
          title = `🛵 Sarathi On The Way #${orderId}`;
          body = `Your sacred prasad is en route with express GPS.`;
          break;
        case 'delivered':
        case 'completed':
          title = `🙏 Prasad Delivered Safely #${orderId}`;
          body = `Enjoy your divine meal. Radhe Radhe!`;
          break;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Date.now() % 100000),
            channelId: 'order_updates',
            extra: { orderId: order.id, status },
          },
        ],
      });
    } catch (e) {
      console.warn('Failed to schedule customer update notification:', e);
    }
  }

  /**
   * Owner & Developer: System and high-value event alerts
   */
  async notifyOwnerAlert(title, message) {
    await this.hapticNotification(NotificationType.Warning);
    this.playChime('kitchen');
    if (!this.isNative) return;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: `👑 ${title}`,
            body: message,
            id: Math.floor(Date.now() % 100000),
            channelId: 'system_alerts',
          },
        ],
      });
    } catch (e) {
      console.warn('Failed to schedule owner alert:', e);
    }
  }
}

export const nativeNotify = new NativeNotificationService();
export default nativeNotify;
