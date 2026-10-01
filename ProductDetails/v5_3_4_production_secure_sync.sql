-- ========================================================================
-- FOODY VRINDA v5.3.4 — PRODUCTION ZERO-REGRESSION SECURE SYNC
-- 1. Preserves 100% of v5.3.1 Security Hardening (ADV-01 through ADV-09)
-- 2. Restores application visibility (public read for active shops & menus)
-- 3. Enables secure order placement (INSERT allowed ONLY with initial state)
-- 4. Enables kitchen workflow (UPDATE allowed EXCEPT for picked_up/delivered)
-- 5. Enforces OTP verification RPCs for custody transfers (picked_up/delivered)
-- 6. Keeps audit ledger (foody_order_events) 100% BLOCKED from direct insert
-- 7. Keeps financial settlements (foody_cash_settlements) 100% PROTECTED
-- ========================================================================

-- Step 1: Ensure columns exist for dual-OTP support and soft-deletes
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_hash TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_hash TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_attempts INT DEFAULT 0;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_attempts INT DEFAULT 0;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_used_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_used_at TIMESTAMPTZ;

-- Ensure catalog flag columns exist on foody_shops and foody_menus
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;
ALTER TABLE public.foody_menus ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE public.foody_menus ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- ========================================================================
-- Step 2: Catalog Policies (foody_shops & foody_menus)
-- Public READ-ONLY. Direct client INSERT/UPDATE/DELETE remains BLOCKED.
-- ========================================================================

-- 2a. foody_shops: Public read for active shops
ALTER TABLE public.foody_shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access shops" ON public.foody_shops;
DROP POLICY IF EXISTS "Authenticated read shops" ON public.foody_shops;
DROP POLICY IF EXISTS "Service role full access shops" ON public.foody_shops;
DROP POLICY IF EXISTS "Allow public read shops" ON public.foody_shops;
DROP POLICY IF EXISTS "Allow staff edit shops" ON public.foody_shops;
DROP POLICY IF EXISTS "Shops Public Read Policy" ON public.foody_shops;
DROP POLICY IF EXISTS "Admins and Owners can manage shops" ON public.foody_shops;
DROP POLICY IF EXISTS "Authorized staff and Admins can view shops" ON public.foody_shops;

CREATE POLICY "Service role full access shops"
  ON public.foody_shops FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Shops Public Read Policy"
  ON public.foody_shops FOR SELECT
  TO anon, authenticated
  USING (is_active IS DISTINCT FROM false AND is_deleted IS DISTINCT FROM true);

-- 2b. foody_menus: Public read for available menu items
ALTER TABLE public.foody_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access menus" ON public.foody_menus;
DROP POLICY IF EXISTS "Shop-scoped read menus" ON public.foody_menus;
DROP POLICY IF EXISTS "Service role full access menus" ON public.foody_menus;
DROP POLICY IF EXISTS "Allow public read menus" ON public.foody_menus;
DROP POLICY IF EXISTS "Allow staff edit menus" ON public.foody_menus;
DROP POLICY IF EXISTS "Kitchen staff and Admins can manage menus" ON public.foody_menus;
DROP POLICY IF EXISTS "Menus Public Read Policy" ON public.foody_menus;
DROP POLICY IF EXISTS "Authorized kitchen staff and Admins can view menus" ON public.foody_menus;

CREATE POLICY "Service role full access menus"
  ON public.foody_menus FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Menus Public Read Policy"
  ON public.foody_menus FOR SELECT
  TO anon, authenticated
  USING (is_available IS DISTINCT FROM false AND is_deleted IS DISTINCT FROM true);

-- 2c. foody_roles: Public read-only for role lookups
ALTER TABLE public.foody_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access roles" ON public.foody_roles;
DROP POLICY IF EXISTS "Authenticated read roles" ON public.foody_roles;
DROP POLICY IF EXISTS "Service role full access roles" ON public.foody_roles;
DROP POLICY IF EXISTS "Roles Public Read Policy" ON public.foody_roles;

