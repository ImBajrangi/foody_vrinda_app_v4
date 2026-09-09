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
  SHOPS: 30 * 60 * 1000,    // 30 minutes
  MENUS: 15 * 60 * 1000,    // 15 minutes
  ORDERS: 2 * 60 * 1000,    // 2 minutes
  USERS: 30 * 1000          // 30 seconds for fast role propagation
};

const memoryCache = {
  shops: { data: null, timestamp: 0 },
  menus: {}, // [shopId]: { data, timestamp }
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
  } else if (type === 'users') {
    if (memoryCache.users.data && (now - memoryCache.users.timestamp < CACHE_TTL_MS.USERS)) {
      return memoryCache.users.data;
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
// 4. ORDERS CLOUD APIS & DISPATCH
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

    const { data, error } = await supabase
      .from('foody_orders')
      .upsert([orderPayload])
      .select()
      .single();

    if (error) {
      console.warn('Supabase upsert order error:', error.message);
      return { id: orderId, ...orderData };
    }
    return { id: data.id, ...data };
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
  try {
    let query = supabase.from('foody_orders').select('*').order('created_at', { ascending: false });
    if (shopId && shopId !== 'all') {
      query = query.eq('shop_id', shopId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(raw => ({
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
  } catch (err) {
    console.warn('getCloudOrders exception:', err);
    return [];
  }
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
// 5. FREE-TIER SINGLETON REALTIME MULTIPLEXER (1 SHARED WEBSOCKET)
// ========================================================================
class RealtimeMultiplexer {
  constructor() {
    this.channel = null;
    this.orderListeners = new Set();
    this.singleOrderListeners = new Map(); // [orderId]: Set of callbacks
    this.notificationListeners = new Set();
    this.userListeners = new Set();
    this.isSubscribed = false;
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

    // 2. Dispatch cross-component event
    window.dispatchEvent(new CustomEvent('foody_users_changed', {
      detail: { users: next, updatedUser: normalized, eventType: payload.eventType }
    }));

    // 3. Notify user listeners directly
    this.userListeners.forEach(listener => {
      try {
        listener(next, normalized, payload.eventType);
      } catch (e) {
        console.error('User listener error:', e);
      }
    });
  }

  subscribeOrders(shopId, callback) {
    this.ensureSubscribed();
    const listenerObj = { shopId, callback };
    this.orderListeners.add(listenerObj);

    return () => {
      this.orderListeners.delete(listenerObj);
      this.checkCleanup();
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
      this.checkCleanup();
    };
  }

  subscribeNotifications(userId, callback) {
    this.ensureSubscribed();
    const listenerObj = { userId, callback };
    this.notificationListeners.add(listenerObj);

    return () => {
      this.notificationListeners.delete(listenerObj);
      this.checkCleanup();
    };
  }

  subscribeUsers(callback) {
    this.ensureSubscribed();
    this.userListeners.add(callback);

    return () => {
      this.userListeners.delete(callback);
      this.checkCleanup();
    };
  }

  checkCleanup() {
    if (
      this.orderListeners.size === 0 &&
      this.singleOrderListeners.size === 0 &&
      this.notificationListeners.size === 0 &&
      this.userListeners.size === 0 &&
      this.channel
    ) {
      // Keep channel alive with a 15-second debounce before closing to prevent connect/disconnect flapping
      setTimeout(() => {
        if (
          this.orderListeners.size === 0 &&
          this.singleOrderListeners.size === 0 &&
          this.notificationListeners.size === 0 &&
          this.userListeners.size === 0 &&
          this.channel
        ) {
          supabase.removeChannel(this.channel);
          this.channel = null;
          this.isSubscribed = false;
        }
      }, 15000);
    }
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
export async function createCloudMenuItem(itemData) {
  try {
    const itemId = itemData.id || `menu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const payload = {
      id: itemId,
      shop_id: itemData.shopId || 'shop-vrinda-main',
      name: itemData.name,
      subtitle: itemData.subtitle || itemData.category || '',
      description: itemData.description || '',
      category: itemData.category || 'Main',
      price: Number(itemData.price || 0),
      image: itemData.imageUrl || itemData.image || DEFAULT_PRASAD_ITEMS[0].image,
      tag: itemData.isDailySpecial ? 'Special' : (itemData.tag || 'Popular'),
      kcal: itemData.nutrition?.kcal || itemData.nutrition || '250 kcal',
      nutrition: typeof itemData.nutrition === 'object' ? itemData.nutrition : { kcal: itemData.nutrition || '250 kcal' },
      is_available: itemData.isAvailable ?? true
    };

    const { data, error } = await supabase
      .from('foody_menus')
      .upsert([payload])
      .select()
      .single();

    invalidateCache('menus', itemData.shopId);

    if (error) {
      console.warn('createCloudMenuItem warning:', error.message);
      return { id: itemId, ...itemData };
    }
    return { id: data.id, ...data };
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
    if (itemData.imageUrl !== undefined || itemData.image !== undefined) payload.image = itemData.imageUrl || itemData.image;
    if (itemData.tag !== undefined) payload.tag = itemData.tag;
    if (itemData.isDailySpecial !== undefined) payload.tag = itemData.isDailySpecial ? 'Special' : 'Popular';
    if (itemData.nutrition !== undefined) payload.nutrition = typeof itemData.nutrition === 'object' ? itemData.nutrition : { kcal: itemData.nutrition };
    if (itemData.isAvailable !== undefined) payload.is_available = itemData.isAvailable;

    const { data, error } = await supabase
      .from('foody_menus')
      .update(payload)
      .eq('id', itemId)
      .select();

    invalidateCache('menus');
    if (error) {
      console.warn('updateCloudMenuItem warning:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('updateCloudMenuItem exception:', err.message);
    return null;
  }
}

export async function deleteCloudMenuItem(itemId) {
  try {
    const { error } = await supabase
      .from('foody_menus')
      .delete()
      .eq('id', itemId);

    invalidateCache('menus');
    if (error) {
      console.warn('deleteCloudMenuItem warning:', error.message);
    }
    return !error;
  } catch (err) {
    console.warn('deleteCloudMenuItem exception:', err.message);
    return false;
  }
}

export async function updateCloudShop(shopId, shopData) {
  if (!shopId) return null;
  try {
    // 1. Get current list and merge update cleanly
    const currentList = getCachedShops();
    let updatedShop = null;
    let found = false;

    const nextList = currentList.map(s => {
      if (s.id === shopId) {
        found = true;
        const merged = { ...s, ...shopData };

        // Ensure nested paymentSettings and root payment flags stay synced
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

    // 2. Immediately persist to cache & memory
    const saved = saveCachedShops(nextList);
    memoryCache.shops = { data: saved, timestamp: Date.now() };

    // 3. Broadcast instant update event across all windows & components
    window.dispatchEvent(new CustomEvent('foody_shops_changed', {
      detail: { shopId, shopData: updatedShop, shops: saved }
    }));

    // 4. Update Supabase foody_shops table safely
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
      // 1. Fetch from foody_logged_users first
      let loggedUsers = [];
      try {
        const { data, error } = await supabase
          .from('foody_logged_users')
          .select('*')
          .order('last_login_at', { ascending: false });
        if (!error && data && data.length > 0) {
          loggedUsers = data;
        }
      } catch (e) { }

      // 2. Also fetch from foody_users to merge any staff or historical users
      let legacyUsers = [];
      try {
        const { data, error } = await supabase
          .from('foody_users')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          legacyUsers = data;
        }
      } catch (e) { }

      const combinedMap = new Map();
      loggedUsers.forEach(u => combinedMap.set(u.id, u));
      legacyUsers.forEach(u => {
        if (!combinedMap.has(u.id)) {
          combinedMap.set(u.id, u);
        } else {
          const existing = combinedMap.get(u.id);
          // Preserve promoted roles if present
          if (existing.role === 'customer' && u.role !== 'customer') {
            combinedMap.set(u.id, { ...existing, role: u.role });
          }
        }
      });

      const mergedRows = Array.from(combinedMap.values());

      if (mergedRows.length > 0) {
        const mapped = mergedRows.map(u => ({
          id: u.id,
          displayName: u.display_name || u.displayName || u.email?.split('@')[0] || 'User',
          email: u.email || '',
          phone: u.phone || '',
          avatarUrl: u.avatar_url || '',
          role: u.role || 'customer',
          shopId: u.shop_id || u.shopId || 'shop-vrinda-main',
          shopIds: u.shop_ids || u.shopIds || (u.shop_id ? [u.shop_id] : ['shop-vrinda-main']),
          devPermissions: u.dev_permissions || [],
          lastLoginAt: u.last_login_at || u.created_at,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        }));
        saveCachedUsers(mapped);
        setCachedItem('users', 'all', mapped);
        return mapped;
      }
      return cached;
    } catch (e) {
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

  // 1. Try foody_logged_users first
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

  // 2. Try foody_users fallback
  try {
    let query = supabase.from('foody_users').select('*');
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

  return null;
}

// Dedicated function to record every login in the database without ever downgrading elevated roles
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

  // 1. Check live database role first so a client session can NEVER overwrite an admin-assigned role!
  let dbRole = null;
  let dbShop = null;
  let dbShops = null;
  try {
    const liveProfile = await getLiveUserRoleAndProfile(cleanId, cleanEmail, cleanPhone);
    if (liveProfile && liveProfile.role && liveProfile.role !== 'customer') {
      dbRole = liveProfile.role;
      dbShop = liveProfile.shopId;
      dbShops = liveProfile.shopIds;
    }
  } catch (e) { }

  // Determine current preserved role from live DB, cache, or profile so we never downgrade
  const current = getCachedUsers();
  const existingUser = current.find(u =>
    (cleanId && String(u.id).trim() === cleanId) ||
    (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
    (cleanPhone && cleanPhone.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
  );

  const finalRole = dbRole
    || (existingUser?.role && existingUser.role !== 'customer' ? existingUser.role : null)
    || (userProfile.role && userProfile.role !== 'customer' ? userProfile.role : null)
    || 'customer';

  const finalShop = dbShop || userProfile.shopId || existingUser?.shopId || cleanShop;
  const finalShops = dbShops || userProfile.shopIds || existingUser?.shopIds || cleanShops;

  const payload = {
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
    last_login_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. Update in-memory & local storage cache
  const idx = current.findIndex(u =>
    (cleanId && String(u.id).trim() === cleanId) ||
    (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
    (cleanPhone && cleanPhone.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
  );
  let next;
  if (idx >= 0) {
    next = [...current];
    next[idx] = { ...next[idx], ...payload, displayName: cleanName };
  } else {
    next = [{ ...payload, displayName: cleanName, createdAt: new Date().toISOString() }, ...current];
  }
  saveCachedUsers(next);
  setCachedItem('users', 'all', next);
  window.dispatchEvent(new CustomEvent('foody_users_changed', { detail: { users: next, updatedUser: payload } }));

  // 2. Persist directly to Supabase foody_logged_users
  try {
    await supabase.from('foody_logged_users').upsert(payload);
  } catch (e) { }

  // 3. Mirror to foody_users for backward compatibility
  try {
    const legacy = {
      id: cleanId,
      display_name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      avatar_url: cleanAvatar,
      role: finalRole,
      shop_id: finalShop,
      shop_ids: finalShops,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await supabase.from('foody_users').upsert(legacy);
  } catch (e) { }

  return payload;
}

export async function createCloudUser(userData) {
  const currentUsers = getCachedUsers();
  const userId = userData.id || `user_${(userData.phone || Date.now()).toString().replace(/\D/g, '')}`;
  const newUser = {
    id: userId,
    displayName: userData.displayName || userData.name || `User (${(userData.phone || '').slice(-4)})`,
    email: userData.email || `${userData.phone || userId}@foodyvrinda.com`,
    phone: userData.phone || '',
    avatarUrl: userData.avatarUrl || userData.avatar_url || '',
    role: userData.role || 'customer',
    shopId: userData.shopId || 'shop-vrinda-main',
    shopIds: userData.shopIds || (userData.shopId ? [userData.shopId] : ['shop-vrinda-main']),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const nextList = [newUser, ...currentUsers.filter(u => u.id !== userId)];
  saveCachedUsers(nextList);
  setCachedItem('users', 'all', nextList);
  window.dispatchEvent(new CustomEvent('foody_users_changed', { detail: { users: nextList, updatedUser: newUser } }));

  const dbPayload = {
    id: newUser.id,
    display_name: newUser.displayName,
    email: newUser.email,
    phone: newUser.phone,
    avatar_url: newUser.avatarUrl,
    role: newUser.role,
    shop_id: newUser.shopId,
    shop_ids: newUser.shopIds,
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('foody_logged_users').upsert(dbPayload);
  } catch (e) { }
  try {
    await supabase.from('foody_users').upsert(dbPayload);
  } catch (e) { }

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

  let updatedList;
  if (userExists) {
    updatedList = currentUsers.map(u => {
      if (
        (cleanId && String(u.id).trim() === cleanId) ||
        (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
        (cleanPhone && cleanPhone.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
      ) {
        return { ...u, ...updates, id: targetId, updatedAt: new Date().toISOString() };
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    updatedList = [newUser, ...currentUsers];
  }

  saveCachedUsers(updatedList);
  setCachedItem('users', 'all', updatedList);
  const updatedUserObj = updatedList.find(u => (targetId && String(u.id).trim() === targetId) || (resolvedEmail && u.email && u.email.toLowerCase().trim() === resolvedEmail));
  window.dispatchEvent(new CustomEvent('foody_users_changed', { detail: { users: updatedList, updatedUser: updatedUserObj } }));

  // 1. Try atomic RPC set_user_role if role is being changed
  if (updates.role) {
    try {
      await supabase.rpc('set_user_role', {
        target_id: targetId,
        new_role: updates.role,
        target_shop: updates.shopId || updates.shop_id || null
      });
    } catch (e) { }
  }

  // 2. Direct Update to BOTH tables: foody_logged_users & foody_users
  const patchPayload = {
    updated_at: new Date().toISOString()
  };
  if (updates.role !== undefined) patchPayload.role = updates.role;
  if (updates.shopId !== undefined || updates.shop_id !== undefined) patchPayload.shop_id = updates.shopId || updates.shop_id;
  if (updates.shopIds !== undefined || updates.shop_ids !== undefined) patchPayload.shop_ids = updates.shopIds || updates.shop_ids;
  if (updates.displayName !== undefined || updates.display_name !== undefined) patchPayload.display_name = updates.displayName || updates.display_name;
  if (updates.phone !== undefined) patchPayload.phone = updates.phone;
  if (updates.email !== undefined) patchPayload.email = updates.email;
  if (updates.avatarUrl !== undefined || updates.avatar_url !== undefined) patchPayload.avatar_url = updates.avatarUrl || updates.avatar_url;

  // Update in foody_logged_users
  try {
    let r1 = await supabase.from('foody_logged_users').update(patchPayload).eq('id', targetId).select();
    if ((!r1.data || r1.data.length === 0) && resolvedEmail) {
      r1 = await supabase.from('foody_logged_users').update(patchPayload).eq('email', resolvedEmail).select();
    }
    if ((!r1.data || r1.data.length === 0) && resolvedPhone && resolvedPhone.length >= 10) {
      r1 = await supabase.from('foody_logged_users').update(patchPayload).eq('phone', resolvedPhone).select();
    }
    if (!r1.data || r1.data.length === 0) {
      const full = {
        id: targetId,
        display_name: updates.displayName || updates.display_name || userExists?.displayName || resolvedEmail?.split('@')[0] || `User (${targetId.slice(0, 6)})`,
        email: resolvedEmail,
        phone: resolvedPhone,
        avatar_url: patchPayload.avatar_url || userExists?.avatarUrl || '',
        role: updates.role || userExists?.role || 'customer',
        shop_id: updates.shopId || updates.shop_id || userExists?.shopId || 'shop-vrinda-main',
        shop_ids: updates.shopIds || updates.shop_ids || userExists?.shopIds || ['shop-vrinda-main'],
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await supabase.from('foody_logged_users').upsert(full);
    }
  } catch (e) { }

  // Update in foody_users
  try {
    let r2 = await supabase.from('foody_users').update(patchPayload).eq('id', targetId).select();
    if ((!r2.data || r2.data.length === 0) && resolvedEmail) {
      r2 = await supabase.from('foody_users').update(patchPayload).eq('email', resolvedEmail).select();
    }
    if ((!r2.data || r2.data.length === 0) && resolvedPhone && resolvedPhone.length >= 10) {
      r2 = await supabase.from('foody_users').update(patchPayload).eq('phone', resolvedPhone).select();
    }
    if (!r2.data || r2.data.length === 0) {
      const full = {
        id: targetId,
        display_name: updates.displayName || updates.display_name || userExists?.displayName || resolvedEmail?.split('@')[0] || `User (${targetId.slice(0, 6)})`,
        email: resolvedEmail,
        phone: resolvedPhone,
        avatar_url: patchPayload.avatar_url || userExists?.avatarUrl || '',
        role: updates.role || userExists?.role || 'customer',
        shop_id: updates.shopId || updates.shop_id || userExists?.shopId || 'shop-vrinda-main',
        shop_ids: updates.shopIds || updates.shop_ids || userExists?.shopIds || ['shop-vrinda-main'],
        updated_at: new Date().toISOString()
      };
      await supabase.from('foody_users').upsert(full);
    }
  } catch (e) { }

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



