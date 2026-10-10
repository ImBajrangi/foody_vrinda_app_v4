import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { useFastNotify } from '../hooks/useFastNotify';
import { useAudioAlarm } from '../hooks/useAudioAlarm';
import {
  supabase,
  updateCloudOrderStatus,
  fetchAvailableDeliveries,
  claimDeliveryOrder,
  claimOrderPickupAtomic,
  verifyDeliveryOtpAtomic,
  subscribeCloudOrders,
  createCloudNotification,
  getOrderItemSummary,
  getOrderCustomerName,
  updateCloudUser,
  updateUserOnlineStatus,
  getRiderCashLedger,
  isRiderCashLimitExceeded,
  RIDER_MAX_CASH_LIMIT,
  getUserTrustScore,
  getOrderOTP,
  verifyOrderOTP,
  getDailySarathiCode,
  checkDeliveryGeofence,
  calculateOptimalDispatchWindow,
  generateWhatsAppOrderShareLink
} from '../supabase';
import { printVerifiedDriverStatementPDF } from '../utils/deliveryReportUtils';
import DynamicToast from '../components/ui/DynamicToast';
import ActiveAlarmBanner from '../components/ui/ActiveAlarmBanner';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import {
  Truck,
  Navigation,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Volume2,
  VolumeX,
  AlertCircle,
  Banknote,
  Map,
  List,
  Layers,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  MessageCircle,
  Compass,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  PackageCheck,
  Store,
  Check,
  Star,
  User,
  Users,
  CreditCard,
  X,
  KeyRound,
  Lock,
  Unlock,
  ShieldAlert,
  Download,
  FileText,
  FileDown
} from 'lucide-react';

