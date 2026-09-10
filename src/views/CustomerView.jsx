import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
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
import { fetchAddressSuggestions } from '../services/addressService';
import { supabase, createCloudOrder, getCloudMenus, subscribeSingleCloudOrder, resolveDishCutout, invalidateCache } from '../supabase';
import useGeolocation from '../hooks/useGeolocation';
import { useNotifications } from '../context/NotificationContext';

// Curated high-res transparent PNG cutout dishes (Exact Template Match)
const DEFAULT_PRASAD_ITEMS = [
  {
    id: 'combo-1',
    name: 'Maha Satvik Family Feast Combo',
    subtitle: 'Royal Thali + Paneer Makhani + 2x Kheer',
    category: 'Combo Offers',
    price: 460,
    originalPrice: 560,
    discountPercent: 18,
    isCombo: true,
    comboItems: ['Royal Vedic Thali', 'Paneer Makhani Meal', 'Kesariya Rabdi Kheer (x2)'],
    kcal: '950 kcal',
    carbs: '124g',
    fat: '39g',
    protein: '51g',
    popular: true,
    tag: 'Save ₹100',
    image: '/dishes/thali.png',
    description: 'Complete family feast platter combining our signature Royal Vedic Thali, creamy Paneer Makhani Meal, and two portions of chilled Kesariya Rabdi Kheer in pure A2 Desi Ghee.'
  },
  {
    id: 'combo-2',
    name: 'Evening Snack & Pizza Duo Combo',
    subtitle: 'Paneer Pizza (10") + Satvik Burger',
    category: 'Combo Offers',
    price: 320,
    originalPrice: 380,
    discountPercent: 16,
    isCombo: true,
    comboItems: ['Paneer Satvik Pizza (10")', 'Cheese With Satvik Burger'],
    kcal: '600 kcal',
    carbs: '87g',
    fat: '94g',
    protein: '53g',
    popular: true,
    tag: 'Save ₹60',
    image: '/dishes/pizza.png',
    description: 'Crisp 10-inch hand-tossed Paneer Satvik Pizza paired with our signature crispy spiced Paneer Burger for the ultimate evening prasad snack.'
  },
  {
    id: 'combo-3',
    name: 'Royal Bhog & Prasad Sweet Combo',
    subtitle: 'Paneer Makhani + Basmati Rice + Rabdi Kheer',
    category: 'Combo Offers',
    price: 330,
    originalPrice: 390,
    discountPercent: 15,
    isCombo: true,
    comboItems: ['Paneer Makhani Meal', 'Govind Bhog Basmati Rice', 'Kesariya Rabdi Kheer'],
    kcal: '780 kcal',
    carbs: '110g',
    fat: '30g',
    protein: '34g',
    popular: true,
    tag: 'Best Value',
    image: '/dishes/curry.png',
    description: 'A divine trio combining rich Paneer Makhani, fragrant steamed Govind Bhog Basmati Rice, and traditional Kesariya Rabdi Kheer.'
  },
  {
    id: 'prasad-1',
    name: 'Cheese With Satvik Burger',
    subtitle: 'Cheesy satvik, special price',
    category: 'Snacks',
    price: 140,
    kcal: '260 kcal',
    carbs: '45g',
    fat: '80g',
    protein: '35g',
    popular: true,
    tag: 'Full Protein',
    image: '/dishes/burger.png',
    description: 'Our satvik burger features a crispy, juicy spiced paneer patty topped with fresh ingredients and rich flavors, served in a soft toasted sesame bun.'
  },
  {
    id: 'prasad-2',
    name: 'Royal Vedic Thali',
    subtitle: 'Complete nutritional Satvik platter',
    category: 'Thali & Meals',
    price: 220,
    kcal: '480 kcal',
    carbs: '68g',
    fat: '16g',
    protein: '22g',
    popular: true,
    tag: "Chef's Special",
    image: '/dishes/thali.png',
    description: 'Authentic Vrindavan Satvik Thali prepared without onion or garlic. Includes paneer sabzi, dal tadka, 4 phulkas, fragrant jeera rice, and fresh sweet.'
  },
  {
    id: 'prasad-3',
    name: 'Kesariya Rabdi Kheer',
    subtitle: 'Slow simmered thickened milk dessert',
    category: 'Sweets & Prasad',
    price: 120,
    kcal: '210 kcal',
    carbs: '28g',
    fat: '9g',
    protein: '7g',
    popular: true,
    tag: 'Sacred Prasad',
    image: '/dishes/sweet.png',
    description: 'Slow-cooked condensed milk pudding flavored with real Kashmiri saffron strands, green cardamom, and crunchy roasted California almonds.'
  },
  {
    id: 'prasad-4',
    name: 'Paneer Satvik Pizza (10")',
    subtitle: 'Crispy thin crust with desi herbs',
    category: 'Snacks',
    price: 240,
    kcal: '340 kcal',
    carbs: '42g',
    fat: '14g',
    protein: '18g',
    popular: true,
    tag: 'Chef Special',
    image: '/dishes/pizza.png',
    description: 'Hand-tossed thin crust with fresh tomato basil coulis, diced fresh Malai paneer, bell peppers, sweet corn, and mozzarella cheese.'
  },
  {
    id: 'prasad-5',
    name: 'Paneer Makhani Meal',
    subtitle: 'Rich cashew gravy, butter roti',
    category: 'Thali & Meals',
    price: 180,
    kcal: '360 kcal',
    carbs: '38g',
    fat: '18g',
    protein: '22g',
    popular: true,
    tag: 'Pure Desi Ghee',
    image: '/dishes/curry.png',
    description: 'Fresh organic cottage cheese simmered in a luscious tomato and cashew butter gravy, infused with cardamom and pure desi ghee.'
  },
  {
    id: 'prasad-6',
    name: 'Govind Bhog Basmati Rice',
    subtitle: 'Steamed aromatic long grain rice',
    category: 'Thali & Meals',
    price: 90,
    kcal: '210 kcal',
    carbs: '44g',
    fat: '3g',
    protein: '5g',
    popular: true,
    tag: 'Vedic Grain',
    image: '/dishes/rice.png',
    description: 'Premium aged Govind Bhog long-grain basmati rice steamed with fragrant bay leaf, green cardamom, and a dollop of pure A2 cow ghee.'
  }
];

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
  const [menuItems, setMenuItems] = useState([]);
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
      } catch (err) {
        console.warn("Address suggestions query error:", err);
      } finally {
        setIsFetchingAddress(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [checkoutAddress]);

  const handleCloseDishDetail = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isDetailClosing) return;
    setIsDetailClosing(true);
    setTimeout(() => {
      setSelectedDishDetails(null);
      setIsDetailClosing(false);
    }, 220);
  };

  const handleCloseCartDrawer = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isCartClosing) return;
    setIsCartClosing(true);
    setTimeout(() => {
      setShowCartDrawer(false);
      setIsCartClosing(false);
    }, 220);
  };

  // 120fps ultra-fluid gesture hooks (Vrinda Map Modal Standard)
  const {
    sheetRef: detailSheetRef,
    sheetStyle: detailSheetStyle,
    handleProps: detailHandleProps,
    isDragging: isDraggingDetail
  } = useBottomSheetDrag(handleCloseDishDetail, 35);

  const {
    sheetRef: cartSheetRef,
    sheetStyle: cartSheetStyle,
    handleProps: cartHandleProps,
    isDragging: isDraggingCart
  } = useBottomSheetDrag(handleCloseCartDrawer, 35);

  const handleCloseShopSwitcher = () => {
    if (isShopClosing) return;
    setIsShopClosing(true);
    setTimeout(() => {
      setShowShopSwitcher(false);
      setIsShopClosing(false);
    }, 220);
  };

  const showToast = (message, type = 'success', desc = '') => {
    setToast({ message, type, desc });
    setTimeout(() => {
      setToast(prev => (prev && prev.message === message ? null : prev));
    }, 3000);
  };

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

  // Load menu items when selectedShopId changes
  useEffect(() => {
    if (!selectedShopId) {
      setMenuItems([]);
      setMenuLoading(false);
      return;
    }

    setMenuLoading(true);
    async function loadShopMenus() {
      try {
        const items = await getCloudMenus(selectedShopId);
        setMenuItems(items || []);
      } catch (err) {
        console.warn("Notice loading menus:", err.message);
      } finally {
        setMenuLoading(false);
      }
    }
    loadShopMenus();
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
  const [showShopSwitcher, setShowShopSwitcher] = useState(false);
  const activeShop = allShops.find(s => s.id === selectedShopId) || allShops[0] || {
    id: 'default-vrinda',
    name: 'Vrinda Cloud Kitchen',
    address: 'Near ISKCON Temple, Raman Reti, Vrindavan',
    minimumOrderAmount: 0,
    deliveryCharge: 0,
    gstPercentage: 5,
    isOpen: true
  };

  const minOrderAmount = activeShop?.minimumOrderAmount || 0;
  const deliveryCharge = activeShop?.deliveryCharge || 0;
  const gstPct = activeShop?.gstPercentage || 5;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gstAmount = Math.round(subtotal * (gstPct / 100));
  const totalAmount = subtotal > 0 ? (subtotal + deliveryCharge + gstAmount) : 0;
  const isBelowMin = subtotal < minOrderAmount && minOrderAmount > 0;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return showToast('Basket is empty', 'error');
    if (!selectedShopId && allShops.length > 0) setSelectedShopId(allShops[0].id);

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

    const cleanAddress = (checkoutAddress || '').trim();
    if (cleanAddress.length < 4) {
      triggerShake('address');
      return showToast("Address required", 'error', 'Enter street or landmark name');
    }

    if (!deliveryCoords || typeof deliveryCoords.lat !== 'number' || typeof deliveryCoords.lng !== 'number') {
      triggerShake('address');
      return showToast("Pin Location", 'error', 'Please pin your delivery address on map');
    }

    if (isBelowMin) {
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
        description: `Satvik Prasad Order - ${currentCartShop?.name || 'Kitchen'}`,
        image: "https://imbajrangi.github.io/Company/Vrindopnishad%20Web/class/logo/foodyVrinda-logo.png",
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

  // Combine database items with rich fallback items so the UI is always dynamic and stunning
  const displayItems = menuItems.length > 0 ? menuItems.map((it, i) => ({
    ...it,
    image: resolveDishCutout(it.image || it.imageUrl, it.name, it.category),
    subtitle: it.subtitle || (it.category === 'Thali & Meals' ? 'Rich gravy, hot rotis' : (it.category === 'Sweets & Prasad' ? 'Desi ghee, saffron flavored' : 'Cheesy crisp, special price')),
    kcal: it.kcal || `${Math.round(220 + ((it.price || 140) * 0.8))} kcal`,
    carbs: it.carbs || `${Math.round(35 + (i * 4))}g`,
    fat: it.fat || `${Math.round(14 + (i * 3))}g`,
    protein: it.protein || `${Math.round(18 + (i * 4))}g`,
    tag: it.tag || (it.category === 'Sweets & Prasad' ? 'Sacred Prasad' : (it.category === 'Thali & Meals' ? 'Pure Desi Ghee' : 'Full Protein'))
  })) : DEFAULT_PRASAD_ITEMS;

  // Dynamically compute categories from active items
  const dynamicCategories = [
    'All',
    ...Array.from(new Set(displayItems.map(i => i.category).filter(Boolean)))
  ];
  // Ensure we always have pleasant category chips
  const categories = dynamicCategories.length > 1 ? dynamicCategories : ['All', 'Snacks', 'Thali & Meals', 'Sweets & Prasad', 'Beverages'];

  // Filter menu items
  const filteredMenuItems = displayItems.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(menuSearch.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(menuSearch.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(menuSearch.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' ||
      item.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const handleOpenDishDetail = (item) => {
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

  // Desktop Spotlight Dish state
  const [spotlightDishId, setSpotlightDishId] = useState('prasad-1');
  const [spotlightSize, setSpotlightSize] = useState('380g');
  const [spotlightQty, setSpotlightQty] = useState(1);
  const [spotlightAddons, setSpotlightAddons] = useState(['extra-paneer', 'fresh-tomato']);
  const [promocodeApplied, setPromocodeApplied] = useState(true);

  const toggleAddon = (addonId) => {
    setSpotlightAddons(prev =>
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  const spotlightDish = displayItems.find(i => i.id === spotlightDishId) || displayItems[0] || DEFAULT_PRASAD_ITEMS[0];

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
    <div className="w-full pb-6 text-white">
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

      {/* DYNAMIC SHOP SELECTOR & LIVE TIMING ROW (Flawless Single-Line Responsive Standard) */}
      <div className="relative mb-6 z-30">
        <div className="flex items-center gap-2 sm:gap-3 justify-between w-full">
          <button
            onClick={() => allShops.length > 1 && (showShopSwitcher ? handleCloseShopSwitcher() : setShowShopSwitcher(true))}
            className={`flex-1 min-w-0 h-11 sm:h-12 flex items-center gap-2.5 bg-[#282526] hover:bg-[#322E30] border border-white/10 hover:border-[#E0FF33]/40 px-3.5 sm:px-4 rounded-full text-xs shadow-md transition-all apple-tap-target ${allShops.length > 1 ? 'cursor-pointer' : 'cursor-default'}`}
            title={allShops.length > 1 ? "Switch Kitchen Branch" : "Current Branch"}
          >
            <MapPin size={15} className="text-[#E0FF33] flex-shrink-0" />
            <span className="font-bold text-white text-xs sm:text-sm truncate flex-1 text-left min-w-0">
              {activeShop?.name || 'Vrinda Cloud Kitchen'}
            </span>
            {activeShop?.discountTag && (
              <span className="hidden lg:inline-flex items-center gap-1 bg-[#E0FF33]/20 text-[#E0FF33] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                <TagIcon size={10} /> {activeShop.discountTag}
              </span>
            )}
            {allShops.length > 1 && (
              <ChevronDown size={14} className={`text-zinc-400 flex-shrink-0 ml-1 transition-transform duration-200 ${showShopSwitcher && !isShopClosing ? 'rotate-180' : ''}`} />
            )}
          </button>

          {/* Live Wait Time Capsule - only shown when space is available (hidden on mobile, visible on sm/md+) */}
          <div className="hidden sm:flex h-11 sm:h-12 flex-shrink-0 whitespace-nowrap items-center gap-2 bg-[#282526] px-3.5 sm:px-4 rounded-full border border-white/10 shadow-md">
            <span className="w-2 h-2 rounded-full bg-[#E0FF33] flex-shrink-0 shadow-[0_0_8px_#E0FF33]"></span>
            <span className="text-xs font-bold text-zinc-200 whitespace-nowrap">
              {activeShop?.estimatedWaitTime ? `${activeShop.estimatedWaitTime} min` : '20–30 min'}
            </span>
          </div>

          {/* My Orders History Button */}
          <button
            onClick={() => setIsOrderHistoryOpen(true)}
            className="h-11 sm:h-12 flex-shrink-0 flex items-center gap-1.5 sm:gap-2 bg-[#282526] hover:bg-[#322E30] active:scale-95 text-white border border-white/10 hover:border-[#E0FF33]/40 px-3.5 sm:px-4 rounded-full text-xs font-bold shadow-md transition-all cursor-pointer apple-tap-target"
            title="View Past Orders & Tracking"
          >
            <History size={15} className="text-[#E0FF33]" />
            <span className="hidden sm:inline">My Orders</span>
          </button>
        </div>

        {/* Dynamic Shops Popover (Overlay Standard with Backdrop & Apple Spring Animation) */}
        {showShopSwitcher && allShops.length > 1 && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 transition-opacity"
              onClick={handleCloseShopSwitcher}
            />
            <div className={`absolute top-full left-0 right-0 mt-2 z-50 bg-[#282526] border border-[#E0FF33]/30 rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] apple-dropdown-spring ${isShopClosing ? 'closing' : ''}`}>
              <div className="flex justify-between items-center mb-3.5">
                <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider font-['Outfit']">Select Kitchen Branch</h4>
                <button
                  onClick={handleCloseShopSwitcher}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer transition-all border border-white/5 shadow-sm apple-tap-target"
                  title="Close"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto no-scrollbar">
                {allShops.map(s => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedShopId(s.id);
                      handleCloseShopSwitcher();
                      showToast(s.name, 'info');
                    }}
                    className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all apple-tap-target ${s.id === selectedShopId ? 'bg-[#E0FF33] text-[#1E1B1C] font-black shadow-lg ring-1 ring-[#E0FF33]/50' : 'bg-[#1E1B1C] text-white hover:bg-white/5 border border-white/5'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black truncate">{s.name}</p>
                      <p className={`text-[11px] truncate mt-0.5 ${s.id === selectedShopId ? 'text-[#1E1B1C]/80 font-semibold' : 'text-zinc-400'}`}>{s.address || 'Vrindavan Dham'}</p>
                    </div>
                    {s.id === selectedShopId && (
                      <span className="text-[11px] font-black bg-[#1E1B1C] text-[#E0FF33] px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 whitespace-nowrap shadow-sm">
                        <Check size={12} strokeWidth={3} />
                        <span>Active</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 1 & 2. HERO HEADLINE & INTEGRATED SEARCH BAR (Responsive Desktop & Mobile) */}
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] sm:text-xs font-bold text-[#E0FF33] bg-[#E0FF33]/10 px-3 py-1 rounded-full border border-[#E0FF33]/20 font-laila flex items-center gap-1.5">
              <span>वृन्दोपनिषद्</span>
              <span className="text-[10px] font-bold text-zinc-300 font-['Outfit']">· vrindopnishad</span>
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight font-['Outfit']">
            <span className="font-laila font-bold text-white">वृन्दोपनिषद्</span> <span className="text-[#E0FF33] font-['Outfit'] font-black">Foody Vrinda</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 font-medium tracking-wide">
            100% Satvik · Pure Desi Ghee · Divine Vedic Flavors in Vrindavan Dham
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 lg:w-96 flex-shrink-0">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search pure delicacies..."
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
            className="w-full h-11 sm:h-12 !bg-[#282526] border border-white/10 hover:border-white/20 focus:!border-[#E0FF33]/60 !rounded-full pl-11 pr-10 text-xs sm:text-sm text-white placeholder-zinc-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#E0FF33]/20 transition-all"
          />
          {menuSearch && (
            <button
              onClick={() => setMenuSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[10px] text-zinc-300 hover:text-white cursor-pointer transition-all"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. HORIZONTAL CATEGORY PILL CHIPS */}
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-1 mb-6 sm:mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`h-10 sm:h-11 px-4 sm:px-6 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex-shrink-0 apple-tap-target flex items-center justify-center ${selectedCategory.toLowerCase() === cat.toLowerCase()
              ? 'bg-white text-[#1E1B1C] font-black shadow-lg shadow-white/10'
              : 'bg-[#282526] text-zinc-400 hover:text-white border border-white/10 hover:border-white/20'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 4. ACTIVE ORDER TRACKING BANNER (IF ANY) */}
      {trackingOrder && (
        <div className="mb-6 bg-[#282526] border border-[#E0FF33]/30 rounded-3xl p-4 sm:p-5 shadow-2xl relative apple-modal-spring overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            {/* Left: Icon & Status Text */}
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 flex items-center justify-center text-[#E0FF33] shrink-0 shadow-inner">
                <Navigation className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase text-[#E0FF33] bg-[#E0FF33]/10 px-2.5 py-0.5 rounded-full border border-[#E0FF33]/20">
                    Active Order #{trackingOrder.id ? trackingOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ORDER'}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-400 capitalize">
                    • {trackingOrder.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-white font-['Outfit'] truncate">
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
                className="sm:hidden w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs shrink-0 cursor-pointer"
                title="Dismiss banner"
              >
                ✕
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
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-full bg-[#E0FF33] text-[#1E1B1C] font-black text-xs hover:bg-[#ccff00] shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer font-['Outfit']"
                >
                  <Star className="w-3.5 h-3.5 fill-[#1E1B1C]" />
                  <span>Rate & Review</span>
                </button>
              )}
              <button
                onClick={() => setIsTrackingModalOpen(true)}
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer font-['Outfit'] border border-white/10"
              >
                <Navigation className="w-3.5 h-3.5 text-[#E0FF33]" />
                <span>Live Map Track</span>
              </button>
              <button
                onClick={() => {
                  setTrackingOrderId(null);
                  setIsTrackingModalOpen(false);
                }}
                className="hidden sm:flex w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white items-center justify-center text-xs apple-tap-target cursor-pointer shrink-0"
                title="Dismiss banner"
              >
                ✕
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
        <div className="bg-[#282526] rounded-[32px] sm:rounded-[36px] p-12 sm:p-16 text-center text-zinc-400 border border-white/5 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
            <Soup size={32} className="text-[#E0FF33]" />
          </div>
          <p className="font-black text-white text-base sm:text-lg">No items found</p>
          <p className="text-xs text-zinc-500 mt-1">Try searching for other pure delicacies.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredMenuItems.map((item, idx) => {
            const isMint = idx % 2 === 0;
            const cardBg = isMint ? 'bg-[#CEF3E7]' : 'bg-[#FFF2E6]';
            const isFav = favorites.includes(item.id);
            const cartItem = cart.find(c => c.id === item.id);
            const quantityInCart = cartItem ? cartItem.quantity : 0;

            return (
              <div
                key={item.id}
                onClick={() => handleOpenDishDetail(item)}
                style={{ animationDelay: `${idx * 50}ms` }}
                className={`${cardBg} text-[#1E1B1C] rounded-[32px] sm:rounded-[38px] p-5 sm:p-6 lg:p-7 shadow-xl relative overflow-hidden cursor-pointer min-h-[195px] sm:min-h-[225px] flex flex-col justify-between apple-card-interactive transition-all duration-300 customer-card-pop ${quantityInCart > 0 ? 'ring-2 ring-[#1E1B1C]/25 shadow-2xl' : ''}`}
              >
                {/* Top Row: Dish Name + Optional Selection Pill + Outline Heart Button */}
                <div className="flex justify-between items-start z-10 gap-2">
                  <div className="max-w-[62%]">
                    {item.isCombo && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1E1B1C] text-[#E0FF33] text-[9px] font-black uppercase tracking-wider mb-1 shadow-xs">
                        <Sparkles size={10} className="text-[#E0FF33]" />
                        {item.tag || 'Combo Offer'}
                      </span>
                    )}
                    <h3 className="text-xl sm:text-2xl font-black text-[#1E1B1C] leading-[1.1] tracking-tight">
                      {item.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs font-semibold text-zinc-600 mt-1 leading-snug">
                      {item.subtitle || 'Cheesy satvik, special price'}
                    </p>
                    {item.comboItems && item.comboItems.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {item.comboItems.map((ci, cidx) => (
                          <span key={cidx} className="text-[9.5px] font-bold bg-black/5 text-zinc-700 px-1.5 py-0.5 rounded-md border border-black/5">
                            + {ci}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => toggleFavorite(item.id, e)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-sm flex items-center justify-center transition-all flex-shrink-0 cursor-pointer apple-tap-target hover:scale-105 active:scale-95"
                    title="Favorite"
                  >
                    <Heart
                      size={18}
                      className={isFav ? 'text-red-500 fill-red-500' : 'text-zinc-800'}
                    />
                  </button>
                </div>

                {/* Mid & Bottom Row: Price & Order Now / Stepper Button */}
                <div className="mt-3 sm:mt-4 z-10">
                  <div className="flex items-baseline gap-2 mb-2 sm:mb-3">
                    <span className="text-2xl sm:text-3xl font-black text-[#1E1B1C] font-['Outfit']">
                      ₹{item.price}
                    </span>
                    {item.originalPrice && (
                      <span className="text-xs sm:text-sm font-bold text-zinc-400 line-through font-['Outfit']">
                        ₹{item.originalPrice}
                      </span>
                    )}
                  </div>

                  {quantityInCart === 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                        showToast(`+1 ${item.name}`, 'success', `₹${item.price}`);
                      }}
                      className="bg-[#1E1B1C] hover:bg-black text-white font-black text-xs px-5 sm:px-6 py-2.5 sm:py-3 rounded-full flex items-center gap-2 shadow-lg transition-all cursor-pointer apple-tap-target active:scale-95"
                    >
                      <span>Order Now</span>
                      <ChevronRight size={14} strokeWidth={3} />
                    </button>
                  ) : (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center bg-[#1E1B1C] text-white rounded-full p-1 shadow-xl border border-white/10 select-none animate-scale-up"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, quantityInCart - 1);
                        }}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-90"
                        title="Decrease quantity"
                      >
                        {quantityInCart === 1 ? <Trash2 size={13} className="text-red-400" /> : <Minus size={13} />}
                      </button>

                      <span className="px-2.5 sm:px-3 text-xs font-black text-[#E0FF33] font-['Outfit'] min-w-[24px] text-center">
                        {quantityInCart}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item);
                          showToast(`+1 ${item.name}`, 'success', `₹${item.price}`);
                        }}
                        className="w-8 h-8 rounded-full bg-[#E0FF33] hover:bg-[#d8fa26] text-black flex items-center justify-center transition-all active:scale-90"
                        title="Add another"
                      >
                        <Plus size={14} strokeWidth={3} />
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
                      e.target.src = '/dishes/burger.png';
                    }}
                    className={`w-full h-full object-contain drop-shadow-[0_14px_20px_rgba(0,0,0,0.18)] select-none pointer-events-none transition-transform duration-300 ${quantityInCart > 0 ? 'scale-110 sm:scale-115' : 'scale-105 sm:scale-110'}`}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Streamlined Satvik Devotee Footer */}
      <footer className="w-full max-w-lg mx-auto mt-8 mb-6 px-4 text-center select-none space-y-2.5 text-zinc-500 text-[11px] font-['Plus_Jakarta_Sans']">
        {/* Sacred Brand & Mission */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-center gap-2">
            <span className="font-laila text-xs font-bold text-zinc-300">
              वृन्दोपनिषद्
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-[11px] text-[#E0FF33] font-['Outfit'] font-black">
              Foody Vrinda
            </span>
          </div>
          <p className="text-[10px] text-zinc-500">
            100% Satvik Cloud Kitchen & Prasad Delivery • Vrindavan Dham
          </p>
        </div>

        {/* Subtle Social & Community Capsule */}
        <div className="flex justify-center pt-0.5">
          <SocialLinksBar compact={true} showLabel={false} />
        </div>

        {/* Regulatory Links & Policy */}
        <div className="flex items-center justify-center gap-3 pt-0.5 text-[11px] text-zinc-500">
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 transition-colors"
          >
            Privacy Policy
          </a>
          <span className="text-zinc-700">•</span>
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 transition-colors"
          >
            Terms of Service
          </a>
          <span className="text-zinc-700">•</span>
          <a
            href="mailto:vrinda.connect.us@gmail.com"
            className="hover:text-zinc-300 transition-colors"
          >
            Contact
          </a>
        </div>

        <p className="text-[9px] text-zinc-600/70 pt-0.5 font-['Outfit']">
          © 2026 vrindopnishad. All rights reserved.
        </p>
      </footer>

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
                className="bg-[#1E1B1C]/95 border border-[#E0FF33]/40 hover:border-[#E0FF33] rounded-full p-2 pl-3.5 sm:pl-4 pr-2 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(224,255,51,0.15)] flex items-center justify-between gap-3 cursor-pointer backdrop-blur-2xl transition-all hover:scale-[1.02] active:scale-[0.98] group"
              >
                {/* Left: Icon + Quantity Badge + Price */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#282526] border border-white/10 flex items-center justify-center text-[#E0FF33] shadow-md group-hover:bg-[#322E30] transition-colors">
                      <ShoppingBag size={18} />
                    </div>
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#E0FF33] text-black text-[10px] font-black rounded-full flex items-center justify-center font-['Outfit'] border-2 border-[#1E1B1C] shadow-sm leading-none">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                      <span className="text-sm sm:text-base font-black text-white font-['Outfit'] tracking-tight">
                        ₹{totalAmount}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400">
                        · {cart.reduce((s, i) => s + i.quantity, 0)} {cart.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#E0FF33] font-semibold truncate tracking-wide">
                      Satvik Prasad Basket
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
                  className="h-10 sm:h-11 px-4 sm:px-5 rounded-full bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg flex-shrink-0 whitespace-nowrap active:scale-95 transition-all cursor-pointer font-['Outfit']"
                >
                  <span>View Basket</span>
                  <ChevronRight size={14} strokeWidth={3} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. PRODUCT DETAIL MODAL / SHEET (Flawlessly Responsive: Mobile Sheet & Desktop 2-Column with Apple Spring Physics & Drag-Down Dismiss) */}
      {selectedDishDetails && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseDishDetail();
          }}
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/75 apple-overlay ${isDetailClosing ? 'closing' : ''}`}
        >
          <div
            ref={detailSheetRef}
            style={detailSheetStyle}
            className={`bg-[#1E1B1C] w-full max-w-[440px] md:max-w-3xl lg:max-w-4xl rounded-t-[36px] sm:rounded-[40px] md:p-6 overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col md:flex-row max-h-[92vh] md:max-h-[85vh] border border-white/10 relative apple-modal-spring max-md:apple-sheet-spring ${isDraggingDetail ? 'sheet-dragging' : ''} ${isDetailClosing ? 'closing' : ''}`}
          >

            {/* Close Button (Desktop Only) */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleCloseDishDetail(e);
              }}
              className="hidden md:flex absolute top-5 right-5 z-30 w-9 h-9 rounded-full bg-[#282526] hover:bg-[#322E30] active:scale-95 text-zinc-400 hover:text-white items-center justify-center transition-all cursor-pointer border border-white/10 shadow-md"
              title="Close (Esc)"
            >
              <X size={17} />
            </button>

            {/* LEFT / TOP CONTAINER (Ivory Cream `#FAF5EB` - Showcase Card) */}
            <div className="w-full md:w-[46%] lg:w-[44%] bg-[#FAF5EB] md:rounded-[30px] p-4 sm:p-6 flex flex-col justify-between relative flex-shrink-0">
              {/* Drag Handle Bar (Interactive Drag Down Area - Mobile Only) */}
              <div
                {...detailHandleProps}
                className="w-full py-2 -mt-2 mb-1 flex items-center justify-center cursor-grab active:cursor-grabbing md:hidden select-none touch-none"
                title="Drag down to close"
              >
                <div className="w-12 h-1.5 bg-zinc-400/80 hover:bg-zinc-500 active:bg-zinc-600 rounded-full transition-colors pointer-events-none" />
              </div>

              {/* Top Navigation Bar: Back (Mobile), Share, Favorite */}
              <div className="flex justify-between items-center z-10 mb-1.5 sm:mb-3 select-none">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseDishDetail(e);
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EDE6DC] hover:bg-[#E2D8CA] active:scale-95 shadow-sm flex items-center justify-center text-zinc-800 transition-all cursor-pointer font-black md:hidden"
                  title="Go Back"
                >
                  <ChevronLeft size={20} strokeWidth={2.5} />
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: selectedDishDetails.name, text: 'Check out this Satvik meal from Foody Vrinda!' })
                          .catch(err => {
                            if (err.name !== 'AbortError') {
                              console.warn('Share error:', err);
                            }
                          });
                      } else {
                        showToast("Link Copied", "success");
                      }
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EDE6DC] hover:bg-[#E2D8CA] shadow-sm flex items-center justify-center text-zinc-800 transition-all cursor-pointer apple-tap-target"
                    title="Share"
                  >
                    <Share2 size={16} />
                  </button>

                  <button
                    onClick={(e) => toggleFavorite(selectedDishDetails.id, e)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EDE6DC] hover:bg-[#E2D8CA] shadow-sm flex items-center justify-center transition-all cursor-pointer apple-tap-target"
                    title="Favorite"
                  >
                    <Heart
                      size={18}
                      className={favorites.includes(selectedDishDetails.id) ? 'text-red-500 fill-red-500' : 'text-zinc-800'}
                    />
                  </button>
                </div>
              </div>

              {/* Title & Micro-Info Pills (Mobile Only) */}
              <div className="z-10 md:hidden mb-1">
                <h2 className="text-xl sm:text-2xl font-black text-[#1E1B1C] tracking-tight leading-tight line-clamp-2 font-['Outfit']">
                  {selectedDishDetails.name}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p className="text-[#8B5E3C] text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                    {selectedDishDetails.category || "Satvik Meal"}
                  </p>
                  <span className="text-[#8B5E3C]/40 text-xs">•</span>
                  <p className="text-[#854D0E] text-[11px] sm:text-xs font-bold flex items-center gap-1">
                    <span>Nutrition</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-[#A16207] flex items-center justify-center text-[8px] font-black leading-none">i</span>
                  </p>
                </div>
              </div>

              {/* Hero Cutout Image */}
              <div className="relative py-1 sm:py-3 my-auto flex items-center justify-center min-h-[130px] xs:min-h-[150px] sm:min-h-[190px] md:min-h-[240px]">
                <div className="w-36 h-32 xs:w-44 xs:h-36 sm:w-56 sm:h-48 md:w-64 md:h-60 relative flex items-center justify-center">
                  <img
                    src={resolveDishCutout(selectedDishDetails.image, selectedDishDetails.name, selectedDishDetails.category)}
                    alt={selectedDishDetails.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/dishes/burger.png';
                    }}
                    className="w-full h-full object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.22)] select-none pointer-events-none"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                {/* Floating Tag Pill */}
                <div className="absolute bottom-0 left-0 sm:bottom-2 sm:left-2 z-10 flex items-center">
                  <span className="bg-[#FDE7D4] text-[#B25010] text-[10px] sm:text-xs font-black px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full shadow-md border border-[#FDBA74]/40">
                    {selectedDishDetails.tag || (selectedDishDetails.category === 'Sweets & Prasad' ? 'Sacred Prasad' : 'Full Protein')}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT / BOTTOM CONTAINER (Obsidian `#1E1B1C` - Content & Action Section) */}
            <div className="w-full md:w-[54%] lg:w-[56%] bg-[#1E1B1C] text-white flex-1 flex flex-col justify-between min-h-0 overflow-hidden z-10">

              {/* Scrollable Information Body */}
              <div className="overflow-y-auto flex-1 p-4 sm:p-6 md:p-2 md:pl-6 space-y-3 sm:space-y-4 no-scrollbar">
                {/* Desktop Dish Title & Category Header */}
                <div className="hidden md:block pr-8">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[#E0FF33] text-xs font-bold uppercase tracking-wider bg-[#E0FF33]/10 px-2.5 py-0.5 rounded-full">
                      {selectedDishDetails.category || "Satvik Meal"}
                    </span>
                    <span className="text-zinc-500 text-xs">•</span>
                    <span className="text-zinc-400 text-xs font-bold">100% Vedic Pure</span>
                    {cart.find(c => c.id === selectedDishDetails.id)?.quantity > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {cart.find(c => c.id === selectedDishDetails.id).quantity} in basket
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight font-['Outfit']">
                    {selectedDishDetails.name}
                  </h2>
                </div>

                {/* Price & Calories Row (Always Visible) */}
                <div className="flex justify-between items-center pt-0.5">
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Price</span>
                    <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white font-['Outfit']">
                      ₹{selectedDishDetails.price}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Energy</span>
                    <div className="text-xs sm:text-sm md:text-base font-bold text-[#E0FF33] flex items-center justify-end gap-1">
                      <span>{getItemNutrition(selectedDishDetails).kcal}</span>
                      <Flame size={15} className="text-amber-400 fill-amber-400/20" />
                    </div>
                  </div>
                </div>

                {/* Nutrition Macros Breakdown */}
                {(() => {
                  const nut = getItemNutrition(selectedDishDetails);
                  return (
                    <div className="bg-[#151314] border border-white/5 rounded-2xl p-2.5 sm:p-3 flex items-center justify-around text-center divide-x divide-white/10">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm md:text-base font-black text-white">{nut.carbs}</p>
                        <p className="text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase mt-0.5 tracking-wider">Carbs</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm md:text-base font-black text-white">{nut.fat}</p>
                        <p className="text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase mt-0.5 tracking-wider">Fat</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm md:text-base font-black text-white">{nut.protein}</p>
                        <p className="text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase mt-0.5 tracking-wider">Protein</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Bundled Combo Items Breakdown */}
                {selectedDishDetails.comboItems && selectedDishDetails.comboItems.length > 0 && (
                  <div className="bg-[#151314] border border-[#E0FF33]/20 rounded-2xl p-3 space-y-2">
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
                  <p className="text-[11px] sm:text-xs md:text-sm text-zinc-300 leading-relaxed font-normal">
                    {selectedDishDetails.description || "Our pure meal features authentic Vedic preparation, rich spices, pure desi ghee, and fresh ingredients cooked with love and devotion."}
                  </p>
                </div>

                {/* Satvik Assurance Badge */}
                <div className="flex items-center gap-1.5 bg-[#282526] px-3 py-2 rounded-xl border border-white/5 text-[11px] sm:text-xs text-zinc-300">
                  <span className="text-[#E0FF33] font-bold">✓</span>
                  <span className="truncate">100% Satvik · No Onion, No Garlic</span>
                </div>
              </div>

              {/* Sticky / Dedicated Action Dock (100% Accessible & Synchronized) */}
              {(() => {
                const currentInBasket = selectedDishDetails ? cart.find(c => c.id === selectedDishDetails.id) : null;
                const inBasketQty = currentInBasket ? currentInBasket.quantity : 0;

                return (
                  <div className="bg-[#1E1B1C]/95 backdrop-blur-md p-4 sm:p-6 md:p-0 md:pt-4 md:pl-6 border-t border-white/10 md:border-t-0 flex items-center gap-2.5 sm:gap-3 flex-shrink-0 z-30 pb-[max(1.25rem,env(safe-area-inset-bottom)+10px)] md:pb-0">
                    {/* Quantity Stepper (High-accessibility tactile pills) */}
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
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#E0FF33] hover:bg-[#ccff00] active:scale-90 flex items-center justify-center text-[#1E1B1C] cursor-pointer transition-all shadow-md apple-tap-target"
                        aria-label="Increase quantity"
                        title="Increase quantity"
                      >
                        <Plus size={14} strokeWidth={3} />
                      </button>
                    </div>

                    {/* Add / Update Cart Button */}
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
                          : `Add · ₹${(selectedDishDetails.price || 0) * detailQuantity}`}
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

      {/* CART DRAWER OVERLAY (Apple Bottom Sheet Spring Standard & Drag-Down Dismiss) */}
      {showCartDrawer && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseCartDrawer();
          }}
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/75 apple-overlay ${isCartClosing ? 'closing' : ''}`}
        >
          <div
            ref={cartSheetRef}
            style={cartSheetStyle}
            className={`bg-[#1E1B1C] border border-white/10 text-white w-full max-w-[440px] sm:max-w-md md:max-w-lg rounded-t-[36px] sm:rounded-[44px] p-5 sm:p-7 pb-[max(1.75rem,env(safe-area-inset-bottom)+14px)] shadow-[0_25px_70px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden apple-sheet-spring sm:apple-modal-spring ${isDraggingCart ? 'sheet-dragging' : ''} ${isCartClosing ? 'closing' : ''}`}
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

              {/* Header Title & Close Button - Draggable header bar */}
              <div
                {...cartHandleProps}
                className="flex justify-between items-center pb-3 border-b border-white/10 select-none cursor-grab active:cursor-grabbing touch-none"
              >
                <div className="flex items-center gap-2 pointer-events-none">
                  <ShoppingBag size={20} className="text-[#E0FF33]" />
                  <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">Your Basket</h3>
                </div>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseCartDrawer(e);
                  }}
                  className="w-9 h-9 rounded-full bg-[#282526] hover:bg-[#322E30] active:scale-95 flex items-center justify-center text-white cursor-pointer transition-all border border-white/10 relative z-30 pointer-events-auto"
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
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E0FF33] hover:bg-[#ccff00] active:scale-90 flex items-center justify-center text-[#1E1B1C] cursor-pointer transition-all shadow-md apple-tap-target"
                          aria-label="Increase quantity"
                          title="Increase quantity"
                        >
                          <Plus size={13} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
                  <span className="text-white font-bold">₹{deliveryCharge}</span>
                </div>
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/10 font-['Outfit']">
                  <span>Total</span>
                  <span className="text-[#E0FF33]">₹{totalAmount}</span>
                </div>
              </div>

              {/* Delivery Details Form */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 font-['Outfit']">
                    Delivery Details
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">Vedic Express</span>
                </div>

                {/* Name Input */}
                <div className={`relative flex items-center rounded-2xl px-3.5 py-1 transition-all shadow-inner ${
                  shakeField === 'name'
                    ? 'animate-shake bg-red-950/25 border-2 border-red-500 ring-2 ring-red-500/30'
                    : 'bg-[#181617] border border-white/10 hover:border-white/20 focus-within:border-[#E0FF33]/70 focus-within:ring-1 focus-within:ring-[#E0FF33]/20'
                }`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mr-2.5 transition-colors ${
                    shakeField === 'name' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-[#E0FF33]'
                  }`}>
                    <User size={15} />
                  </div>
                  <div className="flex-1 min-w-0 py-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 leading-none mb-1">
                        Recipient Name
                      </label>
                      {shakeField === 'name' && (
                        <span className="text-[9px] font-bold text-red-400 leading-none mb-1 animate-fade-in">Name Required</span>
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
                      className="w-full text-xs font-bold text-white bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-zinc-600 font-['Plus_Jakarta_Sans']"
                    />
                  </div>
                  <div className="flex items-center shrink-0">
                    {checkoutName.trim().length >= 2 && /^[a-zA-Z\s'.]+$/.test(checkoutName.trim()) && (
                      <span className="w-5 h-5 rounded-full bg-[#E0FF33]/15 text-[#E0FF33] flex items-center justify-center animate-scale-up" title="Valid Name">
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Phone Input */}
                <div className={`relative flex items-center rounded-2xl px-3.5 py-1 transition-all shadow-inner ${
                  shakeField === 'phone'
                    ? 'animate-shake bg-red-950/25 border-2 border-red-500 ring-2 ring-red-500/30'
                    : 'bg-[#181617] border border-white/10 hover:border-white/20 focus-within:border-[#E0FF33]/70 focus-within:ring-1 focus-within:ring-[#E0FF33]/20'
                }`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mr-2.5 transition-colors ${
                    shakeField === 'phone' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-[#E0FF33]'
                  }`}>
                    <Phone size={14} />
                  </div>
                  <div className="flex-1 min-w-0 py-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 leading-none mb-1">
                        Contact Phone
                      </label>
                      {shakeField === 'phone' && (
                        <span className="text-[9px] font-bold text-red-400 leading-none mb-1 animate-fade-in">10 Digits Required</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-400 select-none">+91</span>
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
                        className="w-full text-xs font-bold text-white bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-zinc-600 font-['Plus_Jakarta_Sans']"
                      />
                    </div>
                  </div>
                  <div className="flex items-center shrink-0">
                    {checkoutPhone.length === 10 && (
                      <span className="w-5 h-5 rounded-full bg-[#E0FF33]/15 text-[#E0FF33] flex items-center justify-center animate-scale-up" title="Valid Mobile">
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Address Input */}
                <div className="relative">
                  <div className={`relative flex items-center rounded-2xl px-3.5 py-1 transition-all shadow-inner ${
                    shakeField === 'address'
                      ? 'animate-shake bg-red-950/25 border-2 border-red-500 ring-2 ring-red-500/30'
                    : 'bg-[#181617] border border-white/10 hover:border-white/20 focus-within:border-[#E0FF33]/70 focus-within:ring-1 focus-within:ring-[#E0FF33]/20'
                  }`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mr-2.5 transition-colors ${
                      shakeField === 'address' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-[#E0FF33]'
                    }`}>
                      <MapPin size={15} />
                    </div>
                    <div className="flex-1 min-w-0 py-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 leading-none mb-1">
                          Delivery Address
                        </label>
                        {shakeField === 'address' && (
                          <span className="text-[9px] font-bold text-red-400 leading-none mb-1 animate-fade-in">Address Required</span>
                        )}
                      </div>
                      <input
                        ref={addressInputRef}
                        type="text"
                        value={checkoutAddress}
                        onChange={(e) => {
                          setCheckoutAddress(e.target.value);
                          if (shakeField === 'address') setShakeField(null);
                        }}
                        placeholder="Street, Ashram, or Landmark..."
                        className="w-full text-xs font-bold text-white bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-zinc-600 font-['Plus_Jakarta_Sans']"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAutoFillLocation();
                      }}
                      className="h-8 px-2.5 rounded-xl bg-[#E0FF33]/15 hover:bg-[#E0FF33]/25 border border-[#E0FF33]/30 text-[#E0FF33] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shrink-0 ml-1.5 active:scale-95 z-10 apple-tap-target"
                      title="Auto-fill GPS address or pin on map"
                    >
                      <Compass size={13} />
                      <span className="hidden sm:inline">Auto-Fill</span>
                    </button>
                  </div>

                  {/* OpenStreetMap Nominatim / Vedic Landmark Autocomplete Dropdown */}
                  {showAddressDropdown && addressSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#201D1E] border border-[#E0FF33]/30 rounded-2xl p-2 shadow-2xl z-30 max-h-48 overflow-y-auto no-scrollbar space-y-1 backdrop-blur-xl">
                      {isFetchingAddress && (
                        <p className="text-[10px] text-zinc-500 px-3 py-1">Searching landmarks...</p>
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
                          className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 transition-all text-xs flex items-start gap-2 text-zinc-300 hover:text-white cursor-pointer"
                        >
                          <MapPin size={14} className="text-[#E0FF33] mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate text-xs">{item.title || item.name || (item.address ? item.address.split(',')[0] : 'Landmark')}</p>
                            <p className="text-[10px] text-zinc-400 truncate">{item.address || item.display_name || ''}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!onlineAvailable}
                    onClick={() => setPaymentMethod('online')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all apple-tap-target ${!onlineAvailable
                      ? 'bg-[#151314]/50 text-zinc-600 border-white/5 cursor-not-allowed opacity-50'
                      : paymentMethod === 'online'
                        ? 'bg-[#E0FF33] text-[#1E1B1C] border-[#E0FF33] shadow-md cursor-pointer'
                        : 'bg-[#151314] text-zinc-400 border-white/5 hover:border-white/10 cursor-pointer'
                      }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap size={14} className={onlineAvailable && paymentMethod === 'online' ? 'text-[#1E1B1C]' : 'text-[#E0FF33]'} />
                      <span>Online Pay</span>
                    </div>
                    {!onlineAvailable && (
                      <span className="text-[9px] text-zinc-500 font-medium">
                        {!globalOnline ? '(Platform Off)' : '(Kitchen Off)'}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!codAvailable}
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all apple-tap-target ${!codAvailable
                      ? 'bg-[#151314]/50 text-zinc-600 border-white/5 cursor-not-allowed opacity-50'
                      : paymentMethod === 'cash'
                        ? 'bg-[#E0FF33] text-[#1E1B1C] border-[#E0FF33] shadow-md cursor-pointer'
                        : 'bg-[#151314] text-zinc-400 border-white/5 hover:border-white/10 cursor-pointer'
                      }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Banknote size={14} className={codAvailable && paymentMethod === 'cash' ? 'text-[#1E1B1C]' : 'text-emerald-400'} />
                      <span>Cash</span>
                    </div>
                    {!codAvailable && (
                      <span className="text-[9px] text-zinc-500 font-medium">
                        {!globalCod ? '(Platform Off)' : '(Kitchen Off)'}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Fixed Action Footer */}
            <div className="shrink-0 pt-2 border-t border-white/5 space-y-2">
              {/* Seamless Trust & Live Tracking Micro-Indicator */}
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-['Plus_Jakarta_Sans'] px-1">
                <div className="flex items-center gap-1.5 text-[#E0FF33]">
                  <Zap size={13} className="text-[#E0FF33]" />
                  <span className="font-bold text-neutral-300">Live GPS tracking included</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-medium">Satvik Cloud Kitchen</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={!onlineAvailable && !codAvailable}
                className="w-full bg-[#E0FF33] hover:bg-[#CCFF00] disabled:opacity-40 disabled:cursor-not-allowed text-[#1E1B1C] font-black py-3.5 sm:py-4 px-5 sm:px-6 rounded-full text-sm sm:text-base shadow-xl cursor-pointer transition-all apple-tap-target active:scale-98 flex items-center justify-between font-['Outfit']"
              >
                <span className="font-black">
                  {!onlineAvailable && !codAvailable ? 'Kitchen Payments Disabled' : 'Proceed to Place Order'}
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
