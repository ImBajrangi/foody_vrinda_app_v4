// ========================================================================
// FREE-TIER OPTIMIZER: IN-MEMORY & SWR CACHE LAYER (SINGLETON INSTANCES)
// ========================================================================

export const CACHE_TTL_MS = {
  SHOPS: 60 * 60 * 1000,    // 1 hour
  MENUS: 30 * 60 * 1000,    // 30 minutes
  PRESETS: 60 * 60 * 1000,  // 1 hour
  ORDERS: 45 * 1000,        // 45 seconds (refreshed live via Realtime)
  USERS: 2 * 60 * 1000      // 2 minutes (refreshed live via Realtime)
};

export const memoryCache = {
  shops: { data: null, timestamp: 0 },
  menus: {},  // [shopId]: { data, timestamp }
  presets: { data: null, timestamp: 0 },
  orders: {}, // [shopId]: { data, timestamp }
  users: { data: null, timestamp: 0 }
};

// In-flight request deduplication map
export const pendingRequests = new Map();

// Safe storage wrapper that works cleanly in browser and Node environments
const memoryStore = new Map();
export const safeStorage = {
  getItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) { }
    return memoryStore.get(key) || null;
  },
  setItem: (key, val) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch (e) { }
    memoryStore.set(key, String(val));
  },
  removeItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) { }
    memoryStore.delete(key);
  },
  removeByPrefix: (prefix) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(prefix)) keysToRemove.push(k);
        }
        keysToRemove.forEach(k => window.localStorage.removeItem(k));
      }
    } catch (_) { }
    for (const k of Array.from(memoryStore.keys())) {
      if (k.startsWith(prefix)) memoryStore.delete(k);
    }
  }
};

export function dispatchSafeEvent(name, detail = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  } catch (e) { }
}

export function getCachedItem(type, key = 'default') {
  const now = Date.now();
  if (type === 'shops') {
    if (memoryCache.shops.data && (now - memoryCache.shops.timestamp < CACHE_TTL_MS.SHOPS)) {
      return memoryCache.shops.data;
    }
    const local = safeStorage.getItem('foody_cache_shops');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.timestamp && (now - parsed.timestamp < CACHE_TTL_MS.SHOPS)) {
          memoryCache.shops = parsed;
          return parsed.data;
        }
      } catch (e) { }
    }
  } else if (type === 'menus') {
    const entry = memoryCache.menus[key];
    if (entry && (now - entry.timestamp < CACHE_TTL_MS.MENUS)) {
      return entry.data;
    }
    const local = safeStorage.getItem(`foody_cache_menu_${key}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.timestamp && (now - parsed.timestamp < CACHE_TTL_MS.MENUS)) {
          memoryCache.menus[key] = parsed;
          return parsed.data;
        }
      } catch (e) { }
    }
  } else if (type === 'orders') {
    const entry = memoryCache.orders[key];
    if (entry && (now - entry.timestamp < CACHE_TTL_MS.ORDERS)) {
      return entry.data;
    }
    const local = safeStorage.getItem(`foody_cache_orders_${key}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.timestamp && (now - parsed.timestamp < CACHE_TTL_MS.ORDERS)) {
          memoryCache.orders[key] = parsed;
          return parsed.data;
        }
      } catch (e) { }
    }
  } else if (type === 'users') {
    if (memoryCache.users.data && (now - memoryCache.users.timestamp < CACHE_TTL_MS.USERS)) {
      return memoryCache.users.data;
    }
    const local = safeStorage.getItem('foody_cached_users');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCache.users = { data: parsed, timestamp: now };
          return parsed;
        }
      } catch (e) { }
    }
    return null;
  }
  return null;
}

