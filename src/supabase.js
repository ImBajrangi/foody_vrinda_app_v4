import { createClient } from '@supabase/supabase-js';

// Supabase Cloud Project Configuration (Foody Vrinda Production Database)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mrsxliwyqodtwjuyqmts.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yc3hsaXd5cW9kdHdqdXlxbXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzQxMjcsImV4cCI6MjEwNDQ1MDEyN30.UZteyeZ3LtuVpMJoUqZogPKffmSlHN3Hn9fLtis7lBg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Seed data constants for zero-latency local fallback & instant hydration
export const SEED_SHOPS = [
  {
    id: 'shop-vrinda-main',
    name: 'Vrinda Cloud Kitchen (Main)',
    address: 'Near ISKCON Temple, Raman Reti, Vrindavan',
    phone: '+91 9876543210',
    coordinates: { lat: 27.5706, lng: 77.6593 },
    isOpen: true,
    minimumOrderAmount: 0,
    deliveryCharge: 0,
    gstPercentage: 5,
    alarmSettings: { kitchenNew: true, kitchenReady: false, deliveryReady: true },
    paymentSettings: { onlinePaymentsEnabled: true, codEnabled: true },
    onlinePaymentsEnabled: true,
    codEnabled: true
  },
  {
    id: 'shop-prem-mandir',
    name: 'Prem Mandir Prasad Kitchen',
    address: 'Chatikara Road, Raman Reti, Vrindavan',
    phone: '+91 9876543211',
    coordinates: { lat: 27.5715, lng: 77.6740 },
    isOpen: true,
    minimumOrderAmount: 50,
    deliveryCharge: 20,
    gstPercentage: 5,
    alarmSettings: { kitchenNew: true, kitchenReady: true, deliveryReady: true },
    paymentSettings: { onlinePaymentsEnabled: true, codEnabled: true },
    onlinePaymentsEnabled: true,
    codEnabled: true
  },
  {
    id: 'shop-banke-bihari',
    name: 'Shri Banke Bihari Dham Kitchen',
    address: 'Godowlia Marg, Vrindavan',
    phone: '+91 9876543212',
    coordinates: { lat: 27.5815, lng: 77.6990 },
    isOpen: true,
    minimumOrderAmount: 100,
    deliveryCharge: 0,
    gstPercentage: 5,
    alarmSettings: { kitchenNew: true, kitchenReady: false, deliveryReady: true },
    paymentSettings: { onlinePaymentsEnabled: true, codEnabled: true },
    onlinePaymentsEnabled: true,
    codEnabled: true
  }
];

export const DEFAULT_PRASAD_ITEMS = [
  {
    id: 'prasad-1',
    name: 'Cheese With Satvik Burger',
    subtitle: 'Cheesy satvik, special price',
    category: 'Snacks',
    price: 140,
    kcal: '260 kcal',
    tag: 'Popular Choice',
    image: '/dishes/burger.png',
    description: 'Fresh baked artisanal whole wheat bun filled with pure paneer patty, garden crisp lettuce, heirloom tomatoes, and creamy satvik herbal cheese.',
    nutrition: { carbs: '32g', fat: '11g', protein: '14g', kcal: '260 kcal' },
    isAvailable: true
  },
  {
    id: 'prasad-2',
    name: 'Royal Vedic Thali',
    subtitle: 'Complete nutritional Satvik platter',
    category: 'Meals',
    price: 220,
    kcal: '480 kcal',
    tag: "Chef's Special",
    image: '/dishes/thali.png',
    description: 'Steaming aromatic Govind Bhog rice, 4 whole wheat phulkas, Dal Makhani with desi ghee, Paneer Butter Masala, seasonal Subzi, sweet Gulab Jamun, and crisp Papad.',
    nutrition: { carbs: '68g', fat: '16g', protein: '22g', kcal: '480 kcal' },
    isAvailable: true
  },
  {
    id: 'prasad-3',
    name: 'Kesariya Rabdi Kheer',
    subtitle: 'Slow simmered thickened milk dessert',
    category: 'Sweets & Prasad',
    price: 120,
    kcal: '210 kcal',
    tag: 'Sacred Prasad',
    image: '/dishes/sweet.png',
    description: 'Rich Govind Bhog rice kheer infused with pure Kashmiri saffron, crushed green cardamom, roasted almond slivers, pistachios, and pure chironji.',
    nutrition: { carbs: '28g', fat: '9g', protein: '7g', kcal: '210 kcal' },
    isAvailable: true
  },
  {
    id: 'prasad-4',
    name: 'Paneer Satvik Pizza (10")',
    subtitle: 'Crispy thin crust with desi herbs',
    category: 'Snacks',
    price: 240,
    kcal: '340 kcal',
    tag: 'Chef Special',
    image: '/dishes/pizza.png',
    description: 'Hand-tossed thin crust with fresh tomato basil coulis, diced fresh Malai paneer, bell peppers, sweet corn, and mozzarella cheese.',
    nutrition: { carbs: '42g', fat: '14g', protein: '18g', kcal: '340 kcal' },
    isAvailable: true
  },
  {
    id: 'prasad-5',
    name: 'Paneer Makhani Meal',
    subtitle: 'Rich cashew gravy, butter roti',
    category: 'Meals',
    price: 180,
    kcal: '360 kcal',
    tag: 'Pure Desi Ghee',
    image: '/dishes/curry.png',
    description: 'Fresh organic cottage cheese simmered in a luscious tomato and cashew butter gravy, infused with cardamom and pure desi ghee.',
    nutrition: { carbs: '38g', fat: '18g', protein: '22g', kcal: '360 kcal' },
    isAvailable: true
  },
  {
    id: 'prasad-6',
    name: 'Govind Bhog Basmati Rice',
    subtitle: 'Steamed aromatic long grain rice',
    category: 'Meals',
    price: 90,
    kcal: '210 kcal',
    tag: 'Vedic Grain',
    image: '/dishes/rice.png',
    description: 'Premium aged Govind Bhog long-grain basmati rice steamed with fragrant bay leaf, green cardamom, and a dollop of pure A2 cow ghee.',
    nutrition: { carbs: '44g', fat: '3g', protein: '5g', kcal: '210 kcal' },
    isAvailable: true
  }
];

// Helper to intelligently resolve dish images to crisp transparent PNG cutouts
export function resolveDishCutout(image, name = '', category = '') {
  if (image && typeof image === 'string' && image.startsWith('/dishes/')) return image;
  const lowerName = (name || '').toLowerCase();
  const lowerCat = (category || '').toLowerCase();

  if (lowerName.includes('burger')) return '/dishes/burger.png';
  if (lowerName.includes('thali') || lowerName.includes('platter') || lowerName.includes('meal') || lowerCat.includes('thali') || lowerCat.includes('meal')) return '/dishes/thali.png';
  if (lowerName.includes('pizza') || lowerName.includes('bread') || lowerName.includes('snack')) return '/dishes/pizza.png';
  if (lowerName.includes('kheer') || lowerName.includes('sweet') || lowerName.includes('rabdi') || lowerName.includes('lassi') || lowerName.includes('shake') || lowerName.includes('drink') || lowerCat.includes('sweet') || lowerCat.includes('beverage') || lowerCat.includes('dessert')) return '/dishes/sweet.png';
  if (lowerName.includes('curry') || lowerName.includes('makhani') || lowerName.includes('paneer') || lowerName.includes('sabzi') || lowerName.includes('dal') || lowerName.includes('gravy')) return '/dishes/curry.png';
  if (lowerName.includes('rice') || lowerName.includes('pulao') || lowerName.includes('biryani') || lowerName.includes('bhog') || lowerName.includes('khichdi')) return '/dishes/rice.png';

  if (image && typeof image === 'string' && !image.includes('unsplash.com') && image.startsWith('http')) return image;
  return '/dishes/burger.png';
}

// ========================================================================
// 1. FREE-TIER OPTIMIZER: IN-MEMORY & SWR CACHE LAYER
// ========================================================================
const CACHE_TTL_MS = {
  SHOPS: 60 * 60 * 1000,    // 1 hour
  MENUS: 30 * 60 * 1000,    // 30 minutes
  ORDERS: 45 * 1000,        // 45 seconds (refreshed live via Realtime)
  USERS: 2 * 60 * 1000      // 2 minutes (refreshed live via Realtime)
};

const memoryCache = {
  shops: { data: null, timestamp: 0 },
  menus: {},  // [shopId]: { data, timestamp }
  orders: {}, // [shopId]: { data, timestamp }
  users: { data: null, timestamp: 0 }
};

// In-flight request deduplication map
const pendingRequests = new Map();

