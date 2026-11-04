import { useState, useEffect, useCallback } from 'react';
import { reverseGeocodeCoords } from '../services/addressService';
import { getPreciseDeviceLocation, getLastCachedLocation } from '../services/deviceLocation';

export default function useGeolocation() {
  const [coords, setCoords] = useState(() => getLastCachedLocation());
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  const reverseGeocode = useCallback(async (lat, lng) => {
    return await reverseGeocodeCoords(lat, lng);
  }, []);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setDenied(false);

    try {
      const result = await getPreciseDeviceLocation({ enableHighAccuracy: true });

      if (result.error === 'PERMISSION_DENIED') {
        setDenied(true);
        setLoading(false);
        return null;
      }

      if (result.coords) {
        const loc = { lat: result.coords.lat, lng: result.coords.lng };
        setCoords(loc);
        const addr = await reverseGeocode(loc.lat, loc.lng);
        setAddress(addr);
        setLoading(false);
        setDenied(false);
        return { coords: loc, address: addr };
      }

      setLoading(false);
      return null;
    } catch (err) {
      console.warn("useGeolocation request notice:", err);
      setLoading(false);
      return null;
    }
  }, [reverseGeocode]);

  // Auto-request on mount if previously granted
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(r => {
        if (r.state === 'granted') requestLocation();
        else if (r.state === 'denied') setDenied(true);
      }).catch(() => {});
    }
  }, [requestLocation]);

  return { coords, address, loading, denied, requestLocation };
}
