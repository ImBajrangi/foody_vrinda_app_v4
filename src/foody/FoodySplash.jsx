import React, { useEffect, useRef, useState, useCallback } from 'react';
import { splashMarkup, createFoodySplash } from './foodySplash.core.js';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Full-screen pure vector animated splash screen for Foody Vrinda.
 * Native hardware-accelerated 120fps letter morph animation with 0ms pre-computed cache.
 * - ZERO iframe lag, zero HTTP latency
 * - Pre-computed point geometry (0ms layout overhead)
 * - Mounts once: 100% immune to React re-render resets
 * - Instant tap-to-dismiss anywhere on screen with haptics
 * - Smooth cubic-bezier dissolve exit into the app
 */
export default function FoodySplash({
  onDone,
  speed = 1.0,
  background = '#FF751F',
  style,
  className
}) {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const isExitingRef = useRef(false);
  const [isExiting, setIsExiting] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const handleFinish = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);

    try {
      sessionStorage.setItem('fv_splash_viewed', 'true');
    } catch (_) { }

    setTimeout(() => {
      onDoneRef.current?.();
    }, 240);
  }, []);

  // Mount animation controller ONCE on mount (0ms delay, immune to parent re-renders)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        SplashScreen.hide({ fadeOutDuration: 120 }).catch(() => { });
      } catch (_) { }
    }

    const root = containerRef.current;
    if (!root) return;

    root.innerHTML = splashMarkup;
    const c = createFoodySplash(root, {
      speed,
      onDone: handleFinish
    });
    controllerRef.current = c;

    return () => {
      if (c) c.destroy();
      controllerRef.current = null;
      root.innerHTML = '';
    };
  }, []); // Empty dependency: never restarts on state updates

  const handleTap = () => {
    try {
      if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style: ImpactStyle.Light });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch (_) { }
    handleFinish();
  };

  return (
    <div
      ref={containerRef}
      onClick={handleTap}
      className={`fixed inset-0 z-[9999999] select-none cursor-pointer transition-opacity duration-300 ease-out ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
        } ${className || ''}`}
      aria-hidden="true"
      style={{
        background,
        willChange: 'opacity',
        touchAction: 'manipulation',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        ...style
      }}
    />
  );
}
