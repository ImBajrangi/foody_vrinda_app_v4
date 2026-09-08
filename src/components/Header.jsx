import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useCart } from '../context/CartContext';
import { Bell, Search, ShoppingBag } from 'lucide-react';

export default function Header({ 
  audioUnlocked, 
  enableAudio, 
  onToggleSearch, 
  onToggleNotifications, 
  onToggleAuth, 
  onToggleOrders,
  onToggleRewards,
  onOpenCart,
  currentTab,
  setCurrentTab 
}) {
  const { user, userData, userRole } = useAuth();
  const { unreadCount } = useNotifications();
  const { cart, totalAmount } = useCart();

  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);

  const handleProfileClick = () => {
    onToggleAuth();
  };

  const getDisplayName = () => {
    if (userData && userData.displayName) return userData.displayName;
    if (user && user.displayName) return user.displayName;
    if (user && user.email) return user.email.split('@')[0];
    return 'Guest';
  };

  return (
    <header className="py-2.5 mb-5 sm:mb-7 flex items-center justify-between gap-3">
      {/* Left: Avatar with Profile Image + Greeting */}
      <div className="flex items-center gap-3 min-w-0">
        <button 
          onClick={handleProfileClick}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-[#282526] border border-white/10 hover:border-[#E0FF33]/50 flex items-center justify-center text-white font-black text-sm shadow-md transition-all flex-shrink-0 cursor-pointer apple-tap-target active:scale-95 ring-1 ring-white/5"
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
        
        <div className="min-w-0">
          <h2 className="text-white font-black text-base sm:text-lg tracking-tight leading-tight font-['Outfit'] truncate">
            Hi, {getDisplayName()}
          </h2>
          <p className="text-xs text-zinc-400 font-medium truncate">Welcome Back!</p>
        </div>
      </div>

      {/* Staff View Switcher (Only for kitchen/owner/delivery) */}
      {['kitchen', 'delivery', 'owner', 'developer'].includes(userRole) && (
        <div className="hidden lg:flex bg-[#282526] p-1 rounded-full border border-white/10 gap-1 shadow-sm">
          <button 
            onClick={() => setCurrentTab('customer')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target cursor-pointer ${
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
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target cursor-pointer ${
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
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target cursor-pointer ${
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

      {/* Right: Search + Cart + Notification Actions (Uniform Circular Layout) */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
        <button
          onClick={onToggleSearch}
          className="w-10 h-10 sm:w-11 sm:h-11 md:w-auto md:px-4 rounded-full bg-[#282526] border border-white/10 hover:border-white/20 hover:bg-[#322E30] flex items-center justify-center md:justify-start gap-2 text-zinc-300 hover:text-white transition-all shadow-md cursor-pointer apple-tap-target shrink-0 active:scale-95"
          title="Search (Ctrl + K)"
        >
          <Search size={17} className="text-[#E0FF33]" />
          <span className="hidden md:inline text-xs font-bold text-zinc-300">Search</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-bold text-zinc-400 bg-[#1E1B1C] px-1.5 py-0.5 rounded border border-white/10 ml-1">
            ⌘K
          </kbd>
        </button>

        {/* Quick Cart Trigger (Uniform Circular Button with floating badge) */}
        {totalQty > 0 && onOpenCart && (
          <button
            onClick={onOpenCart}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#282526] border border-white/10 hover:border-[#E0FF33]/40 hover:bg-[#322E30] flex items-center justify-center text-zinc-200 hover:text-white transition-all shadow-md relative cursor-pointer apple-tap-target active:scale-95 shrink-0"
            title="Open Basket"
          >
            <ShoppingBag size={18} className="text-[#E0FF33]" />
            <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-[#E0FF33] text-black text-[10px] font-black rounded-full flex items-center justify-center shadow-lg font-['Outfit'] border-2 border-[#1E1B1C] leading-none">
              {totalQty}
            </span>
          </button>
        )}

        <button 
          onClick={onToggleNotifications}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#282526] border border-white/10 hover:border-white/20 hover:bg-[#322E30] flex items-center justify-center text-zinc-200 hover:text-white transition-all shadow-md relative cursor-pointer apple-tap-target shrink-0 active:scale-95"
          title="Notifications"
        >
          <Bell size={18} />
          
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#E0FF33] rounded-full ring-2 ring-[#1E1B1C] shadow-sm"></span>
          )}
        </button>
      </div>
    </header>
  );
}
