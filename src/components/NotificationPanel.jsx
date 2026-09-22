import { useState, useCallback, useMemo, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
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
  Gift
} from 'lucide-react';

export default function NotificationPanel({ isOpen, onClose, onNotificationClick }) {
  const { 
    notifications, 
    unreadCount, 
    systemNotificationPermission,
    requestSystemNotificationPermission,
    toggleNotificationRead, 
    markAllRead, 
    clearAllNotifications,
    deleteNotification
  } = useNotifications();

  const { isLight } = useTheme();
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [closing, setClosing] = useState(false);
  const closeTimeoutRef = useRef(null);

  const handleAnimatedClose = useCallback((isImmediate = false) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (isImmediate === true) {
      setClosing(false);
      onClose();
      return;
    }
    if (closing) return;
    setClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setClosing(false);
      onClose();
      closeTimeoutRef.current = null;
    }, 180);
  }, [closing, onClose]);

  const {
    sheetRef,
    sheetStyle,
    handleProps
  } = useBottomSheetDrag(handleAnimatedClose, 45);

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
        icon: <Check size={18} className="text-emerald-600 dark:text-emerald-400 stroke-[3]" />,
        iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/30 dark:border-emerald-500/30',
        tag: 'Delivered',
        tagBg: 'bg-emerald-500/15 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-300 border-emerald-500/30'
      };
    }
    if (text.includes('sarathi') || text.includes('rider') || text.includes('on the way') || text.includes('dispatched') || text.includes('on way')) {
      return {
        icon: <Bike size={18} className="text-amber-600 dark:text-[#E0FF33] stroke-[2.3]" />,
        iconBg: 'bg-amber-500/15 dark:bg-white/10 border-amber-500/30 dark:border-white/15',
        tag: 'On Way',
        tagBg: 'bg-amber-500/15 text-amber-900 dark:bg-[#E0FF33]/20 dark:text-[#E0FF33] border-amber-500/30 dark:border-[#E0FF33]/35'
      };
    }
    if (text.includes('cooking') || text.includes('prep') || text.includes('kitchen') || text.includes('prasad') || text.includes('bhog')) {
      return {
        icon: <Utensils size={18} className="text-amber-600 dark:text-[#E0FF33] stroke-[2.3]" />,
        iconBg: 'bg-amber-500/15 dark:bg-white/10 border-amber-500/30 dark:border-white/15',
        tag: 'Kitchen',
        tagBg: 'bg-amber-500/15 text-amber-900 dark:bg-[#E0FF33]/20 dark:text-[#E0FF33] border-amber-500/30 dark:border-[#E0FF33]/35'
      };
    }
    if (text.includes('placed') || text.includes('order')) {
      return {
        icon: <ShoppingBag size={18} className="text-sky-600 dark:text-sky-400 stroke-[2.3]" />,
        iconBg: 'bg-sky-500/15 dark:bg-sky-500/20 border-sky-500/30 dark:border-sky-500/30',
        tag: 'Placed',
        tagBg: 'bg-sky-500/15 text-sky-900 dark:bg-sky-500/25 dark:text-sky-300 border-sky-500/30'
      };
    }
    if (text.includes('special') || text.includes('offer') || text.includes('discount')) {
      return {
        icon: <Gift size={18} className="text-purple-600 dark:text-purple-400 stroke-[2.3]" />,
        iconBg: 'bg-purple-500/15 dark:bg-purple-500/20 border-purple-500/30 dark:border-purple-500/30',
        tag: 'Special',
        tagBg: 'bg-purple-500/15 text-purple-900 dark:bg-purple-500/25 dark:text-purple-300 border-purple-500/30'
      };
    }
    return {
      icon: <Sparkles size={18} className="text-amber-600 dark:text-[#E0FF33] stroke-[2.3]" />,
      iconBg: 'bg-amber-500/15 dark:bg-white/10 border-amber-500/30 dark:border-white/15',
      tag: 'System',
      tagBg: 'bg-stone-200/90 text-stone-800 dark:bg-white/15 dark:text-zinc-100 border-stone-300 dark:border-white/15'
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
      className={`fixed inset-0 z-[99999] flex items-end sm:items-start justify-center sm:justify-end p-0 sm:p-4 sm:pt-20 sm:pr-6 bg-black/60 dark:bg-black/75 transition-opacity duration-200 ${
        closing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div 
        ref={sheetRef}
        style={sheetStyle}
        className={`w-full max-w-full sm:max-w-[440px] max-h-[85vh] sm:max-h-[82vh] flex flex-col bg-[#FAF7F2] dark:bg-[#1E1B1C] text-stone-900 dark:text-white rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-stone-200/80 dark:border-white/10 shadow-[0_-12px_48px_rgba(0,0,0,0.25)] sm:shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative overflow-hidden transition-all duration-200 transform ${
          closing ? 'translate-y-full sm:translate-y-[-8px] opacity-0 sm:scale-95' : 'translate-y-0 opacity-100 sm:scale-100'
        }`}
      >
        {/* Mobile Tactile Drag Handle */}
        <div 
          {...handleProps}
          className="sm:hidden pt-3.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-white/25 transition-colors" />
        </div>

        {/* Header */}
        <div 
          {...handleProps}
          className="px-5 py-4 flex justify-between items-center bg-[#FAF7F2] dark:bg-[#1E1B1C] select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 dark:bg-white/10 border border-amber-500/30 dark:border-white/15 flex items-center justify-center text-amber-600 dark:text-[#E0FF33] shadow-xs shrink-0">
              <Bell size={20} className="stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-black text-base sm:text-lg text-stone-900 dark:text-white font-['Outfit'] tracking-tight">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-amber-600 dark:bg-[#E0FF33] text-white dark:text-black text-xs font-black px-2.5 py-0.5 rounded-full leading-tight shadow-xs">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 dark:text-zinc-300 font-['Plus_Jakarta_Sans'] font-medium">Live order tracking & alerts</p>
            </div>
          </div>

          <button 
            onClick={handleAnimatedClose}
            className="w-9 h-9 rounded-full bg-stone-200/80 hover:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/15 active:scale-95 flex items-center justify-center text-stone-700 dark:text-zinc-200 hover:text-stone-950 dark:hover:text-white transition-all border border-stone-300/60 dark:border-white/10 cursor-pointer"
            title="Close"
            aria-label="Close notifications"
          >
            <X size={17} />
          </button>
        </div>

        {/* Segmented Filter Tabs */}
        <div className="px-4 py-2.5 bg-[#FAF7F2] dark:bg-[#1E1B1C] flex items-center gap-2">
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
                className={`flex-1 py-2 px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer select-none border ${
                  isActive 
                    ? 'bg-amber-600 text-white dark:bg-[#E0FF33] dark:text-[#121011] border-amber-600 dark:border-[#E0FF33] font-black shadow-sm' 
                    : 'bg-stone-200/90 text-stone-800 dark:bg-[#282526] dark:text-zinc-200 border-stone-300/80 dark:border-white/10 hover:text-stone-950 dark:hover:text-white hover:bg-stone-300/80'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-xs px-2 py-0.5 min-w-[20px] rounded-full font-black shrink-0 transition-all text-center inline-flex items-center justify-center leading-none ${
                  isActive 
                    ? 'bg-white !text-[#1C1917] dark:bg-black dark:!text-[#E0FF33] shadow-xs ring-1 ring-black/10 dark:ring-[#E0FF33]/30' 
                    : 'bg-stone-300/90 !text-[#1C1917] dark:bg-white/15 dark:!text-white'
                }`}>
                  <span className="badge-count !text-[#1C1917] dark:!text-[#E0FF33] font-black">
                    {tab.count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Global OS / System Notification Permission Banner */}
        {systemNotificationPermission !== 'granted' && systemNotificationPermission !== 'unsupported' && (
          <div className="mx-4 mt-3.5 p-3.5 rounded-2xl bg-amber-500/10 dark:bg-[#E0FF33]/10 border border-amber-500/30 dark:border-[#E0FF33]/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 dark:bg-[#E0FF33]/20 flex items-center justify-center text-amber-600 dark:text-[#E0FF33] shrink-0 shadow-inner">
                <BellRing size={18} />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs sm:text-sm font-black text-stone-900 dark:text-white font-['Outfit'] truncate">Enable System Alerts</p>
                <p className="text-xs text-stone-600 dark:text-neutral-300 truncate">Receive audio & lock-screen cooking updates</p>
              </div>
            </div>
            <button
              type="button"
              onClick={requestSystemNotificationPermission}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] text-white dark:text-[#1E1B1C] font-black text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
            >
              Enable
            </button>
          </div>
        )}

        {/* Notification Cards Feed */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 no-scrollbar min-h-[160px]">
          {filteredNotifications.length === 0 ? (
            <div className="py-14 px-4 text-center flex flex-col items-center justify-center gap-3.5">
              <div className="w-14 h-14 rounded-3xl bg-stone-200/80 dark:bg-white/5 border border-stone-300/80 dark:border-white/10 flex items-center justify-center text-stone-400 dark:text-neutral-500 shadow-inner">
                <BellOff size={26} />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-stone-900 dark:text-white font-['Outfit']">
                  {activeFilter === 'unread' 
                    ? "All caught up" 
                    : activeFilter === 'read' 
                      ? "No read alerts" 
                      : "No notifications"}
                </p>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-neutral-400 font-['Plus_Jakarta_Sans']">
                  {activeFilter === 'unread' 
                    ? "You've viewed all recent prasad & order updates." 
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
                  className={`p-4 rounded-3xl transition-all cursor-pointer border relative group ${
                    isUnread 
                      ? 'bg-white dark:bg-[#282526] border-amber-500/35 dark:border-[#E0FF33]/30 shadow-md hover:shadow-lg' 
                      : 'bg-[#F4EFE6]/70 dark:bg-[#242021]/80 border-stone-200/80 dark:border-white/5 hover:border-stone-300 dark:hover:border-white/15 opacity-90 hover:opacity-100'
                  }`}
                >
                  {/* Top Line: Avatar Icon + Title + Status Tag + Time */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${details.iconBg} shadow-inner`}>
                      {details.icon}
                    </div>

                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <h4 className={`text-sm sm:text-base font-black font-['Outfit'] truncate ${isUnread ? 'text-stone-950 dark:text-white' : 'text-stone-800 dark:text-neutral-200'}`}>
                        {n.title || 'Foody Vrinda Update'}
                      </h4>
                      <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0 ${details.tagBg}`}>
                        {n.statusTag || details.tag}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-stone-500 dark:text-zinc-400 shrink-0 flex items-center gap-1.5">
                      <Clock size={12} />
                      {relativeTime}
                    </span>
                  </div>

                  {/* Body Line: Generous, crisp, easy-to-read font */}
                  <p className={`text-xs sm:text-sm leading-relaxed pl-14 pr-1 font-['Plus_Jakarta_Sans'] ${
                    isUnread ? 'text-stone-850 dark:text-zinc-100 font-semibold' : 'text-stone-600 dark:text-zinc-300 font-normal'
                  }`}>
                    {n.message}
                  </p>

                  {/* Bottom Action Line */}
                  <div className="flex items-center justify-between pt-3 pl-14">
                    {n.orderId ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationItemClick(n.id, n.orderId);
                        }}
                        className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] text-white dark:text-[#121011] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95"
                      >
                        <span>Track Order</span>
                        <ArrowRight size={13} className="stroke-[3]" />
                      </button>
                    ) : (
                      <span />
                    )}

                    {/* Quick Clean Actions with generous touch targets */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNotificationRead(n.id, !n.read);
                        }}
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm border transition-all cursor-pointer ${
                          n.read 
                            ? 'text-stone-600 hover:text-stone-900 dark:text-zinc-300 dark:hover:text-white bg-stone-200/80 hover:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/15 border-stone-300/80 dark:border-white/15' 
                            : 'text-white dark:text-black bg-amber-600 hover:bg-amber-700 dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] border-amber-600 dark:border-[#E0FF33] shadow-sm hover:scale-105 active:scale-95'
                        }`}
                        title={n.read ? "Mark as unread" : "Mark as read"}
                      >
                        {n.read ? <Check size={16} className="stroke-[2.5]" /> : <CheckCheck size={16} className="stroke-[2.8]" />}
                      </button>
                      
                      {deleteNotification && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                          className="w-9 h-9 rounded-2xl flex items-center justify-center text-stone-600 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400 bg-stone-200/80 hover:bg-red-500/15 dark:bg-white/10 dark:hover:bg-red-500/20 border border-stone-300/80 dark:border-white/15 transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Dismiss"
                        >
                          <Trash2 size={16} className="stroke-[2.2]" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subtle Unread Glow Indicator */}
                  {isUnread && (
                    <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-[#E0FF33] shadow-[0_0_10px_rgba(224,255,51,0.8)] pointer-events-none animate-pulse" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Safe-Area padding on mobile */}
        {notifications.length > 0 && (
          <div className="px-5 pt-3.5 pb-8 sm:pb-3.5 bg-[#F4EFE6] dark:bg-[#282526] border-t border-stone-200/80 dark:border-white/10 flex justify-between items-center safe-area-bottom">
            <button
              onClick={markAllRead}
              className="text-xs sm:text-sm font-black text-stone-800 hover:text-stone-950 dark:text-neutral-200 dark:hover:text-white flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-200/80 dark:bg-white/10 hover:bg-stone-300 dark:hover:bg-white/15 border border-stone-300/70 dark:border-white/10 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <CheckCheck size={16} className="text-amber-600 dark:text-[#E0FF33]" />
              <span>Mark all read</span>
            </button>

            <button
              onClick={clearAllNotifications}
              className="text-xs sm:text-sm font-black text-stone-700 hover:text-red-600 dark:text-neutral-300 dark:hover:text-red-400 flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-200/80 dark:bg-white/10 hover:bg-red-500/15 dark:hover:bg-red-500/20 border border-stone-300/70 dark:border-white/10 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Trash2 size={15} />
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

