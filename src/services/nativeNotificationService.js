import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const NOTIFICATION_TRIALS = [
  {
    id: 'natural_water_drop',
    name: 'Natural Water Droplet',
    description: 'Organic fluid droplet with soft capillary ripple • Pure, calming & effortless',
    duration: '220ms',
    soundSrc: '/sounds/trials/natural_water_drop.wav',
    vibe: 'Organic Fluid (Velvety Smooth)'
  },
  {
    id: 'soft_pulse',
    name: 'Soft Pulse (Warm Piano)',
    description: 'Warm electric piano with smooth low-pass (A4 → C#5) • Subtle & polished',
    duration: '180ms',
    soundSrc: '/sounds/trials/soft_pulse.wav',
    vibe: 'Warm Electric Piano (Smooth & Polished)'
  },
  {
    id: 'warm_wood_kalimba',
    name: 'Warm Wood Kalimba',
    description: 'Handcrafted acoustic thumb piano tine • Warm wooden resonance, zero harshness',
    duration: '260ms',
    soundSrc: '/sounds/trials/warm_wood_kalimba.wav',
    vibe: 'Acoustic Wood (Soft & Cozy)'
  },
  {
    id: 'soft_felt_piano',
    name: 'Soft Felt Piano Dew',
    description: 'Intimate felt-damped acoustic piano key • Elegant, warm & understated',
    duration: '280ms',
    soundSrc: '/sounds/trials/soft_felt_piano.wav',
    vibe: 'Felt Acoustic Piano (Natural Grace)'
  },
  {
    id: 'silk_morning_chime',
    name: 'Silk Morning Chime',
    description: 'Floating harmonic dyad with soft air decay • Gentle sunrise feeling',
    duration: '300ms',
    soundSrc: '/sounds/trials/silk_morning_chime.wav',
    vibe: 'Airy Acoustic (Silky Smooth)'
  },
  {
    id: 'bamboo_zen_tap',
    name: 'Bamboo Zen Tap',
    description: 'Hollow organic bamboo wood tap • Earthy, natural & quiet',
    duration: '180ms',
    soundSrc: '/sounds/trials/bamboo_zen_tap.wav',
    vibe: 'Zen Nature (Earthy Hollow Tap)'
  },
  {
    id: 'trial3',
    name: 'Vedic Singing Bowl (432 Hz)',
    description: 'Calming 432 Hz bronze bowl harmonic shimmer • Sacred peace',
    duration: '550ms',
    soundSrc: '/sounds/trials/trial3_vedic_singing_bowl.wav',
    vibe: 'Sacred Spiritual (Vedic Temple tone)'
  },
  {
    id: 'trial2',
    name: 'Celestial Marimba',
    description: 'Warm dual acoustic chime (E5 → B5) • Soft & friendly',
    duration: '260ms',
    soundSrc: '/sounds/trials/trial2_celestial_marimba.wav',
    vibe: 'Warm Acoustic (Slack/Airbnb style)'
  },
  {
    id: 'google_sprout',
    name: 'Pixel Sprout / Soft Drop',
    description: 'Subtle rounded wood-drop tap • Warm, quiet & focused',
    duration: '130ms',
    soundSrc: '/sounds/trials/google_sprout.wav',
    vibe: 'Google Pixel (Soft Acoustic)'
  }
];

