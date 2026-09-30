-- ========================================================================
-- FOODY VRINDA v5.2 — DEPLOY MISSING RPCs + FIX SCHEMA GAPS
-- Run this BEFORE re-running the test suite
-- ========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- FIX: foody_cash_settlements missing columns
-- ====================================================================
ALTER TABLE public.foody_cash_settlements ADD COLUMN IF NOT EXISTS order_id TEXT REFERENCES public.foody_orders(id) ON DELETE RESTRICT;
ALTER TABLE public.foody_cash_settlements ADD COLUMN IF NOT EXISTS cash_received_from_customer NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.foody_cash_settlements ADD COLUMN IF NOT EXISTS change_returned_to_customer NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.foody_cash_settlements ADD COLUMN IF NOT EXISTS declared_by TEXT;

-- Generated columns must be added only if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='foody_cash_settlements' AND column_name='net_collected') THEN
    ALTER TABLE public.foody_cash_settlements ADD COLUMN net_collected NUMERIC(10,2) GENERATED ALWAYS AS (cash_received_from_customer - change_returned_to_customer) STORED;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='foody_cash_settlements' AND column_name='difference') THEN
    ALTER TABLE public.foody_cash_settlements ADD COLUMN difference NUMERIC(10,2) GENERATED ALWAYS AS (rider_declared_amount - expected_amount) STORED;
  END IF;
END $$;


-- ====================================================================
-- FIX: foody_orders missing OTP columns
-- ====================================================================
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_hash TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_attempts INT DEFAULT 0;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_hash TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_attempts INT DEFAULT 0;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS otp_used_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_id TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;


-- ====================================================================
-- RPC 1: claim_order_pickup_atomic
-- Atomic pickup claim with FOR UPDATE lock, OTP verify, rate limiting
-- ====================================================================
CREATE OR REPLACE FUNCTION public.claim_order_pickup_atomic(
    p_order_id TEXT,
    p_rider_id TEXT,
    p_otp_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_result JSONB;
BEGIN
    -- Lock the order row exclusively
    SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;
    
    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    -- Check order is in correct state for pickup
    IF v_order.status NOT IN ('ready_for_pickup', 'rider_assigned', 'rider_arriving') THEN
        RAISE EXCEPTION 'Order % is in state "%" — cannot claim for pickup.', p_order_id, v_order.status;
    END IF;

    -- Rate limit: max 5 OTP attempts
    IF v_order.pickup_otp_attempts >= 5 THEN
        RAISE EXCEPTION 'OTP rate limit exceeded for order %. Contact admin.', p_order_id;
    END IF;

    -- Check OTP expiry
    IF v_order.pickup_otp_expires_at IS NOT NULL AND NOW() > v_order.pickup_otp_expires_at THEN
        RAISE EXCEPTION 'Pickup OTP has expired for order %.', p_order_id;
    END IF;

    -- Verify OTP: compare hash if hash exists, otherwise compare plaintext
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
    END IF;

    -- Claim successful: update order atomically
    UPDATE public.foody_orders
    SET 
        status = 'picked_up',
        rider_id = p_rider_id,
        picked_up_at = NOW(),
        pickup_otp_attempts = 0,
        otp_used_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING to_jsonb(foody_orders.*) INTO v_result;

    -- Log audit event
    INSERT INTO public.foody_order_events (order_id, actor_id, actor_role, event_type, metadata)
    VALUES (p_order_id, p_rider_id, 'delivery', 'PICKUP_CLAIMED', jsonb_build_object('verified_by', 'otp', 'claimed_at', NOW()::text));

    RETURN v_result;
END;
$$;


-- ====================================================================
-- RPC 2: verify_delivery_otp_atomic
-- Atomic delivery confirmation with FOR UPDATE lock, rider ownership check
-- ====================================================================
CREATE OR REPLACE FUNCTION public.verify_delivery_otp_atomic(
    p_order_id TEXT,
    p_rider_id TEXT,
    p_otp_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_result JSONB;
BEGIN
    -- Lock the order row exclusively
    SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;
    
    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    -- Verify rider owns this delivery
    IF v_order.rider_id IS NOT NULL AND v_order.rider_id != p_rider_id THEN
        RAISE EXCEPTION 'Rider % is not assigned to order %.', p_rider_id, p_order_id;
    END IF;

    -- Check order is in correct state for delivery
    IF v_order.status NOT IN ('out_for_delivery') THEN
        RAISE EXCEPTION 'Order % is in state "%" — cannot verify delivery.', p_order_id, v_order.status;
    END IF;

    -- Rate limit: max 5 OTP attempts
    IF v_order.delivery_otp_attempts >= 5 THEN
        RAISE EXCEPTION 'Delivery OTP rate limit exceeded for order %. Contact admin.', p_order_id;
    END IF;

    -- Check OTP expiry
    IF v_order.delivery_otp_expires_at IS NOT NULL AND NOW() > v_order.delivery_otp_expires_at THEN
        RAISE EXCEPTION 'Delivery OTP has expired for order %.', p_order_id;
    END IF;

    -- Verify OTP: compare hash if hash exists, otherwise compare plaintext
    IF v_order.delivery_otp_hash IS NOT NULL THEN
        IF encode(digest(p_otp_input, 'sha256'), 'hex') != v_order.delivery_otp_hash THEN
            UPDATE public.foody_orders SET delivery_otp_attempts = delivery_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid delivery OTP for order %.', p_order_id;
        END IF;
    ELSIF v_order.delivery_otp IS NOT NULL THEN
        IF p_otp_input != v_order.delivery_otp THEN
            UPDATE public.foody_orders SET delivery_otp_attempts = delivery_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid delivery OTP for order %.', p_order_id;
        END IF;
    END IF;

    -- Delivery confirmed: update order atomically
    UPDATE public.foody_orders
    SET 
        status = 'delivered',
        delivered_at = NOW(),
        delivery_otp_attempts = 0,
        otp_used_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING to_jsonb(foody_orders.*) INTO v_result;

    -- Log audit event
    INSERT INTO public.foody_order_events (order_id, actor_id, actor_role, event_type, metadata)
    VALUES (p_order_id, p_rider_id, 'delivery', 'DELIVERY_VERIFIED', jsonb_build_object('verified_by', 'otp', 'delivered_at', NOW()::text));

    RETURN v_result;
END;
$$;


-- ====================================================================
-- RPC 3: verify_order_hash_chain
-- Audits the cryptographic integrity of an order's event chain
-- ====================================================================
CREATE OR REPLACE FUNCTION public.verify_order_hash_chain(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
        ORDER BY created_at ASC
    LOOP
        v_count := v_count + 1;

        -- Verify previous_event_hash matches expected
        IF v_event.previous_event_hash IS DISTINCT FROM v_prev_hash THEN
            v_broken_at := COALESCE(v_event.id, 'event_' || v_count);
            EXIT;
        END IF;

        -- Recompute hash and verify
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
-- VERIFICATION: Confirm all 3 RPCs exist
-- ====================================================================
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('claim_order_pickup_atomic', 'verify_delivery_otp_atomic', 'verify_order_hash_chain')
ORDER BY p.proname;
