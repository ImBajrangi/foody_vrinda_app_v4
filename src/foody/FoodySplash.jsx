import React, { useEffect, useRef, useState, useCallback } from 'react';
import { splashMarkup, createFoodySplash } from './foodySplash.core.js';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Full-screen pure vector animated splash screen provided for Foody Vrinda.
 * Supports native Capacitor coordination, smooth 60fps RAF loop, speed adjustment,
 * and instant tap-to-dismiss.
 */
export default function FoodySplash({
  onDone,
  speed = 1.35,
  background = '#1E1B1C',
  style,
  className
}) {
  const el = useRef(null);
  const [isExiting, setIsExiting] = useState(false);
  const isExitingRef = useRef(false);
  const controllerRef = useRef(null);

  const handleFinish = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);

    try {
      sessionStorage.setItem('fv_splash_viewed', 'true');
    } catch (_) {}

    // 220ms smooth fade transition before unmounting
    setTimeout(() => {
      onDone?.();
    }, 220);
  }, [onDone]);

  useEffect(() => {
    // Hide native Capacitor splash as soon as React animated splash takes over
    if (Capacitor.isNativePlatform()) {
      try {
        SplashScreen.hide({ fadeOutDuration: 120 }).catch(() => {});
      } catch (_) {}
    }

    const c = createFoodySplash(el.current, {
      speed,
      onDone: handleFinish
    });
    controllerRef.current = c;

    return () => {
      c.destroy();
    };
  }, [speed, handleFinish]);

  const handleTap = () => {
    try {
      if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style: ImpactStyle.Light });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch (_) {}
    handleFinish();
  };

  return (
    <div
      ref={el}
      onClick={handleTap}
      className={`fixed inset-0 z-[9999999] select-none cursor-pointer transition-opacity duration-200 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${className || ''}`}
      aria-hidden="true"
      style={{
        background,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        ...style
      }}
      dangerouslySetInnerHTML={{ __html: splashMarkup }}
    />
  );
}
