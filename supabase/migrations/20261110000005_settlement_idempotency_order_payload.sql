-- ========================================================================
-- FOODY VRINDA: CAPTURE FULL IDEMPOTENCY REQUEST SELECTION
-- Migration: 20261110000005_settlement_idempotency_order_payload.sql
-- ========================================================================
-- Before this migration an explicit p_order_ids selection was not compared
-- when a caller replayed the same key with p_order_ids omitted. The committed
-- result was not duplicated, but the key could incorrectly replay a receipt
-- for a different request payload.
--
-- This additive patch captures the normalized requested selection for every
-- new settlement and validates it on every replay. Historical rows retain
-- their legacy allocation-based comparison because their original request
-- mode cannot be reconstructed reliably.
-- ========================================================================

ALTER TABLE public.foody_cash_settlements
    ADD COLUMN IF NOT EXISTS requested_order_ids TEXT[];

ALTER TABLE public.foody_cash_settlements
    ADD COLUMN IF NOT EXISTS request_payload_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.record_rider_cash_settlement(
    p_rider_id TEXT,
    p_shop_id TEXT,
    p_amount_received NUMERIC,
    p_declared_amount NUMERIC DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_order_ids TEXT[] DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_settled_by TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id TEXT;
    v_cashier_name TEXT;
    v_cashier_role TEXT := 'cashier';
    v_existing_settlement RECORD;
    v_settlement_id TEXT;
    v_journal_id TEXT;
    v_account_id TEXT;
    v_current_account_outstanding NUMERIC(10,2) := 0.00;
    v_expected_amount NUMERIC(10,2) := 0.00;
    v_declared_amount NUMERIC(10,2);
    v_amount_received NUMERIC(10,2);
    v_allocated_total NUMERIC(10,2) := 0.00;
    v_shortage NUMERIC(10,2) := 0.00;
    v_excess NUMERIC(10,2) := 0.00;
    v_status TEXT := 'full_settlement';
    v_remaining_to_allocate NUMERIC(10,2);
    v_alloc_for_order NUMERIC(10,2);
    v_order_debt_remaining NUMERIC(10,2);
    v_rec RECORD;
    v_order_count INT := 0;
    v_settled_order_ids TEXT[] := ARRAY[]::TEXT[];
    v_allocated_orders JSONB := '[]'::jsonb;
    v_invalid_order_ids TEXT[];
    v_order_allocated_ids TEXT[];
    v_requested_order_ids TEXT[];
    v_total_rider_float NUMERIC(10,2);
BEGIN
    -- 1. Derive authenticated caller identity strictly from auth.uid()
    v_caller_id := auth.uid()::text;

    -- Allow service_role or postgres internal calls; reject untrusted anonymous/public
    IF v_caller_id IS NULL THEN
        IF (auth.jwt() ->> 'role') = 'service_role' OR session_user IN ('postgres', 'supabase_admin') THEN
            v_caller_id := 'service_role';
            v_cashier_name := 'System Automated Settler';
            v_cashier_role := 'service_role';
        ELSE
            RAISE EXCEPTION 'UNAUTHENTICATED: Caller must be an authenticated user to perform settlements.';
        END IF;
    ELSE
        -- 2. Authenticated role and shop membership authorization
        IF NOT public.can_manage_shop_finances(p_shop_id) THEN
            RAISE EXCEPTION 'UNAUTHORIZED: Caller % is not authorized to settle cash for kitchen / shop %.', v_caller_id, p_shop_id;
        END IF;

        -- Resolve verified staff name
        SELECT COALESCE(display_name, 'Shop Cashier'), role INTO v_cashier_name, v_cashier_role
        FROM public.foody_logged_users
        WHERE id = v_caller_id AND is_active = true;

        IF v_cashier_name IS NULL THEN
            SELECT COALESCE(name, 'Shop Cashier') INTO v_cashier_name
            FROM public.foody_users
            WHERE id = v_caller_id;
        END IF;
        v_cashier_name := COALESCE(v_cashier_name, 'Shop Cashier');
    END IF;

    -- 3. Strict Input & Amount Validation
    IF p_rider_id IS NULL OR pg_catalog.btrim(p_rider_id) = '' THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: p_rider_id is required.';
    END IF;
    IF p_shop_id IS NULL OR pg_catalog.btrim(p_shop_id) = '' THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: p_shop_id is required.';
    END IF;

    IF p_amount_received IS NULL THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: Received amount cannot be null.';
    END IF;

    v_amount_received := pg_catalog.round(p_amount_received, 2);
    IF v_amount_received < 0 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: Received amount cannot be negative (got %)', v_amount_received;
    END IF;

    IF p_declared_amount IS NOT NULL THEN
        v_declared_amount := pg_catalog.round(p_declared_amount, 2);
        IF v_declared_amount < 0 THEN
            RAISE EXCEPTION 'INVALID_AMOUNT: Declared amount cannot be negative (got %)', v_declared_amount;
        END IF;
    ELSE
        v_declared_amount := v_amount_received;
    END IF;

    -- Validate shop and rider existence in database
    IF NOT EXISTS (SELECT 1 FROM public.foody_shops WHERE id = p_shop_id) THEN
        RAISE EXCEPTION 'INVALID_SHOP: Shop "%" does not exist.', p_shop_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.foody_users WHERE id = p_rider_id)
       AND NOT EXISTS (SELECT 1 FROM public.foody_logged_users WHERE id = p_rider_id) THEN
        RAISE EXCEPTION 'INVALID_RIDER: Rider "%" does not exist.', p_rider_id;
    END IF;

    -- 4. CONCURRENCY: Lock rider-shop financial account row FIRST to serialize same-rider requests
    INSERT INTO public.foody_cash_accounts (rider_id, shop_id, outstanding_amount, total_collected, total_settled)
    VALUES (p_rider_id, p_shop_id, 0.00, 0.00, 0.00)
    ON CONFLICT (rider_id, shop_id) DO NOTHING;

    SELECT id, outstanding_amount INTO v_account_id, v_current_account_outstanding
    FROM public.foody_cash_accounts
    WHERE rider_id = p_rider_id AND shop_id = p_shop_id
    FOR UPDATE;

    -- 5. Idempotency Check & Payload Collision Detection (Inside Account Lock)
    IF p_idempotency_key IS NOT NULL AND pg_catalog.btrim(p_idempotency_key) <> '' THEN
        SELECT s.* INTO v_existing_settlement
        FROM public.foody_cash_settlements s
        WHERE s.idempotency_key = pg_catalog.btrim(p_idempotency_key);

        IF v_existing_settlement.id IS NOT NULL THEN
            -- Normalize the requested order list before comparing payload identity.
            -- NULL/empty means automatic FIFO selection; explicit IDs are sorted/deduplicated.
            v_requested_order_ids := CASE
                WHEN COALESCE(pg_catalog.array_length(p_order_ids, 1), 0) > 0 THEN
                    ARRAY(
                        SELECT DISTINCT requested_id
                        FROM pg_catalog.unnest(p_order_ids) AS requested_id
                        ORDER BY requested_id
                    )
                ELSE NULL
            END;

            IF v_existing_settlement.rider_id <> p_rider_id
               OR v_existing_settlement.shop_id <> p_shop_id
               OR v_existing_settlement.cashier_received_amount <> v_amount_received
               OR v_existing_settlement.rider_declared_amount <> v_declared_amount THEN
                RAISE EXCEPTION 'IDEMPOTENCY_KEY_COLLISION: Key "%" was already used with different financial parameters.', p_idempotency_key;
            END IF;

            IF COALESCE(v_existing_settlement.notes, '') <> COALESCE(p_notes, '') THEN
                RAISE EXCEPTION 'IDEMPOTENCY_KEY_COLLISION: Key "%" was already used with different notes.', p_idempotency_key;
            END IF;

            IF COALESCE(v_existing_settlement.request_payload_verified, false) THEN
                IF v_existing_settlement.requested_order_ids IS DISTINCT FROM v_requested_order_ids THEN
                    RAISE EXCEPTION 'IDEMPOTENCY_KEY_COLLISION: Key "%" was already used with a different requested order selection.', p_idempotency_key;
                END IF;
            ELSE
                -- Backward-compatible validation for settlements created before
                -- requested_order_ids was captured in the authoritative record.
                SELECT pg_catalog.array_agg(order_id ORDER BY order_id)
                INTO v_order_allocated_ids
                FROM public.foody_cash_settlement_allocations
                WHERE settlement_id = v_existing_settlement.id;

                IF v_requested_order_ids IS NOT NULL
                   AND v_order_allocated_ids IS NOT NULL
                   AND NOT (
                       v_order_allocated_ids <@ v_requested_order_ids
                       AND v_requested_order_ids <@ v_order_allocated_ids
                   ) THEN
                    RAISE EXCEPTION 'IDEMPOTENCY_KEY_COLLISION: Key "%" was already used with a different order list.', p_idempotency_key;
                END IF;
            END IF;

            -- Return original committed authoritative receipt
            RETURN pg_catalog.jsonb_build_object(
                'success', true,
                'settlement_id', v_existing_settlement.id,
                'rider_id', v_existing_settlement.rider_id,
                'shop_id', v_existing_settlement.shop_id,
                'expected_amount', v_existing_settlement.expected_amount,
                'received_amount', v_existing_settlement.cashier_received_amount,
                'declared_amount', v_existing_settlement.rider_declared_amount,
                'shortage_amount', v_existing_settlement.shortage_amount,
                'excess_amount', v_existing_settlement.excess_amount,
                'status', v_existing_settlement.status,
                'notes', v_existing_settlement.notes,
                'idempotent_replay', true,
                'created_at', v_existing_settlement.created_at
            );
        END IF;
    END IF;

    -- 6. DETERMINISTIC ROW LOCKING & OUTSTANDING DEBT CALCULATION (Using All Prior Allocations)
    CREATE TEMP TABLE IF NOT EXISTS tmp_orders_to_settle (
        id TEXT PRIMARY KEY,
        order_total NUMERIC(10,2),
        previously_settled NUMERIC(10,2),
        outstanding_amount NUMERIC(10,2),
        created_at TIMESTAMPTZ
    ) ON COMMIT DROP;
    DELETE FROM tmp_orders_to_settle;

    IF p_order_ids IS NOT NULL AND pg_catalog.array_length(p_order_ids, 1) > 0 THEN
        INSERT INTO tmp_orders_to_settle (id, order_total, previously_settled, outstanding_amount, created_at)
        SELECT 
            o.id,
            o.total_amount,
            COALESCE(prev.settled_sum, 0.00),
            (o.total_amount - COALESCE(prev.settled_sum, 0.00)),
            o.created_at
        FROM public.foody_orders o
        LEFT JOIN (
            SELECT a.order_id, SUM(a.amount_allocated) AS settled_sum
            FROM public.foody_cash_settlement_allocations a
            JOIN public.foody_cash_settlements st ON st.id = a.settlement_id
            WHERE st.status <> 'reversed'
            GROUP BY a.order_id
        ) prev ON prev.order_id = o.id
        WHERE o.id = ANY(p_order_ids)
          AND o.shop_id = p_shop_id
          AND o.rider_id = p_rider_id
          AND o.payment_method IN ('cash', 'cod')
          AND o.cash_status = 'collected'
        ORDER BY o.created_at ASC, o.id ASC
        FOR UPDATE OF o;

        -- 7. REVALIDATE EXPLICIT ORDER IDS AFTER ACQUIRING ROW LOCKS
        SELECT pg_catalog.array_agg(oid) INTO v_invalid_order_ids
        FROM pg_catalog.unnest(p_order_ids) oid
        WHERE oid NOT IN (
            SELECT id FROM tmp_orders_to_settle WHERE outstanding_amount > 0
        );

        IF v_invalid_order_ids IS NOT NULL AND pg_catalog.array_length(v_invalid_order_ids, 1) > 0 THEN
            RAISE EXCEPTION 'CONCURRENT_MODIFICATION_OR_INVALID_ORDER: The following order(s) are invalid, already settled by a concurrent transaction, or do not belong to rider "%" at shop "%": %',
                p_rider_id, p_shop_id, pg_catalog.array_to_string(v_invalid_order_ids, ', ');
        END IF;
    ELSE
        INSERT INTO tmp_orders_to_settle (id, order_total, previously_settled, outstanding_amount, created_at)
        SELECT 
            o.id,
            o.total_amount,
            COALESCE(prev.settled_sum, 0.00),
            (o.total_amount - COALESCE(prev.settled_sum, 0.00)),
            o.created_at
        FROM public.foody_orders o
        LEFT JOIN (
            SELECT a.order_id, SUM(a.amount_allocated) AS settled_sum
            FROM public.foody_cash_settlement_allocations a
            JOIN public.foody_cash_settlements st ON st.id = a.settlement_id
            WHERE st.status <> 'reversed'
            GROUP BY a.order_id
        ) prev ON prev.order_id = o.id
        WHERE o.rider_id = p_rider_id
          AND o.shop_id = p_shop_id
          AND o.payment_method IN ('cash', 'cod')
          AND o.cash_status = 'collected'
          AND (o.total_amount - COALESCE(prev.settled_sum, 0.00)) > 0
        ORDER BY o.created_at ASC, o.id ASC
        FOR UPDATE OF o;
    END IF;

    -- 8. Calculate true expected cash from individually locked outstanding debts
    SELECT COALESCE(SUM(outstanding_amount), 0.00), COUNT(*)
    INTO v_expected_amount, v_order_count
    FROM tmp_orders_to_settle;

    IF v_expected_amount <= 0 AND v_amount_received <= 0 THEN
        RAISE EXCEPTION 'NO_SETTLEMENT_PENDING: No unsettled cash collections found for rider "%" at kitchen "%".', p_rider_id, p_shop_id;
    END IF;

    -- 9. Variance & Status Calculation
    IF v_amount_received < v_expected_amount THEN
        v_shortage := v_expected_amount - v_amount_received;
        v_status := 'partial_settlement';
    ELSIF v_amount_received > v_expected_amount THEN
        v_excess := v_amount_received - v_expected_amount;
        v_status := 'excess_settlement';
    ELSE
        v_status := 'full_settlement';
    END IF;

    v_settlement_id := 'csh_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
    v_journal_id := 'jrn_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);

    -- 10. Insert Master Settlement Record
    v_requested_order_ids := CASE
        WHEN COALESCE(pg_catalog.array_length(p_order_ids, 1), 0) > 0 THEN
            ARRAY(
                SELECT DISTINCT requested_id
                FROM pg_catalog.unnest(p_order_ids) AS requested_id
                ORDER BY requested_id
            )
        ELSE NULL
    END;

    INSERT INTO public.foody_cash_settlements (
        id, shop_id, rider_id, expected_amount, rider_declared_amount,
        cashier_received_amount, shortage_amount, excess_amount, status,
        declared_by, received_by, notes, idempotency_key,
        requested_order_ids, request_payload_verified, created_at
    ) VALUES (
        v_settlement_id, p_shop_id, p_rider_id, v_expected_amount, v_declared_amount,
        v_amount_received, v_shortage, v_excess, v_status,
        p_rider_id, v_cashier_name, p_notes, NULLIF(pg_catalog.btrim(p_idempotency_key), ''),
        v_requested_order_ids, true, NOW()
    );

    -- 11. Deterministic FIFO Waterfall Allocation (Tracking previously_settled and remaining_debt)
    v_remaining_to_allocate := v_amount_received;

    FOR v_rec IN SELECT id, order_total, previously_settled, outstanding_amount, created_at FROM tmp_orders_to_settle ORDER BY created_at ASC, id ASC LOOP
        IF v_remaining_to_allocate >= v_rec.outstanding_amount THEN
            v_alloc_for_order := v_rec.outstanding_amount;
            v_order_debt_remaining := 0.00;

            -- 100% satisfied: Mark order settled
            UPDATE public.foody_orders
            SET settlement_id = v_settlement_id,
                cash_status = 'settled',
                updated_at = NOW()
            WHERE id = v_rec.id;

            v_settled_order_ids := pg_catalog.array_append(v_settled_order_ids, v_rec.id);
        ELSIF v_remaining_to_allocate > 0 THEN
            v_alloc_for_order := v_remaining_to_allocate;
            v_order_debt_remaining := v_rec.outstanding_amount - v_alloc_for_order;

            -- Incomplete partial payment: cash_status stays 'collected' to preserve liability!
            UPDATE public.foody_orders
            SET updated_at = NOW()
            WHERE id = v_rec.id;
        ELSE
            v_alloc_for_order := 0.00;
            v_order_debt_remaining := v_rec.outstanding_amount;
        END IF;

        v_remaining_to_allocate := GREATEST(0.00, v_remaining_to_allocate - v_alloc_for_order);
        v_allocated_total := v_allocated_total + v_alloc_for_order;

        -- Record allocation with accurate previously_settled and remaining debt
        INSERT INTO public.foody_cash_settlement_allocations (
            settlement_id, order_id, amount_allocated, order_total,
            previously_settled, remaining_order_debt, created_at
        ) VALUES (
            v_settlement_id, v_rec.id, v_alloc_for_order, v_rec.order_total,
            v_rec.previously_settled, v_order_debt_remaining, NOW()
        );

        v_allocated_orders := v_allocated_orders || pg_catalog.jsonb_build_object(
            'order_id', v_rec.id,
            'order_total', v_rec.order_total,
            'previously_settled', v_rec.previously_settled,
            'allocated', v_alloc_for_order,
            'remaining_debt', v_order_debt_remaining,
            'is_fully_settled', (v_order_debt_remaining = 0)
        );
    END LOOP;

    -- 12. Insert Immutable Double-Entry Ledger Entries
    -- Debit: Physical Cash Received into Kitchen Register
    INSERT INTO public.foody_cash_ledger_entries (
        account_id, rider_id, shop_id, settlement_id, transaction_type,
        direction, amount, reference_id, actor_id, notes, created_at
    ) VALUES (
        v_account_id, p_rider_id, p_shop_id, v_settlement_id, 'cash_handover',
        'debit', v_amount_received, v_settlement_id, v_caller_id,
        format('Physical cash received from courier %s', p_rider_id), NOW()
    );

    -- Credit: Rider Custody Liability Relief
    INSERT INTO public.foody_cash_ledger_entries (
        account_id, rider_id, shop_id, settlement_id, transaction_type,
        direction, amount, reference_id, actor_id, notes, created_at
    ) VALUES (
        v_account_id, p_rider_id, p_shop_id, v_settlement_id, 'cash_handover',
        'credit', v_allocated_total, v_settlement_id, v_caller_id,
        format('Allocated cash relief for %s orders', pg_catalog.array_length(v_settled_order_ids, 1)), NOW()
    );

    -- If excess cash, Credit Suspense Account in ledger
    IF v_excess > 0 THEN
        INSERT INTO public.foody_cash_ledger_entries (
            account_id, rider_id, shop_id, settlement_id, transaction_type,
            direction, amount, reference_id, actor_id, notes, created_at
        ) VALUES (
            v_account_id, p_rider_id, p_shop_id, v_settlement_id, 'excess_credit',
            'credit', v_excess, v_settlement_id, v_caller_id,
            'Surplus cash booked into unallocated suspense account', NOW()
        );
    END IF;

    -- 13. Record Balanced Double-Entry Journals
    INSERT INTO public.foody_cash_journals (id, settlement_id, transaction_type, reference, created_at)
    VALUES (v_journal_id, v_settlement_id, 'rider_cash_handover', v_settlement_id, NOW());

    INSERT INTO public.foody_cash_journal_lines (journal_id, account_name, debit, credit, reference, created_at)
    VALUES
        (v_journal_id, 'Cash In Kitchen Register (Asset)', v_amount_received, 0.00, v_settlement_id, NOW()),
        (v_journal_id, 'Rider Custody Receivable (Asset)', 0.00, v_allocated_total, v_settlement_id, NOW());

    IF v_excess > 0 THEN
        INSERT INTO public.foody_cash_journal_lines (journal_id, account_name, debit, credit, reference, created_at)
        VALUES (v_journal_id, 'Cashier Suspense / Excess Cash (Liability)', 0.00, v_excess, v_settlement_id, NOW());
    END IF;

    -- 14. Update Account Projections (total_settled counts order allocations only; no silent clamping)
    UPDATE public.foody_cash_accounts
    SET outstanding_amount = outstanding_amount - v_allocated_total,
        total_settled = total_settled + v_allocated_total,
        updated_at = NOW()
    WHERE id = v_account_id;

    -- Derive rider profile projections directly from canonical cash accounts
    SELECT COALESCE(SUM(outstanding_amount), 0.00)
    INTO v_total_rider_float
    FROM public.foody_cash_accounts
    WHERE rider_id = p_rider_id;

    UPDATE public.foody_users
    SET cash_in_hand = v_total_rider_float,
        unsettled_debt = v_total_rider_float
    WHERE id = p_rider_id;

    UPDATE public.foody_logged_users
    SET cash_in_hand = v_total_rider_float,
        unsettled_debt = v_total_rider_float
    WHERE id = p_rider_id;

    -- 15. Record Audit Log
    INSERT INTO public.foody_financial_audit_logs (
        actor_id, actor_role, action, resource_type, resource_id,
        previous_state, new_state, created_at
    ) VALUES (
        v_caller_id, v_cashier_role, 'record_cash_settlement', 'foody_cash_settlements', v_settlement_id,
        pg_catalog.jsonb_build_object('expected_amount', v_expected_amount, 'orders_count', v_order_count),
        pg_catalog.jsonb_build_object(
            'received_amount', v_amount_received,
            'status', v_status,
            'settled_orders', v_settled_order_ids,
            'shortage', v_shortage,
            'excess', v_excess
        ),
        NOW()
    );

    -- 16. Return Authoritative Success Payload
    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'settlement_id', v_settlement_id,
        'rider_id', p_rider_id,
        'shop_id', p_shop_id,
        'expected_amount', v_expected_amount,
        'received_amount', v_amount_received,
        'declared_amount', v_declared_amount,
        'shortage_amount', v_shortage,
        'excess_amount', v_excess,
        'status', v_status,
        'order_count', v_order_count,
        'settled_orders', v_settled_order_ids,
        'allocations', v_allocated_orders,
        'cashier_name', v_cashier_name,
        'created_at', NOW()
    );
END;
$$;


REVOKE ALL ON FUNCTION public.record_rider_cash_settlement(TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT[], TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_rider_cash_settlement(TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT[], TEXT, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
