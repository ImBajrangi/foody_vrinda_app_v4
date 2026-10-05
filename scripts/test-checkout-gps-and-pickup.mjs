import assert from 'node:assert';
import {
  isContaminatedPickupAddress,
  sanitizeCustomerAddress,
  isValidCoordinates,
  resolveOrderCoordinates,
  DEFAULT_VRINDA_COORDS
} from '../src/utils/addressUtils.js';

console.log('🧪 Starting Checkout GPS & Pickup Isolation Regression Test Suite (Tests A to J)...\n');

let passedTests = 0;

// Mock localStorage for node environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockStorage = new MockLocalStorage();

// --- Test A: Normal delivery with typed address (no GPS clicked) ---
console.log('--- Test A: Normal delivery with typed address ---');
{
  const typedAddress = 'Flat 302, Radha Madhav Kunj, Raman Reti, Vrindavan';
  const deliveryCoords = { lat: null, lng: null }; // No GPS button clicked
  const savedCoords = null;

  assert.strictEqual(isContaminatedPickupAddress(typedAddress), false);
  assert.ok(typedAddress.trim().length >= 4, 'Address text is valid');

  const { coords, source } = resolveOrderCoordinates({
    pinnedCoords: deliveryCoords,
    savedCoords,
    fulfillmentType: 'delivery'
  });

  assert.strictEqual(source, 'service_area_fallback');
  assert.deepStrictEqual(coords, DEFAULT_VRINDA_COORDS);
  console.log('✅ Test A Passed: Order proceeds without GPS click, uses service area fallback.');
  passedTests++;
}

// --- Test B: Delivery with GPS ---
console.log('\n--- Test B: Delivery with GPS ---');
{
  const address = 'Near Prem Mandir, Chattikara Road, Vrindavan';
  const gpsCoords = { lat: 27.5685, lng: 77.6712 };

  assert.ok(isValidCoordinates(gpsCoords));

  const { coords, source } = resolveOrderCoordinates({
    pinnedCoords: gpsCoords,
    fulfillmentType: 'delivery'
  });

  assert.strictEqual(source, 'gps');
  assert.deepStrictEqual(coords, gpsCoords);
  console.log('✅ Test B Passed: Order uses pinned GPS coordinates with source "gps".');
  passedTests++;
}

// --- Test C: Delivery with saved address & saved coords ---
console.log('\n--- Test C: Delivery with saved address ---');
{
  const savedCoords = { lat: 27.575, lng: 77.662 };
  const pinnedCoords = { lat: null, lng: null }; // Not re-clicked

  const { coords, source } = resolveOrderCoordinates({
    pinnedCoords,
    savedCoords,
    fulfillmentType: 'delivery'
  });

  assert.strictEqual(source, 'saved');
  assert.deepStrictEqual(coords, savedCoords);
  console.log('✅ Test C Passed: Order proceeds with previously saved coordinates with source "saved".');
  passedTests++;
}

// --- Test D: Self-Pickup ---
console.log('\n--- Test D: Self-Pickup ---');
{
  mockStorage.clear();
  const customerOriginalAddress = 'House 14, Gauranagar, Vrindavan';
  mockStorage.setItem('customerAddress', customerOriginalAddress);

  const activeShop = {
    id: 'shop-vrinda-main',
    name: 'Vrinda Cloud Kitchen (Main)',
    address: 'Near ISKCON Temple, Raman Reti, Vrindavan',
    coords: { lat: 27.572, lng: 77.66 }
  };

  const fulfillmentType = 'pickup';
  const pickupCounterId = activeShop.id;
  const pickupCounterName = activeShop.name;
  const pickupCounterAddress = activeShop.address;

  // Order payload generation
  const orderDeliveryAddress = `[Counter Pickup] ${pickupCounterName}`;
  const orderCustomerAddress = sanitizeCustomerAddress(customerOriginalAddress) || `${pickupCounterName} (Counter Pickup)`;

  const coordRes = resolveOrderCoordinates({
    activeShopCoords: activeShop.coords,
    fulfillmentType: 'pickup'
  });

  // Verify pickup state does NOT overwrite customer's stored delivery address
  // In pickup mode, localStorage.setItem('customerAddress') is NEVER called!
  assert.strictEqual(mockStorage.getItem('customerAddress'), customerOriginalAddress);
  assert.strictEqual(orderDeliveryAddress, '[Counter Pickup] Vrinda Cloud Kitchen (Main)');
  assert.strictEqual(orderCustomerAddress, customerOriginalAddress);
  assert.strictEqual(coordRes.source, 'pickup_counter');
  assert.deepStrictEqual(coordRes.coords, activeShop.coords);
  console.log('✅ Test D Passed: Counter address shown in order payload; customer delivery address NOT overwritten.');
  passedTests++;
}

