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
    alarmSettings: { kitchenNew: true, kitchenReady: false, deliveryReady: true }
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
    alarmSettings: { kitchenNew: true, kitchenReady: true, deliveryReady: true }
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
    alarmSettings: { kitchenNew: true, kitchenReady: false, deliveryReady: true }
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
    tag: 'Devotee Favorite',
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

function setCachedItem(type, key, data) {
  const now = Date.now();
  if (type === 'shops') {
    memoryCache.shops = { data, timestamp: now };
    try {
      localStorage.setItem('foody_cache_shops', JSON.stringify({ data, timestamp: now }));
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
  const cached = getCachedItem('shops');
  if (cached) return cached;

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

      if (error || !data || data.length === 0) {
        return SEED_SHOPS;
      }
      setCachedItem('shops', 'default', data);
      return data;
    } catch (err) {
      console.warn('Supabase getCloudShops fallback:', err.message);
      return SEED_SHOPS;
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
      customer_name: orderData.customerName || 'Devotee',
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
      created_by: orderData.createdBy || orderData.customerName || 'Devotee',
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
      updated_at: new Date().toISOString(),
      ...extra
    };
    if (newStatus) payload.status = newStatus;

    const { data, error } = await supabase
      .from('foody_orders')
      .update(payload)
      .eq('id', orderId)
      .select();

    if (error) {
      console.warn('updateCloudOrderStatus error:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('updateCloudOrderStatus exception:', err.message);
    return null;
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

          // Broadcast to single-order devotees
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
  try {
    const payload = {};
    if (shopData.name !== undefined) payload.name = shopData.name;
    if (shopData.address !== undefined) payload.address = shopData.address;
    if (shopData.minimumOrderAmount !== undefined) payload.minimum_order_amount = Number(shopData.minimumOrderAmount);
    if (shopData.deliveryCharge !== undefined) payload.delivery_charge = Number(shopData.deliveryCharge);
    if (shopData.gstPercentage !== undefined) payload.gst_percentage = Number(shopData.gstPercentage);
    if (shopData.coordinates !== undefined) payload.coordinates = shopData.coordinates;
    if (shopData.isOpen !== undefined) payload.is_open = shopData.isOpen;

    const { data, error } = await supabase
      .from('foody_shops')
      .update(payload)
      .eq('id', shopId)
      .select();

    invalidateCache('shops');
    if (error) {
      console.warn('updateCloudShop warning:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('updateCloudShop exception:', err.message);
    return null;
  }
}

export async function markCloudOrderCashCollected(orderId) {
  return updateCloudOrderStatus(orderId, undefined, { cash_status: 'collected' });
}
