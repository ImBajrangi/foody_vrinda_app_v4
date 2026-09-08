import { useEffect } from 'react';
import { Volume2, VolumeX, ChefHat, Truck, ShieldCheck, Sparkles, X } from 'lucide-react';

export default function ActiveAlarmBanner({ isPlaying, activeAlert, onSilence, onActionClick }) {
  useEffect(() => {
    if (!isPlaying) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        onSilence();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, onSilence]);

  if (!isPlaying || !activeAlert) return null;

  const role = activeAlert.role || 'kitchen';
  const orderId = activeAlert.orderId ? activeAlert.orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : '';
  const order = activeAlert.order;

  const getRoleBadge = () => {
    switch (role) {
      case 'kitchen':
        return {
          icon: ChefHat,
          title: 'NEW ORDER RECEIVED IN KITCHEN!',
          subtitle: 'Immediate Preparation Required',
          accent: 'bg-amber-400 text-black',
          border: 'border-amber-400/40',
          glow: 'shadow-[0_0_25px_rgba(251,191,36,0.5)]',
          btnBg: 'bg-amber-400 hover:bg-amber-300 text-black'
        };
      case 'delivery':
        return {
          icon: Truck,
          title: 'ORDER READY FOR RIDER PICKUP!',
          subtitle: 'Collect Prasad from Kitchen Counter',
          accent: 'bg-cyan-400 text-black',
          border: 'border-cyan-400/40',
          glow: 'shadow-[0_0_25px_rgba(34,211,238,0.5)]',
          btnBg: 'bg-cyan-400 hover:bg-cyan-300 text-black'
        };
      case 'owner':
        return {
          icon: ShieldCheck,
          title: 'ADMIN ESCALATION DISPATCH',
          subtitle: 'Live Order Alert',
          accent: 'bg-[#E0FF33] text-black',
          border: 'border-[#E0FF33]/40',
          glow: 'shadow-[0_0_25px_rgba(224,255,51,0.5)]',
          btnBg: 'bg-[#E0FF33] hover:bg-[#d8fa26] text-black'
        };
      default:
        return {
          icon: Sparkles,
          title: 'ORDER STATUS UPDATE',
          subtitle: 'Live Notification',
          accent: 'bg-[#E0FF33] text-black',
          border: 'border-[#E0FF33]/40',
          glow: 'shadow-[0_0_25px_rgba(224,255,51,0.5)]',
          btnBg: 'bg-[#E0FF33] text-black'
        };
    }
  };

  const badge = getRoleBadge();
  const IconComponent = badge.icon;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999999] w-[95%] max-w-lg animate-bounce-short">
      <div className={`p-4 rounded-3xl bg-[#151314]/95 backdrop-blur-xl border-2 ${badge.border} ${badge.glow} shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-white transition-all`}>
        
        {/* Left: Icon & Title */}
        <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
          <div className={`w-11 h-11 rounded-2xl ${badge.accent} flex items-center justify-center font-black shrink-0 animate-pulse`}>
            <IconComponent className="w-6 h-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider font-['Outfit'] text-[#E0FF33]">
                {badge.title}
              </span>
              {orderId && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15">
                  #{orderId}
                </span>
              )}
            </div>
            
            <p className="text-[11px] text-zinc-300 font-medium truncate mt-0.5">
              {order?.customerName ? `${order.customerName} · ${order.items?.length || 1} items` : badge.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            onClick={onSilence}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-white/10 flex-1 sm:flex-none"
            title="Silence alarm (Space / Esc)"
          >
            <VolumeX className="w-4 h-4 text-rose-400" />
            <span>Silence</span>
          </button>

          {onActionClick && (
            <button
              onClick={() => {
                onSilence();
                onActionClick(activeAlert);
              }}
              className={`px-4 py-2.5 rounded-2xl ${badge.btnBg} font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md flex-1 sm:flex-none font-['Outfit']`}
            >
              <span>View</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
