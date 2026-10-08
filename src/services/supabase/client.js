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

// Helper to intelligently resolve dish images with full support for user AI uploads, custom URLs, and crisp transparent PNG cutouts
export function resolveDishCutout(image, name = '', category = '') {
  const lowerName = (name || '').toLowerCase().trim();
  const lowerCat = (category || '').toLowerCase().trim();

  // 1. If a valid custom user image or upload is supplied, ALWAYS honor and preserve it
  if (image && typeof image === 'string') {
    const trimmed = image.trim();
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
      // d) Upgrade samosa fallback to authentic Kachori platter
      if (trimmed.includes('crispy-samosas-basket.webp') && lowerName.includes('kachori')) {
        return '/dishes/presets/golden-kachori-platter.webp';
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

  // B. North Indian Breads & Kachoris
  if (lowerName.includes('garlic naan')) return '/dishes/presets/basket-golden-garlic-naan.webp';
  if ((lowerName.includes('chole') && lowerName.includes('naan')) || lowerName.includes('kulcha') || lowerName.includes('chole kulche')) return '/dishes/presets/chole-curry-naan-platter.webp';
  if (lowerName.includes('naan')) return '/dishes/presets/garlic-naan-three-chutneys.webp';
  if (lowerName.includes('kachori') || lowerName.includes('khasta') || lowerName.includes('bedmi')) return '/dishes/presets/golden-kachori-platter.webp';
  if (lowerName.includes('bhature') || lowerName.includes('chole bhature') || lowerName.includes('poori') || lowerName.includes('puri')) return '/dishes/presets/golden-chole-bhature-feast.webp';
  if (lowerName.includes('roti') || lowerName.includes('chapati') || lowerName.includes('phulka') || lowerName.includes('paratha')) return '/dishes/presets/woven-basket-charred-rotis.webp';

  // C. Paneer, Curries & Dals
  if (lowerName.includes('matar paneer') || lowerName.includes('mutter paneer') || lowerName.includes('aloo matar') || lowerName.includes('paneer bhurji')) return '/dishes/presets/matar-paneer-copper-bowl.webp';
  if (lowerName.includes('handi paneer') || lowerName.includes('korma') || lowerName.includes('dal makhani') || lowerName.includes('dal tadka') || lowerName.includes('yellow dal') || lowerName.includes('rajma') || lowerName.includes('chana masala')) return '/dishes/presets/handi-paneer-curry.webp';
  if (lowerName.includes('malai paneer') || lowerName.includes('shahi paneer') || lowerName.includes('paneer butter') || lowerName.includes('paneer makhani') || lowerName.includes('kadai paneer') || lowerName.includes('kadhai paneer') || lowerName.includes('paneer lababdar') || lowerName.includes('malai kofta') || lowerName.includes('kofta')) return '/dishes/presets/creamy-paneer-curry-bowl.webp';

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

  // F. Chaat & Street Food
  if (lowerName.includes('dahi vada') || lowerName.includes('bhalla') || lowerName.includes('dahi bhalla') || lowerName.includes('dahi pakodi')) return '/dishes/presets/vibrant-dahi-vada-chaat.webp';
  if (lowerName.includes('tikki') || lowerName.includes('aloo tikki') || lowerName.includes('cutlet') || lowerName.includes('ragda')) return '/dishes/presets/loaded-chole-aloo-tikki-chaat.webp';
  if (lowerName.includes('papdi') || lowerName.includes('chaat') || lowerName.includes('sev') || lowerName.includes('bhel') || lowerName.includes('pani puri') || lowerName.includes('golgappe') || lowerName.includes('puchka')) return '/dishes/presets/loaded-papdi-chaat-bowl.webp';
  if (lowerName.includes('samosa') || lowerName.includes('pakora') || lowerName.includes('pakoda') || lowerName.includes('bhajiya') || lowerName.includes('fritter')) return '/dishes/presets/crispy-samosas-basket.webp';

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
  if (lowerCat.includes('snack') || lowerName.includes('snack')) return '/dishes/presets/crispy-samosas-basket.webp';

  return '/dishes/thali.webp';
}
