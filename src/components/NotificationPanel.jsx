import { useState, useCallback } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Bell, X, Check, Trash2, CheckCheck, Sparkles, Clock, ArrowRight, BellOff } from 'lucide-react';

export default function NotificationPanel({ isOpen, onClose, onNotificationClick }) {
  const { 
    notifications, 
    unreadCount, 
    toggleNotificationRead, 
    markAllRead, 
    clearAllNotifications 
  } = useNotifications();

  const [closing, setClosing] = useState(false);

  const handleAnimatedClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 180);
  }, [closing, onClose]);

  if (!isOpen) return null;

  const handleNotificationItemClick = (id, orderId) => {
    toggleNotificationRead(id, true);
    if (onNotificationClick && orderId) {
      onNotificationClick(orderId);
      handleAnimatedClose();
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAnimatedClose();
      }}
      className={`fixed inset-0 z-[99999] flex items-start justify-center sm:justify-end p-4 pt-20 sm:pt-22 sm:pr-6 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
        closing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div 
        className={`w-full max-w-[380px] bg-[#161415] border border-white/[0.08] text-white rounded-[26px] shadow-[0_24px_60px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.06)] relative overflow-hidden transition-all duration-200 transform ${
          closing ? 'scale-95 opacity-0 translate-y-[-6px]' : 'scale-100 opacity-100 translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex justify-between items-center bg-[#1B191A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/90">
              <Bell size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white font-['Outfit'] tracking-tight">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-[#E0FF33] text-black text-[10px] font-black px-2 py-0.5 rounded-full leading-tight shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/40 font-['Plus_Jakarta_Sans']">Real-time alerts & updates</p>
            </div>
          </div>

          <button 
            onClick={handleAnimatedClose}
            className="w-7 h-7 rounded-full bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 flex items-center justify-center text-white/50 hover:text-white transition-all border border-white/[0.06] cursor-pointer"
            title="Close"
          >
            <X size={13} />
          </button>
        </div>

        {/* Notification Feed List */}
        <div className="max-h-[24rem] overflow-y-auto p-2 no-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-12 px-6 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/40 shadow-inner">
                <BellOff size={20} className="text-white/40" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white/90 font-['Outfit']">All caught up</p>
                <p className="text-xs text-white/40 font-['Plus_Jakarta_Sans'] max-w-[220px]">
                  No new notifications right now.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map(n => {
                const time = n.createdAt?.toMillis 
                  ? new Date(n.createdAt.toMillis()).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) 
                  : (n.createdAt ? new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : 'Just now');
                
                const isUnread = !n.read;

                return (
                  <div 
                    key={n.id} 
                    className={`p-3.5 rounded-2xl flex items-start gap-3 transition-all cursor-pointer border ${
                      isUnread 
                        ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]' 
                        : 'bg-transparent border-transparent hover:bg-white/[0.02]'
                    }`}
                    onClick={() => handleNotificationItemClick(n.id, n.orderId)}
                  >
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNotificationRead(n.id, !n.read);
                      }}
                      className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${
                        n.read 
                          ? 'border-white/20 bg-white/10 text-white/60' 
                          : 'border-[#E0FF33] bg-[#E0FF33]/10 text-[#E0FF33]'
                      }`}
                      title={n.read ? "Mark unread" : "Mark read"}
                    >
                      {n.read ? <Check size={10} strokeWidth={2.5} /> : <span className="w-1.5 h-1.5 rounded-full bg-[#E0FF33]" />}
                    </button>

                    <div className="flex-1 min-w-0 space-y-1">
                      <p className={`text-xs leading-relaxed ${isUnread ? 'text-white font-semibold' : 'text-white/60 font-normal'}`}>
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {time}
                        </span>
                        {n.orderId && (
                          <span className="text-[#E0FF33] font-semibold flex items-center gap-0.5 hover:underline">
                            View Order <ArrowRight size={9} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 bg-[#1B191A] border-t border-white/[0.06] flex justify-between items-center">
            <button
              onClick={markAllRead}
              className="text-[11px] font-medium text-white/60 hover:text-white flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all active:scale-95"
            >
              <CheckCheck size={13} className="text-[#E0FF33]" />
              <span>Mark all as read</span>
            </button>
            <button
              onClick={clearAllNotifications}
              className="text-[11px] font-medium text-white/40 hover:text-white/70 flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all active:scale-95"
            >
              <Trash2 size={12} />
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
