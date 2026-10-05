import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { updateCloudUser } from '../supabase';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import { sanitizeCustomerAddress } from '../utils/addressUtils';
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
  ChevronRight,
  Sun,
  Moon,
  Volume2,
  Gamepad2
} from 'lucide-react';
import { SOCIAL_LINKS } from '../constants/socialLinks';
import SocialLinksBar from './ui/SocialLinksBar';
import SoundTrialsModal from './SoundTrialsModal';
import nativeNotify, { NOTIFICATION_TRIALS } from '../services/nativeNotificationService';

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
    title: 'Delivery Fleet',
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

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const {
    user,
    userData,
    userRole,
    actualRole,
    isAuthenticated: authContextIsAuthenticated,
    isGrandAdmin,
    isAuthorizedAdmin,
    isAuthorizedDeveloper,
    currentShopName,
    allShops,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    loginWithPhoneLookup,
    impersonate,
    updateUserRole,
    logout
  } = useAuth();

  const { theme, isLight, isDark, toggleTheme, setTheme } = useTheme();
  const { clearCart } = useCart();

  const [selectedDesk, setSelectedDesk] = useState('customer');
  const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' | 'email'
  const [isSignup, setIsSignup] = useState(false);
  const [signupStep, setSignupStep] = useState(1); // 1: Identity | 2: Credentials | 3: Delivery
  const [showStaffSignIn, setShowStaffSignIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialMode === 'signup') {
        setIsSignup(true);
        setSignupStep(1);
      } else {
        setIsSignup(false);
      }
    }
  }, [isOpen, initialMode]);

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
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneEditInput, setPhoneEditInput] = useState('');


  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showLoginView, setShowLoginView] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [isReminderDismissed, setIsReminderDismissed] = useState(false);
  const [showSoundTrials, setShowSoundTrials] = useState(false);

  // Sync profile editing inputs when userData changes
  useEffect(() => {
    if (userData) {
      setAddressInput(sanitizeCustomerAddress(userData.address || userData.customerAddress || ''));
      setNameInput(userData.displayName || user?.displayName || '');
      setPhoneEditInput(userData.phone || user?.phone || user?.phoneNumber || '');
    }
  }, [userData, user]);

  // Reset modal sheet transform & opacity when opened
  useEffect(() => {
    if (isOpen && authSheetRef.current) {
      authSheetRef.current.style.transform = '';
      authSheetRef.current.style.opacity = '1';
      authSheetRef.current.style.transition = '';
    }
  }, [isOpen]);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);


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
    }, 200);
  }, [closing, onClose]);

  const {
    sheetRef: authSheetRef,
    sheetStyle: authSheetStyle,
    handleProps: authHandleProps,
    isDragging: isDraggingAuth
  } = useBottomSheetDrag(handleAnimatedClose, 35);

  if (!isOpen) return null;

  const isAuthenticated = Boolean(
    authContextIsAuthenticated || (
      user &&
      !user.isAnonymous &&
      !String(user.uid || '').startsWith('guest-') &&
      (user.email || user.phone || user.phoneNumber) &&
      user.email !== 'Guest' &&
      user.email !== 'Local User' &&
      user.displayName !== 'Guest' &&
      userData?.isLoggedInUser
    )
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
      const targetId = user?.id || userData?.id;
      if (targetId) {
        updateCloudUser(targetId, { address: addressInput.trim() }).catch(() => { });
      }
      setIsEditingAddress(false);
      setSuccessMsg('Delivery address updated!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePhone = async () => {
    const clean = phoneEditInput.replace(/\D/g, '');
    if (clean.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    try {
      const updated = {
        ...(userData || {}),
        phone: clean.slice(-10)
      };
      localStorage.setItem('foody_user_data', JSON.stringify(updated));
      const targetId = user?.id || userData?.id;
      if (targetId) {
        updateCloudUser(targetId, { phone: clean.slice(-10) }).catch(() => { });
      }
      setIsEditingPhone(false);
      setSuccessMsg('Mobile number updated!');
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
      const targetId = user?.id || userData?.id;
      if (targetId) {
        updateCloudUser(targetId, { displayName: nameInput.trim() }).catch(() => { });
      }
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
      : (isSignup ? getSignupTitle() : (showLoginView ? 'Switch Account' : 'Welcome to Foody Vrinda')))
    : 'Account & Profile';

  const modalSubtitle = (!isAuthenticated || showLoginView)
    ? (showStaffSignIn
      ? (activeDeskTheme.subtitle || 'Authorized personnel login')
      : (isSignup ? getSignupSubtitle() : (showLoginView ? 'Sign in with another mobile or email' : 'Sign in to track live orders & manage address')))
    : `${user?.email || user?.phone || userData?.phone || 'Verified Satvik Member'}`;

  const rawAvatar = user?.photoURL ||
    userData?.photoURL ||
    userData?.avatar_url ||
    userData?.picture ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.user_metadata?.photoURL ||
    user?.identities?.[0]?.identity_data?.avatar_url ||
    user?.identities?.[0]?.identity_data?.picture || null;

  const userAvatar = (!avatarLoadError && rawAvatar && typeof rawAvatar === 'string' && rawAvatar.trim().length > 5)
    ? rawAvatar.trim()
    : null;

  const userMobile = userData?.phone || user?.phone || user?.phoneNumber || '';
  const cleanMob = userMobile ? userMobile.replace(/\D/g, '') : '';
  const hasValidPhone = Boolean(cleanMob && cleanMob.length >= 10);
  const userAddress = sanitizeCustomerAddress(userData?.address || userData?.customerAddress || '');
  const hasValidAddress = Boolean(userAddress && userAddress.trim().length > 3);
  const isProfileIncomplete = !hasValidPhone || !hasValidAddress;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAnimatedClose();
      }}
      className={`fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Modal / Bottom Sheet Box */}
      <div
        ref={authSheetRef}
        style={authSheetStyle}
        onScroll={() => {
          if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            document.activeElement.blur();
          }
        }}
        onTouchMove={() => {
          if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            document.activeElement.blur();
          }
        }}
        className={`relative w-full max-w-[440px] bg-white dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-t-[32px] sm:rounded-[32px] p-4 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto no-scrollbar relative overflow-hidden transition-colors ${closing ? 'translate-y-12' : 'translate-y-0'}`}
      >
        {/* Subtle Ambient Header Accent */}
        <div
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-20 transition-all duration-500"
          style={{ background: activeDeskTheme.color }}
        />

        {/* Drag Handle Bar (Mobile Only) */}
        <div
          {...authHandleProps}
          className="w-full pt-1 pb-2 -mt-2 flex justify-center cursor-grab active:cursor-grabbing sm:hidden touch-none select-none"
        >
          <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-white/25 transition-colors" />
        </div>

        {/* Top Header Row */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3.5 min-w-0">
            {isAuthenticated && !showLoginView ? (
              <div className="relative w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-500/60 dark:from-[#E0FF33]/60 via-stone-300 dark:via-white/20 to-amber-500/80 dark:to-[#E0FF33]/80 shrink-0 shadow-[0_2px_12px_rgba(224,255,51,0.2)]">
                <div className="w-full h-full rounded-full overflow-hidden bg-stone-100 dark:bg-[#1E1B1C] border border-stone-200 dark:border-[#1E1B1C] flex items-center justify-center">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userData?.displayName || user?.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    <img
                      src="/foody-vrinda-logo.webp"
                      alt="Foody Vrinda"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="relative w-11 h-11 rounded-2xl p-[2px] bg-gradient-to-tr from-amber-500/60 dark:from-[#E0FF33]/60 via-stone-300 dark:via-white/20 to-amber-500/80 dark:to-[#E0FF33]/80 shrink-0 shadow-[0_2px_14px_rgba(224,255,51,0.25)] flex items-center justify-center">
                <div className="w-full h-full rounded-[14px] overflow-hidden bg-stone-100 dark:bg-[#1E1B1C] flex items-center justify-center">
                  <img
                    src="/foody-vrinda-logo.webp"
                    alt="Foody Vrinda Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white font-['Outfit'] tracking-tight leading-tight truncate">
                {modalTitle}
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-500 dark:text-zinc-400 font-['Plus_Jakarta_Sans'] line-clamp-1 mt-0.5 truncate">
                {modalSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAnimatedClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-all border border-stone-200 dark:border-white/5 active:scale-95 cursor-pointer shrink-0 ml-2"
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* ALERTS & STATUS */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 relative z-10 animate-fade-in">
            <X className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 relative z-10 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* AUTHENTICATED PROFILE VIEW (Unified Theme-Adaptive Devotee Card) */}
        {(isAuthenticated && !showLoginView) ? (
          <div className="space-y-3 relative z-10">

            {/* 1. MASTER DEVOTEE IDENTITY CARD */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#151314] border border-stone-200/90 dark:border-white/10 shadow-sm relative overflow-hidden space-y-3.5">
              {/* Ambient Glow */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 dark:bg-[#E0FF33]/5 rounded-full blur-2xl pointer-events-none" />

              {/* Top: Devotee Name, Role Badge & Email */}
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-stone-900 dark:text-white text-base sm:text-lg font-['Outfit'] tracking-tight">
                      {userData?.displayName || user.displayName || 'Customer'}
                    </h4>
                    {!isEditingName && (
                      <button
                        type="button"
                        onClick={() => {
                          setNameInput(userData?.displayName || user.displayName || '');
                          setIsEditingName(true);
                        }}
                        className="w-7 h-7 rounded-lg bg-stone-200/70 hover:bg-stone-300/80 dark:bg-white/5 dark:hover:bg-white/10 text-stone-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-[#E0FF33] flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit Name"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Email */}
                  {user.email && (
                    <p className="text-xs text-stone-600 dark:text-zinc-400 font-mono truncate font-medium">
                      {user.email}
                    </p>
                  )}
                </div>

                {/* Role Badge */}
                <div className="shrink-0">
                  {(() => {
                    const effectiveDisplayRole = actualRole || userData?.role || userRole;
                    const isMasterAdmin = effectiveDisplayRole === 'grand_admin' || isGrandAdmin;
                    return (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-sm ${isMasterAdmin ? 'bg-amber-500/20 text-amber-900 dark:bg-amber-400/20 dark:text-amber-300 border border-amber-500/40 dark:border-amber-400/40' :
                        effectiveDisplayRole === 'kitchen' ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30' :
                          effectiveDisplayRole === 'delivery' ? 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30' :
                            effectiveDisplayRole === 'owner' ? 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30' :
                              effectiveDisplayRole === 'developer' ? 'bg-amber-500/15 text-amber-900 dark:bg-[#E0FF33]/20 dark:text-[#E0FF33] border border-amber-500/30 dark:border-[#E0FF33]/30' :
                                'bg-emerald-500/15 text-emerald-800 dark:bg-[#E0FF33]/15 dark:text-[#E0FF33] border border-emerald-500/30 dark:border-[#E0FF33]/30'
                        }`}>
                        {isMasterAdmin ? 'Grand Admin' :
                          effectiveDisplayRole === 'kitchen' ? 'Kitchen Chef' :
                            effectiveDisplayRole === 'delivery' ? 'Rider Sarathi' :
                              effectiveDisplayRole === 'owner' ? 'Store Owner' :
                                effectiveDisplayRole === 'developer' ? 'Master Developer' : 'Customer'}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Dedicated Full-Width Name Editor (Shown when editing name) */}
              {isEditingName && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1E1B1C] border border-amber-500/50 dark:border-[#E0FF33]/40 shadow-sm space-y-3 animate-fade-in relative z-10 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-zinc-200 flex items-center gap-1.5 font-['Outfit']">
                      <User className="w-3.5 h-3.5 text-amber-600 dark:text-[#E0FF33]" />
                      Update Devotee Name
                    </span>
                    <span className="text-[11px] text-stone-400 dark:text-zinc-500 font-medium">Public profile name</span>
                  </div>

                  {/* Full-width Roomy Input */}
                  <div className="flex items-center h-12 w-full bg-stone-50 dark:bg-[#141213] rounded-xl border border-stone-300 dark:border-white/20 focus-within:border-amber-500 dark:focus-within:border-[#E0FF33] focus-within:ring-2 focus-within:ring-amber-500/15 dark:focus-within:ring-[#E0FF33]/15 px-3.5 shadow-inner">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Enter your full name"
                      className="bg-transparent text-stone-900 dark:text-white text-base font-bold w-full focus:outline-none placeholder:text-stone-400 dark:placeholder:text-zinc-500 font-['Plus_Jakarta_Sans']"
                    />
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center justify-end gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="h-10 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-700 dark:text-zinc-300 font-bold text-xs cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={!nameInput.trim()}
                      className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] text-white dark:text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Save Name</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Mid: Contact & Address Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5 border-t border-stone-200 dark:border-white/5 relative z-10">
                {/* Phone: Full-Width Editor OR Collapsed Quick Pill */}
                {isEditingPhone ? (
                  <div className="col-span-1 sm:col-span-2 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1E1B1C] border border-amber-500/50 dark:border-[#E0FF33]/40 shadow-sm space-y-3 animate-fade-in w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-zinc-200 flex items-center gap-1.5 font-['Outfit']">
                        <Phone className="w-3.5 h-3.5 text-amber-600 dark:text-[#E0FF33]" />
                        Update Mobile Number
                      </span>
                      <span className="text-[11px] font-mono text-stone-400 dark:text-zinc-500">10 digits required</span>
                    </div>

                    {/* Full-width Phone Input */}
                    <div className="flex items-center h-12 w-full bg-stone-50 dark:bg-[#141213] rounded-xl border border-stone-300 dark:border-white/20 focus-within:border-amber-500 dark:focus-within:border-[#E0FF33] focus-within:ring-2 focus-within:ring-amber-500/15 dark:focus-within:ring-[#E0FF33]/15 px-3.5 shadow-inner">
                      <span className="text-sm font-black text-stone-900 dark:text-[#E0FF33] pr-3 mr-3 border-r border-stone-300 dark:border-white/15 select-none font-['Outfit']">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={phoneEditInput}
                        onChange={(e) => setPhoneEditInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 10-digit mobile number"
                        className="bg-transparent text-stone-900 dark:text-white text-base font-mono font-bold tracking-wider w-full focus:outline-none placeholder:text-stone-400 dark:placeholder:text-zinc-500"
                      />
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-end gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setIsEditingPhone(false)}
                        className="h-10 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-700 dark:text-zinc-300 font-bold text-xs cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePhone}
                        disabled={phoneEditInput.length < 10}
                        className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] text-white dark:text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Save Phone</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-white dark:bg-[#1C1A1B] border border-stone-200 dark:border-white/10 flex flex-col justify-center min-h-[60px] shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-[#E0FF33]/10 flex items-center justify-center text-amber-600 dark:text-[#E0FF33] shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block">Phone</span>
                          <span className={`text-xs sm:text-sm font-mono font-bold truncate block ${hasValidPhone ? 'text-stone-900 dark:text-zinc-100' : 'text-amber-600 dark:text-[#E0FF33] font-semibold'}`}>
                            {hasValidPhone ? `+91 ${cleanMob.slice(-10)}` : '+ Add phone'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneEditInput(cleanMob.slice(-10));
                          setIsEditingPhone(true);
                        }}
                        className="h-8 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-[#E0FF33] cursor-pointer shrink-0 transition-colors"
                      >
                        {hasValidPhone ? 'Edit' : '+ Add'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Address: Full-Width In-Place Editor OR Collapsed Quick Pill */}
                {isEditingAddress ? (
                  <div className="col-span-1 sm:col-span-2 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1C1A1B] border border-amber-500/50 dark:border-[#E0FF33]/40 space-y-3.5 relative z-10 animate-fade-in shadow-md w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-zinc-200 flex items-center gap-1.5 font-['Outfit']">
                        <MapPin className="w-4 h-4 text-amber-600 dark:text-[#E0FF33]" />
                        Delivery Address in Vrindavan Dham
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(false)}
                        className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-500 dark:text-zinc-400 flex items-center justify-center cursor-pointer transition-colors"
                        title="Close editor"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      placeholder="House/Room No., Building, Street, Ashram, or Landmark in Vrindavan..."
                      className="w-full min-h-[92px] bg-stone-50 dark:bg-[#141213] text-sm sm:text-base text-stone-900 dark:text-white p-3.5 rounded-xl border border-stone-300 dark:border-white/20 focus:outline-none focus:border-amber-500 dark:focus:border-[#E0FF33] focus:ring-2 focus:ring-amber-500/10 dark:focus:ring-[#E0FF33]/10 resize-none font-['Plus_Jakarta_Sans'] font-medium placeholder-stone-400 dark:placeholder-zinc-500 leading-relaxed shadow-inner"
                    />

                    {/* Quick Landmark Chips (Balanced 2-Column Grid) */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block">
                        Quick Landmarks:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 w-full">
                        {[
                          { label: 'Raman Reti (ISKCON)', value: 'Near ISKCON Temple, Raman Reti' },
                          { label: 'Prem Mandir Area', value: 'Prem Mandir Area, Vrindavan' },
                          { label: 'Parikrama Marg', value: 'Parikrama Marg, Vrindavan' },
                          { label: 'Chhatikara Road', value: 'Chhatikara Road, Vrindavan' }
                        ].map((loc, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setAddressInput(loc.value)}
                            className="px-2.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-[#E0FF33]/20 text-stone-800 dark:text-zinc-200 dark:hover:text-[#E0FF33] border border-stone-200 dark:border-white/10 text-xs font-semibold cursor-pointer transition-all shadow-xs active:scale-95 text-left flex items-center gap-1.5 truncate"
                          >
                            <span className="text-amber-600 dark:text-[#E0FF33] text-xs font-black shrink-0">+</span>
                            <span className="truncate">{loc.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(false)}
                        className="h-11 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-zinc-300 hover:text-stone-950 dark:hover:text-white text-xs font-bold cursor-pointer transition-colors flex items-center justify-center"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAddress}
                        disabled={!addressInput.trim()}
                        className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] text-white dark:text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Save Address</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-white dark:bg-[#1C1A1B] border border-stone-200 dark:border-white/10 flex flex-col justify-center min-h-[60px] shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-[#E0FF33]/10 flex items-center justify-center text-amber-600 dark:text-[#E0FF33] shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block">Address</span>
                          <span className={`text-xs sm:text-sm font-medium truncate block ${hasValidAddress ? 'text-stone-900 dark:text-zinc-100 font-semibold' : 'text-amber-600 dark:text-[#E0FF33] font-semibold'}`}>
                            {hasValidAddress ? userAddress : '+ Set address'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressInput(sanitizeCustomerAddress(userData?.address || userData?.customerAddress || ''));
                          setIsEditingAddress(true);
                        }}
                        className="h-8 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-[#E0FF33] cursor-pointer shrink-0 transition-colors"
                      >
                        {hasValidAddress ? 'Edit' : '+ Add'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom: Integrated Prasad Rewards Strip */}
              <div className="pt-3 border-t border-stone-200 dark:border-white/5 grid grid-cols-2 divide-x divide-stone-200 dark:divide-white/5 relative z-10">
                <div className="flex items-center gap-2 pr-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-[#E0FF33]/10 border border-amber-500/20 dark:border-[#E0FF33]/20 flex items-center justify-center text-amber-600 dark:text-[#E0FF33] shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-stone-900 dark:text-white font-['Outfit'] truncate">
                      {userData?.coins || 150} Coins
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate">
                      ₹{Math.floor((userData?.coins || 150) / 10)} savings
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/10 border border-cyan-500/20 dark:border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-stone-900 dark:text-white font-['Outfit'] truncate">
                      Dham Express
                    </div>
                    <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold truncate">
                      Priority Prep
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Grouped Navigation & Preference Links */}
            <div className="p-1.5 rounded-2xl bg-stone-50 dark:bg-[#151314] border border-stone-200/90 dark:border-white/5 divide-y divide-stone-200/70 dark:divide-white/5 shadow-xs">
              {/* Theme Preference Row */}
              <div className="w-full p-2.5 sm:p-3 flex items-center justify-between text-xs font-bold text-stone-800 dark:text-zinc-200">
                <div className="flex items-center gap-2.5">
                  {isLight ? (
                    <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <Moon className="w-4 h-4 text-[#E0FF33] shrink-0" />
                  )}
                  <span>App Theme</span>
                </div>
                <div className="flex items-center gap-1 bg-stone-200/80 dark:bg-[#252223] p-1 rounded-full border border-stone-300/80 dark:border-white/15">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${isLight
                      ? 'bg-white text-stone-950 shadow-xs border border-stone-300/80 font-black'
                      : 'text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                  >
                    <Sun size={12} className={isLight ? "text-amber-500" : "opacity-70"} />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${isDark
                      ? 'bg-[#E0FF33] text-black shadow-xs font-black'
                      : 'text-stone-600 hover:text-stone-950 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                  >
                    <Moon size={12} className={isDark ? "text-black" : "opacity-70"} />
                    <span>Dark</span>
                  </button>
                </div>
              </div>

              {/* Notification Chime Preference Row */}
              <div className="w-full p-2.5 sm:p-3 flex items-center justify-between text-xs font-bold text-stone-800 dark:text-zinc-200">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-amber-500 dark:text-[#E0FF33] shrink-0" />
                  <span>Notification Sound</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSoundTrials(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-black bg-stone-200/80 hover:bg-stone-300/80 dark:bg-[#252223] dark:hover:bg-white/10 text-stone-800 dark:text-zinc-200 border border-stone-300/80 dark:border-white/15 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>{NOTIFICATION_TRIALS.find(t => t.id === nativeNotify.getActiveTrial())?.name || 'Zen Glass Tap'}</span>
                  <span className="text-[10px] text-amber-600 dark:text-[#E0FF33] font-black">Change &gt;</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleAnimatedClose();
                  window.dispatchEvent(new CustomEvent('foody-open-orders'));
                }}
                className="w-full p-2.5 sm:p-3 flex items-center justify-between text-xs font-bold text-stone-700 dark:text-zinc-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-[#E0FF33]" />
                  <span>My Orders & Live Tracking</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  handleAnimatedClose();
                  window.dispatchEvent(new CustomEvent('foody_open_rewards'));
                }}
                className="w-full p-2.5 sm:p-3 flex items-center justify-between text-xs font-bold text-stone-700 dark:text-zinc-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Gift className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Prasad Rewards & Perks</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-500" />
              </button>

              {/* App Guide & Interactive Tutorial */}
              <button
                type="button"
                onClick={() => {
                  handleAnimatedClose();
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('foody:open-tutorial'));
                  }, 200);
                }}
                className="w-full p-2.5 sm:p-3 flex items-center justify-between text-xs font-bold text-stone-700 dark:text-zinc-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 text-amber-500 dark:text-[#E0FF33] flex items-center justify-center shrink-0">
                    <Gamepad2 className="w-4 h-4" />
                  </div>
                  <span>App Guide & Role Onboarding</span>
                </div>
                <span className="text-[10px] text-amber-800 dark:text-[#E0FF33] font-black bg-amber-500/15 dark:bg-[#E0FF33]/15 px-2 py-0.5 rounded-full border border-amber-500/30 dark:border-[#E0FF33]/30">
                  Replay Tutorial
                </span>
              </button>

              <a
                href={SOCIAL_LINKS.whatsappChannel}
                target="_blank"
                rel="noreferrer"
                className="w-full p-2.5 sm:p-3 flex items-center justify-between text-xs font-bold text-stone-700 dark:text-zinc-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer block"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.586-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.055-1.928-.485-1.528-.636-2.505-2.203-2.582-2.305-.077-.102-.624-.827-.624-1.577 0-.75.385-1.12.522-1.272.137-.154.298-.192.399-.192.1 0 .201.002.289.006.092.004.215-.035.335.253.127.304.433 1.053.471 1.13.038.077.064.167.013.268-.051.102-.077.167-.154.256-.077.09-.161.2-.23.268-.077.077-.157.161-.067.315.09.154.398.657.854 1.063.587.522 1.082.684 1.236.76.154.077.244.064.334-.038.09-.102.385-.448.487-.601.103-.154.205-.128.346-.077.141.051.897.423 1.051.5.154.077.256.115.295.179.039.064.039.372-.105.777z" />
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.527 3.66 1.443 5.176L2 22l4.985-1.399A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.05c-1.637 0-3.153-.487-4.432-1.328l-.317-.209-2.962.83.83-2.887-.229-.335A8.006 8.006 0 014 12c0-4.411 3.589-8.05 8-8.05s8 3.639 8 8.05-3.589 8.05-8 8.05z" />
                    </svg>
                  </div>
                  <span>Official WhatsApp Channel</span>
                </div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">Join</span>
              </a>
            </div>


            {/* 6. Single Clean Full-Width Sign Out Button */}
            <div className="mt-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#1C1A1B] hover:bg-rose-50/60 dark:hover:bg-rose-500/10 border border-stone-200 dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-500/30 transition-all duration-200 flex items-center justify-between cursor-pointer text-left active:scale-[0.98] shadow-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center shrink-0 transition-all shadow-xs">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-stone-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 font-['Outfit'] whitespace-nowrap leading-tight">
                      Sign Out
                    </div>
                    <div className="text-[10px] text-stone-500 dark:text-zinc-400 font-medium truncate">
                      End session securely
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 dark:text-zinc-500 group-hover:text-rose-500 transition-colors" />
              </button>
            </div>

            {/* 7. Community Channels & Legal Links (Native App Settings Pattern) */}
            <div className="pt-2.5 border-t border-stone-200 dark:border-white/5 space-y-2.5 text-center">
              <SocialLinksBar compact={true} showLabel={false} />

              <div className="flex items-center justify-center gap-2.5 text-[11px] font-semibold text-stone-600 dark:text-zinc-400">
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-stone-900 dark:hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
                <span>•</span>
                <a
                  href="/terms.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-stone-900 dark:hover:text-white transition-colors"
                >
                  Terms of Service
                </a>
                <span>•</span>
                <a
                  href="mailto:vrinda.connect.us@gmail.com"
                  className="hover:text-stone-900 dark:hover:text-white transition-colors"
                >
                  Contact Support
                </a>
              </div>

              <div className="text-[10px] text-stone-600 dark:text-zinc-400 font-mono">
                Foody Vrinda v3.2.0 • Sri Vrindavan Dham
              </div>
            </div>
          </div>
        ) : (
          /* CLEAN SIGN-IN & STEP-BY-STEP SIGNUP PORTAL */
          <div className="space-y-3.5 relative z-10">
            {isAuthenticated && showLoginView && (
              <div className="flex items-center justify-between pb-1 border-b border-stone-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowLoginView(false)}
                  className="text-xs text-amber-600 dark:text-[#E0FF33] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>← Back to Active Profile</span>
                </button>
                <span className="text-[10px] text-stone-500 dark:text-zinc-500">Active: {user?.email || user?.phone || 'Logged In'}</span>
              </div>
            )}

            {/* Multi-Role Segmented Switcher Strip (Only shown when staff access is active) */}
            {showStaffSignIn && !isSignup && (
              <div className="grid grid-cols-3 bg-stone-100 dark:bg-[#151314] p-1 rounded-2xl border border-stone-200 dark:border-white/5 gap-1 animate-fade-in">
                {[
                  { id: 'kitchen', label: 'Kitchen Chef', icon: ChefHat },
                  { id: 'delivery', label: 'Sarathi Rider', icon: Truck },
                  { id: 'owner', label: 'Store Owner', icon: ShieldCheck }
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
                      className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all text-center select-none cursor-pointer ${isActive
                        ? 'bg-white dark:bg-[#282526] text-stone-900 dark:text-white shadow-sm border border-stone-200 dark:border-white/10 font-extrabold'
                        : 'text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-[#E0FF33]" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sub-Navigation Method Switcher: Mobile vs Email */}
            {!isSignup && (
              <div className="grid grid-cols-2 bg-stone-100 dark:bg-[#151314]/80 p-1 rounded-2xl border border-stone-200 dark:border-white/5 gap-1">
                <button
                  type="button"
                  onClick={() => { setLoginMethod('phone'); setError(''); setSuccessMsg(''); }}
                  className={`py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer ${loginMethod === 'phone'
                    ? 'bg-white dark:bg-[#282526] text-stone-900 dark:text-white shadow-sm border border-stone-200 dark:border-white/10 font-bold'
                    : 'text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                >
                  <Phone className="w-3 h-3 text-amber-600 dark:text-[#E0FF33] shrink-0" />
                  <span className="truncate">Mobile Number</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setLoginMethod('email'); setError(''); setSuccessMsg(''); }}
                  className={`py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer ${loginMethod === 'email'
                    ? 'bg-white dark:bg-[#282526] text-stone-900 dark:text-white shadow-sm border border-stone-200 dark:border-white/10 font-bold'
                    : 'text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                >
                  <Mail className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className="truncate">Email & Password</span>
                </button>
              </div>
            )}

            {/* STEP PROGRESS INDICATOR FOR REGISTRATION */}
            {isSignup && (
              <div className="flex items-center justify-between px-3 py-2 bg-stone-100 dark:bg-[#151314] rounded-2xl border border-stone-200 dark:border-white/5 animate-fade-in">
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
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-['Outfit'] transition-all ${signupStep === s.step
                          ? 'bg-amber-500 dark:bg-[#E0FF33] text-white dark:text-black shadow-md scale-105'
                          : signupStep > s.step
                            ? 'bg-amber-500/20 text-amber-800 dark:bg-[#E0FF33]/20 dark:text-[#E0FF33] border border-amber-500/30 dark:border-[#E0FF33]/30 cursor-pointer'
                            : 'bg-stone-200 dark:bg-white/5 text-stone-400 dark:text-zinc-500 border border-stone-300 dark:border-white/5'
                          }`}
                      >
                        {signupStep > s.step ? '✓' : s.step}
                      </button>
                      <span className={`text-[11px] font-bold ${signupStep === s.step ? 'text-stone-900 dark:text-white' : 'text-stone-500 dark:text-zinc-500'
                        }`}>
                        {s.label}
                      </span>
                      {idx < 2 && (
                        <div className={`w-3 sm:w-5 h-0.5 rounded-full ${signupStep > s.step ? 'bg-amber-500/60 dark:bg-[#E0FF33]/60' : 'bg-stone-300 dark:bg-white/10'
                          }`} />
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-black text-amber-600 dark:text-[#E0FF33] font-mono">
                  {signupStep}/3
                </span>
              </div>
            )}

            {/* METHOD 1: QUICK PHONE LOOKUP (LOGIN ONLY) */}
            {!isSignup && loginMethod === 'phone' && (
              <form onSubmit={handlePhoneSubmit} className="space-y-4 pt-1">
                <div className="space-y-2">
                  <div className="flex items-center min-h-[52px] sm:min-h-[56px] bg-stone-50 dark:bg-[#151314] border border-stone-300 dark:border-white/15 rounded-2xl sm:rounded-[20px] focus-within:border-stone-900 dark:focus-within:border-[#E0FF33]/60 focus-within:ring-2 focus-within:ring-stone-900/10 dark:focus-within:ring-[#E0FF33]/20 transition-all px-4 py-1.5 shadow-xs">
                    <span className="text-sm sm:text-base font-black text-stone-900 dark:text-[#E0FF33] font-['Outfit'] pr-3 mr-2 border-r border-stone-300 dark:border-white/15 select-none tracking-wide flex items-center gap-1.5">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      required
                      className="w-full bg-transparent py-2 text-sm sm:text-base text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none font-['Plus_Jakarta_Sans'] font-semibold tracking-wider"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-zinc-400 px-1 font-medium">
                    Instant access for customers, kitchen staff, and delivery riders.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || phoneInput.length < 10}
                  className="w-full py-3.5 sm:py-4 px-6 rounded-full bg-stone-900 hover:bg-black text-white dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] dark:text-[#1E1B1C] font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:bg-stone-200 disabled:text-stone-400 dark:disabled:bg-white/10 dark:disabled:text-zinc-600 disabled:cursor-not-allowed apple-tap-target font-['Outfit']"
                >
                  <span>{loading ? 'Verifying Phone...' : 'Sign In with Mobile'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* METHOD 2: EMAIL SIGN-IN & STEP-BY-STEP SIGNUP */}
            {(isSignup || loginMethod === 'email') && (
              <form onSubmit={handleEmailSubmit} className="space-y-4 pt-1">

                {/* ── STEP 1: IDENTITY ── */}
                {isSignup && signupStep === 1 && (
                  <div className="p-4 rounded-3xl bg-stone-50 dark:bg-[#151314] border border-stone-200 dark:border-white/5 space-y-3.5 animate-fade-in shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-stone-500 dark:text-zinc-400 uppercase tracking-wider">
                        Personal Details
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-[#E0FF33] font-bold">Step 1 of 3</span>
                    </div>

                    <div className="space-y-3">
                      <div className="relative">
                        <User className="w-4 h-4 text-stone-400 dark:text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Full Name (e.g. Radhe Shyam)"
                          required
                          className="w-full min-h-[50px] sm:min-h-[54px] bg-white dark:bg-[#1E1B1C] border border-stone-300 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-stone-900 dark:focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all font-medium"
                        />
                      </div>

                      <div className="relative flex items-center min-h-[50px] sm:min-h-[54px] bg-white dark:bg-[#1E1B1C] border border-stone-300 dark:border-white/10 rounded-2xl focus-within:border-stone-900 dark:focus-within:border-[#E0FF33]/40 focus-within:ring-2 focus-within:ring-stone-900/10 dark:focus-within:ring-[#E0FF33]/10 transition-all px-4 py-1.5">
                        <Phone className="w-4 h-4 text-stone-400 dark:text-zinc-500 shrink-0 mr-2.5" />
                        <span className="text-xs sm:text-sm font-black text-stone-900 dark:text-[#E0FF33] pr-2.5 border-r border-stone-300 dark:border-white/10 select-none font-['Outfit']">+91</span>
                        <input
                          type="tel"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          required
                          className="flex-1 bg-transparent pl-3 py-2 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none font-['Plus_Jakarta_Sans'] font-semibold tracking-wider"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-500 dark:text-zinc-500 leading-relaxed px-0.5">
                      Used for live delivery notifications and SMS order updates.
                    </p>
                  </div>
                )}

                {/* ── STEP 2: CREDENTIALS ── */}
                {isSignup && signupStep === 2 && (
                  <div className="p-4 rounded-3xl bg-stone-50 dark:bg-[#151314] border border-stone-200 dark:border-white/5 space-y-3.5 animate-fade-in shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-stone-500 dark:text-zinc-400 uppercase tracking-wider">
                        Account Security
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-[#E0FF33] font-bold">Step 2 of 3</span>
                    </div>

                    <div className="space-y-3">
                      <div className="relative">
                        <Mail className="w-4 h-4 text-stone-400 dark:text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email Address (e.g. user@example.com)"
                          required
                          className="w-full min-h-[50px] sm:min-h-[54px] bg-white dark:bg-[#1E1B1C] border border-stone-300 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-stone-900 dark:focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all font-medium"
                        />
                      </div>

                      <div className="relative">
                        <Lock className="w-4 h-4 text-stone-400 dark:text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create Password (min 6 chars)"
                          required
                          className="w-full min-h-[50px] sm:min-h-[54px] bg-white dark:bg-[#1E1B1C] border border-stone-300 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-stone-900 dark:focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Secured with 256-bit Supabase Cloud encryption.</span>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: DELIVERY LOCATION ── */}
                {isSignup && signupStep === 3 && (
                  <div className="p-4 rounded-3xl bg-stone-50 dark:bg-[#151314] border border-stone-200 dark:border-white/5 space-y-3.5 animate-fade-in shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-stone-500 dark:text-zinc-400 uppercase tracking-wider">
                        Default Delivery
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-[#E0FF33] font-bold">Step 3 of 3</span>
                    </div>

                    <div className="relative">
                      <MapPin className="w-4 h-4 text-amber-600 dark:text-[#E0FF33] absolute left-3.5 top-3.5" />
                      <textarea
                        rows={2}
                        value={signupAddress}
                        onChange={(e) => setSignupAddress(e.target.value)}
                        placeholder="Delivery Address (e.g. Flat 204, Near ISKCON Temple, Raman Reti)"
                        className="w-full bg-white dark:bg-[#1E1B1C] border border-stone-300 dark:border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-stone-900 dark:focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all resize-none"
                      />
                    </div>

                    {/* Quick Vrinda Landmark Chips (Balanced 2-Column Grid) */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block">
                        Quick Landmarks
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 w-full">
                        {[
                          { label: 'Raman Reti (ISKCON)', value: 'Near ISKCON Temple, Raman Reti' },
                          { label: 'Prem Mandir Area', value: 'Prem Mandir Road, Vrindavan' },
                          { label: 'Parikrama Marg', value: 'Bankey Bihari Parikrama Marg' },
                          { label: 'Chhatikara Road', value: 'Chhatikara Road, Vrindavan' }
                        ].map((loc, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSignupAddress(loc.value)}
                            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 hover:text-stone-950 border border-stone-200 dark:bg-white/5 dark:hover:bg-[#E0FF33]/15 dark:hover:text-[#E0FF33] dark:border-white/10 dark:hover:border-[#E0FF33]/30 text-xs font-semibold dark:text-zinc-300 transition-all cursor-pointer shadow-xs truncate text-left flex items-center gap-1.5"
                          >
                            <span className="text-amber-600 dark:text-[#E0FF33] text-xs font-black shrink-0">+</span>
                            <span className="truncate">{loc.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Registration Summary Card */}
                    <div className="p-3 rounded-2xl bg-white dark:bg-[#1E1B1C] border border-stone-200 dark:border-white/10 space-y-1 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-500 dark:text-zinc-400">Name:</span>
                        <span className="font-bold text-stone-900 dark:text-white font-['Outfit']">{displayName}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-500 dark:text-zinc-400">Mobile:</span>
                        <span className="font-bold text-stone-900 dark:text-[#E0FF33] font-['Outfit']">+91 {signupPhone}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-500 dark:text-zinc-400">Email:</span>
                        <span className="font-medium text-stone-700 dark:text-zinc-300 truncate max-w-[200px]">{email}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STANDARD LOGIN FORM (WHEN NOT SIGNING UP) ── */}
                {!isSignup && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 dark:text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address (e.g. user@example.com)"
                        required
                        className="w-full min-h-[50px] sm:min-h-[54px] bg-stone-50 dark:bg-[#151314] border border-stone-300 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-stone-900 dark:focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all font-medium"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 dark:text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        className="w-full min-h-[50px] sm:min-h-[54px] bg-stone-50 dark:bg-[#151314] border border-stone-300 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-stone-900 dark:focus:border-[#E0FF33]/40 focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-[#E0FF33]/10 font-['Plus_Jakarta_Sans'] transition-all font-medium"
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
                      className="py-3.5 px-4 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-950 border border-stone-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-zinc-300 dark:border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                  )}

                  <button
                    type={isSignup && signupStep < 3 ? "button" : "submit"}
                    onClick={isSignup && signupStep < 3 ? handleNextStep : undefined}
                    disabled={loading}
                    className="flex-1 py-3.5 px-6 rounded-full bg-stone-900 hover:bg-black text-white dark:bg-[#E0FF33] dark:hover:bg-[#CCFF00] dark:text-[#1E1B1C] font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer font-['Outfit'] apple-tap-target disabled:opacity-40 disabled:bg-stone-200 disabled:text-stone-400 dark:disabled:bg-white/10 dark:disabled:text-zinc-600 disabled:cursor-not-allowed"
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
                    className="text-xs text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {isSignup ? 'Already registered? ' : "Don't have an account? "}
                    <span className="text-amber-600 hover:text-amber-700 dark:text-[#E0FF33] font-bold underline ml-1">
                      {isSignup ? 'Log In Instead' : 'Register in 3 Steps'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* Google Sign-In Option (When logging in) */}
            {!isSignup && (
              <div className="pt-2 border-t border-stone-200 dark:border-white/5 space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 px-4 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 hover:text-stone-950 border border-stone-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-zinc-200 dark:hover:text-white dark:border-white/10 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer apple-tap-target"
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
                    className="text-[11px] text-stone-500 hover:text-stone-800 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3 h-3 text-stone-400 dark:text-zinc-500" />
                    <span>{showStaffSignIn ? 'Switch to Customer Sign In' : 'Kitchen, Rider & Staff Portal Access'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sound Trials Modal */}
      <SoundTrialsModal
        isOpen={showSoundTrials}
        onClose={() => setShowSoundTrials(false)}
      />
    </div>
  );
}
