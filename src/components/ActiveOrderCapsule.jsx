import { useState, useEffect, useRef } from 'react';
import { 
  Bike, 
  Utensils, 
  PackageCheck, 
  Sparkles, 
  ChevronUp, 
  Clock
} from 'lucide-react';
import { subscribeSingleCloudOrder } from '../supabase';

/**
 * Floating Dynamic Island Live Order Activity Capsule
 * Standard: Vrinda Tours Apple Dynamic Island Live Ride Capsule
 * Supports swipe-down to dismiss / hide effortlessly with haptic-like fluid animation.
 */
export default function ActiveOrderCapsule({ order, onClick, onClose, allShops = [], hasBottomBar = false, isEmbedded = false }) {
  const [liveOrder, setLiveOrder] = useState(order);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const hasMovedRef = useRef(false);

  useEffect(() => {
    setLiveOrder(order);
    setIsDismissed(false);
    setIsDismissing(false);
  }, [order?.id, order?.status]);

  // Realtime Supabase PostgreSQL live updates
  useEffect(() => {
    if (!order?.id) return;
    const unsub = subscribeSingleCloudOrder(order.id, (updated) => {
      if (updated) {
        setLiveOrder(prev => ({ ...prev, ...updated }));
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, [order?.id]);

  const currentOrder = liveOrder || order;
  if (!currentOrder || isDismissed || currentOrder.status === 'cancelled' || currentOrder.status === 'returned') {
    return null;
  }

  const status = currentOrder.status || 'new';
  const shop = (allShops && allShops.length > 0)
    ? (allShops.find(s => s.id === (currentOrder.shopId || currentOrder.shop_id)) || allShops[0])
    : { name: 'Prem Mandir Prasad Kitchen' };

  const isCompleted = status === 'completed' || status === 'delivered';

  // Dynamic Status Metadata with Theme-Native Palette
  const getStatusInfo = () => {
    switch (status) {
      case 'new':
        return {
          title: 'Order Confirmed',
          icon: PackageCheck,
          accentClass: 'text-amber-600 dark:text-[#E0FF33]',
          bgClass: 'bg-amber-500/10 dark:bg-[#E0FF33]/15',
          borderClass: 'border-amber-500/25 dark:border-[#E0FF33]/30',
          timeText: '3–9m'
        };
      case 'preparing':
        return {
          title: 'Cooking in Ghee',
          icon: Utensils,
          accentClass: 'text-amber-600 dark:text-[#E0FF33]',
          bgClass: 'bg-amber-500/10 dark:bg-[#E0FF33]/15',
          borderClass: 'border-amber-500/25 dark:border-[#E0FF33]/30',
          timeText: '5–12m'
        };
      case 'ready_for_pickup':
        return {
          title: 'Prasad Packed',
          icon: PackageCheck,
          accentClass: 'text-emerald-600 dark:text-emerald-400',
          bgClass: 'bg-emerald-500/10 dark:bg-emerald-400/15',
          borderClass: 'border-emerald-500/25 dark:border-emerald-400/30',
          timeText: 'Ready'
        };
      case 'out_for_delivery':
        return {
          title: 'Sarathi on the way',
          icon: Bike,
          accentClass: 'text-amber-600 dark:text-[#E0FF33]',
          bgClass: 'bg-amber-500/10 dark:bg-[#E0FF33]/15',
          borderClass: 'border-amber-500/25 dark:border-[#E0FF33]/30',
          timeText: 'Arriving'
        };
      case 'completed':
      case 'delivered':
        return {
          title: 'Prasad Delivered',
          icon: Sparkles,
          accentClass: 'text-emerald-600 dark:text-emerald-400',
          bgClass: 'bg-emerald-500/10 dark:bg-emerald-400/15',
          borderClass: 'border-emerald-500/25 dark:border-emerald-400/30',
          timeText: 'Done'
        };
      default:
        return {
          title: 'Active Order',
          icon: Utensils,
          accentClass: 'text-amber-600 dark:text-[#E0FF33]',
          bgClass: 'bg-amber-500/10 dark:bg-[#E0FF33]/15',
          borderClass: 'border-amber-500/25 dark:border-[#E0FF33]/30',
          timeText: '3–9m'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const IconComponent = statusInfo.icon;
  const rawShopName = shop?.name || 'Prem Mandir';
  const cleanShop = rawShopName.replace(/^(Shri\s+|Prem\s+Mandir\s+)/i, '').replace(/\s+(Kitchen|Bhojnalaya|Prasad)$/i, '').trim() || 'Prem Mandir';

  // Touch / Pointer Swipe Up (Open Map) & Swipe Down (Hide) Handlers
  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    const startY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0]?.clientY) || 0;
    dragStartYRef.current = startY;

    const onMove = (ev) => {
      const currentY = ev.clientY !== undefined ? ev.clientY : (ev.touches && ev.touches[0]?.clientY) || 0;
      const diff = currentY - startY;
      if (Math.abs(diff) > 3) {
        hasMovedRef.current = true;
        setDragY(diff);
      }
    };

    const onEnd = (ev) => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);

      const currentY = ev.clientY !== undefined ? ev.clientY : (ev.changedTouches && ev.changedTouches[0]?.clientY) || (dragStartYRef.current + dragY);
      const finalDiff = currentY - dragStartYRef.current;

      if (finalDiff < -15) {
        // Swiped UP -> Open Live Map Tracking smoothly
        setDragY(0);
        if (onClick) onClick();
      } else if (finalDiff > 20) {
        // Swiped DOWN -> Hide capsule
        setIsDismissing(true);
        setTimeout(() => {
          setIsDismissed(true);
          if (onClose) onClose();
        }, 180);
      } else {
        setDragY(0);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onEnd, { passive: true });
    window.addEventListener('pointercancel', onEnd, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseup', onEnd, { passive: true });
  };

  const handleClick = (e) => {
    if (hasMovedRef.current || isDismissing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) onClick(e);
  };

  return (
    <div
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      role="button"
      tabIndex={0}
      title="Swipe up or tap to open live map tracking • Swipe down to hide"
      style={
        isEmbedded
          ? {
              transform: isDismissing 
                ? 'translateY(40px) scale(0.92)' 
                : dragY !== 0 
                  ? `translateY(${dragY}px) scale(${dragY < 0 ? 1.02 : 0.98})` 
                  : 'translateY(0)',
              opacity: isDismissing ? 0 : dragY > 0 ? Math.max(0.1, 1 - dragY / 70) : 1,
              transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
              touchAction: 'none'
            }
          : {
              bottom: hasBottomBar 
                ? 'calc(104px + env(safe-area-inset-bottom, 0px))' 
                : 'calc(16px + env(safe-area-inset-bottom, 0px))',
              transform: isDismissing 
                ? 'translate(-50%, 40px) scale(0.92)' 
                : dragY !== 0 
                  ? `translate(-50%, ${dragY}px) scale(${dragY < 0 ? 1.02 : 0.98})` 
                  : 'translate(-50%, 0)',
              opacity: isDismissing ? 0 : dragY > 0 ? Math.max(0.1, 1 - dragY / 70) : 1,
              transition: isDragging 
                ? 'none' 
                : 'bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
              touchAction: 'none'
            }
      }
      className={`${
        isEmbedded ? 'relative' : 'fixed left-1/2 z-[45]'
      } flex items-center gap-2.5 h-[44px] px-3.5 rounded-full bg-white/95 dark:bg-[#1E1B1C]/95 text-stone-900 dark:text-white border border-stone-200/90 dark:border-white/10 shadow-[0_10px_30px_rgba(28,25,23,0.12)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl cursor-pointer select-none hover:border-amber-500/40 dark:hover:border-[#E0FF33]/40 active:scale-[0.98] transition-all`}
    >
      {/* Theme Status Glyph Node */}
      <div className={`flex items-center justify-center w-7 h-7 rounded-full ${statusInfo.bgClass} border ${statusInfo.borderClass} shrink-0`}>
        <IconComponent className={`w-3.5 h-3.5 ${statusInfo.accentClass}`} />
      </div>

      {/* Clean Hierarchy with High Legibility */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-xs sm:text-[13px] font-black font-['Outfit'] text-stone-950 dark:text-white tracking-tight">
          {statusInfo.title}
        </span>
        <span className="text-stone-300 dark:text-zinc-600 text-[11px] font-bold">•</span>
        <span className="text-xs font-bold text-stone-600 dark:text-zinc-300">
          {cleanShop}
        </span>
      </div>

      {/* Trailing Theme-Native Time Pill & Expand Trigger */}
      <div className="flex items-center gap-1.5 shrink-0 pl-1">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black font-['Outfit'] bg-amber-600 hover:bg-amber-700 dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] text-white dark:text-[#121011] shadow-xs shrink-0 transition-colors">
          <Clock className="w-3 h-3 stroke-[2.8]" />
          <span>{isCompleted ? 'Done' : statusInfo.timeText}</span>
        </div>
        <div className="w-5 h-5 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 border border-stone-200/80 dark:border-white/15 flex items-center justify-center text-stone-600 dark:text-white shrink-0 transition-colors">
          <ChevronUp className="w-3 h-3 stroke-[2.5]" />
        </div>
      </div>
    </div>
  );
}

