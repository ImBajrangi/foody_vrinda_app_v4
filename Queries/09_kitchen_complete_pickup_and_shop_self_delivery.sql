-- ========================================================================
-- FOODY VRINDA: KITCHEN COUNTER PICKUP HANDOVER & SHOP SELF-DELIVERY MIGRATION
-- Migration Version: 09
-- ========================================================================

-- 1. Ensure foody_shops schema supports self_delivery and can_deliver flags
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS self_delivery BOOLEAN DEFAULT FALSE;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS can_deliver BOOLEAN DEFAULT FALSE;

-- 2. State Machine Transition Trigger Update (Allow Counter Pickup to transition to completed)
CREATE OR REPLACE FUNCTION public.enforce_order_state_transition()
RETURNS TRIGGER AS $$
DECLARE
    allowed TEXT[];
BEGIN
    CASE OLD.status
        WHEN 'new' THEN
            allowed := ARRAY['confirmed', 'accepted', 'preparing', 'payment_pending', 'cancelled'];
        WHEN 'payment_pending' THEN
            allowed := ARRAY['confirmed', 'cancelled'];
        WHEN 'confirmed' THEN
            allowed := ARRAY['accepted', 'preparing', 'cooking', 'cancelled'];
        WHEN 'accepted' THEN
            allowed := ARRAY['preparing', 'cooking', 'cancelled'];
        WHEN 'preparing' THEN
            IF OLD.fulfillment_type = 'pickup' THEN
                allowed := ARRAY['cooking', 'ready_for_pickup', 'completed', 'cancelled'];
            ELSE
                allowed := ARRAY['cooking', 'ready_for_pickup', 'cancelled'];
            END IF;
        WHEN 'cooking' THEN
            IF OLD.fulfillment_type = 'pickup' THEN
                allowed := ARRAY['ready_for_pickup', 'completed', 'cancelled'];
            ELSE
                allowed := ARRAY['ready_for_pickup', 'cancelled'];
            END IF;
        WHEN 'ready_for_pickup' THEN
            IF OLD.fulfillment_type = 'pickup' THEN
                allowed := ARRAY['completed', 'picked_up', 'cancelled'];
            ELSE
                allowed := ARRAY['completed', 'rider_assigned', 'picked_up', 'out_for_delivery', 'cancelled'];
            END IF;
        WHEN 'rider_assigned' THEN
            allowed := ARRAY['rider_arriving', 'picked_up', 'cancelled'];
        WHEN 'rider_arriving' THEN
            allowed := ARRAY['picked_up', 'cancelled'];
        WHEN 'picked_up' THEN
            allowed := ARRAY['out_for_delivery'];
        WHEN 'out_for_delivery' THEN
            allowed := ARRAY['delivered', 'completed', 'delivery_attempted_failed'];
        WHEN 'delivered' THEN
            allowed := ARRAY['completed', 'disputed', 'returned'];
        WHEN 'completed' THEN
            allowed := ARRAY['disputed', 'refund_pending'];
        WHEN 'delivery_attempted_failed' THEN
            allowed := ARRAY['out_for_delivery', 'returned', 'cancelled', 'refund_pending'];
        WHEN 'cancelled' THEN
            allowed := ARRAY['refund_pending'];
        WHEN 'refund_pending' THEN
            allowed := ARRAY['refunded'];
        WHEN 'refunded' THEN
            allowed := ARRAY[]::TEXT[];
        WHEN 'disputed' THEN
            allowed := ARRAY['refund_pending', 'completed'];
        WHEN 'returned' THEN
            allowed := ARRAY['refund_pending'];
        ELSE
            allowed := ARRAY[]::TEXT[];
    END CASE;

    -- Check if new status is in allowed list
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (NEW.status = ANY(allowed)) THEN
        RAISE EXCEPTION 'State Machine Violation: Cannot transition from "%" to "%". Allowed: %', OLD.status, NEW.status, allowed;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_order_state ON public.foody_orders;
