import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useBackHandler } from '../hooks/useBackHandler';
import { fetchAddressSuggestions } from '../services/addressService';
import MapPicker from '../components/MapPicker';
import BouncingLoader from '../components/ui/BouncingLoader';
import DynamicToast from '../components/ui/DynamicToast';
import {
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Flame,
  Zap,
  Banknote,
  ShieldCheck,
  Soup,
  Share2,
  Heart,
  X,
  Search,
  Sparkles,
  Check,
  Navigation,
  Minus,
  Plus,
  Trash2,
  History,
  Clock,
  Star,
  User,
  Phone,
  Compass,
  Tag as TagIcon,
  ExternalLink,
  MessageCircle,
  Store,
  UserCheck,
  LogIn
} from 'lucide-react';
import ActiveOrderTrackingModal from '../components/ActiveOrderTrackingModal';
import ActiveOrderCapsule from '../components/ActiveOrderCapsule';
import QuantityPickerSheet from '../components/QuantityPickerSheet';
import OrderHistoryDrawer from '../components/OrderHistoryDrawer';
import ReviewModal from '../components/ReviewModal';
import SocialLinksBar from '../components/ui/SocialLinksBar';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import {
  supabase,
  createCloudOrder,
  getCloudMenus,
  subscribeCloudMenus,
  subscribeSingleCloudOrder,
  resolveDishCutout,
  invalidateCache,
  isShopCurrentlyOpen,
  getCachedUsers,
  getCachedItem,
  setCachedItem
} from '../supabase';
import useGeolocation from '../hooks/useGeolocation';
import { useNotifications } from '../context/NotificationContext';

