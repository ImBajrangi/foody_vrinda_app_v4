/**
 * Foody Vrinda — Role-Based First-Time User Tutorial Engine
 * Versioned, isolated, and persisted per user + role
 */

import {
  UtensilsCrossed,
  ShoppingBag,
  Navigation,
  Coins,
  Users,
  ShieldCheck,
  Bike,
  Power,
  CheckCircle2,
  DollarSign,
  ChefHat,
  Store,
  Menu,
  BellRing,
  TrendingUp,
  Sparkles
} from 'lucide-react';

export const TUTORIAL_VERSIONS = {
  customer: 'customer_v1',
  delivery: 'delivery_v1',
  restaurant: 'restaurant_v1'
};

export const ROLE_TUTORIAL_DATA = {
  customer_v1: {
    role: 'customer',
    version: 'customer_v1',
    roleLabel: 'Satvik Customer Guide',
    accentColor: '#E0FF33',
    stages: [
      {
        id: 'welcome',
        stageNumber: 1,
        tag: 'STAGE 1 • WELCOME',
        title: 'Welcome',
        subtitle: '100% Satvik Pure Prasadam & Delicacies in Sri Vrindavan Dham',
        icon: UtensilsCrossed,
        badgeText: 'Pure Satvik • Zero Onion-Garlic',
        uiElement: 'Foody Vrinda Home',
        highlights: [
          { label: 'Divine Offerings', desc: 'Temple-style Bankey Bihari Peda, Radha Rani Kachori, and authentic thalis.' },
          { label: 'Sanctified Kitchens', desc: 'Prepared with highest standards of cleanliness and traditional Braj devotion.' },
          { label: 'Local Delivery', desc: 'Swift doorstep service anywhere within Sri Vrindavan and Mathura region.' }
        ]
      },
      {
        id: 'find_food',
        stageNumber: 2,
        tag: 'STAGE 2 • DISCOVERY',
        title: 'Find Food',
        subtitle: 'Explore authentic menus, shops & voice search',
        icon: ShoppingBag,
        badgeText: 'Voice Search Enabled',
        uiElement: 'Search Bar & Category Strip',
        highlights: [
          { label: 'Universal Search', desc: 'Find dishes, restaurants or speak in Hindi/English with voice recognition.' },
          { label: 'Category Strips', desc: 'Quickly filter Sweets, Chat, Thalis, Beverages, or Gaushala Dairy items.' },
          { label: 'Live Kitchen Status', desc: 'Clear indicators showing if a kitchen is currently baking or accepting orders.' }
        ]
      },
      {
        id: 'order',
        stageNumber: 3,
        tag: 'STAGE 3 • ORDERING',
        title: 'Place Order',
        subtitle: 'From basket to doorstep with real-time GPS radar',
        icon: Navigation,
        badgeText: 'Live GPS Delivery Radar',
        uiElement: 'Basket & Live GPS Radar',
        highlights: [
          { label: '1-Tap Basket', desc: 'Customize portions, sweet levels, and special satvik requests easily.' },
          { label: 'Doorstep Pinpoint', desc: 'Pin your Ashram, Hotel, or Home location with interactive GPS Map Picker.' },
          { label: 'Delivery Verification', desc: 'Safe delivery confirmed via confidential 4-digit OTP at doorstep.' }
        ]
      },
      {
        id: 'earn_fv',
        stageNumber: 4,
        tag: 'STAGE 4 • REWARDS',
        title: 'Earn FV Points',
        subtitle: '1 FV Point = ₹0.10 • 50 FV Points = ₹5.00 Real Value',
        icon: Coins,
        badgeText: 'Real Platform Currency',
        uiElement: 'FV Points Badge (Header)',
        highlights: [
          { label: 'Auto-Provisioned Wallet', desc: 'Your digital dynasty wallet is created automatically upon signup.' },
          { label: 'Order Rewards', desc: 'Earn points every time you enjoy delicious prasadam meals.' },
          { label: 'Cryptographic Ledger', desc: 'Every point credit is permanently protected in an append-only journal.' }
        ]
      },
      {
        id: 'refer',
        stageNumber: 5,
        tag: 'STAGE 5 • DYNASTY',
        title: 'Refer Friends',
        subtitle: 'Share divine tastes & earn genuine milestone rewards',
        icon: Users,
        badgeText: 'Up to +35 FV Points',
        uiElement: 'Dynasty Referral Hub',
        highlights: [
          { label: '1-Tap WhatsApp Share', desc: 'Share your personalized invite link with friends and WhatsApp groups.' },
          { label: 'Instant Bonus', desc: 'Both you and your friend earn +5 FV Points the moment they register.' },
          { label: 'First Order Reward', desc: 'Earn +10 FV (You) and +20 FV (Friend) on their qualifying first order.' }
        ]
      },
      {
        id: 'redeem',
        stageNumber: 6,
        tag: 'STAGE 6 • REDEMPTION',
        title: 'Redeem FV',
        subtitle: 'Apply FV Points for instant rupee discounts on orders',
        icon: Sparkles,
        badgeText: 'Instant ₹ Savings',
        uiElement: 'Checkout Slider & Discounts',
        highlights: [
          { label: 'Checkout Slider', desc: 'Choose how many points to redeem directly inside your basket drawer.' },
          { label: 'Direct Rupee Off', desc: '10 FV = ₹1 off, 50 FV = ₹5 off, 100 FV = ₹10 off your meal total.' },
          { label: 'Zero Extra Charges', desc: 'No hidden convenience or redemption fees ever.' }
        ]
      }
    ]
  },

  delivery_v1: {
    role: 'delivery',
    version: 'delivery_v1',
    roleLabel: 'Sarathi Delivery Fleet Guide',
    accentColor: '#06B6D4',
    stages: [
      {
        id: 'welcome',
        stageNumber: 1,
        tag: 'STAGE 1 • WELCOME',
        title: 'Welcome',
        subtitle: 'Deliver sacred prasadam across Sri Vrindavan Dham',
        icon: Bike,
        badgeText: 'Official Fleet Partner',
        uiElement: 'Sarathi Rider Console',
        highlights: [
          { label: 'Noble Service', desc: 'Serve pilgrims and devotees by delivering fresh, authentic prasad.' },
          { label: 'Transparent Earnings', desc: 'Guaranteed per-drop fees, peak incentives, and fast cash payouts.' },
          { label: 'Community Support', desc: 'Join the dedicated WhatsApp Rider Fleet group for dispatch help.' }
        ]
      },
      {
        id: 'online',
        stageNumber: 2,
        tag: 'STAGE 2 • AVAILABILITY',
        title: 'Go Online',
        subtitle: 'Turn on your radar to receive nearby delivery dispatches',
        icon: Power,
        badgeText: '1-Tap Online Radar',
        uiElement: 'Shift Radar Switch',
        highlights: [
          { label: 'Shift Toggle', desc: 'Toggle Online when you are ready to ride; go Offline whenever taking a break.' },
          { label: 'Smart Dispatch', desc: 'Orders within your radius are automatically routed to your device.' },
          { label: 'Cash Limit Monitor', desc: 'Live COD audit keeps your shift smooth and within safe limits.' }
        ]
      },
      {
        id: 'accept',
        stageNumber: 3,
        tag: 'STAGE 3 • DISPATCH',
        title: 'Accept Delivery',
        subtitle: 'Inspect kitchen pickup, customer location & earnings',
        icon: Navigation,
        badgeText: 'Real-Time Routing',
        uiElement: 'Incoming Dispatch Radar',
        highlights: [
          { label: 'Audio Alerts', desc: 'Loud alerts ensure you never miss a high-priority order dispatch.' },
          { label: 'Kitchen Directions', desc: '1-Tap Google / In-app map navigation straight to the restaurant pickup counter.' },
          { label: 'Order Verification', desc: 'Confirm order ticket number before packing securely into delivery bag.' }
        ]
      },
      {
        id: 'deliver',
        stageNumber: 4,
        tag: 'STAGE 4 • DOORSTEP',
        title: 'Complete Delivery',
        subtitle: 'Safe doorstep drop verification & cash collection',
        icon: CheckCircle2,
        badgeText: '4-Digit OTP Guard',
        uiElement: 'Doorstep 4-Digit OTP',
        highlights: [
          { label: 'Customer OTP', desc: 'Ask customer for 4-digit verification code to confirm dropoff.' },
          { label: 'Cash Collection', desc: 'Collect exact bill amount for COD orders and record with 1 tap.' },
          { label: 'Instant Status Sync', desc: 'Completion immediately notifies kitchen, customer, and backend ledger.' }
        ]
      },
      {
        id: 'earnings',
        stageNumber: 5,
        tag: 'STAGE 5 • PAYOUTS',
        title: 'Earnings',
        subtitle: 'Transparent ledger of daily completed orders & tips',
        icon: DollarSign,
        badgeText: 'Daily Settlement Ready',
        uiElement: 'Trip & Earnings Ledger',
        highlights: [
          { label: 'Trip Ledger', desc: 'View payout details for every completed run in real time.' },
          { label: 'Peak Multipliers', desc: 'Earn extra bonuses during temple darshan hours and festival rush.' },
          { label: 'Direct Transfer', desc: 'Weekly settlements directly to your bank account or UPI ID.' }
        ]
      },
      {
        id: 'refer_rider',
        stageNumber: 6,
        tag: 'STAGE 6 • MILESTONES',
        title: 'Refer Delivery Partners',
        subtitle: 'Bring fellow delivery partners and unlock tiered cash bonuses',
        icon: Users,
        badgeText: 'Up to +70 FV Milestone Rewards',
        uiElement: '1st / 5th / 15th Milestones',
        highlights: [
          { label: '1st Completed Delivery Milestone', desc: 'New rider earns +10 FV • Referrer earns +5 FV bonus.' },
          { label: '5th Completed Deliveries Milestone', desc: 'Rider earns +25 FV • Referrer earns +20 FV bonus.' },
          { label: '15th Completed Deliveries Milestone', desc: 'Rider earns +35 FV • Referrer earns +25 FV bonus.' }
        ]
      }
    ]
  },

  restaurant_v1: {
    role: 'restaurant',
    version: 'restaurant_v1',
    roleLabel: 'Kitchen & Store Partner Guide',
    accentColor: '#F59E0B',
    stages: [
      {
        id: 'welcome',
        stageNumber: 1,
        tag: 'STAGE 1 • WELCOME',
        title: 'Welcome',
        subtitle: 'Empowering authentic Satvik food creators in Vrindavan',
        icon: ChefHat,
        badgeText: 'Verified Cloud Kitchen',
        uiElement: 'Kitchen Operations Hub',
        highlights: [
          { label: 'Direct Devotee Reach', desc: 'Showcase your sacred dishes to thousands of devotees and residents.' },
          { label: 'Zero Quality Compromise', desc: 'Maintain strict 100% Satvik standards without onion and garlic.' },
          { label: 'Fleet Integration', desc: 'Our dedicated Sarathi delivery riders handle all doorstep logistics.' }
        ]
      },
      {
        id: 'setup',
        stageNumber: 2,
        tag: 'STAGE 2 • SETTINGS',
        title: 'Restaurant Setup',
        subtitle: 'Configure store hours, address & operational switches',
        icon: Store,
        badgeText: 'Complete Kitchen Control',
        uiElement: 'Store Switch & Kitchen Timing',
        highlights: [
          { label: 'Store Switch', desc: 'Open and close your online kitchen whenever you start or finish cooking.' },
          { label: 'Payment Toggles', desc: 'Choose to accept Cash on Delivery, Online UPI, or both.' },
          { label: 'Prep Time Buffer', desc: 'Set standard cooking time (15-30 mins) to manage customer expectations.' }
        ]
      },
      {
        id: 'menu',
        stageNumber: 3,
        tag: 'STAGE 3 • CATALOG',
        title: 'Menu',
        subtitle: 'Add signature dishes, pricing & food cutouts',
        icon: Menu,
        badgeText: 'Dynamic Catalog Grid',
        uiElement: 'Dish Cutouts & Stock Switch',
        highlights: [
          { label: 'Instant Dish Creation', desc: 'Set dish names, descriptions, transparent cutouts, and rupee prices.' },
          { label: 'Category Tagging', desc: 'Group dishes under Temple Sweets, Thalis, Snacks, or Drinks.' },
          { label: 'Out of Stock Switch', desc: 'Mark sold-out dishes unavailable with 1 tap to prevent canceled orders.' }
        ]
      },
      {
        id: 'receive_orders',
        stageNumber: 4,
        tag: 'STAGE 4 • KDS TICKETS',
        title: 'Incoming Orders',
        subtitle: 'Live kitchen display screen with loud sound trials',
        icon: BellRing,
        badgeText: 'High-Alert Sound Engine',
        uiElement: 'Live Kitchen Display (KDS)',
        highlights: [
          { label: 'Immediate Alert', desc: 'Loud temple gong / buzzer plays immediately when a customer orders.' },
          { label: 'Visual Ticket', desc: 'Clear item quantities, custom portion notes, and delivery destination.' },
          { label: 'Accept / Reject', desc: 'Acknowledge order and start cooking with estimated preparation clock.' }
        ]
      },
      {
        id: 'manage_orders',
        stageNumber: 5,
        tag: 'STAGE 5 • DISPATCH',
        title: 'Manage Orders',
        subtitle: 'Move tickets through Preparing, Ready, and Dispatched',
        icon: CheckCircle2,
        badgeText: 'Seamless Station Workflow',
        uiElement: 'Station Status & Rider Handoff',
        highlights: [
          { label: 'Mark Ready', desc: 'Notify assigned Sarathi rider the exact moment food is packed.' },
          { label: 'Rider Pickup', desc: 'Verify rider ID and hand over packaged prasad.' },
          { label: 'Live Tracking', desc: 'Follow the order until it is successfully delivered at customer doorstep.' }
        ]
      },
      {
        id: 'sales',
        stageNumber: 6,
        tag: 'STAGE 6 • REVENUE',
        title: 'Sales',
        subtitle: 'Real-time revenue analytics & transparent accounting',
        icon: DollarSign,
        badgeText: 'Daily Revenue Ledger',
        uiElement: 'Gross Sales Dashboard',
        highlights: [
          { label: 'Revenue Dashboard', desc: 'Track gross daily sales, completed order counts, and average bill size.' },
          { label: 'COD Reconciliation', desc: 'Monitor cash collected by riders vs digital UPI payments.' },
          { label: 'Bank Settlement', desc: 'Scheduled automated payouts directly into your registered bank account.' }
        ]
      },
      {
        id: 'grow',
        stageNumber: 7,
        tag: 'STAGE 7 • GROWTH',
        title: 'Grow',
        subtitle: 'Boost ratings, customer reviews & festive promotions',
        icon: TrendingUp,
        badgeText: 'Build Royal Reputation',
        uiElement: 'Customer Reviews & Broadcast',
        highlights: [
          { label: 'Customer Reviews', desc: 'Monitor ratings and chef feedback from happy pilgrims.' },
          { label: 'VIP Channels', desc: 'Promote special festival thalis on the Foody Vrinda WhatsApp broadcast.' },
          { label: 'Repeat Customers', desc: 'Build loyal followers who order every Ekadashi and festival day.' }
        ]
      }
    ]
  }
};

