import { useState, useCallback, useMemo } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { 
  Bell, 
  BellRing,
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
  Info,
  Smartphone
} from 'lucide-react';

export default function NotificationPanel({ isOpen, onClose, onNotificationClick }) {
  const { 
    notifications, 
    unreadCount, 
    systemNotificationPermission,
    requestSystemNotificationPermission,
    sendOSNotification,
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

  // Helper to resolve icon & category badge styling
  const getNotificationDetails = (notif) => {
    const text = (notif.title + ' ' + notif.message).toLowerCase();
    
    if (text.includes('delivered') || text.includes('completed')) {
      return {
        icon: <Check size={14} className="text-emerald-400 stroke-[3]" />,
        iconBg: 'bg-emerald-500/15 border-emerald-500/30',
        tag: 'Delivered',
        tagBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      };
    }
    if (text.includes('sarathi') || text.includes('rider') || text.includes('on the way') || text.includes('dispatched') || text.includes('on way')) {
      return {
        icon: <Bike size={14} className="text-[#E0FF33]" />,
        iconBg: 'bg-[#E0FF33]/15 border-[#E0FF33]/30',
        tag: 'On Way',
        tagBg: 'bg-[#E0FF33]/15 text-[#E0FF33] border-[#E0FF33]/30'
      };
    }
    if (text.includes('cooking') || text.includes('prep') || text.includes('kitchen') || text.includes('prasad') || text.includes('bhog')) {
      return {
        icon: <Utensils size={14} className="text-amber-400" />,
        iconBg: 'bg-amber-500/15 border-amber-500/30',
        tag: 'Kitchen',
        tagBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      };
    }
    if (text.includes('placed') || text.includes('order')) {
      return {
        icon: <ShoppingBag size={14} className="text-sky-400" />,
        iconBg: 'bg-sky-500/15 border-sky-500/30',
        tag: 'Placed',
        tagBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
      };
    }
    if (text.includes('special') || text.includes('offer') || text.includes('discount')) {
      return {
        icon: <Gift size={14} className="text-purple-400" />,
        iconBg: 'bg-purple-500/15 border-purple-500/30',
        tag: 'Special',
        tagBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
      };
    }
    return {
      icon: <Sparkles size={14} className="text-[#E0FF33]" />,
      iconBg: 'bg-[#E0FF33]/15 border-[#E0FF33]/30',
      tag: 'System',
      tagBg: 'bg-white/10 text-neutral-300 border-white/10'
    };
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
      className={`fixed inset-0 z-[99999] flex items-start justify-center sm:justify-end p-3.5 pt-18 sm:pt-20 sm:pr-6 bg-black/55 backdrop-blur-xs transition-opacity duration-200 ${
        closing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div 
        className={`w-full max-w-[390px] bg-[#171516] border border-white/10 text-white rounded-[26px] shadow-[0_25px_70px_rgba(0,0,0,0.95)] relative overflow-hidden transition-all duration-200 transform ${
          closing ? 'scale-95 opacity-0 translate-y-[-6px]' : 'scale-100 opacity-100 translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="px-4.5 py-3.5 border-b border-white/10 flex justify-between items-center bg-[#1F1C1D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E0FF33]/10 border border-[#E0FF33]/20 flex items-center justify-center text-[#E0FF33] shadow-inner">
              <Bell size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white font-['Outfit'] tracking-tight">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-[#E0FF33] text-black text-[9.5px] font-black px-1.5 py-0.2 rounded-full leading-tight shadow-[0_0_8px_rgba(224,255,51,0.3)]">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-neutral-400 font-['Plus_Jakarta_Sans']">Live order tracking & updates</p>
            </div>
          </div>

          <button 
            onClick={handleAnimatedClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-neutral-400 hover:text-white transition-all border border-white/5 cursor-pointer"
            title="Close"
          >
            <X size={13} />
          </button>
        </div>

        {/* Segmented Filter Tabs */}
        <div className="px-3.5 py-2 bg-[#131112] border-b border-white/5 flex items-center gap-1.5">
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
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none border ${
                  isActive 
                    ? 'bg-[#E0FF33] text-black border-[#E0FF33] font-black shadow-[0_2px_8px_rgba(224,255,51,0.2)]' 
                    : 'bg-white/5 text-neutral-400 border-white/5 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded font-black ${
                  isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-neutral-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Global OS / System Notification Permission Banner */}
        {systemNotificationPermission !== 'granted' && systemNotificationPermission !== 'unsupported' && (
          <div className="mx-2.5 mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-[#E0FF33]/15 to-transparent border border-[#E0FF33]/30 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#E0FF33]/20 flex items-center justify-center text-[#E0FF33] shrink-0 shadow-inner">
                <BellRing size={16} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-white font-['Outfit']">Enable OS Notifications</p>
                <p className="text-[10px] text-neutral-300">Get order cooking & delivery alerts directly on your device screen</p>
              </div>
            </div>
            <button
              type="button"
              onClick={requestSystemNotificationPermission}
              className="px-3 py-1.5 rounded-xl bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black text-[11px] uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
            >
              Allow
            </button>
          </div>
        )}

        {/* Notification Cards Feed */}
        <div className="max-h-[26rem] overflow-y-auto p-2.5 space-y-1.5 no-scrollbar">
          {filteredNotifications.length === 0 ? (
            <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 shadow-inner">
                <BellOff size={18} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white font-['Outfit']">
                  {activeFilter === 'unread' 
                    ? "All caught up" 
                    : activeFilter === 'read' 
                      ? "No read alerts" 
                      : "No notifications"}
                </p>
                <p className="text-[10.5px] text-neutral-500 font-['Plus_Jakarta_Sans']">
                  {activeFilter === 'unread' 
                    ? "You've viewed all recent order updates." 
                    : "Live alerts will appear here automatically."}
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map(n => {
              const isUnread = !n.read;
              const relativeTime = formatRelativeTime(n.createdAt);
              const details = getNotificationDetails(n);

              return (
                <div 
                  key={n.id} 
                  onClick={() => handleNotificationItemClick(n.id, n.orderId)}
                  className={`p-3.5 rounded-2xl transition-all cursor-pointer border relative group ${
                    isUnread 
                      ? 'bg-[#201D1E] border-[#E0FF33]/20 hover:border-[#E0FF33]/45 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)]' 
                      : 'bg-[#181617]/80 border-white/5 hover:border-white/15 hover:bg-[#1E1B1C] opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Top Line: Avatar Icon + Title + Status Tag + Time */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${details.iconBg} shadow-inner`}>
                      {details.icon}
                    </div>

                    <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                      <h4 className={`text-xs font-bold font-['Outfit'] truncate ${isUnread ? 'text-white' : 'text-neutral-300'}`}>
                        {n.title || 'Foody Vrinda Update'}
                      </h4>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${details.tagBg}`}>
                        {n.statusTag || details.tag}
                      </span>
                    </div>

                    <span className="text-[10px] text-zinc-500 font-medium shrink-0 flex items-center gap-1">
                      <Clock size={10} />
                      {relativeTime}
                    </span>
                  </div>

                  {/* Body Line: Direct concise text */}
                  <p className={`text-xs leading-relaxed pl-10.5 pr-2 font-['Plus_Jakarta_Sans'] ${
                    isUnread ? 'text-zinc-200 font-medium' : 'text-zinc-400'
                  }`}>
                    {n.message}
                  </p>

                  {/* Bottom Action Line */}
                  <div className="flex items-center justify-between pt-2.5 pl-10.5">
                    {n.orderId ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationItemClick(n.id, n.orderId);
                        }}
                        className="h-7 px-3.5 rounded-xl bg-[#E0FF33] hover:bg-[#D4FF00] text-[#141213] font-black text-[10.5px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_2px_12px_rgba(224,255,51,0.25)] active:scale-95"
                      >
                        <span>Track Order</span>
                        <ArrowRight size={11} className="stroke-[3]" />
                      </button>
                    ) : (
                      <span />
                    )}

                    {/* Quick Icon Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNotificationRead(n.id, !n.read);
                        }}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs border transition-all cursor-pointer ${
                          n.read 
                            ? 'text-zinc-500 hover:text-white border-transparent hover:bg-white/5' 
                            : 'text-[#E0FF33] bg-[#E0FF33]/15 border-[#E0FF33]/30 hover:bg-[#E0FF33]/25'
                        }`}
                        title={n.read ? "Mark as unread" : "Mark as read"}
                      >
                        {n.read ? <Check size={12} /> : <CheckCheck size={12} />}
                      </button>
                      
                      {deleteNotification && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/15 transition-all cursor-pointer"
                          title="Dismiss"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subtle Unread Glow Indicator */}
                  {isUnread && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#E0FF33] shadow-[0_0_8px_#E0FF33] pointer-events-none animate-pulse" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2.5 bg-[#1F1C1D] border-t border-white/10 flex justify-between items-center">
            <button
              onClick={markAllRead}
              className="text-[11px] font-bold text-neutral-300 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded transition-all active:scale-95 cursor-pointer"
            >
              <CheckCheck size={12} className="text-[#E0FF33]" />
              <span>Mark all read</span>
            </button>

            <button
              onClick={clearAllNotifications}
              className="text-[11px] font-bold text-neutral-400 hover:text-red-400 flex items-center gap-1 px-1.5 py-0.5 rounded transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 size={11} />
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
