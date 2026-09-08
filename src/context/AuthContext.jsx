/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  collection, 
  where, 
  getDocs, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { auth, db } from '../firebase';
import { supabase, getCloudShops } from '../supabase';

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
  const [allShops, setAllShops] = useState(() => {
    try {
      const cached = localStorage.getItem('foody_cached_shops');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.error("Failed to parse cached shops:", e);
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  // Impersonation states for developer & quick desk switches
  const [impersonatedShopId, setImpersonatedShopId] = useState(null);
  const [impersonatedRole, setImpersonatedRole] = useState(null);

  // Helper to load all shops from Supabase & Cache
  const loadShops = async () => {
    try {
      const shops = await getCloudShops();
      if (shops && shops.length > 0) {
        setAllShops(shops);
        localStorage.setItem('foody_cached_shops', JSON.stringify(shops));
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

  const resolveShopName = useCallback((shopId, shopsList = allShops) => {
    if (!shopId) return null;
    const shop = shopsList.find(s => s.id === shopId);
    return shop ? shop.name : null;
  }, [allShops]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        const email = currentUser.email || '';
        let role;
        let activeShopId;
        let activeShopIds;
        let permissions;

        const savedData = localStorage.getItem('foody_user_data');
        let parsedSaved = null;
        if (savedData) {
          try {
            parsedSaved = JSON.parse(savedData);
          } catch (e) {}
        }

        if (currentUser.isAnonymous) {
          if (parsedSaved) {
            setUserData(parsedSaved);
            setUserRole(parsedSaved.role || 'customer');
            setCurrentUserShopId(parsedSaved.shopId || null);
            setCurrentUserShopIds(parsedSaved.shopIds || (parsedSaved.shopId ? [parsedSaved.shopId] : []));
            setCurrentShopName(resolveShopName(parsedSaved.shopId) || null);
            setLoading(false);
            return;
          }

          role = 'customer';
          setUserData({ role, email: 'Guest', displayName: 'Guest' });
          setUserRole('customer');
          setCurrentUserShopId(null);
          setCurrentUserShopIds([]);
          setCurrentShopName(null);
        } else if (isDeveloperUser(email, parsedSaved?.role)) {
          const devDoc = { 
            email, 
            role: 'developer', 
            displayName: currentUser.displayName || (email ? email.split('@')[0] : 'Developer'),
            ...(parsedSaved || {})
          };
          try {
            await setDoc(doc(db, "users", currentUser.uid), devDoc, { merge: true });
          } catch (e) {}
          setUserData(devDoc);
          setUserRole('developer');
          setCurrentUserShopId(impersonatedShopId || null);
          setCurrentUserShopIds(allShops.map(s => s.id));
          setCurrentShopName(resolveShopName(impersonatedShopId) || null);
        } else {
          try {
            // Standard logged in user from Firestore
            const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (userDocSnap.exists()) {
              const data = userDocSnap.data();
              role = data.role || 'customer';
              permissions = data.devPermissions || [];
              activeShopId = data.shopId || null;

              if (role === 'delivery' && data.shopIds && data.shopIds.length > 0) {
                activeShopIds = data.shopIds;
                activeShopId = data.shopIds[0];
              } else {
                activeShopIds = activeShopId ? [activeShopId] : [];
              }

              setUserData(data);
              setUserRole(role);
              setUserDevPermissions(permissions);
              setCurrentUserShopId(activeShopId);
              setCurrentUserShopIds(activeShopIds);
              
              const name = resolveShopName(activeShopId);
              setCurrentShopName(role === 'delivery' && activeShopIds.length > 1 ? `${activeShopIds.length} Shops` : name);
            } else {
              // Create normal customer record
              const customerData = {
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email.split('@')[0],
                role: 'customer'
              };
              setUserData(customerData);
              setUserRole('customer');
              setCurrentUserShopId(null);
              setCurrentUserShopIds([]);
              setCurrentShopName(null);
            }
          } catch (profileErr) {
            // Safe fallback for customer profile
            const fallbackData = {
              email: currentUser.email,
              displayName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Customer'),
              role: 'customer'
            };
            setUserData(fallbackData);
            setUserRole('customer');
            setCurrentUserShopId(null);
            setCurrentUserShopIds([]);
            setCurrentShopName(null);
          }
        }
      } else {
        // Local guest session when user is browsing storefront
        setUser({ uid: 'guest-' + Date.now(), isAnonymous: true });
        setUserData({ role: 'customer', email: 'Guest', displayName: 'Guest' });
        setUserRole('customer');
        setCurrentUserShopId(null);
        setCurrentUserShopIds([]);
        setCurrentShopName(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [impersonatedShopId, impersonatedRole, resolveShopName]);

  const loginWithEmail = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signupWithEmail = async (email, password, displayName = '', phone = '', address = '') => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const customerData = {
      email,
      displayName: displayName || email.split('@')[0],
      role: 'customer',
      createdAt: serverTimestamp(),
      ...(phone && { phone: phone.replace(/\D/g, '') }),
      ...(address && { address })
    };
    await setDoc(doc(db, "users", cred.user.uid), customerData);
    setUserData(customerData);
    return cred;
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  // Quick Mobile/Phone Lookup Login (Like Vrinda Tours Partner Hub)
  const loginWithPhoneLookup = async (phoneInput) => {
    const clean = phoneInput.replace(/\D/g, '');
    if (!clean || clean.length < 10) {
      throw new Error("Please enter a valid 10-digit mobile number.");
    }

    // Search users in Firestore for matching phone
    const q1 = query(collection(db, "users"), where("phone", "==", clean));
    const snap1 = await getDocs(q1);

    if (!snap1.empty) {
      const docData = snap1.docs[0].data();
      const userProfile = { id: snap1.docs[0].id, ...docData };
      
      // Sign in anonymously if not already signed in
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      
      setUserData(userProfile);
      setUserRole(userProfile.role || 'customer');
      setCurrentUserShopId(userProfile.shopId || null);
      setCurrentUserShopIds(userProfile.shopIds || (userProfile.shopId ? [userProfile.shopId] : []));
      setCurrentShopName(resolveShopName(userProfile.shopId) || null);
      localStorage.setItem('foody_user_data', JSON.stringify(userProfile));
      return userProfile;
    }

    // Search with +91 format
    const q2 = query(collection(db, "users"), where("phone", "==", `+91${clean}`));
    const snap2 = await getDocs(q2);

    if (!snap2.empty) {
      const docData = snap2.docs[0].data();
      const userProfile = { id: snap2.docs[0].id, ...docData };
      
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      
      setUserData(userProfile);
      setUserRole(userProfile.role || 'customer');
      setCurrentUserShopId(userProfile.shopId || null);
      setCurrentUserShopIds(userProfile.shopIds || (userProfile.shopId ? [userProfile.shopId] : []));
      setCurrentShopName(resolveShopName(userProfile.shopId) || null);
      localStorage.setItem('foody_user_data', JSON.stringify(userProfile));
      return userProfile;
    }

    // If new phone number for customer, auto-register
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const newCustomer = {
      phone: clean,
      displayName: `Customer (${clean.slice(-4)})`,
      role: 'customer',
      createdAt: serverTimestamp()
    };

    if (auth.currentUser?.uid) {
      await setDoc(doc(db, "users", auth.currentUser.uid), newCustomer, { merge: true });
    }

    setUserData(newCustomer);
    setUserRole('customer');
    setCurrentUserShopId(null);
    setCurrentUserShopIds([]);
    setCurrentShopName(null);
    localStorage.setItem('foody_user_data', JSON.stringify(newCustomer));
    return newCustomer;
  };

  const logout = async () => {
    localStorage.removeItem('foody_user_data');
    await signOut(auth);
    setImpersonatedShopId(null);
    setImpersonatedRole(null);
    setUserData({ role: 'customer', email: 'Guest', displayName: 'Guest' });
    setUserRole('customer');
    setCurrentUserShopId(null);
    setCurrentUserShopIds([]);
    setCurrentShopName(null);
  };

  // Developer & Admin authorization flags
  const isDevUser = isDeveloperUser(user?.email || userData?.email || '', userData?.role || userRole);
  const isAdminUserMatch = isAdminUser(user?.email || userData?.email || '', userData?.role || userRole);
  const isAuthorizedDeveloper = Boolean(user && !user.isAnonymous && isDevUser);
  const isAuthorizedAdmin = Boolean(user && !user.isAnonymous && (isAdminUserMatch || isDevUser));
  const isStaff = Boolean(user && !user.isAnonymous && ['kitchen', 'delivery', 'owner', 'developer'].includes(userData?.role || userRole));

  // Developer impersonation control helper (only allowed for verified developers or admins)
  const impersonate = (shopId, role) => {
    // Only verified devs or admins can impersonate roles
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