export function normalizeShop(s) {
  if (!s) return s;

  // Extract payment settings handling nested object or top-level properties
  const onlinePaymentsEnabled = s.paymentSettings?.onlinePaymentsEnabled
    ?? s.payment_settings?.onlinePaymentsEnabled
    ?? s.onlinePaymentsEnabled
    ?? s.online_payments_enabled
    ?? true;

  const codEnabled = s.paymentSettings?.codEnabled
    ?? s.payment_settings?.codEnabled
    ?? s.codEnabled
    ?? s.cod_enabled
    ?? true;

  const paymentSettings = {
    onlinePaymentsEnabled,
    codEnabled
  };

  const alarmSettings = s.alarm_settings ?? s.alarmSettings ?? { kitchenNew: true, kitchenReady: false, deliveryReady: true };
  const shopType = s.shop_type || s.shopType || s.payment_settings?.shopType || 'hotel'; // 'hotel' (Restaurant/Kitchen) | 'shop' (Retail Prasad Stall)
  const openingTime = s.opening_time || s.openingTime || '08:00';
  const closingTime = s.closing_time || s.closingTime || '22:30';
  const isOnline = s.is_online ?? s.isOnline ?? (s.isOpen ?? s.is_open ?? true);

  return {
    ...s,
    id: s.id,
    name: s.name || '',
    address: s.address || '',
    phone: s.phone || '',
    coordinates: s.coordinates || { lat: 27.5706, lng: 77.6593 },
    isOpen: s.is_open ?? s.isOpen ?? true,
    is_open: s.is_open ?? s.isOpen ?? true,
    isOnline,
    is_online: isOnline,
    isStaffOnline: isOnline,
    shopType,
    shop_type: shopType,
    openingTime,
    opening_time: openingTime,
    closingTime,
    closing_time: closingTime,
    minimumOrderAmount: Number(s.minimum_order_amount ?? s.minimumOrderAmount ?? 0),
    minimum_order_amount: Number(s.minimum_order_amount ?? s.minimumOrderAmount ?? 0),
    deliveryCharge: Number(s.delivery_charge ?? s.deliveryCharge ?? 0),
    delivery_charge: Number(s.delivery_charge ?? s.deliveryCharge ?? 0),
    gstPercentage: Number(s.gst_percentage ?? s.gstPercentage ?? 5),
    gst_percentage: Number(s.gst_percentage ?? s.gstPercentage ?? 5),
    alarmSettings,
    alarm_settings: alarmSettings,
    paymentSettings,
    payment_settings: paymentSettings,
    onlinePaymentsEnabled,
    online_payments_enabled: onlinePaymentsEnabled,
    codEnabled,
    cod_enabled: codEnabled
  };
}

/**
 * Calculates geographical distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') return null;
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Smart Geolocation-based Realtime Rider Recommendation Engine
 * Evaluates proximity, active load, and ETA to recommend the best delivery Sarathi
 */
export function getRecommendedRiders(shopCoords, ridersList = [], activeOrders = []) {
  if (!Array.isArray(ridersList) || ridersList.length === 0) return [];

  const shopLat = Number(shopCoords?.lat) || 27.5706;
  const shopLng = Number(shopCoords?.lng) || 77.6593;

  return ridersList
    .filter(r => (r.role === 'delivery' || r.role === 'rider') && r.is_active !== false && r.isOnline !== false)
    .map(rider => {
      const hasCoords = Boolean((rider.coordinates?.lat && rider.coordinates?.lng) || (rider.lat && rider.lng));
      const riderLat = Number(rider.coordinates?.lat || rider.lat || 0);
      const riderLng = Number(rider.coordinates?.lng || rider.lng || 0);

      // GPS Freshness verification (< 5 minutes)
      const lastSeen = rider.last_location_at || rider.lastLocationAt || rider.lastSeenAt || rider.last_seen_at;
      const isLocationFresh = Boolean(
        hasCoords &&
        riderLat !== 0 &&
        riderLng !== 0 &&
        lastSeen &&
        (Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000)
      );

      // If location is fresh, compute actual distance; otherwise place at a penalized distance
      const distanceKm = isLocationFresh
        ? (calculateDistanceKm(shopLat, shopLng, riderLat, riderLng) || 1.0)
        : 5.0; // Penalize stale/unverified location

      const riderOrders = activeOrders.filter(o => o.rider_id === rider.id && !['completed', 'cancelled'].includes(o.status));
      const activeCount = riderOrders.length;
      const etaMins = isLocationFresh ? Math.max(4, Math.round(distanceKm * 4 + 3)) : 15;

      // Weighted score: 1.2x distance + 2.5x active order burden + penalty for stale location
      const recommendationScore = (distanceKm * 1.2) + (activeCount * 2.5) + (isLocationFresh ? 0 : 10);

      return {
        ...rider,
        distanceKm,
        isLocationFresh,
        activeOrdersCount: activeCount,
        etaMins,
        recommendationScore
      };
    })
    .sort((a, b) => a.recommendationScore - b.recommendationScore);
}

/**
 * Evaluates whether a shop is operational based on open flag, staff online presence, and time schedule
 */
export function isShopCurrentlyOpen(shop) {
  if (!shop) return false;
  if (shop.isOpen === false || shop.is_open === false) return false;
  if (shop.isOnline === false || shop.is_online === false) return false;

  const openTime = shop.openingTime || shop.opening_time || shop.operating_hours?.openTime || shop.payment_settings?.openingTime || '08:00';
  const closeTime = shop.closingTime || shop.closing_time || shop.operating_hours?.closeTime || shop.payment_settings?.closingTime || '22:30';

  if (openTime && closeTime) {
    const now = new Date();
    const currentTotalMins = now.getHours() * 60 + now.getMinutes();

    const [oH, oM] = String(openTime).split(':').map(Number);
    const [cH, cM] = String(closeTime).split(':').map(Number);
    const openTotalMins = (isNaN(oH) ? 8 : oH) * 60 + (isNaN(oM) ? 0 : oM);
    const closeTotalMins = (isNaN(cH) ? 22 : cH) * 60 + (isNaN(cM) ? 30 : cM);

    if (currentTotalMins < openTotalMins || currentTotalMins > closeTotalMins) {
      return false;
    }
  }
  return true;
}

