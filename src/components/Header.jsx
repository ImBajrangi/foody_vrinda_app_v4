import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Bell, Search } from 'lucide-react';

export default function Header({ 
  audioUnlocked, 
  enableAudio, 
  onToggleSearch, 
  onToggleNotifications, 
  onToggleAuth, 
  onToggleOrders,
  onToggleRewards,
  currentTab,
  setCurrentTab 
}) {
  const { user, userData, userRole } = useAuth();
  const { unreadCount } = useNotifications();

  const handleProfileClick = () => {
    onToggleAuth();
  };

  const getDisplayName = () => {
    if (userData && userData.displayName) return userData.displayName;
    if (user && user.displayName) return user.displayName;
    if (user && user.email) return user.email.split('@')[0];
    return 'Brooks';
  };

  return (
    <header className="py-2 mb-4 sm:mb-6 flex items-center justify-between">
      {/* Left: Avatar with Profile Image + Greeting */}
      <div className="flex items-center gap-3">
        <button 
          onClick={handleProfileClick}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-[#282526] border border-white/10 flex items-center justify-center text-white font-black text-sm shadow-md transition-transform flex-shrink-0 cursor-pointer apple-tap-target"
          title="Profile & Settings"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80" 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          )}
        </button>
        
        <div>
          <h2 className="text-white font-black text-base sm:text-lg tracking-tight leading-tight font-['Outfit']">
            Hi, {getDisplayName()}
          </h2>
          <p className="text-xs text-zinc-400 font-medium">Welcome Back!</p>
        </div>
      </div>

      {/* Staff View Switcher (Only for kitchen/owner/delivery) */}
      {['kitchen', 'delivery', 'owner', 'developer'].includes(userRole) && (
        <div className="hidden lg:flex bg-[#282526] p-1 rounded-full border border-white/10 gap-1">
          <button 
            onClick={() => setCurrentTab('customer')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target ${
              currentTab === 'customer' 
                ? 'bg-white text-[#1E1B1C] font-black shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Store
          </button>
          {['kitchen', 'owner', 'developer'].includes(userRole) && (
            <button 
              onClick={() => setCurrentTab('kitchen')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target ${
                currentTab === 'kitchen' 
                  ? 'bg-[#E0FF33] text-[#1E1B1C] font-black shadow-sm' 
                : 'text-zinc-400 hover:text-white'
              }`}
            >
              Kitchen
            </button>
          )}
          {['owner', 'developer'].includes(userRole) && (
            <button 
              onClick={() => setCurrentTab('owner')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target ${
                currentTab === 'owner' 
                  ? 'bg-[#E0FF33] text-[#1E1B1C] font-black shadow-sm' 
                : 'text-zinc-400 hover:text-white'
              }`}
            >
              Admin
            </button>
          )}
        </div>
      )}

      {/* Right: Search + Notification Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          onClick={onToggleSearch}
          className="h-10 sm:h-11 px-3 sm:px-3.5 rounded-full bg-[#282526] border border-white/5 hover:border-white/15 flex items-center gap-2 text-zinc-300 hover:text-white transition-all shadow-md cursor-pointer apple-tap-target"
          title="Search (Ctrl + K)"
        >
          <Search size={17} className="text-[#E0FF33]" />
          <span className="hidden md:inline text-xs font-bold text-zinc-400">Search</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-bold text-zinc-400 bg-[#1E1B1C] px-1.5 py-0.5 rounded border border-white/10">
            ⌘K
          </kbd>
        </button>

        <button 
          onClick={onToggleNotifications}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#282526] border border-white/5 hover:border-white/15 flex items-center justify-center text-zinc-200 hover:text-white transition-all shadow-md relative cursor-pointer apple-tap-target"
          title="Notifications"
        >
          <Bell size={18} />
          
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#E0FF33] rounded-full ring-2 ring-[#1E1B1C]"></span>
          )}
        </button>
      </div>
    </header>
  );
}
