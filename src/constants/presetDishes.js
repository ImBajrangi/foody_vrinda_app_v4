/**
 * Foody Vrinda - Curated Master Dish Presets
 * High-definition satvik culinary catalog with optimized WebP cutouts & fallback CDN links.
 */
import { getCachedPresets, saveCachedPresets, getCloudPresets } from '../supabase';

export const DEFAULT_PRESET_DISHES = [
  {
    id: 'preset-cheesy-veggie-pizza',
    name: 'Cheesy Veggie Pizza Slice',
    category: 'Snacks',
    price: 160,
    originalPrice: 199,
    subtitle: 'Mozzarella, sweet corn, peppers & olives',
    description: 'Artisan pizza loaded with stretchy mozzarella, sweet corn, peppers & olives.',
    image: '/dishes/presets/cheesy-veggie-pizza-slice.webp',
    cdnImage: 'https://i.postimg.cc/JnHwJ9DD/Cheesy-Veggie-Pizza-Slice-Pull.png',
    tag: 'Chef Special',
    rating: 4.9,
    calories: '280 kcal',
    nutrition: { carbs: '36g', fat: '12g', protein: '11g', kcal: '280 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  },
  {
    id: 'preset-chole-curry-naan',
    name: 'Amritsari Chole Naan Platter',
    category: 'Meals',
    price: 190,
    originalPrice: 230,
    subtitle: 'Spiced chickpeas with tandoori garlic naan',
    description: 'Slow-cooked spiced chickpeas with butter tandoori naan and pickled salad.',
    image: '/dishes/presets/chole-curry-naan-platter.webp',
    cdnImage: 'https://i.postimg.cc/k4Rr8k6B/Chole-Curry-with-Naan-Platter.png',
    tag: 'Devotee Favorite',
    rating: 4.9,
    calories: '420 kcal',
    nutrition: { carbs: '62g', fat: '14g', protein: '18g', kcal: '420 kcal' },
    spicyLevel: 'Medium',
    isVeg: true
  },
  {
    id: 'preset-creamy-paneer-curry',
    name: 'Shahi Malai Paneer Bowl',
    category: 'Meals',
    price: 220,
    originalPrice: 260,
    subtitle: 'Velvety cashew gravy with fresh cottage cheese',
    description: 'Velvety cashew and fresh cream gravy cooked with tender cottage cheese.',
    image: '/dishes/presets/creamy-paneer-curry-bowl.webp',
    cdnImage: 'https://i.postimg.cc/pd6bm2TQ/Creamy-Paneer-Curry-Bowl.png',
    tag: 'Royal Classic',
    rating: 4.9,
    calories: '360 kcal',
    nutrition: { carbs: '18g', fat: '24g', protein: '16g', kcal: '360 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  },
  {
    id: 'preset-crispy-samosas',
    name: 'Crispy Desi Samosas (2 pcs)',
    category: 'Snacks',
    price: 60,
    originalPrice: 80,
    subtitle: 'Golden crust with spiced potato & tamarind dip',
    description: 'Golden flaky crust stuffed with spiced potatoes, peas, cashews and spices.',
    image: '/dishes/presets/crispy-samosas-basket.webp',
    cdnImage: 'https://i.postimg.cc/Y9LcgJGv/Crispy-Samosas-in-Wicker-Basket.png',
    tag: 'All-Time Favorite',
    rating: 4.8,
    calories: '220 kcal',
    nutrition: { carbs: '28g', fat: '11g', protein: '5g', kcal: '220 kcal' },
    spicyLevel: 'Medium',
    isVeg: true
  },
  {
    id: 'preset-crispy-spring-rolls',
    name: 'Crispy Veggie Spring Rolls',
    category: 'Snacks',
    price: 130,
    originalPrice: 160,
    subtitle: 'Crunchy rolls with oriental seasoning & dip',
    description: 'Crunchy golden rolls filled with shredded seasonal vegetables and sprouts.',
    image: '/dishes/presets/crispy-spring-rolls.webp',
    cdnImage: 'https://i.postimg.cc/Hx8G5fcb/Crispy-Spring-Rolls-with-Chutneys.png',
    tag: 'Crunchy Delight',
    rating: 4.8,
    calories: '210 kcal',
    nutrition: { carbs: '26g', fat: '9g', protein: '6g', kcal: '210 kcal' },
    spicyLevel: 'Medium',
    isVeg: true
  },
  {
    id: 'preset-garlic-naan-chutneys',
    name: 'Butter Garlic Naan with Chutneys',
    category: 'Meals',
    price: 90,
    originalPrice: 110,
    subtitle: 'Clay-oven naan with desi butter & chutneys',
    description: 'Clay-oven baked naan brushed with pure desi butter and minced garlic.',
    image: '/dishes/presets/garlic-naan-three-chutneys.webp',
    cdnImage: 'https://i.postimg.cc/rmR6Wv01/Garlic-Naan-with-Three-Chutneys.png',
    tag: 'Tandoori Fresh',
    rating: 4.8,
    calories: '240 kcal',
    nutrition: { carbs: '38g', fat: '8g', protein: '7g', kcal: '240 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  },
  {
    id: 'preset-glossy-kesar-jalebi',
    name: 'Desi Ghee Kesar Jalebi (100g)',
    category: 'Sweets & Prasad',
    price: 90,
    originalPrice: 120,
    subtitle: 'Crispy desi ghee spirals in saffron nectar',
    description: 'Crisp spirals fried in pure desi cow ghee steeped in saffron cardamom nectar.',
    image: '/dishes/presets/glossy-kesar-jalebi.webp',
    cdnImage: 'https://i.postimg.cc/yd3q9wgF/Glossy-Jalebi-Bowl-with-Pistachio-Garnish.png',
    tag: 'Pure Ghee',
    rating: 4.9,
    calories: '290 kcal',
    nutrition: { carbs: '56g', fat: '8g', protein: '3g', kcal: '290 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  },
  {
    id: 'preset-glossy-hakka-noodles',
    name: 'Classic Veg Hakka Noodles',
    category: 'Snacks',
    price: 140,
    originalPrice: 170,
    subtitle: 'Wok-tossed noodles with crunchy seasonal greens',
    description: 'Wok-tossed noodles with shredded cabbage, bell peppers and sesame-soy glaze.',
    image: '/dishes/presets/glossy-stir-fried-noodles.webp',
    cdnImage: 'https://i.postimg.cc/Y9LcgJGN/Glossy-Stir-Fried-Noodles-in-Black-Bowl.png',
    tag: 'Wok Special',
    rating: 4.8,
    calories: '310 kcal',
    nutrition: { carbs: '48g', fat: '10g', protein: '8g', kcal: '310 kcal' },
    spicyLevel: 'Medium',
    isVeg: true
  },
  {
    id: 'preset-schezwan-noodles',
    name: 'Spicy Schezwan Street Noodles',
    category: 'Snacks',
    price: 150,
    originalPrice: 180,
    subtitle: 'Fiery chili-garlic noodles with crunchy veggies',
    description: 'Fiery chili-garlic tossed noodles packed with crunchy veggies and scallions.',
    image: '/dishes/presets/schezwan-veggie-noodles.webp',
    cdnImage: 'https://i.postimg.cc/50QcvZYm/Glossy-Vegetable-Stir-Fried-Noodles-Bowl.png',
    tag: 'Spicy Hit',
    rating: 4.8,
    calories: '330 kcal',
    nutrition: { carbs: '50g', fat: '12g', protein: '8g', kcal: '330 kcal' },
    spicyLevel: 'Spicy',
    isVeg: true
  },
  {
    id: 'preset-golden-cheesy-puff',
    name: 'Golden Cheese & Corn Puff',
    category: 'Snacks',
    price: 70,
    originalPrice: 90,
    subtitle: 'Flaky baked pastry with melting cheese & corn',
    description: 'Flaky golden puff pastry filled with creamy melting cheese and sweet corn.',
    image: '/dishes/presets/golden-cheesy-triangle-puff.webp',
    cdnImage: 'https://i.postimg.cc/zBHmW9bj/Golden-Cheesy-Triangle-Puff-with-Ketchup.png',
    tag: 'Baked Fresh',
    rating: 4.7,
    calories: '240 kcal',
    nutrition: { carbs: '26g', fat: '14g', protein: '6g', kcal: '240 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  },
  {
    id: 'preset-golden-chole-bhature',
    name: 'Royal Chole Bhature Feast (2 pcs)',
    category: 'Meals',
    price: 180,
    originalPrice: 220,
    subtitle: 'Fluffy golden bhature with spiced kabuli chana',
    description: 'Puffed golden bhature served with rich dark spiced chole and pickled chili.',
    image: '/dishes/presets/golden-chole-bhature-feast.webp',
    cdnImage: 'https://i.postimg.cc/k4Rr8k6w/Golden-Chole-Bhature-Feast.png',
    tag: 'Bestseller',
    rating: 4.9,
    calories: '520 kcal',
    nutrition: { carbs: '74g', fat: '20g', protein: '16g', kcal: '520 kcal' },
    spicyLevel: 'Medium',
    isVeg: true
  },
  {
    id: 'preset-gooey-grilled-cheese',
    name: 'Gooey Grilled Cheese Sandwich',
    category: 'Snacks',
    price: 130,
    originalPrice: 160,
    subtitle: 'Melted cheddar & mozzarella with fresh basil',
    description: 'Toasted golden bread overflowing with melted cheddar, mozzarella and basil.',
    image: '/dishes/presets/gooey-grilled-cheese-tomato-basil.webp',
    cdnImage: 'https://i.postimg.cc/MTfkRhMd/Gooey-Grilled-Cheese-with-Tomato-and-Basil.png',
    tag: 'Comfort Food',
    rating: 4.8,
    calories: '310 kcal',
    nutrition: { carbs: '32g', fat: '16g', protein: '12g', kcal: '310 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  },
  {
    id: 'preset-bombay-club-sandwich',
    name: 'Bombay Veg Grilled Club Sandwich',
    category: 'Snacks',
    price: 150,
    originalPrice: 180,
    subtitle: 'Triple-decker grilled sandwich with green chutney',
    description: 'Triple-decker sandwich with spiced potatoes, cucumber, chutney and cheese.',
    image: '/dishes/presets/grilled-veg-cheese-sandwich-platter.webp',
    cdnImage: 'https://i.postimg.cc/fLS4X6t8/Grilled-Vegetable-Cheese-Sandwich-Platter-(1).png',
    tag: 'Popular Choice',
    rating: 4.9,
    calories: '340 kcal',
    nutrition: { carbs: '44g', fat: '13g', protein: '10g', kcal: '340 kcal' },
    spicyLevel: 'Medium',
    isVeg: true
  },
  {
    id: 'preset-desi-grilled-sandwich',
    name: 'Classic Desi Grilled Sandwich',
    category: 'Snacks',
    price: 120,
    originalPrice: 150,
    subtitle: 'Crispy grilled sandwich with savory fillings',
    description: 'Crispy grilled sandwich with savory vegetable filling and aromatic spread.',
    image: '/dishes/presets/grilled-veggie-cheese-sandwich.webp',
    cdnImage: 'https://i.postimg.cc/rmR6Wv0h/Grilled-Veggie-Cheese-Sandwich-with-Dip-(2).png',
    tag: 'Quick Bite',
    rating: 4.7,
    calories: '280 kcal',
    nutrition: { carbs: '38g', fat: '11g', protein: '8g', kcal: '280 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  },
  {
    id: 'preset-maharaja-fusion-burger',
    name: 'Maharaja Satvik Fusion Burger',
    category: 'Snacks',
    price: 160,
    originalPrice: 199,
    subtitle: 'Brioche bun with crispy herb paneer patty',
    description: 'Brioche bun stacked with crispy herb-paneer patty and signature satvik sauce.',
    image: '/dishes/presets/indulgent-fusion-burger.webp',
    cdnImage: 'https://i.postimg.cc/xCNrHWJx/Indulgent-Loaded-Fusion-Burger.png',
    tag: 'Chef Special',
    rating: 4.9,
    calories: '380 kcal',
    nutrition: { carbs: '42g', fat: '17g', protein: '15g', kcal: '380 kcal' },
    spicyLevel: 'Medium',
    isVeg: true
  },
  {
    id: 'preset-chole-tikki-chaat',
    name: 'Dilli Style Chole Tikki Chaat',
    category: 'Snacks',
    price: 110,
    originalPrice: 140,
    subtitle: 'Golden potato cutlets with chole & yogurt',
    description: 'Crisp golden potato cutlets drenched in hot spiced chole and sweet yogurt.',
    image: '/dishes/presets/loaded-chole-aloo-tikki-chaat.webp',
    cdnImage: 'https://i.postimg.cc/j5nVNGw3/Loaded-Chole-Aloo-Tikki-Chaat.png',
    tag: 'Street Favorite',
    rating: 4.9,
    calories: '320 kcal',
    nutrition: { carbs: '46g', fat: '12g', protein: '9g', kcal: '320 kcal' },
    spicyLevel: 'Medium',
    isVeg: true
  },
  {
    id: 'preset-mathura-papdi-chaat',
    name: 'Special Mathura Papdi Chaat Bowl',
    category: 'Snacks',
    price: 100,
    originalPrice: 130,
    subtitle: 'Crispy papdi with sweet curd & pomegranate',
    description: 'Crispy wheat flour crisps layered with spiced potatoes, curd and chutneys.',
    image: '/dishes/presets/loaded-papdi-chaat-bowl.webp',
    cdnImage: 'https://i.postimg.cc/hjQFxHzY/Loaded-Indian-Chaat-Bowl-with-Sev-and-Chutneys.png',
    tag: 'Must Try',
    rating: 4.9,
    calories: '270 kcal',
    nutrition: { carbs: '40g', fat: '10g', protein: '6g', kcal: '270 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  },
  {
    id: 'preset-handi-paneer-curry',
    name: 'Desi Handi Paneer Korma',
    category: 'Meals',
    price: 230,
    originalPrice: 270,
    subtitle: 'Slow-cooked paneer in rich desi ghee gravy',
    description: 'Tender paneer cubes cooked in copper vessel with roasted whole spices.',
    image: '/dishes/presets/handi-paneer-curry.webp',
    cdnImage: 'https://i.postimg.cc/j5nVNGw9/Ornate-Copper-Bowl-of-Paneer-Curry.png',
    tag: 'Royal Feast',
    rating: 4.9,
    calories: '390 kcal',
    nutrition: { carbs: '20g', fat: '27g', protein: '18g', kcal: '390 kcal' },
    spicyLevel: 'Medium',
    isVeg: true
  },
  {
    id: 'preset-pista-khoya-barfi',
    name: 'Shahi Pista Khoya Barfi (250g)',
    category: 'Sweets & Prasad',
    price: 180,
    originalPrice: 220,
    subtitle: 'Condensed milk fudge with roasted pistachios',
    description: 'Pure evaporated milk confection enriched with roasted pistachios and saffron.',
    image: '/dishes/presets/pista-khoya-barfi.webp',
    cdnImage: 'https://i.postimg.cc/hjQFxHzH/Pistachio-Garnished-Barfi-on-Ornate-Platter.png',
    tag: 'Sacred Prasad',
    rating: 4.9,
    calories: '380 kcal',
    nutrition: { carbs: '52g', fat: '15g', protein: '10g', kcal: '380 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  },
  {
    id: 'preset-seasoned-fries',
    name: 'Peri Peri Crispy French Fries',
    category: 'Snacks',
    price: 90,
    originalPrice: 120,
    subtitle: 'Crispy potato fries with zesty peri-peri dip',
    description: 'Golden crispy potato fries tossed in peri-peri seasoning and rock salt.',
    image: '/dishes/presets/seasoned-crispy-fries.webp',
    cdnImage: 'https://i.postimg.cc/B6PWDdLr/Seasoned-Fries-with-Ketchup-Dip.png',
    tag: 'Crispy & Hot',
    rating: 4.8,
    calories: '260 kcal',
    nutrition: { carbs: '36g', fat: '12g', protein: '4g', kcal: '260 kcal' },
    spicyLevel: 'Medium',
    isVeg: true
  },
  {
    id: 'preset-silver-kaju-katli',
    name: 'Royal Diamond Kaju Katli (250g)',
    category: 'Sweets & Prasad',
    price: 240,
    originalPrice: 290,
    subtitle: 'Premium cashew diamonds with silver vark',
    description: 'Mouth-melting diamond slices made from premium cashews and refined syrup.',
    image: '/dishes/presets/silver-vark-kaju-katli.webp',
    cdnImage: 'https://i.postimg.cc/G2WWjqGq/Silver-Leaf-Kaju-Katli-on-Ornate-Platter.png',
    tag: 'Festive Special',
    rating: 4.9,
    calories: '410 kcal',
    nutrition: { carbs: '58g', fat: '18g', protein: '11g', kcal: '410 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  },
  {
    id: 'preset-steamed-momos',
    name: 'Steamed Himalayan Veg Momos (6 pcs)',
    category: 'Snacks',
    price: 110,
    originalPrice: 140,
    subtitle: 'Steamed dumplings with spicy red chili chutney',
    description: 'Delicately steamed dumplings packed with finely minced cabbage and paneer.',
    image: '/dishes/presets/steamed-veggie-momos.webp',
    cdnImage: 'https://i.postimg.cc/W3BB7XgW/Steamed-Momos-with-Spicy-Chutney.png',
    tag: 'Steamed Fresh',
    rating: 4.8,
    calories: '190 kcal',
    nutrition: { carbs: '32g', fat: '4g', protein: '7g', kcal: '190 kcal' },
    spicyLevel: 'Spicy',
    isVeg: true
  },
  {
    id: 'preset-farmhouse-pizza',
    name: 'Loaded Farmhouse Cheese Pizza (10")',
    category: 'Snacks',
    price: 260,
    originalPrice: 320,
    subtitle: 'Extra mozzarella, mushrooms, corn & peppers',
    description: 'Artisan crust topped with tomato sauce, mozzarella, mushrooms and sweet corn.',
    image: '/dishes/presets/loaded-farmhouse-pizza.webp',
    cdnImage: 'https://i.postimg.cc/TwzzcCgS/Stretchy-Loaded-Veggie-Cheese-Pizza.png',
    tag: 'Cheese Overload',
    rating: 4.9,
    calories: '420 kcal',
    nutrition: { carbs: '52g', fat: '18g', protein: '16g', kcal: '420 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  },
  {
    id: 'preset-vibrant-dahi-vada',
    name: 'Vrindavan Special Dahi Vada Platter',
    category: 'Snacks',
    price: 120,
    originalPrice: 150,
    subtitle: 'Fluffy lentil dumplings in sweet creamy curd',
    description: 'Soft lentil dumplings soaked in sweet curd topped with cumin and chutneys.',
    image: '/dishes/presets/vibrant-dahi-vada-chaat.webp',
    cdnImage: 'https://i.postimg.cc/zBssk0K9/Vibrant-Dahi-Vada-Chaat-Platter.png',
    tag: 'Temple Classic',
    rating: 4.9,
    calories: '230 kcal',
    nutrition: { carbs: '34g', fat: '7g', protein: '8g', kcal: '230 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  },
  {
    id: 'preset-copper-bowl-biryani',
    name: 'Shahi Veg Dum Biryani',
    category: 'Meals',
    price: 180,
    originalPrice: 220,
    subtitle: 'Aromatic basmati rice layered with royal spices & vegetables',
    description: 'Long-grain basmati rice cooked with fresh seasonal vegetables, mint, and saffron ghee.',
    image: '/dishes/presets/antique-copper-vegetable-biryani.webp',
    cdnImage: 'https://i.postimg.cc/PJVx9Y4g/Antique-Copper-Bowl-of-Vegetable-Biryani.png',
    tag: 'Royal Special',
    rating: 4.9,
    calories: '360 kcal',
    nutrition: { carbs: '56g', fat: '12g', protein: '9g', kcal: '360 kcal' },
    spicyLevel: 'Medium',
    isVeg: true
  },
  {
    id: 'preset-matar-paneer-copper-bowl',
    name: 'Braj Matar Paneer Bowl',
    category: 'Meals',
    price: 210,
    originalPrice: 250,
    subtitle: 'Soft paneer cubes & sweet peas in spiced tomato-cashew gravy',
    description: 'Fresh cottage cheese cubes and sweet green peas simmered in rich spiced gravy.',
    image: '/dishes/presets/matar-paneer-copper-bowl.webp',
    cdnImage: 'https://i.postimg.cc/XNwH6W4x/Matar-Paneer-in-Ornate-Copper-Bowl.png',
    tag: 'Devotee Favorite',
    rating: 4.8,
    calories: '340 kcal',
    nutrition: { carbs: '22g', fat: '22g', protein: '16g', kcal: '340 kcal' },
    spicyLevel: 'Medium',
    isVeg: true
  },
  {
    id: 'preset-golden-kachori-platter',
    name: 'Mathura Khasta Kachori (2 pcs)',
    category: 'Snacks',
    price: 70,
    originalPrice: 90,
    subtitle: 'Flaky lentil kachori with sweet tamarind & mint chutney',
    description: 'Crisp golden flaky kachoris stuffed with spiced moong dal, served with tangy chutneys.',
    image: '/dishes/presets/golden-kachori-platter.webp',
    cdnImage: 'https://i.postimg.cc/FH23Kfxz/Golden-Kachori-Platter-with-Chutneys.png',
    tag: 'Mathura Special',
    rating: 4.9,
    calories: '250 kcal',
    nutrition: { carbs: '32g', fat: '12g', protein: '6g', kcal: '250 kcal' },
    spicyLevel: 'Medium',
    isVeg: true
  },
  {
    id: 'preset-basket-golden-garlic-naan',
    name: 'Tandoori Garlic Naan Basket (2 pcs)',
    category: 'Meals',
    price: 110,
    originalPrice: 140,
    subtitle: 'Crispy clay-oven naan brushed with roasted garlic butter',
    description: 'Piping hot tandoori naan infused with roasted garlic and brushed with fresh butter.',
    image: '/dishes/presets/basket-golden-garlic-naan.webp',
    cdnImage: 'https://i.postimg.cc/RCwxYcPv/Basket-of-Golden-Garlic-Naan.png',
    tag: 'Tandoori Hot',
    rating: 4.8,
    calories: '290 kcal',
    nutrition: { carbs: '44g', fat: '10g', protein: '8g', kcal: '290 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  },
  {
    id: 'preset-woven-basket-charred-rotis',
    name: 'Tandoori Butter Roti Basket (4 pcs)',
    category: 'Meals',
    price: 80,
    originalPrice: 100,
    subtitle: 'Whole wheat tandoori rotis with desi cow butter',
    description: 'Traditional whole-wheat flatbreads baked in clay oven and topped with pure butter.',
    image: '/dishes/presets/woven-basket-charred-rotis.webp',
    cdnImage: 'https://i.postimg.cc/bYQCfPpg/Woven-Basket-of-Charred-Rotis.png',
    tag: 'Desi Classic',
    rating: 4.8,
    calories: '260 kcal',
    nutrition: { carbs: '48g', fat: '6g', protein: '8g', kcal: '260 kcal' },
    spicyLevel: 'Mild',
    isVeg: true
  }
];

// In-memory active presets store initialized from local cache or static seed
let activePresetDishes = (() => {
  try {
    const cached = getCachedPresets();
    if (Array.isArray(cached) && cached.length > 0) return cached;
  } catch (e) { }
  return DEFAULT_PRESET_DISHES;
})();

export let PRESET_DISHES = activePresetDishes;

export const PRESET_CATEGORIES = ['All', 'Meals', 'Snacks', 'Sweets & Prasad', 'Beverages'];

export function getPresetDishes() {
  return activePresetDishes && activePresetDishes.length > 0 ? activePresetDishes : DEFAULT_PRESET_DISHES;
}

export async function loadPresetDishes(forceRefresh = false) {
  try {
    const cloudData = await getCloudPresets(forceRefresh);
    if (Array.isArray(cloudData) && cloudData.length > 0) {
      activePresetDishes = cloudData;
      PRESET_DISHES = cloudData;
      return cloudData;
    }
  } catch (e) {
    console.warn('loadPresetDishes error, using cache/defaults:', e);
  }
  return getPresetDishes();
}

export function getPresetDishById(id) {
  const list = getPresetDishes();
  return list.find(d => d.id === id) || null;
}

export function findPresetByKeyword(query) {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  const list = getPresetDishes();
  return list.find(d => 
    d.name.toLowerCase().includes(q) || 
    d.description?.toLowerCase().includes(q) ||
    d.category?.toLowerCase().includes(q)
  ) || null;
}

// Auto-sync active presets on Supabase events in client
if (typeof window !== 'undefined') {
  window.addEventListener('foody_presets_changed', (e) => {
    if (e.detail?.presets && Array.isArray(e.detail.presets) && e.detail.presets.length > 0) {
      activePresetDishes = e.detail.presets;
      PRESET_DISHES = e.detail.presets;
    }
  });

  // Background non-blocking fetch on initial module load
  setTimeout(() => {
    loadPresetDishes(false).catch(() => {});
  }, 100);
}
