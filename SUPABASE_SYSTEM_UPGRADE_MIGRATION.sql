-- ========================================================================
-- FOODY VRINDA - COMPLETE SYSTEM UPGRADE MIGRATION (SUPABASE POSTGRESQL)
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ========================================================================

-- 1. Ensure UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Update `foody_users` Table Columns (Trust Score, Cash In Hand, Address)
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS trust_score INT DEFAULT 750;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS cibil_score INT DEFAULT 750;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS cash_in_hand NUMERIC DEFAULT 0;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS unsettled_debt NUMERIC DEFAULT 0;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Update `foody_logged_users` Table Columns (Profiles & Trust System)
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS trust_score INT DEFAULT 750;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS cibil_score INT DEFAULT 750;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS cash_in_hand NUMERIC DEFAULT 0;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS unsettled_debt NUMERIC DEFAULT 0;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Update `foody_orders` Table Columns (Dual OTPs, Chef, Fulfillment)
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS fulfillment_type TEXT DEFAULT 'delivery';
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS chef_id TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS chef_name TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_id TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_name TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_phone TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_rating TEXT DEFAULT '5.0';
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_avatar TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS cooking_notes TEXT DEFAULT '';
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS cash_status TEXT DEFAULT 'pending';

-- 5. Create / Update `foody_reviews` Table for Multi-Staff Feedback
CREATE TABLE IF NOT EXISTS public.foody_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT,
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    customer_name TEXT DEFAULT 'Devotee Customer',
    rating NUMERIC NOT NULL DEFAULT 5,
    tags JSONB DEFAULT '[]'::jsonb,
    comment TEXT,
    chef_feedback JSONB DEFAULT '{}'::jsonb,
    rider_feedback JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foody_reviews ADD COLUMN IF NOT EXISTS chef_feedback JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.foody_reviews ADD COLUMN IF NOT EXISTS rider_feedback JSONB DEFAULT '{}'::jsonb;

-- 6. Create Daily COD Cash Settlement Audit Table
CREATE TABLE IF NOT EXISTS public.foody_cash_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id TEXT NOT NULL,
    shop_id TEXT NOT NULL,
    expected_amount NUMERIC NOT NULL DEFAULT 0,
    received_amount NUMERIC NOT NULL DEFAULT 0,
    difference NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'full_settlement',
    settled_by TEXT DEFAULT 'Shopkeeper',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Row Level Security & Open Access Policies
ALTER TABLE public.foody_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access reviews" ON public.foody_reviews;
CREATE POLICY "Public access reviews" ON public.foody_reviews FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_cash_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access settlements" ON public.foody_cash_settlements;
CREATE POLICY "Public access settlements" ON public.foody_cash_settlements FOR ALL USING (true) WITH CHECK (true);

-- 8. Enable Realtime Publications
DO $$ BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_reviews; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_settlements; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_logged_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 9. Force Reload PostgREST API Cache
NOTIFY pgrst, 'reload schema';
