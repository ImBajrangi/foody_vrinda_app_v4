/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  supabase,
  getCloudShops,
  getCachedShops,
  subscribeCloudShops,
  getCloudUsers,
  createCloudUser,
  updateCloudUser,
  recordLoggedInUser,
  getLiveUserRoleAndProfile,
  getCachedUsers,
  saveCachedUsers,
  subscribeCloudUsers
} from '../supabase';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { nativeNotify } from '../services/nativeNotificationService';
import { initUserWallet, getWalletDashboard } from '../services/fvWalletService';
import { isContaminatedPickupAddress, sanitizeCustomerAddress } from '../utils/addressUtils';
import { markNewUserTutorialEligible } from '../services/tutorialService';

const AuthContext = createContext(null);

// Operational staff roles that require explicit protection against silent background demotion
export const STAFF_ROLES = [
  'kitchen',
  'delivery',
  'owner',
  'developer',
  'grand_admin',
];

export const isStaffRole = (role) => STAFF_ROLES.includes(role);

/**
 * Architectural Role Resolver:
 * Protects active staff sessions (Kitchen, Rider, Owner, Dev) against silent demotion
 * from partial broadcasts or background token refreshes.
 */
export const resolveRole = (incomingRole, currentRole, savedRole) => {
  if (isStaffRole(currentRole) && (!incomingRole || incomingRole === 'customer')) {
    return currentRole;
  }

  if (isStaffRole(savedRole) && (!incomingRole || incomingRole === 'customer')) {
    return savedRole;
  }

  return incomingRole || currentRole || savedRole || 'customer';
};

/**
 * Architectural Identity Resolution Hierarchy:
 * 1. Database profile name
 * 2. OAuth/provider display name
 * 3. Existing verified userData name
 * 4. Clean email username
 * 5. Phone identifier
 * 6. "Devotee"
 * (Literal string "User" is never accepted as a valid identity)
 */
