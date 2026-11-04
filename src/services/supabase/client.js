import { createClient } from '@supabase/supabase-js';

// Supabase Cloud Project Configuration (Foody Vrinda Production Database)
const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://mrsxliwyqodtwjuyqmts.supabase.co';
const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yc3hsaXd5cW9kdHdqdXlxbXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzQxMjcsImV4cCI6MjEwNDQ1MDEyN30.UZteyeZ3LtuVpMJoUqZogPKffmSlHN3Hn9fLtis7lBg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    heartbeatIntervalMs: 15000,
    timeout: 10000,
  },
});

// Track tables confirmed as missing in Supabase to avoid repeated 404 network errors
const _missingTables = new Set();
export function isTableMissing(tableName) { return _missingTables.has(tableName); }
export function markTableMissing(tableName) { _missingTables.add(tableName); }
export function isTableError(error) {
  if (!error) return false;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();
  const hint = (error.hint || '').toLowerCase();
  // Only flag genuine missing tables/relations (42P01 or relation does not exist), NOT column errors (PGRST204)
  return code === '42P01' ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    (hint.includes('relation') && hint.includes('does not exist'));
}

// Track tables blocked by RLS / 403 Forbidden permissions to prevent continuous network spam and console errors
const FORBIDDEN_WRITE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes cooldown before retry
const _forbiddenWriteTables = new Map();

export function isTableWriteForbidden(tableName) {
  // Check in-memory map first
  const last403Mem = _forbiddenWriteTables.get(tableName);
  if (last403Mem) {
    if (Date.now() - last403Mem < FORBIDDEN_WRITE_COOLDOWN_MS) {
      return true;
    }
    _forbiddenWriteTables.delete(tableName);
  }

  // Check sessionStorage for cross-component / refresh persistence
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = sessionStorage.getItem(`foody_forbidden_write_${tableName}`);
      if (stored) {
        const timestamp = Number(stored);
        if (Date.now() - timestamp < FORBIDDEN_WRITE_COOLDOWN_MS) {
          _forbiddenWriteTables.set(tableName, timestamp);
          return true;
        }
        sessionStorage.removeItem(`foody_forbidden_write_${tableName}`);
      }
    }
  } catch (_) { }

  return false;
}

export function markTableWriteForbidden(tableName) {
  const now = Date.now();
  _forbiddenWriteTables.set(tableName, now);
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(`foody_forbidden_write_${tableName}`, String(now));
    }
  } catch (_) { }
}

export function resetForbiddenTables() {
  _forbiddenWriteTables.clear();
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('foody_forbidden_write_')) {
          sessionStorage.removeItem(key);
        }
      }
    }
  } catch (_) { }
}

export function isForbiddenError(error) {
  if (!error) return false;
  const status = Number(error.status || error.statusCode || 0);
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  const details = String(error.details || '').toLowerCase();

  return (
    status === 403 ||
    status === 401 ||
    code === '42501' || // PostgreSQL insufficient privilege
    code === 'PGRST301' ||
    msg.includes('permission denied') ||
    msg.includes('row-level security') ||
    msg.includes('not authorized') ||
    msg.includes('403') ||
    details.includes('permission denied') ||
    details.includes('row-level security')
  );
}

// Reset forbidden tables when user authenticates or token changes
if (typeof supabase !== 'undefined' && supabase?.auth) {
  try {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        resetForbiddenTables();
      }
    });
  } catch (_) { }
}

// Pure Database-Driven Architecture: Zero hardcoded shops
export const SEED_SHOPS = [];

