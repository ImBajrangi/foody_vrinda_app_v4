import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudioAlarm } from '../hooks/useAudioAlarm';
import DynamicToast from '../components/ui/DynamicToast';
import {
  Terminal,
  Store,
  UtensilsCrossed,
  Receipt,
  Bell,
  UserCheck,
  CreditCard,
  Flame,
  Volume2,
  VolumeX,
  CheckCircle2,
  Play,
  Plus,
  Minus,
  ShieldAlert,
  ShieldCheck,
  Truck,
  ChefHat,
  Sparkles,
  Users,
  UserPlus,
  Trash2,
  Search,
  Filter,
  KeyRound,
  Sliders,
  RefreshCw,
  Crown,
  Lock,
  Globe,
  Banknote,
  X,
  Info,
  Copy,
  ExternalLink,
  Calendar,
  Mail,
  Phone,
  Bike,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Tag,
  Percent,
  Gift,
  MapPin,
  Clock,
  Layers,
  Edit3,
  AlertCircle,
  Check
} from 'lucide-react';
import { 
  updateCloudShop, 
  getCloudShops, 
  getCachedShops,
  saveCachedShops,
  createCloudShop,
  deleteCloudShop,
  getCloudMenus, 
  createCloudMenuItem,
  updateCloudMenuItem,
  deleteCloudMenuItem,
  getCachedOffers,
  saveCachedOffers,
  getCloudOffers,
  createCloudOffer,
  updateCloudOffer,
  deleteCloudOffer,
  DEFAULT_OFFERS,
  getCloudOrders, 
  createCloudOrder, 
  getCloudUsers, 
  createCloudUser, 
  updateCloudUser, 
  deleteCloudUser, 
  subscribeCloudUsers, 
  getCachedUsers, 
  saveCachedUsers, 
  broadcastAlarmEvent 
} from '../supabase';
import { isDeveloperUser } from '../context/AuthContext';

