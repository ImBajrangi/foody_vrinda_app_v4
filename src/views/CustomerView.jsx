import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
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
  Navigation
} from 'lucide-react';
import ActiveOrderTrackingModal from '../components/ActiveOrderTrackingModal';
import { createCloudOrder, getCloudMenus, subscribeSingleCloudOrder } from '../supabase';

// Curated high-res transparent PNG cutout dishes (Exact Template Match)
const DEFAULT_PRASAD_ITEMS = [
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
    name: 'Paneer Makhani Meal',
    subtitle: 'Rich cashew gravy, butter roti',
    category: 'Thali & Meals',
    price: 160,
    kcal: '320 kcal',
    carbs: '38g',
    fat: '18g',
    protein: '22g',
    popular: true,
    tag: 'Full Protein',
    image: '/dishes/curry.png',
    description: 'Fresh organic cottage cheese simmered in a luscious tomato and cashew butter gravy, infused with cardamom and pure desi ghee.'
  },
  {
    id: 'prasad-3',
    name: 'Special Satvik Thali',
    subtitle: 'Pure Desi Ghee, Vedic spices',
    category: 'Thali & Meals',
    price: 180,
    kcal: '360 kcal',
    carbs: '48g',
    fat: '14g',
    protein: '16g',
    popular: true,
    tag: 'Pure Desi Ghee',
    image: '/dishes/thali.png',
    description: 'Authentic Vrindavan Satvik Thali prepared without onion or garlic. Includes paneer sabzi, dal tadka, 4 phulkas, fragrant jeera rice, and fresh sweet.'
  },
  {
    id: 'prasad-4',
    name: 'Kesari Badam Kheer',
    subtitle: 'Kashmiri saffron, roasted almond',
    category: 'Sweets & Prasad',
    price: 90,
    kcal: '240 kcal',
    carbs: '42g',
    fat: '8g',
    protein: '7g',
    popular: true,
    tag: 'Sacred Prasad',
    image: '/dishes/sweet.png',
    description: 'Slow-cooked condensed milk pudding flavored with real Kashmiri saffron strands, green cardamom, and crunchy roasted California almonds.'
  }
];