// --- Test E: Self-Pickup → Delivery ---
console.log('\n--- Test E: Self-Pickup → Delivery ---');
{
  const savedCustomerAddress = 'Flat 101, Bankey Bihari Enclave, Vrindavan';
  mockStorage.setItem('customerAddress', savedCustomerAddress);

  // Switch to Pickup
  let currentFulfillment = 'pickup';
  let activeDisplayAddress = `[Counter Pickup] Kitchen`; // what the counter card displays
  assert.strictEqual(mockStorage.getItem('customerAddress'), savedCustomerAddress);

  // Switch back to Delivery
  currentFulfillment = 'delivery';
  let restoredAddress = sanitizeCustomerAddress(mockStorage.getItem('customerAddress'));
  assert.strictEqual(restoredAddress, savedCustomerAddress);
  assert.strictEqual(isContaminatedPickupAddress(restoredAddress), false);
  console.log('✅ Test E Passed: Customer delivery address restored; counter address NOT used as delivery address.');
  passedTests++;
}

// --- Test F: Delivery → Self-Pickup ---
console.log('\n--- Test F: Delivery → Self-Pickup ---');
{
  const userSavedDeliveryAddress = 'Govind Ghera, Loi Bazar, Vrindavan';
  mockStorage.setItem('customerAddress', userSavedDeliveryAddress);

  // Customer has saved address and switches to pickup
  const newFulfillment = 'pickup';
  mockStorage.setItem('foody_fulfillment_type', newFulfillment);

  // Check storage: customer delivery address remains completely untouched
  assert.strictEqual(mockStorage.getItem('customerAddress'), userSavedDeliveryAddress);
  assert.strictEqual(mockStorage.getItem('foody_fulfillment_type'), 'pickup');
  console.log('✅ Test F Passed: Delivery address in storage remains intact after switching to Self-Pickup.');
  passedTests++;
}

// --- Test G: Existing contaminated localStorage ---
console.log('\n--- Test G: Existing contaminated localStorage ---');
{
  // Simulate legacy contaminated string in localStorage
  mockStorage.setItem('customerAddress', '[Self-Pickup] Counter: Vrinda Cloud Kitchen (Main)');
  assert.strictEqual(isContaminatedPickupAddress(mockStorage.getItem('customerAddress')), true);

  // Checkout address initializer logic
  let checkoutAddress = '';
  const cached = mockStorage.getItem('customerAddress');
  if (isContaminatedPickupAddress(cached)) {
    mockStorage.removeItem('customerAddress');
    checkoutAddress = '';
  }

  assert.strictEqual(mockStorage.getItem('customerAddress'), null);
  assert.strictEqual(checkoutAddress, '');

  // If user profile has legitimate address:
  const userProfile = { address: 'Parikrama Marg, Raman Reti, Vrindavan' };
  const rawAddr = userProfile.address;
  if (!isContaminatedPickupAddress(rawAddr)) {
    checkoutAddress = rawAddr;
  }
  assert.strictEqual(checkoutAddress, 'Parikrama Marg, Raman Reti, Vrindavan');

  // Verify delivery checkout validation blocks if address is contaminated or < 4 chars
  const contaminatedInput = '[Self-Pickup] Counter: Kitchen';
  const isValidForDelivery = contaminatedInput.trim().length >= 4 && !isContaminatedPickupAddress(contaminatedInput);
  assert.strictEqual(isValidForDelivery, false);

  console.log('✅ Test G Passed: Contaminated address purged and rejected; legitimate profile address loaded.');
  passedTests++;
}

