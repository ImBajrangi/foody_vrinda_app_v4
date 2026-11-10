-- ========================================================================
-- FOODY VRINDA — V5.4 AUTHORITATIVE BILLING & CASH RECONCILIATION TEST SUITE
-- ========================================================================
-- PURPOSE: Real PostgreSQL Database Integration Tests (Run only on a disposable Alpha/Dev database after migrations 20261110000001 through 20261110000005)
--   1. Strict cross-shop authorization & SECURITY DEFINER protection (Shop A vs Shop B)
--   2. Real COD collection trigger & double-entry journal posting
--   3. Real P0 Partial Settlement (₹500 order -> ₹100 handover -> ₹400 handover)
--   4. Accurate previously_settled & remaining_order_debt state tracking
--   5. Profile projections derived from canonical financial accounts (Zero drift, Zero silent clamping)
--   6. Real Idempotency Replay (Zero duplicate journal lines)
--   7. Real Settlement Reversal with database-enforced idempotency & trigger suppression
--   8. Immutable tamper protection triggers on financial ledgers
--   9. Idempotency payload mismatch rejection (explicit order list vs NULL)
--
-- EXECUTION: Run in Supabase SQL Editor against Alpha / Dev Database
-- ========================================================================

-- Diagnostic Output Table
CREATE TEMP TABLE IF NOT EXISTS _billing_test_results (
    test_id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    expected TEXT NOT NULL,
    observed TEXT NOT NULL,
    verdict TEXT NOT NULL
);
TRUNCATE _billing_test_results;

DO $$
DECLARE
    v_shop_a TEXT := 'test-shop-alpha-' || substr(md5(random()::text), 1, 6);
    v_shop_b TEXT := 'test-shop-beta-' || substr(md5(random()::text), 1, 6);
    v_owner_a_id TEXT := 'a0000000-0000-0000-0000-' || substr(md5(random()::text), 1, 12);
    v_owner_b_id TEXT := 'b0000000-0000-0000-0000-' || substr(md5(random()::text), 1, 12);
    v_rider_id TEXT := 'r0000000-0000-0000-0000-' || substr(md5(random()::text), 1, 12);
    v_order_id TEXT := 'ord_test_500_' || substr(md5(random()::text), 1, 8);
    v_settle_res JSONB;
    v_settle_res_2 JSONB;
    v_rev_res JSONB;
    v_settlement_id_1 TEXT;
    v_settlement_id_2 TEXT;
    v_account RECORD;
    v_alloc RECORD;
    v_order RECORD;
    v_user RECORD;
    v_err_caught BOOLEAN := false;
    v_err_msg TEXT := '';
