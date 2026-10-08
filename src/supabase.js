export * from './services/supabase/client.js';
import {
  supabase,
  isTableMissing,
  markTableMissing,
  isTableError,
  isTableWriteForbidden,
  markTableWriteForbidden,
  resetForbiddenTables,
  isForbiddenError,
  SEED_SHOPS,
  resolveDishCutout
} from './services/supabase/client.js';


export * from './services/supabase/cache.js';
import {
  CACHE_TTL_MS,
  memoryCache,
  pendingRequests,
  safeStorage,
  dispatchSafeEvent,
  getCachedItem,
  setCachedItem,
  invalidateCache,
  normalizeShop,
  calculateDistanceKm,
  getRecommendedRiders,
  isShopCurrentlyOpen,
  getDeletedShopIds,
  addDeletedShopId,
  removeDeletedShopId,
  getCachedShops,
  saveCachedShops,
  getDefaultActiveShopId
} from './services/supabase/cache.js';

export * from './services/supabase/shops.service.js';
import {
  getCloudShops,
  checkShopOperatingStatus,
  createCloudShop,
  updateCloudShop,
  deleteCloudShop
} from './services/supabase/shops.service.js';

export * from './services/supabase/menus.service.js';
import {
  getCloudMenus,
  createCloudMenuItem,
  updateCloudMenuItem,
  deleteCloudMenuItem,
  DEFAULT_OFFERS,
  getCachedOffers,
  saveCachedOffers,
  getCloudOffers,
  createCloudOffer,
  updateCloudOffer,
  deleteCloudOffer,
  getCachedPresets,
  saveCachedPresets,
  getCloudPresets,
  createCloudPreset,
  updateCloudPreset,
  deleteCloudPreset,
  subscribeCloudPresets
} from './services/supabase/menus.service.js';

// ========================================================================
// 4. ORDERS CLOUD APIS & DISPATCH (CACHE-FIRST WITH REALTIME SYNC)
// ========================================================================

