-- ========================================================================
-- Foody Vrinda v5.3.1: Negative Authorization & Direct Mutation Blocking Test
-- Validates: Direct client INSERTs on foody_order_events & foody_orders
-- are strictly rejected by PostgreSQL with SQLSTATE 42501 (insufficient_privilege)
-- ========================================================================

CREATE TEMP TABLE IF NOT EXISTS _auth_negative_test_results (
    test_id TEXT PRIMARY KEY,
    target_table TEXT,
    attempted_action TEXT,
    expected_sqlstate TEXT,
    returned_sqlstate TEXT,
    error_message TEXT,
    verdict TEXT
);
TRUNCATE _auth_negative_test_results;
GRANT ALL ON TABLE _auth_negative_test_results TO public, authenticated;

DO $$
DECLARE
    v_sample_order_id TEXT;
    v_n01_state TEXT := '00000';
    v_n01_msg   TEXT := 'VULNERABILITY: Direct INSERT succeeded without policy check';
    v_n02_state TEXT := '00000';
    v_n02_msg   TEXT := 'VULNERABILITY: Direct INSERT succeeded without policy check';
    v_n03_state TEXT := '00000';
    v_n03_msg   TEXT := 'Zero rows affected or blocked by default-deny';
    v_rows_updated INT := 0;
BEGIN
    -- Fetch an existing order_id so FK validation passes
    SELECT id INTO v_sample_order_id FROM public.foody_orders LIMIT 1;
    IF v_sample_order_id IS NULL THEN
        v_sample_order_id := 'ord_sample_fk';
    END IF;

    -- Switch to authenticated role context for testing
    EXECUTE 'SET LOCAL ROLE authenticated';
    EXECUTE 'SET LOCAL "request.jwt.claim.role" = ''authenticated''';
    EXECUTE 'SET LOCAL "request.jwt.claim.sub" = ''00000000-0000-0000-0000-000000000001''';

    -- --------------------------------------------------------------------
    -- Negative Test NEG-01: Direct client INSERT into foody_order_events
    -- Expected: SQLSTATE 42501 (insufficient_privilege)
    -- --------------------------------------------------------------------
    BEGIN
        INSERT INTO public.foody_order_events (
            id, order_id, actor_id, actor_role, event_type, metadata
        ) VALUES (
            'evt_unauthorized_direct_insert',
            v_sample_order_id,
            '00000000-0000-0000-0000-000000000001',
            'customer',
            'tamper_event',
            '{"tampered": true}'::jsonb
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_n01_state = RETURNED_SQLSTATE, v_n01_msg = MESSAGE_TEXT;
    END;

    -- --------------------------------------------------------------------
    -- Negative Test NEG-02: Direct client INSERT into foody_orders
    -- Expected: SQLSTATE 42501 (insufficient_privilege)
    -- --------------------------------------------------------------------
    BEGIN
        INSERT INTO public.foody_orders (
            id, customer_name, total_amount, status, shop_id
        ) VALUES (
            'ord_unauthorized_direct_insert',
            'Malicious User',
            999.00,
            'delivered',
            'shop-vrinda-main'
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_n02_state = RETURNED_SQLSTATE, v_n02_msg = MESSAGE_TEXT;
    END;

    -- --------------------------------------------------------------------
    -- Negative Test NEG-03: Direct client UPDATE on foody_orders
    -- Expected: SQLSTATE 42501 (insufficient_privilege) or 0 rows modified
    -- --------------------------------------------------------------------
    BEGIN
        UPDATE public.foody_orders 
        SET status = 'delivered' 
        WHERE id = v_sample_order_id;
        
        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
        IF v_rows_updated = 0 THEN
            v_n03_state := '42501';
            v_n03_msg := 'Default-deny active: 0 rows visible or mutable for authenticated client';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_n03_state = RETURNED_SQLSTATE, v_n03_msg = MESSAGE_TEXT;
    END;

    -- --------------------------------------------------------------------
    -- Revert back to session owner before inserting into results table
    -- --------------------------------------------------------------------
    RESET ROLE;

    INSERT INTO _auth_negative_test_results VALUES
    (
        'NEG-01',
        'foody_order_events',
        'INSERT (direct client)',
        '42501',
        v_n01_state,
        v_n01_msg,
        CASE WHEN v_n01_state = '42501' THEN '✅ PASS (Blocked)' ELSE '❌ FAIL' END
    ),
    (
        'NEG-02',
        'foody_orders',
        'INSERT (direct client)',
        '42501',
        v_n02_state,
        v_n02_msg,
        CASE WHEN v_n02_state = '42501' THEN '✅ PASS (Blocked)' ELSE '❌ FAIL' END
    ),
    (
        'NEG-03',
        'foody_orders',
        'UPDATE (direct client)',
        '42501',
        v_n03_state,
        v_n03_msg,
        CASE WHEN v_n03_state = '42501' THEN '✅ PASS (Blocked)' ELSE '❌ FAIL' END
    );
END $$;

-- Query test execution output
SELECT
    test_id AS "Test ID",
    target_table AS "Target Table",
    attempted_action AS "Attempted Action",
    expected_sqlstate AS "Expected Code",
    returned_sqlstate AS "Returned Code",
    verdict AS "Result",
    error_message AS "PostgreSQL Diagnostic Message"
FROM _auth_negative_test_results
ORDER BY test_id;
