-- ========================================================================
-- FOODY VRINDA: CONSISTENT ACCOUNT-FIRST LOCKING FOR SETTLEMENT REVERSALS
-- Migration: 20261110000004_reversal_account_first_locking.sql
-- ========================================================================
-- Normal settlement locks rider/shop account before order rows. Reversal
-- previously locked settlement/orders first and account last, creating an
-- avoidable lock-order inversion and deadlock risk.
--
-- This replacement:
--   1. Reads settlement identifiers without a row lock.
--   2. Authorizes the caller before taking financial locks.
--   3. Locks the rider/shop account first, matching settlement/cod trigger.
--   4. Locks the settlement row and rechecks reversal idempotency.
--   5. Locks affected orders in deterministic order before restoring them.
--   6. Rejects account underflow instead of silently restoring an invalid
--      financial projection.
-- ========================================================================

CREATE OR REPLACE FUNCTION public.record_settlement_reversal(
    p_settlement_id TEXT,
    p_reason TEXT DEFAULT 'Settlement disputed / reversed'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_settlement RECORD;
    v_initial_rider_id TEXT;
    v_initial_shop_id TEXT;
    v_caller_id TEXT;
    v_jrn_id TEXT;
    v_account_id TEXT;
    v_alloc RECORD;
    v_actual_reversed_allocations NUMERIC(10,2) := 0.00;
    v_total_rider_float NUMERIC(10,2);
BEGIN
    v_caller_id := auth.uid()::text;

    IF v_caller_id IS NULL THEN
        IF (auth.jwt() ->> 'role') = 'service_role'
           OR session_user IN ('postgres', 'supabase_admin') THEN
            v_caller_id := 'service_role';
        ELSE
            RAISE EXCEPTION 'UNAUTHENTICATED: Caller must be authenticated to reverse settlement.';
        END IF;
    END IF;

    -- Read account keys without locking; no financial writes or locks yet.
    SELECT s.rider_id, s.shop_id
    INTO v_initial_rider_id, v_initial_shop_id
    FROM public.foody_cash_settlements s
    WHERE s.id = p_settlement_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Settlement "%" does not exist.', p_settlement_id;
    END IF;

    -- Authorization before acquiring the account lock prevents unauthorized
    -- callers from holding a rider/shop financial mutex.
    IF NOT public.can_manage_shop_finances(v_initial_shop_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Caller % is not authorized to reverse settlements for shop "%".',
            COALESCE(v_caller_id, 'unknown'), v_initial_shop_id;
    END IF;

    -- Canonical lock order: rider/shop cash account FIRST, exactly as the
    -- settlement RPC and COD collection trigger do.
    SELECT a.id
    INTO v_account_id
    FROM public.foody_cash_accounts a
    WHERE a.rider_id = v_initial_rider_id
      AND a.shop_id = v_initial_shop_id
    FOR UPDATE;

    IF v_account_id IS NULL THEN
        RAISE EXCEPTION 'ACCOUNT_NOT_FOUND: No canonical cash account exists for rider "%" and shop "%".',
            v_initial_rider_id, v_initial_shop_id;
    END IF;

    -- Lock and re-read the settlement only after the account mutex is held.
    SELECT *
    INTO v_settlement
    FROM public.foody_cash_settlements s
    WHERE s.id = p_settlement_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Settlement "%" does not exist.', p_settlement_id;
    END IF;

    IF v_settlement.rider_id <> v_initial_rider_id
       OR v_settlement.shop_id <> v_initial_shop_id THEN
        RAISE EXCEPTION 'CONCURRENT_MODIFICATION: Settlement account ownership changed during reversal.';
    END IF;

    IF v_settlement.status = 'reversed'
       OR EXISTS (
            SELECT 1
            FROM public.foody_cash_settlement_reversals r
            WHERE r.settlement_id = p_settlement_id
       ) THEN
        RAISE EXCEPTION 'ALREADY_REVERSED: Settlement "%" has already been reversed.', p_settlement_id;
    END IF;

    SELECT COALESCE(SUM(a.amount_allocated), 0.00)
    INTO v_actual_reversed_allocations
    FROM public.foody_cash_settlement_allocations a
    WHERE a.settlement_id = p_settlement_id;

    -- Lock all affected orders in deterministic order after the account.
    PERFORM o.id
    FROM public.foody_orders o
    JOIN public.foody_cash_settlement_allocations a ON a.order_id = o.id
    WHERE a.settlement_id = p_settlement_id
    ORDER BY o.id
    FOR UPDATE OF o;

    PERFORM pg_catalog.set_config('foody.in_reversal', 'true', true);

    INSERT INTO public.foody_cash_settlement_reversals (
        settlement_id, shop_id, rider_id, reversed_by, reversal_amount,
        reversal_reference, reason, created_at
    ) VALUES (
        p_settlement_id, v_settlement.shop_id, v_settlement.rider_id,
        COALESCE(v_caller_id, 'system'), v_settlement.cashier_received_amount,
        ('rev_ref_' || p_settlement_id), p_reason, NOW()
    );

    v_jrn_id := 'jrn_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);

    INSERT INTO public.foody_cash_journals (id, settlement_id, transaction_type, reference, created_at)
    VALUES (v_jrn_id, p_settlement_id, 'settlement_reversal', p_settlement_id, NOW());

    INSERT INTO public.foody_cash_journal_lines (journal_id, account_name, debit, credit, reference, created_at)
    VALUES
        (v_jrn_id, 'Cash In Kitchen Register (Asset)', 0.00, v_settlement.cashier_received_amount, p_settlement_id, NOW()),
        (v_jrn_id, 'Rider Custody Receivable (Asset)', v_actual_reversed_allocations, 0.00, p_settlement_id, NOW());

    IF v_settlement.excess_amount > 0 THEN
        INSERT INTO public.foody_cash_journal_lines (journal_id, account_name, debit, credit, reference, created_at)
        VALUES (
            v_jrn_id, 'Cashier Suspense / Excess Cash (Liability)',
            v_settlement.excess_amount, 0.00, p_settlement_id, NOW()
        );
    END IF;

    INSERT INTO public.foody_cash_ledger_entries (
        rider_id, shop_id, settlement_id, transaction_type, direction,
        amount, reference_id, actor_id, notes, created_at
    ) VALUES (
        v_settlement.rider_id, v_settlement.shop_id, p_settlement_id,
        'refund_reversal', 'credit', v_settlement.cashier_received_amount,
        p_settlement_id, COALESCE(v_caller_id, 'system'),
        format('Reversal of settlement %s: %s', p_settlement_id, p_reason), NOW()
    );

    -- Account is still locked; restore only after exact account-underflow check.
    UPDATE public.foody_cash_accounts
    SET outstanding_amount = outstanding_amount + v_actual_reversed_allocations,
        total_settled = total_settled - v_actual_reversed_allocations,
        updated_at = NOW()
    WHERE id = v_account_id
      AND total_settled >= v_actual_reversed_allocations;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ACCOUNT_RECONCILIATION_ERROR: Cannot reverse settlement "%" because account settled balance is below allocated amount %.',
            p_settlement_id, v_actual_reversed_allocations;
    END IF;

    FOR v_alloc IN
        SELECT a.order_id
        FROM public.foody_cash_settlement_allocations a
        WHERE a.settlement_id = p_settlement_id
        ORDER BY a.order_id
    LOOP
        UPDATE public.foody_orders
        SET cash_status = 'collected',
            settlement_id = NULL,
            updated_at = NOW()
        WHERE id = v_alloc.order_id;
    END LOOP;

    SELECT COALESCE(SUM(a.outstanding_amount), 0.00)
    INTO v_total_rider_float
    FROM public.foody_cash_accounts a
    WHERE a.rider_id = v_settlement.rider_id;

    UPDATE public.foody_users
    SET cash_in_hand = v_total_rider_float,
        unsettled_debt = v_total_rider_float
    WHERE id = v_settlement.rider_id;

    UPDATE public.foody_logged_users
    SET cash_in_hand = v_total_rider_float,
        unsettled_debt = v_total_rider_float
    WHERE id = v_settlement.rider_id;

    UPDATE public.foody_cash_settlements
    SET status = 'reversed'
    WHERE id = p_settlement_id;

    INSERT INTO public.foody_financial_audit_logs (
        actor_id, actor_role, action, resource_type, resource_id,
        previous_state, new_state, created_at
    ) VALUES (
        COALESCE(v_caller_id, 'system'), 'cashier', 'reverse_settlement',
        'foody_cash_settlements', p_settlement_id,
        pg_catalog.row_to_json(v_settlement)::jsonb,
        pg_catalog.jsonb_build_object(
            'reversed', true,
            'reason', p_reason,
            'restored_allocations', v_actual_reversed_allocations,
            'account_id', v_account_id,
            'lock_order', 'rider_shop_account_then_settlement_then_orders'
        ),
        NOW()
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'settlement_id', p_settlement_id,
        'reversed', true,
        'restored_allocations', v_actual_reversed_allocations
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_settlement_reversal(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_settlement_reversal(TEXT, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
