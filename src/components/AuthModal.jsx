import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { 
  X, 
  LogIn, 
  UserPlus, 
  LogOut, 
  Phone, 
  Mail, 
  Lock, 
  User, 
  Store, 
  Truck, 
  ChefHat, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  KeyRound,
  Compass,
  Zap,
  MapPin,
  Terminal
} from 'lucide-react';

const DESK_CONFIG = {
  customer: {
    icon: Sparkles,
    title: 'Customer Storefront',
    subtitle: 'Order delicious Satvik food & quick delivery in Vrindavan',
    badge: 'Customer',
    color: '#E0FF33',
    accentBg: 'rgba(224, 255, 51, 0.12)',
    border: 'rgba(224, 255, 51, 0.25)'
  },
  kitchen: {
    icon: ChefHat,
    title: 'Kitchen Operations',
    subtitle: 'Live kitchen display screen & station prep',
    badge: 'Kitchen Chef',
    color: '#F59E0B',
    accentBg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.25)'
  },
  delivery: {
    icon: Truck,
    title: 'Sarathi Delivery Fleet',
    subtitle: 'Real-time rider dispatch, GPS routing & COD audit',
    badge: 'Sarathi Rider',
    color: '#06B6D4',
    accentBg: 'rgba(6, 182, 212, 0.12)',
    border: 'rgba(6, 182, 212, 0.25)'
  },
  owner: {
    icon: ShieldCheck,
    title: 'Admin & Store Owner',
    subtitle: 'Revenue metrics, dish catalog & settlements',
    badge: 'Store Owner',
    color: '#A855F7',
    accentBg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.25)'
  },
  developer: {
    icon: Terminal,
    title: 'Developer Master Console',
    subtitle: 'Full system root access, live simulation & master telemetry',
    badge: 'Developer',
    color: '#E0FF33',
    accentBg: 'rgba(224, 255, 51, 0.15)',
    border: 'rgba(224, 255, 51, 0.3)'
  }
};

