import { useState, useCallback } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Bell, X, Check, Trash2, CheckCheck } from 'lucide-react';

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
    }, 220);
  }, [closing, onClose]);

  if (!isOpen) return null;

  const handleNotificationItemClick = (id, orderId) => {
    toggleNotificationRead(id, true);
    if (onNotificationClick && orderId) {
      onNotificationClick(orderId);
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAnimatedClose();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 sm:absolute sm:inset-auto sm:top-24 sm:right-6 sm:bg-transparent sm:p-0 sm:w-96 apple-overlay ${closing ? 'closing' : ''}`}
    >
      <div className={`w-full max-w-md bg-[#242021] border border-white/10 text-white rounded-[32px] sm:rounded-[36px] shadow-[0_25px_70px_rgba(0,0,0,0.7)] relative overflow-hidden apple-dropdown-spring ${closing ? 'closing' : ''}`}>
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1E1B1C]">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#E0FF33]" />
            <h3 className="font-black text-sm text-white font-['Outfit']">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-[#E0FF33] text-[#1E1B1C] text-[10px] font-black px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button 
            onClick={handleAnimatedClose}
            className="w-7 h-7 rounded-full bg-[#282526] hover:bg-[#322E30] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs apple-tap-target border border-white/5"
          >
            <X size={14} />
          </button>
        </div>

        {/* List */}
        <div className="max-h-[26rem] overflow-y-auto divide-y divide-white/5 no-scrollbar">
          {notifications.length === 0 ? (
            <div className="p-8 text-zinc-500 text-center text-xs font-medium flex flex-col items-center gap-2">
              <Bell size={24} className="text-zinc-600 opacity-60" />
              <span>No notifications yet.</span>
            </div>
          ) : (
            notifications.map(n => {
              const time = n.createdAt?.toMillis 
                ? new Date(n.createdAt.toMillis()).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }) 
                : 'Just now';
              
              return (
                <div 
                  key={n.id} 
                  className={`p-4 flex items-start gap-3 transition-colors ${n.read ? 'bg-[#242021]' : 'bg-[#1E1B1C]'}`}
                >
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNotificationRead(n.id, !n.read);
                    }}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors mt-0.5 cursor-pointer apple-tap-target ${
                      n.read 
                        ? 'border-[#E0FF33] bg-[#E0FF33] text-[#1E1B1C]' 
                        : 'border-zinc-600 bg-transparent hover:border-[#E0FF33]'
                    }`}
                    title={n.read ? "Mark as unread" : "Mark as read"}
                  >
                    {n.read && <Check size={10} strokeWidth={3} />}
                  </button>

                  <div 
                    className="flex-1 min-w-0 cursor-pointer" 
                    onClick={() => handleNotificationItemClick(n.id, n.orderId)}
                  >
                    <p className={`text-xs ${n.read ? 'text-zinc-400 font-medium' : 'text-white font-bold'}`}>{n.message}</p>
                    <p className="text-[10px] text-zinc-500 mt-1 font-semibold">{time}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Actions Footer */}
        {notifications.length > 0 && (
          <div className="p-3 bg-[#1E1B1C] border-t border-white/10 flex justify-between gap-2">
            <button
              onClick={markAllRead}
              className="text-[11px] font-bold text-[#E0FF33] hover:underline flex items-center gap-1 cursor-pointer apple-tap-target px-2 py-1"
            >
              <CheckCheck size={13} />
              <span>Mark all read</span>
            </button>
            <button
              onClick={clearAllNotifications}
              className="text-[11px] font-bold text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer apple-tap-target px-2 py-1"
            >
              <Trash2 size={13} />
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
