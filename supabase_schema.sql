-- ========================================================================
-- FOODY VRINDA - PRODUCTION SUPABASE REALTIME CLOUD DATABASE
-- ========================================================================

-- 1. SHOPS TABLE (Multi-Branch Kitchen Network)
CREATE TABLE IF NOT EXISTS public.foody_shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    coordinates JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    is_open BOOLEAN DEFAULT true,
    minimum_order_amount NUMERIC DEFAULT 0,
    delivery_charge NUMERIC DEFAULT 0,
    gst_percentage NUMERIC DEFAULT 5,
    alarm_settings JSONB DEFAULT '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DISHES & MENU CATALOG TABLE
CREATE TABLE IF NOT EXISTS public.foody_menus (
    id TEXT PRIMARY KEY,
    shop_id TEXT,
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Meals',
    price NUMERIC NOT NULL,
    image TEXT,
    tag TEXT,
    kcal TEXT DEFAULT '250 kcal',
    nutrition JSONB DEFAULT '{"carbs": "35g", "fat": "12g", "protein": "16g", "kcal": "250 kcal"}'::jsonb,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ORDERS & LIVE DISPATCH TABLE
CREATE TABLE IF NOT EXISTS public.foody_orders (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL DEFAULT 'shop-vrinda-main',
    user_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    delivery_address TEXT,
    delivery_coordinates JSONB,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    delivery_charge NUMERIC NOT NULL DEFAULT 0,
    gst_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new', -- 'new' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'completed' | 'cancelled'
    payment_method TEXT DEFAULT 'cash', -- 'cash' | 'online'
    payment_id TEXT,
    cash_status TEXT DEFAULT 'pending', -- 'pending' | 'collected'
    cooking_notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. NOTIFICATIONS TABLE (Devotee, Kitchen & Rider Push Feeds)
CREATE TABLE IF NOT EXISTS public.foody_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    role TEXT, -- 'customer' | 'kitchen' | 'delivery' | 'owner'
    shop_id TEXT,
    order_id TEXT,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON public.foody_orders (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.foody_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menus_shop ON public.foody_menus (shop_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.foody_notifications (user_id, read);

-- 6. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.foody_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_notifications ENABLE ROW LEVEL SECURITY;

-- 7. PUBLIC ACCESS POLICIES (Devotee & Operational Desks)
DROP POLICY IF EXISTS "Public read shops" ON public.foody_shops;
CREATE POLICY "Public read shops" ON public.foody_shops FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write shops" ON public.foody_shops;
CREATE POLICY "Public write shops" ON public.foody_shops FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read menus" ON public.foody_menus;
CREATE POLICY "Public read menus" ON public.foody_menus FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public write menus" ON public.foody_menus;
CREATE POLICY "Public write menus" ON public.foody_menus FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read orders" ON public.foody_orders;
CREATE POLICY "Public read orders" ON public.foody_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert orders" ON public.foody_orders;
CREATE POLICY "Public insert orders" ON public.foody_orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public update orders" ON public.foody_orders;
CREATE POLICY "Public update orders" ON public.foody_orders FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Public delete orders" ON public.foody_orders;
CREATE POLICY "Public delete orders" ON public.foody_orders FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public read notifications" ON public.foody_notifications;
CREATE POLICY "Public read notifications" ON public.foody_notifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert notifications" ON public.foody_notifications;
CREATE POLICY "Public insert notifications" ON public.foody_notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public update notifications" ON public.foody_notifications;
CREATE POLICY "Public update notifications" ON public.foody_notifications FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Public delete notifications" ON public.foody_notifications;
CREATE POLICY "Public delete notifications" ON public.foody_notifications FOR DELETE USING (true);

-- 8. ENABLE REALTIME BROADCASTING (IDEMPOTENT & SAFE ON RE-RUNS)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_orders;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_shops;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_menus;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 8. SEED DATA - KITCHEN BRANCHES
INSERT INTO public.foody_shops (id, name, address, phone, coordinates, is_open, minimum_order_amount, delivery_charge, gst_percentage)
VALUES 
('shop-vrinda-main', 'Vrinda Cloud Kitchen (Main)', 'Near ISKCON Temple, Raman Reti, Vrindavan', '+91 9876543210', '{"lat": 27.5706, "lng": 77.6593}'::jsonb, true, 0, 0, 5),
('shop-prem-mandir', 'Prem Mandir Prasad Kitchen', 'Chatikara Road, Raman Reti, Vrindavan', '+91 9876543211', '{"lat": 27.5715, "lng": 77.6740}'::jsonb, true, 50, 20, 5),
('shop-banke-bihari', 'Shri Banke Bihari Dham Kitchen', 'Godowlia Marg, Vrindavan', '+91 9876543212', '{"lat": 27.5815, "lng": 77.6990}'::jsonb, true, 100, 0, 5)
ON CONFLICT (id) DO NOTHING;

-- 9. SEED DATA - SATVIK PRASAD MENU CATALOG
INSERT INTO public.foody_menus (id, shop_id, name, subtitle, description, category, price, image, tag, kcal, nutrition, is_available)
VALUES
('dish-1', 'shop-vrinda-main', 'Cheese With Satvik Burger', 'Cheesy satvik, special price', 'Fresh baked artisanal whole wheat bun filled with pure paneer patty, garden crisp lettuce, heirloom tomatoes, and creamy satvik herbal cheese.', 'Snacks', 140, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80', 'Popular Choice', '260 kcal', '{"carbs": "32g", "fat": "11g", "protein": "14g", "kcal": "260 kcal"}'::jsonb, true),
('dish-2', 'shop-vrinda-main', 'Royal Vedic Thali', 'Complete nutritional Satvik platter', 'Steaming aromatic Govind Bhog rice, 4 whole wheat phulkas, Dal Makhani with desi ghee, Paneer Butter Masala, seasonal Subzi, sweet Gulab Jamun, and crisp Papad.', 'Meals', 220, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80', 'Devotee Favorite', '480 kcal', '{"carbs": "68g", "fat": "16g", "protein": "22g", "kcal": "480 kcal"}'::jsonb, true),
('dish-3', 'shop-vrinda-main', 'Kesariya Rabdi Kheer', 'Slow simmered thickened milk dessert', 'Rich Govind Bhog rice kheer infused with pure Kashmiri saffron, crushed green cardamom, roasted almond slivers, pistachios, and pure chironji.', 'Sweets & Prasad', 120, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80', 'Sacred Prasad', '210 kcal', '{"carbs": "28g", "fat": "9g", "protein": "7g", "kcal": "210 kcal"}'::jsonb, true),
('dish-4', 'shop-vrinda-main', 'Paneer Satvik Pizza (10")', 'Crispy thin crust with desi herbs', 'Hand-tossed thin crust with fresh tomato basil coulis, diced fresh Malai paneer, bell peppers, sweet corn, and mozzarella cheese.', 'Snacks', 240, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80', 'Chef Special', '340 kcal', '{"carbs": "42g", "fat": "14g", "protein": "18g", "kcal": "340 kcal"}'::jsonb, true),
('dish-5', 'shop-vrinda-main', 'Vrindavan Special Matka Lassi', 'Chilled sweet creamy curd', 'Traditional earthen pot churned sweet creamy curd garnished with thick malai rabdi layer, pistachios, and saffron strands.', 'Beverages', 80, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80', 'Refreshing', '160 kcal', '{"carbs": "24g", "fat": "6g", "protein": "8g", "kcal": "160 kcal"}'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
