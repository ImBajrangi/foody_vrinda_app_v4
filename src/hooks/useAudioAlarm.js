import { useState, useEffect, useRef, useCallback } from 'react';

// Global Singleton Web Audio Context to avoid context proliferation
let globalAudioCtx = null;

function getAudioContext() {
  if (!globalAudioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  return globalAudioCtx;
}

export function useAudioAlarm() {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null); // { role, title, orderId, order }
  
  const loopTimerRef = useRef(null);
  const isPlayingRef = useRef(false);

  // Auto-unlock AudioContext on any user interaction in the viewport
  const unlockAudio = useCallback(async () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }
      setAudioUnlocked(true);
    } catch (e) {
      console.warn("Audio unlock attempt note:", e);
    }
  }, []);

  useEffect(() => {
    const handleFirstInteraction = () => {
      unlockAudio();
    };

    window.addEventListener('click', handleFirstInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [unlockAudio]);

  // 1. Synthesize Kitchen Buzzer (Urgent Dual-Tone Pulsing Alarm)
  const synthesizeKitchenTone = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    
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

    // Punchy envelope
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.12);
    gainNode.gain.exponentialRampToValueAtTime(0.4, now + 0.14);
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
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5 -> E5 -> G5 -> C6

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const noteTime = now + (idx * 0.1);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gainNode.gain.setValueAtTime(0.001, noteTime);
      gainNode.gain.exponentialRampToValueAtTime(0.3, noteTime + 0.02);
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
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.50, now);
    osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.35, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.9);
  }, []);

  // 4. Synthesize Customer Blessing Prasad Bell
  const synthesizeCustomerTone = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    [528, 660].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = now + (i * 0.12);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gainNode.gain.setValueAtTime(0.001, t);
      gainNode.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
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
    // Attempt unlock if suspended
    const ctx = getAudioContext();
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
      // Loop interval tailored by urgency
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
    isPlaying,
    activeAlert,
    enableAudio: unlockAudio,
    playRoleAlarm,
    playAlarm,
    stopAlarm
  };
}
