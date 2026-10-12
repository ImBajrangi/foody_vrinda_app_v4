import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

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
    const apkUrl = 'https://github.com/ImBajrangi/foody_vrinda_app_v4/releases/latest/download/Foody-Vrinda-Latest.apk';
    const link = document.createElement('a');
    link.href = apkUrl;
    link.download = 'Foody-Vrinda-Latest.apk';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
