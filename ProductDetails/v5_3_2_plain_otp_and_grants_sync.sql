-- ========================================================================
-- FOODY VRINDA v5.3.2 — DATABASE PLAIN OTP & FUNCTION PERMISSION SYNC
-- 1. Adds transitional plaintext OTP columns to foody_orders
-- 2. Grants EXECUTE on RLS security helpers to anon & authenticated
--    (Eliminates "permission denied for function get_auth_role / is_shop_authorized")
-- 3. Reloads PostgREST schema cache
-- ========================================================================

-- Step 1: Add transitional plaintext OTP columns to foody_orders
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp TEXT;

-- Step 2: Ensure all primary cryptographic columns exist
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_hash TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_hash TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_attempts INT DEFAULT 0;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_attempts INT DEFAULT 0;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_used_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_used_at TIMESTAMPTZ;

-- Step 3: Grant EXECUTE on RLS helper functions
-- Without these grants, client queries on foody_shops & foody_menus fail with 42501 permission denied
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_shop_authorized(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_shop_ids() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_order_pickup_atomic(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_delivery_otp_atomic(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_order_hash_chain(text) TO anon, authenticated, service_role;

-- Step 4: Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
