import { useState, useEffect } from 'react';
import { 
  Receipt, 
  X, 
  Clock, 
  ShoppingBag, 
  Navigation, 
  Star, 
  ChevronRight, 
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../supabase';
import { useCart } from '../context/CartContext';
import ReviewModal from './ReviewModal';

export default function OrderHistoryDrawer({ isOpen, onClose, userId, userPhone, allShops = [], onTrackOrder, onToast }) {
  const { addToCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);

  // Load customer orders from Supabase with realtime subscription & local fallback
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const fetchOrders = async () => {
      try {
        let query = supabase.from('foody_orders').select('*').order('created_at', { ascending: false }).limit(20);
        const cleanPhone = userPhone ? String(userPhone).replace(/\D/g, '') : '';
        
        if (userId && cleanPhone && cleanPhone.length >= 10) {
          query = query.or(`user_id.eq.${userId},customer_phone.eq.${cleanPhone}`);
        } else if (userId) {
          query = query.eq('user_id', userId);
        } else if (cleanPhone && cleanPhone.length >= 10) {
          query = query.eq('customer_phone', cleanPhone);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          setOrders(data);
          localStorage.setItem('foody_customer_orders_cache', JSON.stringify(data));
        } else {
          // Fallback to local cache
          const cached = localStorage.getItem('foody_customer_orders_cache');
          if (cached) setOrders(JSON.parse(cached));
        }
      } catch (e) {
        console.warn("Notice fetching order history:", e);
        const cached = localStorage.getItem('foody_customer_orders_cache');
        if (cached) setOrders(JSON.parse(cached));
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // Realtime changes on customer orders
    const channel = supabase
      .channel('customer_orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'foody_orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, userId, userPhone]);

  const handleReOrder = (order) => {
    if (!order.items || order.items.length === 0) return;
    order.items.forEach(item => {
      addToCart(item, order.shopId || order.shop_id);
    });
    if (onToast) {
      onToast(`Re-added ${order.items.length} items to basket!`, 'success');
    }
    onClose();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return { label: 'Delivered', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'out_for_delivery':
        return { label: 'On The Way', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' };
      case 'ready_for_pickup':
        return { label: 'Ready for Pickup', color: 'bg-violet-500/15 text-violet-400 border-violet-500/30' };
      case 'preparing':
        return { label: 'In Kitchen', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'cancelled':
        return { label: 'Cancelled', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
      default:
        return { label: 'Order Placed', color: 'bg-[#E0FF33]/15 text-[#E0FF33] border-[#E0FF33]/30' };
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fade-in"
      >
        <div className="w-full max-w-md bg-[#1E1B1C] text-white h-full border-l border-white/10 shadow-2xl flex flex-col justify-between animate-slide-left">
          
          {/* Top Bar Header */}
          <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 flex items-center justify-center text-[#E0FF33]">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white font-['Outfit']">My Orders</h3>
                <p className="text-xs text-neutral-400">Order history, live tracking & receipts</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Orders Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#E0FF33] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-neutral-400">Loading your orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 mx-auto flex items-center justify-center text-[#E0FF33]">
                  <ShoppingBag size={28} />
                </div>
                <h4 className="text-base font-black text-white font-['Outfit']">No Orders Yet</h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  Your past Satvik meal orders will appear here once you place an order.
                </p>
              </div>
            ) : (
              orders.map((order) => {
                const badge = getStatusBadge(order.status);
                const orderShop = allShops.find(s => s.id === (order.shopId || order.shop_id));
                const dateStr = order.created_at 
                  ? new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Recent Order';

                return (
                  <div 
                    key={order.id} 
                    className="p-4 rounded-3xl bg-[#282526] border border-white/5 hover:border-white/10 transition-all space-y-3.5 shadow-lg"
                  >
                    {/* Header Row: Shop Name & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-sm text-white font-['Outfit'] truncate">
                          {orderShop?.name || 'Foody Vrinda Kitchen'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-zinc-300">
                            #{order.id ? order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ORDER'}
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="truncate">{dateStr}</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap shrink-0 ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Items Breakdown */}
                    <div className="space-y-1.5 py-1 border-y border-white/5 text-xs text-neutral-300 font-['Plus_Jakarta_Sans']">
                      {(order.items || []).map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="truncate pr-2">{it.quantity || 1}x {it.name}</span>
                          <span className="font-bold text-white font-mono">₹{(it.price || 0) * (it.quantity || 1)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total & Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="min-w-0">
                        <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block leading-tight">Total Amount</span>
                        <span className="text-base font-black text-white font-['Outfit']">₹{order.totalAmount || order.total_amount || 0}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Live Track Button if Active */}
                        {['new', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status) && onTrackOrder && (
                          <button
                            onClick={() => {
                              onTrackOrder(order);
                              onClose();
                            }}
                            className="h-8 px-3 rounded-xl bg-[#E0FF33] text-[#1E1B1C] text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer font-['Outfit'] whitespace-nowrap shrink-0"
                          >
                            <Navigation size={12} className="fill-[#1E1B1C]" />
                            <span>Track</span>
                          </button>
                        )}

                        {/* Rate & Review Button for Delivered Orders */}
                        {(order.status === 'completed' || order.status === 'delivered') && (
                          <button
                            onClick={() => setSelectedReviewOrder(order)}
                            className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Star size={12} className="text-[#E0FF33] fill-[#E0FF33]" />
                            <span>Rate</span>
                          </button>
                        )}

                        {/* 1-Tap Re-Order Button */}
                        <button
                          onClick={() => handleReOrder(order)}
                          className="h-8 px-3 rounded-xl bg-[#322E30] hover:bg-[#3D383A] text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                          title="Re-order these items"
                        >
                          <RotateCcw size={12} />
                          <span>Re-order</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Close Button */}
          <div className="p-4 sm:p-5 border-t border-white/10">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Review Modal Trigger */}
      {selectedReviewOrder && (
        <ReviewModal
          order={selectedReviewOrder}
          shopName={allShops.find(s => s.id === (selectedReviewOrder.shopId || selectedReviewOrder.shop_id))?.name}
          onClose={() => setSelectedReviewOrder(null)}
          onReviewSubmitted={() => {
            if (onToast) onToast("Thank you for your divine review!", "success");
          }}
        />
      )}
    </>
  );
}