/**
 * Resolves the canonical role string (customer, delivery, restaurant)
 */
export function getCanonicalRole(role) {
  if (!role) return null;
  const clean = String(role).toLowerCase().trim();
  if (['delivery', 'delivery_partner', 'rider'].includes(clean)) return 'delivery';
  if (['kitchen', 'restaurant', 'chef'].includes(clean)) return 'restaurant';
  if (clean === 'customer') return 'customer';
  // Administrative, developer, owner, and invalid roles have no tutorial
  return null;
}

/**
 * Resolves the canonical tutorial version key for a given user role
 */
export function getTutorialKeyForRole(role) {
  const canonical = getCanonicalRole(role);
  if (!canonical) return null;
  return TUTORIAL_VERSIONS[canonical] || null;
}

/**
 * Generates the deterministic persistence key: user_id + role + tutorial_version
 */
export function getTutorialStorageKey(userId, role) {
  const canonical = getCanonicalRole(role);
  const version = getTutorialKeyForRole(role);
  if (!userId || !canonical || !version) return null;
  return `foody_tutorial_${userId}_${canonical}_${version}`;
}

/**
 * Fetches the stored tutorial progress record
 */
export function getTutorialProgress(userId, role) {
  const key = getTutorialStorageKey(userId, role);
  if (!key || typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    // Fallback check for older format
    const legacyKey = `foody_tutorial_${userId}_${getTutorialKeyForRole(role)}`;
    const legacyRaw = localStorage.getItem(legacyKey);
    return legacyRaw ? JSON.parse(legacyRaw) : null;
  } catch (_) {
    return null;
  }
}

