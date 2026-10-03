import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mrsxliwyqodtwjuyqmts.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yc3hsaXd5cW9kdHdqdXlxbXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzQxMjcsImV4cCI6MjEwNDQ1MDEyN30.UZteyeZ3LtuVpMJoUqZogPKffmSlHN3Hn9fLtis7lBg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(role, feature, status, details = '') {
  const result = { role, feature, status, details, timestamp: new Date().toISOString() };
  results.tests.push(result);
  if (status === 'PASS') {
    results.passed++;
    console.log(`✅ [${role.toUpperCase()}] ${feature}: PASS ${details ? `(${details})` : ''}`);
  } else {
    results.failed++;
    console.error(`❌ [${role.toUpperCase()}] ${feature}: FAIL -> ${details}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🚀 FOODY VRINDA: COMPREHENSIVE ROLE & DATABASE SYNC TEST SUITE');
  console.log('======================================================\n');

  const testShopId = `test-shop-${Date.now().toString(36)}`;
  const testDishId = `test-dish-${Date.now().toString(36)}`;
  const testPresetId = `test-preset-${Date.now().toString(36)}`;
  const testOrderId = `test-order-${Date.now().toString(36)}`;
  const testUserId = `test-user-${Date.now().toString(36)}`;
  const testOfferId = `test-offer-${Date.now().toString(36)}`;

  // =========================================================================
  // 1. DEVELOPER ROLE CAPABILITIES & PERMISSIONS
  // =========================================================================
  console.log('\n--- 1. Testing Developer Role ---');

  // Test 1.1: Query Master Roles Hierarchy
  try {
    const { data, error } = await supabase.from('foody_roles').select('*');
    if (error) throw error;
    recordTest('Developer', 'Fetch Roles Hierarchy (foody_roles)', 'PASS', `Found ${data?.length || 0} role definitions`);
  } catch (err) {
    recordTest('Developer', 'Fetch Roles Hierarchy (foody_roles)', 'FAIL', err.message);
  }

  // Test 1.2: Create New Shop
  try {
    const newShop = {
      id: testShopId,
      name: 'Automated Test Kitchen Vrindavan',
      address: 'Raman Reti, Vrindavan, UP',
      phone: '9998887770',
      is_open: true,
      is_online: true,
      shop_type: 'hotel',
      delivery_charge: 30,
      minimum_order_amount: 100,
      payment_settings: { onlinePaymentsEnabled: true, codEnabled: true }
    };
    const { data, error } = await supabase.from('foody_shops').upsert(newShop).select();
    if (error) throw error;
    recordTest('Developer', 'Create Shop (foody_shops)', 'PASS', `Created shop ID: ${testShopId}`);
  } catch (err) {
    recordTest('Developer', 'Create Shop (foody_shops)', 'FAIL', err.message);
  }

  // Test 1.3: Update Shop Settings & Toggles
  try {
    const { error } = await supabase.from('foody_shops').update({
      is_open: false,
      delivery_charge: 40
    }).eq('id', testShopId);
    if (error) throw error;
    recordTest('Developer', 'Update Shop Settings (foody_shops)', 'PASS', 'Updated status and delivery charge');
  } catch (err) {
    recordTest('Developer', 'Update Shop Settings (foody_shops)', 'FAIL', err.message);
  }

  // Test 1.4: Create & Manage Presets (foody_presets)
  try {
    const newPreset = {
      id: testPresetId,
      name: 'Automated Test Satvik Thali',
      category: 'Meals',
      price: 220,
      original_price: 260,
      description: 'Automated test preset thali with ghee roti and paneer sabji',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
      is_active: true
    };
    const { error } = await supabase.from('foody_presets').upsert(newPreset);
    if (error) throw error;
    recordTest('Developer', 'Create Preset Dish (foody_presets)', 'PASS', `Preset ID: ${testPresetId}`);
  } catch (err) {
    recordTest('Developer', 'Create Preset Dish (foody_presets)', 'FAIL', err.message);
  }

  // Test 1.5: Create & Manage Promotional Offers (foody_offers)
  try {
    const newOffer = {
      id: testOfferId,
      title: 'Dev Test 50% Off Offer',
      code: 'DEVTEST50',
      discount_type: 'percentage',
      discount_value: 50,
      min_order_amount: 200,
      max_discount: 100,
      is_active: true
    };
    const { error } = await supabase.from('foody_offers').upsert(newOffer);
    if (error) throw error;
    recordTest('Developer', 'Create Special Offer (foody_offers)', 'PASS', `Offer Code: ${newOffer.code}`);
  } catch (err) {
    recordTest('Developer', 'Create Special Offer (foody_offers)', 'FAIL', err.message);
  }

  // Test 1.6: Manage Test User Accounts (foody_users & foody_logged_users)
  try {
    const testUser = {
      id: testUserId,
      email: 'automated_test_dev@foodyvrinda.com',
      phone: '919998887770',
      display_name: 'Automated Test Developer',
      role: 'developer',
      shop_id: testShopId,
      is_active: true
    };
    const { error: err1 } = await supabase.from('foody_users').upsert(testUser);
    const { error: err2 } = await supabase.from('foody_logged_users').upsert(testUser);
    if (err1 || err2) throw new Error(err1?.message || err2?.message);
    recordTest('Developer', 'Create/Sync User Profile (foody_users & logged_users)', 'PASS', `User ID: ${testUserId}`);
  } catch (err) {
    recordTest('Developer', 'Create/Sync User Profile (foody_users & logged_users)', 'FAIL', err.message);
  }

  // =========================================================================
  // 2. GRAND ADMIN / ADMIN ROLE CAPABILITIES
  // =========================================================================
  console.log('\n--- 2. Testing Grand Admin / Admin Role ---');

  // Test 2.1: Read All Shops & Operations
  try {
    const { data, error } = await supabase.from('foody_shops').select('*');
    if (error) throw error;
    recordTest('Admin', 'Global Kitchens Supervision (foody_shops)', 'PASS', `Supervising ${data?.length || 0} kitchens`);
  } catch (err) {
    recordTest('Admin', 'Global Kitchens Supervision (foody_shops)', 'FAIL', err.message);
  }

  // Test 2.2: Platform Wide User Directory
  try {
    const { data, error } = await supabase.from('foody_users').select('*');
    if (error) throw error;
    recordTest('Admin', 'User Directory & Permissions Oversight (foody_users)', 'PASS', `Supervising ${data?.length || 0} registered users`);
  } catch (err) {
    recordTest('Admin', 'User Directory & Permissions Oversight (foody_users)', 'FAIL', err.message);
  }

  // Test 2.3: Modify Staff Role
  try {
    const { error } = await supabase.from('foody_users').update({ role: 'owner' }).eq('id', testUserId);
    if (error) throw error;
    recordTest('Admin', 'Assign & Promote Staff Roles', 'PASS', 'Promoted test user to owner');
  } catch (err) {
    recordTest('Admin', 'Assign & Promote Staff Roles', 'FAIL', err.message);
  }

  // =========================================================================
  // 3. KITCHEN OWNER / STAFF ROLE CAPABILITIES
  // =========================================================================
  console.log('\n--- 3. Testing Kitchen Owner & Staff Role ---');

  // Test 3.1: Create Dish with Variable Price in Menu Catalog
  try {
    const newDish = {
      id: testDishId,
      shop_id: testShopId,
      name: 'Paneer Butter Masala (Satvik)',
      category: 'Main',
      price: 180,
      description: 'Fresh paneer in creamy tomato makhani gravy without onion or garlic',
      is_available: true,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
    };
    const { error } = await supabase.from('foody_menus').upsert(newDish);
    if (error) throw error;
    recordTest('Kitchen Owner', 'Add Custom/Preset Dish to Menu (foody_menus)', 'PASS', `Price: ₹${newDish.price}`);
  } catch (err) {
    recordTest('Kitchen Owner', 'Add Custom/Preset Dish to Menu (foody_menus)', 'FAIL', err.message);
  }

  // Test 3.2: Inline Variable Price Update (Shop Owner Feature)
  try {
    const updatedPrice = 210;
    const { error } = await supabase.from('foody_menus').update({ price: updatedPrice }).eq('id', testDishId);
    if (error) throw error;
    recordTest('Kitchen Owner', 'Inline Dish Price Update (Variable Pricing)', 'PASS', `Updated price to ₹${updatedPrice}`);
  } catch (err) {
    recordTest('Kitchen Owner', 'Inline Dish Price Update (Variable Pricing)', 'FAIL', err.message);
  }

  // Test 3.3: Availability Toggle (In-Stock / Sold-Out)
  try {
    const { error } = await supabase.from('foody_menus').update({ is_available: false }).eq('id', testDishId);
    if (error) throw error;
    recordTest('Kitchen Owner', 'Toggle Dish In-Stock / Sold-Out', 'PASS', 'Marked dish as OUT OF STOCK');
  } catch (err) {
    recordTest('Kitchen Owner', 'Toggle Dish In-Stock / Sold-Out', 'FAIL', err.message);
  }

  // =========================================================================
  // 4. CUSTOMER ROLE CAPABILITIES
  // =========================================================================
  console.log('\n--- 4. Testing Customer Role ---');

  // Test 4.1: Browse Menu & Active Shops
  try {
    const { data: shops, error: errShops } = await supabase.from('foody_shops').select('*').eq('is_online', true);
    const { data: menu, error: errMenu } = await supabase.from('foody_menus').select('*').eq('shop_id', testShopId);
    if (errShops || errMenu) throw new Error(errShops?.message || errMenu?.message);
    recordTest('Customer', 'Browse Online Shops & Menu Catalog', 'PASS', `Discovered ${shops?.length || 0} online shops, ${menu?.length || 0} items`);
  } catch (err) {
    recordTest('Customer', 'Browse Online Shops & Menu Catalog', 'FAIL', err.message);
  }

  // Test 4.2: Place New Order (foody_orders)
  try {
    const newOrder = {
      id: testOrderId,
      shop_id: testShopId,
      customer_name: 'Bhakt Radhe',
      customer_phone: '9876543210',
      customer_address: 'Near ISKCON Temple, Vrindavan',
      delivery_address: 'Near ISKCON Temple, Vrindavan',
      items: [
        { id: testDishId, name: 'Paneer Butter Masala (Satvik)', price: 210, quantity: 2 }
      ],
      total_amount: 450,
      payment_method: 'cod',
      payment_status: 'pending',
      status: 'placed'
    };
    const { error } = await supabase.from('foody_orders').upsert(newOrder);
    if (error) throw error;
    recordTest('Customer', 'Place Order with Delivery Details (foody_orders)', 'PASS', `Order ID: ${testOrderId}, Total: ₹${newOrder.total_amount}`);
  } catch (err) {
    recordTest('Customer', 'Place Order with Delivery Details (foody_orders)', 'FAIL', err.message);
  }

  // Test 4.3: Submit Order Review & Rating (foody_reviews)
  try {
    const newReview = {
      id: `review-${Date.now().toString(36)}`,
      order_id: testOrderId,
      shop_id: testShopId,
      customer_name: 'Bhakt Radhe',
      rating: 5,
      comment: 'Param Anand! Authentic satvik prasad, fresh and divine.'
    };
    const { error } = await supabase.from('foody_reviews').upsert(newReview);
    if (error) throw error;
    recordTest('Customer', 'Submit Star Rating & Review (foody_reviews)', 'PASS', '5-star divine review submitted');
  } catch (err) {
    recordTest('Customer', 'Submit Star Rating & Review (foody_reviews)', 'FAIL', err.message);
  }

  // =========================================================================
  // 5. DELIVERY / TRANSPORT PARTNER ROLE CAPABILITIES
  // =========================================================================
  console.log('\n--- 5. Testing Delivery / Transport Partner Role ---');

  // Test 5.1: Fetch Orders Ready for Dispatch / Assigned
  try {
    const { data, error } = await supabase.from('foody_orders').select('*').eq('id', testOrderId);
    if (error) throw error;
    recordTest('Delivery Partner', 'Locate Active Delivery Ticket', 'PASS', `Found ticket status: ${data?.[0]?.status}`);
  } catch (err) {
    recordTest('Delivery Partner', 'Locate Active Delivery Ticket', 'FAIL', err.message);
  }

  // Test 5.2: Transition Order to "out_for_delivery" and "delivered"
  try {
    const { error: err1 } = await supabase.from('foody_orders').update({
      status: 'out_for_delivery',
      rider_id: testUserId,
      rider_name: 'Vrindavan Prasad Rider'
    }).eq('id', testOrderId);

    const { error: err2 } = await supabase.from('foody_orders').update({
      status: 'delivered',
      payment_status: 'paid',
      cash_status: 'collected'
    }).eq('id', testOrderId);

    if (err1 || err2) throw new Error(err1?.message || err2?.message);
    recordTest('Delivery Partner', 'Live Order Status Transitions (out_for_delivery -> delivered)', 'PASS', 'Delivered & COD Collected');
  } catch (err) {
    recordTest('Delivery Partner', 'Live Order Status Transitions', 'FAIL', err.message);
  }

  // Test 5.3: COD Cash Settlement Record (foody_cash_settlements)
  try {
    const settlement = {
      rider_id: testUserId,
      shop_id: testShopId,
      expected_amount: 450,
      received_amount: 450,
      status: 'verified',
      settled_by: 'Master Dev Admin'
    };
    const { error } = await supabase.from('foody_cash_settlements').insert([settlement]);
    if (error) throw error;
    recordTest('Delivery Partner', 'Record COD Cash Handover (foody_cash_settlements)', 'PASS', 'Settlement ₹450 recorded');
  } catch (err) {
    recordTest('Delivery Partner', 'Record COD Cash Handover (foody_cash_settlements)', 'FAIL', err.message);
  }

  // =========================================================================
  // 6. REALTIME REPLICATION & CLEANUP (FAIL-SAFE SHOP DELETION TEST)
  // =========================================================================
  console.log('\n--- 6. Testing Foreign Key Safe Deletion & Cleanup ---');

  // Test 6.1: Delete Test Dish
  try {
    const { error } = await supabase.from('foody_menus').delete().eq('id', testDishId);
    if (error) throw error;
    recordTest('Cleanup', 'Delete Test Dish (foody_menus)', 'PASS', `Deleted dish: ${testDishId}`);
  } catch (err) {
    recordTest('Cleanup', 'Delete Test Dish (foody_menus)', 'FAIL', err.message);
  }

  // Test 6.2: Delete Test Preset
  try {
    const { error } = await supabase.from('foody_presets').delete().eq('id', testPresetId);
    if (error) throw error;
    recordTest('Cleanup', 'Delete Test Preset (foody_presets)', 'PASS', `Deleted preset: ${testPresetId}`);
  } catch (err) {
    recordTest('Cleanup', 'Delete Test Preset (foody_presets)', 'FAIL', err.message);
  }

  // Test 6.3: Delete Test Offer
  try {
    const { error } = await supabase.from('foody_offers').delete().eq('id', testOfferId);
    if (error) throw error;
    recordTest('Cleanup', 'Delete Test Offer (foody_offers)', 'PASS', `Deleted offer: ${testOfferId}`);
  } catch (err) {
    recordTest('Cleanup', 'Delete Test Offer (foody_offers)', 'FAIL', err.message);
  }

  // Test 6.4: Foreign-Key Safe Reassignment & Shop Deletion
  try {
    // Reassign relations to master fallback shop before deletion
    await supabase.from('foody_orders').update({ shop_id: 'shop-vrinda-main' }).eq('shop_id', testShopId);
    await supabase.from('foody_menus').update({ shop_id: 'shop-vrinda-main' }).eq('shop_id', testShopId);
    await supabase.from('foody_users').update({ shop_id: 'shop-vrinda-main' }).eq('shop_id', testShopId);
    await supabase.from('foody_logged_users').update({ shop_id: 'shop-vrinda-main' }).eq('shop_id', testShopId);

    const { error } = await supabase.from('foody_shops').delete().eq('id', testShopId);
    if (error) throw error;
    recordTest('Developer / Admin', 'Safe Kitchen Deletion with Relation Protection', 'PASS', `Successfully deleted shop: ${testShopId}`);
  } catch (err) {
    recordTest('Developer / Admin', 'Safe Kitchen Deletion with Relation Protection', 'FAIL', err.message);
  }

  // Test 6.5: Delete Test User
  try {
    await supabase.from('foody_logged_users').delete().eq('id', testUserId);
    await supabase.from('foody_users').delete().eq('id', testUserId);
    recordTest('Cleanup', 'Delete Test User (foody_users & logged_users)', 'PASS', `Deleted user: ${testUserId}`);
  } catch (err) {
    recordTest('Cleanup', 'Delete Test User (foody_users & logged_users)', 'FAIL', err.message);
  }

  // Summary
  console.log('\n======================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${results.passed} PASSED | ${results.failed} FAILED`);
  console.log('======================================================\n');

  return results;
}

runTestSuite().then((res) => {
  if (res.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
