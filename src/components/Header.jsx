import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { Bell, Search, ShoppingBag, Sun, Moon, Coins, LogIn } from 'lucide-react';
import { getCachedWallet, subscribeUserWallet } from '../services/fvWalletService';

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
  const { 
    user, 
    userData, 
    userRole, 
    isAuthenticated, 
    loading: authLoading, 
    isAuthorizedAdmin, 
    isAuthorizedDeveloper, 
    isStaff, 
    allShops = [], 
    currentUserShopId 
  } = useAuth();
  const { unreadCount } = useNotifications();
  const { cart, totalAmount } = useCart();
  const { isLight, toggleTheme } = useTheme();

  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);

  const [walletData, setWalletData] = useState(() => getCachedWallet(user?.id || userData?.id));

  useEffect(() => {
    const uid = user?.id || userData?.id;
    if (!uid || !isAuthenticated) {
      setWalletData(null);
      return;
    }
    const cached = getCachedWallet(uid);
    if (cached) setWalletData(cached);

    const unsub = subscribeUserWallet(uid, (data) => {
      if (data) setWalletData(data);
    });

    const handleUpdate = (e) => {
      if (e.detail) setWalletData(e.detail);
    };
    window.addEventListener('foody:wallet-updated', handleUpdate);

    return () => {
      unsub();
      window.removeEventListener('foody:wallet-updated', handleUpdate);
    };
  }, [user?.id, userData?.id, isAuthenticated]);

  const handleProfileClick = () => {
    if (onToggleAuth) {
      onToggleAuth(isAuthenticated ? undefined : 'login');
    }
  };

  const getDisplayName = () => {
    if (!isAuthenticated) return 'Foody Vrinda';
    if (userData && userData.displayName) return userData.displayName;
    if (user && user.displayName) return user.displayName;
    if (user && user.email) return user.email.split('@')[0];
    return 'Devotee';
  };

  const getLocationLabel = () => {
    // 1. Check user custom location / delivery address if saved
    const savedAddress = userData?.address || userData?.delivery_address || userData?.city || '';
    if (savedAddress && typeof savedAddress === 'string' && savedAddress.trim().length > 0) {
      const parts = savedAddress.split(',')[0].trim();
      if (parts.length > 0) return parts;
    }

    // 2. Check active/selected shop name or area
    const activeShop = allShops?.find(s => s.id === currentUserShopId) || allShops?.[0];
    if (activeShop?.address) {
      const parts = activeShop.address.split(',')[0].trim();
      if (parts.length > 0) return parts;
    }
    if (activeShop?.name) {
      return activeShop.name.replace(/^(Shri\s+|Prem\s+Mandir\s+)/i, '').trim() || activeShop.name;
    }

    return 'Sri Vrindavan Dham';
  };

  const [headerAvatarError, setHeaderAvatarError] = useState(false);

  const rawUserAvatar = isAuthenticated ? (
    user?.photoURL || 
    userData?.photoURL || 
    userData?.avatar_url || 
    userData?.picture || 
    user?.user_metadata?.avatar_url || 
    user?.user_metadata?.picture || 
    user?.user_metadata?.photoURL || 
    user?.identities?.[0]?.identity_data?.avatar_url || 
    user?.identities?.[0]?.identity_data?.picture || null
  ) : null;

  const userAvatar = (!headerAvatarError && rawUserAvatar && typeof rawUserAvatar === 'string' && rawUserAvatar.trim().length > 5)
    ? rawUserAvatar.trim()
    : null;

  const hasStaffOrSpecialRole = isAuthenticated && (isStaff || isAuthorizedAdmin || isAuthorizedDeveloper);

  return (
    <div className="mb-4 sm:mb-7">
      <header className="py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand Identity (Logged-out) vs User Profile / Avatar (Logged-in) */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {authLoading ? (
            /* Stable loading placeholder to eliminate flicker on boot */
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-stone-300/60 dark:bg-white/10 animate-pulse shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="w-20 h-3 bg-stone-300/60 dark:bg-white/10 rounded animate-pulse" />
                <div className="w-28 h-4 bg-stone-300/60 dark:bg-white/10 rounded animate-pulse" />
              </div>
            </div>
          ) : !isAuthenticated ? (
            /* ========================================================================= */
            /* LOGGED-OUT: Profile/Avatar COMPLETELY HIDDEN                              */
            /* Shows pure Foody Vrinda Brand & Temple Location                           */
            /* ========================================================================= */
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden bg-[#1E1B1C] border border-stone-200 dark:border-white/10 flex items-center justify-center p-1 shrink-0 shadow-xs">
                <img 
                  src="/foody-vrinda-logo.webp" 
                  alt="Foody Vrinda" 
                  className="w-full h-full object-contain" 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-amber-700 dark:text-[#E0FF33] font-laila tracking-wide shrink-0">
                    वृन्दोपनिषद्
                  </span>
                  <span className="text-stone-400 dark:text-zinc-600 text-[10px]">•</span>
                  <span className="text-[11px] font-semibold text-stone-500 dark:text-zinc-400 truncate">
                    {getLocationLabel()}
                  </span>
                </div>
                <h1 className="text-stone-900 dark:text-white font-black text-sm sm:text-base tracking-tight leading-tight font-['Outfit'] truncate">
                  Foody Vrinda
                </h1>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* LOGGED-IN: User Profile & Avatar VISIBLE                                  */
            /* ========================================================================= */
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <button 
                data-tour="customer-profile profile-avatar"
                onClick={handleProfileClick}
                className="group relative w-10 h-10 sm:w-11 sm:h-11 rounded-full p-[2px] bg-gradient-to-tr from-[#E0FF33]/60 via-amber-400/40 to-[#E0FF33] transition-all duration-300 flex-shrink-0 cursor-pointer apple-tap-target active:scale-95 shadow-sm"
                title="Profile & Settings"
                aria-label="Profile and Settings"
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
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                </div>
              </button>
              
              <button 
                onClick={handleProfileClick}
                className="min-w-0 flex-1 text-left cursor-pointer group apple-tap-target"
                title="Profile & Settings"
                aria-label="Open Profile and Settings"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-amber-700 dark:text-[#E0FF33] font-laila tracking-wide shrink-0">
                    वृन्दोपनिषद्
                  </span>
                  <span className="text-stone-400 dark:text-zinc-600 text-[10px]">•</span>
                  <span className="text-[11px] font-semibold text-stone-500 dark:text-zinc-400 truncate">
                    {getLocationLabel()}
                  </span>
                </div>
                <h2 className="text-stone-900 dark:text-white font-black text-sm sm:text-base tracking-tight leading-tight font-['Outfit'] truncate group-hover:text-amber-600 dark:group-hover:text-[#E0FF33] transition-colors">
                  {getDisplayName()}
                </h2>
              </button>
            </div>
          )}
        </div>

        {/* Operational View Switcher (Desktop md+ Pill Strip) */}
        {hasStaffOrSpecialRole && (
          <div data-tour="role-switcher" className="hidden md:flex bg-stone-200/90 dark:bg-[#282526] p-1 rounded-full border border-stone-300 dark:border-white/10 gap-1 shadow-sm">
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
          {/* Universal Search Button (Available on both Mobile & Desktop) */}
          <button
            data-tour="customer-search search-btn"
            onClick={onToggleSearch}
            className="w-9 h-9 sm:w-auto sm:h-10 px-0 sm:px-3.5 rounded-full bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-white/20 hover:bg-stone-300 dark:hover:bg-[#322E30] flex items-center justify-center gap-1.5 text-stone-800 dark:text-zinc-300 hover:text-stone-950 dark:hover:text-white transition-all shadow-xs cursor-pointer apple-tap-target active:scale-95"
            title="Search dishes, menus & shops"
            aria-label="Search"
          >
            <Search size={16} className="text-amber-600 dark:text-[#E0FF33]" />
            <span className="hidden sm:inline text-xs font-bold text-stone-800 dark:text-zinc-300">Search</span>
          </button>



          {/* Quick Cart Trigger (Uniform Circular Button with floating badge) */}
          {onOpenCart && (
            <button
              data-tour="customer-basket"
              onClick={onOpenCart}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-[#E0FF33]/40 hover:bg-stone-300 dark:hover:bg-[#322E30] flex items-center justify-center text-stone-800 dark:text-zinc-200 hover:text-stone-950 dark:hover:text-white transition-all shadow-xs relative cursor-pointer apple-tap-target active:scale-95 shrink-0"
              title="Open Basket"
            >
              <ShoppingBag size={17} className="text-amber-600 dark:text-[#E0FF33]" />
              {totalQty > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 dark:bg-[#E0FF33] text-white dark:text-black text-[9.5px] font-black rounded-full flex items-center justify-center shadow-md font-['Outfit'] border-2 border-[#FAF7F2] dark:border-[#1E1B1C] leading-none">
                  {totalQty}
                </span>
              )}
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-white/20 hover:bg-stone-300 dark:hover:bg-[#322E30] items-center justify-center text-stone-800 dark:text-zinc-200 hover:text-stone-950 dark:hover:text-white transition-all shadow-xs relative cursor-pointer apple-tap-target shrink-0 active:scale-95 group ${
              totalQty > 0 && onOpenCart ? 'hidden sm:flex' : 'flex'
            }`}
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label="Toggle Theme"
          >
            {isLight ? (
              <Moon size={17} className="text-amber-600 group-hover:rotate-12 transition-transform duration-300" />
            ) : (
              <Sun size={17} className="text-[#E0FF33] group-hover:rotate-45 transition-transform duration-300" />
            )}
          </button>

          {/* Authentication & User Controls with Stable Skeleton Loading */}
          {authLoading ? (
            /* Stable loading skeleton to eliminate flicker */
            <div className="h-9 sm:h-10 w-24 sm:w-28 rounded-full bg-stone-300/60 dark:bg-white/10 animate-pulse border border-stone-300/40 dark:border-white/5 shrink-0" />
          ) : !isAuthenticated ? (
            /* ========================================================================= */
            /* LOGGED-OUT STATE: Notification Bell Completely Hidden!                    */
            /* Clear, prominent Login & Sign Up CTAs on desktop + mobile                */
            /* ========================================================================= */
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Desktop Dual Auth Buttons */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={() => onToggleAuth?.('login')}
                  className="h-9 sm:h-10 px-3.5 rounded-full bg-stone-200/80 hover:bg-stone-300 dark:bg-[#282526] dark:hover:bg-[#322E30] text-stone-800 hover:text-stone-950 dark:text-zinc-200 dark:hover:text-white border border-stone-300 dark:border-white/10 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer apple-tap-target active:scale-95 shrink-0"
                  title="Log in to your account"
                >
                  <LogIn size={14} className="text-amber-600 dark:text-[#E0FF33]" />
                  <span>Log In</span>
                </button>
                <button
                  onClick={() => onToggleAuth?.('signup')}
                  className="h-9 sm:h-10 px-4 rounded-full bg-stone-900 text-white dark:bg-[#E0FF33] dark:text-[#121011] hover:opacity-90 font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer apple-tap-target active:scale-95 shrink-0"
                  title="Create your Foody Vrinda account"
                >
                  <span>Sign Up</span>
                </button>
              </div>

              {/* Mobile Dual Auth Buttons */}
              <div className="flex sm:hidden items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onToggleAuth?.('login')}
                  className="h-8.5 px-2.5 rounded-full bg-stone-200/80 hover:bg-stone-300 dark:bg-[#282526] dark:hover:bg-[#322E30] text-stone-800 hover:text-stone-950 dark:text-zinc-200 dark:hover:text-white border border-stone-300 dark:border-white/10 font-bold text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer apple-tap-target active:scale-95 shrink-0"
                  title="Log In"
                >
                  <LogIn size={13} className="text-amber-600 dark:text-[#E0FF33]" />
                  <span>Login</span>
                </button>
                <button
                  onClick={() => onToggleAuth?.('signup')}
                  className="h-8.5 px-3 rounded-full bg-stone-900 text-white dark:bg-[#E0FF33] dark:text-[#121011] hover:opacity-90 font-black text-xs flex items-center transition-all shadow-xs cursor-pointer apple-tap-target active:scale-95 shrink-0"
                  title="Sign Up"
                >
                  <span>Sign Up</span>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* LOGGED-IN STATE: Notifications, FV Points, and Account Controls Visible  */
            /* Login/Sign Up buttons are completely hidden                              */
            /* ========================================================================= */
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* FV Dynasty Rewards Badge / Trigger */}
              {onToggleRewards && (
                <button
                  data-tour="customer-fv-wallet"
                  onClick={onToggleRewards}
                  className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-full bg-amber-500/10 dark:bg-[#E0FF33]/15 hover:bg-amber-500/20 dark:hover:bg-[#E0FF33]/25 border border-amber-500/30 dark:border-[#E0FF33]/40 flex items-center gap-1.5 text-stone-900 dark:text-white transition-all shadow-xs cursor-pointer apple-tap-target active:scale-95 shrink-0"
                  title="FV Dynasty Rewards & Referral Hub"
                >
                  <Coins size={16} className="text-amber-600 dark:text-[#E0FF33] animate-pulse" />
                  <span className="text-xs font-black font-['Outfit'] text-amber-700 dark:text-[#E0FF33]">
                    {walletData?.available_points ?? 0}
                    <span className="hidden sm:inline ml-0.5 text-[10px] font-bold text-stone-500 dark:text-zinc-400">FV</span>
                  </span>
                </button>
              )}

              {/* Notifications Trigger (Shown ONLY when Authenticated) */}
              <button 
                onClick={onToggleNotifications}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-white/20 hover:bg-stone-300 dark:hover:bg-[#322E30] flex items-center justify-center text-stone-800 dark:text-zinc-200 hover:text-stone-950 dark:hover:text-white transition-all shadow-xs relative cursor-pointer apple-tap-target shrink-0 active:scale-95"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={17} />
                
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 dark:bg-[#E0FF33] rounded-full ring-2 ring-[#FAF7F2] dark:ring-[#1E1B1C] shadow-sm animate-pulse"></span>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Dedicated Operational View Switcher (Full-Width Flexible Grid with balanced touch targets) */}
      {hasStaffOrSpecialRole && (
        <div className="grid grid-flow-col auto-cols-fr md:hidden bg-stone-200/90 dark:bg-[#282526] p-1 rounded-2xl border border-stone-300 dark:border-white/10 shadow-sm mt-1.5 mb-2.5 w-full gap-1">
          <button 
            onClick={() => setCurrentTab('customer')}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all text-center cursor-pointer flex items-center justify-center ${
              currentTab === 'customer' 
                ? 'bg-stone-900 text-white dark:bg-[#E0FF33] dark:text-[#121011] font-black shadow-xs' 
                : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            Store
          </button>

          {(['kitchen'].includes(userRole) || isAuthorizedAdmin || isAuthorizedDeveloper) && (
            <button 
              onClick={() => setCurrentTab('kitchen')}
              className={`py-2 px-1 text-xs font-bold rounded-xl transition-all text-center cursor-pointer flex items-center justify-center ${
                currentTab === 'kitchen' 
                  ? 'bg-amber-600 text-white dark:bg-[#E0FF33] dark:text-[#1E1B1C] font-black shadow-xs' 
                  : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Kitchen
            </button>
          )}

          {(['delivery'].includes(userRole) || isAuthorizedAdmin || isAuthorizedDeveloper) && (
            <button 
              onClick={() => setCurrentTab('delivery')}
              className={`py-2 px-1 text-xs font-bold rounded-xl transition-all text-center cursor-pointer flex items-center justify-center ${
                currentTab === 'delivery' 
                  ? 'bg-cyan-600 text-white dark:bg-[#06B6D4] dark:text-[#1E1B1C] font-black shadow-xs' 
                  : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Rider
            </button>
          )}

          {isAuthorizedAdmin && (
            <button 
              onClick={() => setCurrentTab('owner')}
              className={`py-2 px-1 text-xs font-bold rounded-xl transition-all text-center cursor-pointer flex items-center justify-center ${
                currentTab === 'owner' 
                  ? 'bg-purple-600 text-white dark:bg-[#A855F7] dark:text-white font-black shadow-xs' 
                  : 'text-stone-700 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Owner
            </button>
          )}

          {isAuthorizedDeveloper && (
            <button 
              onClick={() => setCurrentTab('developer')}
              className={`py-2 px-1 text-xs font-bold rounded-xl transition-all text-center cursor-pointer flex items-center justify-center ${
                currentTab === 'developer' 
                  ? 'bg-emerald-600 text-white dark:bg-[#10B981] dark:text-white font-black shadow-xs' 
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
