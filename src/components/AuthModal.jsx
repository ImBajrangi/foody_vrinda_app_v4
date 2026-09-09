import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { updateCloudUser } from '../supabase';
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
  ArrowLeft,
  Check,
  KeyRound,
  Compass,
  Zap,
  MapPin,
  Terminal,
  Edit3,
  ShoppingBag,
  Gift,
  Headphones,
  ChevronRight
} from 'lucide-react';

const DESK_CONFIG = {
  customer: {
    icon: User,
    title: 'My Account',
    subtitle: 'Verified Satvik Member • Foody Vrinda',
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
  const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' | 'email'
  const [isSignup, setIsSignup] = useState(false);
  const [signupStep, setSignupStep] = useState(1); // 1: Identity | 2: Credentials | 3: Delivery
  const [showStaffSignIn, setShowStaffSignIn] = useState(false);
  
  // Form fields
  const [phoneInput, setPhoneInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  
  // Profile inline editing states
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Demo selection
  const [demoShopId, setDemoShopId] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showLoginView, setShowLoginView] = useState(false);

  // Sync profile editing inputs when userData changes
  useEffect(() => {
    if (userData) {
      setAddressInput(userData.address || userData.customerAddress || '');
      setNameInput(userData.displayName || user?.displayName || '');
    }
  }, [userData, user]);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

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

  const isAuthenticated = Boolean(
    user && 
    !user.isAnonymous && 
    (user.email || user.phone || user.phoneNumber) && 
    user.email !== 'Guest' && 
    user.email !== 'Local User' &&
    user.displayName !== 'Guest' &&
    userData?.isLoggedInUser
  );

  const activeDeskTheme = DESK_CONFIG[selectedDesk] || DESK_CONFIG.customer;
  const ActiveDeskIcon = activeDeskTheme.icon;

  // Phone Lookup Sign In
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const profile = await loginWithPhoneLookup(phoneInput);
      setSuccessMsg(`Welcome back, ${profile.displayName || 'Customer'}!`);
      setTimeout(() => {
        handleAnimatedClose();
      }, 500);
    } catch (err) {
      setError(err.message || 'Phone sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step validation and transition for multi-step signup
  const handleNextStep = (e) => {
    if (e) e.preventDefault();
    setError('');
    
    if (signupStep === 1) {
      if (!displayName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      const cleanPhone = signupPhone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
      setSignupStep(2);
    } else if (signupStep === 2) {
      if (!email.trim() || !email.includes('@')) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      setSignupStep(3);
    }
  };

  const handlePrevStep = () => {
    setError('');
    if (signupStep > 1) {
      setSignupStep(prev => prev - 1);
    }
  };

  // Email / Password Submit
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (isSignup && signupStep < 3) {
      handleNextStep();
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        await signupWithEmail(email, password, displayName, signupPhone, signupAddress);
        setSuccessMsg('Account created successfully! Welcome to Foody Vrinda.');
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
      setError(messages[err.code] || err.message || 'Authentication failed. Please check your credentials.');
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

  const handleSaveAddress = async () => {
    if (!addressInput.trim()) return;
    try {
      const updated = {
        ...(userData || {}),
        address: addressInput.trim()
      };
      localStorage.setItem('foody_user_data', JSON.stringify(updated));
      updateCloudUser({ id: user.id || userData?.id, address: addressInput.trim() }).catch(() => {});
      setIsEditingAddress(false);
      setSuccessMsg('Delivery address updated!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    try {
      const updated = {
        ...(userData || {}),
        displayName: nameInput.trim()
      };
      localStorage.setItem('foody_user_data', JSON.stringify(updated));
      updateCloudUser({ id: user.id || userData?.id, displayName: nameInput.trim() }).catch(() => {});
      setIsEditingName(false);
      setSuccessMsg('Name updated!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await logout();
    clearCart();
    handleAnimatedClose();
  };

  const getSignupTitle = () => {
    if (signupStep === 1) return 'Step 1: Your Identity';
    if (signupStep === 2) return 'Step 2: Login Credentials';
    return 'Step 3: Delivery Location';
  };

  const getSignupSubtitle = () => {
    if (signupStep === 1) return 'Tell us your name and mobile number';
    if (signupStep === 2) return 'Set up your email and secure password';
    return 'Set default delivery address in Vrindavan';
  };

  const modalTitle = (!isAuthenticated || showLoginView)
    ? (showStaffSignIn 
        ? (activeDeskTheme.title || 'Staff Portal') 
        : (isSignup ? getSignupTitle() : 'Welcome to Foody Vrinda'))
    : (isAuthorizedDeveloper ? 'Developer Console' : isAuthorizedAdmin ? 'Administrator Account' : 'My Account');

  const modalSubtitle = (!isAuthenticated || showLoginView)
    ? (showStaffSignIn 
        ? (activeDeskTheme.subtitle || 'Authorized personnel login') 
        : (isSignup ? getSignupSubtitle() : 'Sign in to track live orders & manage address'))
    : 'Verified Satvik Member • Foody Vrinda';

  const userAvatar = user?.photoURL || 
    userData?.photoURL || 
    userData?.avatar_url || 
    userData?.picture || 
    user?.user_metadata?.avatar_url || 
    user?.user_metadata?.picture || 
    user?.user_metadata?.photoURL || 
    user?.identities?.[0]?.identity_data?.avatar_url || 
    user?.identities?.[0]?.identity_data?.picture || null;

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
        {/* Subtle Ambient Header Accent */}
        <div 
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-20 transition-all duration-500"
          style={{ background: activeDeskTheme.color }}
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
            {(!isAuthenticated || showLoginView) && (
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all shrink-0 shadow-sm"
                style={{ 
                  background: activeDeskTheme.accentBg, 
                  borderColor: activeDeskTheme.border, 
                  color: activeDeskTheme.color 
                }}
              >
                <ActiveDeskIcon className="w-4.5 h-4.5" />
              </div>
            )}
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-['Outfit'] tracking-tight leading-tight">
                {modalTitle}
              </h3>
              {(!isAuthenticated || showLoginView) && (
                <p className="text-[11px] sm:text-xs text-zinc-400 font-['Plus_Jakarta_Sans'] line-clamp-1 mt-0.5">
                  {modalSubtitle}
                </p>
              )}
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
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* AUTHENTICATED PROFILE VIEW */}
        {(isAuthenticated && !showLoginView) ? (
          <div className="space-y-3 relative z-10">

            {/* 1. Hero Identity Card */}
            <div className="p-3.5 rounded-2xl bg-[#151314] border border-white/10 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3.5">
                {/* Avatar with Glow Ring */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#282526] border border-[#E0FF33]/30 flex items-center justify-center text-white text-lg font-black overflow-hidden shadow-md ring-2 ring-[#E0FF33]/15">
                    {userAvatar ? (
                      <img 
                        src={userAvatar} 
                        alt="Profile" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="font-['Outfit'] font-black text-xl text-[#E0FF33]">
                        {(userData?.displayName ? userData.displayName.charAt(0) : user?.email?.charAt(0) || user?.phone?.slice(-1) || 'U').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#151314] flex items-center justify-center shadow-sm">
                    <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                  </div>
                </div>
                
                {/* User Info Details */}
                <div className="space-y-0.5 min-w-0 flex-1">
                  {/* Name + Edit Action */}
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5 py-0.5">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="bg-[#282526] text-white text-xs px-2.5 py-1 rounded-xl border border-white/20 focus:outline-none focus:border-[#E0FF33] w-full font-['Plus_Jakarta_Sans'] font-semibold"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        className="p-1 rounded-lg bg-[#E0FF33] text-black hover:bg-[#d4f820] cursor-pointer shrink-0"
                        title="Save Name"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="p-1 rounded-lg bg-white/10 text-zinc-400 hover:text-white cursor-pointer shrink-0"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-black text-white text-base font-['Outfit'] tracking-tight">
                        {userData?.displayName || user.displayName || 'Customer'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setNameInput(userData?.displayName || user.displayName || '');
                          setIsEditingName(true);
                        }}
                        className="text-zinc-500 hover:text-[#E0FF33] transition-colors p-0.5 cursor-pointer"
                        title="Edit Name"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Contact info */}
                  <p className="text-xs text-zinc-400 font-medium font-mono">
                    {user.phone ? `+91 ${user.phone.replace(/\D/g, '').slice(-10).replace(/(\d{5})(\d{5})/, '$1 $2')}` : (user.email || user.phoneNumber || userData?.phone || 'Member')}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Unified Loyalty & Tier Strip */}
            <div className="p-3 rounded-2xl bg-[#151314] border border-white/5 grid grid-cols-2 divide-x divide-white/5 shadow-sm">
              {/* Left: Prasad Coins */}
              <div className="flex items-center gap-2.5 pr-2">
                <div className="w-8 h-8 rounded-xl bg-[#E0FF33]/10 border border-[#E0FF33]/20 flex items-center justify-center text-[#E0FF33] shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-white font-['Outfit']">150 Coins</div>
                  <div className="text-[10px] text-emerald-400 font-medium">₹15 savings</div>
                </div>
              </div>

              {/* Right: Account Tier */}
              <div className="flex items-center gap-2.5 pl-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-white font-['Outfit']">Satvik Devotee</div>
                  <div className="text-[10px] text-cyan-400 font-medium">Priority Prep</div>
                </div>
              </div>
            </div>

            {/* 3. Delivery Address */}
            <div className="p-3 rounded-2xl bg-[#151314] border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#E0FF33]" />
                  <span className="text-[11px] font-bold text-zinc-300">
                    Delivery Address
                  </span>
                </div>
                {!isEditingAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddressInput(userData?.address || userData?.customerAddress || '');
                      setIsEditingAddress(true);
                    }}
                    className="text-[11px] font-bold text-[#E0FF33] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>{(userData?.address || userData?.customerAddress) ? 'Edit' : '+ Add Address'}</span>
                  </button>
                )}
              </div>

              {isEditingAddress ? (
                <div className="space-y-2 pt-1 animate-fade-in">
                  <textarea
                    rows={2}
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="Enter delivery address in Vrindavan..."
                    className="w-full bg-[#1E1B1C] text-xs text-white p-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-[#E0FF33]/50 resize-none font-['Plus_Jakarta_Sans']"
                    autoFocus
                  />
                  
                  {/* Quick Landmark Chips */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Near ISKCON Temple, Raman Reti',
                      'Prem Mandir Area',
                      'Parikrama Marg',
                      'Chhatikara Road'
                    ].map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setAddressInput(loc)}
                        className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-[#E0FF33]/10 hover:text-[#E0FF33] border border-white/5 text-[9px] font-medium text-zinc-400 cursor-pointer transition-all"
                      >
                        + {loc}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="px-3 py-1 rounded-xl bg-white/5 text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      className="px-3.5 py-1 rounded-xl bg-[#E0FF33] text-black font-black text-xs uppercase tracking-wider hover:bg-[#d4f820] cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 font-medium pl-5">
                  {(userData?.address || userData?.customerAddress) || (
                    <span className="text-zinc-500">No address saved yet</span>
                  )}
                </p>
              )}
            </div>

            {/* 4. Grouped Navigation Links */}
            <div className="p-1 rounded-2xl bg-[#151314] border border-white/5 divide-y divide-white/5">
              <button
                type="button"
                onClick={() => {
                  handleAnimatedClose();
                  window.dispatchEvent(new CustomEvent('foody-open-orders'));
                }}
                className="w-full p-2.5 flex items-center justify-between text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-[#E0FF33]" />
                  <span>My Orders & Live Tracking</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  handleAnimatedClose();
                  window.dispatchEvent(new CustomEvent('foody_open_rewards'));
                }}
                className="w-full p-2.5 flex items-center justify-between text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Gift className="w-4 h-4 text-purple-400" />
                  <span>Prasad Rewards & Perks</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              <a
                href="https://wa.me/919870152058?text=Hello%20Foody%20Vrinda%20Support"
                target="_blank"
                rel="noreferrer"
                className="w-full p-2.5 flex items-center justify-between text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer block"
              >
                <div className="flex items-center gap-2.5">
                  <Headphones className="w-4 h-4 text-cyan-400" />
                  <span>Support & Help (WhatsApp)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </a>
            </div>

            {/* 5. Authorized Operational Switcher (Dev / Admin only) */}
            {(isAuthorizedDeveloper || isAuthorizedAdmin) && (
              <div className="p-3 rounded-2xl bg-[#151314] border border-white/5 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {isAuthorizedDeveloper ? 'Operational Switcher' : 'Admin Workspaces'}
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

            {/* 6. Clean, Minimalist Footer Actions */}
            <div className="flex items-center justify-between pt-1 px-1">
              <button 
                type="button"
                onClick={() => setShowLoginView(true)}
                className="text-xs text-zinc-400 hover:text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer py-1"
              >
                <LogIn className="w-3.5 h-3.5 text-[#E0FF33]" />
                <span>Switch Account</span>
              </button>

              <button 
                type="button"
                onClick={handleLogout}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer py-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* CLEAN SIGN-IN & STEP-BY-STEP SIGNUP PORTAL */
          <div className="space-y-3.5 relative z-10">
            {isAuthenticated && showLoginView && (
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <button
                  type="button"
                  onClick={() => setShowLoginView(false)}
                  className="text-xs text-[#E0FF33] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>← Back to Active Profile</span>
                </button>
                <span className="text-[10px] text-zinc-500">Active: {user?.email || user?.phone || 'Logged In'}</span>
              </div>
            )}

            {/* Multi-Role Segmented Switcher Strip (Only shown when staff access is active) */}
            {showStaffSignIn && !isSignup && (
              <div className="grid grid-cols-3 bg-[#151314] p-1 rounded-2xl border border-white/5 gap-1 animate-fade-in">
                {[
                  { id: 'kitchen', label: 'Kitchen Chef', icon: ChefHat },
                  { id: 'delivery', label: 'Sarathi Rider', icon: Truck },
                  { id: 'owner', label: 'Admin Desk', icon: ShieldCheck }
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
                      className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all text-center select-none cursor-pointer ${
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

            {/* Sub-Navigation Method Switcher: Mobile vs Email (Hidden during multi-step signup) */}
            {!isSignup && (
              <div className="grid grid-cols-2 bg-[#151314]/80 p-1 rounded-2xl border border-white/5 gap-1">
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
                  <span className="truncate">Mobile Number</span>
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
                  <span className="truncate">Email & Password</span>
                </button>
              </div>
            )}

            {/* STEP PROGRESS INDICATOR FOR REGISTRATION */}
            {isSignup && (
              <div className="flex items-center justify-between px-3 py-2 bg-[#151314] rounded-2xl border border-white/5 animate-fade-in">
                <div className="flex items-center gap-2">
                  {[
                    { step: 1, label: 'Identity' },
                    { step: 2, label: 'Security' },
                    { step: 3, label: 'Delivery' }
                  ].map((s, idx) => (
                    <div key={s.step} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (s.step < signupStep) setSignupStep(s.step);
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-['Outfit'] transition-all ${
                          signupStep === s.step
                            ? 'bg-[#E0FF33] text-black shadow-md scale-105'
                            : signupStep > s.step
                              ? 'bg-[#E0FF33]/20 text-[#E0FF33] border border-[#E0FF33]/30 cursor-pointer'
                              : 'bg-white/5 text-zinc-500 border border-white/5'
                        }`}
                      >
                        {signupStep > s.step ? '✓' : s.step}
                      </button>
                      <span className={`text-[11px] font-bold ${
                        signupStep === s.step ? 'text-white' : 'text-zinc-500'
                      }`}>
                        {s.label}
                      </span>
                      {idx < 2 && (
                        <div className={`w-3 sm:w-5 h-0.5 rounded-full ${
                          signupStep > s.step ? 'bg-[#E0FF33]/60' : 'bg-white/10'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-black text-[#E0FF33] font-mono">
                  {signupStep}/3
                </span>
              </div>
            )}

            {/* METHOD 1: QUICK PHONE LOOKUP (LOGIN ONLY) */}
            {!isSignup && loginMethod === 'phone' && (
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
                    Instant access for customers, kitchen staff, and delivery riders.
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

            {/* METHOD 2: EMAIL SIGN-IN & STEP-BY-STEP SIGNUP */}
            {(isSignup || loginMethod === 'email') && (
              <form onSubmit={handleEmailSubmit} className="space-y-3 pt-0.5">

                {/* ── STEP 1: IDENTITY ── */}
                {isSignup && signupStep === 1 && (
                  <div className="p-4 rounded-3xl bg-[#151314] border border-white/5 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                        Personal Details
                      </span>
                      <span className="text-[10px] text-[#E0FF33] font-bold">Step 1 of 3</span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="relative">
                        <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Full Name (e.g. Radhe Shyam)"
                          required
                          autoFocus
                          className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all"
                        />
                      </div>

                      <div className="relative flex items-center bg-[#1E1B1C] border border-white/10 rounded-2xl focus-within:border-[#E0FF33]/40 focus-within:ring-2 focus-within:ring-[#E0FF33]/10 transition-all px-3 py-1">
                        <Phone className="w-4 h-4 text-zinc-500 shrink-0 mr-2" />
                        <span className="text-xs font-black text-[#E0FF33] pr-2.5 border-r border-white/10 select-none font-['Outfit']">+91</span>
                        <input 
                          type="tel" 
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          required
                          className="flex-1 bg-transparent pl-2 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none font-['Plus_Jakarta_Sans'] font-medium"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-500 leading-relaxed px-0.5">
                      Used for live delivery notifications and SMS order updates.
                    </p>
                  </div>
                )}

                {/* ── STEP 2: CREDENTIALS ── */}
                {isSignup && signupStep === 2 && (
                  <div className="p-4 rounded-3xl bg-[#151314] border border-white/5 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                        Account Security
                      </span>
                      <span className="text-[10px] text-[#E0FF33] font-bold">Step 2 of 3</span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="relative">
                        <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email Address (e.g. user@example.com)"
                          required
                          autoFocus
                          className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all"
                        />
                      </div>

                      <div className="relative">
                        <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create Password (min 6 chars)"
                          required
                          className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Secured with 256-bit Supabase Cloud encryption.</span>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: DELIVERY LOCATION ── */}
                {isSignup && signupStep === 3 && (
                  <div className="p-4 rounded-3xl bg-[#151314] border border-white/5 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                        Default Delivery
                      </span>
                      <span className="text-[10px] text-[#E0FF33] font-bold">Step 3 of 3</span>
                    </div>

                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[#E0FF33] absolute left-3.5 top-3.5" />
                      <textarea 
                        rows={2}
                        value={signupAddress}
                        onChange={(e) => setSignupAddress(e.target.value)}
                        placeholder="Delivery Address (e.g. Flat 204, Near ISKCON Temple, Raman Reti)"
                        className="w-full bg-[#1E1B1C] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all resize-none"
                      />
                    </div>

                    {/* Quick Vrinda Landmark Chips */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        Quick Vrindavan Landmarks
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Near ISKCON Temple, Raman Reti',
                          'Prem Mandir Road',
                          'Bankey Bihari Parikrama Marg',
                          'Chhatikara Road, Vrindavan'
                        ].map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => setSignupAddress(loc)}
                            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-[#E0FF33]/15 hover:text-[#E0FF33] border border-white/5 hover:border-[#E0FF33]/30 text-[10px] font-semibold text-zinc-300 transition-all cursor-pointer"
                          >
                            + {loc}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Registration Summary Card */}
                    <div className="p-3 rounded-2xl bg-[#1E1B1C] border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Name:</span>
                        <span className="font-bold text-white font-['Outfit']">{displayName}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Mobile:</span>
                        <span className="font-bold text-[#E0FF33] font-['Outfit']">+91 {signupPhone}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Email:</span>
                        <span className="font-medium text-zinc-300 truncate max-w-[200px]">{email}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STANDARD LOGIN FORM (WHEN NOT SIGNING UP) ── */}
                {!isSignup && (
                  <div className="space-y-2.5">
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address (e.g. user@example.com)"
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
                        placeholder="Password"
                        required
                        className="w-full bg-[#151314] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* ── NAVIGATION & CTA BUTTONS ── */}
                <div className="flex items-center gap-2 pt-1">
                  {isSignup && signupStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="py-3.5 px-4 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                  )}

                  <button 
                    type={isSignup && signupStep < 3 ? "button" : "submit"}
                    onClick={isSignup && signupStep < 3 ? handleNextStep : undefined}
                    disabled={loading}
                    className="flex-1 py-3.5 px-6 rounded-full bg-[#E0FF33] hover:bg-[#CCFF00] text-[#1E1B1C] font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer font-['Outfit'] apple-tap-target"
                  >
                    <span>
                      {loading 
                        ? 'Creating Account...' 
                        : isSignup 
                          ? (signupStep === 3 ? 'Complete Registration' : `Continue to Step ${signupStep + 1}`) 
                          : 'Sign In'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Switch between Log In and Sign Up */}
                <div className="text-center pt-0.5">
                  <button 
                    type="button"
                    onClick={() => { 
                      setIsSignup(!isSignup); 
                      setSignupStep(1); 
                      setError(''); 
                      setSuccessMsg(''); 
                    }}
                    className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {isSignup ? 'Already registered? ' : "Don't have an account? "}
                    <span className="text-[#E0FF33] font-bold underline ml-1">
                      {isSignup ? 'Log In Instead' : 'Register in 3 Steps'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* Google Sign-In Option (When logging in) */}
            {!isSignup && (
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

                {/* Staff / Operations Login Toggle */}
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
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3 h-3 text-zinc-500" />
                    <span>{showStaffSignIn ? 'Switch to Customer Sign In' : 'Kitchen, Rider & Staff Portal Access'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
