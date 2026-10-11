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
      <div className="relative w-full max-w-[420px] bg-[#1E1B1C] border border-amber-500/25 rounded-[32px] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_40px_rgba(253,145,57,0.15)] flex flex-col items-center text-center overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Subtle Ambient Saffron Glow in background */}
        <div className="absolute -top-24 -left-24 w-52 h-52 bg-[#FD9139]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-[#FD9139]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center transition-all active:scale-95"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Sacred Header Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-[#FD9139] text-[11px] font-bold tracking-wide mb-1">
          <Sparkles className="w-3 h-3 text-[#FD9139]" />
          <span>श्री धाम वृन्दावन • राधे राधे</span>
        </div>

        {/* Central Pure Vector Mascot Animation Stage */}
        <div 
          onClick={() => hopRef.current?.play()}
          title="Tap squirrel to replay celebration hop"
          className="relative my-0.5 cursor-pointer select-none active:scale-95 transition-transform"
        >
          <FoodyOrderHop
            ref={hopRef}
            width={210}
            background="transparent"
            autoplay={true}
          />
        </div>

        {/* Main Status Headline */}
        <div className="space-y-1 mt-1 mb-4">
          <div className="inline-flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 id="order-success-title" className="text-xl font-black text-white font-['Outfit'] tracking-tight">
              Order Placed!
            </h2>
          </div>
          <p className="text-xs text-stone-400 max-w-[280px] leading-relaxed mx-auto">
            Your sacred Satvik prasad is being prepared fresh with pure desi ghee.
          </p>
        </div>

        {/* Order Details Brief Card */}
        <div className="w-full bg-[#151314] border border-white/10 rounded-2xl p-3.5 space-y-2 mb-5 text-left">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
            <span className="text-stone-400">Order ID</span>
            <span className="font-mono font-bold text-[#FD9139]">#{orderShortId}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-stone-300 truncate max-w-[200px]">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">{shopName}</span>
            </div>
            <span className="font-bold text-white">₹{totalAmount}</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-400 pt-0.5">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>Est. Delivery</span>
            </div>
            <span className="font-semibold text-emerald-400">25–35 mins</span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="w-full flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              onTrackOrder?.(order?.id);
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FD9139] to-[#FCA65E] hover:brightness-105 active:scale-[0.98] text-stone-950 font-black text-sm tracking-wide shadow-lg shadow-[#FD9139]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Track Live Order</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            Explore More Prasad
          </button>
        </div>

      </div>
    </div>
  );
}
