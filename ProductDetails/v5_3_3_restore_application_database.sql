-- ========================================================================
-- ⚠️ REJECTED & DEPRECATED — DO NOT EXECUTE IN PRODUCTION!
-- This draft proposed overly broad 'TO public USING (true)' policies that
-- would compromise the v5.3.1 security architecture.
-- USE INSTEAD: ProductDetails/v5_3_4_production_secure_sync.sql
-- ========================================================================

-- STEP 1: RESTORE PERMISSIVE APPLICATION ACCESS (WITH ENGINE TRIGGER DEFENSE)
-- ------------------------------------------------------------------------

-- 1a. foody_shops: Public can view active shops
ALTER TABLE public.foody_shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access shops" ON public.foody_shops;
DROP POLICY IF EXISTS "Authenticated read shops" ON public.foody_shops;
DROP POLICY IF EXISTS "Service role full access shops" ON public.foody_shops;
DROP POLICY IF EXISTS "Allow public read shops" ON public.foody_shops;
DROP POLICY IF EXISTS "Allow staff edit shops" ON public.foody_shops;

CREATE POLICY "Allow public read shops"
  ON public.foody_shops FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role full access shops"
  ON public.foody_shops FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow staff edit shops"
  ON public.foody_shops FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 1b. foody_menus: Public can browse dishes
ALTER TABLE public.foody_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access menus" ON public.foody_menus;
DROP POLICY IF EXISTS "Service role full access menus" ON public.foody_menus;
DROP POLICY IF EXISTS "Shop-scoped read menus" ON public.foody_menus;
DROP POLICY IF EXISTS "Allow public read menus" ON public.foody_menus;
DROP POLICY IF EXISTS "Allow staff edit menus" ON public.foody_menus;

CREATE POLICY "Allow public read menus"
  ON public.foody_menus FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role full access menus"
  ON public.foody_menus FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow staff edit menus"
  ON public.foody_menus FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 1c. foody_orders: Full lifecycle access across Customer, Kitchen & Transport
ALTER TABLE public.foody_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access orders" ON public.foody_orders;
DROP POLICY IF EXISTS "Service role full access orders" ON public.foody_orders;
DROP POLICY IF EXISTS "Shop-scoped read orders" ON public.foody_orders;
DROP POLICY IF EXISTS "Shop-scoped insert orders" ON public.foody_orders;
DROP POLICY IF EXISTS "Shop-scoped update orders" ON public.foody_orders;
DROP POLICY IF EXISTS "Block Direct Client Order Insert" ON public.foody_orders;
DROP POLICY IF EXISTS "Block Direct Client Order Update" ON public.foody_orders;
DROP POLICY IF EXISTS "Strict Orders Read Policy" ON public.foody_orders;
DROP POLICY IF EXISTS "Allow public read orders" ON public.foody_orders;
DROP POLICY IF EXISTS "Allow public insert orders" ON public.foody_orders;
DROP POLICY IF EXISTS "Allow public update orders" ON public.foody_orders;

CREATE POLICY "Service role full access orders"
  ON public.foody_orders FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read orders"
  ON public.foody_orders FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert orders"
  ON public.foody_orders FOR INSERT
  TO public
  WITH CHECK (true);

-- Note: trg_validate_order_transition enforces forward state machine and blocks illegal status jumps
CREATE POLICY "Allow public update orders"
  ON public.foody_orders FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- 1d. foody_logged_users & foody_roles: Public read for client authentication & role mapping
ALTER TABLE public.foody_logged_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access logged users" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Service role full access users" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Users see own shop" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Allow public read logged users" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Allow public edit logged users" ON public.foody_logged_users;

CREATE POLICY "Service role full access users"
  ON public.foody_logged_users FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read logged users"
  ON public.foody_logged_users FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public edit logged users"
  ON public.foody_logged_users FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.foody_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access roles" ON public.foody_roles;
DROP POLICY IF EXISTS "Service role full access roles" ON public.foody_roles;
DROP POLICY IF EXISTS "Authenticated read roles" ON public.foody_roles;
DROP POLICY IF EXISTS "Allow public read roles" ON public.foody_roles;

CREATE POLICY "Service role full access roles"
  ON public.foody_roles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read roles"
  ON public.foody_roles FOR SELECT
  TO public
  USING (true);

