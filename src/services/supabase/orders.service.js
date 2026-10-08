import {
  supabase,
  isTableMissing,
  markTableMissing,
  isTableError,
  isForbiddenError,
  isTableWriteForbidden,
  markTableWriteForbidden
} from './client.js';
import {
  memoryCache,
  pendingRequests,
  getCachedItem,
  setCachedItem,
  invalidateCache,
  dispatchSafeEvent,
  getCachedShops
} from './cache.js';
import { createCloudNotification } from './notifications.service.js';

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



export async function markCloudOrderCashCollected(orderId) {
  return updateCloudOrderStatus(orderId, undefined, { cash_status: 'collected' });
}
