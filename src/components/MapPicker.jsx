import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, X, Navigation } from 'lucide-react';

export default function MapPicker({ initialCoords, initialLat, initialLng, onClose, onLocationSelect, onSelect }) {
  const mapContainerRef = useRef(null);
  const startLat = initialCoords?.lat ?? (parseFloat(initialLat) || 27.5706);
  const startLng = initialCoords?.lng ?? (parseFloat(initialLng) || 77.6593);

  const [coords, setCoords] = useState(() => ({ 
    lat: startLat, 
    lng: startLng 
  }));
  const [closing, setClosing] = useState(false);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const handleAnimatedClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      if (onClose) onClose();
    }, 220);
  }, [closing, onClose]);

  const updateCoordinates = useCallback((lat, lng) => {
    const fixedLat = parseFloat(lat.toFixed(6));
    const fixedLng = parseFloat(lng.toFixed(6));
    setCoords({ lat: fixedLat, lng: fixedLng });
    if (markerRef.current) {
      markerRef.current.setPosition({ lat: fixedLat, lng: fixedLng });
    }
  }, []);

  useEffect(() => {
    if (typeof window.google === 'undefined') return;

    const initialPoint = { lat: startLat, lng: startLng };

    const mapOptions = {
      zoom: 14,
      center: initialPoint,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    };

    const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);
    mapRef.current = map;

    const marker = new window.google.maps.Marker({
      position: initialPoint,
      map: map,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    });
    markerRef.current = marker;

    map.addListener("click", (e) => {
      const latLng = e.latLng;
      updateCoordinates(latLng.lat(), latLng.lng());
    });

    marker.addListener("dragend", (e) => {
      const latLng = e.latLng;
      updateCoordinates(latLng.lat(), latLng.lng());
    });

    if (navigator.geolocation && isNaN(parseFloat(initialLat)) && !initialCoords) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.setCenter(center);
        updateCoordinates(center.lat, center.lng);
      });
    }
  }, [startLat, startLng, initialCoords, initialLat, updateCoordinates]);

  const handleSave = () => {
    if (onLocationSelect) {
      onLocationSelect(coords);
    } else if (onSelect) {
      onSelect(coords.lat, coords.lng);
    }
    handleAnimatedClose();
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAnimatedClose();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 apple-overlay ${closing ? 'closing' : ''}`}
    >
      <div className={`w-full max-w-2xl bg-[#242021] border border-white/10 text-white rounded-[32px] sm:rounded-[38px] p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.7)] relative flex flex-col gap-4 apple-modal-spring ${closing ? 'closing' : ''}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#E0FF33]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight font-['Outfit']">Pin Delivery Location</h3>
              <p className="text-[11px] text-zinc-400 font-bold">Drag marker or click on map</p>
            </div>
          </div>
          <button 
            onClick={handleAnimatedClose}
            className="w-8 h-8 rounded-full bg-[#1E1B1C] hover:bg-[#322E30] text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer apple-tap-target border border-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full h-72 sm:h-84 rounded-2xl overflow-hidden border border-white/10 bg-[#151314]" />

        {/* Footer info & action */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-1">
          <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
            <Navigation size={13} className="text-[#E0FF33]" />
            <span>Lat: <strong className="text-white">{coords.lat}</strong></span>
            <span>|</span>
            <span>Lng: <strong className="text-white">{coords.lng}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleAnimatedClose} 
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-full bg-[#1E1B1C] hover:bg-[#282526] text-zinc-300 font-bold text-xs border border-white/5 transition-all apple-tap-target cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black text-xs shadow-lg transition-all apple-tap-target cursor-pointer"
            >
              Save Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
