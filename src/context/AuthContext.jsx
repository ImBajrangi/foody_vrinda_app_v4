/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  supabase, 
  getCloudShops, 
  getCachedShops, 
  getCloudUsers, 
  createCloudUser, 
  updateCloudUser, 
  getCachedUsers 
} from '../supabase';

const AuthContext = createContext(null);

// Whitelist of authorized developer & administrator emails
export const AUTHORIZED_DEV_EMAILS = (
  import.meta.env.VITE_DEVELOPER_EMAILS || 
  'developer@foodyvrinda.com,dev@foodyvrinda.com,admin@foodyvrinda.com,imbajrangi@gmail.com,sakhi@foodyvrinda.com'
).split(',').map(e => e.trim().toLowerCase());

export const AUTHORIZED_ADMIN_EMAILS = (
  import.meta.env.VITE_ADMIN_EMAILS || 
  'admin@foodyvrinda.com,owner@foodyvrinda.com,manager@foodyvrinda.com,developer@foodyvrinda.com,dev@foodyvrinda.com,imbajrangi@gmail.com,sakhi@foodyvrinda.com'
).split(',').map(e => e.trim().toLowerCase());

export const MASTER_DEV_PIN = import.meta.env.VITE_DEV_MASTER_PIN || '108108';

export const isDeveloperUser = (email = '', role = '') => {
  if (role === 'developer') return true;
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return AUTHORIZED_DEV_EMAILS.includes(clean) || clean.startsWith('dev@') || clean.includes('+dev@');
};

