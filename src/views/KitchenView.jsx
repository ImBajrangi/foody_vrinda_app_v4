import { useState, useEffect, useMemo } from 'react';
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
  updateCloudMenuItem,
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
  Store,
  PackageCheck,
  PackageX,
  AlertTriangle,
  TrendingUp,
  Sparkles
} from 'lucide-react';

export default function KitchenView() {
  const { user, currentUserShopId, allShops = [], refreshShops, actualRole, impersonate, userRole, isAuthorizedDeveloper, isAuthorizedAdmin } = useAuth();

  // 1. RESOLVE ONE AUTHORITATIVE SHOP ID
  // Primary Invariant: resolvedShopId === queriedShopId === realtimeShopId === renderedShopId
  // NEVER silently switch to allShops[0]
  const activeShop = useMemo(() => {
    if (!currentUserShopId || !allShops || allShops.length === 0) return null;
    const found = allShops.find(s => s.id === currentUserShopId && s.is_active !== false && !s.is_deleted);
    return found || null;
  }, [allShops, currentUserShopId]);

  const activeShopId = activeShop?.id || null;
  const currentShop = activeShop;

  const isDevOrAdmin = Boolean(
    isAuthorizedDeveloper ||
    isAuthorizedAdmin ||
    actualRole === 'developer' ||
    actualRole === 'grand_admin' ||
    userRole === 'developer' ||
    userRole === 'grand_admin'
  );

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
    if (!activeShopId) {
      showToast("Kitchen inactive", "error");
      return;
    }
    const targetShopId = activeShopId;
    const nextOnline = !isShopOnline;
    setShopOnlineOverride(nextOnline);
    showToast(nextOnline ? "Kitchen ONLINE" : "Kitchen OFFLINE", nextOnline ? "success" : "warning");

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
      showToast("Online Status Failed", "error");
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

  // Fast Realtime notification listener strictly bound to activeShopId
  useFastNotify(activeShopId, 'kitchen', (alertData) => {
    playRoleAlarm('kitchen', alertData, true);
    showToast(`Order #${alertData.orderId.slice(-6).toUpperCase()} received in kitchen!`, "info");
  });

  // 2. & 9. Load active orders (new & preparing) from Supabase Realtime & Strict Isolation
  useEffect(() => {
    // Hard guard: never query orders when activeShopId is null, undefined, empty, or invalid
    if (!activeShopId) {
      setOrders([]);
      return;
    }

    // Immediately clear old orders to prevent cross-shop ghost data
    setOrders([]);

    let isCurrent = true;
    const requestedShopId = activeShopId;

    // 1. Supabase Cloud fetch
    async function fetchKitchenOrders() {
      try {
        const { data, error } = await supabase
          .from('foody_orders')
          .select('*')
          .eq('shop_id', requestedShopId)
          .in('status', ['new', 'preparing', 'ready_for_pickup', 'ready'])
          .order('created_at', { ascending: true });

        if (!isCurrent) return;

        if (!error && data) {
          // Pre-commit hard filter strictly matching requestedShopId
          const isolatedData = data.filter(o => (o.shop_id ?? o.shopId) === requestedShopId);
          const mapped = isolatedData.map(o => ({
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
        if (!isCurrent) return;
        console.warn('Supabase fetchKitchenOrders note:', err.message);
      }
    }
    fetchKitchenOrders();

    // 2. Realtime Postgres stream strictly bound to requestedShopId
    const unsubscribeSupabase = subscribeCloudOrders(requestedShopId, () => {
      if (isCurrent) {
        fetchKitchenOrders();
      }
    });

    return () => {
      isCurrent = false;
      if (unsubscribeSupabase) unsubscribeSupabase();
    };
  }, [activeShopId]);

  // 10. CROSS-SHOP DEV ASSERTION
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || (typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
      orders.forEach(order => {
        const orderShopId = order.shop_id ?? order.shopId;
        if (activeShopId && orderShopId && orderShopId !== activeShopId) {
          console.error(
            '[SHOP ISOLATION VIOLATION]',
            { activeShopId, orderShopId, orderId: order.id }
          );
        }
      });
    }
  }, [orders, activeShopId]);

  // 4. RENDER-TIME HARD ISOLATION (Final defense: No matching shop ID = DO NOT PAINT)
  const isolatedOrders = useMemo(() => {
    if (!activeShopId) return [];
    return orders.filter(order => {
      const orderShopId = order.shop_id ?? order.shopId;
      return Boolean(orderShopId && activeShopId && orderShopId === activeShopId);
    });
  }, [orders, activeShopId]);

  // Kitchen Stock & Menu State strictly isolated to activeShopId
  const [kitchenMenuItems, setKitchenMenuItems] = useState([]);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilterTab, setStockFilterTab] = useState('all'); // 'all' | 'in_stock' | 'out_of_stock'

  // Load menu items for manual order creation and stock management
  const fetchMenu = async () => {
    if (!activeShopId) return;
    try {
      const cloudItems = await getCloudMenus(activeShopId);
      if (cloudItems && cloudItems.length > 0) {
        const isolated = cloudItems.filter(m => (m.shop_id ?? m.shopId) === activeShopId);
        setKitchenMenuItems(isolated);
        setManualCart(isolated.map(i => ({ ...i, quantity: 0 })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeShopId) {
      fetchMenu();
    } else {
      setKitchenMenuItems([]);
      setManualCart([]);
    }
  }, [activeShopId]);

  // Onboarding Tour Auto Open/Close Coordinator for Kitchen
  useEffect(() => {
    let tourOpenedStock = false;

    const handleTutorialStep = (e) => {
      const tourTag = e?.detail?.tag || e?.detail?.stage?.dataTour || '';
      if (tourTag.includes('restaurant-menu')) {
        fetchMenu();
        setShowStockModal(true);
        tourOpenedStock = true;
      } else if (tourOpenedStock) {
        setShowStockModal(false);
        tourOpenedStock = false;
      }
    };

    const handleTutorialClosed = () => {
      if (tourOpenedStock) {
        setShowStockModal(false);
        tourOpenedStock = false;
      }
    };

    window.addEventListener('foody:tutorial-step-active', handleTutorialStep);
    window.addEventListener('foody:tutorial-closed', handleTutorialClosed);
    return () => {
      window.removeEventListener('foody:tutorial-step-active', handleTutorialStep);
      window.removeEventListener('foody:tutorial-closed', handleTutorialClosed);
    };
  }, [activeShopId]);

  // Strict Shop-Isolated 1-Tap Stock Toggle for Kitchen Staff
  const handleToggleKitchenItemStock = async (item) => {
    const itemShopId = item.shopId || item.shop_id;
    if (itemShopId && activeShopId && itemShopId !== activeShopId && !isDevOrAdmin) {
      showToast("Access Denied: Cannot modify stock of another shop", "error");
      return;
    }

    const currentAvailability = (item.isAvailable !== false && item.is_available !== false);
    const nextAvailability = !currentAvailability;

    // Optimistic SWR local state update for zero perceived latency
    setKitchenMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, isAvailable: nextAvailability, is_available: nextAvailability } : m));
    setManualCart(prev => prev.map(m => m.id === item.id ? { ...m, isAvailable: nextAvailability, is_available: nextAvailability } : m));
    showToast(nextAvailability ? `${item.name} · In Stock` : `${item.name} · Out of Stock`, nextAvailability ? "success" : "warning");

    try {
      await updateCloudMenuItem(item.id, {
        isAvailable: nextAvailability,
        is_available: nextAvailability,
        shopId: itemShopId || activeShopId
      });
    } catch (err) {
      console.error("Failed to update item stock in kitchen:", err);
      // Rollback on error
      setKitchenMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, isAvailable: currentAvailability, is_available: currentAvailability } : m));
      setManualCart(prev => prev.map(m => m.id === item.id ? { ...m, isAvailable: currentAvailability, is_available: currentAvailability } : m));
      showToast("Failed to update stock", "error");
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
    if (!activeShopId) {
      return showToast("Kitchen Inactive.", "error");
    }
    const cartItems = manualCart.filter(i => i.quantity > 0);
    if (cartItems.length === 0) return showToast("Select Item.", "error");

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const orderPayload = {
      shopId: activeShopId,
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
        shopId: activeShopId,
        orderId: cloudOrder.id,
        message: `New manual order #${cloudOrder.id.slice(-6).toUpperCase()} created for ${customerName}.`
      });

      showToast("Order Created", "success");
      handleCloseCreateModal();
    } catch (err) {
      console.error(err);
      showToast("Order Creation Failed" + (err.message || "Unknown error"), "error");
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
          shopId: activeShopId,
          title: `Food in Preparation: Head to Kitchen`,
          message: `Chef started cooking Order #${orderId ? orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : ''}. Head to kitchen for instant hot pickup!`,
          orderId
        });
      } catch (err) { }

      showToast("Order Accepted!", "success");
    } catch (e) {
      console.error(e);
      showToast("Order Acceptance Failed.", "error");
    }
  };

  const handleOrderReady = async (orderId, orderData) => {
    stopAlarm();
    try {
      await updateCloudOrderStatus(orderId, 'ready_for_pickup', {
        chef_id: user?.uid || user?.id || 'kitchen_staff',
        chef_name: user?.name || user?.email || 'Kitchen Staff',
        packed_at: new Date().toISOString()
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ready_for_pickup' } : o));

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
        shopId: activeShopId,
        title: `Pickup Ready: ${itemSummary}`,
        message: `${itemSummary} (${customerName}) is ready for pickup.`,
        orderId
      });

      showToast(`Ready: ${itemSummary} (${customerName})`, "success");
    } catch (e) {
      console.error("Order ready update error:", e);
      showToast("Update Failed.", "error");
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
              el.classList.add('ring-4', 'ring-[#FD9139]', 'scale-[1.02]');
              setTimeout(() => {
                el.classList.remove('ring-4', 'ring-[#FD9139]', 'scale-[1.02]');
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5 bg-stone-200/90 dark:bg-[#282526] p-4 sm:p-5 md:p-6 rounded-[32px] border border-stone-300 dark:border-white/10 shadow-xl overflow-hidden relative">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 dark:bg-[#FD9139]/15 border border-amber-500/30 dark:border-[#FD9139]/30 flex items-center justify-center text-amber-600 dark:text-[#FD9139] shrink-0 shadow-sm">
            <ChefHat size={22} strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl lg:text-2xl font-black text-stone-900 dark:text-white tracking-tight font-outfit font-sans leading-snug">
                {currentShop ? `${currentShop.name} — Operations` : (currentUserShopId ? 'Assigned Kitchen Unavailable' : 'Kitchen Operations')}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all font-outfit ${
                isolatedOrders.length > 0
                  ? 'bg-amber-500/15 text-amber-800 dark:bg-[#FD9139]/15 dark:text-[#FD9139] border border-amber-500/30 dark:border-[#FD9139]/30 shadow-xs'
                  : 'bg-stone-300/60 dark:bg-white/10 text-stone-700 dark:text-zinc-300 border border-stone-300 dark:border-white/10'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isolatedOrders.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400 dark:bg-zinc-500'}`} />
                <span>{isolatedOrders.length} Active</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-600 dark:text-zinc-400 font-medium mt-1 flex items-center gap-1.5">
              <MapPin size={12} className="text-amber-600 dark:text-[#FD9139] shrink-0 opacity-80" />
              <span className="truncate">{currentShop ? (currentShop.address || 'Live Satvik preparation board & instant kitchen dispatch') : 'Assigned kitchen is inactive or unavailable'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
          {/* Top Row on mobile: Presence + Rush + Stock side-by-side filling width evenly */}
          <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            {/* Realtime Kitchen Presence Toggle */}
            <button
              data-tour="restaurant-setup"
              type="button"
              onClick={handleToggleKitchenOnline}
              className={`h-10 px-3.5 rounded-full font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer apple-tap-target w-full sm:w-auto shrink-0 ${isShopOnline
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 shadow-xs'
                : 'bg-rose-500/15 text-rose-800 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                }`}
              title="Toggle Live Kitchen Availability"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isShopOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`} />
              <span className="font-outfit">{isShopOnline ? 'Online' : 'Offline'}</span>
            </button>

            {/* Rush Mode (+15 Mins) Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsRushMode(prev => !prev);
                showToast(!isRushMode ? "+15 Mins Prep Added" : "Rush Mode Off", !isRushMode ? "warning" : "info");
              }}
              className={`h-10 px-3.5 rounded-full font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer apple-tap-target w-full sm:w-auto shrink-0 ${isRushMode
                ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/40 shadow-sm'
                : 'bg-stone-100 dark:bg-[#1E1B1C] text-stone-700 dark:text-neutral-300 border-stone-300 dark:border-white/10 hover:border-orange-500/30'
                }`}
              title="Extend prep time by +15 mins during rush hours"
            >
              <Flame size={15} className={isRushMode ? 'animate-bounce text-orange-500 shrink-0' : 'text-stone-500 shrink-0'} />
              <span className="font-outfit">{isRushMode ? 'Rush (+15m)' : 'Rush'}</span>
            </button>

            {/* Quick 86 / Stock Availability Manager */}
            <button
              data-tour="restaurant-menu restaurant-stock"
              type="button"
              onClick={() => {
                fetchMenu();
                setShowStockModal(true);
              }}
              className={`h-10 px-3.5 rounded-full font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer apple-tap-target w-full sm:w-auto shrink-0 ${kitchenMenuItems.filter(i => i.isAvailable === false || i.is_available === false).length > 0
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                : 'bg-stone-100 dark:bg-[#1E1B1C] text-stone-700 dark:text-neutral-300 border-stone-300 dark:border-white/10 hover:border-amber-500/30'
                }`}
              title="Manage Dish Stock & 86 Availability for this Kitchen"
            >
              {kitchenMenuItems.filter(i => i.isAvailable === false || i.is_available === false).length > 0 ? (
                <PackageX size={15} className="text-amber-500 shrink-0" />
              ) : (
                <PackageCheck size={15} className="text-emerald-500 shrink-0" />
              )}
              <span className="font-outfit truncate">
                {kitchenMenuItems.filter(i => i.isAvailable === false || i.is_available === false).length > 0
                  ? `${kitchenMenuItems.filter(i => i.isAvailable === false || i.is_available === false).length} Out`
                  : 'Stock'}
              </span>
            </button>
          </div>

          {/* Primary CTA: Create Manual Order - Fills width on mobile, inline on desktop */}
          <button
            data-tour="restaurant-menu"
            onClick={handleOpenCreateModal}
            className="h-10 bg-amber-600 hover:bg-amber-700 dark:bg-[#FD9139] dark:hover:bg-[#FCA65E] text-white dark:text-[#1E1B1C] font-black text-xs px-5 rounded-full flex items-center justify-center gap-2 shadow-lg dark:shadow-[0_0_20px_rgba(253, 145, 57,0.25)] transition-all cursor-pointer apple-tap-target w-full sm:w-auto shrink-0 font-outfit uppercase tracking-wider active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            <span className="whitespace-nowrap">Create Order</span>
          </button>
        </div>
      </div>

      {/* INACTIVE ASSIGNED KITCHEN WARNING BANNER */}
      {!activeShopId && (
        <div className="p-4 sm:p-5 rounded-[28px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black font-outfit font-sans text-rose-700 dark:text-rose-300">
              Assigned Kitchen Inactive
            </h3>
            <p className="text-xs text-rose-600/90 dark:text-rose-400/90 mt-0.5 leading-relaxed">
              {currentUserShopId
                ? `Assigned kitchen ID "${currentUserShopId}" is currently deactivated, deleted, or cannot be found. Orders for other kitchens are strictly quarantined.`
                : 'No kitchen is currently assigned to this account. Please select an active kitchen below.'}
            </p>
          </div>
        </div>
      )}

      {/* BRANCH SELECTOR — Only Developer & Platform Admins can switch kitchens */}
      {isDevOrAdmin && allShops.length > 1 && (
        <div className="flex flex-wrap items-center gap-2.5 py-1 relative z-30">
          <span className="text-[11px] font-bold text-stone-500 dark:text-neutral-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 font-outfit font-sans">
            <Store className="w-3.5 h-3.5 text-amber-600 dark:text-[#FD9139]" />
            Switch Kitchen:
          </span>
          <SearchableDropdown
            value={activeShopId || ''}
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
      {!activeShopId ? (
        <div data-tour="restaurant-orders restaurant-manage-orders" className="bg-white dark:bg-[#282526] rounded-[32px] sm:rounded-[36px] p-10 sm:p-14 text-center text-stone-600 dark:text-zinc-400 border border-stone-200/90 dark:border-white/5 flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center mb-3.5 border border-rose-500/20">
            <AlertTriangle size={32} className="text-rose-500" />
          </div>
          <p className="font-black text-stone-900 dark:text-white text-base sm:text-lg font-outfit font-sans">Kitchen Unavailable</p>
          <p className="text-xs text-stone-600 dark:text-zinc-400 mt-1 max-w-md">
            {currentUserShopId
              ? `The assigned kitchen "${currentUserShopId}" is currently inactive or deleted. Foreign kitchen orders are strictly isolated.`
              : 'Please select an active kitchen to view operations.'}
          </p>
        </div>
      ) : isolatedOrders.length === 0 ? (
        <div data-tour="restaurant-orders restaurant-manage-orders" className="bg-white dark:bg-[#282526] rounded-2xl sm:rounded-[36px] p-6 sm:p-14 text-center text-stone-600 dark:text-zinc-400 border border-stone-200/90 dark:border-white/5 flex flex-col items-center justify-center shadow-sm">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/15 dark:bg-[#FD9139]/15 text-amber-600 dark:text-[#FD9139] flex items-center justify-center mb-3 border border-amber-500/30 dark:border-[#FD9139]/30 shadow-xs">
            <CheckCircle2 size={24} className="sm:w-7 sm:h-7" strokeWidth={2.5} />
          </div>
          <p className="font-black text-stone-900 dark:text-white text-base sm:text-lg font-outfit font-sans">All Orders Prepared</p>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-zinc-400 mt-1 font-['Plus_Jakarta_Sans']">Kitchen queue is clear. Radhe Radhe!</p>
        </div>
      ) : (
        <div data-tour="restaurant-orders" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {isolatedOrders.map((order, idx) => {
            const isNew = order.status === 'new';

            return (
              <div
                key={order.id}
                id={`kitchen-order-${order.id}`}
                style={{ animationDelay: `${idx * 60}ms` }}
                className={`customer-card-pop bg-white dark:bg-[#282526] rounded-[32px] sm:rounded-[36px] p-5 sm:p-6 border flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden transition-all duration-300 ${isNew ? 'border-amber-500/40 dark:border-[#FD9139]/40 ring-1 ring-amber-500/20 dark:ring-[#FD9139]/20 shadow-[0_10px_30px_rgba(217,119,6,0.08)] dark:shadow-[0_10px_30px_rgba(253, 145, 57,0.06)]' : 'border-stone-300 dark:border-white/10'
                  }`}
              >
                <div>
                  {/* Top Order Badge & Status */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag size={15} className="text-amber-600 dark:text-[#FD9139]" />
                        <h3 className="font-black text-stone-900 dark:text-white text-sm sm:text-base font-outfit font-sans">
                          Order #{order.id.slice(-6).toUpperCase()}
                        </h3>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Clock size={12} className="text-stone-400 dark:text-zinc-500" />
                        <span>{order.createdAt?.toMillis ? new Date(order.createdAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                      </p>
                    </div>

                    <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 ${isNew
                      ? 'bg-amber-500 dark:bg-[#FD9139] text-white dark:text-[#1E1B1C] shadow-xs'
                      : ['ready_for_pickup', 'ready'].includes(order.status)
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      }`}>
                      {isNew ? (
                        <Flame size={11} className="fill-current" />
                      ) : ['ready_for_pickup', 'ready'].includes(order.status) ? (
                        <PackageCheck size={11} />
                      ) : (
                        <Clock size={11} />
                      )}
                      <span>
                        {isNew
                          ? 'New Order'
                          : ['ready_for_pickup', 'ready'].includes(order.status)
                            ? 'Ready For Pickup'
                            : 'Preparing'}
                      </span>
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
                            className="text-amber-700 dark:text-[#FD9139] hover:underline flex items-center gap-1 font-bold text-[11px]"
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
                      <span className="fv-badge-otp">
                        {getOrderOTP(order.id, 'pickup')}
                      </span>
                    </div>
                  </div>

                  {/* Dishes Checklist Section */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-stone-600 dark:text-zinc-400 uppercase tracking-wider font-outfit font-sans flex items-center justify-between">
                      <span>Dish Checklist</span>
                      <span className="text-stone-400 dark:text-zinc-500">{order.items?.length || 0} items</span>
                    </p>

                    <div className="divide-y divide-stone-200/60 dark:divide-white/5 max-h-48 overflow-y-auto pr-1 no-scrollbar space-y-1">
                      {order.items?.map((item, i) => (
                        <div key={item.id || i} className="py-2 text-xs flex justify-between items-start gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-[#1E1B1C] border border-stone-300 dark:border-white/10 text-stone-800 dark:text-[#FD9139] font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                              {item.quantity}x
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-bold truncate ${item.ready ? 'line-through text-stone-400 dark:text-zinc-500' : 'text-stone-900 dark:text-white'}`}>
                                  {item.name}
                                </span>
                                {(item.isCombo || item.comboItems) && (
                                  <span className="text-[8.5px] font-black uppercase bg-amber-500/15 dark:bg-[#FD9139]/20 text-amber-700 dark:text-[#FD9139] px-1.5 py-0.2 rounded font-bold">
                                    Combo
                                  </span>
                                )}
                              </div>
                              {item.comboItems && (
                                <div className="text-[10px] text-stone-600 dark:text-zinc-400 mt-0.5 space-y-0.5 pl-1 border-l border-amber-500/40 dark:border-[#FD9139]/30">
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
                <div className="pt-3 border-t border-stone-200/80 dark:border-white/5">
                  {['ready_for_pickup', 'ready'].includes(order.status) ? (
                    <div className="w-full bg-amber-500/10 dark:bg-[#FD9139]/10 border border-amber-500/30 dark:border-[#FD9139]/30 rounded-2xl p-3 text-center space-y-1">
                      <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-[#FD9139] font-black text-xs uppercase tracking-wider">
                        <PackageCheck size={15} />
                        <span>Awaiting Sarathi Pickup</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-zinc-400">
                        Hand over prasad when Sarathi enters OTP: <strong className="font-mono text-xs text-amber-800 dark:text-[#FD9139] font-black px-1.5 py-0.5 rounded bg-amber-500/20 dark:bg-[#FD9139]/20">{getOrderOTP(order.id, 'pickup')}</strong>
                      </p>
                    </div>
                  ) : isNew ? (
                    <button
                      data-tour="restaurant-manage-orders"
                      onClick={() => handleAcceptOrder(order.id)}
                      className="fv-btn-primary w-full"
                    >
                      <Flame size={15} />
                      <span>Accept & Start Cooking</span>
                    </button>
                  ) : (
                    <button
                      data-tour="restaurant-manage-orders"
                      onClick={() => handleOrderReady(order.id, order)}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#1E1B1C] font-black text-xs sm:text-sm py-3 px-4 rounded-full shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer apple-tap-target"
                    >
                      <CheckCircle2 size={16} strokeWidth={2.5} />
                      <span>Food Packed & Ready for Pickup</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KITCHEN BUSINESS & REVENUE OVERVIEW — Positioned below orders so orders are immediately visible first */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Sales & Revenue Card */}
        <div data-tour="restaurant-sales" className="p-4 sm:p-5 rounded-[28px] sm:rounded-[32px] bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:bg-[#FD9139]/15 dark:text-[#FD9139] border border-amber-500/30 dark:border-[#FD9139]/30 flex items-center justify-center font-bold shrink-0 shadow-sm">
              <TrendingUp size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-stone-600 dark:text-zinc-400 uppercase tracking-wider font-outfit font-sans">Daily Orders & Volume</p>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white font-outfit font-sans mt-0.5">{isolatedOrders.length} Active Orders</h3>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-outfit shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Queue</span>
          </span>
        </div>

        {/* Growth & Promos Card */}
        <div data-tour="restaurant-grow" className="p-4 sm:p-5 rounded-[28px] sm:rounded-[32px] bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 shadow-lg flex items-center justify-between gap-3 relative overflow-hidden transition-all hover:border-emerald-500/30 group">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
          <div className="flex items-center gap-3 min-w-0 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Sparkles size={20} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider font-outfit font-sans">Kitchen Growth Hub</p>
              <h4 className="text-xs sm:text-sm font-black text-stone-900 dark:text-white font-outfit font-sans leading-tight mt-0.5 truncate">Festive Broadcasts & Tips</h4>
            </div>
          </div>
          <a
            href="https://whatsapp.com/channel/0029Vb6UR3Z9mrGcDXbHzA1Q"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-[#FD9139] dark:hover:bg-[#FCA65E] dark:text-[#1E1B1C] text-xs font-black font-outfit uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0 shadow-md active:scale-95 relative z-10 apple-tap-target"
          >
            <MessageCircle size={14} />
            <span>Channel</span>
          </a>
        </div>
      </div>



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
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-[#FD9139]/15 border border-amber-500/30 dark:border-[#FD9139]/30 flex items-center justify-center text-amber-700 dark:text-[#FD9139]">
                  <Plus size={20} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white font-outfit font-sans">Create Manual Order</h3>
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
                  <h4 className="text-xs font-black uppercase text-stone-900 dark:text-zinc-400 tracking-wider font-outfit font-sans">Customer Information</h4>

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
                    <h4 className="text-xs font-black uppercase text-stone-900 dark:text-zinc-400 tracking-wider font-outfit font-sans">Select Satvik Dishes</h4>
                    <span className="text-[11px] text-amber-700 dark:text-[#FD9139] font-bold">
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
                          <p className="font-bold text-stone-900 dark:text-white text-xs truncate">
                            {item.name}
                            {(item.isAvailable === false || item.is_available === false) && (
                              <span className="ml-1.5 text-[9px] text-rose-500 font-bold uppercase bg-rose-500/10 px-1.5 py-0.5 rounded-md">
                                Out of Stock
                              </span>
                            )}
                          </p>
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
                          <span className="min-w-[18px] text-center font-black text-xs text-stone-900 dark:text-[#FD9139] font-outfit font-sans select-none">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateManualQty(item.id, 1)}
                            className="w-6 h-6 rounded-full bg-amber-600 hover:bg-amber-700 dark:bg-[#FD9139] dark:hover:bg-[#fca65e] active:scale-90 flex items-center justify-center text-white dark:text-[#1E1B1C] cursor-pointer transition-all shadow-md apple-tap-target"
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
                    <span className="text-lg font-black text-stone-950 dark:text-[#FD9139]">
                      ₹{manualCart.reduce((sum, item) => sum + item.price * item.quantity, 0)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-stone-900 hover:bg-black text-white dark:bg-[#FD9139] dark:hover:bg-[#FCA65E] dark:text-[#1E1B1C] font-black text-sm py-4 rounded-full shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer apple-tap-target mt-4"
              >
                <Check size={18} strokeWidth={3} />
                <span>Confirm & Create Kitchen Order</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 86 / STOCK AVAILABILITY MODAL FOR KITCHEN STAFF */}
      {showStockModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 rounded-[32px] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <PackageCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-white font-outfit font-sans flex items-center gap-2">
                    Kitchen Stock Manager (86)
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
                      {currentShop?.name || 'Assigned Kitchen'}
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-zinc-400">
                    Instantly toggle dishes in or out of stock for this kitchen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStockModal(false)}
                className="w-9 h-9 rounded-full bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 flex items-center justify-center text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Controls: Search + Filter Tabs */}
            <div className="p-4 border-b border-stone-200 dark:border-white/10 space-y-3 bg-stone-50 dark:bg-[#151314]">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search kitchen dishes..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'All Items', count: kitchenMenuItems.length },
                  { id: 'in_stock', label: 'In Stock', count: kitchenMenuItems.filter(i => i.isAvailable !== false && i.is_available !== false).length },
                  { id: 'out_of_stock', label: 'Out of Stock', count: kitchenMenuItems.filter(i => i.isAvailable === false || i.is_available === false).length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStockFilterTab(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${stockFilterTab === tab.id
                      ? 'bg-[#FD9139] text-white font-black shadow-sm'
                      : 'bg-white hover:bg-orange-50/60 dark:bg-white/5 text-stone-700 dark:text-zinc-300 dark:hover:bg-white/10 border border-stone-200 dark:border-transparent'
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${stockFilterTab === tab.id
                      ? 'bg-white/25 text-white'
                      : 'bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-zinc-400'
                      }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dishes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-stone-100 dark:divide-white/5">
              {kitchenMenuItems
                .filter(item => {
                  const matchesSearch = item.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
                    (item.category && item.category.toLowerCase().includes(stockSearch.toLowerCase()));
                  const isOut = item.isAvailable === false || item.is_available === false;
                  if (stockFilterTab === 'in_stock') return matchesSearch && !isOut;
                  if (stockFilterTab === 'out_of_stock') return matchesSearch && isOut;
                  return matchesSearch;
                })
                .map(item => {
                  const isOutOfStock = item.isAvailable === false || item.is_available === false;
                  return (
                    <div key={item.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold text-xs truncate ${isOutOfStock ? 'text-stone-400 dark:text-zinc-500 line-through' : 'text-stone-900 dark:text-white'}`}>
                            {item.name}
                          </p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider ${isOutOfStock
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            }`}>
                            {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-stone-500 dark:text-zinc-400 mt-0.5">
                          <span>₹{item.price}</span>
                          {item.category && (
                            <>
                              <span>•</span>
                              <span>{item.category}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 1-Tap Toggle Action Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleKitchenItemStock(item)}
                        className={`h-8 px-3 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 ${isOutOfStock
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                          : 'bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/30'
                          }`}
                        title={isOutOfStock ? "Mark dish back In Stock" : "Mark dish Out of Stock (86)"}
                      >
                        {isOutOfStock ? (
                          <>
                            <PackageCheck size={13} />
                            <span>Set In Stock</span>
                          </>
                        ) : (
                          <>
                            <PackageX size={13} />
                            <span>Set Out of Stock</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}

              {kitchenMenuItems.length === 0 && (
                <div className="text-center py-8 text-stone-400 dark:text-zinc-500 text-xs">
                  No dishes found for this kitchen.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#151314] flex items-center justify-between">
              <span className="text-[11px] text-stone-500 dark:text-zinc-400">
                Changes apply instantly across customer apps in realtime
              </span>
              <button
                type="button"
                onClick={() => setShowStockModal(false)}
                className="px-4 py-2 rounded-full bg-stone-900 dark:bg-white text-white dark:text-[#1E1B1C] font-black text-xs cursor-pointer hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
