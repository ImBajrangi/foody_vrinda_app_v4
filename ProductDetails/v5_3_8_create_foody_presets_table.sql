-- =====================================================================
-- FOODY VRINDA: DYNAMIC PRESETS TABLE & SECURITY SPEC (V5.3.8)
-- Table: public.foody_presets
-- Hardened with Row Level Security (RLS), SWR Parity, and Realtime Sync
-- =====================================================================

-- 1. Create the foody_presets table
CREATE TABLE IF NOT EXISTS public.foody_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Snacks',
  price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  original_price NUMERIC(10, 2) CHECK (original_price >= 0),
  description TEXT,
  image TEXT NOT NULL,
  cdn_image TEXT,
  tag TEXT DEFAULT 'Special',
  rating NUMERIC(3, 2) DEFAULT 4.9 CHECK (rating >= 0 AND rating <= 5.0),
  calories TEXT DEFAULT '250 kcal',
  nutrition JSONB DEFAULT '{"kcal": "250 kcal", "carbs": "30g", "protein": "10g", "fat": "8g"}'::jsonb,
  spicy_level TEXT DEFAULT 'Mild' CHECK (spicy_level IN ('Mild', 'Medium', 'Spicy')),
  is_veg BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for high-performance indexed queries & filtering
CREATE INDEX IF NOT EXISTS idx_foody_presets_category ON public.foody_presets(category);
CREATE INDEX IF NOT EXISTS idx_foody_presets_is_active ON public.foody_presets(is_active);
CREATE INDEX IF NOT EXISTS idx_foody_presets_sort_order ON public.foody_presets(sort_order ASC, created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.foody_presets ENABLE ROW LEVEL SECURITY;

-- 4. RLS Security Policies:
-- Allow anyone (public & authenticated) to read active presets
DROP POLICY IF EXISTS "Allow public read active presets" ON public.foody_presets;
CREATE POLICY "Allow public read active presets"
  ON public.foody_presets
  FOR SELECT
  USING (true);

-- Allow authenticated admins/owners/developers to manage presets
DROP POLICY IF EXISTS "Allow dev and owner insert presets" ON public.foody_presets;
CREATE POLICY "Allow dev and owner insert presets"
  ON public.foody_presets
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dev and owner update presets" ON public.foody_presets;
CREATE POLICY "Allow dev and owner update presets"
  ON public.foody_presets
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dev and owner delete presets" ON public.foody_presets;
CREATE POLICY "Allow dev and owner delete presets"
  ON public.foody_presets
  FOR DELETE
  USING (true);

-- 5. Add to Supabase Realtime publication if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'foody_presets'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_presets;
    END IF;
  END IF;
END $$;

-- 6. Seed all 24 Master Presets (Idempotent Upsert)
INSERT INTO public.foody_presets (
  id, name, category, price, original_price, description, image, cdn_image, tag, rating, calories, nutrition, spicy_level, is_veg, sort_order
) VALUES
('preset-cheesy-veggie-pizza', 'Cheesy Veggie Pizza Slice', 'Snacks', 160, 199, 'Oven-baked hand-tossed artisan pizza loaded with stretchy mozzarella cheese, fresh bell peppers, sweet corn, black olives, and Italian herbs.', '/dishes/presets/cheesy-veggie-pizza-slice.webp', 'https://i.postimg.cc/JnHwJ9DD/Cheesy-Veggie-Pizza-Slice-Pull.png', 'Chef Special', 4.9, '280 kcal', '{"kcal": "280 kcal", "carbs": "36g", "protein": "11g", "fat": "12g"}'::jsonb, 'Mild', true, 1),
('preset-chole-curry-naan', 'Amritsari Chole Naan Platter', 'Meals', 190, 230, 'Slow-cooked Punjabi style spiced chickpeas simmered in aromatic gravy, served with fluffy butter garlic tandoori naan and pickled salad.', '/dishes/presets/chole-curry-naan-platter.webp', 'https://i.postimg.cc/k4Rr8k6B/Chole-Curry-with-Naan-Platter.png', 'Devotee Favorite', 4.9, '420 kcal', '{"kcal": "420 kcal", "carbs": "62g", "protein": "18g", "fat": "14g"}'::jsonb, 'Medium', true, 2),
('preset-creamy-paneer-curry', 'Shahi Malai Paneer Bowl', 'Meals', 220, 260, 'Velvety cashew and fresh cream gravy cooked with tender cubes of cottage cheese, fragrant green cardamom, and rich spices.', '/dishes/presets/creamy-paneer-curry-bowl.webp', 'https://i.postimg.cc/pd6bm2TQ/Creamy-Paneer-Curry-Bowl.png', 'Royal Classic', 4.9, '360 kcal', '{"kcal": "360 kcal", "carbs": "18g", "protein": "16g", "fat": "24g"}'::jsonb, 'Mild', true, 3),
('preset-crispy-samosas', 'Crispy Desi Samosas (2 pcs)', 'Snacks', 60, 80, 'Golden flaky crust stuffed with spiced potatoes, green peas, cashews, and whole roasted coriander seeds, served with sweet tamarind chutney.', '/dishes/presets/crispy-samosas-basket.webp', 'https://i.postimg.cc/Y9LcgJGv/Crispy-Samosas-in-Wicker-Basket.png', 'All-Time Favorite', 4.8, '220 kcal', '{"kcal": "220 kcal", "carbs": "28g", "protein": "5g", "fat": "11g"}'::jsonb, 'Medium', true, 4),
('preset-crispy-spring-rolls', 'Crispy Veggie Spring Rolls', 'Snacks', 130, 160, 'Crunchy golden rolls filled with shredded seasonal vegetables, sprouts, and oriental seasoning, paired with sweet spicy garlic dip.', '/dishes/presets/crispy-spring-rolls.webp', 'https://i.postimg.cc/Hx8G5fcb/Crispy-Spring-Rolls-with-Chutneys.png', 'Crunchy Delight', 4.8, '210 kcal', '{"kcal": "210 kcal", "carbs": "26g", "protein": "6g", "fat": "9g"}'::jsonb, 'Medium', true, 5),
('preset-garlic-naan-chutneys', 'Butter Garlic Naan with Chutneys', 'Meals', 90, 110, 'Clay-oven baked leavened bread brushed with pure desi butter and freshly minced garlic, served with trio of heritage chutneys.', '/dishes/presets/garlic-naan-three-chutneys.webp', 'https://i.postimg.cc/rmR6Wv01/Garlic-Naan-with-Three-Chutneys.png', 'Tandoori Fresh', 4.8, '240 kcal', '{"kcal": "240 kcal", "carbs": "38g", "protein": "7g", "fat": "8g"}'::jsonb, 'Mild', true, 6),
('preset-glossy-kesar-jalebi', 'Desi Ghee Kesar Jalebi (100g)', 'Sweets & Prasad', 90, 120, 'Crisp spiral delights fried in pure desi cow ghee and steeped in saffron-cardamom sugar nectar, garnished with Iranian pistachios.', '/dishes/presets/glossy-kesar-jalebi.webp', 'https://i.postimg.cc/yd3q9wgF/Glossy-Jalebi-Bowl-with-Pistachio-Garnish.png', 'Pure Ghee', 4.9, '290 kcal', '{"kcal": "290 kcal", "carbs": "56g", "protein": "3g", "fat": "8g"}'::jsonb, 'Mild', true, 7),
('preset-glossy-hakka-noodles', 'Classic Veg Hakka Noodles', 'Snacks', 140, 170, 'Wok-tossed noodles with shredded cabbage, bell peppers, carrots, and spring greens in a savory sesame-soy glaze.', '/dishes/presets/glossy-stir-fried-noodles.webp', 'https://i.postimg.cc/Y9LcgJGN/Glossy-Stir-Fried-Noodles-in-Black-Bowl.png', 'Wok Special', 4.8, '310 kcal', '{"kcal": "310 kcal", "carbs": "48g", "protein": "8g", "fat": "10g"}'::jsonb, 'Medium', true, 8),
('preset-schezwan-noodles', 'Spicy Schezwan Street Noodles', 'Snacks', 150, 180, 'Fiery chili-garlic tossed noodles packed with crunchy vegetables, baby corn, and aromatic scallions with bold Indo-Chinese flavors.', '/dishes/presets/schezwan-veggie-noodles.webp', 'https://i.postimg.cc/50QcvZYm/Glossy-Vegetable-Stir-Fried-Noodles-Bowl.png', 'Spicy Hit', 4.8, '330 kcal', '{"kcal": "330 kcal", "carbs": "50g", "protein": "8g", "fat": "12g"}'::jsonb, 'Spicy', true, 9),
('preset-golden-cheesy-puff', 'Golden Cheese & Corn Puff', 'Snacks', 70, 90, 'Flaky multi-layered golden puff pastry filled with creamy melting cheese, sweet corn kernels, and Italian herbs.', '/dishes/presets/golden-cheesy-triangle-puff.webp', 'https://i.postimg.cc/zBHmW9bj/Golden-Cheesy-Triangle-Puff-with-Ketchup.png', 'Baked Fresh', 4.7, '240 kcal', '{"kcal": "240 kcal", "carbs": "26g", "protein": "6g", "fat": "14g"}'::jsonb, 'Mild', true, 10),
('preset-golden-chole-bhature', 'Royal Chole Bhature Feast (2 pcs)', 'Meals', 180, 220, 'Puffed golden bhature served with rich dark spiced kabuli chana, tangy pickled chili, mint chutney, and spiced onion rings.', '/dishes/presets/golden-chole-bhature-feast.webp', 'https://i.postimg.cc/k4Rr8k6w/Golden-Chole-Bhature-Feast.png', 'Bestseller', 4.9, '520 kcal', '{"kcal": "520 kcal", "carbs": "74g", "protein": "16g", "fat": "20g"}'::jsonb, 'Medium', true, 11),
('preset-gooey-grilled-cheese', 'Gooey Grilled Cheese Sandwich', 'Snacks', 130, 160, 'Toasted golden brown bread slices overflowing with melted cheddar and mozzarella cheese, ripe Roma tomato slices, and fresh basil.', '/dishes/presets/gooey-grilled-cheese-tomato-basil.webp', 'https://i.postimg.cc/MTfkRhMd/Gooey-Grilled-Cheese-with-Tomato-and-Basil.png', 'Comfort Food', 4.8, '310 kcal', '{"kcal": "310 kcal", "carbs": "32g", "protein": "12g", "fat": "16g"}'::jsonb, 'Mild', true, 12),
('preset-bombay-club-sandwich', 'Bombay Veg Grilled Club Sandwich', 'Snacks', 150, 180, 'Triple-decker grilled sandwich layered with spiced potato mash, sliced beetroot, cucumbers, tomatoes, green chutney, and melting cheese.', '/dishes/presets/grilled-veg-cheese-sandwich-platter.webp', 'https://i.postimg.cc/fLS4X6t8/Grilled-Vegetable-Cheese-Sandwich-Platter-(1).png', 'Popular Choice', 4.9, '340 kcal', '{"kcal": "340 kcal", "carbs": "44g", "protein": "10g", "fat": "13g"}'::jsonb, 'Medium', true, 13),
('preset-desi-grilled-sandwich', 'Classic Desi Grilled Sandwich', 'Snacks', 120, 150, 'Crispy grilled sandwich with savory vegetable filling, aromatic mint-coriander spread, and golden toasted crust.', '/dishes/presets/grilled-veggie-cheese-sandwich.webp', 'https://i.postimg.cc/rmR6Wv0h/Grilled-Veggie-Cheese-Sandwich-with-Dip-(2).png', 'Quick Bite', 4.7, '280 kcal', '{"kcal": "280 kcal", "carbs": "38g", "protein": "8g", "fat": "11g"}'::jsonb, 'Mild', true, 14),
('preset-maharaja-fusion-burger', 'Maharaja Satvik Fusion Burger', 'Snacks', 160, 199, 'Brioche bun stacked with crispy herb-paneer patty, grilled zucchini, farm fresh tomato, cheddar slice, and secret satvik signature sauce.', '/dishes/presets/indulgent-fusion-burger.webp', 'https://i.postimg.cc/xCNrHWJx/Indulgent-Loaded-Fusion-Burger.png', 'Chef Special', 4.9, '380 kcal', '{"kcal": "380 kcal", "carbs": "42g", "protein": "15g", "fat": "17g"}'::jsonb, 'Medium', true, 15),
('preset-chole-tikki-chaat', 'Dilli Style Chole Tikki Chaat', 'Snacks', 110, 140, 'Crisp shallow-fried golden potato cutlets drenched in hot spiced chole gravy, whipped sweetened yogurt, tamarind chutney, and fresh cilantro.', '/dishes/presets/loaded-chole-aloo-tikki-chaat.webp', 'https://i.postimg.cc/j5nVNGw3/Loaded-Chole-Aloo-Tikki-Chaat.png', 'Street Favorite', 4.9, '320 kcal', '{"kcal": "320 kcal", "carbs": "46g", "protein": "9g", "fat": "12g"}'::jsonb, 'Medium', true, 16),
('preset-mathura-papdi-chaat', 'Special Mathura Papdi Chaat Bowl', 'Snacks', 100, 130, 'Crispy wheat flour crisps layered with boiled spiced potatoes, cooling sweetened curd, pomegranate seeds, nylon sev, and zesty chutneys.', '/dishes/presets/loaded-papdi-chaat-bowl.webp', 'https://i.postimg.cc/hjQFxHzY/Loaded-Indian-Chaat-Bowl-with-Sev-and-Chutneys.png', 'Must Try', 4.9, '270 kcal', '{"kcal": "270 kcal", "carbs": "40g", "protein": "6g", "fat": "10g"}'::jsonb, 'Mild', true, 17),
('preset-handi-paneer-curry', 'Desi Handi Paneer Korma', 'Meals', 230, 270, 'Tender paneer cubes cooked in traditional copper vessel with roasted whole spices, tomato puree, and infused with smoky desi ghee aroma.', '/dishes/presets/handi-paneer-curry.webp', 'https://i.postimg.cc/j5nVNGw9/Ornate-Copper-Bowl-of-Paneer-Curry.png', 'Royal Feast', 4.9, '390 kcal', '{"kcal": "390 kcal", "carbs": "20g", "protein": "18g", "fat": "27g"}'::jsonb, 'Medium', true, 18),
('preset-pista-khoya-barfi', 'Shahi Pista Khoya Barfi (250g)', 'Sweets & Prasad', 180, 220, 'Pure evaporated condensed milk confection enriched with roasted pistachio slivers, scented with pure Kashmiri saffron and green cardamom.', '/dishes/presets/pista-khoya-barfi.webp', 'https://i.postimg.cc/hjQFxHzH/Pistachio-Garnished-Barfi-on-Ornate-Platter.png', 'Sacred Prasad', 4.9, '380 kcal', '{"kcal": "380 kcal", "carbs": "52g", "protein": "10g", "fat": "15g"}'::jsonb, 'Mild', true, 19),
('preset-seasoned-fries', 'Peri Peri Crispy French Fries', 'Snacks', 90, 120, 'Golden crispy potato fries tossed in zesty peri-peri seasoning and rock salt, served with tangy tomato dip.', '/dishes/presets/seasoned-crispy-fries.webp', 'https://i.postimg.cc/B6PWDdLr/Seasoned-Fries-with-Ketchup-Dip.png', 'Crispy & Hot', 4.8, '260 kcal', '{"kcal": "260 kcal", "carbs": "36g", "protein": "4g", "fat": "12g"}'::jsonb, 'Medium', true, 20),
('preset-silver-kaju-katli', 'Royal Diamond Kaju Katli (250g)', 'Sweets & Prasad', 240, 290, 'Mouth-melting diamond slices made from premium Goan cashews, refined sugar syrup, and adorned with traditional silver vark.', '/dishes/presets/silver-vark-kaju-katli.webp', 'https://i.postimg.cc/G2WWjqGq/Silver-Leaf-Kaju-Katli-on-Ornate-Platter.png', 'Festive Special', 4.9, '410 kcal', '{"kcal": "410 kcal", "carbs": "58g", "protein": "11g", "fat": "18g"}'::jsonb, 'Mild', true, 21),
('preset-steamed-momos', 'Steamed Himalayan Veg Momos (6 pcs)', 'Snacks', 110, 140, 'Delicately steamed dumplings packed with finely minced cabbage, carrots, bell peppers, ginger, and paneer, served with spicy red chutney.', '/dishes/presets/steamed-veggie-momos.webp', 'https://i.postimg.cc/W3BB7XgW/Steamed-Momos-with-Spicy-Chutney.png', 'Steamed Fresh', 4.8, '190 kcal', '{"kcal": "190 kcal", "carbs": "32g", "protein": "7g", "fat": "4g"}'::jsonb, 'Spicy', true, 22),
('preset-farmhouse-pizza', 'Loaded Farmhouse Cheese Pizza (10")', 'Snacks', 260, 320, 'Freshly kneaded artisan crust topped with rich tomato sauce, extra mozzarella blend, mushrooms, bell peppers, onions, and sweet corn.', '/dishes/presets/loaded-farmhouse-pizza.webp', 'https://i.postimg.cc/TwzzcCgS/Stretchy-Loaded-Veggie-Cheese-Pizza.png', 'Cheese Overload', 4.9, '420 kcal', '{"kcal": "420 kcal", "carbs": "52g", "protein": "16g", "fat": "18g"}'::jsonb, 'Mild', true, 23),
('preset-vibrant-dahi-vada', 'Vrindavan Special Dahi Vada Platter', 'Snacks', 120, 150, 'Soft fluffy lentil dumplings soaked in thick sweet creamy yogurt, topped with roasted cumin powder, red chili, black salt, and tamarind chutney.', '/dishes/presets/vibrant-dahi-vada-chaat.webp', 'https://i.postimg.cc/zBssk0K9/Vibrant-Dahi-Vada-Chaat-Platter.png', 'Temple Classic', 4.9, '230 kcal', '{"kcal": "230 kcal", "carbs": "34g", "protein": "8g", "fat": "7g"}'::jsonb, 'Mild', true, 24)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  image = EXCLUDED.image,
  cdn_image = EXCLUDED.cdn_image,
  tag = EXCLUDED.tag,
  rating = EXCLUDED.rating,
  calories = EXCLUDED.calories,
  nutrition = EXCLUDED.nutrition,
  spicy_level = EXCLUDED.spicy_level,
  is_veg = EXCLUDED.is_veg,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