export default function AuthModal({ isOpen, onClose }) {
  const { 
    user, 
    userData, 
    userRole, 
    isAuthorizedAdmin,
    isAuthorizedDeveloper,
    currentShopName, 
    allShops,
    loginWithEmail, 
    signupWithEmail,
    loginWithGoogle, 
    loginWithPhoneLookup,
    impersonate,
    logout 
  } = useAuth();
  
  const { clearCart } = useCart();
  
  const [selectedDesk, setSelectedDesk] = useState('customer');
  const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' | 'email' | 'demo'
  const [isSignup, setIsSignup] = useState(false);
  const [showStaffWorkspaces, setShowStaffWorkspaces] = useState(false);
  const [showStaffSignIn, setShowStaffSignIn] = useState(false);
  
  // Form fields
  const [phoneInput, setPhoneInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  
  // Demo selection
  const [demoShopId, setDemoShopId] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  // Helper to get allowed workspaces by verified role
  const getAuthorizedWorkspaces = (role) => {
    if (isAuthorizedDeveloper || role === 'developer') {
      return [
        { role: 'customer', label: 'Storefront', icon: Sparkles },
        { role: 'kitchen', label: 'Kitchen KDS', icon: ChefHat },
        { role: 'delivery', label: 'Rider Board', icon: Truck },
        { role: 'owner', label: 'Admin Desk', icon: ShieldCheck },
        { role: 'developer', label: 'Developer Console', icon: Terminal, fullWidth: true }
      ];
    }
    if (isAuthorizedAdmin || role === 'owner') {
      return [
        { role: 'customer', label: 'Storefront', icon: Sparkles },
        { role: 'kitchen', label: 'Kitchen KDS', icon: ChefHat },
        { role: 'delivery', label: 'Rider Board', icon: Truck },
        { role: 'owner', label: 'Admin Desk', icon: ShieldCheck }
      ];
    }
    if (role === 'kitchen') {
      return [
        { role: 'customer', label: 'Storefront', icon: Sparkles },
        { role: 'kitchen', label: 'Kitchen KDS', icon: ChefHat }
      ];
    }
    if (role === 'delivery') {
      return [
        { role: 'customer', label: 'Storefront', icon: Sparkles },
        { role: 'delivery', label: 'Rider Board', icon: Truck }
      ];
    }
    return [];
  };

  // Drag down dismissal state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);

  const handleAnimatedClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setDragY(0);
      onClose();
    }, 220);
  }, [closing, onClose]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    setDragStartY(e.clientY || (e.touches && e.touches[0].clientY) || 0);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const currentY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    const diff = currentY - dragStartY;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY > 120) {
      handleAnimatedClose();
    } else {
      setDragY(0);
    }
  };

  if (!isOpen) return null;

  const currentTheme = DESK_CONFIG[selectedDesk] || DESK_CONFIG.customer;
  const DeskIcon = currentTheme.icon;

  // Phone Lookup Sign In (Like Vrinda Tours Standard)
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const profile = await loginWithPhoneLookup(phoneInput);
      setSuccessMsg(`Welcome, ${profile.displayName || 'Customer'}!`);
      setTimeout(() => {
        handleAnimatedClose();
      }, 450);
    } catch (err) {
      setError(err.message || 'Phone sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Email / Password Submit
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (isSignup) {
        await signupWithEmail(email, password, displayName, signupPhone, signupAddress);
        setSuccessMsg('Account created successfully!');
      } else {
        await loginWithEmail(email, password);
        setSuccessMsg('Signed in successfully!');
      }
      setTimeout(() => {
        handleAnimatedClose();
      }, 450);
    } catch (err) {
      const messages = { 
        'auth/invalid-credential': 'Invalid email or password.', 
        'auth/user-not-found': 'No account found with this email.', 
        'auth/wrong-password': 'Incorrect password.', 
        'auth/email-already-in-use': 'This email is already registered. Please log in.', 
        'auth/weak-password': 'Password must be at least 6 characters.' 
      };
      setError(messages[err.code] || `Authentication failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccessMsg('');
    try {
      await loginWithGoogle();
      handleAnimatedClose();
    } catch (err) {
      setError("Google Login failed. Please try Phone or Email.");
      console.error(err);
    }
  };

  const handleDemoAccess = (role) => {
    if (['owner', 'developer'].includes(role) && !isAuthorizedAdmin && !isAuthorizedDeveloper) {
      setError(`Access Restricted: ${role === 'developer' ? 'Developer' : 'Administrator'} account credentials required.`);
      setLoginMethod('email');
      return;
    }
    setSelectedDesk(role);
    const targetShop = demoShopId || (allShops[0]?.id || 'shop-1');
    const ok = impersonate(targetShop, role);
    if (!ok) {
      setError(`Access Denied: Only authorized users can access the ${role.toUpperCase()} panel.`);
      return;
    }
    setSuccessMsg(`Switched to ${role.toUpperCase()} workspace!`);
    setTimeout(() => {
      handleAnimatedClose();
    }, 350);
  };

  const handleLogout = async () => {
    await logout();
    clearCart();
    handleAnimatedClose();
  };

  const isAuthenticated = user && !user.isAnonymous;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAnimatedClose();
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-[2px] transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Modal / Bottom Sheet Box */}
      <div 
        style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : 'none' }}
        className={`relative w-full max-w-[440px] bg-[#1E1B1C] border border-white/10 text-white rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col gap-4.5 max-h-[92vh] overflow-y-auto no-scrollbar transition-transform duration-100 relative overflow-hidden ${closing ? 'translate-y-12' : 'translate-y-0'}`}
      >
        {/* Subtle Ambient Header Accent (Zero Muddy Bleed) */}
        <div 
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-20 transition-all duration-500"
          style={{ background: currentTheme.color }}
        />

        {/* Drag Handle Bar (Mobile Only) */}
        <div 
          onPointerDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          className="w-full py-1 -mt-2 flex justify-center cursor-grab active:cursor-grabbing sm:hidden touch-none"
        >
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Top Header Row */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center border transition-all shrink-0 shadow-sm"
              style={{ 
                background: currentTheme.accentBg, 
                borderColor: currentTheme.border, 
                color: currentTheme.color 
              }}
            >
              <DeskIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-['Outfit'] tracking-tight leading-tight">
                {currentTheme.title}
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-['Plus_Jakarta_Sans'] line-clamp-1 mt-0.5">
                {currentTheme.subtitle}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleAnimatedClose} 
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all border border-white/5 active:scale-95 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* ALERTS & STATUS */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold flex items-center gap-2 relative z-10 animate-fade-in">
            <X className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-2 relative z-10 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* AUTHENTICATED PROFILE VIEW */}
        {isAuthenticated ? (
          <div className="space-y-3.5 relative z-10">
            {/* 1. Main Profile Card */}
            <div className="flex items-center gap-3.5 p-4 rounded-3xl bg-[#151314] border border-white/5">
              <div className="w-14 h-14 rounded-2xl bg-[#282526] border border-white/10 flex items-center justify-center text-white text-lg font-black shrink-0 overflow-hidden shadow-md">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-['Outfit'] font-black text-xl text-[#E0FF33]">
                    {(userData?.displayName ? userData.displayName.charAt(0) : user.email?.charAt(0) || 'U').toUpperCase()}
                  </span>
                )}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-black text-white text-base sm:text-lg font-['Outfit'] truncate">
                    {userData?.displayName || user.displayName || 'Customer'}
                  </h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    isAuthorizedDeveloper
                      ? 'bg-[#E0FF33]/15 text-[#E0FF33] border border-[#E0FF33]/30'
                      : isAuthorizedAdmin
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {isAuthorizedDeveloper ? 'Developer' : isAuthorizedAdmin ? 'Admin' : 'Verified Member'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate">{user.email || user.phoneNumber || userData?.phone || 'Mobile Session'}</p>
                {currentShopName && (
                  <p className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                    <Store className="w-3 h-3 shrink-0" />
                    <span className="truncate">{currentShopName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* 2. Quick Customer Loyalty & Account Stat Badges */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-[#151314] border border-white/5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E0FF33]/10 border border-[#E0FF33]/20 flex items-center justify-center text-[#E0FF33] shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Prasad Coins</span>
                  <span className="text-xs font-black text-white font-['Outfit']">150 Coins</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#151314] border border-white/5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Account Tier</span>
                  <span className="text-xs font-black text-white font-['Outfit']">Vedic Devotee</span>
                </div>
              </div>
            </div>

            {/* 3. Saved Delivery Address Card */}
            {(userData?.address || userData?.customerAddress) ? (
              <div className="p-3.5 rounded-2xl bg-[#151314] border border-white/5 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#E0FF33] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Default Delivery Address
                  </span>
                  <p className="text-xs text-zinc-300 font-medium line-clamp-2 mt-0.5">
                    {userData.address || userData.customerAddress}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#151314] border border-white/5 flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-zinc-400 font-medium">No saved address yet</span>
                </div>
              </div>
            )}

            {/* 4. Authorized Workspaces Switcher: ONLY for verified Admin or Developer accounts */}
            {(isAuthorizedDeveloper || isAuthorizedAdmin) && (
              <div className="p-3.5 rounded-3xl bg-[#151314] border border-white/5 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {isAuthorizedDeveloper ? 'Developer Operational Switcher' : 'Administrator Workspaces'}
                  </span>
                  <span className="text-[10px] font-black text-[#E0FF33] px-2 py-0.5 rounded-full bg-[#E0FF33]/10 border border-[#E0FF33]/20">
                    {isAuthorizedDeveloper ? 'DEVELOPER' : 'ADMIN'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {getAuthorizedWorkspaces(userRole).map((d) => {
                    const Icon = d.icon;
                    const isCurrent = userRole === d.role;
                    return (
                      <button
                        key={d.role}
                        type="button"
                        onClick={() => {
                          impersonate(demoShopId || allShops[0]?.id || 'shop-1', d.role);
                          handleAnimatedClose();
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          d.fullWidth ? 'col-span-2 justify-center' : ''
                        } ${
                          isCurrent 
                            ? 'bg-[#E0FF33] text-black border-[#E0FF33] shadow-sm font-extrabold' 
                            : 'bg-[#1E1B1C] text-zinc-300 border-white/5 hover:border-white/15'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Sign Out Button */}
            <button 
              type="button"
              onClick={handleLogout}
              className="w-full py-3 px-4 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Account</span>
            </button>
          </div>
        ) : (
          /* GUEST / SIGN-IN PORTAL DESK */
          <div className="space-y-3.5 relative z-10">
            {/* Multi-Role Segmented Switcher Strip (Only shown when staff access is active) */}
            {showStaffSignIn && (
              <div className="grid grid-cols-5 bg-[#151314] p-1 rounded-2xl border border-white/5 gap-1 animate-fade-in">
                {[
                  { id: 'customer', label: 'Store', icon: Sparkles },
                  { id: 'kitchen', label: 'Kitchen', icon: ChefHat },
                  { id: 'delivery', label: 'Sarathi', icon: Truck },
                  { id: 'owner', label: 'Admin', icon: ShieldCheck },
                  { id: 'developer', label: 'Dev', icon: Terminal }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = selectedDesk === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setSelectedDesk(tab.id);
                        setError('');
                        setSuccessMsg('');
                      }}
                      className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all text-center select-none cursor-pointer ${
                        isActive
                          ? 'bg-[#282526] text-white shadow-sm border border-white/10 font-extrabold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0 text-[#E0FF33]" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sub-Navigation Method Switcher */}
            <div className={`grid ${showStaffSignIn ? 'grid-cols-3' : 'grid-cols-2'} bg-[#151314]/80 p-1 rounded-2xl border border-white/5 gap-1`}>
              <button 
                type="button"
                onClick={() => { setLoginMethod('phone'); setError(''); setSuccessMsg(''); }}
                className={`py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer ${
                  loginMethod === 'phone' 
                    ? 'bg-[#282526] text-white shadow-sm border border-white/10' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Phone className="w-3 h-3 text-[#E0FF33] shrink-0" />
                <span className="truncate">Mobile</span>
              </button>

              <button 
                type="button"
                onClick={() => { setLoginMethod('email'); setError(''); setSuccessMsg(''); }}
                className={`py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer ${
                  loginMethod === 'email' 
                    ? 'bg-[#282526] text-white shadow-sm border border-white/10' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Mail className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">Email</span>
              </button>

              {showStaffSignIn && (
                <button 
                  type="button"
                  onClick={() => { setLoginMethod('demo'); setError(''); setSuccessMsg(''); }}
                  className={`py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer ${
                    loginMethod === 'demo' 
                      ? 'bg-[#282526] text-white shadow-sm border border-white/10' 
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Zap className="w-3 h-3 text-purple-400 shrink-0" />
                  <span className="truncate">Demo Desk</span>
                </button>
              )}
            </div>

            {/* METHOD 1: QUICK PHONE LOOKUP */}
            {loginMethod === 'phone' && (
              <form onSubmit={handlePhoneSubmit} className="space-y-3 pt-0.5">
                <div className="space-y-1.5">
                  <div className="flex items-center bg-[#151314] border border-white/10 rounded-2xl focus-within:border-[#E0FF33]/40 focus-within:ring-2 focus-within:ring-[#E0FF33]/10 transition-all px-3 py-1">
                    <span className="text-xs font-black text-[#E0FF33] font-['Outfit'] pr-2.5 border-r border-white/10 select-none">
                      +91
                    </span>
                    <input 
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      required
                      className="w-full bg-transparent pl-3 pr-1 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none font-['Plus_Jakarta_Sans'] font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 px-1 font-medium">
                    Instant lookup for registered customers, kitchen staff, and delivery riders.
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || phoneInput.length < 10}
                  className="w-full py-3.5 px-6 rounded-full bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed apple-tap-target font-['Outfit']"
                >
                  <span>{loading ? 'Verifying Phone...' : 'Sign In with Mobile'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* METHOD 2: EMAIL & PASSWORD */}
            {loginMethod === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-3 pt-0.5">

                {/* ── SIGNUP: Identity Section ── */}
                {isSignup && (
                  <div className="p-3.5 rounded-3xl bg-[#151314] border border-white/5 space-y-2.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block px-0.5">
                      Your Identity
                    </span>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Full Name"
                        required
                        className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all"
                      />
                    </div>
                    <div className="relative flex items-center bg-[#1E1B1C] border border-white/10 rounded-2xl focus-within:border-[#E0FF33]/40 focus-within:ring-2 focus-within:ring-[#E0FF33]/10 transition-all px-3 py-0.5">
                      <Phone className="w-4 h-4 text-zinc-500 shrink-0 mr-2" />
                      <span className="text-[11px] font-black text-[#E0FF33] pr-2 border-r border-white/10 select-none font-['Outfit']">+91</span>
                      <input 
                        type="tel" 
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="10-digit mobile"
                        maxLength={10}
                        className="flex-1 bg-transparent pl-2 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none font-['Plus_Jakarta_Sans']"
                      />
                    </div>
                  </div>
                )}

                {/* ── Credentials Section (Always visible) ── */}
                <div className={`${isSignup ? 'p-3.5 rounded-3xl bg-[#151314] border border-white/5 space-y-2.5' : 'space-y-2.5'}`}>
                  {isSignup && (
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block px-0.5">
                      Login Credentials
                    </span>
                  )}
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isSignup ? "Email Address" : "Email Address (e.g. user@example.com)"}
                      required
                      className="w-full bg-[#151314] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignup ? "Create Password (min 6 chars)" : "Password"}
                      required
                      className="w-full bg-[#151314] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all"
                    />
                  </div>
                </div>

                {/* ── SIGNUP: Delivery Section ── */}
                {isSignup && (
                  <div className="p-3.5 rounded-3xl bg-[#151314] border border-white/5 space-y-2.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block px-0.5">
                      Default Delivery
                    </span>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        value={signupAddress}
                        onChange={(e) => setSignupAddress(e.target.value)}
                        placeholder="Address (e.g. Near ISKCON Temple, Raman Reti)"
                        className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 px-1 font-medium leading-relaxed">
                      We'll also use your GPS for precise delivery. You can always change this later.
                    </p>
                  </div>
                )}

                {/* ── CTA ── */}
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-full bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer font-['Outfit'] apple-tap-target"
                >
                  <span>{loading ? 'Authenticating...' : (isSignup ? 'Create Account' : 'Sign In')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-0.5">
                  <button 
                    type="button"
                    onClick={() => { setIsSignup(!isSignup); setError(''); }}
                    className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {isSignup ? 'Already have an account? ' : "Don't have an account? "}
                    <span className="text-[#E0FF33] font-bold underline ml-1">{isSignup ? 'Log In' : 'Sign Up Free'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* METHOD 3: QUICK DEMO ACCESS */}
            {loginMethod === 'demo' && (
              <div className="space-y-2.5 pt-0.5">
                <div className="p-3 rounded-2xl bg-[#151314] border border-white/5 space-y-2">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Target Kitchen Location
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                    {allShops.map(s => {
                      const isSelected = (demoShopId || allShops[0]?.id) === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setDemoShopId(s.id)}
                          className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between text-left cursor-pointer ${
                            isSelected
                              ? 'bg-[#E0FF33]/15 text-[#E0FF33] border-[#E0FF33]/40 shadow-sm'
                              : 'bg-[#1E1B1C] text-zinc-400 border-white/5 hover:text-white hover:border-white/15'
                          }`}
                        >
                          <span className="truncate">{s.name}</span>
                          {isSelected && <span className="text-[10px] bg-[#E0FF33] text-black px-1.5 py-0.2 rounded font-black">ACTIVE</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    onClick={() => handleDemoAccess('kitchen')}
                    className="p-3 rounded-2xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/20 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <ChefHat className="w-4 h-4" />
                    <span>Kitchen Staff</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => handleDemoAccess('delivery')}
                    className="p-3 rounded-2xl bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 border border-cyan-400/20 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Sarathi Rider</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => handleDemoAccess('owner')}
                    className="p-3 rounded-2xl bg-purple-400/10 hover:bg-purple-400/20 text-purple-300 border border-purple-400/20 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Owner</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => handleDemoAccess('developer')}
                    className="p-3 rounded-2xl bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 border border-emerald-400/20 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <Terminal className="w-4 h-4" />
                    <span>Developer Root</span>
                  </button>
                </div>
              </div>
            )}

            {/* Google Sign-In Option */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <button 
                type="button" 
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-full bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white border border-white/10 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.98] cursor-pointer apple-tap-target"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.49 44 30.65 44 24c0-1.341-.138-2.65-.389-3.917z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Discrete Staff / Operations Login Toggle */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowStaffSignIn(!showStaffSignIn);
                    if (!showStaffSignIn) {
                      setSelectedDesk('kitchen');
                    } else {
                      setSelectedDesk('customer');
                      setLoginMethod('phone');
                    }
                  }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3 h-3 text-zinc-500" />
                  <span>{showStaffSignIn ? 'Switch to Customer Sign In' : 'Kitchen, Rider & Staff Portal Access'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
