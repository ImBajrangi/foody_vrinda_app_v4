import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { useFastNotify } from '../hooks/useFastNotify';
import { useAudioAlarm } from '../hooks/useAudioAlarm';
import { supabase, updateCloudOrderStatus, subscribeCloudOrders, createCloudNotification, getOrderItemSummary, getOrderCustomerName } from '../supabase';
import DynamicToast from '../components/ui/DynamicToast';
import ActiveAlarmBanner from '../components/ui/ActiveAlarmBanner';
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
  CreditCard
} from 'lucide-react';

export default function TransportView() {
  const { currentUserShopId, currentUserShopIds = [], allShops = [], actualRole, impersonate, userRole, isAuthorizedDeveloper, isAuthorizedAdmin } = useAuth();
  const isGlobalRole = Boolean(isAuthorizedDeveloper || isAuthorizedAdmin || ['developer', 'grand_admin', 'owner'].includes(actualRole || userRole) || allShops.length > 1);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' (default) | 'map'
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Audio Alarm hook
  const { isPlaying, activeAlert, playRoleAlarm, stopAlarm } = useAudioAlarm();

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

  const targetShopIds = (currentUserShopIds && currentUserShopIds.length > 0)
    ? currentUserShopIds
    : [currentUserShopId].filter(Boolean);

  // Fast notification listener with role-tailored delivery chime
  useFastNotify(targetShopIds, 'delivery', (alertData) => {
    playRoleAlarm('delivery', alertData, true);
    showToast(`Order #${alertData.orderId.slice(-6).toUpperCase()} ready for Sarathi Pickup!`, "info");
  });

  // Load delivery orders (ready_for_pickup, ready, out_of_kitchen, out_for_delivery, in_transit) from Supabase Realtime
  useEffect(() => {
    // 1. Supabase Cloud Query
    async function fetchRiderOrders() {
      try {
        let queryBuilder = supabase
          .from('foody_orders')
          .select('*')
          .in('status', ['ready_for_pickup', 'ready', 'out_of_kitchen', 'out_for_delivery', 'picked_up', 'in_transit'])
          .order('created_at', { ascending: true });

        if (targetShopIds.length === 1) {
          queryBuilder = queryBuilder.eq('shop_id', targetShopIds[0]);
        } else if (targetShopIds.length > 1) {
          queryBuilder = queryBuilder.in('shop_id', targetShopIds);
        }

        const { data, error } = await queryBuilder;
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
            createdAt: o.created_at
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
      } catch (err) {
        console.warn('Supabase fetchRiderOrders note:', err.message);
      }
    }
    fetchRiderOrders();

    // 2. Realtime Postgres stream (listen to shop or global 'all')
    const subShopId = targetShopIds.length === 1 ? targetShopIds[0] : 'all';
    const unsubscribeSupabase = subscribeCloudOrders(subShopId, () => {
      fetchRiderOrders();
    });

    return () => {
      if (unsubscribeSupabase) unsubscribeSupabase();
    };
  }, [currentUserShopId, currentUserShopIds]);

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
          border: 2.5px solid #E0FF33;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.6), 0 0 10px rgba(224,255,51,0.25);
          cursor: pointer;
        ">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#E0FF33" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
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
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
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
          <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
            <div style="
              width: 36px;
              height: 36px;
              background: #181617;
              border: 2.5px solid #E0FF33;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 6px 18px rgba(0,0,0,0.7), 0 0 16px rgba(224,255,51,0.4);
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
      const riderMarker = L.marker([midLat, midLng], { icon: riderIcon, zIndexOffset: 500 });
      riderMarker.bindTooltip('Sarathi Rider (Live GPS)', { permanent: false, direction: 'top', offset: [0, -22] });
      riderMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        riderMarker.toggleTooltip();
      });
      group.addLayer(riderMarker);
    }

    // Dynamic Parabolic Arc Generator for off-road doorstep connection
    const generateParabolicArc = (start, end, numPoints = 30, bendFactor = 0.22) => {
      const [lat0, lng0] = start;
      const [lat1, lng1] = end;
      const dLat = lat1 - lat0;
      const dLng = lng1 - lng0;
      const dist = Math.hypot(dLat, dLng);
      if (dist < 0.00001) return [start, end];

      const midLat = (lat0 + lat1) / 2;
      const midLng = (lng0 + lng1) / 2;
      const normLat = -dLng / dist;
      const normLng = dLat / dist;

      const controlLat = midLat + normLat * dist * bendFactor;
      const controlLng = midLng + normLng * dist * bendFactor;

      const points = [];
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const invT = 1 - t;
        const lat = invT * invT * lat0 + 2 * invT * t * controlLat + t * t * lat1;
        const lng = invT * invT * lng0 + 2 * invT * t * controlLng + t * t * lng1;
        points.push([lat, lng]);
      }
      return points;
    };

    // 4. Luxury Laser Polyline (Outer Casing + Animated Glowing Neon Route)
    const routeCasing = L.polyline([
      [shopLat, shopLng],
      [destLat, destLng]
    ], {
      color: '#181617',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(routeCasing);

    const routeLine = L.polyline([
      [shopLat, shopLng],
      [destLat, destLng]
    ], {
      color: '#E0FF33',
      weight: 2.8,
      dashArray: '6, 8',
      className: 'animated-delivery-route',
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(routeLine);

    // Dynamic Parabolic Arc with Flowing Circle Dots reaching destination
    const walkingConnector = L.polyline([], {
      color: '#6366F1',
      weight: 5,
      dashArray: '0, 12',
      className: 'animated-parabolic-dots',
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 0.95
    });
    group.addLayer(walkingConnector);

    // Road Drop-off Terminus Dot (Vehicle stop location)
    const dropOffStopDot = L.circleMarker([destLat, destLng], {
      radius: 4,
      color: '#181617',
      fillColor: '#6366F1',
      fillOpacity: 1,
      weight: 2
    });

    fetch(`https://router.project-osrm.org/route/v1/driving/${shopLng},${shopLat};${destLng},${destLat}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data?.routes?.[0]?.geometry?.coordinates) {
          const rawLatLngs = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          if (rawLatLngs.length > 0) {
            const roadLatLngs = [
              [shopLat, shopLng],
              ...rawLatLngs
            ];
            const roadEnd = rawLatLngs[rawLatLngs.length - 1];

            routeCasing.setLatLngs(roadLatLngs);
            routeLine.setLatLngs(roadLatLngs);

            // Connect road terminus directly to destination pin with dynamic parabolic circle dots arc
            const walkingArc = generateParabolicArc(roadEnd, [destLat, destLng], 30, 0.22);
            walkingConnector.setLatLngs(walkingArc);

            const isOffset = Math.hypot(roadEnd[0] - destLat, roadEnd[1] - destLng) > 0.0001;
            if (isOffset) {
              dropOffStopDot.setLatLng(roadEnd);
              if (!group.hasLayer(dropOffStopDot)) {
                group.addLayer(dropOffStopDot);
              }
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

  const handleStartDelivery = async (orderId, orderData) => {
    stopAlarm();
    try {
      await updateCloudOrderStatus(orderId, 'out_for_delivery', {
        rider_name: 'Govind Das (Sarathi)',
        rider_phone: '+91 98765 43210',
        rider_rating: '4.95',
        rider_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
      });
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        status: 'out_for_delivery',
        rider_name: 'Govind Das (Sarathi)',
        rider_phone: '+91 98765 43210',
        rider_rating: '4.95',
        rider_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
      } : o));

      const itemSummary = getOrderItemSummary(orderData) || 'Satvik Meal';
      const customerName = getOrderCustomerName(orderData);

      if (orderData?.userId) {
        await createCloudNotification({
          userId: orderData.userId,
          title: `On The Way: ${itemSummary}`,
          message: `${itemSummary} is on the way with ${orderData?.rider_name || 'Govind Das'}.`,
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

  const handleCompleteDelivery = async (orderId, orderData) => {
    stopAlarm();
    try {
      const rawMethod = String(orderData?.payment_method || orderData?.paymentMethod || '').toLowerCase().trim();
      const isCash = rawMethod === 'cash' || rawMethod === 'cod';
      await updateCloudOrderStatus(orderId, 'completed', {
        cash_status: isCash ? 'collected' : (orderData?.cashStatus || orderData?.cash_status || 'none')
      });
      setOrders(prev => prev.filter(o => o.id !== orderId));

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

  const filteredOrders = orders.filter(order => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    const idMatch = order.id.toLowerCase().includes(term);
    const custMatch = order.customerName?.toLowerCase().includes(term);
    const itemsMatch = order.items?.map(i => i.name.toLowerCase()).join(' ').includes(term);
    return idMatch || custMatch || itemsMatch;
  });

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
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

      {/* Top Controls: Responsive Switcher between Map View and List View */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 bg-[#282526] border border-white/8 p-3.5 sm:p-4 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#1E1B1C] border border-white/10 flex items-center justify-center text-[#E0FF33] shrink-0 shadow-md">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-black text-white font-['Outfit'] tracking-tight truncate">
              Sarathi Delivery Fleet
            </h3>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 font-['Plus_Jakarta_Sans']">
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E0FF33] animate-pulse shrink-0" />
                <strong className="text-white font-bold">{orders.length}</strong> {orders.length === 1 ? 'Active Order' : 'Active Orders'}
              </span>
              <span className="text-neutral-600">•</span>
              <span className="truncate">{viewMode === 'map' ? 'CARTO HUD View' : 'Queue View'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#1E1B1C] p-1.5 rounded-2xl border border-white/8 shadow-inner shrink-0 self-stretch sm:self-auto justify-center">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === 'list'
                ? 'bg-[#E0FF33] text-[#121214] font-black shadow-[0_2px_10px_rgba(224,255,51,0.3)]'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <List className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap font-['Plus_Jakarta_Sans']">Orders ({orders.length})</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === 'map'
                ? 'bg-[#E0FF33] text-[#121214] font-black shadow-[0_2px_10px_rgba(224,255,51,0.3)]'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <Map className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap font-['Plus_Jakarta_Sans']">Carto HUD</span>
          </button>
        </div>
      </div>

      {/* BRANCH SELECTOR — Global roles can switch delivery branches inline */}
      {isGlobalRole && allShops.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider shrink-0 pl-1">Branch:</span>
          {allShops.map(s => {
            const isActive = currentUserShopId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => impersonate(s.id, userRole)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 whitespace-nowrap ${isActive
                    ? 'bg-[#E0FF33] text-black border-[#E0FF33] font-black'
                    : 'bg-[#282526] text-neutral-400 border-white/10 hover:text-white hover:border-white/20'
                  }`}
              >
                <Store className="w-3 h-3" />
                <span>{s.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 1: PROFESSIONAL RESPONSIVE DISPATCH & CARTO MAP HUD */}
      {viewMode === 'map' && activeOrder && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">

          {/* Main Map Viewport (Left / Top) */}
          <div className="lg:col-span-7 xl:col-span-8 w-full h-[400px] sm:h-[500px] lg:h-[680px] bg-[#1E1B1C] rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl flex flex-col">
            <div ref={mapContainerRef} className="w-full h-full min-h-[380px] z-0" />

            {/* TOP FLOATING CONTROLS */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between z-[500] pointer-events-none">
              <button
                onClick={() => setViewMode('list')}
                className="px-3.5 py-2 rounded-xl bg-[#1E1B1C]/90 hover:bg-[#282526] text-white shadow-xl backdrop-blur-md flex items-center gap-2 border border-white/15 active:scale-95 transition-all cursor-pointer pointer-events-auto text-xs font-bold"
                title="View all dispatch orders"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
                <span className="hidden sm:inline">Orders List ({orders.length})</span>
              </button>

              <div className="flex items-center gap-2 pointer-events-auto">
                <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E1B1C]/90 backdrop-blur-md text-[#E0FF33] border border-white/15 text-[11px] font-black shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-[#E0FF33] animate-pulse" />
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
            <div className="absolute bottom-4 inset-x-4 z-[500] pointer-events-none hidden sm:flex items-center justify-between p-3 rounded-2xl bg-[#1E1B1C]/90 backdrop-blur-md border border-white/10 shadow-xl text-xs text-white">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#E0FF33]/15 text-[#E0FF33] text-[10px] font-black border border-[#E0FF33]/30">
                  ORIGIN
                </span>
                <span className="font-bold truncate max-w-[140px]">
                  {activeShop?.name || 'Kitchen Store'}
                </span>
              </div>
              <ArrowRight size={14} className="text-[#E0FF33] stroke-[2.5]" />
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                  DROP-OFF
                </span>
                <span className="font-bold truncate max-w-[160px]">
                  {activeOrder.customerAddress || activeOrder.deliveryAddress || 'Customer Address'}
                </span>
              </div>
            </div>
          </div>

          {/* Dispatch Sidebar & Action Console (Right / Bottom) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4 w-full">
            {/* Primary Active Dispatch Card */}
            <div className="bg-[#282526] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
              {/* Customer Profile & Direct Contact Actions */}
              <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-white/5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-2xl bg-[#1E1B1C] border border-white/10 text-[#E0FF33] overflow-hidden shrink-0 shadow-md flex items-center justify-center">
                    <User size={18} className="stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm tracking-tight font-['Outfit'] text-white truncate">
                        {activeOrder.customerName || 'Customer'}
                      </h4>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/5 text-neutral-300 border border-white/10 shrink-0 font-mono">
                        #{activeOrder.id ? activeOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ORDER'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs mt-0.5 font-['Plus_Jakarta_Sans']">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-white text-[11px] font-black">5.0</span>
                      </div>
                      <span className="text-neutral-600 text-[10px]">•</span>
                      <span className="text-neutral-400 text-[11px] font-medium truncate">
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
                      className="w-9 h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                      title="WhatsApp Customer"
                    >
                      <MessageCircle className="w-4 h-4 stroke-[2]" />
                    </a>
                  )}
                  {activeOrder.customerPhone && (
                    <a
                      href={`tel:${activeOrder.customerPhone.replace(/\D/g, '').slice(-10)}`}
                      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                      title="Call Customer"
                    >
                      <Phone className="w-4 h-4 text-[#E0FF33] stroke-[2]" />
                    </a>
                  )}
                </div>
              </div>

              {/* ETA & Drop-off Target */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#1E1B1C] border border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/5 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-[#E0FF33]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Estimated Drop-off</p>
                    <h5 className="font-bold text-sm text-white font-['Outfit'] truncate">
                      Target ~ {new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </h5>
                  </div>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[10px] font-black text-[#E0FF33] bg-[#E0FF33]/15 px-2.5 py-1 rounded-full border border-[#E0FF33]/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E0FF33] animate-pulse"></span>
                  Live Active
                </span>
              </div>

              {/* Destination Address */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#1E1B1C] border border-white/5">
                <div className="w-9 h-9 rounded-xl bg-[#E0FF33]/15 text-[#E0FF33] border border-[#E0FF33]/30 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-[#E0FF33]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Destination</p>
                    <span className="text-[10px] font-bold text-neutral-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 shrink-0 whitespace-nowrap">ETA: ~8–10 Min</span>
                  </div>
                  <p className="text-xs font-bold text-white font-['Outfit'] line-clamp-2 leading-relaxed">
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
                        <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-emerald-300 truncate">Prepaid Online</span>
                      </div>
                      <span className="font-black text-[10px] px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 shrink-0 whitespace-nowrap uppercase tracking-wider">
                        NO CASH DUE
                      </span>
                    </div>
                  );
                }
                if (isCollected) {
                  return (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-emerald-300 truncate">Cash Paid</span>
                      </div>
                      <span className="font-black text-[10px] px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 shrink-0 whitespace-nowrap uppercase tracking-wider">
                        COLLECTED
                      </span>
                    </div>
                  );
                }
                return (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <Banknote className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-amber-300 truncate">Cash on Delivery</span>
                    </div>
                    <span className="font-black text-sm text-amber-400 font-['Outfit'] shrink-0 whitespace-nowrap">
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
                    className="w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <Compass className="w-4 h-4 text-[#E0FF33]" />
                    <span>Open Live On Google Maps</span>
                  </a>
                )}

                {['ready_for_pickup', 'ready', 'out_of_kitchen'].includes(activeOrder.status) ? (
                  <button
                    onClick={() => handleStartDelivery(activeOrder.id, activeOrder)}
                    className="w-full py-4 px-4 rounded-2xl bg-[#E0FF33] hover:bg-[#d8fa26] text-[#121214] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(224,255,51,0.3)] active:scale-[0.98] cursor-pointer whitespace-nowrap"
                  >
                    <span>Pick Up & Start Delivery</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleCompleteDelivery(activeOrder.id, activeOrder)}
                    className="w-full py-4 px-4 rounded-2xl bg-[#E0FF33] hover:bg-[#d8fa26] text-[#121214] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(224,255,51,0.3)] active:scale-[0.98] cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5] shrink-0" />
                    <span>Mark as Delivered</span>
                  </button>
                )}
              </div>
            </div>

            {/* Other Active Deliveries Queue (Directly in Sidebar) */}
            {orders.length > 1 && (
              <div className="bg-[#282526] border border-white/10 rounded-3xl p-4.5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-white text-xs uppercase tracking-wider font-['Outfit']">
                    Other Active Deliveries ({orders.length - 1})
                  </h4>
                  <span className="text-[10px] text-neutral-400 font-bold">Tap to switch</span>
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
                            ? 'bg-[#1E1B1C] border-[#E0FF33] shadow-[0_0_12px_rgba(224,255,51,0.2)] ring-1 ring-[#E0FF33]'
                            : 'bg-[#1E1B1C]/60 border-white/5 hover:border-white/15 hover:bg-[#1E1B1C]'
                          }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-white text-xs truncate">
                            #{o.id ? o.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ORDER'} • {o.customerName || 'Customer'}
                          </p>
                          <p className="text-[10px] text-neutral-400 truncate">
                            {o.customerAddress || o.deliveryAddress || 'Vrindavan'}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase shrink-0 ${isReadyOrder ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25' : 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/25'
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
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, or dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#282526] border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
            />
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-[#282526] border border-white/5 rounded-3xl p-16 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-neutral-400">
                <PackageCheck className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white font-['Outfit']">All deliveries caught up!</h3>
              <p className="text-xs text-neutral-400 font-['Plus_Jakarta_Sans'] max-w-sm mx-auto">
                No active delivery orders currently pending. New pickup requests will chime the live alarm.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredOrders.map(order => {
                const shopName = allShops.find(s => s.id === order.shopId)?.name || 'Kitchen';
                const isReady = ['ready_for_pickup', 'ready', 'out_of_kitchen'].includes(order.status);

                return (
                  <div
                    key={order.id}
                    className="bg-[#282526] border border-white/5 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:border-white/10 transition-all shadow-xl relative overflow-hidden"
                  >
                    {/* Status Top Accent Bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${isReady ? 'bg-amber-400' : 'bg-cyan-400'}`} />

                    <div className="space-y-3.5">
                      {/* Header: Order ID & Status Pill */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-base font-black text-white font-['Outfit'] tracking-wide">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          <p className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5 mt-0.5 font-['Plus_Jakarta_Sans']">
                            <Store className="w-3.5 h-3.5 text-[#E0FF33]" />
                            <span>{shopName}</span>
                          </p>
                        </div>

                        <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider border flex items-center gap-1.5 shadow-sm ${isReady
                            ? 'bg-amber-400/10 text-amber-300 border-amber-400/20'
                            : 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isReady ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                          <span>{isReady ? 'Ready for Pickup' : 'In Transit'}</span>
                        </span>
                      </div>

                      {/* Customer Info Panel */}
                      <div className="bg-[#1E1B1C] border border-white/5 rounded-2xl p-4 space-y-3 text-xs text-neutral-300 font-['Plus_Jakarta_Sans'] shadow-inner">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white text-sm">{order.customerName || 'Customer'}</span>
                          {order.customerPhone && (
                            <a
                              href={`tel:${order.customerPhone}`}
                              className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                            >
                              <Phone className="w-3 h-3 text-[#E0FF33]" />
                              <span>{order.customerPhone}</span>
                            </a>
                          )}
                        </div>

                        <div className="flex items-start gap-2 text-xs text-neutral-300">
                          <MapPin className="w-3.5 h-3.5 text-[#E0FF33] shrink-0 mt-0.5" />
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
                    </div>

                    {/* Action Buttons: Unified Platform UI/UX */}
                    <div className="pt-2 flex gap-2.5 font-['Plus_Jakarta_Sans']">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setViewMode('map');
                        }}
                        className="flex-1 py-3.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-white/10 hover:border-white/20"
                      >
                        <Map className="w-4 h-4 text-[#E0FF33]" />
                        <span>Map View</span>
                      </button>

                      {isReady ? (
                        <button
                          onClick={() => handleStartDelivery(order.id, order)}
                          className="flex-1 py-3.5 px-3 rounded-2xl bg-[#E0FF33] hover:bg-[#d8fa26] active:scale-[0.98] text-[#121214] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(224,255,51,0.25)] hover:shadow-[0_6px_22px_rgba(224,255,51,0.4)] cursor-pointer"
                        >
                          <span>Start Ride</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCompleteDelivery(order.id, order)}
                          className="flex-1 py-3.5 px-3 rounded-2xl bg-[#E0FF33] hover:bg-[#d8fa26] active:scale-[0.98] text-[#121214] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(224,255,51,0.25)] hover:shadow-[0_6px_22px_rgba(224,255,51,0.4)] cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Delivered</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
