/**
 * Foody Vrinda — Role-Based First-Time User Tutorial Engine
 * Versioned, isolated, and persisted per user + panel
 */

import {
  UtensilsCrossed,
  ShoppingBag,
  Coins,
  ShieldCheck,
  Power,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Search,
  Plus,
  MapPin,
  Store,
  Menu,
  BellRing,
  Navigation,
  Compass,
  Users,
  User
} from 'lucide-react';

export const TUTORIAL_VERSIONS = {
  customer: 'customer_v1',
  delivery: 'delivery_v1',
  restaurant: 'restaurant_v1',
  owner: 'owner_v1'
};

export const ROLE_TUTORIAL_DATA = {
  customer_v1: {
    role: 'customer',
    version: 'customer_v1',
    roleLabel: 'Store Guide',
    accentColor: '#E0FF33',
    stages: [
      {
        id: 'search',
        dataTour: 'customer-search',
        stageNumber: 1,
        tag: 'STAGE 1 • SEARCH',
        title: 'Find your favourite food',
        subtitle: 'Search for Prasadam, sweets, snacks and more across Sri Vrindavan.',
        description: 'Search for Prasadam, sweets, snacks and more across Sri Vrindavan.',
        icon: Search,
        uiElement: 'Universal Search'
      },
      {
        id: 'categories',
        dataTour: 'customer-categories',
        stageNumber: 2,
        tag: 'STAGE 2 • DISCOVERY',
        title: 'Explore categories',
        subtitle: 'Browse food by category and discover what you want.',
        description: 'Browse pure vegetarian sweets, chaat, thalis, and dairy preparations.',
        icon: UtensilsCrossed,
        uiElement: 'Category Strip'
      },
      {
        id: 'add_to_cart',
        dataTour: 'customer-add-to-cart',
        stageNumber: 3,
        tag: 'STAGE 3 • ORDERING',
        title: 'Add items to your basket',
        subtitle: 'Choose your quantity and build your order.',
        description: 'Tap + to choose portion quantities with live haptic confirmation.',
        icon: Plus,
        uiElement: 'Dish Card Button'
      },
      {
        id: 'basket',
        dataTour: 'customer-basket',
        stageNumber: 4,
        tag: 'STAGE 4 • BASKET',
        title: 'Your Basket',
        subtitle: 'Review items, quantity and total before checkout.',
        description: 'Review dishes, apply promo savings, and checkout in seconds.',
        icon: ShoppingBag,
        uiElement: 'Basket Trigger'
      },
      {
        id: 'address',
        dataTour: 'customer-address',
        stageNumber: 5,
        tag: 'STAGE 5 • DELIVERY',
        title: 'Choose your delivery address',
        subtitle: 'GPS is optional. You can use your saved or typed address.',
        description: 'Type your Ashram, Flat, or Landmark — GPS selection is optional.',
        icon: MapPin,
        uiElement: 'Delivery Address'
      },
      {
        id: 'fv_wallet',
        dataTour: 'customer-fv-wallet',
        stageNumber: 6,
        tag: 'STAGE 6 • REWARDS',
        title: 'Earn FV Points',
        subtitle: 'Complete eligible actions and earn FV Points you can redeem.',
        description: 'Earn points on every order to redeem for instant rupee savings.',
        icon: Coins,
        uiElement: 'FV Points Badge'
      },
      {
        id: 'profile',
        dataTour: 'customer-profile',
        stageNumber: 7,
        tag: 'STAGE 7 • ACCOUNT',
        title: 'Your account',
        subtitle: 'Manage your profile, orders and settings here.',
        description: 'Track active orders, view past receipts, or replay this guide anytime.',
        icon: User,
        uiElement: 'Profile Avatar'
      }
    ]
  },

  delivery_v1: {
    role: 'delivery',
    version: 'delivery_v1',
    roleLabel: 'Rider Guide',
    accentColor: '#E0FF33',
    stages: [
      {
        id: 'go_online',
        dataTour: 'delivery-go-online',
        stageNumber: 1,
        tag: 'STAGE 1 • AVAILABILITY',
        title: 'Go Online',
        subtitle: 'Turn on your radar to receive nearby delivery dispatches.',
        description: 'Switch On Duty to receive nearby delivery dispatches, or Off Duty during breaks.',
        icon: Power,
        uiElement: 'Duty Toggle'
      },
      {
        id: 'orders',
        dataTour: 'delivery-orders',
        stageNumber: 2,
        tag: 'STAGE 2 • DISPATCH',
        title: 'Available Orders',
        subtitle: 'View live incoming orders, distances and pickup locations.',
        description: 'View incoming orders, pickup counters, and customer drop locations.',
        icon: Navigation,
        uiElement: 'Orders Board'
      },
      {
        id: 'accept',
        dataTour: 'delivery-accept',
        stageNumber: 3,
        tag: 'STAGE 3 • ACCEPT',
        title: 'Accept Delivery',
        subtitle: 'Inspect kitchen pickup, customer location & earnings.',
        description: 'Inspect kitchen pickup, customer location, and trip earnings.',
        icon: CheckCircle2,
        uiElement: 'Accept Button'
      },
      {
        id: 'navigation',
        dataTour: 'delivery-navigation',
        stageNumber: 4,
        tag: 'STAGE 4 • NAVIGATION',
        title: 'Live Navigation',
        subtitle: '1-Tap turn-by-turn map directions straight to kitchen and customer.',
        description: '1-Tap turn-by-turn map directions straight to kitchen and customer.',
        icon: Compass,
        uiElement: 'Carto HUD'
      },
      {
        id: 'complete',
        dataTour: 'delivery-complete',
        stageNumber: 5,
        tag: 'STAGE 5 • DOORSTEP',
        title: 'Complete Delivery',
        subtitle: 'Safe doorstep drop verification with 4-digit OTP code.',
        description: 'Safe doorstep drop verification with 4-digit OTP code.',
        icon: ShieldCheck,
        uiElement: 'OTP Modal'
      },
      {
        id: 'earnings',
        dataTour: 'delivery-earnings',
        stageNumber: 6,
        tag: 'STAGE 6 • PAYOUTS',
        title: 'Earnings',
        subtitle: 'Transparent ledger of daily completed orders & tips.',
        description: 'Track cash collections with zero-spill reconciliation against ₹3,000 cap.',
        icon: DollarSign,
        uiElement: 'COD Ledger'
      },
      {
        id: 'referral',
        dataTour: 'delivery-referral',
        stageNumber: 7,
        tag: 'STAGE 7 • MILESTONES',
        title: 'Refer Delivery Partners',
        subtitle: 'Bring fellow delivery partners and unlock tiered cash bonuses: 1st (+10 FV), 5th (+25 FV), and 15th (+35 FV).',
        description: 'Invite new riders to the fleet and earn bonus points for every completed order.',
        icon: Users,
        uiElement: 'Referral Hub'
      }
    ]
  },

  restaurant_v1: {
    role: 'restaurant',
    version: 'restaurant_v1',
    roleLabel: 'Kitchen Guide',
    accentColor: '#E0FF33',
    stages: [
      {
        id: 'setup',
        dataTour: 'restaurant-setup',
        stageNumber: 1,
        tag: 'STAGE 1 • SETTINGS',
        title: 'Restaurant Setup',
        subtitle: 'Configure store hours, operational switches and prep buffers.',
        description: 'Toggle Online to receive orders, or Rush mode for +15 min prep buffers.',
        icon: Store,
        uiElement: 'Presence Toggle'
      },
      {
        id: 'menu',
        dataTour: 'restaurant-menu',
        stageNumber: 2,
        tag: 'STAGE 2 • CATALOG',
        title: 'Menu',
        subtitle: 'Add signature dishes, pricing, food cutouts & stock toggles.',
        description: 'Tap Stock to 86 out-of-stock dishes across customer apps in realtime.',
        icon: Menu,
        uiElement: 'Stock & Menu'
      },
      {
        id: 'orders',
        dataTour: 'restaurant-orders',
        stageNumber: 3,
        tag: 'STAGE 3 • KDS',
        title: 'Incoming Orders',
        subtitle: 'Live kitchen display screen with loud buzzer sound trials.',
        description: 'Live incoming KDS tickets ring chimes; check items and mark ready.',
        icon: BellRing,
        uiElement: 'KDS Display'
      },
      {
        id: 'manage_orders',
        dataTour: 'restaurant-manage-orders',
        stageNumber: 4,
        tag: 'STAGE 4 • STATIONS',
        title: 'Manage Orders',
        subtitle: 'Move tickets through Preparing, Ready, and Rider handoff.',
        description: 'Move tickets through Preparing, Ready, and Rider handoff.',
        icon: CheckCircle2,
        uiElement: 'Order Stations'
      },
      {
        id: 'sales',
        dataTour: 'restaurant-sales',
        stageNumber: 5,
        tag: 'STAGE 5 • REVENUE',
        title: 'Sales',
        subtitle: 'Real-time revenue analytics & transparent accounting.',
        description: 'Track completed preparations and daily kitchen dispatch volume.',
        icon: DollarSign,
        uiElement: 'Daily Volume Card'
      },
      {
        id: 'grow',
        dataTour: 'restaurant-grow',
        stageNumber: 6,
        tag: 'STAGE 6 • GROWTH',
        title: 'Grow',
        subtitle: 'Boost ratings, customer reviews & festive promotions.',
        description: 'Join the official WhatsApp channel for festive broadcasts & chef tips.',
        icon: TrendingUp,
        uiElement: 'Growth Hub Card'
      }
    ]
  },

  owner_v1: {
    role: 'owner',
    version: 'owner_v1',
    roleLabel: 'Owner Guide',
    accentColor: '#A855F7',
    stages: [
      {
        id: 'stores',
        dataTour: 'owner-stores',
        stageNumber: 1,
        tag: 'STAGE 1 • STORE',
        title: 'Store Profile & Branches',
        subtitle: 'Manage kitchen profiles, branch addresses & online availability.',
        description: 'Edit branch profiles, phone numbers, and toggle kitchen availability.',
        icon: Store,
        uiElement: 'Store Profile'
      },
      {
        id: 'revenue',
        dataTour: 'owner-sales',
        stageNumber: 2,
        tag: 'STAGE 2 • REVENUE',
        title: 'Revenue & Settlements',
        subtitle: 'Track real-time gross revenue, COD reconciliations, and payout ledgers.',
        description: 'Track real-time gross revenue, COD reconciliations, and payout ledgers.',
        icon: DollarSign,
        uiElement: 'Analytics Dashboard'
      },
      {
        id: 'menu',
        dataTour: 'owner-menu',
        stageNumber: 3,
        tag: 'STAGE 3 • CATALOG',
        title: 'Menu Catalog & Pricing',
        subtitle: 'Create signature dishes, upload images & update item prices in realtime.',
        description: 'Create signature dishes, upload images & update item prices in realtime.',
        icon: UtensilsCrossed,
        uiElement: 'Menu Catalog'
      },
      {
        id: 'staff',
        dataTour: 'owner-staff',
        stageNumber: 4,
        tag: 'STAGE 4 • ACCESS',
        title: 'Staff & Role Management',
        subtitle: 'Assign kitchen chefs, cashiers & delivery partner credentials securely.',
        description: 'Assign kitchen chefs, cashiers & delivery partner credentials securely.',
        icon: Users,
        uiElement: 'Staff & Roles'
      }
    ]
  }
};

/**
 * Resolves the canonical role string (customer, delivery, restaurant, owner)
 */
export function getCanonicalRole(role) {
  if (!role || typeof role !== 'string') return null;
  const clean = role.toLowerCase().trim();
  if (!clean) return null;
  if (['delivery', 'delivery_partner', 'rider', 'transport'].includes(clean)) return 'delivery';
  if (['kitchen', 'restaurant', 'chef'].includes(clean)) return 'restaurant';
  if (['owner', 'shop_owner', 'store_owner', 'franchise'].includes(clean)) return 'owner';
  if (clean === 'customer' || clean === 'store') return 'customer';
  // Administrative and developer roles have no auto-tutorial
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
 * Resets tutorial session state (for manual replay)
 */
export function resetTutorial(userId, role) {
  const storageKey = getTutorialStorageKey(userId, role);
  if (storageKey && typeof window !== 'undefined') {
    try {
      localStorage.removeItem(storageKey);
    } catch (_) {}
  }
}
