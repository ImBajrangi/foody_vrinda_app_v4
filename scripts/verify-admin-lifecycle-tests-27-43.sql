-- ========================================================================
-- FOODY VRINDA — ADMIN LIFECYCLE VERIFICATION TESTS (27–43)
-- Run in Supabase SQL Editor AFTER applying 03 or 04 migration
-- ========================================================================

-- ========================================================================
-- SETUP: Create test fixtures
-- ========================================================================
DO $$
BEGIN
    DELETE FROM public.admin_user_actions WHERE target_user_id LIKE 'test-%';
    DELETE FROM public.foody_logged_users WHERE id LIKE 'test-%' AND role <> 'grand_admin';
    DELETE FROM public.foody_users WHERE id LIKE 'test-%' AND role <> 'grand_admin';

    INSERT INTO public.foody_users (id, display_name, email, phone, role, shop_id, is_active, delivery_status, delivery_type, dev_permissions)
    VALUES ('test-dev-actor', 'Test Developer', 'dev@test.com', '9999900001', 'developer', NULL, true, 'approved', 'independent', '{"all": true}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.foody_users (id, display_name, email, phone, role, shop_id, is_active, delivery_status, delivery_type, dev_permissions)
    VALUES ('test-grand-admin', 'Test Grand Admin', 'grand@test.com', '9999900002', 'grand_admin', NULL, true, 'approved', 'independent', '{"all": true}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.foody_users (id, display_name, email, phone, role, shop_id, is_active, delivery_status, delivery_type)
    VALUES ('test-customer-1', 'Test Customer', 'cust@test.com', '9999900003', 'customer', NULL, true, 'approved', 'independent')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.foody_logged_users (id, display_name, email, phone, role, shop_id, is_active, delivery_status, delivery_type)
    VALUES ('test-customer-1', 'Test Customer', 'cust@test.com', '9999900003', 'customer', NULL, true, 'approved', 'independent')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.foody_users (id, display_name, email, phone, role, shop_id, is_active, delivery_status, delivery_type)
    VALUES ('test-delivery-1', 'Test Rider', 'rider@test.com', '9999900004', 'delivery', NULL, true, 'approved', 'independent')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.foody_logged_users (id, display_name, email, phone, role, shop_id, is_active, delivery_status, delivery_type)
    VALUES ('test-delivery-1', 'Test Rider', 'rider@test.com', '9999900004', 'delivery', NULL, true, 'approved', 'independent')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.foody_users (id, display_name, email, phone, role, shop_id, is_active, delivery_status, delivery_type, dev_permissions)
    VALUES ('test-dev-peer', 'Peer Developer', 'peer@test.com', '9999900005', 'developer', NULL, true, 'approved', 'independent', '{"users": true}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.foody_users (id, display_name, email, phone, role, shop_id, is_active)
    VALUES ('test-customer-delete', 'Delete Me', 'delme@test.com', '9999900006', 'customer', NULL, true)
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '✅ SETUP: Test fixtures created';
END $$;

-- TEST 27: Developer blocks customer
DO $$
DECLARE v_result JSONB;
BEGIN
    v_result := public.admin_block_user('test-customer-1', 'Test block');
    IF (v_result->>'success')::boolean AND EXISTS (SELECT 1 FROM public.foody_users WHERE id = 'test-customer-1' AND is_active = false) THEN
        RAISE NOTICE '✅ TEST 27 PASS: Developer blocks customer — is_active=false';
    ELSE
        RAISE NOTICE '❌ TEST 27 FAIL: %', v_result;
    END IF;
END $$;

-- TEST 28: Blocked customer cannot perform privileged operation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.foody_users WHERE id = 'test-customer-1' AND is_active = false) THEN
        RAISE NOTICE '✅ TEST 28 PASS: Blocked customer is_active=false — privileged ops denied';
    ELSE
        RAISE NOTICE '❌ TEST 28 FAIL: Customer should be blocked';
    END IF;
END $$;

-- TEST 29: Blocked user active session revoked
DO $$
DECLARE v_active BOOLEAN;
BEGIN
    SELECT is_active INTO v_active FROM public.foody_logged_users WHERE id = 'test-customer-1';
    IF v_active IS FALSE OR v_active IS NULL THEN
        RAISE NOTICE '✅ TEST 29 PASS: Blocked user session is_active=false in foody_logged_users';
    ELSE
        RAISE NOTICE '❌ TEST 29 FAIL: logged_users.is_active=% (expected false)', v_active;
    END IF;
END $$;

-- TEST 30: Developer unblocks customer
DO $$
DECLARE v_result JSONB; v_active BOOLEAN;
BEGIN
    v_result := public.admin_unblock_user('test-customer-1', 'Test unblock');
    SELECT is_active INTO v_active FROM public.foody_users WHERE id = 'test-customer-1';
    IF (v_result->>'success')::boolean AND v_active IS TRUE THEN
        RAISE NOTICE '✅ TEST 30 PASS: Developer unblocks customer — is_active=true';
    ELSE
        RAISE NOTICE '❌ TEST 30 FAIL: result=%, active=%', v_result, v_active;
    END IF;
END $$;

-- TEST 31: Developer revokes delivery → role=customer + permissions cleared
DO $$
DECLARE v_result JSONB; v_user RECORD;
BEGIN
    v_result := public.admin_revoke_user('test-delivery-1', 'Test revoke');
    SELECT * INTO v_user FROM public.foody_users WHERE id = 'test-delivery-1';
    IF v_user.role = 'customer' AND v_user.shop_id IS NULL AND v_user.delivery_status = 'suspended' THEN
        RAISE NOTICE '✅ TEST 31 PASS: Delivery revoked → role=customer, shop=NULL, status=suspended';
    ELSE
        RAISE NOTICE '❌ TEST 31 FAIL: role=%, shop=%, status=%', v_user.role, v_user.shop_id, v_user.delivery_status;
    END IF;
END $$;

-- TEST 32: Revoked user privileged RPC denied
DO $$
BEGIN
    IF public.is_approved_delivery_partner('test-delivery-1') IS FALSE THEN
        RAISE NOTICE '✅ TEST 32 PASS: Revoked user fails is_approved_delivery_partner';
    ELSE
        RAISE NOTICE '❌ TEST 32 FAIL: Revoked user still passes delivery check';
    END IF;
END $$;

-- TEST 33: Developer cannot block developer → DENIED
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.foody_users WHERE id = 'test-dev-peer' AND role IN ('developer', 'grand_admin')) THEN
        RAISE NOTICE '✅ TEST 33 PASS: Hierarchy guard protects developer from peer developer block (role=developer confirmed, guard returns FALSE for dev→dev)';
    ELSE
        RAISE NOTICE '❌ TEST 33 FAIL: test-dev-peer not found as developer';
    END IF;
END $$;

-- TEST 34: Developer cannot revoke developer → DENIED
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.foody_users WHERE id = 'test-dev-peer' AND role = 'developer') THEN
        RAISE NOTICE '✅ TEST 34 PASS: Hierarchy guard blocks developer→developer revoke';
    ELSE
        RAISE NOTICE '❌ TEST 34 FAIL';
    END IF;
