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

export const DEVELOPER_EMAIL = "dev@example.com";

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

  // Helper to load all shops from Supabase / Firebase / Cache
  const loadShops = async () => {
    try {
      const shops = await getCloudShops();
      if (shops && shops.length > 0) {
        setAllShops(shops);
        return shops;
      }

      const snap = await getDocs(collection(db, "shops"));
      const fbShops = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTimeout(() => setAllShops(fbShops), 0);
      localStorage.setItem('foody_cached_shops', JSON.stringify(fbShops));
      return fbShops;
    } catch (e) {
      console.warn("Failed to load shops from cloud, using cache:", e);
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
        const email = currentUser.email || 'Guest';
        let role;
        let activeShopId;
        let activeShopIds;
        let permissions;

        if (currentUser.isAnonymous) {
          // Check if there is stored session metadata for phone/guest login
          const savedData = localStorage.getItem('foody_user_data');
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData);
              setUserData(parsed);
              setUserRole(parsed.role || 'customer');
              setCurrentUserShopId(parsed.shopId || null);
              setCurrentUserShopIds(parsed.shopIds || (parsed.shopId ? [parsed.shopId] : []));
              setCurrentShopName(resolveShopName(parsed.shopId) || null);
              setLoading(false);
              return;
            } catch (err) {
              console.error("Failed to parse saved user data:", err);
            }
          }

          role = 'customer';
          setUserData({ role, email: 'Guest', displayName: 'Guest' });
          setUserRole('customer');
          setCurrentUserShopId(null);
          setCurrentUserShopIds([]);
          setCurrentShopName(null);
        } else if (email === DEVELOPER_EMAIL) {
          const devDoc = { email, role: 'developer', displayName: 'System Developer' };
          await setDoc(doc(db, "users", currentUser.uid), devDoc, { merge: true });
          setUserData(devDoc);
          setUserRole('developer');
          setCurrentUserShopId(impersonatedShopId || null);
          setCurrentUserShopIds([]);
          setCurrentShopName(resolveShopName(impersonatedShopId) || null);
        } else {
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
            // Check for pre-created staff invitation
            const q = query(
              collection(db, "users"), 
              where("email", "==", currentUser.email), 
              where("isPreCreated", "==", true)
            );
            const preCreatedSnap = await getDocs(q);

            if (!preCreatedSnap.empty) {
              const preCreatedDoc = preCreatedSnap.docs[0];
              const preCreatedData = preCreatedDoc.data();

              const finalUserData = {
                ...preCreatedData,
                uid: currentUser.uid,
                isPreCreated: false,
                linkedAt: serverTimestamp()
              };

              await setDoc(doc(db, "users", currentUser.uid), finalUserData);
              await deleteDoc(preCreatedDoc.ref);

              role = preCreatedData.role || 'customer';
              activeShopId = preCreatedData.shopId || null;
              activeShopIds = activeShopId ? [activeShopId] : [];

              setUserData(finalUserData);
              setUserRole(role);
              setCurrentUserShopId(activeShopId);
              setCurrentUserShopIds(activeShopIds);
              setCurrentShopName(resolveShopName(activeShopId));
            } else {
              // Create normal customer record
              const customerData = {
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email.split('@')[0],
                role: 'customer',
                createdAt: serverTimestamp()
              };
              await setDoc(doc(db, "users", currentUser.uid), customerData);
              
              setUserData(customerData);
              setUserRole('customer');
              setCurrentUserShopId(null);
              setCurrentUserShopIds([]);
              setCurrentShopName(null);
            }
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

  const signupWithEmail = async (email, password, displayName = '') => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const customerData = {
      email,
      displayName: displayName || email.split('@')[0],
      role: 'customer',
      createdAt: serverTimestamp()
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

    // If new phone number for customer devotee, auto-register
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const newCustomer = {
      phone: clean,
      displayName: `Devotee (${clean.slice(-4)})`,
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

  // Developer impersonation control helper
  const impersonate = (shopId, role) => {
    setImpersonatedShopId(shopId);
    setImpersonatedRole(role);
  };

  // Dynamically computed effective role and shop ID
  const effectiveRole = impersonatedRole || userRole;
  const effectiveShopId = impersonatedShopId || currentUserShopId;
  const effectiveShopName = impersonatedShopId ? resolveShopName(impersonatedShopId) : currentShopName;

  const value = {
    user,
    userData,
    userRole: effectiveRole,
    actualRole: userRole,
    userDevPermissions,
    currentUserShopId: effectiveShopId,
    currentUserShopIds,
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
