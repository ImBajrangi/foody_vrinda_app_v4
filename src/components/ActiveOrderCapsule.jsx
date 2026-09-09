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

  // Dynamic Status Metadata
  const getStatusInfo = () => {
    switch (status) {
      case 'new':
        return {
          title: 'Order Confirmed',
          icon: PackageCheck,
          accent: '#E0FF33'
        };
      case 'preparing':
        return {
          title: 'Cooking in Ghee',
          icon: Utensils,
          accent: '#E0FF33'
        };
      case 'ready_for_pickup':
        return {
          title: 'Prasad Packed',
          icon: PackageCheck,
          accent: '#E0FF33'
        };
      case 'out_for_delivery':
        return {
          title: 'Sarathi on the way',
          icon: Bike,
          accent: '#E0FF33'
        };
      case 'completed':
      case 'delivered':
        return {
          title: 'Prasad Delivered',
          icon: Sparkles,
          accent: '#10B981'
        };
      default:
        return {
          title: 'Active Order',
          icon: Utensils,
          accent: '#E0FF33'
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
      } flex items-center gap-2.5 h-[40px] px-3 sm:px-3.5 rounded-full bg-[#181617]/95 text-white border border-[#E0FF33]/35 shadow-[0_14px_36px_-6px_rgba(0,0,0,0.75),0_0_16px_rgba(224,255,51,0.12)] backdrop-blur-2xl cursor-pointer select-none hover:border-[#E0FF33]/70 hover:bg-[#201D1E] active:scale-[0.97] transition-all`}
    >
      {/* Cute Solid Glyph Node (Zero distracting ripples) */}
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#242122] border border-[#E0FF33]/50 shrink-0">
        <IconComponent className="w-3.5 h-3.5 text-[#E0FF33]" />
      </div>

      {/* Clean Single-Row Hierarchy with Zero Clipping */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-xs font-black font-['Outfit'] text-white">
          {statusInfo.title}
        </span>
        <span className="text-zinc-500 text-[11px] font-bold">•</span>
        <span className="text-[11px] font-bold text-zinc-300">
          {cleanShop}
        </span>
      </div>

      {/* Trailing Dynamic Window Pill */}
      <div className="flex items-center gap-1.5 shrink-0 pl-0.5">
        <div className="flex items-center gap-1 bg-[#E0FF33]/15 border border-[#E0FF33]/30 px-2 py-0.5 rounded-full text-[10.5px] font-black text-[#E0FF33] font-['Outfit']">
          <Clock className="w-2.5 h-2.5" />
          <span>{isCompleted ? 'Done' : '3–9m'}</span>
        </div>
        <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-zinc-400">
          <ChevronUp className="w-2.5 h-2.5" />
        </div>
      </div>
    </div>
  );
}

