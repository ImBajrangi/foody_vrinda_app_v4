import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { MapPin, X, Navigation, Compass, Check } from 'lucide-react';

export default function MapPicker({ initialCoords, initialLat, initialLng, onClose, onLocationSelect, onSelect }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const startLat = initialCoords?.lat ?? (parseFloat(initialLat) || 27.5706);
  const startLng = initialCoords?.lng ?? (parseFloat(initialLng) || 77.6593);

  const [coords, setCoords] = useState(() => ({ 
    lat: startLat, 
    lng: startLng 
  }));
  const [closing, setClosing] = useState(false);

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
      markerRef.current.setLatLng([fixedLat, fixedLng]);
    }
  }, []);

  // Initialize Leaflet Map with CARTO Voyager tiles
  useEffect(() => {
    if (mapInstanceRef.current || !mapContainerRef.current) return;

    if (mapContainerRef.current._leaflet_id) {
      mapContainerRef.current._leaflet_id = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // CARTO Voyager Tiles (Vrindavan Regional Basemap matching Vrinda Tours standard)
    const cartoKey = import.meta.env.VITE_CARTO_BASEMAP_KEY || 'cb1_25xx_1_ef24909b63d9228a6de7508f';
    const cartoSuffix = cartoKey ? `?key=${cartoKey}` : '';
    const tileLayer = L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${cartoSuffix}`,
      {
        maxZoom: 20,
        minZoom: 3,
        subdomains: 'abcd',
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    ).addTo(map);

    // Custom Glowing Pin Marker
    const customIcon = L.divIcon({
      className: 'custom-map-picker-pin',
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background: #1E1B1C;
          border: 2px solid #E0FF33;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        ">
          <div style="
            width: 14px;
            height: 14px;
            background: #E0FF33;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38]
    });

    const marker = L.marker([startLat, startLng], {
      icon: customIcon,
      draggable: true
    }).addTo(map);

    markerRef.current = marker;
    mapInstanceRef.current = map;

    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      updateCoordinates(pos.lat, pos.lng);
    });

    map.on('click', (e) => {
      updateCoordinates(e.latlng.lat, e.latlng.lng);
    });

    // Geolocation fallback
    if (navigator.geolocation && isNaN(parseFloat(initialLat)) && !initialCoords) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const centerLat = pos.coords.latitude;
        const centerLng = pos.coords.longitude;
        map.flyTo([centerLat, centerLng], 16, { duration: 1 });
        updateCoordinates(centerLat, centerLng);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [startLat, startLng, initialCoords, initialLat, updateCoordinates]);

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const centerLat = pos.coords.latitude;
      const centerLng = pos.coords.longitude;
      mapInstanceRef.current.flyTo([centerLat, centerLng], 16, { duration: 1.2 });
      updateCoordinates(centerLat, centerLng);
    });
  };

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
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-[2px] transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className={`w-full max-w-2xl bg-[#1E1B1C] border border-white/10 text-white rounded-[32px] sm:rounded-[36px] p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.85)] relative flex flex-col gap-4 transition-transform duration-100 ${closing ? 'translate-y-8' : 'translate-y-0'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 flex items-center justify-center">
              <Compass className="w-5 h-5 text-[#E0FF33]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight font-['Outfit']">
                Pin Location on Carto Map
              </h3>
              <p className="text-[11px] text-neutral-400 font-medium">
                Click map or drag marker to set precise GPS coordinates
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleAnimatedClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-all border border-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Map Container with Floating Locate Me Button */}
        <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-white/10 bg-[#151314]">
          <div ref={mapContainerRef} className="w-full h-full" />
          
          <button
            type="button"
            onClick={handleLocateMe}
            className="absolute bottom-4 right-4 z-[1000] px-3.5 py-2 rounded-xl bg-[#1E1B1C]/90 hover:bg-[#1E1B1C] text-white border border-white/15 text-xs font-bold shadow-xl flex items-center gap-2 backdrop-blur-md active:scale-95 transition-all"
          >
            <Navigation className="w-3.5 h-3.5 text-[#E0FF33]" />
            <span>Locate Me</span>
          </button>
        </div>

        {/* Footer info & action */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-1">
          <div className="text-xs font-mono text-neutral-400 flex items-center gap-2 bg-[#151314] px-3 py-1.5 rounded-xl border border-white/5">
            <MapPin size={13} className="text-[#E0FF33]" />
            <span>Lat: <strong className="text-white">{coords.lat}</strong></span>
            <span>•</span>
            <span>Lng: <strong className="text-white">{coords.lng}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleAnimatedClose} 
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs border border-white/5 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-2xl bg-[#E0FF33] hover:bg-[#d8fa26] text-black font-black text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
