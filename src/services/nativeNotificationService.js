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
   * Play real-time alert audio (HTML5 audio / Web Audio)
   */
  playChime(type = 'customer') {
    try {
      const soundMap = {
        kitchen: '/sounds/kitchen_alert.wav',
        owner: '/sounds/owner_alert.wav',
        delivery: '/sounds/delivery_alert.wav',
        customer: '/sounds/customer_ping.wav',
      };
      const soundSrc = soundMap[type] || soundMap.customer;

      // Try playing audio file first
      if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
        const audio = new Audio(soundSrc);
        audio.volume = type === 'kitchen' ? 1.0 : 0.85;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this._playSynthesizedChime(type);
          });
          return;
        }
      }
    } catch {
      // fallback to synthesized chime
    }
    this._playSynthesizedChime(type);
  }

  _playSynthesizedChime(type) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      if (type === 'kitchen' || type === 'owner') {
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
        // 1. Create Android Notification Channels with custom sounds
        if (Capacitor.getPlatform() === 'android') {
          // Kitchen Staff Channel (Max urgency alert)
          await LocalNotifications.createChannel({
            id: 'kitchen_urgent',
            name: 'Kitchen Order Alerts',
            description: 'High-priority alerts with custom sound for incoming kitchen orders',
            importance: 5, // High / Max importance (Heads-up banner)
            visibility: 1,
            vibration: true,
            lights: true,
            lightColor: '#E0FF33',
            sound: 'kitchen_alert.wav',
          });

          // Store Owner Channel (High priority chime)
          await LocalNotifications.createChannel({
            id: 'owner_urgent',
            name: 'Store Owner Order Alerts',
            description: 'Instant notification and sound for new customer orders',
            importance: 5,
            visibility: 1,
            vibration: true,
            lights: true,
            lightColor: '#A855F7',
            sound: 'owner_alert.wav',
          });

          // Driver Dispatch Channel
          await LocalNotifications.createChannel({
            id: 'driver_dispatch',
            name: 'Sarathi Dispatch & Pickup Alerts',
            description: 'Urgent alerts for drivers when order is packed and ready for pickup',
            importance: 5,
            visibility: 1,
            vibration: true,
            lights: true,
            lightColor: '#3B82F6',
            sound: 'delivery_alert.wav',
          });

          // Customer Order Updates Channel
          await LocalNotifications.createChannel({
            id: 'order_updates',
            name: 'Customer Order Status',
            description: 'Live milestone updates on prasad preparation and delivery',
            importance: 4,
            visibility: 1,
            vibration: true,
            sound: 'customer_ping.wav',
          });

          // System Management Alerts
          await LocalNotifications.createChannel({
            id: 'system_alerts',
            name: 'Store & Platform Alerts',
            description: 'Important platform and store management notifications',
            importance: 4,
            visibility: 1,
            sound: 'owner_alert.wav',
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
   * First-time welcome notification trigger upon permission grant
   */
  async notifyWelcomeIfFirstTime() {
    try {
      if (typeof window !== 'undefined') {
        const alreadySent = localStorage.getItem('foody_welcome_system_notif_sent');
        if (alreadySent) return;
        localStorage.setItem('foody_welcome_system_notif_sent', 'true');
      }
      await this.notifyWelcome();
    } catch (e) {
      console.warn('Welcome notification check error:', e);
    }
  }

  /**
   * Welcome notification (System OS + Sound + Haptics)
   */
  async notifyWelcome() {
    await this.hapticImpact(ImpactStyle.Light);
    this.playChime('customer');

    const title = '🙏 Welcome to Foody Vrinda!';
    const body = '100% Pure Satvik Desi Ghee Prasad & Vedic Delicacies delivered fresh in Sri Dham Vrindavan. Radhe Radhe! 🌸';

    if (this.isNative) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: 10801,
              channelId: 'system_alerts',
              smallIcon: 'ic_stat_notification',
              largeIcon: 'splash_icon',
              iconColor: '#E0FF33',
              sound: 'customer_ping.wav',
              extra: { type: 'welcome' },
            },
          ],
        });
      } catch (e) {
        console.warn('Failed to schedule welcome notification on native:', e);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/foody-vrinda-logo.webp',
          badge: '/pwa-192x192.webp',
          tag: 'foody-welcome',
        });
      } catch (e) {}
    }
  }

  /**
   * User login success notification (System OS + Sound + Haptics)
   */
  async notifyLogin(userName) {
    await this.hapticNotification(NotificationType.Success);
    this.playChime('customer');

    const cleanName = (userName || 'Devotee').trim();
    const title = `🌸 Welcome Back, ${cleanName}!`;
    const body = 'Signed in to Foody Vrinda. Savor authentic Vedic prasad prepared with devotion.';

    if (this.isNative) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Math.floor(Date.now() % 100000),
              channelId: 'system_alerts',
              smallIcon: 'ic_stat_notification',
              largeIcon: 'splash_icon',
              iconColor: '#E0FF33',
              sound: 'customer_ping.wav',
              extra: { type: 'login' },
            },
          ],
        });
      } catch (e) {
        console.warn('Failed to schedule login notification on native:', e);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/foody-vrinda-logo.webp',
          badge: '/pwa-192x192.webp',
          tag: `foody-login-${Date.now()}`,
        });
      } catch (e) {}
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
            title: `🔔 NEW BHOG ORDER #${orderId} · ₹${total}`,
            body: `${itemCount} items received! Tap to start cooking with pure Desi Ghee.`,
            id: Math.floor(Date.now() % 100000),
            channelId: 'kitchen_urgent',
            smallIcon: 'ic_stat_notification',
            largeIcon: 'splash_icon',
            iconColor: '#E0FF33',
            sound: 'kitchen_alert.wav',
            extra: { orderId: order.id, type: 'kitchen' },
          },
        ],
      });
    } catch (e) {
      console.warn('Failed to schedule kitchen notification:', e);
    }
  }

  /**
   * Store Owner: Alert when a new order is placed
   */
  async notifyOwnerNewOrder(order) {
    await this.hapticNotification(NotificationType.Success);
    this.playChime('owner');
    if (!this.isNative) return;

    try {
      const orderId = order.id ? String(order.id).slice(-4).toUpperCase() : '108';
      const itemCount = order.items ? order.items.length : 1;
      const total = order.total_amount || order.totalAmount || 0;
      const customerName = order.customer_name || order.customerName || 'Devotee';

      await LocalNotifications.schedule({
        notifications: [
          {
            title: `💰 NEW ORDER #${orderId} · ₹${total}`,
            body: `${customerName} ordered ${itemCount} items. Tap to view live order stream.`,
            id: Math.floor(Date.now() % 100000),
            channelId: 'owner_urgent',
            smallIcon: 'ic_stat_notification',
            largeIcon: 'splash_icon',
            iconColor: '#E0FF33',
            sound: 'owner_alert.wav',
            extra: { orderId: order.id, type: 'owner' },
          },
        ],
      });
    } catch (e) {
      console.warn('Failed to schedule owner order notification:', e);
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
            body: `Freshly packed for express delivery to ${address}. Tap to navigate.`,
            id: Math.floor(Date.now() % 100000),
            channelId: 'driver_dispatch',
            smallIcon: 'ic_stat_notification',
            largeIcon: 'splash_icon',
            iconColor: '#E0FF33',
            sound: 'delivery_alert.wav',
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
          body = `Your prasad is being freshly cooked in pure Desi Ghee with devotion.`;
          break;
        case 'ready':
        case 'ready_for_pickup':
          title = `✨ Prasad Packed & Blessed #${orderId}`;
          body = `Awaiting express Sarathi express pickup from the sacred kitchen.`;
          break;
        case 'out_for_delivery':
        case 'dispatched':
          title = `🛵 Sarathi En Route #${orderId}`;
          body = `Your sacred prasad is on its way with live GPS express tracking.`;
          break;
        case 'delivered':
        case 'completed':
          title = `🌸 Prasad Delivered Safely #${orderId}`;
          body = `Savor the divine blessings of Sri Dham Vrindavan. Radhe Radhe! 🙏`;
          break;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Date.now() % 100000),
            channelId: 'order_updates',
            smallIcon: 'ic_stat_notification',
            largeIcon: 'splash_icon',
            iconColor: '#E0FF33',
            sound: 'customer_ping.wav',
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
    this.playChime('owner');
    if (!this.isNative) return;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: `👑 ${title}`,
            body: message,
            id: Math.floor(Date.now() % 100000),
            channelId: 'system_alerts',
            smallIcon: 'ic_stat_notification',
            largeIcon: 'splash_icon',
            iconColor: '#E0FF33',
            sound: 'owner_alert.wav',
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
