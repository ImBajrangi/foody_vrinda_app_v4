import { useState, useEffect, useCallback } from 'react';

const GEO_CACHE_KEY = 'foody_geo_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export default function useGeolocation() {
  const [coords, setCoords] = useState(() => {
    try {
      const c = JSON.parse(localStorage.getItem(GEO_CACHE_KEY));
      if (c && Date.now() - c.ts < CACHE_TTL) return { lat: c.lat, lng: c.lng };
    } catch {}
    return null;
  });
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`);
      const d = await r.json();
      if (d?.display_name) {
        // Shorten: take first 3 parts
        const parts = d.display_name.split(',').slice(0, 3).map(s => s.trim());
        return parts.join(', ');
      }
    } catch {}
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }, []);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) { setDenied(true); return null; }
    setLoading(true);

    return new Promise((resolve) => {
      // Helper to process valid position
      const handleSuccess = async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(loc);
        try {
          localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ...loc, ts: Date.now() }));
        } catch (_) {}
        const addr = await reverseGeocode(loc.lat, loc.lng);
        setAddress(addr);
        setLoading(false);
        setDenied(false);
        resolve({ coords: loc, address: addr });
      };

      const isMobilePlatform = typeof navigator !== 'undefined' && 
        (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || Boolean(window.Capacitor?.isNativePlatform?.()));

      // On desktop (macOS / PC), enableHighAccuracy: true causes CoreLocation to fail with kCLErrorLocationUnknown
      // because laptops lack GPS chips. Only mobile devices should attempt high-accuracy GPS first.
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (err) => {
          if (err && err.code === 1) { // PERMISSION_DENIED
            setDenied(true);
            setLoading(false);
            resolve(null);
            return;
          }

          // If mobile high-accuracy failed, fallback to standard cell/WiFi location
          if (isMobilePlatform) {
            navigator.geolocation.getCurrentPosition(
              handleSuccess,
              () => {
                setLoading(false);
                resolve(null);
              },
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
            );
          } else {
            setLoading(false);
            resolve(null);
          }
        },
        { enableHighAccuracy: isMobilePlatform, timeout: 8000, maximumAge: 60000 }
      );
    });
  }, [reverseGeocode]);

  // Auto-request on mount if previously granted
  useEffect(() => {
    navigator.permissions?.query({ name: 'geolocation' }).then(r => {
      if (r.state === 'granted') requestLocation();
      else if (r.state === 'denied') setDenied(true);
    }).catch(() => {});
  }, [requestLocation]);

  return { coords, address, loading, denied, requestLocation };
}
