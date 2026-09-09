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
  ORDERS: 2 * 60 * 1000     // 2 minutes
};

const memoryCache = {
  shops: { data: null, timestamp: 0 },
  menus: {}, // [shopId]: { data, timestamp }
  orders: {}, // [shopId]: { data, timestamp }
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
      } catch (e) {}
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
      } catch (e) {}
    }
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
  } catch (e) {}
  return SEED_SHOPS.map(normalizeShop);
}

export function saveCachedShops(shopsList) {
  const normalized = (shopsList || []).map(normalizeShop);
  try {
    localStorage.setItem('foody_cached_shops', JSON.stringify(normalized));
    localStorage.setItem('foody_cache_shops', JSON.stringify({ data: normalized, timestamp: Date.now() }));
  } catch (e) {}
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
    } catch (e) {}
  } else if (type === 'menus') {
    memoryCache.menus[key] = { data, timestamp: now };
    try {
      localStorage.setItem(`foody_cache_menu_${key}`, JSON.stringify({ data, timestamp: now }));
    } catch (e) {}
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
              } catch (e) {}
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
            } catch (e) {}
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isSubscribed = true;
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
    if (!orderId) return () => {};
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

  checkCleanup() {
    if (
      this.orderListeners.size === 0 &&
      this.singleOrderListeners.size === 0 &&
      this.notificationListeners.size === 0 &&
      this.channel
    ) {
      // Keep channel alive with a 15-second debounce before closing to prevent connect/disconnect flapping
      setTimeout(() => {
        if (
          this.orderListeners.size === 0 &&
          this.singleOrderListeners.size === 0 &&
          this.notificationListeners.size === 0 &&
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
  } catch (e) {}
  return SEED_USERS;
}

export function saveCachedUsers(users) {
  try {
    localStorage.setItem('foody_cached_users', JSON.stringify(users));
  } catch (e) {}
  return users;
}

let usersTableAvailable = null; // null: unknown, true: exists, false: missing from remote DB

export function checkUsersTableStatus() {
  return usersTableAvailable;
}

export const USERS_TABLE_SQL_SCHEMA = `-- Run this in your Supabase Project SQL Editor to enable cloud persistence for users:
CREATE TABLE IF NOT EXISTS public.foody_users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    shop_ids JSONB DEFAULT '["shop-vrinda-main"]'::jsonb,
    dev_permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.foody_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read users" ON public.foody_users;
CREATE POLICY "Public read users" ON public.foody_users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write users" ON public.foody_users;
CREATE POLICY "Public write users" ON public.foody_users FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
`;

export async function getCloudUsers() {
  const cached = getCachedUsers();
  if (usersTableAvailable === false) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('foody_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist (HTTP 404 or PostgREST code PGRST205)
      if (error.code === 'PGRST205' || error.message?.includes('does not exist') || error.code === '42P01') {
        usersTableAvailable = false;
      }
      return cached;
    }

    usersTableAvailable = true;
    if (data && data.length > 0) {
      const mapped = data.map(u => ({
        id: u.id,
        displayName: u.display_name || u.displayName || u.email?.split('@')[0] || 'User',
        email: u.email || '',
        phone: u.phone || '',
        role: u.role || 'customer',
        shopId: u.shop_id || u.shopId || 'shop-vrinda-main',
        shopIds: u.shop_ids || u.shopIds || (u.shop_id ? [u.shop_id] : ['shop-vrinda-main']),
        devPermissions: u.dev_permissions || [],
        createdAt: u.created_at
      }));
      saveCachedUsers(mapped);
      return mapped;
    }
    return cached;
  } catch (e) {
    usersTableAvailable = false;
    return cached;
  }
}

export async function createCloudUser(userData) {
  const currentUsers = getCachedUsers();
  const userId = userData.id || `user_${(userData.phone || Date.now()).toString().replace(/\D/g, '')}`;
  const newUser = {
    id: userId,
    displayName: userData.displayName || userData.name || `User (${(userData.phone || '').slice(-4)})`,
    email: userData.email || `${userData.phone || userId}@foodyvrinda.com`,
    phone: userData.phone || '',
    role: userData.role || 'customer',
    shopId: userData.shopId || 'shop-vrinda-main',
    shopIds: userData.shopIds || (userData.shopId ? [userData.shopId] : ['shop-vrinda-main']),
    createdAt: new Date().toISOString()
  };

  const nextList = [newUser, ...currentUsers.filter(u => u.id !== userId)];
  saveCachedUsers(nextList);
  window.dispatchEvent(new CustomEvent('foody_users_changed', { detail: { users: nextList } }));

  if (usersTableAvailable !== false) {
    try {
      const { error } = await supabase
        .from('foody_users')
        .upsert({
          id: newUser.id,
          display_name: newUser.displayName,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          shop_id: newUser.shopId,
          shop_ids: newUser.shopIds
        });
      if (error && (error.code === 'PGRST205' || error.message?.includes('does not exist'))) {
        usersTableAvailable = false;
      }
    } catch (e) {
      usersTableAvailable = false;
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

  const userExists = currentUsers.some(u => 
    (cleanId && String(u.id).trim() === cleanId) || 
    (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail)
  );

  let updatedList;
  if (userExists) {
    updatedList = currentUsers.map(u => {
      if ((cleanId && String(u.id).trim() === cleanId) || (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail)) {
        return { ...u, ...updates, updatedAt: new Date().toISOString() };
      }
      return u;
    });
  } else {
    const newUser = {
      id: cleanId || `user_${Date.now()}`,
      displayName: updates.displayName || 'User',
      email: updates.email || '',
      phone: updates.phone || '',
      role: updates.role || 'customer',
      shopId: updates.shopId || 'shop-vrinda-main',
      shopIds: updates.shopIds || [updates.shopId || 'shop-vrinda-main'],
      ...updates,
      createdAt: new Date().toISOString()
    };
    updatedList = [newUser, ...currentUsers];
  }

  saveCachedUsers(updatedList);
  window.dispatchEvent(new CustomEvent('foody_users_changed', { detail: { users: updatedList } }));

  if (usersTableAvailable !== false && cleanId) {
    try {
      const payload = {
        id: cleanId,
        updated_at: new Date().toISOString()
      };
      if (updates.role !== undefined) payload.role = updates.role;
      if (updates.shopId !== undefined) payload.shop_id = updates.shopId;
      if (updates.shopIds !== undefined) payload.shop_ids = updates.shopIds;
      if (updates.displayName !== undefined) payload.display_name = updates.displayName;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.email !== undefined) payload.email = updates.email;

      const { error } = await supabase
        .from('foody_users')
        .upsert(payload);
      if (error && (error.code === 'PGRST205' || error.message?.includes('does not exist'))) {
        usersTableAvailable = false;
      }
    } catch (e) {
      usersTableAvailable = false;
    }
  }
  return updatedList.find(u => (cleanId && String(u.id).trim() === cleanId) || (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail));
}

export async function deleteCloudUser(userId) {
  const currentUsers = getCachedUsers();
  const updatedList = currentUsers.filter(u => u.id !== userId);
  saveCachedUsers(updatedList);
  window.dispatchEvent(new CustomEvent('foody_users_changed', { detail: { users: updatedList } }));

  if (usersTableAvailable !== false) {
    try {
      const { error } = await supabase
        .from('foody_users')
        .delete()
        .eq('id', userId);
      if (error && (error.code === 'PGRST205' || error.message?.includes('does not exist'))) {
        usersTableAvailable = false;
      }
    } catch (e) {
      usersTableAvailable = false;
    }
  }
  return true;
}

export function subscribeCloudUsers(onUsersUpdate) {
  let channel = null;
  if (usersTableAvailable !== false) {
    try {
      channel = supabase
        .channel('public:foody_users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'foody_users' }, async () => {
          const users = await getCloudUsers();
          if (onUsersUpdate) onUsersUpdate(users);
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            usersTableAvailable = false;
          }
        });
    } catch (e) {
      usersTableAvailable = false;
    }
  }

  const handleLocalChange = (e) => {
    if (e?.detail?.users && onUsersUpdate) {
      onUsersUpdate(e.detail.users);
    }
  };
  window.addEventListener('foody_users_changed', handleLocalChange);

  return () => {
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    }
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
  } catch (e) {}

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
  } catch (e) {}

  try {
    let query = supabase.from('foody_reviews').select('*').order('created_at', { ascending: false }).limit(50);
    if (shopId && shopId !== 'all') {
      query = query.eq('shop_id', shopId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      try {
        localStorage.setItem(localKey, JSON.stringify(data));
      } catch (e) {}
      return data;
    }
    return localData;
  } catch (e) {
    return localData;
  }
}

