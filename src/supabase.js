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

export * from './services/supabase/notifications.service.js';
import {
  createCloudNotification,
  markCloudNotificationRead
} from './services/supabase/notifications.service.js';

export * from './services/supabase/orders.service.js';
import {
  ALLOWED_ORDER_TRANSITIONS,
  isValidStatusTransition,
  calculateAuthoritativeOrderTotals,
  createCloudOrder,
  updateCloudOrderStatus,
  fetchAvailableDeliveries,
  claimDeliveryOrder,
  claimOrderPickupAtomic,
  verifyDeliveryOtpAtomic,
  verifyOrderHashChain,
  getCloudOrders,
  broadcastAlarmEvent,
  markCloudOrderCashCollected
} from './services/supabase/orders.service.js';

export * from './services/supabase/realtime.service.js';
import {
  RealtimeMultiplexer,
  multiplexer,
  subscribeCloudOrders,
  subscribeSingleCloudOrder,
  subscribeCloudNotifications,
  subscribeCloudMenus,
  subscribeCloudShops,
  subscribeCloudOffers
} from './services/supabase/realtime.service.js';

export * from './services/supabase/users.service.js';
import {
  SEED_USERS,
  getCachedUsers,
  saveCachedUsers,
  checkUsersTableStatus,
  USERS_TABLE_SQL_SCHEMA,
  DEFAULT_ROLES,
  getCloudRoles,
  getCloudUsers,
  getLiveUserRoleAndProfile,
  recordLoggedInUser,
  createCloudUser,
  updateCloudUser,
  updateUserOnlineStatus,
  adminBlockUser,
  adminUnblockUser,
  adminRevokeUser,
  adminForceSignout,
  fetchAdminUserActions,
  deleteCloudUser,
  subscribeCloudUsers
} from './services/supabase/users.service.js';




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




export * from "./services/supabase/schema.js";
import {
  COMPLETE_FOODY_DATABASE_SCHEMA_SQL
} from "./services/supabase/schema.js";


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