export default function DeveloperView({ setCurrentTab }) {
  const { 
    allShops = [], 
    impersonate, 
    refreshShops, 
    emergencyMasterActive, 
    emergencyRevokeDev,
    user,
    userData,
    updateUserRole
  } = useAuth();


  const [stats, setStats] = useState({ shops: 0, items: 0, orders: 0, notifications: 0, offers: 0 });
  const [paymentsConfig, setPaymentsConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('foody_payment_config');
      return saved ? JSON.parse(saved) : { onlinePaymentsEnabled: true, codEnabled: true };
    } catch (e) {
      return { onlinePaymentsEnabled: true, codEnabled: true };
    }
  });
  const [toast, setToast] = useState(null);

  const [selectedShopId, setSelectedShopId] = useState(() => allShops[0]?.id || '');
  const [selectedDeliveryShopId, setSelectedDeliveryShopId] = useState(() => allShops[0]?.id || '');
  const [selectedOwnerShopId, setSelectedOwnerShopId] = useState(() => allShops[0]?.id || '');
  const [selectedPaymentShopId, setSelectedPaymentShopId] = useState(() => allShops[0]?.id || '');

  // --- SHOPS / KITCHENS STATE ---
  const [shopsList, setShopsList] = useState(() => getCachedShops());
  const [shopSearch, setShopSearch] = useState('');
  const [isCreatingShop, setIsCreatingShop] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [newShopName, setNewShopName] = useState('');
  const [newShopAddress, setNewShopAddress] = useState('');
  const [newShopPhone, setNewShopPhone] = useState('');
  const [newShopPrepTime, setNewShopPrepTime] = useState('15-20 mins');
  const [newShopRadius, setNewShopRadius] = useState('10 km');
  const [newShopImage, setNewShopImage] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop');
  const [newShopPureVeg, setNewShopPureVeg] = useState(true);
  const [newShopIsOpen, setNewShopIsOpen] = useState(true);

  // --- DISHES / MENU STATE ---
  const [menusList, setMenusList] = useState([]);
  const [dishSearch, setDishSearch] = useState('');
  const [dishCategoryFilter, setDishCategoryFilter] = useState('all');
  const [dishShopFilter, setDishShopFilter] = useState('all');
  const [isCreatingDish, setIsCreatingDish] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [newDishName, setNewDishName] = useState('');
  const [newDishCategory, setNewDishCategory] = useState('Satvik Thali');
  const [newDishPrice, setNewDishPrice] = useState('');
  const [newDishOriginalPrice, setNewDishOriginalPrice] = useState('');
  const [newDishDescription, setNewDishDescription] = useState('');
  const [newDishImage, setNewDishImage] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop');
  const [newDishShopId, setNewDishShopId] = useState('all');
  const [newDishIsAvailable, setNewDishIsAvailable] = useState(true);

  // --- COMBOS STATE ---
  const [isCreatingCombo, setIsCreatingCombo] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [newComboName, setNewComboName] = useState('');
  const [newComboItems, setNewComboItems] = useState('1x Rajbhog Thali\n1x Kesar Badam Lassi\n2x Malpua Rabdi');
  const [newComboPrice, setNewComboPrice] = useState('');
  const [newComboOriginalPrice, setNewComboOriginalPrice] = useState('');
  const [newComboDescription, setNewComboDescription] = useState('');
  const [newComboImage, setNewComboImage] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop');
  const [newComboShopId, setNewComboShopId] = useState('all');

  // --- OFFERS / PROMOTIONS STATE ---
  const [offersList, setOffersList] = useState(() => getCachedOffers());
  const [offerSearch, setOfferSearch] = useState('');
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferSubtitle, setNewOfferSubtitle] = useState('');
  const [newOfferDiscountType, setNewOfferDiscountType] = useState('percentage');
  const [newOfferDiscountValue, setNewOfferDiscountValue] = useState('');
  const [newOfferMinOrder, setNewOfferMinOrder] = useState('199');
  const [newOfferMaxDiscount, setNewOfferMaxDiscount] = useState('100');
  const [newOfferValidUntil, setNewOfferValidUntil] = useState('2026-12-31');
  const [newOfferShopId, setNewOfferShopId] = useState('all');
  const [newOfferIsActive, setNewOfferIsActive] = useState(true);

  useEffect(() => {
    if (allShops && allShops.length > 0) {
      if (!selectedShopId) setSelectedShopId(allShops[0].id);
      if (!selectedDeliveryShopId) setSelectedDeliveryShopId(allShops[0].id);
      if (!selectedOwnerShopId) setSelectedOwnerShopId(allShops[0].id);
      if (!selectedPaymentShopId) setSelectedPaymentShopId(allShops[0].id);
      setShopsList(allShops);
    }
  }, [allShops]);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('kitchen');
  const [newUserShopId, setNewUserShopId] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  const [simShopId, setSimShopId] = useState('');
  const [simMenuItems, setSimMenuItems] = useState([]);
  const [simCart, setSimCart] = useState([]);
  const [simName, setSimName] = useState('Vrindavan Dev Client');
  const [simAddress, setSimAddress] = useState('108 Vedic Enclave, Raman Reti, Vrindavan');
  const [simPhone, setSimPhone] = useState('9876543210');
  const [simPaymentMethod, setSimPaymentMethod] = useState('online');
  const [isSimulating, setIsSimulating] = useState(false);

  // Mobile / Desktop Collapsible Section state (default: all collapsed)
  const [collapsedSections, setCollapsedSections] = useState({
    impersonation: true,
    shops: true,
    dishes: true,
    combos: true,
    offers: true,
    payments: true,
    simulator: true,
    users: true,
    alarm: true
  });

  const toggleSection = (key) => {
    setCollapsedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const collapseAll = () => {
    setCollapsedSections({
      impersonation: true,
      shops: true,
      dishes: true,
      combos: true,
      offers: true,
      payments: true,
      simulator: true,
      users: true,
      alarm: true
    });
  };

  const expandAll = () => {
    setCollapsedSections({
      impersonation: false,
      shops: false,
      dishes: false,
      combos: false,
      offers: false,
      payments: false,
      simulator: false,
      users: false,
      alarm: false
    });
  };

  const {
    audioUnlocked,
    audioState,
    isPlaying,
    volume,
    setVolume,
    notificationPermission,
    requestNotificationPermission,
    warmUpAudio,
    playRoleAlarm,
    playAlarm,
    stopAlarm
  } = useAudioAlarm();

  const [usersList, setUsersList] = useState(() => getCachedUsers());

  useEffect(() => {
    // 1. Initial synchronous hydration for stats from cache with zero cloud requests
    const cachedShops = getCachedShops();
    const cachedUsers = getCachedUsers();
    const cachedOffers = getCachedOffers();
    setShopsList(cachedShops);
    setUsersList(cachedUsers);
    setOffersList(cachedOffers);

    setStats({
      shops: cachedShops.length || 3,
      items: 6,
      orders: 0,
      notifications: cachedUsers.length,
      offers: cachedOffers.length
    });

    // 2. Realtime listener updates user state dynamically
    const unsubscribe = subscribeCloudUsers((list) => {
      if (list && list.length > 0) {
        setUsersList(list);
        setStats(prev => ({ ...prev, notifications: list.length }));
      }
    });

    const handleLocalUsersChanged = (e) => {
      if (e?.detail?.users && Array.isArray(e.detail.users) && e.detail.users.length > 0) {
        setUsersList(e.detail.users);
        setStats(prev => ({ ...prev, notifications: e.detail.users.length }));
      }
    };
    window.addEventListener('foody_users_changed', handleLocalUsersChanged);

    const handleLocalShopsChanged = (e) => {
      if (e?.detail?.shops && Array.isArray(e.detail.shops)) {
        setShopsList(e.detail.shops);
        setStats(prev => ({ ...prev, shops: e.detail.shops.length }));
      }
    };
    window.addEventListener('foody_shops_changed', handleLocalShopsChanged);

    const handleLocalMenusChanged = (e) => {
      if (e?.detail?.menus && Array.isArray(e.detail.menus)) {
        setMenusList(e.detail.menus);
        setStats(prev => ({ ...prev, items: e.detail.menus.length }));
      }
    };
    window.addEventListener('foody_menus_changed', handleLocalMenusChanged);

    const handleLocalOffersChanged = (e) => {
      if (e?.detail?.offers && Array.isArray(e.detail.offers)) {
        setOffersList(e.detail.offers);
        setStats(prev => ({ ...prev, offers: e.detail.offers.length }));
      }
    };
    window.addEventListener('foody_offers_changed', handleLocalOffersChanged);

    // 3. SWR background revalidation (fetch fresh data from Supabase)
    (async () => {
      try {
        const [shops, menus, orders, users, offers] = await Promise.all([
          getCloudShops(),
          getCloudMenus('all'),
          getCloudOrders(),
          getCloudUsers(true),
          getCloudOffers(true)
        ]);
        if (shops && shops.length > 0) setShopsList(shops);
        if (menus && menus.length > 0) setMenusList(menus);
        if (users && users.length > 0) setUsersList(users);
        if (offers && offers.length > 0) setOffersList(offers);

        setStats({
          shops: (shops || []).length,
          items: (menus || []).length,
          orders: (orders || []).length,
          notifications: (users || []).length,
          offers: (offers || []).length
        });
      } catch (e) {
        console.warn("fetchStats note:", e);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('foody_users_changed', handleLocalUsersChanged);
      window.removeEventListener('foody_shops_changed', handleLocalShopsChanged);
      window.removeEventListener('foody_menus_changed', handleLocalMenusChanged);
      window.removeEventListener('foody_offers_changed', handleLocalOffersChanged);
    };
  }, []);

  useEffect(() => {
    const handleConfigChanged = () => {
      try {
        const saved = localStorage.getItem('foody_payment_config');
        if (saved) setPaymentsConfig(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('foody_payment_config_changed', handleConfigChanged);
    window.addEventListener('storage', handleConfigChanged);
    return () => {
      window.removeEventListener('foody_payment_config_changed', handleConfigChanged);
      window.removeEventListener('storage', handleConfigChanged);
    };
  }, []);

  const handleSimShopChange = async (shopId) => {
    setSimShopId(shopId);
    if (!shopId) {
      setSimMenuItems([]);
      setSimCart([]);
      return;
    }

    try {
      const items = await getCloudMenus(shopId);
      setSimMenuItems(items);
      setSimCart(items.map(i => ({ ...i, quantity: 0 })));
    } catch (e) {
      console.warn("handleSimShopChange error:", e);
    }
  };

  const handleUpdatePaymentsConfig = async (key, value) => {
    try {
      const updated = { ...paymentsConfig, [key]: value };
      setPaymentsConfig(updated);
      localStorage.setItem('foody_payment_config', JSON.stringify(updated));
      window.dispatchEvent(new Event('foody_payment_config_changed'));
      setToast({ message: `Global Master: ${key === 'onlinePaymentsEnabled' ? 'Online Gateway' : 'COD'} ${value ? 'Enabled' : 'Disabled'}`, type: 'success' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleKitchenPayment = async (shopId, key, value) => {
    if (!shopId) return;
    const targetShop = allShops.find(s => s.id === shopId);
    const currentOnline = targetShop?.paymentSettings?.onlinePaymentsEnabled ?? targetShop?.onlinePaymentsEnabled ?? true;
    const currentCod = targetShop?.paymentSettings?.codEnabled ?? targetShop?.codEnabled ?? true;

    const updated = {
      onlinePaymentsEnabled: key === 'onlinePaymentsEnabled' ? value : currentOnline,
      codEnabled: key === 'codEnabled' ? value : currentCod
    };

    await updateCloudShop(shopId, {
      paymentSettings: updated,
      onlinePaymentsEnabled: updated.onlinePaymentsEnabled,
      codEnabled: updated.codEnabled
    });

    if (refreshShops) await refreshShops();
    setToast({
      message: `${targetShop?.name || 'Kitchen'}: ${key === 'onlinePaymentsEnabled' ? 'Online Pay' : 'COD'} ${value ? 'Enabled' : 'Disabled'}`,
      type: 'success'
    });
  };

  // ==========================================
  // 1. SHOPS / KITCHENS MANAGEMENT HANDLERS
  // ==========================================
  const handleCreateShop = async (e) => {
    e.preventDefault();
    if (!newShopName.trim()) {
      return setToast({ message: 'Please enter a kitchen/shop name', type: 'warning' });
    }
    const shopId = `shop-${newShopName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-${Date.now().toString(36).slice(-4)}`;
    const newShop = {
      id: shopId,
      name: newShopName.trim(),
      address: newShopAddress.trim() || 'Raman Reti, Vrindavan, UP',
      phone: newShopPhone.trim() || '9876543210',
      preparationTime: newShopPrepTime || '15-20 mins',
      deliveryRadius: newShopRadius || '10 km',
      image: newShopImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
      pureVeg: newShopPureVeg,
      isOpen: newShopIsOpen,
      paymentSettings: { onlinePaymentsEnabled: true, codEnabled: true }
    };

    setShopsList(prev => {
      const updated = [newShop, ...prev];
      saveCachedShops(updated);
      return updated;
    });

    setToast({ message: `Kitchen "${newShop.name}" created and synced!`, type: 'success' });
    setIsCreatingShop(false);
    setNewShopName('');
    setNewShopAddress('');
    setNewShopPhone('');

    await createCloudShop(newShop);
    if (refreshShops) await refreshShops();
  };

  const handleToggleShopOpen = async (shopId, currentIsOpen) => {
    const nextState = !currentIsOpen;
    setShopsList(prev => {
      const updated = prev.map(s => s.id === shopId ? { ...s, isOpen: nextState } : s);
      saveCachedShops(updated);
      return updated;
    });
    setToast({ message: `Kitchen status set to ${nextState ? 'OPEN' : 'CLOSED'}`, type: 'info' });
    await updateCloudShop(shopId, { isOpen: nextState });
    if (refreshShops) await refreshShops();
  };

  const handleDeleteShop = async (shopId, shopName) => {
    if (shopsList.length <= 1) {
      return setToast({ message: 'Cannot delete the only remaining kitchen', type: 'warning' });
    }
    setShopsList(prev => {
      const updated = prev.filter(s => s.id !== shopId);
      saveCachedShops(updated);
      return updated;
    });
    setToast({ message: `Kitchen "${shopName}" removed`, type: 'info' });
    await deleteCloudShop(shopId);
    if (refreshShops) await refreshShops();
  };

  // ==========================================
  // 2. DISHES / MENU CATALOG HANDLERS
  // ==========================================
  const handleCreateDish = async (e) => {
    e.preventDefault();
    if (!newDishName.trim()) {
      return setToast({ message: 'Please enter a dish name', type: 'warning' });
    }
    const priceNum = Number(newDishPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      return setToast({ message: 'Please enter a valid price greater than 0', type: 'warning' });
    }

    const dishId = `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(-3)}`;
    const originalPriceNum = Number(newDishOriginalPrice) || priceNum;
    const targetShop = newDishShopId === 'all' ? (allShops[0]?.id || 'shop-vrinda-main') : newDishShopId;

    const newDish = {
      id: dishId,
      name: newDishName.trim(),
      category: newDishCategory || 'Satvik Thali',
      price: priceNum,
      originalPrice: originalPriceNum,
      description: newDishDescription.trim() || 'Traditional Satvik Preparation cooked with desi ghee.',
      image: newDishImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
      isAvailable: newDishIsAvailable,
      isVeg: true,
      shopId: targetShop,
      rating: 4.9,
      tags: ['Satvik', 'Pure Ghee']
    };

    setMenusList(prev => [newDish, ...prev]);
    setToast({ message: `Dish "${newDish.name}" added to catalog!`, type: 'success' });
    setIsCreatingDish(false);
    setNewDishName('');
    setNewDishPrice('');
    setNewDishOriginalPrice('');
    setNewDishDescription('');

    await createCloudMenuItem(newDish);
  };

  const handleToggleDishAvailability = async (dishId, currentAvailability) => {
    const nextAvailability = !currentAvailability;
    setMenusList(prev => prev.map(d => d.id === dishId ? { ...d, isAvailable: nextAvailability } : d));
    setToast({ message: `Dish availability: ${nextAvailability ? 'AVAILABLE (IN-STOCK)' : 'SOLD OUT (OUT OF STOCK)'}`, type: 'info' });
    await updateCloudMenuItem(dishId, { isAvailable: nextAvailability, is_available: nextAvailability });
  };

  const handleDeleteDish = async (dishId, dishName) => {
    setMenusList(prev => prev.filter(d => d.id !== dishId));
    setToast({ message: `Dish "${dishName}" removed from catalog`, type: 'info' });
    await deleteCloudMenuItem(dishId);
  };

  // ==========================================
  // 3. COMBO PACKS HANDLERS
  // ==========================================
  const handleCreateCombo = async (e) => {
    e.preventDefault();
    if (!newComboName.trim()) {
      return setToast({ message: 'Please enter a combo name', type: 'warning' });
    }
    const priceNum = Number(newComboPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      return setToast({ message: 'Please enter a valid combo price', type: 'warning' });
    }
    const origPriceNum = Number(newComboOriginalPrice) || priceNum;
    const discountPct = origPriceNum > priceNum ? Math.round(((origPriceNum - priceNum) / origPriceNum) * 100) : 0;
    const itemsList = newComboItems
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const comboId = `combo-${Date.now().toString(36)}`;
    const targetShop = newComboShopId === 'all' ? (allShops[0]?.id || 'shop-vrinda-main') : newComboShopId;

    const newCombo = {
      id: comboId,
      name: newComboName.trim(),
      category: 'Combo Offers',
      price: priceNum,
      originalPrice: origPriceNum,
      discountPercent: discountPct,
      isCombo: true,
      is_combo: true,
      comboItems: itemsList,
      combo_items: itemsList,
      description: newComboDescription.trim() || `Special combo box: ${itemsList.join(' + ')}`,
      image: newComboImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
      isAvailable: true,
      isVeg: true,
      shopId: targetShop,
      rating: 5.0
    };

    setMenusList(prev => [newCombo, ...prev]);
    setToast({ message: `Combo Pack "${newCombo.name}" created (Save ${discountPct}%)!`, type: 'success' });
    setIsCreatingCombo(false);
    setNewComboName('');
    setNewComboPrice('');
    setNewComboOriginalPrice('');
    setNewComboDescription('');

    await createCloudMenuItem(newCombo);
  };

  // ==========================================
  // 4. OFFERS & PROMO CODES HANDLERS
  // ==========================================
  const handleCreateOffer = async (e) => {
    e.preventDefault();
    const cleanCode = newOfferCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode || cleanCode.length < 3) {
      return setToast({ message: 'Promo code must be at least 3 uppercase characters', type: 'warning' });
    }
    const discVal = Number(newOfferDiscountValue);
    if (isNaN(discVal) || discVal <= 0) {
      return setToast({ message: 'Please enter a valid discount amount or percentage', type: 'warning' });
    }

    const offerId = `offer-${cleanCode.toLowerCase()}-${Date.now().toString(36).slice(-3)}`;
    const newOffer = {
      id: offerId,
      code: cleanCode,
      title: newOfferTitle.trim() || `${cleanCode} Special Offer`,
      subtitle: newOfferSubtitle.trim() || (newOfferDiscountType === 'percentage' ? `${discVal}% OFF on satvik meals` : `Flat ₹${discVal} OFF on all orders`),
      discountType: newOfferDiscountType,
      discount_type: newOfferDiscountType,
      discountValue: discVal,
      discount_value: discVal,
      minOrderAmount: Number(newOfferMinOrder) || 0,
      min_order_amount: Number(newOfferMinOrder) || 0,
      maxDiscount: Number(newOfferMaxDiscount) || 0,
      max_discount: Number(newOfferMaxDiscount) || 0,
      validUntil: newOfferValidUntil || '2026-12-31',
      valid_until: newOfferValidUntil || '2026-12-31',
      shopId: newOfferShopId,
      shop_id: newOfferShopId,
      isActive: newOfferIsActive,
      is_active: newOfferIsActive
    };

    setOffersList(prev => {
      const updated = [newOffer, ...prev];
      saveCachedOffers(updated);
      return updated;
    });

    setToast({ message: `Coupon Code "${cleanCode}" created and active!`, type: 'success' });
    setIsCreatingOffer(false);
    setNewOfferCode('');
    setNewOfferTitle('');
    setNewOfferSubtitle('');
    setNewOfferDiscountValue('');

    await createCloudOffer(newOffer);
  };

  const handleToggleOfferActive = async (offerId, currentActive) => {
    const nextActive = !currentActive;
    setOffersList(prev => {
      const updated = prev.map(o => o.id === offerId ? { ...o, isActive: nextActive, is_active: nextActive } : o);
      saveCachedOffers(updated);
      return updated;
    });
    setToast({ message: `Coupon ${nextActive ? 'ACTIVATED' : 'DEACTIVATED'}`, type: 'info' });
    await updateCloudOffer(offerId, { isActive: nextActive, is_active: nextActive });
  };

  const handleDeleteOffer = async (offerId, offerCode) => {
    setOffersList(prev => {
      const updated = prev.filter(o => o.id !== offerId);
      saveCachedOffers(updated);
      return updated;
    });
    setToast({ message: `Promo Code "${offerCode}" removed`, type: 'info' });
    await deleteCloudOffer(offerId);
  };

  const handleCopyOfferCode = (code) => {
    navigator.clipboard.writeText(code);
    setToast({ message: `Coupon Code "${code}" copied to clipboard!`, type: 'success' });
  };


  const handleUpdateUserRole = async (userId, newRole) => {
    const target = usersList.find(u => u.id === userId);
    if (target?.role === 'grand_admin') {
      setToast({ message: 'Grand Admin role is permanent and cannot be modified or downgraded.', type: 'warning' });
      return;
    }

    setUsersList(prev => {
      const updated = prev.map(u => u.id === userId ? { ...u, role: newRole } : u);
      saveCachedUsers(updated);
      return updated;
    });
    if (updateUserRole) {
      const res = await updateUserRole(userId, newRole);
      if (res && !res.success && res.message) {
        setToast({ message: res.message, type: 'error' });
        return;
      }
    } else {
      await updateCloudUser(userId, { role: newRole });
    }
    setToast({ message: `User role updated to ${newRole.toUpperCase()}`, type: 'success' });
  };

  const handleUpdateUserShop = async (userId, newShopId) => {
    setUsersList(prev => {
      const updated = prev.map(u => u.id === userId ? { ...u, shopId: newShopId, shopIds: [newShopId] } : u);
      saveCachedUsers(updated);
      return updated;
    });
    if (updateUserRole) {
      const targetUser = usersList.find(u => u.id === userId);
      await updateUserRole(userId, targetUser?.role || 'customer', newShopId);
    } else {
      await updateCloudUser(userId, { shopId: newShopId, shopIds: [newShopId] });
    }
    setToast({ message: 'Kitchen assignment updated', type: 'success' });
  };

  const handleCreateTestUser = async (e) => {
    e.preventDefault();
    const cleanPhone = newUserPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return setToast({ message: 'Please enter a valid 10-digit phone number', type: 'warning' });
    }
    const newId = `user-${Date.now().toString(36)}`;
    const targetShop = newUserShopId || (allShops[0]?.id || 'shop-vrinda-main');
    const newUserRecord = {
      id: newId,
      displayName: newUserName || `Staff (${cleanPhone.slice(-4)})`,
      phone: cleanPhone,
      email: newUserEmail || `${cleanPhone}@foodyvrinda.com`,
      role: newUserRole,
      shopId: targetShop,
      shopIds: [targetShop]
    };

    setUsersList(prev => {
      const updated = [newUserRecord, ...prev];
      saveCachedUsers(updated);
      return updated;
    });
    setToast({ message: `Created user ${newUserName || cleanPhone} as ${newUserRole.toUpperCase()}`, type: 'success' });
    setIsCreatingUser(false);
    setNewUserName('');
    setNewUserPhone('');
    setNewUserEmail('');

    await createCloudUser(newUserRecord);
  };

  const handleRestoreDefaultAccounts = async () => {
    const defaultDev = {
      id: 'master_dev_108',
      displayName: 'Master Developer (Foody Vrinda)',
      email: 'developer@foodyvrinda.com',
      phone: '9876543210',
      role: 'developer',
      shopId: allShops[0]?.id || 'shop-vrinda-main',
      shopIds: allShops.map(s => s.id)
    };
    const defaultOwner = {
      id: 'store_owner_main',
      displayName: 'Vrinda Store Owner',
      email: 'owner@foodyvrinda.com',
      phone: '9876543211',
      role: 'owner',
      shopId: allShops[0]?.id || 'shop-vrinda-main',
      shopIds: [allShops[0]?.id || 'shop-vrinda-main']
    };
    const defaultStaff = {
      id: 'kitchen_chef_radhe',
      displayName: 'Head Chef Radhe',
      email: 'chef@foodyvrinda.com',
      phone: '9876543212',
      role: 'kitchen',
      shopId: allShops[0]?.id || 'shop-vrinda-main',
      shopIds: [allShops[0]?.id || 'shop-vrinda-main']
    };
    const defaultRider = {
      id: 'rider_sarathi_gopal',
      displayName: 'Sarathi Gopal',
      email: 'sarathi@foodyvrinda.com',
      phone: '9876543213',
      role: 'delivery',
      shopId: allShops[0]?.id || 'shop-vrinda-main',
      shopIds: allShops.map(s => s.id)
    };

    const defaults = [defaultDev, defaultOwner, defaultStaff, defaultRider];
    for (const d of defaults) {
      await createCloudUser(d);
    }
    setUsersList(getCachedUsers());
    setToast({ message: 'Default Master Accounts & Roles Restored in Supabase', type: 'success' });
  };

  const handleDeleteUser = (userId, userName, userEmail) => {
    const target = usersList.find(u => u.id === userId);
    if (target?.role === 'grand_admin' || isDeveloperUser(userEmail)) {
      setToast({ message: 'Protected Grand Admin / Master Developer accounts cannot be deleted', type: 'warning' });
      return;
    }
    setUserToDelete({ id: userId, name: userName || userId });
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const targetId = userToDelete.id;
    const targetName = userToDelete.name;
    setUserToDelete(null);

    setUsersList(prev => {
      const updated = prev.filter(u => u.id !== targetId);
      saveCachedUsers(updated);
      return updated;
    });
    setToast({ message: `User "${targetName}" removed`, type: 'info' });
    await deleteCloudUser(targetId);
  };

  const handleQuickImpersonateUser = (u) => {
    const targetRole = u.role || 'customer';
    const targetShop = u.shopId || (allShops && allShops[0]?.id);
    impersonate(targetShop, targetRole);
    setToast({
      message: `Impersonating: ${u.displayName || u.phone || 'User'} (${targetRole.toUpperCase()})`,
      type: 'success'
    });
    if (targetRole === 'kitchen') setCurrentTab('kitchen');
    else if (targetRole === 'delivery') setCurrentTab('delivery');
    else if (targetRole === 'owner') setCurrentTab('owner');
    else if (targetRole === 'developer') setCurrentTab('developer');
    else if (targetRole === 'customer') setCurrentTab('customer');
    else if (targetRole === 'grand_admin') setCurrentTab('developer');
  };

  const handleImpersonateShop = (shopId) => {
    if (!shopId) return setToast({ message: "Please select a kitchen first", type: 'warning' });
    impersonate(shopId, 'kitchen');
    setToast({ message: "Switched view to Kitchen Staff", type: 'success' });
    setCurrentTab('kitchen');
  };

  const handleImpersonateDelivery = (shopId) => {
    if (!shopId) return setToast({ message: "Please select a delivery kitchen first", type: 'warning' });
    impersonate(shopId, 'delivery');
    setToast({ message: "Switched view to Delivery Rider", type: 'success' });
    setCurrentTab('delivery');
  };

  const handleImpersonateOwner = (shopId) => {
    if (!shopId) return setToast({ message: "Please select a store first", type: 'warning' });
    impersonate(shopId, 'owner');
    setToast({ message: "Switched view to Store Owner", type: 'success' });
    setCurrentTab('owner');
  };

  const handleUpdateSimQty = (itemId, delta) => {
    setSimCart(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.max(0, (item.quantity || 0) + delta) };
      }
      return item;
    }));
  };

  const handleRunOrderSimulator = async (e) => {
    e.preventDefault();
    const items = simCart.filter(i => i.quantity > 0);
    if (items.length === 0) {
      return setToast({ message: "Please select at least 1 dish for simulation", type: 'warning' });
    }

    setIsSimulating(true);
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const orderPayload = {
      shopId: simShopId,
      shop_id: simShopId,
      customerName: simName,
      customer_name: simName,
      customerAddress: simAddress,
      customer_address: simAddress,
      deliveryAddress: simAddress,
      customerPhone: simPhone,
      customer_phone: simPhone,
      deliveryCoordinates: { lat: 27.5785 + (Math.random() * 0.006), lng: 77.6680 + (Math.random() * 0.006) },
      delivery_coordinates: { lat: 27.5785 + (Math.random() * 0.006), lng: 77.6680 + (Math.random() * 0.006) },
      items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, ready: false })),
      subtotal: total,
      deliveryCharge: 0,
      gstAmount: 0,
      totalAmount: total,
      total_amount: total,
      status: 'new',
      isPaid: simPaymentMethod === 'online',
      isTestOrder: true,
      paymentMethod: simPaymentMethod,
      payment_method: simPaymentMethod,
      cashStatus: simPaymentMethod === 'cash' ? 'pending' : 'none',
      cash_status: simPaymentMethod === 'cash' ? 'pending' : 'none'
    };

    try {
      const createdOrder = await createCloudOrder(orderPayload);
      const orderId = createdOrder?.id || `sim_${Date.now().toString(36)}`;
      broadcastAlarmEvent({
        type: 'new_order',
        role: 'kitchen',
        shopId: simShopId,
        orderId,
        title: 'SIMULATOR ORDER GENERATED'
      });

      setToast({
        message: `Simulator Order #${orderId.slice(-6).toUpperCase()} Created! Check Kitchen tab.`,
        type: 'success'
      });
      setSimCart(prev => prev.map(i => ({ ...i, quantity: 0 })));
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to dispatch simulated order", type: 'error' });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleTestAlarm = () => {
    playAlarm();
    setToast({ message: "Sound wave trigger active! Click silence to stop.", type: 'warning' });
    if (Notification && Notification.permission === 'granted') {
      new Notification('Foody Vrinda Audio Test', {
        body: 'Sound alarm pipeline triggered successfully!',
        icon: 'https://imbajrangi.github.io/Company/Vrindopnishad%20Web/class/logo/foodyVrinda-logo.png'
      });
    } else if (Notification) {
      Notification.requestPermission();
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <DynamicToast toast={toast} onClose={() => setToast(null)} />


      {/* System Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-4 sm:p-5 text-center shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-white/5 text-[#E0FF33] flex items-center justify-center mx-auto mb-2">
            <Store className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-white font-['Outfit']">{stats.shops}</p>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Kitchens</p>
        </div>

        <div className="bg-[#282526] border border-white/5 rounded-3xl p-4 sm:p-5 text-center shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-white/5 text-cyan-400 flex items-center justify-center mx-auto mb-2">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-white font-['Outfit']">{stats.items}</p>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Dishes Catalog</p>
        </div>

        <div className="bg-[#282526] border border-white/5 rounded-3xl p-4 sm:p-5 text-center shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-white/5 text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <Tag className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-white font-['Outfit']">{stats.offers}</p>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Active Offers</p>
        </div>

        <div className="bg-[#282526] border border-white/5 rounded-3xl p-4 sm:p-5 text-center shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-white/5 text-amber-400 flex items-center justify-center mx-auto mb-2">
            <Receipt className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-white font-['Outfit']">{stats.orders}</p>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Total Orders</p>
        </div>

        <div className="bg-[#282526] border border-white/5 rounded-3xl p-4 sm:p-5 text-center shadow-xl col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-2xl bg-white/5 text-purple-400 flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-white font-['Outfit']">{stats.notifications}</p>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Users & Staff</p>
        </div>
      </div>

      {/* Mobile / Desktop Section Quick Toolbar & Minimizer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#282526] border border-white/5 shadow-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'impersonation', label: 'Impersonate', icon: UserCheck },
            { id: 'shops', label: 'Kitchens', icon: Store },
            { id: 'dishes', label: 'Dishes', icon: UtensilsCrossed },
            { id: 'combos', label: 'Combos', icon: Gift },
            { id: 'offers', label: 'Offers', icon: Tag },
            { id: 'users', label: 'Users & Roles', icon: Users },
            { id: 'payments', label: 'Payments', icon: CreditCard },
            { id: 'simulator', label: 'Simulator', icon: Flame },
            { id: 'alarm', label: 'Alarms', icon: Volume2 }
          ].map(sec => {
            const isExpanded = !collapsedSections[sec.id];
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => toggleSection(sec.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isExpanded
                    ? 'bg-[#E0FF33]/15 text-[#E0FF33] border border-[#E0FF33]/30 shadow-sm'
                    : 'bg-[#1E1B1C] text-neutral-400 border border-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${isExpanded ? 'bg-[#E0FF33]' : 'bg-neutral-600'}`} />
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
          <button
            type="button"
            onClick={expandAll}
            title="Expand All Sections"
            className="px-2.5 py-1.5 rounded-xl bg-[#1E1B1C] hover:bg-white/10 text-neutral-300 text-[11px] font-bold border border-white/5 flex items-center gap-1 transition-all cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Expand All</span>
          </button>
          <button
            type="button"
            onClick={collapseAll}
            title="Collapse All Sections"
            className="px-2.5 py-1.5 rounded-xl bg-[#1E1B1C] hover:bg-white/10 text-neutral-300 text-[11px] font-bold border border-white/5 flex items-center gap-1 transition-all cursor-pointer"
          >
            <Minimize2 className="w-3 h-3" />
            <span>Collapse All</span>
          </button>
        </div>
      </div>


      {/* Main Dev Tools Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. Impersonation Settings — Full Width with Side-by-Side Layout */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-5 sm:p-6 md:col-span-2 space-y-4 shadow-xl transition-all">
          <button
            type="button"
            onClick={() => toggleSection('impersonation')}
            className="w-full flex items-center justify-between text-left cursor-pointer group select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#E0FF33]/10 text-[#E0FF33] border border-[#E0FF33]/20 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit'] group-hover:text-[#E0FF33] transition-colors">
                  Instant Role Impersonation
                </h3>
                <p className="text-[11px] text-neutral-400 truncate">Jump directly into any kitchen, delivery rider, or store owner view.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider hidden sm:inline">
                {collapsedSections.impersonation ? 'Expand' : 'Minimize'}
              </span>
              <div className={`p-1.5 rounded-xl bg-white/5 text-neutral-400 group-hover:text-white transition-transform duration-200 ${collapsedSections.impersonation ? '' : 'rotate-180'}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          {!collapsedSections.impersonation && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-white/5 animate-fadeIn">
              {/* Kitchen Staff Impersonation */}
              <div className="p-4 bg-[#1E1B1C] rounded-2xl border border-white/5 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                    <span>Impersonate Kitchen Staff</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
                    {allShops.map(s => {
                      const isSelected = selectedShopId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedShopId(s.id)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${isSelected
                              ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm'
                              : 'bg-[#282526] text-neutral-400 border-white/5 hover:text-white hover:border-white/15'
                            }`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => handleImpersonateShop(selectedShopId)}
                  disabled={!selectedShopId}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Launch Kitchen Staff View</span>
                </button>
              </div>

              {/* Delivery Rider Impersonation */}
              <div className="p-4 bg-[#1E1B1C] rounded-2xl border border-white/5 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Impersonate Delivery Rider</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
                    {allShops.map(s => {
                      const isSelected = selectedDeliveryShopId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedDeliveryShopId(s.id)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${isSelected
                              ? 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40 shadow-sm'
                              : 'bg-[#282526] text-neutral-400 border-white/5 hover:text-white hover:border-white/15'
                            }`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => handleImpersonateDelivery(selectedDeliveryShopId)}
                  disabled={!selectedDeliveryShopId}
                  className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <Truck className="w-4 h-4" />
                  <span>Launch Sarathi Rider View</span>
                </button>
              </div>

              {/* Store Owner Impersonation */}
              <div className="p-4 bg-[#1E1B1C] rounded-2xl border border-white/5 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>Impersonate Store Owner</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
                    {allShops.map(s => {
                      const isSelected = selectedOwnerShopId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedOwnerShopId(s.id)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${isSelected
                              ? 'bg-purple-400/20 text-purple-300 border-purple-400/40 shadow-sm'
                              : 'bg-[#282526] text-neutral-400 border-white/5 hover:text-white hover:border-white/15'
                            }`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => handleImpersonateOwner(selectedOwnerShopId)}
                  disabled={!selectedOwnerShopId}
                  className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-md"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Launch Store Owner View</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Kitchens & Locations Master */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-5 sm:p-6 md:col-span-2 space-y-4 shadow-xl transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
            <button
              type="button"
              onClick={() => toggleSection('shops')}
              className="flex items-start sm:items-center gap-3 min-w-0 text-left cursor-pointer group flex-1"
            >
              <div className="w-9 h-9 rounded-xl bg-[#E0FF33]/15 text-[#E0FF33] flex items-center justify-center shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit'] group-hover:text-[#E0FF33] transition-colors">
                    Kitchens & Store Locations
                  </h3>
                  <div className={`p-1 rounded-lg bg-white/5 text-neutral-400 group-hover:text-white transition-transform duration-200 ${collapsedSections.shops ? '' : 'rotate-180'}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 truncate">Add new branches, toggle open/closed state, and manage cloud kitchens.</p>
              </div>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (collapsedSections.shops) setCollapsedSections(prev => ({ ...prev, shops: false }));
                  setIsCreatingShop(!isCreatingShop);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#E0FF33] hover:bg-[#d6f727] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>{isCreatingShop ? 'Close Form' : 'Add Kitchen'}</span>
              </button>
            </div>
          </div>

          {!collapsedSections.shops && (
            <div className="space-y-4 pt-3 border-t border-white/5 animate-fadeIn">
              {/* Create Shop Form Drawer */}
              {isCreatingShop && (
                <form onSubmit={handleCreateShop} className="p-4 sm:p-5 bg-[#1E1B1C] rounded-2xl border border-[#E0FF33]/30 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-[#E0FF33] uppercase tracking-wider flex items-center gap-2">
                      <Store className="w-4 h-4" /> Add New Cloud Kitchen Branch
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-mono">Syncs to Supabase `foody_shops`</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Kitchen / Shop Name</label>
                      <input
                        type="text"
                        value={newShopName}
                        onChange={e => setNewShopName(e.target.value)}
                        placeholder="e.g. Govind Dham Annakoot"
                        required
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Phone / Helpline</label>
                      <input
                        type="text"
                        value={newShopPhone}
                        onChange={e => setNewShopPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Preparation Time</label>
                      <input
                        type="text"
                        value={newShopPrepTime}
                        onChange={e => setNewShopPrepTime(e.target.value)}
                        placeholder="15-20 mins"
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Delivery Radius</label>
                      <input
                        type="text"
                        value={newShopRadius}
                        onChange={e => setNewShopRadius(e.target.value)}
                        placeholder="12 km"
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Address / Landmark</label>
                      <input
                        type="text"
                        value={newShopAddress}
                        onChange={e => setNewShopAddress(e.target.value)}
                        placeholder="Near ISKCON Temple, Raman Reti, Vrindavan"
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33]"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Cover Image URL</label>
                      <input
                        type="text"
                        value={newShopImage}
                        onChange={e => setNewShopImage(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                        <input
                          type="checkbox"
                          checked={newShopPureVeg}
                          onChange={e => setNewShopPureVeg(e.target.checked)}
                          className="rounded text-[#E0FF33] focus:ring-0"
                        />
                        <span className="font-bold text-emerald-400">100% Pure Satvik Veg</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                        <input
                          type="checkbox"
                          checked={newShopIsOpen}
                          onChange={e => setNewShopIsOpen(e.target.checked)}
                          className="rounded text-[#E0FF33] focus:ring-0"
                        />
                        <span className="font-bold text-white">Open for Orders</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreatingShop(false)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#E0FF33] hover:bg-[#d6f727] text-black font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                      >
                        Create Kitchen
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Search & Filter Bar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search kitchen by name or address..."
                    value={shopSearch}
                    onChange={e => setShopSearch(e.target.value)}
                    className="w-full bg-[#1E1B1C] text-xs text-white placeholder-neutral-500 pl-9 pr-3 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#E0FF33]/50"
                  />
                </div>
                <span className="text-[11px] font-bold text-neutral-400 px-3 py-2 bg-[#1E1B1C] rounded-xl border border-white/5 shrink-0">
                  {shopsList.length} Kitchens
                </span>
              </div>

              {/* Kitchen Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shopsList
                  .filter(s => !shopSearch || s.name?.toLowerCase().includes(shopSearch.toLowerCase()) || s.address?.toLowerCase().includes(shopSearch.toLowerCase()))
                  .map(s => {
                    const isOpen = s.isOpen ?? true;
                    return (
                      <div key={s.id} className="p-4 bg-[#1E1B1C] rounded-2xl border border-white/5 hover:border-white/15 transition-all space-y-3 flex flex-col justify-between shadow-md">
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-white truncate font-['Outfit']">{s.name}</h4>
                              <p className="text-[11px] text-neutral-400 truncate flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                                <span>{s.address || 'Vrindavan, UP'}</span>
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                              isOpen ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}>
                              {isOpen ? 'Open' : 'Closed'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-400">
                            <div className="p-2 rounded-lg bg-white/5 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>{s.preparationTime || '15-20 mins'}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-white/5 flex items-center gap-1.5">
                              <Truck className="w-3 h-3 text-cyan-400" />
                              <span>{s.deliveryRadius || '10 km'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleShopOpen(s.id, isOpen)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isOpen ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {isOpen ? 'Mark Closed' : 'Mark Open'}
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleImpersonateShop(s.id)}
                              title="Launch Staff View"
                              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-400 border border-white/5 cursor-pointer"
                            >
                              <ChefHat className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteShop(s.id, s.name)}
                              title="Delete Kitchen"
                              className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-white/5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Dishes & Menu Catalog Master */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-5 sm:p-6 md:col-span-2 space-y-4 shadow-xl transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
            <button
              type="button"
              onClick={() => toggleSection('dishes')}
              className="flex items-start sm:items-center gap-3 min-w-0 text-left cursor-pointer group flex-1"
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-400/15 text-cyan-400 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit'] group-hover:text-cyan-400 transition-colors">
                    Dishes & Food Menu Catalog
                  </h3>
                  <div className={`p-1 rounded-lg bg-white/5 text-neutral-400 group-hover:text-white transition-transform duration-200 ${collapsedSections.dishes ? '' : 'rotate-180'}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 truncate">Create new items, set prices, update descriptions, and toggle instant in-stock availability.</p>
              </div>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (collapsedSections.dishes) setCollapsedSections(prev => ({ ...prev, dishes: false }));
                  setIsCreatingDish(!isCreatingDish);
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>{isCreatingDish ? 'Close Form' : 'Add Dish'}</span>
              </button>
            </div>
          </div>

          {!collapsedSections.dishes && (
            <div className="space-y-4 pt-3 border-t border-white/5 animate-fadeIn">
              {/* Create Dish Form */}
              {isCreatingDish && (
                <form onSubmit={handleCreateDish} className="p-4 sm:p-5 bg-[#1E1B1C] rounded-2xl border border-cyan-400/30 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4" /> Add Dish to Menu Catalog
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-mono">Syncs to Supabase `foody_menus`</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Dish Name</label>
                      <input
                        type="text"
                        value={newDishName}
                        onChange={e => setNewDishName(e.target.value)}
                        placeholder="e.g. Shahi Mathura Peda (4 pcs)"
                        required
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Category</label>
                      <select
                        value={newDishCategory}
                        onChange={e => setNewDishCategory(e.target.value)}
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-cyan-400"
                      >
                        <option value="Satvik Thali">Satvik Thali</option>
                        <option value="Sweets & Desserts">Sweets & Desserts</option>
                        <option value="Snacks & Chaat">Snacks & Chaat</option>
                        <option value="Lassi & Beverages">Lassi & Beverages</option>
                        <option value="Special Bhog">Special Bhog</option>
                        <option value="Breads & Rice">Breads & Rice</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Selling Price (₹)</label>
                      <input
                        type="number"
                        value={newDishPrice}
                        onChange={e => setNewDishPrice(e.target.value)}
                        placeholder="e.g. 160"
                        required
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Original / MRP Price (₹)</label>
                      <input
                        type="number"
                        value={newDishOriginalPrice}
                        onChange={e => setNewDishOriginalPrice(e.target.value)}
                        placeholder="e.g. 200 (optional)"
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Assign to Kitchen</label>
                      <select
                        value={newDishShopId}
                        onChange={e => setNewDishShopId(e.target.value)}
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-cyan-400"
                      >
                        <option value="all">All Kitchens (Universal)</option>
                        {shopsList.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Dish Image URL</label>
                      <input
                        type="text"
                        value={newDishImage}
                        onChange={e => setNewDishImage(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Description / Ingredients</label>
                      <textarea
                        rows={2}
                        value={newDishDescription}
                        onChange={e => setNewDishDescription(e.target.value)}
                        placeholder="Prepared with pure desi ghee, fresh milk and authentic Vrindavan spices..."
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                      <input
                        type="checkbox"
                        checked={newDishIsAvailable}
                        onChange={e => setNewDishIsAvailable(e.target.checked)}
                        className="rounded text-cyan-400 focus:ring-0"
                      />
                      <span className="font-bold text-emerald-400">Available In-Stock Now</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreatingDish(false)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                      >
                        Add Dish
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search dishes by name or category..."
                    value={dishSearch}
                    onChange={e => setDishSearch(e.target.value)}
                    className="w-full bg-[#1E1B1C] text-xs text-white placeholder-neutral-500 pl-9 pr-3 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-400/50"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar py-0.5">
                  {['all', 'Satvik Thali', 'Sweets & Desserts', 'Snacks & Chaat', 'Lassi & Beverages', 'Combo Offers'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setDishCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        dishCategoryFilter === cat
                          ? 'bg-cyan-400 text-black font-black shadow-sm'
                          : 'bg-[#1E1B1C] text-neutral-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {cat === 'all' ? 'All Items' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dishes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {menusList
                  .filter(d => {
                    const matchSearch = !dishSearch || d.name?.toLowerCase().includes(dishSearch.toLowerCase()) || d.category?.toLowerCase().includes(dishSearch.toLowerCase());
                    const matchCategory = dishCategoryFilter === 'all' || d.category === dishCategoryFilter;
                    return matchSearch && matchCategory;
                  })
                  .map(d => {
                    const isAvailable = d.isAvailable ?? d.is_available ?? true;
                    return (
                      <div key={d.id} className="p-3.5 bg-[#1E1B1C] rounded-2xl border border-white/5 hover:border-white/15 transition-all space-y-3 flex flex-col justify-between shadow-md">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs sm:text-sm text-white truncate font-['Outfit']">{d.name}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-neutral-400 font-medium inline-block mt-0.5">
                                {d.category || 'General'}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs sm:text-sm font-black text-[#E0FF33] font-['Outfit']">₹{d.price}</p>
                              {d.originalPrice && d.originalPrice > d.price && (
                                <p className="text-[10px] text-neutral-500 line-through">₹{d.originalPrice}</p>
                              )}
                            </div>
                          </div>

                          <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">{d.description || 'Traditional satvik culinary preparation.'}</p>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleDishAvailability(d.id, isAvailable)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              isAvailable
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isAvailable ? 'In-Stock' : 'Out of Stock'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDish(d.id, d.name)}
                            title="Delete dish"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-white/5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* 4. Combo Packs Builder Master */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-5 sm:p-6 md:col-span-2 space-y-4 shadow-xl transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
            <button
              type="button"
              onClick={() => toggleSection('combos')}
              className="flex items-start sm:items-center gap-3 min-w-0 text-left cursor-pointer group flex-1"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-400 flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit'] group-hover:text-amber-400 transition-colors">
                    Combo Packs & Festival Boxes
                  </h3>
                  <div className={`p-1 rounded-lg bg-white/5 text-neutral-400 group-hover:text-white transition-transform duration-200 ${collapsedSections.combos ? '' : 'rotate-180'}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 truncate">Bundle bestsellers into high-converting combo boxes with auto % discount badges.</p>
              </div>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (collapsedSections.combos) setCollapsedSections(prev => ({ ...prev, combos: false }));
                  setIsCreatingCombo(!isCreatingCombo);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>{isCreatingCombo ? 'Close Form' : 'Build Combo'}</span>
              </button>
            </div>
          </div>

          {!collapsedSections.combos && (
            <div className="space-y-4 pt-3 border-t border-white/5 animate-fadeIn">
              {/* Build Combo Form */}
              {isCreatingCombo && (
                <form onSubmit={handleCreateCombo} className="p-4 sm:p-5 bg-[#1E1B1C] rounded-2xl border border-amber-400/30 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <Gift className="w-4 h-4" /> Build New Satvik Combo Pack
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-mono">Syncs with `is_combo: true`</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Combo Pack Title</label>
                      <input
                        type="text"
                        value={newComboName}
                        onChange={e => setNewComboName(e.target.value)}
                        placeholder="e.g. Vrindavan Mahabhog & Lassi Feast"
                        required
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Combo Special Price (₹)</label>
                      <input
                        type="number"
                        value={newComboPrice}
                        onChange={e => setNewComboPrice(e.target.value)}
                        placeholder="e.g. 299"
                        required
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Original Total Value (₹)</label>
                      <input
                        type="number"
                        value={newComboOriginalPrice}
                        onChange={e => setNewComboOriginalPrice(e.target.value)}
                        placeholder="e.g. 399"
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Items Included (1 item per line)</label>
                      <textarea
                        rows={3}
                        value={newComboItems}
                        onChange={e => setNewComboItems(e.target.value)}
                        placeholder="1x Royal Rajbhog Thali&#10;1x Kesar Badam Lassi&#10;2x Malpua Rabdi"
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Target Kitchen</label>
                      <select
                        value={newComboShopId}
                        onChange={e => setNewComboShopId(e.target.value)}
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-amber-400"
                      >
                        <option value="all">All Kitchens</option>
                        {shopsList.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-xs text-neutral-400 font-medium">
                      Auto-Calculated Savings: <strong className="text-amber-400">{Number(newComboOriginalPrice) > Number(newComboPrice) ? `${Math.round(((Number(newComboOriginalPrice) - Number(newComboPrice)) / Number(newComboOriginalPrice)) * 100)}% OFF` : '0%'}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreatingCombo(false)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                      >
                        Publish Combo Pack
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Combos Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menusList
                  .filter(m => m.isCombo || m.is_combo || m.category === 'Combo Offers')
                  .map(combo => {
                    const isAvailable = combo.isAvailable ?? combo.is_available ?? true;
                    const items = Array.isArray(combo.comboItems) ? combo.comboItems : Array.isArray(combo.combo_items) ? combo.combo_items : [];
                    return (
                      <div key={combo.id} className="p-4 bg-[#1E1B1C] rounded-2xl border border-white/5 hover:border-amber-400/20 transition-all space-y-3 flex flex-col justify-between shadow-md">
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-white font-['Outfit'] truncate">{combo.name}</h4>
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                                Save {combo.discountPercent || (combo.originalPrice > combo.price ? Math.round(((combo.originalPrice - combo.price) / combo.originalPrice) * 100) : 15)}%
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-base font-black text-[#E0FF33] font-['Outfit']">₹{combo.price}</p>
                              {combo.originalPrice && combo.originalPrice > combo.price && (
                                <p className="text-[10px] text-neutral-500 line-through">₹{combo.originalPrice}</p>
                              )}
                            </div>
                          </div>

                          {items.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-neutral-500">Box Contents</p>
                              <div className="flex flex-wrap gap-1">
                                {items.map((itemStr, idx) => (
                                  <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-neutral-300 border border-white/5">
                                    {itemStr}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleDishAvailability(combo.id, isAvailable)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isAvailable
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isAvailable ? 'In-Stock' : 'Sold Out'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDish(combo.id, combo.name)}
                            title="Delete Combo"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-white/5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* 5. Promotions & Offers Master */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-5 sm:p-6 md:col-span-2 space-y-4 shadow-xl transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
            <button
              type="button"
              onClick={() => toggleSection('offers')}
              className="flex items-start sm:items-center gap-3 min-w-0 text-left cursor-pointer group flex-1"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-400/15 text-emerald-400 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit'] group-hover:text-emerald-400 transition-colors">
                    Promo Codes & Offers Master
                  </h3>
                  <div className={`p-1 rounded-lg bg-white/5 text-neutral-400 group-hover:text-white transition-transform duration-200 ${collapsedSections.offers ? '' : 'rotate-180'}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 truncate">Create coupon codes, flat/percentage discounts, min order limits and active toggles.</p>
              </div>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (collapsedSections.offers) setCollapsedSections(prev => ({ ...prev, offers: false }));
                  setIsCreatingOffer(!isCreatingOffer);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>{isCreatingOffer ? 'Close Form' : 'New Promo Code'}</span>
              </button>
            </div>
          </div>

          {!collapsedSections.offers && (
            <div className="space-y-4 pt-3 border-t border-white/5 animate-fadeIn">
              {/* Create Offer Form */}
              {isCreatingOffer && (
                <form onSubmit={handleCreateOffer} className="p-4 sm:p-5 bg-[#1E1B1C] rounded-2xl border border-emerald-400/30 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <Tag className="w-4 h-4" /> Create New Promo Code
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-mono">Syncs to `foody_offers`</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Coupon Code (Uppercase)</label>
                      <input
                        type="text"
                        value={newOfferCode}
                        onChange={e => setNewOfferCode(e.target.value.toUpperCase())}
                        placeholder="e.g. RADHE108"
                        required
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-emerald-400 uppercase font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Discount Type</label>
                      <select
                        value={newOfferDiscountType}
                        onChange={e => setNewOfferDiscountType(e.target.value)}
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-emerald-400"
                      >
                        <option value="percentage">Percentage Discount (%)</option>
                        <option value="flat">Flat Amount (₹)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Discount Value</label>
                      <input
                        type="number"
                        value={newOfferDiscountValue}
                        onChange={e => setNewOfferDiscountValue(e.target.value)}
                        placeholder={newOfferDiscountType === 'percentage' ? "e.g. 20 (%)" : "e.g. 50 (₹)"}
                        required
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-emerald-400 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Min Order Amount (₹)</label>
                      <input
                        type="number"
                        value={newOfferMinOrder}
                        onChange={e => setNewOfferMinOrder(e.target.value)}
                        placeholder="e.g. 199"
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Offer Title</label>
                      <input
                        type="text"
                        value={newOfferTitle}
                        onChange={e => setNewOfferTitle(e.target.value)}
                        placeholder="e.g. Festival Prasad Special Discount"
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Subtitle / Marketing Note</label>
                      <input
                        type="text"
                        value={newOfferSubtitle}
                        onChange={e => setNewOfferSubtitle(e.target.value)}
                        placeholder="e.g. Get 20% OFF up to ₹100 on your satvik order"
                        className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                      <input
                        type="checkbox"
                        checked={newOfferIsActive}
                        onChange={e => setNewOfferIsActive(e.target.checked)}
                        className="rounded text-emerald-400 focus:ring-0"
                      />
                      <span className="font-bold text-emerald-400">Coupon Code Active</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreatingOffer(false)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                      >
                        Create Promo Code
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Promo Codes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offersList.map(offer => {
                  const isActive = offer.isActive ?? offer.is_active ?? true;
                  const isPct = (offer.discountType || offer.discount_type) === 'percentage';
                  const val = offer.discountValue ?? offer.discount_value ?? 20;
                  return (
                    <div key={offer.id} className="p-4 bg-[#1E1B1C] rounded-2xl border border-white/5 hover:border-emerald-400/20 transition-all space-y-3 flex flex-col justify-between shadow-md">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-emerald-400 px-2.5 py-1 rounded-xl bg-emerald-400/10 border border-emerald-400/30">
                              {offer.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyOfferCode(offer.code)}
                              title="Copy code"
                              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-500'
                          }`}>
                            {isActive ? 'Active' : 'Disabled'}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-white font-['Outfit']">{offer.title}</h4>
                          <p className="text-[11px] text-neutral-400 mt-0.5">{offer.subtitle || (isPct ? `${val}% OFF on satvik meals` : `Flat ₹${val} OFF`)}</p>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-neutral-400 pt-1">
                          <span>Min: ₹{offer.minOrderAmount ?? offer.min_order_amount ?? 0}</span>
                          {offer.maxDiscount && <span>Max: ₹{offer.maxDiscount}</span>}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleOfferActive(offer.id, isActive)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {isActive ? 'Active' : 'Enable'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteOffer(offer.id, offer.code)}
                          title="Delete offer"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-white/5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 6. Global & Per-Kitchen Payment Configuration */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl md:col-span-2 transition-all">

          <button
            type="button"
            onClick={() => toggleSection('payments')}
            className="w-full flex items-center justify-between text-left cursor-pointer group select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#E0FF33]/10 text-[#E0FF33] border border-[#E0FF33]/20 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit'] group-hover:text-[#E0FF33] transition-colors">
                  Payment Gateways Master
                </h3>
                <p className="text-[11px] text-neutral-400 truncate">Manage real-time payment methods globally & per-kitchen</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-[10px] font-black uppercase text-[#E0FF33] bg-[#E0FF33]/10 px-2 py-0.5 rounded-full border border-[#E0FF33]/20 hidden sm:inline">
                Master Switches
              </span>
              <div className={`p-1.5 rounded-xl bg-white/5 text-neutral-400 group-hover:text-white transition-transform duration-200 ${collapsedSections.payments ? '' : 'rotate-180'}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          {!collapsedSections.payments && (
            <div className="space-y-6 pt-3 border-t border-white/5 animate-fadeIn">

          {/* 1. Global Master Switches */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E0FF33]" />
              1. Global Master Switches (All Kitchens)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Online Razorpay Global */}
              <div className="p-4 sm:p-5 bg-[#1E1B1C] rounded-2xl border border-white/5 hover:border-white/10 transition-all flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white font-['Outfit']">Online Payments (Razorpay & UPI)</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Platform-wide UPI, Credit/Debit Cards & Netbanking</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdatePaymentsConfig('onlinePaymentsEnabled', !paymentsConfig.onlinePaymentsEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    paymentsConfig.onlinePaymentsEnabled ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]' : 'bg-neutral-700'
                  }`}
                  role="switch"
                  aria-checked={paymentsConfig.onlinePaymentsEnabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      paymentsConfig.onlinePaymentsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Cash on Delivery Global */}
              <div className="p-4 sm:p-5 bg-[#1E1B1C] rounded-2xl border border-white/5 hover:border-white/10 transition-all flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 flex items-center justify-center shrink-0">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white font-['Outfit']">Cash on Delivery (COD)</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Platform-wide Physical Cash Collection on Delivery</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdatePaymentsConfig('codEnabled', !paymentsConfig.codEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    paymentsConfig.codEnabled ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]' : 'bg-neutral-700'
                  }`}
                  role="switch"
                  aria-checked={paymentsConfig.codEnabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      paymentsConfig.codEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 2. Specific Kitchen Master Switches */}
          <div className="space-y-3 pt-3 border-t border-white/5">
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  2. Kitchen-Specific Payment Config
                </p>
                <span className="text-[10px] text-neutral-400 font-medium">Select kitchen branch to configure</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {allShops.map(s => {
                  const isSelected = (selectedPaymentShopId || allShops[0]?.id) === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedPaymentShopId(s.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-2 shrink-0 ${isSelected
                          ? 'bg-[#E0FF33] text-black border-[#E0FF33] font-black shadow-[0_0_12px_rgba(224,255,51,0.25)]'
                          : 'bg-[#1E1B1C] text-neutral-400 border-white/10 hover:text-white hover:border-white/20'
                        }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span className="whitespace-nowrap">{s.name}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {(() => {
              const activeTargetShop = allShops.find(s => s.id === (selectedPaymentShopId || allShops[0]?.id)) || allShops[0];
              const shopOnline = activeTargetShop?.paymentSettings?.onlinePaymentsEnabled ?? activeTargetShop?.onlinePaymentsEnabled ?? true;
              const shopCod = activeTargetShop?.paymentSettings?.codEnabled ?? activeTargetShop?.codEnabled ?? true;
              const isGlobalOnlineOff = paymentsConfig.onlinePaymentsEnabled === false;
              const isGlobalCodOff = paymentsConfig.codEnabled === false;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className={`p-4 sm:p-5 bg-[#1E1B1C] rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isGlobalOnlineOff ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/5 hover:border-white/10'
                  }`}>
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs sm:text-sm font-bold text-white font-['Outfit']">Online Payments (UPI/Cards)</p>
                          {isGlobalOnlineOff && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              Disabled Globally
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5 truncate">For {activeTargetShop?.name || 'Selected Kitchen'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleKitchenPayment(activeTargetShop?.id, 'onlinePaymentsEnabled', !shopOnline)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        shopOnline ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]' : 'bg-neutral-700'
                      }`}
                      role="switch"
                      aria-checked={shopOnline}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          shopOnline ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className={`p-4 sm:p-5 bg-[#1E1B1C] rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isGlobalCodOff ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/5 hover:border-white/10'
                  }`}>
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 flex items-center justify-center shrink-0">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs sm:text-sm font-bold text-white font-['Outfit']">Cash on Delivery (COD)</p>
                          {isGlobalCodOff && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              Disabled Globally
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5 truncate">For {activeTargetShop?.name || 'Selected Kitchen'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleKitchenPayment(activeTargetShop?.id, 'codEnabled', !shopCod)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        shopCod ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]' : 'bg-neutral-700'
                      }`}
                      role="switch"
                      aria-checked={shopCod}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          shopCod ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
            </div>
          )}
        </div>

        {/* 3. Simulator Container */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-5 sm:p-6 md:col-span-2 space-y-4 shadow-xl transition-all">
          <button
            type="button"
            onClick={() => toggleSection('simulator')}
            className="w-full flex items-center justify-between text-left cursor-pointer group select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit'] group-hover:text-[#E0FF33] transition-colors">
                  End-to-End Order Simulator
                </h3>
                <p className="text-[11px] text-neutral-400 truncate">Generate simulated tickets into Supabase without going through payment gateways.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider hidden sm:inline">
                {collapsedSections.simulator ? 'Expand' : 'Minimize'}
              </span>
              <div className={`p-1.5 rounded-xl bg-white/5 text-neutral-400 group-hover:text-white transition-transform duration-200 ${collapsedSections.simulator ? '' : 'rotate-180'}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          {!collapsedSections.simulator && (
            <form onSubmit={handleRunOrderSimulator} className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-white/5 animate-fadeIn">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Target Kitchen
                  </label>
                  <span className="text-[10px] text-neutral-500 font-bold font-['Plus_Jakarta_Sans']">
                    {allShops.length} Locations
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {allShops.map(s => {
                    const isSelected = simShopId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSimShopChange(s.id)}
                        className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer shrink-0 select-none ${
                          isSelected
                            ? 'bg-[#E0FF33] text-black border-[#E0FF33] shadow-[0_2px_10px_rgba(224,255,51,0.25)] font-black'
                            : 'bg-[#1E1B1C] text-neutral-400 border-white/10 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span className="whitespace-nowrap">{s.name}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Client Name</label>
                <input
                  type="text"
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  required
                  className="w-full bg-[#1E1B1C] text-xs text-white border border-white/10 rounded-2xl p-3 focus:outline-none focus:border-[#E0FF33]/50 font-['Plus_Jakarta_Sans']"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={simAddress}
                  onChange={(e) => setSimAddress(e.target.value)}
                  required
                  className="w-full bg-[#1E1B1C] text-xs text-white border border-white/10 rounded-2xl p-3 focus:outline-none focus:border-[#E0FF33]/50 font-['Plus_Jakarta_Sans']"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Client Phone</label>
                <input
                  type="tel"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  required
                  className="w-full bg-[#1E1B1C] text-xs text-white border border-white/10 rounded-2xl p-3 focus:outline-none focus:border-[#E0FF33]/50 font-['Plus_Jakarta_Sans']"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Simulated Payment Gateway</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimPaymentMethod('online')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      simPaymentMethod === 'online'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm font-black'
                        : 'bg-[#1E1B1C] text-neutral-400 border-white/10 hover:text-white'
                    }`}
                  >
                    <CreditCard size={13} />
                    <span>Paid Online</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimPaymentMethod('cash')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      simPaymentMethod === 'cash'
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm font-black'
                        : 'bg-[#1E1B1C] text-neutral-400 border-white/10 hover:text-white'
                    }`}
                  >
                    <Banknote size={13} />
                    <span>Cash on Delivery</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 flex flex-col justify-between">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Select Simulated Dishes</label>
                <div className="border border-white/10 bg-[#1E1B1C] rounded-2xl p-3 max-h-56 overflow-y-auto space-y-2 no-scrollbar">
                  {simMenuItems.length === 0 ? (
                    <p className="text-neutral-500 text-center py-12 text-xs">Choose a kitchen location on the left first.</p>
                  ) : (
                    simCart.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs py-2 border-b last:border-b-0 border-white/5">
                        <div className="pr-2">
                          <p className="font-bold text-white font-['Outfit']">{item.name}</p>
                          <p className="text-[10px] text-[#E0FF33] font-bold">₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-[#282526] rounded-xl border border-white/10 p-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateSimQty(item.id, -1)}
                            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-xs font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-bold text-white text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSimQty(item.id, 1)}
                            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-xs font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={simMenuItems.length === 0 || isSimulating}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#E0FF33] hover:bg-[#d2f323] disabled:opacity-30 disabled:pointer-events-none text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isSimulating ? 'Creating Order...' : 'Dispatch Simulated Order (Bypass Payment)'}</span>
              </button>
            </div>
          </form>
          )}
        </div>

        {/* 4. Registered Users & Role Directory Management */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-5 sm:p-6 md:col-span-2 space-y-4 shadow-xl transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
            <button
              type="button"
              onClick={() => toggleSection('users')}
              className="flex items-start sm:items-center gap-3 min-w-0 text-left cursor-pointer group flex-1"
            >
              <div className="w-9 h-9 rounded-xl bg-[#E0FF33]/15 text-[#E0FF33] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit'] group-hover:text-[#E0FF33] transition-colors">
                    Registered Users & Role Matrix
                  </h3>
                  <div className={`p-1 rounded-lg bg-white/5 text-neutral-400 group-hover:text-white transition-transform duration-200 ${collapsedSections.users ? '' : 'rotate-180'}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 truncate">Manage live roles, assign kitchen locations, and test role-based permissions.</p>
              </div>
            </button>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleRestoreDefaultAccounts}
                title="Restore default developer, owner, chef and delivery accounts"
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-bold text-xs border border-white/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">Restore Master</span>
              </button>

              <button
                onClick={() => {
                  if (collapsedSections.users) setCollapsedSections(prev => ({ ...prev, users: false }));
                  setIsCreatingUser(!isCreatingUser);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#E0FF33] hover:bg-[#d6f727] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{isCreatingUser ? 'Close Form' : 'Add Staff'}</span>
              </button>
            </div>
          </div>

          {!collapsedSections.users && (
            <div className="space-y-5 pt-3 border-t border-white/5 animate-fadeIn">

          {/* Active Supabase Logged-In User Banner */}
          {user && (user.email || user.phone || user.id) && (
            <div className="p-3.5 bg-[#1E1B1C] border border-white/10 rounded-2xl flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-[#E0FF33] flex items-center justify-center shrink-0">
                  <Terminal className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs sm:text-sm font-bold text-white font-['Outfit'] truncate">
                      {user.email || user.phone || 'Authenticated User'}
                    </p>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 tracking-wider shrink-0">
                      {userData?.role || 'developer'}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 font-mono truncate mt-0.5">
                    UID: {user.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const uProfile = {
                    id: user.id,
                    email: user.email || '',
                    displayName: userData?.displayName || user.user_metadata?.displayName || user.email?.split('@')[0] || 'Logged In Dev',
                    phone: userData?.phone || '',
                    role: userData?.role || 'developer',
                    shopId: userData?.shopId || allShops[0]?.id || 'shop-vrinda-main',
                    shopIds: userData?.shopIds || [allShops[0]?.id || 'shop-vrinda-main'],
                    isLoggedInUser: true
                  };
                  createCloudUser(uProfile);
                  setToast({ message: "Active Supabase account synced to users directory!", type: "success" });
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-bold text-xs border border-white/10 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#E0FF33]" />
                <span className="hidden sm:inline">Sync Account</span>
              </button>
            </div>
          )}

          {/* Quick Stats Grid & Effective Directory List Computation */}
          {(() => {
            let effectiveList = [...usersList];
            if (user && (user.email || user.id)) {
              const cleanEmail = (user.email || '').toLowerCase().trim();
              const exists = effectiveList.some(u => 
                u.id === user.id || 
                (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail)
              );
              if (!exists) {
                effectiveList.unshift({
                  id: user.id,
                  displayName: userData?.displayName || user.user_metadata?.displayName || user.email?.split('@')[0] || 'Logged In User',
                  email: user.email || '',
                  phone: userData?.phone || user.phone || '',
                  role: userData?.role || 'developer',
                  shopId: userData?.shopId || allShops[0]?.id || 'shop-vrinda-main',
                  shopIds: userData?.shopIds || [allShops[0]?.id || 'shop-vrinda-main'],
                  isLoggedInUser: true
                });
              }
            }

            const grandAdminCount = effectiveList.filter(u => u.role === 'grand_admin').length;
            const developerCount = effectiveList.filter(u => u.role === 'developer').length;
            const ownerCount = effectiveList.filter(u => u.role === 'owner').length;
            const kitchenCount = effectiveList.filter(u => u.role === 'kitchen').length;
            const deliveryCount = effectiveList.filter(u => u.role === 'delivery').length;
            const customerCount = effectiveList.filter(u => !u.role || u.role === 'customer').length;

            return (
              <>
                {/* 5-Metric Role Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  <div className="col-span-2 sm:col-span-1 p-3 bg-[#1E1B1C] rounded-2xl border border-white/10 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Users</p>
                      <Users className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-white mt-1 font-['Outfit']">{effectiveList.length}</p>
                  </div>

                  <div className="p-3 bg-[#1E1B1C] rounded-2xl border border-white/5 hover:border-white/15 transition-all">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-[#E0FF33] uppercase tracking-wider">Developers</p>
                      <Terminal className="w-3.5 h-3.5 text-[#E0FF33]" />
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-[#E0FF33] mt-1 font-['Outfit']">{developerCount}</p>
                  </div>

                  <div className="p-3 bg-[#1E1B1C] rounded-2xl border border-white/5 hover:border-white/15 transition-all">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Store Owners</p>
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-purple-300 mt-1 font-['Outfit']">{ownerCount}</p>
                  </div>

                  <div className="p-3 bg-[#1E1B1C] rounded-2xl border border-white/5 hover:border-white/15 transition-all">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Kitchen Chefs</p>
                      <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-amber-300 mt-1 font-['Outfit']">{kitchenCount}</p>
                  </div>

                  <div className="p-3 bg-[#1E1B1C] rounded-2xl border border-white/5 hover:border-white/15 transition-all">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Riders (Sarathi)</p>
                      <Truck className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-cyan-300 mt-1 font-['Outfit']">{deliveryCount}</p>
                  </div>
                </div>

                {/* New User Creation Form */}
                {isCreatingUser && (
                  <form onSubmit={handleCreateTestUser} className="p-4 bg-[#1E1B1C] rounded-2xl border border-[#E0FF33]/30 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-['Outfit']">Provision New User / Staff Record</span>
                      <button type="button" onClick={() => setIsCreatingUser(false)} className="text-neutral-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Full Name</label>
                        <input
                          type="text"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="e.g. Radhe Chef"
                          className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Mobile Phone (10 digits) *</label>
                        <input
                          type="tel"
                          value={newUserPhone}
                          onChange={(e) => setNewUserPhone(e.target.value)}
                          placeholder="9876543210"
                          required
                          className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Assigned Role</label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value)}
                          className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33]"
                        >
                          <option value="kitchen">Kitchen Staff</option>
                          <option value="delivery">Delivery Sarathi</option>
                          <option value="owner">Store Owner</option>
                          <option value="developer">Developer Admin</option>
                          <option value="customer">Customer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Assigned Kitchen</label>
                        <select
                          value={newUserShopId}
                          onChange={(e) => setNewUserShopId(e.target.value)}
                          disabled={newUserRole === 'grand_admin' || newUserRole === 'developer'}
                          className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33] disabled:opacity-50"
                        >
                          {(newUserRole === 'grand_admin' || newUserRole === 'developer') ? (
                            <option value="">Global Access (All Kitchens)</option>
                          ) : (
                            allShops.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))
                          )}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-[#E0FF33] hover:bg-[#d6f727] text-black font-black text-xs uppercase tracking-wider cursor-pointer"
                        >
                          Save User
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Search & Role Filter Bar */}
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between pt-1">
                  <div className="relative w-full lg:w-72 shrink-0">
                    <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search name, phone, email, UID..."
                      className="w-full bg-[#1E1B1C] text-xs text-white border border-white/10 rounded-2xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#E0FF33]/50 font-['Plus_Jakarta_Sans']"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 shrink min-w-0">
                    {[
                      { id: 'all', label: 'All', count: effectiveList.length },
                      { id: 'developer', label: 'Developers', count: developerCount },
                      { id: 'owner', label: 'Owners', count: ownerCount },
                      { id: 'kitchen', label: 'Kitchen', count: kitchenCount },
                      { id: 'delivery', label: 'Delivery', count: deliveryCount },
                      { id: 'customer', label: 'Customers', count: customerCount }
                    ].map(f => {
                      const isActive = userRoleFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setUserRoleFilter(f.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                            isActive
                              ? 'bg-[#E0FF33] text-black border-[#E0FF33] font-black shadow-[0_0_12px_rgba(224,255,51,0.2)]'
                              : 'bg-[#1E1B1C] text-neutral-400 border-white/10 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <span>{f.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            isActive ? 'bg-black/20 text-black' : 'bg-white/5 text-neutral-400'
                          }`}>
                            {f.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* User Directory List */}
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 no-scrollbar">
                  {(() => {
                    const filtered = effectiveList.filter(u => {
                      const matchesRole = userRoleFilter === 'all' || (u.role || 'customer') === userRoleFilter;
                      const q = userSearch.toLowerCase().trim();
                      const matchesSearch = !q ||
                        (u.displayName || '').toLowerCase().includes(q) ||
                        (u.phone || '').includes(q) ||
                        (u.email || '').toLowerCase().includes(q) ||
                        (u.id || '').toLowerCase().includes(q);
                      return matchesRole && matchesSearch;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-10 bg-[#1E1B1C] rounded-2xl border border-white/5">
                          <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                          <p className="text-xs font-bold text-neutral-400">No registered users matched the criteria.</p>
                          <p className="text-[11px] text-neutral-600 mt-0.5">Add a new staff account above or adjust your search.</p>
                        </div>
                      );
                    }

                    return filtered.map(u => {
                      const role = u.role || 'customer';
                      const assignedShop = allShops.find(s => s.id === u.shopId) || allShops[0];
                      const isCurrentSessionUser = u.isLoggedInUser || u.id === user?.id || (user?.email && u.email?.toLowerCase().trim() === user?.email?.toLowerCase().trim());

                      return (
                        <div
                          key={u.id}
                          className={`p-3.5 sm:p-4 bg-[#1E1B1C] hover:bg-[#232021] rounded-2xl border transition-all space-y-3 shadow-sm ${
                            isCurrentSessionUser 
                              ? 'border-[#E0FF33]/30 bg-[#1E1B1C]/95' 
                              : 'border-white/5 hover:border-white/15'
                          }`}
                        >
                          {/* Top Row: User Identity & Action Icons */}
                          <div className="flex items-center justify-between gap-3">
                            <div 
                              onClick={() => setSelectedUserDetail(u)}
                              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group/user"
                              title="Click to view detailed user profile"
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs shrink-0 transition-transform group-hover/user:scale-105 shadow-sm ${
                                role === 'grand_admin' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                                role === 'developer' ? 'bg-[#E0FF33]/15 text-[#E0FF33] border border-[#E0FF33]/30' :
                                role === 'owner' ? 'bg-purple-400/15 text-purple-300 border border-purple-400/30' :
                                role === 'kitchen' ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30' :
                                role === 'delivery' ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/30' :
                                'bg-white/10 text-neutral-300 border border-white/10'
                              }`}>
                                {role === 'grand_admin' ? <Crown className="w-4 h-4" /> :
                                 role === 'developer' ? <Terminal className="w-4 h-4" /> :
                                 role === 'owner' ? <ShieldCheck className="w-4 h-4" /> :
                                 role === 'kitchen' ? <ChefHat className="w-4 h-4" /> :
                                 role === 'delivery' ? <Truck className="w-4 h-4" /> :
                                 <Sparkles className="w-4 h-4" />}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-xs sm:text-sm text-white group-hover/user:text-[#E0FF33] transition-colors truncate font-['Outfit']">
                                    {u.displayName || (u.email ? u.email.split('@')[0] : `User (${(u.phone || '').slice(-4)})`)}
                                  </p>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider flex items-center gap-1 shrink-0 ${
                                    role === 'grand_admin' ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30' :
                                    role === 'developer' ? 'bg-[#E0FF33]/15 text-[#E0FF33] border border-[#E0FF33]/30' :
                                    role === 'owner' ? 'bg-purple-400/15 text-purple-300 border border-purple-400/30' :
                                    role === 'kitchen' ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30' :
                                    role === 'delivery' ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/30' :
                                    'bg-white/5 text-neutral-400 border border-white/10'
                                  }`}>
                                    {role === 'grand_admin' ? 'Grand Admin' :
                                     role === 'developer' ? 'Developer' :
                                     role === 'owner' ? 'Owner' :
                                     role === 'kitchen' ? 'Cook' :
                                     role === 'delivery' ? 'Sarathi' :
                                     'Customer'}
                                  </span>
                                  {isCurrentSessionUser && (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#E0FF33]/20 text-[#E0FF33] border border-[#E0FF33]/30 shrink-0">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-neutral-400 truncate mt-0.5">
                                  {u.email && (
                                    <span className="truncate flex items-center gap-1 text-neutral-300">
                                      <Mail className="w-3 h-3 text-neutral-500 shrink-0" />
                                      {u.email}
                                    </span>
                                  )}
                                  {u.phone && !u.email && (
                                    <span className="font-mono text-neutral-300 flex items-center gap-1 shrink-0">
                                      <Phone className="w-3 h-3 text-neutral-500" />
                                      +91 {u.phone}
                                    </span>
                                  )}
                                  <span className="font-mono text-neutral-500 text-[10px] shrink-0">
                                    ({u.id.slice(0, 8)})
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Secondary Action Icons (Info + Delete) */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedUserDetail(u)}
                                title="View account metadata & permissions"
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition-all active:scale-95 cursor-pointer"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>

                              {role === 'grand_admin' ? (
                                <div 
                                  className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400/60 cursor-not-allowed"
                                  title="Permanent protected account"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.displayName, u.email)}
                                  title="Delete user account"
                                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all active:scale-95 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Bottom Row: Controls Toolbar (Role, Scope, Test Login) */}
                          <div className="pt-2.5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 min-w-0 flex-1">
                              {/* Role Selector / Fixed Badge */}
                              {role === 'grand_admin' ? (
                                <div 
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center sm:justify-start gap-1.5 select-none shrink-0"
                                  title="Grand Admin role is permanent across the platform"
                                >
                                  <Lock className="w-3 h-3 shrink-0 text-amber-400" />
                                  <span className="truncate">Grand Admin</span>
                                </div>
                              ) : (
                                <select
                                  value={role}
                                  onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                  className="w-full sm:w-auto bg-[#151314] text-xs font-bold text-white border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#E0FF33] cursor-pointer shrink-0"
                                >
                                  <option value="customer">Customer</option>
                                  <option value="kitchen">Kitchen Staff</option>
                                  <option value="delivery">Delivery Sarathi</option>
                                  <option value="owner">Store Owner</option>
                                  <option value="developer">Developer</option>
                                </select>
                              )}

                              {/* Scope / Branch Assignment */}
                              {(role === 'kitchen' || role === 'delivery' || role === 'owner') ? (
                                <select
                                  value={u.shopId || (allShops[0]?.id || '')}
                                  onChange={(e) => handleUpdateUserShop(u.id, e.target.value)}
                                  className="w-full sm:w-auto bg-[#151314] text-xs font-bold text-neutral-300 border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#E0FF33] cursor-pointer shrink-0 max-w-full sm:max-w-[150px] truncate"
                                >
                                  {allShops.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              ) : (role === 'grand_admin' || role === 'developer') ? (
                                <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-neutral-300 flex items-center justify-center sm:justify-start gap-1.5 shrink-0">
                                  <Globe className="w-3.5 h-3.5 text-[#E0FF33] shrink-0" />
                                  <span className="truncate">Global Access</span>
                                </div>
                              ) : (
                                <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-neutral-400 flex items-center justify-center sm:justify-start gap-1.5 shrink-0">
                                  <Users className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">Public User</span>
                                </div>
                              )}
                            </div>

                            {/* Impersonate / Launch Button */}
                            <button
                              type="button"
                              onClick={() => handleQuickImpersonateUser(u)}
                              title={`Sign in as ${u.displayName || u.email || 'user'}`}
                              className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-[#E0FF33]/15 hover:bg-[#E0FF33] text-[#E0FF33] hover:text-black font-black text-xs border border-[#E0FF33]/30 flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                            >
                              <Play className="w-3 h-3 fill-current shrink-0" />
                              <span>Test Login</span>
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </>
            );
          })()}
            </div>
          )}
        </div>

        {/* 5. Audio System Telemetry & Role Synthesizer */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-5 sm:p-6 md:col-span-2 space-y-4 shadow-xl transition-all">
          <button
            type="button"
            onClick={() => toggleSection('alarm')}
            className="w-full flex items-center justify-between text-left cursor-pointer group select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 flex items-center justify-center shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit'] group-hover:text-[#E0FF33] transition-colors">
                  Audio Synthesizer & Telemetry
                </h3>
                <p className="text-[11px] text-neutral-400 truncate">Test real-time acoustic alarms, WebAudio frequency sweeps & push alerts.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border hidden sm:inline-flex items-center gap-1 ${
                audioUnlocked
                  ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
                  : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${audioUnlocked ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{audioUnlocked ? 'Active' : 'Standby'}</span>
              </span>
              <div className={`p-1.5 rounded-xl bg-white/5 text-neutral-400 group-hover:text-white transition-transform duration-200 ${collapsedSections.alarm ? '' : 'rotate-180'}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          {!collapsedSections.alarm && (
            <div className="space-y-4 pt-3 border-t border-white/5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Synthesizer engine control & background triggers</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {!audioUnlocked && (
                    <button
                      onClick={warmUpAudio}
                      className="px-3 py-1 rounded-xl bg-[#E0FF33] text-black font-black text-xs uppercase tracking-wider hover:bg-[#d4f820] active:scale-95 cursor-pointer"
                    >
                      Unlock Audio
                    </button>
                  )}

                  {isPlaying && (
                    <button
                      onClick={stopAlarm}
                      className="px-3.5 py-1 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Silence</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#1E1B1C] rounded-2xl border border-white/5 items-center">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase">Volume Level: {Math.round(volume * 100)}%</p>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full accent-[#E0FF33] cursor-pointer mt-1"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase">Browser Push Alerts</p>
                  <p className="text-xs font-bold text-white mt-0.5">
                    Status: <span className={notificationPermission === 'granted' ? 'text-emerald-400' : 'text-amber-400'}>
                      {notificationPermission.toUpperCase()}
                    </span>
                  </p>
                </div>

                <div className="flex justify-start sm:justify-end">
                  {notificationPermission !== 'granted' ? (
                    <button
                      onClick={requestNotificationPermission}
                      className="px-3 py-1.5 rounded-xl bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-400/30 text-xs font-bold transition-all cursor-pointer"
                    >
                      Enable Push
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Push Active
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <button
                  onClick={() => playRoleAlarm('kitchen', { title: 'TEST KITCHEN BUZZER', orderId: 'ord-test-kitch' }, true)}
                  className="py-3 px-3 rounded-2xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <ChefHat className="w-4 h-4 text-amber-400" />
                  <span>Kitchen Buzzer</span>
                  <span className="text-[9px] text-amber-400/70">880/1174Hz Urgent Loop</span>
                </button>

                <button
                  onClick={() => playRoleAlarm('delivery', { title: 'TEST SARATHI CHIME', orderId: 'ord-test-deliv' }, true)}
                  className="py-3 px-3 rounded-2xl bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-300 border border-cyan-400/30 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-cyan-400" />
                  <span>Sarathi Chime</span>
                  <span className="text-[9px] text-cyan-400/70">3-Tone Ascending Ping</span>
                </button>

                <button
                  onClick={() => playRoleAlarm('owner', { title: 'TEST ADMIN PING', orderId: 'ord-test-admin' }, false)}
                  className="py-3 px-3 rounded-2xl bg-[#E0FF33]/20 hover:bg-[#E0FF33]/30 text-[#E0FF33] border border-[#E0FF33]/30 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-[#E0FF33]" />
                  <span>Admin Bell</span>
                  <span className="text-[9px] text-[#E0FF33]/70">Resonant Executive Ping</span>
                </button>

                <button
                  onClick={() => playRoleAlarm('customer', { title: 'TEST PRASAD CHIME', orderId: 'ord-test-cust' }, false)}
                  className="py-3 px-3 rounded-2xl bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-300 border border-emerald-400/30 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Prasad Blessing</span>
                  <span className="text-[9px] text-emerald-400/70">528Hz Solfeggio Chime</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Custom Confirmation Modal for Deleting User Account */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#282526] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white font-['Outfit']">Delete User Account?</h3>
              <p className="text-xs text-neutral-400 font-['Plus_Jakarta_Sans']">
                Are you sure you want to permanently delete <span className="text-white font-bold">"{userToDelete.name}"</span>? This will remove all assigned roles and credentials.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-2.5 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed User Profile Info Modal */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#1E1B1C] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-scaleUp relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#E0FF33]/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#E0FF33]/15 text-[#E0FF33] border border-[#E0FF33]/30 flex items-center justify-center font-black text-lg">
                  {(selectedUserDetail.displayName || selectedUserDetail.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-white text-base font-['Outfit']">
                    {selectedUserDetail.displayName || 'User Profile'}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    UID: {selectedUserDetail.id.slice(0, 16)}...
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Fields */}
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Assigned Platform Role</span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white uppercase text-sm flex items-center gap-1.5">
                    {selectedUserDetail.role === 'grand_admin' ? (
                      <>
                        <Crown size={14} className="text-amber-400 stroke-[2.5]" />
                        <span>Grand Admin (Permanent Root)</span>
                      </>
                    ) : selectedUserDetail.role === 'developer' ? (
                      <>
                        <Terminal size={14} className="text-[#E0FF33] stroke-[2.5]" />
                        <span>Developer</span>
                      </>
                    ) : selectedUserDetail.role === 'owner' ? (
                      <>
                        <ShieldCheck size={14} className="text-purple-400 stroke-[2.5]" />
                        <span>Owner</span>
                      </>
                    ) : selectedUserDetail.role === 'kitchen' ? (
                      <>
                        <ChefHat size={14} className="text-amber-400 stroke-[2.5]" />
                        <span>Cook</span>
                      </>
                    ) : selectedUserDetail.role === 'delivery' ? (
                      <>
                        <Bike size={14} className="text-cyan-400 stroke-[2.5]" />
                        <span>Sarathi Rider</span>
                      </>
                    ) : (
                      selectedUserDetail.role || 'customer'
                    )}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#E0FF33]/15 text-[#E0FF33] font-bold border border-[#E0FF33]/30 font-mono">
                    {selectedUserDetail.role === 'grand_admin' ? 'Level 6 (Permanent)' : selectedUserDetail.role === 'developer' ? 'Level 5 (Admin)' : 'Standard'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-cyan-400" /> Email
                  </span>
                  <p className="font-bold text-white truncate">{selectedUserDetail.email || 'Not Provided'}</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" /> Phone
                  </span>
                  <p className="font-bold text-white truncate">{selectedUserDetail.phone ? `+91 ${selectedUserDetail.phone}` : 'Not Linked'}</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Full Supabase Auth UID</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedUserDetail.id);
                      setToast({ message: 'UID copied to clipboard!', type: 'success' });
                    }}
                    className="text-[10px] text-[#E0FF33] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <p className="font-mono text-[11px] text-neutral-300 break-all select-all">{selectedUserDetail.id}</p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Assigned Branch Kitchen</span>
                <p className="font-bold text-white">
                  {allShops.find(s => s.id === selectedUserDetail.shopId)?.name || (selectedUserDetail.role === 'developer' || selectedUserDetail.role === 'grand_admin' ? 'Global (All Kitchens)' : 'Public Customer Scope')}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleQuickImpersonateUser(selectedUserDetail);
                  setSelectedUserDetail(null);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#E0FF33] hover:bg-[#d4f820] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer font-['Outfit']"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Switch to this User View</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
