import { useState, useEffect, useRef } from 'react';
import { 
  supabase, 
  getCloudMenus, 
  createCloudMenuItem, 
  updateCloudMenuItem, 
  deleteCloudMenuItem, 
  updateCloudShop, 
  markCloudOrderCashCollected, 
  subscribeCloudOrders,
  DEFAULT_PRASAD_ITEMS,
  resolveDishCutout,
  subscribeCloudUsers,
  createCloudUser,
  updateCloudUser,
  getCachedUsers,
  saveCachedUsers
} from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useAudioAlarm } from '../hooks/useAudioAlarm';
import { useFastNotify } from '../hooks/useFastNotify';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement 
} from 'chart.js';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Plus, 
  Edit2, 
  Trash2, 
  Settings, 
  MapPin, 
  Phone, 
  Store,
  Eye,
  EyeOff,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Download,
  Flame,
  CreditCard,
  Banknote,
  UtensilsCrossed,
  ChefHat,
  Truck,
  ShieldCheck,
  CheckCircle2,
  X,
  FileSpreadsheet,
  BarChart3,
  Receipt,
  Compass,
  Check,
  Users,
  UserPlus,
  UserCheck,
  Play
} from 'lucide-react';
import DynamicToast from '../components/ui/DynamicToast';
import ActiveAlarmBanner from '../components/ui/ActiveAlarmBanner';
import MapPicker from '../components/MapPicker';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function OwnerView() {
  const { allShops = [], currentUserShopId, refreshShops, updateUserRole } = useAuth();
  
  // Resolved Active Kitchen
  const currentShop = (allShops && allShops.length > 0)
    ? (allShops.find(s => s.id === currentUserShopId) || allShops[0])
    : null;
  
  // Tab Navigation: 'analytics' | 'menu' | 'settings' | 'history'
  const [activeTab, setActiveTab] = useState('analytics');
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [toast, setToast] = useState(null);

  // Audio & Realtime Alert Hook for Owner Management
  const { isPlaying, activeAlert, playRoleAlarm, stopAlarm } = useAudioAlarm();

  useFastNotify(currentUserShopId, 'owner', (alertData) => {
    playRoleAlarm('owner', alertData, true);
    setToast({
      message: `${alertData.title} (#${alertData.orderId.slice(-6).toUpperCase()})`,
      type: 'info'
    });
  });

  // Payments / Store Operational Settings
  const [paymentsConfig, setPaymentsConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('foody_payment_config');
      return saved ? JSON.parse(saved) : { onlinePaymentsEnabled: true, codEnabled: true };
    } catch (e) {
      return { onlinePaymentsEnabled: true, codEnabled: true };
    }
  });

  // Modals & UI States
  const [isEditShopModalOpen, setIsEditShopModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedAuditOrder, setSelectedAuditOrder] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapTargetCoords, setMapTargetCoords] = useState({ lat: 27.5706, lng: 77.6593 });
  const [coordinateCallback, setCoordinateCallback] = useState(null);

  // Staff & Role Management State with local cache fallback
  const [usersList, setUsersList] = useState(() => {
    try {
      const saved = localStorage.getItem('foody_cached_users');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('kitchen');
  const [staffSearch, setStaffSearch] = useState('');

  // Form Auto-Scroll & Focus Refs
  const menuFormRef = useRef(null);
  const dishNameInputRef = useRef(null);

  // Form State for Shop Profile
  const [shopForm, setShopForm] = useState({
    name: '',
    address: '',
    minimumOrderAmount: '100',
    deliveryCharge: '30',
    gstPercentage: '5',
    lat: '27.5706',
    lng: '77.6593',
    openTime: '08:00',
    closeTime: '22:00',
    alwaysOpen: false,
    timePeriods: ['morning', 'forenoon', 'afternoon', 'evening', 'night'],
    daysOpen: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    estimatedWaitTime: '15-20',
    showWaitTime: true,
    discountTag: '',
    discountDescription: '',
    imageUrl: ''
  });

  // Sync shop form dynamically with active kitchen
  useEffect(() => {
    const target = editingShop || currentShop;
    if (target) {
      if (!editingShop) {
        setEditingShop(target);
      }
      setShopForm({
        name: target.name || '',
        address: target.address || '',
        minimumOrderAmount: String(target.minimumOrderAmount ?? target.minimum_order_amount ?? 100),
        deliveryCharge: String(target.deliveryCharge ?? target.delivery_charge ?? 0),
        gstPercentage: String(target.gstPercentage ?? target.gst_percentage ?? 5),
        lat: target.coordinates?.lat ? String(target.coordinates.lat) : '27.5706',
        lng: target.coordinates?.lng ? String(target.coordinates.lng) : '77.6593',
        openTime: target.schedule?.openTime || '08:00',
        closeTime: target.schedule?.closeTime || '22:00',
        alwaysOpen: target.schedule?.alwaysOpen || false,
        timePeriods: Array.isArray(target.schedule?.timePeriods) && target.schedule.timePeriods.length > 0
          ? target.schedule.timePeriods
          : ['morning', 'forenoon', 'afternoon', 'evening', 'night'],
        daysOpen: Array.isArray(target.schedule?.daysOpen) && target.schedule.daysOpen.length > 0
          ? target.schedule.daysOpen
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        estimatedWaitTime: String(target.estimatedWaitTime ?? target.estimated_wait_time ?? '15-20'),
        showWaitTime: target.showWaitTime !== false,
        discountTag: target.discountTag || target.discount_tag || '',
        discountDescription: target.discountDescription || target.discount_description || '',
        imageUrl: target.imageUrl || target.image || ''
      });
      setMapTargetCoords({
        lat: parseFloat(target.coordinates?.lat) || 27.5706,
        lng: parseFloat(target.coordinates?.lng) || 77.6593
      });
    }
  }, [currentUserShopId, currentShop]);

  // Real-time Supabase users listener
  useEffect(() => {
    const unsubscribe = subscribeCloudUsers((users) => {
      if (users && users.length > 0) {
        setUsersList(users);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateStaffRole = async (userId, newRole) => {
    const targetShopId = currentShop?.id || currentUserShopId;
    setUsersList(prev => {
      const updated = prev.map(u => u.id === userId ? { ...u, role: newRole, shopId: targetShopId } : u);
      saveCachedUsers(updated);
      return updated;
    });
    setToast({ message: `Role updated to ${newRole.toUpperCase()}`, type: 'success' });
    if (updateUserRole) {
      await updateUserRole(userId, newRole, targetShopId);
    } else {
      await updateCloudUser(userId, { role: newRole, shopId: targetShopId });
    }
  };

  const handleAddStaffMember = async (e) => {
    e.preventDefault();
    if (!newStaffPhone.trim()) {
      setToast({ message: 'Mobile phone is required', type: 'error' });
      return;
    }
    const cleanPhone = newStaffPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setToast({ message: 'Please enter a valid 10-digit mobile number', type: 'error' });
      return;
    }
    const userId = `user_${cleanPhone}`;
    const targetShopId = currentShop?.id || currentUserShopId;
    const newStaffRecord = {
      id: userId,
      phone: cleanPhone,
      displayName: newStaffName.trim() || `Staff (${cleanPhone.slice(-4)})`,
      role: newStaffRole,
      shopId: targetShopId
    };

    setUsersList(prev => {
      const updated = [newStaffRecord, ...prev.filter(u => u.id !== userId)];
      saveCachedUsers(updated);
      return updated;
    });
    setToast({ message: `Staff added as ${newStaffRole.toUpperCase()}`, type: 'success' });
    setIsAddingStaff(false);
    setNewStaffName('');
    setNewStaffPhone('');
    setNewStaffRole('kitchen');

    await createCloudUser(newStaffRecord);
  };

  // Form State for Menu Item
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Snacks',
    isAvailable: true,
    isVeg: true,
    spicyLevel: 'Mild',
    imageUrl: '',
    nutrition: '',
    ingredients: ''
  });

  // Fetch shop-specific orders for analytics and audit with Supabase Realtime
  useEffect(() => {
    if (!currentUserShopId) return;

    // 1. Initial fetch from Supabase
    async function fetchCloudOrders() {
      try {
        const { data, error } = await supabase
          .from('foody_orders')
          .select('*')
          .eq('shop_id', currentUserShopId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setOrders(data.map(o => ({
            id: o.id,
            ...o,
            shopId: o.shop_id,
            customerName: o.customer_name,
            customerPhone: o.customer_phone,
            deliveryAddress: o.delivery_address,
            totalAmount: o.total_amount,
            paymentMethod: o.payment_method,
            cashStatus: o.cash_status,
            createdAt: o.created_at
          })));
        }
      } catch (err) {
        console.error('Supabase fetchCloudOrders error:', err);
      }
    }
    fetchCloudOrders();

    // 2. Realtime subscription to Supabase
    const unsubscribeSupabase = subscribeCloudOrders(currentUserShopId, () => {
      fetchCloudOrders();
    });

    return () => {
      if (unsubscribeSupabase) unsubscribeSupabase();
    };
  }, [currentUserShopId]);

  // Fetch menu items for menu manager from Supabase
  useEffect(() => {
    if (!currentUserShopId) return;

    async function loadMenus() {
      const items = await getCloudMenus(currentUserShopId);
      if (items && items.length > 0) {
        setMenuItems(items);
      }
    }
    loadMenus();
  }, [currentUserShopId]);

  // Update Payment Config for active kitchen
  const handleToggleKitchenPayment = async (key, value) => {
    const targetShop = editingShop || currentShop || (allShops && allShops[0]);
    if (!targetShop?.id) return;

    const currentOnline = targetShop?.paymentSettings?.onlinePaymentsEnabled ?? targetShop?.onlinePaymentsEnabled ?? true;
    const currentCod = targetShop?.paymentSettings?.codEnabled ?? targetShop?.codEnabled ?? true;

    const updated = {
      onlinePaymentsEnabled: key === 'onlinePaymentsEnabled' ? value : currentOnline,
      codEnabled: key === 'codEnabled' ? value : currentCod
    };

    await updateCloudShop(targetShop.id, {
      paymentSettings: updated,
      onlinePaymentsEnabled: updated.onlinePaymentsEnabled,
      codEnabled: updated.codEnabled
    });

    if (refreshShops) await refreshShops();
    setToast({ 
      message: `${key === 'onlinePaymentsEnabled' ? 'Online Gateway' : 'COD'} ${value ? 'enabled' : 'disabled'} for ${targetShop?.name || 'this kitchen'}!`, 
      type: "success" 
    });
  };
  const handleUpdatePaymentsConfig = handleToggleKitchenPayment;
  const handleTogglePayment = handleToggleKitchenPayment;

  // KPI Calculations
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalOrdersCount = completedOrders.length;
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

  // Chart data: Daily Sales
  const salesByDate = {};
  completedOrders.forEach(order => {
    if (!order.createdAt) return;
    const dateObj = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const dateStr = dateObj.toISOString().split('T')[0];
    salesByDate[dateStr] = (salesByDate[dateStr] || 0) + order.totalAmount;
  });

  const sortedDates = Object.keys(salesByDate).sort();
  const salesChartData = {
    labels: sortedDates.map(d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })),
    datasets: [{
      label: 'Sales (₹)',
      data: sortedDates.map(d => salesByDate[d]),
      backgroundColor: '#E0FF33',
      borderRadius: 8,
      hoverBackgroundColor: '#d2f323'
    }]
  };

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1E1B1C',
        titleColor: '#fff',
        bodyColor: '#E0FF33',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#888', font: { family: 'Plus Jakarta Sans', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#888', font: { family: 'Plus Jakarta Sans', size: 10 } }
      }
    }
  };

  // Chart data: Order Status
  const statusCounts = {};
  orders.forEach(o => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });
  const statusChartData = {
    labels: Object.keys(statusCounts).map(s => s.replace(/_/g, ' ').toUpperCase()),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: [
        '#f59e0b', // Preparing
        '#10b981', // Ready
        '#06b6d4', // Delivery
        '#6366f1', // Completed
        '#e0ff33'  // New
      ],
      borderWidth: 0
    }]
  };

  const statusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#aaa',
          font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' },
          padding: 16,
          usePointStyle: true
        }
      }
    }
  };

  // Edit/save shop profile
  const handleEditShopClick = (shop) => {
    setEditingShop(shop);
    setShopForm({
      name: shop.name || '',
      address: shop.address || '',
      minimumOrderAmount: String(shop.minimumOrderAmount ?? shop.minimum_order_amount ?? 0),
      deliveryCharge: String(shop.deliveryCharge ?? shop.delivery_charge ?? 0),
      gstPercentage: String(shop.gstPercentage ?? shop.gst_percentage ?? 5),
      lat: shop.coordinates?.lat ? String(shop.coordinates.lat) : '27.5706',
      lng: shop.coordinates?.lng ? String(shop.coordinates.lng) : '77.6593',
      openTime: shop.schedule?.openTime || '08:00',
      closeTime: shop.schedule?.closeTime || '22:00',
      alwaysOpen: shop.schedule?.alwaysOpen || false,
      timePeriods: Array.isArray(shop.schedule?.timePeriods) && shop.schedule.timePeriods.length > 0
        ? shop.schedule.timePeriods
        : ['morning', 'forenoon', 'afternoon', 'evening', 'night'],
      daysOpen: Array.isArray(shop.schedule?.daysOpen) && shop.schedule.daysOpen.length > 0
        ? shop.schedule.daysOpen
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      estimatedWaitTime: String(shop.estimatedWaitTime ?? shop.estimated_wait_time ?? '15-20'),
      showWaitTime: shop.showWaitTime !== false,
      discountTag: shop.discountTag || shop.discount_tag || '',
      discountDescription: shop.discountDescription || shop.discount_description || '',
      imageUrl: shop.imageUrl || shop.image || ''
    });
    setMapTargetCoords({
      lat: parseFloat(shop.coordinates?.lat) || 27.5706,
      lng: parseFloat(shop.coordinates?.lng) || 77.6593
    });
  };

  const handleSaveShopForm = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetShop = editingShop || currentShop || (allShops && allShops[0]);
    const shopId = targetShop?.id || currentUserShopId || 'shop-vrinda-main';

    try {
      const shopUpdateData = {
        name: shopForm.name || targetShop?.name || 'Foody Kitchen',
        address: shopForm.address || targetShop?.address || '',
        minimumOrderAmount: parseFloat(shopForm.minimumOrderAmount) || 0,
        deliveryCharge: parseFloat(shopForm.deliveryCharge) || 0,
        gstPercentage: parseFloat(shopForm.gstPercentage) || 0,
        estimatedWaitTime: shopForm.estimatedWaitTime || '15-20',
        showWaitTime: Boolean(shopForm.showWaitTime),
        discountTag: shopForm.discountTag || '',
        discountDescription: shopForm.discountDescription || '',
        coordinates: {
          lat: parseFloat(shopForm.lat) || targetShop?.coordinates?.lat || 27.5706,
          lng: parseFloat(shopForm.lng) || targetShop?.coordinates?.lng || 77.6593
        },
        schedule: {
          openTime: shopForm.openTime || '08:00',
          closeTime: shopForm.closeTime || '22:00',
          alwaysOpen: Boolean(shopForm.alwaysOpen),
          timePeriods: shopForm.timePeriods || ['morning', 'forenoon', 'afternoon', 'evening', 'night'],
          daysOpen: shopForm.daysOpen || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        imageUrl: shopForm.imageUrl || targetShop?.imageUrl || ''
      };

      // Supabase & Local Cache Sync
      await updateCloudShop(shopId, shopUpdateData);

      setToast({ message: "Kitchen operational settings saved!", type: "success" });
      if (refreshShops) {
        await refreshShops();
      }
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to save kitchen settings", type: "error" });
    }
  };

  // Menu items Add/Edit
  const handleEditMenuItem = (item) => {
    setEditingMenuItem(item);
    setMenuForm({
      name: item.name || '',
      description: item.description || '',
      price: item.price || 0,
      category: item.category || 'Main',
      isSatvik: item.isSatvik !== undefined ? item.isSatvik : true,
      isDailySpecial: item.isDailySpecial || false,
      spicyLevel: item.spicyLevel || 'Mild',
      imageUrl: item.imageUrl || item.image || '',
      nutrition: typeof item.nutrition === 'object' ? item.nutrition.kcal : (item.nutrition || ''),
      ingredients: item.ingredients || ''
    });

    // Auto-scroll up to the edit form and highlight the input
    setTimeout(() => {
      menuFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      dishNameInputRef.current?.focus();
    }, 50);

    setToast({ message: `Editing "${item.name}" — modify in the form!`, type: "info" });
  };

  const handleCancelEdit = () => {
    setEditingMenuItem(null);
    setMenuForm({ 
      name: '', 
      description: '', 
      price: 0, 
      category: 'Main', 
      isSatvik: true, 
      isDailySpecial: false, 
      spicyLevel: 'Mild', 
      imageUrl: '', 
      nutrition: '', 
      ingredients: '' 
    });
    setToast({ message: "Edit mode cancelled", type: "info" });
  };

  const handleSaveMenuForm = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: menuForm.name,
        description: menuForm.description,
        price: parseFloat(menuForm.price) || 0,
        category: menuForm.category,
        shopId: currentUserShopId,
        isSatvik: menuForm.isSatvik,
        isDailySpecial: menuForm.isDailySpecial,
        spicyLevel: menuForm.spicyLevel,
        imageUrl: menuForm.imageUrl,
        nutrition: menuForm.nutrition,
        ingredients: menuForm.ingredients
      };

      if (editingMenuItem) {
        // Supabase Cloud update
        await updateCloudMenuItem(editingMenuItem.id, payload);
        // Local state update
        setMenuItems(prev => prev.map(m => m.id === editingMenuItem.id ? { ...m, ...payload, image: payload.imageUrl } : m));
        setToast({ message: `"${menuForm.name}" updated successfully`, type: "success" });
      } else {
        // Supabase Cloud insert
        const newDish = await createCloudMenuItem(payload);
        // Local state update
        setMenuItems(prev => [newDish, ...prev]);
        setToast({ message: `"${menuForm.name}" added to menu!`, type: "success" });
      }

      setEditingMenuItem(null);
      setMenuForm({ 
        name: '', 
        description: '', 
        price: 0, 
        category: 'Main', 
        isSatvik: true, 
        isDailySpecial: false, 
        spicyLevel: 'Mild', 
        imageUrl: '', 
        nutrition: '', 
        ingredients: '' 
      });
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to save menu item", type: "error" });
    }
  };

  const handleConfirmDeleteMenuItem = async () => {
    if (!deleteTargetId) return;
    try {
      // Supabase Cloud delete
      await deleteCloudMenuItem(deleteTargetId);
      // Local state update
      setMenuItems(prev => prev.filter(m => m.id !== deleteTargetId));

      setToast({ message: "Dish removed from catalog", type: "success" });
      setDeleteTargetId(null);
    } catch (e) {
      console.error(e);
      setToast({ message: "Failed to delete dish", type: "error" });
    }
  };

  const handleMarkCashCollected = async (orderId) => {
    try {
      // Supabase Cloud update
      await markCloudOrderCashCollected(orderId);
      // Local state update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, cashStatus: 'collected', cash_status: 'collected' } : o));

      setToast({ message: `COD payment marked as Collected for #${orderId.slice(-6).toUpperCase()}`, type: "success" });
    } catch (e) {
      console.error(e);
      setToast({ message: "Failed to update cash status", type: "error" });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <DynamicToast toast={toast} onClose={() => setToast(null)} />

      {/* Top Header Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#282526] border border-white/5 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#E0FF33]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#E0FF33]">
            <Store className="w-3.5 h-3.5" />
            <span>Kitchen Admin Console</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-['Outfit']">
            {currentShop ? currentShop.name : 'Kitchen Management'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-['Plus_Jakarta_Sans']">
            Manage live dishes, audit revenue, configure payment gateways, and edit profile.
          </p>
        </div>

        {/* Quick Tabs Pill Row */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#1E1B1C] border border-white/5 overflow-x-auto relative z-10 no-scrollbar">
          {[
            { id: 'summary', label: 'Analytics', icon: BarChart3 },
            { id: 'shops', label: 'Profile', icon: Store },
            { id: 'menu', label: 'Menu Catalog', icon: UtensilsCrossed },
            { id: 'staff', label: 'Staff & Roles', icon: Users },
            { id: 'audit', label: 'Cash Audit', icon: Receipt },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'shops' && currentShop) {
                    handleEditShopClick(currentShop);
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#E0FF33] text-black shadow-lg'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: SUMMARY / ANALYTICS */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* KPI Widget Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-[#282526] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-all shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Revenue</span>
                <div className="w-10 h-10 rounded-2xl bg-[#E0FF33]/10 text-[#E0FF33] flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-white mt-3 font-['Outfit']">₹{totalRevenue.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-neutral-500 font-medium mt-1">From all completed deliveries</p>
            </div>

            <div className="bg-[#282526] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-all shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Completed Orders</span>
                <div className="w-10 h-10 rounded-2xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-white mt-3 font-['Outfit']">{totalOrdersCount}</p>
              <p className="text-[11px] text-neutral-500 font-medium mt-1">Total fulfilled requests</p>
            </div>

            <div className="bg-[#282526] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-all shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Avg Order Value</span>
                <div className="w-10 h-10 rounded-2xl bg-indigo-400/10 text-indigo-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-white mt-3 font-['Outfit']">₹{avgOrderValue}</p>
              <p className="text-[11px] text-neutral-500 font-medium mt-1">Per completed client ticket</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-[#282526] border border-white/5 rounded-3xl p-6 flex flex-col justify-between h-96 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-sm font-['Outfit']">Daily Sales Timeline</h3>
                <span className="text-[10px] font-bold text-[#E0FF33] px-2 py-0.5 rounded-full bg-[#E0FF33]/10">LIVE METRIC</span>
              </div>
              <div className="flex-1 w-full relative">
                {sortedDates.length > 0 ? (
                  <Bar data={salesChartData} options={salesChartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
                    No sales recorded for this kitchen yet.
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 bg-[#282526] border border-white/5 rounded-3xl p-6 flex flex-col justify-between h-96 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-sm font-['Outfit']">Orders by Status</h3>
                <span className="text-[10px] font-bold text-neutral-400 px-2 py-0.5 rounded-full bg-white/5">CURRENT RUN</span>
              </div>
              <div className="flex-1 w-full relative">
                {orders.length > 0 ? (
                  <Doughnut data={statusChartData} options={statusChartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
                    No active tickets.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Settings & Plan Tier */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Gateway Configurations */}
            <div className="lg:col-span-2 bg-[#282526] border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white font-['Outfit']">Payment Gateways & Collection</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Managing payments for <span className="text-[#E0FF33] font-semibold">{currentShop?.name || 'Active Kitchen'}</span>
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 text-neutral-400 border border-white/10 self-start sm:self-auto">
                  Kitchen-Level Config
                </span>
              </div>

              {(() => {
                const targetShop = editingShop || currentShop || (allShops && allShops[0]);
                const shopOnline = targetShop?.paymentSettings?.onlinePaymentsEnabled ?? targetShop?.onlinePaymentsEnabled ?? true;
                const shopCod = targetShop?.paymentSettings?.codEnabled ?? targetShop?.codEnabled ?? true;
                const isGlobalOnlineOff = paymentsConfig.onlinePaymentsEnabled === false;
                const isGlobalCodOff = paymentsConfig.codEnabled === false;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div 
                      onClick={() => handleToggleKitchenPayment('onlinePaymentsEnabled', !shopOnline)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        shopOnline 
                          ? 'bg-[#1E1B1C] border-[#E0FF33]/30 shadow-sm' 
                          : 'bg-[#1E1B1C]/50 border-white/5 opacity-60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-[#E0FF33]" />
                          <p className="font-bold text-sm text-white">Online Gateway</p>
                          {isGlobalOnlineOff && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              Platform Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400">UPI, Cards & Netbanking via Razorpay</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        shopOnline ? 'bg-[#E0FF33] text-black' : 'bg-white/10 text-neutral-500'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div 
                      onClick={() => handleToggleKitchenPayment('codEnabled', !shopCod)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        shopCod 
                          ? 'bg-[#1E1B1C] border-[#E0FF33]/30 shadow-sm' 
                          : 'bg-[#1E1B1C]/50 border-white/5 opacity-60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-[#E0FF33]" />
                          <p className="font-bold text-sm text-white">Cash on Delivery (COD)</p>
                          {isGlobalCodOff && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              Platform Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400">Physical collection upon delivery</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        shopCod ? 'bg-[#E0FF33] text-black' : 'bg-white/10 text-neutral-500'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Merchant Plan Status */}
            <div className="bg-gradient-to-br from-[#282526] to-[#1E1B1C] border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
              <div>
                <span className="bg-[#E0FF33]/10 text-[#E0FF33] border border-[#E0FF33]/20 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                  Active Tier
                </span>
                <h4 className="text-xl font-black text-white font-['Outfit']">Premium Kitchen Fleet</h4>
                <p className="text-xs text-neutral-400 mt-1">Unlimited dish items, live ringer alarms, and priority delivery routing.</p>
                <div className="mt-4">
                  <span className="text-2xl font-black text-white font-['Outfit']">₹1,999</span>
                  <span className="text-xs text-neutral-500"> / month</span>
                </div>
              </div>

              <button 
                onClick={() => setToast({ message: 'Kitchen is active with all premium features enabled!', type: 'success' })}
                className="w-full mt-6 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all border border-white/5"
              >
                Subscription Active
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: KITCHEN PROFILE */}
      {activeTab === 'shops' && (
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-6">
            <div>
              <h3 className="text-xl font-black text-white font-['Outfit']">Kitchen Operational Settings</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Configure store address, delivery fees, minimum order thresholds & operating hours</p>
            </div>
          </div>

          <form onSubmit={handleSaveShopForm} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Kitchen Brand Name</label>
                <input 
                  type="text" 
                  value={shopForm.name} 
                  onChange={(e) => setShopForm({...shopForm, name: e.target.value})} 
                  required 
                  className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Address / Location</label>
                <input 
                  type="text" 
                  value={shopForm.address} 
                  onChange={(e) => setShopForm({...shopForm, address: e.target.value})} 
                  required 
                  className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Minimum Order Value (₹)</label>
                <input 
                  type="number" 
                  value={shopForm.minimumOrderAmount} 
                  onChange={(e) => setShopForm({...shopForm, minimumOrderAmount: e.target.value})} 
                  required 
                  className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Base Delivery Charge (₹)</label>
                <input 
                  type="number" 
                  value={shopForm.deliveryCharge} 
                  onChange={(e) => setShopForm({...shopForm, deliveryCharge: e.target.value})} 
                  required 
                  className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">GST Rate (%)</label>
                <input 
                  type="number" 
                  value={shopForm.gstPercentage} 
                  onChange={(e) => setShopForm({...shopForm, gstPercentage: e.target.value})} 
                  required 
                  className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Latitude</label>
                  <input 
                    type="text" 
                    value={shopForm.lat} 
                    onChange={(e) => setShopForm({...shopForm, lat: e.target.value})} 
                    className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Longitude</label>
                  <input 
                    type="text" 
                    value={shopForm.lng} 
                    onChange={(e) => setShopForm({...shopForm, lng: e.target.value})} 
                    className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Opening Time</label>
                  <input 
                    type="time" 
                    value={shopForm.openTime} 
                    onChange={(e) => setShopForm({...shopForm, openTime: e.target.value})} 
                    className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Closing Time</label>
                  <input 
                    type="time" 
                    value={shopForm.closeTime} 
                    onChange={(e) => setShopForm({...shopForm, closeTime: e.target.value})} 
                    className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                  />
                </div>
              </div>

              {/* Vedic Time Periods Multi-Select */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Vedic Service Shifts (Time Periods)
                  </label>
                  <span className="text-[10px] text-neutral-500">Matches Mobile Schedule Engine</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'morning', label: 'Morning', icon: '🌅', time: '6-9 AM' },
                    { id: 'forenoon', label: 'Forenoon', icon: '☀️', time: '9-12 PM' },
                    { id: 'afternoon', label: 'Afternoon', icon: '🍽️', time: '12-4 PM' },
                    { id: 'evening', label: 'Evening', icon: '🌆', time: '4-8 PM' },
                    { id: 'night', label: 'Night', icon: '🌙', time: '8-12 AM' }
                  ].map(period => {
                    const isSelected = (shopForm.timePeriods || []).includes(period.id);
                    return (
                      <button
                        key={period.id}
                        type="button"
                        onClick={() => {
                          const current = shopForm.timePeriods || [];
                          const updated = isSelected 
                            ? current.filter(p => p !== period.id)
                            : [...current, period.id];
                          setShopForm({ ...shopForm, timePeriods: updated });
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col items-start gap-1 ${
                          isSelected 
                            ? 'bg-[#E0FF33]/15 border-[#E0FF33] text-[#E0FF33]' 
                            : 'bg-[#1E1B1C] border-white/5 text-neutral-400 hover:border-white/20'
                        }`}
                      >
                        <span className="text-base">{period.icon}</span>
                        <span className="text-xs font-bold text-white leading-tight">{period.label}</span>
                        <span className="text-[10px] text-neutral-400">{period.time}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Operating Days Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Operating Days of Week
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                    const isSelected = (shopForm.daysOpen || []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const current = shopForm.daysOpen || [];
                          const updated = isSelected 
                            ? current.filter(d => d !== day)
                            : [...current, day];
                          setShopForm({ ...shopForm, daysOpen: updated });
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                          isSelected 
                            ? 'bg-[#E0FF33] border-[#E0FF33] text-black shadow-md' 
                            : 'bg-[#1E1B1C] border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Estimated Wait Time & Promo Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    Est. Wait Time
                  </label>
                  <input 
                    type="text" 
                    value={shopForm.estimatedWaitTime} 
                    onChange={(e) => setShopForm({...shopForm, estimatedWaitTime: e.target.value})} 
                    placeholder="15-20 min"
                    className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    Promo Tag (Optional)
                  </label>
                  <input 
                    type="text" 
                    value={shopForm.discountTag} 
                    onChange={(e) => setShopForm({...shopForm, discountTag: e.target.value})} 
                    placeholder="20% OFF"
                    className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    Promo Details
                  </label>
                  <input 
                    type="text" 
                    value={shopForm.discountDescription} 
                    onChange={(e) => setShopForm({...shopForm, discountDescription: e.target.value})} 
                    placeholder="On Sacred Sweets & Thalis"
                    className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Kitchen Cover / Logo URL</label>
                <input 
                  type="text" 
                  value={shopForm.imageUrl} 
                  onChange={(e) => setShopForm({...shopForm, imageUrl: e.target.value})} 
                  placeholder="https://..."
                  className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => {
                    setCoordinateCallback(() => (lat, lng) => {
                      setShopForm(prev => ({ ...prev, lat: String(lat), lng: String(lng) }));
                    });
                    setMapTargetCoords({ lat: shopForm.lat, lng: shopForm.lng });
                    setShowMapPicker(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <Compass className="w-4 h-4 text-[#E0FF33]" />
                  <span>Pin on Google Maps</span>
                </button>

                <div 
                  onClick={() => setShopForm(prev => ({ ...prev, alwaysOpen: !prev.alwaysOpen }))}
                  className="flex items-center gap-2.5 cursor-pointer select-none py-1.5 px-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className={`w-9 h-5 rounded-full p-0.5 transition-colors relative ${shopForm.alwaysOpen ? 'bg-[#E0FF33]' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 rounded-full bg-[#18181A] shadow-sm transition-transform duration-200 ${shopForm.alwaysOpen ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-xs font-bold text-neutral-200">Open 24/7 Always</span>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-[#E0FF33] hover:bg-[#d2f323] text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-[0.98]"
              >
                Save Kitchen Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 3: MANAGE MENU */}
      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Item Form (Add / Edit) */}
          <div 
            ref={menuFormRef}
            className={`bg-[#282526] rounded-3xl p-5 sm:p-6 shadow-xl h-fit transition-all duration-300 ${
              editingMenuItem 
                ? 'border-2 border-[#E0FF33] shadow-[0_0_40px_rgba(224,255,51,0.2)] ring-2 ring-[#E0FF33]/30' 
                : 'border border-white/5'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white font-['Outfit']">
                  {editingMenuItem ? 'Edit Dish Catalog' : 'Add New Dish'}
                </h3>
              </div>
              {editingMenuItem && (
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#E0FF33] text-[#1E1B1C] shadow-md uppercase tracking-wider animate-pulse">
                  EDITING LIVE
                </span>
              )}
            </div>

            {/* Prominent Active Edit Notice Banner */}
            {editingMenuItem && (
              <div className="mb-4 p-3.5 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/40 flex items-center justify-between gap-2.5 animate-fade-in shadow-inner">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#E0FF33] text-[#1E1B1C] flex items-center justify-center shrink-0 shadow-sm">
                    <Edit2 size={15} strokeWidth={3} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-black tracking-wider text-[#E0FF33]">Now Editing Dish</p>
                    <p className="text-xs font-bold text-white truncate">{editingMenuItem.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer border border-white/10"
                >
                  Cancel
                </button>
              </div>
            )}

            <form onSubmit={handleSaveMenuForm} className="space-y-4">
              {/* Dish Name Input */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Dish Name
                </label>
                <input 
                  ref={dishNameInputRef}
                  type="text" 
                  value={menuForm.name} 
                  onChange={(e) => setMenuForm({...menuForm, name: e.target.value})} 
                  placeholder="e.g. Shahi Vrindavan Thali"
                  required 
                  className={`w-full bg-[#1E1B1C] border rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none transition-all font-['Plus_Jakarta_Sans'] ${
                    editingMenuItem 
                      ? 'border-[#E0FF33]/50 ring-2 ring-[#E0FF33]/20' 
                      : 'border-white/10 focus:border-[#E0FF33]/50 focus:ring-2 focus:ring-[#E0FF33]/10'
                  }`}
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea 
                  rows={2}
                  value={menuForm.description} 
                  onChange={(e) => setMenuForm({...menuForm, description: e.target.value})} 
                  placeholder="Rich fragrant gravy prepared with pure desi ghee..."
                  className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#E0FF33]/50 focus:ring-2 focus:ring-[#E0FF33]/10 transition-all font-['Plus_Jakarta_Sans'] resize-none"
                />
              </div>

              {/* Price with Quick Stepper Controls */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Price (₹)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMenuForm(prev => ({ ...prev, price: Math.max(0, Number(prev.price || 0) - 10) }))}
                      className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-[10px] font-bold transition-all border border-white/5 cursor-pointer"
                    >
                      -₹10
                    </button>
                    <button
                      type="button"
                      onClick={() => setMenuForm(prev => ({ ...prev, price: Number(prev.price || 0) + 10 }))}
                      className="px-2 py-0.5 rounded-lg bg-[#E0FF33]/10 hover:bg-[#E0FF33]/20 text-[#E0FF33] text-[10px] font-bold transition-all border border-[#E0FF33]/20 cursor-pointer"
                    >
                      +₹10
                    </button>
                    <button
                      type="button"
                      onClick={() => setMenuForm(prev => ({ ...prev, price: Number(prev.price || 0) + 50 }))}
                      className="px-2 py-0.5 rounded-lg bg-[#E0FF33]/10 hover:bg-[#E0FF33]/20 text-[#E0FF33] text-[10px] font-bold transition-all border border-[#E0FF33]/20 cursor-pointer"
                    >
                      +₹50
                    </button>
                  </div>
                </div>

                <div className="relative flex items-center bg-[#1E1B1C] border border-white/10 rounded-2xl focus-within:border-[#E0FF33]/50 focus-within:ring-2 focus-within:ring-[#E0FF33]/10 transition-all px-3 py-1">
                  <span className="text-sm font-black text-[#E0FF33] font-['Outfit'] pr-2.5 border-r border-white/10 select-none">
                    ₹
                  </span>
                  <input 
                    type="number" 
                    value={menuForm.price || ''} 
                    onChange={(e) => setMenuForm({...menuForm, price: Math.max(0, Number(e.target.value))})} 
                    placeholder="0"
                    required 
                    className="w-full bg-transparent pl-3 pr-1 py-1.5 text-sm text-white focus:outline-none font-['Outfit'] font-black no-spinners"
                  />
                </div>
              </div>

              {/* Web UI Segmented Category Selector */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'Meals', label: 'Main Course', icon: '🍛' },
                    { id: 'Sweets', label: 'Sweets & Prasad', icon: '🍧' },
                    { id: 'Snacks', label: 'Snacks & Bakes', icon: '🥪' },
                    { id: 'Drinks', label: 'Beverages', icon: '🥛' }
                  ].map(cat => {
                    const isSelected = menuForm.category === cat.id || 
                      (cat.id === 'Meals' && menuForm.category === 'Main') ||
                      (cat.id === 'Sweets' && menuForm.category === 'Sweets & Prasad');
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setMenuForm({ ...menuForm, category: cat.id })}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer ${
                          isSelected
                            ? 'bg-[#E0FF33] text-black border-[#E0FF33] font-black shadow-[0_2px_10px_rgba(224,255,51,0.25)]'
                            : 'bg-[#1E1B1C] text-zinc-400 border-white/5 hover:text-white hover:border-white/15'
                        }`}
                      >
                        <span className="text-xs">{cat.icon}</span>
                        <span className="truncate text-[11px]">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual Transparent PNG Asset Cutout Picker */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Dish Cutout Visual Asset
                </label>
                <div className="grid grid-cols-6 gap-2 mb-2.5">
                  {[
                    { src: '/dishes/burger.png', name: 'Burger', icon: '🍔' },
                    { src: '/dishes/thali.png', name: 'Thali', icon: '🍱' },
                    { src: '/dishes/sweet.png', name: 'Kheer', icon: '🍧' },
                    { src: '/dishes/pizza.png', name: 'Pizza', icon: '🍕' },
                    { src: '/dishes/curry.png', name: 'Paneer', icon: '🍲' },
                    { src: '/dishes/rice.png', name: 'Rice', icon: '🍚' }
                  ].map((asset) => {
                    const isSelected = menuForm.imageUrl === asset.src;
                    return (
                      <button
                        key={asset.src}
                        type="button"
                        onClick={() => setMenuForm({ ...menuForm, imageUrl: asset.src })}
                        className={`aspect-square rounded-2xl p-1.5 border transition-all flex flex-col items-center justify-center relative group cursor-pointer ${
                          isSelected 
                            ? 'bg-[#FAF5EB] border-[#E0FF33] shadow-[0_0_12px_rgba(224,255,51,0.4)] ring-2 ring-[#E0FF33]' 
                            : 'bg-[#1E1B1C] border-white/5 hover:border-white/20 hover:bg-[#282526]'
                        }`}
                        title={asset.name}
                      >
                        <img 
                          src={asset.src} 
                          alt={asset.name} 
                          className="w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform" 
                        />
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E0FF33] text-black flex items-center justify-center text-[9px] font-black shadow-sm">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <input 
                    type="text" 
                    value={menuForm.imageUrl} 
                    onChange={(e) => setMenuForm({...menuForm, imageUrl: e.target.value})} 
                    placeholder="Or enter custom cutout URL (https://...)"
                    className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl pl-3.5 pr-10 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                  />
                  {menuForm.imageUrl && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-[#FAF5EB] p-0.5 overflow-hidden shadow-sm">
                      <img src={menuForm.imageUrl} alt="Preview" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Spiciness & Nutrition Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Web UI Spiciness Segmented Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    Spiciness
                  </label>
                  <div className="flex bg-[#1E1B1C] p-1 rounded-2xl border border-white/10 gap-1">
                    {[
                      { id: 'Mild', label: 'Mild', icon: '🟢' },
                      { id: 'Medium', label: 'Medium', icon: '🟡' },
                      { id: 'Spicy', label: 'Spicy', icon: '🌶️' }
                    ].map(spice => {
                      const isSelected = menuForm.spicyLevel === spice.id;
                      return (
                        <button
                          key={spice.id}
                          type="button"
                          onClick={() => setMenuForm({ ...menuForm, spicyLevel: spice.id })}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-[#282526] text-white border border-white/15 font-black shadow-sm'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          <span className="text-[10px]">{spice.icon}</span>
                          <span className="text-[11px]">{spice.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nutrition Input */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    Nutrition Info
                  </label>
                  <input 
                    type="text" 
                    value={menuForm.nutrition} 
                    onChange={(e) => setMenuForm({...menuForm, nutrition: e.target.value})} 
                    placeholder="e.g. 260 kcal, 14g P"
                    className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                  />
                </div>
              </div>

              {/* Web UI Custom Toggle Switches */}
              <div className="space-y-2.5 pt-3 border-t border-white/5">
                {/* 100% Satvik Toggle */}
                <div 
                  onClick={() => setMenuForm(prev => ({ ...prev, isSatvik: !prev.isSatvik }))}
                  className="p-3 rounded-2xl bg-[#1E1B1C] border border-white/5 hover:border-white/15 transition-all flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">✨</span>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">100% Satvik Prasad</p>
                      <p className="text-[10px] text-neutral-500 font-medium">Strictly without onion or garlic</p>
                    </div>
                  </div>
                  
                  {/* Custom Animated Toggle Switch */}
                  <div className={`w-11 h-6 rounded-full p-0.5 transition-colors relative ${menuForm.isSatvik ? 'bg-[#E0FF33]' : 'bg-white/10'}`}>
                    <div className={`w-5 h-5 rounded-full bg-[#18181A] shadow-md transition-transform duration-200 ${menuForm.isSatvik ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Chef's Recommendation Toggle */}
                <div 
                  onClick={() => setMenuForm(prev => ({ ...prev, isDailySpecial: !prev.isDailySpecial }))}
                  className="p-3 rounded-2xl bg-[#1E1B1C] border border-white/5 hover:border-white/15 transition-all flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">👑</span>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">Chef's Special Recommendation</p>
                      <p className="text-[10px] text-neutral-500 font-medium">Highlight with glowing banner on top</p>
                    </div>
                  </div>
                  
                  {/* Custom Animated Toggle Switch */}
                  <div className={`w-11 h-6 rounded-full p-0.5 transition-colors relative ${menuForm.isDailySpecial ? 'bg-[#E0FF33]' : 'bg-white/10'}`}>
                    <div className={`w-5 h-5 rounded-full bg-[#18181A] shadow-md transition-transform duration-200 ${menuForm.isDailySpecial ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  className="flex-1 py-3.5 px-5 rounded-2xl bg-[#E0FF33] hover:bg-[#d2f323] text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_8px_25px_rgba(224,255,51,0.25)] active:scale-[0.98] cursor-pointer font-['Outfit'] flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={16} />
                  <span>{editingMenuItem ? 'Save & Update Dish' : 'Publish Dish to Menu'}</span>
                </button>
                {editingMenuItem && (
                  <button 
                    type="button" 
                    onClick={handleCancelEdit} 
                    className="py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all border border-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Menu Catalog Table & Showcase */}
          <div className="lg:col-span-2 bg-[#282526] border border-white/5 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white font-['Outfit']">Dish Catalog ({menuItems.length})</h3>
                <p className="text-xs text-neutral-400">All live dishes visible to customers</p>
              </div>
              <span className="text-[11px] font-bold text-[#E0FF33] bg-[#E0FF33]/10 border border-[#E0FF33]/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                {menuItems.length} Dishes Live
              </span>
            </div>

            {/* Mobile Card List (< sm screens) */}
            <div className="sm:hidden space-y-3">
              {menuItems.length === 0 ? (
                <div className="py-8 text-center text-neutral-500 text-xs font-semibold">
                  No dishes added yet. Use the form above to add your first dish.
                </div>
              ) : (
                menuItems.map(item => {
                  const isBeingEdited = editingMenuItem?.id === item.id;
                  return (
                    <div 
                      key={item.id} 
                      className={`rounded-2xl p-3.5 space-y-3 shadow-md transition-all duration-300 ${
                        isBeingEdited 
                          ? 'bg-[#1E1B1C] border-2 border-[#E0FF33] shadow-[0_0_25px_rgba(224,255,51,0.25)] ring-2 ring-[#E0FF33]/20' 
                          : 'bg-[#1E1B1C] border border-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-[#282526] border border-white/10 shrink-0 flex items-center justify-center p-1 relative">
                          <img 
                            src={resolveDishCutout(item.imageUrl || item.image, item.name, item.category)} 
                            alt={item.name} 
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                          {isBeingEdited && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E0FF33] text-black flex items-center justify-center text-[9px] font-black">
                              ✓
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <p className="font-bold text-white text-sm font-['Outfit'] truncate">{item.name}</p>
                              {isBeingEdited && (
                                <span className="inline-block text-[9px] font-black text-[#E0FF33] uppercase tracking-wider">
                                  ✏️ Active in Form Above
                                </span>
                              )}
                            </div>
                            <span className="font-black text-[#E0FF33] text-sm font-['Outfit'] shrink-0">₹{item.price}</span>
                          </div>
                          <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">{item.description || 'No description provided'}</p>
                          
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-white/5 text-neutral-300 border border-white/10 whitespace-nowrap">
                              {item.category}
                            </span>
                            {(item.isSatvik === true || item.isSatvik === undefined) && (
                              <span className="inline-flex items-center bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 text-[9px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap">
                                Satvik
                              </span>
                            )}
                            {item.isDailySpecial && (
                              <span className="inline-flex items-center bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[9px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap">
                                Special
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                        <button 
                          onClick={() => handleEditMenuItem(item)}
                          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                            isBeingEdited 
                              ? 'bg-[#E0FF33] text-[#1E1B1C] border-[#E0FF33] font-black shadow-md' 
                              : 'bg-white/5 hover:bg-white/10 text-white border-white/5'
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{isBeingEdited ? 'Editing Above...' : 'Edit'}</span>
                        </button>
                        <button 
                          onClick={() => setDeleteTargetId(item.id)}
                          className="py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-red-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table (>= sm screens) */}
            <div className="hidden sm:block overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-white/5">
                    <th className="pb-3 pr-3 whitespace-nowrap">Dish</th>
                    <th className="pb-3 px-3 whitespace-nowrap">Category</th>
                    <th className="pb-3 px-3 whitespace-nowrap">Price</th>
                    <th className="pb-3 px-3 whitespace-nowrap">Badges</th>
                    <th className="pb-3 pl-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-neutral-200">
                  {menuItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-500 text-xs font-semibold">
                        No dishes added yet. Use the form to add dishes.
                      </td>
                    </tr>
                  ) : (
                    menuItems.map(item => {
                      const isBeingEdited = editingMenuItem?.id === item.id;
                      return (
                        <tr 
                          key={item.id} 
                          className={`transition-all group ${
                            isBeingEdited 
                              ? 'bg-[#E0FF33]/10 border-l-4 border-l-[#E0FF33]' 
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <td className="py-3.5 pr-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-2xl bg-[#1E1B1C] overflow-hidden shrink-0 flex items-center justify-center p-1 ${
                                isBeingEdited ? 'border-2 border-[#E0FF33]' : 'border border-white/10'
                              }`}>
                                <img 
                                  src={resolveDishCutout(item.imageUrl || item.image, item.name, item.category)} 
                                  alt={item.name} 
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                />
                              </div>
                              <div className="min-w-0 max-w-[180px] lg:max-w-xs">
                                <p className="font-bold text-white text-xs sm:text-sm font-['Outfit'] truncate">{item.name}</p>
                                <p className="text-[10px] text-neutral-400 truncate">{item.description || 'No description provided'}</p>
                                {isBeingEdited && (
                                  <span className="text-[9px] font-black text-[#E0FF33] uppercase">
                                    ✏️ Editing
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/5 text-neutral-300 border border-white/10 whitespace-nowrap">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-black text-[#E0FF33] font-['Outfit'] whitespace-nowrap">
                            ₹{item.price}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {(item.isSatvik === true || item.isSatvik === undefined) && (
                                <span className="inline-flex items-center bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                                  Satvik
                                </span>
                              )}
                              {item.isDailySpecial && (
                                <span className="inline-flex items-center bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                                  Special
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => handleEditMenuItem(item)}
                                className={`p-2 rounded-xl transition-all cursor-pointer ${
                                  isBeingEdited 
                                    ? 'bg-[#E0FF33] text-[#1E1B1C] shadow-md font-bold' 
                                    : 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white'
                                }`}
                                title={isBeingEdited ? "Editing in form above" : "Edit Dish"}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setDeleteTargetId(item.id)}
                                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
                                title="Delete Dish"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: CASH AUDIT */}
      {activeTab === 'audit' && (
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/5 gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-['Outfit']">Cash on Delivery (COD) Audit Log</h3>
              <p className="text-xs text-neutral-400">Reconcile physical cash receipts collected by couriers</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#E0FF33] bg-[#E0FF33]/10 border border-[#E0FF33]/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                {orders.filter(o => o.paymentMethod === 'cash').length} COD Tickets
              </span>
            </div>
          </div>

          {/* Mobile Card Layout (< md screens) */}
          <div className="md:hidden space-y-3">
            {orders.filter(o => o.paymentMethod === 'cash').length === 0 ? (
              <div className="py-8 text-center text-neutral-500 text-xs font-semibold">
                No Cash on Delivery orders recorded.
              </div>
            ) : (
              orders
                .filter(o => o.paymentMethod === 'cash')
                .map(order => {
                  const date = order.createdAt?.toDate 
                    ? order.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                    : 'Recent';
                  const isCollected = order.cashStatus === 'collected';
                  return (
                    <div key={order.id} className="bg-[#1E1B1C] border border-white/10 rounded-2xl p-4 space-y-3 shadow-md">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-black text-white text-sm font-['Outfit']">
                            #{order.id.slice(-6).toUpperCase()}
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">{date}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                          isCollected 
                            ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' 
                            : 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                        }`}>
                          {isCollected ? 'Collected' : 'Pending with Courier'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2 border-y border-white/5 text-xs">
                        <div>
                          <p className="font-bold text-white">{order.customerName || 'Customer'}</p>
                          <p className="text-[11px] text-neutral-400">{order.customerPhone || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-neutral-400 uppercase font-semibold">Amount</p>
                          <p className="font-black text-[#E0FF33] text-base font-['Outfit']">₹{order.totalAmount}</p>
                        </div>
                      </div>

                      <div className="pt-1">
                        {!isCollected ? (
                          <button 
                            onClick={() => handleMarkCashCollected(order.id)}
                            className="w-full py-2.5 px-4 rounded-xl bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirm Cash Received</span>
                          </button>
                        ) : (
                          <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 select-none">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Cash Reconciled</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Desktop Table Layout (>= md screens) */}
          <div className="hidden md:block overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-white/5">
                  <th className="pb-3 whitespace-nowrap">Order Ticket</th>
                  <th className="pb-3 whitespace-nowrap">Customer</th>
                  <th className="pb-3 whitespace-nowrap">COD Amount</th>
                  <th className="pb-3 whitespace-nowrap">Collection Status</th>
                  <th className="pb-3 text-right whitespace-nowrap">Reconcile Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-neutral-200">
                {orders.filter(o => o.paymentMethod === 'cash').length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-500 text-xs font-semibold">
                      No Cash on Delivery orders recorded.
                    </td>
                  </tr>
                ) : (
                  orders
                    .filter(o => o.paymentMethod === 'cash')
                    .map(order => {
                      const date = order.createdAt?.toDate 
                        ? order.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) 
                        : 'Recent';
                      const isCollected = order.cashStatus === 'collected';
                      return (
                        <tr key={order.id} className="hover:bg-white/5 transition-all">
                          <td className="py-3.5 pr-4 whitespace-nowrap">
                            <p className="font-bold text-white text-xs font-['Outfit']">#{order.id.slice(-6).toUpperCase()}</p>
                            <p className="text-[10px] text-neutral-500">{date}</p>
                          </td>
                          <td className="py-3.5 pr-4 whitespace-nowrap">
                            <p className="font-semibold text-xs text-white">{order.customerName || 'Customer'}</p>
                            <p className="text-[10px] text-neutral-400">{order.customerPhone || 'N/A'}</p>
                          </td>
                          <td className="py-3.5 pr-4 font-black text-[#E0FF33] font-['Outfit'] text-sm whitespace-nowrap">
                            ₹{order.totalAmount}
                          </td>
                          <td className="py-3.5 pr-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                              isCollected 
                                ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' 
                                : 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                            }`}>
                              {isCollected ? 'Collected' : 'Pending with Courier'}
                            </span>
                          </td>
                          <td className="py-3.5 text-right whitespace-nowrap">
                            {!isCollected ? (
                              <button 
                                onClick={() => handleMarkCashCollected(order.id)}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 whitespace-nowrap cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirm Cash Received</span>
                              </button>
                            ) : (
                              <span className="text-xs text-emerald-400 font-bold inline-flex items-center gap-1.5 whitespace-nowrap bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Reconciled</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff & Role Management Tab */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#282526] border border-white/5 p-6 rounded-3xl">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs font-bold text-amber-300">
                <Users className="w-3.5 h-3.5" />
                <span>Kitchen Staff Directory</span>
              </div>
              <h3 className="text-xl font-bold text-white font-['Outfit']">
                {currentShop?.name || 'Kitchen'} Team & Active Roles
              </h3>
              <p className="text-xs text-neutral-400">
                Manage roles for cooks, kitchen helpers, and delivery sarathis assigned to this kitchen.
              </p>
            </div>

            <button
              onClick={() => setIsAddingStaff(!isAddingStaff)}
              className="px-4 py-2.5 rounded-2xl bg-[#E0FF33] hover:bg-[#CCFF00] text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAddingStaff ? 'Cancel' : 'Add Staff Member'}</span>
            </button>
          </div>

          {/* Add Staff Form */}
          {isAddingStaff && (
            <form onSubmit={handleAddStaffMember} className="p-5 bg-[#282526] rounded-3xl border border-[#E0FF33]/30 space-y-4 animate-fadeIn shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-['Outfit']">
                  Assign Staff to {currentShop?.name}
                </span>
                <button type="button" onClick={() => setIsAddingStaff(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Staff Name</label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. Shyam Cook"
                    className="w-full bg-[#1E1B1C] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Mobile Phone (10 digits) *</label>
                  <input
                    type="tel"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="9876543210"
                    required
                    className="w-full bg-[#1E1B1C] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">Role</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full bg-[#1E1B1C] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33]"
                  >
                    <option value="kitchen">Kitchen Staff / Cook</option>
                    <option value="delivery">Delivery Sarathi</option>
                    <option value="owner">Co-Owner / Manager</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#E0FF33] hover:bg-[#d6f727] text-black font-black text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Save Staff
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Staff Search */}
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              placeholder="Search team by name or phone..."
              className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-2xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#E0FF33]/50"
            />
          </div>

          {/* Staff Roster Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              const shopId = currentShop?.id || currentUserShopId;
              const filtered = usersList.filter(u => {
                const belongsToShop = (u.shopId === shopId) || (u.role === 'kitchen' || u.role === 'delivery');
                const q = staffSearch.toLowerCase().trim();
                const matchesSearch = !q || 
                  (u.displayName || '').toLowerCase().includes(q) ||
                  (u.phone || '').includes(q) ||
                  (u.id || '').toLowerCase().includes(q);
                return belongsToShop && matchesSearch;
              });

              if (filtered.length === 0) {
                return (
                  <div className="col-span-full text-center py-12 bg-[#282526] rounded-3xl border border-white/5">
                    <Users className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-neutral-300">No staff members found for this kitchen.</p>
                    <p className="text-xs text-neutral-500 mt-1">Click "Add Staff Member" above to assign cooks or riders.</p>
                  </div>
                );
              }

              return filtered.map(u => {
                const role = u.role || 'customer';
                return (
                  <div 
                    key={u.id}
                    className="p-4 bg-[#282526] rounded-3xl border border-white/5 hover:border-white/10 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs ${
                          role === 'kitchen' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
                          role === 'delivery' ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30' :
                          role === 'owner' ? 'bg-purple-400/20 text-purple-300 border border-purple-400/30' :
                          'bg-white/10 text-neutral-300'
                        }`}>
                          {role === 'kitchen' ? <ChefHat className="w-5 h-5" /> :
                           role === 'delivery' ? <Truck className="w-5 h-5" /> :
                           <ShieldCheck className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-white font-['Outfit']">
                            {u.displayName || `Staff (${(u.phone || '').slice(-4)})`}
                          </p>
                          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                            {u.phone ? `+91 ${u.phone}` : u.id}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                        role === 'kitchen' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
                        role === 'delivery' ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30' :
                        'bg-purple-400/20 text-purple-300 border border-purple-400/30'
                      }`}>
                        {role}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">Change Role:</label>
                      <select
                        value={role}
                        onChange={(e) => handleUpdateStaffRole(u.id, e.target.value)}
                        className="bg-[#1E1B1C] text-xs font-bold text-white border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#E0FF33] cursor-pointer"
                      >
                        <option value="kitchen">Kitchen Cook</option>
                        <option value="delivery">Delivery Sarathi</option>
                        <option value="owner">Store Manager</option>
                        <option value="customer">Remove / Demote</option>
                      </select>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#282526] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white font-['Outfit']">Delete this dish?</h3>
              <p className="text-xs text-neutral-400 font-['Plus_Jakarta_Sans']">
                This item will be removed permanently from your customer menu catalog.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteMenuItem}
                className="flex-1 py-2.5 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs transition-all shadow-lg"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Maps Picker Modal */}
      {showMapPicker && (
        <MapPicker 
          initialLat={mapTargetCoords.lat}
          initialLng={mapTargetCoords.lng}
          onClose={() => setShowMapPicker(false)}
          onSelect={(lat, lng) => {
            if (coordinateCallback) coordinateCallback(lat, lng);
          }}
        />
      )}

      {/* Realtime Live Alarm HUD Banner */}
      <ActiveAlarmBanner 
        isPlaying={isPlaying} 
        activeAlert={activeAlert} 
        onSilence={stopAlarm} 
        onActionClick={() => {
          setActiveTab('analytics');
          stopAlarm();
        }} 
      />
    </div>
  );
}