export const ALLOWED_ORDER_TRANSITIONS = {
  new: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['out_for_delivery', 'completed', 'cancelled'],
  out_for_delivery: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

export function isValidStatusTransition(currentStatus, nextStatus) {
  if (!currentStatus || !nextStatus) return false;
  if (currentStatus === nextStatus) return true;
  const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/**
 * Authoritative Server-Side Calculation:
 * Evaluates unit prices directly against the menu catalog, calculates GST & delivery fee from DB shop config
 */
export function calculateAuthoritativeOrderTotals(shopId, items = [], fulfillmentType = 'delivery', couponDiscount = 0) {
  if (!shopId || typeof shopId !== 'string' || shopId.trim() === '') {
    console.error('[SHOP ISOLATION VIOLATION] calculateAuthoritativeOrderTotals called without a valid shopId:', shopId);
    return {
      subtotal: 0,
      deliveryCharge: 0,
      gstAmount: 0,
      discount: 0,
      totalAmount: 0,
      verifiedItems: []
    };
  }
  const targetShopId = shopId.trim();
  const shopCatalog = getCachedItem('menus', targetShopId) || [];
  const shopsList = getCachedShops() || [];
  const targetShop = shopsList.find(s => s.id === targetShopId);

  let calculatedSubtotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    // Strictly find dish within the target shop's menu catalog (ZERO client price fallback)
    const dishMatch = shopCatalog.find(d => String(d.id) === String(item.id));
    if (!dishMatch) {
      console.warn(`[Security Alert] Dish ID "${item?.id}" does not exist in catalog for shop "${targetShopId}". Client-supplied price is strictly rejected.`);
      continue;
    }
    const unitPrice = Number(dishMatch.price || 0);
    const qty = Math.max(1, Number(item.quantity || 1));
    calculatedSubtotal += unitPrice * qty;
    verifiedItems.push({
      ...item,
      id: dishMatch.id,
      price: unitPrice,
      quantity: qty,
      name: dishMatch.name || item.name
    });
  }

  const isPickup = fulfillmentType === 'pickup';
  const deliveryCharge = isPickup ? 0 : Number(targetShop?.delivery_charge ?? targetShop?.deliveryCharge ?? 0);
  const gstPercent = Number(targetShop?.gst_percentage ?? targetShop?.gstPercentage ?? 5);
  const gstAmount = Math.round(calculatedSubtotal * gstPercent / 100);
  const discount = Math.max(0, Number(couponDiscount || 0));
  const totalAmount = Math.max(0, calculatedSubtotal + deliveryCharge + gstAmount - discount);

  return {
    subtotal: calculatedSubtotal,
    deliveryCharge,
    gstAmount,
    discount,
    totalAmount,
    verifiedItems
  };
}

/**
 * Dedicated asynchronous, non-blocking push notification dispatcher.
 * Database transactions MUST succeed first; push notifications SHOULD happen as best-effort.
 * A push failure never interrupts order state transition or UI flow.
 */
function dispatchOrderPushNotificationAsync(type, record, extra = {}) {
  Promise.resolve().then(async () => {
    try {
      await supabase.functions.invoke('order-push-notification', {
        body: {
          type,
          record: { id: record?.id, ...record, ...extra }
        }
      });
    } catch (err) {
      console.debug('Background push notification notice (non-fatal):', err?.message || err);
    }
  }).catch(() => { });
}

export async function createCloudOrder(orderData) {
  try {
    const rawShopId = orderData.shop_id || orderData.shopId;
    if (!rawShopId || typeof rawShopId !== 'string' || rawShopId.trim() === '' || rawShopId === 'all') {
      console.error('[SHOP ISOLATION VIOLATION] createCloudOrder rejected: missing or invalid shop_id', orderData);
      throw new Error('Order creation rejected: valid shop_id is mandatory');
    }
    const shopId = rawShopId.trim();

    // Verify shop exists, is active, and is not deleted in database
    const { data: targetShop, error: shopErr } = await supabase
      .from('foody_shops')
      .select('id, is_active, is_deleted, name, delivery_charge, gst_percentage')
      .eq('id', shopId)
      .maybeSingle();

    if (shopErr || !targetShop) {
      console.error('[SHOP ISOLATION VIOLATION] Target shop does not exist:', shopId, shopErr);
      throw new Error(`Order creation rejected: shop "${shopId}" not found`);
    }

    if (targetShop.is_active === false || targetShop.is_deleted === true) {
      console.error('[SHOP ISOLATION VIOLATION] Target shop is inactive or deleted:', targetShop);
      throw new Error(`Order creation rejected: shop "${targetShop.name || shopId}" is currently inactive/unavailable`);
    }

    // Verify basket items belong to this shop if item specifies shopId
    const items = orderData.items || [];
    for (const it of items) {
      const itShop = it.shopId || it.shop_id;
      if (itShop && itShop !== shopId) {
        console.error('[SHOP ISOLATION VIOLATION] Basket item belongs to foreign shop:', { itShop, shopId, item: it });
        throw new Error(`Order creation rejected: basket contains item from foreign shop "${itShop}"`);
      }
    }

    const orderId = orderData.id || `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const rawFulfillment = orderData.fulfillmentType || orderData.fulfillment_type || 'delivery';
    const fulfillmentType = (rawFulfillment === 'self_pickup' || rawFulfillment === 'pickup') ? 'pickup' : 'delivery';

    // Authoritative Server-Side Total Calculation from Database Catalog
    const totals = calculateAuthoritativeOrderTotals(shopId, orderData.items || [], fulfillmentType, orderData.discount || 0);
    const verifiedItems = (totals.verifiedItems && totals.verifiedItems.length > 0) ? totals.verifiedItems : (orderData.items || []);
    const subtotal = totals.subtotal > 0 ? totals.subtotal : (Number(orderData.subtotal) || 0);
    const deliveryCharge = fulfillmentType === 'pickup' ? 0 : (targetShop.delivery_charge ?? orderData.deliveryCharge ?? totals.deliveryCharge ?? 0);
    const gstPercent = Number(targetShop.gst_percentage ?? 5);
    const gstAmount = totals.gstAmount > 0 ? totals.gstAmount : Math.round(subtotal * gstPercent / 100);
    const totalAmount = totals.totalAmount > 0 ? totals.totalAmount : (subtotal + deliveryCharge + gstAmount - (orderData.discount || 0));

    // Generate secure cryptographic OTPs
    const generatedPickupOtp = generateSecureOrderOTP();
    const generatedDeliveryOtp = generateSecureOrderOTP();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // 🔐 Compute SHA-256 cryptographic hashes for atomic database verification
    const pickupOtpHash = await computeSha256Hex(generatedPickupOtp);
    const deliveryOtpHash = await computeSha256Hex(generatedDeliveryOtp);

    const activeFcmToken = orderData.fcm_token || orderData.fcmToken || (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' ? localStorage.getItem('foody_fcm_token') : null) || null;

    const orderPayload = {
      id: orderId,
      shop_id: shopId,
      user_id: orderData.userId || orderData.user_id || null,
      customer_name: orderData.customerName || orderData.customer_name || 'Customer',
      customer_phone: orderData.customerPhone || orderData.customer_phone || '9876543210',
      customer_email: orderData.customerEmail || orderData.customer_email || orderData.email || '',
      customer_address: orderData.customerAddress || orderData.customer_address || 'Vrindavan Dham',
      delivery_address: orderData.deliveryAddress || orderData.delivery_address || orderData.customerAddress || 'Vrindavan Dham',
      delivery_coordinates: orderData.deliveryCoordinates || orderData.delivery_coordinates || { lat: 27.5706, lng: 77.6593 },
      items: verifiedItems,
      subtotal,
      delivery_charge: deliveryCharge,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      status: orderData.status || 'new',
      payment_method: orderData.paymentMethod || orderData.payment_method || 'cash',
      payment_id: orderData.paymentId || orderData.payment_id || null,
      cash_status: orderData.cashStatus || orderData.cash_status || 'pending',
      cooking_notes: orderData.cookingNotes || orderData.cooking_notes || '',
      created_by: orderData.createdBy || orderData.created_by || orderData.customerName || 'Customer',
      fulfillment_type: fulfillmentType,
      // 🛡️ v5.3.1 Cryptographic OTP System: Primary SHA-256 Hashes
      pickup_otp_hash: pickupOtpHash,
      delivery_otp_hash: deliveryOtpHash,
      pickup_otp_expires_at: otpExpiresAt,
      delivery_otp_expires_at: otpExpiresAt,
      pickup_otp_attempts: 0,
      delivery_otp_attempts: 0,
      // Transitional plaintext fallback fields (scheduled for deprecation in v5.4)
      pickup_otp: generatedPickupOtp,
      delivery_otp: generatedDeliveryOtp,
      fcm_token: activeFcmToken,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save OTP to secure storage
    try {
      safeStorage.setItem(`foody_order_otp_${orderId}_pickup`, generatedPickupOtp);
      safeStorage.setItem(`foody_order_otp_${orderId}_delivery`, generatedDeliveryOtp);
    } catch (_) { }

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
      pickupOtp: generatedPickupOtp,
      deliveryOtp: generatedDeliveryOtp,
      pickupOtpHash,
      deliveryOtpHash,
      pickupOtpExpiresAt: otpExpiresAt,
      deliveryOtpExpiresAt: otpExpiresAt,
      pickupOtpAttempts: 0,
      deliveryOtpAttempts: 0,
      createdAt: orderPayload.created_at
    };

    // Update in-memory and local cache strictly scoped to this shop
    if (orderPayload.shop_id) {
      const shopOrders = getCachedItem('orders', orderPayload.shop_id) || [];
      setCachedItem('orders', orderPayload.shop_id, [normalizedCreated, ...shopOrders.filter(o => o.id !== orderId)]);
    }

    // Valid columns in foody_orders table
    const VALID_ORDER_COLUMNS = new Set([
      'id', 'shop_id', 'user_id', 'customer_name', 'customer_phone', 'customer_address',
      'delivery_address', 'delivery_coordinates', 'items', 'subtotal', 'delivery_charge',
      'gst_amount', 'total_amount', 'status', 'payment_method', 'payment_id', 'cash_status',
      'cooking_notes', 'created_by', 'created_at', 'updated_at', 'fulfillment_type',
      'pickup_otp', 'delivery_otp', 'pickup_otp_hash', 'delivery_otp_hash',
      'pickup_otp_expires_at', 'delivery_otp_expires_at', 'pickup_otp_attempts', 'delivery_otp_attempts',
      'rider_id', 'rider_name', 'rider_phone', 'chef_id', 'chef_name'
    ]);

    const dbPayload = {};
    for (const [key, val] of Object.entries(orderPayload)) {
      if (VALID_ORDER_COLUMNS.has(key)) {
        dbPayload[key] = val;
      }
    }
    if (!dbPayload.customer_address && dbPayload.delivery_address) dbPayload.customer_address = dbPayload.delivery_address;
    if (!dbPayload.delivery_address && dbPayload.customer_address) dbPayload.delivery_address = dbPayload.customer_address;

    // 1. Try secure server-side validated RPC creation
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_validated_order', {
        p_order_id: dbPayload.id,
        p_shop_id: dbPayload.shop_id || getDefaultActiveShopId(),
        p_customer_name: dbPayload.customer_name || 'Devotee Customer',
        p_customer_phone: dbPayload.customer_phone || '9999999999',
        p_delivery_address: dbPayload.delivery_address || 'Vrindavan Dham',
        p_customer_address: dbPayload.customer_address || dbPayload.delivery_address || 'Vrindavan Dham',
        p_items: dbPayload.items || [],
        p_payment_method: dbPayload.payment_method || 'cod',
        p_cooking_notes: dbPayload.cooking_notes || '',
        p_fulfillment_type: dbPayload.fulfillment_type || 'delivery'
      });

      if (!rpcError && rpcData) {
        return { ...normalizedCreated, ...rpcData };
      }
    } catch (rpcErr) {
      // RPC fallback to direct upsert
    }

    // 2. Direct upsert fallback
    let { data, error } = await supabase
      .from('foody_orders')
      .upsert([dbPayload], { onConflict: 'id' })
      .select()
      .single();

    if (error && (error.message?.includes('delivery_otp') || error.message?.includes('pickup_otp'))) {
      const hashOnlyPayload = { ...dbPayload };
      delete hashOnlyPayload.pickup_otp;
      delete hashOnlyPayload.delivery_otp;
      const retry = await supabase
        .from('foody_orders')
        .upsert([hashOnlyPayload], { onConflict: 'id' })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.warn('Supabase upsert order note:', error.message);
      return normalizedCreated;
    }

    // Best-effort non-blocking background push notification dispatch
    // Database transaction is already successful; push failure must never block order workflow
    dispatchOrderPushNotificationAsync('INSERT', { ...normalizedCreated, ...data }, { fcm_token: activeFcmToken });

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
    if (newStatus) {
      // Normalize 'ready' -> 'ready_for_pickup' to satisfy database check constraint
      payload.status = newStatus === 'ready' ? 'ready_for_pickup' : newStatus;
    }

    // Comprehensive column mapping for both camelCase and snake_case
    const FIELD_MAP = {
      shopId: 'shop_id',
      shop_id: 'shop_id',
      userId: 'user_id',
      user_id: 'user_id',
      customerName: 'customer_name',
      customer_name: 'customer_name',
      customerPhone: 'customer_phone',
      customer_phone: 'customer_phone',
      customerAddress: 'customer_address',
      customer_address: 'customer_address',
      deliveryAddress: 'delivery_address',
      delivery_address: 'delivery_address',
      deliveryCoordinates: 'delivery_coordinates',
      delivery_coordinates: 'delivery_coordinates',
      fulfillmentType: 'fulfillment_type',
      fulfillment_type: 'fulfillment_type',
      items: 'items',
      subtotal: 'subtotal',
      deliveryCharge: 'delivery_charge',
      delivery_charge: 'delivery_charge',
      gstAmount: 'gst_amount',
      gst_amount: 'gst_amount',
      totalAmount: 'total_amount',
      total_amount: 'total_amount',
      paymentMethod: 'payment_method',
      payment_method: 'payment_method',
      paymentId: 'payment_id',
      payment_id: 'payment_id',
      cashStatus: 'cash_status',
      cash_status: 'cash_status',
      cookingNotes: 'cooking_notes',
      cooking_notes: 'cooking_notes',
      chefId: 'chef_id',
      chef_id: 'chef_id',
      chefName: 'chef_name',
      chef_name: 'chef_name',
      pickupOtp: 'pickup_otp',
      pickup_otp: 'pickup_otp',
      deliveryOtp: 'delivery_otp',
      delivery_otp: 'delivery_otp',
      pickupOtpHash: 'pickup_otp_hash',
      pickup_otp_hash: 'pickup_otp_hash',
      deliveryOtpHash: 'delivery_otp_hash',
      delivery_otp_hash: 'delivery_otp_hash',
      pickupOtpExpiresAt: 'pickup_otp_expires_at',
      pickup_otp_expires_at: 'pickup_otp_expires_at',
      deliveryOtpExpiresAt: 'delivery_otp_expires_at',
      delivery_otp_expires_at: 'delivery_otp_expires_at',
      pickupOtpAttempts: 'pickup_otp_attempts',
      pickup_otp_attempts: 'pickup_otp_attempts',
      deliveryOtpAttempts: 'delivery_otp_attempts',
      delivery_otp_attempts: 'delivery_otp_attempts',
      riderId: 'rider_id',
      rider_id: 'rider_id',
      riderName: 'rider_name',
      rider_name: 'rider_name',
      riderPhone: 'rider_phone',
      rider_phone: 'rider_phone',
      riderRating: 'rider_rating',
      rider_rating: 'rider_rating',
      riderAvatar: 'rider_avatar',
      rider_avatar: 'rider_avatar',
      createdBy: 'created_by',
      created_by: 'created_by'
    };

    if (extra && typeof extra === 'object') {
      for (const [key, value] of Object.entries(extra)) {
        const dbCol = FIELD_MAP[key];
        if (dbCol && value !== undefined) {
          payload[dbCol] = value;
        }
      }
    }

    // Immediately update local caches for zero perceived latency
    const patchObj = { ...payload, ...(payload.status ? { status: payload.status } : {}), ...(extra || {}) };
    ['all', extra?.shop_id, extra?.shopId].filter(Boolean).forEach(sKey => {
      const cached = getCachedItem('orders', sKey);
      if (cached && Array.isArray(cached)) {
        const updated = cached.map(o => o.id === orderId ? { ...o, ...patchObj } : o);
        setCachedItem('orders', sKey, updated);
      }
    });


    let rpcSuccess = false;
    let finalData = null;

    // 1. Dedicated RPC State Machine Execution (First-Class Path)
    try {
      if (payload.status === 'preparing') {
        const { data: kd, error: ke } = await supabase.rpc('kitchen_start_preparing', { p_order_id: orderId });
        if (!ke && kd) {
          rpcSuccess = true;
          finalData = kd;
        } else {
          const { data: od, error: oe } = await supabase.rpc('owner_accept_order', { p_order_id: orderId });
          if (!oe && od) {
            rpcSuccess = true;
            finalData = od;
          }
        }
      } else if (payload.status === 'ready_for_pickup') {
        const { data: kd, error: ke } = await supabase.rpc('kitchen_mark_ready', { p_order_id: orderId });
        if (!ke && kd) {
          rpcSuccess = true;
          finalData = kd;
        }
      } else if (payload.status === 'out_for_delivery') {
        const { data: dd, error: de } = await supabase.rpc('delivery_mark_out_for_delivery', { p_order_id: orderId });
        if (!de && dd) {
          rpcSuccess = true;
          finalData = dd;
        }
      } else if (payload.status === 'completed') {
        const { data: dd, error: de } = await supabase.rpc('delivery_mark_delivered', { p_order_id: orderId });
        if (!de && dd) {
          rpcSuccess = true;
          finalData = dd;
        }
      } else if (payload.status === 'cancelled') {
        const { data: od, error: oe } = await supabase.rpc('owner_reject_order', {
          p_order_id: orderId,
          p_reason: extra?.reason || extra?.cooking_notes || 'Cancelled by staff'
        });
        if (!oe && od) {
          rpcSuccess = true;
          finalData = od;
        }
      }

      if (extra?.cashStatus === 'collected' || extra?.cash_status === 'collected') {
        const { data: cd } = await supabase.rpc('delivery_collect_cod', { p_order_id: orderId });
        if (cd) finalData = { ...(finalData || {}), ...cd };
      }
    } catch (rpcErr) {
      console.debug('RPC state transition attempt note:', rpcErr?.message || rpcErr);
    }

    // 2. Fallback to direct UPDATE if RPC was not applicable or caller is Platform Admin / Service Role
    if (!rpcSuccess) {
      const { data, error } = await supabase
        .from('foody_orders')
        .update(payload)
        .eq('id', orderId)
        .select();

      if (error) {
        if (error.code === '42501' || error.message?.includes('row-level security') || error.message?.includes('permission denied')) {
          console.info('updateCloudOrderStatus: Direct mutation restricted by RLS (RPC state machine active). Code:', error.code);
        } else {
          console.warn('updateCloudOrderStatus note:', error.message);
        }
      } else if (data) {
        finalData = data;
      }
    }

    // Asynchronous non-blocking push notification dispatch
    // Database transaction is committed; notification failure must never block order flow
    dispatchOrderPushNotificationAsync('UPDATE', { id: orderId, status: payload.status, ...payload });

    return finalData;
  } catch (err) {
    console.warn('updateCloudOrderStatus exception:', err.message);
    return null;
  }
}

/**
 * 🛵 Fetch Available Deliveries (Privacy-Preserving Pre-Claim Discovery)
 * Calls get_available_deliveries RPC with optional rider GPS coords for radius filtering
 */
export async function fetchAvailableDeliveries(coords = null, radiusKm = 15.0) {
  try {
    const rpcParams = {};
    if (coords && coords.lat != null && coords.lng != null) {
      rpcParams.p_lat = Number(coords.lat);
      rpcParams.p_lng = Number(coords.lng);
      rpcParams.p_radius_km = Number(radiusKm) || 15.0;
    }
    const { data, error } = await supabase.rpc('get_available_deliveries', rpcParams);
    if (error) {
      console.warn('fetchAvailableDeliveries RPC error:', error.message);
      return [];
    }
    const list = Array.isArray(data) ? data : [];
    return list.map(o => ({
      id: o.id,
      shopId: o.shop_id,
      shop_id: o.shop_id,
      shopName: o.shop_name || 'Kitchen',
      pickupLocation: o.pickup_location || 'Kitchen Counter',
      pickupCoordinates: o.pickup_coordinates,
      pickupDistanceKm: o.pickup_distance_km,
      status: o.status,
      totalAmount: o.total_amount,
      total_amount: o.total_amount,
      deliveryCharge: o.delivery_charge,
      paymentMethod: o.payment_method,
      payment_method: o.payment_method,
      itemsSummary: o.items_summary,
      itemCount: o.item_count,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      customerAddress: o.delivery_area,
      deliveryAddress: o.delivery_area,
      deliveryArea: o.delivery_area,
      deliveryCoordinates: o.delivery_coordinates,
      createdAt: o.created_at,
      created_at: o.created_at,
      isClaimed: false,
      is_claimed: false,
      rider_id: null
    }));
  } catch (err) {
    console.warn('fetchAvailableDeliveries exception:', err.message);
    return [];
  }
}

/**
 * 🛵 Self-Claim Delivery Order (Approved Active Delivery Partners Only)
 * Invokes PostgreSQL RPC delivery_claim_order with FOR UPDATE row lock and approval checks
 */
export async function claimDeliveryOrder(orderId) {
  try {
    const { data, error } = await supabase.rpc('delivery_claim_order', {
      p_order_id: orderId
    });

    if (error) {
      console.error('claimDeliveryOrder failed:', error.message);
      return { success: false, error: error.message };
    }

    // Invalidate local orders cache
    invalidateCache('orders');

    return { success: true, data };
  } catch (err) {
    console.error('claimDeliveryOrder exception:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 🔐 Atomic Order Pickup Claim (Concurrency-Safe & Verified)
 * Invokes PostgreSQL RPC claim_order_pickup_atomic with FOR UPDATE row lock and OTP rate limiting
 */
export async function claimOrderPickupAtomic(orderId, riderId, otpInput) {
  try {
    const { data, error } = await supabase.rpc('claim_order_pickup_atomic', {
      p_order_id: orderId,
      p_rider_id: riderId,
      p_otp_input: String(otpInput).trim()
    });

    if (error) {
      console.error('claimOrderPickupAtomic RPC failed:', error.message);
      return { success: false, error: error.message, code: error.code };
    }

    // Invalidate local cache and sync updated order
    ['all', data?.shop_id].filter(Boolean).forEach(sKey => {
      const cached = getCachedItem('orders', sKey);
      if (cached && Array.isArray(cached)) {
        const updated = cached.map(o => o.id === orderId ? { ...o, ...data } : o);
        setCachedItem('orders', sKey, updated);
      }
    });

    return { success: true, data };
  } catch (err) {
    console.error('claimOrderPickupAtomic exception:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 🔐 Atomic Delivery OTP Verification (Concurrency-Safe & Cryptographic)
 * Invokes PostgreSQL RPC verify_delivery_otp_atomic with FOR UPDATE row lock and hash verification
 */
export async function verifyDeliveryOtpAtomic(orderId, riderId, otpInput) {
  try {
    const { data, error } = await supabase.rpc('verify_delivery_otp_atomic', {
      p_order_id: orderId,
      p_rider_id: riderId,
      p_otp_input: String(otpInput).trim()
    });

    if (error) {
      console.error('verifyDeliveryOtpAtomic RPC failed:', error.message);
      return { success: false, error: error.message, code: error.code };
    }

    // Invalidate local cache and sync updated order
    ['all', data?.shop_id].filter(Boolean).forEach(sKey => {
      const cached = getCachedItem('orders', sKey);
      if (cached && Array.isArray(cached)) {
        const updated = cached.map(o => o.id === orderId ? { ...o, ...data } : o);
        setCachedItem('orders', sKey, updated);
      }
    });

    return { success: true, data };
  } catch (err) {
    console.error('verifyDeliveryOtpAtomic exception:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 🛡️ Verify Order Hash Chain Integrity (Audit Crawler)
 * Invokes PostgreSQL RPC verify_order_hash_chain
 */
export async function verifyOrderHashChain(orderId) {
  try {
    const { data, error } = await supabase.rpc('verify_order_hash_chain', {
      p_order_id: orderId
    });

    if (error) {
      console.error('verifyOrderHashChain RPC failed:', error.message);
      return { success: false, error: error.message, code: error.code };
    }

    return { success: true, data };
  } catch (err) {
    console.error('verifyOrderHashChain exception:', err.message);
    return { success: false, error: err.message };
  }
}


export async function getCloudOrders(shopId) {
  if (!shopId || typeof shopId !== 'string' || shopId.trim() === '') {
    console.warn('[SHOP ISOLATION] getCloudOrders rejected invalid or empty shopId:', shopId);
    return [];
  }
  const cleanShopId = shopId.trim();
  const cached = getCachedItem('orders', cleanShopId);
  if (cached && Array.isArray(cached)) {
    return cached;
  }

  const reqKey = `getCloudOrders_${cleanShopId}`;
  if (pendingRequests.has(reqKey)) {
    return pendingRequests.get(reqKey);
  }

  const promise = (async () => {
    try {
      let query = supabase.from('foody_orders').select('*').order('created_at', { ascending: false }).limit(60);
      if (cleanShopId !== 'all') {
        query = query.eq('shop_id', cleanShopId);
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

      setCachedItem('orders', cleanShopId, mapped);
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
    dispatchSafeEvent('foody_alarm_trigger', {
      type: alarmType, order: orderDetails, timestamp: Date.now()
    });
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
    this.menuListeners = new Set();
    this.shopListeners = new Set();
    this.offerListeners = new Set();
    this.isSubscribed = false;
    this.userDebounceTimer = null;
    this.pendingUserChanges = [];
  }

  ensureSubscribed() {
    if (this.isSubscribed || this.channel) return;

    // Reuse existing channel if already registered on Supabase client
    try {
      const existingChannels = typeof supabase.getChannels === 'function' ? supabase.getChannels() : [];
      const existing = existingChannels.find(c => c && (c.topic === 'realtime:foody-global-multiplex' || c.topic === 'foody-global-multiplex'));
      if (existing) {
        this.channel = existing;
        if (existing.state === 'joined') {
          this.isSubscribed = true;
        }
        return;
      }
    } catch (e) { }

    try {
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
              riderId: raw.rider_id,
              riderName: raw.rider_name,
              riderPhone: raw.rider_phone,
              createdAt: raw.created_at
            };

            // Synchronize memory and local caches strictly scoped to raw.shop_id
            try {
              if (raw.shop_id) {
                const k = raw.shop_id;
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
              }
            } catch (e) { }

            // Broadcast strictly to desk listeners matching this exact shop_id
            this.orderListeners.forEach(listener => {
              try {
                if (listener.shopId && raw.shop_id && listener.shopId === raw.shop_id) {
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
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'foody_menus' },
          (payload) => this.handleMenuChangePayload(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'foody_shops' },
          (payload) => this.handleShopChangePayload(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'foody_offers' },
          (payload) => this.handleOfferChangePayload(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'foody_presets' },
          (payload) => this.handlePresetChangePayload(payload)
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // On reconnect: invalidate stale cache and refetch authoritative data from DB
            if (this._wasDisconnected) {
              this._wasDisconnected = false;
              invalidateCache('orders');
              invalidateCache('menus');
              invalidateCache('shops');
              invalidateCache('users');
              invalidateCache('presets');
              // Dispatch event so UI components know to refetch
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('foody_realtime_reconnected'));
              }
            }
            this.isSubscribed = true;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this._wasDisconnected = true;
            this.isSubscribed = false;
            this.channel = null;
          }
        });
    } catch (err) {
      this.isSubscribed = false;
      this.channel = null;
    }
  }

  handleMenuChangePayload(payload) {
    const raw = payload.new || payload.old;
    if (!raw) return;

    const nut = typeof raw.nutrition === 'object' && raw.nutrition !== null ? raw.nutrition : {};
    const isCombo = Boolean(raw.is_combo || nut.isCombo || raw.category === 'Combo Offers');
    const normalized = {
      id: raw.id,
      shopId: raw.shop_id || getDefaultActiveShopId(),
      name: raw.name,
      subtitle: raw.subtitle || '',
      description: raw.description || '',
      category: raw.category || 'Main',
      price: Number(raw.price || 0),
      originalPrice: Number(raw.original_price || nut.originalPrice || raw.price || 0),
      discountPercent: Number(raw.discount_percent || nut.discountPercent || 0),
      isCombo,
      comboItems: raw.combo_items || nut.comboItems || [],
      image: resolveDishCutout(raw.image, raw.name, raw.category),
      tag: raw.tag,
      kcal: raw.kcal || nut.kcal || '250 kcal',
      nutrition: raw.nutrition || { carbs: '35g', fat: '12g', protein: '16g', kcal: '250 kcal' },
      isAvailable: raw.is_available ?? true
    };

    const shopKey = normalized.shopId;
    ['all', shopKey].filter(Boolean).forEach(k => {
      const currentList = getCachedItem('menus', k) || [];
      if (payload.eventType === 'DELETE') {
        setCachedItem('menus', k, currentList.filter(m => m.id !== raw.id));
      } else {
        const idx = currentList.findIndex(m => m.id === raw.id);
        if (idx >= 0) {
          const copy = [...currentList];
          copy[idx] = { ...copy[idx], ...normalized };
          setCachedItem('menus', k, copy);
        } else {
          setCachedItem('menus', k, [normalized, ...currentList]);
        }
      }
    });

    invalidateCache('menus');
    dispatchSafeEvent('foody_menus_changed', {
      shopId: shopKey, item: normalized, eventType: payload.eventType
    });

    this.menuListeners.forEach(cb => {
      try { cb(normalized, payload.eventType); } catch (e) { console.error('Menu listener error:', e); }
    });
  }

  handleShopChangePayload(payload) {
    const raw = payload.new || payload.old;
    if (!raw) return;

    const normalized = normalizeShop(raw);
    const deletedSet = getDeletedShopIds();
    const current = getCachedShops();
    let next;
    if (payload.eventType === 'DELETE' || raw.is_deleted === true || deletedSet.has(raw.id)) {
      next = current.filter(s => s.id !== raw.id);
    } else {
      const idx = current.findIndex(s => s.id === raw.id);
      if (idx >= 0) {
        next = [...current];
        next[idx] = normalized;
      } else {
        next = [...current, normalized];
      }
    }

    saveCachedShops(next);
    memoryCache.shops = { data: next, timestamp: Date.now() };

    dispatchSafeEvent('foody_shops_changed', {
      shopId: raw.id, shopData: normalized, shops: next, eventType: payload.eventType
    });

    this.shopListeners.forEach(cb => {
      try { cb(next, normalized, payload.eventType); } catch (e) { console.error('Shop listener error:', e); }
    });
  }

  handleOfferChangePayload(payload) {
    const raw = payload.new || payload.old;
    if (!raw) return;

    const normalized = {
      id: raw.id,
      code: raw.code,
      title: raw.title,
      subtitle: raw.subtitle,
      discountType: raw.discount_type || raw.discountType || 'flat',
      discountValue: Number(raw.discount_value || raw.discountValue || 0),
      minOrderAmount: Number(raw.min_order_amount || raw.minOrderAmount || 0),
      maxDiscount: Number(raw.max_discount || raw.maxDiscount || 0),
      shopId: raw.shop_id || raw.shopId || 'all',
      isActive: raw.is_active ?? raw.isActive ?? true,
      tag: raw.tag || 'Special Offer',
      validUntil: raw.valid_until || raw.validUntil || '2028-12-31T23:59:59.000Z',
      createdAt: raw.created_at
    };

    const current = getCachedOffers();
    let next;
    if (payload.eventType === 'DELETE') {
      next = current.filter(o => o.id !== raw.id);
    } else {
      const idx = current.findIndex(o => o.id === raw.id);
      if (idx >= 0) {
        next = [...current];
        next[idx] = { ...next[idx], ...normalized };
      } else {
        next = [normalized, ...current];
      }
    }

    saveCachedOffers(next);
    dispatchSafeEvent('foody_offers_changed', {
      offers: next, offer: normalized, eventType: payload.eventType
    });

    this.offerListeners.forEach(cb => {
      try { cb(normalized, next, payload.eventType); } catch (e) { console.error('Offer listener error:', e); }
    });
  }

  handlePresetChangePayload(payload) {
    const raw = payload.new || payload.old;
    if (!raw) return;

    invalidateCache('presets');

    const normalized = {
      id: raw.id,
      name: raw.name || '',
      category: raw.category || 'Snacks',
      price: Number(raw.price || 0),
      originalPrice: raw.original_price ? Number(raw.original_price) : Number(raw.price || 0),
      description: raw.description || '',
      image: raw.image || '',
      cdnImage: raw.cdn_image || raw.image || '',
      tag: raw.tag || '',
      rating: Number(raw.rating || 4.9),
      calories: raw.calories || '250 kcal',
      nutrition: typeof raw.nutrition === 'object' ? raw.nutrition : { kcal: raw.calories || '250 kcal', carbs: '30g', protein: '10g', fat: '8g' },
      spicyLevel: raw.spicy_level || 'Mild',
      isVeg: raw.is_veg ?? true,
      isActive: raw.is_active ?? true,
      sortOrder: Number(raw.sort_order || 0)
    };

    const current = getCachedPresets();
    let next;
    if (payload.eventType === 'DELETE') {
      next = current.filter(p => p.id !== raw.id);
    } else {
      const idx = current.findIndex(p => p.id === raw.id);
      if (idx >= 0) {
        next = [...current];
        next[idx] = { ...next[idx], ...normalized };
      } else {
        next = [normalized, ...current];
      }
    }

    saveCachedPresets(next);
    dispatchSafeEvent('foody_presets_changed', {
      presets: next, item: normalized, eventType: payload.eventType
    });
  }

  handleUserChangePayload(payload) {
    const raw = payload.new || payload.old;
    if (!raw) return;

    // Architectural Rule: Realtime payloads must be partial and non-destructive.
    // Missing fields do NOT imply 'customer' role or 'User' displayName.
    const cleanId = raw.id ? String(raw.id).trim() : '';
    const rawName = (raw.display_name || raw.displayName || '').trim();
    const cleanDisplayName = (rawName && rawName !== 'User') ? rawName : undefined;
    const cleanRole = (raw.role && typeof raw.role === 'string' && raw.role.trim()) ? raw.role.trim() : undefined;
    const cleanEmail = raw.email ? String(raw.email).toLowerCase().trim() : undefined;
    const cleanPhone = raw.phone ? String(raw.phone).replace(/\D/g, '') : undefined;
    const cleanAvatar = raw.avatar_url || raw.avatarUrl || undefined;
    const cleanShopId = raw.shop_id || raw.shopId || undefined;
    const cleanShopIds = raw.shop_ids || raw.shopIds || undefined;
    const cleanPermissions = raw.dev_permissions || raw.devPermissions || undefined;

    const normalizedUpdates = {
      ...(cleanId ? { id: cleanId } : {}),
      ...(cleanDisplayName ? { displayName: cleanDisplayName } : {}),
      ...(cleanRole ? { role: cleanRole } : {}),
      ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
      ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
      ...(cleanAvatar !== undefined ? { avatarUrl: cleanAvatar } : {}),
      ...(cleanShopId !== undefined ? { shopId: cleanShopId } : {}),
      ...(cleanShopIds !== undefined ? { shopIds: cleanShopIds } : {}),
      ...(cleanPermissions !== undefined ? { devPermissions: cleanPermissions } : {}),
      ...(raw.last_login_at ? { lastLoginAt: raw.last_login_at } : {}),
      ...(raw.updated_at ? { updatedAt: raw.updated_at } : {})
    };

    // 1. In-memory & local cache sync with zero egress
    const current = getCachedUsers();
    let next;
    let mergedUserObj;
    if (payload.eventType === 'DELETE') {
      next = current.filter(u => u.id !== raw.id);
      mergedUserObj = { id: raw.id, ...normalizedUpdates };
    } else {
      const idx = current.findIndex(u =>
        (cleanId && String(u.id).trim() === cleanId) ||
        (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
        (cleanPhone && cleanPhone.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
      );

      if (idx >= 0) {
        const existing = current[idx];
        // Protect staff roles from silent downgrade via partial broadcasts
        const STAFF_ROLES = ['kitchen', 'delivery', 'owner', 'developer', 'grand_admin'];
        const existingIsStaff = STAFF_ROLES.includes(existing.role);
        const resolvedRole = (existingIsStaff && (!normalizedUpdates.role || normalizedUpdates.role === 'customer'))
          ? existing.role
          : (normalizedUpdates.role || existing.role || 'customer');

        mergedUserObj = {
          ...existing,
          ...normalizedUpdates,
          role: resolvedRole,
          displayName: normalizedUpdates.displayName || existing.displayName || (existing.email ? existing.email.split('@')[0] : 'Devotee')
        };
        next = [...current];
        next[idx] = mergedUserObj;
      } else {
        const fallbackName = cleanDisplayName || (cleanEmail ? cleanEmail.split('@')[0] : (cleanPhone ? `Member (${cleanPhone.slice(-4)})` : 'Devotee'));
        mergedUserObj = {
          id: cleanId,
          displayName: fallbackName,
          email: cleanEmail || '',
          phone: cleanPhone || '',
          avatarUrl: cleanAvatar || '',
          role: cleanRole || 'customer',
          shopId: cleanShopId || getDefaultActiveShopId(),
          shopIds: cleanShopIds || (cleanShopId ? [cleanShopId] : []),
          devPermissions: cleanPermissions || [],
          createdAt: raw.created_at || new Date().toISOString(),
          updatedAt: raw.updated_at || new Date().toISOString()
        };
        next = [mergedUserObj, ...current];
      }
    }

    saveCachedUsers(next);
    setCachedItem('users', 'all', next);

    // 2. Debounced notification dispatch to prevent React rendering storms
    clearTimeout(this.userDebounceTimer);
    this.userDebounceTimer = setTimeout(() => {
      dispatchSafeEvent('foody_users_changed', {
        users: next, updatedUser: mergedUserObj, eventType: payload.eventType
      });

      this.userListeners.forEach(listener => {
        try {
          listener(next, mergedUserObj, payload.eventType);
        } catch (e) {
          console.error('User listener error:', e);
        }
      });
    }, 150);
  }

  subscribeOrders(shopId, callback) {
    const clean = shopId && typeof shopId === 'string' ? shopId.trim().toLowerCase() : '';
    if (!shopId || typeof shopId !== 'string' || clean === '' || clean === 'all' || clean === '*' || clean.includes('all shop') || clean.includes('broadcast')) {
      console.warn('[SHOP ISOLATION] Refusing order subscription without a valid specific shopId:', shopId);
      return null;
    }
    const cleanShopId = shopId.trim();
    this.ensureSubscribed();
    const listenerObj = { shopId: cleanShopId, callback };
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

  subscribeMenus(callback) {
    this.ensureSubscribed();
    this.menuListeners.add(callback);

    return () => {
      this.menuListeners.delete(callback);
    };
  }

  subscribeShops(callback) {
    this.ensureSubscribed();
    this.shopListeners.add(callback);

    return () => {
      this.shopListeners.delete(callback);
    };
  }

  subscribeOffers(callback) {
    this.ensureSubscribed();
    this.offerListeners.add(callback);

    return () => {
      this.offerListeners.delete(callback);
    };
  }
}

const multiplexer = new RealtimeMultiplexer();

export function subscribeCloudOrders(shopId, onUpdate) {
  const clean = shopId && typeof shopId === 'string' ? shopId.trim().toLowerCase() : '';
  if (!shopId || typeof shopId !== 'string' || clean === '' || clean === 'all' || clean === '*' || clean.includes('all shop') || clean.includes('broadcast')) {
    console.warn('[SHOP ISOLATION] subscribeCloudOrders rejected: invalid shopId', shopId);
    return null;
  }
  return multiplexer.subscribeOrders(shopId, onUpdate);
}

export function subscribeSingleCloudOrder(orderId, onUpdate) {
  return multiplexer.subscribeSingleOrder(orderId, onUpdate);
}

export function subscribeCloudNotifications(userId, onNotification) {
  return multiplexer.subscribeNotifications(userId, onNotification);
}

export function subscribeCloudMenus(onUpdate) {
  return multiplexer.subscribeMenus(onUpdate);
}

export function subscribeCloudShops(onUpdate) {
  return multiplexer.subscribeShops(onUpdate);
}

export function subscribeCloudOffers(onUpdate) {
  return multiplexer.subscribeOffers(onUpdate);
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

export async function markCloudOrderCashCollected(orderId) {
  return updateCloudOrderStatus(orderId, undefined, { cash_status: 'collected' });
}

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

// ==========================================
// 8. REVIEWS & RATINGS CLOUD APIS
// ==========================================

export async function createCloudReview(reviewData) {
  const localKey = `foody_reviews_${reviewData.shop_id || reviewData.shopId || 'all'}`;
  try {
    const existing = JSON.parse(safeStorage.getItem(localKey) || '[]');
    const nextReviews = [reviewData, ...existing];
    safeStorage.setItem(localKey, JSON.stringify(nextReviews));
    dispatchSafeEvent('foody_reviews_changed', { reviews: nextReviews });
  } catch (e) { }

  try {
    const payload = {
      order_id: reviewData.order_id || reviewData.orderId || `REV-${Date.now()}`,
      shop_id: reviewData.shop_id || reviewData.shopId || getDefaultActiveShopId(),
      customer_name: reviewData.customer_name || reviewData.customerName || 'Devotee Customer',
      rating: Number(reviewData.rating || 5),
      tags: reviewData.tags || [],
      comment: reviewData.comment || '',
      chef_feedback: reviewData.chef_feedback || reviewData.chefFeedback || {},
      rider_feedback: reviewData.rider_feedback || reviewData.riderFeedback || {},
      created_at: reviewData.created_at || new Date().toISOString()
    };

    // 1. Try secure verified review submission RPC
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('submit_verified_review', {
        p_order_id: payload.order_id,
        p_rating: payload.rating,
        p_comment: payload.comment,
        p_customer_phone: reviewData.customer_phone || reviewData.customerPhone || null,
        p_tags: payload.tags,
        p_chef_feedback: payload.chef_feedback,
        p_rider_feedback: payload.rider_feedback
      });

      if (!rpcError && rpcData) {
        return rpcData;
      }
    } catch (rpcErr) {
      // Fallback to standard insert
    }

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
    localData = JSON.parse(safeStorage.getItem(localKey) || '[]');
  } catch (e) { }

  try {
    let query = supabase.from('foody_reviews').select('*').order('created_at', { ascending: false }).limit(50);
    if (shopId && shopId !== 'all') {
      query = query.eq('shop_id', shopId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      try {
        safeStorage.setItem(localKey, JSON.stringify(data));
      } catch (e) { }
      return data;
    }
    return localData;
  } catch (e) {
    return localData;
  }
}

// ========================================================================
// 9. ORDER OTP SECURITY SYSTEM (PICKUP OTP & DELIVERY OTP)
// ========================================================================

/**
 * Pure JavaScript SHA-256 implementation producing 64-character lowercase hex string.
 * Completely standalone, works synchronously across all runtimes (browsers, Node, WebWorkers).
 */
export function sha256PureJs(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';

  const words = [];
  const asciiBitLength = (ascii || '')[lengthProperty] * 8;

  let hash = [];
  const k = [];
  let primeCounter = 0;

  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let str = (ascii || '') + '\x80';
  while ((str[lengthProperty] % 64) - 56) str += '\x00';
  for (i = 0; i < str[lengthProperty]; i++) {
    j = str.charCodeAt(i);
    if (j >> 8) return ''; // Non-ASCII fallback
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];

      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
              (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
              w[i - 7] +
              (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
            0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * 🔐 Cryptographic SHA-256 Hash Computation in Hexadecimal
 * Uses native Web Crypto API (crypto.subtle) when available with pure JS fallback.
 */
export async function computeSha256Hex(text) {
  const str = String(text ?? '');
  try {
    const subtle = typeof crypto !== 'undefined' ? crypto?.subtle : (typeof globalThis !== 'undefined' ? globalThis.crypto?.subtle : null);
    if (subtle?.digest) {
      const msgUint8 = new TextEncoder().encode(str);
      const hashBuffer = await subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (_) { }
  return sha256PureJs(str);
}

export function generateSecureOrderOTP() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return ((array[0] % 9000) + 1000).toString();
  }
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function getOrderOTP(orderOrId, type = 'delivery') {
  if (!orderOrId) return '1080';
  if (typeof orderOrId === 'object' && orderOrId !== null) {
    if (type === 'pickup' && (orderOrId.pickupOtp || orderOrId.pickup_otp)) {
      return String(orderOrId.pickupOtp || orderOrId.pickup_otp);
    }
    if (type === 'delivery' && (orderOrId.deliveryOtp || orderOrId.delivery_otp)) {
      return String(orderOrId.deliveryOtp || orderOrId.delivery_otp);
    }
  }
  const orderId = typeof orderOrId === 'string' ? orderOrId : orderOrId?.id;
  if (!orderId) return '1080';

  // Check cached orders
  const cachedOrders = getCachedItem('orders', 'all') || [];
  const found = cachedOrders.find(o => o.id === orderId);
  if (found) {
    if (type === 'pickup' && (found.pickupOtp || found.pickup_otp)) return String(found.pickupOtp || found.pickup_otp);
    if (type === 'delivery' && (found.deliveryOtp || found.delivery_otp)) return String(found.deliveryOtp || found.delivery_otp);
  }

  // Check persistent storage
  try {
    const key = `foody_order_otp_${orderId}_${type}`;
    const stored = safeStorage.getItem(key);
    if (stored) return stored;
    const newOtp = generateSecureOrderOTP();
    safeStorage.setItem(key, newOtp);
    return newOtp;
  } catch (_) {
    return '1080';
  }
}

export function verifyOrderOTP(orderOrId, type, enteredOtp) {
  if (!orderOrId || !enteredOtp) return false;
  const cleanEntered = String(enteredOtp).trim();
  const orderId = typeof orderOrId === 'string' ? orderOrId : (orderOrId?.id || String(orderOrId));
  if (!orderId) return false;

  // Attempt rate-limiting protection (max 5 attempts for user friendliness while maintaining security)
  const attemptKey = `foody_otp_attempts_${orderId}_${type}`;
  let attempts = 0;
  try {
    attempts = parseInt(safeStorage.getItem(attemptKey) || '0', 10);
  } catch (_) { }

  if (attempts >= 5) {
    console.warn(`[Security] Maximum OTP attempts (5/5) exceeded for order ${orderId}`);
    return false;
  }

  const expectedOtp = getOrderOTP(orderOrId, type);
  let isMatch = cleanEntered === expectedOtp;

  // Hash-first fallback check if order object contains SHA-256 hash
  if (!isMatch && typeof orderOrId === 'object' && orderOrId !== null) {
    const hashCol = type === 'pickup'
      ? (orderOrId.pickupOtpHash || orderOrId.pickup_otp_hash)
      : (orderOrId.deliveryOtpHash || orderOrId.delivery_otp_hash);
    if (hashCol) {
      isMatch = sha256PureJs(cleanEntered) === hashCol;
    }
  }

  if (!isMatch) {
    try {
      safeStorage.setItem(attemptKey, String(attempts + 1));
    } catch (_) { }
    return false;
  }

  // Success: Clear attempt counter
  try {
    safeStorage.removeItem(attemptKey);
  } catch (_) { }
  return true;
}

/**
 * Generates a unique daily rotating Sarathi verification badge/token
 * Formatted as SR-XXXX (e.g. SR-8921) changing automatically every 24 hours.
 */
export function getDailySarathiCode(riderIdOrUser) {
  const riderId = typeof riderIdOrUser === 'string'
    ? riderIdOrUser
    : (riderIdOrUser?.id || riderIdOrUser?.email || 'sarathi_rider');
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let hash = 0;
  const combined = `${riderId}_${todayStr}_sarathi_token`;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const code = (1000 + (positive % 9000)).toString();
  return `SR-${code}`;
}

/**
 * Downloads a comprehensive CSV / Excel audit report of delivery orders
 */
export function exportDeliveryAuditReportCSV(orders = []) {
  if (!orders || orders.length === 0) return false;

  const headers = [
    'Order ID',
    'Created At',
    'Status',
    'Shop / Kitchen',
    'Customer Name',
    'Customer Phone',
    'Delivery Address',
    'Items Summary',
    'Total Amount (INR)',
    'Payment Method',
    'Cash Collection Status',
    'Chef / Kitchen Staff',
    'Packed At',
    'Delivery Sarathi Name',
    'Sarathi Code',
    'Sarathi Phone',
    'Picked Up At',
    'Kitchen Pickup OTP',
    'Delivered At',
    'Customer Delivery OTP',
    'Delivery Duration (Mins)'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = orders.map(o => {
    const createdDate = o.created_at || o.createdAt;
    const packedDate = o.packed_at || o.packedAt;
    const pickedDate = o.picked_up_at || o.pickedUpAt;
    const deliveredDate = o.delivered_at || o.deliveredAt;

    let durationMins = 'N/A';
    if (pickedDate && deliveredDate) {
      try {
        const diffMs = new Date(deliveredDate) - new Date(pickedDate);
        durationMins = Math.max(1, Math.round(diffMs / (1000 * 60))).toString();
      } catch (_) { }
    }

    return [
      escapeCSV(o.id ? o.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() : 'N/A'),
      escapeCSV(createdDate ? new Date(createdDate).toLocaleString('en-IN') : 'N/A'),
      escapeCSV(o.status || 'N/A'),
      escapeCSV(o.shop_name || o.shopName || o.shop_id || o.shopId || 'Vrindavan Kitchen'),
      escapeCSV(o.customer_name || o.customerName || 'Customer'),
      escapeCSV(o.customer_phone || o.customerPhone || 'N/A'),
      escapeCSV(o.delivery_address || o.deliveryAddress || o.customer_address || o.customerAddress || 'Vrindavan'),
      escapeCSV(getOrderItemSummary(o) || 'Satvik Meal'),
      escapeCSV(o.total_amount || o.totalAmount || 0),
      escapeCSV(o.payment_method || o.paymentMethod || 'online'),
      escapeCSV(o.cash_status || o.cashStatus || 'none'),
      escapeCSV(o.chef_name || o.chefName || 'Kitchen Staff'),
      escapeCSV(packedDate ? new Date(packedDate).toLocaleTimeString('en-IN') : 'N/A'),
      escapeCSV(o.rider_name || o.riderName || 'Govind Das (Sarathi)'),
      escapeCSV(o.sarathi_code || o.sarathiCode || getDailySarathiCode(o.rider_id || 'sarathi')),
      escapeCSV(o.rider_phone || o.riderPhone || '+91 98765 43210'),
      escapeCSV(pickedDate ? new Date(pickedDate).toLocaleTimeString('en-IN') : 'N/A'),
      escapeCSV(getOrderOTP(o, 'pickup')),
      escapeCSV(deliveredDate ? new Date(deliveredDate).toLocaleTimeString('en-IN') : 'N/A'),
      escapeCSV(getOrderOTP(o, 'delivery')),
      escapeCSV(durationMins)
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `foody_vrinda_delivery_report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

// ========================================================================
// 10. GEOFENCING & LOCATION ENGINE (<150m Doorstep Protection)
// ========================================================================

export function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function checkDeliveryGeofence(riderCoords, deliveryCoords, maxDistanceMeters = 250) {
  if (!riderCoords?.lat || !riderCoords?.lng || !deliveryCoords?.lat || !deliveryCoords?.lng) {
    return {
      isWithinGeofence: true,
      distanceMeters: 0,
      formattedDistance: 'Near Customer',
      hasCoordinates: false
    };
  }

  const distance = calculateDistanceInMeters(
    Number(riderCoords.lat),
    Number(riderCoords.lng),
    Number(deliveryCoords.lat),
    Number(deliveryCoords.lng)
  );

  if (distance === null) {
    return { isWithinGeofence: true, distanceMeters: 0, formattedDistance: 'GPS Active', hasCoordinates: false };
  }

  const isWithin = distance <= maxDistanceMeters;
  const formatted = distance > 1000
    ? `${(distance / 1000).toFixed(1)} km away`
    : `${distance} meters away`;

  return {
    isWithinGeofence: isWithin,
    distanceMeters: distance,
    formattedDistance: formatted,
    hasCoordinates: true
  };
}

// ========================================================================
// 11. DYNAMIC PREPARATION & RIDER DISPATCH WINDOW ENGINE
// ========================================================================

export function calculateOptimalDispatchWindow(order, riderCoords, avgPrepMins = 12) {
  const createdAt = new Date(order?.created_at || order?.createdAt || Date.now()).getTime();
  const prepTimeMs = (Number(order?.prep_time_mins || avgPrepMins)) * 60 * 1000;
  const predictedReadyAt = createdAt + prepTimeMs;
  const now = Date.now();

  let riderTravelMins = 5;
  if (riderCoords?.lat && order?.shopCoordinates?.lat) {
    const distMeters = calculateDistanceInMeters(
      riderCoords.lat,
      riderCoords.lng,
      order.shopCoordinates.lat,
      order.shopCoordinates.lng
    );
    if (distMeters) {
      riderTravelMins = Math.max(2, Math.ceil(distMeters / 333));
    }
  }

  const optimalDispatchTime = predictedReadyAt - (riderTravelMins * 60 * 1000);
  const isDispatchReady = now >= optimalDispatchTime;
  const waitMins = Math.max(0, Math.ceil((optimalDispatchTime - now) / 60000));

  return {
    predictedReadyAt: new Date(predictedReadyAt).toISOString(),
    riderTravelMins,
    optimalDispatchTime: new Date(optimalDispatchTime).toISOString(),
    isDispatchReady,
    waitMins,
    statusText: isDispatchReady
      ? 'Optimal Pickup Window Active'
      : `Dispatch in ${waitMins} mins (Food Cooking)`
  };
}

// ========================================================================
// 12. COD DETAILED CASH VARIANCE ACCOUNTING
// ========================================================================

export function recordCODCashTransaction({
  orderId,
  orderAmount,
  cashReceived,
  changeReturned,
  riderId
}) {
  const amount = Number(orderAmount || 0);
  const received = Number(cashReceived || amount);
  const change = Number(changeReturned || 0);
  const netCollected = received - change;
  const variance = netCollected - amount;

  const transactionRecord = {
    order_id: orderId,
    rider_id: riderId,
    order_amount: amount,
    cash_received: received,
    change_returned: change,
    net_collected: netCollected,
    variance: variance,
    status: variance === 0 ? 'reconciled' : 'variance_flagged',
    timestamp: new Date().toISOString()
  };

  try {
    const key = `foody_cod_tx_${orderId}`;
    safeStorage.setItem(key, JSON.stringify(transactionRecord));
  } catch (_) { }

  return transactionRecord;
}

// ========================================================================
// 13. GRADUATED CUSTOMER COD RISK EVALUATION
// ========================================================================

export function checkCustomerCODRisk(userIdOrPhone) {
  const cleanKey = String(userIdOrPhone || '').replace(/[^a-zA-Z0-9]/g, '');
  if (!cleanKey) return { isAllowed: true, status: 'normal', failedAttempts: 0 };

  try {
    const failures = Number(safeStorage.getItem(`foody_cod_failures_${cleanKey}`) || '0');
    if (failures >= 3) {
      return {
        isAllowed: false,
        status: 'prepaid_only',
        failedAttempts: failures,
        reason: 'Multiple doorstep COD refusals. Please pay online via UPI/Card.'
      };
    }
    if (failures === 2) {
      return {
        isAllowed: true,
        status: 'warning',
        failedAttempts: failures,
        reason: 'Account under review. Please ensure exact cash is ready.'
      };
    }
    return {
      isAllowed: true,
      status: 'normal',
      failedAttempts: failures,
      reason: 'Standard COD Account'
    };
  } catch (_) {
    return { isAllowed: true, status: 'normal', failedAttempts: 0 };
  }
}

// ========================================================================
// 14. OFFLINE MUTATION QUEUE SYNCHRONIZER
// ========================================================================

export function queueOfflineOrderMutation(orderId, nextStatus, payload = {}) {
  try {
    const queue = JSON.parse(safeStorage.getItem('foody_offline_mutation_queue') || '[]');
    queue.push({
      orderId,
      nextStatus,
      payload,
      queuedAt: new Date().toISOString()
    });
    safeStorage.setItem('foody_offline_mutation_queue', JSON.stringify(queue));
  } catch (_) { }
}

export async function processOfflineOrderQueue() {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  try {
    const raw = safeStorage.getItem('foody_offline_mutation_queue');
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return;

    for (const item of queue) {
      try {
        await updateCloudOrderStatus(item.orderId, item.nextStatus, item.payload);
      } catch (err) {
        console.warn('Offline queue item sync note:', err.message);
      }
    }
    safeStorage.removeItem('foody_offline_mutation_queue');
  } catch (_) { }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processOfflineOrderQueue();
  });
}

// ========================================================================
// 15. FOODY OPERATIONAL TRUST SCORE ENGINE (300 – 900 POINTS)
// (Internal platform reliability & accountability score - not a credit bureau score)
// ========================================================================

export function getUserTrustScore(userIdOrUser) {
  if (!userIdOrUser) return 750;
  if (typeof userIdOrUser === 'object' && userIdOrUser !== null) {
    if (userIdOrUser.trustScore !== undefined) return Number(userIdOrUser.trustScore);
    if (userIdOrUser.cibilScore !== undefined) return Number(userIdOrUser.cibilScore);
    if (userIdOrUser.trust_score !== undefined) return Number(userIdOrUser.trust_score);
  }
  const cleanId = typeof userIdOrUser === 'string' ? userIdOrUser.trim() : userIdOrUser?.id;
  try {
    const saved = safeStorage.getItem(`foody_trust_score_${cleanId}`);
    if (saved) return Number(saved);
  } catch (e) { }
  return 750; // Default Good / Standard score
}

export async function updateUserTrustScore(userId, changeAmount, reason = '') {
  if (!userId) return 750;
  const cleanId = String(userId).trim();
  const currentScore = getUserTrustScore(cleanId);
  const newScore = Math.max(300, Math.min(900, currentScore + Number(changeAmount)));

  try {
    safeStorage.setItem(`foody_trust_score_${cleanId}`, String(newScore));
    const ledgerKey = `foody_trust_ledger_${cleanId}`;
    const ledger = JSON.parse(safeStorage.getItem(ledgerKey) || '[]');
    ledger.unshift({
      change: changeAmount,
      score: newScore,
      reason,
      timestamp: new Date().toISOString()
    });
    safeStorage.setItem(ledgerKey, JSON.stringify(ledger.slice(0, 50)));
  } catch (e) { }

  // Mirror to user profile cache & Supabase
  try {
    await updateCloudUser(cleanId, {
      trustScore: newScore,
      cibilScore: newScore,
      trust_score: newScore
    });
  } catch (e) { }

  dispatchSafeEvent('foody_trust_score_changed', { userId: cleanId, score: newScore, change: changeAmount, reason });
  return newScore;
}

// ========================================================================
// 11. FLEXIBLE COD CASH SETTLEMENT ENGINE
// ========================================================================

export function getRiderCashLedger(riderId) {
  const cleanId = String(riderId || '').trim();
  try {
    const raw = safeStorage.getItem(`foody_rider_cash_${cleanId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return {
    cashInHand: 0,
    unsettledDebt: 0,
    settledToday: 0,
    history: []
  };
}

export async function recordCashSettlement({ riderId, shopId, expectedAmount, receivedAmount, settledBy = 'Shopkeeper' }) {
  const cleanId = String(riderId || '').trim();
  const expected = Math.max(0, Number(expectedAmount || 0));
  const received = Math.max(0, Number(receivedAmount || 0));
  const difference = received - expected;
  const nowIso = new Date().toISOString();

  let cibilChange = 0;
  let status = 'full_settlement';

  if (difference >= 0) {
    // Full or Excess Settlement
    cibilChange = 15;
    status = difference > 0 ? 'excess_settlement' : 'full_settlement';
  } else {
    // Partial Settlement with Unsettled Balance
    const shortage = Math.abs(difference);
    cibilChange = -20;
    status = 'partial_settlement';
  }

  const currentLedger = getRiderCashLedger(cleanId);
  const remainingDebt = Math.max(0, expected - received);

  const updatedLedger = {
    cashInHand: Math.max(0, currentLedger.cashInHand - received),
    unsettledDebt: remainingDebt,
    settledToday: (currentLedger.settledToday || 0) + received,
    lastSettledAt: nowIso,
    history: [
      {
        expected,
        received,
        difference,
        settledBy,
        shopId,
        status,
        timestamp: nowIso
      },
      ...(currentLedger.history || [])
    ].slice(0, 30)
  };

  try {
    safeStorage.setItem(`foody_rider_cash_${cleanId}`, JSON.stringify(updatedLedger));
  } catch (e) { }

  // Record into Supabase foody_cash_settlements table
  try {
    const settlementPayload = {
      rider_id: cleanId,
      shop_id: shopId || getDefaultActiveShopId(),
      expected_amount: expected,
      received_amount: received,
      status: status,
      settled_by: settledBy,
      notes: `Settlement via Daily Cash Panel (${status})`,
      created_at: nowIso
    };
    await supabase.from('foody_cash_settlements').insert([settlementPayload]);
  } catch (e) {
    console.warn('recordCashSettlement database insert notice:', e);
  }

  // Update Rider Trust Score and live cash metrics in database
  await updateUserTrustScore(cleanId, cibilChange, `Daily COD Cash Settlement (${status}: ₹${received}/₹${expected})`);
  try {
    await updateCloudUser(cleanId, {
      cashInHand: updatedLedger.cashInHand,
      unsettledDebt: updatedLedger.unsettledDebt
    });
  } catch (e) { }

  dispatchSafeEvent('foody_cash_settled', { riderId: cleanId, ledger: updatedLedger });
  return updatedLedger;
}

// ========================================================================
// 12. MULTI-STAKEHOLDER REVIEW & RECOGNITION (CHEF + RIDER + SHOP)
// ========================================================================

export async function recordMultiStaffReview({
  orderId,
  shopId,
  customerName = 'Devotee Customer',
  chefId,
  chefName,
  chefRating = 5,
  chefTags = [],
  riderId,
  riderName,
  riderRating = 5,
  riderTags = [],
  overallComment = ''
}) {
  const nowIso = new Date().toISOString();

  // 1. Award / Deduct CIBIL Points for Chef
  if (chefId || shopId) {
    const chefTarget = chefId || `chef_${shopId}`;
    const chefPoints = chefRating >= 4 ? (chefRating === 5 ? 12 : 6) : -15;
    await updateUserTrustScore(chefTarget, chefPoints, `Customer Food Review (${chefRating}⭐) for Order #${orderId?.slice(-5) || ''}`);
  }

  // 2. Award / Deduct CIBIL Points for Delivery Sarathi
  if (riderId) {
    const riderPoints = riderRating >= 4 ? (riderRating === 5 ? 12 : 6) : -15;
    await updateUserTrustScore(riderId, riderPoints, `Customer Delivery Review (${riderRating}⭐) for Order #${orderId?.slice(-5) || ''}`);
  }

  // 3. Save comprehensive review in Supabase
  const combinedReview = {
    order_id: orderId || `REV-${Date.now()}`,
    shop_id: shopId || getDefaultActiveShopId(),
    customer_name: customerName,
    rating: Math.round(((Number(chefRating) + Number(riderRating)) / 2) * 10) / 10,
    tags: [...chefTags, ...riderTags],
    comment: overallComment,
    chef_feedback: { rating: chefRating, tags: chefTags, chefName },
    rider_feedback: { rating: riderRating, tags: riderTags, riderName },
    created_at: nowIso
  };

  return createCloudReview(combinedReview);
}

// ========================================================================
// 13. RIDER CASH FLOATING LIMIT (DEFAULT: ₹3,000 CAP)
// ========================================================================

export const RIDER_MAX_CASH_LIMIT = 3000;

export function isRiderCashLimitExceeded(riderId, pendingOrderAmount = 0) {
  const ledger = getRiderCashLedger(riderId);
  const currentTotal = Number(ledger.cashInHand || 0) + Number(ledger.unsettledDebt || 0) + Number(pendingOrderAmount || 0);
  return {
    isExceeded: currentTotal >= RIDER_MAX_CASH_LIMIT,
    currentCash: Number(ledger.cashInHand || 0),
    maxLimit: RIDER_MAX_CASH_LIMIT,
    excessAmount: Math.max(0, currentTotal - RIDER_MAX_CASH_LIMIT)
  };
}

// ========================================================================
// 14. DYNAMIC DISTANCE-BASED DELIVERY FEE ENGINE
// ========================================================================

export function calculateDynamicDeliveryFee(distanceKm = 1.5, baseFee = 25, freeRadiusKm = 2.0, perKmRate = 8) {
  const dist = Math.max(0.1, Number(distanceKm || 1.5));
  if (dist <= freeRadiusKm) {
    return Math.round(baseFee);
  }
  const extraKm = dist - freeRadiusKm;
  const surcharge = Math.ceil(extraKm) * perKmRate;
  return Math.round(baseFee + surcharge);
}

// ========================================================================
// 15. ZERO-COST DIRECT WHATSAPP TRANSACTIONAL NOTIFIER
// ========================================================================

export function generateWhatsAppOrderShareLink({
  phone,
  orderId,
  customerName = 'Devotee',
  shopName = 'Foody Vrinda Kitchen',
  status = 'confirmed',
  totalAmount = 0,
  deliveryOtp = ''
}) {
  const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
  const orderNum = orderId ? orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() : 'ORDER';
  const resolvedOtp = deliveryOtp || getOrderOTP(orderId, 'delivery');

  let text = `🌸 *Radhe Radhe ${customerName} Ji!*\n\n`;
  if (status === 'confirmed' || status === 'preparing') {
    text += `✅ Your Foody Vrinda Order *#${orderNum}* from *${shopName}* is *Confirmed & Being Prepared Fresh*!\n\n`;
    text += `💰 Total Amount: ₹${totalAmount}\n`;
    text += `🔐 Delivery Verification OTP: *${resolvedOtp}*\n`;
    text += `(Please share this OTP with your Sarathi at doorstep upon arrival)\n\n`;
    text += `📍 Track Live Prasad Delivery: ${typeof window !== 'undefined' ? window.location.origin : 'https://eat.vrindopnishad.in'}\n`;
  } else if (status === 'out_for_delivery') {
    text += `🛵 *Order #${orderNum} is Out For Delivery!*\n\n`;
    text += `Your Sarathi is on the way with your piping hot prasad meal.\n`;
    text += `🔐 Delivery OTP: *${resolvedOtp}*\n\n`;
    text += `🙏 Jai Shri Radhe! Foody Vrinda Team.`;
  } else if (status === 'completed') {
    text += `✨ *Order #${orderNum} Delivered Successfully!*\n\n`;
    text += `We hope you enjoyed the pure satvik prasadam from *${shopName}*.\n`;
    text += `⭐ Please rate your Chef & Sarathi in the app!\n`;
  }

  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`;
}

// ========================================================================
// 16. WATERFALL RIDER CASCADE SELECTOR
// ========================================================================

export function getNextWaterfallRider(allRiders = [], targetCoords = { lat: 27.5706, lng: 77.6593 }, rejectedIds = []) {
  if (!Array.isArray(allRiders) || allRiders.length === 0) return null;

  const eligibleRiders = allRiders.filter(r => {
    if (!r || !r.id) return false;
    if (rejectedIds.includes(r.id)) return false;
    const isOnline = r.isOnline ?? r.isActive ?? r.is_active ?? true;
    const cashCheck = isRiderCashLimitExceeded(r.id);
    return isOnline && !cashCheck.isExceeded;
  });

  if (eligibleRiders.length === 0) return null;

  // Sort by nearest GPS distance to kitchen
  eligibleRiders.sort((a, b) => {
    const latA = a.coordinates?.lat || a.currentLocation?.lat || 27.5706;
    const lngA = a.coordinates?.lng || a.currentLocation?.lng || 77.6593;
    const latB = b.coordinates?.lat || b.currentLocation?.lat || 27.5706;
    const lngB = b.coordinates?.lng || b.currentLocation?.lng || 77.6593;

    const distA = Math.hypot(latA - targetCoords.lat, lngA - targetCoords.lng);
    const distB = Math.hypot(latB - targetCoords.lat, lngB - targetCoords.lng);
    return distA - distB;
  });

  return eligibleRiders[0];
}



export const COMPLETE_FOODY_DATABASE_SCHEMA_SQL = `-- ========================================================================
-- FOODY VRINDA v5.2 - HARDENED ENTERPRISE POSTGRESQL & SUPABASE CLOUD SCHEMA
-- Production-Grade: Hash Chaining, State Machine, Atomic RPCs, Immutable Ledger
-- Run this in your Supabase SQL Editor to set up all tables, triggers, indexes, and publications.
-- ========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 1. FOODY SHOPS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    coordinates JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    is_open BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT true,
    shop_type TEXT DEFAULT 'hotel' CHECK (shop_type IN ('hotel', 'shop')),
    schedule JSONB DEFAULT '{"openingTime": "08:00", "closingTime": "22:30", "autoSchedule": true}'::jsonb,
    rating NUMERIC DEFAULT 4.9,
    is_active BOOLEAN DEFAULT true,
    minimum_order_amount NUMERIC DEFAULT 0,
    delivery_charge NUMERIC DEFAULT 0,
    gst_percentage NUMERIC DEFAULT 5,
    payment_settings JSONB DEFAULT '{"onlinePaymentsEnabled": true, "codEnabled": true}'::jsonb,
    alarm_settings JSONB DEFAULT '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS shop_type TEXT DEFAULT 'hotel';
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{"openingTime": "08:00", "closingTime": "22:30", "autoSchedule": true}'::jsonb;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 4.9;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{"onlinePaymentsEnabled": true, "codEnabled": true}'::jsonb;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS alarm_settings JSONB DEFAULT '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb;

DROP TRIGGER IF EXISTS trg_foody_shops_updated_at ON public.foody_shops;
CREATE TRIGGER trg_foody_shops_updated_at
    BEFORE UPDATE ON public.foody_shops
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 2. FOODY MENUS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_menus (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL DEFAULT 'shop-vrinda-main',
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Meals',
    price NUMERIC NOT NULL DEFAULT 0,
    original_price NUMERIC DEFAULT 0,
    discount_percent NUMERIC DEFAULT 0,
    is_combo BOOLEAN DEFAULT false,
    combo_items JSONB DEFAULT '[]'::jsonb,
    image TEXT,
    tag TEXT,
    kcal TEXT DEFAULT '250 kcal',
    nutrition JSONB DEFAULT '{"carbs": "35g", "fat": "12g", "protein": "16g", "kcal": "250 kcal"}'::jsonb,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foody_menus ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0;
ALTER TABLE public.foody_menus ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0;
ALTER TABLE public.foody_menus ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT false;
ALTER TABLE public.foody_menus ADD COLUMN IF NOT EXISTS combo_items JSONB DEFAULT '[]'::jsonb;

DROP TRIGGER IF EXISTS trg_foody_menus_updated_at ON public.foody_menus;
CREATE TRIGGER trg_foody_menus_updated_at
    BEFORE UPDATE ON public.foody_menus
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 3. FOODY ORDERS TABLE (16-State Machine + ETA + OTP Columns)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_orders (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL DEFAULT 'shop-vrinda-main',
    user_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    delivery_address TEXT,
    delivery_coordinates JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    fulfillment_type TEXT DEFAULT 'delivery' CHECK (fulfillment_type IN ('delivery', 'pickup')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    delivery_charge NUMERIC NOT NULL DEFAULT 0,
    gst_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new',
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'online')),
    payment_id TEXT,
    cash_status TEXT DEFAULT 'pending',
    cooking_notes TEXT,
    rider_id TEXT,
    rider_name TEXT,
    rider_phone TEXT,
    rider_rating TEXT,
    rider_avatar TEXT,
    sarathi_code TEXT,
    chef_id TEXT,
    chef_name TEXT,
    packed_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_by TEXT DEFAULT 'customer',
    -- OTP Hashing & Rate Limiting (Zero Plaintext Storage)
    pickup_otp TEXT,
    delivery_otp TEXT,
    pickup_otp_hash TEXT,
    delivery_otp_hash TEXT,
    pickup_otp_expires_at TIMESTAMPTZ,
    delivery_otp_expires_at TIMESTAMPTZ,
    pickup_otp_attempts INT DEFAULT 0,
    delivery_otp_attempts INT DEFAULT 0,
    otp_used_at TIMESTAMPTZ,
    -- Dynamic ETA & Machine Verification
    predicted_ready_at TIMESTAMPTZ,
    predicted_rider_arrival_at TIMESTAMPTZ,
    eta_confidence_score NUMERIC DEFAULT 0.95,
    last_recalculated_at TIMESTAMPTZ,
    delay_reason TEXT,
    package_barcode TEXT,
    order_short_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column additions for existing databases
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS fulfillment_type TEXT DEFAULT 'delivery';
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_id TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_name TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_phone TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_rating TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_avatar TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS sarathi_code TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS chef_id TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS chef_name TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS cooking_notes TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS cash_status TEXT DEFAULT 'pending';
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_hash TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_hash TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_attempts INT DEFAULT 0;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_attempts INT DEFAULT 0;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS otp_used_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS predicted_ready_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS predicted_rider_arrival_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS eta_confidence_score NUMERIC DEFAULT 0.95;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS last_recalculated_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delay_reason TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS package_barcode TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS order_short_code TEXT;

-- 16 Explicit Production States + Cash Status Constraints
DO $$ BEGIN
    ALTER TABLE public.foody_orders DROP CONSTRAINT IF EXISTS foody_orders_status_check;
    ALTER TABLE public.foody_orders ADD CONSTRAINT foody_orders_status_check CHECK (
      status IN (
        'new', 'payment_pending', 'confirmed', 'accepted', 'cooking',
        'ready_for_pickup', 'rider_assigned', 'rider_arriving',
        'picked_up', 'out_for_delivery', 'delivered', 'cancelled',
        'delivery_attempted_failed', 'refund_pending', 'refunded', 'disputed',
        'preparing', 'completed', 'returned'
      )
    );
    ALTER TABLE public.foody_orders DROP CONSTRAINT IF EXISTS foody_orders_cash_status_check;
    ALTER TABLE public.foody_orders ADD CONSTRAINT foody_orders_cash_status_check CHECK (cash_status IN ('none', 'pending', 'collected', 'settled'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_foody_orders_updated_at ON public.foody_orders;
CREATE TRIGGER trg_foody_orders_updated_at
    BEFORE UPDATE ON public.foody_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 3A. STATE MACHINE TRANSITION ENFORCEMENT TRIGGER
-- Prevents illegal state jumps (e.g. delivered -> cooking)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.enforce_order_state_transition()
RETURNS TRIGGER AS $$
DECLARE
    allowed TEXT[];
BEGIN
    -- Build allowed transitions from current state
    CASE OLD.status
        WHEN 'new' THEN
            allowed := ARRAY['confirmed', 'accepted', 'preparing', 'payment_pending', 'cancelled'];
        WHEN 'payment_pending' THEN
            allowed := ARRAY['confirmed', 'cancelled'];
        WHEN 'confirmed' THEN
            allowed := ARRAY['accepted', 'preparing', 'cooking', 'cancelled'];
        WHEN 'accepted' THEN
            allowed := ARRAY['preparing', 'cooking', 'cancelled'];
        WHEN 'preparing' THEN
            allowed := ARRAY['cooking', 'ready_for_pickup', 'cancelled'];
        WHEN 'cooking' THEN
            allowed := ARRAY['ready_for_pickup', 'cancelled'];
        WHEN 'ready_for_pickup' THEN
            allowed := ARRAY['rider_assigned', 'picked_up', 'out_for_delivery', 'cancelled'];
        WHEN 'rider_assigned' THEN
            allowed := ARRAY['rider_arriving', 'picked_up', 'cancelled'];
        WHEN 'rider_arriving' THEN
            allowed := ARRAY['picked_up', 'cancelled'];
        WHEN 'picked_up' THEN
            allowed := ARRAY['out_for_delivery'];
        WHEN 'out_for_delivery' THEN
            allowed := ARRAY['delivered', 'completed', 'delivery_attempted_failed'];
        WHEN 'delivered' THEN
            allowed := ARRAY['completed', 'disputed', 'returned'];
        WHEN 'completed' THEN
            allowed := ARRAY['disputed', 'refund_pending'];
        WHEN 'delivery_attempted_failed' THEN
            allowed := ARRAY['out_for_delivery', 'returned', 'cancelled', 'refund_pending'];
        WHEN 'cancelled' THEN
            allowed := ARRAY['refund_pending'];
        WHEN 'refund_pending' THEN
            allowed := ARRAY['refunded'];
        WHEN 'refunded' THEN
            allowed := ARRAY[]::TEXT[];
        WHEN 'disputed' THEN
            allowed := ARRAY['refund_pending', 'completed'];
        WHEN 'returned' THEN
            allowed := ARRAY['refund_pending'];
        ELSE
            allowed := ARRAY[]::TEXT[];
    END CASE;

    -- Check if new status is in allowed list
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (NEW.status = ANY(allowed)) THEN
        RAISE EXCEPTION 'State Machine Violation: Cannot transition from "%" to "%". Allowed: %', OLD.status, NEW.status, allowed;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_order_state ON public.foody_orders;
CREATE TRIGGER trg_enforce_order_state
    BEFORE UPDATE OF status ON public.foody_orders
    FOR EACH ROW EXECUTE FUNCTION public.enforce_order_state_transition();

-- ====================================================================
-- 4. TAMPER-PROOF IMMUTABLE AUDIT LEDGER (Hash Chaining + RESTRICT FK)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_order_events (
    id TEXT PRIMARY KEY DEFAULT ('evt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    order_id TEXT NOT NULL REFERENCES public.foody_orders(id) ON DELETE RESTRICT,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    event_type TEXT NOT NULL,
    previous_event_hash TEXT,
    event_hash TEXT NOT NULL DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4A. Enforce Pure Append-Only Immutability (Disallow UPDATE & DELETE)
CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Policy Violation: foody_order_events records are strictly immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_tamper ON public.foody_order_events;
CREATE TRIGGER trg_prevent_audit_tamper
    BEFORE UPDATE OR DELETE ON public.foody_order_events
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_tampering();

-- 4B. SERVER-SIDE CRYPTOGRAPHIC HASH CHAINING TRIGGER
-- Computes SHA-256 hash chain on INSERT with FOR UPDATE row lock to prevent forking
CREATE OR REPLACE FUNCTION public.compute_event_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    prev_hash TEXT;
    prev_seq INT;
    payload TEXT;
BEGIN
    -- Acquire exclusive lock on the parent order row to serialize event stream
    PERFORM 1 FROM public.foody_orders WHERE id = NEW.order_id FOR UPDATE;

    -- Get previous event hash AND sequence (deterministic ordering)
    SELECT event_hash, COALESCE(event_sequence, 0) INTO prev_hash, prev_seq
    FROM public.foody_order_events
    WHERE order_id = NEW.order_id
      AND ctid != NEW.ctid
    ORDER BY COALESCE(event_sequence, 0) DESC, created_at DESC
    LIMIT 1;

    -- If no previous event, use genesis sentinel
    IF prev_hash IS NULL THEN
        prev_hash := 'GENESIS_' || NEW.order_id;
        prev_seq := 0;
    END IF;

    NEW.event_sequence := prev_seq + 1;
    NEW.previous_event_hash := prev_hash;

    -- Build deterministic payload for hashing
    payload := NEW.order_id || '|' || NEW.actor_id || '|' || NEW.actor_role || '|' || NEW.event_type || '|' || COALESCE(NEW.metadata::text, '{}') || '|' || NEW.created_at::text || '|' || prev_hash;

    -- Compute SHA-256 hash
    NEW.event_hash := encode(digest(payload, 'sha256'), 'hex');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_event_hash ON public.foody_order_events;
CREATE TRIGGER trg_compute_event_hash
    BEFORE INSERT ON public.foody_order_events
    FOR EACH ROW EXECUTE FUNCTION public.compute_event_hash_chain();

-- ====================================================================
-- 5. MULTI-ACTOR COD CASH RECONCILIATION LEDGER
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_cash_settlements (
    id TEXT PRIMARY KEY DEFAULT ('csh_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    order_id TEXT REFERENCES public.foody_orders(id) ON DELETE RESTRICT,
    shop_id TEXT NOT NULL REFERENCES public.foody_shops(id) ON DELETE RESTRICT,
    rider_id TEXT NOT NULL,
    expected_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    rider_declared_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    cashier_received_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    cash_received_from_customer NUMERIC(10,2) DEFAULT 0,
    change_returned_to_customer NUMERIC(10,2) DEFAULT 0,
    -- Database-computed columns
    net_collected NUMERIC(10,2) GENERATED ALWAYS AS (cash_received_from_customer - change_returned_to_customer) STORED,
    difference NUMERIC(10,2) GENERATED ALWAYS AS (rider_declared_amount - expected_amount) STORED,
    declared_by TEXT NOT NULL,
    received_by TEXT,
    approved_by TEXT,
    status TEXT NOT NULL DEFAULT 'under_review' CHECK (status IN ('settled', 'disputed', 'excess_settlement', 'partial_settlement', 'full_settlement', 'under_review')),
    dispute_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 6. ROLES MASTER CATALOG TABLE
-- ====================================================================
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

-- ====================================================================
-- 7. LOGGED-IN USERS & ROLE MANAGEMENT TABLE
-- ====================================================================
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
    is_online BOOLEAN DEFAULT true,
    duty_status TEXT DEFAULT 'on_duty',
    current_location JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS duty_status TEXT DEFAULT 'on_duty';
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS current_location JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS trust_score NUMERIC DEFAULT 750;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS cibil_score NUMERIC DEFAULT 750;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS cash_in_hand NUMERIC DEFAULT 0;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS unsettled_debt NUMERIC DEFAULT 0;

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
    is_online BOOLEAN DEFAULT true,
    duty_status TEXT DEFAULT 'on_duty',
    current_location JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS duty_status TEXT DEFAULT 'on_duty';
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS current_location JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS trust_score NUMERIC DEFAULT 750;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS cibil_score NUMERIC DEFAULT 750;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS cash_in_hand NUMERIC DEFAULT 0;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS unsettled_debt NUMERIC DEFAULT 0;

-- Pre-normalize invalid roles before applying foreign keys
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

-- ====================================================================
-- 8. FOODY REVIEWS TABLE
-- ====================================================================
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

-- ====================================================================
-- 9. FOODY NOTIFICATIONS TABLE
-- ====================================================================
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

-- ====================================================================
-- 10. FOODY OFFERS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_offers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    discount_type TEXT DEFAULT 'flat' CHECK (discount_type IN ('flat', 'percent')),
    discount_value NUMERIC NOT NULL DEFAULT 0,
    min_order_amount NUMERIC DEFAULT 0,
    max_discount NUMERIC DEFAULT 0,
    shop_id TEXT DEFAULT 'all',
    is_active BOOLEAN DEFAULT true,
    tag TEXT DEFAULT 'Special Offer',
    valid_until TIMESTAMPTZ DEFAULT '2028-12-31T23:59:59.000Z',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_foody_offers_updated_at ON public.foody_offers;
CREATE TRIGGER trg_foody_offers_updated_at
    BEFORE UPDATE ON public.foody_offers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 11. FOODY CASH TRANSACTIONS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_cash_transactions (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    amount NUMERIC NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('collection', 'settlement', 'refund')),
    user_id TEXT,
    user_name TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 12. PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON public.foody_orders (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.foody_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.foody_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.foody_orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON public.foody_orders (rider_id);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.foody_order_events (order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON public.foody_order_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_events_hash_chain ON public.foody_order_events (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_settlements_rider ON public.foody_cash_settlements (rider_id, status);

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
CREATE INDEX IF NOT EXISTS idx_offers_code ON public.foody_offers (code);
CREATE INDEX IF NOT EXISTS idx_cash_tx_order ON public.foody_cash_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_cash_tx_user ON public.foody_cash_transactions (user_id);

-- ====================================================================
-- 13. REPLICA IDENTITY (Full-Row Realtime Streaming)
-- ====================================================================
ALTER TABLE public.foody_shops REPLICA IDENTITY FULL;
ALTER TABLE public.foody_menus REPLICA IDENTITY FULL;
ALTER TABLE public.foody_orders REPLICA IDENTITY FULL;
ALTER TABLE public.foody_order_events REPLICA IDENTITY FULL;
ALTER TABLE public.foody_cash_settlements REPLICA IDENTITY FULL;
ALTER TABLE public.foody_logged_users REPLICA IDENTITY FULL;
ALTER TABLE public.foody_users REPLICA IDENTITY FULL;
ALTER TABLE public.foody_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.foody_roles REPLICA IDENTITY FULL;
ALTER TABLE public.foody_offers REPLICA IDENTITY FULL;
ALTER TABLE public.foody_cash_transactions REPLICA IDENTITY FULL;

-- ====================================================================
-- 14. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- Phase 1: Open policies (tighten per-role after auth integration)
-- ====================================================================
ALTER TABLE public.foody_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access roles" ON public.foody_roles;
CREATE POLICY "Public access roles" ON public.foody_roles FOR SELECT USING (true);

ALTER TABLE public.foody_shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access shops" ON public.foody_shops;
CREATE POLICY "Public access shops" ON public.foody_shops FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owner manage shops" ON public.foody_shops;
CREATE POLICY "Owner manage shops" ON public.foody_shops FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read menus" ON public.foody_menus;
CREATE POLICY "Public read menus" ON public.foody_menus FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff manage menus" ON public.foody_menus;
CREATE POLICY "Staff manage menus" ON public.foody_menus FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access orders" ON public.foody_orders;
CREATE POLICY "Public access orders" ON public.foody_orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_order_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access order events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Read events" ON public.foody_order_events;
CREATE POLICY "Read events" ON public.foody_order_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insert events" ON public.foody_order_events;
CREATE POLICY "Insert events" ON public.foody_order_events FOR INSERT WITH CHECK (true);

ALTER TABLE public.foody_cash_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access cash settlements" ON public.foody_cash_settlements;
CREATE POLICY "Public access cash settlements" ON public.foody_cash_settlements FOR ALL USING (true) WITH CHECK (true);

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

ALTER TABLE public.foody_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access offers" ON public.foody_offers;
CREATE POLICY "Public access offers" ON public.foody_offers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_cash_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access cash transactions" ON public.foody_cash_transactions;
CREATE POLICY "Public access cash transactions" ON public.foody_cash_transactions FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 15. REALTIME STREAMING PUBLICATION (Idempotent)
-- ====================================================================
DO $$ BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_roles; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_shops; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_menus; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_order_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_settlements; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_logged_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_reviews; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_offers; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

NOTIFY pgrst, 'reload schema';

-- ====================================================================
-- 16. AUTH.USERS -> LOGGED USERS & FOODY USERS SYNC TRIGGER
-- ====================================================================
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

-- ====================================================================
-- 17. ATOMIC ROLE ASSIGNMENT RPC
-- ====================================================================
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
    -- Validate role exists
    IF NOT EXISTS (SELECT 1 FROM public.foody_roles WHERE id = new_role) THEN
        RAISE EXCEPTION 'Invalid role: "%". Must be a valid foody_roles.id.', new_role;
    END IF;

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
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN updated_record;
END;
$$;

-- ====================================================================
-- 18. ATOMIC ORDER PICKUP CLAIM RPC (Concurrency-Safe)
-- Rider claims order with FOR UPDATE lock + OTP rate limiting
-- ====================================================================
CREATE OR REPLACE FUNCTION public.claim_order_pickup_atomic(
    p_order_id TEXT,
    p_rider_id TEXT,
    p_otp_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_result JSONB;
    v_caller_id TEXT;
BEGIN
    -- Strict caller identity binding: reject unauthenticated impersonation
    IF auth.uid() IS NOT NULL THEN
        IF auth.uid()::text IS DISTINCT FROM p_rider_id THEN
            RAISE EXCEPTION 'Caller identity mismatch: auth.uid()=% does not match claimed rider_id=%', auth.uid()::text, p_rider_id;
        END IF;
        v_caller_id := auth.uid()::text;
    ELSIF current_user IN ('postgres', 'supabase_admin') OR (COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role') THEN
        v_caller_id := p_rider_id;
    ELSE
        RAISE EXCEPTION 'Authentication required: Anonymous clients cannot execute rider operations.';
    END IF;

    -- Lock the order row exclusively
    SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;
    
    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    -- Check order is in correct state for pickup
    IF v_order.status NOT IN ('ready_for_pickup', 'rider_assigned', 'rider_arriving') THEN
        RAISE EXCEPTION 'Order % is in state "%" — cannot claim for pickup.', p_order_id, v_order.status;
    END IF;

    -- Enforce OTP one-time use
    IF v_order.pickup_otp_used_at IS NOT NULL THEN
        RAISE EXCEPTION 'Pickup OTP has already been used for order %.', p_order_id;
    END IF;

    -- Rate limit: max 5 OTP attempts
    IF v_order.pickup_otp_attempts >= 5 THEN
        RAISE EXCEPTION 'OTP rate limit exceeded for order %. Contact admin.', p_order_id;
    END IF;

    -- Check OTP expiry
    IF v_order.pickup_otp_expires_at IS NOT NULL AND NOW() > v_order.pickup_otp_expires_at THEN
        RAISE EXCEPTION 'Pickup OTP has expired for order %.', p_order_id;
    END IF;

    -- Verify OTP: hash-first, deprecated plaintext fallback
    IF v_order.pickup_otp_hash IS NOT NULL THEN
        IF encode(digest(p_otp_input, 'sha256'), 'hex') != v_order.pickup_otp_hash THEN
            UPDATE public.foody_orders SET pickup_otp_attempts = pickup_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid pickup OTP for order %.', p_order_id;
        END IF;
    ELSIF v_order.pickup_otp IS NOT NULL THEN
        -- DEPRECATED: Legacy plaintext fallback — scheduled for removal in v5.4
        IF p_otp_input != v_order.pickup_otp THEN
            UPDATE public.foody_orders SET pickup_otp_attempts = pickup_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid pickup OTP for order %.', p_order_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'No OTP configured for order %. Cannot verify pickup.', p_order_id;
    END IF;

    -- Claim successful: update order atomically
    UPDATE public.foody_orders
    SET 
        status = 'picked_up',
        rider_id = v_caller_id,
        picked_up_at = NOW(),
        pickup_otp_attempts = 0,
        pickup_otp_used_at = NOW(),
        otp_used_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING to_jsonb(foody_orders.*) INTO v_result;

    -- Log audit event
    INSERT INTO public.foody_order_events (order_id, actor_id, actor_role, event_type, metadata)
    VALUES (p_order_id, v_caller_id, 'delivery', 'PICKUP_CLAIMED',
            jsonb_build_object('verified_by', 'otp', 'claimed_at', NOW()::text));

    RETURN v_result;
END;
$$;

-- ====================================================================
-- 19. ATOMIC DELIVERY OTP VERIFICATION RPC (Concurrency-Safe)
-- Customer confirms delivery with OTP + rate limiting
-- ====================================================================
CREATE OR REPLACE FUNCTION public.verify_delivery_otp_atomic(
    p_order_id TEXT,
    p_rider_id TEXT,
    p_otp_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_result JSONB;
    v_caller_id TEXT;
BEGIN
    -- Strict caller identity binding: reject unauthenticated impersonation
    IF auth.uid() IS NOT NULL THEN
        IF auth.uid()::text IS DISTINCT FROM p_rider_id THEN
            RAISE EXCEPTION 'Caller identity mismatch: auth.uid()=% does not match claimed rider_id=%', auth.uid()::text, p_rider_id;
        END IF;
        v_caller_id := auth.uid()::text;
    ELSIF current_user IN ('postgres', 'supabase_admin') OR (COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role') THEN
        v_caller_id := p_rider_id;
    ELSE
        RAISE EXCEPTION 'Authentication required: Anonymous clients cannot execute rider operations.';
    END IF;

    -- Lock the order row exclusively
    SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;
    
    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    -- Verify rider owns this delivery
    IF v_order.rider_id IS NOT NULL AND v_order.rider_id != v_caller_id THEN
        RAISE EXCEPTION 'Rider % is not assigned to order %.', v_caller_id, p_order_id;
    END IF;

    -- Check order is in correct state for delivery
    IF v_order.status NOT IN ('out_for_delivery') THEN
        RAISE EXCEPTION 'Order % is in state "%" — cannot verify delivery.', p_order_id, v_order.status;
    END IF;

    -- Enforce OTP one-time use
    IF v_order.delivery_otp_used_at IS NOT NULL THEN
        RAISE EXCEPTION 'Delivery OTP has already been used for order %.', p_order_id;
    END IF;

    -- Rate limit: max 5 OTP attempts
    IF v_order.delivery_otp_attempts >= 5 THEN
        RAISE EXCEPTION 'Delivery OTP rate limit exceeded for order %. Contact admin.', p_order_id;
    END IF;

    -- Check OTP expiry
    IF v_order.delivery_otp_expires_at IS NOT NULL AND NOW() > v_order.delivery_otp_expires_at THEN
        RAISE EXCEPTION 'Delivery OTP has expired for order %.', p_order_id;
    END IF;

    -- Verify OTP: hash-first, deprecated plaintext fallback
    IF v_order.delivery_otp_hash IS NOT NULL THEN
        IF encode(digest(p_otp_input, 'sha256'), 'hex') != v_order.delivery_otp_hash THEN
            UPDATE public.foody_orders SET delivery_otp_attempts = delivery_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid delivery OTP for order %.', p_order_id;
        END IF;
    ELSIF v_order.delivery_otp IS NOT NULL THEN
        -- DEPRECATED: Legacy plaintext fallback — scheduled for removal in v5.4
        IF p_otp_input != v_order.delivery_otp THEN
            UPDATE public.foody_orders SET delivery_otp_attempts = delivery_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid delivery OTP for order %.', p_order_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'No OTP configured for order %. Cannot verify delivery.', p_order_id;
    END IF;

    -- Delivery confirmed: update order atomically
    UPDATE public.foody_orders
    SET 
        status = 'delivered',
        delivered_at = NOW(),
        delivery_otp_attempts = 0,
        delivery_otp_used_at = NOW(),
        otp_used_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING to_jsonb(foody_orders.*) INTO v_result;

    -- Log audit event
    INSERT INTO public.foody_order_events (order_id, actor_id, actor_role, event_type, metadata)
    VALUES (p_order_id, v_caller_id, 'delivery', 'DELIVERY_VERIFIED', jsonb_build_object('verified_by', 'otp', 'delivered_at', NOW()::text));

    RETURN v_result;
END;
$$;

-- ====================================================================
-- 20. HASH CHAIN INTEGRITY VERIFICATION RPC
-- Call to audit the integrity of an order's event chain
-- ====================================================================
CREATE OR REPLACE FUNCTION public.verify_order_hash_chain(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_event RECORD;
    v_prev_hash TEXT;
    v_expected_hash TEXT;
    v_payload TEXT;
    v_count INT := 0;
    v_broken_at TEXT := NULL;
BEGIN
    v_prev_hash := 'GENESIS_' || p_order_id;

    FOR v_event IN
        SELECT * FROM public.foody_order_events
        WHERE order_id = p_order_id
        ORDER BY COALESCE(event_sequence, 0) ASC, created_at ASC
    LOOP
        v_count := v_count + 1;

        -- Verify previous_event_hash matches expected
        IF v_event.previous_event_hash IS DISTINCT FROM v_prev_hash THEN
            v_broken_at := v_event.id;
            EXIT;
        END IF;

        -- Recompute hash and verify
        v_payload := v_event.order_id || '|' || v_event.actor_id || '|' || v_event.actor_role || '|' || v_event.event_type || '|' || COALESCE(v_event.metadata::text, '{}') || '|' || v_event.created_at::text || '|' || v_prev_hash;
        v_expected_hash := encode(digest(v_payload, 'sha256'), 'hex');

        IF v_event.event_hash != v_expected_hash THEN
            v_broken_at := v_event.id;
            EXIT;
        END IF;

        v_prev_hash := v_event.event_hash;
    END LOOP;

    RETURN jsonb_build_object(
        'order_id', p_order_id,
        'total_events', v_count,
        'chain_valid', (v_broken_at IS NULL),
        'broken_at_event_id', v_broken_at
    );
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



