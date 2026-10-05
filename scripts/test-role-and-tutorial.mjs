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
  saveTutorialProgress
} from '../src/services/tutorialService.js';

// Mock localStorage for Node environment
const mockStorage = new Map();
global.window = {};
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear()
};

console.log('🧪 Running Comprehensive Role Resolution & Tutorial Matrix Tests...\n');

// 1. Role Resolution Negative Tests
console.log('1. Negative Role Resolution Tests:');
const negativeRoles = [null, undefined, '', '   ', 'admin', 'grand_admin', 'owner', 'developer', 'dev', 'unknown', 'guest', 'hacker'];
for (const r of negativeRoles) {
  const canonical = getCanonicalRole(r);
  const key = getTutorialKeyForRole(r);
  assert.strictEqual(canonical, null, `Role "${r}" should resolve to null canonical role`);
  assert.strictEqual(key, null, `Role "${r}" should resolve to null tutorial key`);
  // Also verify isTutorialCompleted returns true (meaning no auto-prompt)
  assert.strictEqual(isTutorialCompleted('user-test-123', r), true, `Role "${r}" should not prompt tutorial`);
}
console.log('   ✅ All 12 negative roles correctly resolve to NULL (NO tutorial).');

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
console.log('   ✅ Customer, Delivery, and Restaurant aliases correctly resolve to their respective canonical roles and v1 keys.');

// 3. Dataset Content Isolation Tests
console.log('\n3. Dataset Content & Flow Verification:');
const customerStages = ROLE_TUTORIAL_DATA.customer_v1.stages;
const deliveryStages = ROLE_TUTORIAL_DATA.delivery_v1.stages;
const restaurantStages = ROLE_TUTORIAL_DATA.restaurant_v1.stages;

// Customer stages: Welcome -> Find Food -> Place Order -> Earn FV Points -> Refer Friends -> Redeem FV
assert.strictEqual(customerStages.length, 6);
assert.strictEqual(customerStages[0].title, 'Welcome');
assert.strictEqual(customerStages[1].title, 'Find Food');
assert.strictEqual(customerStages[2].title, 'Place Order');
assert.strictEqual(customerStages[3].title, 'Earn FV Points');
assert.strictEqual(customerStages[4].title, 'Refer Friends');
assert.strictEqual(customerStages[5].title, 'Redeem FV');

// Delivery stages: Welcome -> Go Online -> Accept Delivery -> Complete Delivery -> Earnings -> Refer Delivery Partners
assert.strictEqual(deliveryStages.length, 6);
assert.strictEqual(deliveryStages[0].title, 'Welcome');
assert.strictEqual(deliveryStages[1].title, 'Go Online');
assert.strictEqual(deliveryStages[2].title, 'Accept Delivery');
assert.strictEqual(deliveryStages[3].title, 'Complete Delivery');
assert.strictEqual(deliveryStages[4].title, 'Earnings');
assert.strictEqual(deliveryStages[5].title, 'Refer Delivery Partners');

// Verify milestone explanations exist in delivery
const milestonesStage = deliveryStages[5];
const milestoneDesc = milestonesStage.highlights.map(h => `${h.label} ${h.desc}`).join(' ');
assert.ok(milestoneDesc.includes('1st Completed Delivery Milestone') && milestoneDesc.includes('+10 FV'), 'Delivery explains 1st milestone (+10 FV)');
assert.ok(milestoneDesc.includes('5th Completed Deliveries Milestone') && milestoneDesc.includes('+25 FV'), 'Delivery explains 5th milestone (+25 FV)');
assert.ok(milestoneDesc.includes('15th Completed Deliveries Milestone') && milestoneDesc.includes('+35 FV'), 'Delivery explains 15th milestone (+35 FV)');

// Restaurant stages: Welcome -> Restaurant Setup -> Menu -> Incoming Orders -> Manage Orders -> Sales -> Grow
assert.strictEqual(restaurantStages.length, 7);
assert.strictEqual(restaurantStages[0].title, 'Welcome');
assert.strictEqual(restaurantStages[1].title, 'Restaurant Setup');
assert.strictEqual(restaurantStages[2].title, 'Menu');
assert.strictEqual(restaurantStages[3].title, 'Incoming Orders');
assert.strictEqual(restaurantStages[4].title, 'Manage Orders');
assert.strictEqual(restaurantStages[5].title, 'Sales');
assert.strictEqual(restaurantStages[6].title, 'Grow');
console.log('   ✅ All 3 tutorial flows match requirements with exact required stages.');

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

console.log('\n🎉 ALL ROLE & TUTORIAL VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
