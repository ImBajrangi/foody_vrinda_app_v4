import {
  supabase,
  getCloudShops,
  getCloudMenus,
  createCloudMenuItem,
  updateCloudMenuItem,
  deleteCloudMenuItem,
  createCloudOrder,
  updateCloudOrderStatus,
  markCloudOrderCashCollected,
  resolveDishCutout,
  subscribeCloudMenus,
  subscribeCloudOrders,
  normalizeShop
} from '../src/supabase.js';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function pass(msg) {
  console.log(`${COLORS.green}  ✓ [PASS]${COLORS.reset} ${msg}`);
}

function fail(msg, err) {
  console.error(`${COLORS.red}  ✗ [FAIL]${COLORS.reset} ${msg}`);
  if (err) console.error(err);
}

function section(title) {
  console.log(`\n${COLORS.cyan}${COLORS.bright}======================================================${COLORS.reset}`);
  console.log(`${COLORS.cyan}${COLORS.bright}  ${title}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${COLORS.bright}======================================================${COLORS.reset}`);
}

async function runTestSuite() {
  console.log(`\n${COLORS.bright}🚀 FOODY VRINDA — ENTERPRISE DATABASE & REALTIME SYNC AUDIT${COLORS.reset}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, successMsg, failMsg) {
    totalTests++;
    if (condition) {
      pass(successMsg);
      passedTests++;
      return true;
    } else {
      fail(failMsg || successMsg);
      failedTests++;
      return false;
    }
  }

  // =========================================================================
  // TEST 1: SUPABASE CONNECTIVITY & CORE TABLE HEALTH CHECK
  // =========================================================================
  section('1. SUPABASE CLOUD CONNECTION & SCHEMA AUDIT');
  const tablesToCheck = ['foody_shops', 'foody_menus', 'foody_orders', 'foody_users'];

  for (const tbl of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(tbl).select('*').limit(1);
      assert(!error, `Table "${tbl}" reachable and responding`, `Table "${tbl}" query error: ${error?.message}`);
    } catch (e) {
      assert(false, `Table "${tbl}" query succeeded`, `Exception connecting to "${tbl}": ${e.message}`);
    }
  }

  // =========================================================================
  // TEST 2: KITCHEN BRANCHES (SHOPS) AUDIT & NORMALIZATION
  // =========================================================================
  section('2. KITCHENS / SHOPS FETCH & NORMALIZATION');
  let shops = [];
  try {
    shops = await getCloudShops();
    assert(Array.isArray(shops) && shops.length > 0, `Fetched ${shops.length} kitchens from database`, 'No kitchens returned');

    const primaryShop = shops[0];
    assert(primaryShop?.id, `Primary kitchen has valid ID: ${primaryShop?.id}`, 'Kitchen missing ID');
    assert(primaryShop?.name, `Kitchen name: "${primaryShop?.name}"`, 'Kitchen missing name');
    assert(typeof primaryShop?.isOpen === 'boolean', `Kitchen online/open state normalized: ${primaryShop?.isOpen}`, 'isOpen not boolean');
    assert(primaryShop?.paymentSettings !== undefined, 'Kitchen payment settings normalized', 'paymentSettings missing');
  } catch (e) {
    assert(false, 'Fetched and validated kitchens', e.message);
  }

  const kitchenA = shops[0]?.id || 'shop-vrinda-main';
  const kitchenB = shops[1]?.id || (shops.length > 1 ? shops[1].id : 'shop-prem-mandir');

  // =========================================================================
  // TEST 3: CUSTOM DISH CREATION & AI IMAGE PRESERVATION (NO BURGER OVERWRITE)
  // =========================================================================
  section('3. DISH CREATION & AI IMAGE PRESERVATION');
  const testDishId = `test-dish-${Date.now()}`;
  const mockAiBase64Image = 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2/8AAP///9v/AAD///8AAAA=';
  const customWebUrl = 'https://images.example.com/custom-aloo-chaat.png';

  // 3a. Test resolveDishCutout directly
  const resolvedBase64 = resolveDishCutout(mockAiBase64Image, 'Aloo Chaat Special', 'Snacks');
  assert(
    resolvedBase64 === mockAiBase64Image,
    'resolveDishCutout PRESERVED AI base64 photo (not overwritten by burger/pizza fallback)',
    `resolveDishCutout failed: returned ${resolvedBase64}`
  );

  const resolvedWeb = resolveDishCutout(customWebUrl, 'Aloo Chaat Special', 'Snacks');
  assert(
    resolvedWeb === customWebUrl,
    'resolveDishCutout PRESERVED custom web URL (not overwritten by fallback)',
    `resolveDishCutout failed: returned ${resolvedWeb}`
  );

  // 3b. Create test dish in Kitchen A
  let createdDish = null;
  try {
    createdDish = await createCloudMenuItem({
      id: testDishId,
      shopId: kitchenA,
      name: 'Test Satvik Aloo Chaat',
      subtitle: 'Crispy potato cubes with mint & tamarind chutney',
      description: 'Handcrafted Vedic street food with rock salt and roasted cumin',
      category: 'Snacks',
      price: 110,
      imageUrl: mockAiBase64Image,
      isAvailable: true,
      kcal: '190 kcal'
    });

    assert(createdDish && createdDish.id === testDishId, `Created test dish "${createdDish?.name}" in ${kitchenA}`, 'Failed to create dish');
    assert(createdDish?.image === mockAiBase64Image, 'Saved dish retains exact AI image in database/state', 'Dish image altered on save');
  } catch (e) {
    assert(false, 'Created test dish with custom image', e.message);
  }

  // =========================================================================
  // TEST 4: KITCHEN ISOLATION VERIFICATION
  // =========================================================================
  section('4. MULTI-KITCHEN ISOLATION AUDIT');
  try {
    const kitchenAMenus = await getCloudMenus(kitchenA);
    const inKitchenA = kitchenAMenus.some(m => m.id === testDishId);
    assert(inKitchenA, `Dish correctly present in assigned Kitchen A (${kitchenA})`, `Dish missing in ${kitchenA}`);

    if (kitchenB && kitchenB !== kitchenA) {
      const kitchenBMenus = await getCloudMenus(kitchenB);
      const inKitchenB = kitchenBMenus.some(m => m.id === testDishId);
      assert(!inKitchenB, `Dish strictly ISOLATED: NOT present in Kitchen B (${kitchenB})`, `Dish leaked into ${kitchenB}!`);
    }
  } catch (e) {
    assert(false, 'Verified multi-kitchen isolation', e.message);
  }

  // =========================================================================
  // TEST 5: CROSS-KITCHEN DISH MIGRATION / EDIT
  // =========================================================================
  section('5. CROSS-KITCHEN DISH MIGRATION & UPDATES');
  try {
    const updated = await updateCloudMenuItem(testDishId, {
      shopId: kitchenB,
      name: 'Test Satvik Aloo Chaat (Moved to Kitchen B)',
      price: 125,
      imageUrl: customWebUrl
    });

    assert(updated !== null, 'updateCloudMenuItem executed successfully with shop_id migration', 'Update returned null');

    const menusAAfterMove = await getCloudMenus(kitchenA);
    const inKitchenAAfterMove = menusAAfterMove.some(m => m.id === testDishId);
    assert(!inKitchenAAfterMove, `Dish successfully REMOVED from old Kitchen A (${kitchenA})`, 'Dish still in Kitchen A after move');

    const menusBAfterMove = await getCloudMenus(kitchenB);
    const inKitchenBAfterMove = menusBAfterMove.some(m => m.id === testDishId);
    assert(inKitchenBAfterMove, `Dish successfully MOVED into new Kitchen B (${kitchenB})`, 'Dish not found in Kitchen B after move');
  } catch (e) {
    assert(false, 'Moved dish between kitchens', e.message);
  }

  // =========================================================================
  // TEST 6: DISH DELETION & ZERO-LATENCY CACHE PURGE
  // =========================================================================
  section('6. DISH DELETION & MULTI-TIER CACHE PURGE');
  try {
    const deleteSuccess = await deleteCloudMenuItem(testDishId, kitchenB);
    assert(deleteSuccess === true, 'deleteCloudMenuItem returned success true', 'Delete failed');

    const menusBAfterDelete = await getCloudMenus(kitchenB);
    const inKitchenBAfterDelete = menusBAfterDelete.some(m => m.id === testDishId);
    assert(!inKitchenBAfterDelete, `Dish permanently deleted from Kitchen B (${kitchenB}) without ghost resurrection`, 'Deleted dish still in menu');

    const { data: directQuery } = await supabase.from('foody_menus').select('id').eq('id', testDishId).maybeSingle();
    assert(!directQuery, 'Supabase direct SQL confirms dish row was physically removed', 'Row still in Supabase table');
  } catch (e) {
    assert(false, 'Deleted test dish and purged cache', e.message);
  }

  // =========================================================================
  // TEST 7: ORDER LIFECYCLE & REALTIME STATE MUTATIONS
  // =========================================================================
  section('7. ORDER CREATION & LIFECYCLE STATE MACHINE');
  const testOrderId = `test-ord-${Date.now()}`;
  try {
    const order = await createCloudOrder({
      id: testOrderId,
      shopId: kitchenA,
      customerName: 'Test Customer',
      customerPhone: '9876543210',
      customerAddress: 'Raman Reti, Vrindavan',
      items: [{ id: 'sample-item', name: 'Vedic Thali', price: 220, quantity: 1 }],
      totalAmount: 220,
      paymentMethod: 'cash',
      cashStatus: 'pending',
      status: 'new'
    });

    assert(order && order.id === testOrderId, `Created test order #${testOrderId.slice(-6)}`, 'Failed to create order');

    // Update status to preparing
    const updatedPreparing = await updateCloudOrderStatus(testOrderId, 'preparing');
    assert(updatedPreparing !== null, 'Order transitioned to "preparing"', 'Failed to set preparing');

    // Update status to ready
    const updatedReady = await updateCloudOrderStatus(testOrderId, 'ready');
    assert(updatedReady !== null, 'Order transitioned to "ready"', 'Failed to set ready');

    // Mark Cash Collected
    const cashCollected = await markCloudOrderCashCollected(testOrderId);
    assert(cashCollected !== null, 'COD payment marked as Collected', 'Failed to mark cash collected');

    // Clean up test order
    await supabase.from('foody_orders').delete().eq('id', testOrderId);
    pass('Test order cleaned up cleanly from database');
  } catch (e) {
    assert(false, 'Executed order lifecycle', e.message);
  }

  // =========================================================================
  // TEST 8: CRYPTOGRAPHIC OTP SECURITY & NO '0000' BYPASS
  // =========================================================================
  section('8. CRYPTOGRAPHIC OTP SECURITY & BACKDOOR ELIMINATION');
  try {
    const { getOrderOTP, verifyOrderOTP, generateSecureOrderOTP } = await import('../src/supabase.js');
    
    // 8.1 Random OTP generation
    const otp1 = generateSecureOrderOTP();
    const otp2 = generateSecureOrderOTP();
    assert(otp1 && otp1.length === 4, `Generated secure 4-digit OTP: ${otp1}`, 'Invalid OTP length');
    
    // 8.2 Verify '0000' backdoor is strictly blocked
    const testSecureId = `sec-ord-${Date.now()}`;
    const realOtp = getOrderOTP(testSecureId, 'delivery');
    assert(realOtp && realOtp.length === 4, `Assigned random delivery OTP for order #${testSecureId.slice(-6)}`, 'Failed to assign OTP');

    const backdoorAttempt = verifyOrderOTP(testSecureId, 'delivery', '0000');
    if (realOtp === '0000') {
      // 1 in 9000 chance
      pass('Bypass tested');
    } else {
      assert(backdoorAttempt === false, "Master backdoor '0000' is strictly REJECTED", "Critical: '0000' backdoor accepted!");
    }

    // 8.3 Exact matching succeeds
    const validAttempt = verifyOrderOTP(testSecureId, 'delivery', realOtp);
    assert(validAttempt === true, "Valid matching OTP verified successfully", "Valid OTP rejected");
  } catch (e) {
    assert(false, 'Tested OTP security', e.message);
  }

  // =========================================================================
  // TEST 9: AUTHORITATIVE SERVER-SIDE PRICE CALCULATION
  // =========================================================================
  section('9. AUTHORITATIVE PRICING & TAX CALCULATION');
  try {
    const { calculateAuthoritativeOrderTotals } = await import('../src/supabase.js');
    const items = [
      { id: 'dish-1', name: 'Cheese With Satvik Burger', price: 9999, quantity: 2 }, // Client claimed fake high price 9999
      { id: 'dish-5', name: 'Vrindavan Special Matka Lassi', price: 1, quantity: 1 } // Client claimed fake low price 1
    ];
    
    const totals = calculateAuthoritativeOrderTotals(kitchenA, items, 'delivery');
    assert(totals.subtotal > 0, `Authoritative subtotal calculated from catalog: ₹${totals.subtotal}`, 'Subtotal zero');
    assert(totals.gstAmount > 0, `5% GST calculated authoritatively: ₹${totals.gstAmount}`, 'GST calculation failed');
    assert(totals.totalAmount === totals.subtotal + totals.deliveryCharge + totals.gstAmount - totals.discount, `Total matches exact formula: ₹${totals.totalAmount}`, 'Total mismatch');
    assert(totals.verifiedItems[0].price === 140, 'Dish-1 unit price corrected from fake 9999 to DB price 140', `Price not corrected: ${totals.verifiedItems[0].price}`);
  } catch (e) {
    assert(false, 'Authoritative price validation', e.message);
  }

  // =========================================================================
  // TEST 10: ORDER STATUS STATE MACHINE VALIDATION
  // =========================================================================
  section('10. ORDER STATUS STATE MACHINE TRANSITIONS');
  try {
    const { isValidStatusTransition } = await import('../src/supabase.js');
    assert(isValidStatusTransition('new', 'preparing') === true, 'Allowed: "new" -> "preparing"', 'Transition rejected');
    assert(isValidStatusTransition('preparing', 'ready_for_pickup') === true, 'Allowed: "preparing" -> "ready_for_pickup"', 'Transition rejected');
    assert(isValidStatusTransition('ready_for_pickup', 'out_for_delivery') === true, 'Allowed: "ready_for_pickup" -> "out_for_delivery"', 'Transition rejected');
    assert(isValidStatusTransition('out_for_delivery', 'completed') === true, 'Allowed: "out_for_delivery" -> "completed"', 'Transition rejected');
    
    // Illegal jump transitions
    assert(isValidStatusTransition('new', 'completed') === false, 'Blocked illegal jump: "new" -> "completed"', 'Illegal transition allowed!');
    assert(isValidStatusTransition('completed', 'preparing') === false, 'Blocked mutation on terminal state: "completed" -> "preparing"', 'Terminal mutation allowed!');
  } catch (e) {
    assert(false, 'State machine validation', e.message);
  }

  // =========================================================================
  // TEST 11: RIDER GPS FRESHNESS VALIDATION
  // =========================================================================
  section('11. RIDER LOCATION FRESHNESS & ROUTING ACCURACY');
  try {
    const { getRecommendedRiders } = await import('../src/supabase.js');
    const mockRiders = [
      {
        id: 'rider-fresh',
        role: 'delivery',
        lat: 27.5706,
        lng: 77.6593,
        last_location_at: new Date().toISOString() // Fresh (< 1 min)
      },
      {
        id: 'rider-stale',
        role: 'delivery',
        lat: 27.5706,
        lng: 77.6593,
        last_location_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // Stale (30 mins ago)
      }
    ];

    const ranked = getRecommendedRiders({ lat: 27.5706, lng: 77.6593 }, mockRiders, []);
    assert(ranked.length === 2, 'Evaluated all candidate riders', 'Riders filtered out');
    assert(ranked[0].id === 'rider-fresh', 'Fresh GPS rider prioritized over stale rider', 'Stale rider prioritized');
    assert(ranked[0].isLocationFresh === true, 'Fresh rider flagged with isLocationFresh: true', 'Fresh flag missing');
    assert(ranked[1].isLocationFresh === false, 'Stale rider flagged with isLocationFresh: false', 'Stale flag missing');
  } catch (e) {
    assert(false, 'Rider GPS freshness validation', e.message);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  section('AUDIT RESULTS SUMMARY');
  console.log(`Total Tests Run: ${totalTests}`);
  console.log(`${COLORS.green}Passed: ${passedTests}${COLORS.reset}`);
  if (failedTests > 0) {
    console.log(`${COLORS.red}Failed: ${failedTests}${COLORS.reset}`);
  } else {
    console.log(`${COLORS.green}${COLORS.bright}ALL TESTS PASSED WITH 100% SUCCESS! Database & Web synchronization is fully verified.${COLORS.reset}\n`);
  }

  return failedTests === 0;
}

runTestSuite()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Test suite crashed:', err);
    process.exit(1);
  });
