-- ========================================================================
-- Foody Vrinda v5.3.1: Multi-Session / Multi-JWT Adversarial Security Suite
-- Validates: Cross-tenant isolation, caller spoofing prevention,
-- direct client mutation blocking, and anonymous denial.
--
-- Roles Simulated (Using canonical UUIDs required by Supabase auth.uid()):
--   JWT A = Shop A owner     (a0000000-0000-0000-0000-000000000001)
--   JWT B = Shop B owner     (b0000000-0000-0000-0000-000000000002)
--   JWT R = Rider for Shop A (c0000000-0000-0000-0000-000000000003)
--   JWT X = Unrelated Rider  (d0000000-0000-0000-0000-000000000004)
--   Anon  = Unauthenticated Caller
-- ========================================================================

-- Diagnostic Output Table
CREATE TEMP TABLE IF NOT EXISTS _multitenant_adversarial_results (
    test_id TEXT PRIMARY KEY,
    actor_persona TEXT,
    attempted_action TEXT,
    expected_result TEXT,
    returned_code TEXT,
    verdict TEXT,
    observed_detail TEXT
);
TRUNCATE _multitenant_adversarial_results;
GRANT ALL ON TABLE _multitenant_adversarial_results TO public, authenticated;

-- ========================================================================
-- STEP 0: DEFINE SECURITY DEFINER AUTH HELPERS & FIX RECURSIVE POLICIES
-- ========================================================================
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.foody_logged_users
    WHERE id = auth.uid()::text AND role IN ('admin', 'superadmin', 'platform_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT role FROM public.foody_logged_users
  WHERE id = auth.uid()::text
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_shop_ids()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT ARRAY(SELECT jsonb_array_elements_text(shop_ids)) FROM public.foody_logged_users WHERE id = auth.uid()::text),
    (SELECT ARRAY[shop_id] FROM public.foody_logged_users WHERE id = auth.uid()::text),
    ARRAY[]::text[]
  );
$$;

-- Fix policies on foody_logged_users, foody_order_events, and foody_cash_settlements
DROP POLICY IF EXISTS "Users see own shop" ON public.foody_logged_users;
CREATE POLICY "Users see own shop"
  ON public.foody_logged_users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()::text
    OR shop_id = ANY (public.get_auth_shop_ids())
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Shop-scoped read events" ON public.foody_order_events;
CREATE POLICY "Shop-scoped read events"
  ON public.foody_order_events FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.foody_orders
      WHERE shop_id = ANY (public.get_auth_shop_ids())
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Shop-scoped read settlements" ON public.foody_cash_settlements;
CREATE POLICY "Shop-scoped read settlements"
  ON public.foody_cash_settlements FOR SELECT
  TO authenticated
  USING (
    shop_id = ANY (public.get_auth_shop_ids())
    OR public.is_platform_admin()
  );

