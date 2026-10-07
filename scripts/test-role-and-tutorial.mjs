import assert from 'assert';
import {
  ROLE_TUTORIAL_DATA,
  TUTORIAL_VERSIONS,
  getCanonicalRole,
  getTutorialKeyForRole,
  getTutorialStorageKey,
  getTutorialProgress,
  isTutorialCompleted,
  markTutorialCompleted,
  saveTutorialProgress,
  initAppVisitTracking,
  isFirstDeviceVisit,
  markNewUserTutorialEligible,
  shouldAutoLaunchTutorial,
  clearNewUserTutorialEligibility
} from '../src/services/tutorialService.js';

// Mock localStorage and sessionStorage for Node environment
const mockStorage = new Map();
const mockSessionStorage = new Map();
global.window = {};
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear()
};
global.sessionStorage = {
  getItem: (key) => mockSessionStorage.get(key) || null,
  setItem: (key, val) => mockSessionStorage.set(key, String(val)),
  removeItem: (key) => mockSessionStorage.delete(key),
  clear: () => mockSessionStorage.clear()
};

console.log('🧪 Running Comprehensive Role Resolution & Tutorial Matrix Tests...\n');

// 1. Role Resolution Negative Tests
console.log('1. Negative Role Resolution Tests:');
const negativeRoles = [null, undefined, '', '   ', 'admin', 'grand_admin', 'developer', 'dev', 'unknown', 'guest', 'hacker'];
for (const r of negativeRoles) {
  const canonical = getCanonicalRole(r);
  const key = getTutorialKeyForRole(r);
  assert.strictEqual(canonical, null, `Role "${r}" should resolve to null canonical role`);
  assert.strictEqual(key, null, `Role "${r}" should resolve to null tutorial key`);
  // Also verify isTutorialCompleted returns true (meaning no auto-prompt)
  assert.strictEqual(isTutorialCompleted('user-test-123', r), true, `Role "${r}" should not prompt tutorial`);
}
console.log('   ✅ All negative/admin roles correctly resolve to NULL (NO tutorial).');

// 2. Role Resolution Positive Tests
console.log('\n2. Positive Role Resolution Tests:');
assert.strictEqual(getCanonicalRole('customer'), 'customer');
assert.strictEqual(getTutorialKeyForRole('customer'), 'customer_v1');

const deliveryAliases = ['delivery', 'delivery_partner', 'rider', 'DELIVERY', ' Rider '];
for (const d of deliveryAliases) {
  assert.strictEqual(getCanonicalRole(d), 'delivery');
  assert.strictEqual(getTutorialKeyForRole(d), 'delivery_v1');
}

const restaurantAliases = ['restaurant', 'kitchen', 'chef', 'KITCHEN', ' Restaurant '];
for (const res of restaurantAliases) {
  assert.strictEqual(getCanonicalRole(res), 'restaurant');
  assert.strictEqual(getTutorialKeyForRole(res), 'restaurant_v1');
}

const ownerAliases = ['owner', 'shop_owner', 'store_owner', 'franchise', ' OWNER '];
for (const ow of ownerAliases) {
  assert.strictEqual(getCanonicalRole(ow), 'owner');
  assert.strictEqual(getTutorialKeyForRole(ow), 'owner_v1');
}
console.log('   ✅ Customer, Delivery, Restaurant, and Owner aliases correctly resolve to their respective canonical roles and v1 keys.');

// 3. Dataset Content Isolation Tests
console.log('\n3. Dataset Content & Flow Verification:');
const customerStages = ROLE_TUTORIAL_DATA.customer_v1.stages;
const deliveryStages = ROLE_TUTORIAL_DATA.delivery_v1.stages;
const restaurantStages = ROLE_TUTORIAL_DATA.restaurant_v1.stages;
const ownerStages = ROLE_TUTORIAL_DATA.owner_v1.stages;

// Customer stages: Search -> Categories -> Add to Cart -> Basket -> Address -> FV Wallet -> Profile
assert.strictEqual(customerStages.length, 7);
assert.strictEqual(customerStages[0].title, 'Find your favourite food');
assert.strictEqual(customerStages[1].title, 'Explore categories');
assert.strictEqual(customerStages[2].title, 'Add items to your basket');
assert.strictEqual(customerStages[3].title, 'Your Basket');
assert.strictEqual(customerStages[4].title, 'Choose your delivery address');
assert.strictEqual(customerStages[5].title, 'Earn FV Points');
assert.strictEqual(customerStages[6].title, 'Your account');

// Delivery stages: Go Online -> Available Orders -> Accept -> Live Navigation -> Complete -> Earnings -> Fleet Referrals
assert.strictEqual(deliveryStages.length, 7);
assert.strictEqual(deliveryStages[0].title, 'Go Online');
assert.strictEqual(deliveryStages[1].title, 'Available Orders');
assert.strictEqual(deliveryStages[2].title, 'Accept Delivery');
assert.strictEqual(deliveryStages[3].title, 'Live Navigation');
assert.strictEqual(deliveryStages[4].title, 'Complete Delivery');
assert.strictEqual(deliveryStages[5].title, 'Earnings');
assert.strictEqual(deliveryStages[6].title, 'Refer Delivery Partners');

