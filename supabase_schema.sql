-- ========================================================================
-- FOODY VRINDA - SUPABASE CLOUD DATABASE SCHEMA
-- ========================================================================

-- 1. SHOPS / CLOUD KITCHEN BRANCHES
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

-- 2. DISHES & MENU CATALOG
CREATE TABLE IF NOT EXISTS public.foody_menus (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES public.foody_shops(id) ON DELETE CASCADE,
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

-- 3. ORDERS & LIVE DISPATCH
CREATE TABLE IF NOT EXISTS public.foody_orders (
    id TEXT PRIMARY KEY,
    shop_id TEXT,
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

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.foody_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_orders ENABLE ROW LEVEL SECURITY;

-- 5. PUBLIC ACCESS POLICIES (Dev & Customer Friendly)
CREATE POLICY "Public read shops" ON public.foody_shops FOR SELECT USING (true);
CREATE POLICY "Public read menus" ON public.foody_menus FOR SELECT USING (true);
CREATE POLICY "Public read orders" ON public.foody_orders FOR SELECT USING (true);
CREATE POLICY "Public insert orders" ON public.foody_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update orders" ON public.foody_orders FOR UPDATE USING (true);

-- 6. ENABLE REALTIME ON ORDERS TABLE
ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_orders;
