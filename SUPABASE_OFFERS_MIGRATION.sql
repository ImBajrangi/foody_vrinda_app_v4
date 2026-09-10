-- ========================================================================
-- FOODY VRINDA: SUPABASE OFFERS & PROMO CODES TABLE MIGRATION
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
--
-- PURPOSE:
-- 1. Creates public.foody_offers table for real-time promotions and coupons.
-- 2. Seeds standard Vrindavan discount codes (RADHE108, VRINDA50, DEVOTEE15, etc.).
-- 3. Enables Row Level Security (RLS) with public read access.
-- 4. Reloads PostgREST schema cache to eliminate 404 resource errors.
-- ========================================================================

-- STEP 1: Create foody_offers Table
CREATE TABLE IF NOT EXISTS public.foody_offers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT,
    discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'flat')),
    discount_value NUMERIC NOT NULL DEFAULT 0,
    min_order_amount NUMERIC NOT NULL DEFAULT 0,
    max_discount NUMERIC DEFAULT 0,
    shop_id TEXT DEFAULT 'all',
    tag TEXT DEFAULT 'Special Offer',
    is_active BOOLEAN DEFAULT true,
    valid_until TIMESTAMPTZ DEFAULT '2028-12-31 23:59:59+00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update trigger for updated_at
DROP TRIGGER IF EXISTS trg_foody_offers_updated_at ON public.foody_offers;
CREATE TRIGGER trg_foody_offers_updated_at
    BEFORE UPDATE ON public.foody_offers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- STEP 2: Enable Row Level Security (RLS) & Public Policies
ALTER TABLE public.foody_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access on foody_offers" ON public.foody_offers;
CREATE POLICY "Public Read Access on foody_offers"
    ON public.foody_offers FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public Insert/Update/Delete on foody_offers" ON public.foody_offers;
CREATE POLICY "Public Insert/Update/Delete on foody_offers"
    ON public.foody_offers FOR ALL
    USING (true)
    WITH CHECK (true);

-- STEP 3: Seed Official Foody Vrinda Promo Codes
INSERT INTO public.foody_offers (
    id, code, title, subtitle, discount_type, discount_value, min_order_amount, max_discount, shop_id, tag, is_active, valid_until
) VALUES
    ('offer-radhe108', 'RADHE108', 'Radhe Radhe Welcome Blessing', 'Flat ₹108 discount on your sacred satvik prasad orders above ₹299', 'flat', 108, 299, 108, 'all', 'Bestseller', true, '2028-12-31 23:59:59+00'),
    ('offer-vrinda50', 'VRINDA50', 'Vrinda Festival Prasad 50% OFF', '50% off up to ₹150 on your family feast thali box', 'percentage', 50, 199, 150, 'all', 'Trending', true, '2028-12-31 23:59:59+00'),
    ('offer-devotee15', 'DEVOTEE15', 'Devotee Divine Privilege', '15% instant savings on every item with no minimum limit', 'percentage', 15, 0, 100, 'all', 'Popular', true, '2028-12-31 23:59:59+00'),
    ('offer-mahaprasad', 'MAHAPRASAD', 'Maha Prasad Free Delivery & Flat ₹50', 'Flat ₹50 discount on authentic temple bhog collections', 'flat', 50, 149, 50, 'all', 'Recommended', true, '2028-12-31 23:59:59+00'),
    ('offer-festival20', 'FESTIVAL20', 'Brij Dham Mahotsav 20% OFF', '20% discount on combo packs and desserts', 'percentage', 20, 249, 120, 'all', 'Limited Time', true, '2028-12-31 23:59:59+00')
ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    min_order_amount = EXCLUDED.min_order_amount,
    max_discount = EXCLUDED.max_discount,
    is_active = EXCLUDED.is_active,
    valid_until = EXCLUDED.valid_until,
    updated_at = NOW();

-- STEP 4: Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
