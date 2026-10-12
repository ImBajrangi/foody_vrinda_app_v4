import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import appUpdateService from '../services/appUpdateService';

let globalDeferredPrompt = null;

export function useAppInstall() {
  const isNative = Capacitor.isNativePlatform();
  const [canInstallPWA, setCanInstallPWA] = useState(Boolean(globalDeferredPrompt));
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running in standalone display mode or native wrapper
    const standaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true ||
      isNative;
    setIsStandalone(standaloneMode);

    const ua = navigator.userAgent || '';
    const iosDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const androidDevice = /Android/i.test(ua);
    setIsIOS(iosDevice);
    setIsAndroid(androidDevice);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      globalDeferredPrompt = e;
      setCanInstallPWA(true);
    };

    const handleAppInstalled = () => {
      globalDeferredPrompt = null;
      setCanInstallPWA(false);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isNative]);

  const promptInstall = useCallback(async () => {
    if (globalDeferredPrompt) {
      try {
        globalDeferredPrompt.prompt();
        const { outcome } = await globalDeferredPrompt.userChoice;
        if (outcome === 'accepted') {
          globalDeferredPrompt = null;
          setCanInstallPWA(false);
          return { success: true, method: 'pwa' };
        }
      } catch (err) {
        console.warn('PWA install prompt error:', err);
      }
    }
    return { success: false, method: 'pwa' };
  }, []);

  const downloadApk = useCallback(() => {
    appUpdateService.startUpdate();
    return true;
  }, []);

  return {
    isNative,
    isStandalone,
    canInstallPWA,
    isIOS,
    isAndroid,
    promptInstall,
    downloadApk
  };
}
