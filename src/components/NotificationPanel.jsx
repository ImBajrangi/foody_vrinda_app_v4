import { useState, useCallback, useMemo } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  CheckCheck, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  BellOff, 
  Utensils, 
  Bike, 
  ShoppingBag,
  Gift,
  Info
} from 'lucide-react';

export default function NotificationPanel({ isOpen, onClose, onNotificationClick }) {
  const { 
    notifications, 
    unreadCount, 
    toggleNotificationRead, 
    markAllRead, 
    clearAllNotifications,
    deleteNotification
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [closing, setClosing] = useState(false);

  const handleAnimatedClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 180);
  }, [closing, onClose]);

  const readCount = useMemo(() => {
    return notifications.filter(n => n.read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return notifications.filter(n => !n.read);
    }
    if (activeFilter === 'read') {
      return notifications.filter(n => n.read);
    }
    return notifications;
  }, [notifications, activeFilter]);

  if (!isOpen) return null;

  const handleNotificationItemClick = (id, orderId) => {
    toggleNotificationRead(id, true);
    if (onNotificationClick && orderId) {
      onNotificationClick(orderId);
      handleAnimatedClose();
    }
  };

  // Helper to resolve icon by notification type / message
  const getNotificationIcon = (notif) => {
    const text = (notif.title + ' ' + notif.message).toLowerCase();
    if (text.includes('sarathi') || text.includes('rider') || text.includes('on the way') || text.includes('dispatched')) {
      return <Bike size={14} className="text-[#E0FF33]" />;
    }
    if (text.includes('cooking') || text.includes('prasad') || text.includes('bhog') || text.includes('kitchen') || text.includes('thali')) {
      return <Utensils size={14} className="text-amber-400" />;
    }
    if (text.includes('placed') || text.includes('order')) {
      return <ShoppingBag size={14} className="text-emerald-400" />;
    }
    if (text.includes('special') || text.includes('discount') || text.includes('offer') || notif.type === 'promo') {
      return <Gift size={14} className="text-purple-400" />;
    }
    return <Info size={14} className="text-cyan-400" />;
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp.toMillis ? timestamp.toMillis() : timestamp);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAnimatedClose();
      }}
      className={`fixed inset-0 z-[99999] flex items-start justify-center sm:justify-end p-4 pt-20 sm:pt-22 sm:pr-6 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
        closing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div 
        className={`w-full max-w-[400px] bg-[#1A1718] border border-white/10 text-white rounded-[28px] shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative overflow-hidden transition-all duration-200 transform ${
          closing ? 'scale-95 opacity-0 translate-y-[-6px]' : 'scale-100 opacity-100 translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-[#221F20]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E0FF33] shadow-inner">
              <Bell size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white font-['Outfit'] tracking-tight">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-[#E0FF33] text-black text-[10px] font-black px-2 py-0.5 rounded-full leading-tight shadow-[0_0_10px_rgba(224,255,51,0.4)]">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 font-['Plus_Jakarta_Sans']">Real-time alerts & order updates</p>
            </div>
          </div>

          <button 
            onClick={handleAnimatedClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-neutral-400 hover:text-white transition-all border border-white/5 cursor-pointer"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Segmented Filter Bar: All / Unread / Read */}
        <div className="px-4 py-2.5 bg-[#171415] border-b border-white/5 flex items-center gap-1.5">
          {[
            { id: 'all', label: 'All', count: notifications.length },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'read', label: 'Read', count: readCount }
          ].map(tab => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none border ${
                  isActive 
                    ? 'bg-[#E0FF33] text-[#1E1B1C] border-[#E0FF33] font-black shadow-[0_2px_8px_rgba(224,255,51,0.25)]' 
                    : 'bg-white/5 text-neutral-400 border-white/5 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-neutral-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Notification Feed List */}
        <div className="max-h-[26rem] overflow-y-auto p-2.5 space-y-2 no-scrollbar">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-6 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 shadow-inner">
                <BellOff size={22} className="text-neutral-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white font-['Outfit']">
                  {activeFilter === 'unread' 
                    ? "All caught up!" 
                    : activeFilter === 'read' 
                      ? "No read notifications" 
                      : "No notifications yet"}
                </p>
                <p className="text-xs text-neutral-400 font-['Plus_Jakarta_Sans'] max-w-[220px]">
                  {activeFilter === 'unread' 
                    ? "You've read all your active updates & order alerts." 
                    : "Live alerts and Prasad updates will appear here automatically."}
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map(n => {
              const isUnread = !n.read;
              const relativeTime = formatRelativeTime(n.createdAt);

              return (
                <div 
                  key={n.id} 
                  onClick={() => handleNotificationItemClick(n.id, n.orderId)}
                  className={`p-3.5 rounded-2xl flex items-start gap-3 transition-all cursor-pointer border relative group ${
                    isUnread 
                      ? 'bg-[#282526] border-white/10 hover:border-[#E0FF33]/40 shadow-sm' 
                      : 'bg-[#1E1B1C]/60 border-white/5 hover:bg-[#1E1B1C] opacity-80'
                  }`}
                >
                  {/* Category / Event Icon Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isUnread 
                      ? 'bg-[#151314] border-white/10 shadow-sm' 
                      : 'bg-white/5 border-white/5 opacity-60'
                  }`}>
                    {getNotificationIcon(n)}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className={`text-xs font-bold font-['Outfit'] truncate ${isUnread ? 'text-white' : 'text-neutral-300'}`}>
                        {n.title || 'Foody Vrinda Update'}
                      </h4>
                      <span className="text-[10px] text-neutral-500 font-medium shrink-0 flex items-center gap-1">
                        <Clock size={10} />
                        {relativeTime}
                      </span>
                    </div>

                    <p className={`text-xs leading-relaxed ${isUnread ? 'text-neutral-200 font-medium' : 'text-neutral-400 font-normal'}`}>
                      {n.message}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      {n.orderId ? (
                        <span className="text-[11px] text-[#E0FF33] font-bold flex items-center gap-1 hover:underline">
                          <span>View Order Details</span>
                          <ArrowRight size={10} />
                        </span>
                      ) : (
                        <span />
                      )}

                      {/* Quick Read / Unread Status Badge */}
                      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNotificationRead(n.id, !n.read);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                            n.read 
                              ? 'bg-white/5 text-neutral-400 border-white/10 hover:text-white' 
                              : 'bg-[#E0FF33]/15 text-[#E0FF33] border-[#E0FF33]/30'
                          }`}
                          title={n.read ? "Mark as unread" : "Mark as read"}
                        >
                          {n.read ? 'Mark Unread' : 'Mark Read'}
                        </button>
                        
                        {deleteNotification && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(n.id);
                            }}
                            className="p-1 rounded-md text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Dismiss notification"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Unread Glowing Dot Indicator */}
                  {isUnread && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-[#E0FF33] shadow-[0_0_8px_rgba(224,255,51,0.8)] pointer-events-none" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 bg-[#221F20] border-t border-white/10 flex justify-between items-center">
            <button
              onClick={markAllRead}
              className="text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all active:scale-95 cursor-pointer"
            >
              <CheckCheck size={14} className="text-[#E0FF33]" />
              <span>Mark all as read</span>
            </button>

            <button
              onClick={clearAllNotifications}
              className="text-xs font-bold text-neutral-400 hover:text-red-400 flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all active:scale-95 cursor-pointer"
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
