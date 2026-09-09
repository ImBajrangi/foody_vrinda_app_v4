-- ========================================================================
-- FOODY VRINDA - ENTERPRISE POSTGRESQL & SUPABASE CLOUD SCHEMA
-- Includes:
-- 1. Multi-Branch Kitchens (foody_shops)
-- 2. Satvik Menu Catalog (foody_menus)
-- 3. Live Dispatch & Orders (foody_orders)
-- 4. User Roles & Permission Matrix (foody_users)
-- 5. Devotee Reviews & Feedback (foody_reviews)
-- 6. Notification Feeds (foody_notifications)
-- 7. Automatic Auth.Users <-> Public.Foody_Users Synchronization Triggers
-- 8. Atomic Role Assignment RPC (set_user_role)
-- 9. Realtime Streaming Publications with REPLICA IDENTITY FULL
-- ========================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------
-- 1. SHOPS TABLE (Multi-Branch Kitchen Network)
-- ------------------------------------------------------------------------
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
    payment_settings JSONB DEFAULT '{"onlinePaymentsEnabled": true, "codEnabled": true}'::jsonb,
    alarm_settings JSONB DEFAULT '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if migrating from previous versions
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{"onlinePaymentsEnabled": true, "codEnabled": true}'::jsonb;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS alarm_settings JSONB DEFAULT '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb;

DROP TRIGGER IF EXISTS trg_foody_shops_updated_at ON public.foody_shops;
CREATE TRIGGER trg_foody_shops_updated_at
    BEFORE UPDATE ON public.foody_shops
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------
-- 2. DISHES & MENU CATALOG TABLE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foody_menus (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL DEFAULT 'shop-vrinda-main',
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Meals',
    price NUMERIC NOT NULL DEFAULT 0,
    image TEXT,
    tag TEXT,
    kcal TEXT DEFAULT '250 kcal',
    nutrition JSONB DEFAULT '{"carbs": "35g", "fat": "12g", "protein": "16g", "kcal": "250 kcal"}'::jsonb,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_foody_menus_updated_at ON public.foody_menus;
CREATE TRIGGER trg_foody_menus_updated_at
    BEFORE UPDATE ON public.foody_menus
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------
-- 3. ORDERS & LIVE DISPATCH TABLE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foody_orders (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL DEFAULT 'shop-vrinda-main',
    user_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    delivery_address TEXT,
    delivery_coordinates JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    delivery_charge NUMERIC NOT NULL DEFAULT 0,
    gst_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled')),
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'online')),
    payment_id TEXT,
    cash_status TEXT DEFAULT 'pending' CHECK (cash_status IN ('pending', 'collected')),
    cooking_notes TEXT,
    rider_id TEXT,
    rider_name TEXT,
    rider_phone TEXT,
    rider_rating TEXT,
    rider_avatar TEXT,
    created_by TEXT DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure migration compatibility for order table columns
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_id TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_name TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_phone TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_rating TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_avatar TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS cooking_notes TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS cash_status TEXT DEFAULT 'pending';
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS payment_id TEXT;

DROP TRIGGER IF EXISTS trg_foody_orders_updated_at ON public.foody_orders;
CREATE TRIGGER trg_foody_orders_updated_at
    BEFORE UPDATE ON public.foody_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------
-- 4. ALL LOGGED-IN USERS & ROLE MANAGEMENT TABLE (foody_logged_users)
-- Stores all logged-in members with their verified role, shop access & profile
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foody_logged_users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'kitchen', 'delivery', 'owner', 'developer')),
    shop_id TEXT NOT NULL DEFAULT 'shop-vrinda-main',
    shop_ids JSONB DEFAULT '["shop-vrinda-main"]'::jsonb,
    dev_permissions JSONB DEFAULT '[]'::jsonb,
    login_method TEXT DEFAULT 'email',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_foody_logged_users_updated_at ON public.foody_logged_users;
CREATE TRIGGER trg_foody_logged_users_updated_at
    BEFORE UPDATE ON public.foody_logged_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Backward-compatibility: public.foody_users table
CREATE TABLE IF NOT EXISTS public.foody_users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'kitchen', 'delivery', 'owner', 'developer')),
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    shop_ids JSONB DEFAULT '["shop-vrinda-main"]'::jsonb,
    dev_permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_foody_users_updated_at ON public.foody_users;
CREATE TRIGGER trg_foody_users_updated_at
    BEFORE UPDATE ON public.foody_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------