// Master Cloud CDN Direct Image Library (postimg.cc direct URLs)
export const MASTER_CLOUD_DISH_IMAGES = {
  pizza_slice: 'https://i.postimg.cc/JnHwJ9DD/Cheesy-Veggie-Pizza-Slice-Pull.png',
  chole_naan: 'https://i.postimg.cc/k4Rr8k6B/Chole-Curry-with-Naan-Platter.png',
  creamy_paneer: 'https://i.postimg.cc/pd6bm2TQ/Creamy-Paneer-Curry-Bowl.png',
  samosas: 'https://i.postimg.cc/Y9LcgJGv/Crispy-Samosas-in-Wicker-Basket.png',
  spring_rolls: 'https://i.postimg.cc/Hx8G5fcb/Crispy-Spring-Rolls-with-Chutneys.png',
  garlic_naan: 'https://i.postimg.cc/rmR6Wv01/Garlic-Naan-with-Three-Chutneys.png',
  jalebi: 'https://i.postimg.cc/yd3q9wgF/Glossy-Jalebi-Bowl-with-Pistachio-Garnish.png',
  hakka_noodles: 'https://i.postimg.cc/Y9LcgJGN/Glossy-Stir-Fried-Noodles-in-Black-Bowl.png',
  schezwan_noodles: 'https://i.postimg.cc/50QcvZYm/Glossy-Vegetable-Stir-Fried-Noodles-Bowl.png',
  puff_pastry: 'https://i.postimg.cc/zBHmW9bj/Golden-Cheesy-Triangle-Puff-with-Ketchup.png',
  chole_bhature: 'https://i.postimg.cc/k4Rr8k6w/Golden-Chole-Bhature-Feast.png',
  grilled_cheese: 'https://i.postimg.cc/MTfkRhMd/Gooey-Grilled-Cheese-with-Tomato-and-Basil.png',
  club_sandwich: 'https://i.postimg.cc/fLS4X6t8/Grilled-Vegetable-Cheese-Sandwich-Platter-(1).png',
  desi_sandwich: 'https://i.postimg.cc/rmR6Wv0h/Grilled-Veggie-Cheese-Sandwich-with-Dip-(2).png',
  burger: 'https://i.postimg.cc/xCNrHWJx/Indulgent-Loaded-Fusion-Burger.png',
  aloo_tikki_chaat: 'https://i.postimg.cc/j5nVNGw3/Loaded-Chole-Aloo-Tikki-Chaat.png',
  papdi_chaat: 'https://i.postimg.cc/hjQFxHzY/Loaded-Indian-Chaat-Bowl-with-Sev-and-Chutneys.png',
  handi_paneer: 'https://i.postimg.cc/j5nVNGw9/Ornate-Copper-Bowl-of-Paneer-Curry.png',
  barfi: 'https://i.postimg.cc/hjQFxHzH/Pistachio-Garnished-Barfi-on-Ornate-Platter.png',
  french_fries: 'https://i.postimg.cc/B6PWDdLr/Seasoned-Fries-with-Ketchup-Dip.png',
  kaju_katli: 'https://i.postimg.cc/G2WWjqGq/Silver-Leaf-Kaju-Katli-on-Ornate-Platter.png',
  steamed_momos: 'https://i.postimg.cc/W3BB7XgW/Steamed-Momos-with-Spicy-Chutney.png',
  farmhouse_pizza: 'https://i.postimg.cc/TwzzcCgS/Stretchy-Loaded-Veggie-Cheese-Pizza.png',
  dahi_vada: 'https://i.postimg.cc/zBssk0K9/Vibrant-Dahi-Vada-Chaat-Platter.png',
  vegetable_biryani: 'https://i.postimg.cc/PJVx9Y4g/Antique-Copper-Bowl-of-Vegetable-Biryani.png',
  basket_garlic_naan: 'https://i.postimg.cc/RCwxYcPv/Basket-of-Golden-Garlic-Naan.png',
  matar_paneer: 'https://i.postimg.cc/XNwH6W4x/Matar-Paneer-in-Ornate-Copper-Bowl.png',
  charred_rotis: 'https://i.postimg.cc/bYQCfPpg/Woven-Basket-of-Charred-Rotis.png',
  kachori_platter: 'https://i.postimg.cc/FH23Kfxz/Golden-Kachori-Platter-with-Chutneys.png',
  chole_kulche_thali: 'https://i.postimg.cc/KzkssftH/Copper-Thali-with-Chole-Kulche.png',
  aloo_chaat_bowl: 'https://i.postimg.cc/B6Lwwp2w/Vibrant-Garnished-Potato-Chaat-Bowl.png'
};

