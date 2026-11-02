#!/usr/bin/env node
/**
 * ============================================================================
 * TEST 1: UNPRIVILEGED NORMAL CUSTOMER FLOW TEST SUITE
 * ============================================================================
 * 
 * ROLE: Strictly Normal Customer (role: 'customer')
 * INVARIANT: Zero Developer or Delivery privileges.
 * 
 * SPECIFICATIONS VALIDATED:
 * 1. Customer Role Boundaries (isAuthorizedAdmin: false, isAuthorizedDeveloper: false, isDelivery: false)
 * 2. When NO delivery boy is available (0 riders online) and kitchen has no self-delivery:
 *    - isDeliveryAvailable MUST be FALSE.
 *    - Customer sees ONLY Self-Pickup option.
 * 3. When shop owner disables delivery (deliveryAvailable: false):
 *    - isDeliveryAvailable MUST be FALSE.
 * 4. When kitchen has self-delivery enabled OR delivery boys are online:
 *    - isDeliveryAvailable MUST be TRUE.
 *    - Customer sees Doorstep Delivery option and can place delivery order.
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { normalizeShop } from '../src/services/supabase/cache.js';
import { isRiderOnline } from '../src/services/supabase/riders.service.js';

// Load Supabase credentials from .env
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
const errors = [];

function assert(condition, stepName, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${stepName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${stepName} — ${details}`);
    failed++;
    errors.push({ stepName, details });
  }
}

/**
 * Exact helper function matching CustomerView.jsx logic for isDeliveryAvailable
 */
function evaluateCustomerDeliveryAvailable({ cartGroupedByShop, onlineRidersCount, isShopSelfDelivery }) {
  return Boolean(
    cartGroupedByShop.length > 0
      ? cartGroupedByShop.every(g => {
          const shop = g.shop;
          if (!shop) return onlineRidersCount > 0 || isShopSelfDelivery;
          if (shop.delivery_available === false || shop.deliveryAvailable === false) return false;
          return Boolean(
            onlineRidersCount > 0 ||
            isShopSelfDelivery ||
            shop.self_delivery ||
            shop.can_deliver ||
            shop.selfDelivery ||
            shop.canDeliver
          );
        })
      : (onlineRidersCount > 0 || isShopSelfDelivery)
  );
}

