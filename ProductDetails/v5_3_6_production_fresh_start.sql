-- ========================================================================
-- FOODY VRINDA v5.3.6 — PRODUCTION FRESH START & SYNTHETIC DATA PURGE
-- 1. Clears all synthetic orders and order history (Fresh clean slate)
-- 2. Safely truncates foody_order_events while maintaining audit immutability trigger
-- 3. Clears all synthetic / test notifications
-- 4. Removes adversarial and race test shops (shop-adv-*, shop-race-test)
-- 5. Removes adversarial test users (a0000000-*, rider-race-*, etc.)
-- 6. Preserves the 3 Real Production Kitchens (Vrinda Main, Prem Mandir, Banke Bihari)
-- 7. Retains authentic Satvik Prasad menus for all 3 Kitchens
-- ========================================================================

-- STEP 0: MAKE handle_updated_at EXCEPTION-SAFE & ENSURE updated_at COLUMNS EXIST
-- ------------------------------------------------------------------------
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.foody_menus ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.foody_notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        NEW.updated_at = NOW();
    EXCEPTION WHEN undefined_column THEN
        NULL;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 1: PURGE SYNTHETIC NOTIFICATIONS
-- ------------------------------------------------------------------------
TRUNCATE TABLE public.foody_notifications;

-- STEP 2: SAFELY PURGE AUDIT LEDGER & ORDERS (FRESH ORDER START)
-- ------------------------------------------------------------------------
-- Temporarily drop the tamper trigger to allow administrative purge
DROP TRIGGER IF EXISTS trg_prevent_audit_tamper ON public.foody_order_events;

-- Clear all order audit events and orders
TRUNCATE TABLE public.foody_order_events;
TRUNCATE TABLE public.foody_orders CASCADE;

-- If order_items table exists, clear it as well
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
        TRUNCATE TABLE public.order_items;
    END IF;
END $$;

-- Immediately restore the audit immutability trigger
CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Policy Violation: foody_order_events records are strictly immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_tamper
    BEFORE UPDATE OR DELETE ON public.foody_order_events
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_tampering();

-- STEP 3: REMOVE SYNTHETIC TEST USERS
-- ------------------------------------------------------------------------
DELETE FROM public.foody_logged_users
WHERE id IN (
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000004',
    'rider-race-A',
    'rider-race-B',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'test_user_1789575270526'
) OR id LIKE 'ord-race-%' OR id LIKE 'test-rider-%';

DELETE FROM public.foody_users
WHERE id IN (
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000004',
    'rider-race-A',
    'rider-race-B',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'test_user_1789575270526'
) OR id LIKE 'ord-race-%' OR id LIKE 'test-rider-%';

-- Remap any dangling users to shop-vrinda-main before shop deletion
UPDATE public.foody_logged_users
SET shop_id = 'shop-vrinda-main'
WHERE shop_id IN ('shop-adv-A', 'shop-adv-B', 'shop-adv-X', 'shop-race-test');

UPDATE public.foody_users
SET shop_id = 'shop-vrinda-main'
WHERE shop_id IN ('shop-adv-A', 'shop-adv-B', 'shop-adv-X', 'shop-race-test');

-- STEP 4: REMOVE SYNTHETIC TEST SHOPS
-- ------------------------------------------------------------------------
-- Delete test menus from test shops
DELETE FROM public.foody_menus
WHERE shop_id IN ('shop-adv-A', 'shop-adv-B', 'shop-adv-X', 'shop-race-test')
   OR id = 'dish-test-calc';

-- Delete test shops
DELETE FROM public.foody_shops
WHERE id IN ('shop-adv-A', 'shop-adv-B', 'shop-adv-X', 'shop-race-test');

-- STEP 5: VERIFY & ACTIVATE 3 PRODUCTION KITCHENS
-- ------------------------------------------------------------------------
UPDATE public.foody_shops
SET is_active = true, is_online = true, is_deleted = false
WHERE id IN ('shop-vrinda-main', 'shop-prem-mandir', 'shop-banke-bihari');

-- STEP 6: VERIFY AUTHENTIC MENUS FOR ALL 3 KITCHENS
-- ------------------------------------------------------------------------
UPDATE public.foody_menus
SET is_available = true, is_deleted = false
WHERE shop_id IN ('shop-vrinda-main', 'shop-prem-mandir', 'shop-banke-bihari');

-- STEP 7: RELOAD POSTGREST SCHEMA CACHE
-- ------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