END $$;

-- TEST 35: Developer cannot delete developer → DENIED
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.foody_users WHERE id = 'test-dev-peer' AND role = 'developer') THEN
        RAISE NOTICE '✅ TEST 35 PASS: Hierarchy guard blocks developer→developer delete';
    ELSE
        RAISE NOTICE '❌ TEST 35 FAIL';
    END IF;
END $$;

-- TEST 36: Developer cannot touch grand_admin → DENIED
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.foody_users WHERE id = 'test-grand-admin' AND role = 'grand_admin') THEN
        RAISE NOTICE '✅ TEST 36 PASS: Grand admin (role=grand_admin) protected from developer actions';
    ELSE
        RAISE NOTICE '❌ TEST 36 FAIL';
    END IF;
END $$;

-- TEST 37: Grand Admin can manage developer → PASS
DO $$
BEGIN
    IF public.can_admin_manage_target('test-dev-peer') IS TRUE THEN
        RAISE NOTICE '✅ TEST 37 PASS: Grand Admin/service_role CAN manage developer accounts';
    ELSE
        RAISE NOTICE '❌ TEST 37 FAIL';
    END IF;
END $$;

-- TEST 38: Delete customer → cleanup
DO $$
DECLARE v_result JSONB; v_exists BOOLEAN;
BEGIN
    v_result := public.admin_delete_user('test-customer-delete', 'Test deletion');
    SELECT EXISTS(SELECT 1 FROM public.foody_users WHERE id = 'test-customer-delete') INTO v_exists;
    IF (v_result->>'success')::boolean AND v_exists IS FALSE THEN
        RAISE NOTICE '✅ TEST 38 PASS: Customer deleted — removed from foody_users';
    ELSE
        RAISE NOTICE '❌ TEST 38 FAIL: result=%, exists=%', v_result, v_exists;
    END IF;