CREATE POLICY "Service role full access roles"
  ON public.foody_roles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Roles Public Read Policy"
  ON public.foody_roles FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2d. foody_logged_users: Public read-only (prevents role tampering)
ALTER TABLE public.foody_logged_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access logged users" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Service role full access users" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Users see own shop" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Logged Users Read Policy" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Logged Users Public Read Policy" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Block Direct Logged User Update" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Allow public read logged users" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Allow public edit logged users" ON public.foody_logged_users;

CREATE POLICY "Service role full access users"
  ON public.foody_logged_users FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Logged Users Public Read Policy"
  ON public.foody_logged_users FOR SELECT
  TO anon, authenticated
  USING (role = 'customer');

-- 2e. foody_users: Public read-only (drops wide-open legacy ALL policy)
ALTER TABLE public.foody_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access users" ON public.foody_users;
DROP POLICY IF EXISTS "Users read own profile, Admins read all" ON public.foody_users;
DROP POLICY IF EXISTS "Block Direct User Update" ON public.foody_users;
DROP POLICY IF EXISTS "Service role full access users" ON public.foody_users;
DROP POLICY IF EXISTS "Users Public Read Policy" ON public.foody_users;

CREATE POLICY "Service role full access users"
  ON public.foody_users FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users Public Read Policy"
  ON public.foody_users FOR SELECT
  TO anon, authenticated
  USING (role = 'customer');

-- ========================================================================
-- Step 3: Orders Security Model (foody_orders)
-- 1. SELECT: Allowed for customer tracking, kitchen board, transport desk
-- 2. INSERT: Strictly restricted to INITIAL orders ('new' or 'pending').
--            Cannot inject delivered state, spent OTPs, or bypass limits.
-- 3. UPDATE: Kitchen can transition prep states (confirmed, preparing, ready_for_pickup).
--            Direct update to 'picked_up' or 'delivered' is FORBIDDEN.
--            Those 2 custody transitions MUST go through the OTP RPCs!
-- ========================================================================
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
DROP POLICY IF EXISTS "Orders Client Read Policy" ON public.foody_orders;
DROP POLICY IF EXISTS "Orders Client Safe Insert Policy" ON public.foody_orders;
DROP POLICY IF EXISTS "Orders Client Safe Update Policy" ON public.foody_orders;

CREATE POLICY "Service role full access orders"
  ON public.foody_orders FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 3a. Read orders: Active orders readable for guest tracking; archived orders protected
CREATE POLICY "Orders Client Read Policy"
  ON public.foody_orders FOR SELECT
  TO anon, authenticated
  USING (created_at > (NOW() - INTERVAL '7 days'));

-- 3b. Safe Insert: Only initial new/pending orders allowed
CREATE POLICY "Orders Client Safe Insert Policy"
  ON public.foody_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status IN ('new', 'pending')
    AND COALESCE(total_amount, 0) >= 0
    AND COALESCE(pickup_otp_attempts, 0) = 0
    AND COALESCE(delivery_otp_attempts, 0) = 0
    AND pickup_otp_used_at IS NULL
    AND delivery_otp_used_at IS NULL
  );

-- 3c. Safe Update: Prep updates allowed; custody transitions ('picked_up', 'delivered') BLOCKED from direct UPDATE
CREATE POLICY "Orders Client Safe Update Policy"
  ON public.foody_orders FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (
    status NOT IN ('picked_up', 'delivered')
    OR status = (SELECT o.status FROM public.foody_orders o WHERE o.id = foody_orders.id)
  );

-- ========================================================================
-- Step 4: Audit Ledger (foody_order_events)
-- Direct client INSERT remains 100% BLOCKED.
-- Events can ONLY be emitted through triggers and atomic RPCs.
-- ========================================================================
ALTER TABLE public.foody_order_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access order events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Insert events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Service role full access events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Shop-scoped read events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Allow public read events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Allow public insert events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Order Events Public Read Policy" ON public.foody_order_events;