export default function TransportView() {
  const { user, currentUser, userData, currentUserShopId, currentUserShopIds = [], allShops = [], actualRole, impersonate, userRole, isAuthorizedDeveloper, isAuthorizedAdmin } = useAuth();
  const activeUser = currentUser || user || userData;
  const isGlobalRole = Boolean(isAuthorizedDeveloper || isAuthorizedAdmin || ['developer', 'grand_admin', 'owner'].includes(actualRole || userRole) || allShops.length > 1);
  const [orders, setOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [isClaimingOrderId, setIsClaimingOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('foody_transport_view_mode') || 'list';
    } catch (e) {
      return 'list';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('foody_transport_view_mode', viewMode);
    } catch (e) { }
  }, [viewMode]);

  // Onboarding Tour Auto Open/Close Coordinator for Delivery Partner
  useEffect(() => {
    const handleTutorialStep = (e) => {
      const tourTag = e?.detail?.tag || e?.detail?.stage?.dataTour || '';
      if (tourTag.includes('delivery-navigation')) {
        setViewMode('map');
      } else if (
        tourTag.includes('delivery-orders') ||
        tourTag.includes('delivery-accept') ||
        tourTag.includes('delivery-complete') ||
        tourTag.includes('delivery-earnings') ||
        tourTag.includes('delivery-report') ||
        tourTag.includes('delivery-referral')
      ) {
        setViewMode('list');
        if (tourTag.includes('delivery-orders') || tourTag.includes('delivery-accept')) {
          setRiderTab('active');
        }
      }
    };

    window.addEventListener('foody:tutorial-step-active', handleTutorialStep);
    return () => {
      window.removeEventListener('foody:tutorial-step-active', handleTutorialStep);
    };
  }, []);

  const [isRiderOnDuty, setIsRiderOnDuty] = useState(() => {
    try {
      return localStorage.getItem('foody_rider_on_duty') !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [riderCoords, setRiderCoords] = useState(() => ({ lat: 27.5706, lng: 77.6593 }));

  // Two-Stage OTP Verification Modal State (Pickup from Kitchen & Doorstep Delivery)
  const [otpModalState, setOtpModalState] = useState({
    isOpen: false,
    order: null,
    type: 'pickup', // 'pickup' | 'delivery'
    digits: ['', '', '', ''],
    error: '',
    isSuccess: false,
    isSubmitting: false,
    shake: false
  });
  const otpInputRefs = useRef([]);

  // Live Realtime GPS Broadcaster for Delivery Sarathis (throttled to avoid redundant egress)
  useEffect(() => {
    if (!isRiderOnDuty || typeof window === 'undefined' || !navigator.geolocation) return;

    const riderId = activeUser?.id || activeUser?.email || 'rider_sarathi_gopal';
    let lastBroadcastTime = Date.now();
    let lastCoords = null;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setRiderCoords(coords);

        const now = Date.now();
        const timeDiff = now - lastBroadcastTime;
        const hasMovedSignificantly = !lastCoords ||
          (Math.abs(coords.lat - lastCoords.lat) > 0.0003 || Math.abs(coords.lng - lastCoords.lng) > 0.0003);

        if (timeDiff > 30000 || (timeDiff > 10000 && hasMovedSignificantly)) {
          lastBroadcastTime = now;
          lastCoords = coords;
          updateUserOnlineStatus(riderId, true, coords).catch(() => { });
        }
      },
      (err) => {
        console.warn("GPS broadcast note:", err.message);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isRiderOnDuty, activeUser]);

  const toggleRiderDuty = async () => {
    const nextState = !isRiderOnDuty;
    setIsRiderOnDuty(nextState);
    try {
      localStorage.setItem('foody_rider_on_duty', String(nextState));
    } catch (e) { }

    const riderId = activeUser?.id || activeUser?.email || 'rider_sarathi_gopal';
    try {
      await updateUserOnlineStatus(riderId, nextState, riderCoords);
    } catch (e) { }

    showToast(nextState ? "You are ON DUTY (Receiving live tasks)" : "You are OFF DUTY (Break mode)", nextState ? "success" : "info");
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [riderTab, setRiderTab] = useState('active'); // 'active' | 'upcoming' | 'completed' | 'all'
  const [toast, setToast] = useState(null);

  // Audio Alarm hook
  const { isPlaying, activeAlert, playRoleAlarm, stopAlarm, warmUpAudio } = useAudioAlarm();

  // Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeGroupRef = useRef(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev && prev.message === message ? null : prev));
    }, 4000);
  };

  // Fast notification listener with role-tailored delivery chime
  useFastNotify('all', 'delivery', (alertData) => {
    playRoleAlarm('delivery', alertData, true);
    showToast(`Order #${alertData.orderId.slice(-6).toUpperCase()} ready for Sarathi Pickup!`, "info");
  });

  // Load delivery orders: independent fleet across all platform outlets (including today's ended history)
  const fetchRiderOrders = async () => {
    try {
      // 1. Supabase Cloud Query for assigned/claimed orders (PII unmasked)
      const { data, error } = await supabase
        .from('foody_orders')
        .select('*')
        .in('status', ['ready_for_pickup', 'ready', 'out_of_kitchen', 'out_for_delivery', 'picked_up', 'in_transit', 'completed', 'delivered'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map(o => ({
          id: o.id,
          ...o,
          shopId: o.shop_id,
          customerName: o.customer_name,
          customerPhone: o.customer_phone,
          customerAddress: o.customer_address,
          deliveryAddress: o.delivery_address,
          deliveryCoordinates: o.delivery_coordinates,
          totalAmount: o.total_amount,
          paymentMethod: o.payment_method,
          cashStatus: o.cash_status,
          cookingNotes: o.cooking_notes,
          createdAt: o.created_at,
          isClaimed: true
        }));
        setOrders(mapped);

        if (mapped.length > 0) {
          setSelectedOrder(prev => {
            if (prev) {
              const found = mapped.find(o => o.id === prev.id);
              return found || mapped[0];
            }
            const inTransit = mapped.find(o => ['out_for_delivery', 'picked_up', 'in_transit'].includes(o.status));
            return inTransit || mapped[0];
          });
        }
      }

      // 2. Fetch available unclaimed deliveries (Privacy-Preserving PII Masked, Geospatial filtered)
      const available = await fetchAvailableDeliveries(riderCoords);
      setAvailableOrders(available);
    } catch (err) {
      console.warn('Supabase fetchRiderOrders note:', err.message);
    }
  };

  useEffect(() => {
    fetchRiderOrders();

    // 2. Realtime Postgres stream across all platform orders for independent fleet
    const unsubscribeSupabase = subscribeCloudOrders('all', () => {
      fetchRiderOrders();
    });

    return () => {
      if (unsubscribeSupabase) unsubscribeSupabase();
    };
  }, []);

  const activeOrder = selectedOrder || orders[0];
  const activeShop = allShops.find(s => s.id === activeOrder?.shopId);

  // Initialize and update CARTO Leaflet Map for Active Order HUD
  useEffect(() => {
    if (viewMode !== 'map' || !activeOrder || !mapContainerRef.current) return;

    // Reset container ID if re-mounted
    if (mapContainerRef.current._leaflet_id) {
      mapContainerRef.current._leaflet_id = null;
    }

    // Coordinates setup with guaranteed separation (minimum ~1.2km offset if missing or identical)
    const shopLat = parseFloat(activeShop?.coordinates?.lat) || 27.5706;
    const shopLng = parseFloat(activeShop?.coordinates?.lng) || 77.6593;

    let rawDestLat = parseFloat(activeOrder.deliveryCoordinates?.lat || activeOrder.delivery_coordinates?.lat);
    let rawDestLng = parseFloat(activeOrder.deliveryCoordinates?.lng || activeOrder.delivery_coordinates?.lng);

    if (isNaN(rawDestLat) || isNaN(rawDestLng) || (Math.abs(rawDestLat - shopLat) < 0.003 && Math.abs(rawDestLng - shopLng) < 0.003)) {
      rawDestLat = shopLat + 0.0115;
      rawDestLng = shopLng + 0.0085;
    }

    const destLat = rawDestLat;
    const destLng = rawDestLng;

    // Dynamic Rider position along route (45% between kitchen and customer)
    const midLat = shopLat + (destLat - shopLat) * 0.45;
    const midLng = shopLng + (destLng - shopLng) * 0.45;

    const map = L.map(mapContainerRef.current, {
      center: [midLat, midLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // CARTO Voyager Tiles (Vrindavan Regional Basemap)
    const cartoKey = import.meta.env.VITE_CARTO_BASEMAP_KEY || 'cb1_25xx_1_ef24909b63d9228a6de7508f';
    const cartoSuffix = cartoKey ? `?key=${cartoKey}` : '';
    L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${cartoSuffix}`,
      {
        maxZoom: 20,
        minZoom: 3,
        subdomains: 'abcd',
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    ).addTo(map);

    const group = L.featureGroup();

    // 1. Origin Store Pin (Clean Luxury Store Puck)
    const shortShopName = (activeShop?.name || 'Prem Mandir').replace(/^(Shri\s+|Prem\s+Mandir\s+)/i, '').replace(/\s+(Kitchen|Bhojnalaya|Prasad)$/i, '').trim() || 'Prem Mandir';
    const storeIcon = L.divIcon({
      className: 'custom-kitchen-pin',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          background: #181617;
          border: 2.5px solid #FD9139;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.6), 0 0 10px rgba(253, 145, 57,0.25);
          cursor: pointer;
        ">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FD9139" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
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
    const storeMarker = L.marker([shopLat, shopLng], { icon: storeIcon, zIndexOffset: 200 });
    storeMarker.bindTooltip(`${shortShopName} (Kitchen)`, { permanent: false, direction: 'top', offset: [0, -20] });
    storeMarker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      storeMarker.toggleTooltip();
    });
    group.addLayer(storeMarker);

    // 2. Destination Customer Home Pin (Clean Luxury Drop-off Puck)
    const homeIcon = L.divIcon({
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
    const homeMarker = L.marker([destLat, destLng], { icon: homeIcon, zIndexOffset: 200 });
    homeMarker.bindTooltip(`${activeOrder.customerName || 'Drop-off Destination'}`, { permanent: false, direction: 'top', offset: [0, -20] });
    homeMarker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      homeMarker.toggleTooltip();
    });
    group.addLayer(homeMarker);

    // 3. Live Scooter Rider Vehicle Pin (Animated GPS Pulse) - only in active transit
    const isOutForDelivery = activeOrder?.status === 'out_for_delivery';
    if (isOutForDelivery) {
      const riderIcon = L.divIcon({
        className: 'custom-rider-pin',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
            <div class="radar-ping-circle" style="
              position: absolute;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border: 1.5px solid #FD9139;
              background: rgba(253, 145, 57, 0.12);
              pointer-events: none;
            "></div>
            <div style="
              position: relative;
              width: 36px;
              height: 36px;
              background: #181617;
              border: 2.5px solid #FD9139;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(0,0,0,0.45);
              cursor: pointer;
            ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FD9139" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
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
      const riderMarker = L.marker([midLat, midLng], { icon: riderIcon, zIndexOffset: 500 });
      riderMarker.bindTooltip('Sarathi Rider (Live GPS)', { permanent: false, direction: 'top', offset: [0, -22] });
      riderMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        riderMarker.toggleTooltip();
      });
      group.addLayer(riderMarker);
    }

    // 4. Seamless Continuous Driving Road Polyline & Upper Parabolic Connectors (Uber Style)
    const generateWalkingPath = (start, end, curvature = 0.32) => {
      if (!start || !end) return [];
      const [lat1, lng1] = start;
      const [lat2, lng2] = end;

      const dLat = lat2 - lat1;
      const dLng = lng2 - lng1;
      const dist = Math.hypot(dLat, dLng);
      if (dist === 0) return [start, end];

      const midLat = (lat1 + lat2) / 2;
      const midLng = (lng1 + lng2) / 2;

      let normLat = -dLng / dist;
      let normLng = dLat / dist;

      if (normLat < 0) {
        normLat = -normLat;
        normLng = -normLng;
      }

      const arcHeight = dist * curvature;
      const controlLat = midLat + normLat * arcHeight + (Math.abs(dLng) < 0.0002 ? arcHeight * 0.3 : 0);
      const controlLng = midLng + normLng * arcHeight;

      const points = [];
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const invT = 1 - t;
        const lat = invT * invT * lat1 + 2 * invT * t * controlLat + t * t * lat2;
        const lng = invT * invT * lng1 + 2 * invT * t * controlLng + t * t * lng2;
        points.push([lat, lng]);
      }
      return points;
    };

    let currentRouteCoords = [
      [shopLat, shopLng],
      [destLat, destLng]
    ];

    // Clean Road Casing (Subtle Dark Underlay)
    const routeCasing = L.polyline(currentRouteCoords, {
      color: '#181617',
      weight: 5.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(routeCasing);

    // Glowing Animated Neon Driving Road Line
    const routeLine = L.polyline(currentRouteCoords, {
      color: '#FD9139',
      weight: 3.5,
      dashArray: '6, 9',
      className: 'animated-delivery-route',
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(routeLine);

    // Parabolic Start Connector (Kitchen -> Road Start)
    const startConnectorCasing = L.polyline([], {
      color: '#121011',
      weight: 8.5,
      dashArray: '1, 16',
      className: 'casing-parabolic-dots',
      opacity: 0.98,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(startConnectorCasing);

    const startConnector = L.polyline([], {
      color: '#FD9139',
      weight: 4.5,
      dashArray: '1, 16',
      className: 'animated-walking-dots',
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(startConnector);

    // Parabolic Destination Connector (Road End -> Doorstep)
    const destConnectorCasing = L.polyline([], {
      color: '#121011',
      weight: 8.5,
      dashArray: '1, 16',
      className: 'casing-parabolic-dots',
      opacity: 0.98,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(destConnectorCasing);

    const destConnector = L.polyline([], {
      color: '#FD9139',
      weight: 4.5,
      dashArray: '1, 16',
      className: 'animated-walking-dots',
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(destConnector);

    fetch(`https://router.project-osrm.org/route/v1/driving/${shopLng},${shopLat};${destLng},${destLat}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data?.routes?.[0]?.geometry?.coordinates) {
          const rawLatLngs = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          if (rawLatLngs.length > 0) {
            const roadStart = rawLatLngs[0];
            const roadEnd = rawLatLngs[rawLatLngs.length - 1];

            routeCasing.setLatLngs(rawLatLngs);
            routeLine.setLatLngs(rawLatLngs);

            const isStartOffset = Math.hypot(roadStart[0] - shopLat, roadStart[1] - shopLng) > 0.0001;
            if (isStartOffset) {
              const startPath = generateWalkingPath([shopLat, shopLng], roadStart);
              startConnectorCasing.setLatLngs(startPath);
              startConnector.setLatLngs(startPath);
            } else {
              startConnectorCasing.setLatLngs([]);
              startConnector.setLatLngs([]);
            }

            const isEndOffset = Math.hypot(roadEnd[0] - destLat, roadEnd[1] - destLng) > 0.0001;
            if (isEndOffset) {
              const destPath = generateWalkingPath(roadEnd, [destLat, destLng]);
              destConnectorCasing.setLatLngs(destPath);
              destConnector.setLatLngs(destPath);
            } else {
              destConnectorCasing.setLatLngs([]);
              destConnector.setLatLngs([]);
            }

            if (mapInstanceRef.current && routeGroupRef.current) {
              mapInstanceRef.current.fitBounds(routeGroupRef.current.getBounds(), {
                paddingTopLeft: [50, 50],
                paddingBottomRight: [50, 60],
                maxZoom: 16
              });
            }
          }
        }
      })
      .catch(() => { });

    group.addTo(map);
    routeGroupRef.current = group;
    mapInstanceRef.current = map;

    // Fit route bounds nicely and ensure map invalidates size for responsive desktop grid
    map.fitBounds(group.getBounds(), {
      paddingTopLeft: [50, 50],
      paddingBottomRight: [50, 60],
      maxZoom: 16
    });

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [viewMode, activeOrder?.id, activeShop?.id]);

  // Focus the first OTP box when verification modal opens
  useEffect(() => {
    if (otpModalState.isOpen) {
      const timer = setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [otpModalState.isOpen]);

  const handleInitiatePickup = (order) => {
    stopAlarm();
    if (!order) return;
    setOtpModalState({
      isOpen: true,
      order,
      type: 'pickup',
      digits: ['', '', '', ''],
      error: '',
      isSuccess: false,
      isSubmitting: false,
      shake: false
    });
  };

  const handleInitiateDelivery = (order) => {
    stopAlarm();
    if (!order) return;
    setOtpModalState({
      isOpen: true,
      order,
      type: 'delivery',
      digits: ['', '', '', ''],
      error: '',
      isSuccess: false,
      isSubmitting: false,
      shake: false
    });
  };

  const closeOtpModal = () => {
    setOtpModalState(prev => ({
      ...prev,
      isOpen: false,
      isSubmitting: false,
      error: '',
      shake: false
    }));
  };

  const handleOtpDigitChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '');
    if (cleanVal.length > 1) {
      // User pasted multi-digit code
      const pasted = cleanVal.slice(0, 4).split('');
      const newDigits = [...otpModalState.digits];
      pasted.forEach((d, i) => {
        newDigits[i] = d;
      });
      setOtpModalState(prev => ({ ...prev, digits: newDigits, error: '', shake: false }));
      if (pasted.length === 4) {
        verifyAndSubmitOtp(newDigits.join(''));
      } else {
        const nextIdx = Math.min(pasted.length, 3);
        otpInputRefs.current[nextIdx]?.focus();
      }
      return;
    }

    const singleDigit = cleanVal.slice(-1);
    const newDigits = [...otpModalState.digits];
    newDigits[index] = singleDigit;
    setOtpModalState(prev => ({ ...prev, digits: newDigits, error: '', shake: false }));

    if (singleDigit && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Automatically verify when all 4 digits are entered
    if (newDigits.every(d => d.trim() !== '') && singleDigit) {
      verifyAndSubmitOtp(newDigits.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpModalState.digits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'Enter') {
      const code = otpModalState.digits.join('');
      if (code.length === 4) {
        verifyAndSubmitOtp(code);
      }
    }
  };

  const verifyAndSubmitOtp = async (codeToVerify) => {
    const entered = (codeToVerify || otpModalState.digits.join('')).trim();
    if (entered.length < 4) {
      setOtpModalState(prev => ({ ...prev, error: 'Please enter all 4 digits', shake: true }));
      setTimeout(() => setOtpModalState(prev => ({ ...prev, shake: false })), 600);
      return;
    }

    const currentOrder = otpModalState.order;
    const currentType = otpModalState.type;
    if (!currentOrder) return;

    const isValid = verifyOrderOTP(currentOrder, currentType, entered);

    if (!isValid) {
      setOtpModalState(prev => ({
        ...prev,
        error: currentType === 'pickup'
          ? 'Invalid Kitchen Pickup OTP. Check screen with staff.'
          : 'Invalid Customer Delivery OTP. Check with customer.',
        shake: true
      }));
      setTimeout(() => setOtpModalState(prev => ({ ...prev, shake: false })), 600);
      return;
    }

    // Mark success feedback state
    setOtpModalState(prev => ({ ...prev, isSuccess: true, isSubmitting: true, error: '' }));

    // Haptic/audio feedback delay before executing cloud update
    setTimeout(async () => {
      try {
        if (currentType === 'pickup') {
          await handleStartDelivery(currentOrder.id, currentOrder, entered);
        } else {
          await handleCompleteDelivery(currentOrder.id, currentOrder, entered);
        }
        closeOtpModal();
      } catch (err) {
        console.error(err);
        setOtpModalState(prev => ({ ...prev, isSubmitting: false, error: 'Network error. Please retry.' }));
      }
    }, 600);
  };

  const handleClaimOrder = async (orderId) => {
    stopAlarm();
    try {
      setIsClaimingOrderId(orderId);
      const res = await claimDeliveryOrder(orderId);
      if (!res.success) {
        showToast(res.error || 'Could not claim order. It might already be claimed.', 'warning');
        return;
      }
      showToast('Delivery Claimed Successfully! Customer details unlocked.', 'success');
      await fetchRiderOrders();
      setRiderTab('active');
    } catch (e) {
      console.error(e);
      showToast(e.message || 'Failed to claim delivery order', 'error');
    } finally {
      setIsClaimingOrderId(null);
    }
  };

  const handleStartDelivery = async (orderId, orderData, enteredOtp = null) => {
    stopAlarm();
    try {
      const dailyCode = getDailySarathiCode(activeUser);
      const riderId = activeUser?.id || activeUser?.email || 'sarathi_rider';
      const riderPayload = {
        rider_id: riderId,
        rider_name: activeUser?.name || 'Govind Das (Sarathi)',
        rider_phone: activeUser?.phone || '+91 98765 43210',
        rider_rating: '4.95',
        rider_avatar: activeUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        sarathi_code: dailyCode,
        picked_up_at: new Date().toISOString()
      };

      if (enteredOtp) {
        // Invoke atomic database RPC with row locking & rate limiting
        await claimOrderPickupAtomic(orderId, riderId, enteredOtp);
      }
      await updateCloudOrderStatus(orderId, 'out_for_delivery', riderPayload);

      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        status: 'out_for_delivery',
        ...riderPayload
      } : o));

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: 'out_for_delivery', ...riderPayload } : null);
      }

      const itemSummary = getOrderItemSummary(orderData) || 'Satvik Meal';
      const customerName = getOrderCustomerName(orderData);

      if (orderData?.userId) {
        await createCloudNotification({
          userId: orderData.userId,
          title: `On The Way: ${itemSummary}`,
          message: `${itemSummary} is on the way with ${riderPayload.rider_name}.`,
          orderId
        });
      }

      setToast({
        message: `Dispatched: ${itemSummary} (${customerName})`,
        type: 'success'
      });
    } catch (e) {
      console.error(e);
      setToast({
        message: `Failed to update status`,
        type: 'error'
      });
    }
  };

  const handleCompleteDelivery = async (orderId, orderData, enteredOtp = null) => {
    stopAlarm();
    try {
      const riderId = activeUser?.id || activeUser?.email || 'sarathi_rider';
      const rawMethod = String(orderData?.payment_method || orderData?.paymentMethod || '').toLowerCase().trim();
      const isCash = rawMethod === 'cash' || rawMethod === 'cod';

      if (enteredOtp) {
        // Invoke atomic database RPC with row locking & cryptographic hash check
        await verifyDeliveryOtpAtomic(orderId, riderId, enteredOtp);
      }
      await updateCloudOrderStatus(orderId, 'completed', {
        cash_status: isCash ? 'collected' : (orderData?.cashStatus || orderData?.cash_status || 'none'),
        delivered_at: new Date().toISOString()
      });
      setOrders(prev => prev.filter(o => o.id !== orderId));

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }

      const itemSummary = getOrderItemSummary(orderData) || 'Satvik Meal';
      const customerName = getOrderCustomerName(orderData);

      if (orderData?.userId) {
        await createCloudNotification({
          userId: orderData.userId,
          title: `Delivered: ${itemSummary}`,
          message: `${itemSummary} delivered successfully.`,
          orderId
        });
      }

      setToast({
        message: `Delivered: ${itemSummary} (${customerName})`,
        type: 'success'
      });
    } catch (e) {
      console.error(e);
      setToast({
        message: `Failed to complete delivery`,
        type: 'error'
      });
    }
  };

  const handleRecenterMap = () => {
    if (mapInstanceRef.current && routeGroupRef.current) {
      mapInstanceRef.current.fitBounds(routeGroupRef.current.getBounds(), {
        paddingTopLeft: [50, 50],
        paddingBottomRight: [50, 160],
        maxZoom: 16,
        animate: true
      });
    }
  };

  const activeTrips = useMemo(() => {
    return orders.filter(o => ['out_for_delivery', 'picked_up', 'in_transit'].includes(o.status));
  }, [orders]);

  const upcomingPickups = useMemo(() => {
    const assigned = orders.filter(o => ['ready_for_pickup', 'ready', 'out_of_kitchen'].includes(o.status));
    const assignedIds = new Set(assigned.map(o => o.id));
    const unclaimed = availableOrders.filter(o => !assignedIds.has(o.id));
    return [...unclaimed, ...assigned];
  }, [orders, availableOrders]);

  const completedToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return orders.filter(o => ['completed', 'delivered'].includes(o.status) && (o.created_at || '').startsWith(today));
  }, [orders]);

  const totalCodCollectedToday = useMemo(() => {
    return completedToday.reduce((acc, o) => {
      const isCod = o.paymentMethod === 'cash' || o.payment_method === 'cash';
      return isCod ? acc + (Number(o.totalAmount || o.total_amount || 0)) : acc;
    }, 0);
  }, [completedToday]);

  const tabOrders = useMemo(() => {
    switch (riderTab) {
      case 'active':
        return activeTrips;
      case 'upcoming':
        return upcomingPickups;
      case 'completed':
        return completedToday;
      case 'all':
      default:
        return orders;
    }
  }, [riderTab, activeTrips, upcomingPickups, completedToday, orders]);

  const filteredOrders = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return tabOrders;
    return tabOrders.filter(order => {
      const idMatch = order.id.toLowerCase().includes(term);
      const custMatch = order.customerName?.toLowerCase().includes(term);
      const itemsMatch = order.items?.map(i => i.name.toLowerCase()).join(' ').includes(term);
      return idMatch || custMatch || itemsMatch;
    });
  }, [tabOrders, searchQuery]);

  // Download / Print verified shift order report as PDF
  const handleDownloadShiftSlip = useCallback(() => {
    const riderId = activeUser?.id || activeUser?.email || 'rider_sarathi_gopal';
    const riderTrustScore = getUserTrustScore(riderId);
    const riderLedger = getRiderCashLedger(riderId);
    const riderDetails = {
      name: activeUser?.name || activeUser?.email || 'Govind Das (Sarathi)',
      id: activeUser?.id ? `FV-SRT-${activeUser.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}` : 'FV-SARATHI-108',
      phone: activeUser?.phone || '+91 98765 43210',
      trustScore: riderTrustScore,
      cashInHand: riderLedger?.cashInHand || 0
    };
    const success = printVerifiedDriverStatementPDF(orders, riderDetails);
    if (success) {
      showToast("Opening Delivery Slip (PDF)...", "success");
    }
  }, [activeUser, orders]);

  return (
    <div className="space-y-6 pb-24">
      {/* Dynamic Tactile Alarm Banner (Apple Dynamic Island Style) */}
      <ActiveAlarmBanner
        isPlaying={isPlaying}
        activeAlert={activeAlert}
        onSilence={stopAlarm}
        onActionClick={(alert) => {
          const target = orders.find(o => o.id === alert.orderId) || alert.order;
          if (target) {
            setSelectedOrder(target);
            setViewMode('map');
          }
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <DynamicToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* MAIN OPERATIONS HEADER BAR (Grand Scale Matching Kitchen Operations) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-stone-200/90 dark:bg-[#282526] p-4 sm:p-5 md:p-6 rounded-[32px] border border-stone-300 dark:border-white/10 shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 dark:bg-[#FD9139]/15 border border-amber-500/30 dark:border-[#FD9139]/30 flex items-center justify-center text-amber-600 dark:text-[#FD9139] shrink-0 shadow-sm">
            <Truck size={22} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-stone-900 dark:text-white tracking-tight font-['Outfit'] truncate">
                Delivery Fleet
              </h1>
              <span className="bg-amber-600 text-white dark:bg-[#FD9139] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shrink-0">
                {orders.length} Active {orders.length === 1 ? 'Trip' : 'Trips'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-600 dark:text-zinc-400 font-medium mt-0.5 truncate">
              Live GPS route dispatch board, real-time rider navigation & delivery handoff
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full xl:w-auto">
          {/* Rider Duty Presence Toggle */}
          <button
            data-tour="delivery-go-online"
            type="button"
            onClick={toggleRiderDuty}
            className={`h-10 sm:h-11 px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer apple-tap-target w-full sm:w-auto shrink-0 ${isRiderOnDuty
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 shadow-xs'
              : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
              }`}
            title="Toggle Rider Duty Availability"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${isRiderOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="whitespace-nowrap font-['Outfit']">{isRiderOnDuty ? 'Rider On Duty' : 'Rider Off Duty'}</span>
          </button>

          {/* List vs Carto View Switcher: Ergonomic segmented control */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1 bg-white/95 dark:bg-[#1E1B1C] p-1 rounded-full border border-stone-200 dark:border-white/10 shadow-sm w-full sm:w-auto shrink-0">
            <button
              data-tour="delivery-orders"
              onClick={() => setViewMode('list')}
              className={`h-8 sm:h-9 px-3.5 sm:px-4 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${viewMode === 'list'
                ? 'bg-[#FD9139] text-white font-black shadow-sm'
                : 'text-stone-600 hover:text-stone-950 dark:text-neutral-400 dark:hover:text-white'
                }`}
            >
              <List size={14} className="shrink-0" />
              <span className="whitespace-nowrap font-['Outfit']">Orders ({orders.length})</span>
            </button>
            <button
              data-tour="delivery-navigation"
              onClick={() => setViewMode('map')}
              className={`h-8 sm:h-9 px-3.5 sm:px-4 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${viewMode === 'map'
                ? 'bg-[#FD9139] text-white font-black shadow-sm'
                : 'text-stone-600 hover:text-stone-950 dark:text-neutral-400 dark:hover:text-white'
                }`}
            >
              <Map size={14} className="shrink-0" />
              <span className="whitespace-nowrap font-['Outfit']">Carto HUD</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. SARATHI FLEET OPERATIONS SEGMENTED TABS (Independent Fleet) */}
      <div className="space-y-3">
        {/* Tab Switcher Pills & Direct Order Slip Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-white/95 dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 overflow-x-auto no-scrollbar shadow-sm flex-1 min-w-0">
            <button
              onClick={() => setRiderTab('active')}
              className={`py-2 px-4 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 font-['Outfit'] ${riderTab === 'active'
                ? 'bg-[#FD9139] text-white font-black shadow-[0_4px_20px_rgba(253,145,57,0.3)]'
                : 'text-stone-600 dark:text-neutral-300 hover:text-[#FD9139] dark:hover:text-white hover:bg-orange-50/70 dark:hover:bg-white/5'
                }`}
            >
              <Truck size={14} />
              <span>Today's Orders</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${riderTab === 'active' ? 'bg-white/25 text-white' : 'bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-neutral-300 border border-stone-200/60 dark:border-transparent'}`}>
                {activeTrips.length}
              </span>
            </button>

            <button
              onClick={() => setRiderTab('upcoming')}
              className={`py-2 px-4 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 font-['Outfit'] ${riderTab === 'upcoming'
                ? 'bg-[#FD9139] text-white font-black shadow-[0_4px_20px_rgba(253,145,57,0.3)]'
                : 'text-stone-600 dark:text-neutral-300 hover:text-[#FD9139] dark:hover:text-white hover:bg-orange-50/70 dark:hover:bg-white/5'
                }`}
            >
              <Clock size={14} />
              <span>Upcoming</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${riderTab === 'upcoming' ? 'bg-white/25 text-white' : 'bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-neutral-300 border border-stone-200/60 dark:border-transparent'}`}>
                {upcomingPickups.length}
              </span>
            </button>

            <button
              onClick={() => setRiderTab('completed')}
              className={`py-2 px-4 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 font-['Outfit'] ${riderTab === 'completed'
                ? 'bg-[#FD9139] text-white font-black shadow-[0_4px_20px_rgba(253,145,57,0.3)]'
                : 'text-stone-600 dark:text-neutral-300 hover:text-[#FD9139] dark:hover:text-white hover:bg-orange-50/70 dark:hover:bg-white/5'
                }`}
            >
              <CheckCircle2 size={14} />
              <span>Completed Today</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${riderTab === 'completed' ? 'bg-white/25 text-white' : 'bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-neutral-300 border border-stone-200/60 dark:border-transparent'}`}>
                {completedToday.length}
              </span>
            </button>

            <button
              onClick={() => setRiderTab('all')}
              className={`py-2 px-4 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 font-['Outfit'] ${riderTab === 'all'
                ? 'bg-[#FD9139] text-white font-black shadow-[0_4px_20px_rgba(253,145,57,0.3)]'
                : 'text-stone-600 dark:text-neutral-300 hover:text-[#FD9139] dark:hover:text-white hover:bg-orange-50/70 dark:hover:bg-white/5'
                }`}
            >
              <List size={14} />
              <span>Order History</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${riderTab === 'all' ? 'bg-white/25 text-white' : 'bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-neutral-300 border border-stone-200/60 dark:border-transparent'}`}>
                {orders.length}
              </span>
            </button>
          </div>

          {/* Direct 1-Tap Order Slip Trigger */}
          <button
            type="button"
            onClick={handleDownloadShiftSlip}
            className="h-10 px-4 rounded-full bg-white hover:bg-orange-50/70 dark:bg-[#1E1B1C] dark:hover:bg-[#282526] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-neutral-200 hover:text-[#FD9139] dark:hover:text-[#FD9139] text-xs font-bold font-['Outfit'] flex items-center justify-center gap-2 shrink-0 transition-all cursor-pointer shadow-sm active:scale-95 apple-tap-target w-full sm:w-auto"
            title="Download or Print Today's Order Report as PDF"
          >
            <FileDown size={15} className="text-[#FD9139]" strokeWidth={2.5} />
            <span className="whitespace-nowrap">Order Slip (PDF)</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: PROFESSIONAL RESPONSIVE DISPATCH & CARTO MAP HUD */}
      {viewMode === 'map' && activeOrder && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">

          {/* Main Map Viewport (Left / Top) */}
          <div className="lg:col-span-7 xl:col-span-8 w-full h-[400px] sm:h-[500px] lg:h-[680px] bg-[#1E1B1C] rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl flex flex-col">
            <div ref={mapContainerRef} className="w-full h-full min-h-[380px] z-0" />

            {/* TOP FLOATING CONTROLS */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20 pointer-events-none">
              <button
                onClick={() => setViewMode('list')}
                className="px-3.5 py-2 rounded-xl bg-[#1E1B1C]/90 hover:bg-[#282526] text-white shadow-xl backdrop-blur-md flex items-center gap-2 border border-white/15 active:scale-95 transition-all cursor-pointer pointer-events-auto text-xs font-bold"
                title="View all dispatch orders"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
                <span className="hidden sm:inline">Orders List ({orders.length})</span>
              </button>

              <div className="flex items-center gap-2 pointer-events-auto">
                <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E1B1C]/90 backdrop-blur-md text-[#FD9139] border border-white/15 text-[11px] font-black shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-[#FD9139] animate-pulse" />
                  Live GPS Route
                </span>
                <button
                  onClick={handleRecenterMap}
                  className="w-9 h-9 rounded-xl bg-[#1E1B1C]/90 hover:bg-[#282526] text-white shadow-xl backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-95 transition-all cursor-pointer"
                  title="Re-center route"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.2]" />
                </button>
              </div>
            </div>

            {/* BOTTOM FLOATING ROUTE RIBBON */}
            <div className="absolute bottom-4 inset-x-4 z-20 pointer-events-none hidden sm:flex items-center justify-between p-3 rounded-2xl bg-white/95 dark:bg-[#1E1B1C]/90 backdrop-blur-md border border-stone-200/90 dark:border-white/10 shadow-xl text-xs text-stone-900 dark:text-white">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:bg-[#FD9139]/15 dark:text-[#FD9139] text-[10px] font-black border border-amber-500/30 dark:border-[#FD9139]/30">
                  ORIGIN
                </span>
                <span className="font-bold truncate max-w-[140px] text-stone-900 dark:text-white">
                  {activeShop?.name || 'Kitchen Store'}
                </span>
              </div>
              <ArrowRight size={14} className="text-amber-600 dark:text-[#FD9139] stroke-[2.5]" />
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                  DROP-OFF
                </span>
                <span className="font-bold truncate max-w-[160px] text-stone-900 dark:text-white">
                  {activeOrder.customerAddress || activeOrder.deliveryAddress || 'Customer Address'}
                </span>
              </div>
            </div>
          </div>

          {/* Dispatch Sidebar & Action Console (Right / Bottom) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4 w-full">
            {/* Primary Active Dispatch Card */}
            <div className="bg-stone-100/90 dark:bg-[#282526] border border-stone-200 dark:border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
              {/* Customer Profile & Direct Contact Actions */}
              <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-stone-200 dark:border-white/5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-[#1E1B1C] border border-amber-500/30 dark:border-white/10 text-amber-700 dark:text-[#FD9139] overflow-hidden shrink-0 shadow-md flex items-center justify-center">
                    <User size={18} className="stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm tracking-tight font-['Outfit'] text-stone-900 dark:text-white truncate">
                        {activeOrder.customerName || 'Customer'}
                      </h4>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-stone-200 dark:bg-white/5 text-stone-700 dark:text-neutral-300 border border-stone-300 dark:border-white/10 shrink-0 font-mono">
                        #{activeOrder.id ? activeOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ORDER'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-500 text-xs mt-0.5 font-['Plus_Jakarta_Sans']">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-stone-900 dark:text-white text-[11px] font-black">5.0</span>
                      </div>
                      <span className="text-stone-400 dark:text-neutral-600 text-[10px]">•</span>
                      <span className="text-stone-500 dark:text-neutral-400 text-[11px] font-medium truncate">
                        {activeOrder.items?.length || 1} {(activeOrder.items?.length || 1) === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activeOrder.customerPhone && (
                    <a
                      href={`https://wa.me/91${activeOrder.customerPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Radhe Radhe ${activeOrder.customerName || 'Ji'}! I am your Sarathi Rider delivering your Foody Vrinda order #${activeOrder.id ? activeOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : ''}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/30 dark:border-emerald-500/20 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                      title="WhatsApp Customer"
                    >
                      <MessageCircle className="w-4 h-4 stroke-[2]" />
                    </a>
                  )}
                  {activeOrder.customerPhone && (
                    <a
                      href={`tel:${activeOrder.customerPhone.replace(/\D/g, '').slice(-10)}`}
                      className="w-9 h-9 rounded-xl bg-stone-200/80 hover:bg-stone-300 dark:bg-white/5 dark:hover:bg-white/10 text-stone-700 dark:text-white border border-stone-300 dark:border-white/10 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                      title="Call Customer"
                    >
                      <Phone className="w-4 h-4 text-amber-600 dark:text-[#FD9139] stroke-[2]" />
                    </a>
                  )}
                </div>
              </div>

              {/* ETA & Drop-off Target */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 dark:bg-white/5 text-amber-700 dark:text-white flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-[#FD9139]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-stone-500 dark:text-neutral-400 uppercase tracking-wider">Estimated Drop-off</p>
                    <h5 className="font-bold text-sm text-stone-900 dark:text-white font-['Outfit'] truncate">
                      Target ~ {new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </h5>
                  </div>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[10px] font-black text-amber-800 bg-amber-500/15 border-amber-500/30 dark:text-[#FD9139] dark:bg-[#FD9139]/15 px-2.5 py-1 rounded-full border dark:border-[#FD9139]/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-[#FD9139] animate-pulse"></span>
                  Live Active
                </span>
              </div>

              {/* Destination Address */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-500/30 dark:bg-[#FD9139]/15 dark:text-[#FD9139] dark:border-[#FD9139]/30 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-amber-600 dark:text-[#FD9139]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-[10px] font-bold text-stone-500 dark:text-neutral-400 uppercase tracking-wider">Destination</p>
                    <span className="text-[10px] font-bold text-stone-600 dark:text-neutral-400 bg-stone-200/80 dark:bg-white/5 px-2 py-0.5 rounded-md border border-stone-300 dark:border-white/5 shrink-0 whitespace-nowrap">ETA: ~8–10 Min</span>
                  </div>
                  <p className="text-xs font-bold text-stone-900 dark:text-white font-['Outfit'] line-clamp-2 leading-relaxed">
                    {activeOrder.customerAddress || activeOrder.deliveryAddress || 'Raman Reti, Parikrama Marg, Vrindavan'}
                  </p>
                </div>
              </div>

              {/* Payment Status Callout Banner */}
              {(() => {
                const rawMethod = String(activeOrder.payment_method || activeOrder.paymentMethod || '').toLowerCase().trim();
                const isCash = rawMethod === 'cash' || rawMethod === 'cod';
                const isCollected = activeOrder.cash_status === 'collected' || activeOrder.cashStatus === 'collected' || activeOrder.cash_collected || activeOrder.cashCollected;
                if (!isCash) {
                  return (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">Prepaid Online</span>
                      </div>
                      <span className="font-black text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30 shrink-0 whitespace-nowrap uppercase tracking-wider">
                        NO CASH DUE
                      </span>
                    </div>
                  );
                }
                if (isCollected) {
                  return (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">Cash Paid</span>
                      </div>
                      <span className="font-black text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30 shrink-0 whitespace-nowrap uppercase tracking-wider">
                        COLLECTED
                      </span>
                    </div>
                  );
                }
                return (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 truncate">Cash on Delivery</span>
                    </div>
                    <span className="font-black text-sm text-amber-700 dark:text-amber-400 font-['Outfit'] shrink-0 whitespace-nowrap">
                      ₹{activeOrder.totalAmount || activeOrder.total_amount || 0}
                    </span>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1 font-['Plus_Jakarta_Sans']">
                {activeOrder.deliveryCoordinates?.lat && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.deliveryCoordinates.lat},${activeOrder.deliveryCoordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 rounded-2xl bg-stone-200 hover:bg-stone-300 dark:bg-white/5 dark:hover:bg-white/10 border border-stone-300 dark:border-white/10 hover:border-stone-400 dark:hover:border-white/20 text-stone-900 dark:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <Compass className="w-4 h-4 text-amber-600 dark:text-[#FD9139]" />
                    <span>Open Live On Google Maps</span>
                  </a>
                )}

                {['ready_for_pickup', 'ready', 'out_of_kitchen'].includes(activeOrder.status) ? (
                  <button
                    onClick={() => handleInitiatePickup(activeOrder)}
                    className="w-full py-4 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white dark:bg-[#FD9139] dark:hover:bg-[#FCA65E] dark:text-[#121214] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer whitespace-nowrap"
                  >
                    <span>Pick Up & Start Delivery</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleInitiateDelivery(activeOrder)}
                    className="w-full py-4 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white dark:bg-[#FD9139] dark:hover:bg-[#FCA65E] dark:text-[#121214] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5] shrink-0" />
                    <span>Mark as Delivered</span>
                  </button>
                )}
              </div>
            </div>

            {/* Other Active Deliveries Queue (Directly in Sidebar) */}
            {orders.length > 1 && (
              <div className="bg-stone-100/90 dark:bg-[#282526] border border-stone-200 dark:border-white/10 rounded-3xl p-4.5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-stone-900 dark:text-white text-xs uppercase tracking-wider font-['Outfit']">
                    Other Active Deliveries ({orders.length - 1})
                  </h4>
                  <span className="text-[10px] text-stone-500 dark:text-neutral-400 font-bold">Tap to switch</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                  {orders.map(o => {
                    const isCur = o.id === activeOrder.id;
                    const isReadyOrder = ['ready_for_pickup', 'ready', 'out_of_kitchen'].includes(o.status);
                    return (
                      <div
                        key={o.id}
                        onClick={() => setSelectedOrder(o)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${isCur
                          ? 'bg-amber-500/10 border-amber-500 dark:bg-[#1E1B1C] dark:border-[#FD9139] shadow-md ring-1 ring-amber-500 dark:ring-[#FD9139]'
                          : 'bg-stone-50 dark:bg-[#1E1B1C]/60 border-stone-200 dark:border-white/5 hover:border-amber-500/30 dark:hover:border-white/15 hover:bg-stone-100 dark:hover:bg-[#1E1B1C]'
                          }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-stone-900 dark:text-white text-xs truncate">
                            #{o.id ? o.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ORDER'} • {o.customerName || 'Customer'}
                          </p>
                          <p className="text-[10px] text-stone-500 dark:text-neutral-400 truncate">
                            {o.customerAddress || o.deliveryAddress || 'Vrindavan'}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase shrink-0 ${isReadyOrder ? 'bg-amber-400/20 text-amber-800 dark:text-amber-300 border border-amber-400/30' : 'bg-[#FD9139]/20 text-stone-900 dark:text-[#FD9139] border border-[#FD9139]/30'
                          }`}>
                          {isReadyOrder ? 'Ready' : 'In Transit'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ALL DISPATCH ORDERS LIST VIEW */}
      {(viewMode === 'list' || !activeOrder) && (
        <div className="space-y-5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4.5 top-1/2 -translate-y-1/2 text-stone-500 dark:text-neutral-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, or dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 rounded-full pl-11 pr-4 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-500 dark:placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 dark:focus:border-[#FD9139]/50 transition-all font-['Plus_Jakarta_Sans'] shadow-inner"
            />
          </div>

          {filteredOrders.length === 0 ? (
            <div data-tour="delivery-orders delivery-accept delivery-complete" className="bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 rounded-[32px] p-12 sm:p-16 text-center shadow-md flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/15 dark:bg-[#FD9139]/15 border border-amber-500/30 dark:border-[#FD9139]/30 flex items-center justify-center text-amber-600 dark:text-[#FD9139] mb-4 shadow-sm">
                <PackageCheck size={32} strokeWidth={2.2} />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight">All Deliveries Caught Up!</h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-neutral-400 font-['Plus_Jakarta_Sans'] max-w-sm mx-auto mt-1">
                No active delivery orders currently pending. New pickup requests will chime the live alarm.
              </p>
            </div>
          ) : (
            <div className={`grid gap-5 ${filteredOrders.length === 1 ? 'grid-cols-1 max-w-2xl' :
              filteredOrders.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}>
              {filteredOrders.map(order => {
                const shopName = allShops.find(s => s.id === order.shopId)?.name || order.shopName || 'Kitchen';
                const isReady = ['ready_for_pickup', 'ready', 'out_of_kitchen'].includes(order.status);
                const isUnclaimed = !order.rider_id && !order.riderId && order.isClaimed !== true;

                return (
                  <div
                    key={order.id}
                    className="bg-white dark:bg-[#282526] border border-stone-300 dark:border-white/5 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:border-amber-500/40 dark:hover:border-white/10 transition-all shadow-xl relative overflow-hidden"
                  >
                    {/* Status Top Accent Bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${isUnclaimed ? 'bg-emerald-500' : isReady ? 'bg-amber-500' : 'bg-[#FD9139]'}`} />

                    <div className="space-y-3.5">
                      {/* Header: Order ID & Status Pill */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-base font-black text-stone-900 dark:text-white font-['Outfit'] tracking-wide">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          <p className="text-xs font-semibold text-stone-600 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5 font-['Plus_Jakarta_Sans']">
                            <Store className="w-3.5 h-3.5 text-amber-600 dark:text-[#FD9139]" />
                            <span>{shopName}</span>
                          </p>
                        </div>

                        {isUnclaimed ? (
                          <span className="px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider border flex items-center gap-1.5 shadow-sm bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full animate-ping bg-emerald-500" />
                            <span>Available to Claim</span>
                          </span>
                        ) : (
                          <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider border flex items-center gap-1.5 shadow-sm ${isReady
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : 'bg-[#FD9139]/15 text-stone-900 dark:text-[#FD9139] border-[#FD9139]/30'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isReady ? 'bg-amber-500' : 'bg-[#FD9139]'}`} />
                            <span>{isReady ? 'Ready for Pickup' : 'In Transit'}</span>
                          </span>
                        )}
                      </div>

                      {/* Customer Info Panel: Masked PII for Unclaimed, Full for Claimed */}
                      {isUnclaimed ? (
                        <div className="bg-stone-100 dark:bg-[#1E1B1C] border border-amber-500/20 rounded-2xl p-4 space-y-2.5 text-xs text-stone-800 dark:text-neutral-300 font-['Plus_Jakarta_Sans'] shadow-inner">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-stone-900 dark:text-white text-sm flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-amber-600 dark:text-[#FD9139]" />
                              <span>{order.customerName || 'Customer'}</span>
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-stone-200 dark:bg-white/5 border border-stone-300 dark:border-white/10 text-[10px] text-stone-600 dark:text-neutral-400 font-mono">
                              {order.customerPhone || '******'}
                            </span>
                          </div>

                          <div className="flex items-start gap-2 text-xs text-stone-700 dark:text-neutral-300">
                            <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-[#FD9139] shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-stone-900 dark:text-white">Delivery Vicinity: <span className="font-normal text-amber-600 dark:text-amber-400">{order.deliveryArea || order.deliveryAddress || 'Vrindavan Vicinity'}</span></p>
                              <p className="text-[10px] text-stone-500 dark:text-neutral-500 mt-0.5">🔒 Exact customer address & phone will unlock upon claiming</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-stone-700 dark:text-neutral-300 pt-0.5">
                            <span className="font-semibold text-stone-800 dark:text-neutral-300 flex items-center gap-1.5">
                              <Navigation className="w-3 h-3 text-amber-600 dark:text-[#FD9139]" />
                              <span>Pickup Distance:</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 dark:bg-[#FD9139]/10 text-amber-800 dark:text-[#FD9139] font-mono font-bold text-[11px] border border-amber-500/20 dark:border-[#FD9139]/20">
                              {order.pickupDistanceKm != null ? `${order.pickupDistanceKm} km away` : 'Nearby Vrindavan'}
                            </span>
                          </div>

                          {order.itemsSummary && (
                            <div className="text-[11px] text-stone-600 dark:text-neutral-400 truncate">
                              <span className="font-semibold text-stone-800 dark:text-neutral-300">Items: </span>
                              <span>{order.itemsSummary}</span>
                            </div>
                          )}

                          <div className="pt-2 border-t border-stone-200 dark:border-white/5 flex items-center justify-between text-xs">
                            <span className="text-stone-500 dark:text-neutral-400 font-medium">Estimated Rider Earning:</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 font-['Outfit'] text-sm">
                              ₹{order.deliveryCharge || 45}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-stone-100 dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/5 rounded-2xl p-4 space-y-3 text-xs text-stone-800 dark:text-neutral-300 font-['Plus_Jakarta_Sans'] shadow-inner">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-stone-900 dark:text-white text-sm">{order.customerName || 'Customer'}</span>
                            {order.customerPhone && (
                              <a
                                href={`tel:${order.customerPhone}`}
                                className="px-3 py-1 rounded-full bg-stone-200 dark:bg-white/5 hover:bg-stone-300 dark:hover:bg-white/10 text-stone-900 dark:text-white border border-stone-300 dark:border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                              >
                                <Phone className="w-3 h-3 text-amber-600 dark:text-[#FD9139]" />
                                <span>{order.customerPhone}</span>
                              </a>
                            )}
                          </div>

                          <div className="flex items-start gap-2 text-xs text-stone-700 dark:text-neutral-300">
                            <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-[#FD9139] shrink-0 mt-0.5" />
                            <p className="line-clamp-2 leading-relaxed">{order.customerAddress || order.deliveryAddress || 'Vrindavan Delivery Location'}</p>
                          </div>

                          <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                            <span className="text-neutral-400 font-medium">Payment:</span>
                            {(() => {
                              const rawMethod = String(order.payment_method || order.paymentMethod || '').toLowerCase().trim();
                              const isCash = rawMethod === 'cash' || rawMethod === 'cod';
                              const isCollected = order.cash_status === 'collected' || order.cashStatus === 'collected' || order.cash_collected || order.cashCollected;
                              if (!isCash) {
                                return (
                                  <span className="px-2.5 py-1 rounded-xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-bold text-[10px] flex items-center gap-1.5">
                                    <CreditCard className="w-3 h-3 text-emerald-400" />
                                    <span>PAID ONLINE</span>
                                  </span>
                                );
                              }
                              if (isCollected) {
                                return (
                                  <span className="px-2.5 py-1 rounded-xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-bold text-[10px] flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>CASH COLLECTED</span>
                                  </span>
                                );
                              }
                              return (
                                <span className="px-2.5 py-1 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/20 font-black text-[10px] flex items-center gap-1.5">
                                  <Banknote className="w-3 h-3 text-amber-300" />
                                  <span>COLLECT ₹{order.totalAmount || order.total_amount || 0}</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Unified Platform UI/UX */}
                    {isUnclaimed ? (
                      <div className="pt-2 font-['Plus_Jakarta_Sans']">
                        <button
                          data-tour="delivery-accept"
                          type="button"
                          onClick={() => handleClaimOrder(order.id)}
                          disabled={isClaimingOrderId === order.id}
                          className="w-full py-3.5 px-4 rounded-2xl bg-[#FD9139] hover:bg-[#FCA65E] active:scale-[0.98] text-[#121214] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(253, 145, 57,0.25)] hover:shadow-[0_6px_22px_rgba(253, 145, 57,0.4)] cursor-pointer disabled:opacity-50"
                        >
                          {isClaimingOrderId === order.id ? (
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Truck className="w-4 h-4 stroke-[2.5]" />
                          )}
                          <span>{isClaimingOrderId === order.id ? 'Claiming Order...' : '🛵 Claim Delivery'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2 flex gap-2.5 font-['Plus_Jakarta_Sans']">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setViewMode('map');
                          }}
                          className="flex-1 py-3.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-white/10 hover:border-white/20"
                        >
                          <Map className="w-4 h-4 text-[#FD9139]" />
                          <span>Map View</span>
                        </button>

                        {isReady ? (
                          <button
                            onClick={() => handleInitiatePickup(order)}
                            className="flex-1 py-3.5 px-3 rounded-2xl bg-[#FD9139] hover:bg-[#FCA65E] active:scale-[0.98] text-[#121214] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(253, 145, 57,0.25)] hover:shadow-[0_6px_22px_rgba(253, 145, 57,0.4)] cursor-pointer"
                          >
                            <span>Start Ride</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            data-tour="delivery-complete"
                            onClick={() => handleInitiateDelivery(order)}
                            className="flex-1 py-3.5 px-3 rounded-2xl bg-[#FD9139] hover:bg-[#FCA65E] active:scale-[0.98] text-[#121214] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(253, 145, 57,0.25)] hover:shadow-[0_6px_22px_rgba(253, 145, 57,0.4)] cursor-pointer"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Delivered</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RIDER FINANCIAL & TRUST METRICS — Positioned below orders so rider sees active delivery tasks and navigation first */}
      {(() => {
        const riderId = activeUser?.id || activeUser?.email || 'rider_sarathi_gopal';
        const ledger = getRiderCashLedger(riderId);
        const cashCheck = isRiderCashLimitExceeded(riderId);
        const trustScore = getUserTrustScore(riderId);
        const cashPercent = Math.min(100, Math.round((ledger.cashInHand / RIDER_MAX_CASH_LIMIT) * 100));
        const trustPercent = Math.min(100, Math.round((trustScore / 900) * 100));

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
            {/* Card 1: COD Cash in Hand */}
            <div data-tour="delivery-earnings" className={`p-4 sm:p-5 md:p-6 rounded-[28px] sm:rounded-[32px] border shadow-lg flex flex-col justify-between transition-all ${cashCheck.isExceeded
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : 'bg-stone-200/90 dark:bg-[#282526] border-stone-300 dark:border-white/10 text-stone-900 dark:text-white'
              }`}>
              {/* Row 1: Icon + Title on Left, Status Badge on Right */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-sm shrink-0 ${cashCheck.isExceeded ? 'bg-rose-500 text-white' : 'bg-amber-500/15 text-amber-700 dark:bg-[#FD9139]/15 dark:text-[#FD9139] border border-amber-500/30 dark:border-[#FD9139]/30'
                    }`}>
                    <Banknote size={19} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-bold text-stone-600 dark:text-zinc-400 uppercase tracking-wider font-outfit truncate">
                      COD Cash In Hand
                    </p>
                  </div>
                </div>

                {cashCheck.isExceeded ? (
                  <span className="text-[10px] font-black bg-rose-500 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow-sm shrink-0 whitespace-nowrap">
                    Limit Reached
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 shadow-xs shrink-0 whitespace-nowrap font-outfit">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Ready for Delivery</span>
                  </span>
                )}
              </div>

              {/* Row 2: Metric Amount + Cap Limit across full width with ZERO line-wrapping */}
              <div className="flex items-baseline justify-between gap-2 mt-4 mb-2.5">
                <div className="flex items-baseline gap-2 flex-nowrap whitespace-nowrap">
                  <span className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white font-outfit tracking-tight">
                    ₹{ledger.cashInHand}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-stone-500 dark:text-zinc-400 font-outfit">
                    / ₹{RIDER_MAX_CASH_LIMIT} Cap
                  </span>
                </div>
                <span className="text-xs font-black font-outfit text-stone-600 dark:text-zinc-400 shrink-0">
                  {cashPercent}%
                </span>
              </div>

              {/* Recessed Luxury Progress Bar Track */}
              <div className="w-full bg-stone-300/80 dark:bg-[#151314] h-2.5 rounded-full border border-stone-300 dark:border-white/5 p-0.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 min-w-[4px] ${cashCheck.isExceeded ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 'bg-amber-500 dark:bg-[#FD9139] shadow-[0_0_10px_rgba(253, 145, 57,0.4)]'}`}
                  style={{ width: `${Math.max(2, cashPercent)}%` }}
                />
              </div>
            </div>

            {/* Card 2: Sarathi Trust & CIBIL Score */}
            <div className="p-4 sm:p-5 md:p-6 rounded-[28px] sm:rounded-[32px] bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 shadow-lg flex flex-col justify-between transition-all">
              {/* Row 1: Icon + Title on Left, Badge on Right */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold shadow-sm shrink-0">
                    <Star size={19} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-bold text-stone-600 dark:text-zinc-400 uppercase tracking-wider font-outfit truncate">
                      Sarathi Trust Score
                    </p>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black px-3 py-1 rounded-full border shadow-xs shrink-0 whitespace-nowrap font-outfit ${trustScore >= 750 ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${trustScore >= 750 ? 'bg-purple-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span>{trustScore >= 750 ? 'Top Sarathi' : 'Active Partner'}</span>
                </span>
              </div>

              {/* Row 2: Score + Total Pts with zero wrapping */}
              <div className="flex items-baseline justify-between gap-2 mt-4 mb-2.5">
                <div className="flex items-baseline gap-2 flex-nowrap whitespace-nowrap">
                  <span className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white font-outfit tracking-tight">
                    {trustScore}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400 font-outfit">
                    / 900 Pts
                  </span>
                </div>
                <span className="text-xs font-black font-outfit text-purple-600 dark:text-purple-400 shrink-0">
                  {trustPercent}%
                </span>
              </div>

              {/* Recessed Luxury Progress Bar Track */}
              <div className="w-full bg-stone-300/80 dark:bg-[#151314] h-2.5 rounded-full border border-stone-300 dark:border-white/5 p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-fuchsia-500 transition-all duration-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                  style={{ width: `${Math.max(2, trustPercent)}%` }}
                />
              </div>
            </div>

            {/* Card 3: Foody Vrinda Verified Shift Delivery Slip & Order Summary (PDF) */}
            <div data-tour="delivery-report" className="md:col-span-2 p-4 sm:p-5 md:p-6 rounded-[28px] sm:rounded-[32px] bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden transition-all hover:border-[#FD9139]/30 group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 dark:bg-[#FD9139]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
              <div className="flex items-center gap-3.5 min-w-0 relative z-10 w-full sm:w-auto">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 text-amber-700 dark:bg-[#FD9139]/15 dark:text-[#FD9139] border border-amber-500/30 dark:border-[#FD9139]/30 flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <FileText size={20} strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-[11px] font-bold text-stone-600 dark:text-zinc-400 uppercase tracking-wider font-outfit">
                    Shift Orders & Delivery Report
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <h4 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white font-outfit">
                      Today's Delivery
                    </h4>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                      Official Slip
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    Download or print complete itemized orders, customer addresses & COD cash collected.
                  </p>
                </div>
              </div>

              {/* Single Clear Action Button: Download Slip (PDF) */}
              <div className="flex items-center w-full sm:w-auto shrink-0 relative z-10">
                <button
                  type="button"
                  onClick={handleDownloadShiftSlip}
                  className="h-11 px-5 rounded-full bg-amber-600 hover:bg-amber-700 dark:bg-[#FD9139] dark:hover:bg-[#FCA65E] text-white text-xs font-black font-outfit uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-md active:scale-95 apple-tap-target w-full sm:w-auto"
                  title="Download and Print Today's Order Report as PDF"
                >
                  <FileDown size={16} strokeWidth={2.5} />
                  <span>Download Slip (PDF)</span>
                </button>
              </div>
            </div>

            {/* Banner: Sarathi Fleet Dynasty Referrals */}
            <div data-tour="delivery-referral" className="md:col-span-2 p-4 sm:p-5 md:p-6 rounded-[28px] sm:rounded-[32px] bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden transition-all hover:border-emerald-500/30 group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
              <div className="flex items-center gap-3.5 min-w-0 relative z-10 w-full sm:w-auto">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <Users size={20} strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white font-outfit">Sarathi Fleet Referral Hub</h4>
                  <p className="text-xs text-stone-600 dark:text-zinc-400 mt-0.5 leading-relaxed">Invite new riders to the Foody Vrinda fleet and earn 100 FV points per completed order.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.open('https://whatsapp.com/channel/0029Vb6UR3Z9mrGcDXbHzA1Q', '_blank')}
                className="h-10 px-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-[#FD9139] dark:hover:bg-[#FCA65E] dark:text-white text-xs font-black font-outfit uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-md active:scale-95 relative z-10 apple-tap-target w-full sm:w-auto"
              >
                <MessageCircle size={15} />
                <span>Join Fleet Channel</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* 🔐 TWO-STAGE OTP VERIFICATION MODAL (Pickup from Kitchen & Doorstep Delivery) */}
      {otpModalState.isOpen && otpModalState.order && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !otpModalState.isSubmitting) {
              closeOtpModal();
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md apple-overlay"
        >
          <div
            className={`w-full max-w-md bg-stone-900 border border-white/10 text-white rounded-[32px] p-6 sm:p-7 shadow-2xl relative apple-modal-spring ${otpModalState.shake ? 'animate-shake' : ''
              }`}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${otpModalState.type === 'pickup'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-[#FD9139]/15 border-[#FD9139]/30 text-[#FD9139]'
                    }`}
                >
                  {otpModalState.type === 'pickup' ? (
                    <Store className="w-6 h-6" />
                  ) : (
                    <Sparkles className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${otpModalState.type === 'pickup'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-[#FD9139]/20 text-[#FD9139]'
                        }`}
                    >
                      {otpModalState.type === 'pickup' ? 'Stage 1: Kitchen Pickup' : 'Stage 2: Customer Handover'}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white font-['Outfit'] mt-0.5">
                    {otpModalState.type === 'pickup'
                      ? 'Kitchen Pickup OTP'
                      : 'Doorstep Delivery OTP'}
                  </h3>
                </div>
              </div>

              <button
                onClick={closeOtpModal}
                disabled={otpModalState.isSubmitting}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subtitle / Instructions */}
            <div className="my-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1.5">
              <p className="text-xs text-stone-300">
                {otpModalState.type === 'pickup'
                  ? 'Ask kitchen chef or staff for the 4-digit Pickup OTP shown on their screen.'
                  : `Ask customer ${getOrderCustomerName(otpModalState.order)} for the 4-digit code in their app.`}
              </p>
              <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono pt-1 border-t border-white/5">
                <span>Order #{otpModalState.order.id ? otpModalState.order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : ''}</span>
                <span className="text-stone-300 font-semibold truncate max-w-[180px]">
                  {getOrderItemSummary(otpModalState.order)}
                </span>
              </div>
            </div>

            {/* 📦 PHYSICAL QC CHECKLIST (Prevents Bag Mix-ups at Kitchen) */}
            {otpModalState.type === 'pickup' && (
              <div className="mb-3.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <PackageCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] text-amber-200 font-semibold truncate">
                    QC Check: {otpModalState.order.items?.length || 1} items & label match #{otpModalState.order.id?.slice(-5).toUpperCase()}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-400 font-mono shrink-0 uppercase bg-amber-500/20 px-2 py-0.5 rounded-md">
                  Verified
                </span>
              </div>
            )}

            {/* 📍 GEOFENCE PROXIMITY VERIFICATION (Prevents Remote Doorstep Fraud) */}
            {otpModalState.type === 'delivery' && (() => {
              const geofence = checkDeliveryGeofence(
                riderCoords,
                otpModalState.order.deliveryCoordinates || otpModalState.order.delivery_coordinates
              );
              if (!geofence.hasCoordinates) return null;
              if (geofence.isWithinGeofence) {
                return (
                  <div className="mb-3.5 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-emerald-400 text-[11px] font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>GPS Lock: At Doorstep ({geofence.formattedDistance})</span>
                  </div>
                );
              }
              return (
                <div className="mb-3.5 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex items-start gap-2 text-amber-300 text-[11px]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold">Proximity Notice: </span>
                    <span>Rider GPS is {geofence.formattedDistance}. Please confirm you are at customer doorstep.</span>
                  </div>
                </div>
              );
            })()}

            {/* Cash on Delivery Notice if applicable */}
            {otpModalState.type === 'delivery' && (() => {
              const rawMethod = String(otpModalState.order?.payment_method || otpModalState.order?.paymentMethod || '').toLowerCase().trim();
              const isCash = rawMethod === 'cash' || rawMethod === 'cod';
              if (!isCash) return null;
              return (
                <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <Banknote className="w-4 h-4 text-amber-400" />
                    <span>Collect Cash Payment</span>
                  </div>
                  <span className="font-black text-sm text-amber-300 font-['Outfit']">
                    ₹{otpModalState.order.totalAmount || otpModalState.order.total_amount || 0}
                  </span>
                </div>
              );
            })()}

            {/* 4-Digit PIN Boxes */}
            <div className="py-2">
              <label className="block text-center text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-3">
                Enter 4-Digit Verification Code
              </label>

              <div className="flex justify-center items-center gap-3">
                {otpModalState.digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    disabled={otpModalState.isSubmitting || otpModalState.isSuccess}
                    autoComplete="one-time-code"
                    className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black font-mono rounded-2xl bg-[#141213] border transition-all outline-none ${otpModalState.isSuccess
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : digit
                        ? 'border-[#FD9139] text-[#FD9139] shadow-[0_0_12px_rgba(253, 145, 57,0.2)]'
                        : 'border-white/15 text-white focus:border-[#FD9139] focus:shadow-[0_0_12px_rgba(253, 145, 57,0.2)]'
                      }`}
                  />
                ))}
              </div>

              {/* Error Message */}
              {otpModalState.error && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-rose-400 text-xs font-bold animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{otpModalState.error}</span>
                </div>
              )}

              {/* Success Feedback */}
              {otpModalState.isSuccess && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-bold animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Verified successfully! Updating order...</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-5 space-y-2 font-['Plus_Jakarta_Sans']">
              <button
                type="button"
                onClick={() => verifyAndSubmitOtp()}
                disabled={otpModalState.isSubmitting || otpModalState.isSuccess}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.98] ${otpModalState.type === 'pickup'
                  ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/20'
                  : 'bg-[#FD9139] hover:bg-[#FCA65E] text-white shadow-[#FD9139]/20'
                  }`}
              >
                {otpModalState.isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : otpModalState.isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>
                      {otpModalState.type === 'pickup'
                        ? 'Confirm Pickup & Start Ride'
                        : 'Confirm Delivery Complete'}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={closeOtpModal}
                disabled={otpModalState.isSubmitting}
                className="w-full py-2.5 px-4 rounded-2xl text-stone-400 hover:text-white text-xs font-bold transition-all text-center cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