class NativeNotificationService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.initialized = false;
    this.audioCtx = null;
  }

  getActiveTrial() {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('foody_notification_sound_trial') || 'natural_water_drop';
    }
    return 'natural_water_drop';
  }

  getDevotionalTone() {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('foody_devotional_notifications') === 'true';
    }
    return false; // Professional & direct by default
  }

  setDevotionalTone(enabled) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('foody_devotional_notifications', enabled ? 'true' : 'false');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('foody:devotional-tone-changed', { detail: { enabled } }));
      }
    }
  }

  getActiveTrialSoundFile() {
    const trialId = this.getActiveTrial();
    const trial = NOTIFICATION_TRIALS.find(t => t.id === trialId) || NOTIFICATION_TRIALS[0];
    return trial?.soundSrc ? trial.soundSrc.split('/').pop() : 'natural_water_drop.wav';
  }

  async setActiveTrial(trialId) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('foody_notification_sound_trial', trialId);
    }
    const trial = NOTIFICATION_TRIALS.find(t => t.id === trialId) || NOTIFICATION_TRIALS[0];
    const soundFileName = trial?.soundSrc ? trial.soundSrc.split('/').pop() : 'natural_water_drop.wav';

    // Directly reconfigure Android notification channel on native phone system
    if (this.isNative && Capacitor.getPlatform() === 'android') {
      try {
        await LocalNotifications.createChannel({
          id: 'order_updates',
          name: 'Customer Order Status',
          description: 'Live milestone updates on prasad preparation and delivery',
          importance: 4,
          visibility: 1,
          vibration: true,
          sound: soundFileName,
        });
      } catch (e) {
        console.warn('Channel sound update error:', e);
      }
    }
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
   * Preview a specific notification sound trial
   */
  playTrialSound(trialId = 'natural_water_drop') {
    const trial = NOTIFICATION_TRIALS.find(t => t.id === trialId) || NOTIFICATION_TRIALS[0];
    try {
      if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
        const audio = new Audio(trial.soundSrc);
        audio.volume = 0.8;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this._playSynthesizedTrial(trialId);
          });
          return;
        }
      }
    } catch {
      // fallback to synthesized
    }
    this._playSynthesizedTrial(trialId);
  }

  /**
   * Play real-time alert audio (HTML5 audio / Web Audio) using active trial
   */
  playChime(type = 'customer') {
    try {
      const activeTrialId = this.getActiveTrial();
      const activeTrial = NOTIFICATION_TRIALS.find(t => t.id === activeTrialId) || NOTIFICATION_TRIALS[0];

      const soundMap = {
        kitchen: '/sounds/kitchen_alert.wav',
        owner: '/sounds/owner_alert.wav',
        delivery: '/sounds/delivery_alert.wav',
        customer: activeTrial.soundSrc,
      };
      const soundSrc = soundMap[type] || activeTrial.soundSrc;

      // Try playing audio file first
      if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
        const audio = new Audio(soundSrc);
        audio.volume = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this._playSynthesizedTrial(activeTrialId);
          });
          return;
        }
      }
    } catch {
      // fallback to synthesized chime
    }
    this._playSynthesizedTrial(this.getActiveTrial());
  }

  _playSynthesizedTrial(trialId = 'natural_water_drop') {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      if (trialId === 'natural_water_drop') {
        // Natural Water Droplet: 1050Hz downward swoop to 720Hz + 380Hz low bubble body
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, now);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1050, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.12);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.24, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.23);
      } else if (trialId === 'soft_pulse') {
        // Soft Pulse (A4 -> C#5, warm electric piano triangle wave with 3200Hz lowpass filter)
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, now);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.setValueAtTime(554.37, now + 0.035); // C#5

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
      } else if (trialId === 'warm_wood_kalimba') {
        // Kalimba: F#5 (740Hz) with 185Hz wood resonance
        [
          { freq: 739.99, gVal: 0.22, decay: 0.24, type: 'sine' },
          { freq: 185.00, gVal: 0.15, decay: 0.16, type: 'sine' }
        ].forEach(({ freq, gVal, decay, type }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2000, now);

          osc.type = type;
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(gVal, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + decay + 0.02);
        });
      } else if (trialId === 'soft_felt_piano') {
        // Soft Felt Piano: E5 (659Hz) + G#5 (830Hz)
        [
          { freq: 659.25, gVal: 0.20, decay: 0.26 },
          { freq: 830.61, gVal: 0.12, decay: 0.22 }
        ].forEach(({ freq, gVal, decay }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1600, now);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(gVal, now + 0.018);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + decay + 0.02);
        });
      } else if (trialId === 'silk_morning_chime') {
        // Silk Morning: A5 (880Hz) + F#6 (1480Hz)
        [
          { freq: 880.00, gVal: 0.18, offset: 0, decay: 0.28 },
          { freq: 1479.98, gVal: 0.14, offset: 0.03, decay: 0.26 }
        ].forEach(({ freq, gVal, offset, decay }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2200, now);

          const t = now + offset;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(gVal, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + decay + 0.02);
        });
      } else if (trialId === 'bamboo_zen_tap') {
        // Bamboo Zen: 850Hz cylinder + 425Hz cavity
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, now);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.exponentialRampToValueAtTime(425, now + 0.08);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
      } else if (trialId === 'trial3') {
        // Vedic Temple Sing: 432Hz + 435.5Hz beating warmth
        [432.0, 435.5].forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.55);
        });
      } else if (trialId === 'trial2') {
        // Celestial Marimba: E5 -> B5 warm triangle notes
        [659.25, 987.77].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + (idx * 0.09);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.exponentialRampToValueAtTime(0.22, t + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.24);
        });
      } else if (trialId === 'google_sprout') {
        // Pixel Sprout: 1046Hz soft rounded wood tap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1046.5, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.25, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      } else {
        // Fallback default: Natural Water Droplet
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.20, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch {
      // ignore
    }
  }

  _playSynthesizedChime(type) {
    this._playSynthesizedTrial(this.getActiveTrial());
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

          // Customer Order Updates Channel (plays selected natural/acoustic sound)
          const activeCustomerSound = this.getActiveTrialSoundFile();
          await LocalNotifications.createChannel({
            id: 'order_updates',
            name: 'Customer Order Status',
            description: 'Live milestone updates on prasad preparation and delivery',
            importance: 5,
            visibility: 1,
            vibration: true,
            lights: true,
            lightColor: '#E0FF33',
            sound: activeCustomerSound,
          });

          // System Management Alerts
          await LocalNotifications.createChannel({
            id: 'system_alerts',
            name: 'Store & Platform Alerts',
            description: 'Important platform and store management notifications',
            importance: 4,
            visibility: 1,
            sound: activeCustomerSound,
          });
        }

        // 2. Attach Push Event Listeners FIRST (before register to never miss token)
        try {
          await PushNotifications.addListener('registration', (token) => {
            console.log('✅ FCM Push Registration Token received:', token?.value);
            if (token?.value && typeof window !== 'undefined') {
              localStorage.setItem('foody_fcm_token', token.value);
              window.dispatchEvent(new CustomEvent('foody:fcm-token-received', { detail: { token: token.value } }));
            }
          });

          await PushNotifications.addListener('registrationError', (err) => {
            console.warn('❌ FCM Push Registration Error:', err);
          });

          await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('📥 Push notification received in foreground:', notification);
            this.playChime('customer');
            this.hapticNotification(NotificationType.Success);
          });

          await PushNotifications.addListener('pushNotificationActionPerformed', (notificationAction) => {
            console.log('👆 Push notification tapped:', notificationAction);
            const data = notificationAction?.notification?.data;
            if (data?.orderId && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('foody:open-notification-order', {
                detail: { orderId: data.orderId, type: data.type || 'order' }
              }));
            }
          });
        } catch (e) {
          console.warn('Push notification listener setup error:', e);
        }

        // 3. Request Permissions and Register FCM
        try {
          let pushPerm = await PushNotifications.checkPermissions();
          if (pushPerm.receive !== 'granted') {
            pushPerm = await PushNotifications.requestPermissions();
          }
          console.log('System push notification permissions:', pushPerm);
          if (pushPerm.receive === 'granted') {
            await PushNotifications.register();
          }
        } catch (e) {
          console.warn('Push notification permission/register error:', e);
        }

        // 4. Request System Local Notification Permissions
        try {
          const localPerm = await LocalNotifications.requestPermissions();
          console.log('System local notification permissions:', localPerm);
        } catch (e) {
          console.warn('Local notification permission request error:', e);
        }

        // 5. Register tap action listener on local notifications
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
   * Get current stored FCM Push Token
   */
  getFCMToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('foody_fcm_token') || null;
    }
    return null;
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
              sound: this.getActiveTrialSoundFile(),
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
              sound: this.getActiveTrialSoundFile(),
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
   * Helper to get personalized item summary and customer name
   */
  _getOrderDetails(order) {
    const isDevotional = order?.devotional_mode ?? this.getDevotionalTone();
    const items = Array.isArray(order?.items)
      ? order.items
      : (typeof order?.items === 'string' ? (() => { try { return JSON.parse(order.items); } catch (_) { return []; } })() : []);
    const defaultItem = isDevotional ? 'Vedic Prasad' : 'Food Order';
    const firstItem = items[0]?.name || items[0]?.title || defaultItem;
    const extra = items.length > 1 
      ? ` (+${items.length - 1} more)` 
      : (items[0]?.quantity > 1 ? ` (x${items[0].quantity})` : '');
    const itemsSummary = `${firstItem}${extra}`;
    const customerFullName = (order?.customer_name || order?.customerName || order?.user_name || order?.userName || order?.delivery_address?.name || (isDevotional ? 'Bhakta' : 'Customer')).trim();
    const customerFirstName = customerFullName.split(' ')[0] || (isDevotional ? 'Bhakta' : 'Customer');
    const total = order?.total_amount || order?.totalAmount || 0;
    return { itemsSummary, customerFullName, customerFirstName, total, isDevotional };
  }

  /**
   * Kitchen Staff: Alert when a new order is received
   */
  async notifyKitchenNewOrder(order) {
    await this.hapticNotification(NotificationType.Warning);
    this.playChime('kitchen');
    if (!this.isNative) return;

    try {
      const { itemsSummary, customerFullName, total, isDevotional } = this._getOrderDetails(order);
      const title = isDevotional 
        ? `🔔 NEW BHOG: ${itemsSummary} · ₹${total}` 
        : `🔔 New Order: ${itemsSummary} · ₹${total}`;
      const body = isDevotional 
        ? `Ordered by ${customerFullName}. Tap to start cooking with pure Desi Ghee!`
        : `Customer: ${customerFullName} · Tap to accept & start preparation.`;

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
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
      const { itemsSummary, customerFullName, total, isDevotional } = this._getOrderDetails(order);
      const title = isDevotional 
        ? `💰 NEW ORDER: ${itemsSummary} · ₹${total}` 
        : `💰 New Order: ${itemsSummary} · ₹${total}`;
      const body = isDevotional 
        ? `Placed by ${customerFullName}. Tap to view live order stream.`
        : `Order received from ${customerFullName} · Total ₹${total}. Tap to view.`;

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
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
      const { itemsSummary, customerFullName, isDevotional } = this._getOrderDetails(order);
      const title = isDevotional 
        ? `✨ READY FOR PICKUP: ${itemsSummary}` 
        : `🛵 Ready for Pickup: ${itemsSummary}`;
      const body = isDevotional 
        ? `Order for ${customerFullName} is packed & hot. Tap to view navigation.`
        : `Order for ${customerFullName} is packed & ready on counter. Tap to navigate.`;

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
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
      const { itemsSummary, customerFirstName, isDevotional } = this._getOrderDetails(order);
      let title = isDevotional ? `🍛 ${itemsSummary} Update` : `Order Update: ${itemsSummary}`;
      let body = `Your order status changed to ${status}`;

      switch (status?.toLowerCase()) {
        case 'new':
          title = isDevotional ? `🙏 ${itemsSummary} Confirmed!` : `Order Confirmed: ${itemsSummary}`;
          body = isDevotional 
            ? `Thank you ${customerFirstName}! Freshly prepared with pure Desi Ghee.`
            : `Thank you ${customerFirstName}! Your order has been placed and sent to the kitchen.`;
          break;
        case 'cooking':
        case 'preparing':
          title = isDevotional ? `🔥 Cooking: ${itemsSummary}` : `Preparing: ${itemsSummary}`;
          body = isDevotional 
            ? `Your prasad is being freshly cooked in pure Desi Ghee with devotion.`
            : `The kitchen has started preparing your fresh food.`;
          break;
        case 'ready':
        case 'ready_for_pickup':
          title = isDevotional ? `✨ ${itemsSummary} Packed & Blessed` : `Order Ready: ${itemsSummary}`;
          body = isDevotional 
            ? `Packed hot and ready for express Sarathi delivery, ${customerFirstName}!`
            : `Your order is packed and ready for delivery pickup, ${customerFirstName}.`;
          break;
        case 'out_for_delivery':
        case 'dispatched':
          title = isDevotional ? `🛵 Sarathi En Route with ${itemsSummary}` : `Out for Delivery: ${itemsSummary}`;
          body = isDevotional 
            ? `Your sacred prasad is on its way with live GPS express tracking.`
            : `Your order is on the way with delivery partner. Track live on map.`;
          break;
        case 'delivered':
        case 'completed':
          title = isDevotional ? `🌸 ${itemsSummary} Delivered!` : `Order Delivered: ${itemsSummary}`;
          body = isDevotional 
            ? `Savor the divine blessings of Sri Dham Vrindavan, ${customerFirstName}. Radhe Radhe! 🙏`
            : `Enjoy your meal, ${customerFirstName}! Thank you for ordering with Foody Vrinda.`;
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
            sound: this.getActiveTrialSoundFile(),
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