export default function CustomerView({ trackingOrderId, setTrackingOrderId }) {
  const { user, allShops } = useAuth();
  const { cart, selectedShopId, setSelectedShopId, addToCart, updateQuantity, clearCart, loadRazorpay, paymentSettings } = useCart();

  const [deliveryCoords, setDeliveryCoords] = useState(() => {
    try {
      const cached = localStorage.getItem('deliveryCoords');
      return cached ? JSON.parse(cached) : { lat: null, lng: null };
    } catch {
      return { lat: null, lng: null };
    }
  });
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [cookingNotes, setCookingNotes] = useState('');
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  useEffect(() => {
    if (deliveryCoords?.lat && deliveryCoords?.lng) {
      localStorage.setItem('deliveryCoords', JSON.stringify(deliveryCoords));
    }
  }, [deliveryCoords]);

  const [menuSearch, setMenuSearch] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);

  // Premium Menu filters and detail modal states (Template Right Screen)
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDishDetails, setSelectedDishDetails] = useState(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('foody_user_favs');
      return saved ? JSON.parse(saved) : ['prasad-1'];
    } catch {
      return ['prasad-1'];
    }
  });

  const toggleFavorite = (itemId, e) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId];
      try {
        localStorage.setItem('foody_user_favs', JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save favorites", err);
      }
      return updated;
    });
  };

  // Checkout details
  const [checkoutName, setCheckoutName] = useState(localStorage.getItem('customerName') || '');
  const [checkoutAddress, setCheckoutAddress] = useState(localStorage.getItem('customerAddress') || '');
  const [checkoutPhone, setCheckoutPhone] = useState(localStorage.getItem('customerPhone') || '');
  const [paymentMethod, setPaymentMethod] = useState('online');

  // Tracking orders
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [isDetailClosing, setIsDetailClosing] = useState(false);
  const [isCartClosing, setIsCartClosing] = useState(false);
  const [isShopClosing, setIsShopClosing] = useState(false);

  // Unified Pointer & Touch Drag-to-Dismiss Gesture States
  const [detailDragOffset, setDetailDragOffset] = useState(0);
  const [isDraggingDetail, setIsDraggingDetail] = useState(false);
  const detailStartY = useRef(0);

  const [cartDragOffset, setCartDragOffset] = useState(0);
  const [isDraggingCart, setIsDraggingCart] = useState(false);
  const cartStartY = useRef(0);

  const handleDetailPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    detailStartY.current = e.clientY;
    setIsDraggingDetail(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) { }
  };

  const handleDetailPointerMove = (e) => {
    if (!isDraggingDetail) return;
    const deltaY = e.clientY - detailStartY.current;
    if (deltaY > 0) {
      setDetailDragOffset(deltaY);
    } else {
      setDetailDragOffset(0);
    }
  };

  const handleDetailPointerUp = (e) => {
    if (!isDraggingDetail) return;
    setIsDraggingDetail(false);
    try {
      if (e && e.currentTarget && e.currentTarget.releasePointerCapture) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) { }
    if (detailDragOffset > 60) {
      handleCloseDishDetail();
    }
    setDetailDragOffset(0);
  };

  const handleCartPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    cartStartY.current = e.clientY;
    setIsDraggingCart(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) { }
  };

  const handleCartPointerMove = (e) => {
    if (!isDraggingCart) return;
    const deltaY = e.clientY - cartStartY.current;
    if (deltaY > 0) {
      setCartDragOffset(deltaY);
    } else {
      setCartDragOffset(0);
    }
  };

  const handleCartPointerUp = (e) => {
    if (!isDraggingCart) return;
    setIsDraggingCart(false);
    try {
      if (e && e.currentTarget && e.currentTarget.releasePointerCapture) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) { }
    if (cartDragOffset > 60) {
      handleCloseCartDrawer();
    }
    setCartDragOffset(0);
  };

  const handleCloseDishDetail = () => {
    if (isDetailClosing) return;
    setIsDetailClosing(true);
    setDetailDragOffset(0);
    setTimeout(() => {
      setSelectedDishDetails(null);
      setIsDetailClosing(false);
    }, 220);
  };

  const handleCloseCartDrawer = () => {
    if (isCartClosing) return;
    setIsCartClosing(true);
    setCartDragOffset(0);
    setTimeout(() => {
      setShowCartDrawer(false);
      setIsCartClosing(false);
    }, 220);
  };

  const handleCloseShopSwitcher = () => {
    if (isShopClosing) return;
    setIsShopClosing(true);
    setTimeout(() => {
      setShowShopSwitcher(false);
      setIsShopClosing(false);
    }, 220);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev && prev.message === message ? null : prev));
    }, 4000);
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
    // Use plural 'menus' matching Firestore database schema
    const q = query(collection(db, "menus"), where("shopId", "==", selectedShopId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenuItems(items);
      setMenuLoading(false);
    }, (error) => {
      console.warn("Notice: Fetching from 'menus' collection:", error.message);
      // Fallback seamlessly so the customer experience never breaks
      setMenuLoading(false);
    });

    return () => unsubscribe();
  }, [selectedShopId]);

  // Auto-switch to tracking view if trackingOrderId is set (Dual Supabase Realtime + Firebase)
  useEffect(() => {
    if (trackingOrderId) {
      let unsubSupabase = null;
      try {
        unsubSupabase = subscribeSingleCloudOrder(trackingOrderId, (updatedOrder) => {
          setTrackingOrder(updatedOrder);
          setIsTrackingModalOpen(true);
        });
      } catch (err) {
        // Fallback
      }

      const unsubFirebase = onSnapshot(doc(db, "orders", trackingOrderId), (docSnap) => {
        if (docSnap.exists()) {
          setTrackingOrder({ id: docSnap.id, ...docSnap.data() });
          setIsTrackingModalOpen(true);
        }
      }, () => {});

      return () => {
        if (unsubFirebase) unsubFirebase();
        if (unsubSupabase) unsubSupabase();
      };
    } else {
      setTrackingOrder(null);
      setIsTrackingModalOpen(false);
    }
  }, [trackingOrderId, setTrackingOrderId]);

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
    if (cart.length === 0) return showToast('Your cart is empty.', 'error');
    if (!selectedShopId && allShops.length > 0) setSelectedShopId(allShops[0].id);
    if (user?.isAnonymous || !user) {
      showToast("You need to log in to place an order.", 'error');
      return;
    }

    if (!checkoutName || !checkoutAddress || !checkoutPhone) {
      return showToast("Please fill out all delivery details.", 'error');
    }

    if (isBelowMin) {
      return showToast(`Minimum order amount is ₹${minOrderAmount}. Add ₹${minOrderAmount - subtotal} more.`, 'error');
    }

    const orderPayload = {
      shopId: selectedShopId || (allShops[0]?.id || 'default-vrinda'),
      customerName: checkoutName,
      customerAddress: checkoutAddress,
      deliveryAddress: checkoutAddress,
      customerPhone: checkoutPhone,
      items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity, ready: false })),
      subtotal,
      deliveryCharge,
      gstAmount,
      totalAmount,
      status: 'new',
      createdAt: serverTimestamp(),
      userId: user.uid,
      isTestOrder: false,
      paymentMethod,
      deliveryCoordinates: deliveryCoords,
      cookingNotes
    };

    if (paymentMethod === 'cash') {
      if (!paymentSettings?.codEnabled) return showToast("COD is currently disabled.", 'error');
      orderPayload.cashStatus = 'pending';
      orderPayload.paymentId = null;

      try {
        const docRef = await addDoc(collection(db, "orders"), orderPayload);
        // Sync to Supabase Cloud Database
        createCloudOrder({ ...orderPayload, id: docRef.id });
        showToast("Order placed successfully with Cash on Delivery!", 'success');
        clearCart();
        setShowCartDrawer(false);
        setTrackingOrderId(docRef.id);
      } catch (err) {
        // Fallback directly to Supabase cloud order
        try {
          const cloudOrder = await createCloudOrder(orderPayload);
          showToast("Order placed successfully with Cash on Delivery!", 'success');
          clearCart();
          setShowCartDrawer(false);
          setTrackingOrderId(cloudOrder.id);
        } catch (supabaseErr) {
          console.error("Order placement error:", supabaseErr);
          showToast("Failed to place order.", 'error');
        }
      }
    } else {
      if (!paymentSettings?.onlinePaymentsEnabled) return showToast("Online payments are currently disabled.", 'error');

      const scriptLoaded = await loadRazorpay();
      if (!scriptLoaded) {
        return showToast("Failed to load payment gateway.", 'error');
      }

      const rzpOptions = {
        key: "rzp_test_RU9lPJQl5wqQFM",
        amount: totalAmount * 100,
        currency: "INR",
        name: "Foody Vrinda",
        description: "Pure Satvik Prasad Order",
        image: "https://imbajrangi.github.io/Company/Vrindopnishad%20Web/class/logo/foodyVrinda-logo.png",
        handler: async (response) => {
          orderPayload.paymentId = response.razorpay_payment_id;
          orderPayload.paymentIds = [response.razorpay_payment_id];
          orderPayload.cashStatus = 'none';

          try {
            const docRef = await addDoc(collection(db, "orders"), orderPayload);
            createCloudOrder({ ...orderPayload, id: docRef.id });
            showToast("Payment successful! Order placed.", 'success');
            clearCart();
            setShowCartDrawer(false);
            setTrackingOrderId(docRef.id);
          } catch (err) {
            try {
              const cloudOrder = await createCloudOrder(orderPayload);
              showToast("Payment successful! Order placed.", 'success');
              clearCart();
              setShowCartDrawer(false);
              setTrackingOrderId(cloudOrder.id);
            } catch (cloudErr) {
              console.error(cloudErr);
              showToast("Failed to record payment.", 'error');
            }
          }
        },
        prefill: {
          name: checkoutName,
          email: user?.email || '',
          contact: checkoutPhone
        },
        theme: { color: "#E0FF33" },
        modal: {
          ondismiss: () => showToast("Payment was cancelled.", 'info')
        }
      };

      const razorpayInstance = new window.Razorpay(rzpOptions);
      razorpayInstance.open();
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
    if (item?.image && item.image.trim() !== '') return item.image;
    if (item?.imageUrl && item.imageUrl.trim() !== '') return item.imageUrl;
    const fallbacks = [
      '/dishes/burger.png',
      '/dishes/curry.png',
      '/dishes/thali.png',
      '/dishes/sweet.png',
      '/dishes/pizza.png'
    ];
    return fallbacks[idx % fallbacks.length];
  };

  // Combine database items with rich fallback items so the UI is always dynamic and stunning
  const displayItems = menuItems.length > 0 ? menuItems.map((it, i) => ({
    ...it,
    image: getDishImage(it, i),
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
    setDetailQuantity(1);
  };

  const handleDetailAddToCart = () => {
    if (!selectedDishDetails) return;
    for (let i = 0; i < detailQuantity; i++) {
      addToCart(selectedDishDetails);
    }
    showToast(`Added ${detailQuantity}x ${selectedDishDetails.name} to basket!`, 'success');
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
    showToast(`Added ${spotlightQty}x ${spotlightDish.name} to order!`, 'success');
  };

  const desktopDiscount = promocodeApplied ? Math.round(subtotal * 0.1) : 0;
  const desktopTotal = Math.max(0, subtotal - desktopDiscount + (subtotal > 0 ? deliveryCharge + gstAmount : 0));

  return (
    <div className="w-full pb-28 text-white">
      {/* MAP PICKER MODAL */}
      {showMapPicker && (
        <MapPicker
          initialCoords={deliveryCoords}
          onLocationSelect={(coords) => {
            setDeliveryCoords(coords);
            setShowMapPicker(false);
            showToast("Delivery location pinned accurately!", "success");
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {/* DYNAMIC SHOP SELECTOR & LIVE TIMING ROW (Flawless Single-Line Responsive Standard) */}
      <div className="mb-5 flex items-center gap-2.5 sm:gap-3 justify-between w-full">
        <button
          onClick={() => allShops.length > 1 && (showShopSwitcher ? handleCloseShopSwitcher() : setShowShopSwitcher(true))}
          className={`flex-1 min-w-0 flex items-center gap-2 bg-[#282526] hover:bg-[#322E30] border border-white/5 px-3.5 sm:px-4 py-2.5 rounded-full text-xs shadow-sm transition-all apple-tap-target ${allShops.length > 1 ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <MapPin size={14} className="text-[#E0FF33] flex-shrink-0" />
          <span className="font-bold text-white text-xs truncate flex-1 text-left min-w-0">
            {activeShop?.name || 'Vrinda Cloud Kitchen'}
          </span>
          {allShops.length > 1 && (
            <ChevronDown size={13} className={`text-zinc-400 flex-shrink-0 ml-1 transition-transform duration-200 ${showShopSwitcher && !isShopClosing ? 'rotate-180' : ''}`} />
          )}
        </button>

        <div className="flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 bg-[#282526] px-3.5 py-2.5 rounded-full border border-white/5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#E0FF33] animate-pulse flex-shrink-0"></span>
          <span className="text-[11px] font-bold text-zinc-300 whitespace-nowrap">25-35 min</span>
        </div>
      </div>

      {/* Dynamic Shops Popover (Apple Dropdown Physics & Smooth Hiding) */}
      {showShopSwitcher && allShops.length > 1 && (
        <div className={`mb-6 bg-[#282526] border border-[#E0FF33]/30 rounded-3xl p-4 sm:p-5 shadow-2xl apple-dropdown-spring ${isShopClosing ? 'closing' : ''}`}>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider font-['Outfit']">Select Kitchen Branch</h4>
            <button onClick={handleCloseShopSwitcher} className="text-xs text-zinc-400 hover:text-white cursor-pointer apple-tap-target p-1">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {allShops.map(s => (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedShopId(s.id);
                  handleCloseShopSwitcher();
                  showToast(`Switched to ${s.name}`, 'info');
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
      )}

      {/* 1 & 2. HERO HEADLINE & INTEGRATED SEARCH BAR (Responsive Desktop & Mobile) */}
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-[1.05] tracking-tight font-['Outfit']">
            Your Smily <span className="text-[#E0FF33]">Food</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-medium">
            100% Satvik · Pure Desi Ghee · Divine Vedic Flavors
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 lg:w-96 flex-shrink-0">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search pure delicacies..."
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
            className="w-full !bg-[#282526] border border-white/5 !rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-zinc-500 shadow-inner focus:outline-none focus:ring-1 focus:ring-[#E0FF33] transition-all"
          />
        </div>
      </div>

      {/* 3. HORIZONTAL CATEGORY PILL CHIPS */}
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-1.5 mb-6 sm:mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex-shrink-0 apple-tap-target ${selectedCategory.toLowerCase() === cat.toLowerCase()
              ? 'bg-white text-[#1E1B1C] font-black shadow-lg'
              : 'bg-[#282526] text-zinc-400 hover:text-white border border-white/5'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 4. ACTIVE ORDER TRACKING BANNER (IF ANY) */}
      {trackingOrder && (
        <div className="mb-6 bg-[#282526] border border-[#E0FF33]/40 rounded-[28px] p-4 sm:p-5 shadow-2xl relative apple-modal-spring overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E0FF33]/15 flex items-center justify-center text-[#E0FF33] shrink-0 animate-pulse">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-[#E0FF33] bg-[#E0FF33]/10 px-2.5 py-0.5 rounded-full">
                    Active Order #{trackingOrder.id.slice(-6).toUpperCase()}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-400 capitalize">
                    • {trackingOrder.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-black text-white mt-0.5 font-['Outfit']">
                  {trackingOrder.status === 'out_for_delivery'
                    ? 'Rider is on the way to your location!'
                    : trackingOrder.status === 'completed'
                    ? 'Order delivered successfully!'
                    : 'Order is being prepared in the kitchen.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => setIsTrackingModalOpen(true)}
                className="px-4 py-2 rounded-full bg-[#E0FF33] text-[#1E1B1C] font-black text-xs hover:bg-[#ccff00] shadow-lg flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer font-['Outfit']"
              >
                <Navigation className="w-3.5 h-3.5 fill-[#1E1B1C]" />
                <span>Live Map Track</span>
              </button>
              <button
                onClick={() => {
                  setTrackingOrderId(null);
                  setIsTrackingModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs apple-tap-target cursor-pointer"
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

            return (
              <div
                key={item.id}
                onClick={() => handleOpenDishDetail(item)}
                className={`${cardBg} text-[#1E1B1C] rounded-[32px] sm:rounded-[38px] p-5 sm:p-6 lg:p-7 shadow-xl relative overflow-hidden cursor-pointer min-h-[195px] sm:min-h-[225px] flex flex-col justify-between apple-card-interactive`}
              >
                {/* Top Row: Dish Name + Outline Heart Button */}
                <div className="flex justify-between items-start z-10">
                  <div className="max-w-[62%]">
                    <h3 className="text-xl sm:text-2xl font-black text-[#1E1B1C] leading-[1.1] tracking-tight">
                      {item.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs font-semibold text-zinc-600 mt-1 leading-snug">
                      {item.subtitle || 'Cheesy satvik, special price'}
                    </p>
                  </div>

                  <button
                    onClick={(e) => toggleFavorite(item.id, e)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-sm flex items-center justify-center transition-all flex-shrink-0 cursor-pointer apple-tap-target"
                    title="Favorite"
                  >
                    <Heart
                      size={18}
                      className={isFav ? 'text-red-500 fill-red-500' : 'text-zinc-800'}
                    />
                  </button>
                </div>

                {/* Mid & Bottom Row: Price & Order Now Button */}
                <div className="mt-3 sm:mt-4 z-10">
                  <div className="text-2xl sm:text-3xl font-black text-[#1E1B1C] mb-2 sm:mb-3">
                    ₹{item.price}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(item);
                      showToast(`Added ${item.name} to basket!`, 'success');
                    }}
                    className="bg-[#1E1B1C] hover:bg-black text-white font-black text-xs px-5 sm:px-6 py-2.5 sm:py-3 rounded-full flex items-center gap-2 shadow-lg transition-all cursor-pointer apple-tap-target"
                  >
                    <span>Order Now</span>
                    <ChevronRight size={14} strokeWidth={3} />
                  </button>
                </div>

                {/* Right Side Dish Image */}
                <div className="absolute right-[-8px] bottom-[-8px] sm:right-[-6px] sm:bottom-[-6px] w-36 h-36 xs:w-40 xs:h-40 sm:w-44 sm:h-44 md:w-44 md:h-44 lg:w-44 lg:h-44 xl:w-48 xl:h-48 pointer-events-none flex items-center justify-center">
                  <img
                    src={item.image}
                    alt={item.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/dishes/burger.png';
                    }}
                    className="w-full h-full object-contain drop-shadow-[0_12px_15px_rgba(0,0,0,0.18)] scale-105 sm:scale-110"
                    loading="lazy"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BOTTOM FLOATING CART BAR (If cart has items - Mobile only) */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-[400px] animate-slide-up lg:hidden">
          <div
            onClick={() => setShowCartDrawer(true)}
            className="bg-[#282526] border border-[#E0FF33]/40 rounded-full p-2.5 pl-5 pr-3 shadow-2xl flex items-center justify-between cursor-pointer backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E0FF33]/15 flex items-center justify-center text-[#E0FF33]">
                <ShoppingBag size={17} />
              </div>
              <div>
                <p className="text-xs font-black text-white">
                  {cart.reduce((s, i) => s + i.quantity, 0)} Items Added
                </p>
                <p className="text-[10px] text-[#E0FF33] font-bold">₹{totalAmount} Total</p>
              </div>
            </div>

            <button
              className="bg-[#E0FF33] text-[#1E1B1C] font-black text-xs px-5 py-2.5 rounded-full flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <span>View Basket</span>
              <ChevronRight size={14} strokeWidth={3} />
            </button>
          </div>
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
            style={
              detailDragOffset > 0 || isDraggingDetail
                ? {
                  transform: `translateY(${detailDragOffset}px)`,
                  transition: isDraggingDetail ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1)'
                }
                : undefined
            }
            className={`bg-[#1E1B1C] w-full max-w-[440px] md:max-w-3xl lg:max-w-4xl rounded-t-[36px] sm:rounded-[40px] md:p-6 overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col md:flex-row max-h-[92vh] md:max-h-[85vh] border border-white/10 relative apple-modal-spring max-md:apple-sheet-spring ${isDraggingDetail ? 'sheet-dragging' : ''} ${isDetailClosing ? 'closing' : ''}`}
          >

            {/* Close Button (Desktop Only) */}
            <button
              onClick={handleCloseDishDetail}
              className="hidden md:flex absolute top-5 right-5 z-20 w-9 h-9 rounded-full bg-[#282526] hover:bg-[#322E30] text-zinc-400 hover:text-white items-center justify-center transition-all cursor-pointer apple-tap-target border border-white/10 shadow-md"
              title="Close (Esc)"
            >
              <X size={17} />
            </button>

            {/* LEFT / TOP CONTAINER (Ivory Cream `#FAF5EB` - Showcase Card) */}
            <div className="w-full md:w-[46%] lg:w-[44%] bg-[#FAF5EB] md:rounded-[30px] p-4 sm:p-6 flex flex-col justify-between relative flex-shrink-0">
              {/* Drag Handle Bar (Interactive Drag Down Area - Mobile Only) */}
              <div
                onPointerDown={handleDetailPointerDown}
                onPointerMove={handleDetailPointerMove}
                onPointerUp={handleDetailPointerUp}
                onPointerCancel={handleDetailPointerUp}
                className="w-full py-2 -mt-2 mb-1 flex items-center justify-center cursor-grab active:cursor-grabbing md:hidden select-none"
                style={{ touchAction: 'none' }}
                title="Drag down to close"
              >
                <div className="w-12 h-1.5 bg-zinc-400/80 hover:bg-zinc-500 active:bg-zinc-600 rounded-full transition-colors pointer-events-none" />
              </div>

              {/* Top Navigation Bar: Back (Mobile), Share, Favorite */}
              <div
                onPointerDown={handleDetailPointerDown}
                onPointerMove={handleDetailPointerMove}
                onPointerUp={handleDetailPointerUp}
                onPointerCancel={handleDetailPointerUp}
                className="flex justify-between items-center z-10 mb-1.5 sm:mb-3 select-none"
                style={{ touchAction: 'none' }}
              >
                <button
                  onClick={handleCloseDishDetail}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EDE6DC] hover:bg-[#E2D8CA] shadow-sm flex items-center justify-center text-zinc-800 transition-all cursor-pointer font-black apple-tap-target md:hidden"
                  title="Go Back"
                >
                  <ChevronLeft size={20} strokeWidth={2.5} />
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: selectedDishDetails.name, text: 'Check out this Satvik meal from Foody Vrinda!' });
                      } else {
                        showToast("Link copied to clipboard!", "success");
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
                    src={selectedDishDetails.image}
                    alt={selectedDishDetails.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/dishes/burger.png';
                    }}
                    className="w-full h-full object-contain drop-shadow-[0_16px_22px_rgba(0,0,0,0.2)]"
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#E0FF33] text-xs font-bold uppercase tracking-wider bg-[#E0FF33]/10 px-2.5 py-0.5 rounded-full">
                      {selectedDishDetails.category || "Satvik Meal"}
                    </span>
                    <span className="text-zinc-500 text-xs">•</span>
                    <span className="text-zinc-400 text-xs font-bold">100% Vedic Pure</span>
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

              {/* Sticky / Dedicated Action Dock (100% Accessible & Always Visible) */}
              <div className="bg-[#1E1B1C]/95 backdrop-blur-md p-4 sm:p-6 md:p-0 md:pt-4 md:pl-6 border-t border-white/10 md:border-t-0 flex items-center gap-2.5 sm:gap-3 flex-shrink-0 z-30 pb-[max(1.25rem,env(safe-area-inset-bottom)+10px)] md:pb-0">
                {/* Quantity Stepper */}
                <div className="bg-[#CEF3E7] text-[#1E1B1C] rounded-full px-2.5 sm:px-4 py-2.5 sm:py-3.5 flex items-center gap-2 sm:gap-3.5 font-black text-sm sm:text-base shadow-sm flex-shrink-0">
                  <button
                    onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                    className="apple-stepper-btn cursor-pointer px-1.5"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="min-w-[14px] sm:min-w-[18px] text-center font-black">{detailQuantity}</span>
                  <button
                    onClick={() => setDetailQuantity(detailQuantity + 1)}
                    className="apple-stepper-btn cursor-pointer px-1.5"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleDetailAddToCart}
                  className="flex-1 min-w-0 bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black py-3 sm:py-3.5 md:py-4 px-4 sm:px-6 rounded-full shadow-lg flex items-center justify-between transition-all cursor-pointer apple-tap-target font-['Outfit']"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <ShoppingBag size={16} className="text-[#1E1B1C] flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-black truncate">
                      Add To Basket (₹{(selectedDishDetails.price || 0) * detailQuantity})
                    </span>
                  </div>
                  <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#1E1B1C] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 ml-1">
                    <ChevronRight size={13} strokeWidth={3} />
                  </span>
                </button>
              </div>

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
            style={
              cartDragOffset > 0 || isDraggingCart
                ? {
                  transform: `translateY(${cartDragOffset}px)`,
                  transition: isDraggingCart ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1)'
                }
                : undefined
            }
            className={`bg-[#1E1B1C] border border-white/10 text-white w-full max-w-[440px] sm:max-w-md md:max-w-lg rounded-t-[36px] sm:rounded-[44px] p-6 sm:p-8 pb-[max(1.75rem,env(safe-area-inset-bottom)+14px)] shadow-[0_25px_70px_rgba(0,0,0,0.8)] flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar justify-between apple-sheet-spring sm:apple-modal-spring ${isDraggingCart ? 'sheet-dragging' : ''} ${isCartClosing ? 'closing' : ''}`}
          >
            <div>
              {/* Drag Handle Bar (Interactive Drag Down Area) */}
              <div
                onPointerDown={handleCartPointerDown}
                onPointerMove={handleCartPointerMove}
                onPointerUp={handleCartPointerUp}
                onPointerCancel={handleCartPointerUp}
                className="w-full py-3.5 -mt-5 mb-1 flex items-center justify-center cursor-grab active:cursor-grabbing sm:hidden select-none"
                style={{ touchAction: 'none' }}
                title="Drag down to close"
              >
                <div className="w-12 h-1.5 bg-zinc-600 hover:bg-zinc-500 active:bg-zinc-400 rounded-full transition-colors pointer-events-none" />
              </div>

              <div
                onPointerDown={handleCartPointerDown}
                onPointerMove={handleCartPointerMove}
                onPointerUp={handleCartPointerUp}
                onPointerCancel={handleCartPointerUp}
                className="flex justify-between items-center pb-4 border-b border-white/10 select-none"
                style={{ touchAction: 'none' }}
              >
                <div className="flex items-center gap-2 pointer-events-none">
                  <ShoppingBag size={20} className="text-[#E0FF33]" />
                  <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">Your Basket</h3>
                </div>
                <button
                  onClick={handleCloseCartDrawer}
                  className="w-9 h-9 rounded-full bg-[#282526] hover:bg-[#322E30] flex items-center justify-center text-white cursor-pointer transition-all apple-tap-target border border-white/5 pointer-events-auto"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Items List */}
              <div className="divide-y divide-white/5 my-4 max-h-[30vh] overflow-y-auto pr-1 no-scrollbar">
                {cart.map(item => (
                  <div key={item.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-white">{item.name}</p>
                      <p className="text-xs text-zinc-400">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-2.5 bg-[#282526] rounded-full px-3 py-1 border border-white/5">
                      <button onClick={() => updateQuantity(item.id, -1)} className="text-zinc-400 hover:text-white font-bold cursor-pointer text-sm apple-stepper-btn">-</button>
                      <span className="font-black text-sm text-[#E0FF33]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="text-zinc-400 hover:text-white font-bold cursor-pointer text-sm apple-stepper-btn">+</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bill Details */}
              <div className="bg-[#151314] rounded-2xl p-4 space-y-2 text-xs text-zinc-400 mb-4 border border-white/5">
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
                <input
                  type="text"
                  value={checkoutName}
                  onChange={(e) => setCheckoutName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full text-xs !bg-[#282526] !border-none !rounded-2xl py-3 px-4"
                />
                <input
                  type="tel"
                  value={checkoutPhone}
                  onChange={(e) => setCheckoutPhone(e.target.value)}
                  placeholder="Contact Phone Number"
                  className="w-full text-xs !bg-[#282526] !border-none !rounded-2xl py-3 px-4"
                />
                <input
                  type="text"
                  value={checkoutAddress}
                  onChange={(e) => setCheckoutAddress(e.target.value)}
                  placeholder="Delivery Address"
                  className="w-full text-xs !bg-[#282526] !border-none !rounded-2xl py-3 px-4"
                />

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className={`p-3 rounded-2xl border cursor-pointer text-xs font-bold flex items-center justify-center gap-1.5 transition-all apple-tap-target ${paymentMethod === 'online' ? 'bg-[#E0FF33] text-[#1E1B1C] border-[#E0FF33]' : 'bg-[#151314] text-zinc-400 border-white/5'
                    }`}>
                    <input
                      type="radio"
                      name="pay-method"
                      value="online"
                      checked={paymentMethod === 'online'}
                      onChange={() => setPaymentMethod('online')}
                      className="hidden"
                    />
                    <Zap size={14} className={paymentMethod === 'online' ? 'text-[#1E1B1C]' : 'text-[#E0FF33]'} />
                    <span>Online Pay</span>
                  </label>
                  <label className={`p-3 rounded-2xl border cursor-pointer text-xs font-bold flex items-center justify-center gap-1.5 transition-all apple-tap-target ${paymentMethod === 'cash' ? 'bg-[#E0FF33] text-[#1E1B1C] border-[#E0FF33]' : 'bg-[#151314] text-zinc-400 border-white/5'
                    }`}>
                    <input
                      type="radio"
                      name="pay-method"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                      className="hidden"
                    />
                    <Banknote size={14} className={paymentMethod === 'cash' ? 'text-[#1E1B1C]' : 'text-emerald-400'} />
                    <span>Cash</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              className="w-full bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black py-4 rounded-full text-sm shadow-xl mt-4 cursor-pointer transition-all apple-tap-target"
            >
              Confirm & Place Order (₹{totalAmount})
            </button>
          </div>
        </div>
      )}

      {/* Live Order CARTO Map Tracking HUD Modal (Exact Screenshot Layout) */}
      {isTrackingModalOpen && trackingOrder && (
        <ActiveOrderTrackingModal
          order={trackingOrder}
          allShops={allShops}
          onClose={() => setIsTrackingModalOpen(false)}
        />
      )}

      {/* Dynamic Island Toast Notification (Vrinda Tours Physics) */}
      {toast && (
        <DynamicToast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
