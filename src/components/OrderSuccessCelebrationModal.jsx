import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ArrowRight, Sparkles, Clock, MapPin, X, Store, Copy, Check, KeyRound } from 'lucide-react';
import FoodyOrderHop from '../foody/FoodyOrderHop';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { getOrderDisplayToken } from '../services/supabase/orders.service';
import { getOrderOTP } from '../services/supabase/riders.service';

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

  const isPickup = singleOrder?.order_type === 'pickup' || singleOrder?.orderType === 'pickup' || singleOrder?.delivery_type === 'pickup';
  const orderOtp = getOrderOTP(singleOrder, isPickup ? 'pickup' : 'delivery') || '';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-success-title"
        className="preserve-dark relative w-full max-w-[400px] bg-[#FFFDF9] dark:bg-[#1E1B1C] border border-amber-500/25 dark:border-[#FD9139]/30 rounded-[36px] p-6 sm:p-7 shadow-[0_25px_80px_rgba(28,25,23,0.18),0_0_50px_rgba(253,145,57,0.12)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(253,145,57,0.18)] flex flex-col items-center text-center overflow-hidden animate-in zoom-in-95 duration-200"
      >
        
        {/* Ambient Warm Radial Glows */}
        <div className="absolute -top-24 inset-x-0 h-48 bg-gradient-to-b from-[#FD9139]/20 via-[#FD9139]/8 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-[#FD9139]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4.5 right-4.5 z-20 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.16] text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white flex items-center justify-center transition-all active:scale-95 border border-stone-200 dark:border-white/10"
          aria-label="Close"
        >
          <X className="w-4 h-4 stroke-[2.4]" />
        </button>

        {/* Sacred Header Pill */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 dark:bg-[#FD9139]/12 border border-amber-500/25 dark:border-[#FD9139]/30 text-amber-800 dark:text-[#FD9139] text-[11px] font-bold tracking-wider uppercase font-['Outfit'] shadow-xs mb-3">
          <Sparkles className="w-3 h-3 text-amber-600 dark:text-[#FD9139]" />
          <span>श्री धाम वृन्दावन • राधे राधे</span>
        </div>

        {/* Mascot Stage with Elegant Glowing Medallion (Warm Ivory Medallion in Light, Obsidian in Dark) */}
        <div 
          onClick={() => hopRef.current?.play()}
          title="Tap squirrel to replay celebration"
          className="relative my-1 cursor-pointer select-none active:scale-95 transition-transform flex items-center justify-center group"
        >
          {/* Circular halo ring with animated gentle pulse */}
          <div className="absolute w-[184px] h-[184px] rounded-full bg-gradient-to-tr from-[#FD9139]/25 to-amber-300/15 blur-xl pointer-events-none" />
          <div className="relative w-[172px] h-[172px] rounded-full bg-gradient-to-b from-[#FFFDF9] via-amber-50/70 to-orange-50/60 dark:from-[#181617] dark:to-[#121011] border-2 border-amber-400/40 dark:border-[#FD9139]/35 shadow-[0_10px_30px_rgba(203,120,92,0.15),inset_0_2px_12px_rgba(253,145,57,0.15)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.6),inset_0_2px_12px_rgba(253,145,57,0.15)] flex items-center justify-center overflow-hidden">
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
            <span className="w-5 h-5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/35 dark:border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
            <h2 id="order-success-title" className="text-2xl font-black text-stone-950 dark:text-white font-['Outfit'] tracking-tight">
              {isMultiOrder ? `${ordersList.length} Orders Placed!` : 'Order Placed!'}
            </h2>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-300 max-w-[310px] leading-relaxed mx-auto font-medium">
            {isMultiOrder
              ? `Your prasad is being freshly prepared across ${ordersList.length} kitchens in Vrindavan Dham.`
              : 'Your sacred Satvik prasad is being prepared fresh with pure desi ghee.'}
          </p>
        </div>

        {/* Multi-Order Segregated List OR Single Order Receipt Card */}
        {isMultiOrder ? (
          <div className="w-full space-y-2 mb-4 text-left">
            <div className="flex items-center justify-between text-xs px-1 text-stone-600 dark:text-stone-400">
              <span className="font-bold uppercase tracking-wider text-[11px] font-['Outfit']">
                Kitchen Breakdown ({ordersList.length})
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25 text-[10px]">
                Confirmed
              </span>
            </div>

            <div className="max-h-[36vh] overflow-y-auto no-scrollbar space-y-2 pr-0.5">
              {ordersList.map((ord, idx) => {
                const ordId = ord?.id || `ORD-${idx + 1}`;
                const ordShopName = ord?.shop_name || ord?.shopName || `Kitchen #${idx + 1}`;
                const ordShopAddress = ord?.shop_address || ord?.shopAddress || 'Vrindavan Dham';
                const ordTotal = ord?.total_amount || ord?.totalAmount || ord?.total || 0;
                const ordIsPickup = ord?.order_type === 'pickup' || ord?.orderType === 'pickup' || ord?.delivery_type === 'pickup';
                const ordOtp = getOrderOTP(ord, ordIsPickup ? 'pickup' : 'delivery') || '';
                const ordItems = Array.isArray(ord?.items)
                  ? ord.items
                  : (typeof ord?.items === 'string'
                      ? (() => { try { return JSON.parse(ord.items); } catch { return []; } })()
                      : []);

                return (
                  <div key={ordId} className="w-full bg-white dark:bg-[#151314] border border-stone-200/90 dark:border-white/10 rounded-2xl p-3 text-left shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-stone-200/70 dark:border-white/[0.06]">
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <Store className="w-3.5 h-3.5 text-[#FD9139] shrink-0" />
                        <span className="font-bold text-stone-900 dark:text-white text-xs truncate font-['Outfit']">{ordShopName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleCopyOrderId(getOrderDisplayToken(ord), e)}
                          className="font-mono font-bold text-[10px] text-amber-800 dark:text-[#FD9139] bg-amber-500/10 dark:bg-white/[0.04] px-2 py-0.5 rounded border border-amber-500/25 dark:border-[#FD9139]/25 flex items-center gap-1 hover:bg-amber-500/20 dark:hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                          title="Copy Order Token"
                        >
                          <span>{getOrderDisplayToken(ord)}</span>
                          {copiedId === getOrderDisplayToken(ord) ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5 text-stone-400" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate pl-0.5">{ordShopAddress}</p>

                    {/* Delivery / Pickup OTP pill */}
                    {ordOtp && (
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-black/40 border border-amber-500/20 dark:border-[#FD9139]/20 text-[11px]">
                        <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
                          <KeyRound className="w-3 h-3 text-[#FD9139]" />
                          <span className="font-medium text-[10px]">{ordIsPickup ? 'Pickup PIN' : 'Delivery OTP'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-black text-xs text-amber-800 dark:text-[#FD9139] tracking-wider">{ordOtp}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyOrderId(ordOtp, e)}
                            className="p-1 hover:text-stone-900 dark:hover:text-white text-stone-400 cursor-pointer"
                            title="Copy OTP"
                          >
                            {copiedId === ordOtp ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Items summary */}
                    <div className="text-[11px] text-stone-700 dark:text-stone-300 space-y-1 bg-stone-50 dark:bg-black/30 p-2 rounded-xl border border-stone-200/60 dark:border-white/[0.04]">
                      {ordItems.map((it, itIdx) => (
                        <div key={itIdx} className="flex justify-between items-center text-[11px]">
                          <span className="truncate pr-2 text-stone-700 dark:text-stone-300">
                            <strong className="text-stone-950 dark:text-white font-bold">{it.quantity}x</strong> {it.name}
                          </span>
                          <span className="font-semibold text-stone-900 dark:text-stone-200 shrink-0">₹{(Number(it.price) || 0) * (Number(it.quantity) || 1)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Kitchen Total */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">Order Total</span>
                      <span className="font-black text-stone-950 dark:text-white font-['Outfit'] text-xs sm:text-sm">₹{ordTotal}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Combined Grand Total Footer Pill */}
            <div className="w-full bg-white dark:bg-[#181617] border border-amber-500/30 dark:border-[#FD9139]/30 rounded-xl p-2.5 flex items-center justify-between text-xs shadow-xs">
              <span className="text-stone-700 dark:text-stone-300 font-bold font-['Outfit']">Grand Total ({ordersList.length} Orders)</span>
              <span className="font-black text-amber-800 dark:text-[#FD9139] text-base font-['Outfit']">₹{grandTotal}</span>
            </div>
          </div>
        ) : (
          /* Single Order Details Receipt Card */
          <div className="w-full bg-white dark:bg-[#151314] border border-stone-200/90 dark:border-white/10 rounded-2xl p-4 space-y-2.5 mb-5 text-left shadow-xs">
            {/* Order Token Row */}
            <div className="flex items-center justify-between text-xs pb-2 border-b border-stone-200/80 dark:border-white/[0.08]">
              <span className="text-stone-600 dark:text-stone-400 font-medium">Order Token</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-xs sm:text-sm text-amber-800 dark:text-[#FD9139] tracking-wider bg-amber-500/10 dark:bg-white/[0.04] px-2.5 py-1 rounded-md border border-amber-500/25 dark:border-[#FD9139]/30 truncate max-w-[190px]">
                  {getOrderDisplayToken(order)}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopyOrderId(getOrderDisplayToken(order), e)}
                  className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-stone-500 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
                  title="Copy Order Token"
                >
                  {copiedId === getOrderDisplayToken(order) ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                </button>
              </div>
            </div>

            {/* Delivery Verification OTP Row */}
            {orderOtp && (
              <div className="flex items-center justify-between text-xs pb-2 border-b border-stone-200/80 dark:border-white/[0.08]">
                <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
                  <KeyRound className="w-3.5 h-3.5 text-[#FD9139]" />
                  <span className="font-medium">{isPickup ? 'Pickup PIN' : 'Delivery OTP'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-sm tracking-widest text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/25">
                    {orderOtp}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCopyOrderId(orderOtp, e)}
                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-stone-500 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
                    title="Copy OTP"
                  >
                    {copiedId === orderOtp ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                  </button>
                </div>
              </div>
            )}

            {/* Shop & Amount */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <div className="flex items-center gap-2 text-stone-900 dark:text-stone-200 truncate max-w-[210px]">
                <MapPin className="w-3.5 h-3.5 text-[#FD9139] shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="truncate font-bold block text-stone-950 dark:text-white text-xs sm:text-sm">{shopName}</span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate block font-medium">{shopAddress}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-black text-amber-800 dark:text-[#FD9139] font-['Outfit'] text-base sm:text-lg block font-mono">₹{totalAmount}</span>
                {itemsCount > 0 && <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-semibold">{itemsCount} {itemsCount === 1 ? 'item' : 'items'}</span>}
              </div>
            </div>

            {/* Est Delivery */}
            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-stone-200/80 dark:border-white/[0.05]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                <span className="font-medium text-stone-700 dark:text-stone-300">Est. Delivery</span>
              </div>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
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
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FD9139] to-[#FCA65E] hover:brightness-105 active:scale-[0.98] text-stone-950 font-black text-xs uppercase tracking-wider font-['Outfit'] shadow-[0_8px_25px_rgba(253,145,57,0.35)] flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>{isMultiOrder ? 'Track Active Orders' : 'Track Live Order'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.6]" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-stone-500 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            Explore More Prasad
          </button>
        </div>

      </div>
    </div>
  );
}
