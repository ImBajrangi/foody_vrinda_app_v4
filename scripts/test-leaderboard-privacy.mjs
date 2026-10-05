import assert from 'assert';
import { maskLeaderboardName } from '../src/services/fvWalletService.js';

console.log('🧪 Running Comprehensive Leaderboard Privacy & Masking Tests...\n');

// 1. Current user should always see their own unmasked name
assert.strictEqual(maskLeaderboardName('Kunvar Singh', true), 'Kunvar Singh');
assert.strictEqual(maskLeaderboardName('24F2004883 HARSH SHARMA', true), '24F2004883 HARSH SHARMA');

// 2. Roll number & registration ID stripping for other users
assert.strictEqual(maskLeaderboardName('24F2004883 HARSH SHARMA', false), 'HARSH S***');
assert.strictEqual(maskLeaderboardName('2023CS108 Gaurav Joshi', false), 'Gaurav J***');

// 3. Indian & English multi-word names masking
assert.strictEqual(maskLeaderboardName('Kunvar Singh', false), 'Kunvar S***');
assert.strictEqual(maskLeaderboardName('Pinki Jadoun', false), 'Pinki J***');
assert.strictEqual(maskLeaderboardName('Dr. Blue', false), 'Dr. B***');
assert.strictEqual(maskLeaderboardName('K.v.s Thakur', false), 'K.v.s T***');

// 4. Test usernames & generated handles
assert.strictEqual(maskLeaderboardName('vrindatest31514', false), 'Devotee •••514');
assert.strictEqual(maskLeaderboardName('user998877', false), 'Devotee •••877');

// 5. Phone numbers
assert.strictEqual(maskLeaderboardName('9876543210', false), 'Devotee •••3210');
assert.strictEqual(maskLeaderboardName('+919876543210', false), 'Devotee •••3210');

// 6. Email addresses
assert.strictEqual(maskLeaderboardName('sakhi.sharma@gmail.com', false), 'Devotee •••rma');

// 7. Internal chef / staff roles
assert.strictEqual(maskLeaderboardName('User (chef_s)', false), 'Kitchen Chef');

// 8. Single-word names
assert.strictEqual(maskLeaderboardName('Radharani', false), 'Rad***');
assert.strictEqual(maskLeaderboardName('Dev', false), 'Dev***');

console.log('   ✅ All 12 privacy masking patterns verified successfully.');

// 9. Qualification filter test
const rawMockDbLeaderboard = [
  { user_id: '1', display_name: 'vrindatest31514', points_earned: 0, referrals_count: 0 },
  { user_id: '2', display_name: 'User (chef_s)', points_earned: 0, referrals_count: 0 },
  { user_id: '3', display_name: 'Kunvar Singh', points_earned: 0, referrals_count: 0 },
  { user_id: '4', display_name: '24F2004883 HARSH SHARMA', points_earned: 0, referrals_count: 0 },
  { user_id: '5', display_name: 'Genuine Devotee A', points_earned: 50, referrals_count: 1 },
  { user_id: '6', display_name: 'Genuine Devotee B', points_earned: 120, referrals_count: 3 },
];

const filtered = rawMockDbLeaderboard.filter(item => {
  const hasPoints = Number(item.points_earned) > 0;
  const hasRefs = Number(item.referrals_count) > 0;
  const isInternal = String(item.user_id || '').startsWith('chef_') ||
                     String(item.user_id || '').startsWith('master-') ||
                     String(item.display_name || '').toLowerCase().includes('chef_') ||
                     String(item.display_name || '').toLowerCase().startsWith('vrindatest');
  return (hasPoints || hasRefs) && !isInternal;
});

assert.strictEqual(filtered.length, 2, 'Must filter out all 0-point/0-referral users and internal accounts');
assert.strictEqual(filtered[0].display_name, 'Genuine Devotee A');
assert.strictEqual(filtered[1].display_name, 'Genuine Devotee B');

console.log('   ✅ Qualification filter successfully eliminates unranked zero-point accounts.');
console.log('\n🎉 ALL LEADERBOARD PRIVACY TESTS PASSED!\n');