-- 1e. foody_notifications & foody_reviews: Live order alerts & feedback
ALTER TABLE public.foody_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access notifications" ON public.foody_notifications;
DROP POLICY IF EXISTS "Allow public read notifications" ON public.foody_notifications;
DROP POLICY IF EXISTS "Allow public insert notifications" ON public.foody_notifications;

CREATE POLICY "Allow public read notifications"
  ON public.foody_notifications FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert notifications"
  ON public.foody_notifications FOR INSERT
  TO public
  WITH CHECK (true);

ALTER TABLE public.foody_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access reviews" ON public.foody_reviews;
DROP POLICY IF EXISTS "Allow public read reviews" ON public.foody_reviews;
DROP POLICY IF EXISTS "Allow public insert reviews" ON public.foody_reviews;

CREATE POLICY "Allow public read reviews"
  ON public.foody_reviews FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert reviews"
  ON public.foody_reviews FOR INSERT
  TO public
  WITH CHECK (true);

-- 1f. foody_cash_settlements: COD accounting reconciliation
ALTER TABLE public.foody_cash_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access settlements" ON public.foody_cash_settlements;
DROP POLICY IF EXISTS "Public access cash settlements" ON public.foody_cash_settlements;
DROP POLICY IF EXISTS "Service role full access settlements" ON public.foody_cash_settlements;
DROP POLICY IF EXISTS "Shop-scoped read settlements" ON public.foody_cash_settlements;
DROP POLICY IF EXISTS "Allow public read settlements" ON public.foody_cash_settlements;
DROP POLICY IF EXISTS "Allow public edit settlements" ON public.foody_cash_settlements;

CREATE POLICY "Service role full access settlements"
  ON public.foody_cash_settlements FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read settlements"
  ON public.foody_cash_settlements FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public edit settlements"
  ON public.foody_cash_settlements FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 1g. foody_order_events: Immutable audit trail
ALTER TABLE public.foody_order_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access order events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Insert events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Service role full access events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Shop-scoped read events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Allow public read events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Allow public insert events" ON public.foody_order_events;

CREATE POLICY "Service role full access events"
  ON public.foody_order_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read events"
  ON public.foody_order_events FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert events"
  ON public.foody_order_events FOR INSERT
  TO public
  WITH CHECK (true);


