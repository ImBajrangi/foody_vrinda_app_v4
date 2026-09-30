-- ========================================================================
-- FOODY VRINDA v5.3.1 — COMPREHENSIVE SECURITY PATCH & HARDENING
-- 1. Full Idempotent RLS Deployment (drops all legacy wildcards)
-- 2. Strict Caller Identity Binding in RPCs (blocks anonymous impersonation)
-- 3. Dedicated One-Time OTP Enforcement (pickup_otp_used_at & delivery_otp_used_at)
-- 4. Event Sequence Unique Database Invariant (prevents hash collisions)
-- 5. Hardened search_path across all functions (public, extensions, pg_temp)
-- ========================================================================

-- Step 1: Ensure pgcrypto exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 2: Schema Migrations
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_used_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_used_at TIMESTAMPTZ;
ALTER TABLE public.foody_order_events ADD COLUMN IF NOT EXISTS event_sequence INT;

-- Recreate COD difference as stored generated column
ALTER TABLE public.foody_cash_settlements DROP COLUMN IF EXISTS difference;
ALTER TABLE public.foody_cash_settlements ADD COLUMN difference NUMERIC(10,2)
  GENERATED ALWAYS AS (rider_declared_amount - expected_amount) STORED;


-- ====================================================================
-- ====================================================================
-- Step 3: Comprehensive Row-Level Security (RLS) Policies
-- ====================================================================

-- 3a. foody_orders — Role-isolated read, RPC-only mutation
ALTER TABLE public.foody_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access orders" ON public.foody_orders;
DROP POLICY IF EXISTS "Service role full access orders" ON public.foody_orders;
DROP POLICY IF EXISTS "Shop-scoped read orders" ON public.foody_orders;
DROP POLICY IF EXISTS "Shop-scoped insert orders" ON public.foody_orders;
DROP POLICY IF EXISTS "Shop-scoped update orders" ON public.foody_orders;
DROP POLICY IF EXISTS "Block Direct Client Order Insert" ON public.foody_orders;
DROP POLICY IF EXISTS "Block Direct Client Order Update" ON public.foody_orders;
DROP POLICY IF EXISTS "Strict Orders Read Policy" ON public.foody_orders;

CREATE POLICY "Service role full access orders"
  ON public.foody_orders FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Strict Orders Read Policy"
  ON public.foody_orders FOR SELECT
  TO authenticated
  USING (
    is_platform_admin() 
    OR user_id = auth.uid()::text 
    OR (get_auth_role() = ANY (ARRAY['kitchen'::text, 'owner'::text]) AND shop_id = ANY (get_auth_shop_ids()))
    OR (get_auth_role() = 'delivery'::text AND (rider_id = auth.uid()::text OR (status = 'ready_for_pickup'::text AND shop_id = ANY (get_auth_shop_ids()))))
  );
-- Note: Omission of INSERT, UPDATE, DELETE policies for 'authenticated' enforces default-deny (SQLSTATE 42501).
-- All state mutations are strictly routed through atomic SECURITY DEFINER RPCs.

-- 3b. foody_order_events — append-only via RPCs (direct client write blocked)
ALTER TABLE public.foody_order_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access order events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Insert events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Service role full access events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Shop-scoped read events" ON public.foody_order_events;

CREATE POLICY "Service role full access events"
  ON public.foody_order_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Shop-scoped read events"
  ON public.foody_order_events FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.foody_orders o
      JOIN public.foody_logged_users u ON u.shop_id = o.shop_id
      WHERE u.id = auth.uid()::text
    )
  );
-- Note: No INSERT policy for 'authenticated' role ensures direct client inserts fail with SQLSTATE 42501.

-- 3c. foody_cash_settlements — shop-scoped (wildcards removed)
ALTER TABLE public.foody_cash_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access settlements" ON public.foody_cash_settlements;
DROP POLICY IF EXISTS "Public access cash settlements" ON public.foody_cash_settlements;
DROP POLICY IF EXISTS "Service role full access settlements" ON public.foody_cash_settlements;
DROP POLICY IF EXISTS "Shop-scoped read settlements" ON public.foody_cash_settlements;

CREATE POLICY "Service role full access settlements"
  ON public.foody_cash_settlements FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Shop-scoped read settlements"
  ON public.foody_cash_settlements FOR SELECT
  TO authenticated
  USING (
    shop_id IN (
      SELECT shop_id FROM public.foody_logged_users
      WHERE id = auth.uid()::text
    )
  );

-- 3d. foody_logged_users — coworker visibility
ALTER TABLE public.foody_logged_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access logged users" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Service role full access users" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Users see own shop" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Logged Users Read Policy" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Block Direct Logged User Update" ON public.foody_logged_users;