// Local cache storage helpers for live database dishes
const CUSTOMER_MENU_CACHE_PREFIX = 'foody_customer_menu_v3';
function getLocalCustomerMenus(shopId = 'all') {
  try {
    const raw = localStorage.getItem(`${CUSTOMER_MENU_CACHE_PREFIX}_${shopId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function setLocalCustomerMenus(shopId = 'all', items = []) {
  try {
    localStorage.setItem(`${CUSTOMER_MENU_CACHE_PREFIX}_${shopId}`, JSON.stringify(items));
  } catch { }
}

export default function CustomerView({ trackingOrderId, setTrackingOrderId }) {
  const { user, userData, allShops, isAuthenticated, updateUserProfile } = useAuth();
  const { requestSystemNotificationPermission } = useNotifications();

  // Strict verification: User must be authenticated (phone lookup / email / registered account)
  const isUserLoggedIn = Boolean(
    isAuthenticated ||
    (user && !user.isAnonymous && (user.email || user.phone || user.phoneNumber) && user.email !== 'Guest' && user.displayName !== 'Guest') ||
    (userData && userData.isLoggedInUser === true && (userData.phone || userData.email || userData.id))
  );
  const {
    cart,
    selectedShopId,
    setSelectedShopId,
    addToCart,
    updateQuantity,
    setExactQuantity,
    removeFromCart,
    clearCart,
    loadRazorpay,
    paymentSettings,
    resolveShopPaymentOptions
  } = useCart();

  // Real-time geolocation
  const geo = useGeolocation();

  const [editingQuantityItem, setEditingQuantityItem] = useState(null);
  const [selectedDishDetails, setSelectedDishDetails] = useState(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [menuItems, setMenuItems] = useState(() => {
    return getLocalCustomerMenus(selectedShopId) || [];
  });
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [deliveryCoords, setDeliveryCoords] = useState(() => {
    try {
      const cached = localStorage.getItem('deliveryCoords');
      return cached ? JSON.parse(cached) : { lat: null, lng: null };
    } catch {
      return { lat: null, lng: null };
    }
  });

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showShopSwitcher, setShowShopSwitcher] = useState(false);
  const [shopSearch, setShopSearch] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState('delivery'); // 'delivery' | 'pickup'
  const [onlineRidersCount, setOnlineRidersCount] = useState(1);
  const [cookingNotes, setCookingNotes] = useState('');

  // Favorites state
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('foody_favorites')) || [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (dishId) => {
    setFavorites(prev => {
      const updated = prev.includes(dishId)
        ? prev.filter(id => id !== dishId)
        : [...prev, dishId];
      try {
        localStorage.setItem('foody_favorites', JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save favorites", err);
      }
      return updated;
    });
  };

  // Checkout details with full profile auto-fill
  const [checkoutName, setCheckoutName] = useState(() => localStorage.getItem('customerName') || '');
  const [checkoutAddress, setCheckoutAddress] = useState(() => localStorage.getItem('customerAddress') || '');
  const [checkoutPhone, setCheckoutPhone] = useState(() => localStorage.getItem('customerPhone') || '');

  // Visual validation shake state & input focus refs
  const [shakeField, setShakeField] = useState(null);
  const nameInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const addressInputRef = useRef(null);

  const triggerShake = (field) => {
    setShakeField(field);
    if (field === 'name' && nameInputRef.current) {
      nameInputRef.current.focus();
    } else if (field === 'phone' && phoneInputRef.current) {
      phoneInputRef.current.focus();
    } else if (field === 'address' && addressInputRef.current) {
      addressInputRef.current.focus();
    }
    setTimeout(() => {
      setShakeField(null);
    }, 1200);
  };

  // Auto-fill checkout fields from user profile + geo address for instant future orders
  useEffect(() => {
    if (userData) {
      if (userData.displayName && (!checkoutName || checkoutName === 'Guest')) {
        setCheckoutName(userData.displayName);
      }
      if (userData.phone && !checkoutPhone) {
        setCheckoutPhone(userData.phone.replace(/\D/g, '').slice(0, 10));
      }
      if ((userData.address || userData.customerAddress) && !checkoutAddress) {
        setCheckoutAddress(userData.address || userData.customerAddress);
      }
    }
  }, [userData]);

  useEffect(() => {
    if (!checkoutAddress && geo.address) setCheckoutAddress(geo.address);
  }, [geo.address]);

  const handleAutoFillLocation = async () => {
    showToast("Detecting GPS location...", "info");
    try {
      const loc = await geo.requestLocation();
      if (loc && loc.address) {
        setCheckoutAddress(loc.address);
        if (loc.coords) setDeliveryCoords(loc.coords);
        showToast("Address Auto-filled!", "success");
        return;
      }
    } catch (err) {
      console.warn("Geolocation request notice:", err);
    }
    // Fallback if browser GPS is restricted: open visual map picker
    setShowMapPicker(true);
  };

  const [paymentMethod, setPaymentMethod] = useState('online');

  // Dynamically resolve payment methods for the active shop
  const currentCartShop = (allShops && allShops.length > 0)
    ? (allShops.find(s => s.id === selectedShopId) || allShops[0])
    : null;
  const { onlineAvailable, codAvailable, globalOnline, globalCod } = resolveShopPaymentOptions(currentCartShop);

  // Auto-switch payment method if selected method is disabled for this kitchen
  useEffect(() => {
    if (!onlineAvailable && codAvailable && paymentMethod !== 'cash') {
      setPaymentMethod('cash');
    } else if (onlineAvailable && !codAvailable && paymentMethod !== 'online') {
      setPaymentMethod('online');
    }
  }, [onlineAvailable, codAvailable, paymentMethod]);

  // Tracking orders & History
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);

  useEffect(() => {
    const handleOpenOrders = () => setIsOrderHistoryOpen(true);
    const handleOpenCart = () => setShowCartDrawer(true);

    window.addEventListener('foody-open-orders', handleOpenOrders);
    window.addEventListener('foody-open-cart', handleOpenCart);
    window.addEventListener('foody_open_cart', handleOpenCart);
    return () => {
      window.removeEventListener('foody-open-orders', handleOpenOrders);
      window.removeEventListener('foody-open-cart', handleOpenCart);
      window.removeEventListener('foody_open_cart', handleOpenCart);
    };
  }, []);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewOrderTarget, setReviewOrderTarget] = useState(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [toast, setToast] = useState(null);
  const [isDetailClosing, setIsDetailClosing] = useState(false);
  const [isCartClosing, setIsCartClosing] = useState(false);
  const [isShopClosing, setIsShopClosing] = useState(false);

  // Debounced address autocomplete
  useEffect(() => {
    if (!checkoutAddress || checkoutAddress.trim().length < 3) {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingAddress(true);
      try {
        const results = await fetchAddressSuggestions(checkoutAddress);
        setAddressSuggestions(results || []);
        setShowAddressDropdown(results && results.length > 0);
      } finally {
        setIsFetchingAddress(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [checkoutAddress]);

  // 120fps ultra-fluid native gesture hooks (Apple & Android predictive standard)
  const {
    sheetRef: detailSheetRef,
    overlayRef: detailOverlayRef,
    dismiss: dismissDetailSheet,
    sheetStyle: detailSheetStyle,
    handleProps: detailHandleProps,
    isDragging: isDraggingDetail
  } = useBottomSheetDrag((isImmediate) => {
    setSelectedDishDetails(null);
    setIsDetailClosing(false);
  }, 45);

  const {
    sheetRef: cartSheetRef,
    overlayRef: cartOverlayRef,
    dismiss: dismissCartSheet,
    sheetStyle: cartSheetStyle,
    handleProps: cartHandleProps,
    isDragging: isDraggingCart
  } = useBottomSheetDrag((isImmediate) => {
    setShowCartDrawer(false);
    setIsCartClosing(false);
  }, 45);

  const handleCloseDishDetail = useCallback((isImmediate = false) => {
    if (isImmediate === true) {
      setSelectedDishDetails(null);
      setIsDetailClosing(false);
      return;
    }
    dismissDetailSheet(() => {
      setSelectedDishDetails(null);
      setIsDetailClosing(false);
    });
  }, [dismissDetailSheet]);

  const handleCloseCartDrawer = useCallback((isImmediate = false) => {
    if (isImmediate === true) {
      setShowCartDrawer(false);
      setIsCartClosing(false);
      return;
    }
    dismissCartSheet(() => {
      setShowCartDrawer(false);
      setIsCartClosing(false);
    });
  }, [dismissCartSheet]);

  const handleCloseShopSwitcher = () => {
    if (isShopClosing) return;
    setIsShopClosing(true);
    setTimeout(() => {
      setShowShopSwitcher(false);
      setIsShopClosing(false);
      setShopSearch('');
    }, 220);
  };

  const toastTimeoutRef = useRef(null);
  const showToast = useCallback((message, type = 'success', desc = '') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type, desc });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => (prev && prev.message === message ? null : prev));
    }, 2400);
  }, []);

  // Reset sheet styles on mount/open to avoid stuck transformed states
  useEffect(() => {
    if (selectedDishDetails && detailSheetRef.current) {
      detailSheetRef.current.style.transform = '';
      detailSheetRef.current.style.opacity = '1';
      detailSheetRef.current.style.transition = '';
    }
  }, [selectedDishDetails]);

  useEffect(() => {
    if (showCartDrawer && cartSheetRef.current) {
      cartSheetRef.current.style.transform = '';
      cartSheetRef.current.style.opacity = '1';
      cartSheetRef.current.style.transition = '';
    }
  }, [showCartDrawer]);

  // Register all Customer View Modals to Centralized Back Handler Stack
  useBackHandler(Boolean(selectedDishDetails), () => handleCloseDishDetail(), 'customer_dish_details', 5);
  useBackHandler(showCartDrawer, () => handleCloseCartDrawer(), 'customer_cart_drawer', 5);
  useBackHandler(isOrderHistoryOpen, () => setIsOrderHistoryOpen(false), 'customer_order_history', 5);
  useBackHandler(showShopSwitcher, () => handleCloseShopSwitcher(), 'customer_shop_switcher', 8);
  useBackHandler(isReviewModalOpen, () => setIsReviewModalOpen(false), 'customer_review_modal', 8);
  useBackHandler(Boolean(editingQuantityItem), () => setEditingQuantityItem(null), 'customer_qty_picker', 6);
  useBackHandler(showMapPicker, () => setShowMapPicker(false), 'customer_map_picker', 7);

  // Sync inputs with localStorage
  useEffect(() => {
    localStorage.setItem('customerName', checkoutName);
  }, [checkoutName]);
  useEffect(() => {
    localStorage.setItem('customerAddress', checkoutAddress);
  }, [checkoutAddress]);
  useEffect(() => {
    localStorage.setItem('customerPhone', checkoutPhone);
  }, [checkoutPhone]);

  // Set default active shop if none selected
  useEffect(() => {
    if (!selectedShopId && allShops.length > 0) {
      setSelectedShopId(allShops[0].id);
    }
  }, [allShops, selectedShopId, setSelectedShopId]);

  // Load & Realtime Sync menu items from Supabase database
  useEffect(() => {
    let isMounted = true;
    const shopKey = selectedShopId || 'all';

    // 1. Immediately hydrate from cache if available
    const cached = getLocalCustomerMenus(shopKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setMenuItems(cached);
    } else {
      setMenuLoading(true);
    }

    // 2. Fetch live items from Supabase foody_menus
    async function fetchLiveMenus() {
      try {
        const liveItems = await getCloudMenus(shopKey);
        if (isMounted && Array.isArray(liveItems)) {
          setMenuItems(liveItems);
          setLocalCustomerMenus(shopKey, liveItems);
        }
      } catch (err) {
        console.warn("Notice fetching cloud menus:", err?.message);
      } finally {
        if (isMounted) setMenuLoading(false);
      }
    }

    fetchLiveMenus();

    // 3. Supabase Postgres Realtime changes subscription on foody_menus
    const unsubscribeMenus = subscribeCloudMenus((incomingItem, eventType) => {
      if (!isMounted || !incomingItem) return;
      setMenuItems(prev => {
        let updatedList;
        if (eventType === 'DELETE') {
          updatedList = prev.filter(m => m.id !== incomingItem.id);
        } else {
          const index = prev.findIndex(m => m.id === incomingItem.id);
          if (index >= 0) {
            updatedList = [...prev];
            updatedList[index] = { ...updatedList[index], ...incomingItem };
          } else {
            updatedList = [incomingItem, ...prev];
          }
        }
        setLocalCustomerMenus(shopKey, updatedList);
        return updatedList;
      });
    });

    // 4. Also listen to window event for instant local multi-tab / in-app mutations
    const handleLocalMenuEvent = (e) => {
      if (!isMounted) return;
      const detail = e.detail;
      if (!detail) return;
      if (detail.deleted || detail.eventType === 'DELETE') {
        const delId = detail.itemId || detail.item?.id;
        if (delId) {
          setMenuItems(prev => {
            const updatedList = prev.filter(m => m.id !== delId);
            setLocalCustomerMenus(shopKey, updatedList);
            return updatedList;
          });
        }
      } else if (detail.item) {
        setMenuItems(prev => {
          let updatedList;
          const index = prev.findIndex(m => m.id === detail.item.id);
          if (index >= 0) {
            updatedList = [...prev];
            updatedList[index] = { ...updatedList[index], ...detail.item };
          } else {
            updatedList = [detail.item, ...prev];
          }
          setLocalCustomerMenus(shopKey, updatedList);
          return updatedList;
        });
      } else {
        fetchLiveMenus();
      }
    };

    window.addEventListener('foody_menus_changed', handleLocalMenuEvent);

    return () => {
      isMounted = false;
      if (typeof unsubscribeMenus === 'function') unsubscribeMenus();
      window.removeEventListener('foody_menus_changed', handleLocalMenuEvent);
    };
  }, [selectedShopId]);

  // Auto-switch to tracking view if trackingOrderId is set (Immediate Fetch + Supabase Realtime)
  useEffect(() => {
    if (!trackingOrderId) {
      setTrackingOrder(null);
      setIsTrackingModalOpen(false);
      return;
    }

    let isMounted = true;

    // 1. Immediate cloud fetch to display detailed view info without delay
    async function loadTargetOrder() {
      try {
        let orderRecord = null;

        // Try exact match first
        const { data, error } = await supabase
          .from('foody_orders')
          .select('*')
          .eq('id', trackingOrderId)
          .maybeSingle();

        if (data) {
          orderRecord = data;
        } else {
          // If not found and it's a short 5-character ID or substring, try ilike search
          const cleanSearch = trackingOrderId.replace(/[^a-zA-Z0-9-]/g, '');
          if (cleanSearch) {
            const { data: searchResults } = await supabase
              .from('foody_orders')
              .select('*')
              .ilike('id', `%${cleanSearch}%`)
              .limit(1);

            if (searchResults && searchResults.length > 0) {
              orderRecord = searchResults[0];
            }
          }

          // Fallback to local storage order history if offline or local mock
          if (!orderRecord) {
            try {
              const rawHist = localStorage.getItem('foody_orders_history');
              if (rawHist) {
                const hist = JSON.parse(rawHist);
                const found = hist.find(o =>
                  o.id === trackingOrderId ||
                  (o.id && o.id.toLowerCase().includes(trackingOrderId.toLowerCase()))
                );
                if (found) orderRecord = found;
              }
            } catch (_) { }
          }
        }

        if (orderRecord && isMounted) {
          const mapped = {
            ...orderRecord,
            id: orderRecord.id,
            shopId: orderRecord.shop_id || orderRecord.shopId,
            customerName: orderRecord.customer_name || orderRecord.customerName,
            customerPhone: orderRecord.customer_phone || orderRecord.customerPhone,
            customerAddress: orderRecord.customer_address || orderRecord.customerAddress,
            deliveryAddress: orderRecord.delivery_address || orderRecord.deliveryAddress,
            totalAmount: orderRecord.total_amount || orderRecord.totalAmount,
            cookingNotes: orderRecord.cooking_notes || orderRecord.cookingNotes,
            paymentMethod: orderRecord.payment_method || orderRecord.paymentMethod,
            deliveryCoordinates: orderRecord.delivery_coordinates || orderRecord.deliveryCoordinates,
            createdAt: orderRecord.created_at || orderRecord.createdAt,
            items: Array.isArray(orderRecord.items) ? orderRecord.items : []
          };
          setTrackingOrder(mapped);
          // Keep modal minimized on initial load/reload so the storefront stays clean and accessible
        }
      } catch (err) {
        console.warn('loadTargetOrder exception:', err);
      }
    }

    loadTargetOrder();

    // 2. Realtime WebSocket subscription for live status changes
    const unsubSupabase = subscribeSingleCloudOrder(trackingOrderId, (updatedOrder) => {
      if (!updatedOrder || !isMounted) return;
      setTrackingOrder(prev => ({ ...(prev || {}), ...updatedOrder }));
      if (updatedOrder.status === 'delivered' || updatedOrder.status === 'completed') {
        setTimeout(() => {
          setReviewOrderTarget(updatedOrder);
          setIsReviewModalOpen(true);
        }, 600);
      }
    });

    return () => {
      isMounted = false;
      if (unsubSupabase) unsubSupabase();
    };
  }, [trackingOrderId]);

  // Dynamic Shops handling


  useEffect(() => {
    const checkRiders = () => {
      try {
        const users = getCachedUsers() || [];
        const riders = users.filter(u => (u.role === 'delivery' || u.role === 'rider') && u.is_active !== false && u.isOnline !== false);
        setOnlineRidersCount(riders.length);
        if (riders.length === 0) {
          setFulfillmentType('pickup');
        }
      } catch (e) { }
    };
    checkRiders();
    const interval = setInterval(checkRiders, 15000);
    return () => clearInterval(interval);
  }, []);

  const activeShop = allShops.find(s => s.id === selectedShopId) || allShops[0] || {
    id: 'default-vrinda',
    name: 'Vrinda Cloud Kitchen',
    address: 'Near ISKCON Temple, Raman Reti, Vrindavan',
    minimumOrderAmount: 0,
    deliveryCharge: 0,
    gstPercentage: 5,
    isOpen: true,
    shopType: 'hotel',
    openingTime: '08:00',
    closingTime: '22:30'
  };

  const isShopOpen = isShopCurrentlyOpen(activeShop);

  const filteredShops = useMemo(() => {
    if (!shopSearch.trim()) return allShops || [];
    const q = shopSearch.toLowerCase().trim();
    return (allShops || []).filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q)) ||
      (s.city && s.city.toLowerCase().includes(q)) ||
      (s.area && s.area.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  }, [allShops, shopSearch]);
  const minOrderAmount = activeShop?.minimumOrderAmount || 0;
  const deliveryCharge = fulfillmentType === 'pickup' ? 0 : (activeShop?.deliveryCharge || 0);
  const gstPct = activeShop?.gstPercentage || 5;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gstAmount = Math.round(subtotal * (gstPct / 100));
  const totalAmount = subtotal > 0 ? (subtotal + deliveryCharge + gstAmount) : 0;
  const isBelowMin = subtotal < minOrderAmount && minOrderAmount > 0;

  const isRetailShop = activeShop?.shopType === 'shop' || activeShop?.shop_type === 'shop';
  const isPickupOrder = fulfillmentType === 'pickup';
  // Anti-Fake Order Policy: Retail Shops disable COD on pickup to avoid prepared food wastage
  const isCodAvailableForOrder = !(isRetailShop && isPickupOrder) && codAvailable;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return showToast('Basket is empty', 'error');
    if (!selectedShopId && allShops.length > 0) setSelectedShopId(allShops[0].id);

    // 1. Verify Kitchen is online and within operating schedule
    if (!isShopOpen) {
      return showToast(
        "Kitchen Closed / Offline",
        'error',
        `Operating Hours: ${activeShop?.openingTime || '08:00 AM'} – ${activeShop?.closingTime || '10:30 PM'}`
      );
    }

    // Seamless in-flow authentication for guest shoppers
    if (!isUserLoggedIn) {
      showToast("Sign in to Order", 'info');
      window.dispatchEvent(new CustomEvent('foody-open-auth'));
      return;
    }

    // Strict Field Validations with Visual Shake Feedback
    const cleanName = (checkoutName || '').trim();
    if (cleanName.length < 2 || !/^[a-zA-Z\s'.]+$/.test(cleanName)) {
      triggerShake('name');
      return showToast("Name required", 'error', 'Enter valid recipient name (letters only)');
    }

    const cleanPhone = (checkoutPhone || '').replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      triggerShake('phone');
      return showToast("Invalid Phone", 'error', 'Enter valid 10-digit mobile number');
    }

    const cleanAddress = fulfillmentType === 'pickup'
      ? `[Self-Pickup] Counter: ${activeShop?.name || 'Kitchen'}`
      : (checkoutAddress || '').trim();

    if (fulfillmentType === 'delivery') {
      if (cleanAddress.length < 4) {
        triggerShake('address');
        return showToast("Address required", 'error', 'Enter street or landmark name');
      }

      if (!deliveryCoords || typeof deliveryCoords.lat !== 'number' || typeof deliveryCoords.lng !== 'number') {
        triggerShake('address');
        return showToast("Pin Location", 'error', 'Please pin your delivery address on map');
      }
    }

    // 2. Anti-Fake Order Check for Shop Type Self-Pickup
    if (isRetailShop && isPickupOrder && paymentMethod === 'cash') {
      return showToast("Prepaid Order Required", 'error', 'Pickup from retail shop requires online payment confirmation to prevent uncollected waste.');
    }

    if (isBelowMin && fulfillmentType === 'delivery') {
      return showToast(`Min ₹${minOrderAmount}`, 'error', `Add ₹${minOrderAmount - subtotal} more`);
    }

    // Auto-save verified delivery details to local storage and user profile for instant 1-tap future checkout
    try {
      localStorage.setItem('customerName', cleanName);
      localStorage.setItem('customerPhone', cleanPhone);
      localStorage.setItem('customerAddress', cleanAddress);
      if (updateUserProfile && isUserLoggedIn) {
        updateUserProfile({
          displayName: cleanName,
          phone: cleanPhone,
          address: cleanAddress,
          customerAddress: cleanAddress
        });
      }
    } catch (err) {
      console.warn("Could not sync profile fields to storage:", err);
    }

    const orderPayload = {
      shopId: selectedShopId || (allShops[0]?.id || 'default-vrinda'),
      customerName: cleanName,
      customerAddress: cleanAddress,
      deliveryAddress: cleanAddress,
      customerPhone: cleanPhone,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        isCombo: Boolean(item.isCombo),
        comboItems: item.comboItems || null,
        ready: false
      })),
      subtotal,
      deliveryCharge,
      gstAmount,
      totalAmount,
      status: 'new',
      userId: user?.id || user?.uid || userData?.id || 'registered-customer',
      isTestOrder: false,
      paymentMethod,
      deliveryCoordinates: deliveryCoords,
      cookingNotes
    };

    if (paymentMethod === 'cash') {
      if (!codAvailable) return showToast("Cash on Delivery unavailable for this kitchen", 'error');
      orderPayload.cashStatus = 'pending';
      orderPayload.paymentId = null;

      try {
        const cloudOrder = await createCloudOrder(orderPayload);
        try {
          const sessionOrders = JSON.parse(localStorage.getItem('foody_my_session_orders') || '[]');
          if (cloudOrder?.id && !sessionOrders.includes(cloudOrder.id)) {
            sessionOrders.push(cloudOrder.id);
            localStorage.setItem('foody_my_session_orders', JSON.stringify(sessionOrders));
          }
        } catch (e) { }

        showToast("Order Placed!", 'success', 'Cash on Delivery');
        clearCart();
        setShowCartDrawer(false);
        setTrackingOrderId(cloudOrder.id);
        // Prompt for OS Notifications for real-time tracking
        requestSystemNotificationPermission();
      } catch (err) {
        console.error("Order placement error:", err);
        showToast("Order failed", 'error', 'Please try again');
      }
    } else {
      if (!onlineAvailable) return showToast("Online payment unavailable for this kitchen", 'error');

      const scriptLoaded = await loadRazorpay();
      if (!scriptLoaded) {
        return showToast("Gateway error", 'error', 'Failed to load Razorpay');
      }

      const rzpOptions = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_RU9lPJQl5wqQFM",
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        name: "Foody Vrinda",
        description: `Vrinda Prasad Order - ${currentCartShop?.name || 'Kitchen'}`,
        image: typeof window !== 'undefined' ? `${window.location.origin}/foody-vrinda-logo.webp` : "/foody-vrinda-logo.webp",
        handler: async (response) => {
          orderPayload.paymentId = response.razorpay_payment_id || `pay_${Date.now()}`;
          orderPayload.paymentIds = [response.razorpay_payment_id || `pay_${Date.now()}`];
          orderPayload.cashStatus = 'collected';

          try {
            const cloudOrder = await createCloudOrder(orderPayload);
            try {
              const sessionOrders = JSON.parse(localStorage.getItem('foody_my_session_orders') || '[]');
              if (cloudOrder?.id && !sessionOrders.includes(cloudOrder.id)) {
                sessionOrders.push(cloudOrder.id);
                localStorage.setItem('foody_my_session_orders', JSON.stringify(sessionOrders));
              }
            } catch (e) { }

            showToast("Order Placed!", 'success', 'Payment confirmed');
            clearCart();
            setShowCartDrawer(false);
            setTrackingOrderId(cloudOrder.id);
            // Prompt for OS Notifications for real-time tracking
            requestSystemNotificationPermission();
          } catch (cloudErr) {
            console.error(cloudErr);
            showToast("Payment recorded, finalizing order...", 'info');
          }
        },
        prefill: {
          name: checkoutName,
          email: user?.email || '',
          contact: checkoutPhone
        },
        theme: { color: "#E0FF33" },
        modal: {
          ondismiss: () => showToast("Payment cancelled", 'info')
        }
      };

      try {
        const razorpayInstance = new window.Razorpay(rzpOptions);
        razorpayInstance.on('payment.failed', function (resp) {
          showToast("Payment Failed", 'error', resp.error?.description || 'Gateway error');
        });
        razorpayInstance.open();
      } catch (e) {
        console.warn("Razorpay instance init sandbox fallback:", e);
        orderPayload.paymentId = `sim_online_${Date.now()}`;
        orderPayload.cashStatus = 'collected';
        const cloudOrder = await createCloudOrder(orderPayload);
        try {
          const sessionOrders = JSON.parse(localStorage.getItem('foody_my_session_orders') || '[]');
          if (cloudOrder?.id && !sessionOrders.includes(cloudOrder.id)) {
            sessionOrders.push(cloudOrder.id);
            localStorage.setItem('foody_my_session_orders', JSON.stringify(sessionOrders));
          }
        } catch (e) { }

        showToast("Order Placed!", 'success', 'Online Pay Confirmed');
        clearCart();
        setShowCartDrawer(false);
        setTrackingOrderId(cloudOrder.id);
      }
    }
  };

  // Nutrition calculator helper
  const getItemNutrition = (item) => {
    if (!item) return { kcal: '260 kcal', carbs: '45g', fat: '80g', protein: '35g' };
    if (item.kcal && item.carbs && item.fat && item.protein) {
      return {
        kcal: String(item.kcal).includes('kcal') ? item.kcal : `${item.kcal} kcal`,
        carbs: item.carbs,
        fat: item.fat,
        protein: item.protein
      };
    }
    const price = item.price || 140;
    const kcal = Math.round(200 + (price * 0.8));
    return {
      kcal: `${kcal} kcal`,
      carbs: `${Math.round(kcal * 0.14)}g`,
      fat: `${Math.round(kcal * 0.04)}g`,
      protein: `${Math.round(kcal * 0.05)}g`
    };
  };

  // Helper to get fallback cutout image if image fails or missing
  const getDishImage = (item, idx = 0) => {
    return resolveDishCutout(item?.image || item?.imageUrl, item?.name, item?.category);
  };

  // Map live database items into rich, responsive UI cards (memoized to eliminate mobile lag)
  const displayItems = useMemo(() => {
    return (menuItems || []).map((it, i) => ({
      ...it,
      image: resolveDishCutout(it.image || it.imageUrl, it.name, it.category),
      subtitle: it.subtitle || (it.category === 'Thali & Meals' ? 'Rich gravy, hot rotis' : (it.category === 'Sweets & Prasad' ? 'Desi ghee, saffron flavored' : 'Cheesy crisp, special price')),
      kcal: it.kcal || `${Math.round(220 + ((it.price || 140) * 0.8))} kcal`,
      carbs: it.carbs || `${Math.round(35 + (i * 4))}g`,
      fat: it.fat || `${Math.round(14 + (i * 3))}g`,
      protein: it.protein || `${Math.round(18 + (i * 4))}g`,
      tag: it.tag || (it.category === 'Sweets & Prasad' ? 'Sacred Prasad' : (it.category === 'Thali & Meals' ? 'Pure Desi Ghee' : 'Full Protein'))
    }));
  }, [menuItems]);

  // Dynamically compute categories from active items
  const dynamicCategories = useMemo(() => [
    'All',
    ...Array.from(new Set(displayItems.map(i => i.category).filter(Boolean)))
  ], [displayItems]);

  // Ensure we always have pleasant category chips
  const categories = useMemo(() => 
    dynamicCategories.length > 1 ? dynamicCategories : ['All', 'Snacks', 'Thali & Meals', 'Sweets & Prasad', 'Beverages']
  , [dynamicCategories]);

  // Filter menu items (instant sub-millisecond filtering)
  const filteredMenuItems = useMemo(() => {
    const search = menuSearch.toLowerCase().trim();
    const cat = selectedCategory.toLowerCase();
    return displayItems.filter(item => {
      const matchesSearch = !search ||
        (item.name && item.name.toLowerCase().includes(search)) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(search)) ||
        (item.description && item.description.toLowerCase().includes(search));
      const matchesCategory = cat === 'all' ||
        (item.category && item.category.toLowerCase() === cat);

      return matchesSearch && matchesCategory;
    });
  }, [displayItems, menuSearch, selectedCategory]);

  const handleOpenDishDetail = (item) => {
    if (!item) return;
    setIsDetailClosing(false);
    setSelectedDishDetails(item);
    const existingInCart = cart.find(c => c.id === item.id);
    setDetailQuantity(existingInCart ? existingInCart.quantity : 1);
  };

  const handleDetailAddToCart = () => {
    if (!selectedDishDetails) return;
    const existingInCart = cart.find(c => c.id === selectedDishDetails.id);
    const prevQty = existingInCart ? existingInCart.quantity : 0;

    setExactQuantity(selectedDishDetails.id, detailQuantity, selectedDishDetails);

    if (detailQuantity > 0) {
      if (prevQty > 0) {
        showToast(`Basket Updated · ${selectedDishDetails.name} (${detailQuantity})`, 'success', `₹${(selectedDishDetails.price || 0) * detailQuantity}`);
      } else {
        showToast(`+${detailQuantity} ${selectedDishDetails.name}`, 'success', `₹${(selectedDishDetails.price || 0) * detailQuantity}`);
      }
    } else {
      showToast(`Removed ${selectedDishDetails.name} from basket`, 'info');
    }
    setSelectedDishDetails(null);
  };

  // Desktop Spotlight Dish state (dynamically bound to live items)
  const [spotlightDishId, setSpotlightDishId] = useState(null);
  const [spotlightSize, setSpotlightSize] = useState('380g');
  const [spotlightQty, setSpotlightQty] = useState(1);
  const [spotlightAddons, setSpotlightAddons] = useState(['extra-paneer', 'fresh-tomato']);
  const [promocodeApplied, setPromocodeApplied] = useState(false);

  const toggleAddon = (addonId) => {
    setSpotlightAddons(prev =>
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  const spotlightDish = displayItems.find(i => i.id === spotlightDishId) || displayItems[0] || null;

  const handleSpotlightAddToCart = () => {
    if (!spotlightDish) return;
    for (let i = 0; i < spotlightQty; i++) {
      addToCart({
        ...spotlightDish,
        selectedSize: spotlightSize,
        selectedAddons: spotlightAddons
      });
    }
    showToast(`+${spotlightQty} ${spotlightDish.name}`, 'success', `₹${spotlightDish.price * spotlightQty}`);
  };

  const desktopDiscount = promocodeApplied ? Math.round(subtotal * 0.1) : 0;
  const desktopTotal = Math.max(0, subtotal - desktopDiscount + (subtotal > 0 ? deliveryCharge + gstAmount : 0));

  return (
    <div className="w-full flex-1 flex flex-col pb-6 text-white">
      {/* MAP PICKER MODAL */}
      {showMapPicker && (
        <MapPicker
          initialCoords={deliveryCoords}
          onLocationSelect={async (coords) => {
            setDeliveryCoords(coords);
            setShowMapPicker(false);
            showToast("Location Pinned", "success");
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`);
              const data = await res.json();
              if (data && (data.display_name || data.name)) {
                setCheckoutAddress(data.display_name || data.name);
              }
            } catch (e) {
              console.warn("Reverse geocoding error:", e);
            }
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {/* DYNAMIC UNIFIED LOCATION & SEARCH BAR (Apple HIG Clean Standard) */}
      <div className="relative mb-4 sm:mb-6 z-30 space-y-3">
        {/* Top Control Strip: Branch Selector Pill + Orders History Button */}
        <div className="flex items-center gap-2 sm:gap-3 justify-between w-full">
          <button
            onClick={() => allShops.length > 1 && (showShopSwitcher ? handleCloseShopSwitcher() : setShowShopSwitcher(true))}
            className={`flex-1 min-w-0 h-11 flex items-center gap-2 bg-stone-200/90 dark:bg-[#282526] hover:bg-stone-300 dark:hover:bg-[#322E30] border border-stone-300 dark:border-white/10 px-3.5 rounded-full text-xs shadow-xs transition-all apple-tap-target ${allShops.length > 1 ? 'cursor-pointer' : 'cursor-default'}`}
            title={allShops.length > 1 ? "Switch Kitchen Branch" : "Current Branch"}
          >
            <MapPin size={15} className="text-amber-600 dark:text-[#E0FF33] flex-shrink-0" />
            <span className="font-bold text-stone-900 dark:text-white text-xs sm:text-sm truncate flex-1 text-left min-w-0">
              {activeShop?.name || 'Vrinda Cloud Kitchen'}
            </span>
            {activeShop?.estimatedWaitTime && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 dark:text-zinc-400 bg-stone-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                {activeShop.estimatedWaitTime} min
              </span>
            )}
            {allShops.length > 1 && (
              <ChevronDown size={14} className={`text-stone-500 dark:text-zinc-400 flex-shrink-0 transition-transform duration-200 ${showShopSwitcher && !isShopClosing ? 'rotate-180' : ''}`} />
            )}
          </button>

          {/* My Orders Button */}
          <button
            onClick={() => setIsOrderHistoryOpen(true)}
            className="h-11 px-3.5 sm:px-4 rounded-full bg-stone-200/90 dark:bg-[#282526] hover:bg-stone-300 dark:hover:bg-[#322E30] active:scale-95 text-stone-800 dark:text-white border border-stone-300 dark:border-white/10 text-xs font-bold shadow-xs transition-all cursor-pointer apple-tap-target flex items-center gap-1.5 shrink-0"
            title="Past Orders & Tracking"
          >
            <History size={15} className="text-amber-600 dark:text-[#E0FF33]" />
            <span className="hidden sm:inline">My Orders</span>
          </button>
        </div>

        {/* Global Shop Offline / Closed Warning Indicator */}
        {!isShopOpen && (
          <div className="p-2.5 sm:p-3 rounded-2xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 flex items-center justify-between gap-2 sm:gap-3 text-red-700 dark:text-red-300 text-xs shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="font-bold truncate text-[11px] sm:text-xs">
                {activeShop?.name || 'Kitchen'} is currently Closed
              </span>
            </div>
            <span className="text-[10px] font-bold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-950/50 px-2 py-0.5 rounded-full border border-red-500/25 shrink-0 whitespace-nowrap">
              {activeShop?.openingTime || '08:00'} – {activeShop?.closingTime || '22:30'}
            </span>
          </div>
        )}

        {/* Integrated Clean Search Bar */}
        <div className="relative w-full">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 dark:text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search pure delicacies & prasad..."
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
            className="w-full h-11 bg-stone-200/90 dark:bg-[#252223] border border-stone-300 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-white/20 focus:border-amber-600 dark:focus:border-[#E0FF33]/70 rounded-full pl-10 pr-10 text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-500 dark:placeholder-zinc-400 shadow-inner focus:outline-none transition-all font-medium"
          />
          {menuSearch && (
            <button
              onClick={() => setMenuSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-stone-300 dark:bg-white/20 flex items-center justify-center text-stone-800 dark:text-white cursor-pointer active:scale-90"
              title="Clear search"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Dynamic Shops Modal (Portaled to prevent any background layout shift or document scroll height expansion) */}
        {showShopSwitcher && allShops.length > 1 && createPortal(
          <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 apple-overlay ${isShopClosing ? 'closing' : ''}`}
            onClick={handleCloseShopSwitcher}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-xl max-h-[88vh] flex flex-col bg-white dark:bg-[#242021] border border-stone-200 dark:border-white/10 rounded-[32px] sm:rounded-[36px] shadow-2xl apple-modal-spring overflow-hidden ${isShopClosing ? 'closing' : ''}`}
            >
              {/* Header */}
              <div className="p-4 sm:p-5 pb-3 border-b border-stone-200/80 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/15 dark:bg-[#E0FF33]/15 border border-amber-500/30 dark:border-[#E0FF33]/30 flex items-center justify-center text-amber-600 dark:text-[#E0FF33] shrink-0 shadow-inner">
                    <Store size={18} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white font-['Outfit'] uppercase tracking-wide truncate">
                      Select Kitchen Branch
                    </h3>
                    <p className="text-[11px] font-medium text-stone-500 dark:text-zinc-400">
                      {allShops.length} Cloud Kitchens in Vrindavan Dham
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCloseShopSwitcher}
                  className="w-8 h-8 rounded-full bg-stone-200/90 dark:bg-white/10 hover:bg-stone-300 dark:hover:bg-white/20 flex items-center justify-center text-stone-700 dark:text-zinc-300 cursor-pointer apple-tap-target transition-colors shrink-0"
                  title="Close branch selector"
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </div>

              {/* Integrated Search Bar inside Modal */}
              <div className="p-3 sm:px-5 sm:py-3.5 bg-stone-50/80 dark:bg-[#1E1B1C]/80 border-b border-stone-200/60 dark:border-white/5 space-y-2">
                <div className="relative w-full">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    value={shopSearch}
                    onChange={(e) => setShopSearch(e.target.value)}
                    placeholder="Search kitchen branch by name, area or temple..."
                    className="w-full h-10 bg-white dark:bg-[#2D292A] border border-stone-300 dark:border-white/10 focus:border-amber-600 dark:focus:border-[#E0FF33] rounded-full pl-9 pr-9 text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-zinc-500 focus:outline-none transition-all shadow-inner font-medium"
                    autoFocus
                  />
                  {shopSearch && (
                    <button
                      onClick={() => setShopSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-stone-200 dark:bg-white/20 flex items-center justify-center text-stone-700 dark:text-white cursor-pointer active:scale-90"
                      title="Clear search"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>

                {/* Filter count & quick stats */}
                <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-zinc-400 px-1">
                  <span>
                    {shopSearch ? (
                      <>Found <strong className="text-stone-800 dark:text-[#E0FF33]">{filteredShops.length}</strong> of {allShops.length} kitchens</>
                    ) : (
                      <>Showing all <strong>{allShops.length}</strong> available kitchens</>
                    )}
                  </span>
                  {activeShop && (
                    <span className="truncate max-w-[180px] text-right">
                      Active: <strong className="text-amber-600 dark:text-[#E0FF33]">{activeShop.name}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Scrollable Shop List */}
              <div className="p-3 sm:p-5 flex-1 overflow-y-auto no-scrollbar space-y-2.5 max-h-[380px] sm:max-h-[420px]">
                {filteredShops.length === 0 ? (
                  <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 flex items-center justify-center text-stone-400 dark:text-zinc-500">
                      <Store size={22} />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-stone-800 dark:text-zinc-200">
                        No kitchen found matching &ldquo;{shopSearch}&rdquo;
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-zinc-400 mt-0.5">
                        Try searching with a different temple name or location
                      </p>
                    </div>
                    <button
                      onClick={() => setShopSearch('')}
                      className="px-4 py-2 rounded-full bg-stone-900 text-white dark:bg-[#E0FF33] dark:text-stone-950 font-bold text-xs shadow-sm hover:scale-102 active:scale-95 transition-all cursor-pointer"
                    >
                      Show All Branches
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredShops.map(s => {
                      const isSelected = s.id === selectedShopId;
                      const isOpen = isShopCurrentlyOpen(s);

                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedShopId(s.id);
                            handleCloseShopSwitcher();
                            showToast(s.name, 'info');
                          }}
                          className={`p-3.5 rounded-2xl flex flex-col justify-between gap-2.5 cursor-pointer transition-all apple-tap-target border relative ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-600 dark:bg-[#E0FF33]/10 dark:border-[#E0FF33] shadow-md ring-1 ring-amber-500/30 dark:ring-[#E0FF33]/30'
                              : 'bg-stone-50 dark:bg-[#1E1B1C] text-stone-800 dark:text-white hover:bg-stone-100 dark:hover:bg-[#282526] border-stone-200 dark:border-white/10 shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white truncate">
                                  {s.name}
                                </p>
                              </div>
                              <p className="text-[11px] text-stone-500 dark:text-zinc-400 mt-1 line-clamp-1 flex items-center gap-1">
                                <MapPin size={11} className="shrink-0 text-stone-400 dark:text-zinc-500" />
                                <span className="truncate">{s.address || 'Sri Vrindavan Dham'}</span>
                              </p>
                            </div>

                            {isSelected && (
                              <span className="text-[10px] font-black bg-stone-900 text-white dark:bg-[#E0FF33] dark:text-stone-950 px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 shadow-xs">
                                <Check size={11} strokeWidth={3} />
                                <span>Active</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-stone-200/60 dark:border-white/5 text-stone-500 dark:text-zinc-400">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock size={11} className="text-amber-500 dark:text-[#E0FF33]" />
                              {s.estimatedWaitTime ? `${s.estimatedWaitTime} min prep` : '15-20 min prep'}
                            </span>
                            <span className={`font-semibold px-2 py-0.5 rounded-full ${isOpen ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                              {isOpen ? 'Accepting Orders' : 'Currently Closed'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* HORIZONTAL CATEGORY PILL CHIPS (Sticky Navigation Bar) */}
      <div className="sticky-category-bar sticky top-0 z-20 -mx-3 px-3 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 py-2 mb-4 sm:mb-6 bg-[#FAF7F2]/95 dark:bg-[#1E1B1C]/95 transition-all">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`h-9 sm:h-10 px-4 sm:px-5 rounded-full text-xs font-bold transition-all cursor-pointer flex-shrink-0 apple-tap-target flex items-center justify-center touch-manipulation active:scale-95 ${isSelected
                    ? 'category-pill-active bg-stone-900 text-white dark:bg-[#E0FF33] dark:text-[#121011] font-black shadow-xs scale-[1.02]'
                    : 'bg-stone-200/90 hover:bg-stone-300 text-stone-800 dark:bg-[#282526] dark:hover:bg-[#322E30] dark:text-zinc-200 dark:hover:text-white border border-stone-300/80 dark:border-white/10 shadow-xs'
                  }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. ACTIVE ORDER TRACKING BANNER (IF ANY) */}
      {trackingOrder && (
        <div className="mb-6 bg-stone-100/95 dark:bg-[#282526] border border-stone-200/90 dark:border-[#E0FF33]/30 rounded-3xl p-4 sm:p-5 shadow-sm dark:shadow-2xl relative apple-modal-spring overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            {/* Left: Icon & Status Text */}
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 dark:bg-[#E0FF33]/15 border border-amber-500/30 dark:border-[#E0FF33]/30 flex items-center justify-center text-amber-700 dark:text-[#E0FF33] shrink-0 shadow-inner">
                <Navigation className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase text-amber-800 dark:text-[#E0FF33] bg-amber-500/15 dark:bg-[#E0FF33]/10 px-3 py-0.5 rounded-full border border-amber-500/30 dark:border-[#E0FF33]/20">
                    Active Order #{trackingOrder.id ? trackingOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ORDER'}
                  </span>
                  <span className="text-xs font-bold text-stone-600 dark:text-zinc-400 capitalize">
                    • {trackingOrder.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-black text-stone-900 dark:text-white font-['Outfit'] truncate">
                  {trackingOrder.status === 'out_for_delivery'
                    ? 'Rider is on the way to your location!'
                    : trackingOrder.status === 'completed'
                      ? 'Order delivered successfully!'
                      : 'Order is being prepared in the kitchen.'}
                </p>
              </div>

              {/* Close Button on mobile (visible top right) */}
              <button
                onClick={() => {
                  setTrackingOrderId(null);
                  setIsTrackingModalOpen(false);
                }}
                className="sm:hidden w-8 h-8 rounded-full bg-stone-200/90 hover:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/20 text-stone-700 hover:text-stone-950 dark:text-zinc-300 dark:hover:text-white flex items-center justify-center border border-stone-300/80 dark:border-white/10 shadow-xs shrink-0 cursor-pointer transition-all active:scale-90 apple-tap-target"
                title="Dismiss banner"
                aria-label="Dismiss tracking banner"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {(trackingOrder.status === 'delivered' || trackingOrder.status === 'completed') && (
                <button
                  onClick={() => {
                    setReviewOrderTarget(trackingOrder);
                    setIsReviewModalOpen(true);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-full bg-amber-500 dark:bg-[#E0FF33] text-white dark:text-[#1E1B1C] font-black text-xs hover:bg-amber-600 dark:hover:bg-[#ccff00] shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer font-['Outfit']"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Rate & Review</span>
                </button>
              )}
              <button
                onClick={() => setIsTrackingModalOpen(true)}
                className="flex-1 sm:flex-initial px-4 py-2 sm:py-2.5 rounded-full bg-stone-900 hover:bg-black text-white dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] dark:text-[#121011] font-black text-xs shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer font-['Outfit']"
              >
                <span className="w-5 h-5 rounded-full bg-white/20 dark:bg-black/15 flex items-center justify-center shrink-0">
                  <Navigation className="w-3 h-3 text-white dark:text-[#121011] fill-current" />
                </span>
                <span>Live Map Track</span>
              </button>
              <button
                onClick={() => {
                  setTrackingOrderId(null);
                  setIsTrackingModalOpen(false);
                }}
                className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-200/90 hover:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/20 text-stone-700 hover:text-stone-950 dark:text-zinc-300 dark:hover:text-white items-center justify-center border border-stone-300/80 dark:border-white/10 shadow-xs apple-tap-target cursor-pointer shrink-0 transition-all active:scale-90"
                title="Dismiss banner"
                aria-label="Dismiss tracking banner"
              >
                <X className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. FOOD CARDS RESPONSIVE FEED (1-col mobile, 2-col tablet, 3-col desktop) */}
      {menuLoading ? (
        <div className="flex justify-center py-20 sm:py-24">
          <BouncingLoader />
        </div>
      ) : filteredMenuItems.length === 0 ? (
        <div className="bg-stone-100 dark:bg-[#282526] rounded-[32px] sm:rounded-[36px] p-12 sm:p-16 text-center text-stone-600 dark:text-zinc-400 border border-stone-200 dark:border-white/5 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-stone-200/80 dark:bg-white/5 flex items-center justify-center mb-3">
            <Soup size={32} className="text-amber-600 dark:text-[#E0FF33]" />
          </div>
          <p className="font-black text-stone-900 dark:text-white text-base sm:text-lg">No items found</p>
          <p className="text-xs text-stone-500 dark:text-zinc-500 mt-1">Try searching for other pure delicacies.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
          {filteredMenuItems.map((item, idx) => {
            const isFav = favorites.includes(item.id);
            const cartItem = cart.find(c => c.id === item.id);
            const quantityInCart = cartItem ? cartItem.quantity : 0;

            return (
              <div
                key={item.id}
                onClick={() => handleOpenDishDetail(item)}
                style={{ animationDelay: `${idx * 40}ms` }}
                className={`bg-white dark:bg-[#282526] border rounded-3xl p-5 sm:p-6 relative overflow-hidden cursor-pointer min-h-[200px] sm:min-h-[220px] flex flex-col justify-between apple-card-interactive transition-all duration-300 customer-card-pop ${
                  quantityInCart > 0
                    ? 'border-amber-500/40 dark:border-white/20 bg-stone-50/70 dark:bg-[#2c282a] shadow-md dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]'
                    : 'border-stone-200/90 dark:border-white/10 shadow-sm dark:shadow-xl'
                }`}
              >
                {/* Top Row: Dish Name + Combo Tag + Outline Heart Button */}
                <div className="flex justify-between items-start z-10 gap-2">
                  <div className="max-w-[62%]">
                    {item.isCombo && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-900 dark:bg-stone-800 text-[#E0FF33] text-[11px] font-bold uppercase tracking-wider mb-1.5 shadow-xs">
                        <Sparkles size={11} className="text-[#E0FF33]" />
                        {item.tag || 'Combo Offer'}
                      </span>
                    )}
                    <h3 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white leading-snug tracking-tight">
                      {item.name}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-stone-500 dark:text-zinc-400 mt-0.5 line-clamp-1 leading-normal">
                      {item.subtitle || 'Authentic Satvik preparation'}
                    </p>
                    {item.comboItems && item.comboItems.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.comboItems.map((ci, cidx) => (
                          <span key={cidx} className="text-[11px] font-semibold bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 px-2 py-0.5 rounded-md border border-stone-200/60 dark:border-white/5">
                            + {ci}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => toggleFavorite(item.id, e)}
                    className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800/90 border border-stone-200/60 dark:border-white/10 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer apple-tap-target sm:hover:scale-105 active:scale-95"
                    title="Favorite"
                  >
                    <Heart
                      size={17}
                      className={isFav ? 'text-red-500 fill-red-500' : 'text-stone-700 dark:text-stone-300'}
                    />
                  </button>
                </div>

                {/* Mid & Bottom Row: Price & Order Now / Stepper Button */}
                <div className="mt-3 sm:mt-4 z-10">
                  {(() => {
                    const activePrice = quantityInCart > 0 ? item.price * quantityInCart : item.price;
                    const hasDiscount = Boolean(item.originalPrice && Number(item.originalPrice) > Number(item.price));
                    const activeOriginalPrice = hasDiscount 
                      ? (quantityInCart > 0 ? item.originalPrice * quantityInCart : item.originalPrice)
                      : null;

                    return (
                      <div className="flex items-baseline gap-2 mb-2 sm:mb-3">
                        <span className={`text-xl sm:text-2xl font-black font-['Outfit'] transition-colors duration-150 ${
                          quantityInCart > 0 ? 'text-amber-600 dark:text-[#E0FF33]' : 'text-stone-900 dark:text-white'
                        }`}>
                          ₹{activePrice}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs sm:text-sm font-medium text-stone-400 dark:text-zinc-500 line-through font-['Outfit']">
                            ₹{activeOriginalPrice}
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {quantityInCart === 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                        showToast(`+1 ${item.name}`, 'success', `₹${item.price}`);
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="h-10 sm:h-11 bg-stone-900 hover:bg-black dark:bg-[#E0FF33] dark:hover:bg-[#d4f526] text-white dark:text-stone-950 font-bold text-xs sm:text-sm px-4 sm:px-5 rounded-full inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer apple-tap-target active:scale-95 touch-manipulation font-['Outfit']"
                    >
                      <span>Order Now</span>
                      <ChevronRight size={14} strokeWidth={3} />
                    </button>
                  ) : (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="h-10 sm:h-11 inline-flex items-center bg-stone-900 dark:bg-[#1E1B1C] border border-stone-800 dark:border-white/10 rounded-full p-1 shadow-md select-none touch-manipulation"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, -1);
                          if (quantityInCart === 1) {
                            showToast(`Removed ${item.name}`, 'info', 'From basket');
                          } else {
                            showToast(`${item.name} (${quantityInCart - 1})`, 'info', `₹${item.price * (quantityInCart - 1)}`);
                          }
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-800 dark:bg-white/10 hover:bg-stone-700 dark:hover:bg-white/20 active:scale-85 active:bg-red-500/25 flex items-center justify-center transition-all cursor-pointer touch-manipulation apple-tap-target shrink-0"
                        title={quantityInCart === 1 ? "Remove item" : "Decrease quantity"}
                        aria-label="Decrease quantity"
                      >
                        {quantityInCart === 1 ? (
                          <Trash2 size={15} strokeWidth={2.5} className="text-red-400" />
                        ) : (
                          <Minus size={15} strokeWidth={3} className="text-white" />
                        )}
                      </button>

                      <span className="px-2.5 sm:px-3 text-xs sm:text-sm font-extrabold text-white font-['Outfit'] min-w-[28px] sm:min-w-[32px] text-center select-none">
                        {quantityInCart}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item);
                          showToast(`+1 ${item.name}`, 'success', `₹${item.price * (quantityInCart + 1)}`);
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-500 hover:bg-amber-600 dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] active:scale-85 flex items-center justify-center transition-all cursor-pointer shadow-sm text-stone-950 font-black touch-manipulation apple-tap-target shrink-0"
                        title="Add another"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} strokeWidth={3.5} className="text-white dark:text-stone-950 stroke-current" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Side Dish Image - Pristine Transparent Cutout */}
                <div className="absolute right-[-8px] bottom-[-8px] sm:right-[-6px] sm:bottom-[-6px] w-36 h-36 xs:w-40 xs:h-40 sm:w-44 sm:h-44 md:w-44 md:h-44 lg:w-44 lg:h-44 xl:w-48 xl:h-48 pointer-events-none flex items-center justify-center">
                  <img
                    src={resolveDishCutout(item.image, item.name, item.category)}
                    alt={item.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = resolveDishCutout('', item.name, item.category);
                    }}
                    className={`w-full h-full object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_12px_20px_rgba(0,0,0,0.45)] select-none pointer-events-none transition-transform duration-300 ${quantityInCart > 0 ? 'scale-110 sm:scale-115' : 'scale-105 sm:scale-110'}`}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sleek Native Mobile End-of-Feed Signature */}
      <div className="w-full text-center select-none pt-6 pb-28 sm:pb-32 space-y-1 opacity-70 hover:opacity-100 transition-opacity mt-auto">
        <div className="flex items-center justify-center gap-2">
          <span className="font-laila text-xs font-bold text-amber-700 dark:text-[#E0FF33]">
            वृन्दोपनिषद्
          </span>
          <span className="text-stone-400 dark:text-zinc-600 text-[10px]">•</span>
          <span className="text-xs text-stone-700 dark:text-zinc-400 font-semibold font-['Outfit']">
            Foody Vrinda · Sri Vrindavan Dham
          </span>
        </div>
        <p className="text-[10px] text-stone-600 dark:text-zinc-400 font-medium">
          100% Satvik Pure Cloud Kitchen · Radhe Radhe 🙏
        </p>
      </div>

      {/* BOTTOM FLOATING HUD STACK (Active Order Tracker + Dynamic Cart Capsule - Non-overlapping) */}
      {((!isTrackingModalOpen && trackingOrder) || cart.length > 0) && (
        <div
          style={{
            bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))'
          }}
          className="fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-28px)] sm:w-auto sm:min-w-[400px] max-w-[480px] flex flex-col items-center gap-2.5 pointer-events-none select-none transition-all duration-300"
        >
          {/* Active Order Activity Capsule */}
          {!isTrackingModalOpen && trackingOrder && (
            <div className="pointer-events-auto w-auto flex justify-center animate-fadeIn">
              <ActiveOrderCapsule
                order={trackingOrder}
                allShops={allShops}
                isEmbedded={true}
                onClick={() => setIsTrackingModalOpen(true)}
              />
            </div>
          )}

          {/* Floating Cart Bar */}
          {cart.length > 0 && (
            <div className="pointer-events-auto w-full animate-slide-up">
              <div
                onClick={() => setShowCartDrawer(true)}
                className="bg-white/95 dark:bg-[#1E1B1C]/95 border border-stone-200 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-[#E0FF33]/40 rounded-full p-2 pl-3.5 sm:pl-4 pr-2 shadow-[0_10px_30px_rgba(28,25,23,0.1)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3 cursor-pointer backdrop-blur-2xl transition-all active:scale-[0.98] group"
              >
                {/* Left: Icon + Quantity Badge + Price */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-[#282526] border border-stone-200/80 dark:border-white/10 flex items-center justify-center text-amber-600 dark:text-[#E0FF33] shadow-xs group-hover:bg-stone-200 dark:group-hover:bg-[#322E30] transition-colors">
                      <ShoppingBag size={18} />
                    </div>
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-amber-500 dark:bg-[#E0FF33] text-white dark:text-black text-xs font-black rounded-full flex items-center justify-center font-['Outfit'] border-2 border-white dark:border-[#1E1B1C] shadow-xs leading-none">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                      <span className="text-sm sm:text-base font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight">
                        ₹{totalAmount}
                      </span>
                      <span className="text-xs font-bold text-stone-500 dark:text-zinc-400">
                        · {cart.reduce((s, i) => s + i.quantity, 0)} {cart.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <p className="hidden sm:block text-xs text-amber-700 dark:text-[#E0FF33] font-bold truncate tracking-wide">
                      {activeShop?.name || 'Vrinda Prasad'} Basket
                    </p>
                  </div>
                </div>

                {/* Right: Single-Line CTA Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCartDrawer(true);
                  }}
                  className="h-10 sm:h-11 px-4 sm:px-5 rounded-full bg-amber-600 hover:bg-amber-700 dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] text-white dark:text-[#1E1B1C] font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md flex-shrink-0 whitespace-nowrap active:scale-95 transition-all cursor-pointer font-['Outfit']"
                >
                  <span>View Basket</span>
                  <ChevronRight size={14} strokeWidth={3} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. PRODUCT DETAIL MODAL / SHEET (Industry Standard Native Sheet: Fluid Drag & Luxury Aesthetic) */}
      {selectedDishDetails && (
        <div
          ref={detailOverlayRef}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseDishDetail();
          }}
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-xs transition-opacity duration-200 apple-overlay ${isDetailClosing ? 'closing opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <div
            ref={detailSheetRef}
            style={detailSheetStyle}
            className={`bg-[#1E1B1C] w-full max-w-[480px] md:max-w-3xl lg:max-w-4xl rounded-t-[36px] sm:rounded-[36px] overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.9)] flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] border border-white/10 relative apple-sheet-spring ${isDraggingDetail ? 'sheet-dragging' : ''}`}
          >

            {/* Close Button (Desktop Only) */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleCloseDishDetail();
              }}
              className="hidden md:flex absolute top-5 right-5 z-30 w-9 h-9 rounded-full bg-[#282526] hover:bg-[#322E30] active:scale-95 text-zinc-400 hover:text-white items-center justify-center transition-all cursor-pointer border border-white/10 shadow-md"
              title="Close (Esc)"
            >
              <X size={17} />
            </button>

            {/* LEFT / TOP HERO SECTION: Showcase Image + Interactive Drag Zone */}
            <div
              className="w-full md:w-[46%] lg:w-[44%] bg-[#242021] md:bg-[#1A1819] p-4 sm:p-6 flex flex-col justify-between relative flex-shrink-0 border-b md:border-b-0 md:border-r border-white/5"
            >
              {/* Drag Handle Bar (Interactive Drag Down Indicator - Mobile Only) */}
              <div
                {...detailHandleProps}
                className="w-full py-2 -mt-2 mb-1 flex items-center justify-center md:hidden cursor-grab active:cursor-grabbing touch-none select-none"
                title="Swipe down to dismiss"
              >
                <div className="w-12 h-1.5 bg-white/20 hover:bg-white/30 rounded-full pointer-events-none transition-colors" />
              </div>

              {/* Top Navigation Row on Mobile (Back, Share, Favorite) */}
              <div className="flex justify-between items-center z-30 mb-2 relative pointer-events-auto">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseDishDetail();
                  }}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 shadow-sm flex items-center justify-center text-zinc-200 hover:text-white transition-all cursor-pointer font-black md:hidden relative z-50 pointer-events-auto"
                  title="Go Back"
                >
                  <ChevronLeft size={20} strokeWidth={2.5} />
                </button>

                <div className="flex items-center gap-2 ml-auto relative z-50 pointer-events-auto">
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (navigator.share) {
                        navigator.share({
                          title: selectedDishDetails.name,
                          text: `Check out ${selectedDishDetails.name} on Foody Vrinda!`,
                          url: window.location.href
                        }).catch(err => {
                          if (err.name !== 'AbortError') {
                            try {
                              navigator.clipboard?.writeText?.(window.location.href);
                              showToast("Link Copied to Clipboard", "success");
                            } catch {
                              showToast("Vrinda Dish Shared", "success");
                            }
                          }
                        });
                      } else {
                        try {
                          navigator.clipboard?.writeText?.(window.location.href);
                          showToast("Link Copied to Clipboard", "success");
                        } catch {
                          showToast("Vrinda Dish Shared", "success");
                        }
                      }
                    }}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 shadow-sm flex items-center justify-center text-zinc-200 hover:text-white transition-all cursor-pointer relative z-50 pointer-events-auto"
                    title="Share"
                  >
                    <Share2 size={16} />
                  </button>

                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const isNowFav = !favorites.includes(selectedDishDetails.id);
                      toggleFavorite(selectedDishDetails.id);
                      showToast(isNowFav ? "Added to Favorites" : "Removed from Favorites", "info");
                    }}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 shadow-sm flex items-center justify-center transition-all cursor-pointer relative z-50 pointer-events-auto"
                    title="Favorite"
                  >
                    <Heart
                      size={17}
                      className={favorites.includes(selectedDishDetails.id) ? 'text-red-500 fill-red-500' : 'text-zinc-300'}
                    />
                  </button>
                </div>
              </div>

              {/* Hero Image Showcase */}
              <div
                {...detailHandleProps}
                className="relative py-2 my-auto flex items-center justify-center min-h-[140px] xs:min-h-[160px] sm:min-h-[190px] md:min-h-[240px] cursor-grab active:cursor-grabbing touch-none select-none"
              >
                {/* Soft ambient plate glow */}
                <div className="absolute inset-0 bg-radial from-[#E0FF33]/5 via-transparent to-transparent rounded-full pointer-events-none blur-xl" />

                <div className="w-40 h-36 xs:w-48 xs:h-40 sm:w-56 sm:h-48 md:w-64 md:h-60 relative flex items-center justify-center pointer-events-none">
                  <img
                    src={resolveDishCutout(selectedDishDetails.image, selectedDishDetails.name, selectedDishDetails.category)}
                    alt={selectedDishDetails.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = resolveDishCutout('', selectedDishDetails.name, selectedDishDetails.category);
                    }}
                    className="w-full h-full object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.5)] select-none pointer-events-none"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                {/* Floating Tag Pill */}
                <div className="absolute bottom-0 left-0 sm:bottom-1 sm:left-1 z-10 flex items-center pointer-events-none">
                  <span className="bg-[#282526] text-[#E0FF33] text-[10px] sm:text-xs font-black px-2.5 sm:px-3 py-1 rounded-full shadow-md border border-[#E0FF33]/20 flex items-center gap-1">
                    <Sparkles size={11} className="shrink-0" />
                    <span>{selectedDishDetails.tag || (selectedDishDetails.category === 'Sweets & Prasad' ? 'Sacred Prasad' : '100% Pure Satvik')}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT / BOTTOM CONTENT & ACTION DOCK */}
            <div className="w-full md:w-[54%] lg:w-[56%] bg-[#1E1B1C] text-white flex-1 flex flex-col justify-between min-h-0 overflow-hidden z-10">
              
              {/* Scrollable Information Body */}
              <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-3 sm:space-y-4 no-scrollbar">
                
                {/* Dish Header: Category + Live In-Basket pill */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#E0FF33] text-[11px] sm:text-xs font-black uppercase tracking-wider bg-[#E0FF33]/10 px-2.5 py-0.5 rounded-full border border-[#E0FF33]/20">
                      {selectedDishDetails.category || "Vrinda Meal"}
                    </span>
                    <span className="text-zinc-500 text-xs">•</span>
                    <span className="text-zinc-400 text-xs font-bold">100% Vedic Pure</span>
                  </div>

                  {cart.find(c => c.id === selectedDishDetails.id)?.quantity > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[11px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {cart.find(c => c.id === selectedDishDetails.id).quantity} in basket
                    </span>
                  )}
                </div>

                {/* Dish Name */}
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight font-['Outfit']">
                  {selectedDishDetails.name}
                </h2>

                {/* Price & Clean Energy Row */}
                <div className="flex justify-between items-center py-1 border-y border-white/5">
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl sm:text-3xl font-black text-[#E0FF33] font-['Outfit']">
                      ₹{selectedDishDetails.price}
                    </div>
                    {selectedDishDetails.originalPrice && selectedDishDetails.originalPrice > selectedDishDetails.price && (
                      <span className="text-sm font-bold text-zinc-500 line-through">
                        ₹{selectedDishDetails.originalPrice}
                      </span>
                    )}
                  </div>

                  {/* Clean, Non-Exaggerated Nutrition Indicator */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[11px] sm:text-xs font-bold text-amber-400">
                    <Flame size={13} className="text-amber-400 fill-amber-400/20" />
                    <span>Pure Desi Ghee</span>
                  </div>
                </div>

                {/* Bundled Combo Items Breakdown (if combo) */}
                {selectedDishDetails.comboItems && selectedDishDetails.comboItems.length > 0 && (
                  <div className="bg-[#242021] border border-[#E0FF33]/20 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs font-black uppercase text-[#E0FF33] tracking-wider flex items-center gap-1.5">
                        <Sparkles size={12} />
                        Included in this Combo Pack
                      </span>
                      {selectedDishDetails.tag && (
                        <span className="text-[9px] font-bold bg-[#E0FF33]/15 text-[#E0FF33] px-2 py-0.5 rounded-full">
                          {selectedDishDetails.tag}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                      {selectedDishDetails.comboItems.map((ci, cidx) => (
                        <div key={cidx} className="flex items-center gap-2 text-xs text-neutral-200 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                          <Check size={12} className="text-[#E0FF33] shrink-0 stroke-[3]" />
                          <span className="font-semibold">{ci}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <h4 className="text-[10px] sm:text-xs font-black uppercase text-zinc-400 tracking-wider mb-1">Description</h4>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
                    {selectedDishDetails.description || "Prepared fresh with pure desi ghee, sacred spices, and 100% Satvik ingredients. Free from onion and garlic."}
                  </p>
                </div>

                {/* Vrinda Satvik Guarantee Banner */}
                <div className="flex items-center gap-2 bg-[#282526] px-3 py-2 rounded-xl border border-white/5 text-[11px] sm:text-xs text-zinc-300">
                  <span className="text-[#E0FF33] font-bold">✓</span>
                  <span className="truncate">100% Pure Satvik · Pure Desi Ghee · No Onion, No Garlic</span>
                </div>
              </div>

              {/* Fixed Ergonomic Action Dock */}
              {(() => {
                const currentInBasket = selectedDishDetails ? cart.find(c => c.id === selectedDishDetails.id) : null;
                const inBasketQty = currentInBasket ? currentInBasket.quantity : 0;

                return (
                  <div className="bg-[#1E1B1C]/95 backdrop-blur-md p-4 sm:p-5 border-t border-white/10 flex items-center gap-2.5 sm:gap-3 flex-shrink-0 z-30 pb-[max(1.25rem,env(safe-area-inset-bottom)+10px)]">
                    {/* Quantity Stepper */}
                    <div className="bg-[#282526] text-white rounded-full p-1 sm:p-1.5 border border-white/10 flex items-center gap-1 sm:gap-2 shadow-inner flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-zinc-200 hover:text-white cursor-pointer transition-all apple-tap-target disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={detailQuantity <= 1}
                        aria-label="Decrease quantity"
                        title="Decrease quantity"
                      >
                        <Minus size={14} strokeWidth={2.5} />
                      </button>
                      <span className="min-w-[24px] sm:min-w-[28px] text-center font-black text-sm sm:text-base text-[#E0FF33] font-['Outfit'] select-none">
                        {detailQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDetailQuantity(detailQuantity + 1)}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#E0FF33] hover:bg-[#CCFF00] active:scale-90 flex items-center justify-center text-[#1E1B1C] cursor-pointer transition-all shadow-md apple-tap-target"
                        aria-label="Increase quantity"
                        title="Increase quantity"
                      >
                        <Plus size={15} strokeWidth={3.5} className="text-[#1E1B1C] stroke-current" />
                      </button>
                    </div>

                    {/* Add / Update Cart CTA Button */}
                    <button
                      type="button"
                      onClick={handleDetailAddToCart}
                      className="flex-1 min-w-0 h-11 sm:h-12 bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black px-3.5 sm:px-4 rounded-full shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer apple-tap-target font-['Outfit'] active:scale-98"
                    >
                      <ShoppingBag size={17} className="text-[#1E1B1C] flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-black whitespace-nowrap">
                        {inBasketQty > 0
                          ? (detailQuantity === inBasketQty
                            ? `In Basket · ₹${(selectedDishDetails.price || 0) * detailQuantity}`
                            : `Update Basket · ₹${(selectedDishDetails.price || 0) * detailQuantity}`)
                          : `Add to Basket · ₹${(selectedDishDetails.price || 0) * detailQuantity}`}
                      </span>
                      <ChevronRight size={14} strokeWidth={3} className="text-[#1E1B1C] flex-shrink-0" />
                    </button>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}

      {/* CART DRAWER OVERLAY (Pure Hardware Transforms & Drag-Down Dismiss) */}
      {showCartDrawer && (
        <div
          ref={cartOverlayRef}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseCartDrawer();
          }}
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/75 backdrop-blur-xs transition-opacity duration-200 apple-overlay ${isCartClosing ? 'closing opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <div
            ref={cartSheetRef}
            style={cartSheetStyle}
            className={`bg-[#1E1B1C] border border-white/10 text-white w-full max-w-[440px] sm:max-w-md md:max-w-lg rounded-t-[36px] sm:rounded-[44px] p-5 sm:p-7 pb-[max(1.75rem,env(safe-area-inset-bottom)+14px)] shadow-[0_25px_70px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden relative apple-sheet-spring ${isDraggingCart ? 'sheet-dragging' : ''}`}
          >
            {/* Top Fixed Header & Grab Bar */}
            <div className="shrink-0">
              {/* Drag Handle Bar (Interactive Drag Down Area - Mobile Only) */}
              <div
                {...cartHandleProps}
                className="w-full py-2.5 -mt-3 mb-1 flex items-center justify-center cursor-grab active:cursor-grabbing sm:hidden select-none touch-none"
                title="Drag down to close"
              >
                <div className="w-12 h-1.5 bg-zinc-600 hover:bg-zinc-500 active:bg-zinc-400 rounded-full transition-colors pointer-events-none" />
              </div>

              {/* Header Title & Close Button */}
              <div className="flex justify-between items-center pb-3 border-b border-white/10 select-none">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-[#E0FF33]" />
                  <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">Your Basket</h3>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseCartDrawer();
                  }}
                  className="w-9 h-9 rounded-full bg-[#282526] hover:bg-[#322E30] active:scale-95 flex items-center justify-center text-white cursor-pointer transition-all border border-white/10 relative z-30 shadow-md"
                  title="Close Basket"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Middle Scrollable Content (Items + Bill + Delivery Details Form + Payment) */}
            <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar pr-0.5 space-y-4 my-2.5">
              {/* Items List */}
              <div className="divide-y divide-white/5 max-h-[30vh] overflow-y-auto pr-1 no-scrollbar">
                {cart.map(item => (
                  <div key={item.id} className="py-3 flex justify-between items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-white truncate">{item.name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">₹{item.price} each</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Apple Qty Picker Trigger (Opens iOS Slider Sheet) */}
                      <button
                        type="button"
                        onClick={() => setEditingQuantityItem(item)}
                        className="h-8 sm:h-9 px-3 rounded-full bg-[#1E1B1C] hover:bg-[#282526] border border-white/10 hover:border-[#E0FF33]/50 flex items-center gap-1.5 text-xs font-bold text-white transition-all cursor-pointer apple-tap-target active:scale-95 shadow-sm"
                        title="Change quantity"
                      >
                        <span className="text-zinc-400 font-medium">Qty</span>
                        <span className="font-black text-[#E0FF33] font-['Outfit']">{item.quantity}</span>
                        <ChevronDown size={13} className="text-zinc-400" />
                      </button>

                      {/* Quick Stepper Buttons */}
                      <div className="flex items-center gap-1 bg-[#1E1B1C] rounded-full p-1 border border-white/10 shadow-inner">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-zinc-200 hover:text-white cursor-pointer transition-all shadow-sm apple-tap-target"
                          aria-label="Decrease quantity"
                          title={item.quantity === 1 ? "Remove item" : "Decrease quantity"}
                        >
                          {item.quantity === 1 ? (
                            <Trash2 size={13} className="text-red-400" />
                          ) : (
                            <Minus size={13} strokeWidth={2.5} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-600 hover:bg-amber-700 dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] active:scale-90 flex items-center justify-center text-white dark:text-[#1E1B1C] cursor-pointer transition-all shadow-md apple-tap-target"
                          aria-label="Increase quantity"
                          title="Increase quantity"
                        >
                          <Plus size={14} strokeWidth={3.5} className="text-white dark:text-[#1E1B1C] stroke-current" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* KITCHEN CLOSED / OFFLINE NOTICE BANNER */}
              {!isShopOpen && (
                <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs space-y-1 animate-fade-in shadow-inner">
                  <div className="flex items-center gap-2 font-black text-red-100">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    <span className="text-sm font-['Outfit']">Kitchen Currently Offline / Closed</span>
                  </div>
                  <p className="text-[11px] text-red-300/90 leading-relaxed font-medium">
                    Operating Schedule: <strong className="text-white">{activeShop?.openingTime || '08:00 AM'} – {activeShop?.closingTime || '10:30 PM'}</strong>. Order placement is temporarily paused.
                  </p>
                </div>
              )}

              {/* FULFILLMENT SELECTOR: DOORSTEP DELIVERY VS SELF-PICKUP */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-zinc-400 font-['Outfit']">
                    Order Fulfillment
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-zinc-500 font-medium">
                    {onlineRidersCount > 0 ? `${onlineRidersCount} Sarathi Riders Active` : 'No Riders Active'}
                  </span>
                </div>

                {isRetailShop ? (
                  /* Retail Shop: Strictly Doorstep Delivery (Self-Pickup disabled to prevent uncollected fake orders) */
                  <div className="p-3 rounded-2xl bg-stone-100 dark:bg-[#151314] border border-stone-200 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🛵</span>
                        <div>
                          <p className="text-xs font-bold text-stone-900 dark:text-white">Doorstep Delivery Only</p>
                          <p className="text-[10px] text-stone-500 dark:text-zinc-400">Direct courier with live Sarathi tracking</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:bg-[#E0FF33]/15 dark:text-[#E0FF33] border border-amber-500/30 dark:border-[#E0FF33]/30">
                        {onlineRidersCount > 0 ? 'Active' : 'Busy'}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-600 dark:text-zinc-500 bg-stone-200/60 dark:bg-white/5 p-2 rounded-xl border border-stone-200 dark:border-white/5 flex items-center gap-1.5">
                      <ShieldCheck size={12} className="text-amber-600 dark:text-[#E0FF33] shrink-0" />
                      <span>Retail Shop: Counter pickup is disabled to protect against uncollected inventory.</span>
                    </div>
                  </div>
                ) : (
                  /* Hotel / Restaurant: Support both Doorstep Delivery and Counter Pickup */
                  <div className="p-1.5 rounded-2xl bg-stone-200/80 dark:bg-[#151314] border border-stone-300 dark:border-white/10 grid grid-cols-2 gap-1.5 w-full max-w-full box-border shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        if (onlineRidersCount > 0) setFulfillmentType('delivery');
                        else showToast("Riders Busy", 'info', "Self-Pickup is available at the counter right now");
                      }}
                      className={`py-2.5 px-2 sm:px-3.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-w-0 ${fulfillmentType === 'delivery'
                        ? 'bg-stone-900 text-white dark:bg-white dark:text-[#1E1B1C] font-black shadow-xs'
                        : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
                        } ${onlineRidersCount === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-sm">🛵</span>
                      <span className="truncate whitespace-nowrap font-['Outfit'] font-black">Delivery</span>
                      {onlineRidersCount === 0 && <span className="text-[9px] text-amber-600 dark:text-amber-400 font-black shrink-0">(Offline)</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setFulfillmentType('pickup')}
                      className={`py-2.5 px-2 sm:px-3.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-w-0 ${fulfillmentType === 'pickup'
                        ? 'bg-amber-600 text-white dark:bg-[#E0FF33] dark:text-[#1E1B1C] font-black shadow-xs'
                        : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                    >
                      <span className="text-sm">🛍️</span>
                      <span className="truncate whitespace-nowrap font-['Outfit'] font-black">Self-Pickup</span>
                      <span className={`text-[9px] sm:text-[9.5px] px-2 py-0.5 rounded-full font-black shrink-0 transition-all ${fulfillmentType === 'pickup'
                        ? 'bg-white text-stone-950 dark:bg-black dark:text-[#E0FF33] shadow-xs'
                        : 'bg-emerald-500/20 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300 border border-emerald-500/30'
                        }`}>Free</span>
                    </button>
                  </div>
                )}

                {/* Rider Busy Notice for Hotel */}
                {!isRetailShop && onlineRidersCount === 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex items-center gap-2 animate-fade-in">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>Sarathi Riders are currently offline. Self-Pickup is available at the kitchen counter.</span>
                  </div>
                )}

                {/* Rider Busy Notice for Shop */}
                {isRetailShop && onlineRidersCount === 0 && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] font-medium flex items-center gap-2 animate-fade-in">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-red-400" />
                    <span>Delivery partners are temporarily offline. Orders will resume shortly.</span>
                  </div>
                )}
              </div>

              {/* Bill Details */}
              <div className="bg-[#151314] rounded-2xl p-4 space-y-2 text-xs text-zinc-400 border border-white/5">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-white font-bold">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({gstPct}%)</span>
                  <span className="text-white font-bold">₹{gstAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span className={`font-bold ${deliveryCharge === 0 ? 'text-[#E0FF33]' : 'text-white'}`}>
                    {deliveryCharge === 0 ? 'FREE (Pickup)' : `₹${deliveryCharge}`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/10 font-['Outfit']">
                  <span>Total</span>
                  <span className="text-[#E0FF33]">₹{totalAmount}</span>
                </div>
              </div>

              {/* Customer Details Form */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 font-['Outfit']">
                    {fulfillmentType === 'pickup' ? 'Contact Details for Pickup' : 'Delivery Details'}
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-zinc-500 font-medium">
                    {fulfillmentType === 'pickup' ? 'Counter Pickup' : 'Vedic Express'}
                  </span>
                </div>

                {/* Name Input */}
                <div className={`relative flex items-center rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 transition-all ${shakeField === 'name'
                  ? 'animate-shake bg-red-950/25 border-2 border-red-500 ring-2 ring-red-500/30'
                  : 'bg-stone-50 dark:bg-[#181617] border border-stone-200 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20 focus-within:border-amber-500/80 dark:focus-within:border-[#E0FF33]/70 focus-within:ring-2 focus-within:ring-amber-500/20 dark:focus-within:ring-[#E0FF33]/20 shadow-2xs'
                  }`}>
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 mr-3.5 transition-colors shadow-inner ${shakeField === 'name' ? 'bg-red-500/20 text-red-400' : 'bg-stone-200/80 dark:bg-white/5 text-amber-600 dark:text-[#E0FF33]'
                    }`}>
                    <User size={19} className="stroke-[2.5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] sm:text-xs font-black uppercase tracking-wider text-stone-500 dark:text-zinc-400 leading-none mb-1 font-['Outfit']">
                        Recipient Name
                      </label>
                      {shakeField === 'name' && (
                        <span className="text-[11px] font-bold text-red-500 dark:text-red-400 leading-none mb-1 animate-fade-in">Name Required</span>
                      )}
                    </div>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={checkoutName}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^a-zA-Z\s'.]/g, '');
                        setCheckoutName(sanitized);
                        if (shakeField === 'name') setShakeField(null);
                      }}
                      maxLength={40}
                      placeholder="e.g. Rahul"
                      className="w-full text-base sm:text-lg font-bold text-stone-900 dark:text-white bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-stone-400 dark:placeholder:text-zinc-600 font-['Plus_Jakarta_Sans'] leading-tight"
                    />
                  </div>
                  <div className="flex items-center shrink-0 ml-2">
                    {checkoutName.trim().length >= 2 && /^[a-zA-Z\s'.]+$/.test(checkoutName.trim()) && (
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 dark:bg-[#E0FF33]/20 text-emerald-700 dark:text-[#E0FF33] flex items-center justify-center animate-scale-up shadow-xs" title="Valid Name">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Phone Input */}
                <div className={`relative flex items-center rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 transition-all ${shakeField === 'phone'
                  ? 'animate-shake bg-red-950/25 border-2 border-red-500 ring-2 ring-red-500/30'
                  : 'bg-stone-50 dark:bg-[#181617] border border-stone-200 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20 focus-within:border-amber-500/80 dark:focus-within:border-[#E0FF33]/70 focus-within:ring-2 focus-within:ring-amber-500/20 dark:focus-within:ring-[#E0FF33]/20 shadow-2xs'
                  }`}>
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 mr-3.5 transition-colors shadow-inner ${shakeField === 'phone' ? 'bg-red-500/20 text-red-400' : 'bg-stone-200/80 dark:bg-white/5 text-amber-600 dark:text-[#E0FF33]'
                    }`}>
                    <Phone size={19} className="stroke-[2.5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] sm:text-xs font-black uppercase tracking-wider text-stone-500 dark:text-zinc-400 leading-none mb-1 font-['Outfit']">
                        Contact Phone
                      </label>
                      {shakeField === 'phone' && (
                        <span className="text-[11px] font-bold text-red-500 dark:text-red-400 leading-none mb-1 animate-fade-in">10 Digits Required</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-bold text-stone-500 dark:text-zinc-400 select-none">+91</span>
                      <input
                        ref={phoneInputRef}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        value={checkoutPhone}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setCheckoutPhone(digitsOnly);
                          if (shakeField === 'phone') setShakeField(null);
                        }}
                        placeholder="9876543210"
                        className="w-full text-base sm:text-lg font-bold text-stone-900 dark:text-white bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-stone-400 dark:placeholder:text-zinc-600 font-['Plus_Jakarta_Sans'] leading-tight"
                      />
                    </div>
                  </div>
                  <div className="flex items-center shrink-0 ml-2">
                    {checkoutPhone.length === 10 && (
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 dark:bg-[#E0FF33]/20 text-emerald-700 dark:text-[#E0FF33] flex items-center justify-center animate-scale-up shadow-xs" title="Valid Mobile">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Conditional: Address Input for Delivery vs Counter Pickup Card */}
                {fulfillmentType === 'delivery' ? (
                  <div className="relative">
                    <div className={`relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all space-y-2.5 ${shakeField === 'address'
                      ? 'animate-shake bg-red-950/25 border-2 border-red-500 ring-2 ring-red-500/30'
                      : 'bg-stone-50 dark:bg-[#181617] border border-stone-200 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20 focus-within:border-amber-500/80 dark:focus-within:border-[#E0FF33]/70 focus-within:ring-2 focus-within:ring-amber-500/20 dark:focus-within:ring-[#E0FF33]/20 shadow-2xs'
                      }`}>
                      {/* Top Header Row: Label + Live GPS Auto-Fill Action */}
                      <div className="flex items-center justify-between gap-2 border-b border-stone-200/80 dark:border-white/5 pb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${shakeField === 'address' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/15 dark:bg-[#E0FF33]/15 text-amber-600 dark:text-[#E0FF33]'
                            }`}>
                            <MapPin size={17} className="stroke-[2.5]" />
                          </div>
                          <div className="min-w-0">
                            <label className="block text-xs font-black uppercase tracking-wider text-stone-700 dark:text-zinc-300 leading-none font-['Outfit']">
                              Delivery Address
                            </label>
                            {shakeField === 'address' && (
                              <span className="text-[11px] font-bold text-red-500 dark:text-red-400 leading-none mt-1 inline-block animate-fade-in">Address Required</span>
                            )}
                          </div>
                        </div>

                        {/* Top-Right Quick Auto-Fill GPS Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAutoFillLocation();
                          }}
                          className="h-8 px-3 rounded-full bg-amber-600 hover:bg-amber-700 dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] text-white dark:text-[#1E1B1C] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 shadow-xs apple-tap-target font-['Outfit']"
                          title="Auto-fill GPS address or pin on map"
                        >
                          <span className="w-4.5 h-4.5 rounded-full bg-white/20 dark:bg-black/15 flex items-center justify-center shrink-0">
                            <Compass size={11} strokeWidth={2.8} className="text-white dark:text-[#1E1B1C]" />
                          </span>
                          <span>Auto-Fill GPS</span>
                        </button>
                      </div>

                      {/* Full-Width Spacious Multi-Line Address Textarea */}
                      <div className="pt-0.5">
                        <textarea
                          ref={addressInputRef}
                          rows={2}
                          value={checkoutAddress}
                          onChange={(e) => {
                            setCheckoutAddress(e.target.value);
                            if (shakeField === 'address') setShakeField(null);
                          }}
                          placeholder="Enter street, ashram, apartment, flat no., or landmark in Vrindavan..."
                          className="w-full min-h-[58px] sm:min-h-[64px] text-sm sm:text-base font-bold text-stone-900 dark:text-white bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-stone-400 dark:placeholder:text-zinc-600 font-['Plus_Jakarta_Sans'] leading-relaxed resize-none"
                        />
                      </div>

                      {/* Bottom Context Helper & Clear Button */}
                      {checkoutAddress.trim().length > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 dark:border-white/5 text-xs text-stone-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                            <Check size={13} strokeWidth={3} />
                            <span>Address Recorded</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setCheckoutAddress('')}
                            className="text-stone-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>

                    {/* OpenStreetMap Nominatim / Vedic Landmark Autocomplete Dropdown */}
                    {showAddressDropdown && addressSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-stone-900 dark:bg-[#201D1E] border border-stone-700 dark:border-[#E0FF33]/30 rounded-2xl p-2 shadow-2xl z-30 max-h-48 overflow-y-auto no-scrollbar space-y-1 backdrop-blur-xl">
                        {isFetchingAddress && (
                          <p className="text-xs text-zinc-400 px-3 py-1 font-medium">Searching landmarks...</p>
                        )}
                        {addressSuggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const chosenAddr = item.address || item.display_name || item.title || item.name || '';
                              setCheckoutAddress(chosenAddr);
                              setShowAddressDropdown(false);
                              const lat = item.lat || item.latitude;
                              const lng = item.lng || item.lon || item.longitude;
                              if (lat && lng) {
                                setDeliveryCoords({ lat: parseFloat(lat), lng: parseFloat(lng) });
                              }
                              showToast("Address Selected", "success");
                            }}
                            className="w-full text-left p-2.5 rounded-xl hover:bg-white/10 transition-all text-xs flex items-start gap-2 text-zinc-200 hover:text-white cursor-pointer"
                          >
                            <MapPin size={15} className="text-amber-500 dark:text-[#E0FF33] mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate text-xs sm:text-sm">{item.title || item.name || (item.address ? item.address.split(',')[0] : 'Landmark')}</p>
                              <p className="text-xs text-zinc-400 truncate">{item.address || item.display_name || ''}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-stone-100/90 dark:bg-[#181617] border border-stone-200 dark:border-white/10 space-y-2.5 shadow-2xs animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 dark:bg-[#E0FF33]/15 text-amber-600 dark:text-[#E0FF33] flex items-center justify-center shrink-0 shadow-inner">
                        <Store size={20} className="stroke-[2.5]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[11px] sm:text-xs font-black text-stone-500 dark:text-zinc-400 uppercase tracking-wider font-['Outfit']">Self-Pickup Counter</h4>
                        <p className="text-sm sm:text-base font-black text-amber-700 dark:text-[#E0FF33] truncate">{activeShop?.name || 'Foody Vrinda Main Kitchen'}</p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-300 pl-14 leading-relaxed font-medium">
                      {activeShop?.address || 'Near ISKCON Temple, Raman Reti, Vrindavan'}
                    </p>

                    {/* Anti-Fake Orders Notice for Shop Type */}
                    {isRetailShop && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-200 text-xs leading-relaxed font-medium">
                        🛡️ <strong>Prasad Freshness Policy</strong>: Counter pickup orders from Retail Shops require prepaid online confirmation to prevent uncollected fresh bhog wastage.
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Method Selector */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-black text-stone-600 dark:text-zinc-400 font-['Outfit'] uppercase tracking-wider px-1">
                    <span>Payment Method</span>
                    <span className="text-[11px] text-amber-700 dark:text-[#E0FF33] font-bold">100% Secure</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Online Pay Option */}
                    <button
                      type="button"
                      disabled={!onlineAvailable}
                      onClick={() => setPaymentMethod('online')}
                      className={`p-3.5 sm:p-4 rounded-3xl text-left flex flex-col justify-between gap-3 transition-all apple-tap-target cursor-pointer relative overflow-hidden ${!onlineAvailable
                        ? 'bg-stone-200/50 dark:bg-[#151314]/50 text-stone-400 dark:text-zinc-600 border border-stone-300/40 dark:border-white/5 cursor-not-allowed opacity-50'
                        : paymentMethod === 'online'
                          ? 'bg-[#FFF8EE] text-stone-950 border-2 border-amber-600 shadow-md ring-2 ring-amber-600/20 dark:bg-[#E0FF33] dark:text-[#121011] dark:border-[#E0FF33] dark:ring-[#E0FF33]/30'
                          : 'bg-stone-100/90 text-stone-900 dark:bg-[#181617] dark:text-zinc-300 border border-stone-300 dark:border-white/10 hover:border-amber-500/50 dark:hover:border-white/20'
                        }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-xs ${paymentMethod === 'online'
                          ? 'bg-amber-600 text-white dark:bg-black dark:text-[#E0FF33]'
                          : 'bg-amber-500/15 text-amber-700 dark:bg-white/10 dark:text-zinc-200'
                          }`}>
                          <Zap size={19} className="stroke-[2.5]" />
                        </div>
                        {paymentMethod === 'online' && (
                          <div className="w-6 h-6 rounded-full bg-amber-600 text-white dark:bg-black dark:text-[#E0FF33] flex items-center justify-center shadow-xs">
                            <Check size={14} strokeWidth={3.5} />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-black font-['Outfit'] tracking-tight">
                          Online Pay
                        </div>
                        <p className={`text-xs leading-tight font-medium mt-0.5 ${paymentMethod === 'online'
                          ? 'text-amber-800 dark:text-[#121011]/85 font-semibold'
                          : 'text-stone-600 dark:text-zinc-400'
                          }`}>
                          {!onlineAvailable ? (!globalOnline ? 'Platform Off' : 'Kitchen Off') : 'UPI · Cards · NetBanking'}
                        </p>
                      </div>
                    </button>

                    {/* Cash on Delivery / Pay at Counter Option */}
                    <button
                      type="button"
                      disabled={!isCodAvailableForOrder}
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-3.5 sm:p-4 rounded-3xl text-left flex flex-col justify-between gap-3 transition-all apple-tap-target cursor-pointer relative overflow-hidden ${!isCodAvailableForOrder
                        ? 'bg-stone-200/50 dark:bg-[#151314]/50 text-stone-400 dark:text-zinc-600 border border-stone-300/40 dark:border-white/5 cursor-not-allowed opacity-50'
                        : paymentMethod === 'cash'
                          ? 'bg-[#FFF8EE] text-stone-950 border-2 border-amber-600 shadow-md ring-2 ring-amber-600/20 dark:bg-[#E0FF33] dark:text-[#121011] dark:border-[#E0FF33] dark:ring-[#E0FF33]/30'
                          : 'bg-stone-100/90 text-stone-900 dark:bg-[#181617] dark:text-zinc-300 border border-stone-300 dark:border-white/10 hover:border-amber-500/50 dark:hover:border-white/20'
                        }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-xs ${paymentMethod === 'cash'
                          ? 'bg-amber-600 text-white dark:bg-black dark:text-[#E0FF33]'
                          : 'bg-amber-500/15 text-amber-700 dark:bg-white/10 dark:text-zinc-200'
                          }`}>
                          <Banknote size={19} className="stroke-[2.5]" />
                        </div>
                        {paymentMethod === 'cash' && (
                          <div className="w-6 h-6 rounded-full bg-amber-600 text-white dark:bg-black dark:text-[#E0FF33] flex items-center justify-center shadow-xs">
                            <Check size={14} strokeWidth={3.5} />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-black font-['Outfit'] tracking-tight">
                          {fulfillmentType === 'pickup' ? 'Counter Cash' : 'Cash / COD'}
                        </div>
                        <p className={`text-xs leading-tight font-medium mt-0.5 ${paymentMethod === 'cash'
                          ? 'text-amber-800 dark:text-[#121011]/85 font-semibold'
                          : 'text-stone-600 dark:text-zinc-400'
                          }`}>
                          {!isCodAvailableForOrder ? 'COD Disabled' : (fulfillmentType === 'pickup' ? 'Pay at counter' : 'Pay upon delivery')}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Fixed Action Footer */}
            <div className="shrink-0 pt-2 pb-6 sm:pb-2 border-t border-stone-200/80 dark:border-white/5 space-y-2 safe-area-bottom">
              {/* Seamless Trust & Live Tracking Micro-Indicator */}
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-['Plus_Jakarta_Sans'] px-1">
                <div className="flex items-center gap-1.5 text-[#E0FF33]">
                  <Zap size={13} className="text-[#E0FF33]" />
                  <span className="font-bold text-neutral-300">Live GPS tracking included</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-medium">Vrinda Cloud Kitchen</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={!isShopOpen || (!onlineAvailable && !codAvailable) || (isRetailShop && onlineRidersCount === 0)}
                className="w-full bg-[#E0FF33] hover:bg-[#CCFF00] disabled:opacity-40 disabled:cursor-not-allowed text-[#1E1B1C] font-black py-3.5 sm:py-4 px-5 sm:px-6 rounded-full text-sm sm:text-base shadow-xl cursor-pointer transition-all apple-tap-target active:scale-98 flex items-center justify-between font-['Outfit']"
              >
                <span className="font-black">
                  {!isShopOpen
                    ? 'Kitchen Offline (Closed)'
                    : (isRetailShop && onlineRidersCount === 0
                      ? 'Delivery Partners Busy'
                      : (!onlineAvailable && !codAvailable
                        ? 'Kitchen Payments Disabled'
                        : 'Proceed to Place Order'))}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#1E1B1C] text-[#E0FF33] text-xs sm:text-sm font-black shadow-sm flex-shrink-0">
                  ₹{totalAmount}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order History Drawer (My Orders) */}
      <OrderHistoryDrawer
        isOpen={isOrderHistoryOpen}
        onClose={() => setIsOrderHistoryOpen(false)}
        userId={user?.id}
        userPhone={userData?.phone || user?.phone || checkoutPhone}
        allShops={allShops}
        onTrackOrder={(order) => {
          if (order?.id && setTrackingOrderId) {
            setTrackingOrderId(order.id);
          }
          setTrackingOrder(order);
          setIsTrackingModalOpen(true);
        }}
        onRateOrder={(order) => {
          setReviewOrderTarget(order);
          setIsReviewModalOpen(true);
        }}
        onToast={showToast}
      />

      {/* 5-Star Customer Review & Rating Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setReviewOrderTarget(null);
        }}
        order={reviewOrderTarget}
        shopId={reviewOrderTarget?.shop_id || reviewOrderTarget?.shopId || activeShop?.id}
        shopName={reviewOrderTarget?.shopName || activeShop?.name}
        orderId={reviewOrderTarget?.id}
        onReviewSubmitted={() => {
          showToast("Review Submitted", "success", "5-Star Rating Shared");
        }}
      />

      {/* Live Order CARTO Map Tracking HUD Modal (Exact Screenshot Layout) */}
      {isTrackingModalOpen && trackingOrder && (
        <ActiveOrderTrackingModal
          order={trackingOrder}
          allShops={allShops}
          onToast={showToast}
          onClose={() => setIsTrackingModalOpen(false)}
          onRateOrder={(order) => {
            setIsTrackingModalOpen(false);
            setReviewOrderTarget(order);
            setIsReviewModalOpen(true);
          }}
        />
      )}

      {/* Apple / Nike iOS Quantity Picker Sheet Modal */}
      <QuantityPickerSheet
        isOpen={!!editingQuantityItem}
        item={editingQuantityItem}
        onClose={() => setEditingQuantityItem(null)}
        onUpdateQuantity={(itemId, qty) => {
          setExactQuantity(itemId, qty);
          showToast(`Qty: ${qty}`, 'info', 'Updated');
        }}
        onRemoveItem={(itemId) => {
          removeFromCart(itemId);
          showToast('Item Removed', 'info', 'From basket');
        }}
      />

      {/* Dynamic Island Toast Notification (Vrinda Tours Physics) */}
      {toast && (
        <DynamicToast
          message={toast.message}
          desc={toast.desc}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