export const COMPLETE_FOODY_DATABASE_SCHEMA_SQL = `-- Run this in your Supabase SQL Editor to ensure all tables, indexes, and real-time publications are active:

-- 1. FOODY SHOPS TABLE
CREATE TABLE IF NOT EXISTS public.foody_shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    coordinates JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    is_open BOOLEAN DEFAULT true,
    minimum_order_amount NUMERIC DEFAULT 0,
    delivery_charge NUMERIC DEFAULT 0,
    gst_percentage NUMERIC DEFAULT 5,
    alarm_settings JSONB DEFAULT '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FOODY MENUS TABLE
CREATE TABLE IF NOT EXISTS public.foody_menus (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL REFERENCES public.foody_shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    category TEXT DEFAULT 'Meals',
    price NUMERIC NOT NULL DEFAULT 0,
    image TEXT,
    tag TEXT,
    kcal TEXT,
    nutrition JSONB DEFAULT '{"carbs": "30g", "fat": "10g", "protein": "12g", "kcal": "250 kcal"}'::jsonb,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FOODY ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.foody_orders (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL REFERENCES public.foody_shops(id),
    user_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    delivery_address TEXT,
    delivery_coordinates JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    delivery_charge NUMERIC DEFAULT 0,
    gst_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT DEFAULT 'cash',
    payment_id TEXT,
    cash_status TEXT DEFAULT 'pending',
    cooking_notes TEXT,
    created_by TEXT DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FOODY USERS TABLE
CREATE TABLE IF NOT EXISTS public.foody_users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    shop_ids JSONB DEFAULT '["shop-vrinda-main"]'::jsonb,
    dev_permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FOODY REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.foody_reviews (
    id BIGSERIAL PRIMARY KEY,
    order_id TEXT,
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    customer_name TEXT,
    rating INT NOT NULL DEFAULT 5,
    tags JSONB DEFAULT '[]'::jsonb,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. FOODY NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.foody_notifications (
    id TEXT PRIMARY KEY,
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    role TEXT DEFAULT 'all',
    type TEXT DEFAULT 'order_update',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    order_id TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY & PUBLIC READ/WRITE POLICIES
ALTER TABLE public.foody_shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access shops" ON public.foody_shops;
CREATE POLICY "Public access shops" ON public.foody_shops FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access menus" ON public.foody_menus;
CREATE POLICY "Public access menus" ON public.foody_menus FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access orders" ON public.foody_orders;
CREATE POLICY "Public access orders" ON public.foody_orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access users" ON public.foody_users;
CREATE POLICY "Public access users" ON public.foody_users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access reviews" ON public.foody_reviews;
CREATE POLICY "Public access reviews" ON public.foody_reviews FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access notifications" ON public.foody_notifications;
CREATE POLICY "Public access notifications" ON public.foody_notifications FOR ALL USING (true) WITH CHECK (true);

-- ENABLE REALTIME REPLICATION FOR INSTANT DISPATCH
DO $$ BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_shops; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_menus; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
`;