-- 5. REVIEWS & FEEDBACK TABLE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foody_reviews (
    id BIGSERIAL PRIMARY KEY,
    order_id TEXT,
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    customer_name TEXT,
    rating INT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    tags JSONB DEFAULT '[]'::jsonb,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 6. NOTIFICATIONS TABLE (Devotee, Kitchen & Rider Push Feeds)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foody_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    role TEXT DEFAULT 'all',
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    order_id TEXT,
    type TEXT DEFAULT 'order_update',
    title TEXT,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 7. PERFORMANCE INDEXES (Optimized for Sub-millisecond Execution)
-- ------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON public.foody_orders (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.foody_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.foody_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.foody_orders (customer_phone);

CREATE INDEX IF NOT EXISTS idx_menus_shop ON public.foody_menus (shop_id);
CREATE INDEX IF NOT EXISTS idx_menus_category ON public.foody_menus (category);
CREATE INDEX IF NOT EXISTS idx_menus_is_available ON public.foody_menus (is_available);

CREATE INDEX IF NOT EXISTS idx_logged_users_role ON public.foody_logged_users (role);
CREATE INDEX IF NOT EXISTS idx_logged_users_email ON public.foody_logged_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_logged_users_phone ON public.foody_logged_users (phone);
CREATE INDEX IF NOT EXISTS idx_logged_users_shop_id ON public.foody_logged_users (shop_id);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.foody_users (role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.foody_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.foody_users (phone);
CREATE INDEX IF NOT EXISTS idx_users_shop_id ON public.foody_users (shop_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.foody_notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_shop_role ON public.foody_notifications (shop_id, role);
CREATE INDEX IF NOT EXISTS idx_reviews_shop ON public.foody_reviews (shop_id);

-- ------------------------------------------------------------------------
-- 8. REPLICA IDENTITY (Allows 0-Egress Full-Row Realtime Streaming)
-- ------------------------------------------------------------------------
ALTER TABLE public.foody_shops REPLICA IDENTITY FULL;
ALTER TABLE public.foody_menus REPLICA IDENTITY FULL;
ALTER TABLE public.foody_orders REPLICA IDENTITY FULL;
ALTER TABLE public.foody_logged_users REPLICA IDENTITY FULL;
ALTER TABLE public.foody_users REPLICA IDENTITY FULL;
ALTER TABLE public.foody_notifications REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------
ALTER TABLE public.foody_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_logged_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access shops" ON public.foody_shops;
CREATE POLICY "Public access shops" ON public.foody_shops FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access menus" ON public.foody_menus;
CREATE POLICY "Public access menus" ON public.foody_menus FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access orders" ON public.foody_orders;
CREATE POLICY "Public access orders" ON public.foody_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access logged users" ON public.foody_logged_users;
CREATE POLICY "Public access logged users" ON public.foody_logged_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access users" ON public.foody_users;
CREATE POLICY "Public access users" ON public.foody_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access reviews" ON public.foody_reviews;
CREATE POLICY "Public access reviews" ON public.foody_reviews FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access notifications" ON public.foody_notifications;
CREATE POLICY "Public access notifications" ON public.foody_notifications FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------
-- 10. REALTIME STREAMING PUBLICATION (Idempotent)
-- ------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_shops; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_menus; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_logged_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_reviews; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ------------------------------------------------------------------------
-- 11. AUTOMATIC AUTH.USERS -> PUBLIC.FOODY_USERS SYNC TRIGGER
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    extracted_name TEXT;
    extracted_role TEXT;
    extracted_phone TEXT;
    extracted_avatar TEXT;
BEGIN
    extracted_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Foody Devotee'
    );
    
    extracted_role := COALESCE(
        NEW.raw_app_meta_data->>'role',
        NEW.raw_user_meta_data->>'role',
        'customer'
    );

    extracted_phone := COALESCE(
        NEW.phone,
        NEW.raw_user_meta_data->>'phone',
        ''
    );

    extracted_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        ''
    );

    -- Insert or update into public.foody_logged_users
    INSERT INTO public.foody_logged_users (
        id,
        display_name,
        email,
        phone,
        avatar_url,
        role,
        shop_id,
        shop_ids,
        last_login_at,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id::text,
        extracted_name,
        NEW.email,
        extracted_phone,
        extracted_avatar,
        extracted_role,
        'shop-vrinda-main',
        '["shop-vrinda-main"]'::jsonb,
        NOW(),
        COALESCE(NEW.created_at, NOW()),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        email = COALESCE(EXCLUDED.email, foody_logged_users.email),
        phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE foody_logged_users.phone END,
        avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE foody_logged_users.avatar_url END,
        last_login_at = NOW(),
        updated_at = NOW();

    -- Also mirror into public.foody_users for backward compatibility
    INSERT INTO public.foody_users (
        id,
        display_name,
        email,
        phone,
        avatar_url,
        role,
        shop_id,
        shop_ids,
        last_seen_at,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id::text,
        extracted_name,
        NEW.email,
        extracted_phone,
        extracted_avatar,
        extracted_role,
        'shop-vrinda-main',
        '["shop-vrinda-main"]'::jsonb,
        NOW(),
        COALESCE(NEW.created_at, NOW()),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        email = COALESCE(EXCLUDED.email, foody_users.email),
        phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE foody_users.phone END,
        avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE foody_users.avatar_url END,
        last_seen_at = NOW(),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Safely install trigger on auth.users (wrapped in exception block)
DO $$ BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT OR UPDATE ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ------------------------------------------------------------------------
-- 12. ATOMIC ROLE ASSIGNMENT STORED PROCEDURE (RPC)
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_user_role(
    target_id TEXT,
    new_role TEXT,
    target_shop TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_record JSONB;
BEGIN
    -- 1. Update in public.foody_logged_users
    UPDATE public.foody_logged_users
    SET 
        role = new_role,
        shop_id = COALESCE(target_shop, shop_id),
        shop_ids = CASE 
            WHEN target_shop IS NOT NULL THEN jsonb_build_array(target_shop)
            ELSE shop_ids
        END,
        updated_at = NOW()
    WHERE id = target_id OR LOWER(email) = LOWER(target_id) OR phone = target_id
    RETURNING to_jsonb(foody_logged_users.*) INTO updated_record;

    -- 2. Also mirror update into public.foody_users
    UPDATE public.foody_users
    SET 
        role = new_role,
        shop_id = COALESCE(target_shop, shop_id),
        shop_ids = CASE 
            WHEN target_shop IS NOT NULL THEN jsonb_build_array(target_shop)
            ELSE shop_ids
        END,
        updated_at = NOW()
    WHERE id = target_id OR LOWER(email) = LOWER(target_id) OR phone = target_id;

    -- 3. If no record was updated in foody_logged_users, insert or copy into foody_logged_users
    IF updated_record IS NULL THEN
        INSERT INTO public.foody_logged_users (
            id, display_name, email, phone, avatar_url, role, shop_id, shop_ids, last_login_at, created_at, updated_at
        )
        SELECT 
            fu.id, fu.display_name, fu.email, fu.phone, fu.avatar_url, new_role, 
            COALESCE(target_shop, fu.shop_id, 'shop-vrinda-main'), 
            CASE WHEN target_shop IS NOT NULL THEN jsonb_build_array(target_shop) ELSE COALESCE(fu.shop_ids, '["shop-vrinda-main"]'::jsonb) END,
            NOW(), fu.created_at, NOW()
        FROM public.foody_users fu
        WHERE fu.id = target_id OR LOWER(fu.email) = LOWER(target_id) OR fu.phone = target_id
        ON CONFLICT (id) DO UPDATE SET
            role = EXCLUDED.role,
            shop_id = EXCLUDED.shop_id,
            shop_ids = EXCLUDED.shop_ids,
            updated_at = NOW()
        RETURNING to_jsonb(foody_logged_users.*) INTO updated_record;
    END IF;

    IF updated_record IS NULL THEN
        SELECT to_jsonb(foody_users.*) INTO updated_record FROM public.foody_users WHERE id = target_id OR LOWER(email) = LOWER(target_id) OR phone = target_id LIMIT 1;
    END IF;

    -- 4. Synchronize Supabase Auth metadata if user exists in auth.users
    BEGIN
        UPDATE auth.users
        SET 
            raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role)),
            raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role))
        WHERE id::text = target_id OR LOWER(email) = LOWER(target_id);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN updated_record;
END;
$$;

-- ------------------------------------------------------------------------
-- 13. SEED INITIAL CORE ROLES & BRANCHES
-- ------------------------------------------------------------------------
INSERT INTO public.foody_shops (id, name, address, phone, coordinates, is_open, minimum_order_amount, delivery_charge, gst_percentage)
VALUES 
('shop-vrinda-main', 'Vrinda Cloud Kitchen (Main)', 'Near ISKCON Temple, Raman Reti, Vrindavan', '+91 9876543210', '{"lat": 27.5706, "lng": 77.6593}'::jsonb, true, 0, 0, 5),
('shop-prem-mandir', 'Prem Mandir Prasad Kitchen', 'Chatikara Road, Raman Reti, Vrindavan', '+91 9876543211', '{"lat": 27.5715, "lng": 77.6740}'::jsonb, true, 50, 20, 5),
('shop-banke-bihari', 'Shri Banke Bihari Dham Kitchen', 'Godowlia Marg, Vrindavan', '+91 9876543212', '{"lat": 27.5815, "lng": 77.6990}'::jsonb, true, 100, 0, 5)
ON CONFLICT (id) DO NOTHING;

-- Seed core staff into foody_users
INSERT INTO public.foody_users (id, display_name, email, phone, role, shop_id, shop_ids)
VALUES
('master_dev_108', 'Master Developer (Foody Vrinda)', 'developer@foodyvrinda.com', '9876543210', 'developer', 'shop-vrinda-main', '["shop-vrinda-main", "shop-prem-mandir", "shop-banke-bihari"]'::jsonb),
('store_owner_main', 'Vrinda Store Owner', 'owner@foodyvrinda.com', '9876543211', 'owner', 'shop-vrinda-main', '["shop-vrinda-main"]'::jsonb),
('kitchen_chef_radhe', 'Head Chef Radhe', 'chef@foodyvrinda.com', '9876543212', 'kitchen', 'shop-vrinda-main', '["shop-vrinda-main"]'::jsonb),
('rider_sarathi_gopal', 'Sarathi Gopal', 'sarathi@foodyvrinda.com', '9876543213', 'delivery', 'shop-vrinda-main', '["shop-vrinda-main", "shop-prem-mandir", "shop-banke-bihari"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    shop_id = EXCLUDED.shop_id,
    shop_ids = EXCLUDED.shop_ids;

-- Seed and copy all active members into foody_logged_users
INSERT INTO public.foody_logged_users (id, display_name, email, phone, role, shop_id, shop_ids, last_login_at, created_at, updated_at)
SELECT id, display_name, email, phone, role, shop_id, shop_ids, COALESCE(last_seen_at, NOW()), created_at, updated_at
FROM public.foody_users
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    shop_id = EXCLUDED.shop_id,
    shop_ids = EXCLUDED.shop_ids,
    updated_at = NOW();

INSERT INTO public.foody_menus (id, shop_id, name, subtitle, description, category, price, image, tag, kcal, nutrition, is_available)
VALUES
('dish-1', 'shop-vrinda-main', 'Cheese With Satvik Burger', 'Cheesy satvik, special price', 'Fresh baked artisanal whole wheat bun filled with pure paneer patty, garden crisp lettuce, heirloom tomatoes, and creamy satvik herbal cheese.', 'Snacks', 140, '/dishes/burger.png', 'Popular Choice', '260 kcal', '{"carbs": "32g", "fat": "11g", "protein": "14g", "kcal": "260 kcal"}'::jsonb, true),
('dish-2', 'shop-vrinda-main', 'Royal Vedic Thali', 'Complete nutritional Satvik platter', 'Steaming aromatic Govind Bhog rice, 4 whole wheat phulkas, Dal Makhani with desi ghee, Paneer Butter Masala, seasonal Subzi, sweet Gulab Jamun, and crisp Papad.', 'Meals', 220, '/dishes/thali.png', 'Devotee Favorite', '480 kcal', '{"carbs": "68g", "fat": "16g", "protein": "22g", "kcal": "480 kcal"}'::jsonb, true),
('dish-3', 'shop-vrinda-main', 'Kesariya Rabdi Kheer', 'Slow simmered thickened milk dessert', 'Rich Govind Bhog rice kheer infused with pure Kashmiri saffron, crushed green cardamom, roasted almond slivers, pistachios, and pure chironji.', 'Sweets & Prasad', 120, '/dishes/sweet.png', 'Sacred Prasad', '210 kcal', '{"carbs": "28g", "fat": "9g", "protein": "7g", "kcal": "210 kcal"}'::jsonb, true),
('dish-4', 'shop-vrinda-main', 'Paneer Satvik Pizza (10")', 'Crispy thin crust with desi herbs', 'Hand-tossed thin crust with fresh tomato basil coulis, diced fresh Malai paneer, bell peppers, sweet corn, and mozzarella cheese.', 'Snacks', 240, '/dishes/pizza.png', 'Chef Special', '340 kcal', '{"carbs": "42g", "fat": "14g", "protein": "18g", "kcal": "340 kcal"}'::jsonb, true),
('dish-5', 'shop-vrinda-main', 'Vrindavan Special Matka Lassi', 'Chilled sweet creamy curd', 'Traditional earthen pot churned sweet creamy curd garnished with thick malai rabdi layer, pistachios, and saffron strands.', 'Beverages', 80, '/dishes/sweet.png', 'Refreshing', '160 kcal', '{"carbs": "24g", "fat": "6g", "protein": "8g", "kcal": "160 kcal"}'::jsonb, true)
ON CONFLICT (id) DO NOTHING;


