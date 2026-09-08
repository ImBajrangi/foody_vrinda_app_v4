import { createClient } from '@supabase/supabase-js';

// Supabase Cloud Project Configuration (Foody Vrinda Database)
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

/**
 * 1. SHOPS CLOUD APIS
 */
export async function getCloudShops() {
  try {
    const { data, error } = await supabase
      .from('foody_shops')
      .select('*')
      .order('name');

    if (error || !data || data.length === 0) {
      // Try 'shops' table as fallback
      const fallback = await supabase.from('shops').select('*');
      if (!fallback.error && fallback.data && fallback.data.length > 0) {
        localStorage.setItem('foody_cached_shops', JSON.stringify(fallback.data));
        return fallback.data;
      }
      return SEED_SHOPS;
    }

    localStorage.setItem('foody_cached_shops', JSON.stringify(data));
    return data;
  } catch (err) {
    console.warn('Supabase getCloudShops fallback to cache/seed:', err.message);
    const cached = localStorage.getItem('foody_cached_shops');
    return cached ? JSON.parse(cached) : SEED_SHOPS;
  }
}

/**
 * 2. MENUS CLOUD APIS
 */
export async function getCloudMenus(shopId) {
  try {
    let query = supabase.from('foody_menus').select('*');
    if (shopId) {
      query = query.eq('shop_id', shopId);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Supabase getCloudMenus warning:', err.message);
    return null;
  }
}

/**
 * 3. ORDERS CLOUD APIS
 */
export async function createCloudOrder(orderData) {
  try {
    const orderPayload = {
      ...orderData,
      created_at: new Date().toISOString(),
      status: orderData.status || 'new',
    };

    const { data, error } = await supabase
      .from('foody_orders')
      .insert([orderPayload])
      .select()
      .single();

    if (error) {
      console.warn('Supabase insert order error (falling back):', error.message);
      return { id: 'ord-' + Date.now(), ...orderPayload };
    }
    return data;
  } catch (err) {
    console.warn('createCloudOrder exception:', err.message);
    return { id: 'ord-' + Date.now(), ...orderData, created_at: new Date().toISOString() };
  }
}

export async function updateCloudOrderStatus(orderId, newStatus) {
  try {
    const { data, error } = await supabase
      .from('foody_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
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

/**
 * 4. REALTIME ORDERS SUBSCRIPTION
 */
export function subscribeCloudOrders(shopId, onUpdate) {
  try {
    const channel = supabase
      .channel(`public:foody_orders:${shopId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'foody_orders',
          ...(shopId ? { filter: `shop_id=eq.${shopId}` } : {})
        },
        (payload) => {
          if (onUpdate) onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('subscribeCloudOrders exception:', err.message);
    return () => {};
  }
}