export const isAdminUser = (email = '', role = '') => {
  if (role === 'owner' || role === 'developer') return true;
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return AUTHORIZED_ADMIN_EMAILS.includes(clean) || isDeveloperUser(clean, role);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userRole, setUserRole] = useState('customer');
  const [userDevPermissions, setUserDevPermissions] = useState([]);
  const [currentUserShopId, setCurrentUserShopId] = useState(null);
  const [currentUserShopIds, setCurrentUserShopIds] = useState([]);
  const [currentShopName, setCurrentShopName] = useState(null);
  const [allShops, setAllShops] = useState(() => getCachedShops());
  const [loading, setLoading] = useState(true);

  // Emergency Master Key Override State
  const [emergencyMasterActive, setEmergencyMasterActive] = useState(() => {
    try {
      return localStorage.getItem('foody_emergency_dev_active') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Impersonation states for developer & quick desk switches
  const [impersonatedShopId, setImpersonatedShopId] = useState(null);
  const [impersonatedRole, setImpersonatedRole] = useState(() => {
    try {
      return localStorage.getItem('foody_emergency_dev_active') === 'true' ? 'developer' : null;
    } catch (e) {
      return null;
    }
  });

  // Emergency Developer Elevation function
  const emergencyElevateToDev = useCallback((pin) => {
    const validPins = [
      MASTER_DEV_PIN,
      '108108',
      '108',
      'foody108',
      'vrinda108'
    ];
    if (validPins.includes(String(pin).trim())) {
      const emergencyData = {
        id: 'master-dev-emergency',
        role: 'developer',
        email: 'master.dev@foodyvrinda.com',
        displayName: 'Master Developer (Emergency Override)',
        shopId: allShops[0]?.id || 'shop-vrinda-main',
        isMasterDev: true
      };
      setEmergencyMasterActive(true);
      setImpersonatedRole('developer');
      setUserRole('developer');
      setUserData(emergencyData);
      try {
        localStorage.setItem('foody_emergency_dev_active', 'true');
        localStorage.setItem('foody_user_data', JSON.stringify(emergencyData));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('foody_emergency_dev_unlocked'));
      return { success: true, message: 'Emergency Master Developer console unlocked!' };
    }
    return { success: false, message: 'Invalid Emergency Master Passcode' };
  }, [allShops]);

  // Emergency Revoke
  const emergencyRevokeDev = useCallback(() => {
    setEmergencyMasterActive(false);
    setImpersonatedRole(null);
    setUserRole('customer');
    try {
      localStorage.removeItem('foody_emergency_dev_active');
      localStorage.removeItem('foody_user_data');
    } catch (e) {}
  }, []);

  // URL search param detector for instant recovery link (e.g. ?dev_override=108108)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const devParam = urlParams.get('dev_override') || urlParams.get('master_pin') || urlParams.get('dev');
      if (devParam) {
        const res = emergencyElevateToDev(devParam);
        if (res.success) {
          const url = new URL(window.location);
          url.searchParams.delete('dev_override');
          url.searchParams.delete('master_pin');
          url.searchParams.delete('dev');
          window.history.replaceState({}, '', url);
        }
      }
    }
  }, [emergencyElevateToDev]);

  // Helper to load all shops from Supabase & Cache
  const loadShops = async () => {
    try {
      const shops = await getCloudShops();
      if (shops && shops.length > 0) {
        setAllShops(shops);
        return shops;
      }
      return [];
    } catch (e) {
      console.warn("Notice loading shops from Supabase:", e);
      return [];
    }
  };

  useEffect(() => {
    loadShops();
  }, []);

  // Listen for real-time shop configuration updates (e.g. payment toggles)
  useEffect(() => {
    const handleShopsChanged = (e) => {
      if (e?.detail?.shops && Array.isArray(e.detail.shops)) {
        setAllShops(e.detail.shops);
      } else {
        const cached = getCachedShops();
        if (cached && cached.length > 0) {
          setAllShops(cached);
        }
      }
    };

    window.addEventListener('foody_shops_changed', handleShopsChanged);
    window.addEventListener('storage', handleShopsChanged);
    return () => {
      window.removeEventListener('foody_shops_changed', handleShopsChanged);
      window.removeEventListener('storage', handleShopsChanged);
    };
  }, []);

  const resolveShopName = useCallback((shopId, shopsList = allShops) => {
    if (!shopId) return null;
    const shop = shopsList.find(s => s.id === shopId);
    return shop ? shop.name : null;
  }, [allShops]);

  const syncUserToCloudList = useCallback((userProfile) => {
    if (!userProfile || !userProfile.id) return;
    try {
      const currentCached = getCachedUsers();
      const cleanEmail = (userProfile.email || '').toLowerCase().trim();
      const cleanId = String(userProfile.id).trim();

      const exists = currentCached.find(u => 
        u.id === cleanId || 
        (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail)
      );

      let nextList;
      if (!exists) {
        const newUser = {
          id: cleanId,
          displayName: userProfile.displayName || userProfile.email?.split('@')[0] || `User (${cleanId.slice(0, 6)})`,
          email: userProfile.email || '',
          phone: userProfile.phone || '',
          role: userProfile.role || (isDeveloperUser(cleanEmail) ? 'developer' : (isAdminUser(cleanEmail) ? 'owner' : 'customer')),
          shopId: userProfile.shopId || allShops[0]?.id || 'shop-vrinda-main',
          shopIds: userProfile.shopIds || [allShops[0]?.id || 'shop-vrinda-main'],
          isLoggedInUser: true,
          createdAt: new Date().toISOString()
        };
        nextList = [newUser, ...currentCached];
        createCloudUser(newUser).catch(() => {});
      } else {
        nextList = currentCached.map(u => {
          if (u.id === cleanId || (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail)) {
            return {
              ...u,
              id: cleanId,
              displayName: userProfile.displayName || u.displayName,
              email: userProfile.email || u.email,
              phone: userProfile.phone || u.phone,
              isLoggedInUser: true
            };
          }
          return u;
        });
      }

      saveCachedUsers(nextList);
      window.dispatchEvent(new CustomEvent('foody_users_changed', { detail: { users: nextList } }));
    } catch (e) {
      console.warn("syncUserToCloudList warning:", e);
    }
  }, [allShops]);

  // Handle Supabase Auth State Changes
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          // If refresh token is expired or invalid (HTTP 400), safely clean up stale session
          try {
            await supabase.auth.signOut();
          } catch (e) {}
        }

        const currentSbUser = data?.session?.user || null;

        const savedData = localStorage.getItem('foody_user_data');
        let parsedSaved = null;
        if (savedData) {
          try {
            parsedSaved = JSON.parse(savedData);
          } catch (e) {}
        }

        if (currentSbUser) {
          const email = currentSbUser.email || '';
          const avatarUrl = currentSbUser.user_metadata?.avatar_url || 
            currentSbUser.user_metadata?.picture || 
            currentSbUser.user_metadata?.photoURL || 
            currentSbUser.identities?.[0]?.identity_data?.avatar_url || 
            currentSbUser.identities?.[0]?.identity_data?.picture || 
            parsedSaved?.photoURL || 
            parsedSaved?.avatar_url || '';

          currentSbUser.photoURL = avatarUrl;
          setUser(currentSbUser);
          
          let role = parsedSaved?.role || (isDeveloperUser(email) ? 'developer' : (isAdminUser(email) ? 'owner' : 'customer'));
          let activeShopId = parsedSaved?.shopId || allShops[0]?.id || 'shop-vrinda-main';
          let activeShopIds = parsedSaved?.shopIds || [activeShopId];

          const userProfile = {
            id: currentSbUser.id,
            email,
            displayName: currentSbUser.user_metadata?.displayName || currentSbUser.user_metadata?.name || currentSbUser.user_metadata?.full_name || email.split('@')[0],
            photoURL: avatarUrl,
            avatar_url: avatarUrl,
            role,
            shopId: activeShopId,
            shopIds: activeShopIds,
            isLoggedInUser: true,
            ...(parsedSaved || {})
          };

          setUserData(userProfile);
          setUserRole(userProfile.role);
          setCurrentUserShopId(userProfile.shopId);
          setCurrentUserShopIds(userProfile.shopIds);
          setCurrentShopName(resolveShopName(userProfile.shopId));
          syncUserToCloudList(userProfile);
        } else if (parsedSaved && parsedSaved.isLoggedInUser && parsedSaved.id !== 'master-dev-emergency') {
          // Real persisted user session (e.g. from phone lookup login)
          setUser({ 
            id: parsedSaved.id, 
            email: parsedSaved.email || '', 
            phone: parsedSaved.phone || '', 
            displayName: parsedSaved.displayName || 'User',
            isLoggedInUser: true 
          });
          setUserData(parsedSaved);
          setUserRole(parsedSaved.role || 'customer');
          setCurrentUserShopId(parsedSaved.shopId || null);
          setCurrentUserShopIds(parsedSaved.shopIds || (parsedSaved.shopId ? [parsedSaved.shopId] : []));
          setCurrentShopName(resolveShopName(parsedSaved.shopId) || null);
        } else {
          // Clean unauthenticated guest session
          const guestUser = { uid: 'guest-' + Date.now(), isAnonymous: true };
          setUser(guestUser);
          setUserData({ role: 'customer', isAnonymous: true, displayName: 'Guest' });
          setUserRole('customer');
          setCurrentUserShopId(null);
          setCurrentUserShopIds([]);
          setCurrentShopName(null);
        }
      } catch (e) {
        console.warn("Supabase initAuth note:", e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = session.user;
        const email = u.email || '';
        const avatarUrl = u.user_metadata?.avatar_url || 
          u.user_metadata?.picture || 
          u.user_metadata?.photoURL || 
          u.identities?.[0]?.identity_data?.avatar_url || 
          u.identities?.[0]?.identity_data?.picture || '';

        u.photoURL = avatarUrl;
        setUser(u);
        
        const role = isDeveloperUser(email) ? 'developer' : (isAdminUser(email) ? 'owner' : 'customer');
        const userProfile = {
          id: u.id,
          email,
          displayName: u.user_metadata?.displayName || u.user_metadata?.name || u.user_metadata?.full_name || email.split('@')[0],
          photoURL: avatarUrl,
          avatar_url: avatarUrl,
          role,
          shopId: allShops[0]?.id || 'shop-vrinda-main',
          shopIds: allShops.map(s => s.id),
          isLoggedInUser: true
        };
        setUserData(userProfile);
        setUserRole(role);
        setCurrentUserShopId(userProfile.shopId);
        setCurrentUserShopIds(userProfile.shopIds);
        setCurrentShopName(resolveShopName(userProfile.shopId));
        localStorage.setItem('foody_user_data', JSON.stringify(userProfile));
        syncUserToCloudList(userProfile);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [allShops, resolveShopName, syncUserToCloudList]);


  const loginWithEmail = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) {
      if (error.message?.toLowerCase().includes('invalid login credentials') || error.status === 400) {
        throw new Error('Invalid email or password. If you are a new member, please register below.');
      }
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        throw new Error('Please check your email inbox to verify your account, or sign in with your mobile number.');
      }
      throw error;
    }
    return data;
  };

  const signupWithEmail = async (email, password, displayName = '', phone = '', address = '') => {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { displayName, phone, address }
      }
    });
    if (error) {
      if (error.message?.toLowerCase().includes('user already registered') || error.message?.toLowerCase().includes('already registered')) {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      throw error;
    }

    if (data?.user) {
      await createCloudUser({
        id: data.user.id,
        email: cleanEmail,
        displayName: displayName || cleanEmail.split('@')[0],
        phone,
        address,
        role: 'customer'
      }).catch(() => {});
    }
    return data;
  };

  const loginWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  };

  // Quick Mobile / Phone Lookup Login
  const loginWithPhoneLookup = async (phoneInput) => {
    const clean = phoneInput.replace(/\D/g, '');
    if (!clean || clean.length < 10) {
      throw new Error("Please enter a valid 10-digit mobile number.");
    }

    const allUsers = await getCloudUsers();
    const existing = allUsers.find(u => (u.phone || '').replace(/\D/g, '').endsWith(clean.slice(-10)));

    if (existing) {
      const userProfile = {
        ...existing,
        isLoggedInUser: true,
        shopIds: existing.shopIds || (existing.shopId ? [existing.shopId] : ['shop-vrinda-main'])
      };
      setUser({ id: existing.id, phone: clean, displayName: existing.displayName, isLoggedInUser: true });
      setUserData(userProfile);
      setUserRole(userProfile.role || 'customer');
      setCurrentUserShopId(userProfile.shopId || null);
      setCurrentUserShopIds(userProfile.shopIds);
      setCurrentShopName(resolveShopName(userProfile.shopId) || null);
      localStorage.setItem('foody_user_data', JSON.stringify(userProfile));
      return userProfile;
    }

    // Auto-provision new customer account in Supabase
    const newCustomer = await createCloudUser({
      phone: clean,
      displayName: `Customer (${clean.slice(-4)})`,
      role: 'customer'
    });

    const userProfile = {
      ...newCustomer,
      isLoggedInUser: true
    };

    setUser({ id: newCustomer.id, phone: clean, displayName: newCustomer.displayName, isLoggedInUser: true });
    setUserData(userProfile);
    setUserRole('customer');
    setCurrentUserShopId(null);
    setCurrentUserShopIds([]);
    setCurrentShopName(null);
    localStorage.setItem('foody_user_data', JSON.stringify(userProfile));
    return userProfile;
  };

  const logout = async () => {
    localStorage.removeItem('foody_user_data');
    localStorage.removeItem('foody_emergency_dev_active');
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setImpersonatedShopId(null);
    setImpersonatedRole(null);
    setEmergencyMasterActive(false);
    setUserRole('customer');
    const guestUser = { uid: 'guest-' + Date.now(), isAnonymous: true };
    setUser(guestUser);
    setUserData({ role: 'customer', isAnonymous: true, displayName: 'Guest' });
    setCurrentUserShopId(null);
    setCurrentUserShopIds([]);
    setCurrentShopName(null);
  };

  // Developer & Admin authorization flags
  const isDevUser = isDeveloperUser(user?.email || userData?.email || '', userData?.role || userRole);
  const isAdminUserMatch = isAdminUser(user?.email || userData?.email || '', userData?.role || userRole);
  const isAuthorizedDeveloper = Boolean(
    emergencyMasterActive || 
    (user && !user.isAnonymous && isDevUser) || 
    (userData?.role === 'developer' && userData?.isLoggedInUser && !user?.isAnonymous)
  );
  const isAuthorizedAdmin = Boolean(
    emergencyMasterActive || 
    (user && !user.isAnonymous && (isAdminUserMatch || isDevUser)) || 
    (['developer', 'owner'].includes(userData?.role) && userData?.isLoggedInUser && !user?.isAnonymous)
  );
  const isStaff = Boolean(
    emergencyMasterActive || 
    (['kitchen', 'delivery', 'owner', 'developer'].includes(userData?.role || userRole) && userData?.isLoggedInUser && !user?.isAnonymous)
  );

  // Developer impersonation control helper
  const impersonate = (shopId, role) => {
    if (!isAuthorizedDeveloper && !isAuthorizedAdmin && ['developer', 'owner'].includes(role)) {
      console.warn("Unauthorized attempt to impersonate privileged role:", role);
      return false;
    }
    setImpersonatedShopId(shopId);
    setImpersonatedRole(role);
    try {
      const saved = localStorage.getItem('foody_user_data');
      const base = saved ? JSON.parse(saved) : (userData || {});
      const updated = { ...base, role, shopId: shopId || base.shopId };
      setUserData(updated);
      localStorage.setItem('foody_user_data', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    return true;
  };

  // Dynamically computed effective role and shop ID
  const effectiveRole = impersonatedRole || userRole;
  const effectiveShopId = impersonatedShopId || currentUserShopId;
  const effectiveShopName = impersonatedShopId ? resolveShopName(impersonatedShopId) : currentShopName;
  const effectiveShopIds = (effectiveRole === 'developer' || effectiveRole === 'owner')
    ? (allShops.length > 0 ? allShops.map(s => s.id) : (currentUserShopIds.length > 0 ? currentUserShopIds : ['shop-vrinda-main']))
    : currentUserShopIds;

  const value = {
    user,
    userData,
    userRole: effectiveRole,
    actualRole: userRole,
    isAuthorizedDeveloper,
    isAuthorizedAdmin,
    isStaff,
    emergencyMasterActive,
    emergencyElevateToDev,
    emergencyRevokeDev,
    userDevPermissions,
    currentUserShopId: effectiveShopId,
    currentUserShopIds: effectiveShopIds,
    currentShopName: effectiveShopName,
    allShops,
    loading,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    loginWithPhoneLookup,
    logout,
    impersonate,
    refreshShops: loadShops
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
