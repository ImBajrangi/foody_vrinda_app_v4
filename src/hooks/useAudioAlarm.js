import { useState, useEffect, useRef, useCallback } from 'react';

// Global Singleton Web Audio Context to avoid context proliferation
let globalAudioCtx = null;

function getAudioContext(createIfMissing = false) {
  if (!globalAudioCtx && createIfMissing && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      try {
        globalAudioCtx = new AudioContextClass();
      } catch (e) {}
    }
  }
  return globalAudioCtx;
}

export function useAudioAlarm() {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [audioState, setAudioState] = useState('suspended');
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null); // { role, title, orderId, order }
  const [volume, setVolumeState] = useState(() => {
    try {
      const saved = localStorage.getItem('foody_alarm_volume');
      return saved !== null ? parseFloat(saved) : 0.85;
    } catch (e) {
      return 0.85;
    }
  });
  const [notificationPermission, setNotificationPermission] = useState(() => {
    return (typeof window !== 'undefined' && 'Notification' in window) ? Notification.permission : 'default';
  });
  
  const loopTimerRef = useRef(null);
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(volume);

  const setVolume = useCallback((val) => {
    const clamped = Math.max(0, Math.min(1, val));
    volumeRef.current = clamped;
    setVolumeState(clamped);
    try {
      localStorage.setItem('foody_alarm_volume', clamped.toString());
    } catch (e) {}
  }, []);

  // Check state of AudioContext without triggering eager creation
  const syncAudioState = useCallback(() => {
    const ctx = getAudioContext(false);
    if (ctx) {
      setAudioState(ctx.state);
      setAudioUnlocked(ctx.state === 'running');
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request browser notification permissions for staff
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        return perm === 'granted';
      } catch (e) {
        console.warn("Notification permission request note:", e);
      }
    }
    return false;
  }, []);

  // Auto-unlock AudioContext on user interaction in the viewport
  const unlockAudio = useCallback(async () => {
    try {
      const ctx = getAudioContext(true);
      if (ctx) {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        setAudioState(ctx.state);
        setAudioUnlocked(ctx.state === 'running');
      }
    } catch (e) {
      console.warn("Audio unlock attempt note:", e);
    }
  }, []);

  // Explicit warm-up with subtle micro-click
  const warmUpAudio = useCallback(async () => {
    await unlockAudio();
    const ctx = getAudioContext(true);
    if (ctx && ctx.state === 'running') {
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } catch (e) {}
    }
  }, [unlockAudio]);

  useEffect(() => {
    syncAudioState();

    const handleFirstInteraction = () => {
      unlockAudio();
    };

    window.addEventListener('click', handleFirstInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });
    document.addEventListener('visibilitychange', syncAudioState);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('visibilitychange', syncAudioState);
    };
  }, [unlockAudio, syncAudioState]);

  // 1. Synthesize Kitchen Buzzer (Urgent Dual-Tone Pulsing Alarm)
  const synthesizeKitchenTone = useCallback(() => {
    const ctx = getAudioContext(true);
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const vol = volumeRef.current;
    
    // Dual Oscillator for piercing kitchen-grade acoustic cut
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.setValueAtTime(1174, now + 0.12); // D6

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.setValueAtTime(1174, now + 0.12);

    // Punchy envelope scaled by volume
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.35 * vol, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.2 * vol, now + 0.12);
    gainNode.gain.exponentialRampToValueAtTime(0.4 * vol, now + 0.14);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);

    // Haptic vibration on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } catch (e) {}
    }
  }, []);

  // 2. Synthesize Delivery Rider Chime (Bright Ascending 3-Tone Pickup Ping)
  const synthesizeDeliveryTone = useCallback(() => {
    const ctx = getAudioContext(true);
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const vol = volumeRef.current;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5 -> E5 -> G5 -> C6

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const noteTime = now + (idx * 0.1);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gainNode.gain.setValueAtTime(0.001, noteTime);
      gainNode.gain.exponentialRampToValueAtTime(0.3 * vol, noteTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.28);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.3);
    });

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([150, 100, 250]);
      } catch (e) {}
    }
  }, []);

  // 3. Synthesize Owner/Admin Luxury Resonant Bell
  const synthesizeOwnerTone = useCallback(() => {
    const ctx = getAudioContext(true);
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const vol = volumeRef.current;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.50, now);
    osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.35 * vol, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.9);
  }, []);

  // 4. Synthesize Customer Blessing Prasad Bell
  const synthesizeCustomerTone = useCallback(() => {
    const ctx = getAudioContext(true);
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const vol = volumeRef.current;
    [528, 660].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = now + (i * 0.12);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gainNode.gain.setValueAtTime(0.001, t);
      gainNode.gain.exponentialRampToValueAtTime(0.25 * vol, t + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.75);
    });
  }, []);

  // Stop Active Alarm
  const stopAlarm = useCallback(() => {
    if (loopTimerRef.current) {
      clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    setActiveAlert(null);
  }, []);

  // Trigger Role-Tailored Alarm
  const playRoleAlarm = useCallback((role = 'kitchen', alertInfo = null, loop = true) => {
    const ctx = getAudioContext(true);
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (alertInfo) {
      setActiveAlert({
        role,
        title: alertInfo.title || (role === 'kitchen' ? 'NEW KITCHEN ORDER' : 'ORDER READY FOR PICKUP'),
        orderId: alertInfo.orderId || alertInfo.order?.id || '',
        order: alertInfo.order || null
      });
    }

    const playTone = () => {
      switch (role) {
        case 'kitchen':
          synthesizeKitchenTone();
          break;
        case 'delivery':
          synthesizeDeliveryTone();
          break;
        case 'owner':
          synthesizeOwnerTone();
          break;
        case 'customer':
          synthesizeCustomerTone();
          break;
        default:
          synthesizeKitchenTone();
      }
    };

    // Play immediate first blast
    playTone();
    setIsPlaying(true);
    isPlayingRef.current = true;

    if (loopTimerRef.current) {
      clearInterval(loopTimerRef.current);
    }

    if (loop) {
      const intervalMs = role === 'kitchen' ? 1400 : 2200;
      loopTimerRef.current = setInterval(() => {
        if (isPlayingRef.current) {
          playTone();
        } else {
          clearInterval(loopTimerRef.current);
          loopTimerRef.current = null;
        }
      }, intervalMs);

      // Auto-timeout after 45 seconds to prevent runaway ringing if staff is away
      setTimeout(() => {
        if (isPlayingRef.current) {
          stopAlarm();
        }
      }, 45000);
    }
  }, [synthesizeKitchenTone, synthesizeDeliveryTone, synthesizeOwnerTone, synthesizeCustomerTone, stopAlarm]);

  // Backward compatibility wrapper
  const playAlarm = useCallback(() => {
    playRoleAlarm('kitchen', { title: 'ORDER RECEIVED' }, true);
  }, [playRoleAlarm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loopTimerRef.current) {
        clearInterval(loopTimerRef.current);
      }
    };
  }, []);

  return {
    audioUnlocked,
    audioState,
    isPlaying,
    activeAlert,
    volume,
    setVolume,
    notificationPermission,
    requestNotificationPermission,
    warmUpAudio,
    enableAudio: unlockAudio,
    playRoleAlarm,
    playAlarm,
    stopAlarm
  };
}
