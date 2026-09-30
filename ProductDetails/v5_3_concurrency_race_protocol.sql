-- ========================================================================
-- Foody Vrinda v5.3.1: Two-Connection Concurrency Race Test Protocol
-- Validates: Simultaneous competing claims on the same order result in
-- exactly 1 SUCCESS and exactly 1 REJECTION via SELECT ... FOR UPDATE serialization.
--
-- NOTE: Supabase auth.uid() strictly expects UUID v4 format.
-- Simulated rider IDs use canonical UUIDs:
--   Rider Race A: 11111111-1111-1111-1111-111111111111
--   Rider Race B: 22222222-2222-2222-2222-222222222222
-- ========================================================================

-- ========================================================================
-- STEP 1: SETUP TEST FIXTURE (Run once in Admin Tab)
-- ========================================================================
INSERT INTO public.foody_shops (id, name, address, is_active)
VALUES ('shop-race-test', 'Concurrency Race Test Shop', 'Vrindavan Dham', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.foody_logged_users (id, display_name, email, role, shop_id, shop_ids)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Rider Race A', 'rider-a@race.com', 'delivery', 'shop-race-test', '["shop-race-test"]'::jsonb),
    ('22222222-2222-2222-2222-222222222222', 'Rider Race B', 'rider-b@race.com', 'delivery', 'shop-race-test', '["shop-race-test"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
    role = EXCLUDED.role, 
    shop_id = EXCLUDED.shop_id,
    shop_ids = EXCLUDED.shop_ids;

DELETE FROM public.foody_order_events WHERE order_id = 'ord-race-contention';
DELETE FROM public.foody_orders WHERE id = 'ord-race-contention';

INSERT INTO public.foody_orders (
    id, shop_id, customer_name, customer_phone, customer_address,
    status, items, total_amount, pickup_otp_hash, pickup_otp_expires_at
) VALUES (
    'ord-race-contention', 'shop-race-test', 'Race Customer', '+919999900000', 'Vrindavan',
    'ready_for_pickup', '[{"name": "Thali", "qty": 1}]'::jsonb, 100.00,
    encode(digest('7777', 'sha256'), 'hex'), NOW() + INTERVAL '1 hour'
);

-- ========================================================================
-- STEP 2: SIMULTANEOUS EXECUTION PROTOCOL (Two Distinct Database Connections)
-- Open two separate browser tabs in Supabase SQL Editor:
-- ========================================================================

-- TAB 1 (Connection A - Rider Race A):
/*
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.role" = 'authenticated';
  SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

  -- Rider A claims pickup
  SELECT public.claim_order_pickup_atomic('ord-race-contention', '11111111-1111-1111-1111-111111111111', '7777');
COMMIT;
-- Expected: ✅ SUCCESS (Status transitions to picked_up, lock held during transaction)
*/

-- TAB 2 (Connection B - Rider Race B):
/*
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.role" = 'authenticated';
  SET LOCAL "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';

  -- Rider B simultaneously claims pickup on the exact same order
  SELECT public.claim_order_pickup_atomic('ord-race-contention', '22222222-2222-2222-2222-222222222222', '7777');
COMMIT;
-- Expected: ❌ REJECTED
-- Diagnostic: Blocks on FOR UPDATE until Tab 1 commits, then throws:
-- "Order ord-race-contention is in state "picked_up" — cannot claim for pickup." OR
-- "Pickup OTP has already been used for order ord-race-contention."
*/

-- ========================================================================
-- STEP 3: POST-RACE VERIFICATION (Run in Admin Tab)
-- ========================================================================
SELECT 
    id, 
    status, 
    rider_id, 
    pickup_otp_used_at,
    CASE 
        WHEN status = 'picked_up' AND rider_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222') 
        THEN '✅ PASS: Exactly 1 Winner Claimed Order'
        ELSE '❌ FAIL: Inconsistent Concurrency State'
    END AS concurrency_verdict
FROM public.foody_orders 
WHERE id = 'ord-race-contention';

SELECT 
    order_id, 
    event_sequence, 
    actor_id, 
    event_type, 
    created_at
FROM public.foody_order_events
WHERE order_id = 'ord-race-contention'
ORDER BY event_sequence;

-- ========================================================================
-- STEP 4: TEARDOWN TEST FIXTURE (Run after verification)
-- ========================================================================
/*
DELETE FROM public.foody_order_events WHERE order_id = 'ord-race-contention';
DELETE FROM public.foody_orders WHERE id = 'ord-race-contention';
DELETE FROM public.foody_logged_users WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM public.foody_shops WHERE id = 'shop-race-test';
*/
