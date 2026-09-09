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
  const { user, userData, userRole, isAuthorizedAdmin, isAuthorizedDeveloper, isStaff } = useAuth();
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

  const [headerAvatarError, setHeaderAvatarError] = useState(false);

  const rawUserAvatar = user?.photoURL || 
    userData?.photoURL || 
    userData?.avatar_url || 
    userData?.picture || 
    user?.user_metadata?.avatar_url || 
    user?.user_metadata?.picture || 
    user?.user_metadata?.photoURL || 
    user?.identities?.[0]?.identity_data?.avatar_url || 
    user?.identities?.[0]?.identity_data?.picture || null;

  const userAvatar = (!headerAvatarError && rawUserAvatar && typeof rawUserAvatar === 'string' && rawUserAvatar.trim().length > 5)
    ? rawUserAvatar.trim()
    : null;

  const hasStaffOrSpecialRole = isStaff || isAuthorizedAdmin || isAuthorizedDeveloper;

  return (
    <div className="mb-4 sm:mb-7">
      <header className="py-2.5 flex items-center justify-between gap-3">
        {/* Left: Avatar with Profile Image + Greeting */}
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={handleProfileClick}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-[#282526] border border-white/10 hover:border-[#E0FF33]/50 flex items-center justify-center text-white font-black text-sm shadow-md transition-all flex-shrink-0 cursor-pointer apple-tap-target active:scale-95 ring-1 ring-white/5"
            title="Profile & Settings"
          >
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt={getDisplayName()} 
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="w-full h-full object-cover" 
                onError={() => setHeaderAvatarError(true)}
              />
            ) : (
              <div className="w-full h-full bg-[#282526] flex items-center justify-center font-black text-sm text-[#E0FF33] font-['Outfit']">
                {getDisplayName().charAt(0).toUpperCase()}
              </div>
            )}
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[13px] font-bold text-[#E0FF33] font-laila tracking-wide">
                वृन्दोपनिषद्
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 font-['Outfit']">
                (vrindopnishad)
              </span>
            </div>
            <h2 className="text-white font-black text-base sm:text-lg tracking-tight leading-tight font-['Outfit'] truncate">
              Hi, {getDisplayName()}
            </h2>
            <p className="text-xs text-zinc-400 font-medium truncate">Welcome to Foody Vrinda</p>
          </div>
        </div>

        {/* Operational View Switcher (Desktop md+ Pill Strip) */}
        {hasStaffOrSpecialRole && (
          <div className="hidden md:flex bg-[#282526] p-1 rounded-full border border-white/10 gap-1 shadow-sm">
            <button 
              onClick={() => setCurrentTab('customer')}
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target cursor-pointer ${
                currentTab === 'customer' 
                  ? 'bg-white text-[#1E1B1C] font-black shadow-sm' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Store
            </button>

            {(['kitchen'].includes(userRole) || isAuthorizedAdmin || isAuthorizedDeveloper) && (
              <button 
                onClick={() => setCurrentTab('kitchen')}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target cursor-pointer ${
                  currentTab === 'kitchen' 
                    ? 'bg-[#E0FF33] text-[#1E1B1C] font-black shadow-sm' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Kitchen
              </button>
            )}

            {(['delivery'].includes(userRole) || isAuthorizedAdmin || isAuthorizedDeveloper) && (
              <button 
                onClick={() => setCurrentTab('delivery')}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target cursor-pointer ${
                  currentTab === 'delivery' 
                    ? 'bg-[#06B6D4] text-[#1E1B1C] font-black shadow-sm' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Rider
              </button>
            )}

            {isAuthorizedAdmin && (
              <button 
                onClick={() => setCurrentTab('owner')}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target cursor-pointer ${
                  currentTab === 'owner' 
                    ? 'bg-[#A855F7] text-white font-black shadow-sm' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Owner
              </button>
            )}

            {isAuthorizedDeveloper && (
              <button 
                onClick={() => setCurrentTab('developer')}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target cursor-pointer ${
                  currentTab === 'developer' 
                    ? 'bg-gradient-to-r from-[#E0FF33] to-emerald-400 text-[#1E1B1C] font-black shadow-sm' 
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                Dev
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

      {/* Mobile Dedicated Operational View Switcher (Horizontal Smooth Touch Strip) */}
      {hasStaffOrSpecialRole && (
        <div className="flex md:hidden items-center justify-start overflow-x-auto no-scrollbar gap-1.5 bg-[#282526] p-1 rounded-2xl border border-white/10 shadow-sm mt-1 mb-2 w-full">
          <button 
            onClick={() => setCurrentTab('customer')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              currentTab === 'customer' 
                ? 'bg-white text-[#1E1B1C] font-black shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Store
          </button>

          {(['kitchen'].includes(userRole) || isAuthorizedAdmin || isAuthorizedDeveloper) && (
            <button 
              onClick={() => setCurrentTab('kitchen')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                currentTab === 'kitchen' 
                  ? 'bg-[#E0FF33] text-[#1E1B1C] font-black shadow-sm' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Kitchen
            </button>
          )}

          {(['delivery'].includes(userRole) || isAuthorizedAdmin || isAuthorizedDeveloper) && (
            <button 
              onClick={() => setCurrentTab('delivery')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                currentTab === 'delivery' 
                  ? 'bg-[#06B6D4] text-[#1E1B1C] font-black shadow-sm' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Rider
            </button>
          )}

          {isAuthorizedAdmin && (
            <button 
              onClick={() => setCurrentTab('owner')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                currentTab === 'owner' 
                  ? 'bg-[#A855F7] text-white font-black shadow-sm' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Owner
            </button>
          )}

          {isAuthorizedDeveloper && (
            <button 
              onClick={() => setCurrentTab('developer')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                currentTab === 'developer' 
                  ? 'bg-gradient-to-r from-[#E0FF33] to-emerald-400 text-[#1E1B1C] font-black shadow-sm' 
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              Dev
            </button>
          )}
        </div>
      )}
    </div>
  );
}
