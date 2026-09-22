import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFastNotify } from '../hooks/useFastNotify';
import { useAudioAlarm } from '../hooks/useAudioAlarm';
import {
  supabase,
  updateCloudOrderStatus,
  updateCloudShop,
  updateUserOnlineStatus,
  createCloudOrder,
  subscribeCloudOrders,
  getCloudMenus,
  createCloudNotification,
  getOrderItemSummary,
  getOrderCustomerName,
  getOrderOTP,
  generateWhatsAppOrderShareLink
} from '../supabase';
import DynamicToast from '../components/ui/DynamicToast';
import ActiveAlarmBanner from '../components/ui/ActiveAlarmBanner';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Plus,
  ShoppingBag,
  Phone,
  MessageCircle,
  MapPin,
  User,
  FileText,
  Check,
  X,
  Volume2,
  VolumeX,
  Flame,
  Banknote,
  Search,
  Minus,
  Trash2,
  Store
} from 'lucide-react';

export default function KitchenView() {
  const { user, currentUserShopId, allShops = [], refreshShops, actualRole, impersonate, userRole, isAuthorizedDeveloper, isAuthorizedAdmin } = useAuth();
  const currentShop = allShops.find(s => s.id === currentUserShopId) || allShops[0];
  const isGlobalRole = Boolean(isAuthorizedDeveloper || isAuthorizedAdmin || ['developer', 'grand_admin', 'owner'].includes(actualRole || userRole) || allShops.length > 1);

  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);
  const [isRushMode, setIsRushMode] = useState(false);
  const [shopOnlineOverride, setShopOnlineOverride] = useState(null);

  const isShopOnline = shopOnlineOverride !== null
    ? shopOnlineOverride
    : (currentShop?.isOnline !== false && currentShop?.isOpen !== false);

  useEffect(() => {
    setShopOnlineOverride(null);
  }, [currentShop?.id, currentShop?.isOnline, currentShop?.isOpen]);

  const handleToggleKitchenOnline = async () => {
    const targetShopId = currentShop?.id || currentUserShopId || allShops[0]?.id || 'shop-vrinda-main';
    const nextOnline = !isShopOnline;
    setShopOnlineOverride(nextOnline);
    showToast(nextOnline ? "Kitchen is now ONLINE (Taking live tickets)" : "Kitchen is now OFFLINE (Orders paused)", nextOnline ? "success" : "warning");

    try {
      await updateCloudShop(targetShopId, {
        isOnline: nextOnline,
        is_online: nextOnline,
        isOpen: nextOnline,
        is_open: nextOnline
      });
      if (user?.id) {
        await updateUserOnlineStatus(user.id, nextOnline);
      }
      if (refreshShops) await refreshShops();
    } catch (e) {
      console.error("Toggle kitchen error:", e);
      setShopOnlineOverride(!nextOnline);
      showToast("Failed to toggle online status", "error");
    }
  };

  // Create manual order states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cookingNotes, setCookingNotes] = useState('');
  const [manualCart, setManualCart] = useState([]);
  const [itemSearch, setItemSearch] = useState('');

  // Audio Alarm hook
  const { isPlaying, activeAlert, playRoleAlarm, stopAlarm, warmUpAudio, audioUnlocked } = useAudioAlarm();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev && prev.message === message ? null : prev));
    }, 4000);
  };

  // Fast Realtime notification listener with role-tailored alarm
  useFastNotify(currentUserShopId, 'kitchen', (alertData) => {
    playRoleAlarm('kitchen', alertData, true);
    showToast(`Order #${alertData.orderId.slice(-6).toUpperCase()} received in kitchen!`, "info");
  });

  // Load active orders (new & preparing) from Supabase Realtime
  useEffect(() => {
    if (!currentUserShopId) return;

    // 1. Supabase Cloud fetch
    async function fetchKitchenOrders() {
      try {
        const { data, error } = await supabase
          .from('foody_orders')
          .select('*')
          .eq('shop_id', currentUserShopId)
          .in('status', ['new', 'preparing'])
          .order('created_at', { ascending: true });

        if (!error && data) {
          const mapped = data.map(o => ({
            id: o.id,
            ...o,
            shopId: o.shop_id,
            customerName: o.customer_name,
            customerPhone: o.customer_phone,
            customerAddress: o.customer_address,
            deliveryAddress: o.delivery_address,
            totalAmount: o.total_amount,
            cookingNotes: o.cooking_notes,
            paymentMethod: o.payment_method,
            createdAt: o.created_at
          }));
          setOrders(mapped);
        }
      } catch (err) {
        console.warn('Supabase fetchKitchenOrders note:', err.message);
      }
    }
    fetchKitchenOrders();

    // 2. Realtime Postgres stream
    const unsubscribeSupabase = subscribeCloudOrders(currentUserShopId, () => {
      fetchKitchenOrders();
    });

    return () => {
      if (unsubscribeSupabase) unsubscribeSupabase();
    };
  }, [currentUserShopId]);

  // Load menu items for manual order creation
  const fetchMenu = async () => {
    if (!currentUserShopId) return;
    try {
      const cloudItems = await getCloudMenus(currentUserShopId);
      if (cloudItems && cloudItems.length > 0) {
        setManualCart(cloudItems.map(i => ({ ...i, quantity: 0 })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCreateModal = () => {
    fetchMenu();
    setCustomerName('');
    setCustomerAddress('');
    setCustomerPhone('');
    setCookingNotes('');
    setItemSearch('');
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    if (isModalClosing) return;
    setIsModalClosing(true);
    setTimeout(() => {
      setShowCreateModal(false);
      setIsModalClosing(false);
    }, 220);
  };

  const handleUpdateManualQty = (itemId, delta) => {
    setManualCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const q = Math.max(0, item.quantity + delta);
        return { ...item, quantity: q };
      }
      return item;
    }));
  };

  const handleCreateManualOrder = async (e) => {
    e.preventDefault();
    const cartItems = manualCart.filter(i => i.quantity > 0);
    if (cartItems.length === 0) return showToast("Please select at least one item.", "error");

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const orderPayload = {
      shopId: currentUserShopId,
      customerName,
      customerAddress,
      deliveryAddress: customerAddress,
      customerPhone,
      items: cartItems.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity, ready: false })),
      subtotal: total,
      deliveryCharge: 0,
      gstAmount: 0,
      totalAmount: total,
      status: 'new',
      userId: user?.uid || null,
      paymentId: 'manual-cash-entry',
      paymentIds: ['manual-cash-entry'],
      isPaid: true,
      isTestOrder: false,
      createdBy: user?.email || 'staff',
      paymentMethod: 'cash',
      cashStatus: 'pending',
      cookingNotes
    };

    try {
      const cloudOrder = await createCloudOrder(orderPayload);

      // Notify staff
      await createCloudNotification({
        role: 'kitchen',
        shopId: currentUserShopId,
        orderId: cloudOrder.id,
        message: `New manual order #${cloudOrder.id.slice(-6).toUpperCase()} created for ${customerName}.`
      });

      showToast("Manual order created successfully!", "success");
      handleCloseCreateModal();
    } catch (err) {
      console.error(err);
      showToast("Failed to create manual order.", "error");
    }
  };

  const handleAcceptOrder = async (orderId) => {
    stopAlarm();
    try {
      await updateCloudOrderStatus(orderId, 'preparing');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'preparing' } : o));
      
      // Parallel Early Rider Dispatch: Notify nearest active riders immediately so food is never delivered cold!
      try {
        await createCloudNotification({
          role: 'delivery',
          shopId: currentUserShopId,
          title: `⚡ Food in Preparation: Head to Kitchen`,
          message: `Chef started cooking Order #${orderId ? orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : ''}. Head to kitchen for instant hot pickup!`,
          orderId
        });
      } catch (err) { }

      showToast("Order accepted! Riders alerted for hot pickup.", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to accept order.", "error");
    }
  };

  const handleOrderReady = async (orderId, orderData) => {
    stopAlarm();
    try {
      await updateCloudOrderStatus(orderId, 'ready_for_pickup');
      setOrders(prev => prev.filter(o => o.id !== orderId));

      const itemSummary = getOrderItemSummary(orderData) || 'Satvik Meal';
      const customerName = getOrderCustomerName(orderData);

      // Notify customer & rider
      if (orderData?.userId) {
        await createCloudNotification({
          userId: orderData.userId,
          title: `Packed & Ready: ${itemSummary}`,
          message: `${itemSummary} is packed & ready for courier dispatch.`,
          orderId
        });
      }

      await createCloudNotification({
        role: 'delivery',
        shopId: currentUserShopId,
        title: `Pickup Ready: ${itemSummary}`,
        message: `${itemSummary} (${customerName}) is ready for pickup.`,
        orderId
      });

      showToast(`Ready: ${itemSummary} (${customerName})`, "success");
    } catch (e) {
      console.error("Order ready update error:", e);
      showToast("Failed to update status.", "error");
    }
  };

  const toggleItemReady = async (orderId, itemId) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order || !order.items) return;

      const updatedItems = order.items.map(item =>
        String(item.id) === String(itemId) ? { ...item, ready: !item.ready } : item
      );

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: updatedItems } : o));

      await supabase
        .from('foody_orders')
        .update({ items: updatedItems, updated_at: new Date().toISOString() })
        .eq('id', orderId);
    } catch (e) {
      console.error("Toggle item ready error:", e);
    }
  };

  const filteredMenuItems = manualCart.filter(item =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(itemSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-20">
      {/* ACTIVE TACTILE ALARM BANNER (DYNAMIC ISLAND STYLE) */}
      <ActiveAlarmBanner
        isPlaying={isPlaying}
        activeAlert={activeAlert}
        onSilence={stopAlarm}
        onActionClick={(alert) => {
          stopAlarm();
          if (alert?.orderId) {
            const el = document.getElementById(`kitchen-order-${alert.orderId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-4', 'ring-[#E0FF33]', 'scale-[1.02]');
              setTimeout(() => {
                el.classList.remove('ring-4', 'ring-[#E0FF33]', 'scale-[1.02]');
              }, 2500);
            }
          }
        }}
      />

      {/* TOAST NOTIFICATION */}
      {toast && (
        <DynamicToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* HEADER OPERATIONS BAR */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-stone-200/90 dark:bg-[#282526] p-4 sm:p-5 md:p-6 rounded-[32px] border border-stone-300 dark:border-white/10 shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 dark:bg-[#E0FF33]/15 border border-amber-500/30 dark:border-[#E0FF33]/30 flex items-center justify-center text-amber-600 dark:text-[#E0FF33] shrink-0 shadow-sm">
            <ChefHat size={22} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-stone-900 dark:text-white tracking-tight font-['Outfit'] truncate">
                Kitchen Operations
              </h1>
              <span className="bg-amber-600 text-white dark:bg-[#E0FF33] dark:text-[#1E1B1C] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shrink-0">
                {orders.length} Active
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-600 dark:text-zinc-400 font-medium mt-0.5 truncate">
              Live Satvik preparation board & instant kitchen dispatch
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 w-full xl:w-auto">
          {/* Operations Utility Strip: 3-column balanced grid on mobile, horizontal flex on desktop */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full sm:w-auto">
            {/* Realtime Kitchen Presence Toggle */}
            <button
              type="button"
              onClick={handleToggleKitchenOnline}
              className={`h-10 sm:h-11 px-2 sm:px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-all cursor-pointer apple-tap-target shrink-0 ${isShopOnline
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                }`}
              title="Toggle Live Kitchen Availability"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isShopOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="truncate">
                <span className="sm:hidden">{isShopOnline ? 'Online' : 'Offline'}</span>
                <span className="hidden sm:inline">{isShopOnline ? 'Kitchen Online' : 'Kitchen Offline'}</span>
              </span>
            </button>

            {/* Sound Alarm Quick Trigger */}
            <button
              type="button"
              onClick={() => {
                if (isPlaying) {
                  stopAlarm();
                } else {
                  warmUpAudio();
                  playRoleAlarm('kitchen', { title: 'TEST KITCHEN BUZZER', orderId: 'test-kitch-tone' }, true);
                  showToast('Kitchen sound alarm test triggered! Tap Silence or banner to stop.', 'info');
                }
              }}
              className={`h-10 sm:h-11 px-2 sm:px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-all cursor-pointer apple-tap-target shrink-0 ${isPlaying
                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-stone-100 dark:bg-[#1E1B1C] text-stone-800 dark:text-neutral-300 border-stone-300 dark:border-white/10 hover:text-stone-950 dark:hover:text-white hover:border-stone-400 dark:hover:border-white/20'
                }`}
              title="Test or silence Kitchen Sound Alarm"
            >
              {isPlaying ? <VolumeX size={15} className="text-rose-500 shrink-0" /> : <Volume2 size={15} className="text-amber-600 dark:text-[#E0FF33] shrink-0" />}
              <span className="truncate">
                <span className="sm:hidden">{isPlaying ? 'Silence' : 'Sound'}</span>
                <span className="hidden sm:inline">{isPlaying ? 'Silence Alarm' : 'Test Sound'}</span>
              </span>
            </button>

            {/* Rush Mode (+15 Mins) Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsRushMode(prev => !prev);
                showToast(!isRushMode ? "🔥 Rush Mode ON: Customer ETA extended by +15 mins" : "Rush Mode OFF: Normal prep flow restored", !isRushMode ? "warning" : "info");
              }}
              className={`h-10 sm:h-11 px-2 sm:px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-all cursor-pointer apple-tap-target shrink-0 ${
                isRushMode
                  ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/40 shadow-sm'
                  : 'bg-stone-100 dark:bg-[#1E1B1C] text-stone-800 dark:text-neutral-300 border-stone-300 dark:border-white/10 hover:border-orange-500/30'
              }`}
              title="Extend prep time by +15 mins during rush hours"
            >
              <Flame size={15} className={isRushMode ? 'animate-bounce text-orange-500 shrink-0' : 'text-stone-500 shrink-0'} />
              <span className="truncate">
                <span className="sm:hidden">{isRushMode ? 'Rush (+15m)' : 'Rush'}</span>
                <span className="hidden sm:inline">{isRushMode ? 'Rush Mode ON (+15m)' : 'Rush Mode'}</span>
              </span>
            </button>
          </div>

          {/* Primary CTA: Create Manual Order */}
          <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto h-10 sm:h-11 bg-amber-600 hover:bg-amber-700 dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] text-white dark:text-[#1E1B1C] font-black text-xs sm:text-sm px-4 sm:px-5 rounded-full flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer apple-tap-target shrink-0 font-['Outfit'] tracking-wide"
          >
            <Plus size={16} strokeWidth={3} />
            <span className="whitespace-nowrap">Create Manual Order</span>
          </button>
        </div>
      </div>

      {/* BRANCH SELECTOR — Global roles can switch kitchen branches inline */}
      {isGlobalRole && allShops.length > 1 && (
        <div className="flex flex-wrap items-center gap-2.5 py-1 relative z-30">
          <span className="text-[11px] font-bold text-stone-500 dark:text-neutral-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 font-['Outfit']">
            <Store className="w-3.5 h-3.5 text-amber-600 dark:text-[#E0FF33]" />
            Switch Kitchen:
          </span>
          <SearchableDropdown
            value={currentUserShopId || allShops[0]?.id}
            onChange={(val) => impersonate(val, userRole)}
            options={allShops.map(s => ({
              value: s.id,
              label: s.name,
              sublabel: s.address || 'Vrindavan Dham Kitchen',
              icon: Store,
              badge: s.tag || 'Branch',
              badgeColor: 'bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-neutral-300'
            }))}
            size="sm"
            searchPlaceholder="Search kitchens..."
            className="w-full sm:w-auto sm:min-w-[340px]"
          />
        </div>
      )}

      {/* ORDERS GRID */}
      {orders.length === 0 ? (
        <div className="bg-stone-200/80 dark:bg-[#282526] rounded-[36px] p-12 sm:p-16 text-center text-stone-600 dark:text-zinc-400 border border-stone-300 dark:border-white/5 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-stone-300/60 dark:bg-white/5 flex items-center justify-center mb-3.5 border border-stone-300 dark:border-white/5">
            <CheckCircle2 size={32} className="text-amber-600 dark:text-[#E0FF33]" />
          </div>
          <p className="font-black text-stone-900 dark:text-white text-base sm:text-lg font-['Outfit']">All Orders Prepared</p>
          <p className="text-xs text-stone-600 dark:text-zinc-500 mt-1">Kitchen queue is clear. Radhe Radhe!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {orders.map((order, idx) => {
            const isNew = order.status === 'new';

            return (
              <div
                key={order.id}
                id={`kitchen-order-${order.id}`}
                style={{ animationDelay: `${idx * 60}ms` }}
                className={`customer-card-pop bg-white dark:bg-[#282526] rounded-[32px] sm:rounded-[36px] p-5 sm:p-6 border flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden transition-all duration-300 ${isNew ? 'border-amber-500/40 dark:border-[#E0FF33]/40 ring-1 ring-amber-500/20 dark:ring-[#E0FF33]/20 shadow-[0_10px_30px_rgba(217,119,6,0.08)] dark:shadow-[0_10px_30px_rgba(224,255,51,0.06)]' : 'border-stone-300 dark:border-white/10'
                  }`}
              >
                <div>
                  {/* Top Order Badge & Status */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag size={15} className="text-amber-600 dark:text-[#E0FF33]" />
                        <h3 className="font-black text-stone-900 dark:text-white text-sm sm:text-base font-['Outfit']">
                          Order #{order.id.slice(-6).toUpperCase()}
                        </h3>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Clock size={12} className="text-stone-400 dark:text-zinc-500" />
                        <span>{order.createdAt?.toMillis ? new Date(order.createdAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                      </p>
                    </div>

                    <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 ${isNew
                        ? 'bg-amber-500 dark:bg-[#E0FF33] text-white dark:text-[#1E1B1C] shadow-xs'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      }`}>
                      {isNew ? <Flame size={11} className="fill-current" /> : <Clock size={11} />}
                      <span>{order.status}</span>
                    </span>
                  </div>

                  {/* Customer & Address Details Card */}
                  <div className="text-xs text-stone-700 dark:text-zinc-300 mb-3.5 bg-stone-100 dark:bg-[#1E1B1C] p-3.5 rounded-2xl border border-stone-200/80 dark:border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5 truncate">
                        <User size={13} className="text-stone-500 dark:text-zinc-500 flex-shrink-0" />
                        <span className="truncate">{order.customerName || 'Customer'}</span>
                      </p>
                      {order.customerPhone && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="text-amber-700 dark:text-[#E0FF33] hover:underline flex items-center gap-1 font-bold text-[11px]"
                            title="Call Customer"
                          >
                            <Phone size={11} />
                            <span>{order.customerPhone}</span>
                          </a>
                          <a
                            href={generateWhatsAppOrderShareLink({
                              phone: order.customerPhone,
                              orderId: order.id,
                              customerName: order.customerName,
                              shopName: currentShop?.name || 'Foody Vrinda Kitchen',
                              status: order.status,
                              totalAmount: order.totalAmount,
                              deliveryOtp: getOrderOTP(order.id, 'delivery')
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-5 h-5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all"
                            title="Send Free WhatsApp Order & OTP Update"
                          >
                            <MessageCircle size={11} />
                          </a>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-stone-600 dark:text-zinc-400 flex items-start gap-1.5 leading-snug">
                      <MapPin size={13} className="text-stone-400 dark:text-zinc-500 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{order.customerAddress || 'Vrindavan Dham'}</span>
                    </p>

                    {order.cookingNotes && (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-[11px] text-amber-800 dark:text-amber-200 mt-1.5 flex items-start gap-1.5">
                        <FileText size={13} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-snug"><strong className="text-amber-700 dark:text-amber-400">Notes:</strong> {order.cookingNotes}</span>
                      </div>
                    )}

                    {order.paymentMethod === 'cash' && (
                      <div className="pt-1 flex items-center justify-between border-t border-stone-200/80 dark:border-white/5 mt-1">
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-black uppercase flex items-center gap-1">
                          <Banknote size={12} />
                          <span>Cash on Delivery</span>
                        </span>
                        <span className="text-xs font-black text-stone-900 dark:text-white">₹{order.totalAmount}</span>
                      </div>
                    )}

                    {/* Rider Handover Pickup OTP Badge */}
                    <div className="pt-1.5 flex items-center justify-between border-t border-dashed border-stone-200/80 dark:border-white/10 mt-1.5">
                      <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        <span>Rider Pickup OTP</span>
                      </span>
                      <span className="text-xs font-mono font-black tracking-widest bg-stone-900 text-[#E0FF33] px-2 py-0.5 rounded-md border border-[#E0FF33]/30">
                        {getOrderOTP(order.id, 'pickup')}
                      </span>
                    </div>
                  </div>

                  {/* Dishes Checklist Section */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-stone-600 dark:text-zinc-400 uppercase tracking-wider font-['Outfit'] flex items-center justify-between">
                      <span>Dish Checklist</span>
                      <span className="text-stone-400 dark:text-zinc-500">{order.items?.length || 0} items</span>
                    </p>

                    <div className="divide-y divide-stone-200/60 dark:divide-white/5 max-h-48 overflow-y-auto pr-1 no-scrollbar space-y-1">
                      {order.items?.map((item, i) => (
                        <div key={item.id || i} className="py-2 text-xs flex justify-between items-start gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-[#1E1B1C] border border-stone-300 dark:border-white/10 text-stone-800 dark:text-[#E0FF33] font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                              {item.quantity}x
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-bold truncate ${item.ready ? 'line-through text-stone-400 dark:text-zinc-500' : 'text-stone-900 dark:text-white'}`}>
                                  {item.name}
                                </span>
                                {(item.isCombo || item.comboItems) && (
                                  <span className="text-[8.5px] font-black uppercase bg-amber-500/15 dark:bg-[#E0FF33]/20 text-amber-700 dark:text-[#E0FF33] px-1.5 py-0.2 rounded font-bold">
                                    Combo
                                  </span>
                                )}
                              </div>
                              {item.comboItems && (
                                <div className="text-[10px] text-stone-600 dark:text-zinc-400 mt-0.5 space-y-0.5 pl-1 border-l border-amber-500/40 dark:border-[#E0FF33]/30">
                                  {item.comboItems.map((ci, cidx) => (
                                    <p key={cidx}>• {ci}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {order.status === 'preparing' && (
                            <button
                              onClick={() => toggleItemReady(order.id, item.id)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer apple-tap-target flex-shrink-0 ${item.ready
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-stone-200 hover:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/20 text-stone-700 dark:text-zinc-300'
                                }`}
                            >
                              <Check size={11} strokeWidth={item.ready ? 3 : 2} />
                              <span>{item.ready ? 'Ready' : 'Mark'}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status Update Action Button */}
                <div className="pt-3 border-t border-white/5">
                  {isNew ? (
                    <button
                      onClick={() => handleAcceptOrder(order.id)}
                      className="w-full bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black text-xs sm:text-sm py-3 px-4 rounded-full shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer apple-tap-target"
                    >
                      <Flame size={15} className="fill-[#1E1B1C]" />
                      <span>Accept & Start Cooking</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOrderReady(order.id, order)}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#1E1B1C] font-black text-xs sm:text-sm py-3 px-4 rounded-full shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer apple-tap-target"
                    >
                      <CheckCircle2 size={16} strokeWidth={2.5} />
                      <span>Order Ready for Dispatch</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: MANUAL ORDER ENTRY */}
      {showCreateModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseCreateModal();
          }}
          className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 apple-overlay ${isModalClosing ? 'closing' : ''}`}
        >
          <div className={`w-full max-w-2xl bg-stone-50 dark:bg-[#242021] border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-[36px] sm:rounded-[42px] p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col justify-between apple-modal-spring ${isModalClosing ? 'closing' : ''}`}>

            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-stone-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-[#E0FF33]/15 border border-amber-500/30 dark:border-[#E0FF33]/30 flex items-center justify-center text-amber-700 dark:text-[#E0FF33]">
                  <Plus size={20} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white font-['Outfit']">Create Manual Order</h3>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 font-medium">Record in-person or phone delivery order</p>
                </div>
              </div>

              <button
                onClick={handleCloseCreateModal}
                className="w-9 h-9 rounded-full bg-stone-200/80 hover:bg-stone-300 dark:bg-[#1E1B1C] dark:hover:bg-[#322E30] text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer apple-tap-target border border-stone-300/80 dark:border-white/5"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-5 my-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Customer Information Column */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-black uppercase text-stone-900 dark:text-zinc-400 tracking-wider font-['Outfit']">Customer Information</h4>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      placeholder="e.g. Radhika Sharma"
                      className="w-full text-xs bg-stone-100 dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 rounded-2xl py-3 px-4 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1">Delivery Address</label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      required
                      placeholder="e.g. Raman Reti, Vrindavan"
                      className="w-full text-xs bg-stone-100 dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 rounded-2xl py-3 px-4 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                      placeholder="e.g. 9876543210"
                      className="w-full text-xs bg-stone-100 dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 rounded-2xl py-3 px-4 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1">Kitchen Instructions</label>
                    <input
                      type="text"
                      value={cookingNotes}
                      onChange={(e) => setCookingNotes(e.target.value)}
                      placeholder="e.g. Extra tulsi patra, less spicy"
                      className="w-full text-xs bg-stone-100 dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 rounded-2xl py-3 px-4 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-zinc-500"
                    />
                  </div>
                </div>

                {/* Menu Items Selector Column */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-stone-900 dark:text-zinc-400 tracking-wider font-['Outfit']">Select Satvik Dishes</h4>
                    <span className="text-[11px] text-amber-700 dark:text-[#E0FF33] font-bold">
                      {manualCart.filter(i => i.quantity > 0).length} selected
                    </span>
                  </div>

                  {/* Search filter in modal */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Filter dishes..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="w-full text-xs bg-stone-100 dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 rounded-xl py-2 pl-8 pr-3 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-zinc-500"
                    />
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 no-scrollbar divide-y divide-stone-200 dark:divide-white/5">
                    {filteredMenuItems.map(item => (
                      <div key={item.id} className="pt-2 flex justify-between items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-stone-900 dark:text-white text-xs truncate">{item.name}</p>
                          <p className="text-[10px] text-stone-500 dark:text-zinc-400">₹{item.price}</p>
                        </div>

                        {/* High-accessibility Stepper */}
                        <div className="bg-stone-100 dark:bg-[#1E1B1C] rounded-full p-1 border border-stone-200 dark:border-white/10 flex items-center gap-1 shadow-inner flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateManualQty(item.id, -1)}
                            className="w-6 h-6 rounded-full bg-stone-200/80 hover:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/20 active:scale-90 flex items-center justify-center text-stone-700 hover:text-stone-950 dark:text-zinc-200 dark:hover:text-white cursor-pointer transition-all shadow-xs apple-tap-target"
                            aria-label="Decrease quantity"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 size={11} className="text-red-400" />
                            ) : (
                              <Minus size={11} strokeWidth={2.5} />
                            )}
                          </button>
                          <span className="min-w-[18px] text-center font-black text-xs text-stone-900 dark:text-[#E0FF33] font-['Outfit'] select-none">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateManualQty(item.id, 1)}
                            className="w-6 h-6 rounded-full bg-amber-600 hover:bg-amber-700 dark:bg-[#E0FF33] dark:hover:bg-[#ccff00] active:scale-90 flex items-center justify-center text-white dark:text-[#1E1B1C] cursor-pointer transition-all shadow-md apple-tap-target"
                            aria-label="Increase quantity"
                          >
                            <Plus size={11} strokeWidth={3.5} className="text-white dark:text-[#1E1B1C] stroke-current" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Bill Box */}
                  <div className="bg-stone-100 dark:bg-[#151314] rounded-2xl p-3.5 border border-stone-200 dark:border-white/5 flex justify-between items-center mt-3">
                    <span className="text-xs font-bold text-stone-600 dark:text-zinc-400 uppercase tracking-wider">Total Bill (COD)</span>
                    <span className="text-lg font-black text-stone-950 dark:text-[#E0FF33]">
                      ₹{manualCart.reduce((sum, item) => sum + item.price * item.quantity, 0)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-stone-900 hover:bg-black text-white dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] dark:text-[#1E1B1C] font-black text-sm py-4 rounded-full shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer apple-tap-target mt-4"
              >
                <Check size={18} strokeWidth={3} />
                <span>Confirm & Create Kitchen Order</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
