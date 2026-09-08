import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useFastNotify } from '../hooks/useFastNotify';
import { useAudioAlarm } from '../hooks/useAudioAlarm';
import { updateCloudOrderStatus } from '../supabase';
import DynamicToast from '../components/ui/DynamicToast';
import { 
  Truck, 
  Navigation, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle2, 
  PackageCheck, 
  AlertCircle, 
  Volume2, 
  VolumeX, 
  Search, 
  DollarSign, 
  Flame,
  Store,
  Compass,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Star,
  Home,
  ShoppingBag,
  List,
  Map as MapIcon,
  Check,
  RotateCcw
} from 'lucide-react';

export default function TransportView() {
  const { currentUserShopId, currentUserShopIds, allShops } = useAuth();
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
  const [toast, setToast] = useState(null);

  // Leaflet map container refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeGroupRef = useRef(null);

  // Audio alarm control
  const { isPlaying, playAlarm, stopAlarm } = useAudioAlarm();

  // Fast notification listener
  useFastNotify(currentUserShopId, 'delivery', () => {
    playAlarm();
    setToast({
      message: 'New ready-for-pickup order dispatched!',
      type: 'warning'
    });
  });

  // Load delivery orders (ready_for_pickup and out_for_delivery)
  useEffect(() => {
    const targetShopIds = currentUserShopIds.length > 0 ? currentUserShopIds : [currentUserShopId].filter(Boolean);

    if (targetShopIds.length === 0) return;

    const q = query(
      collection(db, "orders"),
      where("status", "in", ["ready_for_pickup", "out_for_delivery"]),
      where("shopId", "in", targetShopIds)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      activeOrders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return timeA - timeB;
      });
      setOrders(activeOrders);

      if (activeOrders.length > 0) {
        setSelectedOrder(prev => {
          if (prev) {
            const found = activeOrders.find(o => o.id === prev.id);
            return found || activeOrders[0];
          }
          const inTransit = activeOrders.find(o => o.status === 'out_for_delivery');
          return inTransit || activeOrders[0];
        });
      } else {
        setSelectedOrder(null);
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.info("Delivery orders subscription: Authenticated staff access required.");
      } else {
        console.warn("Delivery orders snapshot warning:", error.message);
      }
    });

    return () => unsubscribe();
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

    // CARTO Voyager Tiles (Vrindavan Regional Basemap)
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
        minZoom: 3,
        subdomains: 'abcd'
      }
    ).addTo(map);

    const group = L.featureGroup();

    // 1. Origin Kitchen Store Pin
    const storeIcon = L.divIcon({
      className: 'carto-store-pin',
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background: #0f172a;
          color: white;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(0,0,0,0.35);
          font-size: 16px;
        ">🛒</div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
    const storeMarker = L.marker([shopLat, shopLng], { icon: storeIcon });
    storeMarker.bindTooltip(activeShop?.name || 'Kitchen Store', { permanent: false, direction: 'top' });
    group.addLayer(storeMarker);

    // 2. Destination Customer Home Pin
    const homeIcon = L.divIcon({
      className: 'carto-home-pin',
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background: #ffffff;
          border: 2px solid #e2e8f0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
          font-size: 17px;
        ">🏠</div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
    const homeMarker = L.marker([destLat, destLng], { icon: homeIcon });
    homeMarker.bindTooltip(activeOrder.customerName || 'Delivery Home', { permanent: false, direction: 'top' });
    group.addLayer(homeMarker);

    // 3. Animated Live Scooter Rider Pin (Midpoint)
    const riderIcon = L.divIcon({
      className: 'carto-rider-pin',
      html: `
        <div style="
          width: 44px;
          height: 44px;
          background: #ffffff;
          border: 2px solid #E0FF33;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
          font-size: 20px;
          animation: bounce 1.5s infinite;
        ">🛵</div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
    const riderMarker = L.marker([midLat, midLng], { icon: riderIcon });
    riderMarker.bindTooltip('Sarathi Rider', { permanent: false, direction: 'top' });
    group.addLayer(riderMarker);

    // 4. Dashed Navigation Path
    const routeLine = L.polyline([
      [shopLat, shopLng],
      [midLat + 0.001, midLng - 0.001],
      [midLat, midLng],
      [destLat, destLng]
    ], {
      color: '#0f172a',
      weight: 3.5,
      dashArray: '6, 8',
      opacity: 0.9,
      lineCap: 'round'
    });
    group.addLayer(routeLine);

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
    try {
      await updateDoc(doc(db, "orders", orderId), { 
        status: 'out_for_delivery',
        dispatchedAt: serverTimestamp()
      });
      await updateCloudOrderStatus(orderId, 'out_for_delivery');

      await addDoc(collection(db, "notifications"), {
        userId: orderData.userId,
        message: `Your order is out for delivery with Sarathi Rider!`,
        orderId,
        read: false,
        createdAt: serverTimestamp()
      });

      setToast({
        message: `Order #${orderId.slice(-6).toUpperCase()} is Out for Delivery`,
        type: 'success'
      });
    } catch (e) {
      await updateCloudOrderStatus(orderId, 'out_for_delivery');
      setToast({
        message: `Order #${orderId.slice(-6).toUpperCase()} is Out for Delivery`,
        type: 'success'
      });
    }
  };

  const handleCompleteDelivery = async (orderId, orderData) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { 
        status: 'completed',
        completedAt: serverTimestamp(),
        cashStatus: orderData.paymentMethod === 'cash' ? 'collected' : (orderData.cashStatus || 'none')
      });
      await updateCloudOrderStatus(orderId, 'completed', {
        cash_status: orderData.paymentMethod === 'cash' ? 'collected' : (orderData.cashStatus || 'none')
      });

      await addDoc(collection(db, "notifications"), {
        userId: orderData.userId,
        message: "Your prasad has been delivered safely! Radhe Radhe.",
        orderId,
        read: false,
        createdAt: serverTimestamp()
      });

      setToast({
        message: `Order #${orderId.slice(-6).toUpperCase()} Delivered Successfully!`,
        type: 'success'
      });
    } catch (e) {
      await updateCloudOrderStatus(orderId, 'completed', {
        cash_status: orderData.paymentMethod === 'cash' ? 'collected' : (orderData.cashStatus || 'none')
      });
      setToast({
        message: `Order #${orderId.slice(-6).toUpperCase()} Delivered Successfully!`,
        type: 'success'
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
      <DynamicToast toast={toast} onClose={() => setToast(null)} />

      {/* Alarm Banner */}
      {isPlaying && (
        <button 
          onClick={stopAlarm}
          className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:opacity-95 text-white font-black py-3.5 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-xs sm:text-sm tracking-wider uppercase transition-all"
        >
          <Volume2 className="w-5 h-5 animate-bounce" />
          <span>ORDER READY FOR DISPATCH - CLICK TO SILENCE ALARM</span>
        </button>
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
            <MapIcon className="w-3.5 h-3.5" />
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
                  className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-md flex items-center justify-center text-slate-800 active:scale-95 transition-all pointer-events-auto"
                  title="View all dispatch orders"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    onClick={handleRecenterMap}
                    className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-md flex items-center justify-center text-slate-800 active:scale-95 transition-all"
                    title="Re-center route"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-lg bg-slate-900 flex items-center justify-center">
                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
                      alt="Rider Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM CURVED SHEET CARD (Black Upper Header + White Inset Card) */}
            <div className="bg-[#181617] rounded-t-[38px] p-4 pt-5 -mt-8 relative z-30 shadow-[0_-15px_40px_rgba(0,0,0,0.35)] flex flex-col gap-4">
              
              {/* Dark Upper Header Section */}
              <div className="flex items-center justify-between px-2 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 overflow-hidden shrink-0 shadow-md">
                    <img 
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" 
                      alt="Rider profile" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-black text-base tracking-tight font-['Outfit']">
                      {activeOrder.customerName || 'Madhu Devotee'}
                    </h4>
                    <div className="flex items-center gap-0.5 text-amber-400 text-xs mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                      <span className="text-[10px] text-neutral-400 font-bold ml-1">4.9</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setToast({ message: 'Opening chat message...', type: 'info' })}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  {activeOrder.customerPhone && (
                    <a 
                      href={`tel:${activeOrder.customerPhone}`}
                      className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Inner White High-Contrast Card */}
              <div className="bg-white rounded-[28px] p-5 shadow-lg text-slate-900 space-y-4">
                
                {/* Delivery Time & Distance Row with Vertical Timeline */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-9 h-9 rounded-full bg-[#1e293b] text-white flex items-center justify-center shadow-md">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="w-0.5 h-14 border-l-2 border-dashed border-slate-300 my-1" />
                    <div className="w-9 h-9 rounded-full bg-[#0f172a] text-white flex items-center justify-center shadow-md">
                      <MapPin className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    {/* Delivery Time Info */}
                    <div>
                      <div className="flex items-center justify-between">
                        <h5 className="font-extrabold text-sm text-slate-900">
                          Delivery time {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </h5>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        Distance from you: <span className="font-bold text-rose-600">305m</span>
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-bold mt-2">
                        <span className="text-emerald-600 font-black">● Making</span>
                        <span>● Order placed</span>
                      </div>
                    </div>

                    {/* Destination Address Info */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>Home Destination</span>
                        </h5>
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                          ⏰ ETA: 8-10 Min
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium line-clamp-2 mt-0.5">
                        {activeOrder.customerAddress || activeOrder.deliveryAddress || '2760 Raman Reti, Parikrama Marg, Vrindavan'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* COD Cash Amount Callout */}
                {activeOrder.paymentMethod === 'cash' && (
                  <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs font-bold text-amber-900">
                    <span>Cash on Delivery to Collect:</span>
                    <span className="font-black text-sm text-amber-700">₹{activeOrder.totalAmount}</span>
                  </div>
                )}

                {/* Primary Partner Actions */}
                <div className="pt-1 space-y-2">
                  {activeOrder.deliveryCoordinates?.lat && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.deliveryCoordinates.lat},${activeOrder.deliveryCoordinates.lng}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                    >
                      <Compass className="w-4 h-4 text-[#E0FF33]" />
                      <span>Open Live GPS in Google Maps</span>
                    </a>
                  )}

                  {activeOrder.status === 'ready_for_pickup' ? (
                    <button 
                      onClick={() => handleStartDelivery(activeOrder.id, activeOrder)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-[#E0FF33] hover:bg-[#d8fa26] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                    >
                      <span>Pick Up & Start Delivery</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleCompleteDelivery(activeOrder.id, activeOrder)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
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
                        <p className="text-[10px] text-neutral-400 font-medium">{o.customerName || 'Devotee'}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase ${
                        o.status === 'ready_for_pickup' ? 'bg-amber-400/15 text-amber-300' : 'bg-cyan-400/15 text-cyan-300'
                      }`}>
                        {o.status === 'ready_for_pickup' ? 'Ready' : 'In Transit'}
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
                const isReady = order.status === 'ready_for_pickup';

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
                          <span className="font-bold text-white">{order.customerName || 'Anonymous Devotee'}</span>
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
                        <MapIcon className="w-4 h-4 text-[#E0FF33]" />
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
