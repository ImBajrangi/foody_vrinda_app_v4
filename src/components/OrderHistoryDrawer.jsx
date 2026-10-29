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
  AlertCircle,
  Copy,
  Check,
  Store,
  MapPin,
  Phone,
  Banknote,
  PackageCheck
} from 'lucide-react';
import { supabase, subscribeCloudOrders, getPurgedOrderIds, getCachedShops } from '../supabase';
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
  const [knownShops, setKnownShops] = useState({});
  const [copiedOrderId, setCopiedOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);
  const [closing, setClosing] = useState(false);
  const closeTimeoutRef = useRef(null);

  const handleCopyOrderId = (e, orderId) => {
    e.stopPropagation();
    if (!orderId) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(orderId);
        setCopiedOrderId(orderId);
        if (onToast) onToast(`Order ID copied: ${orderId}`, 'success');
        setTimeout(() => setCopiedOrderId(null), 2000);
      }
    } catch (_) { }
  };

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
    if (isOpen && sheetRef.current) {
      sheetRef.current.style.transform = '';
      sheetRef.current.style.opacity = '1';
      sheetRef.current.style.transition = '';
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const isAuthenticated = Boolean(userId && !String(userId).startsWith('guest-'));
        const cleanPhone = userPhone ? String(userPhone).replace(/\D/g, '') : '';
        const sessionOrderIds = (() => {
          try {
            return JSON.parse(localStorage.getItem('foody_my_session_orders') || '[]');
          } catch {
            return [];
          }
        })();

        const CUSTOMER_ORDER_FIELDS = 'id, shop_id, user_id, customer_name, customer_phone, customer_address, delivery_address, items, subtotal, delivery_charge, gst_amount, total_amount, status, payment_method, cash_status, payment_id, cooking_notes, fulfillment_type, pickup_otp, delivery_otp, created_at';
        const fetchedOrdersMap = new Map();

        if (isAuthenticated) {
          let q = supabase.from('foody_orders').select(CUSTOMER_ORDER_FIELDS).order('created_at', { ascending: false }).limit(20);
          if (cleanPhone && cleanPhone.length >= 10) {
            q = q.or(`user_id.eq.${userId},customer_phone.eq.${cleanPhone}`);
          } else {
            q = q.eq('user_id', userId);
          }
          const { data: authData } = await q;
          if (Array.isArray(authData)) {
            authData.forEach(o => fetchedOrdersMap.set(o.id, o));
          }
        } else if (cleanPhone && cleanPhone.length >= 10) {
          const { data: phoneData } = await supabase
            .from('foody_orders')
            .select(CUSTOMER_ORDER_FIELDS)
            .eq('customer_phone', cleanPhone)
            .order('created_at', { ascending: false })
            .limit(20);
          if (Array.isArray(phoneData)) {
            phoneData.forEach(o => fetchedOrdersMap.set(o.id, o));
          }
        }

        // Merge any explicit device session orders
        if (sessionOrderIds.length > 0) {
          const missingIds = sessionOrderIds.filter(id => !fetchedOrdersMap.has(id));
          if (missingIds.length > 0) {
            const { data: sessionData } = await supabase
              .from('foody_orders')
              .select(CUSTOMER_ORDER_FIELDS)
              .in('id', missingIds.slice(0, 15));
            if (Array.isArray(sessionData)) {
              sessionData.forEach(o => fetchedOrdersMap.set(o.id, o));
            }
          }
        }

        const rawList = Array.from(fetchedOrdersMap.values());
        const purged = getPurgedOrderIds();
        const filtered = rawList.filter(o => !purged.includes(o.id)).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        if (filtered.length > 0) {
          setOrders(filtered);
          localStorage.setItem('foody_customer_orders_cache', JSON.stringify(filtered));

          // Resolve any shop IDs missing from props or synchronous cache
          const cachedShops = getCachedShops() || [];
          const missingShopIds = Array.from(new Set(filtered.map(o => o.shop_id || o.shopId).filter(Boolean)))
            .filter(sId => !allShops.some(s => s.id === sId) && !cachedShops.some(s => s.id === sId) && !knownShops[sId]);

          if (missingShopIds.length > 0) {
            try {
              const { data: shopRows } = await supabase
                .from('foody_shops')
                .select('id, name, address, phone, shop_type')
                .in('id', missingShopIds);

              if (Array.isArray(shopRows) && shopRows.length > 0) {
                setKnownShops(prev => {
                  const next = { ...prev };
                  shopRows.forEach(sr => { next[sr.id] = sr; });
                  return next;
                });
              }
            } catch (shopErr) {
              console.warn('Notice fetching shop details for orders:', shopErr);
            }
          }
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
      const purged = getPurgedOrderIds();
      if (purged.includes(updatedOrder.id)) return;
      const isAuthenticated = Boolean(userId && !String(userId).startsWith('guest-'));
      const cleanPhone = userPhone ? String(userPhone).replace(/\D/g, '') : '';
      const orderPhone = (updatedOrder.customerPhone || updatedOrder.customer_phone || '').replace(/\D/g, '');
      const orderUserId = updatedOrder.userId || updatedOrder.user_id;
      const sessionOrderIds = (() => {
        try {
          return JSON.parse(localStorage.getItem('foody_my_session_orders') || '[]');
        } catch {
          return [];
        }
      })();

      const isForMe = isAuthenticated
        ? (orderUserId === userId)
        : (cleanPhone.length >= 10 && orderPhone.endsWith(cleanPhone.slice(-10))) || sessionOrderIds.includes(updatedOrder.id);

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

    const handleOrdersChanged = () => {
      fetchOrders();
    };
    window.addEventListener('foody_orders_changed', handleOrdersChanged);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('foody_orders_changed', handleOrdersChanged);
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
        return { 
          label: 'Delivered', 
          color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          dotColor: 'bg-emerald-500',
          isLive: false 
        };
      case 'out_for_delivery':
        return { 
          label: 'On The Way', 
          color: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
          dotColor: 'bg-cyan-500',
          isLive: true 
        };
      case 'ready_for_pickup':
        return { 
          label: 'Ready for Pickup', 
          color: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
          dotColor: 'bg-violet-500',
          isLive: true 
        };
      case 'preparing':
        return { 
          label: 'In Kitchen', 
          color: 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30',
          dotColor: 'bg-amber-500',
          isLive: true 
        };
      case 'cancelled':
        return { 
          label: 'Cancelled', 
          color: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
          dotColor: 'bg-rose-500',
          isLive: false 
        };
      default:
        return { 
          label: 'Order Placed', 
          color: 'bg-amber-500/15 text-amber-800 dark:text-[#FD9139] border-amber-500/30',
          dotColor: 'bg-[#FD9139]',
          isLive: true 
        };
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        onClick={(e) => { if (e.target === e.currentTarget) handleAnimatedClose(); }}
        className={`fixed inset-0 z-[99999] flex items-end sm:items-stretch sm:justify-end bg-black/60 dark:bg-black/80 transition-opacity duration-200 ${
          closing ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div 
          ref={sheetRef}
          style={sheetStyle}
          className={`w-full max-w-full sm:max-w-md bg-[#FAF7F2] dark:bg-[#1E1B1C] text-stone-900 dark:text-white max-h-[88vh] sm:max-h-full sm:h-full rounded-t-[32px] sm:rounded-none border-t sm:border-t-0 sm:border-l border-stone-200/80 dark:border-white/10 shadow-[0_-12px_48px_rgba(0,0,0,0.3)] sm:shadow-2xl flex flex-col justify-between overflow-hidden relative transition-all duration-200 transform ${
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
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-[#FD9139]/15 border border-amber-500/30 dark:border-[#FD9139]/30 flex items-center justify-center text-amber-600 dark:text-[#FD9139] shadow-xs shrink-0">
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
            <div className="flex items-center gap-2">
              {orders.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('foody_my_session_orders');
                    localStorage.removeItem('foody_customer_orders_cache');
                    localStorage.removeItem('foody_active_tracking_id');
                    setOrders([]);
                    if (onToast) onToast('Order history cleared from this device', 'info');
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold text-stone-500 hover:text-rose-500 dark:text-neutral-400 dark:hover:text-rose-400 bg-stone-200/60 dark:bg-white/5 transition-all cursor-pointer"
                  title="Clear order cache on this device"
                >
                  Clear
                </button>
              )}
              <button 
                type="button"
                onClick={() => handleAnimatedClose()}
                className="w-9 h-9 rounded-full bg-stone-200/80 hover:bg-stone-300 dark:bg-white/5 dark:hover:bg-white/10 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                aria-label="Close orders"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Orders Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 no-scrollbar">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-amber-500 dark:border-[#FD9139] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-stone-500 dark:text-neutral-400 font-medium">Loading your orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 dark:bg-white/5 border border-amber-500/20 dark:border-white/5 mx-auto flex items-center justify-center text-amber-600 dark:text-[#FD9139] shadow-xs">
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
                const orderShopId = order.shopId || order.shop_id;
                const cachedShops = getCachedShops() || [];
                const orderShop = allShops.find(s => s.id === orderShopId) ||
                                  cachedShops.find(s => s.id === orderShopId) ||
                                  knownShops[orderShopId] ||
                                  null;

                const shopName = order.shopName || order.shop_name || orderShop?.name || 'Foody Vrinda Sacred Kitchen';
                const shopAddress = order.shopAddress || order.shop_address || orderShop?.address || 'Chatikara Road, Raman Reti, Vrindavan';
                const shopPhone = order.shopPhone || order.shop_phone || orderShop?.phone || null;
                const isPickup = order.fulfillment_type === 'pickup' || order.fulfillmentType === 'pickup';

                const dateStr = order.created_at 
                  ? new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Recent Order';

                const orderItems = Array.isArray(order.items)
                  ? order.items
                  : (typeof order.items === 'string'
                      ? (() => { try { return JSON.parse(order.items); } catch { return []; } })()
                      : []);

                const calculatedSubtotal = orderItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
                const subtotal = Number(order.subtotal) > 0 ? Number(order.subtotal) : calculatedSubtotal;
                const deliveryFee = isPickup ? 0 : (Number(order.delivery_charge ?? order.deliveryCharge) || 0);
                const gstAmount = Number(order.gst_amount ?? order.gstAmount) || 0;
                const totalAmount = Number(order.total_amount ?? order.totalAmount) || (subtotal + deliveryFee + gstAmount);
                const paymentMethod = String(order.payment_method || order.paymentMethod || 'cash').toLowerCase();
                const isCash = paymentMethod === 'cash';

                return (
                  <div 
                    key={order.id} 
                    id={`order-card-${order.id}`}
                    className="p-4 sm:p-5 rounded-[26px] bg-white dark:bg-[#1E1B1C] border border-stone-200/90 dark:border-white/10 space-y-3.5 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                  >
                    {/* 1. TOP ROW: SHOP IDENTITY & STATUS BADGE */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-[#FD9139]/15 border border-amber-500/25 dark:border-[#FD9139]/30 flex items-center justify-center text-amber-600 dark:text-[#FD9139] shrink-0 shadow-xs">
                          <Store size={18} className="stroke-[2.2]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-black text-sm sm:text-base text-stone-900 dark:text-white font-['Outfit'] truncate leading-snug">
                            {shopName}
                          </h4>
                          <p className="text-[11px] text-stone-500 dark:text-zinc-400 flex items-center gap-1 truncate mt-0.5 font-medium">
                            <MapPin size={11} className="shrink-0 text-amber-600 dark:text-[#FD9139]" />
                            <span className="truncate">{shopAddress}</span>
                          </p>
                        </div>
                      </div>

                      {/* Status Badge with Live Pulse Dot */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider border whitespace-nowrap shrink-0 shadow-xs font-['Outfit'] ${badge.color}`}>
                        {badge.isLive && (
                          <span className="relative flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${badge.dotColor}`} />
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${badge.dotColor}`} />
                          </span>
                        )}
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {/* 2. ORDER META BAR: ORDER ID (COMPACT + COPY), TIME, FULFILLMENT & PAYMENT */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-white/5 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {/* 1-Tap Copyable Order ID Pill */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyOrderId(e, order.id)}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-stone-200/90 dark:border-white/10 text-stone-700 dark:text-zinc-300 transition-all cursor-pointer active:scale-95 shrink-0"
                          title="Tap to copy Order ID"
                          aria-label={`Copy Order ID ${order.id}`}
                        >
                          <span className="text-[9.5px] uppercase font-bold text-stone-400 dark:text-zinc-500 font-['Outfit']">ID</span>
                          <span className="font-mono font-black text-xs text-amber-700 dark:text-[#FD9139] tracking-tight">
                            #{order.id.length > 12 ? `${order.id.slice(0, 6)}…${order.id.slice(-5)}` : order.id}
                          </span>
                          {copiedOrderId === order.id ? (
                            <Check size={11} className="text-emerald-500 stroke-[3]" />
                          ) : (
                            <Copy size={11} className="text-stone-400 stroke-[2.2]" />
                          )}
                        </button>

                        <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-zinc-400 shrink-0 font-medium">
                          <Clock size={11} className="text-stone-400 shrink-0" />
                          <span>{dateStr}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border shrink-0 ${
                          isCash 
                            ? 'bg-amber-500/15 text-amber-800 dark:text-[#FD9139] border-amber-500/20' 
                            : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isCash ? 'COD' : 'Paid Online'}
                        </span>

                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-white/[0.04] text-stone-600 dark:text-zinc-400 border border-stone-200/80 dark:border-white/5 shrink-0">
                          {isPickup ? '🛍️ Pickup' : '🛵 Delivery'}
                        </span>

                        {shopPhone && (
                          <a
                            href={`tel:${shopPhone}`}
                            className="h-6 px-2 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-white/[0.06] dark:hover:bg-white/10 text-stone-700 dark:text-zinc-300 text-[10px] font-bold inline-flex items-center gap-1 shrink-0 transition-colors border border-stone-200/60 dark:border-white/5"
                            title="Call Kitchen"
                          >
                            <Phone size={10} />
                            <span>Call</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Delivery Target Address line if delivery */}
                    {!isPickup && (order.delivery_address || order.customer_address) && (
                      <div className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-white/[0.02] border border-stone-200/60 dark:border-white/5 text-[11px] text-stone-600 dark:text-zinc-400 flex items-center gap-1.5 truncate">
                        <Navigation size={11} className="text-amber-600 dark:text-[#FD9139] shrink-0" />
                        <span className="truncate">
                          Deliver to: <strong className="text-stone-800 dark:text-zinc-300 font-semibold">{order.delivery_address || order.customer_address}</strong>
                        </span>
                      </div>
                    )}

                    {/* 3. ORDER ITEMS BREAKDOWN WITH QUANTITY & PRICING */}
                    <div className="bg-stone-50/70 dark:bg-white/[0.02] rounded-2xl p-3 border border-stone-200/60 dark:border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-black text-stone-400 dark:text-zinc-500 uppercase tracking-wider font-['Outfit'] pb-1 border-b border-stone-200/50 dark:border-white/5">
                        <span>Items in this Order ({orderItems.length})</span>
                        <span>Amount</span>
                      </div>

                      <div className="space-y-1.5 divide-y divide-stone-200/40 dark:divide-white/5">
                        {orderItems.map((it, idx) => {
                          const qty = Number(it.quantity) || 1;
                          const unitPrice = Number(it.price) || 0;
                          const itemTotal = unitPrice * qty;

                          return (
                            <div key={idx} className="pt-1.5 first:pt-0 space-y-0.5">
                              <div className="flex justify-between items-center gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 dark:bg-[#FD9139]/20 text-amber-700 dark:text-[#FD9139] font-black font-mono text-[11px] shrink-0">
                                    {qty}x
                                  </span>
                                  <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white truncate">
                                    {it.name || 'Prasad Item'}
                                  </span>
                                  {unitPrice > 0 && (
                                    <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-mono shrink-0">
                                      (@ ₹{unitPrice})
                                    </span>
                                  )}
                                  {(it.isCombo || it.comboItems) && (
                                    <span className="text-[9px] font-black uppercase bg-amber-500/15 dark:bg-[#FD9139]/20 text-amber-700 dark:text-[#FD9139] px-1.5 py-0.2 rounded-md shrink-0">
                                      Combo
                                    </span>
                                  )}
                                </div>
                                <span className="font-black text-stone-900 dark:text-white font-mono text-xs sm:text-sm shrink-0">
                                  ₹{itemTotal}
                                </span>
                              </div>
                              {it.comboItems && Array.isArray(it.comboItems) && (
                                <div className="text-[10px] text-stone-500 dark:text-zinc-400 pl-6 space-y-0.5">
                                  {it.comboItems.map((ci, cidx) => (
                                    <p key={cidx} className="truncate">• {ci}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. TOTAL AMOUNT & FINANCIAL BREAKDOWN */}
                    <div className="pt-2 border-t border-stone-200/80 dark:border-white/10 space-y-1.5 text-[11px] text-stone-600 dark:text-zinc-400">
                      <div className="flex justify-between items-center">
                        <span>Items Subtotal</span>
                        <span className="font-mono text-stone-900 dark:text-white font-semibold">₹{subtotal}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Delivery & Packaging</span>
                        <span className={`font-mono ${deliveryFee === 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-900 dark:text-white'}`}>
                          {deliveryFee > 0 ? `₹${deliveryFee}` : 'FREE'}
                        </span>
                      </div>
                      {gstAmount > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Govt Taxes & GST</span>
                          <span className="font-mono text-stone-900 dark:text-white font-semibold">₹{gstAmount}</span>
                        </div>
                      )}

                      <div className="pt-2.5 border-t border-stone-200/60 dark:border-white/5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[10px] text-stone-400 dark:text-zinc-500 uppercase font-black tracking-wider block leading-tight font-['Outfit']">
                            Total Amount
                          </span>
                          <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-[#FD9139] font-['Outfit']">
                            ₹{totalAmount}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          {/* Live Track Button if Active */}
                          {['new', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status) && onTrackOrder ? (
                            <button
                              type="button"
                              onClick={() => {
                                onTrackOrder(order);
                                handleAnimatedClose();
                              }}
                              className="h-9 px-3.5 rounded-full bg-[#FD9139] hover:bg-[#FCA65E] text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-[#FD9139]/20 active:scale-95 transition-all cursor-pointer font-['Outfit'] whitespace-nowrap shrink-0"
                            >
                              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                <Navigation size={10} className="fill-current text-white" />
                              </span>
                              <span>Track Live</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (onTrackOrder) onTrackOrder(order);
                                handleAnimatedClose();
                              }}
                              className="h-9 px-3 rounded-xl bg-stone-100 dark:bg-white/[0.05] hover:bg-stone-200 dark:hover:bg-white/[0.1] text-stone-800 dark:text-white text-xs font-bold flex items-center gap-1.5 border border-stone-200/80 dark:border-white/10 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                              title="View full order details & receipt"
                            >
                              <Receipt size={12} className="text-amber-600 dark:text-[#FD9139]" />
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
                              className="h-9 px-3 rounded-xl bg-stone-100 dark:bg-white/[0.05] hover:bg-stone-200 dark:hover:bg-white/[0.1] text-stone-800 dark:text-white text-xs font-bold flex items-center gap-1.5 border border-stone-200/80 dark:border-white/10 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <Star size={12} className="text-amber-500 dark:text-[#FD9139] fill-amber-500 dark:fill-[#FD9139]" />
                              <span>Rate</span>
                            </button>
                          )}

                          {/* 1-Tap Re-Order Button */}
                          <button
                            type="button"
                            onClick={() => handleReOrder(order)}
                            className="h-9 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-amber-800 dark:text-white text-xs font-black flex items-center gap-1.5 border border-amber-500/25 dark:border-white/10 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 font-['Outfit']"
                            title="Re-order these items"
                          >
                            <RotateCcw size={12} className="text-amber-600 dark:text-[#FD9139]" />
                            <span className="hidden sm:inline">Re-order</span>
                          </button>
                        </div>
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