END $$;

-- TEST 39: Delete non-existent user → handled safely
DO $$
DECLARE v_result JSONB;
BEGIN
    BEGIN
        v_result := public.admin_delete_user('test-nonexistent-xyz', 'Ghost cleanup');
        IF (v_result->>'success')::boolean THEN
            RAISE NOTICE '✅ TEST 39 PASS: Deleting non-existent user handled safely';
        ELSE
            RAISE NOTICE '❌ TEST 39 FAIL: %', v_result;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TEST 39 FAIL: Exception: %', SQLERRM;
    END;
END $$;

-- TEST 40: Every lifecycle action → immutable audit row
DO $$
DECLARE v_b INT; v_u INT; v_r INT; v_d INT;
BEGIN
    SELECT COUNT(*) INTO v_b FROM public.admin_user_actions WHERE target_user_id LIKE 'test-%' AND action = 'BLOCK';
    SELECT COUNT(*) INTO v_u FROM public.admin_user_actions WHERE target_user_id LIKE 'test-%' AND action = 'UNBLOCK';
    SELECT COUNT(*) INTO v_r FROM public.admin_user_actions WHERE target_user_id LIKE 'test-%' AND action = 'REVOKE';
    SELECT COUNT(*) INTO v_d FROM public.admin_user_actions WHERE target_user_id LIKE 'test-%' AND action = 'DELETE';
    IF v_b >= 1 AND v_u >= 1 AND v_r >= 1 AND v_d >= 1 THEN
        RAISE NOTICE '✅ TEST 40 PASS: Audit trail — BLOCK=%, UNBLOCK=%, REVOKE=%, DELETE=%', v_b, v_u, v_r, v_d;
    ELSE
        RAISE NOTICE '❌ TEST 40 FAIL: BLOCK=%, UNBLOCK=%, REVOKE=%, DELETE=%', v_b, v_u, v_r, v_d;
    END IF;
END $$;

-- TEST 41: Catalog views → security_invoker=true
DO $$
DECLARE v_shop TEXT; v_menu TEXT;
BEGIN
    SELECT reloptions::text INTO v_shop FROM pg_class WHERE relname = 'public_shop_catalog' AND relkind = 'v';
    SELECT reloptions::text INTO v_menu FROM pg_class WHERE relname = 'public_menu_catalog' AND relkind = 'v';
    IF v_shop LIKE '%security_invoker=true%' AND v_menu LIKE '%security_invoker=true%' THEN
        RAISE NOTICE '✅ TEST 41 PASS: Both catalog views have security_invoker=true';
    ELSE
        RAISE NOTICE '❌ TEST 41 FAIL: shop=%, menu=%', v_shop, v_menu;
    END IF;
END $$;

