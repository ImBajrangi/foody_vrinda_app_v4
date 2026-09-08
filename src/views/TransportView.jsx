import { useState, useEffect } from 'react';
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
  ArrowRight
} from 'lucide-react';

export default function TransportView() {
  const { currentUserShopId, currentUserShopIds, allShops } = useAuth();
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

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
    // Deliverers may have multiple shop IDs
    const targetShopIds = currentUserShopIds.length > 0 ? currentUserShopIds : [currentUserShopId].filter(Boolean);

    if (targetShopIds.length === 0) return;

    const q = query(
      collection(db, "orders"),
      where("status", "in", ["ready_for_pickup", "out_for_delivery"]),
      where("shopId", "in", targetShopIds)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort oldest orders first
      activeOrders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return timeA - timeB;
      });
      setOrders(activeOrders);
    });

    return () => unsubscribe();
  }, [currentUserShopId, currentUserShopIds]);

  const handleStartDelivery = async (orderId, orderData) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { 
        status: 'out_for_delivery',
        dispatchedAt: serverTimestamp()
      });

      // Notify customer
      await addDoc(collection(db, "notifications"), {
        userId: orderData.userId,
        message: `Your order is out for delivery! Contact rider at: ${orderData.createdBy || "Rider"}.`,
        orderId,
        read: false,
        createdAt: serverTimestamp()
      });

      setToast({
        message: `Order #${orderId.slice(-6).toUpperCase()} marked Out for Delivery`,
        type: 'success'
      });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Failed to update order status', type: 'error' });
    }
  };

  const handleCompleteDelivery = async (orderId, orderData) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { 
        status: 'completed',
        completedAt: serverTimestamp()
      });

      // Notify customer
      await addDoc(collection(db, "notifications"), {
        userId: orderData.userId,
        message: "Your order has been delivered! Share your feedback.",
        orderId,
        read: false,
        createdAt: serverTimestamp()
      });

      setToast({
        message: `Order #${orderId.slice(-6).toUpperCase()} Delivered Successfully!`,
        type: 'success'
      });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Failed to mark order completed', type: 'error' });
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

  const readyOrdersCount = orders.filter(o => o.status === 'ready_for_pickup').length;
  const inTransitCount = orders.filter(o => o.status === 'out_for_delivery').length;

  return (
    <div className="space-y-6 pb-20">
      <DynamicToast toast={toast} onClose={() => setToast(null)} />

      {/* Top Hero Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#282526] border border-white/5 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-[#E0FF33]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#E0FF33]">
            <Truck className="w-3.5 h-3.5" />
            <span>Rider Dispatch Board</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-['Outfit']">
            Delivery Fleet Control
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-['Plus_Jakarta_Sans']">
            Track picked orders, navigate GPS routes, and log cash collection.
          </p>
        </div>

        {/* Live Status Counters */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="px-4 py-2.5 rounded-2xl bg-[#1E1B1C] border border-white/5 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <div>
              <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Ready</p>
              <p className="text-base font-black text-white">{readyOrdersCount}</p>
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-[#1E1B1C] border border-white/5 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">In Transit</p>
              <p className="text-base font-black text-white">{inTransitCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alarm Banner */}
      {isPlaying && (
        <button 
          onClick={stopAlarm}
          className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:opacity-95 text-white font-extrabold py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-sm sm:text-base tracking-wide uppercase transition-all"
        >
          <Volume2 className="w-6 h-6 animate-bounce" />
          <span>ORDER READY FOR DISPATCH - CLICK TO SILENCE</span>
        </button>
      )}

      {/* Filter / Search Bar */}
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

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-16 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-neutral-400">
            <PackageCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white font-['Outfit']">All deliveries caught up!</h3>
          <p className="text-xs text-neutral-400 font-['Plus_Jakarta_Sans'] max-w-sm mx-auto">
            No pending deliveries right now. Fresh pickups will ring the live ringer as soon as kitchens wrap packaging.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map(order => {
            const shopName = allShops.find(s => s.id === order.shopId)?.name || 'Kitchen';
            const isReady = order.status === 'ready_for_pickup';
            
            return (
              <div 
                key={order.id} 
                className="bg-[#282526] border border-white/5 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:border-white/10 transition-all shadow-xl relative overflow-hidden group"
              >
                {/* Accent top stripe */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${isReady ? 'bg-amber-400' : 'bg-cyan-400'}`} />

                <div>
                  {/* Order Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white font-['Outfit'] tracking-tight">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        {order.isTestOrder && (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            TEST
                          </span>
                        )}
                      </div>
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

                  {/* Customer Card */}
                  <div className="bg-[#1E1B1C] border border-white/5 rounded-2xl p-3.5 space-y-2 text-xs text-neutral-300 font-['Plus_Jakarta_Sans']">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{order.customerName || 'Anonymous Customer'}</span>
                      {order.customerPhone && (
                        <a 
                          href={`tel:${order.customerPhone}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E0FF33] hover:underline"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{order.customerPhone}</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-start gap-1.5 text-neutral-400">
                      <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-neutral-300 line-clamp-2">{order.customerAddress || order.deliveryAddress || 'No address provided'}</p>
                    </div>

                    {order.cookingNotes && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-[11px] text-amber-200">
                        <span className="font-bold uppercase tracking-wider text-amber-400 mr-1">Note:</span>
                        {order.cookingNotes}
                      </div>
                    )}

                    {/* Payment Badge */}
                    <div className="pt-1 flex items-center justify-between border-t border-white/5">
                      <span className="text-[11px] text-neutral-400">Payment:</span>
                      {order.paymentMethod === 'cash' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 font-extrabold text-[10px] border border-amber-400/30 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>CASH DUE: ₹{order.totalAmount}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-400/20 text-emerald-300 font-bold text-[10px] border border-emerald-400/30">
                          PAID ONLINE (₹{order.totalAmount})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* GPS Navigation Button */}
                  {order.deliveryCoordinates?.lat && (
                    <div className="mt-3">
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryCoordinates.lat},${order.deliveryCoordinates.lng}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold transition-all group-hover:border-[#E0FF33]/30"
                      >
                        <Compass className="w-4 h-4 text-[#E0FF33]" />
                        <span>Navigate in Google Maps</span>
                      </a>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      <span>Package Items</span>
                      <span>Qty</span>
                    </div>
                    <div className="divide-y divide-white/5 bg-[#1E1B1C]/50 rounded-2xl p-2.5 max-h-32 overflow-y-auto">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="py-1 flex items-center justify-between text-xs text-neutral-200">
                          <span className="truncate pr-2 font-medium">{item.name}</span>
                          <span className="font-bold text-[#E0FF33] font-['Outfit']">×{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status Toggle Action */}
                <div className="pt-2">
                  {isReady ? (
                    <button 
                      onClick={() => handleStartDelivery(order.id, order)}
                      className="w-full py-3 px-4 rounded-2xl bg-[#E0FF33] hover:bg-[#d2f323] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                    >
                      <span>Pick Up & Start Delivery</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleCompleteDelivery(order.id, order)}
                      className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Delivered to Client</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