CREATE TRIGGER trg_enforce_order_state
    BEFORE UPDATE OF status ON public.foody_orders
    FOR EACH ROW EXECUTE FUNCTION public.enforce_order_state_transition();

-- 3. Fix process_customer_order_referral_reward schema column references (user_id & total_amount)
CREATE OR REPLACE FUNCTION public.process_customer_order_referral_reward(
    p_order_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_customer_id TEXT;
    v_order_total NUMERIC(10,2);
    v_ref RECORD;
    v_rule RECORD;
    v_hours_since_signup NUMERIC;
    v_idempotency_referee TEXT;
    v_idempotency_referrer TEXT;
    v_referrer_wallet RECORD;
    v_referee_wallet RECORD;
BEGIN
    IF current_user <> 'postgres' AND auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'FORBIDDEN: Reward processing is restricted to internal system triggers and service role.';
    END IF;

    SELECT * INTO v_order
    FROM public.foody_orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Order not found', 'order_id', p_order_id);
    END IF;

    IF v_order.status <> 'completed' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Order is not completed', 'status', v_order.status);
    END IF;

    -- Safe column extraction (foody_orders uses user_id and total_amount)
    v_customer_id := v_order.user_id;
    IF v_customer_id IS NULL OR TRIM(v_customer_id) = '' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Order has no customer_id');
    END IF;

    v_order_total := COALESCE(v_order.total_amount, 0.00);

    SELECT * INTO v_ref FROM public.foody_referrals
    WHERE referred_id = v_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'User was not referred');
    END IF;

    IF v_ref.is_first_order_completed THEN
        RETURN jsonb_build_object('success', true, 'message', 'First order reward already processed');
    END IF;

    SELECT * INTO v_rule FROM public.foody_referral_rules
    WHERE is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'No active referral rules configured');
    END IF;

    IF v_order_total < v_rule.min_order_amount_for_reward THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Order total below required threshold', 'min_required', v_rule.min_order_amount_for_reward);
    END IF;

    SELECT EXTRACT(EPOCH FROM (NOW() - created_at))/3600.0 INTO v_hours_since_signup
    FROM public.foody_referrals
    WHERE id = v_ref.id;

    IF v_hours_since_signup > v_rule.order_completion_window_hours THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Order placed outside qualification window');
    END IF;

    v_idempotency_referee := 'ref_referee_' || v_ref.id || '_' || p_order_id;
    v_idempotency_referrer := 'ref_referrer_' || v_ref.id || '_' || p_order_id;

    SELECT * INTO v_referee_wallet FROM public.foody_wallets WHERE user_id = v_customer_id FOR UPDATE;
    IF FOUND THEN
        UPDATE public.foody_wallets
        SET available_points = available_points + v_rule.referee_reward_points,
            lifetime_earned_points = lifetime_earned_points + v_rule.referee_reward_points,
            updated_at = NOW()
        WHERE user_id = v_customer_id;

        INSERT INTO public.foody_wallet_ledger (wallet_id, user_id, amount_points, transaction_type, reference_id, idempotency_key, description)
        VALUES (
            v_referee_wallet.id,
            v_customer_id,
            v_rule.referee_reward_points,
            'credit',
            p_order_id,
            v_idempotency_referee,
            'Referral Welcome Gift (First Order Completed)'
        ) ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

    SELECT * INTO v_referrer_wallet FROM public.foody_wallets WHERE user_id = v_ref.referrer_id FOR UPDATE;
    IF FOUND THEN
        UPDATE public.foody_wallets
        SET available_points = available_points + v_rule.referrer_reward_points,
            lifetime_earned_points = lifetime_earned_points + v_rule.referrer_reward_points,
            updated_at = NOW()
        WHERE user_id = v_ref.referrer_id;

        INSERT INTO public.foody_wallet_ledger (wallet_id, user_id, amount_points, transaction_type, reference_id, idempotency_key, description)
        VALUES (
            v_referrer_wallet.id,
            v_ref.referrer_id,
            v_rule.referrer_reward_points,
            'credit',
            p_order_id,
            v_idempotency_referrer,
            'Referral Friend Bonus (First Order Completed)'
        ) ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

    UPDATE public.foody_referrals
    SET status = 'rewarded',
        is_first_order_completed = true,
        first_order_id = p_order_id,
        reward_paid_at = NOW(),
        updated_at = NOW()
    WHERE id = v_ref.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'First order rewards credited successfully'
    );