// Restaurant stages: Restaurant Setup -> Menu -> Incoming Orders -> Manage Orders -> Sales -> Grow
assert.strictEqual(restaurantStages.length, 6);
assert.strictEqual(restaurantStages[0].title, 'Restaurant Setup');
assert.strictEqual(restaurantStages[1].title, 'Menu');
assert.strictEqual(restaurantStages[2].title, 'Incoming Orders');
assert.strictEqual(restaurantStages[3].title, 'Manage Orders');
assert.strictEqual(restaurantStages[4].title, 'Sales');
assert.strictEqual(restaurantStages[5].title, 'Grow');

// Owner stages: Store Profile & Branches -> Revenue & Settlements -> Menu Catalog & Pricing -> Staff & Role Management
assert.strictEqual(ownerStages.length, 4);
assert.strictEqual(ownerStages[0].title, 'Store Profile & Branches');
assert.strictEqual(ownerStages[1].title, 'Revenue & Settlements');
assert.strictEqual(ownerStages[2].title, 'Menu Catalog & Pricing');
assert.strictEqual(ownerStages[3].title, 'Staff & Role Management');
console.log('   ✅ All 4 tutorial flows match requirements with exact required stages.');

// 4. Persistence & Isolation Tests
console.log('\n4. User & Role Persistence Isolation Tests:');
mockStorage.clear();

const userA = 'user-customer-111';
const userB = 'user-delivery-222';

// Initially not completed
assert.strictEqual(isTutorialCompleted(userA, 'customer'), false);
assert.strictEqual(isTutorialCompleted(userB, 'delivery'), false);

// Mark userA completed as customer
markTutorialCompleted(userA, 'customer', 5);
assert.strictEqual(isTutorialCompleted(userA, 'customer'), true);

// Verify userB is STILL NOT completed
assert.strictEqual(isTutorialCompleted(userB, 'delivery'), false);
assert.strictEqual(isTutorialCompleted(userB, 'customer'), false);

// Role Change Safety: If userA changes role to delivery, delivery tutorial is NOT completed
assert.strictEqual(isTutorialCompleted(userA, 'delivery'), false);

// Replay Safety: UserA replays customer tutorial and moves steps, completed status must NOT be lost
saveTutorialProgress(userA, 'customer', 1);
const progressAfterStep1 = getTutorialProgress(userA, 'customer');
assert.strictEqual(progressAfterStep1.completed, true, 'Replay step progression must preserve completed: true');
assert.strictEqual(progressAfterStep1.current_step, 1);
console.log('   ✅ Storage keys properly isolated by user_id + role + version.');
console.log('   ✅ Role change safety verified (customer completion != delivery completion).');
console.log('   ✅ Replay progression preserves completion state without resetting flags.');

// 5. First-Visit Device Tracking & Auto-Launch Guards
console.log('\n5. First-Visit Device Tracking & Auto-Launch Tests:');
mockStorage.clear();
mockSessionStorage.clear();

// Test A: Existing user or returning device MUST NOT auto-launch
mockStorage.set('foody_has_visited_app', 'true');
initAppVisitTracking();
assert.strictEqual(isFirstDeviceVisit(), false, 'Returning device must NOT be considered first device visit');

const existingUser = 'user-existing-999';
markNewUserTutorialEligible(existingUser, 'customer');
assert.strictEqual(
  shouldAutoLaunchTutorial(existingUser, 'customer'),
  false,
  'Returning device registration MUST NOT trigger tutorial auto-launch'
);
console.log('   ✅ Returning device / existing visitor correctly BLOCKED from auto-tour.');

// Test B: Brand-new device on first visit + brand-new registration MUST auto-launch
mockStorage.clear();
mockSessionStorage.clear();

// App boots for first time ever on clean device
initAppVisitTracking();
assert.strictEqual(isFirstDeviceVisit(), true, 'Clean device on first open must be first device visit');
assert.strictEqual(mockStorage.get('foody_has_visited_app'), 'true', 'Device visit must be recorded');

const freshUser = 'user-fresh-108';
markNewUserTutorialEligible(freshUser, 'customer');
assert.strictEqual(
  shouldAutoLaunchTutorial(freshUser, 'customer'),
  true,
  'Brand-new user on first device visit MUST be eligible for auto-launch'
);

// Consumption / dismissal clears eligibility
clearNewUserTutorialEligibility();
assert.strictEqual(
  shouldAutoLaunchTutorial(freshUser, 'customer'),
  false,
  'Once consumed or cleared, tutorial MUST NOT re-trigger'
);

// Marking completed prevents future launch
markTutorialCompleted(freshUser, 'customer');
markNewUserTutorialEligible(freshUser, 'customer'); // Even if accidentally triggered again
assert.strictEqual(
  shouldAutoLaunchTutorial(freshUser, 'customer'),
  false,
  'Completed user must NEVER re-trigger auto-launch'
);
console.log('   ✅ Brand new user on first device visit correctly triggered once and never again.');

console.log('\n🎉 ALL ROLE & TUTORIAL VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
