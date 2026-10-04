/**
 * FOODY VRINDA — SYNTHETIC / SANITIZED BETA DATA SEEDER
 * 
 * Purpose: Populate Alpha (Dev) and Beta (Staging) Supabase instances with
 * realistic, clean, synthetic catalog and test state WITHOUT using raw
 * Production PII (no real customer phones, addresses, or payment tokens).
 * 
 * Safety: Strictly refuses to execute against production URL.
 */

import { createClient } from '@supabase/supabase-js';

const PROD_PROJECT_ID = 'mrsxliwygodtwjuyqmts';
const PROD_SUPABASE_HOST = 'mrsxliwygodtwjuyqmts.supabase.co';
const PROD_SUPABASE_URL = 'https://mrsxliwygodtwjuyqmts.supabase.co';

const envName = (
  process.env.ENVIRONMENT ||
  process.env.NODE_ENV ||
  process.env.APP_ENV ||
  process.env.VERCEL_ENV ||
  ''
).toLowerCase().trim();

const targetUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const targetKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
const allowSeedFlag = process.env.ALLOW_SYNTHETIC_SEED === 'true';

// -----------------------------------------------------------------------------
// GUARD 1: Environment Name Check
// -----------------------------------------------------------------------------
if (['production', 'prod', 'live'].includes(envName)) {
  console.error('⛔ [GUARD 1 HARD BLOCK]: Active environment is designated as PRODUCTION (' + envName + ')!');
  console.error('Synthetic data seeding is strictly prohibited in production environments.');
  process.exit(1);
}

if (!targetUrl || !targetKey) {
  console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be provided.');
  console.error('Usage: ALLOW_SYNTHETIC_SEED=true VITE_SUPABASE_URL=<BETA_URL> VITE_SUPABASE_ANON_KEY=<KEY> node scripts/seed-synthetic-beta-data.js');
  process.exit(1);
}

let targetHost = '';
try {
  targetHost = new URL(targetUrl).hostname.toLowerCase();
} catch (e) {
  console.error('❌ Error: Invalid VITE_SUPABASE_URL provided:', targetUrl);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// GUARD 2: Project ID & Subdomain Check
// -----------------------------------------------------------------------------
if (targetHost.includes(PROD_PROJECT_ID) || targetUrl.includes(PROD_PROJECT_ID)) {
  console.error('⛔ [GUARD 2 HARD BLOCK]: Target matches Production Supabase Project ID (' + PROD_PROJECT_ID + ')!');
  console.error('Synthetic data seeding into Production is strictly forbidden.');
  process.exit(1);
}

// -----------------------------------------------------------------------------
// GUARD 3: Exact URL & Hostname Check
// -----------------------------------------------------------------------------
if (targetUrl.startsWith(PROD_SUPABASE_URL) || targetHost === PROD_SUPABASE_HOST) {
  console.error('⛔ [GUARD 3 HARD BLOCK]: Target matches Production Supabase Hostname (' + PROD_SUPABASE_HOST + ')!');
  console.error('Connecting to the Production database instance for seeding is strictly prohibited.');
  process.exit(1);
}

// -----------------------------------------------------------------------------
// GUARD 4: Explicit Confirmation Flag (Fail-Closed)
// -----------------------------------------------------------------------------
if (!allowSeedFlag) {
  console.error('⛔ [GUARD 4 FAIL-CLOSED]: Missing required confirmation flag ALLOW_SYNTHETIC_SEED=true.');
  console.error('To prevent accidental execution, you must explicitly pass: ALLOW_SYNTHETIC_SEED=true');
  process.exit(1);
}

const supabase = createClient(targetUrl, targetKey);

const SYNTHETIC_SHOPS = [
  {
    id: 'shop-beta-radha-rasoi',
    name: 'Beta Radha Rasoi (Test Kitchen)',
    owner_name: 'Beta Kitchen Manager',
    phone: '9999000108',
    address: 'Near Prem Mandir, Raman Reti, Vrindavan, UP',
    latitude: 27.5752,
    longitude: 77.6854,
    is_active: true,
    is_open: true,
    rating: 4.9,
    delivery_fee: 25,
    min_order_amount: 100
  },
  {
    id: 'shop-beta-vrinda-bhoj',
    name: 'Beta Vrinda Bhoj (Test Express)',
    owner_name: 'Beta Store Operator',
    phone: '9999000109',
    address: 'Parikrama Marg, Vrindavan, UP',
    latitude: 27.5810,
    longitude: 77.6920,
    is_active: true,
    is_open: true,
    rating: 4.8,
    delivery_fee: 30,
    min_order_amount: 150
  }
];

const SYNTHETIC_MENUS = [
  {
    id: 'dish-beta-samosa-01',
    shop_id: 'shop-beta-radha-rasoi',
    name: 'Desi Ghee Samosas (2 pcs)',
    category: 'Snacks',
    price: 60,
    description: 'Fresh crispy potato samosas prepared in pure desi ghee with green chutney.',
    image: '/dishes/presets/crispy-desi-samosas-2pcs.webp',
    is_available: true,
    is_veg: true,
    rating: 4.9,
    nutrition: { kcal: '220 kcal', carbs: '28g', protein: '4g', fat: '10g' }
  },
  {
    id: 'dish-beta-thali-02',
    shop_id: 'shop-beta-radha-rasoi',
    name: 'Special Satvik Thali Platter',
    category: 'Meals',
    price: 240,
    description: 'Complete wholesome Satvik meal with paneer, dal, sabzi, 4 rotis, rice, and sweet.',
    image: '/dishes/presets/special-satvik-thali-platter.webp',
    is_available: true,
    is_veg: true,
    rating: 5.0,
    nutrition: { kcal: '550 kcal', carbs: '75g', protein: '18g', fat: '16g' }
  },
  {
    id: 'dish-beta-lassi-03',
    shop_id: 'shop-beta-radha-rasoi',
    name: 'Kulhad Malai Lassi',
    category: 'Drinks',
    price: 80,
    description: 'Thick creamy Mathura peda lassi topped with saffron, pistachios, and rabdi.',
    image: '/dishes/presets/kulhad-kesar-thandai.webp',
    is_available: true,
    is_veg: true,
    rating: 4.9,
    nutrition: { kcal: '280 kcal', carbs: '38g', protein: '8g', fat: '10g' }
  }
];

async function seedBetaEnvironment() {
  console.log(`🌱 Seeding synthetic dataset into: ${targetUrl}`);

  // 1. Seed Synthetic Kitchens
  const { data: shops, error: shopErr } = await supabase
    .from('foody_shops')
    .upsert(SYNTHETIC_SHOPS)
    .select();

  if (shopErr) {
    console.warn('⚠️ Shop seed notice (table might be controlled by RLS):', shopErr.message);
  } else {
    console.log(`✅ Seeded ${shops?.length || SYNTHETIC_SHOPS.length} synthetic test shops.`);
  }

  // 2. Seed Synthetic Dishes
  const { data: menus, error: menuErr } = await supabase
    .from('foody_menus')
    .upsert(SYNTHETIC_MENUS)
    .select();

  if (menuErr) {
    console.warn('⚠️ Menu seed notice:', menuErr.message);
  } else {
    console.log(`✅ Seeded ${menus?.length || SYNTHETIC_MENUS.length} synthetic dishes.`);
  }

  console.log('✨ Synthetic seed complete. Beta environment is ready for testing with 0% production PII.');
}

seedBetaEnvironment().catch(err => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
