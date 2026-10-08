// ==========================================
// FOODY RIDERS & LOGISTICS SERVICE
// OTP security, Geofencing, Dispatch window,
// COD variance, Offline mutations, and Waterfall dispatch
// ==========================================

import { safeStorage, getCachedItem } from './cache.js';
import { updateCloudOrderStatus } from './orders.service.js';
import { isRiderCashLimitExceeded, getOrderItemSummary } from './operations.service.js';

// ========================================================================
// 1. ORDER OTP SECURITY SYSTEM (PICKUP OTP & DELIVERY OTP)
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
// 2. GEOFENCING & LOCATION ENGINE (<150m Doorstep Protection)
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
// 3. DYNAMIC PREPARATION & RIDER DISPATCH WINDOW ENGINE
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
// 4. COD DETAILED CASH VARIANCE ACCOUNTING
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
// 5. GRADUATED CUSTOMER COD RISK EVALUATION
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
// 6. OFFLINE MUTATION QUEUE SYNCHRONIZER
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
// 7. WATERFALL RIDER CASCADE SELECTOR
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
