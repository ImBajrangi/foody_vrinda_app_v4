import { useState, useEffect } from 'react';
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
 * Zero ripple noise, compact typography with zero text clipping.
 */
export default function ActiveOrderCapsule({ order, onClick, allShops = [], hasBottomBar = false }) {
  const [liveOrder, setLiveOrder] = useState(order);

  useEffect(() => {
    setLiveOrder(order);
  }, [order]);

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
  if (!currentOrder || currentOrder.status === 'cancelled' || currentOrder.status === 'returned') {
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

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      title="Tap to view live order tracking map"
      style={{
        bottom: hasBottomBar 
          ? 'calc(80px + env(safe-area-inset-bottom, 0px))' 
          : 'calc(16px + env(safe-area-inset-bottom, 0px))',
        transition: 'bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease'
      }}
      className="fixed left-1/2 -translate-x-1/2 z-[45] flex items-center gap-2.5 h-[40px] px-3 sm:px-3.5 rounded-full bg-[#181617]/95 text-white border border-[#E0FF33]/35 shadow-[0_14px_36px_-6px_rgba(0,0,0,0.75),0_0_16px_rgba(224,255,51,0.12)] backdrop-blur-2xl cursor-pointer select-none hover:border-[#E0FF33]/70 hover:bg-[#201D1E] active:scale-[0.97] apple-modal-spring"
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