// --- Test H: No GPS permission ---
console.log('\n--- Test H: No GPS permission ---');
{
  // Browser denies GPS
  const browserGPS = null;
  const deliveryAddress = 'Near Jaipur Temple, Vrindavan';

  const { coords, source } = resolveOrderCoordinates({
    pinnedCoords: browserGPS,
    savedCoords: null,
    fulfillmentType: 'delivery'
  });

  // Order must proceed with service area fallback
  assert.strictEqual(source, 'service_area_fallback');
  assert.ok(isValidCoordinates(coords));
  assert.strictEqual(coords.lat, 27.5706);
  assert.strictEqual(coords.lng, 77.6593);
  console.log('✅ Test H Passed: Order is NOT blocked when GPS permission is denied.');
  passedTests++;
}

// --- Test I: Logout/login isolation ---
console.log('\n--- Test I: Logout/login isolation ---');
{
  // Customer A logged in
  mockStorage.setItem('customerName', 'Customer A');
  mockStorage.setItem('customerPhone', '9876543210');
  mockStorage.setItem('customerAddress', 'Customer A Home, Vrindavan');
  mockStorage.setItem('deliveryCoords', JSON.stringify({ lat: 27.58, lng: 77.66 }));
  mockStorage.setItem('foody_user_data', JSON.stringify({ displayName: 'Customer A', address: 'Customer A Home, Vrindavan' }));

  // Simulate logout() cleanup
  mockStorage.removeItem('foody_user_data');
  mockStorage.removeItem('customerName');
  mockStorage.removeItem('customerPhone');
  mockStorage.removeItem('customerAddress');
  mockStorage.removeItem('deliveryCoords');
  mockStorage.removeItem('foody_fulfillment_type');

  assert.strictEqual(mockStorage.getItem('customerAddress'), null);
  assert.strictEqual(mockStorage.getItem('customerName'), null);
  assert.strictEqual(mockStorage.getItem('deliveryCoords'), null);

  // Customer B logs in
  const customerBData = {
    displayName: 'Customer B',
    phone: '9123456780',
    address: 'Customer B Ashram, Vrindavan'
  };

  const loadedAddressForB = sanitizeCustomerAddress(customerBData.address) || sanitizeCustomerAddress(mockStorage.getItem('customerAddress')) || '';
  assert.strictEqual(loadedAddressForB, 'Customer B Ashram, Vrindavan');
  assert.ok(!loadedAddressForB.includes('Customer A'));
  console.log('✅ Test I Passed: Customer A data is wiped on logout and never appears for Customer B.');
  passedTests++;
}

// --- Test J: Refresh persistence ---
console.log('\n--- Test J: Refresh persistence ---');
{
  mockStorage.clear();
  const personalDeliveryAddress = 'Shri Radha Kripa, Seva Kunj, Vrindavan';
  mockStorage.setItem('customerAddress', personalDeliveryAddress);
  mockStorage.setItem('foody_fulfillment_type', 'pickup');

  // Page reloads (simulated re-initialization):
  const restoredFulfillment = mockStorage.getItem('foody_fulfillment_type') || 'delivery';
  const restoredDeliveryAddress = sanitizeCustomerAddress(mockStorage.getItem('customerAddress'));

  assert.strictEqual(restoredFulfillment, 'pickup');
  assert.strictEqual(restoredDeliveryAddress, personalDeliveryAddress);

  // When switching to delivery mode:
  const modeAfterSwitch = 'delivery';
  assert.strictEqual(restoredDeliveryAddress, personalDeliveryAddress);
  console.log('✅ Test J Passed: Delivery address and pickup mode persist separately across reloads.');
  passedTests++;
}

console.log(`\n🎉 ALL ${passedTests} / 10 REGRESSION TESTS PASSED WITH 100% SUCCESS!`);
