import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFastNotify } from '../hooks/useFastNotify';
import { useAudioAlarm } from '../hooks/useAudioAlarm';
import { 
  supabase, 
  updateCloudOrderStatus, 
  createCloudOrder, 
  subscribeCloudOrders, 
  getCloudMenus, 
  createCloudNotification 
} from '../supabase';
import DynamicToast from '../components/ui/DynamicToast';
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
  Trash2
} from 'lucide-react';

export default function KitchenView() {
  const { user, currentUserShopId } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);
  
  // Create manual order states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cookingNotes, setCookingNotes] = useState('');
  const [manualCart, setManualCart] = useState([]);
  const [itemSearch, setItemSearch] = useState('');

  // Alarm sound control
  const { isPlaying, playAlarm, stopAlarm } = useAudioAlarm();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev && prev.message === message ? null : prev));
    }, 4000);
  };

  // Fast notification listener
  useFastNotify(currentUserShopId, 'kitchen', () => {
    playAlarm();
    showToast("New order received in kitchen!", "info");
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
    try {
      await updateCloudOrderStatus(orderId, 'preparing');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'preparing' } : o));
      showToast("Order accepted into preparation!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to accept order.", "error");
    }
  };

  const handleOrderReady = async (orderId, orderData) => {
    try {
      await updateCloudOrderStatus(orderId, 'ready_for_pickup');
      setOrders(prev => prev.filter(o => o.id !== orderId));
      
      // Notify customer & rider
      if (orderData?.userId) {
        await createCloudNotification({
          userId: orderData.userId,
          message: "Your Satvik meal is ready for pickup/delivery!",
          orderId
        });
      }

      await createCloudNotification({
        role: 'delivery',
        shopId: currentUserShopId,
        message: `Order #${orderId.slice(-6).toUpperCase()} is ready for rider dispatch.`,
        orderId
      });

      showToast("Order marked ready for dispatch!", "success");
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
    <div className="space-y-6 text-white pb-20">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <DynamicToast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* HEADER OPERATIONS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#282526] p-5 sm:p-6 rounded-[32px] border border-white/10 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 flex items-center justify-center text-[#E0FF33] flex-shrink-0 shadow-sm">
            <ChefHat size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-['Outfit']">
                Kitchen Operations
              </h1>
              <span className="bg-[#E0FF33] text-[#1E1B1C] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                {orders.length} Active
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Live Satvik preparation board & instant kitchen dispatch
            </p>
          </div>
        </div>

        <button 
          onClick={handleOpenCreateModal}
          className="bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black text-xs sm:text-sm px-5 py-3 rounded-full flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer apple-tap-target flex-shrink-0"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Create Manual Order</span>
        </button>
      </div>

      {/* ALARM STOP GLOWING BANNER */}
      {isPlaying && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-black p-4 sm:p-5 rounded-[28px] shadow-[0_0_35px_rgba(239,68,68,0.5)] flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
              <Volume2 size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-black uppercase tracking-wider">New Order Received!</p>
              <p className="text-xs text-white/80 font-semibold">Incoming ticket awaiting chef confirmation</p>
            </div>
          </div>
          <button 
            onClick={stopAlarm}
            className="bg-white text-red-600 hover:bg-zinc-100 font-black text-xs sm:text-sm px-6 py-2.5 rounded-full shadow-lg transition-all cursor-pointer apple-tap-target flex items-center gap-2 flex-shrink-0"
          >
            <VolumeX size={16} strokeWidth={2.5} />
            <span>Silence Alarm</span>
          </button>
        </div>
      )}

      {/* ORDERS GRID */}
      {orders.length === 0 ? (
        <div className="bg-[#282526] rounded-[36px] p-12 sm:p-16 text-center text-zinc-400 border border-white/5 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-3.5 border border-white/5">
            <CheckCircle2 size={32} className="text-[#E0FF33]" />
          </div>
          <p className="font-black text-white text-base sm:text-lg font-['Outfit']">All Orders Prepared</p>
          <p className="text-xs text-zinc-500 mt-1">Kitchen queue is clear. Radhe Radhe!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {orders.map(order => {
            const isNew = order.status === 'new';

            return (
              <div 
                key={order.id} 
                className={`bg-[#282526] rounded-[32px] sm:rounded-[36px] p-5 sm:p-6 border flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden transition-all ${
                  isNew ? 'border-[#E0FF33]/40 ring-1 ring-[#E0FF33]/20 shadow-[0_10px_30px_rgba(224,255,51,0.06)]' : 'border-white/10'
                }`}
              >
                <div>
                  {/* Top Order Badge & Status */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag size={15} className="text-[#E0FF33]" />
                        <h3 className="font-black text-white text-sm sm:text-base font-['Outfit']">
                          Order #{order.id.slice(-6).toUpperCase()}
                        </h3>
                      </div>
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Clock size={12} className="text-zinc-500" />
                        <span>{order.createdAt?.toMillis ? new Date(order.createdAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                      </p>
                    </div>

                    <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 ${
                      isNew 
                        ? 'bg-[#E0FF33] text-[#1E1B1C] shadow-sm' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {isNew ? <Flame size={11} className="fill-[#1E1B1C]" /> : <Clock size={11} />}
                      <span>{order.status}</span>
                    </span>
                  </div>

                  {/* Customer & Address Details Card */}
                  <div className="text-xs text-zinc-300 mb-3.5 bg-[#1E1B1C] p-3.5 rounded-2xl border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white flex items-center gap-1.5 truncate">
                        <User size={13} className="text-zinc-500 flex-shrink-0" />
                        <span className="truncate">{order.customerName || 'Customer'}</span>
                      </p>
                      {order.customerPhone && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <a 
                            href={`tel:${order.customerPhone}`}
                            className="text-[#E0FF33] hover:underline flex items-center gap-1 font-bold text-[11px]"
                            title="Call Customer"
                          >
                            <Phone size={11} />
                            <span>{order.customerPhone}</span>
                          </a>
                          <a 
                            href={`https://wa.me/91${order.customerPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Radhe Radhe ${order.customerName || 'Ji'}! Regarding your Foody Vrinda order #${order.id ? order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : ''}:`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-5 h-5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle size={11} />
                          </a>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 flex items-start gap-1.5 leading-snug">
                      <MapPin size={13} className="text-zinc-500 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{order.customerAddress || 'Vrindavan Dham'}</span>
                    </p>

                    {order.cookingNotes && (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-[11px] text-amber-200 mt-1.5 flex items-start gap-1.5">
                        <FileText size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-snug"><strong className="text-amber-400">Notes:</strong> {order.cookingNotes}</span>
                      </div>
                    )}

                    {order.paymentMethod === 'cash' && (
                      <div className="pt-1 flex items-center justify-between border-t border-white/5 mt-1">
                        <span className="text-[10px] text-amber-400 font-black uppercase flex items-center gap-1">
                          <Banknote size={12} />
                          <span>Cash on Delivery</span>
                        </span>
                        <span className="text-xs font-black text-white">₹{order.totalAmount}</span>
                      </div>
                    )}
                  </div>

                  {/* Dishes Checklist Section */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider font-['Outfit'] flex items-center justify-between">
                      <span>Dish Checklist</span>
                      <span className="text-zinc-500">{order.items?.length || 0} items</span>
                    </p>

                    <div className="divide-y divide-white/5 max-h-48 overflow-y-auto pr-1 no-scrollbar space-y-1">
                      {order.items?.map((item, i) => (
                        <div key={item.id || i} className="py-2 text-xs flex justify-between items-center gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-[#1E1B1C] border border-white/10 text-[#E0FF33] font-black text-[10px] flex items-center justify-center flex-shrink-0">
                              {item.quantity}x
                            </span>
                            <span className={`font-bold truncate ${item.ready ? 'line-through text-zinc-500' : 'text-white'}`}>
                              {item.name}
                            </span>
                          </div>
                          
                          {order.status === 'preparing' && (
                            <button
                              onClick={() => toggleItemReady(order.id, item.id)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer apple-tap-target flex-shrink-0 ${
                                item.ready 
                                  ? 'bg-[#E0FF33] text-[#1E1B1C]' 
                                  : 'bg-[#1E1B1C] text-zinc-400 hover:text-white border border-white/10'
                              }`}
                            >
                              <Check size={11} strokeWidth={3} />
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
          <div className={`w-full max-w-2xl bg-[#242021] border border-white/10 text-white rounded-[36px] sm:rounded-[42px] p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col justify-between apple-modal-spring ${isModalClosing ? 'closing' : ''}`}>
            
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 flex items-center justify-center text-[#E0FF33]">
                  <Plus size={20} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">Create Manual Order</h3>
                  <p className="text-xs text-zinc-400 font-medium">Record in-person or phone delivery order</p>
                </div>
              </div>

              <button 
                onClick={handleCloseCreateModal}
                className="w-9 h-9 rounded-full bg-[#1E1B1C] hover:bg-[#322E30] text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer apple-tap-target border border-white/5"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-5 my-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Customer Information Column */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider font-['Outfit']">Customer Information</h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Customer Name</label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required 
                      placeholder="e.g. Radhika Sharma"
                      className="w-full text-xs !bg-[#1E1B1C] !border-white/5 !rounded-2xl py-3 px-4 text-white placeholder-zinc-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Delivery Address</label>
                    <input 
                      type="text" 
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      required 
                      placeholder="e.g. Raman Reti, Vrindavan"
                      className="w-full text-xs !bg-[#1E1B1C] !border-white/5 !rounded-2xl py-3 px-4 text-white placeholder-zinc-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required 
                      placeholder="e.g. 9876543210"
                      className="w-full text-xs !bg-[#1E1B1C] !border-white/5 !rounded-2xl py-3 px-4 text-white placeholder-zinc-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Kitchen Instructions</label>
                    <input 
                      type="text" 
                      value={cookingNotes}
                      onChange={(e) => setCookingNotes(e.target.value)}
                      placeholder="e.g. Extra tulsi patra, less spicy"
                      className="w-full text-xs !bg-[#1E1B1C] !border-white/5 !rounded-2xl py-3 px-4 text-white placeholder-zinc-500" 
                    />
                  </div>
                </div>

                {/* Menu Items Selector Column */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider font-['Outfit']">Select Satvik Dishes</h4>
                    <span className="text-[11px] text-[#E0FF33] font-bold">
                      {manualCart.filter(i => i.quantity > 0).length} selected
                    </span>
                  </div>

                  {/* Search filter in modal */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                      type="text" 
                      placeholder="Filter dishes..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="w-full text-xs !bg-[#1E1B1C] !border-white/5 !rounded-xl py-2 pl-8 pr-3 text-white placeholder-zinc-500" 
                    />
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 no-scrollbar divide-y divide-white/5">
                    {filteredMenuItems.map(item => (
                      <div key={item.id} className="pt-2 flex justify-between items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white text-xs truncate">{item.name}</p>
                          <p className="text-[10px] text-zinc-400">₹{item.price}</p>
                        </div>

                        {/* High-accessibility Stepper */}
                        <div className="bg-[#1E1B1C] rounded-full p-1 border border-white/10 flex items-center gap-1 shadow-inner flex-shrink-0">
                          <button 
                            type="button" 
                            onClick={() => handleUpdateManualQty(item.id, -1)}
                            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-zinc-200 hover:text-white cursor-pointer transition-all shadow-sm apple-tap-target"
                            aria-label="Decrease quantity"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 size={11} className="text-red-400" />
                            ) : (
                              <Minus size={11} strokeWidth={2.5} />
                            )}
                          </button>
                          <span className="min-w-[18px] text-center font-black text-xs text-[#E0FF33] font-['Outfit'] select-none">
                            {item.quantity}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => handleUpdateManualQty(item.id, 1)}
                            className="w-6 h-6 rounded-full bg-[#E0FF33] hover:bg-[#ccff00] active:scale-90 flex items-center justify-center text-[#1E1B1C] cursor-pointer transition-all shadow-md apple-tap-target"
                            aria-label="Increase quantity"
                          >
                            <Plus size={11} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Bill Box */}
                  <div className="bg-[#151314] rounded-2xl p-3.5 border border-white/5 flex justify-between items-center mt-3">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Bill (COD)</span>
                    <span className="text-lg font-black text-[#E0FF33]">
                      ₹{manualCart.reduce((sum, item) => sum + item.price * item.quantity, 0)}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black text-sm py-4 rounded-full shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer apple-tap-target mt-4"
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
