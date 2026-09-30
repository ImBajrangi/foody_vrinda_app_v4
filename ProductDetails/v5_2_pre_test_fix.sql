-- ========================================================================
-- FOODY VRINDA v5.2 — PRE-TEST CONSTRAINT FIX
-- Run this BEFORE the test suite to update the old CHECK constraint
-- ========================================================================

-- Step 1: Drop the old status constraint
ALTER TABLE public.foody_orders DROP CONSTRAINT IF EXISTS foody_orders_status_check;

-- Step 2: Add the 19-state constraint
ALTER TABLE public.foody_orders ADD CONSTRAINT foody_orders_status_check CHECK (
  status IN (
    'new', 'payment_pending', 'confirmed', 'accepted', 'cooking',
    'ready_for_pickup', 'rider_assigned', 'rider_arriving',
    'picked_up', 'out_for_delivery', 'delivered', 'cancelled',
    'delivery_attempted_failed', 'refund_pending', 'refunded', 'disputed',
    'preparing', 'completed', 'returned'
  )
);

-- Step 3: Drop old cash_status constraint
ALTER TABLE public.foody_orders DROP CONSTRAINT IF EXISTS foody_orders_cash_status_check;

-- Step 4: Add updated cash_status constraint
ALTER TABLE public.foody_orders ADD CONSTRAINT foody_orders_cash_status_check CHECK (
  cash_status IN ('none', 'pending', 'collected', 'settled')
);

-- Step 5: Verify pgcrypto extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 6: Verify the state machine trigger exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_order_state'
  ) THEN
    RAISE NOTICE '⚠️ WARNING: State machine trigger trg_enforce_order_state is MISSING. Run the full v5.2 schema first.';
  ELSE
    RAISE NOTICE '✅ State machine trigger exists.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_compute_event_hash'
  ) THEN
    RAISE NOTICE '⚠️ WARNING: Hash chain trigger trg_compute_event_hash is MISSING. Run the full v5.2 schema first.';
  ELSE
    RAISE NOTICE '✅ Hash chain trigger exists.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_audit_tamper'
  ) THEN
    RAISE NOTICE '⚠️ WARNING: Audit immutability trigger trg_prevent_audit_tamper is MISSING.';
  ELSE
    RAISE NOTICE '✅ Audit immutability trigger exists.';
  END IF;
END $$;

-- Verify constraint applied
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.foody_orders'::regclass AND conname LIKE 'foody_orders_%_check';
