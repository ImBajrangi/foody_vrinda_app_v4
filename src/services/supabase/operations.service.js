// ==========================================
// FOODY OPERATIONS & SETTLEMENTS SERVICE
// Trust scoring, Cash settlement, Floating limit,
// Delivery fee, WhatsApp links, and order summaries
// ==========================================

import { supabase } from './client.js';
import { safeStorage, dispatchSafeEvent, getDefaultActiveShopId } from './cache.js';
import { updateCloudUser } from './users.service.js';
import { getOrderOTP } from './riders.service.js';
import { getPublicShareUrl } from '../../utils/urlHelper.js';
import { getOrderDisplayToken } from './orders.service.js';

// ========================================================================
// 1. FOODY OPERATIONAL TRUST SCORE ENGINE (300 – 900 POINTS)
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
    if (!cleanId.startsWith('chef_shop-')) {
      await updateCloudUser(cleanId, {
        trustScore: newScore,
        cibilScore: newScore,
        trust_score: newScore
      });
    }
  } catch (e) { }

  dispatchSafeEvent('foody_trust_score_changed', { userId: cleanId, score: newScore, change: changeAmount, reason });
  return newScore;
}

// ========================================================================
// 2. AUTHORITATIVE COD CASH RECONCILIATION & HANDOVER ENGINE
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

/**
 * 🔐 Authoritative Rider Cash Handover to Kitchen Cashier/Shopkeeper
 * Enforces atomic batch settlement, order reconciliation, and real-time events.
 */