/**
 * Checks if tutorial has been completed for a given user and role version
 */
export function isTutorialCompleted(userId, role) {
  if (!userId || !role || typeof window === 'undefined') return true;
  const canonical = getCanonicalRole(role);
  if (!canonical) return true; // Don't show tutorial for unresolved or administrative roles

  const progress = getTutorialProgress(userId, role);
  return Boolean(progress?.completed === true);
}

/**
 * Records tutorial completion with full recommended schema
 */
export function markTutorialCompleted(userId, role, currentStep = 0) {
  const storageKey = getTutorialStorageKey(userId, role);
  const canonical = getCanonicalRole(role);
  const version = getTutorialKeyForRole(role);
  if (!storageKey || !canonical || !version || typeof window === 'undefined') return;

  try {
    const now = new Date().toISOString();
    const payload = {
      user_id: String(userId),
      role: canonical,
      tutorial_key: canonical,
      tutorial_version: version,
      current_step: currentStep,
      completed: true,
      completed_at: now,
      last_seen_at: now
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (err) {
    console.warn('[Tutorial] Failed to save completion state:', err);
  }
}

/**
 * Saves current in-progress tutorial step
 */
export function saveTutorialProgress(userId, role, currentStep = 0) {
  const storageKey = getTutorialStorageKey(userId, role);
  const canonical = getCanonicalRole(role);
  const version = getTutorialKeyForRole(role);
  if (!storageKey || !canonical || !version || typeof window === 'undefined') return;

  try {
    const existing = getTutorialProgress(userId, role) || {};
    const now = new Date().toISOString();
    const payload = {
      ...existing,
      user_id: String(userId),
      role: canonical,
      tutorial_key: canonical,
      tutorial_version: version,
      current_step: currentStep,
      completed: existing.completed || false,
      completed_at: existing.completed_at || null,
      last_seen_at: now
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (_) {}
}

/**
 * Resets tutorial session state (for manual replay) without corrupting historical records
 */
export function resetTutorial(userId, role) {
  // Manual replay simply re-opens the flow in UI without deleting historical ledger/milestone state
}
