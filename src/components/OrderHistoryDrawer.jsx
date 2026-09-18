import { useState, useEffect, useCallback, useRef } from 'react';
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
import { supabase, subscribeCloudOrders } from '../supabase';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import ReviewModal from './ReviewModal';

export default function OrderHistoryDrawer({ 
  isOpen, 
  onClose, 
  userId, 
  userPhone, 
  allShops = [], 
  onTrackOrder, 
  onToast, 
  onRateOrder 
}) {
  const { addToCart } = useCart();
  const { isLight } = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);
  const [closing, setClosing] = useState(false);
  const closeTimeoutRef = useRef(null);

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
    }, 180);
  }, [closing, onClose]);

  const {
    sheetRef,
    sheetStyle,
    handleProps,
    isDragging
  } = useBottomSheetDrag(handleAnimatedClose, 45);

  useEffect(() => {
    if (!isOpen) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const cleanPhone = userPhone ? String(userPhone).replace(/\D/g, '') : '';
        const sessionOrderIds = (() => {
          try {
            return JSON.parse(localStorage.getItem('foody_my_session_orders') || '[]');
          } catch {
            return [];
          }
        })();

        let query = supabase.from('foody_orders').select('*').order('created_at', { ascending: false }).limit(20);

        if (userId && cleanPhone && cleanPhone.length >= 10) {
          query = query.or(`user_id.eq.${userId},customer_phone.eq.${cleanPhone}`);
        } else if (userId) {
          query = query.eq('user_id', userId);
        } else if (cleanPhone && cleanPhone.length >= 10) {
          query = query.eq('customer_phone', cleanPhone);
        } else if (sessionOrderIds.length > 0) {
          query = query.in('id', sessionOrderIds);
        } else {
          setOrders([]);
          localStorage.removeItem('foody_customer_orders_cache');
          setLoading(false);
          return;
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          setOrders(data);
          localStorage.setItem('foody_customer_orders_cache', JSON.stringify(data));
        } else {
          setOrders([]);
          localStorage.removeItem('foody_customer_orders_cache');
        }
      } catch (e) {
        console.warn("Notice fetching order history:", e);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // Realtime changes on customer orders using multiplexer
    const unsubscribe = subscribeCloudOrders('all', (updatedOrder) => {
      if (!updatedOrder) return;
      const cleanPhone = userPhone ? String(userPhone).replace(/\D/g, '') : '';
      const orderPhone = (updatedOrder.customerPhone || updatedOrder.customer_phone || '').replace(/\D/g, '');
      const orderUserId = updatedOrder.userId || updatedOrder.user_id;

      const isForMe = (userId && orderUserId === userId) || (cleanPhone.length >= 10 && orderPhone.endsWith(cleanPhone.slice(-10)));
      if (isForMe) {
        setOrders(prev => {
          const idx = prev.findIndex(o => o.id === updatedOrder.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...updatedOrder };
            return next;
          }
          return [updatedOrder, ...prev];
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
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
    handleAnimatedClose();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return { label: 'Delivered', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
      case 'out_for_delivery':
        return { label: 'On The Way', color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' };
      case 'ready_for_pickup':
        return { label: 'Ready for Pickup', color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30' };
      case 'preparing':
        return { label: 'In Kitchen', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
      case 'cancelled':
        return { label: 'Cancelled', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' };
      default:
        return { label: 'Order Placed', color: 'bg-[#E0FF33]/20 text-amber-800 dark:text-[#E0FF33] border-[#E0FF33]/40' };
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        onClick={(e) => { if (e.target === e.currentTarget) handleAnimatedClose(); }}
        className={`fixed inset-0 z-[99999] flex items-end sm:items-stretch sm:justify-end bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity duration-200 ${
          closing ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div 
          ref={sheetRef}
          style={sheetStyle}
          className={`w-full sm:max-w-md bg-[#FAF7F2] dark:bg-[#1E1B1C] text-stone-900 dark:text-white max-h-[88vh] sm:max-h-full sm:h-full rounded-t-[36px] sm:rounded-none border-t sm:border-t-0 sm:border-l border-stone-200/80 dark:border-white/10 shadow-[0_-12px_48px_rgba(0,0,0,0.3)] sm:shadow-2xl flex flex-col justify-between overflow-hidden relative transition-all duration-200 transform ${
            closing ? 'translate-y-full sm:translate-x-full opacity-0' : 'translate-y-0 sm:translate-x-0 opacity-100'
          }`}
        >
          {/* Mobile Drag Handle Bar */}
          <div 
            {...handleProps}
            className="sm:hidden pt-3.5 pb-1.5 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none bg-[#F4EFE6] dark:bg-[#282526] border-b border-stone-200/40 dark:border-white/5"
          >
            <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-white/20 transition-colors" />
          </div>

          {/* Top Bar Header */}
          <div 
            {...handleProps}
            className="px-5 py-4 sm:p-6 border-b border-stone-200/80 dark:border-white/10 flex items-center justify-between bg-[#F4EFE6] dark:bg-[#282526] select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-[#E0FF33]/15 border border-amber-500/30 dark:border-[#E0FF33]/30 flex items-center justify-center text-amber-600 dark:text-[#E0FF33] shadow-xs shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight leading-tight">
                  My Orders
                </h3>
                <p className="text-[11px] sm:text-xs text-stone-500 dark:text-neutral-400 font-['Plus_Jakarta_Sans'] line-clamp-1">
                  Order history, live tracking & receipts
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => handleAnimatedClose()}
              className="w-9 h-9 rounded-full bg-stone-200/80 hover:bg-stone-300 dark:bg-white/5 dark:hover:bg-white/10 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
              aria-label="Close orders"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Orders Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 no-scrollbar">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-amber-500 dark:border-[#E0FF33] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-stone-500 dark:text-neutral-400 font-medium">Loading your orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 dark:bg-white/5 border border-amber-500/20 dark:border-white/5 mx-auto flex items-center justify-center text-amber-600 dark:text-[#E0FF33] shadow-xs">
                  <ShoppingBag size={28} />
                </div>
                <h4 className="text-base font-black text-stone-900 dark:text-white font-['Outfit']">No Orders Yet</h4>
                <p className="text-xs text-stone-500 dark:text-neutral-400 max-w-xs mx-auto font-['Plus_Jakarta_Sans'] leading-relaxed">
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
                    className="p-4 rounded-3xl bg-white dark:bg-[#282526] border border-stone-200/80 dark:border-white/5 hover:border-stone-300 dark:hover:border-white/10 transition-all space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-lg"
                  >
                    {/* Header Row: Shop Name & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-sm text-stone-900 dark:text-white font-['Outfit'] truncate">
                          {orderShop?.name || 'Foody Vrinda Kitchen'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-zinc-400 mt-0.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-stone-700 dark:text-zinc-300">
                            #{order.id ? order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ORDER'}
                          </span>
                          <span className="text-stone-300 dark:text-zinc-600">•</span>
                          <span className="truncate">{dateStr}</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap shrink-0 ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Items Breakdown */}
                    <div className="space-y-1.5 py-2 border-y border-stone-100 dark:border-white/5 text-xs text-stone-700 dark:text-neutral-300 font-['Plus_Jakarta_Sans']">
                      {(order.items || []).map((it, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between items-center">
                            <span className="truncate pr-2 flex items-center gap-1.5 font-medium">
                              <span className="text-amber-600 dark:text-[#E0FF33] font-black">{it.quantity || 1}x</span>
                              <span>{it.name}</span>
                              {(it.isCombo || it.comboItems) && (
                                <span className="text-[9px] font-black uppercase bg-amber-500/15 dark:bg-[#E0FF33]/20 text-amber-700 dark:text-[#E0FF33] px-1.5 py-0.2 rounded">
                                  Combo
                                </span>
                              )}
                            </span>
                            <span className="font-bold text-stone-900 dark:text-white font-mono shrink-0">₹{(it.price || 0) * (it.quantity || 1)}</span>
                          </div>
                          {it.comboItems && Array.isArray(it.comboItems) && (
                            <div className="text-[10px] text-stone-500 dark:text-zinc-400 pl-4 space-y-0.2">
                              {it.comboItems.map((ci, cidx) => (
                                <p key={cidx} className="truncate">• {ci}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Total & Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="min-w-0">
                        <span className="text-[10px] text-stone-500 dark:text-neutral-400 uppercase font-bold tracking-wider block leading-tight">Total Amount</span>
                        <span className="text-base font-black text-stone-900 dark:text-white font-['Outfit']">₹{order.totalAmount || order.total_amount || 0}</span>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Live Track Button if Active */}
                        {['new', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status) && onTrackOrder ? (
                          <button
                            type="button"
                            onClick={() => {
                              onTrackOrder(order);
                              handleAnimatedClose();
                            }}
                            className="h-8 px-3 rounded-xl bg-amber-400 dark:bg-[#E0FF33] hover:bg-amber-500 dark:hover:bg-[#d4f820] text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer font-['Outfit'] whitespace-nowrap shrink-0"
                          >
                            <Navigation size={12} className="fill-stone-950" />
                            <span>Track Live</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (onTrackOrder) onTrackOrder(order);
                              handleAnimatedClose();
                            }}
                            className="h-8 px-2.5 sm:px-3 rounded-xl bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-800 dark:text-white text-xs font-bold flex items-center gap-1.5 border border-stone-200/80 dark:border-white/10 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                            title="View full order details & receipt"
                          >
                            <Receipt size={12} className="text-amber-600 dark:text-[#E0FF33]" />
                            <span>Receipt</span>
                          </button>
                        )}

                        {/* Rate & Review Button for Delivered Orders */}
                        {(order.status === 'completed' || order.status === 'delivered') && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onRateOrder) {
                                onRateOrder(order);
                              } else {
                                setSelectedReviewOrder(order);
                              }
                            }}
                            className="h-8 px-2.5 sm:px-3 rounded-xl bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-800 dark:text-white text-xs font-bold flex items-center gap-1.5 border border-stone-200/80 dark:border-white/10 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Star size={12} className="text-amber-500 dark:text-[#E0FF33] fill-amber-500 dark:fill-[#E0FF33]" />
                            <span>Rate</span>
                          </button>
                        )}

                        {/* 1-Tap Re-Order Button */}
                        <button
                          type="button"
                          onClick={() => handleReOrder(order)}
                          className="h-8 px-2.5 sm:px-3 rounded-xl bg-stone-200/80 dark:bg-[#322E30] hover:bg-stone-300 dark:hover:bg-[#3D383A] text-stone-900 dark:text-white text-xs font-bold flex items-center gap-1.5 border border-stone-300/80 dark:border-white/10 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                          title="Re-order these items"
                        >
                          <RotateCcw size={12} />
                          <span className="hidden sm:inline">Re-order</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Close Button with Safe Area spacing */}
          <div className="p-4 sm:p-5 pb-[max(env(safe-area-inset-bottom),20px)] sm:pb-5 border-t border-stone-200/80 dark:border-white/10 bg-[#FAF7F2] dark:bg-[#1E1B1C]">
            <button
              type="button"
              onClick={() => handleAnimatedClose()}
              className="w-full py-3.5 rounded-2xl bg-stone-200/90 hover:bg-stone-300 active:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/15 text-stone-900 dark:text-white font-black text-sm transition-all active:scale-[0.98] cursor-pointer shadow-xs font-['Outfit']"
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
