import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { Bell, Search, ShoppingBag, Sun, Moon } from 'lucide-react';

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
  const { isLight, toggleTheme } = useTheme();

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
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <button 
            onClick={handleProfileClick}
            className="group relative w-10 h-10 sm:w-11 sm:h-11 rounded-full p-[2px] bg-gradient-to-tr from-[#E0FF33]/50 via-amber-400/30 to-[#E0FF33]/70 hover:from-[#E0FF33] hover:to-[#CCFF00] transition-all duration-300 flex-shrink-0 cursor-pointer apple-tap-target active:scale-95 shadow-[0_2px_12px_rgba(224,255,51,0.15)] hover:shadow-[0_0_18px_rgba(224,255,51,0.35)]"
            title="Profile & Settings (Tap to open)"
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-[#1E1B1C] border border-[#1E1B1C] flex items-center justify-center relative">
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
                <img 
                  src="/foody-vrinda-logo.webp" 
                  alt="Foody Vrinda" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
            </div>
          </button>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[12px] sm:text-[13px] font-bold text-emerald-700 dark:text-[#E0FF33] font-laila tracking-wide shrink-0">
                वृन्दोपनिषद्
              </span>
              <span className="text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-zinc-400 font-['Outfit'] shrink-0">
                (vrindopnishad)
              </span>
            </div>
            <h2 className="text-stone-900 dark:text-white font-black text-sm sm:text-base md:text-lg tracking-tight leading-tight font-['Outfit'] truncate">
              Hi, {getDisplayName()}
            </h2>
            <p className="text-[11px] sm:text-xs text-stone-600 dark:text-zinc-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
              Welcome to Foody Vrinda
            </p>
          </div>
        </div>

        {/* Operational View Switcher (Desktop md+ Pill Strip) */}
        {hasStaffOrSpecialRole && (
          <div className="hidden md:flex bg-stone-200/90 dark:bg-[#282526] p-1 rounded-full border border-stone-300 dark:border-white/10 gap-1 shadow-sm">
            <button 
              onClick={() => setCurrentTab('customer')}
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target cursor-pointer ${
                currentTab === 'customer' 
                  ? 'category-pill-active bg-stone-900 text-white dark:bg-[#E0FF33] dark:text-[#121011] font-black shadow-xs' 
                  : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Store
            </button>

            {(['kitchen'].includes(userRole) || isAuthorizedAdmin || isAuthorizedDeveloper) && (
              <button 
                onClick={() => setCurrentTab('kitchen')}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target cursor-pointer ${
                  currentTab === 'kitchen' 
                    ? 'bg-amber-600 dark:bg-[#E0FF33] text-white dark:text-[#1E1B1C] font-black shadow-sm' 
                    : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
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
                    ? 'category-pill-active bg-stone-900 text-white dark:bg-[#E0FF33] dark:text-[#121011] font-black shadow-xs' 
                    : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
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
                    ? 'bg-purple-600 dark:bg-[#A855F7] text-white font-black shadow-sm' 
                    : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
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
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white font-black shadow-sm' 
                    : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                Dev
              </button>
            )}
          </div>
        )}

        {/* Right: Actions Cluster (Responsive & Ergonomic) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop Search Button */}
          <button
            onClick={onToggleSearch}
            className="hidden md:flex h-10 px-3.5 rounded-full bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-white/20 hover:bg-stone-300 dark:hover:bg-[#322E30] items-center gap-2 text-stone-800 dark:text-zinc-300 hover:text-stone-950 dark:hover:text-white transition-all shadow-xs cursor-pointer apple-tap-target active:scale-95"
            title="Search"
          >
            <Search size={16} className="text-amber-600 dark:text-[#E0FF33]" />
            <span className="text-xs font-bold text-stone-800 dark:text-zinc-300">Search</span>
          </button>

          {/* Quick Cart Trigger (Uniform Circular Button with floating badge) */}
          {totalQty > 0 && onOpenCart && (
            <button
              onClick={onOpenCart}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-[#E0FF33]/40 hover:bg-stone-300 dark:hover:bg-[#322E30] flex items-center justify-center text-stone-800 dark:text-zinc-200 hover:text-stone-950 dark:hover:text-white transition-all shadow-xs relative cursor-pointer apple-tap-target active:scale-95 shrink-0"
              title="Open Basket"
            >
              <ShoppingBag size={17} className="text-amber-600 dark:text-[#E0FF33]" />
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 dark:bg-[#E0FF33] text-white dark:text-black text-[9.5px] font-black rounded-full flex items-center justify-center shadow-md font-['Outfit'] border-2 border-[#FAF7F2] dark:border-[#1E1B1C] leading-none">
                {totalQty}
              </span>
            </button>
          )}

          {/* Theme Toggle Button (Light / Dark Mode) */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-white/20 hover:bg-stone-300 dark:hover:bg-[#322E30] flex items-center justify-center text-stone-800 dark:text-zinc-200 hover:text-stone-950 dark:hover:text-white transition-all shadow-xs relative cursor-pointer apple-tap-target shrink-0 active:scale-95 group"
            title={isLight ? "Switch to Obsidian Dark Mode" : "Switch to Divine Light Mode"}
            aria-label="Toggle Theme"
          >
            {isLight ? (
              <Moon size={17} className="text-amber-600 group-hover:rotate-12 transition-transform duration-300" />
            ) : (
              <Sun size={17} className="text-[#E0FF33] group-hover:rotate-45 transition-transform duration-300" />
            )}
          </button>

          {/* Notifications Trigger */}
          <button 
            onClick={onToggleNotifications}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-white/20 hover:bg-stone-300 dark:hover:bg-[#322E30] flex items-center justify-center text-stone-800 dark:text-zinc-200 hover:text-stone-950 dark:hover:text-white transition-all shadow-xs relative cursor-pointer apple-tap-target shrink-0 active:scale-95"
            title="Notifications"
          >
            <Bell size={17} />
            
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 dark:bg-[#E0FF33] rounded-full ring-2 ring-[#FAF7F2] dark:ring-[#1E1B1C] shadow-sm animate-pulse"></span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Dedicated Operational View Switcher (Horizontal Smooth Touch Strip) */}
      {hasStaffOrSpecialRole && (
        <div className="flex md:hidden items-center justify-start overflow-x-auto no-scrollbar gap-1.5 bg-stone-200/90 dark:bg-[#282526] p-1 rounded-2xl border border-stone-300 dark:border-white/10 shadow-sm mt-1 mb-2 w-full">
          <button 
            onClick={() => setCurrentTab('customer')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              currentTab === 'customer' 
                ? 'bg-stone-900 text-white dark:bg-white dark:text-[#1E1B1C] font-black shadow-sm' 
                : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            Store
          </button>

          {(['kitchen'].includes(userRole) || isAuthorizedAdmin || isAuthorizedDeveloper) && (
            <button 
              onClick={() => setCurrentTab('kitchen')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                currentTab === 'kitchen' 
                  ? 'bg-amber-600 text-white dark:bg-[#E0FF33] dark:text-[#1E1B1C] font-black shadow-sm' 
                  : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
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
                  ? 'bg-cyan-600 text-white dark:bg-[#06B6D4] dark:text-[#1E1B1C] font-black shadow-sm' 
                  : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
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
                  ? 'bg-purple-600 text-white font-black shadow-sm' 
                  : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
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
                  ? 'bg-emerald-600 text-white font-black shadow-sm' 
                  : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
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
