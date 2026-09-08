import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { useFastNotify } from '../hooks/useFastNotify';
import { useAudioAlarm } from '../hooks/useAudioAlarm';
import { supabase, updateCloudOrderStatus, subscribeCloudOrders, createCloudNotification } from '../supabase';
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
  Star
} from 'lucide-react';

export default function TransportView() {
  const { currentUserShopId, currentUserShopIds = [], allShops } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
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

    // Coordinates setup
    const shopLat = parseFloat(activeShop?.coordinates?.lat) || 27.5706;
    const shopLng = parseFloat(activeShop?.coordinates?.lng) || 77.6593;

    const destLat = parseFloat(activeOrder.deliveryCoordinates?.lat) || (shopLat + 0.008);
    const destLng = parseFloat(activeOrder.deliveryCoordinates?.lng) || (shopLng + 0.006);

    const midLat = (shopLat + destLat) / 2;
    const midLng = (shopLng + destLng) / 2;

    const map = L.map(mapContainerRef.current, {
      center: [midLat, midLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // CARTO Voyager Tiles (Vrindavan Regional Basemap matching Vrinda Tours standard)
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

    // 1. Origin Kitchen Store Pin (Clean Iconic Token - Zero Permanent Overlay Collisions)
    const shortShopName = (activeShop?.name || 'Prem Mandir').replace(/^(Shri\s+|Prem\s+Mandir\s+)/i, '').replace(/\s+(Kitchen|Bhojnalaya|Prasad)$/i, '').trim() || 'Prem Mandir';
    const storeIcon = L.divIcon({
      className: 'custom-kitchen-pin',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 32px; height: 38px;">
          <div style="
            width: 30px;
            height: 30px;
            background: #181617;
            border: 2.5px solid #E0FF33;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(0,0,0,0.5);
            cursor: pointer;
          ">
            <span style="font-size: 13px; line-height: 1;">🍲</span>
          </div>
          <div style="width: 2px; height: 6px; background: #181617;"></div>
        </div>
      `,
      iconSize: [32, 38],
      iconAnchor: [16, 38]
    });
    const storeMarker = L.marker([shopLat, shopLng], { icon: storeIcon, zIndexOffset: 200 });
    storeMarker.bindTooltip(`🍲 ${shortShopName}`, { permanent: false, direction: 'top', offset: [0, -32] });
    storeMarker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      storeMarker.toggleTooltip();
    });
    group.addLayer(storeMarker);

    // 2. Destination Customer Home Pin (Clean Iconic Home Token - Zero Permanent Overlay Collisions)
    const homeIcon = L.divIcon({
      className: 'custom-home-pin',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 32px; height: 38px;">
          <div style="
            width: 30px;
            height: 30px;
            background: #FFFFFF;
            border: 2.5px solid #181617;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            cursor: pointer;
          ">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#181617" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div style="width: 2px; height: 6px; background: #181617;"></div>
        </div>
      `,
      iconSize: [32, 38],
      iconAnchor: [16, 38]
    });
    const homeMarker = L.marker([destLat, destLng], { icon: homeIcon, zIndexOffset: 200 });
    homeMarker.bindTooltip(`🏡 ${activeOrder.customerName || 'Drop-off'}`, { permanent: false, direction: 'top', offset: [0, -32] });
    homeMarker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      homeMarker.toggleTooltip();
    });
    group.addLayer(homeMarker);

    // 3. Animated Live Scooter Rider Pin (Modern Navigational Vehicle Puck)
    const riderIcon = L.divIcon({
      className: 'custom-rider-pin',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="
            width: 34px;
            height: 34px;
            background: #181617;
            border: 2px solid #E0FF33;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 18px rgba(0,0,0,0.6), 0 0 14px rgba(224,255,51,0.3);
            cursor: pointer;
          ">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#E0FF33" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="2.5"></circle>
              <circle cx="5.5" cy="17.5" r="2.5"></circle>
              <path d="M15 6h-5a2 2 0 0 0-2 2v2"></path>
              <path d="M6 10h12l-1.5 5.5H8.5L6 10z"></path>
              <path d="M9 18h6"></path>
            </svg>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    const riderMarker = L.marker([midLat, midLng], { icon: riderIcon, zIndexOffset: 500 });
    riderMarker.bindTooltip('🛵 Sarathi Rider', { permanent: false, direction: 'top', offset: [0, -20] });
    riderMarker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      riderMarker.toggleTooltip();
    });
    group.addLayer(riderMarker);

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

    fetch(`https://router.project-osrm.org/route/v1/driving/${shopLng},${shopLat};${destLng},${destLat}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data?.routes?.[0]?.geometry?.coordinates) {
          const latLngs = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          if (latLngs.length > 1) {
            routeCasing.setLatLngs(latLngs);
            routeLine.setLatLngs(latLngs);
          }
        }
      })
      .catch(() => {});

    group.addTo(map);
    routeGroupRef.current = group;
    mapInstanceRef.current = map;

    // Fit route bounds nicely
    map.fitBounds(group.getBounds(), {
      paddingTopLeft: [50, 50],
      paddingBottomRight: [50, 160],
      maxZoom: 16
    });

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

      if (orderData?.userId) {
        await createCloudNotification({
          userId: orderData.userId,
          message: `Your order is out for delivery with Sarathi Rider (Govind Das)!`,
          orderId
        });
      }

      setToast({
        message: `Order #${orderId.slice(-6).toUpperCase()} is Out for Delivery`,
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
      const isCash = orderData?.paymentMethod === 'cash';
      await updateCloudOrderStatus(orderId, 'completed', {
        cash_status: isCash ? 'collected' : (orderData?.cashStatus || 'none')
      });
      setOrders(prev => prev.filter(o => o.id !== orderId));

      if (orderData?.userId) {
        await createCloudNotification({
          userId: orderData.userId,
          message: `Your order has been delivered with blessings!`,
          orderId
        });
      }

      setToast({
        message: `Order #${orderId.slice(-6).toUpperCase()} Completed & Delivered!`,
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

      {/* Top Controls: Switcher between Map View and List View */}
      <div className="flex items-center justify-between gap-3 bg-[#282526] border border-white/5 p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 flex items-center justify-center text-[#E0FF33]">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white font-['Outfit']">Sarathi Delivery Fleet</h3>
            <p className="text-[10px] text-neutral-400">
              {orders.length} Active {orders.length === 1 ? 'Dispatch' : 'Dispatches'} (CARTO Map View)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#1E1B1C] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'map'
                ? 'bg-[#E0FF33] text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Carto HUD</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-[#E0FF33] text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Orders ({orders.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: INTERACTIVE CARTO MAP HUD (MATCHING REFERENCE DESIGN) */}
      {viewMode === 'map' && activeOrder && (
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
          
          {/* Mobile Phone Mock Frame Container */}
          <div className="w-full max-w-[430px] bg-[#f8fafc] rounded-[44px] shadow-[0_25px_80px_rgba(0,0,0,0.6)] border-[8px] border-[#2c2829] overflow-hidden relative flex flex-col min-h-[660px] text-slate-800 font-['Plus_Jakarta_Sans'] select-none">
            
            {/* Top CARTO Voyager Leaflet Map Canvas */}
            <div className="relative flex-1 bg-[#edf2f7] min-h-[340px] overflow-hidden">
              <div ref={mapContainerRef} className="w-full h-full min-h-[340px] z-0" />

              {/* TOP FLOATING CONTROLS (Back Arrow, Re-center & Profile Avatar) */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between z-[500] pointer-events-none">
                <button 
                  onClick={() => setViewMode('list')}
                  className="w-10 h-10 rounded-full bg-[#1E1B1C]/90 hover:bg-[#282526] text-white shadow-xl backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-95 transition-all cursor-pointer pointer-events-auto"
                  title="View all dispatch orders"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
                </button>

                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    onClick={handleRecenterMap}
                    className="w-10 h-10 rounded-full bg-[#1E1B1C]/90 hover:bg-[#282526] text-white shadow-xl backdrop-blur-md flex items-center justify-center border border-white/15 active:scale-95 transition-all cursor-pointer"
                    title="Re-center route"
                  >
                    <RotateCcw className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>
              </div>
            </div>

            {/* BOTTOM OBSIDIAN LUXURY SHEET (Cohesive Luxury Dark Standard) */}
            <div className="bg-[#1E1B1C] rounded-t-[36px] p-4.5 pt-4 -mt-8 relative z-30 shadow-[0_-25px_60px_rgba(0,0,0,0.85)] border-t border-white/10 flex flex-col gap-3.5">
              
              {/* Mobile Drag Indicator */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-1 mb-0.5" />

              {/* Customer Profile & Quick Connect Bar */}
              <div className="flex items-center justify-between px-1 text-white">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-full bg-[#282526] border-2 border-amber-400 overflow-hidden shrink-0 shadow-md aspect-square flex items-center justify-center">
                    <span className="text-xl">👤</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-base tracking-tight font-['Outfit'] text-white truncate">
                        {activeOrder.customerName || 'Customer'}
                      </h4>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 shrink-0">
                        #{activeOrder.id ? activeOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ORDER'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400 text-xs mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-white text-[11px] font-black ml-0.5">5.0</span>
                      <span className="text-neutral-600 text-[10px]">•</span>
                      <span className="text-neutral-400 text-[11px] font-medium truncate">
                        {activeOrder.items?.length || 1} {(activeOrder.items?.length || 1) === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeOrder.customerPhone && (
                    <a 
                      href={`https://wa.me/91${activeOrder.customerPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Radhe Radhe ${activeOrder.customerName || 'Ji'}! I am your Sarathi Rider delivering your Foody Vrinda order #${activeOrder.id ? activeOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : ''}.`)}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                      title="WhatsApp Customer"
                    >
                      <MessageCircle className="w-4.5 h-4.5 stroke-[2]" />
                    </a>
                  )}
                  {activeOrder.customerPhone && (
                    <a 
                      href={`tel:${activeOrder.customerPhone.replace(/\D/g, '').slice(-10)}`}
                      className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                      title="Call Customer"
                    >
                      <Phone className="w-4.5 h-4.5 stroke-[2]" />
                    </a>
                  )}
                </div>
              </div>

              {/* Telemetry & Destination Route Card */}
              <div className="bg-[#282526] rounded-[24px] p-4 border border-white/10 shadow-md space-y-3.5">
                
                {/* Delivery Time & Status Row */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-white/10 text-white flex items-center justify-center shrink-0">
                      <Clock className="w-4.5 h-4.5 text-[#E0FF33]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Estimated Drop-off</p>
                      <h5 className="font-bold text-sm text-white font-['Outfit']">
                        Delivery Target ~ {new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </h5>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-[#E0FF33] bg-[#E0FF33]/15 px-2.5 py-1 rounded-full border border-[#E0FF33]/30">
                    Live Active
                  </span>
                </div>

                {/* Drop-off Destination */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-[#E0FF33]/15 text-[#E0FF33] border border-[#E0FF33]/30 flex items-center justify-center shrink-0">
                    <MapPin className="w-4.5 h-4.5 text-[#E0FF33]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Delivery Destination</p>
                      <span className="text-[10px] font-bold text-neutral-400">ETA: ~8–10 Min</span>
                    </div>
                    <p className="text-xs font-bold text-white font-['Outfit'] mt-0.5 line-clamp-2">
                      {activeOrder.customerAddress || activeOrder.deliveryAddress || 'Raman Reti, Parikrama Marg, Vrindavan'}
                    </p>
                  </div>
                </div>

                {/* COD Cash Collection Callout Banner */}
                {activeOrder.paymentMethod === 'cash' && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-300">
                    <span className="font-bold">Cash on Delivery to Collect:</span>
                    <span className="font-black text-sm text-amber-400 font-['Outfit']">₹{activeOrder.totalAmount}</span>
                  </div>
                )}

                {/* Primary Navigation & Status CTAs */}
                <div className="pt-1 space-y-2">
                  {activeOrder.deliveryCoordinates?.lat && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.deliveryCoordinates.lat},${activeOrder.deliveryCoordinates.lng}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-2xl bg-[#151314] hover:bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                    >
                      <Compass className="w-4 h-4 text-[#E0FF33]" />
                      <span>Open Live GPS in Google Maps</span>
                    </a>
                  )}

                  {['ready_for_pickup', 'ready', 'out_of_kitchen'].includes(activeOrder.status) ? (
                    <button 
                      onClick={() => handleStartDelivery(activeOrder.id, activeOrder)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-[#E0FF33] hover:bg-[#d8fa26] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(224,255,51,0.3)] active:scale-[0.98] cursor-pointer font-['Outfit']"
                    >
                      <span>Pick Up & Start Delivery</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleCompleteDelivery(activeOrder.id, activeOrder)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.3)] active:scale-[0.98] cursor-pointer font-['Outfit']"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Delivered & Reconcile Cash</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Side Drawer for Multi-Order Switching */}
          {orders.length > 1 && (
            <div className="w-full max-w-sm bg-[#282526] border border-white/5 rounded-3xl p-5 space-y-3">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                Other Active Deliveries ({orders.length})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
                {orders.map(o => {
                  const isCur = o.id === activeOrder.id;
                  const isReadyOrder = ['ready_for_pickup', 'ready', 'out_of_kitchen'].includes(o.status);
                  return (
                    <div 
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isCur 
                          ? 'bg-[#1E1B1C] border-[#E0FF33]/40 shadow-md' 
                          : 'bg-[#1E1B1C]/50 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-white text-xs">#{o.id.slice(-6).toUpperCase()}</p>
                        <p className="text-[10px] text-neutral-400 font-medium">{o.customerName || 'Customer'}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase ${
                        isReadyOrder ? 'bg-amber-400/15 text-amber-300' : 'bg-cyan-400/15 text-cyan-300'
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
                    <div className={`absolute top-0 left-0 right-0 h-1 ${isReady ? 'bg-amber-400' : 'bg-cyan-400'}`} />

                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <span className="text-sm font-black text-white font-['Outfit']">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          <p className="text-xs font-semibold text-neutral-400 flex items-center gap-1 mt-0.5">
                            <Store className="w-3 h-3 text-neutral-500" />
                            <span>{shopName}</span>
                          </p>
                        </div>

                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${
                          isReady 
                            ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20' 
                            : 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20'
                        }`}>
                          {isReady ? 'Ready for Pickup' : 'In Transit'}
                        </span>
                      </div>

                      <div className="bg-[#1E1B1C] border border-white/5 rounded-2xl p-3.5 space-y-2 text-xs text-neutral-300 font-['Plus_Jakarta_Sans']">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{order.customerName || 'Customer'}</span>
                          {order.customerPhone && (
                            <a href={`tel:${order.customerPhone}`} className="text-[#E0FF33] font-bold text-xs hover:underline flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{order.customerPhone}</span>
                            </a>
                          )}
                        </div>

                        <div className="flex items-start gap-1.5 text-neutral-400">
                          <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-neutral-300 line-clamp-2">{order.customerAddress || order.deliveryAddress || 'No address provided'}</p>
                        </div>

                        <div className="pt-1 flex items-center justify-between border-t border-white/5">
                          <span className="text-[11px] text-neutral-400">Payment:</span>
                          {order.paymentMethod === 'cash' ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 font-extrabold text-[10px]">
                              CASH DUE: ₹{order.totalAmount}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-400/20 text-emerald-300 font-bold text-[10px]">
                              PAID ONLINE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button 
                        onClick={() => {
                          setSelectedOrder(order);
                          setViewMode('map');
                        }}
                        className="flex-1 py-3 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border border-white/10"
                      >
                        <Map className="w-4 h-4 text-[#E0FF33]" />
                        <span>Map View</span>
                      </button>

                      {isReady ? (
                        <button 
                          onClick={() => handleStartDelivery(order.id, order)}
                          className="flex-1 py-3 px-3 rounded-2xl bg-[#E0FF33] hover:bg-[#d8fa26] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                        >
                          <span>Start Ride</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleCompleteDelivery(order.id, order)}
                          className="flex-1 py-3 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                        >
                          <Check className="w-4 h-4" />
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
