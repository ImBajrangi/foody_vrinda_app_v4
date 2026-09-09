import { useEffect, useRef, useState, useCallback } from 'react';
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
  ShieldCheck,
  CheckCircle2,
  Bike,
  Utensils,
  PackageCheck,
  Check,
  Maximize2,
  Minimize2,
  BellRing
} from 'lucide-react';
import { subscribeSingleCloudOrder } from '../supabase';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import { useNotifications } from '../context/NotificationContext';

export default function ActiveOrderTrackingModal({ order, onClose, onRateOrder, onToast, allShops = [] }) {
  const { systemNotificationPermission, requestSystemNotificationPermission } = useNotifications();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeGroupRef = useRef(null);

  const [showItems, setShowItems] = useState(false);
  const [closing, setClosing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

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

  const handleAnimatedClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  }, [closing, onClose]);

  // Coordinates calculation
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

  // Initialize Carto Leaflet Map
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

    // 2. Origin Kitchen Pin (Uber-style Kitchen Hub)
    const shortShopName = (shop?.name || 'Prem Mandir').replace(/^(Shri\s+|Prem\s+Mandir\s+)/i, '').replace(/\s+(Kitchen|Bhojnalaya|Prasad)$/i, '').trim() || 'Prem Mandir';
    const originIcon = L.divIcon({
      className: 'custom-kitchen-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; width: 34px; height: 42px;">
          <div style="
            width: 32px;
            height: 32px;
            background: #181617;
            border: 2.5px solid #E0FF33;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(0,0,0,0.6), 0 0 12px rgba(224,255,51,0.25);
            cursor: pointer;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E0FF33" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
              <path d="M2 7h20"/>
            </svg>
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 6px solid #181617;
            margin-top: -1px;
          "></div>
          <div style="
            width: 5px;
            height: 5px;
            background: #E0FF33;
            border-radius: 50%;
            box-shadow: 0 0 6px #E0FF33;
            margin-top: 1px;
          "></div>
        </div>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 42]
    });
    const storeMarker = L.marker([shopLat, shopLng], { icon: originIcon, zIndexOffset: 300 });
    storeMarker.bindTooltip(`${shortShopName} (Kitchen)`, { permanent: false, direction: 'top', offset: [0, -36] });
    storeMarker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      storeMarker.toggleTooltip();
    });
    group.addLayer(storeMarker);

    // 3. Destination Pin (Uber-style Seamless Drop-off Hub)
    const destIcon = L.divIcon({
      className: 'custom-home-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; width: 34px; height: 42px;">
          <div style="
            width: 32px;
            height: 32px;
            background: #FFFFFF;
            border: 2.5px solid #181617;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 0 10px rgba(0,0,0,0.15);
            cursor: pointer;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#181617" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 6px solid #181617;
            margin-top: -1px;
          "></div>
          <div style="
            width: 5px;
            height: 5px;
            background: #181617;
            border-radius: 50%;
            margin-top: 1px;
          "></div>
        </div>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 42]
    });
    const destMarker = L.marker([destLat, destLng], { icon: destIcon, zIndexOffset: 400 });
    destMarker.bindTooltip('Drop-off (Your Location)', { permanent: false, direction: 'top', offset: [0, -36] });
    destMarker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      destMarker.toggleTooltip();
    });
    group.addLayer(destMarker);

    // 4. Live Rider Pin (Modern Navigational Vehicle Puck)
    const assignedRiderName = currentOrder?.rider_name || currentOrder?.riderName || currentOrder?.rider?.name;
    const hasLiveRiderInfo = (status === 'out_for_delivery') && Boolean(assignedRiderName || currentOrder?.rider_phone || currentOrder?.riderPhone || currentOrder?.rider_id);

    let riderMarker = null;
    if (hasLiveRiderInfo) {
      const riderIcon = L.divIcon({
        className: 'custom-rider-pin',
        html: `
          <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
            <div style="
              width: 36px;
              height: 36px;
              background: #181617;
              border: 2px solid #E0FF33;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 6px 20px rgba(0,0,0,0.65), 0 0 16px rgba(224,255,51,0.4);
              cursor: pointer;
            ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E0FF33" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18.5" cy="17.5" r="2.5"></circle>
                <circle cx="5.5" cy="17.5" r="2.5"></circle>
                <path d="M15 6h-5a2 2 0 0 0-2 2v2"></path>
                <path d="M6 10h12l-1.5 5.5H8.5L6 10z"></path>
                <path d="M9 18h6"></path>
              </svg>
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const initialRiderPos = [midLat, midLng];
      riderMarker = L.marker(initialRiderPos, { icon: riderIcon, zIndexOffset: 500 });
      riderMarker.bindTooltip(`${assignedRiderName || 'Sarathi Rider'} (Live Delivery)`, { permanent: false, direction: 'top', offset: [0, -20] });
      riderMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        riderMarker.toggleTooltip();
      });
      group.addLayer(riderMarker);
    }

    // 5. Continuous Route Polyline (Zero Gap Delivery Corridor)
    let currentRouteCoords = [
      [shopLat, shopLng],
      [midLat, midLng],
      [destLat, destLng]
    ];

    const roadCasing = L.polyline(currentRouteCoords, {
      color: '#FFFFFF',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(roadCasing);

    const baseSolidLine = L.polyline(currentRouteCoords, {
      color: '#181617',
      weight: 4,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(baseSolidLine);

    const dashedActiveLine = L.polyline(currentRouteCoords, {
      color: '#E0FF33',
      weight: 2.8,
      dashArray: '6, 8',
      className: 'animated-delivery-route',
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(dashedActiveLine);

    let animInterval = null;

    // Fetch OSRM route and guarantee full connection into shopLat/shopLng and destLat/destLng
    fetch(`https://router.project-osrm.org/route/v1/driving/${shopLng},${shopLat};${destLng},${destLat}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data?.routes?.[0]?.geometry?.coordinates) {
          const routeObj = data.routes[0];
          const rawLatLngs = routeObj.geometry.coordinates.map(c => [c[1], c[0]]);

          if (rawLatLngs.length > 0) {
            const distM = routeObj.distance;
            const durS = routeObj.duration;
            setRealDistance(distM < 1000 ? `${Math.round(distM)}m` : `${(distM / 1000).toFixed(1)}km`);
            setRealDurationMins(Math.max(2, Math.round(durS / 60)));
            if (routeObj.legs?.[0]?.summary) {
              setRoadSummary(routeObj.legs[0].summary);
            }

            // Ensure route starts at origin pin and strictly terminates directly under destination pin
            const latLngs = [
              [shopLat, shopLng],
              ...rawLatLngs,
              [destLat, destLng]
            ];

            currentRouteCoords = latLngs;
            roadCasing.setLatLngs(latLngs);
            baseSolidLine.setLatLngs(latLngs);
            dashedActiveLine.setLatLngs(latLngs);

            if (riderMarker) {
              const riderIndex = Math.min(Math.floor(latLngs.length * 0.45), latLngs.length - 1);
              if (latLngs[riderIndex]) {
                riderMarker.setLatLng(latLngs[riderIndex]);
              }

              if (status === 'out_for_delivery') {
                let stepPercent = 0.35;
                animInterval = setInterval(() => {
                  stepPercent = (stepPercent + 0.015) % 0.95;
                  const idx = Math.min(Math.floor(stepPercent * latLngs.length), latLngs.length - 1);
                  if (latLngs[idx] && riderMarker) {
                    riderMarker.setLatLng(latLngs[idx]);
                  }
                }, 1000);
              }
            }

            if (mapInstanceRef.current && routeGroupRef.current) {
              mapInstanceRef.current.fitBounds(routeGroupRef.current.getBounds(), {
                paddingTopLeft: [50, 30],
                paddingBottomRight: [30, isExpanded ? 240 : 100],
                maxZoom: 16
              });
            }
          }
        }
      })
      .catch(() => { });

    // Click on map collapses the bottom sheet to peek mode
    map.on('click', () => {
      setIsExpanded(false);
    });

    group.addTo(map);
    routeGroupRef.current = group;
    mapInstanceRef.current = map;

    map.fitBounds(group.getBounds(), {
      paddingTopLeft: [50, 30],
      paddingBottomRight: [30, isExpanded ? 240 : 100],
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

  // Adjust map bounds when toggling peek / expanded
  useEffect(() => {
    if (mapInstanceRef.current && routeGroupRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.fitBounds(routeGroupRef.current.getBounds(), {
          paddingTopLeft: [50, 30],
          paddingBottomRight: [30, isExpanded ? 220 : 90],
          maxZoom: 16,
          animate: true
        });
      }, 200);
    }
  }, [isExpanded]);

  const handleRecenter = () => {
    if (mapInstanceRef.current && routeGroupRef.current) {
      mapInstanceRef.current.fitBounds(routeGroupRef.current.getBounds(), {
        paddingTopLeft: [50, 30],
        paddingBottomRight: [30, isExpanded ? 220 : 90],
        maxZoom: 16,
        animate: true
      });
    }
  };

  // 120fps GPU synchronized drag-to-dismiss gesture hook (Vrinda Tours Standard)
  const { 
    dragY: modalDragY, 
    isDragging: isModalDragging, 
    sheetStyle: modalSheetStyle, 
    handleProps: modalHandleProps, 
    triggerClose: triggerModalClose 
  } = useBottomSheetDrag(handleAnimatedClose, 65);

  // Bottom drawer gesture hook for smooth collapse to peek mode
  const {
    dragY: drawerDragY,
    isDragging: isDrawerDragging,
    sheetStyle: drawerSheetStyle,
    handleProps: drawerHandleProps
  } = useBottomSheetDrag(() => {
    if (isExpanded) {
      setIsExpanded(false);
    } else {
      handleAnimatedClose();
    }
  }, 45);

  const isStep4 = status === 'completed';

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

  const isOutForDelivery = status === 'out_for_delivery';
  const isDelivered = status === 'completed';

  const riderName = currentOrder?.rider_name || currentOrder?.riderName || currentOrder?.courier_name || currentOrder?.courierName || (isOutForDelivery || isDelivered ? 'Govind Das (Sarathi)' : shop?.managerName || 'Kitchen Dispatch');
  const riderPhone = (currentOrder?.rider_phone || currentOrder?.riderPhone || shop?.phone || shop?.contactPhone || '9876543210').replace(/\D/g, '').slice(-10);
  const riderRating = parseFloat(currentOrder?.rider_rating || shop?.rating || 4.9).toFixed(1);
  const riderPhoto = currentOrder?.rider_avatar || currentOrder?.rider_photo || shop?.managerPhoto || shop?.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80';

  const customerAddress = currentOrder?.customerAddress || currentOrder?.delivery_address || currentOrder?.deliveryAddress || 'Vrindavan Dham';
  const getAddressLabel = () => {
    const addr = customerAddress.toLowerCase();
    if (addr.includes('home') || addr.includes('house') || addr.includes('villa') || addr.includes('niwas')) return 'Home';
    if (addr.includes('office') || addr.includes('work') || addr.includes('shop')) return 'Work';
    if (addr.includes('hotel') || addr.includes('resort') || addr.includes('stay') || addr.includes('guest')) return 'Hotel';
    if (addr.includes('ashram') || addr.includes('mandir') || addr.includes('temple') || addr.includes('dham')) return 'Ashram';
    return 'Destination';
  };

  const getActiveMilestone = () => {
    switch (status) {
      case 'new':
        return { active: 'Order Placed & Verified', past: 'Awaiting Kitchen Preparation', icon: PackageCheck };
      case 'preparing':
        return { active: 'Cooking in Pure Desi Ghee', past: 'Order Confirmed by Kitchen', icon: Utensils };
      case 'ready_for_pickup':
        return { active: 'Packed & Awaiting Pickup', past: 'Prasad Cooked Freshly', icon: PackageCheck };
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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (isExpanded) {
            setIsExpanded(false);
          } else {
            handleAnimatedClose();
          }
        }
      }}
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
    >

      {/* Luxury Obsidian Modal Container with 120fps Gesture Support */}
      <div 
        style={modalSheetStyle}
        className={`w-full max-w-[440px] bg-[#141213] text-white rounded-t-[32px] sm:rounded-[32px] border border-white/10 overflow-hidden flex flex-col h-[92vh] sm:h-[84vh] relative transition-all duration-200 ${closing ? 'translate-y-12 scale-[0.98]' : 'translate-y-0 scale-100'}`}
      >

        {/* Top Header Grab Bar (Drag down anywhere on top to shrink to floating capsule) */}
        <div 
          {...modalHandleProps}
          className="absolute top-0 inset-x-0 h-9 z-[600] flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto select-none"
          title="Drag down to shrink to floating capsule"
        >
          <div className="w-12 h-1.5 bg-white/40 hover:bg-white/70 rounded-full shadow-sm transition-colors" />
        </div>

        {/* Top Leaflet Map Section - Outer Click Collapses to Peek Mode */}
        <div
          onClick={() => {
            if (isExpanded) setIsExpanded(false);
          }}
          className="relative flex-1 bg-[#edf2f7] overflow-hidden cursor-pointer pt-3"
        >
          <div ref={mapContainerRef} className="w-full h-full z-0 pointer-events-auto" />

          {/* Floating Back / Minimize Button (Top Left) */}
          <div className="absolute top-4 left-4 z-[500] flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAnimatedClose();
              }}
              className="w-9 h-9 rounded-full bg-[#181617]/90 hover:bg-[#221F20] text-white backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-95 transition-all cursor-pointer shadow-md pointer-events-auto"
              title="Shrink to Floating Dynamic Island Capsule"
              aria-label="Minimize"
            >
              <ArrowLeft className="w-4.5 h-4.5 stroke-[2.2]" />
            </button>
          </div>

          {/* Floating Controls (Top Right): Recenter & Shrink Capsule Button */}
          <div className="absolute top-4 right-4 z-[500] flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRecenter();
              }}
              className="w-9 h-9 rounded-full bg-[#181617]/90 hover:bg-[#221F20] text-white backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-95 transition-all cursor-pointer shadow-md pointer-events-auto"
              title="Re-center route"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.2]" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAnimatedClose();
              }}
              className="w-9 h-9 rounded-full bg-[#181617]/90 hover:bg-[#221F20] text-[#E0FF33] backdrop-blur-md flex items-center justify-center border border-[#E0FF33]/30 active:scale-95 transition-all cursor-pointer shadow-md pointer-events-auto"
              title="Minimize to Floating Capsule"
            >
              <Minimize2 className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* BOTTOM GESTURE-DRIVEN OBSIDIAN SHEET */}
        <div
          style={{
            transform: isDrawerDragging ? `translateY(${Math.max(0, drawerDragY)}px)` : undefined,
            transition: isDrawerDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className={`bg-[#181617] rounded-t-[28px] relative z-30 border-t border-white/[0.08] flex flex-col transition-all duration-300 ${isExpanded ? 'max-h-[50vh] overflow-y-auto' : 'max-h-[92px]'
            } no-scrollbar`}
        >

          {/* Interactive Drag Handle Header */}
          <div
            {...drawerHandleProps}
            onClick={() => setIsExpanded(!isExpanded)}
            className="pt-2.5 pb-2 px-4 cursor-grab active:cursor-grabbing select-none flex flex-col items-center hover:bg-white/[0.02] transition-colors"
          >
            <div className="w-10 h-1 bg-white/30 hover:bg-white/60 rounded-full mb-1 transition-colors" />
            <div className="w-full flex items-center justify-between text-neutral-400 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-white">
                <span className="w-2 h-2 rounded-full bg-[#E0FF33] animate-pulse" />
                <span className="font-['Outfit'] font-black uppercase text-[10px] tracking-wider text-[#E0FF33]">
                  {milestones.active}
                </span>
              </span>
              <span className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors text-[10px]">
                {isExpanded ? 'Drag down to minimize' : 'Tap to expand details'}
                {isExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              </span>
            </div>
          </div>

          {/* Collapsed Peek Mode Summary Bar */}
          {!isExpanded && (
            <div
              onClick={() => setIsExpanded(true)}
              className="px-4 pb-3 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#221F20] border border-white/10 flex items-center justify-center text-[#E0FF33]">
                  <Clock size={15} />
                </div>
                <div>
                  <p className="text-xs font-black text-white font-['Outfit']">
                    Estimated {getDynamicEstimatedTime()}
                  </p>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {realDistance || '2.2km'} • {getAddressLabel()} ({customerAddress})
                  </p>
                </div>
              </div>

              <span className="bg-[#E0FF33]/15 text-[#E0FF33] text-[10px] font-black px-2.5 py-1 rounded-full border border-[#E0FF33]/20 shrink-0">
                {getDynamicArrivalWindow()}
              </span>
            </div>
          )}

          {/* Expanded Full Details */}
          {isExpanded && (
            <div className="px-4 pb-5 space-y-2.5">

              {/* 1. Hero Dynamic Status & ETA Card */}
              <div className="bg-[#201D1E] border border-white/[0.06] rounded-[20px] p-3.5 relative overflow-hidden">
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#E0FF33] font-['Outfit']">
                      Estimated Delivery
                    </p>
                    <h3 className="text-lg sm:text-xl font-black text-white font-['Outfit'] tracking-tight">
                      {getDynamicEstimatedTime()}
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>Distance: <strong className="text-white font-bold">{realDistance || '2.2km'}</strong></span>
                      {roadSummary && <span className="text-[10px] text-neutral-500">• via {roadSummary}</span>}
                    </p>
                  </div>

                  {/* Arrival Window Pill */}
                  <div className="bg-[#E0FF33]/15 border border-[#E0FF33]/25 px-2.5 py-1 rounded-xl text-right shrink-0">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Arrival in</p>
                    <p className="text-xs font-black text-[#E0FF33] font-['Outfit']">
                      {getDynamicArrivalWindow()}
                    </p>
                  </div>
                </div>

                {/* 4-Step Animated Milestone Progress Stepper */}
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <div className="grid grid-cols-4 gap-1">
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
                          <div className={`h-1 rounded-full transition-all duration-300 ${isPassed ? 'bg-[#E0FF33]' : 'bg-white/10'
                            }`} />
                          <p className={`text-[9px] text-center font-bold truncate ${isCurrent ? 'text-[#E0FF33] font-black' : isPassed ? 'text-neutral-300' : 'text-neutral-600'
                            }`}>
                            {st.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 1-Tap OS Notification Permission Activation */}
                {systemNotificationPermission !== 'granted' && systemNotificationPermission !== 'unsupported' && (
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <BellRing className="w-3.5 h-3.5 text-[#E0FF33] shrink-0 animate-bounce" />
                      <p className="text-[10px] text-neutral-300 truncate">
                        Get live order updates on lock screen
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={requestSystemNotificationPermission}
                      className="px-2.5 py-1 rounded-lg bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black text-[10px] uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
                    >
                      Enable
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Delivery Sarathi Partner Card */}
              <div className="bg-[#201D1E] border border-white/[0.06] rounded-[20px] p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-[#E0FF33]/60 bg-[#141213] shrink-0 relative aspect-square">
                    <img
                      src={riderPhoto}
                      alt={riderName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h4 className="font-bold text-white text-xs sm:text-sm font-['Outfit'] tracking-tight truncate">
                        {riderName}
                      </h4>
                      <ShieldCheck className="w-3 h-3 text-[#E0FF33] shrink-0" />
                    </div>

                    <div className="flex items-center gap-1 text-amber-400 text-[10px] mt-0.5">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-400 stroke-amber-400" />
                        <span className="text-white text-[10px] font-black ml-0.5">{riderRating}</span>
                      </div>
                      <span className="text-neutral-600 text-[9px]">•</span>
                      <span className="text-emerald-400 text-[10px] font-medium truncate">
                        {isOutForDelivery ? 'Sarathi Partner' : 'Sacred Kitchen Dispatch'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`https://wa.me/91${riderPhone}?text=${encodeURIComponent(`Radhe Radhe! Checking status for Foody Vrinda Order #${currentOrder?.id ? currentOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : ''} (${currentOrder?.customerName || 'Customer'})`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (onToast) onToast("Connecting WhatsApp...", "info", "Opening dispatch chat");
                    }}
                    className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    title="WhatsApp dispatch"
                  >
                    <MessageCircle className="w-4 h-4 stroke-[2]" />
                  </a>

                  <a
                    href={`tel:${riderPhone}`}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white border border-white/10 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    title="Call dispatch"
                  >
                    <Phone className="w-4 h-4 stroke-[2]" />
                  </a>
                </div>
              </div>

              {/* 3. Delivery Route Location Details */}
              <div className="bg-[#201D1E] border border-white/[0.06] rounded-[20px] p-3 space-y-2.5">
                {/* Origin */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/5 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Utensils className="w-3.5 h-3.5 text-[#E0FF33]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">From Kitchen</p>
                    <p className="text-xs font-bold text-white truncate font-['Outfit']">{shop?.name || 'Foody Vrinda Sacred Kitchen'}</p>
                    <p className="text-[10px] text-neutral-400 truncate">{shop?.address || 'Chatikara Road, Raman Reti, Vrindavan'}</p>
                  </div>
                </div>

                <div className="border-t border-dashed border-white/5 ml-3 pl-3" />

                {/* Drop-off Destination */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#E0FF33]/15 text-[#E0FF33] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#E0FF33]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{getAddressLabel()} Drop-off</p>
                      <span className="text-[9px] font-bold text-[#E0FF33] bg-[#E0FF33]/10 px-1.5 py-0.2 rounded-md border border-[#E0FF33]/20">
                        {realDistance || '2.2km'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white font-['Outfit'] mt-0.5 truncate" title={customerAddress}>
                      {customerAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Collapsible Order Items Details */}
              <div className="bg-[#141213] rounded-[18px] p-3 border border-white/[0.06] text-xs">
                <button
                  onClick={() => setShowItems(!showItems)}
                  className="w-full flex items-center justify-between text-neutral-300 hover:text-white font-bold cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Order #{currentOrder?.id ? currentOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ORDER'}</span>
                    <span className="text-[9px] font-black px-2 py-0.2 rounded-full bg-white/10 text-neutral-300">
                      {currentOrder?.items?.length || 1} {(currentOrder?.items?.length || 1) === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  {showItems ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showItems && (
                  <div className="mt-2.5 space-y-1.5 pt-2 border-t border-white/5 text-neutral-400">
                    {currentOrder?.items?.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span className="text-white font-medium">{it.name} × {it.quantity}</span>
                        <span className="font-bold text-[#E0FF33]">₹{it.price * it.quantity}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-white/5 flex justify-between items-center font-black text-white text-xs">
                      <span>Total Amount Paid</span>
                      <span className="text-[#E0FF33] font-['Outfit'] text-sm">₹{currentOrder?.totalAmount || '140'}</span>
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
                  className="w-full py-3 px-4 rounded-full bg-[#E0FF33] hover:bg-[#d8fa26] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 font-['Outfit'] shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Rate & Review This Prasad Order</span>
                </button>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