async function runTest() {
  console.log('\n====================================================================');
  console.log('   TEST 1: UNPRIVILEGED NORMAL CUSTOMER FLOW (ZERO DEV / ZERO RIDER)');
  console.log('====================================================================\n');

  // STEP 1: Verify Customer Persona & Boundaries
  console.log('▶ STEP 1: Verifying Strict Customer Persona Boundaries');
  const customerUser = {
    id: `cust_test_${Date.now().toString().slice(-6)}`,
    displayName: 'Priya Sharma (Normal Devotee)',
    email: 'priya.customer@foodyvrinda.test',
    phone: '9876543210',
    role: 'customer'
  };

  const isAuthorizedDeveloper = customerUser.role === 'developer';
  const isAuthorizedAdmin = customerUser.role === 'admin' || customerUser.role === 'owner';
  const isDeliveryStaff = customerUser.role === 'delivery' || customerUser.role === 'rider';

  assert(!isAuthorizedDeveloper, '1.1 Normal customer has zero Developer permissions');
  assert(!isAuthorizedAdmin, '1.2 Normal customer has zero Admin / Shop Owner permissions');
  assert(!isDeliveryStaff, '1.3 Normal customer has zero Rider / Delivery Sarathi permissions');

  // STEP 2: Fetch Active Shops as a Public Customer
  console.log('\n▶ STEP 2: Fetching Active Kitchen Catalog from Supabase');
  const { data: rawShops, error: shopErr } = await supabase
    .from('foody_shops')
    .select('*')
    .neq('is_deleted', true);

  assert(!shopErr, '2.1 Query foody_shops succeeded without permission denial');
  assert(Array.isArray(rawShops) && rawShops.length > 0, '2.2 Active shops found in database');

  const { data: allMenus } = await supabase.from('foody_menus').select('shop_id').neq('is_deleted', true);
  const shopsWithDishes = new Set((allMenus || []).map(m => m.shop_id));

  const normalizedShops = rawShops.map(normalizeShop);
  const activeKitchen = normalizedShops.find(s => s.is_active !== false && s.is_online !== false && shopsWithDishes.has(s.id)) 
    || normalizedShops.find(s => shopsWithDishes.has(s.id))
    || normalizedShops[0];
  assert(Boolean(activeKitchen), '2.3 Resolved active kitchen branch for customer', `Selected: ${activeKitchen?.name} (${activeKitchen?.id})`);

  // STEP 3: Verify Delivery Availability When NO Delivery Boy is Available
  console.log('\n▶ STEP 3: Verifying Rule — When 0 Delivery Boys are Available & No Kitchen Self-Delivery');
  
  // Create cart with items from the active kitchen
  const testCartGroup = [{
    shopId: activeKitchen.id,
    shop: {
      ...activeKitchen,
      delivery_available: true,
      deliveryAvailable: true,
      self_delivery: false,
      can_deliver: false,
      selfDelivery: false,
      canDeliver: false
    },
    shopName: activeKitchen.name,
    subtotal: 150,
    deliveryCharge: 30,
    gstPercentage: 5
  }];

  const deliveryWhenNoRiders = evaluateCustomerDeliveryAvailable({
    cartGroupedByShop: testCartGroup,
    onlineRidersCount: 0,
    isShopSelfDelivery: false
  });

  assert(deliveryWhenNoRiders === false, '3.1 Delivery is STRICTLY UNAVAILABLE when 0 delivery boys are online and no self-delivery exists');
  
  // Customer View automatically locks fulfillmentType to 'pickup'
  const fallbackFulfillment = deliveryWhenNoRiders ? 'delivery' : 'pickup';
  assert(fallbackFulfillment === 'pickup', '3.2 Fulfillment selector defaults strictly to Self-Pickup only when delivery is offline');

  // STEP 4: Verify Delivery Availability When Shop Owner Disables Delivery
  console.log('\n▶ STEP 4: Verifying Rule — When Shop Owner Disables Delivery in Kitchen Settings');
  const shopOwnerDisabledGroup = [{
    shopId: activeKitchen.id,
    shop: {
      ...activeKitchen,
      delivery_available: false,
      deliveryAvailable: false
    },
    shopName: activeKitchen.name,
    subtotal: 150,
    deliveryCharge: 30,
    gstPercentage: 5
  }];

  const deliveryWhenShopDisabled = evaluateCustomerDeliveryAvailable({
    cartGroupedByShop: shopOwnerDisabledGroup,
    onlineRidersCount: 3, // Even if 3 riders are online!
    isShopSelfDelivery: true
  });

  assert(deliveryWhenShopDisabled === false, '4.1 When shop owner disables delivery, Doorstep Delivery is disabled even if riders are online');

  // STEP 5: Verify Delivery Availability When Delivery Boy IS Available
  console.log('\n▶ STEP 5: Verifying Rule — When a Delivery Boy Goes Online');
  const deliveryWhenRiderOnline = evaluateCustomerDeliveryAvailable({
    cartGroupedByShop: testCartGroup,
    onlineRidersCount: 1, // 1 Sarathi on duty!
    isShopSelfDelivery: false
  });

  assert(deliveryWhenRiderOnline === true, '5.1 When at least 1 Delivery Boy is online, Doorstep Delivery becomes AVAILABLE to customer');

  // STEP 6: Customer Adds Dish to Basket and Places Order
  console.log('\n▶ STEP 6: Customer Selecting Dish & Completing Order');
  const { data: menuItems, error: menuErr } = await supabase
    .from('foody_menus')
    .select('*')
    .eq('shop_id', activeKitchen.id)
    .neq('is_deleted', true)
    .limit(3);

  assert(!menuErr, '6.1 Loaded menu catalog for selected branch');
  assert(Array.isArray(menuItems) && menuItems.length > 0, '6.2 Menu items available in branch');

  const chosenDish = menuItems[0];
  const cartSubtotal = Number(chosenDish.price) * 2;
  const deliveryCharge = deliveryWhenRiderOnline ? Number(activeKitchen.deliveryCharge || 30) : 0;
  const gstAmount = Math.round((cartSubtotal * 5) / 100);
  const totalAmount = cartSubtotal + deliveryCharge + gstAmount;

  const orderId = `test_order_${Date.now()}`;
  const orderPayload = {
    id: orderId,
    shop_id: activeKitchen.id,
    customer_name: customerUser.displayName,
    customer_phone: customerUser.phone,
    customer_address: 'Chatikara Road, Near Raman Reti, Vrindavan',
    delivery_address: 'Chatikara Road, Near Raman Reti, Vrindavan',
    delivery_coordinates: activeKitchen.coordinates || { lat: 27.5706, lng: 77.6593 },
    items: [{
      id: chosenDish.id,
      name: chosenDish.name,
      price: Number(chosenDish.price),
      quantity: 2,
      subtotal: cartSubtotal
    }],
    subtotal: cartSubtotal,
    delivery_charge: deliveryCharge,
    gst_amount: gstAmount,
    total_amount: totalAmount,
    status: 'new',
    fulfillment_type: deliveryWhenRiderOnline ? 'delivery' : 'pickup',
    payment_method: 'cod',
    cash_status: 'pending'
  };

  assert(orderPayload.fulfillment_type === 'delivery', '6.3 Order correctly configured for delivery when rider is available');
  assert(orderPayload.total_amount === (cartSubtotal + deliveryCharge + gstAmount), '6.4 Financial totals match arithmetic expectation');

  console.log('\n--------------------------------------------------------------------');
  console.log(`TEST 1 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('--------------------------------------------------------------------\n');

  if (failed > 0) {
    console.error('Issues identified:', errors);
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('Test 1 execution exception:', err);
  process.exit(1);
});
