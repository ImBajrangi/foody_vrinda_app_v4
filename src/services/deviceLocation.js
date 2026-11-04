/**
 * High-Precision Device Geolocation Service for Foody Vrinda
 * 
 * Native Android/iOS:
 *   Uses @capacitor/geolocation calling Android's FusedLocationProviderClient with ACCESS_FINE_LOCATION.
 *   Provides true satellite hardware GPS lock with 3 to 10 meter accuracy.
 * 
 * Web / Mobile Browser Fallback:
 *   Gracefully falls back to browser navigator.geolocation with intelligent desktop vs mobile
 *   high-accuracy handling (preventing macOS/PC CoreLocation kCLErrorLocationUnknown timeout errors).
 */

import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const GEO_CACHE_KEY = 'foody_geo_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

/**
 * Retrieve the last known valid location from cache (instant render on low-end devices)
 */
export function getLastCachedLocation() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.lat && data.lng && (Date.now() - (data.ts || 0) < CACHE_TTL_MS)) {
      return { lat: Number(data.lat), lng: Number(data.lng), accuracy: data.accuracy || 10 };
    }
  } catch (_) {}
  return null;
}

/**
 * Persist valid location in device cache
 */
export function cacheLocation(coords) {
  try {
    if (typeof localStorage === 'undefined' || !coords || !coords.lat || !coords.lng) return;
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({
      lat: coords.lat,
      lng: coords.lng,
      accuracy: coords.accuracy || null,
      ts: Date.now()
    }));
  } catch (_) {}
}

/**
 * Get device location with high precision (3-10m GPS lock on native devices)
 * 
 * @param {Object} options
 * @param {number} [options.timeout=15000] - GPS satellite lock timeout in ms
 * @param {number} [options.maximumAge=5000] - Acceptable cache age in ms
 * @param {boolean} [options.enableHighAccuracy=true] - Attempt satellite lock
 * @returns {Promise<{ coords: { lat: number, lng: number, accuracy?: number }, isHighAccuracy: boolean } | { error: string, coords: null }>}
 */
export async function getPreciseDeviceLocation(options = {}) {
  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
  const isMobileBrowser = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const timeoutMs = options.timeout || 15000;
  const maximumAgeMs = options.maximumAge || 5000;

  // 1. Native Capacitor (Android / iOS)
  if (isNative) {
    try {
      let perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
        perm = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
      }

      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
        return { error: 'PERMISSION_DENIED', coords: null };
      }

      // First attempt: High-Precision GPS (Satellite Lock: 3m - 10m)
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: options.enableHighAccuracy !== false,
          timeout: timeoutMs,
          maximumAge: maximumAgeMs
        });

        if (pos && pos.coords) {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 5,
            heading: pos.coords.heading,
            speed: pos.coords.speed
          };
          cacheLocation(coords);
          return { coords, isHighAccuracy: true };
        }
      } catch (gpsTimeoutErr) {
        console.warn("Native GPS high-accuracy lock timeout, falling back to cellular/WiFi triangulation...", gpsTimeoutErr);
      }

      // Second attempt: Fallback to Coarse Network Location (Indoors / basement)
      const fallbackPos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000
      });

      if (fallbackPos && fallbackPos.coords) {
        const coords = {
          lat: fallbackPos.coords.latitude,
          lng: fallbackPos.coords.longitude,
          accuracy: fallbackPos.coords.accuracy || 50
        };
        cacheLocation(coords);
        return { coords, isHighAccuracy: false };
      }
    } catch (nativeErr) {
      console.warn("Capacitor Geolocation exception:", nativeErr);
    }
  }

  // 2. Web / Browser fallback
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { error: 'NOT_SUPPORTED', coords: null };
  }

  return new Promise((resolve) => {
    // Only request high accuracy on mobile browsers; laptops lack GPS chips and fail with kCLErrorLocationUnknown
    const tryHighAccuracy = isMobileBrowser && options.enableHighAccuracy !== false;

    const onSuccess = (pos) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy || 10
      };
      cacheLocation(coords);
      resolve({ coords, isHighAccuracy: tryHighAccuracy });
    };

    const onError = (err) => {
      if (err.code === 1) { // PERMISSION_DENIED
        resolve({ error: 'PERMISSION_DENIED', coords: null });
        return;
      }

      // If mobile high-accuracy failed (e.g. indoors), try cell/WiFi triangulation fallback
      if (tryHighAccuracy) {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (err2) => resolve({ error: err2.message || 'LOCATION_UNAVAILABLE', coords: null }),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        resolve({ error: err.message || 'LOCATION_UNAVAILABLE', coords: null });
      }
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      onError,
      {
        enableHighAccuracy: tryHighAccuracy,
        timeout: tryHighAccuracy ? 12000 : 8000,
        maximumAge: maximumAgeMs
      }
    );
  });
}

/**
 * Continuous real-time GPS tracking (for riders and live delivery updates)
 * Automatically utilizes native Capacitor hardware GPS or browser watchPosition.
 * 
 * @param {Function} onLocation - (coords: { lat, lng, accuracy, heading, speed }) => void
 * @param {Function} onError - (err: any) => void
 * @param {Object} options
 * @returns {Function} cleanup - unsubscribe callback
 */
export function watchDeviceLocation(onLocation, onError, options = {}) {
  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

  if (isNative) {
    let watchIdPromise = Geolocation.watchPosition(
      {
        enableHighAccuracy: options.enableHighAccuracy !== false,
        timeout: options.timeout || 15000,
        maximumAge: options.maximumAge || 5000
      },
      (position, err) => {
        if (err) {
          if (onError) onError(err);
          return;
        }
        if (position && position.coords) {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy || 5,
            heading: position.coords.heading,
            speed: position.coords.speed
          };
          cacheLocation(coords);
          onLocation(coords);
        }
      }
    );

    return () => {
      watchIdPromise.then(id => {
        if (id) Geolocation.clearWatch({ id });
      }).catch(() => {});
    };
  }

  // Web fallback
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 10,
          heading: pos.coords.heading,
          speed: pos.coords.speed
        };
        cacheLocation(coords);
        onLocation(coords);
      },
      (err) => {
        if (onError) onError(err);
      },
      {
        enableHighAccuracy: isMobileBrowser && options.enableHighAccuracy !== false,
        timeout: 15000,
        maximumAge: options.maximumAge || 10000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(id);
    };
  }

  return () => {};
}