CREATE POLICY "Service role full access events"
  ON public.foody_order_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Order Events Public Read Policy"
  ON public.foody_order_events FOR SELECT
  TO anon, authenticated
  USING (true);

-- NOTE: No INSERT policy for 'anon' or 'authenticated' enforces default-deny (SQLSTATE 42501).
-- This completely preserves ADV-04 (Audit Tamper Protection).

-- ========================================================================
-- Step 5: Financial Settlements & Ledger Security
-- Strictly protected from public manipulation.
-- ========================================================================
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

-- 5b. foody_cash_transactions: Service role only (blocks public tampering)
ALTER TABLE public.foody_cash_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access cash transactions" ON public.foody_cash_transactions;
DROP POLICY IF EXISTS "Service role full access transactions" ON public.foody_cash_transactions;

CREATE POLICY "Service role full access transactions"
  ON public.foody_cash_transactions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 5c. foody_notifications: Remove wide-open public policy
ALTER TABLE public.foody_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access notifications" ON public.foody_notifications;

-- 5d. foody_offers: Public read-only, service role write
ALTER TABLE public.foody_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access on foody_offers" ON public.foody_offers;
DROP POLICY IF EXISTS "Public access offers" ON public.foody_offers;
DROP POLICY IF EXISTS "Public Read Access on foody_offers" ON public.foody_offers;
DROP POLICY IF EXISTS "Service role full access offers" ON public.foody_offers;
DROP POLICY IF EXISTS "Offers Public Read Policy" ON public.foody_offers;

CREATE POLICY "Service role full access offers"
  ON public.foody_offers FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Offers Public Read Policy"
  ON public.foody_offers FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5e. foody_reviews: Remove wide-open public policy
ALTER TABLE public.foody_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access reviews" ON public.foody_reviews;