// Automatic Postimg Viewer Page to Direct Raw CDN Image Converter
export const POSTIMG_VIEWER_TO_DIRECT = {
  'DJhY3pcn': 'https://i.postimg.cc/JnHwJ9DD/Cheesy-Veggie-Pizza-Slice-Pull.png',
  'TLxHvNc6': 'https://i.postimg.cc/k4Rr8k6B/Chole-Curry-with-Naan-Platter.png',
  'Ff3nqX01': 'https://i.postimg.cc/pd6bm2TQ/Creamy-Paneer-Curry-Bowl.png',
  'JD8dCYQ8': 'https://i.postimg.cc/Y9LcgJGv/Crispy-Samosas-in-Wicker-Basket.png',
  'r0TY2Z9p': 'https://i.postimg.cc/Hx8G5fcb/Crispy-Spring-Rolls-with-Chutneys.png',
  'dkFScN93': 'https://i.postimg.cc/rmR6Wv01/Garlic-Naan-with-Three-Chutneys.png',
  'qhrZHDGR': 'https://i.postimg.cc/yd3q9wgF/Glossy-Jalebi-Bowl-with-Pistachio-Garnish.png',
  'r0TY2Z9z': 'https://i.postimg.cc/Y9LcgJGN/Glossy-Stir-Fried-Noodles-in-Black-Bowl.png',
  'HcmP1vtJ': 'https://i.postimg.cc/50QcvZYm/Glossy-Vegetable-Stir-Fried-Noodles-Bowl.png',
  'ygKrCpTg': 'https://i.postimg.cc/zBHmW9bj/Golden-Cheesy-Triangle-Puff-with-Ketchup.png',
  '5YJkWKmF': 'https://i.postimg.cc/k4Rr8k6w/Golden-Chole-Bhature-Feast.png',
  'r0TY2Z9r': 'https://i.postimg.cc/MTfkRhMd/Gooey-Grilled-Cheese-with-Tomato-and-Basil.png',
  '5YJkWKmz': 'https://i.postimg.cc/fLS4X6t8/Grilled-Vegetable-Cheese-Sandwich-Platter-(1).png',
  'k6ChPYy8': 'https://i.postimg.cc/rmR6Wv0h/Grilled-Veggie-Cheese-Sandwich-with-Dip-(2).png',
  '8JGngXbM': 'https://i.postimg.cc/xCNrHWJx/Indulgent-Loaded-Fusion-Burger.png',
  'R6mbxpTw': 'https://i.postimg.cc/j5nVNGw3/Loaded-Chole-Aloo-Tikki-Chaat.png',
  'YG7yBDxN': 'https://i.postimg.cc/hjQFxHzY/Loaded-Indian-Chaat-Bowl-with-Sev-and-Chutneys.png',
  'BL3wf7Cc': 'https://i.postimg.cc/j5nVNGw9/Ornate-Copper-Bowl-of-Paneer-Curry.png',
  'TLxHvNc9': 'https://i.postimg.cc/hjQFxHzH/Pistachio-Garnished-Barfi-on-Ornate-Platter.png',
  'k6ChPYys': 'https://i.postimg.cc/B6PWDdLr/Seasoned-Fries-with-Ketchup-Dip.png',
  'S2G1SLZM': 'https://i.postimg.cc/G2WWjqGq/Silver-Leaf-Kaju-Katli-on-Ornate-Platter.png',
  '0MCXkGtD': 'https://i.postimg.cc/W3BB7XgW/Steamed-Momos-with-Spicy-Chutney.png',
  '5YmK45Pq': 'https://i.postimg.cc/TwzzcCgS/Stretchy-Loaded-Veggie-Cheese-Pizza.png',
  'Q9qY8g6b': 'https://i.postimg.cc/zBssk0K9/Vibrant-Dahi-Vada-Chaat-Platter.png',
  'GTYdsB6K': 'https://i.postimg.cc/PJVx9Y4g/Antique-Copper-Bowl-of-Vegetable-Biryani.png',
  'HjWNc7DN': 'https://i.postimg.cc/RCwxYcPv/Basket-of-Golden-Garlic-Naan.png',
  'yW8X0wJS': 'https://i.postimg.cc/XNwH6W4x/Matar-Paneer-in-Ornate-Copper-Bowl.png',
  'Btnc2d8P': 'https://i.postimg.cc/bYQCfPpg/Woven-Basket-of-Charred-Rotis.png',
  'phGj0L9L': 'https://i.postimg.cc/x8YP1knM/Crispy-Samosas-in-Wicker-Basket.png',
  'K1DRq8VC': 'https://i.postimg.cc/P5BYqLMf/Antique-Copper-Bowl-of-Vegetable-Biryani.png',
  'fVfJ2Rp4': 'https://i.postimg.cc/FH23KfxK/Basket-of-Golden-Garlic-Naan.png',
  'tsNYS4wG': 'https://i.postimg.cc/FH23Kfxz/Golden-Kachori-Platter-with-Chutneys.png',
  'ftsKVx2c': 'https://i.postimg.cc/KzkssftH/Copper-Thali-with-Chole-Kulche.png',
  'phvZmDGD': 'https://i.postimg.cc/B6Lwwp2w/Vibrant-Garnished-Potato-Chaat-Bowl.png'
};