CREATE POLICY "Service role full access users"
  ON public.foody_logged_users FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users see own shop"
  ON public.foody_logged_users FOR SELECT
  TO authenticated
  USING (
    shop_id IN (
      SELECT shop_id FROM public.foody_logged_users
      WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "Block Direct Logged User Update"
  ON public.foody_logged_users FOR UPDATE
  TO authenticated
  USING (is_auth_admin());


-- ====================================================================
-- Step 4: Event Hash Chain Trigger (search_path + unique sequence constraint)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.compute_event_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    prev_hash TEXT;
    prev_seq INT;
    payload TEXT;
BEGIN
    PERFORM 1 FROM public.foody_orders WHERE id = NEW.order_id FOR UPDATE;

    SELECT event_hash, COALESCE(event_sequence, 0) INTO prev_hash, prev_seq
    FROM public.foody_order_events
    WHERE order_id = NEW.order_id AND ctid != NEW.ctid
    ORDER BY COALESCE(event_sequence, 0) DESC, created_at DESC
    LIMIT 1;

    IF prev_hash IS NULL THEN
        prev_hash := 'GENESIS_' || NEW.order_id;
        prev_seq := 0;
    END IF;

    NEW.event_sequence := prev_seq + 1;
    NEW.previous_event_hash := prev_hash;

    payload := NEW.order_id || '|' || NEW.actor_id || '|' || NEW.actor_role || '|' || NEW.event_type || '|' || COALESCE(NEW.metadata::text, '{}') || '|' || NEW.created_at::text || '|' || prev_hash;
    NEW.event_hash := encode(digest(payload, 'sha256'), 'hex');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_event_hash ON public.foody_order_events;
CREATE TRIGGER trg_compute_event_hash
    BEFORE INSERT ON public.foody_order_events
    FOR EACH ROW EXECUTE FUNCTION public.compute_event_hash_chain();

CREATE INDEX IF NOT EXISTS idx_events_order_sequence
    ON public.foody_order_events(order_id, event_sequence DESC, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_order_sequence_unique
    ON public.foody_order_events(order_id, event_sequence);


-- ====================================================================
-- Step 5: Atomic Pickup Claim RPC (Strict Auth + One-Time OTP Check)
-- ====================================================================
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
    -- Strict caller identity binding: reject unauthenticated callers
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

    -- Verify OTP: hash-first, deprecated plaintext fallback
    IF v_order.pickup_otp_hash IS NOT NULL THEN
        IF encode(digest(p_otp_input, 'sha256'), 'hex') != v_order.pickup_otp_hash THEN
            UPDATE public.foody_orders SET pickup_otp_attempts = pickup_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid pickup OTP for order %.', p_order_id;
        END IF;
    ELSIF v_order.pickup_otp IS NOT NULL THEN
        -- Legacy plaintext fallback (DEPRECATED — scheduled for removal in v5.4)
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


-- ====================================================================
-- Step 6: Atomic Delivery OTP Verification RPC (Strict Auth + One-Time OTP Check)
-- ====================================================================
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
    -- Strict caller identity binding: reject unauthenticated callers
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

    SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    IF v_order.rider_id IS NOT NULL AND v_order.rider_id != v_caller_id THEN
        RAISE EXCEPTION 'Rider % is not assigned to order %.', v_caller_id, p_order_id;
    END IF;

    IF v_order.status NOT IN ('out_for_delivery') THEN
        RAISE EXCEPTION 'Order % is in state "%" — cannot verify delivery.', p_order_id, v_order.status;
    END IF;

    -- Enforce OTP one-time use
    IF v_order.delivery_otp_used_at IS NOT NULL THEN
        RAISE EXCEPTION 'Delivery OTP has already been used for order %.', p_order_id;
    END IF;

    IF v_order.delivery_otp_attempts >= 5 THEN
        RAISE EXCEPTION 'Delivery OTP rate limit exceeded for order %. Contact admin.', p_order_id;
    END IF;

    IF v_order.delivery_otp_expires_at IS NOT NULL AND NOW() > v_order.delivery_otp_expires_at THEN
        RAISE EXCEPTION 'Delivery OTP has expired for order %.', p_order_id;
    END IF;

    -- Verify OTP: hash-first, deprecated plaintext fallback
    IF v_order.delivery_otp_hash IS NOT NULL THEN
        IF encode(digest(p_otp_input, 'sha256'), 'hex') != v_order.delivery_otp_hash THEN
            UPDATE public.foody_orders SET delivery_otp_attempts = delivery_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid delivery OTP for order %.', p_order_id;
        END IF;
    ELSIF v_order.delivery_otp IS NOT NULL THEN
        -- Legacy plaintext fallback (DEPRECATED — scheduled for removal in v5.4)
        IF p_otp_input != v_order.delivery_otp THEN
            UPDATE public.foody_orders SET delivery_otp_attempts = delivery_otp_attempts + 1 WHERE id = p_order_id;
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


-- ====================================================================
-- Step 7: Hash Chain Verification RPC (Deterministic sequence ordering)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.verify_order_hash_chain(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_event RECORD;
    v_prev_hash TEXT;
    v_expected_hash TEXT;
    v_payload TEXT;
    v_count INT := 0;
    v_broken_at TEXT := NULL;
BEGIN
    v_prev_hash := 'GENESIS_' || p_order_id;

    FOR v_event IN
        SELECT * FROM public.foody_order_events
        WHERE order_id = p_order_id
        ORDER BY COALESCE(event_sequence, 0) ASC, created_at ASC
    LOOP
        v_count := v_count + 1;

        IF v_event.previous_event_hash IS DISTINCT FROM v_prev_hash THEN
            v_broken_at := COALESCE(v_event.id, 'event_' || v_count);
            EXIT;
        END IF;

        v_payload := v_event.order_id || '|' || v_event.actor_id || '|' || v_event.actor_role || '|' || v_event.event_type || '|' || COALESCE(v_event.metadata::text, '{}') || '|' || v_event.created_at::text || '|' || v_prev_hash;
        v_expected_hash := encode(digest(v_payload, 'sha256'), 'hex');

        IF v_event.event_hash != v_expected_hash THEN
            v_broken_at := COALESCE(v_event.id, 'event_' || v_count);
            EXIT;
        END IF;

        v_prev_hash := v_event.event_hash;
    END LOOP;

    RETURN jsonb_build_object(
        'order_id', p_order_id,
        'total_events', v_count,
        'chain_valid', (v_broken_at IS NULL),
        'broken_at_event_id', v_broken_at
    );
END;
$$;


-- ====================================================================
-- Verification Query: Inspect RLS Policies
-- ====================================================================
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('foody_orders', 'foody_order_events', 'foody_cash_settlements', 'foody_logged_users')
ORDER BY tablename, policyname;