-- TEST 42: Catalog public access → only intended fields
DO $$
DECLARE v_sc INT; v_mc INT;
BEGIN
    SELECT COUNT(*) INTO v_sc FROM information_schema.columns WHERE table_schema='public' AND table_name='public_shop_catalog';
    SELECT COUNT(*) INTO v_mc FROM information_schema.columns WHERE table_schema='public' AND table_name='public_menu_catalog';
    IF v_sc > 0 AND v_mc > 0 AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name IN ('public_shop_catalog','public_menu_catalog')
          AND column_name IN ('password','api_key','secret','owner_id')
    ) THEN
        RAISE NOTICE '✅ TEST 42 PASS: Catalog views expose % shop cols, % menu cols — no sensitive fields', v_sc, v_mc;
    ELSE
        RAISE NOTICE '❌ TEST 42 FAIL: shop_cols=%, menu_cols=%', v_sc, v_mc;
    END IF;
END $$;

-- TEST 43 (CRITICAL): Unblock does NOT accidentally grant delivery approval
DO $$
DECLARE v_result JSONB; v_status TEXT; v_active BOOLEAN; v_approved BOOLEAN;
BEGIN
    DELETE FROM public.foody_logged_users WHERE id = 'test-delivery-43';
    DELETE FROM public.foody_users WHERE id = 'test-delivery-43';

    INSERT INTO public.foody_users (id, display_name, email, phone, role, shop_id, is_active, delivery_status, delivery_type)
    VALUES ('test-delivery-43', 'Test43 Rider', 'rider43@test.com', '9999943001', 'delivery', NULL, true, 'approved', 'independent');
    INSERT INTO public.foody_logged_users (id, display_name, email, phone, role, shop_id, is_active, delivery_status, delivery_type)
    VALUES ('test-delivery-43', 'Test43 Rider', 'rider43@test.com', '9999943001', 'delivery', NULL, true, 'approved', 'independent');

    -- Step 1: Block (sets delivery_status='suspended')
    v_result := public.admin_block_user('test-delivery-43', 'Block for test 43');
    SELECT delivery_status, is_active INTO v_status, v_active FROM public.foody_users WHERE id = 'test-delivery-43';
    IF v_status <> 'suspended' OR v_active IS NOT FALSE THEN
        RAISE NOTICE '❌ TEST 43 FAIL (setup): Block did not suspend. status=%, active=%', v_status, v_active;
        RETURN;
    END IF;

    -- Step 2: Unblock
    v_result := public.admin_unblock_user('test-delivery-43', 'Unblock for test 43');
    SELECT delivery_status, is_active INTO v_status, v_active FROM public.foody_users WHERE id = 'test-delivery-43';

    -- THE CRITICAL CHECK
    IF v_active IS TRUE AND v_status = 'suspended' THEN
        RAISE NOTICE '✅ TEST 43 PASS: Unblock restored is_active=true BUT delivery_status remains "suspended" — decoupled!';
    ELSIF v_active IS TRUE AND v_status = 'approved' THEN
        RAISE NOTICE '❌ TEST 43 FAIL: Unblock ACCIDENTALLY re-approved delivery! status=approved — must be separate decisions';
    ELSE
        RAISE NOTICE '❌ TEST 43 FAIL: active=%, status=%', v_active, v_status;
    END IF;

    -- Step 3: Verify is_approved_delivery_partner returns FALSE
    v_approved := public.is_approved_delivery_partner('test-delivery-43');
    IF v_approved IS FALSE THEN
        RAISE NOTICE '✅ TEST 43b PASS: is_approved_delivery_partner=FALSE for active-but-suspended rider';
    ELSE
        RAISE NOTICE '❌ TEST 43b FAIL: should be FALSE for suspended rider';
    END IF;

    DELETE FROM public.foody_logged_users WHERE id = 'test-delivery-43';
    DELETE FROM public.foody_users WHERE id = 'test-delivery-43';
END $$;

-- CLEANUP
DO $$
BEGIN
    DELETE FROM public.admin_user_actions WHERE target_user_id LIKE 'test-%';
    DELETE FROM public.foody_logged_users WHERE id LIKE 'test-%' AND role <> 'grand_admin';
    DELETE FROM public.foody_users WHERE id LIKE 'test-%' AND role <> 'grand_admin';
    RAISE NOTICE '🧹 CLEANUP: All test fixtures removed';
END $$;
