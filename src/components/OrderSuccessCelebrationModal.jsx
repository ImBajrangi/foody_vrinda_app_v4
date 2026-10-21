import React, { useEffect, useRef } from 'react';
import { CheckCircle2, ArrowRight, Sparkles, Clock, MapPin, X } from 'lucide-react';
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

  if (!isOpen) return null;

  const orderShortId = order?.id ? String(order.id).slice(-6).toUpperCase() : 'FV-108';
  const shopName = order?.shop_name || order?.shopName || 'Brajdham Kitchen';
  const totalAmount = order?.total || order?.totalAmount || order?.finalTotal || '0';

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
        <div className="space-y-1.5 mt-3.5 mb-4">
          <div className="inline-flex items-center justify-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
            <h2 id="order-success-title" className="text-2xl font-black text-white font-['Outfit'] tracking-tight">
              Order Placed!
            </h2>
          </div>
          <p className="text-xs text-stone-300 max-w-[290px] leading-relaxed mx-auto font-medium">
            Your sacred Satvik prasad is being prepared fresh with pure desi ghee.
          </p>
        </div>

        {/* Order Details Receipt Card (Crisp Contrast & Hierarchy) */}
        <div className="w-full bg-[#151314] border border-white/10 rounded-2xl p-4 space-y-2.5 mb-5 text-left shadow-inner">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.08]">
            <span className="text-stone-400 font-medium">Order ID</span>
            <span className="font-mono font-black text-sm text-[#FD9139] tracking-wider bg-white/[0.04] px-2 py-0.5 rounded-md border border-[#FD9139]/25">
              #{orderShortId}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-0.5">
            <div className="flex items-center gap-2 text-stone-200 truncate max-w-[210px]">
              <MapPin className="w-3.5 h-3.5 text-[#FD9139] shrink-0" />
              <span className="truncate font-semibold">{shopName}</span>
            </div>
            <span className="font-black text-white font-['Outfit'] text-sm">₹{totalAmount}</span>
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

        {/* Action CTAs */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              onTrackOrder?.(order?.id);
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FD9139] to-[#FCA65E] hover:brightness-110 active:scale-[0.98] text-stone-950 font-black text-xs uppercase tracking-wider font-['Outfit'] shadow-[0_8px_25px_rgba(253,145,57,0.35)] flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Track Live Order</span>
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
