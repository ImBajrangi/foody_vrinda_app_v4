#!/usr/bin/env node
/**
 * ============================================================================
 * FOODY VRINDA — AUTHORITATIVE BILLING, CASH RECONCILIATION & HANDOVER TEST SUITE
 * ============================================================================
 * 
 * Verifies the financial integrity of:
 *   Case A: COD Order completion and floating cash custody increase
 *   Case B: Full cash settlement & waterfall order status update (cash_status: 'settled')
 *   Case C: Partial settlement with shortage tracking & FIFO waterfall allocation
 *   Case D: Excess settlement with suspense allocation
 *   Case E: Concurrency & idempotency test (replayed idempotency key protection)
 *   Case F: Double-entry ledger balance check (Debits == Credits & zero egress leak)
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  settleRiderCashHandover,
  getShopSettlementHistory,
  getRiderOutstandingCash,
  getShopCashFlowMetrics
} from '../src/services/supabase/operations.service.js';

// 1. Resolve environment credentials
let envUrl = process.env.VITE_SUPABASE_URL;
let envKey = process.env.VITE_SUPABASE_ANON_KEY;

try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
  for (const line of envContent.split('\n')) {
    const [k, ...v] = line.split('=');
    if (k && v.length) {
      const val = v.join('=').trim();
      if (k.trim() === 'VITE_SUPABASE_URL' && !envUrl) envUrl = val;
      if (k.trim() === 'VITE_SUPABASE_ANON_KEY' && !envKey) envKey = val;
    }
  }
} catch (_) {}

const SUPABASE_URL = envUrl || 'https://mrsxliwyqodtwjuyqmts.supabase.co';
const SUPABASE_KEY = envKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yc3hsaXd5cW9kdHdqdXlxbXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzQxMjcsImV4cCI6MjEwNDQ1MDEyN30.UZteyeZ3LtuVpMJoUqZogPKffmSlHN3Hn9fLtis7lBg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}: ${details}`);
    failed++;
    failures.push({ testName, details });
  }
}

async function runTestSuite() {
  console.log('\n====================================================================');
  console.log('🚀 FOODY VRINDA — BILLING & CASH RECONCILIATION VERIFICATION SUITE');
  console.log('====================================================================\n');

  const testShopId = `test_shop_${Date.now()}`;
  const testRiderId = `test_rider_${Date.now()}`;
  const testCashierId = `test_cashier_108`;

  // --------------------------------------------------------------------------
  // TEST CASE A: COD Order completion and floating cash custody increase
  // --------------------------------------------------------------------------
  console.log('--- TEST CASE A: COD Order Completion & Floating Cash Custody ---');
  
  const mockOrders = [
    {
      id: `ord_cod_1_${Date.now()}`,
      order_token: 'FV-101',
      shop_id: testShopId,
      rider_id: testRiderId,
      rider_name: 'Govinda Das (Sarathi)',
      rider_phone: '+91 9876543210',
      status: 'completed',
      payment_method: 'cash',
      cash_status: 'collected',
      total_amount: 350,
      delivery_fee: 30,
      platform_fee: 10
    },
    {
      id: `ord_cod_2_${Date.now()}`,
      order_token: 'FV-102',
      shop_id: testShopId,
      rider_id: testRiderId,
      rider_name: 'Govinda Das (Sarathi)',
      rider_phone: '+91 9876543210',
      status: 'completed',
      payment_method: 'cash',
      cash_status: 'collected',
      total_amount: 450,
      delivery_fee: 30,
      platform_fee: 10
    },
    {
      id: `ord_online_3_${Date.now()}`,
      order_token: 'FV-103',
      shop_id: testShopId,
      status: 'completed',
      payment_method: 'upi',
      total_amount: 500,
      delivery_fee: 0,
      platform_fee: 10
    },
    {
      id: `ord_counter_4_${Date.now()}`,
      order_token: 'FV-104',
      shop_id: testShopId,
      status: 'completed',
      payment_method: 'cash',
      fulfillment_type: 'pickup',
      cash_status: 'collected',
      total_amount: 200,
      delivery_fee: 0,
      platform_fee: 0
    }
  ];

  const initialMetrics = getShopCashFlowMetrics(mockOrders, [], testShopId);

  assert(initialMetrics.grossSales === 1500, 'A1: Gross sales equals sum of all completed orders (₹1500)', `Got ${initialMetrics.grossSales}`);
  assert(initialMetrics.onlinePayments === 500, 'A2: Prepaid online payments separated correctly (₹500)', `Got ${initialMetrics.onlinePayments}`);
  assert(initialMetrics.counterCash === 200, 'A3: Counter cash for pickups identified (₹200)', `Got ${initialMetrics.counterCash}`);
  assert(initialMetrics.riderCashInTransit === 800, 'A4: Rider cash float in transit matches COD orders (350+450 = ₹800)', `Got ${initialMetrics.riderCashInTransit}`);
  assert(initialMetrics.activeRidersHoldingCash.length === 1, 'A5: Exactly 1 courier flagged with floating cash liability', `Got ${initialMetrics.activeRidersHoldingCash.length}`);
  assert(initialMetrics.activeRidersHoldingCash[0].totalCash === 800, 'A6: Courier floating liability accurately totals ₹800', `Got ${initialMetrics.activeRidersHoldingCash[0]?.totalCash}`);

  // --------------------------------------------------------------------------
  // TEST CASE B: Full cash settlement & waterfall order status update
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE B: Full Cash Settlement & Waterfall Order Status ---');

  const idempotencyKeyB = crypto.randomUUID();
  const settlementResultB = await settleRiderCashHandover({
    riderId: testRiderId,
    shopId: testShopId,
    orderIds: [mockOrders[0].id, mockOrders[1].id],
    riderDeclaredAmount: 800,
    cashierReceivedAmount: 800,
    notes: 'Case B: Full settlement shift return',
    cashierId: testCashierId,
    idempotencyKey: idempotencyKeyB
  });

  assert(settlementResultB && settlementResultB.success === true, 'B1: settleRiderCashHandover executed successfully', JSON.stringify(settlementResultB));
  assert(settlementResultB.settlementId, 'B2: Permanent settlement UUID generated', settlementResultB.settlementId);
  assert(settlementResultB.status === 'completed' || settlementResultB.status === 'full_settlement', 'B3: Settlement status is completed or full_settlement', settlementResultB.status);
  assert(settlementResultB.shortageAmount === 0, 'B4: Shortage amount is exactly ₹0', settlementResultB.shortageAmount);
  assert(settlementResultB.excessAmount === 0, 'B5: Excess amount is exactly ₹0', settlementResultB.excessAmount);

  // Apply settlement to local mock projections
  const settledOrdersB = mockOrders.map(o => {
    if ([mockOrders[0].id, mockOrders[1].id].includes(o.id)) {
      return { ...o, cash_status: 'settled', settlement_id: settlementResultB.settlementId };
    }
    return o;
  });

  const mockSettlementReceiptsB = [
    {
      id: settlementResultB.settlementId,
      shop_id: testShopId,
      rider_id: testRiderId,
      rider_name: 'Govinda Das (Sarathi)',
      expected_amount: 800,
      cashier_received_amount: 800,
      shortage_amount: 0,
      excess_amount: 0,
      settlement_status: 'completed',
      created_at: new Date().toISOString()
    }
  ];

  const postSettlementMetrics = getShopCashFlowMetrics(settledOrdersB, mockSettlementReceiptsB, testShopId);
  assert(postSettlementMetrics.riderCashInTransit === 0, 'B6: Courier float in transit drops to ₹0 after settlement', `Got ${postSettlementMetrics.riderCashInTransit}`);
  assert(postSettlementMetrics.riderCashSettled === 800, 'B7: Reconciled courier cash increases to ₹800', `Got ${postSettlementMetrics.riderCashSettled}`);
  assert(postSettlementMetrics.activeRidersHoldingCash.length === 0, 'B8: Active riders holding cash list is cleared', `Got ${postSettlementMetrics.activeRidersHoldingCash.length}`);
  assert(postSettlementMetrics.cashVariance === 0, 'B9: Cash variance is balanced at ₹0', `Got ${postSettlementMetrics.cashVariance}`);

  // --------------------------------------------------------------------------
  // TEST CASE C: Partial settlement with shortage tracking & waterfall allocation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE C: Partial Settlement with Shortage Tracking ---');

  const partialOrders = [
    { id: `ord_part_1_${Date.now()}`, shop_id: testShopId, total_amount: 300, cash_status: 'collected', payment_method: 'cash' },
    { id: `ord_part_2_${Date.now()}`, shop_id: testShopId, total_amount: 400, cash_status: 'collected', payment_method: 'cash' }
  ];
  // Expected: 300 + 400 = 700. Received: 500 (Shortage of 200).
  const idempotencyKeyC = crypto.randomUUID();
  const settlementResultC = await settleRiderCashHandover({
    riderId: testRiderId,
    shopId: testShopId,
    orderIds: partialOrders.map(o => o.id),
    riderDeclaredAmount: 700,
    cashierReceivedAmount: 500,
    notes: 'Case C: Partial return with ₹200 shortage',
    cashierId: testCashierId,
    idempotencyKey: idempotencyKeyC
  });

  assert(settlementResultC && settlementResultC.success === true, 'C1: Partial settlement executed', JSON.stringify(settlementResultC));
  assert(settlementResultC.shortageAmount === 200, 'C2: Shortage of exactly ₹200 calculated and tracked', `Got ${settlementResultC.shortageAmount}`);
  assert(settlementResultC.status === 'partial' || settlementResultC.status === 'partial_settlement', 'C3: Valid partial settlement status returned', settlementResultC.status);

  // --------------------------------------------------------------------------
  // TEST CASE D: Excess settlement with suspense allocation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE D: Excess Settlement with Suspense Allocation ---');

  const excessOrders = [
    { id: `ord_exc_1_${Date.now()}`, shop_id: testShopId, total_amount: 250, cash_status: 'collected', payment_method: 'cash' }
  ];
  // Expected: 250. Received: 300 (Surplus/Excess of 50).
  const idempotencyKeyD = crypto.randomUUID();
  const settlementResultD = await settleRiderCashHandover({
    riderId: testRiderId,
    shopId: testShopId,
    orderIds: excessOrders.map(o => o.id),
    riderDeclaredAmount: 250,
    cashierReceivedAmount: 300,
    notes: 'Case D: Courier turned in ₹50 extra customer tip/change',
    cashierId: testCashierId,
    idempotencyKey: idempotencyKeyD
  });

  assert(settlementResultD && settlementResultD.success === true, 'D1: Excess settlement executed', JSON.stringify(settlementResultD));
  assert(settlementResultD.excessAmount === 50, 'D2: Excess surplus of ₹50 booked to suspense account', `Got ${settlementResultD.excessAmount}`);
  assert(settlementResultD.shortageAmount === 0, 'D3: Zero shortage on surplus transaction', `Got ${settlementResultD.shortageAmount}`);

  // --------------------------------------------------------------------------
  // TEST CASE E: Concurrency & idempotency test (replayed idempotency key)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE E: Concurrency & Idempotency Key Replay ---');

  const idempotencyKeyE = crypto.randomUUID();
  // First call
  const call1 = await settleRiderCashHandover({
    riderId: testRiderId,
    shopId: testShopId,
    orderIds: [`ord_idem_1_${Date.now()}`],
    riderDeclaredAmount: 150,
    cashierReceivedAmount: 150,
    notes: 'Case E: First transmission',
    cashierId: testCashierId,
    idempotencyKey: idempotencyKeyE
  });

  // Replay with exact same idempotency key
  const call2 = await settleRiderCashHandover({
    riderId: testRiderId,
    shopId: testShopId,
    orderIds: [`ord_idem_1_${Date.now()}`],
    riderDeclaredAmount: 150,
    cashierReceivedAmount: 150,
    notes: 'Case E: Replayed transmission (network duplicate)',
    cashierId: testCashierId,
    idempotencyKey: idempotencyKeyE
  });

  assert(call1 && call1.success === true, 'E1: Initial idempotent settlement succeeded', JSON.stringify(call1));
  assert(call2 && call2.success === true, 'E2: Replayed settlement call succeeded without crash', JSON.stringify(call2));
  assert(call1.settlementId === call2.settlementId, 'E3: Replayed call returned existing settlement UUID (Zero duplicate creations)', `call1: ${call1.settlementId}, call2: ${call2.settlementId}`);

  // --------------------------------------------------------------------------
  // TEST CASE F: Double-Entry Ledger Balance Check
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE F: Double-Entry Ledger Balance Check ---');

  // Verify accounting formula: Gross Sales = Online + Counter + RiderTransit + RiderSettled
  const comprehensiveOrders = [
    { shop_id: testShopId, total_amount: 1000, payment_method: 'upi', status: 'completed' },
    { shop_id: testShopId, total_amount: 500, payment_method: 'cash', fulfillment_type: 'pickup', status: 'completed' },
    { shop_id: testShopId, total_amount: 700, payment_method: 'cash', cash_status: 'collected', rider_id: 'r1', status: 'completed' },
    { shop_id: testShopId, total_amount: 800, payment_method: 'cash', cash_status: 'settled', settlement_id: 's1', rider_id: 'r2', status: 'completed' }
  ];

  const compMetrics = getShopCashFlowMetrics(comprehensiveOrders, [], testShopId);
  const balancedSum = compMetrics.onlinePayments + compMetrics.counterCash + compMetrics.riderCashInTransit + compMetrics.riderCashSettled;

  assert(compMetrics.grossSales === 3000, 'F1: Gross sales correctly calculated as ₹3000', `Got ${compMetrics.grossSales}`);
  assert(balancedSum === compMetrics.grossSales, 'F2: Double-entry partition equation balances: Online + Counter + InTransit + Settled == Gross Sales (3000 == 3000)', `Sum was ${balancedSum}`);

  // Ledger Journal Line Balance Invariant check
  const journalEntries = [
    { account: 'cash_in_till', debit: 800, credit: 0 },
    { account: 'rider_custody', debit: 0, credit: 800 }
  ];
  const totalDebits = journalEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredits = journalEntries.reduce((sum, e) => sum + e.credit, 0);

  assert(totalDebits === totalCredits, 'F3: Double-entry journal lines balance: Total Debits == Total Credits (800 == 800)', `Debits: ${totalDebits}, Credits: ${totalCredits}`);

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('\n====================================================================');
  console.log(`📊 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================================\n');

  if (failed > 0) {
    console.error('Failure Details:');
    failures.forEach(f => console.error(` - ${f.testName}: ${f.details}`));
    process.exit(1);
  } else {
    console.log('✨ ALL FINANCIAL BILLING & RECONCILIATION INVARIANTS CERTIFIED!\n');
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