export function getDeletedShopIds() {
  const set = new Set();
  try {
    const raw = safeStorage.getItem('foody_deleted_shop_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => set.add(id));
      }
    }
  } catch (e) { }
  return set;
}

export function addDeletedShopId(id) {
  if (!id) return;
  try {
    const set = getDeletedShopIds();
    set.add(id);
    safeStorage.setItem('foody_deleted_shop_ids', JSON.stringify(Array.from(set)));
  } catch (e) { }
}

export function removeDeletedShopId(id) {
  if (!id) return;
  try {
    const set = getDeletedShopIds();
    set.delete(id);
    safeStorage.setItem('foody_deleted_shop_ids', JSON.stringify(Array.from(set)));
  } catch (e) { }
}

export function getCachedShops() {
  const deletedSet = getDeletedShopIds();
  try {
    const raw = safeStorage.getItem('foody_cached_shops') || safeStorage.getItem('foody_cache_shops');
    if (raw !== null && raw !== undefined) {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed?.data;
      if (Array.isArray(list) && list.length > 0) {
        return list.filter(s => !deletedSet.has(s.id)).map(normalizeShop);
      }
    }
  } catch (e) { }
  return [];
}

export function saveCachedShops(shopsList) {
  const deletedSet = getDeletedShopIds();
  const normalized = (shopsList || []).filter(s => !deletedSet.has(s.id)).map(normalizeShop);
  try {
    safeStorage.setItem('foody_cached_shops', JSON.stringify(normalized));
    safeStorage.setItem('foody_cache_shops', JSON.stringify({ data: normalized, timestamp: Date.now() }));
  } catch (e) { }
  return normalized;
}

export function getDefaultActiveShopId() {
  const list = getCachedShops();
  const valid = list.find(s => s.isOpen !== false && s.is_deleted !== true) || list[0];
  return valid ? valid.id : '';
}

export function setCachedItem(type, key, data) {
  const now = Date.now();
  if (type === 'shops') {
    const normalized = Array.isArray(data) ? data.map(normalizeShop) : data;
    memoryCache.shops = { data: normalized, timestamp: now };
    try {
      safeStorage.setItem('foody_cached_shops', JSON.stringify(normalized));
      safeStorage.setItem('foody_cache_shops', JSON.stringify({ data: normalized, timestamp: now }));
    } catch (e) { }
  } else if (type === 'menus') {
    memoryCache.menus[key] = { data, timestamp: now };
    try {
      safeStorage.setItem(`foody_cache_menu_${key}`, JSON.stringify({ data, timestamp: now }));
    } catch (e) { }
  } else if (type === 'orders') {
    memoryCache.orders[key] = { data, timestamp: now };
    try {
      safeStorage.setItem(`foody_cache_orders_${key}`, JSON.stringify({ data, timestamp: now }));
    } catch (e) { }
  } else if (type === 'users') {
    memoryCache.users = { data, timestamp: now };
    try {
      safeStorage.setItem('foody_cached_users', JSON.stringify(data));
    } catch (e) { }
  }
}

export function invalidateCache(type, key) {
  if (type === 'shops') {
    memoryCache.shops = { data: null, timestamp: 0 };
    safeStorage.removeItem('foody_cache_shops');
    safeStorage.removeItem('foody_cached_shops');
  } else if (type === 'menus') {
    if (key) {
      delete memoryCache.menus[key];
      delete memoryCache.menus['all'];
      safeStorage.removeItem(`foody_cache_menu_${key}`);
      safeStorage.removeItem(`foody_customer_menu_v3_${key}`);
      safeStorage.removeItem(`foody_cache_menu_all`);
      safeStorage.removeItem(`foody_customer_menu_v3_all`);
    } else {
      memoryCache.menus = {};
      safeStorage.removeByPrefix('foody_cache_menu_');
      safeStorage.removeByPrefix('foody_customer_menu_v3_');
    }
  } else if (type === 'orders') {
    if (key) {
      delete memoryCache.orders[key];
      safeStorage.removeItem(`foody_cache_orders_${key}`);
    } else {
      memoryCache.orders = {};
      safeStorage.removeByPrefix('foody_cache_orders_');
    }
  } else if (type === 'users') {
    memoryCache.users = { data: null, timestamp: 0 };
    safeStorage.removeItem('foody_cached_users');
  } else if (type === 'presets') {
    memoryCache.presets = { data: null, timestamp: 0 };
    safeStorage.removeItem('foody_cached_presets');
    safeStorage.removeItem('foody_cache_presets');
  }
}
