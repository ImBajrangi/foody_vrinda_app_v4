-- ====================================================================
-- FOODY VRINDA — V5.3.10 HOTFIX: EXTEND OTP EXPIRY & RESOLVE STUCK ORDER
-- 
-- Root Cause:
-- Orders were created with a strict 15-minute OTP expiration window
-- (delivery_otp_expires_at). In real restaurant operations, cooking,
-- packaging, rider transit, or counter pickup takes 30-60+ minutes.
-- Once 15 minutes elapsed, verify_delivery_otp_atomic raised an exception:
-- 'Delivery OTP has expired for order %.'
-- This prevented orders from being marked delivered in Supabase, keeping
-- customer tracking screens permanently stuck showing "Arriving".
--
-- This migration:
-- 1. Adds a 24-hour grace window to verify_delivery_otp_atomic & claim_order_pickup_atomic.
-- 2. Marks stuck order ord-1791795698375-y4twc as 'delivered' with cash collected.
-- ====================================================================

-- 1. UPDATE verify_delivery_otp_atomic WITH 24-HOUR GRACE TOLERANCE
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
            RAISE EXCEPTION 'Caller identity mismatch: auth.uid()=% does not match claimed rider_id=%', auth.uid()::text, p_rider_id USING ERRCODE = '42501';
        END IF;
        v_caller_id := auth.uid()::text;
    ELSIF auth.role() = 'service_role' OR (auth.role() IS NULL AND current_user IN ('postgres', 'supabase_admin')) THEN
        v_caller_id := p_rider_id;
    ELSIF EXISTS (SELECT 1 FROM public.foody_logged_users WHERE id = p_rider_id AND role IN ('delivery', 'rider', 'sarathi', 'owner', 'developer', 'grand_admin')) THEN
        v_caller_id := p_rider_id;
    ELSE
        RAISE EXCEPTION 'Authorization failure: Rider ID % is not registered or authorized.', p_rider_id USING ERRCODE = '42501';
    END IF;

    -- Set transaction-local bypass flag for immutability trigger
    PERFORM set_config('foody.custody_rpc_active', 'true', true);

    SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    IF v_order.rider_id IS NOT NULL AND v_order.rider_id != v_caller_id THEN
        RAISE EXCEPTION 'Rider % is not assigned to order %.', v_caller_id, p_order_id;
    END IF;

    IF v_order.status NOT IN ('out_for_delivery', 'picked_up', 'ready_for_pickup') THEN
        RAISE EXCEPTION 'Order % is in state "%" — cannot verify delivery.', p_order_id, v_order.status;
    END IF;

    IF v_order.delivery_otp_used_at IS NOT NULL THEN
        RAISE EXCEPTION 'Delivery OTP has already been used for order %.', p_order_id;
    END IF;

    IF COALESCE(v_order.delivery_otp_attempts, 0) >= 5 THEN
        RAISE EXCEPTION 'Delivery OTP rate limit exceeded for order %. Contact admin.', p_order_id;
    END IF;

    -- Extended Expiry: Allow 24 hours from scheduled expiry so active meals never hard-lock
    IF v_order.delivery_otp_expires_at IS NOT NULL AND NOW() > (v_order.delivery_otp_expires_at + INTERVAL '24 hours') THEN
        RAISE EXCEPTION 'Delivery OTP has expired for order %.', p_order_id;
    END IF;

    -- Verify OTP: hash-first, plaintext fallback
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

    -- Transition state atomically
    UPDATE public.foody_orders
    SET
        status = 'delivered',
        delivered_at = NOW(),
        delivery_otp = NULL,
        delivery_otp_attempts = 0,
        delivery_otp_used_at = NOW(),
        otp_used_at = NOW(),
        cash_status = CASE WHEN payment_method = 'cash' THEN 'collected' ELSE cash_status END,
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING to_jsonb(foody_orders.*) INTO v_result;

    INSERT INTO public.foody_order_events (order_id, actor_id, actor_role, event_type, metadata)
    VALUES (p_order_id, v_caller_id, 'delivery', 'DELIVERY_VERIFIED',
            jsonb_build_object('verified_by', 'otp', 'delivered_at', NOW()::text));

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_delivery_otp_atomic(text, text, text) TO anon, authenticated, service_role;

-- 2. UPDATE claim_order_pickup_atomic WITH 24-HOUR GRACE TOLERANCE
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
    IF auth.uid() IS NOT NULL THEN
        IF auth.uid()::text IS DISTINCT FROM p_rider_id THEN
            RAISE EXCEPTION 'Caller identity mismatch: auth.uid()=% does not match claimed rider_id=%', auth.uid()::text, p_rider_id USING ERRCODE = '42501';
        END IF;
        v_caller_id := auth.uid()::text;
    ELSIF auth.role() = 'service_role' OR (auth.role() IS NULL AND current_user IN ('postgres', 'supabase_admin')) THEN
        v_caller_id := p_rider_id;
    ELSIF EXISTS (SELECT 1 FROM public.foody_logged_users WHERE id = p_rider_id AND role IN ('delivery', 'rider', 'sarathi', 'owner', 'developer', 'grand_admin')) THEN
        v_caller_id := p_rider_id;
    ELSE
        RAISE EXCEPTION 'Authorization failure: Rider ID % is not registered or authorized.', p_rider_id USING ERRCODE = '42501';
    END IF;

    PERFORM set_config('foody.custody_rpc_active', 'true', true);

    SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    IF v_order.status NOT IN ('ready_for_pickup', 'rider_assigned', 'rider_arriving') THEN
        RAISE EXCEPTION 'Order % is in state "%" — cannot claim for pickup.', p_order_id, v_order.status;
    END IF;

    IF v_order.rider_id IS NOT NULL AND v_order.rider_id IS DISTINCT FROM v_caller_id THEN
        RAISE EXCEPTION 'Order % is already assigned to rider %, cannot be claimed by %.', p_order_id, v_order.rider_id, v_caller_id;
    END IF;

    IF v_order.pickup_otp_used_at IS NOT NULL THEN
        RAISE EXCEPTION 'Pickup OTP has already been used for order %.', p_order_id;
    END IF;

    IF COALESCE(v_order.pickup_otp_attempts, 0) >= 5 THEN
        RAISE EXCEPTION 'OTP rate limit exceeded for order %. Contact admin.', p_order_id;
    END IF;

    IF v_order.pickup_otp_expires_at IS NOT NULL AND NOW() > (v_order.pickup_otp_expires_at + INTERVAL '24 hours') THEN
        RAISE EXCEPTION 'Pickup OTP has expired for order %.', p_order_id;
    END IF;

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

    UPDATE public.foody_orders
    SET
        status = 'picked_up',
        rider_id = v_caller_id,
        picked_up_at = NOW(),
        pickup_otp = NULL,
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

GRANT EXECUTE ON FUNCTION public.claim_order_pickup_atomic(text, text, text) TO anon, authenticated, service_role;

-- 3. RESOLVE STUCK ORDER ORD-1791795698375-Y4TWC IMMEDIATELY
UPDATE public.foody_orders
SET
    status = 'delivered',
    delivered_at = NOW(),
    cash_status = 'collected',
    delivery_otp = NULL,
    delivery_otp_attempts = 0,
    delivery_otp_used_at = NOW(),
    otp_used_at = NOW(),
    updated_at = NOW()
WHERE id = 'ord-1791795698375-y4twc';
