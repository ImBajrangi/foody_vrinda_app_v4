import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
  BellRing,
  Copy,
  Flame,
  Ticket,
  Lock,
  Navigation
} from 'lucide-react';
import { subscribeSingleCloudOrder, resolveDishCutout, getOrderOTP } from '../supabase';
import FoodyMascot from '../foody/FoodyMascot';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import { useNotifications } from '../context/NotificationContext';
import { useBackHandler } from '../hooks/useBackHandler';

export default function ActiveOrderTrackingModal({ order, onClose, onRateOrder, onToast, allShops = [] }) {
  const { systemNotificationPermission, requestSystemNotificationPermission } = useNotifications();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeGroupRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  const [showItems, setShowItems] = useState(false);
  const [closing, setClosing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedOtp, setCopiedOtp] = useState(false);

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

  const orderShopId = currentOrder?.shopId || currentOrder?.shop_id;
  const matchedShop = (allShops && allShops.length > 0 && orderShopId)
    ? allShops.find(s => s.id === orderShopId)
    : null;
  const shop = matchedShop || {
    name: currentOrder?.shopName || 'Foody Vrinda Kitchen',
    coordinates: { lat: 27.5706, lng: 77.6593 }
  };
  const shortShopName = (shop?.name || 'Prem Mandir')
    .replace(/^(Shri\s+|Prem\s+Mandir\s+)/i, '')
    .replace(/\s+(Kitchen|Bhojnalaya|Prasad)$/i, '')
    .trim() || 'Prem Mandir';

  const handleAnimatedClose = useCallback((isImmediate = false) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (isImmediate === true) {
      setClosing(false);
      onClose();
      return;
    }
    if (closing) return;
    setClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setClosing(false);
      onClose();
      closeTimeoutRef.current = null;
    }, 200);
  }, [closing, onClose]);

  // Coordinates calculation
  const shopLat = parseFloat(shop?.coordinates?.lat || shop?.lat) || 27.5706;
  const shopLng = parseFloat(shop?.coordinates?.lng || shop?.lng) || 77.6593;

  const rawDest = currentOrder?.deliveryCoordinates || currentOrder?.delivery_coordinates || currentOrder?.coords;
  let destLat = parseFloat(rawDest?.lat);
  let destLng = parseFloat(rawDest?.lng);

  if (isNaN(destLat) || isNaN(destLng) || (destLat === 0 && destLng === 0) || (Math.abs(destLat - shopLat) < 0.0005 && Math.abs(destLng - shopLng) < 0.0005)) {
    destLat = shopLat + 0.0095;
    destLng = shopLng + 0.0075;
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

    const isDark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
    const primaryThemeColor = isDark ? '#FD9139' : '#D97706';
    const pinBg = isDark ? '#181617' : '#FFFFFF';
    const pinBorder = isDark ? '#FD9139' : '#D97706';

    const cartoKey = import.meta.env.VITE_CARTO_BASEMAP_KEY || 'cb1_25xx_1_ef24909b63d9228a6de7508f';
    const cartoSuffix = cartoKey ? `?key=${cartoKey}` : '';
    const mapTileUrl = isDark
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${cartoSuffix}`
      : `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${cartoSuffix}`;

    L.tileLayer(
      mapTileUrl,
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
        <div style="
          width: 36px;
          height: 36px;
          background: ${pinBg};
          border: 2.5px solid ${pinBorder};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${pinBorder}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
            <path d="M2 7h20"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    const storeMarker = L.marker([shopLat, shopLng], { icon: originIcon, zIndexOffset: 300 });
    group.addLayer(storeMarker);

    // 3. Destination Pin (Uber-style Seamless Drop-off Hub)
    const destIcon = L.divIcon({
      className: 'custom-home-pin',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          background: #FFFFFF;
          border: 2.5px solid #181617;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#181617" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    const destMarker = L.marker([destLat, destLng], { icon: destIcon, zIndexOffset: 400 });
    group.addLayer(destMarker);

    // 4. Live Rider Pin (Modern Navigational Vehicle Puck with clean radar ping)
    const assignedRiderName = currentOrder?.rider_name || currentOrder?.riderName || currentOrder?.rider?.name;
    const hasLiveRiderInfo = (status === 'out_for_delivery') && Boolean(assignedRiderName || currentOrder?.rider_phone || currentOrder?.riderPhone || currentOrder?.rider_id);

    let riderMarker = null;
    if (hasLiveRiderInfo) {
      const riderIcon = L.divIcon({
        className: 'custom-rider-pin',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
            <div class="radar-ping-circle" style="
              position: absolute;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border: 1.5px solid #E0FF33;
              background: rgba(224, 255, 51, 0.12);
              pointer-events: none;
            "></div>
            <div style="
              position: relative;
              width: 36px;
              height: 36px;
              background: #181617;
              border: 2.5px solid #E0FF33;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(0,0,0,0.45);
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
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const initialRiderPos = [midLat, midLng];
      riderMarker = L.marker(initialRiderPos, { icon: riderIcon, zIndexOffset: 500 });
      group.addLayer(riderMarker);
    }

    // 5. Direct Walking Connector: Guarantees dots always travel straight from road edge directly into pins
    const generateWalkingPath = (start, end) => {
      if (!start || !end) return [];
      const [lat1, lng1] = start;
      const [lat2, lng2] = end;

      const dLat = lat2 - lat1;
      const dLng = lng2 - lng1;
      const dist = Math.hypot(dLat, dLng);
      if (dist === 0) return [start, end];

      // Sample points along direct trajectory so dashed dots animate cleanly into the pin
      const steps = Math.min(24, Math.max(6, Math.round(dist * 1200)));
      const points = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        points.push([
          lat1 + dLat * t,
          lng1 + dLng * t
        ]);
      }
      return points;
    };

    let currentRouteCoords = [
      [shopLat, shopLng],
      [midLat, midLng],
      [destLat, destLng]
    ];

    // Road Casing (Crisp Solid Dark Underlay for 100% contrast)
    const roadCasing = L.polyline(currentRouteCoords, {
      color: '#181617',
      weight: 5.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(roadCasing);

    const routeColor = '#E0FF33';

    // Vibrant Animated Flowing Delivery Route (Neon Electric Yellow-Green #E0FF33)
    const roadLine = L.polyline(currentRouteCoords, {
      color: routeColor,
      weight: 3.5,
      dashArray: '6, 9',
      className: 'animated-delivery-route',
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(roadLine);

    // Start Connector Casing (Kitchen -> Road Start Obsidian Beads)
    const startConnectorCasing = L.polyline([], {
      color: '#121011',
      weight: 6.5,
      dashArray: '1, 16',
      className: 'casing-parabolic-dots',
      opacity: 0.98,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(startConnectorCasing);

    // Clean Animated Walking Dots (Kitchen -> Road Start Glowing Beads)
    const startConnector = L.polyline([], {
      color: routeColor,
      weight: 4.5,
      dashArray: '1, 16',
      className: 'animated-walking-dots',
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(startConnector);

    // Walking Connector Casing (Road End -> Doorstep Obsidian Beads)
    const walkingConnectorCasing = L.polyline([], {
      color: '#121011',
      weight: 6.5,
      dashArray: '1, 16',
      className: 'casing-parabolic-dots',
      opacity: 0.98,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(walkingConnectorCasing);

    // Walking Connector Foreground (Road End -> Doorstep Glowing Beads)
    const walkingConnector = L.polyline([], {
      color: routeColor,
      weight: 4.5,
      dashArray: '1, 16',
      className: 'animated-walking-dots',
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(walkingConnector);

    // Road Drop-off Terminus Dot (Where vehicle stops and walking begins)
    const dropOffStopDot = L.circleMarker([destLat, destLng], {
      radius: 5,
      color: '#181617',
      fillColor: routeColor,
      fillOpacity: 1,
      weight: 2.5
    });


    let animInterval = null;

    // Fetch OSRM route and establish road driving path + dynamic straight connector to doorstep
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

            const roadStart = rawLatLngs[0];
            const roadEnd = rawLatLngs[rawLatLngs.length - 1];

            // Set main road driving path with continuous animated dashes
            currentRouteCoords = rawLatLngs;
            roadCasing.setLatLngs(rawLatLngs);
            roadLine.setLatLngs(rawLatLngs);

            // Connect Kitchen -> Road Start with straight cased walking connector
            const isStartOffset = Math.hypot(roadStart[0] - shopLat, roadStart[1] - shopLng) > 0.0001;
            if (isStartOffset) {
              const startPath = generateWalkingPath([shopLat, shopLng], roadStart);
              startConnectorCasing.setLatLngs(startPath);
              startConnector.setLatLngs(startPath);
            } else {
              startConnectorCasing.setLatLngs([]);
              startConnector.setLatLngs([]);
            }

            // Connect Road End -> Doorstep Pin with straight cased walking connector
            const isEndOffset = Math.hypot(roadEnd[0] - destLat, roadEnd[1] - destLng) > 0.0001;
            if (isEndOffset) {
              const walkingPath = generateWalkingPath(roadEnd, [destLat, destLng]);
              walkingConnectorCasing.setLatLngs(walkingPath);
              walkingConnector.setLatLngs(walkingPath);
              dropOffStopDot.setLatLng(roadEnd);
              if (!group.hasLayer(dropOffStopDot)) {
                group.addLayer(dropOffStopDot);
              }
            } else {
              walkingConnectorCasing.setLatLngs([]);
              walkingConnector.setLatLngs([]);
              if (group.hasLayer(dropOffStopDot)) {
                group.removeLayer(dropOffStopDot);
              }
            }

            if (riderMarker) {
              const riderIndex = Math.min(Math.floor(rawLatLngs.length * 0.45), rawLatLngs.length - 1);
              if (rawLatLngs[riderIndex]) {
                riderMarker.setLatLng(rawLatLngs[riderIndex]);
              }

              if (status === 'out_for_delivery') {
                let stepPercent = 0.35;
                animInterval = setInterval(() => {
                  stepPercent = (stepPercent + 0.015) % 0.95;
                  const idx = Math.min(Math.floor(stepPercent * rawLatLngs.length), rawLatLngs.length - 1);
                  if (rawLatLngs[idx] && riderMarker) {
                    riderMarker.setLatLng(rawLatLngs[idx]);
                  }
                }, 1000);
              }
            }

            if (mapInstanceRef.current && routeGroupRef.current) {
              applyProfessionalViewport(mapInstanceRef.current, routeGroupRef.current, isExpanded, true);
            }
          }
        }
      })
      .catch(() => {
        currentRouteCoords = [[shopLat, shopLng], [destLat, destLng]];
        roadCasing.setLatLngs(currentRouteCoords);
        roadLine.setLatLngs(currentRouteCoords);
        startConnectorCasing.setLatLngs([]);
        startConnector.setLatLngs([]);
        walkingConnectorCasing.setLatLngs([]);
        walkingConnector.setLatLngs([]);
      });

    // Click on map collapses the bottom sheet to peek mode
    map.on('click', () => {
      setIsExpanded(false);
    });

    group.addTo(map);
    routeGroupRef.current = group;
    mapInstanceRef.current = map;

    // Initial viewport framing with layout stabilization timer
    applyProfessionalViewport(map, group, isExpanded, false);
    const stabilizeTimer = setTimeout(() => {
      if (mapInstanceRef.current && routeGroupRef.current) {
        applyProfessionalViewport(mapInstanceRef.current, routeGroupRef.current, isExpanded, false);
      }
    }, 160);

    return () => {
      if (stabilizeTimer) clearTimeout(stabilizeTimer);
      if (animInterval) clearInterval(animInterval);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [order?.id, shopLat, shopLng, destLat, destLng, status]);

  // Dynamic Professional Viewport Adjuster (Uber / Swiggy Map Standard)
  const applyProfessionalViewport = (map, group, isExpandedMode = false, animate = true) => {
    if (!map || !group) return;
    try {
      map.invalidateSize();
      const rawBounds = group.getBounds();
      if (!rawBounds || !rawBounds.isValid()) return;

      const ne = rawBounds.getNorthEast();
      const sw = rawBounds.getSouthWest();
      const latDiff = Math.abs(ne.lat - sw.lat);
      const lngDiff = Math.abs(ne.lng - sw.lng);
      const maxSpan = Math.max(latDiff, lngDiff);

      let paddedBounds = rawBounds;
      let targetMaxZoom = 16;

      // Smart proximity padding: ensures breathing room on close addresses while keeping full route visible
      if (maxSpan < 0.005) {
        paddedBounds = rawBounds.pad(0.35);
        targetMaxZoom = 17;
      } else if (maxSpan < 0.02) {
        paddedBounds = rawBounds.pad(0.18);
        targetMaxZoom = 16;
      } else {
        paddedBounds = rawBounds.pad(0.10);
        targetMaxZoom = 15;
      }

      map.fitBounds(paddedBounds, {
        paddingTopLeft: [65, 35],
        paddingBottomRight: [35, isExpandedMode ? 320 : 100],
        maxZoom: targetMaxZoom,
        animate: animate,
        duration: animate ? 0.6 : 0
      });
    } catch (_) { }
  };

  // Adjust map bounds when toggling peek / expanded safely
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timer = setTimeout(() => {
      try {
        mapInstanceRef.current.invalidateSize();
      } catch (_) { }
      if (routeGroupRef.current) {
        applyProfessionalViewport(mapInstanceRef.current, routeGroupRef.current, isExpanded, true);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  const handleRecenter = () => {
    if (mapInstanceRef.current && routeGroupRef.current) {
      applyProfessionalViewport(mapInstanceRef.current, routeGroupRef.current, isExpanded, true);
    }
  };

  // 120fps GPU synchronized drag-to-dismiss gesture hook (Unified Single-Swipe Dismissal)
  const {
    sheetRef: modalSheetRef,
    isDragging: isModalDragging,
    sheetStyle: modalSheetStyle,
    handleProps: modalHandleProps,
    hasMoved: modalHasMoved
  } = useBottomSheetDrag(handleAnimatedClose, 30);

  // Register Tracking Modal with Back Handler Stack (Collapses if expanded, or closes)
  useBackHandler(Boolean(order), () => {
    if (isExpanded) {
      setIsExpanded(false);
    } else {
      handleAnimatedClose();
    }
  }, 'active_order_tracking_modal', 12);

  // Reset modal sheet transform on open
  useEffect(() => {
    if (order && modalSheetRef.current) {
      modalSheetRef.current.style.transform = '';
      modalSheetRef.current.style.opacity = '1';
      modalSheetRef.current.style.transition = '';
    }
  }, [order]);

  const isStep4 = status === 'completed';

  const getDynamicEstimatedTime = () => {
    const basePrep = (status === 'new' || status === 'preparing') ? 12 : 2;
    const travel = realDurationMins || 8;
    const totalMinutes = basePrep + travel;
    const d = new Date();
    d.setMinutes(d.getMinutes() + totalMinutes);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const isPickup = currentOrder?.fulfillment_type === 'pickup' || currentOrder?.fulfillmentType === 'pickup';
  const otpCode = getOrderOTP(currentOrder, isPickup ? 'pickup' : 'delivery') || '1080';

  const getDynamicArrivalWindow = () => {
    if (status === 'completed' || status === 'delivered') return isPickup ? 'Collected' : 'Delivered';
    if (isPickup) {
      return (status === 'ready_for_pickup' || status === 'out_for_delivery') ? 'Ready at Counter' : '10–15 min prep';
    }
    const travel = realDurationMins || 8;
    const minTime = Math.max(1, travel - 2);
    const maxTime = travel + 4;
    return `${minTime}–${maxTime} min window`;
  };

  const isOutForDelivery = status === 'out_for_delivery';
  const isDelivered = status === 'completed' || status === 'delivered';

  const riderName = currentOrder?.rider_name || currentOrder?.riderName || currentOrder?.courier_name || currentOrder?.courierName || (isOutForDelivery || isDelivered ? (isPickup ? 'Store Counter' : 'Govind Das (Sarathi)') : shop?.managerName || 'Kitchen Dispatch');
  const riderPhone = (currentOrder?.rider_phone || currentOrder?.riderPhone || shop?.phone || shop?.contactPhone || '9876543210').replace(/\D/g, '').slice(-10);
  const riderRating = parseFloat(currentOrder?.rider_rating || shop?.rating || 4.9).toFixed(1);
  const riderPhoto = currentOrder?.rider_avatar || currentOrder?.rider_photo || shop?.managerPhoto || shop?.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80';

  const customerAddress = currentOrder?.customerAddress || currentOrder?.delivery_address || currentOrder?.deliveryAddress || 'Vrindavan Dham';
  const getAddressLabel = () => {
    if (isPickup) return 'Counter Pickup';
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
        return isPickup
          ? { active: `Ready for Counter Pickup at ${shortShopName}`, past: 'Cooked in Pure Desi Ghee', icon: PackageCheck }
          : { active: 'Packed & Awaiting Pickup', past: 'Prasad Cooked Freshly', icon: PackageCheck };
      case 'out_for_delivery':
        return isPickup
          ? { active: `Ready for Counter Pickup at ${shortShopName}`, past: 'Prasad Packed & Ready', icon: PackageCheck }
          : { active: `On its way with ${riderName}`, past: 'Dispatched from Sacred Kitchen', icon: Bike };
      case 'completed':
      case 'delivered':
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
          handleAnimatedClose();
        }
      }}
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
    >

      {/* Luxury Obsidian Modal Container with 120fps Gesture Support (preserve-dark keeps dark Obsidian aesthetics in all themes) */}
      <div
        ref={modalSheetRef}
        style={modalSheetStyle}
        className={`preserve-dark w-full max-w-full sm:max-w-[460px] md:max-w-lg bg-[#141213] text-white rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-white/10 overflow-hidden flex flex-col h-[92vh] sm:h-[84vh] relative transition-all duration-200 ${closing ? 'translate-y-12 scale-[0.98]' : 'translate-y-0 scale-100'}`}
      >

        {/* Top Header Grab Bar (Drag down to shrink to floating capsule) */}
        <div className="absolute top-0 inset-x-0 h-11 z-[500] flex items-center justify-center pointer-events-none select-none">
          <div
            {...modalHandleProps}
            className="w-48 h-11 flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto touch-none"
            title="Drag down to close"
          >
            <div className="w-12 h-1.5 bg-black/40 hover:bg-black/60 rounded-full transition-colors shadow-sm" />
          </div>
        </div>

        {/* Dedicated Floating Controls (Clean, shadowless modern buttons over map) */}
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top)+6px)] inset-x-3.5 z-[1000] flex items-center justify-between pointer-events-none">
          {/* Back / Close Button */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAnimatedClose(true);
            }}
            className="w-10 h-10 rounded-full bg-[#181617]/90 hover:bg-[#252223] text-white active:scale-95 flex items-center justify-center border border-white/20 cursor-pointer pointer-events-auto backdrop-blur-md transition-all"
            title="Close / Shrink to floating capsule"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Right Action Controls: Re-center + Minimize */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRecenter();
              }}
              className="w-10 h-10 rounded-full bg-[#181617]/90 hover:bg-[#252223] text-white active:scale-95 flex items-center justify-center border border-white/20 cursor-pointer backdrop-blur-md transition-all"
              title="Re-center Live Route"
              aria-label="Re-center"
            >
              <RotateCcw className="w-4.5 h-4.5 stroke-[2.4]" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAnimatedClose(true);
              }}
              className="w-10 h-10 rounded-full bg-[#181617]/90 hover:bg-[#252223] text-[#FD9139] active:scale-95 flex items-center justify-center border border-[#FD9139]/40 cursor-pointer backdrop-blur-md transition-all"
              title="Minimize to Floating Capsule"
              aria-label="Minimize"
            >
              <Minimize2 className="w-4.5 h-4.5 stroke-[2.4]" />
            </button>
          </div>
        </div>

        {/* Top Leaflet Map Section - Outer Click Collapses to Peek Mode */}
        <div
          onClick={() => {
            if (isExpanded) setIsExpanded(false);
          }}
          className="relative flex-1 bg-[#edf2f7] overflow-hidden cursor-pointer"
        >
          <div ref={mapContainerRef} className="w-full h-full z-0 pointer-events-auto" />
        </div>

        {/* BOTTOM GESTURE-DRIVEN OBSIDIAN SHEET */}
        <div
          className={`preserve-dark bg-[#181617] rounded-t-[28px] relative z-30 border-t border-white/[0.08] flex flex-col transition-all duration-300 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${isExpanded ? 'max-h-[62vh] sm:max-h-[65vh] overflow-y-auto' : 'min-h-[92px]'
            } no-scrollbar`}
        >

          {/* Interactive Drag Handle Header */}
          <div
            {...modalHandleProps}
            onClick={() => {
              if (modalHasMoved && modalHasMoved()) return;
              setIsExpanded(!isExpanded);
            }}
            className="sticky top-0 z-40 bg-[#181617]/95 backdrop-blur-md pt-3 pb-2.5 px-4 cursor-grab active:cursor-grabbing select-none flex flex-col items-center hover:bg-white/[0.02] transition-colors touch-none border-b border-white/[0.04]"
            title="Tap to toggle • Drag down to close"
          >
            <div className="w-12 h-1.5 bg-white/35 hover:bg-white/50 rounded-full mb-2.5 transition-colors" />
            <div className="w-full flex items-center justify-between text-stone-300 text-[11px] font-bold">
              <span className="flex items-center gap-2 text-white">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FD9139] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FD9139]"></span>
                </span>
                <span className="font-['Outfit'] font-black uppercase text-[10px] sm:text-[11px] tracking-wider text-[#FD9139]">
                  {isExpanded 
                    ? `Order #${currentOrder?.id ? currentOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ACTIVE'}`
                    : milestones.active}
                </span>
              </span>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.08] border border-white/15 text-stone-200 hover:text-white transition-colors text-[10px] font-semibold">
                {isExpanded ? 'Drag down' : 'Tap to expand'}
                {isExpanded ? <ChevronDown size={12} className="text-[#FD9139]" /> : <ChevronUp size={12} className="text-[#FD9139]" />}
              </span>
            </div>
          </div>

          {/* Collapsed Peek Mode Summary Bar */}
          {!isExpanded && (
            <div
              {...modalHandleProps}
              onClick={() => {
                if (modalHasMoved && modalHasMoved()) return;
                setIsExpanded(true);
              }}
              className="px-4 pb-3 flex items-center justify-between cursor-pointer select-none touch-none"
              title="Tap to expand details • Drag down to close"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
                <div className="w-9 h-9 rounded-xl bg-[#221F20] border border-white/10 flex items-center justify-center text-[#FD9139] shrink-0 shadow-sm">
                  <Clock size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-white font-['Outfit'] truncate">
                    Estimated {getDynamicEstimatedTime()}
                  </p>
                  <p className="text-[10px] text-stone-400 truncate">
                    {realDistance || '2.2km'} • {getAddressLabel()} ({customerAddress})
                  </p>
                </div>
              </div>

              <span className="bg-[#FD9139]/15 text-[#FD9139] text-[10px] font-black px-2.5 py-1 rounded-full border border-[#FD9139]/30 shrink-0 whitespace-nowrap font-['Outfit']">
                {getDynamicArrivalWindow()}
              </span>
            </div>
          )}

          {/* Expanded Full Details */}
          {isExpanded && (
            <div className="px-4 pb-5 space-y-3">

              {/* 1. Main Status, ETA & Stepper Card (Minimal & Theme Relatable) */}
              <div className="bg-[#221F20] border border-white/[0.08] rounded-2xl p-4 shadow-sm">
                {/* Status + Time Pill Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FD9139] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FD9139]"></span>
                    </span>
                    <span className="text-[11px] font-bold text-[#FD9139] font-['Outfit'] uppercase tracking-wider truncate">
                      {milestones.active}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] font-semibold text-stone-300 shrink-0">
                    <Clock className="w-3 h-3 text-[#FD9139]" />
                    <span>{getDynamicArrivalWindow()}</span>
                  </div>
                </div>

                {/* Hero ETA Display */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl sm:text-4xl font-black text-white font-['Outfit'] tracking-tight">
                      {getDynamicEstimatedTime()}
                    </h3>
                    <span className="text-xs font-semibold text-stone-400">
                      {isPickup ? 'Estimated Ready' : 'Estimated Arrival'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-1 truncate">
                    {isPickup 
                      ? `Counter collection at ${shortShopName || 'Kitchen'} · ${realDistance || '2.2km'}` 
                      : `From ${shop?.name || 'Kitchen'} · ${realDistance || '2.2km'}`}
                  </p>
                </div>

                {/* Minimal Connected Stepper */}
                <div className="pt-1">
                  <div className="relative flex items-start justify-between px-3">
                    {/* Track Underlay */}
                    <div className="absolute left-6 right-6 top-3.5 -translate-y-1/2 h-0.5 bg-white/10 z-0" />
                    {/* Active Track Progress */}
                    <div 
                      className="absolute left-6 top-3.5 -translate-y-1/2 h-0.5 bg-[#FD9139] z-0 transition-all duration-500"
                      style={{ width: `calc((100% - 48px) * ${Math.min(currentStage, 3) / 3})` }}
                    />

                    {[
                      { label: 'Placed', icon: Check },
                      { label: 'Cooking', icon: Utensils },
                      { label: isPickup ? 'Ready' : 'On Way', icon: isPickup ? PackageCheck : Bike },
                      { label: isPickup ? 'Collected' : 'Delivered', icon: CheckCircle2 }
                    ].map((st, idx) => {
                      const isPassed = currentStage > idx;
                      const isCurrent = currentStage === idx;
                      const Icon = st.icon;

                      return (
                        <div key={idx} className="flex flex-col items-center relative z-10">
                          <div 
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                              isCurrent 
                                ? 'bg-[#FD9139] text-white shadow-[0_0_12px_rgba(253,145,57,0.5)] ring-4 ring-[#FD9139]/20 scale-105' 
                                : isPassed 
                                  ? 'bg-[#FD9139] text-white' 
                                  : 'bg-[#181617] text-stone-500 border border-white/15'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 stroke-[2.4]" />
                          </div>
                          <span 
                            className={`text-[10px] font-['Outfit'] mt-1.5 transition-colors whitespace-nowrap ${
                              isCurrent 
                                ? 'text-[#FD9139] font-bold' 
                                : isPassed 
                                  ? 'text-white font-medium' 
                                  : 'text-stone-500 font-normal'
                            }`}
                          >
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Subtle Lockscreen Updates Banner */}
                {systemNotificationPermission !== 'granted' && systemNotificationPermission !== 'unsupported' && (
                  <div className="mt-3.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <BellRing className="w-3.5 h-3.5 text-[#FD9139] shrink-0" />
                      <span className="text-[11px] text-stone-300 truncate">Lock screen live status updates</span>
                    </div>
                    <button
                      type="button"
                      onClick={requestSystemNotificationPermission}
                      className="text-[11px] font-bold text-[#FD9139] hover:underline cursor-pointer shrink-0"
                    >
                      Enable
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Pickup Token / Partner Dispatch Hub */}
              <div className="bg-[#221F20] border border-white/[0.12] rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-sm">
                {isPickup ? (
                  <>
                    {/* Pickup Token Block */}
                    <div className="flex items-center justify-between gap-3 bg-[#181617] rounded-xl p-3.5 border border-[#FD9139]/40 shadow-inner">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Ticket className="w-3.5 h-3.5 text-[#FD9139]" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#FD9139] font-['Outfit']">
                            Counter Pickup Token
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl sm:text-3xl font-black text-[#FD9139] font-['Outfit'] tracking-wider drop-shadow-[0_2px_8px_rgba(253,145,57,0.3)]">
                            #{otpCode}
                          </span>
                          <span className="text-[11px] text-stone-300 font-medium">
                            Show at counter
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(otpCode);
                          setCopiedOtp(true);
                          setTimeout(() => setCopiedOtp(false), 2000);
                          if (onToast) onToast(`Copied Token #${otpCode}`, 'success');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-white border border-white/10 transition-all cursor-pointer shrink-0"
                      >
                        {copiedOtp ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#FD9139]" />
                            <span className="text-stone-200">Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Store Counter Location & Action Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white font-['Outfit'] truncate">
                          {shop?.name || 'Foody Vrinda Sacred Kitchen'}
                        </p>
                        <p className="text-[11px] text-stone-300 truncate mt-0.5">
                          {shop?.address || 'Chatikara Road, Raman Reti, Vrindavan'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${shop?.coordinates?.lat || 27.5706},${shop?.coordinates?.lng || 77.6593}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-[#FD9139]/20 hover:bg-[#FD9139]/30 border border-[#FD9139]/40 text-[#FD9139] text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                          title="Get Directions"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Directions</span>
                        </a>

                        <a
                          href={`tel:${riderPhone}`}
                          className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-[#FD9139] flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                          title="Call Kitchen"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Delivery Partner Sarathi Row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-[#FD9139]/40 bg-[#181617] shrink-0">
                          <img
                            src={riderPhoto}
                            alt={riderName}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white font-['Outfit'] truncate">
                              {riderName}
                            </h4>
                            <ShieldCheck className="w-3.5 h-3.5 text-[#FD9139] shrink-0" />
                          </div>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            ⭐ {riderRating} · {isOutForDelivery ? 'Sarathi Partner' : 'Kitchen Dispatch'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`https://wa.me/91${riderPhone}?text=${encodeURIComponent(`Radhe Radhe! Checking status for Order #${currentOrder?.id ? currentOrder.id.slice(-5).toUpperCase() : ''}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="WhatsApp chat"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </a>

                        <a
                          href={`tel:${riderPhone}`}
                          className="px-2.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="Call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      </div>
                    </div>

                    {/* Delivery PIN Row */}
                    <div className="flex items-center justify-between bg-[#181617] rounded-xl px-3 py-2 border border-white/[0.06]">
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          Delivery Verification PIN
                        </span>
                        <p className="text-xs text-stone-300 font-medium">
                          Share with Sarathi upon delivery
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-[#FD9139] font-['Outfit'] tracking-widest bg-white/[0.04] px-2.5 py-1 rounded-lg border border-[#FD9139]/30">
                          {otpCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(otpCode);
                            setCopiedOtp(true);
                            setTimeout(() => setCopiedOtp(false), 2000);
                            if (onToast) onToast(`Copied PIN ${otpCode}`, 'success');
                          }}
                          className="text-stone-400 hover:text-white p-1 transition-colors cursor-pointer"
                          title="Copy PIN"
                        >
                          {copiedOtp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#FD9139]" />}
                        </button>
                      </div>
                    </div>

                    {/* Delivery Destination Address */}
                    <div className="flex items-start gap-2.5 pt-1 text-[11px] text-stone-400 border-t border-white/[0.06]">
                      <MapPin className="w-3.5 h-3.5 text-[#FD9139] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-stone-300">{getAddressLabel()}: </span>
                        <span className="truncate">{customerAddress}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 3. Collapsible Order Items Details */}
              <div className="bg-[#221F20] rounded-2xl p-3.5 border border-white/[0.12] text-xs shadow-sm">
                <button
                  onClick={() => setShowItems(!showItems)}
                  className="w-full flex items-center justify-between text-stone-200 hover:text-white font-bold cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-['Outfit'] tracking-wide">Order #{currentOrder?.id ? currentOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ORDER'}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-stone-200">
                      {currentOrder?.items?.length || 1} {(currentOrder?.items?.length || 1) === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  {showItems ? <ChevronUp className="w-3.5 h-3.5 text-[#FD9139]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#FD9139]" />}
                </button>

                {showItems && (
                  <div className="mt-2.5 space-y-2 pt-2.5 border-t border-white/10 text-stone-200">
                    {currentOrder?.items?.map((it, idx) => {
                      const itemImg = resolveDishCutout(it.image || it.imageUrl, it.name, it.category);
                      return (
                        <div key={idx} className="flex justify-between items-center text-[12px] gap-2 py-0.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={itemImg}
                              alt={it.name || 'Dish'}
                              className="w-8 h-8 rounded-lg object-cover bg-neutral-900 border border-white/15 shrink-0"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=120&auto=format&fit=crop&q=80';
                              }}
                            />
                            <span className="text-white font-semibold truncate">{it.name} × {it.quantity}</span>
                          </div>
                          <span className="font-bold text-[#FD9139] shrink-0 font-['Outfit'] text-xs">₹{it.price * it.quantity}</span>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-white/10 space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center text-stone-300">
                        <span>Item Subtotal</span>
                        <span className="text-white font-medium">₹{currentOrder?.subtotal || currentOrder?.totalAmount || '140'}</span>
                      </div>
                      <div className="flex justify-between items-center text-stone-300">
                        <span>GST & Govt Taxes (5%)</span>
                        <span className="text-white font-medium">₹{currentOrder?.gst_amount || currentOrder?.gstAmount || Math.round(Number(currentOrder?.totalAmount || 140) * 0.05)}</span>
                      </div>
                      <div className="flex justify-between items-center text-stone-300">
                        <span>Delivery & Packaging</span>
                        <span className="text-emerald-400 font-black">{Number(currentOrder?.delivery_charge || currentOrder?.deliveryCharge || 0) > 0 ? `₹${currentOrder?.delivery_charge || currentOrder?.deliveryCharge}` : 'FREE'}</span>
                      </div>
                      <div className="pt-2 border-t border-white/10 flex justify-between items-center font-black text-white text-xs">
                        <span>Total Amount</span>
                        <span className="text-[#FD9139] font-['Outfit'] text-sm">₹{currentOrder?.totalAmount || currentOrder?.total_amount || '140'}</span>
                      </div>
                      <div className="pt-1 flex items-center justify-between text-[10px] text-stone-300">
                        <span className="uppercase font-bold tracking-wider">Payment: {String(currentOrder?.payment_method || currentOrder?.paymentMethod || 'COD').toUpperCase()}</span>
                      </div>
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
                  className="w-full py-3 px-4 rounded-full bg-amber-600 hover:bg-amber-700 text-white dark:bg-[#FD9139] dark:hover:bg-[#FCA65E] dark:text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 font-['Outfit'] shadow-md"
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
