-- ========================================================================
-- FOODY VRINDA: FOLLOW-UP FINANCIAL AUTHORIZATION & COD COLLECTION FIX
-- Migration: 20261110000002_financial_authorization_and_cod_insert_trigger.sql
-- ========================================================================
-- Corrects two issues discovered during final review of v5.4:
-- 1. SECURITY DEFINER shop authorization must not trust session_user=postgres
--    when an authenticated JWT identity is present (notably SQL Editor tests).
-- 2. COD collection ledger posting must support an order inserted already
--    marked as collected, as well as a later transition to collected.
--
-- This is additive. Do not rewrite the already-versioned 20261110000001
-- migration; apply this migration after it in Alpha/Dev first.
-- ========================================================================

-- 1. JWT-bound shop authorization. PostgreSQL function ownership is not
--    caller identity. Only a signed service_role claim or a verified app
--    identity in the authoritative user tables can authorize this helper.
CREATE OR REPLACE FUNCTION public.can_manage_shop_finances(p_shop_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    (auth.jwt() ->> 'role') = 'service_role'
    OR
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.foody_logged_users u
        WHERE u.id = auth.uid()::text
          AND u.is_active = true
          AND (
            u.role IN ('developer', 'grand_admin', 'admin', 'platform_admin', 'master_dev')
            OR (
              u.role IN ('owner', 'cashier', 'manager')
              AND (
                u.shop_id = p_shop_id
                OR (u.shop_ids IS NOT NULL AND u.shop_ids ? p_shop_id)
                OR p_shop_id = ANY (
                  SELECT jsonb_array_elements_text(COALESCE(u.shop_ids, '[]'::jsonb))
                )
              )
            )
          )
      )
    )
    OR
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.foody_users fu
        WHERE fu.id = auth.uid()::text
          AND (
            fu.role IN ('developer', 'grand_admin', 'admin', 'platform_admin', 'master_dev')
            OR (
              fu.role IN ('owner', 'cashier', 'manager')
              AND (
                fu.shop_id = p_shop_id
                OR (fu.shop_ids IS NOT NULL AND fu.shop_ids ? p_shop_id)
                OR p_shop_id = ANY (
                  SELECT jsonb_array_elements_text(COALESCE(fu.shop_ids, '[]'::jsonb))
                )
              )
            )
          )
      )
    )
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_shop_finances(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_shop_finances(TEXT) TO authenticated, service_role;

COMMENT ON FUNCTION public.can_manage_shop_finances(TEXT) IS
'Authorizes a signed service_role JWT or an active application user whose verified role is permitted for the requested shop. Never uses SECURITY DEFINER current_user/session_user as an application identity.';

-- 2. COD collection posting on INSERT and first transition to collected.
--    Keep reversal suppression transaction-local so restoring an order during
--    settlement reversal cannot post a second customer collection.
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
BEGIN
    IF pg_catalog.current_setting('foody.in_reversal', true) = 'true' THEN
        RETURN NEW;
    END IF;

    IF NEW.payment_method IN ('cash', 'cod')
       AND NEW.cash_status = 'collected'
       AND (TG_OP = 'INSERT' OR OLD.cash_status IS DISTINCT FROM 'collected')
       AND NEW.rider_id IS NOT NULL THEN

        v_actor := COALESCE(auth.uid()::text, NEW.rider_id);

        INSERT INTO public.foody_cash_accounts
            (rider_id, shop_id, outstanding_amount, total_collected, total_settled)
        VALUES
            (NEW.rider_id, NEW.shop_id, NEW.total_amount, NEW.total_amount, 0.00)
        ON CONFLICT (rider_id, shop_id)
        DO UPDATE SET
            outstanding_amount = public.foody_cash_accounts.outstanding_amount + NEW.total_amount,
            total_collected = public.foody_cash_accounts.total_collected + NEW.total_amount,
            updated_at = NOW();

        SELECT id
        INTO v_acc_id
        FROM public.foody_cash_accounts
        WHERE rider_id = NEW.rider_id
          AND shop_id = NEW.shop_id;

        INSERT INTO public.foody_cash_ledger_entries (
            account_id, rider_id, shop_id, order_id, transaction_type,
            direction, amount, reference_id, actor_id, notes, created_at
        ) VALUES (
            v_acc_id, NEW.rider_id, NEW.shop_id, NEW.id, 'cod_collection',
            'debit', NEW.total_amount, NEW.id, v_actor,
            format('COD collected by courier for order %s', NEW.id), NOW()
        );

        v_jrn_id := 'jrn_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);

        INSERT INTO public.foody_cash_journals
            (id, transaction_type, reference, created_at)
        VALUES
            (v_jrn_id, 'cod_collection', NEW.id, NOW());

        INSERT INTO public.foody_cash_journal_lines
            (journal_id, account_name, debit, credit, reference, created_at)
        VALUES
            (v_jrn_id, 'Rider Custody Float (Asset)', NEW.total_amount, 0.00, NEW.id, NOW()),
            (v_jrn_id, 'Shop Order Receivable (Asset)', 0.00, NEW.total_amount, NEW.id, NOW());
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cod_collection_ledger ON public.foody_orders;

CREATE TRIGGER trg_cod_collection_ledger
    AFTER INSERT OR UPDATE OF cash_status
    ON public.foody_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_cod_collection_ledger();

NOTIFY pgrst, 'reload schema';
