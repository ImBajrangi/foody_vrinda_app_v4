import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useCart } from '../context/CartContext';
import { Bell, ShoppingBag, Coins, LogIn, Download, Sparkles, X } from 'lucide-react';
import { getCachedWallet, subscribeUserWallet } from '../services/fvWalletService';
import { Capacitor } from '@capacitor/core';
import FoodyVrindaLogo from './ui/FoodyVrindaLogo';

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

  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);

  const [walletData, setWalletData] = useState(() => getCachedWallet(user?.id || userData?.id));

  // First-time visitor login indication state
  const [showLoginHint, setShowLoginHint] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !isAuthenticated && !localStorage.getItem('foody_login_hint_seen');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (showLoginHint) {
      const t = setTimeout(() => {
        setShowLoginHint(false);
        try { localStorage.setItem('foody_login_hint_seen', 'true'); } catch (_) {}
      }, 15000);
      return () => clearTimeout(t);
    }
  }, [showLoginHint]);

  const dismissLoginHint = () => {
    setShowLoginHint(false);
    try { localStorage.setItem('foody_login_hint_seen', 'true'); } catch (_) {}
  };

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
    dismissLoginHint();
    if (onToggleAuth) {
      onToggleAuth(isAuthenticated ? undefined : 'login');
    }
  };

  const getDisplayName = () => {
    if (!isAuthenticated) return 'Foody Vrinda';
    if (userData?.displayName && userData.displayName !== 'User') return userData.displayName;
    if (user?.displayName && user.displayName !== 'User') return user.displayName;
    const email = user?.email || userData?.email;
    if (email && email.includes('@')) {
      const raw = email.split('@')[0].replace(/[._-]/g, ' ').trim();
      if (raw.length > 0) {
        return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
    const cleanPhone = (user?.phone || userData?.phone || '').replace(/\D/g, '');
    if (cleanPhone.length >= 4) return `Member (${cleanPhone.slice(-4)})`;
    return 'Devotee';
  };

  const getLocationLabel = () => {
    // 1. Check user custom location / delivery address if saved
    const savedAddress = userData?.address || userData?.delivery_address || userData?.city || '';
    if (savedAddress && typeof savedAddress === 'string' && savedAddress.trim().length > 0) {
      const match = savedAddress.match(/(Barsana|Vrindavan|Chhata|Goverdhan|Mathura)/i);
      if (match) return match[1];
      const parts = savedAddress.split(',')[0].trim();
      if (parts.length > 0 && parts.length <= 16) return parts;
      if (parts.length > 16) return parts.slice(0, 16);
    }

    // 2. Check active/selected shop name or area (strictly non-deleted active shops)
    const activeShop = allShops?.find(s => s.id === currentUserShopId && s.is_active !== false && !s.is_deleted) 
      || allShops?.find(s => s.is_active !== false && !s.is_deleted) 
      || allShops?.[0];
    if (activeShop?.address) {
      const match = activeShop.address.match(/(Barsana|Vrindavan|Chhata|Goverdhan|Mathura)/i);
      if (match) return match[1];
      const parts = activeShop.address.split(',')[0].trim();
      if (parts.length > 0 && parts.length <= 16) return parts;
    }
    if (activeShop?.tag && activeShop.tag.length <= 14) {
      return activeShop.tag;
    }
    if (activeShop?.name) {
      const shortName = activeShop.name.replace(/^(Shri\s+|Prem\s+Mandir\s+|Radharani\s+|Radha\s+Rani\s+)/i, '').trim();
      if (shortName.length > 0 && shortName.length <= 16) return shortName;
    }

    return 'Vrindavan';
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
        {/* Left: Brand Identity / Profile Avatar with Instagram Story Animated Ring */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {authLoading ? (
            /* Stable loading placeholder to eliminate flicker on boot */
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-stone-300/60 dark:bg-white/10 animate-pulse shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="w-20 h-3 bg-stone-300/60 dark:bg-white/10 rounded animate-pulse" />
                <div className="w-28 h-4 bg-stone-300/60 dark:bg-white/10 rounded animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              {/* Instagram-Style Story Animated Ring Avatar Button */}
              <div className="relative shrink-0">
                <button 
                  data-tour="customer-profile profile-avatar"
                  onClick={handleProfileClick}
                  className="group relative flex items-center justify-center p-1 rounded-full transition-transform duration-200 cursor-pointer apple-tap-target active:scale-95"
                  title={isAuthenticated ? "Profile & Settings" : "Sign in / Register"}
                  aria-label={isAuthenticated ? "Profile and Settings" : "Sign in to Foody Vrinda"}
                >
                  <div className="relative flex items-center justify-center p-[3px]">
                    {/* Instagram-Style True Morph & Merge Story Ring: Expands, Shrinks Gaps, and Merges Solid on Open */}
                    <svg 
                      className="absolute -inset-[4px] w-[calc(100%+8px)] h-[calc(100%+8px)] pointer-events-none" 
                      viewBox="0 0 56 56"
                    >
                      <defs>
                        <linearGradient id="satvikThemeRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FD9139" />
                          <stop offset="35%" stopColor="#FCA65E" />
                          <stop offset="70%" stopColor="#AD4728" />
                          <stop offset="100%" stopColor="#FD9139" />
                        </linearGradient>
                      </defs>

                      {/* Faint Base Guide Track */}
                      <circle 
                        cx="28" cy="28" r="24.5" 
                        fill="none" 
                        stroke="url(#satvikThemeRingGrad)" 
                        strokeWidth="1.2" 
                        strokeOpacity="0.18" 
                      />

                      {/* Morphing & Merging Signature Circle Path */}
                      <circle 
                        cx="28" cy="28" r="24.5" 
                        fill="none" 
                        stroke="url(#satvikThemeRingGrad)" 
                        strokeLinecap="round" 
                        className="satvik-story-morph-once" 
                      />
                    </svg>

                    {/* Inner Avatar Frame */}
                    <div 
                      style={{ backgroundColor: '#1E1B1C' }}
                      className="relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-obsidian-luxury border border-stone-200/50 dark:border-white/10 flex items-center justify-center shadow-inner"
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
                        <div className="w-full h-full flex items-center justify-center">
                          <FoodyVrindaLogo className="w-full h-full" bg="circle" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </div>
              
              <button 
                onClick={handleProfileClick}
                className="min-w-0 flex-1 text-left cursor-pointer group apple-tap-target"
                title={isAuthenticated ? "Profile & Settings" : "Sign in / Register"}
                aria-label="Open Profile and Settings"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-amber-700 dark:text-[#FD9139] font-laila tracking-wide shrink-0">
                    वृन्दोपनिषद्
                  </span>
                  <span className="text-stone-400 dark:text-zinc-600 text-[10px] shrink-0">•</span>
                  <span className="text-[11px] font-semibold text-stone-500 dark:text-zinc-400 truncate">
                    {getLocationLabel()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <h2 className="text-stone-900 dark:text-white font-black text-sm sm:text-base tracking-tight leading-tight font-outfit font-sans truncate group-hover:text-amber-600 dark:group-hover:text-[#FD9139] transition-colors">
                    {getDisplayName()}
                  </h2>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Operational View Switcher (Desktop md+ Pill Strip) */}
        {hasStaffOrSpecialRole && (
          <div data-tour="role-switcher" className="hidden md:flex bg-white/95 dark:bg-[#282526] p-1 rounded-full border border-stone-200 dark:border-white/10 gap-1">
            <button 
              onClick={() => setCurrentTab('customer')}
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target cursor-pointer ${
                currentTab === 'customer' 
                  ? 'category-pill-active bg-[#FD9139] text-white font-black' 
                  : 'text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Store
            </button>

            {(['kitchen'].includes(userRole) || isAuthorizedAdmin || isAuthorizedDeveloper) && (
              <button 
                onClick={() => setCurrentTab('kitchen')}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all apple-tap-target cursor-pointer ${
                  currentTab === 'kitchen' 
                    ? 'bg-[#FD9139] text-white font-black' 
                    : 'text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
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
                    ? 'category-pill-active bg-[#FD9139] text-white font-black' 
                    : 'text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
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
                    ? 'bg-purple-600 dark:bg-[#A855F7] text-white font-black' 
                    : 'text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
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
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white font-black' 
                    : 'text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                Dev
              </button>
            )}
          </div>
        )}

        {/* Right: Actions Cluster (Max 2 items on mobile to keep header clean & spacious) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Cart Trigger (Desktop only to prevent mobile top header crowding; mobile uses Floating Cart Bar) */}
          {onOpenCart && totalQty > 0 && (
            <button
              data-tour="customer-basket"
              onClick={onOpenCart}
              className="hidden md:flex w-9 h-9 rounded-full bg-stone-200/90 dark:bg-[#282526] border border-amber-500/40 dark:border-[#FD9139]/40 hover:border-amber-500/60 dark:hover:border-[#FD9139]/60 hover:bg-stone-300 dark:hover:bg-[#322E30] items-center justify-center text-stone-800 dark:text-zinc-200 hover:text-stone-950 dark:hover:text-white transition-all shadow-xs relative cursor-pointer apple-tap-target active:scale-95 shrink-0 animate-scale-in"
              title="Open Basket"
              aria-label="Open Basket"
            >
              <ShoppingBag size={16} className="text-[#FD9139]" />
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#FD9139] text-white text-[9.5px] font-black rounded-full flex items-center justify-center shadow-md font-outfit font-sans border-2 border-[#FAF7F2] dark:border-[#1E1B1C] leading-none">
                {totalQty}
              </span>
            </button>
          )}

          {/* Authentication & User Controls */}
          {authLoading ? (
            <div className="h-9 w-20 rounded-full bg-stone-300/60 dark:bg-white/10 animate-pulse border border-stone-300/40 dark:border-white/5 shrink-0" />
          ) : !isAuthenticated ? (
            /* Logged-Out Controls: Max 2 items (Install App + Sign In) */
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {!Capacitor.isNativePlatform() && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('foody:open-install-app'))}
                  className="h-9 w-9 sm:w-auto px-0 sm:px-3 rounded-full bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-white/20 hover:bg-stone-300 dark:hover:bg-[#322E30] flex items-center justify-center sm:justify-start gap-1.5 text-stone-800 dark:text-zinc-200 hover:text-stone-950 dark:hover:text-white transition-all shadow-xs cursor-pointer apple-tap-target shrink-0 active:scale-95"
                  title="Install Foody Vrinda App"
                  aria-label="Install App"
                >
                  <Download size={14} className="text-[#FD9139]" />
                  <span className="text-[11px] font-black hidden sm:inline">Install</span>
                </button>
              )}
              <button
                onClick={() => onToggleAuth?.('login')}
                className="h-9 px-3 sm:px-3.5 rounded-full bg-[#FD9139] hover:bg-[#FCA65E] text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer apple-tap-target active:scale-95 shrink-0"
                title="Sign in to your account"
              >
                <LogIn size={13} className="text-white" />
                <span>Sign In</span>
              </button>
            </div>
          ) : (
            /* Logged-In User Controls: Strictly 2 items on mobile (Rewards Badge + Notifications Trigger) */
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Optional Install button on large desktop screens only */}
              {!Capacitor.isNativePlatform() && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('foody:open-install-app'))}
                  className="hidden lg:flex h-9 px-2.5 sm:px-3 rounded-full bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-white/20 hover:bg-stone-300 dark:hover:bg-[#322E30] items-center gap-1.5 text-stone-800 dark:text-zinc-200 hover:text-stone-950 dark:hover:text-white transition-all shadow-xs cursor-pointer apple-tap-target shrink-0 active:scale-95"
                  title="Install Foody Vrinda App"
                  aria-label="Install App"
                >
                  <Download size={14} className="text-[#FD9139]" />
                  <span className="text-[11px] font-black">Install</span>
                </button>
              )}

              {/* 1. FV Dynasty Rewards Badge */}
              {onToggleRewards && (
                <button
                  data-tour="customer-fv-wallet"
                  onClick={onToggleRewards}
                  className="h-9 px-2.5 sm:px-3 rounded-full bg-yellow-400/15 dark:bg-[#FFD000]/15 hover:bg-yellow-400/25 dark:hover:bg-[#FFD000]/25 border border-yellow-500/35 dark:border-[#FFD000]/40 flex items-center gap-1.5 text-stone-900 dark:text-white transition-all shadow-xs cursor-pointer apple-tap-target active:scale-95 shrink-0"
                  title="FV Dynasty Rewards & Referral Hub"
                >
                  <Coins size={14} className="text-amber-500 dark:text-[#FFD000] shrink-0" />
                  <span className="text-xs font-black font-outfit font-sans text-amber-800 dark:text-[#FFD000] flex items-center">
                    {walletData?.available_points ?? 0}
                    <span className="ml-0.5 text-[10px] font-bold text-amber-700/80 dark:text-yellow-200/90">FV</span>
                  </span>
                </button>
              )}

              {/* 2. Notifications Trigger */}
              <button 
                onClick={onToggleNotifications}
                className="w-9 h-9 rounded-full bg-stone-200/90 dark:bg-[#282526] border border-stone-300 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-white/20 hover:bg-stone-300 dark:hover:bg-[#322E30] flex items-center justify-center text-stone-800 dark:text-zinc-200 hover:text-stone-950 dark:hover:text-white transition-all shadow-xs relative cursor-pointer apple-tap-target shrink-0 active:scale-95"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[#FD9139] rounded-full ring-2 ring-[#FAF7F2] dark:ring-[#1E1B1C] shadow-sm"></span>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* First-Time Visitor Luxury Welcome Strip */}
      {!isAuthenticated && showLoginHint && (
        <div className="mt-2 mb-2 w-full p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#FD9139]/10 to-amber-600/15 border border-amber-500/30 dark:border-amber-500/25 backdrop-blur-md flex items-center justify-between gap-2.5 sm:gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-[#FD9139] flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black font-outfit text-stone-900 dark:text-white truncate">
                  Welcome to Foody Vrinda!
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-700 dark:text-[#FD9139] shrink-0">
                  +50 Coins
                </span>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-zinc-300 truncate">
                Sign in with mobile to earn 50 FV Coins & track live orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleProfileClick}
              className="px-3 py-1.5 rounded-xl bg-[#FD9139] hover:bg-[#FCA65E] text-white text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={dismissLoginHint}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Dismiss welcome message"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Dedicated Operational View Switcher (Full-Width Flexible Grid with balanced touch targets) */}
      {hasStaffOrSpecialRole && (
        <div className="grid grid-flow-col auto-cols-fr md:hidden bg-white/95 dark:bg-[#282526] p-1 rounded-2xl border border-stone-200 dark:border-white/10 mt-1.5 mb-2.5 w-full gap-1">
          <button 
            onClick={() => setCurrentTab('customer')}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all text-center cursor-pointer flex items-center justify-center ${
              currentTab === 'customer' 
                ? 'bg-[#FD9139] text-white font-black' 
                : 'text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            Store
          </button>

          {(['kitchen'].includes(userRole) || isAuthorizedAdmin || isAuthorizedDeveloper) && (
            <button 
              onClick={() => setCurrentTab('kitchen')}
              className={`py-2 px-1 text-xs font-bold rounded-xl transition-all text-center cursor-pointer flex items-center justify-center ${
                currentTab === 'kitchen' 
                  ? 'bg-[#FD9139] text-white font-black' 
                  : 'text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
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
                  ? 'bg-cyan-600 text-white dark:bg-[#06B6D4] dark:text-white font-black' 
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
                  ? 'bg-purple-600 text-white dark:bg-[#A855F7] dark:text-white font-black' 
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
                  ? 'bg-emerald-600 text-white dark:bg-[#10B981] dark:text-white font-black' 
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
