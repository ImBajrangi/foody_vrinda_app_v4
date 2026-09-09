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
  X
} from 'lucide-react';
import { 
  updateCloudShop, 
  getCloudShops, 
  getCloudMenus, 
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


  const [stats, setStats] = useState({ shops: 0, items: 0, orders: 0, notifications: 0 });
  const [paymentsConfig, setPaymentsConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('foody_payment_config');
      return saved ? JSON.parse(saved) : { onlinePaymentsEnabled: true, codEnabled: true };
    } catch (e) {
      return { onlinePaymentsEnabled: true, codEnabled: true };
    }
  });
  const [toast, setToast] = useState(null);

  const [selectedShopId, setSelectedShopId] = useState('');
  const [selectedDeliveryShopId, setSelectedDeliveryShopId] = useState('');
  const [selectedPaymentShopId, setSelectedPaymentShopId] = useState(allShops[0]?.id || '');

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('kitchen');
  const [newUserShopId, setNewUserShopId] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);

  const [simShopId, setSimShopId] = useState('');
  const [simMenuItems, setSimMenuItems] = useState([]);
  const [simCart, setSimCart] = useState([]);
  const [simName, setSimName] = useState('Vrindavan Dev Client');
  const [simAddress, setSimAddress] = useState('108 Vedic Enclave, Raman Reti, Vrindavan');
  const [simPhone, setSimPhone] = useState('9876543210');
  const [isSimulating, setIsSimulating] = useState(false);

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

  const refreshUsersList = async () => {
    try {
      const cloudUsers = await getCloudUsers();
      if (cloudUsers && cloudUsers.length > 0) {
        setUsersList(cloudUsers);
      }
    } catch (e) {}
  };

  useEffect(() => {
    refreshUsersList();
    const unsubscribe = subscribeCloudUsers((list) => {
      if (list && list.length > 0) {
        setUsersList(list);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [shops, menus, orders, users] = await Promise.all([
          getCloudShops(),
          getCloudMenus(),
          getCloudOrders(),
          getCloudUsers()
        ]);
        if (users && users.length > 0) {
          setUsersList(users);
        }
        setStats({
          shops: shops.length,
          items: menus.length,
          orders: orders.length,
          notifications: users.length
        });
      } catch (e) {
        console.warn("fetchStats note:", e);
      }
    };
    fetchStats();
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
      items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, ready: false })),
      subtotal: total,
      deliveryCharge: 0,
      gstAmount: 0,
      totalAmount: total,
      total_amount: total,
      status: 'new',
      isPaid: true,
      isTestOrder: true,
      paymentMethod: 'online',
      payment_method: 'online',
      cashStatus: 'none',
      cash_status: 'none'
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

      {/* Top Header Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#282526] border border-white/5 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400">
            <Terminal className="w-3.5 h-3.5" />
            <span>Developer Sandbox</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-['Outfit']">
            Diagnostics & Simulator
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-['Plus_Jakarta_Sans']">
            Simulate live mock orders, switch role views without re-auth, and test audio alarm triggers.
          </p>
        </div>
      </div>

      {/* System Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-5 text-center shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-white/5 text-[#E0FF33] flex items-center justify-center mx-auto mb-2">
            <Store className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-white font-['Outfit']">{stats.shops}</p>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Kitchens</p>
        </div>

        <div className="bg-[#282526] border border-white/5 rounded-3xl p-5 text-center shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-white/5 text-cyan-400 flex items-center justify-center mx-auto mb-2">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-white font-['Outfit']">{stats.items}</p>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Dishes Catalog</p>
        </div>

        <div className="bg-[#282526] border border-white/5 rounded-3xl p-5 text-center shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-white/5 text-amber-400 flex items-center justify-center mx-auto mb-2">
            <Receipt className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-white font-['Outfit']">{stats.orders}</p>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Total Orders</p>
        </div>

        <div className="bg-[#282526] border border-white/5 rounded-3xl p-5 text-center shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-white/5 text-purple-400 flex items-center justify-center mx-auto mb-2">
            <Bell className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-white font-['Outfit']">{stats.notifications}</p>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Notification Logs</p>
        </div>
      </div>

      {/* Main Dev Tools Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Impersonation Settings */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#E0FF33]" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit']">Instant Role Impersonation</h3>
          </div>
          <p className="text-xs text-neutral-400">Jump directly into any kitchen or delivery staff view with specific shop context.</p>

          <div className="space-y-4 pt-2">
            <div className="p-4 bg-[#1E1B1C] rounded-2xl border border-white/5 space-y-2">
              <label className="block text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                <span>Impersonate Kitchen Staff</span>
              </label>
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto no-scrollbar pr-0.5">
                  {allShops.map(s => {
                    const isSelected = selectedShopId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedShopId(s.id)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left truncate cursor-pointer ${isSelected
                            ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm'
                            : 'bg-[#282526] text-neutral-400 border-white/5 hover:text-white hover:border-white/15'
                          }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleImpersonateShop(selectedShopId)}
                  disabled={!selectedShopId}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Launch Kitchen Staff View</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#1E1B1C] rounded-2xl border border-white/5 space-y-2">
              <label className="block text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Impersonate Delivery Rider</span>
              </label>
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto no-scrollbar pr-0.5">
                  {allShops.map(s => {
                    const isSelected = selectedDeliveryShopId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedDeliveryShopId(s.id)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left truncate cursor-pointer ${isSelected
                            ? 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40 shadow-sm'
                            : 'bg-[#282526] text-neutral-400 border-white/5 hover:text-white hover:border-white/15'
                          }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleImpersonateDelivery(selectedDeliveryShopId)}
                  disabled={!selectedDeliveryShopId}
                  className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  <span>Launch Sarathi Rider View</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Global & Per-Kitchen Configuration */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#E0FF33]" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit']">Payment Gateways Master</h3>
            </div>
            <span className="text-[10px] font-black uppercase text-[#E0FF33] bg-[#E0FF33]/10 px-2 py-0.5 rounded-full">Global & Specific</span>
          </div>

          {/* 1. Global Master Switches */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">1. Global Master Switches (All Kitchens)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 bg-[#1E1B1C] rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Online Razorpay</p>
                  <p className="text-[10px] text-neutral-500">Platform-wide UPI/Cards</p>
                </div>
                <button
                  onClick={() => handleUpdatePaymentsConfig('onlinePaymentsEnabled', !paymentsConfig.onlinePaymentsEnabled)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${paymentsConfig.onlinePaymentsEnabled
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-red-400/20 text-red-300 border border-red-400/30'
                    }`}
                >
                  {paymentsConfig.onlinePaymentsEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="p-3 bg-[#1E1B1C] rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Cash on Delivery</p>
                  <p className="text-[10px] text-neutral-500">Platform-wide COD</p>
                </div>
                <button
                  onClick={() => handleUpdatePaymentsConfig('codEnabled', !paymentsConfig.codEnabled)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${paymentsConfig.codEnabled
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-red-400/20 text-red-300 border border-red-400/30'
                    }`}
                >
                  {paymentsConfig.codEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>

          {/* 2. Specific Kitchen Master Switches */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">2. Kitchen-Specific Payment Config</p>
                <span className="text-[10px] text-neutral-500 font-medium">Select a kitchen to manage</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allShops.map(s => {
                  const isSelected = (selectedPaymentShopId || allShops[0]?.id) === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedPaymentShopId(s.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${isSelected
                          ? 'bg-[#E0FF33] text-black border-[#E0FF33] font-black shadow-md'
                          : 'bg-[#1E1B1C] text-neutral-400 border-white/10 hover:text-white hover:border-white/20'
                        }`}
                    >
                      <span className="truncate max-w-[150px]">{s.name}</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className={`p-3 bg-[#1E1B1C] rounded-2xl border transition-all flex items-center justify-between ${isGlobalOnlineOff ? 'border-amber-500/30' : 'border-white/5'
                    }`}>
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white">Online Pay</p>
                        {isGlobalOnlineOff && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            Global Off
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate max-w-[130px]">{activeTargetShop?.name}</p>
                    </div>
                    <button
                      onClick={() => handleToggleKitchenPayment(activeTargetShop?.id, 'onlinePaymentsEnabled', !shopOnline)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${shopOnline
                          ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-400/30'
                          : 'bg-red-400/20 text-red-300 border border-red-400/30 hover:bg-red-400/30'
                        }`}
                    >
                      {shopOnline ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div className={`p-3 bg-[#1E1B1C] rounded-2xl border transition-all flex items-center justify-between ${isGlobalCodOff ? 'border-amber-500/30' : 'border-white/5'
                    }`}>
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white">Cash on Delivery</p>
                        {isGlobalCodOff && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            Global Off
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate max-w-[130px]">{activeTargetShop?.name}</p>
                    </div>
                    <button
                      onClick={() => handleToggleKitchenPayment(activeTargetShop?.id, 'codEnabled', !shopCod)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${shopCod
                          ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-400/30'
                          : 'bg-red-400/20 text-red-300 border border-red-400/30 hover:bg-red-400/30'
                        }`}
                    >
                      {shopCod ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Simulator Container */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-6 md:col-span-2 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit']">End-to-End Order Flow Simulator</h3>
          </div>
          <p className="text-xs text-neutral-400">Generate simulated tickets into Firestore without going through the public payment gateway.</p>

          <form onSubmit={handleRunOrderSimulator} className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Target Kitchen</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allShops.map(s => {
                    const isSelected = simShopId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSimShopChange(s.id)}
                        className={`p-3 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${isSelected
                            ? 'bg-[#E0FF33]/15 text-[#E0FF33] border-[#E0FF33]/40 shadow-sm'
                            : 'bg-[#1E1B1C] text-neutral-400 border-white/5 hover:text-white hover:border-white/15'
                          }`}
                      >
                        <span className="truncate">{s.name}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-[#E0FF33]" />}
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
        </div>

        {/* Registered Users & Role Directory Management */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-6 md:col-span-2 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#E0FF33]/15 text-[#E0FF33] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit']">Registered Users & Role Matrix</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Manage live roles, assign kitchen locations, and test role-based permissions in real-time.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleRestoreDefaultAccounts}
                title="Restore default developer, owner, chef and delivery accounts"
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-bold text-xs border border-white/10 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Restore Master Accounts</span>
              </button>

              <button
                onClick={() => setIsCreatingUser(!isCreatingUser)}
                className="px-4 py-2 rounded-xl bg-[#E0FF33] hover:bg-[#d6f727] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isCreatingUser ? 'Close Form' : 'Add Staff / User'}</span>
              </button>
            </div>
          </div>

          {/* Active Supabase Logged-In User Banner */}
          {user && (user.email || user.phone || user.id) && (
            <div className="p-3.5 bg-gradient-to-r from-[#E0FF33]/10 via-[#282526] to-cyan-500/10 border border-[#E0FF33]/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E0FF33]/20 border border-[#E0FF33]/40 text-[#E0FF33] flex items-center justify-center shrink-0">
                  <Terminal className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#E0FF33] animate-ping shrink-0" />
                    <p className="text-xs font-bold text-white font-['Outfit'] truncate">
                      Logged-In Supabase User: <span className="text-[#E0FF33]">{user.email || user.phone || 'Authenticated User'}</span>
                    </p>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#E0FF33]/20 text-[#E0FF33] border border-[#E0FF33]/30">
                      {userData?.role || 'developer'}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-mono truncate mt-0.5">
                    UID: {user.id} • Session Active in Supabase Auth
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
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
                  className="px-3 py-1.5 rounded-xl bg-[#E0FF33] text-black font-black text-xs uppercase tracking-wider hover:bg-[#d6f727] cursor-pointer active:scale-95 transition-all shadow-sm flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync My Account</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Stats Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="p-3 bg-[#1E1B1C] rounded-2xl border border-white/5">
              <p className="text-[10px] font-bold text-neutral-500 uppercase">Total Users</p>
              <p className="text-lg font-black text-white mt-0.5 font-['Outfit']">{usersList.length}</p>
            </div>
            <div className="p-3 bg-[#1E1B1C] rounded-2xl border border-amber-400/20">
              <p className="text-[10px] font-bold text-amber-400 uppercase">Kitchen Chefs</p>
              <p className="text-lg font-black text-amber-300 mt-0.5 font-['Outfit']">
                {usersList.filter(u => u.role === 'kitchen').length}
              </p>
            </div>
            <div className="p-3 bg-[#1E1B1C] rounded-2xl border border-cyan-400/20">
              <p className="text-[10px] font-bold text-cyan-400 uppercase">Riders (Sarathi)</p>
              <p className="text-lg font-black text-cyan-300 mt-0.5 font-['Outfit']">
                {usersList.filter(u => u.role === 'delivery').length}
              </p>
            </div>
            <div className="p-3 bg-[#1E1B1C] rounded-2xl border border-purple-400/20">
              <p className="text-[10px] font-bold text-purple-400 uppercase">Store Owners</p>
              <p className="text-lg font-black text-purple-300 mt-0.5 font-['Outfit']">
                {usersList.filter(u => u.role === 'owner').length}
              </p>
            </div>
            <div className="p-3 bg-[#1E1B1C] rounded-2xl border border-emerald-400/20">
              <p className="text-[10px] font-bold text-emerald-400 uppercase">Customers</p>
              <p className="text-lg font-black text-emerald-300 mt-0.5 font-['Outfit']">
                {usersList.filter(u => !u.role || u.role === 'customer').length}
              </p>
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
                    className="w-full bg-[#282526] text-xs text-white border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-[#E0FF33]"
                  >
                    {allShops.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
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

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, phone, email, UID..."
                className="w-full bg-[#1E1B1C] text-xs text-white border border-white/10 rounded-2xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#E0FF33]/50 font-['Plus_Jakarta_Sans']"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'grand_admin', label: '👑 Grand Admin' },
                { id: 'kitchen', label: 'Kitchen' },
                { id: 'delivery', label: 'Delivery' },
                { id: 'owner', label: 'Owner' },
                { id: 'customer', label: 'Customer' },
                { id: 'developer', label: 'Developer' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setUserRoleFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${userRoleFilter === f.id
                      ? 'bg-[#E0FF33] text-black border-[#E0FF33] font-black'
                      : 'bg-[#1E1B1C] text-neutral-400 border-white/10 hover:text-white'
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Directory List */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 no-scrollbar">
            {(() => {
              // Merge active logged-in user dynamically if not in list
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
                    className={`p-3 bg-[#1E1B1C] rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isCurrentSessionUser 
                        ? 'border-[#E0FF33]/40 shadow-[0_0_15px_rgba(224,255,51,0.08)] bg-gradient-to-r from-[#E0FF33]/5 via-[#1E1B1C] to-[#1E1B1C]' 
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* User Identity Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        role === 'grand_admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]' :
                        role === 'kitchen' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
                        role === 'delivery' ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30' :
                        role === 'owner' ? 'bg-purple-400/20 text-purple-300 border border-purple-400/30' :
                        role === 'developer' ? 'bg-[#E0FF33]/20 text-[#E0FF33] border border-[#E0FF33]/30' :
                        'bg-white/10 text-neutral-300 border border-white/10'
                      }`}>
                        {role === 'grand_admin' ? <Crown className="w-4 h-4 text-amber-300" /> :
                         role === 'kitchen' ? <ChefHat className="w-4 h-4" /> :
                         role === 'delivery' ? <Truck className="w-4 h-4" /> :
                         role === 'owner' ? <ShieldCheck className="w-4 h-4" /> :
                         role === 'developer' ? <Terminal className="w-4 h-4" /> :
                         <Sparkles className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-xs text-white truncate font-['Outfit']">
                            {u.displayName || u.email || `User (${(u.phone || '').slice(-4)})`}
                          </p>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            role === 'grand_admin' ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-300 border border-amber-400/50 flex items-center gap-1 font-black' :
                            role === 'kitchen' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
                            role === 'delivery' ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30' :
                            role === 'owner' ? 'bg-purple-400/20 text-purple-300 border border-purple-400/30' :
                            role === 'developer' ? 'bg-[#E0FF33]/20 text-[#E0FF33] border border-[#E0FF33]/30' :
                            'bg-white/5 text-neutral-400 border border-white/10'
                          }`}>
                            {role === 'grand_admin' ? '👑 Grand Admin' : role}
                          </span>
                          {isCurrentSessionUser && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#E0FF33]/20 text-[#E0FF33] border border-[#E0FF33]/40 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E0FF33] animate-pulse" />
                              Active (You)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-500 font-mono truncate mt-0.5">
                          {u.phone ? `+91 ${u.phone}` : ''} {u.email ? `• ${u.email}` : ''} <span className="text-neutral-600">({u.id.slice(0, 12)})</span>
                        </p>
                      </div>
                    </div>


                    {/* Interactive Role & Shop Selectors + Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-auto">
                      {/* Role Selector: Immutable Lock for Grand Admin */}
                      {role === 'grand_admin' ? (
                        <div 
                          className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 select-none cursor-not-allowed shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                          title="Grand Admin role is permanent and cannot be modified or downgraded."
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Permanent Grand Admin</span>
                        </div>
                      ) : (
                        <select
                          value={role}
                          onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                          className="bg-[#282526] text-xs font-bold text-white border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#E0FF33] cursor-pointer"
                        >
                          <option value="customer">Customer</option>
                          <option value="kitchen">Kitchen Staff</option>
                          <option value="delivery">Delivery Sarathi</option>
                          <option value="owner">Store Owner</option>
                          <option value="developer">Developer</option>
                          <option value="grand_admin">👑 Grand Admin (Permanent)</option>
                        </select>
                      )}

                      {/* Kitchen Assignment Selector */}
                      {(role === 'kitchen' || role === 'delivery' || role === 'owner') && (
                        <select
                          value={u.shopId || (allShops[0]?.id || '')}
                          onChange={(e) => handleUpdateUserShop(u.id, e.target.value)}
                          className="bg-[#282526] text-xs font-bold text-neutral-300 border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#E0FF33] cursor-pointer max-w-[140px] truncate"
                        >
                          {allShops.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      )}

                      {/* Instant Test Impersonate */}
                      <button
                        onClick={() => handleQuickImpersonateUser(u)}
                        title="Launch test view as this user"
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 hover:border-white/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 text-[#E0FF33] fill-current" />
                        <span>Test View</span>
                      </button>

                      {/* Delete User (Disabled / Hidden for Grand Admin) */}
                      {role !== 'grand_admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.displayName, u.email)}
                          title="Delete user"
                          className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Audio System Telemetry & Role Synthesizer */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-6 md:col-span-2 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit']">Multi-Role Audio Synthesizer & Telemetry</h3>
            </div>

            <div className="flex items-center gap-2">
              <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 border ${audioUnlocked
                  ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
                  : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${audioUnlocked ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>Audio Engine: {audioUnlocked ? 'Running (Active)' : 'Suspended'}</span>
              </div>

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
                  Enable Background Push
                </button>
              ) : (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Push Notifications Active
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
    </div>
  );
}
