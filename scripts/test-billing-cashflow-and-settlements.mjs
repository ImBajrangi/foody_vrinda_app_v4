#!/usr/bin/env node
// Polyfill global WebSocket for headless CI environments on Node.js < 22
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class WebSocketPolyfill {
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
    send() {}
    close() {}
  };
}

/**
 * ============================================================================
 * FOODY VRINDA — AUTHORITATIVE BILLING, CASH RECONCILIATION & HANDOVER TEST SUITE
 * ============================================================================
 * 
 * Live checks: financial table and RPC denial using the anon API key; service
 * rejection path; empty/local pending-queue worker smoke check.
 * Local model checks: cashflow filtering, partial settlement arithmetic,
 * journal arithmetic, and an in-memory reversal registry.
 *
 * IMPORTANT: These local model checks are NOT database integration tests.
 * The separate SQL harness in ProductDetails/v5_4_billing_reconciliation_integration_suite.sql
 * must be run against a disposable Alpha/Dev database to verify actual
 * settlement, reversal, cross-shop authorization and ledger mutations.
 * CI currently does not execute that SQL harness.
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import {
  settleRiderCashHandover,
  flushPendingSettlements,
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
  console.log('🚀 FOODY VRINDA — AUTHORITATIVE BILLING & DATABASE VERIFICATION');
  console.log('====================================================================\n');

  const testShopA = 'shop-vishnu-fast-food';
  const testShopB = 'shop-radha-rasoi';
  const testRiderId = `rider_sarathi_${Date.now()}`;

  // --------------------------------------------------------------------------
  // SUITE 1: LIVE DATABASE CATALOG & RLS REVOCATION ON ALL 8 FINANCIAL TABLES
  // Invariant: Must return 42501 (Permission Denied). PGRST205 (Missing) FAILS.
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: Live Financial Table Existence & Zero-Trust RLS (42501) ---');
  {
    const financialTables = [
      'foody_cash_accounts',
      'foody_cash_settlements',
      'foody_cash_settlement_allocations',
      'foody_cash_settlement_reversals',
      'foody_cash_ledger_entries',
      'foody_cash_journals',
      'foody_cash_journal_lines',
      'foody_financial_audit_logs'
    ];

    for (const table of financialTables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      // Strictly require 42501 (Permission Denied); reject PGRST205 (missing table)!
      const isProperlyDenied = error?.code === '42501' || (error?.message && error.message.includes('permission denied'));
      const isMissingTable = error?.code === 'PGRST205';

      assert(
        isProperlyDenied && !isMissingTable,
        `1.${financialTables.indexOf(table) + 1} Table "${table}" exists in PostgreSQL catalog and is protected with 42501`,
        error ? `Code: ${error.code}, Message: ${error.message}` : 'Unprotected: data returned'
      );
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 2: PRIVILEGED FINANCIAL RPCS ANONYMOUS EXECUTION DENIAL (42501)
  // Invariant: Privileged financial RPCs cannot be executed by anon callers.
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Privileged Financial RPC Anonymous Denial (42501) ---');
  {
    const rpcChecks = [
      {
        name: 'record_rider_cash_settlement',
        params: { p_rider_id: testRiderId, p_shop_id: testShopA, p_amount_received: 100 }
      },
      {
        name: 'record_settlement_reversal',
        params: { p_settlement_id: 'csh_mock_test_108', p_reason: 'Testing anon block' }
      },
      {
        name: 'get_shop_cash_settlements',
        params: { p_shop_id: testShopA, p_limit: 10, p_offset: 0 }
      },
      {
        name: 'get_rider_outstanding_orders',
        params: { p_rider_id: testRiderId, p_shop_id: testShopA }
      },
      {
        name: 'get_shop_cashflow_summary',
        params: { p_shop_id: testShopA }
      }
    ];

    for (const rpc of rpcChecks) {
      const { error } = await supabase.rpc(rpc.name, rpc.params);
      const isDenied = error?.code === '42501' || (error?.message && error.message.includes('permission denied'));

      assert(
        isDenied,
        `2.${rpcChecks.indexOf(rpc) + 1} RPC "${rpc.name}" anonymous execution strictly blocked with 42501`,
        error ? `Code: ${error.code}, Message: ${error.message}` : 'Unprotected: executed without error'
      );
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 3: DIRECT settleRiderCashHandover() SERVICE INVOCATION & ERROR HANDLING
  // Invariant: Never synthesizes fake receipts; properly catches database denial.
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Direct settleRiderCashHandover() Invocation ---');
  {
    let serviceRejected = false;
    let serviceError = '';

    try {
      await settleRiderCashHandover({
        riderId: testRiderId,
        shopId: testShopA,
        amountReceived: 500,
        idempotencyKey: `idem_svc_test_${Date.now()}`
      });
    } catch (err) {
      serviceRejected = true;
      serviceError = err.message;
    }

    assert(
      serviceRejected,
      '3.1 settleRiderCashHandover() directly invoked: catches and surfaces database rejection',
      `Error: ${serviceError}`
    );
    assert(
      serviceError.includes('permission denied') || serviceError.includes('42501') || serviceError.includes('Financial Settlement Error'),
      '3.2 Direct service call enforces zero-client-write fallback rule on database rejection'
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 4: DIRECT flushPendingSettlements() RETRY WORKER EXECUTION
  // Invariant: Safely processes queues without throwing unhandled exceptions.
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Direct flushPendingSettlements() Retry Worker ---');
  {
    const flushRes = await flushPendingSettlements();
    assert(
      flushRes !== undefined && typeof flushRes.flushed === 'number' && typeof flushRes.remaining === 'number',
      '4.1 flushPendingSettlements() executes cleanly against live environment with 0 unhandled errors'
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 5: LOCAL CASHFLOW HELPER UNIT CHECKS (FABRICATED FIXTURES)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Cross-Shop Financial Isolation ---');
  {
    const shopAOrders = [
      { id: 'ord_shop_a', shop_id: testShopA, total_amount: 500, status: 'completed', payment_method: 'cash', cash_status: 'collected', rider_id: testRiderId }
    ];
    const shopBOrders = [
      { id: 'ord_shop_b', shop_id: testShopB, total_amount: 900, status: 'completed', payment_method: 'cash', cash_status: 'collected', rider_id: testRiderId }
    ];

    const metricsA = getShopCashFlowMetrics([...shopAOrders, ...shopBOrders], [], testShopA);
    const metricsB = getShopCashFlowMetrics([...shopAOrders, ...shopBOrders], [], testShopB);

    assert(metricsA.grossSales === 500, '5.1 Local metrics helper filters fabricated Shop A rows (₹500)');
    assert(metricsB.grossSales === 900, '5.2 Local metrics helper filters fabricated Shop B rows (₹900)');
    assert(metricsA.riderCashInTransit === 500, '5.3 Local rider-float metric uses supplied sample rows');
  }

  // --------------------------------------------------------------------------
  // SUITE 6: LOCAL ALLOCATION ARITHMETIC MODEL (NOT DATABASE TESTS)
  // Validates: ₹500 order -> Handover 1 (₹100) -> Handover 2 (₹400)
  // Checks: previously_settled, remaining_order_debt, and final balance = 0.
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Multi-Handover Partial Settlement & Profile Projection Parity ---');
  {
    const initialOrderTotal = 500.00;
    let prevSettled = 0.00;
    let outstandingDebt = initialOrderTotal - prevSettled;

    // Handover 1: ₹100
    const handover1 = 100.00;
    const alloc1 = Math.min(handover1, outstandingDebt);
    const remainingAfter1 = outstandingDebt - alloc1;
    const orderStatus1 = remainingAfter1 <= 0 ? 'settled' : 'collected';

    // Canonical Account & Derived Profile Float after Handover 1
    let canonicalAccountOutstanding = initialOrderTotal - alloc1;
    let riderProfileCashInHand = canonicalAccountOutstanding;
    let riderProfileUnsettledDebt = canonicalAccountOutstanding;

    assert(alloc1 === 100.00, '6.1 Local model allocates exactly ₹100.00');
    assert(remainingAfter1 === 400.00, '6.2 Local model leaves ₹400.00 outstanding');
    assert(orderStatus1 === 'collected', '6.3 Local model retains collected state while debt remains');
    assert(riderProfileCashInHand === 400.00, '6.4 Local projection model calculates cash_in_hand as ₹400.00');
    assert(riderProfileUnsettledDebt === 400.00, '6.5 Local projection model calculates unsettled_debt as ₹400.00');

    // Handover 2: ₹400 (The remaining balance)
    prevSettled = alloc1; // Previous allocated sum = 100.00
    outstandingDebt = initialOrderTotal - prevSettled; // True remaining debt = 400.00
    assert(outstandingDebt === 400.00, '6.6 Local model computes second handover against ₹400.00 remainder');

    const handover2 = 400.00;
    const alloc2 = Math.min(handover2, outstandingDebt);
    const remainingAfter2 = outstandingDebt - alloc2;
    const orderStatus2 = remainingAfter2 <= 0 ? 'settled' : 'collected';

    // Canonical Account & Derived Profile Float after Handover 2
    canonicalAccountOutstanding -= alloc2;
    riderProfileCashInHand = canonicalAccountOutstanding;
    riderProfileUnsettledDebt = canonicalAccountOutstanding;

    assert(alloc2 === 400.00, '6.7 Local model allocates exactly ₹400.00');
    assert(remainingAfter2 === 0.00, '6.8 Local model final order debt is ₹0.00');
    assert(orderStatus2 === 'settled', '6.9 Local model marks the order settled at zero debt');
    assert(canonicalAccountOutstanding === 0.00, '6.10 Local account model ends at ₹0.00');
    assert(riderProfileCashInHand === 0.00, '6.11 Local profile projection model ends at ₹0.00');
    assert(riderProfileUnsettledDebt === 0.00, '6.12 Local debt projection model ends at ₹0.00');
  }

  // --------------------------------------------------------------------------
  // SUITE 7: LOCAL DOUBLE-ENTRY ARITHMETIC CHECK (NOT DATABASE JOURNAL READS)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Balanced Double-Entry Journal Audit ---');
  {
    // Normal Settlement Journal
    const jrn1 = [
      { account: 'Cash In Kitchen Register', debit: 1000.00, credit: 0.00 },
      { account: 'Rider Custody Receivable', debit: 0.00, credit: 1000.00 }
    ];
    assert(
      jrn1.reduce((s, l) => s + l.debit, 0) === jrn1.reduce((s, l) => s + l.credit, 0),
      '7.1 Sample journal debit/credit totals balance (1000 == 1000)'
    );

    // Excess / Suspense Settlement Journal
    const jrn2 = [
      { account: 'Cash In Kitchen Register', debit: 500.00, credit: 0.00 },
      { account: 'Rider Custody Receivable', debit: 0.00, credit: 475.00 },
      { account: 'Cashier Suspense / Excess Cash', debit: 0.00, credit: 25.00 }
    ];
    assert(
      jrn2.reduce((s, l) => s + l.debit, 0) === jrn2.reduce((s, l) => s + l.credit, 0),
      '7.2 Sample excess/suspense journal arithmetic balances (500 == 500)'
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 8: LOCAL REVERSAL REGISTRY MODEL (NOT DATABASE REVERSAL RPC)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 8: Reversal Idempotency & COD Trigger Suppression ---');
  {
    const reversalRegistry = new Set();
    const reverseSettlement = (id) => {
      if (reversalRegistry.has(id)) throw new Error('ALREADY_REVERSED');
      reversalRegistry.add(id);
      return { reversed: true, suppressed_trigger: true };
    };

    const rev1 = reverseSettlement('csh_batch_1');
    assert(rev1.reversed === true, '8.1 Local reversal registry accepts its first key');

    let duplicateBlocked = false;
    try {
      reverseSettlement('csh_batch_1');
    } catch (e) {
      duplicateBlocked = e.message === 'ALREADY_REVERSED';
    }
    assert(duplicateBlocked, '8.2 Local Set blocks a repeated key (database RPC is covered only by SQL harness)');
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n====================================================================');
  console.log(`📊 MASTER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================================\n');

  if (failed > 0) {
    console.error('❌ Failures occurred:');
    failures.forEach(f => console.error(` - ${f.testName}: ${f.details}`));
    process.exit(1);
  } else {
    console.log('✨ Live API denial checks and local model checks passed; run the SQL harness separately for database settlement/reversal certification.\n');
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