function getCachedItem(type, key = 'default') {
  const now = Date.now();
  if (type === 'shops') {
    if (memoryCache.shops.data && (now - memoryCache.shops.timestamp < CACHE_TTL_MS.SHOPS)) {
      return memoryCache.shops.data;
    }
    const local = localStorage.getItem('foody_cache_shops');
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
    const local = localStorage.getItem(`foody_cache_menu_${key}`);
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
    const local = localStorage.getItem(`foody_cache_orders_${key}`);
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
    const local = localStorage.getItem('foody_cached_users');
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

  return {
    ...s,
    id: s.id,
    name: s.name || '',
    address: s.address || '',
    phone: s.phone || '',
    coordinates: s.coordinates || { lat: 27.5706, lng: 77.6593 },
    isOpen: s.is_open ?? s.isOpen ?? true,
    is_open: s.is_open ?? s.isOpen ?? true,
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

export function getCachedShops() {
  try {
    const raw = localStorage.getItem('foody_cached_shops') || localStorage.getItem('foody_cache_shops');
    if (raw) {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed?.data;
      if (Array.isArray(list) && list.length > 0) {
        return list.map(normalizeShop);
      }
    }
  } catch (e) { }
  return SEED_SHOPS.map(normalizeShop);
}

export function saveCachedShops(shopsList) {
  const normalized = (shopsList || []).map(normalizeShop);
  try {
    localStorage.setItem('foody_cached_shops', JSON.stringify(normalized));
    localStorage.setItem('foody_cache_shops', JSON.stringify({ data: normalized, timestamp: Date.now() }));
  } catch (e) { }
  return normalized;
}

function setCachedItem(type, key, data) {
  const now = Date.now();
  if (type === 'shops') {
    const normalized = Array.isArray(data) ? data.map(normalizeShop) : data;
    memoryCache.shops = { data: normalized, timestamp: now };
    try {
      localStorage.setItem('foody_cached_shops', JSON.stringify(normalized));
      localStorage.setItem('foody_cache_shops', JSON.stringify({ data: normalized, timestamp: now }));
    } catch (e) { }
  } else if (type === 'menus') {
    memoryCache.menus[key] = { data, timestamp: now };
    try {
      localStorage.setItem(`foody_cache_menu_${key}`, JSON.stringify({ data, timestamp: now }));
    } catch (e) { }
  } else if (type === 'orders') {
    memoryCache.orders[key] = { data, timestamp: now };
    try {
      localStorage.setItem(`foody_cache_orders_${key}`, JSON.stringify({ data, timestamp: now }));
    } catch (e) { }
  } else if (type === 'users') {
    memoryCache.users = { data, timestamp: now };
    try {
      localStorage.setItem('foody_cached_users', JSON.stringify(data));
    } catch (e) { }
  }
}

export function invalidateCache(type, key) {
  if (type === 'shops') {
    memoryCache.shops = { data: null, timestamp: 0 };
    localStorage.removeItem('foody_cache_shops');
    localStorage.removeItem('foody_cached_shops');
  } else if (type === 'menus') {
    if (key) {
      delete memoryCache.menus[key];
      localStorage.removeItem(`foody_cache_menu_${key}`);
    } else {
      memoryCache.menus = {};
    }
  } else if (type === 'orders') {
    if (key) {
      delete memoryCache.orders[key];
      localStorage.removeItem(`foody_cache_orders_${key}`);
    } else {
      memoryCache.orders = {};
    }
  } else if (type === 'users') {
    memoryCache.users = { data: null, timestamp: 0 };
    localStorage.removeItem('foody_cached_users');
  }
}

// ========================================================================
// 2. SHOPS CLOUD APIS (CACHE-FIRST WITH ZERO REDUNDANT EGRESS)
// ========================================================================
export async function getCloudShops() {
  const localCached = getCachedShops();
  if (memoryCache.shops?.data && memoryCache.shops.data.length > 0) {
    return memoryCache.shops.data;
  }

  // Deduplicate concurrent in-flight calls
  if (pendingRequests.has('getCloudShops')) {
    return pendingRequests.get('getCloudShops');
  }

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from('foody_shops')
        .select('*')
        .order('name');

      if (!error && data && data.length > 0) {
        const local = getCachedShops();
        const merged = data.map(d => {
          const localMatch = local.find(l => l.id === d.id);
          const base = normalizeShop(d);
          if (localMatch) {
            return {
              ...base,
              paymentSettings: localMatch.paymentSettings || base.paymentSettings,
              onlinePaymentsEnabled: localMatch.onlinePaymentsEnabled ?? base.onlinePaymentsEnabled,
              codEnabled: localMatch.codEnabled ?? base.codEnabled,
              alarmSettings: localMatch.alarmSettings || base.alarmSettings
            };
          }
          return base;
        });
        const finalShops = saveCachedShops(merged);
        memoryCache.shops = { data: finalShops, timestamp: Date.now() };
        return finalShops;
      }
      const fallback = saveCachedShops(localCached.length > 0 ? localCached : SEED_SHOPS);
      memoryCache.shops = { data: fallback, timestamp: Date.now() };
      return fallback;
    } catch (err) {
      console.warn('Supabase getCloudShops fallback:', err.message);
      const fallback = saveCachedShops(localCached.length > 0 ? localCached : SEED_SHOPS);
      memoryCache.shops = { data: fallback, timestamp: Date.now() };
      return fallback;
    } finally {
      pendingRequests.delete('getCloudShops');
    }
  })();

  pendingRequests.set('getCloudShops', promise);
  return promise;
}

// ========================================================================
// 3. MENUS CLOUD APIS (PER-SHOP CACHING WITH DEDUPLICATION)
// ========================================================================
export async function getCloudMenus(shopId = 'all') {
  const cached = getCachedItem('menus', shopId);
  if (cached) return cached;

  const reqKey = `getCloudMenus_${shopId}`;
  if (pendingRequests.has(reqKey)) {
    return pendingRequests.get(reqKey);
  }

  const promise = (async () => {
    try {
      let query = supabase.from('foody_menus').select('*');
      if (shopId && shopId !== 'all') {
        query = query.eq('shop_id', shopId);
      }
      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return DEFAULT_PRASAD_ITEMS;
      }
      const mapped = data.map(d => ({
        id: d.id,
        shopId: d.shop_id,
        name: d.name,
        subtitle: d.subtitle,
        description: d.description,
        category: d.category,
        price: Number(d.price),
        originalPrice: Number(d.original_price || d.originalPrice || d.price || 0),
        discountPercent: Number(d.discount_percent || d.discountPercent || 0),
        isCombo: Boolean(d.is_combo || d.isCombo || d.category === 'Combo Offers'),
        comboItems: d.combo_items || d.comboItems || [],
        image: resolveDishCutout(d.image, d.name, d.category),
        tag: d.tag,
        kcal: d.kcal || '250 kcal',
        nutrition: d.nutrition || { carbs: '35g', fat: '12g', protein: '16g', kcal: '250 kcal' },
        isAvailable: d.is_available ?? true
      }));

      setCachedItem('menus', shopId, mapped);
      return mapped;
    } catch (err) {
      console.warn('Supabase getCloudMenus warning:', err.message);
      return DEFAULT_PRASAD_ITEMS;
    } finally {
      pendingRequests.delete(reqKey);
    }
  })();

  pendingRequests.set(reqKey, promise);
  return promise;
}

