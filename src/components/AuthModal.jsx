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
  Zap
} from 'lucide-react';

const DESK_CONFIG = {
  customer: {
    icon: Sparkles,
    title: 'Devotee Storefront',
    subtitle: 'Order sacred Satvik Prasad in Vrindavan Dham',
    badge: 'Devotee',
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
  }
};

export default function AuthModal({ isOpen, onClose }) {
  const { 
    user, 
    userData, 
    userRole, 
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
  
  // Form fields
  const [phoneInput, setPhoneInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // Demo selection
  const [demoShopId, setDemoShopId] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);

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
      setSuccessMsg(`Welcome, ${profile.displayName || 'Devotee'}!`);
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
        await signupWithEmail(email, password, displayName);
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
    setSelectedDesk(role);
    const targetShop = demoShopId || (allShops[0]?.id || 'shop-1');
    impersonate(targetShop, role);
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
        className={`relative w-full max-w-[480px] bg-[#1E1B1C] border border-white/10 text-white rounded-t-[36px] sm:rounded-[36px] p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.9)] flex flex-col gap-5 max-h-[92vh] overflow-y-auto no-scrollbar transition-transform duration-100 relative overflow-hidden ${closing ? 'translate-y-12' : 'translate-y-0'}`}
      >
        {/* Subtle Luxury Ambient Glow */}
        <div 
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-40 transition-all"
          style={{ background: currentTheme.color }}
        />

        {/* Drag Handle Bar (Mobile Only) */}
        <div 
          onPointerDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          className="w-full py-1 -mt-3 flex justify-center cursor-grab active:cursor-grabbing sm:hidden touch-none"
        >
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Top Header Row */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center border transition-all shrink-0 shadow-sm"
              style={{ 
                background: currentTheme.accentBg, 
                borderColor: currentTheme.border, 
                color: currentTheme.color 
              }}
            >
              <DeskIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-['Outfit'] tracking-tight leading-tight">
                {currentTheme.title}
              </h3>
              <p className="text-xs text-neutral-400 font-['Plus_Jakarta_Sans'] line-clamp-1 mt-0.5">
                {currentTheme.subtitle}
              </p>
            </div>
          </div>

          <button 
            onClick={handleAnimatedClose} 
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-all border border-white/5 active:scale-95"
          >
            <X size={15} />
          </button>
        </div>

        {/* ALERTS & STATUS */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-bold flex items-center gap-2">
            <X className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* AUTHENTICATED PROFILE VIEW */}
        {isAuthenticated ? (
          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3.5 p-4 rounded-3xl bg-[#151314] border border-white/5">
              <div className="w-14 h-14 rounded-2xl bg-[#282526] border border-white/10 flex items-center justify-center text-white text-xl font-black shrink-0 overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{(userData?.displayName ? userData.displayName.charAt(0) : user.email?.charAt(0) || 'U').toUpperCase()}</span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-white text-base font-['Outfit']">
                    {userData?.displayName || user.displayName || 'Devotee'}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#E0FF33]/15 text-[#E0FF33] border border-[#E0FF33]/25">
                    {userRole}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">{user.email || user.phoneNumber || 'Mobile Session'}</p>
                {currentShopName && (
                  <p className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                    <Store className="w-3 h-3" />
                    <span>{currentShopName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Role Desk Switcher */}
            <div className="p-4 rounded-3xl bg-[#151314] border border-white/5 space-y-2.5">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Active Operational Workspace
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { role: 'customer', label: 'Storefront', icon: Sparkles },
                  { role: 'kitchen', label: 'Kitchen KDS', icon: ChefHat },
                  { role: 'delivery', label: 'Rider Board', icon: Truck },
                  { role: 'owner', label: 'Admin Desk', icon: ShieldCheck }
                ].map((d) => {
                  const Icon = d.icon;
                  const isCurrent = userRole === d.role;
                  return (
                    <button
                      key={d.role}
                      onClick={() => {
                        impersonate(demoShopId || allShops[0]?.id || 'shop-1', d.role);
                        handleAnimatedClose();
                      }}
                      className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                        isCurrent 
                          ? 'bg-[#E0FF33] text-black border-[#E0FF33] shadow-md' 
                          : 'bg-[#1E1B1C] text-neutral-300 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full py-3 px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/25 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Account</span>
            </button>
          </div>
        ) : (
          /* GUEST / SIGN-IN PORTAL DESK */
          <div className="space-y-4 relative z-10">
            {/* Multi-Role Segmented Switcher Strip (Grid 4-Col to prevent overflow) */}
            <div className="grid grid-cols-4 bg-[#151314] p-1.5 rounded-2xl border border-white/5 gap-1">
              {[
                { id: 'customer', label: 'Devotee', icon: Sparkles },
                { id: 'kitchen', label: 'Kitchen', icon: ChefHat },
                { id: 'delivery', label: 'Sarathi', icon: Truck },
                { id: 'owner', label: 'Admin', icon: ShieldCheck }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = selectedDesk === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setSelectedDesk(tab.id);
                      setError('');
                      setSuccessMsg('');
                    }}
                    className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center select-none cursor-pointer ${
                      isActive
                        ? 'bg-white text-black shadow-md font-extrabold scale-[1.02]'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-Navigation Pill Switcher (Grid 3-Col) */}
            <div className="grid grid-cols-3 bg-[#151314]/80 p-1 rounded-2xl border border-white/5 gap-1">
              <button 
                onClick={() => { setLoginMethod('phone'); setError(''); setSuccessMsg(''); }}
                className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer ${
                  loginMethod === 'phone' 
                    ? 'bg-[#282526] text-white shadow-sm border border-white/10' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Phone className="w-3 h-3 text-[#E0FF33] shrink-0" />
                <span className="truncate">Mobile</span>
              </button>

              <button 
                onClick={() => { setLoginMethod('email'); setError(''); setSuccessMsg(''); }}
                className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer ${
                  loginMethod === 'email' 
                    ? 'bg-[#282526] text-white shadow-sm border border-white/10' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Mail className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">Email</span>
              </button>

              <button 
                onClick={() => { setLoginMethod('demo'); setError(''); setSuccessMsg(''); }}
                className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer ${
                  loginMethod === 'demo' 
                    ? 'bg-[#282526] text-white shadow-sm border border-white/10' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Zap className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="truncate">Demo Desk</span>
              </button>
            </div>

            {/* METHOD 1: QUICK PHONE LOOKUP */}
            {loginMethod === 'phone' && (
              <form onSubmit={handlePhoneSubmit} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center bg-[#151314] border border-white/10 rounded-2xl overflow-hidden focus-within:border-[#E0FF33]/50 focus-within:ring-2 focus-within:ring-[#E0FF33]/15 transition-all p-1">
                    <span className="px-3.5 py-2.5 text-xs font-black text-[#E0FF33] bg-[#242021] rounded-xl border border-white/5">
                      +91
                    </span>
                    <input 
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      required
                      className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none font-['Plus_Jakarta_Sans'] font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 px-1 font-medium">
                    Instant lookup for registered devotees, chefs, and Sarathi riders.
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#E0FF33] hover:bg-[#d8fa26] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_8px_24px_rgba(224,255,51,0.25)] active:scale-[0.98] cursor-pointer"
                >
                  <span>{loading ? 'Verifying Phone...' : 'Sign In with Mobile'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* METHOD 2: EMAIL & PASSWORD */}
            {loginMethod === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-3 pt-1">
                {isSignup && (
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your Full Name"
                      required
                      className="w-full bg-[#151314] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#E0FF33]/50 focus:ring-2 focus:ring-[#E0FF33]/15 font-['Plus_Jakarta_Sans'] transition-all"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address (e.g. devotee@vrindavan.org)"
                    required
                    className="w-full bg-[#151314] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#E0FF33]/50 focus:ring-2 focus:ring-[#E0FF33]/15 font-['Plus_Jakarta_Sans'] transition-all"
                  />
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    required
                    className="w-full bg-[#151314] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#E0FF33]/50 focus:ring-2 focus:ring-[#E0FF33]/15 font-['Plus_Jakarta_Sans'] transition-all"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#E0FF33] hover:bg-[#d8fa26] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_8px_24px_rgba(224,255,51,0.25)] active:scale-[0.98] cursor-pointer"
                >
                  <span>{loading ? 'Authenticating...' : (isSignup ? 'Create Account' : 'Sign In')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-1">
                  <button 
                    type="button"
                    onClick={() => { setIsSignup(!isSignup); setError(''); }}
                    className="text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    {isSignup ? 'Already have an account? ' : "Don't have an account? "}
                    <span className="text-[#E0FF33] font-bold underline">{isSignup ? 'Log In' : 'Sign Up Free'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* METHOD 3: QUICK DEMO ACCESS */}
            {loginMethod === 'demo' && (
              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-[#151314] border border-white/5 space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Target Kitchen Location
                  </label>
                  <select 
                    value={demoShopId}
                    onChange={(e) => setDemoShopId(e.target.value)}
                    className="w-full bg-[#1E1B1C] text-xs text-white border border-white/10 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#E0FF33]/50"
                  >
                    {allShops.map(s => (
                      <option key={s.id} value={s.id} className="bg-[#1E1B1C]">{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    onClick={() => handleDemoAccess('kitchen')}
                    className="p-3 rounded-2xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/20 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <ChefHat className="w-4 h-4" />
                    <span>Kitchen Staff</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => handleDemoAccess('delivery')}
                    className="p-3 rounded-2xl bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 border border-cyan-400/20 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Sarathi Rider</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => handleDemoAccess('owner')}
                    className="p-3 rounded-2xl bg-purple-400/10 hover:bg-purple-400/20 text-purple-300 border border-purple-400/20 text-xs font-bold flex items-center justify-center gap-2 transition-all col-span-2 active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Kitchen Owner / Administrator</span>
                  </button>
                </div>
              </div>
            )}

            {/* Google Sign-In Option */}
            <div className="pt-2 border-t border-white/5">
              <button 
                type="button" 
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/10 font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.98]"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.49 44 30.65 44 24c0-1.341-.138-2.65-.389-3.917z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