export const resolveDisplayName = (profileName, providerName, savedName, email, phone) => {
  if (profileName && typeof profileName === 'string' && profileName.trim() && profileName.trim() !== 'User') {
    return profileName.trim();
  }
  if (providerName && typeof providerName === 'string' && providerName.trim() && providerName.trim() !== 'User') {
    return providerName.trim();
  }
  if (savedName && typeof savedName === 'string' && savedName.trim() && savedName.trim() !== 'User') {
    return savedName.trim();
  }
  if (email && typeof email === 'string' && email.includes('@')) {
    const raw = email.split('@')[0].replace(/[._-]/g, ' ').trim();
    if (raw.length > 0) {
      return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  const cp = phone ? String(phone).replace(/\D/g, '') : '';
  if (cp.length >= 4) {
    return `Member (${cp.slice(-4)})`;
  }
  return 'Devotee';
};

// Authorized developer & administrator emails (driven exclusively by environment configuration and database roles)
export const AUTHORIZED_DEV_EMAILS = [
  'developer@foodyvrinda.com',
  'admin@foodyvrinda.com',
  ...((typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEVELOPER_EMAILS) || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
];

export const AUTHORIZED_ADMIN_EMAILS = [
  'admin@foodyvrinda.com',
  ...((typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_EMAILS) || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
];

export const isDeveloperUser = (email = '', role = '') => {
  if (role === 'developer' || role === 'grand_admin') return true;
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return AUTHORIZED_DEV_EMAILS.length > 0 && AUTHORIZED_DEV_EMAILS.includes(clean);
};

export const isAdminUser = (email = '', role = '') => {
  if (role === 'owner' || role === 'developer' || role === 'grand_admin') return true;
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return (
    (AUTHORIZED_ADMIN_EMAILS.length > 0 && AUTHORIZED_ADMIN_EMAILS.includes(clean)) ||
    isDeveloperUser(clean, role)
  );
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [userData, setUserData] = useState(() => {
    try {
      const saved = localStorage.getItem('foody_user_data');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return null;
  });
  // ⚠️ SECURITY INVARIANT: This role from localStorage is a UI HINT ONLY for instant hydration.
  // It is NEVER used as an authorization source. The real authorization chain is:
  //   Supabase Auth session → getLiveUserRoleAndProfile() → RLS policies → PostgreSQL
  // An attacker editing localStorage cannot gain elevated access because all privileged
  // operations go through Supabase RLS which validates the authenticated user's server-side role.
  const [userRole, setUserRole] = useState(() => {
    try {
      const saved = localStorage.getItem('foody_user_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.role) return parsed.role;
      }
    } catch (e) { }
    return 'customer';
  });
  const [userDevPermissions, setUserDevPermissions] = useState([]);
  const [currentUserShopId, setCurrentUserShopId] = useState(() => {
    try {
      const saved = localStorage.getItem('foody_user_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.shopId) return parsed.shopId;
      }
    } catch (e) { }
    return null;
  });
  const [currentUserShopIds, setCurrentUserShopIds] = useState(() => {
    try {
      const saved = localStorage.getItem('foody_user_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.shopIds) return parsed.shopIds;
        if (parsed?.shopId) return [parsed.shopId];
      }
    } catch (e) { }
    return [];
  });
  const [currentShopName, setCurrentShopName] = useState(null);
  const [allShops, setAllShops] = useState(() => getCachedShops());
  const [loading, setLoading] = useState(true);

  // Impersonation states for developer & quick desk switches (allowed only for verified admins)
  const [impersonatedShopId, setImpersonatedShopId] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = sessionStorage.getItem('foody_dev_impersonation');
        if (saved) return JSON.parse(saved)?.shopId || null;
      }
    } catch (_) {}
    return null;
  });
  const [impersonatedRole, setImpersonatedRole] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = sessionStorage.getItem('foody_dev_impersonation');
        if (saved) return JSON.parse(saved)?.role || null;
      }
    } catch (_) {}
    return null;
  });

  // Helper to compare shop arrays to avoid redundant state updates & flickering
  const areShopsEqual = (prev = [], next = []) => {
    if (!Array.isArray(prev) || !Array.isArray(next)) return false;
    if (prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i++) {
      const p = prev[i];
      const n = next[i];
      if (!p || !n) return false;
      if (p.id !== n.id || p.name !== n.name) return false;
      if (p.isOpen !== n.isOpen || p.is_open !== n.is_open) return false;
      if (p.isOnline !== n.isOnline || p.is_online !== n.is_online) return false;
      if (p.onlinePaymentsEnabled !== n.onlinePaymentsEnabled || p.codEnabled !== n.codEnabled) return false;
      if (JSON.stringify(p.paymentSettings) !== JSON.stringify(n.paymentSettings)) return false;
    }
    return true;
  };

  // Helper to load all shops from Supabase & Cache silently
  const loadShops = async () => {
    try {
      const shops = await getCloudShops();
      if (shops && shops.length > 0) {
        setAllShops(prev => areShopsEqual(prev, shops) ? prev : [...shops]);
        return shops;
      }
      return [];
    } catch (e) {
      console.warn("Notice loading shops from Supabase:", e);
      return [];
    }
  };

  useEffect(() => {
    // 1. Authoritative fetch from database once on initial mount
    loadShops();

    // 2. Realtime delta updates: only update changed records on subsequent events
    const unsubscribe = subscribeCloudShops((firstArg, secondArg) => {
      const shops = Array.isArray(firstArg) ? firstArg : (Array.isArray(secondArg) ? secondArg : null);
      if (shops && shops.length > 0) {
        setAllShops(prev => areShopsEqual(prev, shops) ? prev : [...shops]);
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Listen for real-time shop configuration updates (e.g. online/offline and payment toggles)
  useEffect(() => {
    const handleShopsChanged = (e) => {
      if (e?.type === 'storage' && e.key && e.key !== 'foody_cache_shops' && e.key !== 'foody_all_shops') {
        return;
      }
      const incoming = (e?.detail?.shops && Array.isArray(e.detail.shops))
        ? e.detail.shops
        : getCachedShops();

      if (incoming && incoming.length > 0) {
        setAllShops(prev => areShopsEqual(prev, incoming) ? prev : [...incoming]);
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

  const userRef = useRef(user);
  const userDataRef = useRef(userData);
  const userRoleRef = useRef(userRole);
  const currentUserShopIdRef = useRef(currentUserShopId);
  const resolveShopNameRef = useRef(resolveShopName);

  useEffect(() => {
    userRef.current = user;
    userDataRef.current = userData;
    userRoleRef.current = userRole;
    currentUserShopIdRef.current = currentUserShopId;
    resolveShopNameRef.current = resolveShopName;
  }, [user, userData, userRole, currentUserShopId, resolveShopName]);

  // Listen for real-time user database / role updates from Supabase Realtime & Local Events (Stable single subscription)
  useEffect(() => {
    const handleUsersUpdate = (users) => {
      if (!users || !Array.isArray(users)) return;

      const activeUser = userRef.current;
      const activeUserData = userDataRef.current;
      const activeRole = userRoleRef.current;
      const activeShopId = currentUserShopIdRef.current;

      const currentId = activeUser?.id ? String(activeUser.id).trim() : '';
      const currentEmail = (activeUser?.email || activeUserData?.email || '').toLowerCase().trim();
      const currentPhone = (activeUser?.phone || activeUserData?.phone || '').replace(/\D/g, '');
      if (!currentId && !currentEmail && !currentPhone) return;

      const match = users.find(u => {
        const uId = u.id ? String(u.id).trim() : '';
        const uEmail = (u.email || '').toLowerCase().trim();
        const uPhone = (u.phone || '').replace(/\D/g, '');
        return (
          (currentId && uId === currentId) ||
          (currentEmail && uEmail && uEmail === currentEmail) ||
          (currentPhone && cleanPhone(currentPhone) && uPhone && uPhone.endsWith(currentPhone.slice(-10)))
        );
      });

      function cleanPhone(p) {
        return p && p.length >= 10;
      }

      if (match) {
        // Architectural Rule: Realtime events are synchronization signals, NOT role mutation authority.
        // Protect active staff personas (Kitchen, Rider, Owner, Dev) from silent broadcast downgrade.
        const currentActiveRole = activeRole;
        const savedRole = activeUserData?.role;
        const newRole = resolveRole(match.role, currentActiveRole, savedRole);

        // Resolve display name using strict identity hierarchy (never literal "User")
        const safeDisplayName = resolveDisplayName(
          match.displayName,
          activeUser?.user_metadata?.displayName || activeUser?.user_metadata?.name || activeUser?.displayName,
          activeUserData?.displayName,
          currentEmail,
          currentPhone
        );

        const shouldUpdateRole = newRole !== activeRole;
        const shouldUpdateShop = match.shopId && match.shopId !== activeShopId;
        const shouldUpdateName = safeDisplayName !== activeUserData?.displayName;

        if (shouldUpdateRole || shouldUpdateShop || shouldUpdateName) {
          if (shouldUpdateRole) setUserRole(newRole);
          if (shouldUpdateShop) {
            setCurrentUserShopId(match.shopId);
            setCurrentUserShopIds(match.shopIds || [match.shopId]);
            if (resolveShopNameRef.current) {
              setCurrentShopName(resolveShopNameRef.current(match.shopId));
            }
          }
          setUserData(prev => {
            const updated = {
              ...(prev || {}),
              role: newRole,
              shopId: match.shopId || prev?.shopId,
              shopIds: match.shopIds || prev?.shopIds,
              displayName: safeDisplayName
            };
            try {
              localStorage.setItem('foody_user_data', JSON.stringify(updated));
            } catch (err) { }
            return updated;
          });
        }
      }
    };

    const unsubscribe = subscribeCloudUsers(handleUsersUpdate);
    const handleStorage = (e) => {
      if (e && e.key && e.key !== 'foody_registered_users_cloud' && e.key !== 'foody_users_cache') {
        return;
      }
      const cached = getCachedUsers();
      handleUsersUpdate(cached);
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const syncUserToCloudList = useCallback((userProfile) => {
    if (!userProfile || !userProfile.id) return;
    try {
      const currentCached = getCachedUsers();
      const cleanEmail = (userProfile.email || '').toLowerCase().trim();
      const cleanId = String(userProfile.id).trim();
      const cleanPhone = (userProfile.phone || '').replace(/\D/g, '');

      const exists = currentCached.find(u =>
        (cleanId && String(u.id).trim() === cleanId) ||
        (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
        (cleanPhone && cleanPhone.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
      );

      const resolvedRole = (userProfile.role && userProfile.role !== 'customer')
        ? userProfile.role
        : (exists?.role && exists.role !== 'customer' ? exists.role : (userProfile.role || 'customer'));

      // If already recorded with identical data, skip the cloud call completely
      if (
        exists &&
        exists.role === resolvedRole &&
        exists.displayName === (userProfile.displayName || exists.displayName) &&
        (!userProfile.shopId || exists.shopId === userProfile.shopId)
      ) {
        return;
      }

      recordLoggedInUser({
        ...userProfile,
        role: resolvedRole
      }).catch(() => { });

      let nextList;
      if (!exists) {
        const newUser = {
          id: cleanId,
          displayName: userProfile.displayName || userProfile.email?.split('@')[0] || `User (${cleanId.slice(0, 6)})`,
          email: userProfile.email || '',
          phone: userProfile.phone || '',
          role: resolvedRole,
          shopId: userProfile.shopId || null,
          shopIds: userProfile.shopIds || (userProfile.shopId ? [userProfile.shopId] : []),
          isLoggedInUser: true,
          createdAt: new Date().toISOString()
        };
        nextList = [newUser, ...currentCached];
      } else {
        nextList = currentCached.map(u => {
          if (
            (cleanId && String(u.id).trim() === cleanId) ||
            (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
            (cleanPhone && cleanPhone.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
          ) {
            return {
              ...u,
              id: cleanId,
              displayName: userProfile.displayName || u.displayName,
              email: userProfile.email || u.email,
              phone: userProfile.phone || u.phone,
              role: resolvedRole,
              shopId: userProfile.shopId || u.shopId,
              shopIds: userProfile.shopIds || u.shopIds,
              isLoggedInUser: true
            };
          }
          return u;
        });
      }

      saveCachedUsers(nextList);
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
          try {
            await supabase.auth.signOut();
          } catch (e) { }
        }

        const currentSbUser = data?.session?.user || null;
        setSession(data?.session || null);

        const savedData = localStorage.getItem('foody_user_data');
        let parsedSaved = null;
        if (savedData) {
          try {
            parsedSaved = JSON.parse(savedData);
          } catch (e) { }
        }

        if (currentSbUser) {
          const email = currentSbUser.email || '';
          const cleanEmail = email.toLowerCase().trim();
          const cleanId = String(currentSbUser.id).trim();

          const avatarUrl = currentSbUser.user_metadata?.avatar_url ||
            currentSbUser.user_metadata?.picture ||
            currentSbUser.user_metadata?.photoURL ||
            currentSbUser.identities?.[0]?.identity_data?.avatar_url ||
            currentSbUser.identities?.[0]?.identity_data?.picture ||
            parsedSaved?.photoURL ||
            parsedSaved?.avatar_url || '';

          currentSbUser.photoURL = avatarUrl;
          setUser(currentSbUser);

          // Check live database role first for instant synchronization
          let liveProfile = null;
          try {
            liveProfile = await getLiveUserRoleAndProfile(cleanId, cleanEmail);
          } catch (e) { }

          let cachedUsersList = getCachedUsers();
          if (!liveProfile) {
            try {
              const cloudUsers = await getCloudUsers();
              if (cloudUsers && cloudUsers.length > 0) {
                cachedUsersList = cloudUsers;
              }
            } catch (e) { }
          }

          const existingRecord = liveProfile || cachedUsersList.find(u =>
            (cleanId && String(u.id).trim() === cleanId) ||
            (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail)
          );

          // Architectural Rule 1 & 2: Single source of truth & generic role downgrade protection
          const incomingRole = existingRecord?.role;
          const currentActiveRole = userRoleRef.current;
          const savedRole = parsedSaved?.role;
          const role = resolveRole(incomingRole, currentActiveRole, savedRole);

          let activeShopId = existingRecord?.shopId || parsedSaved?.shopId || null;
          let activeShopIds = existingRecord?.shopIds || parsedSaved?.shopIds || (activeShopId ? [activeShopId] : []);

          // Architectural Rule 4: Identity resolution hierarchy (never literal "User")
          const safeDisplayName = resolveDisplayName(
            existingRecord?.displayName || existingRecord?.display_name,
            currentSbUser.user_metadata?.displayName || currentSbUser.user_metadata?.name || currentSbUser.user_metadata?.full_name,
            parsedSaved?.displayName,
            email,
            existingRecord?.phone || currentSbUser.phone
          );

          const userProfile = {
            ...(parsedSaved || {}),
            id: currentSbUser.id,
            email,
            displayName: safeDisplayName,
            photoURL: avatarUrl,
            avatar_url: avatarUrl,
            role,
            shopId: activeShopId,
            shopIds: activeShopIds,
            isLoggedInUser: true
          };

          setUserData(userProfile);
          setUserRole(userProfile.role);
          setCurrentUserShopId(userProfile.shopId);
          setCurrentUserShopIds(userProfile.shopIds);
          setCurrentShopName(resolveShopName(userProfile.shopId));
          localStorage.setItem('foody_user_data', JSON.stringify(userProfile));
          syncUserToCloudList(userProfile);
        } else if (parsedSaved && parsedSaved.isLoggedInUser && parsedSaved.id !== 'master-dev-emergency') {
          const email = parsedSaved.email || '';
          const savedRole = parsedSaved.role;
          const safeRole = resolveRole(undefined, userRoleRef.current, savedRole);
          const safeName = resolveDisplayName(
            undefined,
            undefined,
            parsedSaved.displayName,
            email,
            parsedSaved.phone
          );

          setUser({
            id: parsedSaved.id,
            email,
            phone: parsedSaved.phone || '',
            displayName: safeName,
            isLoggedInUser: true
          });
          setUserData({ ...parsedSaved, role: safeRole, displayName: safeName });
          setUserRole(safeRole);
          setCurrentUserShopId(parsedSaved.shopId || null);
          setCurrentUserShopIds(parsedSaved.shopIds || (parsedSaved.shopId ? [parsedSaved.shopId] : []));
          setCurrentShopName(resolveShopName(parsedSaved.shopId) || null);
        } else {
          const guestUser = { uid: 'guest-' + Date.now(), isAnonymous: true };
          setUser(guestUser);
          setUserData({ role: 'customer', isAnonymous: true, displayName: 'Guest' });
          setUserRole('customer');
          setCurrentUserShopId(null);
          setCurrentUserShopIds([]);
          setCurrentShopName(null);
        }
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
        }
      } catch (e) {
        console.warn("Supabase initAuth note:", e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession || null);

      // Architectural Rule 5: Token refresh means token changed, NOT user role changed.
      // Do not re-resolve or reset active user role during TOKEN_REFRESHED.
      if (_event === 'TOKEN_REFRESHED' && userRef.current && userRoleRef.current) {
        return;
      }

      if (newSession?.user) {
        const u = newSession.user;
        const email = u.email || '';
        const cleanEmail = email.toLowerCase().trim();
        const cleanId = String(u.id).trim();

        const avatarUrl = u.user_metadata?.avatar_url ||
          u.user_metadata?.picture ||
          u.user_metadata?.photoURL ||
          u.identities?.[0]?.identity_data?.avatar_url ||
          u.identities?.[0]?.identity_data?.picture || '';

        u.photoURL = avatarUrl;
        setUser(u);

        // Check live database role directly
        let liveProfile = null;
        try {
          liveProfile = await getLiveUserRoleAndProfile(cleanId, cleanEmail);
        } catch (e) { }

        let cachedUsersList = getCachedUsers();
        if (!liveProfile) {
          try {
            const cloudUsers = await getCloudUsers();
            if (cloudUsers && cloudUsers.length > 0) {
              cachedUsersList = cloudUsers;
            }
          } catch (e) { }
        }

        const existingRecord = liveProfile || cachedUsersList.find(usr =>
          (cleanId && String(usr.id).trim() === cleanId) ||
          (cleanEmail && usr.email && usr.email.toLowerCase().trim() === cleanEmail)
        );

        // Architectural Rule 1 & 2: Single source of truth & generic role protection
        const currentActiveRole = userRoleRef.current;
        const savedRole = userDataRef.current?.role;
        const incomingRole = existingRecord?.role;
        const role = resolveRole(incomingRole, currentActiveRole, savedRole);

        const activeShopId = existingRecord?.shopId || userDataRef.current?.shopId || null;
        const activeShopIds = existingRecord?.shopIds || userDataRef.current?.shopIds || (activeShopId ? [activeShopId] : []);

        const userPhone = existingRecord?.phone || u.user_metadata?.phone || u.phone || '';
        const rawUserAddr = existingRecord?.address || existingRecord?.customerAddress || u.user_metadata?.address || '';
        const userAddr = sanitizeCustomerAddress(rawUserAddr);

        // Architectural Rule 4: Identity resolution hierarchy
        const safeDisplayName = resolveDisplayName(
          existingRecord?.displayName || existingRecord?.display_name,
          u.user_metadata?.displayName || u.user_metadata?.name || u.user_metadata?.full_name,
          userDataRef.current?.displayName,
          email,
          userPhone
        );

        const userProfile = {
          ...(userDataRef.current || {}),
          id: u.id,
          email,
          displayName: safeDisplayName,
          photoURL: avatarUrl,
          avatar_url: avatarUrl,
          phone: userPhone,
          address: userAddr,
          customerAddress: userAddr,
          role,
          shopId: activeShopId,
          shopIds: activeShopIds,
          isLoggedInUser: true
        };
        setUserData(userProfile);
        setUserRole(role);
        setCurrentUserShopId(userProfile.shopId);
        setCurrentUserShopIds(userProfile.shopIds);
        setCurrentShopName(resolveShopName(userProfile.shopId));
        localStorage.setItem('foody_user_data', JSON.stringify(userProfile));
        syncUserToCloudList(userProfile);

        // If this is a brand-new user record without existing record, mark eligible for first-visit tutorial
        if (!existingRecord) {
          markNewUserTutorialEligible(u.id, role);
        }

        // If phone or address is missing for a newly logged-in customer, prompt profile completion
        if (!userPhone || !userAddr) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('foody-complete-profile', { detail: userProfile }));
          }, 450);
        }
      } else if (_event === 'SIGNED_OUT') {
        setSession(null);
        const guestUser = { uid: 'guest-' + Date.now(), isAnonymous: true };
        setUser(guestUser);
        setUserData({ role: 'customer', isAnonymous: true, displayName: 'Guest' });
        setUserRole('customer');
        setCurrentUserShopId(null);
        setCurrentUserShopIds([]);
        setCurrentShopName(null);
        localStorage.removeItem('foody_user_data');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [allShops, resolveShopName, syncUserToCloudList]);

  // Native Deep Link OAuth Callback Handler (handles seamless return from Google OAuth to native app)
  useEffect(() => {
    let appUrlListener = null;

    const handleIncomingUrl = async (rawUrl) => {
      if (!rawUrl) return;

      if (
        rawUrl.includes('auth/callback') ||
        rawUrl.includes('access_token=') ||
        rawUrl.includes('refresh_token=') ||
        rawUrl.includes('code=')
      ) {
        try {
          // Close in-app browser Custom Tab overlay immediately
          await Browser.close().catch(() => { });
        } catch (_) { }

        try {
          // Extract query params (?) and hash params (#)
          const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : `https://dummy.local/${rawUrl.replace(/^[a-zA-Z0-9._-]+:\/\//, '')}`);
          const searchParams = urlObj.searchParams;

          let hashParams = new URLSearchParams();
          if (rawUrl.includes('#')) {
            const hashPart = rawUrl.substring(rawUrl.indexOf('#') + 1);
            hashParams = new URLSearchParams(hashPart);
          }

          const code = searchParams.get('code') || hashParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
            return;
          }

          const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
          }
        } catch (err) {
          console.error("Deep link auth error:", err);
        }
      }
    };

    const setupListener = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const launchUrl = await CapApp.getLaunchUrl();
          if (launchUrl?.url) {
            handleIncomingUrl(launchUrl.url);
          }
        } catch (_) { }

        appUrlListener = await CapApp.addListener('appUrlOpen', (data) => {
          if (data?.url) {
            handleIncomingUrl(data.url);
          }
        });
      }
    };

    setupListener();

    return () => {
      if (appUrlListener && typeof appUrlListener.remove === 'function') {
        appUrlListener.remove();
      }
    };
  }, []);

  // Listen for FCM Push Registration Token and sync with Supabase User Profile
  useEffect(() => {
    const handleFCMToken = (e) => {
      const token = e?.detail?.token;
      if (token && user?.id) {
        console.log('🔄 Syncing FCM Token with Supabase user profile:', token.slice(0, 15) + '...');
        recordLoggedInUser({
          id: user.id,
          email: user.email,
          phone: userData?.phone,
          displayName: userData?.displayName || user.displayName,
          role: userRole || userData?.role || 'customer',
          fcm_token: token
        }).catch(() => { });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('foody:fcm-token-received', handleFCMToken);
      // If token is already present in localStorage, sync it immediately
      const existingToken = localStorage.getItem('foody_fcm_token');
      if (existingToken && user?.id) {
        recordLoggedInUser({
          id: user.id,
          email: user.email,
          phone: userData?.phone,
          displayName: userData?.displayName || user.displayName,
          role: userRole || userData?.role || 'customer',
          fcm_token: existingToken
        }).catch(() => { });
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('foody:fcm-token-received', handleFCMToken);
      }
    };
  }, [user?.id, user?.email, userData?.phone, userData?.displayName, userRole]);

  // Update user profile fields (Name, Phone, Default Address) and sync to cache & Supabase
  const updateUserProfile = useCallback(async ({ displayName, phone, address, customerAddress }) => {
    const cleanPhone = phone !== undefined ? (phone || '').replace(/\D/g, '').slice(0, 10) : undefined;
    const hasAddressField = address !== undefined || customerAddress !== undefined;
    const rawAddr = (address || customerAddress || '').trim();
    const cleanAddr = hasAddressField ? sanitizeCustomerAddress(rawAddr) : undefined;
    const cleanName = displayName !== undefined ? (displayName || '').trim() : undefined;

    setUserData(prev => {
      const updated = {
        ...(prev || {}),
        ...(cleanName !== undefined ? { displayName: cleanName } : {}),
        ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
        ...(hasAddressField ? { address: cleanAddr, customerAddress: cleanAddr } : {})
      };
      try {
        localStorage.setItem('foody_user_data', JSON.stringify(updated));
      } catch (_) { }
      syncUserToCloudList(updated);
      return updated;
    });

    const activeId = user?.id || userData?.id;
    if (activeId) {
      try {
        await updateCloudUser(activeId, {
          ...(cleanName !== undefined ? { displayName: cleanName } : {}),
          ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
          ...(hasAddressField ? { address: cleanAddr } : {})
        });
      } catch (_) { }
    }
  }, [user?.id, userData?.id, syncUserToCloudList]);


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
    if (data?.user) {
      const name = data.user.user_metadata?.displayName || data.user.user_metadata?.name || cleanEmail.split('@')[0];
      nativeNotify.notifyLogin(name);
    }
    return data;
  };

  const signupWithEmail = async (email, password, displayName = '', phone = '', address = '') => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const cleanName = displayName.trim() || cleanEmail.split('@')[0];
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { displayName: cleanName, phone: cleanPhone, address }
      }
    });
    if (error) {
      if (error.message?.toLowerCase().includes('user already registered') || error.message?.toLowerCase().includes('already registered')) {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      throw error;
    }

    if (data?.user) {
      const userProfile = {
        id: data.user.id,
        email: cleanEmail,
        displayName: cleanName,
        phone: cleanPhone,
        address,
        customerAddress: address,
        role: 'customer',
        shopId: null,
        shopIds: [],
        isLoggedInUser: true
      };
      await createCloudUser(userProfile).catch(() => { });
      await recordLoggedInUser(userProfile).catch(() => { });
      
      // Auto-provision user wallet & bind referral code if user signed up via referral link
      const pendingRef = typeof window !== 'undefined' ? localStorage.getItem('foody_pending_referral_code') : null;
      await initUserWallet(data.user.id, pendingRef, 'direct').catch((err) => {
        console.warn('[AuthContext] Wallet initialization on signup notice:', err);
      });
      if (pendingRef) {
        try { localStorage.removeItem('foody_pending_referral_code'); } catch (_) {}
      }

      // Mark newly registered user eligible for first-visit tutorial
      markNewUserTutorialEligible(data.user.id, 'customer');

      nativeNotify.notifyLogin(cleanName);
    }
    return data;
  };

  const loginWithGoogle = async () => {
    const isNative = Capacitor.isNativePlatform();

    // In native app, use custom scheme callback so Android routes callback right back into the app
    const redirectUrl = isNative
      ? 'com.foodyvrinda.app://auth/callback'
      : (typeof window !== 'undefined' && (
        window.location.hostname === 'eat.vrindopnishad.in' ||
        window.location.hostname.includes('vrindopnishad.in')
      )
        ? 'https://eat.vrindopnishad.in/'
        : (typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://eat.vrindopnishad.in/'));

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: isNative
      }
    });
    if (error) throw error;

    if (isNative && data?.url) {
      await Browser.open({ url: data.url, windowName: '_self' });
    }

    return data;
  };

  // Quick Mobile / Phone Lookup Login
  const loginWithPhoneLookup = async (phoneInput) => {
    const clean = phoneInput.replace(/\D/g, '');
    if (!clean || clean.length < 10) {
      throw new Error("Please enter a valid 10-digit mobile number.");
    }

    const allUsers = await getCloudUsers(true);
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
      await recordLoggedInUser(userProfile).catch(() => { });
      nativeNotify.notifyLogin(userProfile.displayName || 'Devotee');
      return userProfile;
    }

    // Auto-provision new customer account in Supabase
    const newCustomer = await createCloudUser({
      phone: clean,
      displayName: `Customer (${clean.slice(-4)})`,
      role: 'customer',
      shopId: null,
      shopIds: []
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
    await recordLoggedInUser(userProfile).catch(() => { });
    nativeNotify.notifyLogin(userProfile.displayName || 'Devotee');

    // Mark newly registered user eligible for first-visit tutorial
    markNewUserTutorialEligible(newCustomer.id, 'customer');

    return userProfile;
  };

  const logout = async () => {
    localStorage.removeItem('foody_user_data');
    localStorage.removeItem('foody_customer_orders_cache');
    localStorage.removeItem('foody_my_session_orders');
    localStorage.removeItem('customerName');
    localStorage.removeItem('customerPhone');
    localStorage.removeItem('customerAddress');
    localStorage.removeItem('deliveryCoords');
    localStorage.removeItem('foody_fulfillment_type');
    try {
      await supabase.auth.signOut();
    } catch (e) { }
    setSession(null);
    setImpersonatedShopId(null);
    setImpersonatedRole(null);
    setUserRole('customer');
    const guestUser = { uid: 'guest-' + Date.now(), isAnonymous: true };
    setUser(guestUser);
    setUserData({ role: 'customer', isAnonymous: true, displayName: 'Guest' });
    setCurrentUserShopId(null);
    setCurrentUserShopIds([]);
    setCurrentShopName(null);
  };

  // Dedicated role update function accessible to all components & views
  const updateUserRole = useCallback(async (targetUserId, newRole, targetShopId = null) => {
    if (!targetUserId || !newRole) return { success: false, message: 'Invalid arguments' };

    // Guard: Grand Admin is strictly immutable and permanent
    const cachedUsers = getCachedUsers();
    const existingTarget = cachedUsers.find(u =>
      u.id === targetUserId ||
      (u.email && u.email.toLowerCase() === String(targetUserId).toLowerCase()) ||
      (u.phone && u.phone === String(targetUserId))
    );
    if (existingTarget?.role === 'grand_admin' && newRole !== 'grand_admin') {
      return { success: false, message: 'Grand Admin role is permanent and cannot be modified.' };
    }

    const cleanTargetId = String(targetUserId).trim();
    const currentId = user?.id ? String(user.id).trim() : '';
    const currentEmail = (user?.email || userData?.email || '').toLowerCase().trim();
    const currentPhone = (user?.phone || userData?.phone || '').replace(/\D/g, '');

    const isCurrentActiveUser = (
      (currentId && currentId === cleanTargetId) ||
      (userData?.id && String(userData.id).trim() === cleanTargetId) ||
      (currentEmail && targetUserId.includes('@') && currentEmail === cleanTargetId.toLowerCase()) ||
      (currentPhone && currentPhone.endsWith(cleanTargetId.replace(/\D/g, '').slice(-10)))
    );

    const updates = { role: newRole };
    if (targetShopId !== undefined) {
      updates.shopId = targetShopId;
      updates.shopIds = targetShopId ? [targetShopId] : [];
    }

    // 1. Update in local cache & Supabase cloud
    await updateCloudUser(targetUserId, updates);

    // 2. If it affects the currently active user, instantly update AuthContext states & localStorage
    if (isCurrentActiveUser) {
      setUserRole(newRole);
      setImpersonatedRole(null);
      if (targetShopId !== undefined) {
        setCurrentUserShopId(targetShopId);
        setCurrentUserShopIds(targetShopId ? [targetShopId] : []);
        setCurrentShopName(targetShopId ? resolveShopName(targetShopId) : null);
      }
      setUserData(prev => {
        const updated = {
          ...(prev || {}),
          role: newRole,
          ...(targetShopId !== undefined ? { shopId: targetShopId, shopIds: targetShopId ? [targetShopId] : [] } : {})
        };
        try {
          localStorage.setItem('foody_user_data', JSON.stringify(updated));
        } catch (e) { }
        return updated;
      });
    }

    return { success: true, newRole };
  }, [user, userData, resolveShopName]);

  // Developer & Admin authorization flags
  const isGrandAdmin = Boolean(
    (userData?.role === 'grand_admin') ||
    (userRole === 'grand_admin')
  );
  const isDevUser = isDeveloperUser(user?.email || userData?.email || '', userData?.role || userRole);
  const isAdminUserMatch = isAdminUser(user?.email || userData?.email || '', userData?.role || userRole);
  
  // Production RBAC: Privileges require an authenticated non-anonymous session
  const isAuthorizedDeveloper = Boolean(
    user && !user.isAnonymous && (
      isGrandAdmin ||
      (isDevUser && ['developer', 'grand_admin'].includes(userRole))
    )
  );

  const isAuthorizedAdmin = Boolean(
    user && !user.isAnonymous && (
      isGrandAdmin ||
      isAuthorizedDeveloper ||
      ((isAdminUserMatch || ['developer', 'owner', 'grand_admin'].includes(userRole)) && ['developer', 'owner', 'grand_admin'].includes(userData?.role || userRole))
    )
  );

  const isStaff = Boolean(
    user && !user.isAnonymous && (
      isAuthorizedAdmin ||
      ['kitchen', 'delivery', 'owner', 'developer', 'grand_admin'].includes(userRole)
    )
  );

  // Developer impersonation control helper (isolated purely in-memory / session storage to NEVER corrupt permanent user profile)
  const impersonate = (shopId, role) => {
    if (!isAuthorizedDeveloper && !isAuthorizedAdmin) {
      console.warn("Unauthorized attempt to impersonate privileged role:", role);
      return false;
    }
    setImpersonatedShopId(shopId);
    setImpersonatedRole(role);
    try {
      if (role) {
        sessionStorage.setItem('foody_dev_impersonation', JSON.stringify({ shopId, role }));
      } else {
        sessionStorage.removeItem('foody_dev_impersonation');
      }
    } catch (_) { }
    return true;
  };

  // Dynamically computed effective role and shop ID
  const effectiveRole = impersonatedRole || userRole;
  const effectiveShopId = impersonatedShopId || currentUserShopId;
  const effectiveShopName = impersonatedShopId ? resolveShopName(impersonatedShopId) : currentShopName;
  const effectiveShopIds = (effectiveRole === 'developer' || effectiveRole === 'owner')
    ? (allShops.length > 0 ? allShops.map(s => s.id) : (currentUserShopIds.length > 0 ? currentUserShopIds : ['shop-vrinda-main']))
    : currentUserShopIds;

  // Strictly check if the user has authenticated with credentials / active Supabase session
  const isAuthenticated = Boolean(
    (session && session.user && !session.user.is_anonymous) ||
    (user && !user.isAnonymous && !String(user.uid || '').startsWith('guest-') && (user.id || user.email || user.phone || user.phoneNumber) && user.email !== 'Guest' && user.displayName !== 'Guest') ||
    (userData && userData.isLoggedInUser === true && !userData.isAnonymous && (userData.phone || userData.email || userData.id))
  );

  const value = {
    session,
    user,
    currentUser: user,
    userData,
    isAuthenticated,
    isLoggedIn: isAuthenticated,
    userRole: effectiveRole,
    actualRole: userRole,
    isGrandAdmin,
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
    updateUserRole,
    updateUserProfile,
    setUserRole,
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