END;
$$;

-- 4. Reward Trigger Resilience: Exceptions in referral rewards must never block food order completions
CREATE OR REPLACE FUNCTION public.trig_on_order_completed_referral_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
        BEGIN
            PERFORM public.process_customer_order_referral_reward(NEW.id);
            IF NEW.rider_id IS NOT NULL THEN
                PERFORM public.process_delivery_milestone_reward(NEW.id);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Referral reward trigger failed for order %: %', NEW.id, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_completed_rewards ON public.foody_orders;
CREATE TRIGGER trg_order_completed_rewards
    AFTER UPDATE OF status ON public.foody_orders
    FOR EACH ROW EXECUTE FUNCTION public.trig_on_order_completed_referral_rewards();

-- 5. Create / Replace Atomic Counter Pickup Completion RPC
DROP FUNCTION IF EXISTS public.kitchen_complete_pickup(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.kitchen_complete_pickup(TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.kitchen_complete_pickup(
    p_order_id TEXT,
    p_otp TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_order RECORD;
    v_shop_ids TEXT[];
    v_role TEXT;
    v_is_admin BOOLEAN;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    v_role := public.get_auth_role();
    v_shop_ids := public.get_auth_shop_ids();
    v_is_admin := public.is_platform_admin();

    SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN 
        RAISE EXCEPTION 'NOT_FOUND: Order "%" does not exist.', p_order_id; 
    END IF;

    -- Multi-Tier Authorization:
    IF (auth.jwt() ->> 'role') = 'service_role' OR v_is_admin THEN
        v_is_authorized := TRUE;
    ELSIF (v_role IN ('kitchen', 'owner') AND v_order.shop_id = ANY(v_shop_ids)) THEN
        v_is_authorized := TRUE;
    ELSIF p_otp IS NOT NULL AND (v_order.pickup_otp = p_otp OR v_order.pickup_otp IS NULL) THEN
        v_is_authorized := TRUE;
    ELSIF v_order.fulfillment_type = 'pickup' AND v_order.status IN ('ready_for_pickup', 'preparing') THEN
        v_is_authorized := TRUE;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Counter order completion requires valid staff session, ready_for_pickup state, or devotee pickup OTP.';
    END IF;

    IF v_order.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true, 
            'order_id', p_order_id, 
            'status', 'completed',
            'cash_status', v_order.cash_status
        );
    END IF;

    IF v_order.status NOT IN ('ready_for_pickup', 'preparing', 'new') THEN
        RAISE EXCEPTION 'STATE_ERROR: Order is in state "%". Cannot complete counter pickup from this state.', v_order.status;
    END IF;

    UPDATE public.foody_orders 
    SET status = 'completed', 
        cash_status = CASE WHEN payment_method IN ('cash', 'cod') THEN 'collected' ELSE cash_status END,
        cash_collected_amount = CASE WHEN payment_method IN ('cash', 'cod') THEN total_amount ELSE cash_collected_amount END,
        delivered_at = NOW(),
        updated_at = NOW() 
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true, 
        'order_id', p_order_id, 
        'status', 'completed',
        'cash_status', CASE WHEN v_order.payment_method IN ('cash', 'cod') THEN 'collected' ELSE v_order.cash_status END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.kitchen_complete_pickup(TEXT, TEXT) TO authenticated, anon, service_role;

-- 6. Upgrade transition_order_status to support Counter Pickup completion
DROP FUNCTION IF EXISTS public.transition_order_status(TEXT, TEXT, JSONB) CASCADE;
CREATE OR REPLACE FUNCTION public.transition_order_status(
    target_order_id TEXT,
    new_status TEXT,
    extra_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    current_order RECORD;
    rider_user RECORD;
    updated_order JSONB;
    caller_id TEXT;
    caller_role TEXT;
    caller_shop_ids TEXT[];
    is_admin BOOLEAN;
BEGIN
    caller_id := auth.uid()::text;
    caller_role := public.get_auth_role();
    is_admin := public.is_platform_admin();
    caller_shop_ids := public.get_auth_shop_ids();

    SELECT * INTO current_order FROM public.foody_orders 
    WHERE id = target_order_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Order "%" does not exist.', target_order_id;
    END IF;

    IF NOT is_admin AND (auth.jwt() ->> 'role') <> 'service_role' THEN
        IF caller_role = 'customer' AND current_order.user_id <> caller_id THEN
            RAISE EXCEPTION 'PERMISSION_DENIED: You are not authorized to modify this order.';
        ELSIF caller_role = 'delivery' AND current_order.rider_id IS NOT NULL AND current_order.rider_id <> caller_id THEN
            RAISE EXCEPTION 'PERMISSION_DENIED: Order is assigned to another delivery Sarathi.';
        END IF;
    END IF;

    IF current_order.status = new_status THEN
        RETURN to_jsonb(current_order) - 'pickup_otp_hash' - 'delivery_otp_hash';
    END IF;

    IF current_order.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'STATE_ERROR: Order is in terminal state "%" and cannot be modified.', current_order.status;
    END IF;

    IF current_order.status = 'new' AND new_status = 'preparing' THEN
        IF NOT is_admin AND (auth.jwt() ->> 'role') <> 'service_role' AND caller_role NOT IN ('kitchen', 'owner') THEN
            RAISE EXCEPTION 'PERMISSION_DENIED: Only kitchen staff can mark orders as preparing.';
        END IF;

    ELSIF current_order.status = 'preparing' AND new_status = 'ready_for_pickup' THEN
        IF NOT is_admin AND (auth.jwt() ->> 'role') <> 'service_role' AND caller_role NOT IN ('kitchen', 'owner') THEN
            RAISE EXCEPTION 'PERMISSION_DENIED: Only kitchen staff can mark orders as ready for pickup.';
        END IF;

    ELSIF (current_order.status IN ('ready_for_pickup', 'preparing', 'new')) AND new_status = 'completed' AND (current_order.fulfillment_type = 'pickup' OR (extra_payload ->> 'fulfillment_type') = 'pickup' OR (extra_payload ->> 'isCounterPickup')::boolean = true) THEN
        NULL;

    ELSIF current_order.status = 'ready_for_pickup' AND new_status = 'out_for_delivery' THEN
        IF NOT is_admin AND (auth.jwt() ->> 'role') <> 'service_role' AND caller_role <> 'delivery' THEN
            RAISE EXCEPTION 'PERMISSION_DENIED: Only verified delivery Sarathis or administrators can dispatch orders for delivery.';
        END IF;

    ELSIF current_order.status = 'out_for_delivery' AND new_status = 'completed' THEN
        IF NOT is_admin AND (auth.jwt() ->> 'role') <> 'service_role' AND NOT (caller_role = 'delivery' AND current_order.rider_id = caller_id) THEN
            RAISE EXCEPTION 'PERMISSION_DENIED: Only the assigned delivery rider can complete this delivery.';
        END IF;

    ELSIF new_status = 'cancelled' THEN
        IF NOT is_admin AND (auth.jwt() ->> 'role') <> 'service_role' THEN
            IF caller_role = 'customer' AND current_order.user_id = caller_id AND current_order.status = 'new' THEN
                NULL;
            ELSIF caller_role IN ('kitchen', 'owner') THEN
                NULL;
            ELSE
                RAISE EXCEPTION 'PERMISSION_DENIED: Unauthorized attempt to cancel order in status "%".', current_order.status;
            END IF;
        END IF;

    ELSE
        RAISE EXCEPTION 'INVALID_TRANSITION: Transition from "%" to "%" is not permitted by platform state machine.', current_order.status, new_status;
    END IF;

    UPDATE public.foody_orders
    SET
        status = new_status,
        rider_id = CASE 
            WHEN caller_role = 'delivery' AND new_status = 'out_for_delivery' THEN caller_id 
            WHEN is_admin THEN COALESCE(extra_payload ->> 'rider_id', rider_id)
            ELSE rider_id 
        END,
        rider_name = CASE 
            WHEN caller_role = 'delivery' AND new_status = 'out_for_delivery' THEN COALESCE(rider_user.display_name, 'Delivery Sarathi')
            WHEN is_admin THEN COALESCE(extra_payload ->> 'rider_name', rider_name)
            ELSE rider_name 
        END,
        rider_phone = CASE 
            WHEN caller_role = 'delivery' AND new_status = 'out_for_delivery' THEN COALESCE(rider_user.phone, '')
            WHEN is_admin THEN COALESCE(extra_payload ->> 'rider_phone', rider_phone)
            ELSE rider_phone 
        END,
        cash_status = CASE 
            WHEN new_status = 'completed' AND payment_method IN ('cash', 'cod') THEN 'collected' 
            ELSE cash_status 
        END,
        cash_collected_amount = CASE 
            WHEN new_status = 'completed' AND payment_method IN ('cash', 'cod') THEN total_amount
            ELSE cash_collected_amount
        END,
        delivered_at = CASE 
            WHEN new_status = 'completed' THEN NOW()
            ELSE delivered_at
        END,
        updated_at = NOW()
    WHERE id = target_order_id
    RETURNING to_jsonb(foody_orders.*) INTO updated_order;

    RETURN updated_order - 'pickup_otp_hash' - 'delivery_otp_hash';
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_order_status(TEXT, TEXT, JSONB) TO authenticated, anon, service_role;

-- 6. Shop Self-Delivery Permissions & RPC
GRANT UPDATE ON public.foody_shops TO authenticated, anon;

DROP POLICY IF EXISTS "Allow staff and owners to update foody_shops" ON public.foody_shops;
CREATE POLICY "Allow staff and owners to update foody_shops"
    ON public.foody_shops FOR UPDATE
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.toggle_shop_self_delivery(
    p_shop_id TEXT,
    p_self_delivery BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated public.foody_shops%ROWTYPE;
BEGIN
    UPDATE public.foody_shops
    SET 
        self_delivery = p_self_delivery,
        can_deliver = p_self_delivery,
        updated_at = NOW()
    WHERE id = p_shop_id
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Shop "%" does not exist.', p_shop_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'shop_id', v_updated.id,
        'self_delivery', v_updated.self_delivery,
        'can_deliver', v_updated.can_deliver
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_shop_self_delivery(TEXT, BOOLEAN) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.toggle_shop_status(
    p_shop_id TEXT,
    p_is_open BOOLEAN DEFAULT NULL,
    p_is_online BOOLEAN DEFAULT NULL,
    p_self_delivery BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated public.foody_shops%ROWTYPE;
BEGIN
    UPDATE public.foody_shops
    SET 
        is_open = COALESCE(p_is_open, is_open),
        is_online = COALESCE(p_is_online, is_online),
        self_delivery = COALESCE(p_self_delivery, self_delivery),
        can_deliver = COALESCE(p_self_delivery, can_deliver),
        updated_at = NOW()
    WHERE id = p_shop_id
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Shop "%" does not exist.', p_shop_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_updated.id,
        'is_open', v_updated.is_open,
        'is_online', v_updated.is_online,
        'self_delivery', v_updated.self_delivery,
        'can_deliver', v_updated.can_deliver
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_shop_status(TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
