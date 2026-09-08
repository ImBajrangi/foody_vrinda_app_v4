import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  ArrowLeft, 
  Phone, 
  MessageCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  RotateCcw,
  Sparkles,
  Star,
  AlarmClock,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Bike,
  Utensils,
  PackageCheck,
  Check
} from 'lucide-react';
import { subscribeSingleCloudOrder } from '../supabase';

export default function ActiveOrderTrackingModal({ order, onClose, onRateOrder, onToast, allShops = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeGroupRef = useRef(null);
  const [showItems, setShowItems] = useState(false);
  const [closing, setClosing] = useState(false);

  // Live order state with automatic realtime WebSocket sync
  const [liveOrder, setLiveOrder] = useState(order);

  useEffect(() => {
    setLiveOrder(order);
  }, [order]);

  // Realtime Supabase PostgreSQL Changes Subscription
  useEffect(() => {
    if (!liveOrder?.id) return;
    const unsub = subscribeSingleCloudOrder(liveOrder.id, (updated) => {
      if (updated) {
        setLiveOrder(prev => ({ ...prev, ...updated }));
        if (onToast && updated.status && updated.status !== liveOrder.status) {
          onToast(
            `Status: ${updated.status.replace(/_/g, ' ').toUpperCase()}`, 
            'info', 
            'Realtime Dispatch Update'
          );
        }
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, [liveOrder?.id]);

  // Dynamic real-time metrics from live OSRM navigation service
  const [realDistance, setRealDistance] = useState(null);
  const [realDurationMins, setRealDurationMins] = useState(null);
  const [roadSummary, setRoadSummary] = useState('');

  const currentOrder = liveOrder || order;

  const shop = (allShops && allShops.length > 0)
    ? (allShops.find(s => s.id === (currentOrder?.shopId || currentOrder?.shop_id)) || allShops[0])
    : { name: 'Foody Vrinda Kitchen', coordinates: { lat: 27.5706, lng: 77.6593 } };

  const handleAnimatedClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 220);
  };

  // Ensure healthy visual separation between shop and customer
  const shopLat = parseFloat(shop?.coordinates?.lat || shop?.lat) || 27.5706;
  const shopLng = parseFloat(shop?.coordinates?.lng || shop?.lng) || 77.6593;

  const rawDest = currentOrder?.deliveryCoordinates || currentOrder?.delivery_coordinates || currentOrder?.coords;
  let destLat = parseFloat(rawDest?.lat);
  let destLng = parseFloat(rawDest?.lng);

  if (isNaN(destLat) || isNaN(destLng) || (Math.abs(destLat - shopLat) < 0.0015 && Math.abs(destLng - shopLng) < 0.0015)) {
    destLat = shopLat + 0.0120;
    destLng = shopLng + 0.0095;
  }

  const midLat = (shopLat + destLat) / 2;
  const midLng = (shopLng + destLng) / 2;

  const status = currentOrder?.status || 'new';

  // Step stage index (0: placed/new, 1: preparing, 2: ready/dispatched, 3: completed)
  const getStageIndex = () => {
    switch (status) {
      case 'new': return 0;
      case 'preparing': return 1;
      case 'ready_for_pickup': return 2;
      case 'out_for_delivery': return 2;
      case 'completed': return 3;
      default: return 0;
    }
  };

  const currentStage = getStageIndex();

  // Initialize Carto Leaflet Map with Uber & Vrinda Tours Navigation Standard
  useEffect(() => {
    if (!order || !mapContainerRef.current) return;

    if (mapContainerRef.current._leaflet_id) {
      mapContainerRef.current._leaflet_id = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [midLat, midLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // Clean Light Basemap matching Vrinda Tours standard
    const cartoKey = import.meta.env.VITE_CARTO_BASEMAP_KEY || 'cb1_25xx_1_ef24909b63d9228a6de7508f';
    const cartoSuffix = cartoKey ? `?key=${cartoKey}` : '';
    L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${cartoSuffix}`,
      {
        maxZoom: 20,
        minZoom: 3,
        subdomains: 'abcd',
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
      }
    ).addTo(map);

    const group = L.featureGroup();

    // 1. Destination Drop-Off Target Glow Ring (Uber Style)
    const destTargetGlow = L.circleMarker([destLat, destLng], {
      radius: 18,
      color: '#18181A',
      fillColor: '#E0FF33',
      fillOpacity: 0.25,
      weight: 2,
      dashArray: '3, 3'
    });
    group.addLayer(destTargetGlow);

    // 2. Origin Store Pin: White Teardrop Location Marker
    const originIcon = L.divIcon({
      className: 'carto-store-pin',
      html: `
        <div style="
          width: 34px;
          height: 34px;
          background: #FFFFFF;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.35);
          border: 2px solid #0F172A;
        ">
          <div style="
            width: 12px;
            height: 12px;
            background: #E0FF33;
            border-radius: 50%;
            border: 2px solid #0F172A;
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34]
    });
    const storeMarker = L.marker([shopLat, shopLng], { icon: originIcon, zIndexOffset: 100 });
    storeMarker.bindTooltip(shop?.name || 'Kitchen Store', { permanent: true, direction: 'bottom', offset: [0, 6] });
    group.addLayer(storeMarker);

    // 3. Destination Pin: Circular House Pin
    const destIcon = L.divIcon({
      className: 'carto-home-pin',
      html: `
        <div style="
          width: 42px;
          height: 42px;
          background: #FFFFFF;
          border: 2.5px solid #0F172A;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
          font-size: 20px;
        ">🏡</div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });
    const destMarker = L.marker([destLat, destLng], { icon: destIcon, zIndexOffset: 100 });
    destMarker.bindTooltip('Your Sacred Delivery', { permanent: false, direction: 'top' });
    group.addLayer(destMarker);

    // 4. Intermediate Live Delivery Rider Pin (Scooter Illustration Badge)
    const riderIcon = L.divIcon({
      className: 'carto-rider-pin',
      html: `
        <div style="
          width: 48px;
          height: 48px;
          background: #FFFFFF;
          border: 2.5px solid #E0FF33;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(224, 255, 51, 0.8), 0 8px 24px rgba(0,0,0,0.25);
          font-size: 24px;
        ">🛵</div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });

    const initialRiderPos = status === 'completed' 
      ? [destLat, destLng]
      : status === 'out_for_delivery'
        ? [midLat, midLng]
        : [shopLat + (destLat - shopLat) * 0.45, shopLng + (destLng - shopLng) * 0.45];

    const riderMarker = L.marker(initialRiderPos, { icon: riderIcon, zIndexOffset: 300 });
    group.addLayer(riderMarker);

    // 5. Professional Multi-Layer Uber Route:
    let currentRouteCoords = [
      [shopLat, shopLng],
      [midLat, midLng],
      [destLat, destLng]
    ];

    const roadCasing = L.polyline(currentRouteCoords, {
      color: '#FFFFFF',
      weight: 8,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(roadCasing);

    const baseSolidLine = L.polyline(currentRouteCoords, {
      color: '#1E293B',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(baseSolidLine);

    const dashedActiveLine = L.polyline(currentRouteCoords, {
      color: '#E0FF33',
      weight: 2.5,
      dashArray: '8, 8',
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(dashedActiveLine);

    let animInterval = null;

    // Fetch real road navigation geometry from OSRM
    fetch(`https://router.project-osrm.org/route/v1/driving/${shopLng},${shopLat};${destLng},${destLat}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data?.routes?.[0]?.geometry?.coordinates) {
          const routeObj = data.routes[0];
          const rawLatLngs = routeObj.geometry.coordinates.map(c => [c[1], c[0]]);
          
          if (rawLatLngs.length > 1) {
            // Real dynamic metrics from OSRM
            const distM = routeObj.distance;
            const durS = routeObj.duration;
            setRealDistance(distM < 1000 ? `${Math.round(distM)}m` : `${(distM / 1000).toFixed(1)}km`);
            setRealDurationMins(Math.max(2, Math.round(durS / 60)));
            if (routeObj.legs?.[0]?.summary) {
              setRoadSummary(routeObj.legs[0].summary);
            }

            // Guarantee seamless endpoints: connect explicitly to [shopLat, shopLng] and [destLat, destLng]
            const latLngs = [
              [shopLat, shopLng],
              ...rawLatLngs,
              [destLat, destLng]
            ];

            currentRouteCoords = latLngs;
            roadCasing.setLatLngs(latLngs);
            baseSolidLine.setLatLngs(latLngs);
            dashedActiveLine.setLatLngs(latLngs);

            const riderIndex = Math.min(Math.floor(latLngs.length * 0.45), latLngs.length - 1);
            if (latLngs[riderIndex]) {
              riderMarker.setLatLng(latLngs[riderIndex]);
            }

            if (status === 'out_for_delivery') {
              let stepPercent = 0.35;
              animInterval = setInterval(() => {
                stepPercent = (stepPercent + 0.015) % 0.95;
                const idx = Math.min(Math.floor(stepPercent * latLngs.length), latLngs.length - 1);
                if (latLngs[idx]) {
                  riderMarker.setLatLng(latLngs[idx]);
                }
              }, 1000);
            }

            if (mapInstanceRef.current && routeGroupRef.current) {
              mapInstanceRef.current.fitBounds(routeGroupRef.current.getBounds(), {
                paddingTopLeft: [70, 40],
                paddingBottomRight: [40, 240],
                maxZoom: 16
              });
            }
          }
        }
      })
      .catch(() => {});

    group.addTo(map);
    routeGroupRef.current = group;
    mapInstanceRef.current = map;

    // Fit route bounds nicely with bottom padding
    map.fitBounds(group.getBounds(), {
      paddingTopLeft: [70, 40],
      paddingBottomRight: [40, 240],
      maxZoom: 16
    });

    return () => {
      if (animInterval) clearInterval(animInterval);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [order?.id, shopLat, shopLng, destLat, destLng, status]);

  const handleRecenter = () => {
    if (mapInstanceRef.current && routeGroupRef.current) {
      mapInstanceRef.current.fitBounds(routeGroupRef.current.getBounds(), {
        paddingTopLeft: [70, 40],
        paddingBottomRight: [40, 240],
        maxZoom: 16,
        animate: true
      });
    }
  };

  const isStep4 = status === 'completed';

  // Dynamic ETA calculation based on real distance/duration + kitchen prep time
  const getDynamicEstimatedTime = () => {
    const basePrep = (status === 'new' || status === 'preparing') ? 12 : 2;
    const travel = realDurationMins || 8;
    const totalMinutes = basePrep + travel;
    const d = new Date();
    d.setMinutes(d.getMinutes() + totalMinutes);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getDynamicArrivalWindow = () => {
    if (status === 'completed') return 'Delivered';
    const travel = realDurationMins || 8;
    const minTime = Math.max(1, travel - 2);
    const maxTime = travel + 4;
    return `${minTime}–${maxTime} Min`;
  };

  // Dynamic Rider & Shop Context
  const isOutForDelivery = status === 'out_for_delivery';
  const isDelivered = status === 'completed';

  const riderName = currentOrder?.rider_name || currentOrder?.riderName || currentOrder?.courier_name || currentOrder?.courierName || (isOutForDelivery || isDelivered ? 'Govind Das (Sarathi)' : shop?.managerName || 'Kitchen Dispatch');
  const riderPhone = (currentOrder?.rider_phone || currentOrder?.riderPhone || shop?.phone || shop?.contactPhone || '9876543210').replace(/\D/g, '').slice(-10);
  const riderRating = parseFloat(currentOrder?.rider_rating || shop?.rating || 4.9).toFixed(1);
  const riderPhoto = currentOrder?.rider_avatar || currentOrder?.rider_photo || shop?.managerPhoto || shop?.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80';

  // Dynamic Address Label (Detect Home, Office, Hotel, Ashram, or Street)
  const customerAddress = currentOrder?.customerAddress || currentOrder?.delivery_address || currentOrder?.deliveryAddress || 'Vrindavan Dham';
  const getAddressLabel = () => {
    const addr = customerAddress.toLowerCase();
    if (addr.includes('home') || addr.includes('house') || addr.includes('villa') || addr.includes('niwas')) return 'Home';
    if (addr.includes('office') || addr.includes('work') || addr.includes('shop')) return 'Work';
    if (addr.includes('hotel') || addr.includes('resort') || addr.includes('stay') || addr.includes('guest')) return 'Hotel';
    if (addr.includes('ashram') || addr.includes('mandir') || addr.includes('temple') || addr.includes('dham')) return 'Ashram';
    return 'Destination';
  };

  // Dynamic Status Milestone Labels
  const getActiveMilestone = () => {
    switch (status) {
      case 'new':
        return { active: 'Order Placed & Verified', past: 'Awaiting Kitchen Preparation', icon: PackageCheck };
      case 'preparing':
        return { active: 'Bhog Cooking in Pure Desi Ghee', past: 'Order Confirmed by Kitchen', icon: Utensils };
      case 'ready_for_pickup':
        return { active: 'Packed & Awaiting Sarathi Pickup', past: 'Prasad Cooked Freshly', icon: PackageCheck };
      case 'out_for_delivery':
        return { active: `On its way with ${riderName}`, past: 'Dispatched from Sacred Kitchen', icon: Bike };
      case 'completed':
        return { active: 'Delivered Safely & Warm', past: 'Handed with Blessings', icon: CheckCircle2 };
      default:
        return { active: 'Processing Prasad Order', past: 'Order Placed', icon: Sparkles };
    }
  };

  const milestones = getActiveMilestone();

  return (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* Luxury Obsidian Modal Container */}
      <div className={`w-full max-w-[440px] bg-[#18181A] text-white rounded-t-[36px] sm:rounded-[36px] shadow-[0_25px_100px_rgba(0,0,0,0.95)] border border-white/10 overflow-hidden flex flex-col h-[94vh] sm:h-auto sm:max-h-[92vh] relative transition-all duration-200 ${closing ? 'translate-y-12 scale-[0.98]' : 'translate-y-0 scale-100'}`}>
        
        {/* Top Leaflet Map Section */}
        <div className="relative flex-1 bg-[#edf2f7] min-h-[280px] sm:min-h-[320px] overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full min-h-[280px] sm:min-h-[320px] z-0" />

          {/* Floating Back Button (Top Left) */}
          <div className="absolute top-4 left-4 z-[500] flex items-center gap-2">
            <button
              onClick={handleAnimatedClose}
              className="w-10 h-10 rounded-full bg-white/90 hover:bg-white text-zinc-900 shadow-lg backdrop-blur-md flex items-center justify-center border border-zinc-200/80 active:scale-95 transition-all cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-4.5 h-4.5 stroke-[2.4]" />
            </button>
          </div>

          {/* Dynamic Floating Live GPS Pill (Top Center) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-white/15 text-white shadow-xl">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E0FF33] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E0FF33]"></span>
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider font-['Outfit'] text-[#E0FF33]">
                {status === 'out_for_delivery' ? 'Live Sarathi GPS' : 'Kitchen Dispatch Live'}
              </span>
            </div>
          </div>

          {/* Floating Recenter (Top Right) */}
          <div className="absolute top-4 right-4 z-[500] flex items-center gap-2">
            <button
              onClick={handleRecenter}
              className="w-10 h-10 rounded-full bg-white/90 hover:bg-white text-zinc-900 shadow-lg backdrop-blur-md flex items-center justify-center border border-zinc-200/80 active:scale-95 transition-all cursor-pointer"
              title="Re-center route"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Bottom Curved Obsidian Card (100% Dynamic Realtime HUD) */}
        <div className="bg-[#18181A] rounded-t-[32px] px-4 pt-3.5 pb-5 -mt-5 relative z-30 shadow-[0_-20px_50px_rgba(0,0,0,0.6)] border-t border-white/5 space-y-3.5 overflow-y-auto max-h-[58vh] no-scrollbar">
          
          {/* Subtle Mobile Drag Indicator Pill */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto -mt-1 mb-1" />

          {/* 4-Step Animated Milestone Progress Bar */}
          <div className="px-1 space-y-1.5">
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'Placed', icon: Check },
                { label: 'Cooking', icon: Utensils },
                { label: 'On Way', icon: Bike },
                { label: 'Delivered', icon: CheckCircle2 }
              ].map((st, idx) => {
                const isPassed = currentStage >= idx;
                const isCurrent = currentStage === idx;
                return (
                  <div key={idx} className="space-y-1">
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${
                      isPassed ? 'bg-[#E0FF33] shadow-[0_0_8px_rgba(224,255,51,0.5)]' : 'bg-white/10'
                    }`} />
                    <p className={`text-[10px] text-center font-bold truncate transition-colors ${
                      isCurrent ? 'text-[#E0FF33]' : isPassed ? 'text-zinc-300' : 'text-zinc-600'
                    }`}>
                      {st.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 1. Dynamic Rider / Kitchen Header Bar */}
          <div className="flex items-center justify-between px-1 pt-0.5 gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Avatar with warm ring */}
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 bg-zinc-800 shrink-0 shadow-md relative">
                <img 
                  src={riderPhoto} 
                  alt={riderName} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border border-black flex items-center justify-center text-[9px] text-black font-black">
                  ✓
                </div>
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-white text-sm sm:text-base font-['Outfit'] tracking-tight truncate">
                    {riderName}
                  </h4>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#E0FF33] shrink-0" />
                </div>
                {/* Dynamic Star Rating */}
                <div className="flex items-center gap-1 text-amber-400 text-xs mt-0.5">
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                    <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                    <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                    <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                    <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                  </div>
                  <span className="text-zinc-400 text-[10px] font-bold ml-0.5">({riderRating})</span>
                  <span className="text-zinc-600 text-[9px]">•</span>
                  <span className="text-emerald-400 text-[10px] font-bold">100% Satvik Verified</span>
                </div>
              </div>
            </div>

            {/* Right Action Icons: WhatsApp & Phone */}
            <div className="flex items-center gap-2 shrink-0">
              <a 
                href={`https://wa.me/91${riderPhone}?text=${encodeURIComponent(`Radhe Radhe! Checking status for Foody Vrinda Order #${currentOrder?.id ? currentOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : ''} (${currentOrder?.customerName || 'Customer'})`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (onToast) onToast("Connecting WhatsApp...", "info", "Opening dispatch chat");
                }}
                className="w-10 h-10 rounded-full border border-white/20 hover:border-white/50 text-white flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all cursor-pointer shadow-sm"
                title="Chat with dispatch"
              >
                <MessageCircle className="w-4.5 h-4.5 stroke-[1.8]" />
              </a>

              <a 
                href={`tel:${riderPhone}`}
                className="w-10 h-10 rounded-full border border-white/20 hover:border-white/50 text-white flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all cursor-pointer shadow-sm"
                title="Call dispatch"
              >
                <Phone className="w-4.5 h-4.5 stroke-[1.8]" />
              </a>
            </div>
          </div>

          {/* 2. Inner Curved Warm Ivory Card (Dynamic Real Data) */}
          <div className="bg-[#FAF5EB] text-[#18181A] rounded-[24px] p-4 shadow-md space-y-3">
            
            {/* Top Row: Delivery Time & Real Distance */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#18181A] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Clock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-black text-zinc-900 font-['Outfit'] leading-tight">
                  Estimated Delivery: {getDynamicEstimatedTime()}
                </h3>
                <p className="text-xs text-zinc-600 font-medium mt-0.5 flex items-center gap-1.5">
                  <span>Distance:</span>
                  <span className="font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">{realDistance || 'Calculating...'}</span>
                  {roadSummary && <span className="text-[10px] text-zinc-500 font-normal truncate">via {roadSummary}</span>}
                </p>
              </div>
            </div>

            {/* Precision Connected Vertical Timeline Stepper */}
            <div className="pl-4 ml-1 space-y-2 relative before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-[2px] before:border-l-2 before:border-dashed before:border-zinc-300">
              <div className="flex items-center gap-3 relative z-10">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-[#FAF5EB] shrink-0 animate-pulse" />
                <span className="text-xs font-bold text-zinc-900 leading-tight">{milestones.active}</span>
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 ring-4 ring-[#FAF5EB] shrink-0" />
                <span className="text-xs font-medium text-zinc-500 leading-tight">{milestones.past}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-zinc-200/80" />

            {/* Bottom Row: Dynamic Destination Address & Dynamic Arrival Window */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-[#18181A] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <MapPin className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-black text-zinc-900 font-['Outfit'] leading-tight">
                    {getAddressLabel()}
                  </h4>
                  <p className="text-[11px] text-zinc-600 font-medium truncate mt-0.5" title={customerAddress}>
                    {customerAddress}
                  </p>
                </div>
              </div>

              {/* Dynamic Arrived Time Box */}
              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-zinc-500">
                  <AlarmClock className="w-3.5 h-3.5 text-rose-500" />
                  <span>Arrived Window</span>
                </div>
                <p className="text-xs sm:text-sm font-black text-zinc-900 font-['Outfit'] mt-0.5">
                  {getDynamicArrivalWindow()}
                </p>
              </div>
            </div>

          </div>

          {/* 3. Collapsible Order Items Details */}
          <div className="bg-[#242021] rounded-2xl p-3 border border-white/5 text-xs">
            <button 
              onClick={() => setShowItems(!showItems)}
              className="w-full flex items-center justify-between text-zinc-300 font-bold cursor-pointer"
            >
              <span>Order #{currentOrder?.id ? currentOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ORDER'} Details ({currentOrder?.items?.length || 0} {(currentOrder?.items?.length || 0) === 1 ? 'item' : 'items'})</span>
              {showItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showItems && (
              <div className="mt-2.5 space-y-1.5 pt-2 border-t border-white/5 text-zinc-400">
                {currentOrder?.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px]">
                    <span className="text-white font-medium">{it.name} × {it.quantity}</span>
                    <span className="font-bold text-[#E0FF33]">₹{it.price * it.quantity}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/5 flex justify-between font-black text-white text-xs">
                  <span>Total Paid</span>
                  <span className="text-[#E0FF33]">₹{currentOrder?.totalAmount}</span>
                </div>
              </div>
            )}
          </div>

          {/* Delivered Status CTA: Rate & Review */}
          {isStep4 && (
            <button
              onClick={() => {
                if (onRateOrder) onRateOrder(currentOrder);
                else onClose();
              }}
              className="w-full py-3.5 px-4 rounded-full bg-[#E0FF33] hover:bg-[#d8fa26] text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 font-['Outfit']"
            >
              <Sparkles className="w-4 h-4" />
              <span>Rate & Review This Prasad Order</span>
            </button>
          )}

        </div>
      </div>
    </div>
  );
}

