import { useEffect, useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  ChefHat, 
  Truck, 
  Store, 
  Sparkles, 
  X, 
  ArrowRight, 
  CreditCard, 
  Banknote, 
  Receipt, 
  BellRing,
  Phone,
  MapPin,
  Clock,
  ExternalLink,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../../supabase';

export default function ActiveAlarmBanner({ isPlaying, activeAlert, onSilence, onActionClick }) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [fullOrderData, setFullOrderData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isPlaying && activeAlert) {
      setIsDismissed(false);
      setFullOrderData(activeAlert.order || null);
    }
  }, [isPlaying, activeAlert?.orderId]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isPlaying && !showDetailModal) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        onSilence();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, showDetailModal, onSilence]);

  if ((!isPlaying && !showDetailModal) || !activeAlert || isDismissed) return null;

  const role = activeAlert.role || 'kitchen';
  const rawId = activeAlert.orderId || activeAlert.order?.id || '';
  const shortId = rawId ? rawId.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : '-----';

  const order = fullOrderData || activeAlert.order || {};
  const customerName = order.customerName || order.customer_name || 'Customer';
  const customerPhone = order.customerPhone || order.customer_phone || '';
  const deliveryAddress = order.deliveryAddress || order.delivery_address || order.customerAddress || order.customer_address || '';
  const cookingNotes = order.cookingNotes || order.cooking_notes || '';
  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.length || 1;
  const totalAmount = order.totalAmount || order.total_amount || order.total || order.amount || 0;
  const isCod = (order.paymentMethod || order.payment_method) === 'cash' || (order.paymentMethod || order.payment_method) === 'cod';

  const handleOpenDetails = async () => {
    onSilence();
    setShowDetailModal(true);

    // Fetch fresh order details with complete itemized breakdown from Supabase
    if (rawId) {
      try {
        const { data } = await supabase
          .from('foody_orders')
          .select('*')
          .eq('id', rawId)
          .maybeSingle();

        if (data) {
          setFullOrderData(data);
        }
      } catch (err) {
        console.warn('Error fetching alert order details:', err);
      }
    }

    if (onActionClick) {
      onActionClick(activeAlert);
    }
  };

  const getRoleConfig = () => {
    switch (role) {
      case 'kitchen':
        return {
          icon: ChefHat,
          tag: 'Kitchen Order',
          title: 'New Order Received',
          badgeBg: 'bg-amber-400/15 text-amber-300 border border-amber-400/30',
          btnBg: 'bg-amber-400 hover:bg-amber-300 text-black'
        };
      case 'delivery':
        return {
          icon: Truck,
          tag: 'Delivery Dispatch',
          title: 'Order Ready for Pickup',
          badgeBg: 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/30',
          btnBg: 'bg-cyan-400 hover:bg-cyan-300 text-black'
        };
      case 'owner':
        return {
          icon: Store,
          tag: 'Store Dispatch',
          title: 'New Store Order',
          badgeBg: 'bg-[#E0FF33]/15 text-[#E0FF33] border border-[#E0FF33]/30',
          btnBg: 'bg-[#E0FF33] hover:bg-[#d4f624] text-black'
        };
      default:
        return {
          icon: BellRing,
          tag: 'Order Alert',
          title: 'Live Order Notification',
          badgeBg: 'bg-white/10 text-white border border-white/15',
          btnBg: 'bg-[#E0FF33] hover:bg-[#d4f624] text-black'
        };
    }
  };

  const config = getRoleConfig();
  const IconComponent = config.icon;

  return (
    <>
      {/* Sleek, Calm, Non-blinking Floating Audio HUD Banner */}
      {isPlaying && !isDismissed && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:top-5 sm:right-6 z-[999999] w-[calc(100vw-24px)] sm:w-[440px] max-w-full animate-slide-down select-none">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#161415]/95 backdrop-blur-2xl border border-white/15 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)] relative overflow-hidden">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setIsDismissed(true);
                onSilence();
              }}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Header Content */}
            <div className="flex items-center gap-3 pr-6">
              <div className={`w-10 h-10 rounded-xl ${config.badgeBg} flex items-center justify-center font-bold shrink-0`}>
                <IconComponent className="w-5 h-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {config.tag}
                  </span>
                  {shortId && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/10 text-white">
                      #{shortId}
                    </span>
                  )}
                  {totalAmount > 0 && (
                    <span className="text-xs font-mono font-bold text-[#E0FF33]">
                      ₹{totalAmount}
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-white font-['Outfit'] truncate mt-0.5">
                  {config.title}
                </h4>

                <p className="text-xs text-neutral-400 truncate">
                  <span className="text-neutral-200 font-medium">{customerName}</span> · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2">
              <button
                type="button"
                onClick={onSilence}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10 active:scale-95 cursor-pointer"
                title="Silence sound"
              >
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span>Silence</span>
              </button>

              <button
                type="button"
                onClick={handleOpenDetails}
                className={`flex-1 py-2 px-3 rounded-xl ${config.btnBg} font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors active:scale-95 cursor-pointer font-['Outfit']`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>View Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Order & Payment Details Audit Modal */}
      {showDetailModal && (
        <div 
          className="fixed inset-0 z-[9999999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDetailModal(false);
          }}
        >
          <div className="w-full max-w-lg bg-[#1A1718] border border-white/10 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#221F20] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E0FF33]/15 border border-[#E0FF33]/30 flex items-center justify-center text-[#E0FF33]">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white font-['Outfit']">
                      Order #{shortId}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(rawId);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-neutral-400 hover:text-[#E0FF33] p-1 rounded transition-colors"
                      title="Copy full order UUID"
                    >
                      {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-400 flex items-center gap-1">
                    <Clock size={11} />
                    <span>{order.created_at || order.createdAt ? new Date(order.created_at || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live Alert'}</span>
                    <span>•</span>
                    <span className="capitalize">{order.status || 'Active'}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 font-['Plus_Jakarta_Sans']">
              {/* Payment Status Card */}
              <div className="p-4 rounded-2xl bg-[#221F20] border border-white/10 space-y-2">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                  Payment Details
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCod ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-xl border border-amber-400/20">
                        <Banknote size={14} /> Cash on Delivery (COD)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-400/10 px-2.5 py-1 rounded-xl border border-emerald-400/20">
                        <CreditCard size={14} /> Paid Online (UPI / Card)
                      </span>
                    )}
                  </div>
                  <span className="text-base font-mono font-black text-[#E0FF33]">
                    ₹{totalAmount}
                  </span>
                </div>
              </div>

              {/* Customer & Location Details */}
              <div className="p-4 rounded-2xl bg-[#221F20] border border-white/10 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Customer</span>
                    <h4 className="text-sm font-bold text-white font-['Outfit'] mt-0.5">{customerName}</h4>
                    {customerPhone && (
                      <p className="text-xs text-neutral-400 font-mono mt-0.5">{customerPhone}</p>
                    )}
                  </div>

                  {customerPhone && (
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${customerPhone}`}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 border border-emerald-400/20 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Phone size={12} /> Call
                      </a>
                      <a
                        href={`https://wa.me/91${customerPhone.replace(/\D/g, '').slice(-10)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink size={12} /> WhatsApp
                      </a>
                    </div>
                  )}
                </div>

                {deliveryAddress && (
                  <div className="pt-2 border-t border-white/5 flex items-start gap-2 text-xs text-neutral-300">
                    <MapPin size={14} className="text-[#E0FF33] shrink-0 mt-0.5" />
                    <span>{deliveryAddress}</span>
                  </div>
                )}

                {cookingNotes && (
                  <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25 text-xs text-amber-200">
                    <strong className="text-amber-300 font-bold">Chef Instructions:</strong> {cookingNotes}
                  </div>
                )}
              </div>

              {/* Items Breakdown */}
              <div className="p-4 rounded-2xl bg-[#221F20] border border-white/10 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-white/10 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <span>Ordered Dishes ({itemCount})</span>
                  <span>Amount</span>
                </div>

                {items.length > 0 ? (
                  items.map((item, idx) => {
                    const qty = item.quantity || item.qty || 1;
                    const price = item.price || 0;
                    return (
                      <div key={idx} className="flex justify-between items-center text-xs py-1">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="w-4 h-4 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[8px] text-emerald-400 font-bold shrink-0">
                            v
                          </span>
                          <span className="text-white font-medium truncate">{item.name}</span>
                          <span className="text-neutral-400 font-bold shrink-0">x {qty}</span>
                        </div>
                        <span className="font-mono font-bold text-white shrink-0">₹{qty * price}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-neutral-400 py-2">Item details synced from kitchen board.</p>
                )}

                {/* Total Summary */}
                <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm font-black text-white font-['Outfit']">
                  <span className="text-[#E0FF33]">Grand Total</span>
                  <span className="text-[#E0FF33] font-mono text-base">₹{totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-[#221F20] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onSilence();
                  setShowDetailModal(false);
                }}
                className="py-2.5 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-colors cursor-pointer"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