// Helper to intelligently resolve dish images with full support for user AI uploads, custom URLs, and crisp transparent PNG cutouts
export function resolveDishCutout(image, name = '', category = '') {
  const lowerName = (name || '').toLowerCase().trim();
  const lowerCat = (category || '').toLowerCase().trim();

  // 1. If a valid custom user image or upload is supplied, ALWAYS honor and preserve it
  if (image && typeof image === 'string') {
    let trimmed = image.trim();

    // Auto-convert postimg.cc viewer HTML pages to direct raw CDN image URLs
    if (trimmed.includes('postimg.cc/') && !trimmed.includes('i.postimg.cc/')) {
      const match = trimmed.match(/postimg\.cc\/([a-zA-Z0-9]+)/);
      if (match && POSTIMG_VIEWER_TO_DIRECT[match[1]]) {
        trimmed = POSTIMG_VIEWER_TO_DIRECT[match[1]];
      }
    }

    if (
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('./')
    ) {
      // Intelligently upgrade legacy fallbacks or misaligned images:
      // a) Upgrade simple rice fallback (/dishes/rice.png, /dishes/rice.webp) to high-definition Biryani cutout
      if ((trimmed.endsWith('/rice.png') || trimmed.endsWith('/rice.webp')) && (lowerName.includes('biryani') || lowerName.includes('pulao'))) {
        return '/dishes/presets/antique-copper-vegetable-biryani.webp';
      }
      // b) Upgrade legacy pizza.png to optimized preset
      if (trimmed.endsWith('/pizza.png')) {
        return '/dishes/presets/cheesy-veggie-pizza-slice.webp';
      }
      // c) Upgrade legacy rice.png to 12KB lightweight rice.webp
      if (trimmed.endsWith('/rice.png')) {
        return '/dishes/rice.webp';
      }
      // d) Upgrade samosa fallback to authentic Kachori platter, Chhole Kulche, or Aalu Chaat
      if (
        trimmed.includes('crispy-samosas-basket.webp') ||
        trimmed.includes('Crispy-Samosas-in-Wicker-Basket.png') ||
        (trimmed.includes('samosa') && !lowerName.includes('samosa'))
      ) {
        if (lowerName.includes('kachori') || lowerName.includes('khasta') || lowerName.includes('bedmi')) {
          return '/dishes/presets/golden-kachori-platter.webp';
        }
        if (
          lowerName.includes('chhole') ||
          lowerName.includes('chole') ||
          lowerName.includes('kulche') ||
          lowerName.includes('kulcha')
        ) {
          return '/dishes/presets/copper-thali-chole-kulche.webp';
        }
        if (
          lowerName.includes('aalu') ||
          lowerName.includes('aloo') ||
          lowerName.includes('potato') ||
          lowerName.includes('batata')
        ) {
          if (lowerName.includes('tikki') || lowerName.includes('cutlet')) {
            return '/dishes/presets/loaded-chole-aloo-tikki-chaat.webp';
          }
          return '/dishes/presets/vibrant-potato-chaat-bowl.webp';
        }
        if (
          lowerName.includes('chaat') ||
          lowerName.includes('chat') ||
          lowerCat.includes('chaat') ||
          lowerCat.includes('chat')
        ) {
          return '/dishes/presets/loaded-papdi-chaat-bowl.webp';
        }
        if (lowerName.includes('spring roll') || lowerName.includes('roll')) {
          return '/dishes/presets/crispy-spring-rolls.webp';
        }
        if (lowerName.includes('puff') || lowerName.includes('patties')) {
          return '/dishes/presets/golden-cheesy-triangle-puff.webp';
        }
        if (lowerName.includes('sandwich') || lowerName.includes('toast')) {
          return '/dishes/presets/grilled-veggie-cheese-sandwich.webp';
        }
      }
      // d2) Upgrade legacy chole naan to authentic copper thali chole kulche
      if (
        (trimmed.includes('chole-curry-naan-platter.webp') || trimmed.includes('Chole-Curry-with-Naan-Platter.png')) &&
        (lowerName.includes('kulche') || lowerName.includes('kulcha') || lowerName.includes('chhole kulche') || lowerName.includes('chole kulche'))
      ) {
        return '/dishes/presets/copper-thali-chole-kulche.webp';
      }
      // d3) Upgrade generic chaat bowl to vibrant aalu chaat bowl
      if (
        (trimmed.includes('loaded-papdi-chaat-bowl') || trimmed.includes('Loaded-Indian-Chaat-Bowl')) &&
        (lowerName.includes('aalu') || lowerName.includes('aloo chaat') || lowerName.includes('aalu chaat') || lowerName.includes('potato chaat'))
      ) {
        return '/dishes/presets/vibrant-potato-chaat-bowl.webp';
      }
      // e) Upgrade generic thali or naan fallback to authentic Roti basket
      if ((trimmed.includes('thali.webp') || trimmed.includes('garlic-naan')) && (lowerName.includes('roti') || lowerName.includes('chapati') || lowerName.includes('phulka'))) {
        return '/dishes/presets/woven-basket-charred-rotis.webp';
      }
      // f) Upgrade generic curry to authentic Matar Paneer copper bowl
      if (trimmed.includes('curry.webp') && (lowerName.includes('matar paneer') || lowerName.includes('mutter paneer'))) {
        return '/dishes/presets/matar-paneer-copper-bowl.webp';
      }

      // Don't override user's image unless it's a known generic unsplash placeholder
      if (!trimmed.includes('unsplash.com/photo-1546833999-b9f581a1996d')) {
        return trimmed;
      }
    }
  }

  // 2. Comprehensive smart cutout resolution based on item name and category keywords
  // A. Biryani, Pulao & Rice Feasts
  if (lowerName.includes('biryani') || lowerName.includes('dum biryani') || lowerName.includes('hyderabadi')) return '/dishes/presets/antique-copper-vegetable-biryani.webp';
  if (lowerName.includes('pulao') || lowerName.includes('fried rice') || lowerName.includes('jeera rice')) return '/dishes/presets/antique-copper-vegetable-biryani.webp';

  // B. North Indian Breads, Kulchas & Chhole
  if (lowerName.includes('garlic naan')) return '/dishes/presets/basket-golden-garlic-naan.webp';
  if (
    lowerName.includes('chhole kulche') ||
    lowerName.includes('chole kulche') ||
    lowerName.includes('chhole') ||
    lowerName.includes('kulche') ||
    lowerName.includes('kulcha')
  ) {
    return '/dishes/presets/copper-thali-chole-kulche.webp';
  }
  if (lowerName.includes('chole') && lowerName.includes('naan')) return '/dishes/presets/chole-curry-naan-platter.webp';
  if (lowerName.includes('naan')) return '/dishes/presets/garlic-naan-three-chutneys.webp';
  if (lowerName.includes('kachori') || lowerName.includes('khasta') || lowerName.includes('bedmi')) return '/dishes/presets/golden-kachori-platter.webp';
  if (lowerName.includes('bhature') || lowerName.includes('chole bhature') || lowerName.includes('poori') || lowerName.includes('puri')) return '/dishes/presets/golden-chole-bhature-feast.webp';
  if (lowerName.includes('roti') || lowerName.includes('chapati') || lowerName.includes('phulka') || lowerName.includes('paratha')) return '/dishes/presets/woven-basket-charred-rotis.webp';

  // C. Paneer, Curries & Dals
  if (lowerName.includes('matar paneer') || lowerName.includes('mutter paneer') || lowerName.includes('aloo matar') || lowerName.includes('paneer bhurji')) return '/dishes/presets/matar-paneer-copper-bowl.webp';
  if (lowerName.includes('handi paneer') || lowerName.includes('korma') || lowerName.includes('dal makhani') || lowerName.includes('dal tadka') || lowerName.includes('yellow dal') || lowerName.includes('rajma') || lowerName.includes('chana masala')) return '/dishes/presets/handi-paneer-curry.webp';
  if (lowerName.includes('malai paneer') || lowerName.includes('shahi paneer') || lowerName.includes('sahi paneer') || lowerName.includes('paneer butter') || lowerName.includes('paneer makhani') || lowerName.includes('kadai paneer') || lowerName.includes('kadhai paneer') || lowerName.includes('paneer lababdar') || lowerName.includes('malai kofta') || lowerName.includes('kofta')) return '/dishes/presets/creamy-paneer-curry-bowl.webp';

  // D. Burgers, Pizzas & Sandwiches
  if (lowerName.includes('burger')) return '/dishes/presets/indulgent-fusion-burger.webp';
  if (lowerName.includes('farmhouse pizza') || lowerName.includes('cheese burst') || lowerName.includes('supreme pizza') || lowerName.includes('double cheese')) return '/dishes/presets/loaded-farmhouse-pizza.webp';
  if (lowerName.includes('pizza') || lowerName.includes('margherita') || lowerName.includes('calzone')) return '/dishes/presets/cheesy-veggie-pizza-slice.webp';
  if (lowerName.includes('club sandwich') || lowerName.includes('bombay sandwich') || lowerName.includes('jumbo sandwich')) return '/dishes/presets/grilled-veg-cheese-sandwich-platter.webp';
  if (lowerName.includes('grilled cheese') || lowerName.includes('cheese toast')) return '/dishes/presets/gooey-grilled-cheese-tomato-basil.webp';
  if (lowerName.includes('sandwich') || lowerName.includes('toast')) return '/dishes/presets/grilled-veggie-cheese-sandwich.webp';

  // E. Momos, Chinese & Street Snacks
  if (lowerName.includes('momo') || lowerName.includes('dimsum') || lowerName.includes('dumpling')) return '/dishes/presets/steamed-veggie-momos.webp';
  if (lowerName.includes('schezwan') || lowerName.includes('manchurian') || lowerName.includes('chilli paneer') || lowerName.includes('chilli potato') || lowerName.includes('chilli garlic')) return '/dishes/presets/schezwan-veggie-noodles.webp';
  if (lowerName.includes('noodle') || lowerName.includes('chowmein') || lowerName.includes('maggi') || lowerName.includes('hakka') || lowerName.includes('pasta') || lowerName.includes('macaroni')) return '/dishes/presets/glossy-stir-fried-noodles.webp';
  if (lowerName.includes('spring roll') || lowerName.includes('roll') || lowerName.includes('frankie') || lowerName.includes('wrap')) return '/dishes/presets/crispy-spring-rolls.webp';
  if (lowerName.includes('puff') || lowerName.includes('patties') || lowerName.includes('patty')) return '/dishes/presets/golden-cheesy-triangle-puff.webp';
  if (lowerName.includes('fry') || lowerName.includes('fries') || lowerName.includes('french fries') || lowerName.includes('wedges') || lowerName.includes('nugget')) return '/dishes/presets/seasoned-crispy-fries.webp';

  // F. Chaat, Street Food & Samosa Safeguards
  const isAlooOrPotato =
    lowerName.includes('aalu') ||
    lowerName.includes('aloo') ||
    lowerName.includes('potato') ||
    lowerName.includes('batata');

  const isChaatOrChat =
    lowerName.includes('chaat') ||
    lowerName.includes('chat');

  // Aloo Chat / Aalu Chaat / Potato Chaat -> Vibrant Potato Chaat Bowl
  if (
    (isAlooOrPotato && isChaatOrChat) ||
    lowerName.includes('aloo chat') ||
    lowerName.includes('aalu chat') ||
    lowerName.includes('aloo chaat') ||
    lowerName.includes('aalu chaat') ||
    lowerName.includes('potato chaat') ||
    lowerName.includes('potato chat')
  ) {
    return '/dishes/presets/vibrant-potato-chaat-bowl.webp';
  }

  // Aloo Tikki / Chole Tikki
  if (
    lowerName.includes('tikki') ||
    lowerName.includes('aloo tikki') ||
    lowerName.includes('aalu tikki') ||
    lowerName.includes('cutlet') ||
    lowerName.includes('ragda')
  ) {
    return '/dishes/presets/loaded-chole-aloo-tikki-chaat.webp';
  }

  // Dahi Vada / Dahi Bhalla
  if (
    lowerName.includes('dahi vada') ||
    lowerName.includes('bhalla') ||
    lowerName.includes('dahi bhalla') ||
    lowerName.includes('dahi pakodi')
  ) {
    return '/dishes/presets/vibrant-dahi-vada-chaat.webp';
  }

  // Papdi Chaat, Sev Puri, Bhel, Golgappe, etc.
  if (
    lowerName.includes('papdi') ||
    isChaatOrChat ||
    lowerName.includes('sev') ||
    lowerName.includes('bhel') ||
    lowerName.includes('pani puri') ||
    lowerName.includes('golgappe') ||
    lowerName.includes('puchka') ||
    lowerName.includes('raj kachori')
  ) {
    return '/dishes/presets/loaded-papdi-chaat-bowl.webp';
  }

  // ONLY authentic samosas, pakoras, bhajiyas get the samosa basket
  if (
    lowerName.includes('samosa') ||
    lowerName.includes('pakora') ||
    lowerName.includes('pakoda') ||
    lowerName.includes('bhajiya') ||
    lowerName.includes('fritter')
  ) {
    return '/dishes/presets/crispy-samosas-basket.webp';
  }

  // G. Traditional Sweets & Mithai
  if (lowerName.includes('jalebi') || lowerName.includes('imarti') || lowerName.includes('ghevar') || lowerName.includes('malpua')) return '/dishes/presets/glossy-kesar-jalebi.webp';
  if (lowerName.includes('kaju') || lowerName.includes('katli')) return '/dishes/presets/silver-vark-kaju-katli.webp';
  if (lowerName.includes('barfi') || lowerName.includes('burfi') || lowerName.includes('pista') || lowerName.includes('khoya') || lowerName.includes('milk cake') || lowerName.includes('kalakand') || lowerName.includes('peda')) return '/dishes/presets/pista-khoya-barfi.webp';

  // H. South Indian, Thalis & Meals
  if (lowerName.includes('thali') || lowerName.includes('platter') || lowerName.includes('meal') || lowerName.includes('dosa') || lowerName.includes('idli') || lowerName.includes('uttapam') || lowerName.includes('sambar') || lowerCat.includes('thali') || lowerCat.includes('meal') || lowerCat.includes('south indian')) return '/dishes/thali.webp';

  // I. Sweets, Desserts & Beverages
  if (lowerName.includes('kheer') || lowerName.includes('rabdi') || lowerName.includes('gulab jamun') || lowerName.includes('rasgulla') || lowerName.includes('rasmalai') || lowerName.includes('halwa') || lowerName.includes('lassi') || lowerName.includes('shake') || lowerName.includes('coffee') || lowerName.includes('tea') || lowerName.includes('chai') || lowerName.includes('thandai') || lowerName.includes('juice') || lowerName.includes('drink') || lowerName.includes('beverage') || lowerCat.includes('sweet') || lowerCat.includes('beverage') || lowerCat.includes('dessert') || lowerCat.includes('drink')) return '/dishes/sweet.webp';

  // J. Curries & Rice Fallbacks
  if (lowerName.includes('curry') || lowerName.includes('makhani') || lowerName.includes('paneer') || lowerName.includes('sabzi') || lowerName.includes('dal') || lowerName.includes('gravy') || lowerCat.includes('curry') || lowerCat.includes('main')) return '/dishes/curry.webp';
  if (lowerName.includes('rice') || lowerName.includes('pulao') || lowerName.includes('bhog') || lowerName.includes('khichdi') || lowerCat.includes('rice')) return '/dishes/rice.webp';

  // K. Category-Level Fallbacks (Never force samosas onto general snacks or chaats)
  if (lowerCat.includes('chat') || lowerCat.includes('chaat')) {
    if (isAlooOrPotato) return '/dishes/presets/vibrant-potato-chaat-bowl.webp';
    return '/dishes/presets/loaded-papdi-chaat-bowl.webp';
  }

  if (lowerCat.includes('snack') || lowerName.includes('snack')) {
    if (isAlooOrPotato) return '/dishes/presets/vibrant-potato-chaat-bowl.webp';
    return '/dishes/presets/crispy-spring-rolls.webp';
  }

  return '/dishes/thali.webp';
}
