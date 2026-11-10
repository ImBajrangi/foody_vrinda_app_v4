-- ========================================================================
-- FOODY VRINDA: COD COLLECTION EXACT-ONCE & TRIGGER FUNCTION ACL HARDENING
-- Migration: 20261110000003_cod_collection_exact_once.sql
-- ========================================================================
-- Prerequisite: 20261110000002_financial_authorization_and_cod_insert_trigger
-- Scope:
--   * Enforce one canonical COD collection ledger event per order.
--   * Serialize trigger writes on the rider/shop cash account.
--   * Never increment account totals when the ledger event already exists.
--   * Remove direct API execution privileges from the trigger function.
-- ========================================================================

-- Refuse to silently discard/rewrite historical duplicate financial events.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.foody_cash_ledger_entries
        WHERE transaction_type = 'cod_collection'
          AND order_id IS NOT NULL
        GROUP BY order_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'COD_LEDGER_DUPLICATES_FOUND: reconcile duplicate cod_collection entries by order_id before applying migration 20261110000003.';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_ledger_cod_collection_order
    ON public.foody_cash_ledger_entries (order_id)
    WHERE transaction_type = 'cod_collection'
      AND order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_cod_collection_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_acc_id TEXT;
    v_jrn_id TEXT;
    v_actor TEXT;
    v_inserted_rows INTEGER := 0;
BEGIN
    IF pg_catalog.current_setting('foody.in_reversal', true) = 'true' THEN
        RETURN NEW;
    END IF;

    IF NEW.payment_method NOT IN ('cash', 'cod')
       OR NEW.cash_status <> 'collected'
       OR NEW.rider_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.cash_status IS NOT DISTINCT FROM 'collected' THEN
        RETURN NEW;
    END IF;

    v_actor := COALESCE(auth.uid()::text, NEW.rider_id);

    -- Create account shell first, then lock it before checking the order event.
    -- Competing COD events for the same rider/shop serialize on this row.
    INSERT INTO public.foody_cash_accounts
        (rider_id, shop_id, outstanding_amount, total_collected, total_settled)
    VALUES
        (NEW.rider_id, NEW.shop_id, 0.00, 0.00, 0.00)
    ON CONFLICT (rider_id, shop_id) DO NOTHING;

    SELECT id
    INTO v_acc_id
    FROM public.foody_cash_accounts
    WHERE rider_id = NEW.rider_id
      AND shop_id = NEW.shop_id
    FOR UPDATE;

    -- The partial unique index is the final race-safe guard. If the event
    -- already exists, this statement inserts nothing and the account/journal
    -- are deliberately left unchanged.
    INSERT INTO public.foody_cash_ledger_entries (
        account_id, rider_id, shop_id, order_id, transaction_type,
        direction, amount, reference_id, actor_id, notes, created_at
    ) VALUES (
        v_acc_id, NEW.rider_id, NEW.shop_id, NEW.id, 'cod_collection',
        'debit', NEW.total_amount, NEW.id, v_actor,
        format('COD collected by courier for order %s', NEW.id), NOW()
    )
    ON CONFLICT (order_id)
        WHERE transaction_type = 'cod_collection'
          AND order_id IS NOT NULL
    DO NOTHING;

    GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;

    IF v_inserted_rows = 0 THEN
        RETURN NEW;
    END IF;

    UPDATE public.foody_cash_accounts
    SET outstanding_amount = outstanding_amount + NEW.total_amount,
        total_collected = total_collected + NEW.total_amount,
        updated_at = NOW()
    WHERE id = v_acc_id;

    v_jrn_id := 'jrn_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);

    INSERT INTO public.foody_cash_journals (id, transaction_type, reference, created_at)
    VALUES (v_jrn_id, 'cod_collection', NEW.id, NOW());

    INSERT INTO public.foody_cash_journal_lines
        (journal_id, account_name, debit, credit, reference, created_at)
    VALUES
        (v_jrn_id, 'Rider Custody Float (Asset)', NEW.total_amount, 0.00, NEW.id, NOW()),
        (v_jrn_id, 'Shop Order Receivable (Asset)', 0.00, NEW.total_amount, NEW.id, NOW());

    RETURN NEW;
END;
$$;

-- The trigger is already defined by migration 20261110000002. Keep its
-- function unavailable through PostgREST/RPC; only the trigger invokes it.
REVOKE ALL ON FUNCTION public.handle_cod_collection_ledger() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
