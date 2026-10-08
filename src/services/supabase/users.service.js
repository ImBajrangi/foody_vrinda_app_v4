import {
  supabase,
  isTableMissing,
  markTableMissing,
  isTableError,
  isForbiddenError,
  isTableWriteForbidden,
  markTableWriteForbidden,
  resetForbiddenTables
} from './client.js';
import {
  safeStorage,
  memoryCache,
  pendingRequests,
  dispatchSafeEvent,
  invalidateCache,
  getDefaultActiveShopId
} from './cache.js';
import { multiplexer } from './realtime.service.js';

// ==========================================
// SUPABASE CLOUD USERS & ROLE MANAGEMENT
// ==========================================

// Zero hardcoded seed users: pure database-driven role resolution
export const SEED_USERS = [];

export function getCachedUsers() {
  try {
    const saved = safeStorage.getItem('foody_cached_users');
    if (saved !== null && saved !== undefined) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { }
  return [];
}

export function saveCachedUsers(users) {
  try {
    safeStorage.setItem('foody_cached_users', JSON.stringify(users));
  } catch (e) { }
  return users;
}

let usersTableAvailable = null; // null: unknown, true: exists, false: missing from remote DB

export function checkUsersTableStatus() {
  return usersTableAvailable;
}

export const USERS_TABLE_SQL_SCHEMA = `-- ========================================================================
-- FOODY VRINDA ENTERPRISE USER & ROLE MANAGEMENT SYSTEM (SUPABASE POSTGRES)
-- ========================================================================

-- 1. Roles Master Catalog Table (Provides dropdown selection in Supabase Studio)
CREATE TABLE IF NOT EXISTS public.foody_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    hierarchy_level INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed enterprise roles
INSERT INTO public.foody_roles (id, name, description, icon, hierarchy_level)
VALUES 
    ('customer', 'Customer / Devotee', 'Standard user placing orders, exploring menus, and tracking prasadam deliveries', 'Sparkles', 1),
    ('delivery', 'Delivery Sarathi', 'Fleet rider partners fulfilling and delivering dispatched orders across Vrindavan', 'Truck', 2),
    ('kitchen', 'Kitchen Staff / Chef', 'Kitchen staff managing live KDS tickets, preparation states, and dish availability', 'ChefHat', 3),
    ('owner', 'Store Owner / Admin', 'Kitchen and store administrators overseeing menus, orders, pricing & shop analytics', 'ShieldCheck', 4),
    ('developer', 'Master Developer', 'System administrator with root debug access, database management, and system overrides', 'Terminal', 5)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    hierarchy_level = EXCLUDED.hierarchy_level,
    updated_at = NOW();

-- 2. All Logged-in Users & Profiles Table
CREATE TABLE IF NOT EXISTS public.foody_logged_users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer' REFERENCES public.foody_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    shop_id TEXT NOT NULL DEFAULT 'shop-vrinda-main' REFERENCES public.foody_shops(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    shop_ids JSONB DEFAULT '["shop-vrinda-main"]'::jsonb,
    dev_permissions JSONB DEFAULT '[]'::jsonb,
    login_method TEXT DEFAULT 'email',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backward-compatibility: public.foody_users table
CREATE TABLE IF NOT EXISTS public.foody_users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer' REFERENCES public.foody_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    shop_id TEXT DEFAULT 'shop-vrinda-main' REFERENCES public.foody_shops(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    shop_ids JSONB DEFAULT '["shop-vrinda-main"]'::jsonb,
    dev_permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-normalize invalid or null roles before applying foreign keys
UPDATE public.foody_users SET role = 'customer' WHERE role IS NULL OR role NOT IN (SELECT id FROM public.foody_roles);
UPDATE public.foody_logged_users SET role = 'customer' WHERE role IS NULL OR role NOT IN (SELECT id FROM public.foody_roles);

-- Apply Foreign Key constraints safely
DO $$
BEGIN
    ALTER TABLE public.foody_logged_users DROP CONSTRAINT IF EXISTS fk_foody_logged_users_role;
    ALTER TABLE public.foody_logged_users DROP CONSTRAINT IF EXISTS foody_logged_users_role_check;
    ALTER TABLE public.foody_logged_users ADD CONSTRAINT fk_foody_logged_users_role FOREIGN KEY (role) REFERENCES public.foody_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;

    ALTER TABLE public.foody_users DROP CONSTRAINT IF EXISTS fk_foody_users_role;
    ALTER TABLE public.foody_users DROP CONSTRAINT IF EXISTS foody_users_role_check;
    ALTER TABLE public.foody_users ADD CONSTRAINT fk_foody_users_role FOREIGN KEY (role) REFERENCES public.foody_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_logged_users_role ON public.foody_logged_users (role);
CREATE INDEX IF NOT EXISTS idx_logged_users_email ON public.foody_logged_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_logged_users_phone ON public.foody_logged_users (phone);
CREATE INDEX IF NOT EXISTS idx_logged_users_shop_id ON public.foody_logged_users (shop_id);

CREATE INDEX IF NOT EXISTS idx_foody_users_email ON public.foody_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_foody_users_phone ON public.foody_users (phone);
CREATE INDEX IF NOT EXISTS idx_foody_users_role ON public.foody_users (role);
CREATE INDEX IF NOT EXISTS idx_foody_users_shop_id ON public.foody_users (shop_id);

-- 4. Row Level Security & Access Policies
ALTER TABLE public.foody_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access roles" ON public.foody_roles;
CREATE POLICY "Public access roles" ON public.foody_roles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_logged_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access logged users" ON public.foody_logged_users;
CREATE POLICY "Public access logged users" ON public.foody_logged_users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read users" ON public.foody_users;
CREATE POLICY "Public read users" ON public.foody_users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write users" ON public.foody_users;
CREATE POLICY "Public write users" ON public.foody_users FOR ALL USING (true) WITH CHECK (true);

-- 5. Realtime Streaming Replication
ALTER TABLE public.foody_roles REPLICA IDENTITY FULL;
ALTER TABLE public.foody_logged_users REPLICA IDENTITY FULL;
ALTER TABLE public.foody_users REPLICA IDENTITY FULL;

DO $$ BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_roles; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_logged_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

NOTIFY pgrst, 'reload schema';

-- 5. Atomic Role Assignment RPC Function
CREATE OR REPLACE FUNCTION public.set_user_role(
    target_id TEXT,
    new_role TEXT,
    target_shop TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_record JSONB;
BEGIN
    -- 1. Update in public.foody_logged_users
    UPDATE public.foody_logged_users
    SET 
        role = new_role,
        shop_id = COALESCE(target_shop, shop_id),
        shop_ids = CASE 
            WHEN target_shop IS NOT NULL THEN jsonb_build_array(target_shop)
            ELSE shop_ids
        END,
        updated_at = NOW()
    WHERE id = target_id OR LOWER(email) = LOWER(target_id) OR phone = target_id
    RETURNING to_jsonb(foody_logged_users.*) INTO updated_record;

    -- 2. Also mirror update into public.foody_users
    UPDATE public.foody_users
    SET 
        role = new_role,
        shop_id = COALESCE(target_shop, shop_id),
        shop_ids = CASE 
            WHEN target_shop IS NOT NULL THEN jsonb_build_array(target_shop)
            ELSE shop_ids
        END,
        updated_at = NOW()
    WHERE id = target_id OR LOWER(email) = LOWER(target_id) OR phone = target_id;

    IF updated_record IS NULL THEN
        SELECT to_jsonb(foody_users.*) INTO updated_record FROM public.foody_users WHERE id = target_id OR LOWER(email) = LOWER(target_id) OR phone = target_id LIMIT 1;
    END IF;

    -- 3. Synchronize Supabase Auth metadata
    BEGIN
        UPDATE auth.users
        SET 
            raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role)),
            raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role))
        WHERE id::text = target_id OR LOWER(email) = LOWER(target_id);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN updated_record;
END;
$$;
`;

export const DEFAULT_ROLES = [
  { id: 'customer', name: 'Customer / Devotee', description: 'Standard user placing orders, exploring menus, and tracking prasadam deliveries', icon: 'Sparkles', hierarchy_level: 1 },
  { id: 'delivery', name: 'Delivery Sarathi', description: 'Fleet rider partners fulfilling and delivering dispatched orders across Vrindavan', icon: 'Truck', hierarchy_level: 2 },
  { id: 'kitchen', name: 'Kitchen Staff / Chef', description: 'Kitchen staff managing live KDS tickets, preparation states, and dish availability', icon: 'ChefHat', hierarchy_level: 3 },
  { id: 'owner', name: 'Store Owner / Admin', description: 'Kitchen and store administrators overseeing menus, orders, pricing & shop analytics', icon: 'ShieldCheck', hierarchy_level: 4 },
  { id: 'developer', name: 'Master Developer', description: 'System administrator with root debug access, database management, and system overrides', icon: 'Terminal', hierarchy_level: 5 },
  { id: 'grand_admin', name: 'Grand Admin', description: 'Supreme platform custodian and immutable root administrator with permanent permissions', icon: 'Crown', hierarchy_level: 6 }
];

export async function getCloudRoles() {
  const cached = getCachedItem('roles', 'all');
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;
  try {
    const { data, error } = await supabase.from('foody_roles').select('*').order('hierarchy_level', { ascending: true });
    if (!error && data && data.length > 0) {
      setCachedItem('roles', 'all', data);
      return data;
    }
  } catch (e) { }
  return DEFAULT_ROLES;
}

export async function getCloudUsers(forceRefresh = false) {
  const cached = getCachedUsers();

  if (!forceRefresh) {
    const memCached = getCachedItem('users', 'all');
    if (memCached && Array.isArray(memCached) && memCached.length > 0) {
      return memCached;
    }
  }

  // Deduplicate concurrent in-flight requests to save egress
  if (pendingRequests.has('getCloudUsers')) {
    return pendingRequests.get('getCloudUsers');
  }

  const promise = (async () => {
    try {
      // 1. Fetch from foody_logged_users (with safe order fallback)
      let loggedData = [];
      try {
        const { data, error } = await supabase
          .from('foody_logged_users')
          .select('*')
          .order('updated_at', { ascending: false });
        if (!error && data && data.length > 0) {
          loggedData = data;
        }
      } catch (e) {
        console.warn("getCloudUsers logged_users notice:", e);
      }

      // 2. Fetch from foody_users as well to ensure total multi-app sync
      let usersData = [];
      try {
        const { data, error } = await supabase
          .from('foody_users')
          .select('*')
          .order('updated_at', { ascending: false });
        if (!error && data && data.length > 0) {
          usersData = data;
        }
      } catch (e) {
        console.warn("getCloudUsers foody_users notice:", e);
      }

      // 3. Merge & deduplicate across cache, foody_users, and foody_logged_users by ID, Email, and Phone
      const deduplicatedUsers = [];

      const addOrMergeUser = (userCandidate) => {
        if (!userCandidate) return;
        const cleanId = String(userCandidate.id || '').trim();
        const cleanEmail = (userCandidate.email || '').toLowerCase().trim();
        const cleanPhone = (userCandidate.phone || '').replace(/\D/g, '');

        if (!cleanId && !cleanEmail && !cleanPhone) return;

        const existingIdx = deduplicatedUsers.findIndex(u =>
          (cleanId && u.id && String(u.id).trim() === cleanId) ||
          (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
          (cleanPhone && cleanPhone.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
        );

        if (existingIdx >= 0) {
          // Merge with higher priority record
          const prev = deduplicatedUsers[existingIdx];
          const bestRole = (prev.role === 'grand_admin' || userCandidate.role === 'grand_admin') ? 'grand_admin' :
            (prev.role === 'developer' || userCandidate.role === 'developer') ? 'developer' :
              (prev.role === 'owner' || userCandidate.role === 'owner') ? 'owner' :
                (prev.role === 'kitchen' || userCandidate.role === 'kitchen') ? 'kitchen' :
                  (prev.role === 'delivery' || userCandidate.role === 'delivery') ? 'delivery' :
                    (userCandidate.role || prev.role || 'customer');

          deduplicatedUsers[existingIdx] = {
            ...prev,
            ...userCandidate,
            id: cleanId || prev.id,
            displayName: userCandidate.displayName || prev.displayName,
            email: cleanEmail || prev.email,
            phone: userCandidate.phone || prev.phone,
            role: bestRole,
            shopId: userCandidate.shopId || prev.shopId || getDefaultActiveShopId(),
            shopIds: userCandidate.shopIds?.length ? userCandidate.shopIds : (prev.shopIds || [getDefaultActiveShopId()].filter(Boolean))
          };
        } else {
          deduplicatedUsers.push(userCandidate);
        }
      };

      // Only fallback to cache if remote database returned nothing
      if (loggedData.length === 0 && usersData.length === 0) {
        (cached || []).forEach(addOrMergeUser);
      }

      // Overlay foody_users
      usersData.forEach(u => {
        if (!u) return;
        const cleanId = String(u.id || '').trim();
        addOrMergeUser({
          id: cleanId,
          displayName: u.display_name || u.displayName || u.email?.split('@')[0] || `User (${cleanId.slice(0, 6)})`,
          email: u.email || '',
          phone: u.phone || '',
          avatarUrl: u.avatar_url || '',
          address: u.address || '',
          role: u.role || 'customer',
          shopId: u.shop_id || u.shopId || getDefaultActiveShopId(),
          shopIds: u.shop_ids || u.shopIds || (u.shop_id ? [u.shop_id] : [getDefaultActiveShopId()].filter(Boolean)),
          devPermissions: u.dev_permissions || [],
          isActive: u.is_active ?? true,
          lastLoginAt: u.last_seen_at || u.updated_at || u.created_at,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        });
      });

      // Overlay foody_logged_users (active login table takes highest priority)
      loggedData.forEach(u => {
        if (!u) return;
        const cleanId = String(u.id || '').trim();
        addOrMergeUser({
          id: cleanId,
          displayName: u.display_name || u.displayName || u.email?.split('@')[0] || `User (${cleanId.slice(0, 6)})`,
          email: u.email || '',
          phone: u.phone || '',
          avatarUrl: u.avatar_url || '',
          address: u.address || '',
          role: u.role || 'customer',
          shopId: u.shop_id || u.shopId || getDefaultActiveShopId(),
          shopIds: u.shop_ids || u.shopIds || (u.shop_id ? [u.shop_id] : [getDefaultActiveShopId()].filter(Boolean)),
          devPermissions: u.dev_permissions || [],
          isActive: u.is_active ?? true,
          lastLoginAt: u.last_login_at || u.updated_at || u.created_at,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        });
      });

      const merged = deduplicatedUsers;
      saveCachedUsers(merged);
      setCachedItem('users', 'all', merged);
      return merged;
    } catch (e) {
      console.warn("getCloudUsers exception:", e);
      return cached;
    } finally {
      pendingRequests.delete('getCloudUsers');
    }
  })();

  pendingRequests.set('getCloudUsers', promise);
  return promise;
}

// Fetch single user live role & profile directly from Supabase with zero egress overhead
export async function getLiveUserRoleAndProfile(userId, email, phone) {
  const cleanId = String(userId || '').trim();
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPhone = (phone || '').replace(/\D/g, '');

  if (!cleanId && !cleanEmail && !cleanPhone) return null;

  const filters = [];
  if (cleanId) filters.push(`id.eq.${cleanId}`);
  if (cleanEmail) filters.push(`email.eq.${cleanEmail}`);
  if (cleanPhone && cleanPhone.length >= 10) filters.push(`phone.eq.${cleanPhone}`);

  const resolveCleanName = (rawName, uEmail, uPhone) => {
    if (rawName && typeof rawName === 'string' && rawName.trim() && rawName.trim() !== 'User') {
      return rawName.trim();
    }
    if (uEmail && typeof uEmail === 'string' && uEmail.includes('@')) {
      const raw = uEmail.split('@')[0].replace(/[._-]/g, ' ').trim();
      if (raw.length > 0) {
        return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
    const cp = uPhone ? String(uPhone).replace(/\D/g, '') : '';
    if (cp.length >= 4) return `Member (${cp.slice(-4)})`;
    return 'Devotee';
  };

  try {
    let query = supabase.from('foody_logged_users').select('*');
    if (filters.length === 1) {
      const parts = filters[0].split('.eq.');
      query = query.eq(parts[0], parts[1]);
    } else if (filters.length > 1) {
      query = query.or(filters.join(','));
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (!error && data) {
      return {
        id: data.id,
        displayName: resolveCleanName(data.display_name, data.email, data.phone),
        email: data.email || '',
        phone: data.phone || '',
        avatarUrl: data.avatar_url || '',
        address: data.address || '',
        role: data.role || undefined,
        shopId: data.shop_id || getDefaultActiveShopId(),
        shopIds: data.shop_ids || (data.shop_id ? [data.shop_id] : [getDefaultActiveShopId()].filter(Boolean)),
        devPermissions: data.dev_permissions || [],
        isActive: data.is_active ?? true,
        isLoggedInUser: true
      };
    }
  } catch (e) { }

  // Fallback check on public.foody_users
  try {
    let uQuery = supabase.from('foody_users').select('*');
    if (filters.length === 1) {
      const parts = filters[0].split('.eq.');
      uQuery = uQuery.eq(parts[0], parts[1]);
    } else if (filters.length > 1) {
      uQuery = uQuery.or(filters.join(','));
    }
    const { data: uData, error: uErr } = await uQuery.limit(1).maybeSingle();
    if (!uErr && uData) {
      return {
        id: uData.id,
        displayName: resolveCleanName(uData.display_name, uData.email, uData.phone),
        email: uData.email || '',
        phone: uData.phone || '',
        avatarUrl: uData.avatar_url || '',
        address: uData.address || '',
        role: uData.role || undefined,
        shopId: uData.shop_id || getDefaultActiveShopId(),
        shopIds: uData.shop_ids || (uData.shop_id ? [uData.shop_id] : [getDefaultActiveShopId()].filter(Boolean)),
        devPermissions: uData.dev_permissions || [],
        isActive: uData.is_active ?? true,
        isLoggedInUser: true
      };
    }
  } catch (e) { }

  return null;
}

// Dedicated function to record every login/registration in the database without redundant queries or role downgrades
export async function recordLoggedInUser(userProfile) {
  if (!userProfile || !userProfile.id) return null;
  const cleanId = String(userProfile.id).trim();
  const cleanEmail = (userProfile.email || '').toLowerCase().trim();
  const cleanPhone = (userProfile.phone || '').replace(/\D/g, '');
  const cleanName = userProfile.displayName || userProfile.name || cleanEmail.split('@')[0] || `User (${cleanId.slice(0, 6)})`;
  const cleanAvatar = userProfile.avatar_url || userProfile.photoURL || userProfile.avatarUrl || '';
  const cleanShop = userProfile.shopId || getDefaultActiveShopId();
  const cleanShops = userProfile.shopIds || (cleanShop ? [cleanShop] : []);
  const loginMethod = userProfile.loginMethod || (cleanEmail ? 'email' : (cleanPhone ? 'phone' : 'google'));

  const current = getCachedUsers();
  const existingUser = current.find(u =>
    (cleanId && String(u.id).trim() === cleanId) ||
    (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
    (cleanPhone && cleanPhone.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
  );

  const finalRole = (existingUser?.role && existingUser.role !== 'customer' ? existingUser.role : null)
    || (userProfile.role && userProfile.role !== 'customer' ? userProfile.role : null)
    || 'customer';

  const finalShop = userProfile.shopId || existingUser?.shopId || cleanShop;
  const finalShops = userProfile.shopIds || existingUser?.shopIds || cleanShops;
  const nowIso = new Date().toISOString();

  const fcmToken = userProfile.fcm_token || userProfile.fcmToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('foody_fcm_token') : null) || existingUser?.fcm_token || null;

  const loggedUsersPayload = {
    id: cleanId,
    display_name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    avatar_url: cleanAvatar,
    address: userProfile.address || existingUser?.address || '',
    role: finalRole,
    shop_id: finalShop,
    shop_ids: finalShops,
    dev_permissions: userProfile.devPermissions || userProfile.dev_permissions || existingUser?.devPermissions || [],
    login_method: loginMethod,
    is_active: true,
    fcm_token: fcmToken,
    last_login_at: nowIso,
    updated_at: nowIso
  };

  const standardUsersPayload = {
    id: cleanId,
    display_name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    avatar_url: cleanAvatar,
    address: userProfile.address || existingUser?.address || '',
    role: finalRole,
    shop_id: finalShop,
    shop_ids: finalShops,
    dev_permissions: userProfile.devPermissions || userProfile.dev_permissions || existingUser?.devPermissions || [],
    is_active: true,
    fcm_token: fcmToken,
    last_seen_at: nowIso,
    updated_at: nowIso
  };

  // 1. Update in-memory & local storage cache instantly
  const idx = current.findIndex(u =>
    (cleanId && String(u.id).trim() === cleanId) ||
    (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
    (cleanPhone && cleanPhone.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
  );
  let next;
  if (idx >= 0) {
    next = [...current];
    next[idx] = { ...next[idx], ...loggedUsersPayload, displayName: cleanName };
  } else {
    next = [{ ...loggedUsersPayload, displayName: cleanName, createdAt: nowIso }, ...current];
  }
  saveCachedUsers(next);
  setCachedItem('users', 'all', next);
  dispatchSafeEvent('foody_users_changed', { users: next, updatedUser: loggedUsersPayload });

  // 2. Persist profile update to Supabase foody_logged_users & foody_users
  if (!isTableWriteForbidden('foody_logged_users')) {
    try {
      const { data: updated, error: err1 } = await supabase
        .from('foody_logged_users')
        .update({
          display_name: cleanName,
          phone: cleanPhone,
          avatar_url: loggedUsersPayload.avatar_url,
          address: loggedUsersPayload.address,
          last_login_at: nowIso,
          updated_at: nowIso
        })
        .eq('id', cleanId)
        .select();

      if ((!updated || updated.length === 0 || err1) && cleanId) {
        await supabase.rpc('sync_authenticated_profile', {
          p_display_name: cleanName,
          p_phone: cleanPhone,
          p_address: loggedUsersPayload.address,
          p_avatar_url: loggedUsersPayload.avatar_url
        });
      }
    } catch (e) {
      if (isForbiddenError(e)) {
        markTableWriteForbidden('foody_logged_users');
      }
    }
  }

  if (!isTableWriteForbidden('foody_users')) {
    try {
      await supabase
        .from('foody_users')
        .update({
          display_name: cleanName,
          phone: cleanPhone,
          avatar_url: standardUsersPayload.avatar_url,
          address: standardUsersPayload.address,
          updated_at: nowIso
        })
        .eq('id', cleanId);
    } catch (e) {
      if (isForbiddenError(e)) {
        markTableWriteForbidden('foody_users');
      }
    }
  }

  return loggedUsersPayload;
}

export async function createCloudUser(userData) {
  const currentUsers = getCachedUsers();
  const userId = userData.id || `user_${(userData.phone || Date.now()).toString().replace(/\D/g, '')}`;
  const nowIso = new Date().toISOString();
  const newUser = {
    id: userId,
    displayName: userData.displayName || userData.name || `User (${(userData.phone || '').slice(-4)})`,
    email: userData.email || `${userData.phone || userId}@foodyvrinda.com`,
    phone: userData.phone || '',
    avatarUrl: userData.avatarUrl || userData.avatar_url || '',
    address: userData.address || '',
    role: userData.role || 'customer',
    shopId: userData.shopId || getDefaultActiveShopId(),
    shopIds: userData.shopIds || (userData.shopId ? [userData.shopId] : [getDefaultActiveShopId()].filter(Boolean)),
    devPermissions: userData.devPermissions || userData.dev_permissions || [],
    isActive: userData.isActive ?? userData.is_active ?? true,
    lastLoginAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const nextList = [newUser, ...currentUsers.filter(u => u.id !== userId)];
  saveCachedUsers(nextList);
  setCachedItem('users', 'all', nextList);
  dispatchSafeEvent('foody_users_changed', { users: nextList, updatedUser: newUser });

  const loggedDbPayload = {
    id: newUser.id,
    display_name: newUser.displayName,
    email: newUser.email,
    phone: newUser.phone,
    avatar_url: newUser.avatarUrl,
    address: newUser.address,
    role: newUser.role,
    shop_id: newUser.shopId,
    shop_ids: newUser.shopIds,
    dev_permissions: newUser.devPermissions,
    login_method: 'email',
    is_active: Boolean(newUser.isActive),
    last_login_at: nowIso,
    updated_at: nowIso
  };

  const standardDbPayload = {
    id: newUser.id,
    display_name: newUser.displayName,
    email: newUser.email,
    phone: newUser.phone,
    avatar_url: newUser.avatarUrl,
    address: newUser.address,
    role: newUser.role,
    shop_id: newUser.shopId,
    shop_ids: newUser.shopIds,
    dev_permissions: newUser.devPermissions,
    is_active: Boolean(newUser.isActive),
    last_seen_at: nowIso,
    updated_at: nowIso
  };

  if (!isTableWriteForbidden('foody_logged_users')) {
    try {
      const { error: rpcErr } = await supabase.rpc('sync_authenticated_profile', {
        p_display_name: newUser.displayName,
        p_phone: newUser.phone,
        p_address: newUser.address,
        p_avatar_url: newUser.avatarUrl
      });
      if (rpcErr) {
        await supabase.from('foody_logged_users').update(loggedDbPayload).eq('id', newUser.id);
      }
    } catch (e) {
      if (isForbiddenError(e)) {
        markTableWriteForbidden('foody_logged_users');
      }
    }
  }

  if (!isTableWriteForbidden('foody_users')) {
    try {
      await supabase.from('foody_users').update(standardDbPayload).eq('id', newUser.id);
    } catch (e) {
      if (isForbiddenError(e)) {
        markTableWriteForbidden('foody_users');
      }
    }
  }

  return newUser;
}

export async function updateCloudUser(userIdOrData, updatesObj = {}) {
  let userId;
  let updates;
  if (typeof userIdOrData === 'object' && userIdOrData !== null) {
    userId = userIdOrData.id;
    updates = { ...userIdOrData, ...updatesObj };
    delete updates.id;
  } else {
    userId = userIdOrData;
    updates = updatesObj;
  }

  const currentUsers = getCachedUsers();
  const cleanId = String(userId || '').trim();
  const cleanEmail = (updates.email || '').toLowerCase().trim();
  const cleanPhone = (updates.phone || '').replace(/\D/g, '');

  const userExists = currentUsers.find(u =>
    (cleanId && String(u.id).trim() === cleanId) ||
    (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
    (cleanPhone && cleanPhone.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
  );

  if (userExists?.role === 'grand_admin' && updates.role && updates.role !== 'grand_admin') {
    console.warn("Permission Denied: Grand Admin role is permanent and cannot be modified or downgraded.");
    delete updates.role;
  }

  const targetId = userExists?.id || cleanId || `user_${Date.now()}`;
  const resolvedEmail = (updates.email || userExists?.email || cleanEmail || '').toLowerCase().trim();
  const resolvedPhone = (updates.phone || userExists?.phone || cleanPhone || '').replace(/\D/g, '');
  const nowIso = new Date().toISOString();

  let updatedList;
  if (userExists) {
    updatedList = currentUsers.map(u => {
      if (
        (cleanId && String(u.id).trim() === cleanId) ||
        (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
        (cleanPhone && cleanPhone.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
      ) {
        return { ...u, ...updates, id: targetId, updatedAt: nowIso };
      }
      return u;
    });
  } else {
    const resolvedName = (updates.displayName && updates.displayName !== 'User')
      ? updates.displayName
      : ((updates.display_name && updates.display_name !== 'User')
          ? updates.display_name
          : (resolvedEmail ? resolvedEmail.split('@')[0] : (resolvedPhone ? `Member (${resolvedPhone.slice(-4)})` : 'Devotee')));

    const newUser = {
      id: targetId,
      displayName: resolvedName,
      email: resolvedEmail,
      phone: resolvedPhone,
      avatarUrl: updates.avatarUrl || updates.avatar_url || '',
      address: updates.address || '',
      role: updates.role || 'customer',
      shopId: updates.shopId || updates.shop_id || getDefaultActiveShopId(),
      shopIds: updates.shopIds || updates.shop_ids || [updates.shopId || updates.shop_id || getDefaultActiveShopId()].filter(Boolean),
      devPermissions: updates.devPermissions || updates.dev_permissions || [],
      isActive: updates.isActive ?? updates.is_active ?? true,
      ...updates,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    updatedList = [newUser, ...currentUsers];
  }

  saveCachedUsers(updatedList);
  setCachedItem('users', 'all', updatedList);
  const updatedUserObj = updatedList.find(u => (targetId && String(u.id).trim() === targetId) || (resolvedEmail && u.email && u.email.toLowerCase().trim() === resolvedEmail));
  dispatchSafeEvent('foody_users_changed', { users: updatedList, updatedUser: updatedUserObj });

  // Synchronize update to both foody_logged_users and foody_users
  const isOnlineVal = updates.isOnline !== undefined ? updates.isOnline : (updates.is_online !== undefined ? updates.is_online : (updates.isActive !== undefined ? updates.isActive : (updates.is_active !== undefined ? updates.is_active : userExists?.isOnline ?? userExists?.isActive ?? true)));
  const resolvedTrust = updates.trustScore ?? updates.cibilScore ?? updates.trust_score ?? userExists?.trustScore ?? userExists?.cibilScore ?? 750;
  const resolvedCash = updates.cashInHand ?? updates.cash_in_hand ?? userExists?.cashInHand ?? 0;
  const resolvedDebt = updates.unsettledDebt ?? updates.unsettled_debt ?? userExists?.unsettledDebt ?? 0;

  const fullLoggedPayload = {
    id: targetId,
    display_name: updates.displayName || updates.display_name || userExists?.displayName || resolvedEmail?.split('@')[0] || `User (${targetId.slice(0, 6)})`,
    email: resolvedEmail,
    phone: resolvedPhone,
    avatar_url: updates.avatarUrl || updates.avatar_url || userExists?.avatarUrl || '',
    address: updates.address !== undefined ? updates.address : (userExists?.address || ''),
    role: updates.role || userExists?.role || 'customer',
    shop_id: updates.shopId || updates.shop_id || userExists?.shopId || getDefaultActiveShopId(),
    shop_ids: updates.shopIds || updates.shop_ids || userExists?.shopIds || [getDefaultActiveShopId()].filter(Boolean),
    dev_permissions: updates.devPermissions || updates.dev_permissions || userExists?.devPermissions || [],
    trust_score: Number(resolvedTrust),
    cibil_score: Number(resolvedTrust),
    cash_in_hand: Number(resolvedCash),
    unsettled_debt: Number(resolvedDebt),
    is_active: Boolean(isOnlineVal),
    last_login_at: nowIso,
    updated_at: nowIso
  };

  const fullStandardPayload = {
    id: targetId,
    display_name: fullLoggedPayload.display_name,
    email: resolvedEmail,
    phone: resolvedPhone,
    avatar_url: fullLoggedPayload.avatar_url,
    address: fullLoggedPayload.address,
    role: fullLoggedPayload.role,
    shop_id: fullLoggedPayload.shop_id,
    shop_ids: fullLoggedPayload.shop_ids,
    dev_permissions: fullLoggedPayload.dev_permissions,
    trust_score: Number(resolvedTrust),
    cibil_score: Number(resolvedTrust),
    cash_in_hand: Number(resolvedCash),
    unsettled_debt: Number(resolvedDebt),
    is_active: Boolean(isOnlineVal),
    last_seen_at: nowIso,
    updated_at: nowIso
  };

  if (!isTableWriteForbidden('foody_logged_users')) {
    try {
      const { error: err1 } = await supabase.from('foody_logged_users').update(fullLoggedPayload).eq('id', userId);
      if (err1 && isForbiddenError(err1)) {
        markTableWriteForbidden('foody_logged_users');
      }
    } catch (e) {
      if (isForbiddenError(e)) {
        markTableWriteForbidden('foody_logged_users');
      }
    }
  }

  if (!isTableWriteForbidden('foody_users')) {
    try {
      const { error: err2 } = await supabase.from('foody_users').update(fullStandardPayload).eq('id', userId);
      if (err2 && isForbiddenError(err2)) {
        markTableWriteForbidden('foody_users');
      }
    } catch (e) {
      if (isForbiddenError(e)) {
        markTableWriteForbidden('foody_users');
      }
    }
  }

  return updatedUserObj;
}

/**
 * Updates online/duty status and optional location coordinates for staff / delivery riders
 */
export async function updateUserOnlineStatus(userId, isOnline = true, coordinates = null) {
  if (!userId) return null;
  const updates = {
    isOnline: !!isOnline,
    isActive: !!isOnline,
    is_active: !!isOnline,
    last_seen_at: new Date().toISOString()
  };
  return updateCloudUser(userId, updates);
}

export async function adminBlockUser(userId, reason = 'Administrative block') {
  try {
    const { data, error } = await supabase.rpc('admin_block_user', {
      p_user_id: userId,
      p_reason: reason
    });
    if (error) throw error;

    // Update local cache
    const currentUsers = getCachedUsers();
    const updatedList = currentUsers.map(u => u.id === userId ? { ...u, isActive: false, is_active: false } : u);
    saveCachedUsers(updatedList);
    setCachedItem('users', 'all', updatedList);
    dispatchSafeEvent('foody_users_changed', { users: updatedList, updatedUserId: userId });
    return { success: true, data };
  } catch (err) {
    console.warn('adminBlockUser exception:', err.message);
    return { success: false, error: err.message };
  }
}

export async function adminUnblockUser(userId, reason = 'Administrative unblock') {
  try {
    const { data, error } = await supabase.rpc('admin_unblock_user', {
      p_user_id: userId,
      p_reason: reason
    });
    if (error) throw error;

    // Update local cache
    const currentUsers = getCachedUsers();
    const updatedList = currentUsers.map(u => u.id === userId ? { ...u, isActive: true, is_active: true } : u);
    saveCachedUsers(updatedList);
    setCachedItem('users', 'all', updatedList);
    dispatchSafeEvent('foody_users_changed', { users: updatedList, updatedUserId: userId });
    return { success: true, data };
  } catch (err) {
    console.warn('adminUnblockUser exception:', err.message);
    return { success: false, error: err.message };
  }
}

export async function adminRevokeUser(userId, reason = 'Privileges revoked by developer') {
  try {
    const { data, error } = await supabase.rpc('admin_revoke_user', {
      p_user_id: userId,
      p_reason: reason
    });
    if (error) throw error;

    // Update local cache
    const currentUsers = getCachedUsers();
    const updatedList = currentUsers.map(u => u.id === userId ? {
      ...u,
      role: 'customer',
      shopId: null,
      shop_id: null,
      shopIds: [],
      shop_ids: [],
      devPermissions: {},
      deliveryStatus: 'suspended',
      delivery_status: 'suspended'
    } : u);
    saveCachedUsers(updatedList);
    setCachedItem('users', 'all', updatedList);
    dispatchSafeEvent('foody_users_changed', { users: updatedList, updatedUserId: userId });
    return { success: true, data };
  } catch (err) {
    console.warn('adminRevokeUser exception:', err.message);
    return { success: false, error: err.message };
  }
}

export async function adminForceSignout(userId, reason = 'Administrative forced session invalidation') {
  try {
    const { data, error } = await supabase.rpc('admin_force_signout', {
      p_user_id: userId,
      p_reason: reason
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.warn('adminForceSignout exception:', err.message);
    return { success: false, error: err.message };
  }
}

export async function fetchAdminUserActions(limit = 100) {
  try {
    const { data, error } = await supabase.rpc('admin_get_audit_log', {
      p_limit: limit
    });
    if (error) {
      // Fallback direct query if RPC error
      const { data: directData, error: directErr } = await supabase
        .from('admin_user_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!directErr && directData) return directData;
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('fetchAdminUserActions exception:', err.message);
    return [];
  }
}

export async function deleteCloudUser(userId, reason = 'Deleted from Developer Dashboard') {
  const currentUsers = getCachedUsers();
  const updatedList = currentUsers.filter(u => u.id !== userId);
  saveCachedUsers(updatedList);
  setCachedItem('users', 'all', updatedList);
  dispatchSafeEvent('foody_users_changed', { users: updatedList, deletedUserId: userId });

  // 1. Primary server-side RPC execution
  try {
    const { data, error } = await supabase.rpc('admin_delete_user', {
      p_user_id: userId,
      p_reason: reason
    });
    if (!error && data?.success) {
      return true;
    }
    if (error) {
      console.warn('deleteCloudUser RPC note:', error.message);
    }
  } catch (rpcErr) {
    console.warn('deleteCloudUser RPC exception:', rpcErr.message);
  }

  // 2. Fallback direct table deletion
  if (!isTableWriteForbidden('foody_logged_users')) {
    try {
      const { error } = await supabase.from('foody_logged_users').delete().eq('id', userId);
      if (error) {
        if (isForbiddenError(error)) {
          markTableWriteForbidden('foody_logged_users');
          markTableWriteForbidden('foody_users');
        } else {
          console.warn('deleteCloudUser logged_users note:', error.message);
        }
      }
    } catch (e) {
      if (isForbiddenError(e)) {
        markTableWriteForbidden('foody_logged_users');
        markTableWriteForbidden('foody_users');
      }
    }
  }

  if (!isTableWriteForbidden('foody_users')) {
    try {
      const { error } = await supabase.from('foody_users').delete().eq('id', userId);
      if (error) {
        if (isForbiddenError(error)) {
          markTableWriteForbidden('foody_users');
        } else {
          console.warn('deleteCloudUser foody_users note:', error.message);
        }
      }
    } catch (e) {
      if (isForbiddenError(e)) {
        markTableWriteForbidden('foody_users');
      }
    }
  }

  return true;
}

export function subscribeCloudUsers(onUsersUpdate) {
  // Use the single multiplexed Realtime channel for zero egress
  const unsubscribeMultiplexer = multiplexer.subscribeUsers((users, updatedUser, eventType) => {
    if (onUsersUpdate) onUsersUpdate(users, updatedUser, eventType);
  });

  const handleLocalChange = (e) => {
    if (e?.detail?.users && onUsersUpdate) {
      onUsersUpdate(e.detail.users, e?.detail?.updatedUser, e?.detail?.eventType);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('foody_users_changed', handleLocalChange);
  }

  return () => {
    if (unsubscribeMultiplexer) unsubscribeMultiplexer();
    if (typeof window !== 'undefined') {
      window.removeEventListener('foody_users_changed', handleLocalChange);
    }
  };
}