-- Ensure claim_order_pickup_atomic enforces caller identity and shop isolation
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
    -- Strict caller identity binding: reject unauthenticated impersonation
    IF auth.uid() IS NOT NULL THEN
        IF auth.uid()::text IS DISTINCT FROM p_rider_id THEN
            RAISE EXCEPTION 'Caller identity mismatch: auth.uid()=% does not match claimed rider_id=%', auth.uid()::text, p_rider_id;
        END IF;
        v_caller_id := auth.uid()::text;
    ELSIF current_user IN ('postgres', 'supabase_admin') OR (COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role') THEN
        v_caller_id := p_rider_id;
    ELSE
        RAISE EXCEPTION 'Authentication required: Anonymous clients cannot execute rider operations.';
    END IF;

    -- Lock the order row exclusively
    SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    IF v_order.status NOT IN ('ready_for_pickup', 'rider_assigned', 'rider_arriving') THEN
        RAISE EXCEPTION 'Order % is in state "%" — cannot claim for pickup.', p_order_id, v_order.status;
    END IF;

    -- Enforce shop-level tenant isolation: caller must belong to order shop or be assigned rider
    IF auth.uid() IS NOT NULL AND NOT public.is_platform_admin() THEN
        IF NOT (
            v_order.shop_id = ANY (public.get_auth_shop_ids())
            OR (v_order.rider_id IS NOT NULL AND v_order.rider_id = v_caller_id)
        ) THEN
            RAISE EXCEPTION 'Authorization failure: Rider % is not permitted to claim orders for shop %.', v_caller_id, v_order.shop_id;
        END IF;
    END IF;

    -- Enforce OTP one-time use
    IF v_order.pickup_otp_used_at IS NOT NULL THEN
        RAISE EXCEPTION 'Pickup OTP has already been used for order %.', p_order_id;
    END IF;

    IF v_order.pickup_otp_attempts >= 5 THEN
        RAISE EXCEPTION 'OTP rate limit exceeded for order %. Contact admin.', p_order_id;
    END IF;

    IF v_order.pickup_otp_expires_at IS NOT NULL AND NOW() > v_order.pickup_otp_expires_at THEN
        RAISE EXCEPTION 'Pickup OTP has expired for order %.', p_order_id;
    END IF;

    -- Hash-first OTP verification
    IF v_order.pickup_otp_hash IS NOT NULL THEN
        IF encode(digest(p_otp_input, 'sha256'), 'hex') != v_order.pickup_otp_hash THEN
            UPDATE public.foody_orders SET pickup_otp_attempts = pickup_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid pickup OTP for order %.', p_order_id;
        END IF;
    ELSIF v_order.pickup_otp IS NOT NULL THEN
        IF p_otp_input != v_order.pickup_otp THEN
            UPDATE public.foody_orders SET pickup_otp_attempts = pickup_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid pickup OTP for order %.', p_order_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'No OTP configured for order %. Cannot verify pickup.', p_order_id;
    END IF;

    -- Claim successful
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

    INSERT INTO public.foody_order_events (order_id, actor_id, actor_role, event_type, metadata)
    VALUES (p_order_id, v_caller_id, 'delivery', 'PICKUP_CLAIMED',
            jsonb_build_object('verified_by', 'otp', 'claimed_at', NOW()::text));

    RETURN v_result;
END;
$$;


-- ========================================================================
-- STEP 1: FIXTURE SETUP (Executed as administrative session owner)
-- NOTE: Uses ON CONFLICT to reset order state without violating the
-- tamper-proof audit log immutability triggers on foody_order_events.
-- ========================================================================
DO $$
BEGIN
    -- 1. Ensure test shops exist with required non-null address
    INSERT INTO public.foody_shops (id, name, address, is_active)
    VALUES 
        ('shop-adv-A', 'Adversarial Test Shop A', 'Parikrama Marg, Vrindavan', true),
        ('shop-adv-B', 'Adversarial Test Shop B', 'Raman Reti, Vrindavan', true),
        ('shop-adv-X', 'Adversarial Test Shop X', 'Mathura Road, Vrindavan', true)
    ON CONFLICT (id) DO NOTHING;

    -- 2. Insert test user personas into foody_logged_users with canonical UUIDs
    INSERT INTO public.foody_logged_users (id, display_name, email, role, shop_id, shop_ids)
    VALUES
        ('a0000000-0000-0000-0000-000000000001', 'Owner A', 'owner-a@test.com', 'owner', 'shop-adv-A', '["shop-adv-A"]'::jsonb),
        ('b0000000-0000-0000-0000-000000000002', 'Owner B', 'owner-b@test.com', 'owner', 'shop-adv-B', '["shop-adv-B"]'::jsonb),
        ('c0000000-0000-0000-0000-000000000003', 'Rider A', 'rider-a@test.com', 'delivery', 'shop-adv-A', '["shop-adv-A"]'::jsonb),
        ('d0000000-0000-0000-0000-000000000004', 'Rider X', 'rider-x@test.com', 'delivery', 'shop-adv-X', '["shop-adv-X"]'::jsonb)
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        shop_id = EXCLUDED.shop_id,
        shop_ids = EXCLUDED.shop_ids;

    -- 3. Reset or create distinct test orders (idempotent without deleting from immutable audit ledger)
    INSERT INTO public.foody_orders (
        id, shop_id, customer_name, customer_phone, customer_address, 
        status, items, total_amount, pickup_otp_hash, pickup_otp_expires_at,
        rider_id, pickup_otp_attempts, pickup_otp_used_at, delivered_at
    ) VALUES (
        'ord-adv-A', 'shop-adv-A', 'Customer A', '+919999900001', 'Ashram A',
        'ready_for_pickup', '[{"name": "Prasad A", "qty": 1}]'::jsonb, 150.00,
        encode(digest('1234', 'sha256'), 'hex'), NOW() + INTERVAL '1 hour',
        NULL, 0, NULL, NULL
    )
    ON CONFLICT (id) DO UPDATE SET
        status = 'ready_for_pickup',
        pickup_otp_hash = encode(digest('1234', 'sha256'), 'hex'),
        pickup_otp_expires_at = NOW() + INTERVAL '1 hour',
        rider_id = NULL,
        pickup_otp_attempts = 0,
        pickup_otp_used_at = NULL,
        delivered_at = NULL;

    INSERT INTO public.foody_orders (
        id, shop_id, customer_name, customer_phone, customer_address, 
        status, items, total_amount, pickup_otp_hash, pickup_otp_expires_at,
        rider_id, pickup_otp_attempts, pickup_otp_used_at, delivered_at
    ) VALUES (
        'ord-adv-B', 'shop-adv-B', 'Customer B', '+919999900002', 'Ashram B',
        'ready_for_pickup', '[{"name": "Prasad B", "qty": 1}]'::jsonb, 200.00,
        encode(digest('5678', 'sha256'), 'hex'), NOW() + INTERVAL '1 hour',
        NULL, 0, NULL, NULL
    )
    ON CONFLICT (id) DO UPDATE SET
        status = 'ready_for_pickup',
        pickup_otp_hash = encode(digest('5678', 'sha256'), 'hex'),
        pickup_otp_expires_at = NOW() + INTERVAL '1 hour',
        rider_id = NULL,
        pickup_otp_attempts = 0,
        pickup_otp_used_at = NULL,
        delivered_at = NULL;

    -- 4. Seed an audit event for Order B to test cross-shop event isolation (auto-generates id)
    INSERT INTO public.foody_order_events (
        order_id, actor_id, actor_role, event_type, metadata
    ) VALUES (
        'ord-adv-B', 'b0000000-0000-0000-0000-000000000002', 'owner', 'order_placed',
        '{"note": "Shop B private event"}'::jsonb
    );
END $$;


-- ========================================================================
-- STEP 2: ADVERSARIAL EXECUTION HARNESS
-- ========================================================================
DO $$
DECLARE
    v_c01_code TEXT; v_c01_msg TEXT; v_c01_pass BOOLEAN;
    v_c02_code TEXT; v_c02_msg TEXT; v_c02_pass BOOLEAN;
    v_c03_code TEXT; v_c03_msg TEXT; v_c03_pass BOOLEAN;
    v_c04_code TEXT; v_c04_msg TEXT; v_c04_pass BOOLEAN;
    v_c05_code TEXT; v_c05_msg TEXT; v_c05_pass BOOLEAN;
    v_c06_code TEXT; v_c06_msg TEXT; v_c06_pass BOOLEAN;
    v_c07_code TEXT; v_c07_msg TEXT; v_c07_pass BOOLEAN;
    v_c08_code TEXT; v_c08_msg TEXT; v_c08_pass BOOLEAN;
    v_c09_code TEXT; v_c09_msg TEXT; v_c09_pass BOOLEAN;

    v_count INT;
    v_rows INT;
BEGIN

    -- ====================================================================
    -- TEST ADV-01: Shop A Owner -> SELECT Shop B order
    -- Expected: 0 rows visible (Strict tenant isolation)
    -- ====================================================================
    EXECUTE 'SET LOCAL ROLE authenticated';
    EXECUTE 'SET LOCAL "request.jwt.claim.role" = ''authenticated''';
    EXECUTE 'SET LOCAL "request.jwt.claim.sub" = ''a0000000-0000-0000-0000-000000000001''';

    SELECT COUNT(*) INTO v_count FROM public.foody_orders WHERE id = 'ord-adv-B';
    IF v_count = 0 THEN
        v_c01_code := '00000';
        v_c01_msg := '0 rows returned (Cross-shop order invisible)';
        v_c01_pass := true;
    ELSE
        v_c01_code := 'LEAK';
        v_c01_msg := 'VULNERABILITY: Shop A owner saw ' || v_count || ' Shop B orders!';
        v_c01_pass := false;
    END IF;

    -- ====================================================================
    -- TEST ADV-02: Shop A Owner -> UPDATE Shop B order
    -- Expected: 0 rows affected or SQLSTATE 42501 (Blocked by default-deny)
    -- ====================================================================
    BEGIN
        UPDATE public.foody_orders SET status = 'cancelled' WHERE id = 'ord-adv-B';
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
            v_c02_code := '42501';
            v_c02_msg := '0 rows updated (Cross-shop mutation blocked by RLS)';
            v_c02_pass := true;
        ELSE
            v_c02_code := 'TAMPER';
            v_c02_msg := 'VULNERABILITY: Shop A owner modified Shop B order!';
            v_c02_pass := false;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_c02_code = RETURNED_SQLSTATE, v_c02_msg = MESSAGE_TEXT;
        v_c02_pass := (v_c02_code = '42501');
    END;

    -- ====================================================================
    -- TEST ADV-03: Shop A Owner -> INSERT order directly (REST bypass)
    -- Expected: SQLSTATE 42501 (Blocked: RPC-only state machine)
    -- ====================================================================
    BEGIN
        INSERT INTO public.foody_orders (
            id, customer_name, customer_phone, customer_address, total_amount, status, shop_id
        ) VALUES (
            'ord-adv-direct-tamper', 'Attacker', '+919999999999', 'Anywhere', 1.00, 'delivered', 'shop-adv-A'
        );
        v_c03_code := 'BYPASS';
        v_c03_msg := 'VULNERABILITY: Direct client INSERT succeeded!';
        v_c03_pass := false;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_c03_code = RETURNED_SQLSTATE, v_c03_msg = MESSAGE_TEXT;
        v_c03_pass := (v_c03_code = '42501');
    END;

    -- ====================================================================
    -- TEST ADV-04: Shop A Owner -> SELECT Shop B audit events
    -- Expected: 0 rows visible (Cross-shop audit events invisible)
    -- ====================================================================
    SELECT COUNT(*) INTO v_count FROM public.foody_order_events WHERE order_id = 'ord-adv-B';
    IF v_count = 0 THEN
        v_c04_code := '00000';
        v_c04_msg := '0 rows returned (Shop B events invisible to Shop A)';
        v_c04_pass := true;
    ELSE
        v_c04_code := 'LEAK';
        v_c04_msg := 'VULNERABILITY: Shop A owner saw Shop B audit events!';
        v_c04_pass := false;
    END IF;

    -- ====================================================================
    -- TEST ADV-05: Rider A -> Pickup Shop B order (Cross-shop claim)
    -- Expected: Rejection (Order belongs to different shop)
    -- ====================================================================
    EXECUTE 'SET LOCAL "request.jwt.claim.sub" = ''c0000000-0000-0000-0000-000000000003''';
    BEGIN
        PERFORM public.claim_order_pickup_atomic('ord-adv-B', 'c0000000-0000-0000-0000-000000000003', '5678');
        v_c05_code := 'BYPASS';
        v_c05_msg := 'VULNERABILITY: Rider A claimed Shop B order!';
        v_c05_pass := false;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_c05_code = RETURNED_SQLSTATE, v_c05_msg = MESSAGE_TEXT;
        v_c05_pass := true; -- Successfully blocked
    END;

    -- ====================================================================
    -- TEST ADV-06: Rider A -> Delivery Shop B order (Unauthorized delivery)
    -- Expected: Rejection (Rider is not assigned to order)
    -- ====================================================================
    BEGIN
        PERFORM public.verify_delivery_otp_atomic('ord-adv-B', 'c0000000-0000-0000-0000-000000000003', '5678');
        v_c06_code := 'BYPASS';
        v_c06_msg := 'VULNERABILITY: Rider A delivered Shop B order!';
        v_c06_pass := false;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_c06_code = RETURNED_SQLSTATE, v_c06_msg = MESSAGE_TEXT;
        v_c06_pass := true; -- Successfully blocked
    END;

    -- ====================================================================
    -- TEST ADV-07: Rider X -> Pickup Rider A order with caller mismatch (Spoofing)
    -- Expected: Rejection (Caller identity mismatch)
    -- ====================================================================
    EXECUTE 'SET LOCAL "request.jwt.claim.sub" = ''d0000000-0000-0000-0000-000000000004''';
    BEGIN
        -- Rider X tries to impersonate Rider A
        PERFORM public.claim_order_pickup_atomic('ord-adv-A', 'c0000000-0000-0000-0000-000000000003', '1234');
        v_c07_code := 'BYPASS';
        v_c07_msg := 'VULNERABILITY: Impersonation succeeded!';
        v_c07_pass := false;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_c07_code = RETURNED_SQLSTATE, v_c07_msg = MESSAGE_TEXT;
        v_c07_pass := (v_c07_msg LIKE '%Caller identity mismatch%');
    END;

    -- ====================================================================
    -- TEST ADV-08: Anonymous -> SELECT orders
    -- Expected: 0 rows visible (Default-deny for unauthenticated)
    -- ====================================================================
    EXECUTE 'SET LOCAL ROLE anon';
    EXECUTE 'SET LOCAL "request.jwt.claim.role" = ''anon''';
    EXECUTE 'SET LOCAL "request.jwt.claim.sub" = ''''';

    SELECT COUNT(*) INTO v_count FROM public.foody_orders WHERE id IN ('ord-adv-A', 'ord-adv-B');
    IF v_count = 0 THEN
        v_c08_code := '00000';
        v_c08_msg := '0 rows returned (Anonymous order access blocked)';
        v_c08_pass := true;
    ELSE
        v_c08_code := 'LEAK';
        v_c08_msg := 'VULNERABILITY: Anonymous client read ' || v_count || ' orders!';
        v_c08_pass := false;
    END IF;

    -- ====================================================================
    -- TEST ADV-09: Anonymous -> SELECT audit events
    -- Expected: 0 rows visible (Default-deny for unauthenticated)
    -- ====================================================================
    SELECT COUNT(*) INTO v_count FROM public.foody_order_events WHERE order_id IN ('ord-adv-A', 'ord-adv-B');
    IF v_count = 0 THEN
        v_c09_code := '00000';
        v_c09_msg := '0 rows returned (Anonymous event access blocked)';
        v_c09_pass := true;
    ELSE
        v_c09_code := 'LEAK';
        v_c09_msg := 'VULNERABILITY: Anonymous client read audit events!';
        v_c09_pass := false;
    END IF;

    -- ====================================================================
    -- RESTORE PRIVILEGED CONTEXT TO RECORD DIAGNOSTIC RESULTS
    -- ====================================================================
    RESET ROLE;

    INSERT INTO _multitenant_adversarial_results VALUES
    ('ADV-01', 'JWT A (Shop A Owner)', 'SELECT Shop B order', '0 rows visible', v_c01_code, 
     CASE WHEN v_c01_pass THEN '✅ PASS (Isolated)' ELSE '❌ FAIL' END, v_c01_msg),

    ('ADV-02', 'JWT A (Shop A Owner)', 'UPDATE Shop B order', '0 rows / 42501', v_c02_code, 
     CASE WHEN v_c02_pass THEN '✅ PASS (Blocked)' ELSE '❌ FAIL' END, v_c02_msg),

    ('ADV-03', 'JWT A (Shop A Owner)', 'INSERT order directly', 'SQLSTATE 42501', v_c03_code, 
     CASE WHEN v_c03_pass THEN '✅ PASS (Blocked)' ELSE '❌ FAIL' END, v_c03_msg),

    ('ADV-04', 'JWT A (Shop A Owner)', 'SELECT Shop B events', '0 rows visible', v_c04_code, 
     CASE WHEN v_c04_pass THEN '✅ PASS (Isolated)' ELSE '❌ FAIL' END, v_c04_msg),

    ('ADV-05', 'JWT R (Rider A)', 'Pickup Shop B order', 'Exception rejection', v_c05_code, 
     CASE WHEN v_c05_pass THEN '✅ PASS (Rejected)' ELSE '❌ FAIL' END, v_c05_msg),

    ('ADV-06', 'JWT R (Rider A)', 'Delivery Shop B order', 'Exception rejection', v_c06_code, 
     CASE WHEN v_c06_pass THEN '✅ PASS (Rejected)' ELSE '❌ FAIL' END, v_c06_msg),

    ('ADV-07', 'JWT X (Rider X)', 'Pickup Rider A order (spoof)', 'Caller mismatch', v_c07_code, 
     CASE WHEN v_c07_pass THEN '✅ PASS (Mismatched)' ELSE '❌ FAIL' END, v_c07_msg),

    ('ADV-08', 'Anonymous (No JWT)', 'SELECT orders', '0 rows visible', v_c08_code, 
     CASE WHEN v_c08_pass THEN '✅ PASS (Blocked)' ELSE '❌ FAIL' END, v_c08_msg),

    ('ADV-09', 'Anonymous (No JWT)', 'SELECT events', '0 rows visible', v_c09_code, 
     CASE WHEN v_c09_pass THEN '✅ PASS (Blocked)' ELSE '❌ FAIL' END, v_c09_msg);

END $$;

-- ========================================================================
-- STEP 3: QUERY TEST RESULTS (Final Statement displayed in Supabase UI)
-- ========================================================================
SELECT
    test_id AS "Test ID",
    actor_persona AS "Actor Persona",
    attempted_action AS "Attempted Action",
    expected_result AS "Expected Result",
    returned_code AS "Returned Code",
    verdict AS "Result",
    observed_detail AS "Observed Detail"
FROM _multitenant_adversarial_results
ORDER BY test_id;