-- STEP 2: GRANT COMPLETE TABLE & FUNCTION PRIVILEGES TO CLIENT ROLES
-- ------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_auth_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_shop_authorized(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_shop_ids() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_order_pickup_atomic(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_delivery_otp_atomic(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_order_hash_chain(text) TO anon, authenticated, service_role;


-- STEP 3: SEED/UPDATE ALL 3 PRODUCTION KITCHENS
-- ------------------------------------------------------------------------
INSERT INTO public.foody_shops (
    id, name, address, phone, coordinates, is_open, is_online, is_active, shop_type,
    operating_hours, minimum_order_amount, delivery_charge, gst_percentage, payment_settings, alarm_settings
) VALUES
(
    'shop-vrinda-main',
    'Vrinda Cloud Kitchen (Main)',
    'Near ISKCON Temple, Raman Reti, Vrindavan',
    '+91 9876543210',
    '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    true, true, true, 'hotel',
    '{"openTime": "08:00", "closeTime": "22:30", "autoSchedule": true}'::jsonb,
    0, 0, 5,
    '{"onlinePaymentsEnabled": true, "codEnabled": true}'::jsonb,
    '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb
),
(
    'shop-prem-mandir',
    'Prem Mandir Prasad Kitchen',
    'Chatikara Road, Raman Reti, Vrindavan',
    '+91 9876543211',
    '{"lat": 27.5715, "lng": 77.6740}'::jsonb,
    true, true, true, 'temple',
    '{"openTime": "08:00", "closeTime": "22:30", "autoSchedule": true}'::jsonb,
    50, 20, 5,
    '{"onlinePaymentsEnabled": true, "codEnabled": true}'::jsonb,
    '{"kitchenNew": true, "kitchenReady": true, "deliveryReady": true}'::jsonb
),
(
    'shop-banke-bihari',
    'Shri Banke Bihari Dham Kitchen',
    'Godowlia Marg, Vrindavan',
    '+91 9876543212',
    '{"lat": 27.5815, "lng": 77.6990}'::jsonb,
    true, true, true, 'temple',
    '{"openTime": "08:00", "closeTime": "22:30", "autoSchedule": true}'::jsonb,
    100, 0, 5,
    '{"onlinePaymentsEnabled": true, "codEnabled": true}'::jsonb,
    '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    coordinates = EXCLUDED.coordinates,
    is_open = true,
    is_online = true,
    is_active = true,
    payment_settings = EXCLUDED.payment_settings,
    alarm_settings = EXCLUDED.alarm_settings,
    operating_hours = EXCLUDED.operating_hours;


-- STEP 4: SEED SATVIK PRASAD MENUS FOR ALL 3 KITCHENS
-- ------------------------------------------------------------------------
INSERT INTO public.foody_menus (id, shop_id, name, subtitle, description, category, price, image, tag, kcal, nutrition, is_available)
VALUES
-- Kitchen 1: Vrinda Cloud Kitchen (Main)
('dish-v1', 'shop-vrinda-main', 'Cheese With Satvik Burger', 'Cheesy satvik, special price', 'Fresh baked artisanal whole wheat bun filled with pure paneer patty, garden crisp lettuce, heirloom tomatoes, and creamy satvik herbal cheese.', 'Snacks', 140, '/dishes/burger.png', 'Popular Choice', '260 kcal', '{"carbs": "32g", "fat": "11g", "protein": "14g", "kcal": "260 kcal"}'::jsonb, true),
('dish-v2', 'shop-vrinda-main', 'Royal Vedic Thali', 'Complete nutritional Satvik platter', 'Steaming aromatic Govind Bhog rice, 4 whole wheat phulkas, Dal Makhani with desi ghee, Paneer Butter Masala, seasonal Subzi, sweet Gulab Jamun, and crisp Papad.', 'Meals', 220, '/dishes/thali.png', 'Devotee Favorite', '480 kcal', '{"carbs": "68g", "fat": "16g", "protein": "22g", "kcal": "480 kcal"}'::jsonb, true),
('dish-v3', 'shop-vrinda-main', 'Kesariya Rabdi Kheer', 'Slow simmered thickened milk dessert', 'Rich Govind Bhog rice kheer infused with pure Kashmiri saffron, crushed green cardamom, roasted almond slivers, pistachios, and pure chironji.', 'Sweets & Prasad', 120, '/dishes/sweet.png', 'Sacred Prasad', '210 kcal', '{"carbs": "28g", "fat": "9g", "protein": "7g", "kcal": "210 kcal"}'::jsonb, true),
('dish-v4', 'shop-vrinda-main', 'Paneer Satvik Pizza (10")', 'Crispy thin crust with desi herbs', 'Hand-tossed thin crust with fresh tomato basil coulis, diced fresh Malai paneer, bell peppers, sweet corn, and mozzarella cheese.', 'Snacks', 240, '/dishes/pizza.png', 'Chef Special', '340 kcal', '{"carbs": "42g", "fat": "14g", "protein": "18g", "kcal": "340 kcal"}'::jsonb, true),
('dish-v5', 'shop-vrinda-main', 'Vrindavan Special Matka Lassi', 'Chilled sweet creamy curd', 'Traditional earthen pot churned sweet creamy curd garnished with thick malai rabdi layer, pistachios, and saffron strands.', 'Beverages', 80, '/dishes/sweet.png', 'Refreshing', '160 kcal', '{"carbs": "24g", "fat": "6g", "protein": "8g", "kcal": "160 kcal"}'::jsonb, true),

-- Kitchen 2: Prem Mandir Prasad Kitchen
('dish-p1', 'shop-prem-mandir', 'Prem Mandir Makhan Malai', 'Fluffy divine frothy sweet prasad', 'Heavenly light, cloud-like churned sweet cream infused with kesar, pistachios, and silver vark prepared in traditional Braj tradition.', 'Sweets & Prasad', 150, '/dishes/sweet.png', 'Mandir Special', '190 kcal', '{"carbs": "22g", "fat": "12g", "protein": "5g", "kcal": "190 kcal"}'::jsonb, true),
('dish-p2', 'shop-prem-mandir', 'Brijwasi Special Khichdi', 'Pure Desi Ghee Moong Dal Khichdi', 'Fragrant Govind Bhog rice and split green gram simmered with whole spices, topped with generous golden A2 cow desi ghee and roasted cumin.', 'Meals', 160, '/dishes/thali.png', 'Light & Pure', '320 kcal', '{"carbs": "52g", "fat": "9g", "protein": "12g", "kcal": "320 kcal"}'::jsonb, true),
('dish-p3', 'shop-prem-mandir', 'Pure Ghee Poori Sabzi (4 pcs)', 'Crisp golden pooris with hing aloo', 'Four hot puffed whole wheat pooris fried in pure ghee, served with tangy Mathura-style spiced potato curry and sweet pumpkin subzi.', 'Meals', 180, '/dishes/thali.png', 'Temple Classic', '420 kcal', '{"carbs": "58g", "fat": "18g", "protein": "8g", "kcal": "420 kcal"}'::jsonb, true),
('dish-p4', 'shop-prem-mandir', 'Shahi Kesar Pedha Box (250g)', 'Traditional slow-caramelized mawa', 'Authentic dark roasted mawa pedha rolled in fine bura sugar and cardamom, direct from sacred Braj confectioners.', 'Sweets & Prasad', 180, '/dishes/sweet.png', 'Gift Pack', '380 kcal', '{"carbs": "55g", "fat": "14g", "protein": "9g", "kcal": "380 kcal"}'::jsonb, true),

-- Kitchen 3: Shri Banke Bihari Dham Kitchen
('dish-b1', 'shop-banke-bihari', 'Banke Bihari Mathura Peda (250g)', 'Sacred temple bhog peda', 'Celebrated caramel-brown Mathura peda crafted from fresh khoya, raw cane sugar, and freshly crushed cardamom seeds.', 'Sweets & Prasad', 190, '/dishes/sweet.png', 'Bihari Ji Prasad', '390 kcal', '{"carbs": "58g", "fat": "15g", "protein": "10g", "kcal": "390 kcal"}'::jsonb, true),
('dish-b2', 'shop-banke-bihari', 'Chhapan Bhog Thali', 'Grand festival feast platter', 'Luxurious spread featuring 2 paneer delicacies, dal baati churma, 4 desi ghee rotis, pulav, 2 sweets, raita, and fresh salad.', 'Meals', 350, '/dishes/thali.png', 'Royal Feast', '620 kcal', '{"carbs": "85g", "fat": "24g", "protein": "26g", "kcal": "620 kcal"}'::jsonb, true),
('dish-b3', 'shop-banke-bihari', 'Bedmi Poori with Aloo Jhol', 'Crispy urad dal stuffed pooris', 'Three thick crispy urad dal pooris served with spicy slow-cooked Vrindavan aloo rasdaar sabzi and methi chutney.', 'Meals', 160, '/dishes/thali.png', 'Morning Special', '380 kcal', '{"carbs": "54g", "fat": "15g", "protein": "9g", "kcal": "380 kcal"}'::jsonb, true),
('dish-b4', 'shop-banke-bihari', 'Kesariya Malai Lassi Special', 'Thick creamy saffron yogurt beverage', 'Rich hand-churned buffalo curd sweetened and blended with kesar syrup, topped with thick clotted cream and crushed cashews.', 'Beverages', 90, '/dishes/sweet.png', 'Best Seller', '180 kcal', '{"carbs": "26g", "fat": "8g", "protein": "7g", "kcal": "180 kcal"}'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    image = EXCLUDED.image,
    is_available = true,
    category = EXCLUDED.category,
    description = EXCLUDED.description;


-- STEP 5: ENABLE SUPABASE REALTIME FOR LIVE SYNCHRONIZATION
-- ------------------------------------------------------------------------
ALTER TABLE public.foody_shops REPLICA IDENTITY FULL;
ALTER TABLE public.foody_menus REPLICA IDENTITY FULL;
ALTER TABLE public.foody_orders REPLICA IDENTITY FULL;
ALTER TABLE public.foody_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.foody_cash_settlements REPLICA IDENTITY FULL;

DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_shops; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_menus; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_settlements; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;


-- STEP 6: NOTIFY POSTGREST SCHEMA CACHE RELOAD
-- ------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