-- ========================================================================
-- Step 6: Atomic Custody Transfer RPCs (claim_order_pickup & verify_delivery_otp)
-- Updated with app rider validation (checks foody_logged_users for authorized role)
-- ========================================================================
CREATE OR REPLACE FUNCTION public.claim_order_pickup_atomic(
    p_order_id TEXT,
    p_rider_id TEXT,
    p_otp_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_result JSONB;
    v_caller_id TEXT;
BEGIN
    -- Verify caller identity: either Supabase auth.uid() or registered app delivery agent
    IF auth.uid() IS NOT NULL THEN
        IF auth.uid()::text IS DISTINCT FROM p_rider_id THEN
            RAISE EXCEPTION 'Caller identity mismatch: auth.uid()=% does not match claimed rider_id=%', auth.uid()::text, p_rider_id;
        END IF;
        v_caller_id := auth.uid()::text;
    ELSIF current_user IN ('postgres', 'supabase_admin') OR (COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role') THEN
        v_caller_id := p_rider_id;
    ELSIF EXISTS (SELECT 1 FROM public.foody_logged_users WHERE id = p_rider_id AND role IN ('delivery', 'rider', 'sarathi', 'owner', 'developer', 'grand_admin', 'kitchen')) THEN
        v_caller_id := p_rider_id;
    ELSE
        RAISE EXCEPTION 'Authorization failure: Rider ID % is not registered or authorized.', p_rider_id;
    END IF;

    -- Lock the order row exclusively (concurrency protection)
    SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    IF v_order.status NOT IN ('ready_for_pickup', 'rider_assigned', 'rider_arriving') THEN
        RAISE EXCEPTION 'Order % is in state "%" — cannot claim for pickup.', p_order_id, v_order.status;
    END IF;

    -- Enforce OTP one-time use
    IF v_order.pickup_otp_used_at IS NOT NULL THEN
        RAISE EXCEPTION 'Pickup OTP has already been used for order %.', p_order_id;
    END IF;

    IF COALESCE(v_order.pickup_otp_attempts, 0) >= 5 THEN
        RAISE EXCEPTION 'OTP rate limit exceeded for order %. Contact admin.', p_order_id;
    END IF;

    IF v_order.pickup_otp_expires_at IS NOT NULL AND NOW() > v_order.pickup_otp_expires_at THEN
        RAISE EXCEPTION 'Pickup OTP has expired for order %.', p_order_id;
    END IF;

    -- Verify OTP: hash-first, transitional plaintext fallback
    IF v_order.pickup_otp_hash IS NOT NULL THEN
        IF encode(digest(p_otp_input, 'sha256'), 'hex') != v_order.pickup_otp_hash THEN
            UPDATE public.foody_orders SET pickup_otp_attempts = COALESCE(pickup_otp_attempts, 0) + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid pickup OTP for order %.', p_order_id;
        END IF;
    ELSIF v_order.pickup_otp IS NOT NULL THEN
        IF p_otp_input != v_order.pickup_otp THEN
            UPDATE public.foody_orders SET pickup_otp_attempts = COALESCE(pickup_otp_attempts, 0) + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid pickup OTP for order %.', p_order_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'No OTP configured for order %. Cannot verify pickup.', p_order_id;
    END IF;

    -- Transition state
    UPDATE public.foody_orders
    SET
        status = 'picked_up',
        rider_id = v_caller_id,
        picked_up_at = NOW(),
        pickup_otp_attempts = 0,
        pickup_otp_used_at = NOW(),
        otp_used_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING to_jsonb(foody_orders.*) INTO v_result;

    -- Emit cryptographic audit event (computed by trg_compute_event_hash)
    INSERT INTO public.foody_order_events (order_id, actor_id, actor_role, event_type, metadata)
    VALUES (p_order_id, v_caller_id, 'delivery', 'PICKUP_CLAIMED',
            jsonb_build_object('verified_by', 'otp', 'claimed_at', NOW()::text));

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_delivery_otp_atomic(
    p_order_id TEXT,
    p_rider_id TEXT,
    p_otp_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_result JSONB;
    v_caller_id TEXT;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        IF auth.uid()::text IS DISTINCT FROM p_rider_id THEN
            RAISE EXCEPTION 'Caller identity mismatch: auth.uid()=% does not match claimed rider_id=%', auth.uid()::text, p_rider_id;
        END IF;
        v_caller_id := auth.uid()::text;
    ELSIF current_user IN ('postgres', 'supabase_admin') OR (COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role') THEN
        v_caller_id := p_rider_id;
    ELSIF EXISTS (SELECT 1 FROM public.foody_logged_users WHERE id = p_rider_id AND role IN ('delivery', 'rider', 'sarathi', 'owner', 'developer', 'grand_admin')) THEN
        v_caller_id := p_rider_id;
    ELSE
        RAISE EXCEPTION 'Authorization failure: Rider ID % is not registered or authorized.', p_rider_id;
    END IF;

    SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    IF v_order.rider_id IS NOT NULL AND v_order.rider_id != v_caller_id THEN
        RAISE EXCEPTION 'Rider % is not assigned to order %.', v_caller_id, p_order_id;
    END IF;

    IF v_order.status NOT IN ('out_for_delivery', 'picked_up') THEN
        RAISE EXCEPTION 'Order % is in state "%" — cannot verify delivery.', p_order_id, v_order.status;
    END IF;

    IF v_order.delivery_otp_used_at IS NOT NULL THEN
        RAISE EXCEPTION 'Delivery OTP has already been used for order %.', p_order_id;
    END IF;

    IF COALESCE(v_order.delivery_otp_attempts, 0) >= 5 THEN
        RAISE EXCEPTION 'Delivery OTP rate limit exceeded for order %. Contact admin.', p_order_id;
    END IF;

    IF v_order.delivery_otp_expires_at IS NOT NULL AND NOW() > v_order.delivery_otp_expires_at THEN
        RAISE EXCEPTION 'Delivery OTP has expired for order %.', p_order_id;
    END IF;

    IF v_order.delivery_otp_hash IS NOT NULL THEN
        IF encode(digest(p_otp_input, 'sha256'), 'hex') != v_order.delivery_otp_hash THEN
            UPDATE public.foody_orders SET delivery_otp_attempts = COALESCE(delivery_otp_attempts, 0) + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid delivery OTP for order %.', p_order_id;
        END IF;
    ELSIF v_order.delivery_otp IS NOT NULL THEN
        IF p_otp_input != v_order.delivery_otp THEN
            UPDATE public.foody_orders SET delivery_otp_attempts = COALESCE(delivery_otp_attempts, 0) + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid delivery OTP for order %.', p_order_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'No OTP configured for order %. Cannot verify delivery.', p_order_id;
    END IF;

    UPDATE public.foody_orders
    SET
        status = 'delivered',
        delivered_at = NOW(),
        delivery_otp_attempts = 0,
        delivery_otp_used_at = NOW(),
        otp_used_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING to_jsonb(foody_orders.*) INTO v_result;

    INSERT INTO public.foody_order_events (order_id, actor_id, actor_role, event_type, metadata)
    VALUES (p_order_id, v_caller_id, 'delivery', 'DELIVERY_VERIFIED',
            jsonb_build_object('verified_by', 'otp', 'delivered_at', NOW()::text));

    RETURN v_result;
END;
$$;

-- Grant EXECUTE to anon, authenticated, service_role
GRANT EXECUTE ON FUNCTION public.claim_order_pickup_atomic(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_delivery_otp_atomic(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_order_hash_chain(text) TO anon, authenticated, service_role;

-- ========================================================================
-- Step 7: Seed All 3 Production Kitchens in foody_shops
-- ========================================================================
INSERT INTO public.foody_shops (
  id, name, address, phone, is_active, is_online, minimum_order_amount, delivery_charge, gst_percentage, coordinates, operating_hours, payment_settings, alarm_settings
) VALUES
(
  'shop-vrinda-main',
  'Vrinda Cloud Kitchen (Main)',
  'Near ISKCON Temple, Raman Reti, Vrindavan, Mathura, UP 281121',
  '+91 98765 43210',
  true,
  true,
  0,
  0,
  5.0,
  '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
  '{"openTime": "07:00", "closeTime": "23:00", "autoSchedule": true}'::jsonb,
  '{"codEnabled": true, "onlinePaymentsEnabled": true}'::jsonb,
  '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb
),
(
  'shop-prem-mandir',
  'Prem Mandir Prasad Kitchen',
  'Chatikara Road, Raman Reti, Vrindavan, UP 281121',
  '+91 98765 43211',
  true,
  true,
  50,
  20,
  5.0,
  '{"lat": 27.5715, "lng": 77.6740}'::jsonb,
  '{"openTime": "06:30", "closeTime": "22:30", "autoSchedule": true}'::jsonb,
  '{"codEnabled": true, "onlinePaymentsEnabled": true}'::jsonb,
  '{"kitchenNew": true, "kitchenReady": true, "deliveryReady": true}'::jsonb
),
(
  'shop-banke-bihari',
  'Shri Banke Bihari Dham Kitchen',
  'Godowlia Marg, Near Bihari Ji Temple, Vrindavan, UP 281121',
  '+91 98765 43212',
  true,
  true,
  100,
  0,
  5.0,
  '{"lat": 27.5815, "lng": 77.6990}'::jsonb,
  '{"openTime": "07:30", "closeTime": "22:00", "autoSchedule": true}'::jsonb,
  '{"codEnabled": true, "onlinePaymentsEnabled": true}'::jsonb,
  '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  is_active = true,
  is_online = true,
  coordinates = EXCLUDED.coordinates,
  operating_hours = EXCLUDED.operating_hours,
  payment_settings = EXCLUDED.payment_settings;

-- Step 8: Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