export async function settleRiderCashHandover({
  riderId,
  shopId,
  amountReceived,
  cashierReceivedAmount,
  declaredAmount = null,
  riderDeclaredAmount = null,
  idempotencyKey = null,
  orderIds = null,
  settledBy = 'Shopkeeper',
  cashierId = null,
  notes = ''
}) {
  const cleanRiderId = String(riderId || '').trim();
  const cleanShopId = String(shopId || getDefaultActiveShopId()).trim();
  const rawReceived = cashierReceivedAmount !== undefined && cashierReceivedAmount !== null
    ? cashierReceivedAmount
    : amountReceived;
  const rawDeclared = riderDeclaredAmount !== undefined && riderDeclaredAmount !== null
    ? riderDeclaredAmount
    : declaredAmount;

  const received = Math.max(0, Number(rawReceived || 0));
  const declared = rawDeclared !== null && rawDeclared !== undefined ? Math.max(0, Number(rawDeclared)) : received;
  const effectiveSettledBy = cashierId || settledBy || 'Shopkeeper';
  const key = idempotencyKey || `idem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const nowIso = new Date().toISOString();

  if (!cleanRiderId) throw new Error('Rider ID is required for cash handover.');
  if (!cleanShopId) throw new Error('Shop ID is required for cash handover.');

  // OFFLINE GUARD: Strictly follow policy — do not fake confirmation in local storage
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
    try {
      const pendingKey = 'foody_pending_settlements';
      const pendingQueue = JSON.parse(safeStorage.getItem(pendingKey) || '[]');
      pendingQueue.push({
        riderId: cleanRiderId,
        shopId: cleanShopId,
        amountReceived: received,
        declaredAmount: declared,
        idempotencyKey: key,
        orderIds,
        settledBy,
        notes,
        queuedAt: nowIso
      });
      safeStorage.setItem(pendingKey, JSON.stringify(pendingQueue));
    } catch (_) {}

    return {
      success: false,
      isOfflinePending: true,
      message: 'Network offline: Cash handover queued for synchronization. Authoritative balance remains unchanged until server confirmation.'
    };
  }

  let dbResult = null;

  // 1. Authoritative Database RPC (Single Atomic PostgreSQL Transaction)
  try {
    const { data, error } = await supabase.rpc('record_rider_cash_settlement', {
      p_rider_id: cleanRiderId,
      p_shop_id: cleanShopId,
      p_amount_received: received,
      p_declared_amount: declared,
      p_idempotency_key: key,
      p_order_ids: Array.isArray(orderIds) && orderIds.length > 0 ? orderIds : null,
      p_notes: notes || null,
      p_settled_by: settledBy || 'Shopkeeper'
    });

    if (error) {
      const isNetwork = (typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.onLine)
        || error.message?.includes('Failed to fetch')
        || error.message?.includes('NetworkError')
        || error.message?.includes('timeout')
        || error.name === 'AbortError';

      if (isNetwork) {
        try {
          const pendingKey = 'foody_pending_settlements';
          const pendingQueue = JSON.parse(safeStorage.getItem(pendingKey) || '[]');
          pendingQueue.push({
            riderId: cleanRiderId,
            shopId: cleanShopId,
            amountReceived: received,
            declaredAmount: declared,
            idempotencyKey: key,
            orderIds,
            settledBy,
            notes,
            queuedAt: nowIso,
            retryCount: 0
          });
          safeStorage.setItem(pendingKey, JSON.stringify(pendingQueue));
        } catch (_) {}

        return {
          success: false,
          isOfflinePending: true,
          idempotencyKey: key,
          message: 'Network offline: Cash handover queued for synchronization. Authoritative balance remains unchanged until server confirmation.'
        };
      }

      // Business rejection, authorization failure, or schema violation:
      // Authoritative database rejection must be exposed directly with no client fallback!
      console.error('record_rider_cash_settlement RPC rejection:', error);
      throw new Error(error.message || `Financial Settlement Error (Code: ${error.code || 'UNKNOWN'})`);
    }

    if (!data || !data.success) {
      throw new Error('Financial Settlement Error: Database transaction rolled back without confirmation.');
    }

    dbResult = data;
  } catch (err) {
    if (err.isOfflinePending) return err;
    console.error('settleRiderCashHandover failed:', err.message);
    throw err;
  }

  // 2. Authoritative Result Processing & SWR Local Projections
  // (Zero direct mutations on foody_users or foody_orders from the browser)
  const cibilBonus = dbResult.status === 'full_settlement' || dbResult.status === 'excess_settlement' ? 15 : -10;
  await updateUserTrustScore(cleanRiderId, cibilBonus, `Counter Cash Handover (${dbResult.status}: ₹${received}/₹${dbResult.expected_amount})`).catch(() => {});

  const currentLedger = getRiderCashLedger(cleanRiderId);
  const updatedLedger = {
    cashInHand: Math.max(0, Number(currentLedger.cashInHand || 0) - (Number(dbResult.received_amount) - Number(dbResult.excess_amount || 0))),
    unsettledDebt: Number(dbResult.shortage_amount || 0),
    settledToday: (currentLedger.settledToday || 0) + received,
    lastSettledAt: nowIso,
    history: [
      {
        settlementId: dbResult.settlement_id,
        expected: dbResult.expected_amount,
        received: dbResult.received_amount,
        settledBy: dbResult.cashier_name || effectiveSettledBy,
        shopId: cleanShopId,
        status: dbResult.status,
        timestamp: nowIso
      },
      ...(currentLedger.history || [])
    ].slice(0, 50)
  };

  try {
    if (key) {
      safeStorage.setItem(`foody_idem_${key}`, JSON.stringify(dbResult));
    }
    safeStorage.setItem(`foody_rider_cash_${cleanRiderId}`, JSON.stringify(updatedLedger));
    const histKey = `foody_cache_settlements_${cleanShopId}`;
    const cachedHist = JSON.parse(safeStorage.getItem(histKey) || '[]');
    const mergedHist = [dbResult, ...cachedHist.filter(s => (s.id || s.settlement_id) !== (dbResult.settlement_id || dbResult.id))].slice(0, 100);
    safeStorage.setItem(histKey, JSON.stringify(mergedHist));
  } catch (_) {}

  // 3. Dispatch Local UI Events (Coordination Only, Never Financial Confirmation)
  dispatchSafeEvent('foody_cash_settled', {
    riderId: cleanRiderId,
    shopId: cleanShopId,
    amount: received,
    settlement: dbResult,
    ledger: updatedLedger
  });

  dispatchSafeEvent('foody_orders_changed', {
    settlementId: dbResult.settlement_id,
    settledOrderIds: dbResult.settled_orders || []
  });

  return {
    success: true,
    settlementId: dbResult.settlement_id || dbResult.id,
    settlement: dbResult,
    ledger: updatedLedger,
    status: dbResult.status,
    shortageAmount: Number(dbResult.shortage_amount || 0),
    excessAmount: Number(dbResult.excess_amount || 0),
    expectedAmount: Number(dbResult.expected_amount || 0),
    receivedAmount: Number(dbResult.received_amount || dbResult.cashier_received_amount || 0),
    isIdempotentReplay: Boolean(dbResult.idempotent_replay)
  };
}

/**
 * 🔄 Authoritative Pending Settlements Offline Retry Worker
 * Replays queued settlement requests against the server when network reconnects.
 * Preserves the original idempotency key to prevent double charging/settling.
 */
export async function flushPendingSettlements() {
  if (typeof window === 'undefined' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { flushed: 0, remaining: 0 };
  }
  const pendingKey = 'foody_pending_settlements';
  let queue = [];
  try {
    queue = JSON.parse(safeStorage.getItem(pendingKey) || '[]');
  } catch (_) {
    queue = [];
  }
  if (!Array.isArray(queue) || queue.length === 0) return { flushed: 0, remaining: 0 };

  const remainingQueue = [];
  let flushedCount = 0;

  for (const item of queue) {
    try {
      const { data, error } = await supabase.rpc('record_rider_cash_settlement', {
        p_rider_id: item.riderId,
        p_shop_id: item.shopId,
        p_amount_received: item.amountReceived,
        p_declared_amount: item.declaredAmount,
        p_idempotency_key: item.idempotencyKey,
        p_order_ids: Array.isArray(item.orderIds) && item.orderIds.length > 0 ? item.orderIds : null,
        p_notes: item.notes || null,
        p_settled_by: item.settledBy || 'Shopkeeper'
      });

      if (error) {
        const isNetwork = error.message?.includes('Failed to fetch')
          || error.message?.includes('NetworkError')
          || error.message?.includes('timeout')
          || error.name === 'AbortError';

        if (isNetwork) {
          item.retryCount = (item.retryCount || 0) + 1;
          remainingQueue.push(item);
        } else {
          // Terminal business error / rejection: drop from queue and log
          console.error(`Pending settlement terminal failure (${item.idempotencyKey}):`, error);
          dispatchSafeEvent('foody:settlement_rejected', { item, error });
        }
      } else if (data && data.success) {
        flushedCount++;
        dispatchSafeEvent('foody:settlement_flushed', { item, result: data });
      } else {
        remainingQueue.push(item);
      }
    } catch (err) {
      item.retryCount = (item.retryCount || 0) + 1;
      remainingQueue.push(item);
    }
  }

  try {
    safeStorage.setItem(pendingKey, JSON.stringify(remainingQueue));
  } catch (_) {}

  return { flushed: flushedCount, remaining: remainingQueue.length };
}

// Auto-register listener in browser environment
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushPendingSettlements().catch(console.error);
  });
}

/**
 * 📊 Fetch Shop Settlement History (SWR Cache-First Pattern)
 */
export async function getShopSettlementHistory(shopId, { limit = 50, offset = 0, forceRefresh = false } = {}) {
  const cleanShopId = String(shopId || getDefaultActiveShopId()).trim();
  const cacheKey = `foody_cache_settlements_${cleanShopId}`;

  // 1. Synchronously return cached settlements
  let cached = [];
  try {
    const raw = safeStorage.getItem(cacheKey);
    if (raw) cached = JSON.parse(raw);
  } catch (_) {}

  if (!forceRefresh && cached.length > 0 && offset === 0) {
    // Background revalidate
    setTimeout(() => {
      fetchShopSettlementHistoryFromCloud(cleanShopId, limit, offset);
    }, 50);
    return cached;
  }

  return fetchShopSettlementHistoryFromCloud(cleanShopId, limit, offset, cached);
}

async function fetchShopSettlementHistoryFromCloud(shopId, limit = 50, offset = 0, fallback = []) {
  try {
    // Authoritative RPC with independent shop-level authorization verification
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_shop_cash_settlements', {
      p_shop_id: shopId,
      p_limit: limit,
      p_offset: offset
    });

    if (rpcErr) {
      console.warn('get_shop_cash_settlements RPC authorization or execution failure:', rpcErr.message);
      return fallback || [];
    }

    if (Array.isArray(rpcData)) {
      try {
        if (offset === 0) safeStorage.setItem(`foody_cache_settlements_${shopId}`, JSON.stringify(rpcData));
      } catch (_) {}
      return rpcData;
    }
  } catch (e) {
    console.warn('fetchShopSettlementHistoryFromCloud exception:', e);
  }

  return fallback || [];
}

/**
 * 🛵 Get Active Rider Outstanding Cash and Orders for a specific shop
 * Authoritative RPC with caller authorization check
 */
export async function getRiderOutstandingCash(riderId, shopId) {
  const cleanRiderId = String(riderId || '').trim();
  const cleanShopId = String(shopId || getDefaultActiveShopId()).trim();

  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_rider_outstanding_orders', {
      p_rider_id: cleanRiderId,
      p_shop_id: cleanShopId
    });

    if (rpcErr) {
      console.warn('get_rider_outstanding_orders RPC failure:', rpcErr.message);
      return { totalOutstanding: 0, orderCount: 0, orders: [], error: rpcErr.message };
    }

    if (Array.isArray(rpcData)) {
      const total = rpcData.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
      return { totalOutstanding: total, orderCount: rpcData.length, orders: rpcData };
    }
  } catch (e) {
    console.warn('getRiderOutstandingCash exception:', e);
  }

  return { totalOutstanding: 0, orderCount: 0, orders: [] };
}

/**
 * 📈 Comprehensive Shop Cash Flow & Billing Metrics Calculation
 * Accurately partitions sales, counter cash, rider cash in transit, settled cash, and online receipts.
 */
export function getShopCashFlowMetrics(orders = [], settlements = [], shopId = null) {
  const cleanShopId = shopId ? String(shopId).trim() : null;
  const filteredOrders = cleanShopId
    ? orders.filter(o => String(o.shop_id || o.shopId || '') === cleanShopId)
    : orders;

  const completedOrders = filteredOrders.filter(o => ['completed', 'delivered'].includes(String(o.status || '').toLowerCase()));

  // 1. Gross & Net Sales
  const grossSales = completedOrders.reduce((acc, o) => acc + Number(o.total_amount || o.totalAmount || 0), 0);
  const totalDiscount = completedOrders.reduce((acc, o) => acc + Number(o.discount_amount || o.discountAmount || 0), 0);
  const netSales = Math.max(0, grossSales - totalDiscount);

  // 2. Online Prepaid Payments
  const onlinePayments = completedOrders
    .filter(o => {
      const m = String(o.payment_method || o.paymentMethod || '').toLowerCase().trim();
      return m !== 'cash' && m !== 'cod';
    })
    .reduce((acc, o) => acc + Number(o.total_amount || o.totalAmount || 0), 0);

  // 3. Direct Counter Cash (Pickups or Walk-in orders with no delivery courier)
  const counterCash = completedOrders
    .filter(o => {
      const m = String(o.payment_method || o.paymentMethod || '').toLowerCase().trim();
      const isCod = m === 'cash' || m === 'cod';
      const isPickup = (o.fulfillment_type || o.fulfillmentType) === 'pickup' || !(o.rider_id || o.riderId);
      return isCod && isPickup;
    })
    .reduce((acc, o) => acc + Number(o.total_amount || o.totalAmount || 0), 0);

  // 4. Rider Cash in Transit (Completed COD orders held by couriers awaiting return to counter)
  const riderCashInTransit = filteredOrders
    .filter(o => {
      const m = String(o.payment_method || o.paymentMethod || '').toLowerCase().trim();
      const isCod = m === 'cash' || m === 'cod';
      const isCollected = (o.cash_status || o.cashStatus) === 'collected';
      const notSettled = !(o.settlement_id || o.settlementId);
      const hasRider = Boolean(o.rider_id || o.riderId);
      return isCod && isCollected && notSettled && hasRider;
    })
    .reduce((acc, o) => acc + Number(o.total_amount || o.totalAmount || 0), 0);

  // 5. Rider Cash Reconciled (Returned by Couriers & Settled at Counter)
  const riderCashSettled = filteredOrders
    .filter(o => {
      const m = String(o.payment_method || o.paymentMethod || '').toLowerCase().trim();
      const isCod = m === 'cash' || m === 'cod';
      const isSettled = (o.cash_status || o.cashStatus) === 'settled';
      return isCod && isSettled;
    })
    .reduce((acc, o) => acc + Number(o.total_amount || o.totalAmount || 0), 0);

  // 6. Active Unsettled Riders Breakdown
  const ridersMap = new Map();
  filteredOrders
    .filter(o => {
      const m = String(o.payment_method || o.paymentMethod || '').toLowerCase().trim();
      const isCod = m === 'cash' || m === 'cod';
      const isCollected = (o.cash_status || o.cashStatus) === 'collected';
      const notSettled = !(o.settlement_id || o.settlementId);
      const riderId = o.rider_id || o.riderId;
      return isCod && isCollected && notSettled && riderId;
    })
    .forEach(o => {
      const rId = o.rider_id || o.riderId;
      const rName = o.rider_name || o.riderName || 'Delivery Sarathi';
      const rPhone = o.rider_phone || o.riderPhone || '';
      const amt = Number(o.total_amount || o.totalAmount || 0);

      if (!ridersMap.has(rId)) {
        ridersMap.set(rId, {
          riderId: rId,
          riderName: rName,
          riderPhone: rPhone,
          ordersCount: 0,
          orders: [],
          totalCash: 0
        });
      }
      const entry = ridersMap.get(rId);
      entry.ordersCount += 1;
      entry.totalCash += amt;
      entry.orders.push(o);
    });

  const activeRidersHoldingCash = Array.from(ridersMap.values());

  // 7. Cash Variance from Settlements
  const cashVariance = settlements.reduce((acc, s) => {
    const shortage = Number(s.shortage_amount || 0);
    const excess = Number(s.excess_amount || 0);
    return acc + excess - shortage;
  }, 0);

  return {
    grossSales,
    netSales,
    onlinePayments,
    counterCash,
    riderCashInTransit,
    riderCashSettled,
    activeRidersHoldingCash,
    cashVariance,
    totalOrdersCount: completedOrders.length
  };
}

// Backward-compatible alias for existing tests
export const recordCashSettlement = settleRiderCashHandover;

// ========================================================================
// 3. RIDER CASH FLOATING LIMIT (DEFAULT: ₹3,000 CAP)
// ========================================================================

export const RIDER_MAX_CASH_LIMIT = 1000;

export function isRiderCashLimitExceeded(riderId, pendingOrderAmount = 0, currentLiveCash = null) {
  const ledger = getRiderCashLedger(riderId);
  const baseCash = (currentLiveCash !== null && currentLiveCash !== undefined)
    ? Number(currentLiveCash)
    : Number(ledger.cashInHand || 0);
  const currentTotal = baseCash + Number(ledger.unsettledDebt || 0) + Number(pendingOrderAmount || 0);
  return {
    isExceeded: currentTotal >= RIDER_MAX_CASH_LIMIT,
    currentCash: baseCash,
    maxLimit: RIDER_MAX_CASH_LIMIT,
    excessAmount: Math.max(0, currentTotal - RIDER_MAX_CASH_LIMIT)
  };
}

// ========================================================================
// 4. DYNAMIC DISTANCE-BASED DELIVERY FEE ENGINE
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
// 5. ZERO-COST DIRECT WHATSAPP TRANSACTIONAL NOTIFIER
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
  const orderNum = orderId ? getOrderDisplayToken({ id: orderId }) : '#FV-ORDER';
  const resolvedOtp = deliveryOtp || getOrderOTP(orderId, 'delivery');

  let text = `🌸 *Radhe Radhe ${customerName} Ji!*\n\n`;
  if (status === 'confirmed' || status === 'preparing') {
    text += `✅ Your Foody Vrinda Order *${orderNum}* from *${shopName}* is *Confirmed & Being Prepared Fresh*!\n\n`;
    text += `💰 Total Amount: ₹${totalAmount}\n`;
    text += `🔐 Delivery Verification OTP: *${resolvedOtp}*\n`;
    text += `(Please share this OTP with your Sarathi at doorstep upon arrival)\n\n`;
    text += `📍 Track Live Prasad Delivery: ${getPublicShareUrl()}\n`;
  } else if (status === 'out_for_delivery') {
    text += `🛵 *Order ${orderNum} is Out For Delivery!*\n\n`;
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
// 6. ORDER ITEM & CUSTOMER SUMMARY HELPERS
// ========================================================================

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
