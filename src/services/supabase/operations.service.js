// ==========================================
// FOODY OPERATIONS & SETTLEMENTS SERVICE
// Trust scoring, Cash settlement, Floating limit,
// Delivery fee, WhatsApp links, and order summaries
// ==========================================

import { supabase } from './client.js';
import { safeStorage, dispatchSafeEvent, getDefaultActiveShopId } from './cache.js';
import { updateCloudUser } from './users.service.js';
import { getOrderOTP } from './riders.service.js';

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
// 2. FLEXIBLE COD CASH SETTLEMENT ENGINE
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
// 3. RIDER CASH FLOATING LIMIT (DEFAULT: ₹3,000 CAP)
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