// ========================================================================
// 4. ORDERS CLOUD APIS & DISPATCH (CACHE-FIRST WITH REALTIME SYNC)
// ========================================================================
export async function createCloudOrder(orderData) {
  try {
    const orderId = orderData.id || `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const orderPayload = {
      id: orderId,
      shop_id: orderData.shopId || 'shop-vrinda-main',
      user_id: orderData.userId || null,
      customer_name: orderData.customerName || 'Customer',
      customer_phone: orderData.customerPhone || '9876543210',
      customer_address: orderData.customerAddress || 'Vrindavan Dham',
      delivery_address: orderData.deliveryAddress || orderData.customerAddress || 'Vrindavan Dham',
      delivery_coordinates: orderData.deliveryCoordinates || { lat: 27.5706, lng: 77.6593 },
      items: orderData.items || [],
      subtotal: Number(orderData.subtotal || 0),
      delivery_charge: Number(orderData.deliveryCharge || 0),
      gst_amount: Number(orderData.gstAmount || 0),
      total_amount: Number(orderData.totalAmount || 0),
      status: orderData.status || 'new',
      payment_method: orderData.paymentMethod || 'cash',
      payment_id: orderData.paymentId || null,
      cash_status: orderData.cashStatus || 'pending',
      cooking_notes: orderData.cookingNotes || '',
      created_by: orderData.createdBy || orderData.customerName || 'Customer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const normalizedCreated = {
      ...orderData,
      ...orderPayload,
      shopId: orderPayload.shop_id,
      customerName: orderPayload.customer_name,
      customerPhone: orderPayload.customer_phone,
      customerAddress: orderPayload.customer_address,
      deliveryAddress: orderPayload.delivery_address,
      deliveryCoordinates: orderPayload.delivery_coordinates,
      totalAmount: orderPayload.total_amount,
      paymentMethod: orderPayload.payment_method,
      cashStatus: orderPayload.cash_status,
      cookingNotes: orderPayload.cooking_notes,
      createdAt: orderPayload.created_at
    };

    // Update in-memory and local cache instantly
    const allOrders = getCachedItem('orders', 'all') || [];
    setCachedItem('orders', 'all', [normalizedCreated, ...allOrders.filter(o => o.id !== orderId)]);
    if (orderPayload.shop_id) {
      const shopOrders = getCachedItem('orders', orderPayload.shop_id) || [];
      setCachedItem('orders', orderPayload.shop_id, [normalizedCreated, ...shopOrders.filter(o => o.id !== orderId)]);
    }

    const { data, error } = await supabase
      .from('foody_orders')
      .upsert([orderPayload])
      .select()
      .single();

    if (error) {
      console.warn('Supabase upsert order note:', error.message);
      return normalizedCreated;
    }
    return { ...normalizedCreated, ...data };
  } catch (err) {
    console.warn('createCloudOrder exception:', err.message);
    return { id: orderData.id || `ord-${Date.now()}`, ...orderData };
  }
}

export async function updateCloudOrderStatus(orderId, newStatus, extra = {}) {
  try {
    const payload = {
      updated_at: new Date().toISOString()
    };
    if (newStatus) payload.status = newStatus;

    // Filter to known database columns to avoid 400 Bad Request
    const ALLOWED_COLUMNS = [
      'status',
      'shop_id',
      'user_id',
      'customer_name',
      'customer_phone',
      'customer_address',
      'delivery_address',
      'delivery_coordinates',
      'items',
      'subtotal',
      'delivery_charge',
      'gst_amount',
      'total_amount',
      'payment_method',
      'payment_id',
      'cash_status',
      'cooking_notes',
      'rider_name',
      'rider_phone',
      'rider_rating',
      'rider_avatar',
      'created_by',
      'updated_at'
    ];

    if (extra && typeof extra === 'object') {
      for (const key of Object.keys(extra)) {
        if (ALLOWED_COLUMNS.includes(key)) {
          payload[key] = extra[key];
        }
      }
    }

    // Immediately update local caches for zero perceived latency
    const patchObj = { ...payload, ...(newStatus ? { status: newStatus } : {}), ...(extra || {}) };
    ['all', extra?.shop_id, extra?.shopId].filter(Boolean).forEach(sKey => {
      const cached = getCachedItem('orders', sKey);
      if (cached && Array.isArray(cached)) {
        const updated = cached.map(o => o.id === orderId ? { ...o, ...patchObj } : o);
        setCachedItem('orders', sKey, updated);
      }
    });

    const { data, error } = await supabase
      .from('foody_orders')
      .update(payload)
      .eq('id', orderId)
      .select();

    if (error) {
      console.warn('updateCloudOrderStatus note:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('updateCloudOrderStatus exception:', err.message);
    return null;
  }
}

export async function getCloudOrders(shopId = 'all') {
  const cached = getCachedItem('orders', shopId);
  if (cached && Array.isArray(cached)) {
    return cached;
  }

  const reqKey = `getCloudOrders_${shopId}`;
  if (pendingRequests.has(reqKey)) {
    return pendingRequests.get(reqKey);
  }

  const promise = (async () => {
    try {
      let query = supabase.from('foody_orders').select('*').order('created_at', { ascending: false }).limit(60);
      if (shopId && shopId !== 'all') {
        query = query.eq('shop_id', shopId);
      }
      const { data, error } = await query;
      if (error || !data) return cached || [];

      const mapped = data.map(raw => ({
        id: raw.id,
        ...raw,
        shopId: raw.shop_id,
        customerName: raw.customer_name,
        customerPhone: raw.customer_phone,
        customerAddress: raw.customer_address,
        deliveryAddress: raw.delivery_address,
        deliveryCoordinates: raw.delivery_coordinates,
        totalAmount: raw.total_amount,
        paymentMethod: raw.payment_method,
        cashStatus: raw.cash_status,
        cookingNotes: raw.cooking_notes,
        createdAt: raw.created_at
      }));

      setCachedItem('orders', shopId, mapped);
      return mapped;
    } catch (err) {
      console.warn('getCloudOrders exception:', err);
      return cached || [];
    } finally {
      pendingRequests.delete(reqKey);
    }
  })();

  pendingRequests.set(reqKey, promise);
  return promise;
}

export async function broadcastAlarmEvent(alarmType, orderDetails = {}) {
  try {
    window.dispatchEvent(new CustomEvent('foody_alarm_trigger', {
      detail: { type: alarmType, order: orderDetails, timestamp: Date.now() }
    }));
    await createCloudNotification({
      role: 'all',
      shopId: orderDetails?.shopId || null,
      orderId: orderDetails?.id || null,
      message: `Alarm: ${alarmType}`
    });
  } catch (err) {
    console.warn('broadcastAlarmEvent error:', err);
  }
}


// ========================================================================
// 5. FREE-TIER SINGLETON REALTIME MULTIPLEXER (1 STABLE SHARED WEBSOCKET)
// ========================================================================
class RealtimeMultiplexer {
  constructor() {
    this.channel = null;
    this.orderListeners = new Set();
    this.singleOrderListeners = new Map(); // [orderId]: Set of callbacks
    this.notificationListeners = new Set();
    this.userListeners = new Set();
    this.isSubscribed = false;
    this.userDebounceTimer = null;
    this.pendingUserChanges = [];
  }

  ensureSubscribed() {
    if (this.isSubscribed || this.channel) return;

    this.channel = supabase
      .channel('foody-global-multiplex')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'foody_orders' },
        (payload) => {
          const raw = payload.new || payload.old;
          if (!raw) return;

          const normalized = {
            id: raw.id,
            ...raw,
            shopId: raw.shop_id,
            customerName: raw.customer_name,
            customerPhone: raw.customer_phone,
            customerAddress: raw.customer_address,
            deliveryAddress: raw.delivery_address,
            deliveryCoordinates: raw.delivery_coordinates,
            totalAmount: raw.total_amount,
            paymentMethod: raw.payment_method,
            cashStatus: raw.cash_status,
            cookingNotes: raw.cooking_notes,
            createdAt: raw.created_at
          };

          // Synchronize memory and local caches so subsequent views read updated data with 0 egress
          try {
            ['all', raw.shop_id].filter(Boolean).forEach(k => {
              const currentList = getCachedItem('orders', k) || [];
              if (payload.eventType === 'DELETE') {
                setCachedItem('orders', k, currentList.filter(o => o.id !== raw.id));
              } else {
                const idx = currentList.findIndex(o => o.id === raw.id);
                if (idx >= 0) {
                  const copy = [...currentList];
                  copy[idx] = { ...copy[idx], ...normalized };
                  setCachedItem('orders', k, copy);
                } else {
                  setCachedItem('orders', k, [normalized, ...currentList]);
                }
              }
            });
          } catch (e) { }

          // Broadcast to desk listeners
          this.orderListeners.forEach(listener => {
            try {
              if (!listener.shopId || listener.shopId === 'all' || listener.shopId === raw.shop_id) {
                listener.callback(normalized, payload.eventType);
              }
            } catch (e) {
              console.error('Order listener error:', e);
            }
          });

          // Broadcast to customer single-order listeners
          const singleListeners = this.singleOrderListeners.get(raw.id);
          if (singleListeners) {
            singleListeners.forEach(cb => {
              try {
                cb(normalized);
              } catch (e) { }
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'foody_notifications' },
        (payload) => {
          if (!payload.new) return;
          const notif = {
            id: payload.new.id,
            userId: payload.new.user_id,
            role: payload.new.role,
            shopId: payload.new.shop_id,
            orderId: payload.new.order_id,
            message: payload.new.message,
            read: payload.new.read,
            createdAt: payload.new.created_at
          };

          this.notificationListeners.forEach(listener => {
            try {
              if (!listener.userId || listener.userId === notif.userId) {
                listener.callback(notif);
              }
            } catch (e) { }
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'foody_logged_users' },
        (payload) => this.handleUserChangePayload(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'foody_users' },
        (payload) => this.handleUserChangePayload(payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isSubscribed = true;
        }
      });
  }

  handleUserChangePayload(payload) {
    const raw = payload.new || payload.old;
    if (!raw) return;

    const normalized = {
      id: raw.id,
      displayName: raw.display_name || raw.displayName || 'User',
      email: raw.email || '',
      phone: raw.phone || '',
      avatarUrl: raw.avatar_url || '',
      role: raw.role || 'customer',
      shopId: raw.shop_id || raw.shopId || 'shop-vrinda-main',
      shopIds: raw.shop_ids || raw.shopIds || (raw.shop_id ? [raw.shop_id] : ['shop-vrinda-main']),
      devPermissions: raw.dev_permissions || [],
      lastLoginAt: raw.last_login_at || raw.created_at,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at
    };

    // 1. In-memory & local cache sync with zero egress
    const current = getCachedUsers();
    let next;
    if (payload.eventType === 'DELETE') {
      next = current.filter(u => u.id !== raw.id);
    } else {
      const cleanId = String(raw.id || '').trim();
      const cleanEmail = (raw.email || '').toLowerCase().trim();
      const cleanPhone = (raw.phone || '').replace(/\D/g, '');

      const idx = current.findIndex(u =>
        (cleanId && String(u.id).trim() === cleanId) ||
        (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
        (cleanPhone && cleanPhone.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
      );

      if (idx >= 0) {
        next = [...current];
        next[idx] = { ...next[idx], ...normalized };
      } else {
        next = [normalized, ...current];
      }
    }

    saveCachedUsers(next);
    setCachedItem('users', 'all', next);

    // 2. Debounced notification dispatch to prevent React rendering storms
    clearTimeout(this.userDebounceTimer);
    this.userDebounceTimer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('foody_users_changed', {
        detail: { users: next, updatedUser: normalized, eventType: payload.eventType }
      }));

      this.userListeners.forEach(listener => {
        try {
          listener(next, normalized, payload.eventType);
        } catch (e) {
          console.error('User listener error:', e);
        }
      });
    }, 150);
  }

  subscribeOrders(shopId, callback) {
    this.ensureSubscribed();
    const listenerObj = { shopId, callback };
    this.orderListeners.add(listenerObj);

    return () => {
      this.orderListeners.delete(listenerObj);
    };
  }

  subscribeSingleOrder(orderId, callback) {
    if (!orderId) return () => { };
    this.ensureSubscribed();

    if (!this.singleOrderListeners.has(orderId)) {
      this.singleOrderListeners.set(orderId, new Set());
    }
    const set = this.singleOrderListeners.get(orderId);
    set.add(callback);

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.singleOrderListeners.delete(orderId);
      }
    };
  }

  subscribeNotifications(userId, callback) {
    this.ensureSubscribed();
    const listenerObj = { userId, callback };
    this.notificationListeners.add(listenerObj);

    return () => {
      this.notificationListeners.delete(listenerObj);
    };
  }

  subscribeUsers(callback) {
    this.ensureSubscribed();
    this.userListeners.add(callback);

    return () => {
      this.userListeners.delete(callback);
    };
  }
}

const multiplexer = new RealtimeMultiplexer();

export function subscribeCloudOrders(shopId, onUpdate) {
  return multiplexer.subscribeOrders(shopId, onUpdate);
}

export function subscribeSingleCloudOrder(orderId, onUpdate) {
  return multiplexer.subscribeSingleOrder(orderId, onUpdate);
}

export function subscribeCloudNotifications(userId, onNotification) {
  return multiplexer.subscribeNotifications(userId, onNotification);
}

// ========================================================================
// 6. NOTIFICATIONS CREATION & READ
// ========================================================================
export async function createCloudNotification({ userId, role, shopId, orderId, message }) {
  try {
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const { data, error } = await supabase
      .from('foody_notifications')
      .insert([{
        id: notifId,
        user_id: userId || null,
        role: role || 'customer',
        shop_id: shopId || null,
        order_id: orderId || null,
        message,
        read: false,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) console.warn('createCloudNotification note:', error.message);
    return data;
  } catch (err) {
    console.warn('createCloudNotification exception:', err.message);
    return null;
  }
}

export async function markCloudNotificationRead(notifId, isRead = true) {
  try {
    await supabase
      .from('foody_notifications')
      .update({ read: isRead })
      .eq('id', notifId);
  } catch (err) {
    console.warn('markCloudNotificationRead warning:', err.message);
  }
}

// ========================================================================
// 7. MENU & SHOP CRUD (WITH AUTOMATIC CACHE INVALIDATION)
// ========================================================================
// ========================================================================
// 7. MENU, SHOP, COMBO & OFFER CRUD (WITH AUTOMATIC CACHE INVALIDATION)
// ========================================================================

export const DEFAULT_OFFERS = [
  {
    id: 'offer-radhe-108',
    code: 'RADHE108',
    title: 'Divine First Order Blessings',
    subtitle: 'Flat ₹108 off on pure satvik orders above ₹499',
    discountType: 'flat',
    discountValue: 108,
    minOrderAmount: 499,
    maxDiscount: 108,
    shopId: 'all',
    isActive: true,
    tag: 'Popular Devotee Offer',
    validUntil: '2028-12-31T23:59:59.000Z',
    createdAt: new Date().toISOString()
  },
  {
    id: 'offer-vrinda-20',
    code: 'VRINDA20',
    title: 'Vedic Feast 20% Discount',
    subtitle: 'Get 20% off up to ₹150 on sacred prasad meals',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 299,
    maxDiscount: 150,
    shopId: 'all',
    isActive: true,
    tag: 'Best Value',
    validUntil: '2028-12-31T23:59:59.000Z',
    createdAt: new Date().toISOString()
  },
  {
    id: 'offer-freeship',
    code: 'FREESHIP',
    title: 'Zero Delivery Sarathi Fee',
    subtitle: 'Free doorstep delivery anywhere across Vrindavan Dham',
    discountType: 'flat',
    discountValue: 50,
    minOrderAmount: 199,
    maxDiscount: 50,
    shopId: 'all',
    isActive: true,
    tag: 'Free Delivery',
    validUntil: '2028-12-31T23:59:59.000Z',
    createdAt: new Date().toISOString()
  }
];

export function getCachedOffers() {
  try {
    const raw = localStorage.getItem('foody_cached_offers');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { }
  return DEFAULT_OFFERS;
}

export function saveCachedOffers(offersList) {
  try {
    localStorage.setItem('foody_cached_offers', JSON.stringify(offersList));
  } catch (e) { }
  return offersList;
}

export async function getCloudOffers(forceRefresh = false) {
  const cached = getCachedOffers();
  if (!forceRefresh) return cached;

  try {
    const { data, error } = await supabase
      .from('foody_offers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped = data.map(d => ({
        id: d.id,
        code: d.code || '',
        title: d.title || '',
        subtitle: d.subtitle || '',
        discountType: d.discount_type || d.discountType || 'flat',
        discountValue: Number(d.discount_value || d.discountValue || 0),
        minOrderAmount: Number(d.min_order_amount || d.minOrderAmount || 0),
        maxDiscount: Number(d.max_discount || d.maxDiscount || 0),
        shopId: d.shop_id || d.shopId || 'all',
        isActive: d.is_active ?? d.isActive ?? true,
        tag: d.tag || '',
        validUntil: d.valid_until || d.validUntil || '2028-12-31T23:59:59.000Z',
        createdAt: d.created_at || new Date().toISOString()
      }));
      saveCachedOffers(mapped);
      return mapped;
    }

    // Try fallback table name 'offers' if foody_offers is not yet migrated
    if (error && (error.code === 'PGRST200' || error.code === '42P01' || error.message?.includes('not find'))) {
      try {
        const fallbackRes = await supabase.from('offers').select('*');
        if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
          saveCachedOffers(fallbackRes.data);
          return fallbackRes.data;
        }
      } catch (_) { }
    }
  } catch (err) {
    // SWR fallback safely returns instant local cache
  }
  return cached;
}


export async function createCloudOffer(offerData) {
  const nowIso = new Date().toISOString();
  const offerId = offerData.id || `offer-${(offerData.code || Date.now()).toString().toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const newOffer = {
    id: offerId,
    code: (offerData.code || '').trim().toUpperCase(),
    title: offerData.title || 'Special Promotion',
    subtitle: offerData.subtitle || '',
    discountType: offerData.discountType || 'flat',
    discountValue: Number(offerData.discountValue || 0),
    minOrderAmount: Number(offerData.minOrderAmount || 0),
    maxDiscount: Number(offerData.maxDiscount || offerData.discountValue || 0),
    shopId: offerData.shopId || 'all',
    isActive: offerData.isActive ?? true,
    tag: offerData.tag || 'Special Offer',
    validUntil: offerData.validUntil || '2028-12-31T23:59:59.000Z',
    createdAt: nowIso
  };

  const current = getCachedOffers();
  const nextList = [newOffer, ...current.filter(o => o.id !== offerId)];
  saveCachedOffers(nextList);
  window.dispatchEvent(new CustomEvent('foody_offers_changed', { detail: { offers: nextList, createdOffer: newOffer } }));

  try {
    await supabase.from('foody_offers').upsert({
      id: newOffer.id,
      code: newOffer.code,
      title: newOffer.title,
      subtitle: newOffer.subtitle,
      discount_type: newOffer.discountType,
      discount_value: newOffer.discountValue,
      min_order_amount: newOffer.minOrderAmount,
      max_discount: newOffer.maxDiscount,
      shop_id: newOffer.shopId,
      is_active: newOffer.isActive,
      tag: newOffer.tag,
      valid_until: newOffer.validUntil,
      created_at: nowIso
    });
  } catch (e) {
    console.warn("createCloudOffer cloud insert note:", e);
  }

  return newOffer;
}

export async function updateCloudOffer(offerId, updates) {
  const current = getCachedOffers();
  let updatedOffer = null;
  const nextList = current.map(o => {
    if (o.id === offerId) {
      updatedOffer = { ...o, ...updates };
      return updatedOffer;
    }
    return o;
  });

  if (!updatedOffer) return null;
  saveCachedOffers(nextList);
  window.dispatchEvent(new CustomEvent('foody_offers_changed', { detail: { offers: nextList, updatedOffer } }));

  try {
    const payload = {};
    if (updates.code !== undefined) payload.code = updates.code.toUpperCase();
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle;
    if (updates.discountType !== undefined) payload.discount_type = updates.discountType;
    if (updates.discountValue !== undefined) payload.discount_value = Number(updates.discountValue);
    if (updates.minOrderAmount !== undefined) payload.min_order_amount = Number(updates.minOrderAmount);
    if (updates.maxDiscount !== undefined) payload.max_discount = Number(updates.maxDiscount);
    if (updates.shopId !== undefined) payload.shop_id = updates.shopId;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.tag !== undefined) payload.tag = updates.tag;
    if (updates.validUntil !== undefined) payload.valid_until = updates.validUntil;

    await supabase.from('foody_offers').update(payload).eq('id', offerId);
  } catch (e) {
    console.warn("updateCloudOffer notice:", e);
  }

  return updatedOffer;
}

export async function deleteCloudOffer(offerId) {
  const current = getCachedOffers();
  const nextList = current.filter(o => o.id !== offerId);
  saveCachedOffers(nextList);
  window.dispatchEvent(new CustomEvent('foody_offers_changed', { detail: { offers: nextList } }));

  try {
    await supabase.from('foody_offers').delete().eq('id', offerId);
  } catch (e) { }

  return true;
}

// -------------------------------------------------------------
// MENUS & COMBOS CRUD
// -------------------------------------------------------------

export async function createCloudMenuItem(itemData) {
  try {
    const itemId = itemData.id || `menu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const isCombo = Boolean(itemData.isCombo || itemData.category === 'Combo Offers');
    const payload = {
      id: itemId,
      shop_id: itemData.shopId || itemData.shop_id || 'shop-vrinda-main',
      name: itemData.name,
      subtitle: itemData.subtitle || itemData.category || '',
      description: itemData.description || '',
      category: itemData.category || (isCombo ? 'Combo Offers' : 'Main'),
      price: Number(itemData.price || 0),
      original_price: Number(itemData.originalPrice || itemData.original_price || itemData.price || 0),
      discount_percent: Number(itemData.discountPercent || itemData.discount_percent || 0),
      is_combo: isCombo,
      combo_items: itemData.comboItems || itemData.combo_items || [],
      image: resolveDishCutout(itemData.imageUrl || itemData.image, itemData.name, itemData.category),
      tag: itemData.tag || (isCombo ? 'Combo Savings' : 'Popular Choice'),
      kcal: itemData.kcal || itemData.nutrition?.kcal || '250 kcal',
      nutrition: typeof itemData.nutrition === 'object' ? itemData.nutrition : { kcal: itemData.kcal || '250 kcal' },
      is_available: itemData.isAvailable ?? itemData.is_available ?? true
    };

    // Update in-memory & local caches immediately
    const shopKey = payload.shop_id;
    const currentShopMenus = getCachedItem('menus', shopKey) || [];
    const normalizedItem = {
      id: itemId,
      shopId: payload.shop_id,
      name: payload.name,
      subtitle: payload.subtitle,
      description: payload.description,
      category: payload.category,
      price: payload.price,
      originalPrice: payload.original_price,
      discountPercent: payload.discount_percent,
      isCombo: payload.is_combo,
      comboItems: payload.combo_items,
      image: payload.image,
      tag: payload.tag,
      kcal: payload.kcal,
      nutrition: payload.nutrition,
      isAvailable: payload.is_available
    };

    setCachedItem('menus', shopKey, [normalizedItem, ...currentShopMenus.filter(m => m.id !== itemId)]);
    invalidateCache('menus');
    window.dispatchEvent(new CustomEvent('foody_menus_changed', { detail: { shopId: shopKey, item: normalizedItem } }));

    const { data, error } = await supabase
      .from('foody_menus')
      .upsert([payload])
      .select()
      .single();

    if (error) {
      console.warn('createCloudMenuItem warning:', error.message);
      return normalizedItem;
    }
    return { ...normalizedItem, ...data };
  } catch (err) {
    console.warn('createCloudMenuItem exception:', err.message);
    return { id: itemData.id || `menu-${Date.now()}`, ...itemData };
  }
}

export async function updateCloudMenuItem(itemId, itemData) {
  try {
    const payload = {};
    if (itemData.name !== undefined) payload.name = itemData.name;
    if (itemData.subtitle !== undefined) payload.subtitle = itemData.subtitle;
    if (itemData.description !== undefined) payload.description = itemData.description;
    if (itemData.category !== undefined) payload.category = itemData.category;
    if (itemData.price !== undefined) payload.price = Number(itemData.price);
    if (itemData.originalPrice !== undefined || itemData.original_price !== undefined) payload.original_price = Number(itemData.originalPrice ?? itemData.original_price);
    if (itemData.discountPercent !== undefined || itemData.discount_percent !== undefined) payload.discount_percent = Number(itemData.discountPercent ?? itemData.discount_percent);
    if (itemData.isCombo !== undefined || itemData.is_combo !== undefined) payload.is_combo = Boolean(itemData.isCombo ?? itemData.is_combo);
    if (itemData.comboItems !== undefined || itemData.combo_items !== undefined) payload.combo_items = itemData.comboItems ?? itemData.combo_items;
    if (itemData.imageUrl !== undefined || itemData.image !== undefined) payload.image = resolveDishCutout(itemData.imageUrl || itemData.image, itemData.name, itemData.category);
    if (itemData.tag !== undefined) payload.tag = itemData.tag;
    if (itemData.nutrition !== undefined) payload.nutrition = typeof itemData.nutrition === 'object' ? itemData.nutrition : { kcal: itemData.nutrition };
    if (itemData.isAvailable !== undefined || itemData.is_available !== undefined) payload.is_available = itemData.isAvailable ?? itemData.is_available;

    invalidateCache('menus');
    window.dispatchEvent(new CustomEvent('foody_menus_changed', { detail: { itemId, updates: payload } }));

    const { data, error } = await supabase
      .from('foody_menus')
      .update(payload)
      .eq('id', itemId)
      .select();

    if (error) {
      console.warn('updateCloudMenuItem warning:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('updateCloudMenuItem exception:', err.message);
    return null;
  }
}

export async function deleteCloudMenuItem(itemId, shopId = null) {
  try {
    invalidateCache('menus', shopId);
    window.dispatchEvent(new CustomEvent('foody_menus_changed', { detail: { itemId, deleted: true } }));

    const { error } = await supabase
      .from('foody_menus')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.warn('deleteCloudMenuItem warning:', error.message);
    }
    return !error;
  } catch (err) {
    console.warn('deleteCloudMenuItem exception:', err.message);
    return false;
  }
}

// -------------------------------------------------------------
// SHOPS & KITCHENS CRUD
// -------------------------------------------------------------

export async function createCloudShop(shopData) {
  const shopId = shopData.id || `shop-vrinda-${Date.now().toString(36)}`;
  const normalized = normalizeShop({
    id: shopId,
    name: shopData.name || 'New Vrinda Kitchen',
    address: shopData.address || 'Vrindavan Dham',
    phone: shopData.phone || '+91 9876543210',
    coordinates: shopData.coordinates || { lat: 27.5706, lng: 77.6593 },
    isOpen: shopData.isOpen ?? true,
    minimumOrderAmount: Number(shopData.minimumOrderAmount || 0),
    deliveryCharge: Number(shopData.deliveryCharge || 0),
    gstPercentage: Number(shopData.gstPercentage || 5),
    onlinePaymentsEnabled: shopData.onlinePaymentsEnabled ?? true,
    codEnabled: shopData.codEnabled ?? true,
    alarmSettings: shopData.alarmSettings || { kitchenNew: true, kitchenReady: false, deliveryReady: true }
  });

  const current = getCachedShops();
  const nextList = [normalized, ...current.filter(s => s.id !== shopId)];
  saveCachedShops(nextList);
  memoryCache.shops = { data: nextList, timestamp: Date.now() };

  window.dispatchEvent(new CustomEvent('foody_shops_changed', {
    detail: { shopId, shopData: normalized, shops: nextList }
  }));

  try {
    await supabase.from('foody_shops').upsert({
      id: normalized.id,
      name: normalized.name,
      address: normalized.address,
      phone: normalized.phone,
      coordinates: normalized.coordinates,
      is_open: normalized.isOpen,
      minimum_order_amount: normalized.minimumOrderAmount,
      delivery_charge: normalized.deliveryCharge,
      gst_percentage: normalized.gstPercentage,
      online_payments_enabled: normalized.onlinePaymentsEnabled,
      cod_enabled: normalized.codEnabled,
      alarm_settings: normalized.alarmSettings
    });
  } catch (e) {
    console.warn("createCloudShop cloud notice:", e);
  }

  return normalized;
}

export async function updateCloudShop(shopId, shopData) {
  if (!shopId) return null;
  try {
    const currentList = getCachedShops();
    let updatedShop = null;
    let found = false;

    const nextList = currentList.map(s => {
      if (s.id === shopId) {
        found = true;
        const merged = { ...s, ...shopData };

        if (shopData.paymentSettings) {
          merged.paymentSettings = {
            onlinePaymentsEnabled: shopData.paymentSettings.onlinePaymentsEnabled !== undefined ? shopData.paymentSettings.onlinePaymentsEnabled : (s.paymentSettings?.onlinePaymentsEnabled ?? true),
            codEnabled: shopData.paymentSettings.codEnabled !== undefined ? shopData.paymentSettings.codEnabled : (s.paymentSettings?.codEnabled ?? true)
          };
          merged.onlinePaymentsEnabled = merged.paymentSettings.onlinePaymentsEnabled;
          merged.codEnabled = merged.paymentSettings.codEnabled;
        } else if (shopData.onlinePaymentsEnabled !== undefined || shopData.codEnabled !== undefined) {
          merged.paymentSettings = {
            onlinePaymentsEnabled: shopData.onlinePaymentsEnabled !== undefined ? shopData.onlinePaymentsEnabled : (s.onlinePaymentsEnabled ?? true),
            codEnabled: shopData.codEnabled !== undefined ? shopData.codEnabled : (s.codEnabled ?? true)
          };
          merged.onlinePaymentsEnabled = merged.paymentSettings.onlinePaymentsEnabled;
          merged.codEnabled = merged.paymentSettings.codEnabled;
        }

        updatedShop = normalizeShop(merged);
        return updatedShop;
      }
      return normalizeShop(s);
    });

    if (!found) {
      updatedShop = normalizeShop({ id: shopId, ...shopData });
      nextList.push(updatedShop);
    }

    const saved = saveCachedShops(nextList);
    memoryCache.shops = { data: saved, timestamp: Date.now() };

    window.dispatchEvent(new CustomEvent('foody_shops_changed', {
      detail: { shopId, shopData: updatedShop, shops: saved }
    }));

    try {
      const payload = {};
      if (shopData.name !== undefined) payload.name = shopData.name;
      if (shopData.address !== undefined) payload.address = shopData.address;
      if (shopData.phone !== undefined) payload.phone = shopData.phone;
      if (shopData.minimumOrderAmount !== undefined) payload.minimum_order_amount = Number(shopData.minimumOrderAmount);
      if (shopData.deliveryCharge !== undefined) payload.delivery_charge = Number(shopData.deliveryCharge);
      if (shopData.gstPercentage !== undefined) payload.gst_percentage = Number(shopData.gstPercentage);
      if (shopData.coordinates !== undefined) payload.coordinates = shopData.coordinates;
      if (shopData.isOpen !== undefined) payload.is_open = shopData.isOpen;
      if (shopData.onlinePaymentsEnabled !== undefined) payload.online_payments_enabled = shopData.onlinePaymentsEnabled;
      if (shopData.codEnabled !== undefined) payload.cod_enabled = shopData.codEnabled;

      if (Object.keys(payload).length > 0) {
        await supabase
          .from('foody_shops')
          .update(payload)
          .eq('id', shopId);
      }
    } catch (sbErr) {
      console.warn("Supabase shop update note:", sbErr?.message);
    }

    return updatedShop;
  } catch (err) {
    console.warn('updateCloudShop exception:', err.message);
    return null;
  }
}

export async function deleteCloudShop(shopId) {
  const current = getCachedShops();
  const nextList = current.filter(s => s.id !== shopId);
  saveCachedShops(nextList);
  memoryCache.shops = { data: nextList, timestamp: Date.now() };

  window.dispatchEvent(new CustomEvent('foody_shops_changed', {
    detail: { shopId, deleted: true, shops: nextList }
  }));

  try {
    await supabase.from('foody_shops').delete().eq('id', shopId);
  } catch (e) {
    console.warn("deleteCloudShop error:", e);
  }

  return true;
}

export async function markCloudOrderCashCollected(orderId) {
  return updateCloudOrderStatus(orderId, undefined, { cash_status: 'collected' });
}

// ==========================================
// SUPABASE CLOUD USERS & ROLE MANAGEMENT
// ==========================================

export const SEED_USERS = [
  {
    id: 'master_dev_108',
    displayName: 'Master Developer (Foody Vrinda)',
    email: 'developer@foodyvrinda.com',
    phone: '9876543210',
    role: 'developer',
    shopId: 'shop-vrinda-main',
    shopIds: ['shop-vrinda-main', 'shop-prem-mandir', 'shop-banke-bihari']
  },
  {
    id: 'store_owner_main',
    displayName: 'Vrinda Store Owner',
    email: 'owner@foodyvrinda.com',
    phone: '9876543211',
    role: 'owner',
    shopId: 'shop-vrinda-main',
    shopIds: ['shop-vrinda-main']
  },
  {
    id: 'kitchen_chef_radhe',
    displayName: 'Head Chef Radhe',
    email: 'chef@foodyvrinda.com',
    phone: '9876543212',
    role: 'kitchen',
    shopId: 'shop-vrinda-main',
    shopIds: ['shop-vrinda-main']
  },
  {
    id: 'rider_sarathi_gopal',
    displayName: 'Sarathi Gopal',
    email: 'sarathi@foodyvrinda.com',
    phone: '9876543213',
    role: 'delivery',
    shopId: 'shop-vrinda-main',
    shopIds: ['shop-vrinda-main', 'shop-prem-mandir', 'shop-banke-bihari']
  }
];

export function getCachedUsers() {
  try {
    const saved = localStorage.getItem('foody_cached_users');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { }
  return SEED_USERS;
}

export function saveCachedUsers(users) {
  try {
    localStorage.setItem('foody_cached_users', JSON.stringify(users));
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

      // 3. Merge & deduplicate across cache, foody_users, and foody_logged_users
      const userMap = new Map();

      // Start with cached users as base
      (cached || []).forEach(u => {
        if (u && u.id) userMap.set(String(u.id).trim(), u);
      });

      // Overlay foody_users
      usersData.forEach(u => {
        if (!u || !u.id) return;
        const cleanId = String(u.id).trim();
        const mapped = {
          id: cleanId,
          displayName: u.display_name || u.displayName || u.email?.split('@')[0] || `User (${cleanId.slice(0, 6)})`,
          email: u.email || '',
          phone: u.phone || '',
          avatarUrl: u.avatar_url || '',
          role: u.role || 'customer',
          shopId: u.shop_id || u.shopId || 'shop-vrinda-main',
          shopIds: u.shop_ids || u.shopIds || (u.shop_id ? [u.shop_id] : ['shop-vrinda-main']),
          devPermissions: u.dev_permissions || [],
          lastLoginAt: u.last_seen_at || u.updated_at || u.created_at,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        };
        userMap.set(cleanId, mapped);
      });

      // Overlay foody_logged_users (active login table takes highest priority)
      loggedData.forEach(u => {
        if (!u || !u.id) return;
        const cleanId = String(u.id).trim();
        const mapped = {
          id: cleanId,
          displayName: u.display_name || u.displayName || u.email?.split('@')[0] || `User (${cleanId.slice(0, 6)})`,
          email: u.email || '',
          phone: u.phone || '',
          avatarUrl: u.avatar_url || '',
          role: u.role || 'customer',
          shopId: u.shop_id || u.shopId || 'shop-vrinda-main',
          shopIds: u.shop_ids || u.shopIds || (u.shop_id ? [u.shop_id] : ['shop-vrinda-main']),
          devPermissions: u.dev_permissions || [],
          lastLoginAt: u.last_login_at || u.updated_at || u.created_at,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        };
        userMap.set(cleanId, mapped);
      });

      const merged = Array.from(userMap.values());
      if (merged.length > 0) {
        saveCachedUsers(merged);
        setCachedItem('users', 'all', merged);
        return merged;
      }
      return cached;
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

  try {
    let query = supabase.from('foody_logged_users').select('*');
    if (cleanId) {
      query = query.eq('id', cleanId);
    } else if (cleanEmail) {
      query = query.eq('email', cleanEmail);
    } else if (cleanPhone && cleanPhone.length >= 10) {
      query = query.eq('phone', cleanPhone);
    }
    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      return {
        id: data.id,
        displayName: data.display_name || data.email?.split('@')[0] || 'User',
        email: data.email || '',
        phone: data.phone || '',
        avatarUrl: data.avatar_url || '',
        role: data.role || 'customer',
        shopId: data.shop_id || 'shop-vrinda-main',
        shopIds: data.shop_ids || (data.shop_id ? [data.shop_id] : ['shop-vrinda-main']),
        devPermissions: data.dev_permissions || [],
        isLoggedInUser: true
      };
    }
  } catch (e) { }

  // Fallback check on public.foody_users
  try {
    let uQuery = supabase.from('foody_users').select('*');
    if (cleanId) {
      uQuery = uQuery.eq('id', cleanId);
    } else if (cleanEmail) {
      uQuery = uQuery.eq('email', cleanEmail);
    } else if (cleanPhone && cleanPhone.length >= 10) {
      uQuery = uQuery.eq('phone', cleanPhone);
    }
    const { data: uData, error: uErr } = await uQuery.maybeSingle();
    if (!uErr && uData) {
      return {
        id: uData.id,
        displayName: uData.display_name || uData.email?.split('@')[0] || 'User',
        email: uData.email || '',
        phone: uData.phone || '',
        avatarUrl: uData.avatar_url || '',
        role: uData.role || 'customer',
        shopId: uData.shop_id || 'shop-vrinda-main',
        shopIds: uData.shop_ids || (uData.shop_id ? [uData.shop_id] : ['shop-vrinda-main']),
        devPermissions: uData.dev_permissions || [],
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
  const cleanShop = userProfile.shopId || 'shop-vrinda-main';
  const cleanShops = userProfile.shopIds || [cleanShop];
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

  const loggedUsersPayload = {
    id: cleanId,
    display_name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    avatar_url: cleanAvatar,
    role: finalRole,
    shop_id: finalShop,
    shop_ids: finalShops,
    login_method: loginMethod,
    is_active: true,
    last_login_at: nowIso,
    updated_at: nowIso
  };

  const standardUsersPayload = {
    id: cleanId,
    display_name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    avatar_url: cleanAvatar,
    role: finalRole,
    shop_id: finalShop,
    shop_ids: finalShops,
    is_active: true,
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
  window.dispatchEvent(new CustomEvent('foody_users_changed', { detail: { users: next, updatedUser: loggedUsersPayload } }));

  // 2. Persist dual writes to Supabase foody_logged_users & foody_users
  try {
    await supabase.from('foody_logged_users').upsert(loggedUsersPayload);
  } catch (e) {
    console.warn('recordLoggedInUser logged_users notice:', e);
  }

  try {
    await supabase.from('foody_users').upsert(standardUsersPayload);
  } catch (e) {
    console.warn('recordLoggedInUser foody_users notice:', e);
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
    role: userData.role || 'customer',
    shopId: userData.shopId || 'shop-vrinda-main',
    shopIds: userData.shopIds || (userData.shopId ? [userData.shopId] : ['shop-vrinda-main']),
    lastLoginAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const nextList = [newUser, ...currentUsers.filter(u => u.id !== userId)];
  saveCachedUsers(nextList);
  setCachedItem('users', 'all', nextList);
  window.dispatchEvent(new CustomEvent('foody_users_changed', { detail: { users: nextList, updatedUser: newUser } }));

  const loggedDbPayload = {
    id: newUser.id,
    display_name: newUser.displayName,
    email: newUser.email,
    phone: newUser.phone,
    avatar_url: newUser.avatarUrl,
    role: newUser.role,
    shop_id: newUser.shopId,
    shop_ids: newUser.shopIds,
    last_login_at: nowIso,
    updated_at: nowIso
  };

  const standardDbPayload = {
    id: newUser.id,
    display_name: newUser.displayName,
    email: newUser.email,
    phone: newUser.phone,
    avatar_url: newUser.avatarUrl,
    role: newUser.role,
    shop_id: newUser.shopId,
    shop_ids: newUser.shopIds,
    last_seen_at: nowIso,
    updated_at: nowIso
  };

  try {
    await supabase.from('foody_logged_users').upsert(loggedDbPayload);
  } catch (e) {
    console.warn('createCloudUser logged_users notice:', e);
  }

  try {
    await supabase.from('foody_users').upsert(standardDbPayload);
  } catch (e) {
    console.warn('createCloudUser foody_users notice:', e);
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
    const newUser = {
      id: targetId,
      displayName: updates.displayName || updates.display_name || 'User',
      email: resolvedEmail,
      phone: resolvedPhone,
      role: updates.role || 'customer',
      shopId: updates.shopId || updates.shop_id || 'shop-vrinda-main',
      shopIds: updates.shopIds || updates.shop_ids || [updates.shopId || updates.shop_id || 'shop-vrinda-main'],
      ...updates,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    updatedList = [newUser, ...currentUsers];
  }

  saveCachedUsers(updatedList);
  setCachedItem('users', 'all', updatedList);
  const updatedUserObj = updatedList.find(u => (targetId && String(u.id).trim() === targetId) || (resolvedEmail && u.email && u.email.toLowerCase().trim() === resolvedEmail));
  window.dispatchEvent(new CustomEvent('foody_users_changed', { detail: { users: updatedList, updatedUser: updatedUserObj } }));

  // Synchronize update to both foody_logged_users and foody_users
  const fullLoggedPayload = {
    id: targetId,
    display_name: updates.displayName || updates.display_name || userExists?.displayName || resolvedEmail?.split('@')[0] || `User (${targetId.slice(0, 6)})`,
    email: resolvedEmail,
    phone: resolvedPhone,
    avatar_url: updates.avatarUrl || updates.avatar_url || userExists?.avatarUrl || '',
    role: updates.role || userExists?.role || 'customer',
    shop_id: updates.shopId || updates.shop_id || userExists?.shopId || 'shop-vrinda-main',
    shop_ids: updates.shopIds || updates.shop_ids || userExists?.shopIds || ['shop-vrinda-main'],
    updated_at: nowIso
  };

  const fullStandardPayload = {
    id: targetId,
    display_name: fullLoggedPayload.display_name,
    email: resolvedEmail,
    phone: resolvedPhone,
    avatar_url: fullLoggedPayload.avatar_url,
    role: fullLoggedPayload.role,
    shop_id: fullLoggedPayload.shop_id,
    shop_ids: fullLoggedPayload.shop_ids,
    last_seen_at: nowIso,
    updated_at: nowIso
  };

  try {
    await supabase.from('foody_logged_users').upsert(fullLoggedPayload);
  } catch (e) {
    console.warn('updateCloudUser logged_users note:', e);
  }

  try {
    await supabase.from('foody_users').upsert(fullStandardPayload);
  } catch (e) {
    console.warn('updateCloudUser foody_users note:', e);
  }

  return updatedUserObj;
}

export async function deleteCloudUser(userId) {
  const currentUsers = getCachedUsers();
  const updatedList = currentUsers.filter(u => u.id !== userId);
  saveCachedUsers(updatedList);
  setCachedItem('users', 'all', updatedList);
  window.dispatchEvent(new CustomEvent('foody_users_changed', { detail: { users: updatedList } }));

  try {
    await supabase.from('foody_logged_users').delete().eq('id', userId);
  } catch (e) { }

  try {
    await supabase.from('foody_users').delete().eq('id', userId);
  } catch (e) { }

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
  window.addEventListener('foody_users_changed', handleLocalChange);

  return () => {
    if (unsubscribeMultiplexer) unsubscribeMultiplexer();
    window.removeEventListener('foody_users_changed', handleLocalChange);
  };
}

// ==========================================
// 8. REVIEWS & RATINGS CLOUD APIS
// ==========================================

export async function createCloudReview(reviewData) {
  const localKey = `foody_reviews_${reviewData.shop_id || reviewData.shopId || 'all'}`;
  try {
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    const nextReviews = [reviewData, ...existing];
    localStorage.setItem(localKey, JSON.stringify(nextReviews));
    window.dispatchEvent(new CustomEvent('foody_reviews_changed', { detail: { reviews: nextReviews } }));
  } catch (e) { }

  try {
    const payload = {
      order_id: reviewData.order_id || reviewData.orderId || `REV-${Date.now()}`,
      shop_id: reviewData.shop_id || reviewData.shopId || 'shop-vrinda-main',
      customer_name: reviewData.customer_name || reviewData.customerName || 'Devotee Customer',
      rating: Number(reviewData.rating || 5),
      tags: reviewData.tags || [],
      comment: reviewData.comment || '',
      created_at: reviewData.created_at || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('foody_reviews')
      .insert([payload])
      .select();

    if (error) {
      console.warn('createCloudReview cloud notice:', error.message);
    }
    return data ? data[0] : payload;
  } catch (e) {
    console.warn('createCloudReview notice:', e.message);
    return reviewData;
  }
}

export async function getCloudReviews(shopId = 'all') {
  const localKey = `foody_reviews_${shopId}`;
  let localData = [];
  try {
    localData = JSON.parse(localStorage.getItem(localKey) || '[]');
  } catch (e) { }

  try {
    let query = supabase.from('foody_reviews').select('*').order('created_at', { ascending: false }).limit(50);
    if (shopId && shopId !== 'all') {
      query = query.eq('shop_id', shopId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      try {
        localStorage.setItem(localKey, JSON.stringify(data));
      } catch (e) { }
      return data;
    }
    return localData;
  } catch (e) {
    return localData;
  }
}

export const COMPLETE_FOODY_DATABASE_SCHEMA_SQL = `-- ========================================================================
-- FOODY VRINDA - ENTERPRISE POSTGRESQL & SUPABASE CLOUD SCHEMA
-- Run this in your Supabase SQL Editor to set up all tables, triggers, indexes, and publications.
-- ========================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. FOODY SHOPS TABLE
CREATE TABLE IF NOT EXISTS public.foody_shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    coordinates JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    is_open BOOLEAN DEFAULT true,
    minimum_order_amount NUMERIC DEFAULT 0,
    delivery_charge NUMERIC DEFAULT 0,
    gst_percentage NUMERIC DEFAULT 5,
    payment_settings JSONB DEFAULT '{"onlinePaymentsEnabled": true, "codEnabled": true}'::jsonb,
    alarm_settings JSONB DEFAULT '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{"onlinePaymentsEnabled": true, "codEnabled": true}'::jsonb;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS alarm_settings JSONB DEFAULT '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb;

DROP TRIGGER IF EXISTS trg_foody_shops_updated_at ON public.foody_shops;
CREATE TRIGGER trg_foody_shops_updated_at
    BEFORE UPDATE ON public.foody_shops
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. FOODY MENUS TABLE
CREATE TABLE IF NOT EXISTS public.foody_menus (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL DEFAULT 'shop-vrinda-main',
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Meals',
    price NUMERIC NOT NULL DEFAULT 0,
    image TEXT,
    tag TEXT,
    kcal TEXT DEFAULT '250 kcal',
    nutrition JSONB DEFAULT '{"carbs": "35g", "fat": "12g", "protein": "16g", "kcal": "250 kcal"}'::jsonb,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_foody_menus_updated_at ON public.foody_menus;
CREATE TRIGGER trg_foody_menus_updated_at
    BEFORE UPDATE ON public.foody_menus
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. FOODY ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.foody_orders (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL DEFAULT 'shop-vrinda-main',
    user_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    delivery_address TEXT,
    delivery_coordinates JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    delivery_charge NUMERIC NOT NULL DEFAULT 0,
    gst_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled')),
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'online')),
    payment_id TEXT,
    cash_status TEXT DEFAULT 'pending' CHECK (cash_status IN ('pending', 'collected')),
    cooking_notes TEXT,
    rider_id TEXT,
    rider_name TEXT,
    rider_phone TEXT,
    rider_rating TEXT,
    rider_avatar TEXT,
    created_by TEXT DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_id TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_name TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_phone TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_rating TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_avatar TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS cooking_notes TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS cash_status TEXT DEFAULT 'pending';
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS payment_id TEXT;

DROP TRIGGER IF EXISTS trg_foody_orders_updated_at ON public.foody_orders;
CREATE TRIGGER trg_foody_orders_updated_at
    BEFORE UPDATE ON public.foody_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. ROLES MASTER CATALOG TABLE (foody_roles)
-- Provides foreign-key relational dropdown selection in Supabase Studio
CREATE TABLE IF NOT EXISTS public.foody_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    hierarchy_level INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_foody_roles_updated_at ON public.foody_roles;
CREATE TRIGGER trg_foody_roles_updated_at
    BEFORE UPDATE ON public.foody_roles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Populate core enterprise roles
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

-- 5. ALL LOGGED-IN USERS & ROLE MANAGEMENT TABLE (foody_logged_users)
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

DROP TRIGGER IF EXISTS trg_foody_logged_users_updated_at ON public.foody_logged_users;
CREATE TRIGGER trg_foody_logged_users_updated_at
    BEFORE UPDATE ON public.foody_logged_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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
    is_active BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

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

DROP TRIGGER IF EXISTS trg_foody_users_updated_at ON public.foody_users;
CREATE TRIGGER trg_foody_users_updated_at
    BEFORE UPDATE ON public.foody_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. FOODY REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.foody_reviews (
    id BIGSERIAL PRIMARY KEY,
    order_id TEXT,
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    customer_name TEXT,
    rating INT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    tags JSONB DEFAULT '[]'::jsonb,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. FOODY NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.foody_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    role TEXT DEFAULT 'all',
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    order_id TEXT,
    type TEXT DEFAULT 'order_update',
    title TEXT,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON public.foody_orders (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.foody_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.foody_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.foody_orders (customer_phone);

CREATE INDEX IF NOT EXISTS idx_menus_shop ON public.foody_menus (shop_id);
CREATE INDEX IF NOT EXISTS idx_menus_category ON public.foody_menus (category);
CREATE INDEX IF NOT EXISTS idx_menus_is_available ON public.foody_menus (is_available);

CREATE INDEX IF NOT EXISTS idx_logged_users_role ON public.foody_logged_users (role);
CREATE INDEX IF NOT EXISTS idx_logged_users_email ON public.foody_logged_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_logged_users_phone ON public.foody_logged_users (phone);
CREATE INDEX IF NOT EXISTS idx_logged_users_shop_id ON public.foody_logged_users (shop_id);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.foody_users (role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.foody_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.foody_users (phone);
CREATE INDEX IF NOT EXISTS idx_users_shop_id ON public.foody_users (shop_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.foody_notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_shop_role ON public.foody_notifications (shop_id, role);
CREATE INDEX IF NOT EXISTS idx_reviews_shop ON public.foody_reviews (shop_id);

-- 8. REPLICA IDENTITY (Allows 0-Egress Full-Row Realtime Streaming)
ALTER TABLE public.foody_shops REPLICA IDENTITY FULL;
ALTER TABLE public.foody_menus REPLICA IDENTITY FULL;
ALTER TABLE public.foody_orders REPLICA IDENTITY FULL;
ALTER TABLE public.foody_logged_users REPLICA IDENTITY FULL;
ALTER TABLE public.foody_users REPLICA IDENTITY FULL;
ALTER TABLE public.foody_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.foody_roles REPLICA IDENTITY FULL;

-- 9. ENABLE ROW LEVEL SECURITY & PUBLIC READ/WRITE POLICIES
ALTER TABLE public.foody_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access roles" ON public.foody_roles;
CREATE POLICY "Public access roles" ON public.foody_roles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access shops" ON public.foody_shops;
CREATE POLICY "Public access shops" ON public.foody_shops FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access menus" ON public.foody_menus;
CREATE POLICY "Public access menus" ON public.foody_menus FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access orders" ON public.foody_orders;
CREATE POLICY "Public access orders" ON public.foody_orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_logged_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access logged users" ON public.foody_logged_users;
CREATE POLICY "Public access logged users" ON public.foody_logged_users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access users" ON public.foody_users;
CREATE POLICY "Public access users" ON public.foody_users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access reviews" ON public.foody_reviews;
CREATE POLICY "Public access reviews" ON public.foody_reviews FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access notifications" ON public.foody_notifications;
CREATE POLICY "Public access notifications" ON public.foody_notifications FOR ALL USING (true) WITH CHECK (true);

-- 10. REALTIME STREAMING PUBLICATION (Idempotent)
DO $$ BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_roles; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_shops; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_menus; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_logged_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_reviews; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

NOTIFY pgrst, 'reload schema';

-- 11. AUTOMATIC AUTH.USERS -> LOGGED USERS & FOODY USERS SYNC TRIGGER
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    extracted_name TEXT;
    extracted_role TEXT;
    extracted_phone TEXT;
    extracted_avatar TEXT;
BEGIN
    extracted_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Foody Devotee'
    );
    
    extracted_role := COALESCE(
        NEW.raw_app_meta_data->>'role',
        NEW.raw_user_meta_data->>'role',
        'customer'
    );

    extracted_phone := COALESCE(
        NEW.phone,
        NEW.raw_user_meta_data->>'phone',
        ''
    );

    extracted_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        ''
    );

    INSERT INTO public.foody_logged_users (
        id, display_name, email, phone, avatar_url, role, shop_id, shop_ids, last_login_at, created_at, updated_at
    )
    VALUES (
        NEW.id::text, extracted_name, NEW.email, extracted_phone, extracted_avatar, extracted_role, 'shop-vrinda-main', '["shop-vrinda-main"]'::jsonb, NOW(), COALESCE(NEW.created_at, NOW()), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        email = COALESCE(EXCLUDED.email, foody_logged_users.email),
        phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE foody_logged_users.phone END,
        avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE foody_logged_users.avatar_url END,
        last_login_at = NOW(),
        updated_at = NOW();

    INSERT INTO public.foody_users (
        id, display_name, email, phone, avatar_url, role, shop_id, shop_ids, last_seen_at, created_at, updated_at
    )
    VALUES (
        NEW.id::text, extracted_name, NEW.email, extracted_phone, extracted_avatar, extracted_role, 'shop-vrinda-main', '["shop-vrinda-main"]'::jsonb, NOW(), COALESCE(NEW.created_at, NOW()), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        email = COALESCE(EXCLUDED.email, foody_users.email),
        phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE foody_users.phone END,
        avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE foody_users.avatar_url END,
        last_seen_at = NOW(),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT OR UPDATE ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 12. ATOMIC ROLE ASSIGNMENT STORED PROCEDURE (RPC)
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

/**
 * Extracts a human-friendly item summary from order data
 * Handles single item, multiple items, quantities, and combo packs
 */
export function getOrderItemSummary(order) {
  if (!order) return '';
  let items = order.items || order.order_items || order.item_list;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  if (!Array.isArray(items) || items.length === 0) {
    if (order.title || order.itemName || order.item_name) {
      return order.title || order.itemName || order.item_name;
    }
    return 'Prasad Order';
  }
  const firstItem = items[0]?.name || items[0]?.title || 'Prasad';
  if (items.length === 1) {
    const qty = items[0]?.quantity || 1;
    return qty > 1 ? `${firstItem} (x${qty})` : firstItem;
  }
  if (items.length === 2) {
    return `${firstItem} & ${items[1]?.name || items[1]?.title || '1 more'}`;
  }
  return `${firstItem} + ${items.length - 1} more items`;
}

/**
 * Extracts clean customer recipient name from order
 */
export function getOrderCustomerName(order) {
  if (!order) return 'Customer';
  return order.customerName || order.customer_name || order.userName || order.user_name || 'Customer';
}



