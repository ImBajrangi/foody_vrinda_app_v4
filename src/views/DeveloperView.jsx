import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
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
  Truck, 
  ChefHat,
  Sparkles
} from 'lucide-react';

export default function DeveloperView({ setCurrentTab }) {
  const { allShops, impersonate } = useAuth();
  
  const [stats, setStats] = useState({ shops: 0, items: 0, orders: 0, notifications: 0 });
  const [paymentsConfig, setPaymentsConfig] = useState({ onlinePaymentsEnabled: true, codEnabled: true });
  const [toast, setToast] = useState(null);

  // Impersonation state
  const [selectedShopId, setSelectedShopId] = useState('');
  const [selectedDeliveryShopId, setSelectedDeliveryShopId] = useState('');

  // Simulator state
  const [simShopId, setSimShopId] = useState('');
  const [simMenuItems, setSimMenuItems] = useState([]);
  const [simCart, setSimCart] = useState([]);
  const [simName, setSimName] = useState('Vrindavan Dev Client');
  const [simAddress, setSimAddress] = useState('108 Vedic Enclave, Raman Reti, Vrindavan');
  const [simPhone, setSimPhone] = useState('9876543210');
  const [isSimulating, setIsSimulating] = useState(false);

  // Alarm testing
  const { isPlaying, playAlarm, stopAlarm } = useAudioAlarm();

  // Load overall system statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const shopsSnap = await getDocs(collection(db, "shops"));
        const itemsSnap = await getDocs(collection(db, "menus"));
        const ordersSnap = await getDocs(collection(db, "orders"));
        const notifsSnap = await getDocs(collection(db, "notifications"));

        setStats({
          shops: shopsSnap.size,
          items: itemsSnap.size,
          orders: ordersSnap.size,
          notifications: notifsSnap.size
        });
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, []);

  // Sync payments config
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "paymentConfig"), (docSnap) => {
      if (docSnap.exists()) {
        setPaymentsConfig(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSimShopChange = async (shopId) => {
    setSimShopId(shopId);
    if (!shopId) {
      setSimMenuItems([]);
      setSimCart([]);
      return;
    }

    try {
      const q = query(collection(db, "menus"), where("shopId", "==", shopId));
      const snap = await getDocs(q);
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSimMenuItems(items);
      setSimCart(items.map(i => ({ ...i, quantity: 0 })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePaymentsConfig = async (key, value) => {
    try {
      await updateDoc(doc(db, "settings", "paymentConfig"), { [key]: value });
      setToast({ message: `Dev Override: ${key} updated`, type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Failed to update payment setting', type: 'error' });
    }
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
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
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
      customerName: simName,
      customerAddress: simAddress,
      deliveryAddress: simAddress,
      customerPhone: simPhone,
      items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, ready: false })),
      subtotal: total,
      deliveryCharge: 0,
      gstAmount: 0,
      totalAmount: total,
      status: 'new',
      createdAt: serverTimestamp(),
      userId: 'mock-simulator-client',
      paymentId: 'simulator-payment',
      paymentIds: ['simulator-payment'],
      isPaid: true,
      isTestOrder: true,
      createdBy: 'Simulator Log',
      paymentMethod: 'online',
      cashStatus: 'none'
    };

    try {
      const docRef = await addDoc(collection(db, "orders"), orderPayload);
      
      // Notify staff
      const staffQuery = query(
        collection(db, "users"), 
        where("shopId", "==", simShopId), 
        where("role", "in", ["kitchen", "owner"])
      );
      const staffSnap = await getDocs(staffQuery);
      staffSnap.docs.forEach(async (staffDoc) => {
        await addDoc(collection(db, "notifications"), {
          userId: staffDoc.id,
          role: staffDoc.data().role,
          shopId: simShopId,
          message: `🔥 SIMULATOR ALERT: Mock order #${docRef.id.slice(-6).toUpperCase()} generated.`,
          orderId: docRef.id,
          read: false,
          createdAt: serverTimestamp()
        });
      });

      setToast({
        message: `Simulator Order #${docRef.id.slice(-6).toUpperCase()} Created! Check Kitchen tab.`,
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
              <div className="flex gap-2">
                <select 
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="flex-1 bg-[#282526] text-xs text-white border border-white/10 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#E0FF33]/50"
                >
                  <option value="" className="bg-[#1E1B1C]">-- Choose Kitchen --</option>
                  {allShops.map(s => <option key={s.id} value={s.id} className="bg-[#1E1B1C]">{s.name}</option>)}
                </select>
                <button 
                  onClick={() => handleImpersonateShop(selectedShopId)}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs transition-all active:scale-95"
                >
                  Switch
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#1E1B1C] rounded-2xl border border-white/5 space-y-2">
              <label className="block text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Impersonate Delivery Rider</span>
              </label>
              <div className="flex gap-2">
                <select 
                  value={selectedDeliveryShopId}
                  onChange={(e) => setSelectedDeliveryShopId(e.target.value)}
                  className="flex-1 bg-[#282526] text-xs text-white border border-white/10 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#E0FF33]/50"
                >
                  <option value="" className="bg-[#1E1B1C]">-- Choose Kitchen --</option>
                  {allShops.map(s => <option key={s.id} value={s.id} className="bg-[#1E1B1C]">{s.name}</option>)}
                </select>
                <button 
                  onClick={() => handleImpersonateDelivery(selectedDeliveryShopId)}
                  className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs transition-all active:scale-95"
                >
                  Switch
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Global Configuration Bypass */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#E0FF33]" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit']">Payment Gateways Override</h3>
          </div>
          <p className="text-xs text-neutral-400">Directly override Firestore global settings flags for testing checkout flows.</p>
          
          <div className="space-y-3 pt-2">
            <div className="p-4 bg-[#1E1B1C] rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Online Razorpay Checkout</p>
                <p className="text-[10px] text-neutral-500">Enable/disable gateway on customer cart</p>
              </div>
              <button 
                onClick={() => handleUpdatePaymentsConfig('onlinePaymentsEnabled', !paymentsConfig.onlinePaymentsEnabled)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  paymentsConfig.onlinePaymentsEnabled 
                    ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' 
                    : 'bg-red-400/20 text-red-300 border border-red-400/30'
                }`}
              >
                {paymentsConfig.onlinePaymentsEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="p-4 bg-[#1E1B1C] rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Cash on Delivery (COD)</p>
                <p className="text-[10px] text-neutral-500">Allow physical cash collection</p>
              </div>
              <button 
                onClick={() => handleUpdatePaymentsConfig('codEnabled', !paymentsConfig.codEnabled)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  paymentsConfig.codEnabled 
                    ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' 
                    : 'bg-red-400/20 text-red-300 border border-red-400/30'
                }`}
              >
                {paymentsConfig.codEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
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
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Target Kitchen</label>
                <select 
                  value={simShopId}
                  onChange={(e) => handleSimShopChange(e.target.value)}
                  required
                  className="w-full bg-[#1E1B1C] text-xs text-white border border-white/10 rounded-2xl p-3 focus:outline-none focus:border-[#E0FF33]/50"
                >
                  <option value="" className="bg-[#1E1B1C]">-- Choose Kitchen Location --</option>
                  {allShops.map(s => <option key={s.id} value={s.id} className="bg-[#1E1B1C]">{s.name}</option>)}
                </select>
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

        {/* Audio System Test Debug */}
        <div className="bg-[#282526] border border-white/5 rounded-3xl p-6 md:col-span-2 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider font-['Outfit']">Audio Alert Ringer Test</h3>
          </div>
          <p className="text-xs text-neutral-400">Plays the kitchen live order wave chime and triggers web notifications test.</p>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button 
              onClick={handleTestAlarm}
              className="flex-1 py-3 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <Volume2 className="w-4 h-4" />
              <span>Test Alert Chime Loop</span>
            </button>
            {isPlaying && (
              <button 
                onClick={stopAlarm}
                className="flex-1 py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <VolumeX className="w-4 h-4" />
                <span>Stop Alert Sound</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
