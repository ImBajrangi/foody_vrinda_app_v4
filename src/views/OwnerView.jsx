import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  addDoc, 
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
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
import MapPicker from '../components/MapPicker';
import DynamicToast from '../components/ui/DynamicToast';
import { 
  BarChart3, 
  Store, 
  UtensilsCrossed, 
  Receipt, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Edit2, 
  Trash2, 
  MapPin, 
  Clock, 
  Sparkles, 
  Flame, 
  Leaf, 
  CreditCard, 
  ShieldCheck, 
  Check, 
  X,
  Compass,
  Layers,
  ChevronRight
} from 'lucide-react';

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
  const { currentUserShopId, allShops, refreshShops } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'shops', 'menu', 'audit'
  const [toast, setToast] = useState(null);

  // Payment settings
  const [paymentsConfig, setPaymentsConfig] = useState({ onlinePaymentsEnabled: true, codEnabled: true });

  // Map Picker toggles
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapTargetCoords, setMapTargetCoords] = useState({ lat: '', lng: '' });
  const [coordinateCallback, setCoordinateCallback] = useState(null);

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Shop management states
  const [editingShop, setEditingShop] = useState(null);
  const [shopForm, setShopForm] = useState({
    name: '', address: '', minimumOrderAmount: 0, deliveryCharge: 0, gstPercentage: 5,
    lat: '', lng: '', openTime: '08:00', closeTime: '22:00', alwaysOpen: false, imageUrl: ''
  });

  // Menu items management states
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuForm, setMenuForm] = useState({ 
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

  // Fetch shop-specific orders for analytics and audit
  useEffect(() => {
    if (!currentUserShopId) return;

    const q = query(collection(db, "orders"), where("shopId", "==", currentUserShopId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(allOrders);
    });

    return () => unsubscribe();
  }, [currentUserShopId]);

  // Fetch menu items for menu manager
  useEffect(() => {
    if (!currentUserShopId) return;

    const q = query(collection(db, "menus"), where("shopId", "==", currentUserShopId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenuItems(items);
    });

    return () => unsubscribe();
  }, [currentUserShopId]);

  // Load global payment configurations
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "paymentConfig"), (docSnap) => {
      if (docSnap.exists()) {
        setPaymentsConfig(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdatePaymentsConfig = async (key, value) => {
    try {
      await updateDoc(doc(db, "settings", "paymentConfig"), { [key]: value });
      setToast({
        message: `Payment setting updated successfully`,
        type: 'success'
      });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Failed to update payment configuration', type: 'error' });
    }
  };

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
      minimumOrderAmount: shop.minimumOrderAmount || 0,
      deliveryCharge: shop.deliveryCharge || 0,
      gstPercentage: shop.gstPercentage || 5,
      lat: shop.coordinates?.lat || '',
      lng: shop.coordinates?.lng || '',
      openTime: shop.schedule?.openTime || '08:00',
      closeTime: shop.schedule?.closeTime || '22:00',
      alwaysOpen: shop.schedule?.alwaysOpen || false,
      imageUrl: shop.imageUrl || ''
    });
  };

  const handleSaveShopForm = async (e) => {
    e.preventDefault();
    if (!editingShop) return;
    try {
      await updateDoc(doc(db, "shops", editingShop.id), {
        name: shopForm.name,
        address: shopForm.address,
        minimumOrderAmount: parseFloat(shopForm.minimumOrderAmount) || 0,
        deliveryCharge: parseFloat(shopForm.deliveryCharge) || 0,
        gstPercentage: parseFloat(shopForm.gstPercentage) || 0,
        coordinates: {
          lat: parseFloat(shopForm.lat) || 0,
          lng: parseFloat(shopForm.lng) || 0
        },
        schedule: {
          openTime: shopForm.openTime,
          closeTime: shopForm.closeTime,
          alwaysOpen: shopForm.alwaysOpen
        },
        imageUrl: shopForm.imageUrl
      });
      setToast({ message: "Kitchen profile updated successfully!", type: "success" });
      setEditingShop(null);
      refreshShops();
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
      imageUrl: item.imageUrl || '',
      nutrition: item.nutrition || '',
      ingredients: item.ingredients || ''
    });
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
        await updateDoc(doc(db, "menus", editingMenuItem.id), payload);
        setToast({ message: `"${menuForm.name}" updated successfully`, type: "success" });
      } else {
        await addDoc(collection(db, "menus"), payload);
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
      await deleteDoc(doc(db, "menus", deleteTargetId));
      setToast({ message: "Dish removed from catalog", type: "success" });
      setDeleteTargetId(null);
    } catch (e) {
      console.error(e);
      setToast({ message: "Failed to delete dish", type: "error" });
    }
  };

  const handleMarkCashCollected = async (orderId) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { cashStatus: 'collected' });
      setToast({ message: `COD payment marked as Collected for #${orderId.slice(-6).toUpperCase()}`, type: "success" });
    } catch (e) {
      console.error(e);
      setToast({ message: "Failed to update cash status", type: "error" });
    }
  };

  const currentShop = allShops.find(s => s.id === currentUserShopId);

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
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">Payment Gateways & Collection</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Toggle customer checkout payment methods live</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div 
                  onClick={() => handleUpdatePaymentsConfig('onlinePaymentsEnabled', !paymentsConfig.onlinePaymentsEnabled)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    paymentsConfig.onlinePaymentsEnabled 
                      ? 'bg-[#1E1B1C] border-[#E0FF33]/30' 
                      : 'bg-[#1E1B1C]/50 border-white/5 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#E0FF33]" />
                      <p className="font-bold text-sm text-white">Online Gateway</p>
                    </div>
                    <p className="text-xs text-neutral-400">UPI, Cards & Netbanking via Razorpay</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    paymentsConfig.onlinePaymentsEnabled ? 'bg-[#E0FF33] text-black' : 'bg-white/10 text-neutral-500'
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                <div 
                  onClick={() => handleUpdatePaymentsConfig('codEnabled', !paymentsConfig.codEnabled)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    paymentsConfig.codEnabled 
                      ? 'bg-[#1E1B1C] border-[#E0FF33]/30' 
                      : 'bg-[#1E1B1C]/50 border-white/5 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#E0FF33]" />
                      <p className="font-bold text-sm text-white">Cash on Delivery (COD)</p>
                    </div>
                    <p className="text-xs text-neutral-400">Physical collection upon delivery</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    paymentsConfig.codEnabled ? 'bg-[#E0FF33] text-black' : 'bg-white/10 text-neutral-500'
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>
              </div>
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

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={shopForm.alwaysOpen}
                    onChange={(e) => setShopForm({...shopForm, alwaysOpen: e.target.checked})}
                    className="rounded border-white/20 bg-[#1E1B1C] text-[#E0FF33] focus:ring-0 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-neutral-300">Open 24/7 Always</span>
                </label>
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
          <div className="bg-[#282526] border border-white/5 rounded-3xl p-6 shadow-xl h-fit">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <h3 className="text-base font-black text-white font-['Outfit']">
                {editingMenuItem ? 'Edit Dish Catalog' : 'Add New Dish'}
              </h3>
              {editingMenuItem && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                  EDIT MODE
                </span>
              )}
            </div>

            <form onSubmit={handleSaveMenuForm} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Dish Name</label>
                <input 
                  type="text" 
                  value={menuForm.name} 
                  onChange={(e) => setMenuForm({...menuForm, name: e.target.value})} 
                  placeholder="e.g. Shahi Vrindavan Thali"
                  required 
                  className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea 
                  rows={2}
                  value={menuForm.description} 
                  onChange={(e) => setMenuForm({...menuForm, description: e.target.value})} 
                  placeholder="Rich fragrant gravy prepared with pure desi ghee..."
                  className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans'] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Price (₹)</label>
                  <input 
                    type="number" 
                    value={menuForm.price} 
                    onChange={(e) => setMenuForm({...menuForm, price: e.target.value})} 
                    required 
                    className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Category</label>
                  <select 
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({...menuForm, category: e.target.value})}
                    className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                  >
                    <option value="Main" className="bg-[#1E1B1C]">Main Course</option>
                    <option value="Sweets" className="bg-[#1E1B1C]">Sweets & Desserts</option>
                    <option value="Drinks" className="bg-[#1E1B1C]">Beverages</option>
                    <option value="Sides" className="bg-[#1E1B1C]">Breads & Sides</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Image URL (High-res Cutout)</label>
                <input 
                  type="text" 
                  value={menuForm.imageUrl} 
                  onChange={(e) => setMenuForm({...menuForm, imageUrl: e.target.value})} 
                  placeholder="https://..."
                  className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Spiciness</label>
                  <select 
                    value={menuForm.spicyLevel}
                    onChange={(e) => setMenuForm({...menuForm, spicyLevel: e.target.value})}
                    className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                  >
                    <option value="Mild" className="bg-[#1E1B1C]">Mild</option>
                    <option value="Medium" className="bg-[#1E1B1C]">Medium</option>
                    <option value="Spicy" className="bg-[#1E1B1C]">Spicy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Nutrition</label>
                  <input 
                    type="text" 
                    value={menuForm.nutrition} 
                    onChange={(e) => setMenuForm({...menuForm, nutrition: e.target.value})} 
                    placeholder="280 kcal, 8g P"
                    className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#E0FF33]/50 transition-all font-['Plus_Jakarta_Sans']"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 select-none border-t border-white/5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={menuForm.isSatvik}
                    onChange={(e) => setMenuForm({...menuForm, isSatvik: e.target.checked})}
                    className="rounded border-white/20 bg-[#1E1B1C] text-[#E0FF33] focus:ring-0 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-neutral-300">100% Satvik (No Onion/Garlic)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={menuForm.isDailySpecial}
                    onChange={(e) => setMenuForm({...menuForm, isDailySpecial: e.target.checked})}
                    className="rounded border-white/20 bg-[#1E1B1C] text-[#E0FF33] focus:ring-0 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-neutral-300">Chef's Recommendation Banner</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#E0FF33] hover:bg-[#d2f323] text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-[0.98]"
                >
                  {editingMenuItem ? 'Update Dish' : 'Publish Dish to Menu'}
                </button>
                {editingMenuItem && (
                  <button 
                    type="button" 
                    onClick={() => {
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
                    }} 
                    className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all border border-white/5"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Menu Catalog Table & Showcase */}
          <div className="lg:col-span-2 bg-[#282526] border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <h3 className="text-base font-black text-white font-['Outfit']">Dish Catalog ({menuItems.length})</h3>
                <p className="text-xs text-neutral-400">All live dishes visible to customers</p>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-white/5">
                    <th className="pb-3">Dish</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Price</th>
                    <th className="pb-3">Badges</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-neutral-200">
                  {menuItems.map(item => (
                    <tr key={item.id} className="hover:bg-white/5 transition-all group">
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#1E1B1C] border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-1">
                            <img 
                              src={item.imageUrl || "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=100&auto=format&fit=crop&q=60&fm=webp"} 
                              alt={item.name} 
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs sm:text-sm font-['Outfit']">{item.name}</p>
                            <p className="text-[10px] text-neutral-400 truncate max-w-xs">{item.description || 'No description provided'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/5 text-neutral-300 border border-white/10">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 pr-3 font-bold text-[#E0FF33] font-['Outfit']">
                        ₹{item.price}
                      </td>
                      <td className="py-3.5 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {(item.isSatvik === true || item.isSatvik === undefined) && (
                            <span className="bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 text-[9px] font-bold px-2 py-0.5 rounded-full">
                              Satvik
                            </span>
                          )}
                          {item.isDailySpecial && (
                            <span className="bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[9px] font-bold px-2 py-0.5 rounded-full">
                              Special
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => handleEditMenuItem(item)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-all"
                            title="Edit Dish"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setDeleteTargetId(item.id)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                            title="Delete Dish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: CASH AUDIT */}
      {activeTab === 'audit' && (
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h3 className="text-base font-black text-white font-['Outfit']">Cash on Delivery (COD) Audit Log</h3>
              <p className="text-xs text-neutral-400">Reconcile physical cash receipts collected by couriers</p>
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-white/5">
                  <th className="pb-3">Order Ticket</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">COD Amount</th>
                  <th className="pb-3">Collection Status</th>
                  <th className="pb-3 text-right">Reconcile Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-neutral-200">
                {orders
                  .filter(o => o.paymentMethod === 'cash')
                  .map(order => {
                    const date = order.createdAt?.toDate 
                      ? order.createdAt.toDate().toLocaleDateString('en-IN') 
                      : 'Recent';
                    const isCollected = order.cashStatus === 'collected';
                    return (
                      <tr key={order.id} className="hover:bg-white/5 transition-all">
                        <td className="py-3.5 pr-3">
                          <p className="font-bold text-white text-xs font-['Outfit']">#{order.id.slice(-6).toUpperCase()}</p>
                          <p className="text-[10px] text-neutral-500">{date}</p>
                        </td>
                        <td className="py-3.5 pr-3">
                          <p className="font-semibold text-xs text-white">{order.customerName}</p>
                          <p className="text-[10px] text-neutral-400">{order.customerPhone}</p>
                        </td>
                        <td className="py-3.5 pr-3 font-bold text-[#E0FF33] font-['Outfit']">
                          ₹{order.totalAmount}
                        </td>
                        <td className="py-3.5 pr-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isCollected 
                              ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' 
                              : 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                          }`}>
                            {isCollected ? 'Collected' : 'Pending with Courier'}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          {!isCollected ? (
                            <button 
                              onClick={() => handleMarkCashCollected(order.id)}
                              className="px-3 py-1.5 rounded-xl bg-[#E0FF33] hover:bg-[#d2f323] text-black font-black text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95"
                            >
                              Confirm Cash Received
                            </button>
                          ) : (
                            <span className="text-[10px] text-neutral-500 font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Reconciled</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
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
    </div>
  );
}
