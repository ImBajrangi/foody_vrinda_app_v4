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
      eventsPerSecond: 15,
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
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
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
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80',
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
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80',
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
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80',
    description: 'Hand-tossed thin crust with fresh tomato basil coulis, diced fresh Malai paneer, bell peppers, sweet corn, and mozzarella cheese.',
    nutrition: { carbs: '42g', fat: '14g', protein: '18g', kcal: '340 kcal' },
    isAvailable: true
  },
  {
    id: 'prasad-5',
    name: 'Vrindavan Special Matka Lassi',
    subtitle: 'Chilled sweet creamy curd',
    category: 'Beverages',
    price: 80,
    kcal: '160 kcal',
    tag: 'Refreshing',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80',
    description: 'Traditional earthen pot churned sweet creamy curd garnished with thick malai rabdi layer, pistachios, and saffron strands.',
    nutrition: { carbs: '24g', fat: '6g', protein: '8g', kcal: '160 kcal' },
    isAvailable: true
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
      return DEFAULT_PRASAD_ITEMS;
    }
    return data.map(d => ({
      id: d.id,
      shopId: d.shop_id,
      name: d.name,
      subtitle: d.subtitle,
      description: d.description,
      category: d.category,
      price: Number(d.price),
      image: d.image || DEFAULT_PRASAD_ITEMS[0].image,
      tag: d.tag,
      kcal: d.kcal || '250 kcal',
      nutrition: d.nutrition || { carbs: '35g', fat: '12g', protein: '16g', kcal: '250 kcal' },
      isAvailable: d.is_available ?? true
    }));
  } catch (err) {
    console.warn('Supabase getCloudMenus warning:', err.message);
    return DEFAULT_PRASAD_ITEMS;
  }
}

/**
 * 3. ORDERS CLOUD APIS & DISPATCH
 */
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
      status: newStatus,
      updated_at: new Date().toISOString(),
      ...extra
    };
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

/**
 * 4. REALTIME ORDERS SUBSCRIPTION (FOR ALL DESKS)
 */
export function subscribeCloudOrders(shopId, onUpdate) {
  try {
    const channelId = `foody-orders-${shopId || 'all'}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'foody_orders',
          ...(shopId && shopId !== 'all' ? { filter: `shop_id=eq.${shopId}` } : {})
        },
        (payload) => {
          if (onUpdate) onUpdate(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Connected cleanly
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('subscribeCloudOrders exception:', err.message);
    return () => {};
  }
}

/**
 * 5. REALTIME SINGLE ORDER TRACKER (FOR DEVOTEES)
 */
export function subscribeSingleCloudOrder(orderId, onUpdate) {
  if (!orderId) return () => {};
  try {
    const channelId = `foody-order-${orderId}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'foody_orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          if (onUpdate && payload.new) {
            onUpdate({
              id: payload.new.id,
              ...payload.new,
              shopId: payload.new.shop_id,
              customerName: payload.new.customer_name,
              customerPhone: payload.new.customer_phone,
              deliveryAddress: payload.new.delivery_address,
              deliveryCoordinates: payload.new.delivery_coordinates,
              totalAmount: payload.new.total_amount,
              paymentMethod: payload.new.payment_method
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('subscribeSingleCloudOrder exception:', err.message);
    return () => {};
  }
}

/**
 * 6. REALTIME NOTIFICATIONS (DEVOTEE, KITCHEN, RIDERS)
 */
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

export function subscribeCloudNotifications(userId, onNotification) {
  try {
    const channelId = `foody-notifs-${userId || 'broadcast'}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'foody_notifications',
          ...(userId ? { filter: `user_id=eq.${userId}` } : {})
        },
        (payload) => {
          if (onNotification && payload.new) {
            onNotification({
              id: payload.new.id,
              userId: payload.new.user_id,
              role: payload.new.role,
              shopId: payload.new.shop_id,
              orderId: payload.new.order_id,
              message: payload.new.message,
              read: payload.new.read,
              createdAt: payload.new.created_at
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('subscribeCloudNotifications exception:', err.message);
    return () => {};
  }
}

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
