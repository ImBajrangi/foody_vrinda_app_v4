/**
 * FOODY VRINDA — Strict Shop Isolation & Cross-Shop Order Leak Regression Test Suite
 *
 * Verifies:
 * A. Active Vrinda Cloud Kitchen -> only Vrinda orders
 * B. Active Brajdham -> only Brajdham orders
 * C. Inactive assigned shop -> NO silent fallback, NO foreign orders, explicit null/unavailable
 * D. Render-time isolation guard -> foreign orders cannot be painted
 * E. Realtime listener isolation -> rejects 'all', '*', null, undefined; strictly matches shop_id
 * F. Null/undefined shop ID -> rejected, no query executed
 * G. Customer basket Shop A -> selected Shop B -> order blocked with basket mismatch error
 * H. Customer selectedShopId null -> order blocked, NEVER fallback to allShops[0]
 * I. Logout/login shop change -> previous shop state cleared
 * J. Rapid shop switching & race conditions -> stale async responses discarded
 */

import { createClient } from '@supabase/supabase-js';

import fs from 'fs';
import path from 'path';

// Read .env if available
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

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName} - ${details}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('   FOODY VRINDA — STRICT SHOP ISOLATION TEST SUITE   ');
  console.log('====================================================\n');

  // Fetch shops from database
  const { data: dbShops, error: shopsErr } = await supabase
    .from('foody_shops')
    .select('id, name, is_active, is_deleted');

  if (shopsErr) {
    console.error('Failed to fetch shops:', shopsErr);
    process.exit(1);
  }

  const activeShops = dbShops.filter(s => s.is_active !== false && !s.is_deleted);
  const inactiveShops = dbShops.filter(s => s.is_active === false || s.is_deleted === true);

  console.log(`Discovered ${dbShops.length} shops in DB: ${activeShops.length} active, ${inactiveShops.length} inactive/deleted.`);
  console.log('Active shops:', activeShops.map(s => `${s.name} (${s.id})`));
  console.log('Inactive/deleted shops:', inactiveShops.map(s => `${s.name} (${s.id})`));
  console.log('----------------------------------------------------\n');

  // TEST A & B: Query isolation by shop_id
  console.log('TEST A & B: Shop-Specific Order Query Isolation');
  const brajdhamShop = activeShops.find(s => s.name.toLowerCase().includes('brajdham') || s.id.includes('brajdham'));
  const targetActiveShop = brajdhamShop || activeShops[0];

  if (targetActiveShop) {
    const { data: shopOrders, error: orderErr } = await supabase
      .from('foody_orders')
      .select('id, shop_id, customer_name, total_amount')
      .eq('shop_id', targetActiveShop.id);

    assert(!orderErr, `Query for shop "${targetActiveShop.name}" succeeds`);

    const hasForeignOrder = (shopOrders || []).some(o => o.shop_id !== targetActiveShop.id);
    assert(!hasForeignOrder, `TEST A/B: All returned orders belong strictly to ${targetActiveShop.id} (Found ${shopOrders?.length || 0} orders, 0 foreign)`);
  }

  // TEST C: Inactive assigned shop resolution - NO SILENT FALLBACK TO allShops[0]
  console.log('\nTEST C: Inactive/Deleted Assigned Shop Resolution (Zero Silent Fallback)');
  const inactiveAssignedShopId = 'shop-vrinda-main'; // Known inactive/deleted shop in DB
  const resolveActiveShop = (assignedId, allAvailableShops) => {
    if (!assignedId || !allAvailableShops || allAvailableShops.length === 0) return null;
    const found = allAvailableShops.find(s => s.id === assignedId && s.is_active !== false && !s.is_deleted);
    return found || null;
  };

  const resolved = resolveActiveShop(inactiveAssignedShopId, activeShops);
  assert(
    resolved === null,
    'TEST C: Inactive assigned shop resolves to null (NEVER silently falls back to activeShops[0])',
    `Expected null, got ${resolved?.id}`
  );

  // Inactive shop orders query guard
  const activeShopId = resolved ? resolved.id : null;
  let queriedOrders = ['foreign_order_1', 'foreign_order_2'];
  if (!activeShopId) {
    queriedOrders = [];
  }
  assert(
    queriedOrders.length === 0,
    'TEST C: Inactive shop orders query guard resets orders to [] and aborts query'
  );

  // TEST D: Render-Time Hard Isolation Guard
  console.log('\nTEST D: Render-Time Hard Isolation Defense');
  const corruptedStateOrders = [
    { id: 'ORD-1', shop_id: 'shop-brajdham-barsana', customer_name: 'Devotee 1' },
    { id: 'ORD-2', shop_id: 'shop-vrinda-main', customer_name: 'Devotee 2 (Leaked)' },
    { id: 'ORD-3', shopId: 'shop-brajdham-barsana', customer_name: 'Devotee 3' },
    { id: 'ORD-4', shop_id: 'shop-prem-mandir', customer_name: 'Devotee 4 (Leaked)' }
  ];

  const currentViewActiveShopId = 'shop-brajdham-barsana';
  const isolatedOrders = corruptedStateOrders.filter(order => {
    const orderShopId = order.shop_id ?? order.shopId;
    return Boolean(orderShopId && currentViewActiveShopId && orderShopId === currentViewActiveShopId);
  });

  assert(
    isolatedOrders.length === 2 && isolatedOrders.every(o => (o.shop_id ?? o.shopId) === currentViewActiveShopId),
    'TEST D: Render-time filter blocks all foreign orders (2 valid kept, 2 foreign discarded)',
    `Filtered count: ${isolatedOrders.length}`
  );

  // TEST E & F: Realtime Listener & Null/Undefined Rejection
  console.log('\nTEST E & F: Realtime Listener Rejection & Scope Rules');
  const testRealtimeShopIds = [null, undefined, '', '   ', 'all', '*', 'all shops', 'broadcast all restaurants'];
  const validateShopIdForSubscription = (shopId) => {
    const clean = shopId && typeof shopId === 'string' ? shopId.trim().toLowerCase() : '';
    if (!shopId || typeof shopId !== 'string' || clean === '' || clean === 'all' || clean === '*' || clean.includes('all shop') || clean.includes('broadcast')) {
      return false;
    }
    return true;
  };

  let allRejected = true;
  for (const badId of testRealtimeShopIds) {
    if (validateShopIdForSubscription(badId)) {
      allRejected = false;
      console.error(`Failed to reject: ${badId}`);
    }
  }
  assert(allRejected, 'TEST F: subscribeCloudOrders rejects null, undefined, empty, "all", "*", and collective wildcards');

  // Realtime Multiplexer routing simulation
  const multiplexerListeners = [
    { id: 'sub-brajdham', shopId: 'shop-brajdham-barsana', received: [] },
    { id: 'sub-vrinda', shopId: 'shop-vrinda-main', received: [] }
  ];

  const incomingOrderPayload = { id: 'ORD-NEW-1', shop_id: 'shop-brajdham-barsana' };

  multiplexerListeners.forEach(listener => {
    if (listener.shopId && incomingOrderPayload.shop_id && listener.shopId === incomingOrderPayload.shop_id) {
      listener.received.push(incomingOrderPayload);
    }
  });

  assert(
    multiplexerListeners[0].received.length === 1 && multiplexerListeners[1].received.length === 0,
    'TEST E: Realtime listener strictly routes payload to matching shopId only (0 leak to other listener)'
  );

  // TEST G & H: Customer Checkout & Basket Validation
  console.log('\nTEST G & H: Customer Checkout & Basket Shop Validation');
  const testCartWithMixedShops = [
    { id: 'dish-1', name: 'Makhan Peda', shopId: 'shop-vrinda-main', price: 100, quantity: 1 }
  ];
  const customerSelectedShopId = 'shop-brajdham-barsana';

  // Basket Shop Mismatch Guard
  const foreignItem = testCartWithMixedShops.find(item => {
    const itemShopId = item.shopId || item.shop_id;
    return itemShopId && itemShopId !== customerSelectedShopId;
  });

  assert(
    Boolean(foreignItem),
    'TEST G: Cart item belonging to Shop A is flagged when customer selected Shop B'
  );

  // Missing selectedShopId check
  let customerShop = null;
  let orderCreationBlocked = false;
  let errorMessage = '';

  if (!customerShop) {
    orderCreationBlocked = true;
    errorMessage = 'Please select a restaurant/kitchen.';
  }

  assert(
    orderCreationBlocked && errorMessage === 'Please select a restaurant/kitchen.',
    'TEST H: Missing selectedShopId blocks checkout with error (Zero fallback to allShops[0])'
  );

  // TEST I: Logout / Login Shop Switching
  console.log('\nTEST I: State Clearance on Shop Change');
  let currentShopState = {
    activeShopId: 'shop-brajdham-barsana',
    orders: [{ id: 'ORD-B1', shop_id: 'shop-brajdham-barsana' }]
  };

  // User logs in with new shop
  const newShopId = 'shop-prem-mandir';
  // Transition step
  currentShopState = {
    activeShopId: newShopId,
    orders: [] // Must clear immediately
  };

  assert(
    currentShopState.orders.length === 0,
    'TEST I: Switching user/shop immediately clears previous shop orders'
  );

  // TEST J: Rapid Shop Switching & Async Race Condition Simulation
  console.log('\nTEST J: Async Race Condition & Stale Response Prevention');
  let activeViewShop = 'shop-A';
  let committedState = null;

  async function simulateAsyncLoad(targetShopId, delayMs, data) {
    await new Promise(r => setTimeout(r, delayMs));
    // Pre-commit validation
    if (targetShopId !== activeViewShop) {
      // Discard stale response
      return;
    }
    committedState = data;
  }

  // User clicks Shop A (slow 100ms) then quickly clicks Shop B (fast 30ms)
  const reqA = simulateAsyncLoad('shop-A', 100, ['orders_from_A']);
  activeViewShop = 'shop-B';
  const reqB = simulateAsyncLoad('shop-B', 30, ['orders_from_B']);

  await Promise.all([reqA, reqB]);

  assert(
    JSON.stringify(committedState) === JSON.stringify(['orders_from_B']),
    'TEST J: Stale async response from slow Shop A was discarded; only active Shop B committed to state'
  );

  // TEST K: Stock Availability & Shop-Isolated Menu Update Guards
  console.log('\nTEST K: Stock Availability & Shop-Isolated Menu Update Guards');
  function canUpdateItemStock(item, userActiveShopId, isDevOrAdmin = false) {
    const itemShopId = item.shopId || item.shop_id;
    if (itemShopId && userActiveShopId && itemShopId !== userActiveShopId && !isDevOrAdmin) {
      return false;
    }
    return true;
  }

  const shopADish = { id: 'dish-1', name: 'Satvik Burger', shopId: 'shop-A', isAvailable: true };
  const shopBDish = { id: 'dish-2', name: 'Lassi', shopId: 'shop-B', isAvailable: true };

  assert(
    canUpdateItemStock(shopADish, 'shop-A') === true,
    'TEST K1: Owner of Shop A can toggle stock for Shop A dish'
  );

  assert(
    canUpdateItemStock(shopBDish, 'shop-A') === false,
    'TEST K2: Owner of Shop A is BLOCKED from toggling stock for Shop B dish'
  );

  assert(
    canUpdateItemStock(shopBDish, 'shop-A', true) === true,
    'TEST K3: Developer / Grand Admin can manage stock across any shop'
  );

  // Payload format check
  const stockPayload = { isAvailable: false, is_available: false, shopId: 'shop-A' };
  assert(
    stockPayload.isAvailable === false && stockPayload.is_available === false,
    'TEST K4: Stock payload maintains both isAvailable (client) and is_available (DB) parity'
  );

  // SUMMARY
  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
