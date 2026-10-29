import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ArrowRight, Sparkles, Clock, MapPin, X, Store, Copy, Check } from 'lucide-react';
import FoodyOrderHop from '../foody/FoodyOrderHop';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export default function OrderSuccessCelebrationModal({
  isOpen,
  order,
  onClose,
  onTrackOrder
}) {
  const hopRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyOrderId = (id, e) => {
    e?.stopPropagation();
    if (!id) return;
    try {
      navigator.clipboard?.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (_) {}
  };

  useEffect(() => {
    if (!isOpen) return;

    // Trigger celebratory haptics on native platforms
    try {
      if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style: ImpactStyle.Medium });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([20, 40, 20]);
      }
    } catch (_) {}

    // Listen for postMessage or custom window event for replay
    const handleMessage = (e) => {
      if (e.data === 'foody:hop' || e.data?.type === 'foody:hop') {
        hopRef.current?.play();
      }
    };
    window.addEventListener('message', handleMessage);

    const handleCustomEvent = () => {
      hopRef.current?.play();
    };
    window.addEventListener('foody:hop', handleCustomEvent);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('foody:hop', handleCustomEvent);
    };
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const ordersList = Array.isArray(order) ? order : [order];
  if (ordersList.length === 0) return null;

  const isMultiOrder = ordersList.length > 1;
  const singleOrder = ordersList[0];
  const orderId = singleOrder?.id || 'FV-108';
  const shopName = singleOrder?.shop_name || singleOrder?.shopName || 'Foody Vrinda Sacred Kitchen';
  const shopAddress = singleOrder?.shop_address || singleOrder?.shopAddress || 'Vrindavan Dham';
  const grandTotal = ordersList.reduce((sum, o) => sum + (Number(o?.total_amount || o?.totalAmount || o?.total) || 0), 0);
  const totalAmount = singleOrder?.total_amount || singleOrder?.totalAmount || singleOrder?.total || grandTotal || '0';
  
  const singleOrderItems = Array.isArray(singleOrder?.items)
    ? singleOrder.items
    : (typeof singleOrder?.items === 'string'
        ? (() => { try { return JSON.parse(singleOrder.items); } catch { return []; } })()
        : []);
  const itemsCount = singleOrderItems.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
  const totalItemsAcrossOrders = ordersList.reduce((acc, o) => {
    const itms = Array.isArray(o?.items)
      ? o.items
      : (typeof o?.items === 'string'
          ? (() => { try { return JSON.parse(o.items); } catch { return []; } })()
          : []);
    return acc + itms.reduce((sub, it) => sub + (Number(it.quantity) || 1), 0);
  }, 0);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-success-title"
    >
      <div className="relative w-full max-w-[400px] bg-[#1E1B1C] border border-[#FD9139]/30 rounded-[36px] p-6 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(253,145,57,0.18)] flex flex-col items-center text-center overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Divine Ambient Radial Glows */}
        <div className="absolute -top-24 inset-x-0 h-48 bg-gradient-to-b from-[#FD9139]/25 via-[#FD9139]/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-[#FD9139]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4.5 right-4.5 z-20 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-stone-400 hover:text-white flex items-center justify-center transition-all active:scale-95 border border-white/10"
          aria-label="Close"
        >
          <X className="w-4 h-4 stroke-[2.4]" />
        </button>

        {/* Sacred Header Pill */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FD9139]/12 border border-[#FD9139]/30 text-[#FD9139] text-[11px] font-bold tracking-wider uppercase font-['Outfit'] shadow-xs mb-3">
          <Sparkles className="w-3 h-3 text-[#FD9139]" />
          <span>श्री धाम वृन्दावन • राधे राधे</span>
        </div>

        {/* Mascot Stage with Elegant Glowing Medallion */}
        <div 
          onClick={() => hopRef.current?.play()}
          title="Tap squirrel to replay celebration"
          className="relative my-1 cursor-pointer select-none active:scale-95 transition-transform flex items-center justify-center group"
        >
          {/* Circular halo ring with animated gentle pulse */}
          <div className="absolute w-[184px] h-[184px] rounded-full bg-gradient-to-tr from-[#FD9139]/20 to-amber-300/10 blur-xl pointer-events-none" />
          <div className="relative w-[172px] h-[172px] rounded-full bg-[#151314] border-2 border-[#FD9139]/35 shadow-[0_10px_35px_rgba(0,0,0,0.6),inset_0_2px_12px_rgba(253,145,57,0.15)] flex items-center justify-center overflow-hidden">
            <div className="w-[170px] h-[170px] flex items-center justify-center">
              <FoodyOrderHop
                ref={hopRef}
                width={170}
                background="transparent"
                autoplay={true}
              />
            </div>
          </div>
        </div>

        {/* Main Status Headline with Success Badge */}
        <div className="space-y-1.5 mt-3.5 mb-3.5">
          <div className="inline-flex items-center justify-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
            <h2 id="order-success-title" className="text-2xl font-black text-white font-['Outfit'] tracking-tight">
              {isMultiOrder ? `${ordersList.length} Orders Placed!` : 'Order Placed!'}
            </h2>
          </div>
          <p className="text-xs text-stone-300 max-w-[310px] leading-relaxed mx-auto font-medium">
            {isMultiOrder
              ? `Your prasad is being freshly prepared across ${ordersList.length} kitchens in Vrindavan Dham.`
              : 'Your sacred Satvik prasad is being prepared fresh with pure desi ghee.'}
          </p>
        </div>

        {/* Multi-Order Segregated List OR Single Order Receipt Card */}
        {isMultiOrder ? (
          <div className="w-full space-y-2 mb-4 text-left">
            <div className="flex items-center justify-between text-xs px-1 text-stone-400">
              <span className="font-bold uppercase tracking-wider text-[11px] font-['Outfit']">
                Kitchen Breakdown ({ordersList.length})
              </span>
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px]">
                Confirmed
              </span>
            </div>

            <div className="max-h-[36vh] overflow-y-auto no-scrollbar space-y-2 pr-0.5">
              {ordersList.map((ord, idx) => {
                const ordId = ord?.id || `ORD-${idx + 1}`;
                const ordShopName = ord?.shop_name || ord?.shopName || `Kitchen #${idx + 1}`;
                const ordShopAddress = ord?.shop_address || ord?.shopAddress || 'Vrindavan Dham';
                const ordTotal = ord?.total_amount || ord?.totalAmount || ord?.total || 0;
                const ordItems = Array.isArray(ord?.items)
                  ? ord.items
                  : (typeof ord?.items === 'string'
                      ? (() => { try { return JSON.parse(ord.items); } catch { return []; } })()
                      : []);

                return (
                  <div key={ordId} className="w-full bg-[#151314] border border-white/10 rounded-2xl p-3 text-left shadow-inner space-y-2">
                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-white/[0.06]">
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <Store className="w-3.5 h-3.5 text-[#FD9139] shrink-0" />
                        <span className="font-bold text-white text-xs truncate font-['Outfit']">{ordShopName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleCopyOrderId(ordId, e)}
                        className="font-mono font-bold text-[10px] text-[#FD9139] bg-white/[0.04] px-1.5 py-0.5 rounded border border-[#FD9139]/25 flex items-center gap-1 hover:bg-white/[0.08] active:scale-95 transition-all shrink-0 cursor-pointer"
                        title="Copy Order ID"
                      >
                        <span>#{ordId.length > 8 ? ordId.slice(-6) : ordId}</span>
                        {copiedId === ordId ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-stone-400" />}
                      </button>
                    </div>

                    <p className="text-[10px] text-stone-400 truncate pl-0.5">{ordShopAddress}</p>

                    {/* Items summary */}
                    <div className="text-[11px] text-stone-300 space-y-1 bg-black/30 p-2 rounded-xl border border-white/[0.04]">
                      {ordItems.map((it, itIdx) => (
                        <div key={itIdx} className="flex justify-between items-center text-[11px]">
                          <span className="truncate pr-2 text-stone-300">
                            <strong className="text-white font-bold">{it.quantity}x</strong> {it.name}
                          </span>
                          <span className="font-semibold text-stone-200 shrink-0">₹{(Number(it.price) || 0) * (Number(it.quantity) || 1)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Kitchen Total */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-[10px] text-stone-400 font-medium">Order Total</span>
                      <span className="font-black text-white font-['Outfit'] text-xs sm:text-sm">₹{ordTotal}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Combined Grand Total Footer Pill */}
            <div className="w-full bg-[#181617] border border-[#FD9139]/30 rounded-xl p-2.5 flex items-center justify-between text-xs">
              <span className="text-stone-300 font-bold font-['Outfit']">Grand Total ({ordersList.length} Orders)</span>
              <span className="font-black text-[#FD9139] text-base font-['Outfit']">₹{grandTotal}</span>
            </div>
          </div>
        ) : (
          /* Single Order Details Receipt Card */
          <div className="w-full bg-[#151314] border border-white/10 rounded-2xl p-4 space-y-2.5 mb-5 text-left shadow-inner">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.08]">
              <span className="text-stone-400 font-medium">Order ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-xs sm:text-sm text-[#FD9139] tracking-wider bg-white/[0.04] px-2 py-0.5 rounded-md border border-[#FD9139]/25 truncate max-w-[190px]">
                  #{orderId}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopyOrderId(orderId, e)}
                  className="p-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-stone-400 hover:text-white transition-colors cursor-pointer"
                  title="Copy Order ID"
                >
                  {copiedId === orderId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-stone-400" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <div className="flex items-center gap-2 text-stone-200 truncate max-w-[210px]">
                <MapPin className="w-3.5 h-3.5 text-[#FD9139] shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="truncate font-semibold block">{shopName}</span>
                  <span className="text-[10px] text-stone-400 truncate block">{shopAddress}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-black text-white font-['Outfit'] text-sm block">₹{totalAmount}</span>
                {itemsCount > 0 && <span className="text-[10px] text-stone-400 block">{itemsCount} {itemsCount === 1 ? 'item' : 'items'}</span>}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-white/[0.05]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-medium text-stone-300">Est. Delivery</span>
              </div>
              <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                25–35 mins
              </span>
            </div>
          </div>
        )}

        {/* Action CTAs */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              const targetId = isMultiOrder ? ordersList[0]?.id : (order?.id || singleOrder?.id);
              onTrackOrder?.(targetId);
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FD9139] to-[#FCA65E] hover:brightness-110 active:scale-[0.98] text-stone-950 font-black text-xs uppercase tracking-wider font-['Outfit'] shadow-[0_8px_25px_rgba(253,145,57,0.35)] flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>{isMultiOrder ? 'Track Active Orders' : 'Track Live Order'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.6]" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            Explore More Prasad
          </button>
        </div>

      </div>
    </div>
  );
}
