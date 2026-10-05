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
  Sparkles,
  Search,
  Plus,
  MapPin,
  User,
  Compass
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
        id: 'search',
        dataTour: 'customer-search',
        stageNumber: 1,
        tag: 'STAGE 1 • SEARCH',
        title: 'Find your favourite food',
        subtitle: 'Search for Prasadam, sweets, snacks and more across Sri Vrindavan.',
        icon: Search,
        badgeText: 'Instant Search',
        uiElement: 'Universal Search',
        highlights: [
          { label: 'Universal Search', desc: 'Find dishes, restaurants or browse daily temple prasadam.' },
          { label: 'Quick Query', desc: 'Type or speak to locate authentic Satvik delicacies fast.' }
        ]
      },
      {
        id: 'categories',
        dataTour: 'customer-categories',
        stageNumber: 2,
        tag: 'STAGE 2 • DISCOVERY',
        title: 'Explore categories',
        subtitle: 'Browse food by category and discover what you want.',
        icon: UtensilsCrossed,
        badgeText: 'Pure Satvik Menus',
        uiElement: 'Category Strip',
        highlights: [
          { label: 'Category Filter', desc: 'Filter Sweets, Chaat, Thalis, Beverages, or Gaushala Dairy items.' },
          { label: '100% Satvik', desc: 'Every preparation is pure vegetarian, without onion or garlic.' }
        ]
      },
      {
        id: 'add_to_cart',
        dataTour: 'customer-add-to-cart',
        stageNumber: 3,
        tag: 'STAGE 3 • ORDERING',
        title: 'Add items to your basket',
        subtitle: 'Choose your quantity and build your order.',
        icon: Plus,
        badgeText: '1-Tap Ordering',
        uiElement: 'Dish Card + Button',
        highlights: [
          { label: 'Portion Control', desc: 'Select portions and customize quantities effortlessly.' },
          { label: 'Instant Feedback', desc: 'Haptic confirmation and micro-animations on every add.' }
        ]
      },
      {
        id: 'basket',
        dataTour: 'customer-basket',
        stageNumber: 4,
        tag: 'STAGE 4 • BASKET',
        title: 'Your Basket',
        subtitle: 'Review items, quantity and total before checkout.',
        icon: ShoppingBag,
        badgeText: 'Live Order Review',
        uiElement: 'Basket Trigger',
        highlights: [
          { label: 'Order Summary', desc: 'Review dishes, applied promo discounts, and transparent totals.' },
          { label: 'Special Instructions', desc: 'Add sattvic cooking notes for the temple chefs.' }
        ]
      },
      {
        id: 'address',
        dataTour: 'customer-address',
        stageNumber: 5,
        tag: 'STAGE 5 • DELIVERY',
        title: 'Choose your delivery address',
        subtitle: 'GPS is optional. You can use your saved or typed address.',
        icon: MapPin,
        badgeText: 'Flexible Address',
        uiElement: 'Delivery Address',
        highlights: [
          { label: 'No Blocker', desc: 'Type your Ashram, Flat, or Landmark name — GPS click is optional.' },
          { label: 'Safe Delivery', desc: 'Dedicated Sarathi riders deliver hot prasad directly to your doorstep.' }
        ]
      },
      {
        id: 'fv_wallet',
        dataTour: 'customer-fv-wallet',
        stageNumber: 6,
        tag: 'STAGE 6 • REWARDS',
        title: 'Earn FV Points',
        subtitle: 'Complete eligible actions and earn FV Points you can redeem.',
        icon: Coins,
        badgeText: '1 FV Point = ₹0.10',
        uiElement: 'FV Points Badge',
        highlights: [
          { label: 'Real Value', desc: 'Earn points on every order and referral.' },
          { label: 'Redeem for Cash Off', desc: 'Use your points at checkout for instant rupee discounts.' }
        ]
      },
      {
        id: 'profile',
        dataTour: 'customer-profile',
        stageNumber: 7,
        tag: 'STAGE 7 • ACCOUNT',
        title: 'Your account',
        subtitle: 'Manage your profile, orders and settings here.',
        icon: User,
        badgeText: 'Devotee Console',
        uiElement: 'Profile Avatar',
        highlights: [
          { label: 'Order History', desc: 'Track live orders and view past receipts anytime.' },
          { label: 'Settings & Replay', desc: 'Replay this tour or update contact details whenever needed.' }
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
        id: 'go_online',
        dataTour: 'delivery-go-online',
        stageNumber: 1,
        tag: 'STAGE 1 • AVAILABILITY',
        title: 'Go Online',
        subtitle: 'Turn on your radar to receive nearby delivery dispatches.',
        icon: Power,
        badgeText: 'Shift Radar Switch',
        uiElement: 'Duty Toggle',
        highlights: [
          { label: 'Shift Toggle', desc: 'Toggle Online when ready to ride; go Offline during rest breaks.' },
          { label: 'Smart Dispatch', desc: 'Nearby orders are automatically routed to your phone.' }
        ]
      },
      {
        id: 'orders',
        dataTour: 'delivery-orders',
        stageNumber: 2,
        tag: 'STAGE 2 • DISPATCH',
        title: 'Available Orders',
        subtitle: 'View live incoming orders, distances and pickup locations.',
        icon: Navigation,
        badgeText: 'Real-Time Feed',
        uiElement: 'Orders Board',
        highlights: [
          { label: 'Live Tickets', desc: 'View distance, customer address, and payout before accepting.' },
          { label: 'Audio Alarms', desc: 'Loud buzzer chimes ensure zero missed runs.' }
        ]
      },
      {
        id: 'accept',
        dataTour: 'delivery-accept',
        stageNumber: 3,
        tag: 'STAGE 3 • ACCEPT',
        title: 'Accept Delivery',
        subtitle: 'Inspect kitchen pickup, customer location & earnings.',
        icon: CheckCircle2,
        badgeText: '1-Tap Claim',
        uiElement: 'Accept Button',
        highlights: [
          { label: 'Immediate Claim', desc: 'Lock in the order and notify the kitchen team instantly.' },
          { label: 'Kitchen Counter', desc: 'Head to the kitchen pickup counter for packaged prasad.' }
        ]
      },
      {
        id: 'navigation',
        dataTour: 'delivery-navigation',
        stageNumber: 4,
        tag: 'STAGE 4 • NAVIGATION',
        title: 'Live Navigation',
        subtitle: '1-Tap turn-by-turn map directions straight to kitchen and customer.',
        icon: Compass,
        badgeText: 'Carto Map HUD',
        uiElement: 'Map Route',
        highlights: [
          { label: 'Turn-by-Turn', desc: 'Optimized routing through Sri Vrindavan streets and Parikrama Marg.' },
          { label: 'Live Location Sync', desc: 'Customer sees your real-time ETA in their active tracking modal.' }
        ]
      },
      {
        id: 'complete',
        dataTour: 'delivery-complete',
        stageNumber: 5,
        tag: 'STAGE 5 • DOORSTEP',
        title: 'Complete Delivery',
        subtitle: 'Safe doorstep drop verification with 4-digit OTP code.',
        icon: ShieldCheck,
        badgeText: '4-Digit OTP Guard',
        uiElement: 'OTP Modal',
        highlights: [
          { label: 'Customer OTP', desc: 'Ask customer for 4-digit code to securely verify handover.' },
          { label: 'COD Cash Collection', desc: 'Collect exact cash amount and record with 1 tap.' }
        ]
      },
      {
        id: 'earnings',
        dataTour: 'delivery-earnings',
        stageNumber: 6,
        tag: 'STAGE 6 • PAYOUTS',
        title: 'Earnings',
        subtitle: 'Transparent ledger of daily completed orders & tips.',
        icon: DollarSign,
        badgeText: 'Daily Settlement',
        uiElement: 'Earnings Ledger',
        highlights: [
          { label: 'Trip Ledger', desc: 'Track per-drop payments and peak darshan multipliers.' },
          { label: 'Fast Payouts', desc: 'Direct transfers to your bank account or UPI ID.' }
        ]
      },
      {
        id: 'referral',
        dataTour: 'delivery-referral',
        stageNumber: 7,
        tag: 'STAGE 7 • MILESTONES',
        title: 'Refer Delivery Partners',
        subtitle: 'Bring fellow delivery partners and unlock tiered cash bonuses: 1st (+10 FV), 5th (+25 FV), and 15th (+35 FV).',
        icon: Users,
        badgeText: 'Up to +70 FV Milestone Rewards',
        uiElement: 'Milestones Hub',
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
        id: 'setup',
        dataTour: 'restaurant-setup',
        stageNumber: 1,
        tag: 'STAGE 1 • SETTINGS',
        title: 'Restaurant Setup',
        subtitle: 'Configure store hours, operational switches and prep buffers.',
        icon: Store,
        badgeText: 'Kitchen Switch',
        uiElement: 'Store Setup',
        highlights: [
          { label: 'Store Switch', desc: 'Open and close your kitchen with one tap.' },
          { label: 'Payment Toggles', desc: 'Accept Cash on Delivery, Online UPI, or both.' }
        ]
      },
      {
        id: 'menu',
        dataTour: 'restaurant-menu',
        stageNumber: 2,
        tag: 'STAGE 2 • CATALOG',
        title: 'Menu',
        subtitle: 'Add signature dishes, pricing, food cutouts & stock toggles.',
        icon: Menu,
        badgeText: 'Catalog Management',
        uiElement: 'Menu Grid',
        highlights: [
          { label: 'Instant Creation', desc: 'Manage dish names, descriptions, cutouts, and rupee prices.' },
          { label: 'Stock Toggle', desc: 'Mark dishes out of stock instantly if ingredients run out.' }
        ]
      },
      {
        id: 'orders',
        dataTour: 'restaurant-orders',
        stageNumber: 3,
        tag: 'STAGE 3 • KDS',
        title: 'Incoming Orders',
        subtitle: 'Live kitchen display screen with loud buzzer sound trials.',
        icon: BellRing,
        badgeText: 'Live KDS Tickets',
        uiElement: 'KDS Display',
        highlights: [
          { label: 'Instant Chime', desc: 'Loud alarm alerts the kitchen whenever a customer places an order.' },
          { label: 'Clear Tickets', desc: 'View item quantities, customizations, and packaging notes.' }
        ]
      },
      {
        id: 'manage_orders',
        dataTour: 'restaurant-manage-orders',
        stageNumber: 4,
        tag: 'STAGE 4 • STATIONS',
        title: 'Manage Orders',
        subtitle: 'Move tickets through Preparing, Ready, and Rider handoff.',
        icon: CheckCircle2,
        badgeText: 'Station Workflow',
        uiElement: 'Order Stations',
        highlights: [
          { label: 'Mark Ready', desc: 'Notify assigned Sarathi rider immediately when food is packaged.' },
          { label: 'Rider Pickup', desc: 'Verify rider OTP and hand over sacred prasad.' }
        ]
      },
      {
        id: 'sales',
        dataTour: 'restaurant-sales',
        stageNumber: 5,
        tag: 'STAGE 5 • REVENUE',
        title: 'Sales',
        subtitle: 'Real-time revenue analytics & transparent accounting.',
        icon: DollarSign,
        badgeText: 'Revenue Dashboard',
        uiElement: 'Sales Accounting',
        highlights: [
          { label: 'Daily Sales', desc: 'Track gross turnover, orders completed, and average order value.' },
          { label: 'Reconciliation', desc: 'Clear accounting for Cash on Delivery and digital prepayments.' }
        ]
      },
      {
        id: 'grow',
        dataTour: 'restaurant-grow',
        stageNumber: 6,
        tag: 'STAGE 6 • GROWTH',
        title: 'Grow',
        subtitle: 'Boost ratings, customer reviews & festive promotions.',
        icon: TrendingUp,
        badgeText: 'Reputation & Outreach',
        uiElement: 'Growth Hub',
        highlights: [
          { label: 'Devotee Reviews', desc: 'Monitor ratings and customer feedback from pilgrims.' },
          { label: 'Festival Promos', desc: 'Promote special festival thalis on the Foody Vrinda WhatsApp broadcast.' }
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