BEGIN
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'STARTING FOODY VRINDA BILLING INTEGRATION TEST SUITE (v5.4)';
    RAISE NOTICE '=============================================================';

    -- -------------------------------------------------------------------------
    -- FIXTURE SETUP: Create isolated test shops, owners, and rider
    -- -------------------------------------------------------------------------
    INSERT INTO public.foody_shops (id, name, address, phone, is_open, is_active)
    VALUES 
        (v_shop_a, 'Alpha Test Kitchen', 'Raman Reti', '9876500001', true, true),
        (v_shop_b, 'Beta Test Kitchen', 'Prem Mandir', '9876500002', true, true);

    -- Owner A belongs to Shop A
    INSERT INTO public.foody_logged_users (id, display_name, email, phone, role, shop_id, is_active)
    VALUES (v_owner_a_id, 'Owner Alpha', 'owner.a@test.com', '9876500011', 'owner', v_shop_a, true);

    -- Owner B belongs to Shop B
    INSERT INTO public.foody_logged_users (id, display_name, email, phone, role, shop_id, is_active)
    VALUES (v_owner_b_id, 'Owner Beta', 'owner.b@test.com', '9876500012', 'owner', v_shop_b, true);

    -- Rider Sarathi
    INSERT INTO public.foody_users (id, display_name, email, phone, role, cash_in_hand, unsettled_debt)
    VALUES (v_rider_id, 'Rider Sarathi', 'sarathi@test.com', '9876500013', 'delivery', 0.00, 0.00);

    INSERT INTO public.foody_logged_users (id, display_name, email, phone, role, cash_in_hand, unsettled_debt, is_active)
    VALUES (v_rider_id, 'Rider Sarathi', 'sarathi@test.com', '9876500013', 'delivery', 0.00, 0.00, true);

    -- -------------------------------------------------------------------------
    -- TEST 1: COD COLLECTION TRIGGER (Creating ₹500 Order in Shop A)
    -- -------------------------------------------------------------------------
    INSERT INTO public.foody_orders (
        id, shop_id, rider_id, customer_name, customer_phone, customer_address,
        total_amount, payment_method, status, cash_status, delivery_address
    ) VALUES (
        v_order_id, v_shop_a, v_rider_id, 'Devotee Client', '9876500099', 'Radha Niwas, Raman Reti, Vrindavan',
        500.00, 'cash', 'completed', 'collected', 'Radha Niwas, Raman Reti, Vrindavan'
    );

    -- Verify foody_cash_accounts was initialized by trg_cod_collection_ledger
    SELECT * INTO v_account FROM public.foody_cash_accounts 
    WHERE rider_id = v_rider_id AND shop_id = v_shop_a;

    IF v_account.outstanding_amount = 500.00 AND v_account.total_collected = 500.00 THEN
        INSERT INTO _billing_test_results VALUES ('TEST_01', 'COD Collection Trigger Creates ₹500 Liability', 'outstanding=500.00', 'outstanding=' || v_account.outstanding_amount, 'PASS');
    ELSE
        INSERT INTO _billing_test_results VALUES ('TEST_01', 'COD Collection Trigger Creates ₹500 Liability', 'outstanding=500.00', 'outstanding=' || COALESCE(v_account.outstanding_amount::text, 'NULL'), 'FAIL');
    END IF;

    -- -------------------------------------------------------------------------
    -- TEST 2: CROSS-SHOP AUTHORIZATION GUARD (Owner B cannot settle Shop A)
    -- -------------------------------------------------------------------------
    -- Simulate JWT context for Owner B
    PERFORM set_config('request.jwt.claim.sub', v_owner_b_id, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_err_caught := false;
    BEGIN
        v_settle_res := public.record_rider_cash_settlement(
            p_rider_id := v_rider_id,
            p_shop_id := v_shop_a,
            p_amount_received := 100.00,
            p_idempotency_key := 'idem_cross_shop_exploit_' || v_order_id
        );
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := true;
        v_err_msg := SQLERRM;
    END;

    IF v_err_caught AND v_err_msg LIKE '%UNAUTHORIZED%' THEN
        INSERT INTO _billing_test_results VALUES ('TEST_02', 'Cross-Shop Settlement Rejection (Owner B cannot settle Shop A)', 'UNAUTHORIZED Exception', v_err_msg, 'PASS');
    ELSE
        INSERT INTO _billing_test_results VALUES ('TEST_02', 'Cross-Shop Settlement Rejection (Owner B cannot settle Shop A)', 'UNAUTHORIZED Exception', COALESCE(v_err_msg, 'Exploit passed with 0 error'), 'FAIL');
    END IF;

    -- -------------------------------------------------------------------------
    -- TEST 3: P0 PARTIAL SETTLEMENT — HANDOVER 1 (Owner A settles ₹100 of ₹500)
    -- -------------------------------------------------------------------------
    -- Switch JWT context to Owner A
    PERFORM set_config('request.jwt.claim.sub', v_owner_a_id, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_settle_res := public.record_rider_cash_settlement(
        p_rider_id := v_rider_id,
        p_shop_id := v_shop_a,
        p_amount_received := 100.00,
        p_idempotency_key := 'idem_step1_' || v_order_id,
        p_order_ids := ARRAY[v_order_id]
    );
    v_settlement_id_1 := v_settle_res ->> 'settlement_id';

    -- Verify allocation row
    SELECT * INTO v_alloc FROM public.foody_cash_settlement_allocations 
    WHERE settlement_id = v_settlement_id_1 AND order_id = v_order_id;

    -- Verify order cash_status
    SELECT * INTO v_order FROM public.foody_orders WHERE id = v_order_id;

    -- Verify rider profile projections
    SELECT * INTO v_user FROM public.foody_users WHERE id = v_rider_id;

    SELECT * INTO v_account FROM public.foody_cash_accounts 
    WHERE rider_id = v_rider_id AND shop_id = v_shop_a;

    IF v_alloc.amount_allocated = 100.00 
       AND v_alloc.remaining_order_debt = 400.00 
       AND v_order.cash_status = 'collected' 
       AND v_account.outstanding_amount = 400.00
       AND v_user.cash_in_hand = 400.00 
       AND v_user.unsettled_debt = 400.00 THEN
        INSERT INTO _billing_test_results VALUES ('TEST_03', 'Handover 1 (₹100 of ₹500): alloc=100, remaining=400, cash_status=collected', 'remaining=400, debt=400', 'remaining=' || v_alloc.remaining_order_debt || ', user_debt=' || v_user.unsettled_debt, 'PASS');
    ELSE
        INSERT INTO _billing_test_results VALUES ('TEST_03', 'Handover 1 (₹100 of ₹500): alloc=100, remaining=400, cash_status=collected', 'remaining=400, debt=400', 'alloc=' || v_alloc.amount_allocated || ', order_status=' || v_order.cash_status || ', user_debt=' || v_user.unsettled_debt, 'FAIL');
    END IF;

    -- -------------------------------------------------------------------------
    -- TEST 10: IDEMPOTENCY PAYLOAD COLLISION (Explicit order list vs omitted list)
    -- The original Handover 1 used ARRAY[v_order_id]. Replaying the same key
    -- without p_order_ids must be rejected as a different request payload.
    -- -------------------------------------------------------------------------
    v_err_caught := false;
    v_err_msg := '';
    BEGIN
        PERFORM public.record_rider_cash_settlement(
            p_rider_id := v_rider_id,
            p_shop_id := v_shop_a,
            p_amount_received := 100.00,
            p_idempotency_key := 'idem_step1_' || v_order_id,
            p_order_ids := NULL
        );
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := true;
        v_err_msg := SQLERRM;
    END;

    IF v_err_caught AND v_err_msg LIKE '%IDEMPOTENCY_KEY_COLLISION%' THEN
        INSERT INTO _billing_test_results VALUES (
            'TEST_10',
            'Idempotency Payload Collision (Explicit order selection cannot replay as automatic selection)',
            'IDEMPOTENCY_KEY_COLLISION Exception',
            v_err_msg,
            'PASS'
        );
    ELSE
        INSERT INTO _billing_test_results VALUES (
            'TEST_10',
            'Idempotency Payload Collision (Explicit order selection cannot replay as automatic selection)',
            'IDEMPOTENCY_KEY_COLLISION Exception',
            COALESCE(v_err_msg, 'Mismatched replay was accepted'),
            'FAIL'
        );
    END IF;

    -- -------------------------------------------------------------------------
    -- TEST 4: P0 PARTIAL SETTLEMENT — HANDOVER 2 (Owner A settles remaining ₹400)
    -- -------------------------------------------------------------------------
    v_settle_res_2 := public.record_rider_cash_settlement(
        p_rider_id := v_rider_id,
        p_shop_id := v_shop_a,
        p_amount_received := 400.00,
        p_idempotency_key := 'idem_step2_' || v_order_id
    );
    v_settlement_id_2 := v_settle_res_2 ->> 'settlement_id';

    SELECT * INTO v_alloc FROM public.foody_cash_settlement_allocations 
    WHERE settlement_id = v_settlement_id_2 AND order_id = v_order_id;

    SELECT * INTO v_order FROM public.foody_orders WHERE id = v_order_id;
    SELECT * INTO v_account FROM public.foody_cash_accounts WHERE rider_id = v_rider_id AND shop_id = v_shop_a;
    SELECT * INTO v_user FROM public.foody_users WHERE id = v_rider_id;

    IF v_alloc.previously_settled = 100.00
       AND v_alloc.amount_allocated = 400.00 
       AND v_alloc.remaining_order_debt = 0.00 
       AND v_order.cash_status = 'settled' 
       AND v_account.outstanding_amount = 0.00
       AND v_account.total_settled = 500.00
       AND v_user.cash_in_hand = 0.00 
       AND v_user.unsettled_debt = 0.00 THEN
        INSERT INTO _billing_test_results VALUES ('TEST_04', 'Handover 2 (₹400 remainder): prev=100, remaining=0, final debt=0.00', 'prev=100, final_debt=0.00', 'prev=' || v_alloc.previously_settled || ', final_debt=' || v_user.unsettled_debt, 'PASS');
    ELSE
        INSERT INTO _billing_test_results VALUES ('TEST_04', 'Handover 2 (₹400 remainder): prev=100, remaining=0, final debt=0.00', 'prev=100, final_debt=0.00', 'prev=' || v_alloc.previously_settled || ', remaining=' || v_alloc.remaining_order_debt || ', user_debt=' || v_user.unsettled_debt, 'FAIL');
    END IF;

    -- -------------------------------------------------------------------------
    -- TEST 5: IDEMPOTENCY REPLAY (Same key returns existing receipt with 0 duplicate allocations)
    -- -------------------------------------------------------------------------
    DECLARE
        v_replay_res JSONB;
        v_lines_count INT;
    BEGIN
        v_replay_res := public.record_rider_cash_settlement(
            p_rider_id := v_rider_id,
            p_shop_id := v_shop_a,
            p_amount_received := 400.00,
            p_idempotency_key := 'idem_step2_' || v_order_id
        );

        SELECT COUNT(*) INTO v_lines_count 
        FROM public.foody_cash_journal_lines 
        WHERE reference = v_settlement_id_2;

        IF (v_replay_res ->> 'idempotent_replay')::boolean = true
           AND (v_replay_res ->> 'settlement_id') = v_settlement_id_2
           AND v_lines_count = 2 THEN
            INSERT INTO _billing_test_results VALUES ('TEST_05', 'Idempotency Replay (Zero duplicate journal lines on retry)', 'idempotent_replay=true, lines=2', 'replay=true, lines=' || v_lines_count, 'PASS');
        ELSE
            INSERT INTO _billing_test_results VALUES ('TEST_05', 'Idempotency Replay (Zero duplicate journal lines on retry)', 'idempotent_replay=true, lines=2', 'replay=' || COALESCE(v_replay_res ->> 'idempotent_replay', 'null') || ', lines=' || v_lines_count, 'FAIL');
        END IF;
    END;

    -- -------------------------------------------------------------------------
    -- TEST 6: P0 SETTLEMENT REVERSAL & COD TRIGGER DOUBLE-POSTING GUARD
    -- -------------------------------------------------------------------------
    -- Owner A reverses settlement 2 (₹400)
    v_rev_res := public.record_settlement_reversal(
        p_settlement_id := v_settlement_id_2,
        p_reason := 'Disputed currency notes'
    );

    SELECT * INTO v_order FROM public.foody_orders WHERE id = v_order_id;
    SELECT * INTO v_account FROM public.foody_cash_accounts WHERE rider_id = v_rider_id AND shop_id = v_shop_a;
    SELECT * INTO v_user FROM public.foody_users WHERE id = v_rider_id;

    -- Invariant: Order cash_status reverted to 'collected'; COD trigger was NOT double-posted; account balance restored to ₹400
    IF v_order.cash_status = 'collected'
       AND v_account.outstanding_amount = 400.00
       AND v_account.total_settled = 100.00
       AND v_user.cash_in_hand = 400.00
       AND v_user.unsettled_debt = 400.00 THEN
        INSERT INTO _billing_test_results VALUES ('TEST_06', 'Settlement Reversal (Order reverted, COD trigger suppressed, float restored to 400)', 'reverted=collected, float=400.00', 'status=' || v_order.cash_status || ', float=' || v_account.outstanding_amount, 'PASS');
    ELSE
        INSERT INTO _billing_test_results VALUES ('TEST_06', 'Settlement Reversal (Order reverted, COD trigger suppressed, float restored to 400)', 'reverted=collected, float=400.00', 'status=' || v_order.cash_status || ', float=' || v_account.outstanding_amount || ', debt=' || v_user.unsettled_debt, 'FAIL');
    END IF;

    -- -------------------------------------------------------------------------
    -- TEST 7: REPEATED REVERSAL REJECTION
    -- -------------------------------------------------------------------------
    v_err_caught := false;
    v_err_msg := '';
    BEGIN
        PERFORM public.record_settlement_reversal(v_settlement_id_2, 'Second reversal attempt');
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := true;
        v_err_msg := SQLERRM;
    END;

    IF v_err_caught AND v_err_msg LIKE '%ALREADY_REVERSED%' THEN
        INSERT INTO _billing_test_results VALUES ('TEST_07', 'Repeated Reversal Rejection (Database-enforced idempotency)', 'ALREADY_REVERSED Exception', v_err_msg, 'PASS');
    ELSE
        INSERT INTO _billing_test_results VALUES ('TEST_07', 'Repeated Reversal Rejection (Database-enforced idempotency)', 'ALREADY_REVERSED Exception', COALESCE(v_err_msg, 'No error thrown'), 'FAIL');
    END IF;

    -- -------------------------------------------------------------------------
    -- TEST 8: CROSS-SHOP REVERSAL REJECTION (Owner B cannot reverse Shop A settlement)
    -- -------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claim.sub', v_owner_b_id, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_err_caught := false;
    v_err_msg := '';
    BEGIN
        PERFORM public.record_settlement_reversal(v_settlement_id_1, 'Owner B unauthorized reversal');
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := true;
        v_err_msg := SQLERRM;
    END;

    IF v_err_caught AND v_err_msg LIKE '%UNAUTHORIZED%' THEN
        INSERT INTO _billing_test_results VALUES ('TEST_08', 'Cross-Shop Reversal Rejection (Owner B cannot reverse Shop A settlement)', 'UNAUTHORIZED Exception', v_err_msg, 'PASS');
    ELSE
        INSERT INTO _billing_test_results VALUES ('TEST_08', 'Cross-Shop Reversal Rejection (Owner B cannot reverse Shop A settlement)', 'UNAUTHORIZED Exception', COALESCE(v_err_msg, 'Exploit passed'), 'FAIL');
    END IF;

    -- -------------------------------------------------------------------------
    -- TEST 9: IMMUTABILITY TAMPER PROTECTION (Direct UPDATE / DELETE Blocked)
    -- -------------------------------------------------------------------------
    v_err_caught := false;
    v_err_msg := '';
    BEGIN
        UPDATE public.foody_cash_ledger_entries 
        SET amount = 99999.00 
        WHERE rider_id = v_rider_id;
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := true;
        v_err_msg := SQLERRM;
    END;

    IF v_err_caught AND v_err_msg LIKE '%strictly immutable%' THEN
        INSERT INTO _billing_test_results VALUES ('TEST_09', 'Ledger Immutability Trigger (UPDATE on foody_cash_ledger_entries blocked)', 'strictly immutable Exception', v_err_msg, 'PASS');
    ELSE
        INSERT INTO _billing_test_results VALUES ('TEST_09', 'Ledger Immutability Trigger (UPDATE on foody_cash_ledger_entries blocked)', 'strictly immutable Exception', COALESCE(v_err_msg, 'Tamper succeeded'), 'FAIL');
    END IF;

    -- -------------------------------------------------------------------------
    -- CLEANUP: Remove ephemeral test records
    -- -------------------------------------------------------------------------
    -- Reset security context to postgres for test teardown and allow cleanup
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.role', '', true);
    PERFORM set_config('foody.allow_ledger_cleanup', 'true', true);

    DELETE FROM public.foody_cash_settlement_reversals WHERE shop_id = v_shop_a;
    DELETE FROM public.foody_cash_journal_lines WHERE reference IN (v_settlement_id_1, v_settlement_id_2, v_order_id);
    DELETE FROM public.foody_cash_journals WHERE reference_id IN (v_settlement_id_1, v_settlement_id_2, v_order_id);
    DELETE FROM public.foody_cash_ledger_entries WHERE shop_id = v_shop_a;
    DELETE FROM public.foody_cash_settlement_allocations WHERE settlement_id IN (v_settlement_id_1, v_settlement_id_2);
    DELETE FROM public.foody_cash_settlements WHERE shop_id = v_shop_a;
    DELETE FROM public.foody_cash_accounts WHERE shop_id = v_shop_a;
    DELETE FROM public.foody_orders WHERE id = v_order_id;
    DELETE FROM public.foody_logged_users WHERE id IN (v_owner_a_id, v_owner_b_id, v_rider_id);
    DELETE FROM public.foody_users WHERE id = v_rider_id;
    DELETE FROM public.foody_shops WHERE id IN (v_shop_a, v_shop_b);

    RAISE NOTICE 'TEARDOWN COMPLETE: All isolated test records safely purged.';
END $$;

-- View Output Results
SELECT test_id, description, expected, observed, verdict 
FROM _billing_test_results 
ORDER BY test_id;

-- Fail the SQL Editor run if any integration assertion failed.
DO $$
DECLARE
    v_failed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_failed_count
    FROM _billing_test_results
    WHERE verdict <> 'PASS';

    IF v_failed_count > 0 THEN
        RAISE EXCEPTION 'BILLING_INTEGRATION_FAILED: % of % database assertions failed.',
            v_failed_count, (SELECT COUNT(*) FROM _billing_test_results);
    END IF;

    RAISE NOTICE 'BILLING_INTEGRATION_PASSED: % database assertions passed.',
        (SELECT COUNT(*) FROM _billing_test_results);
END $$;
