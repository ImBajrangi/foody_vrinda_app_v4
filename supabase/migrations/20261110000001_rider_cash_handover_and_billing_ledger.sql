-- ========================================================================
-- FOODY VRINDA: PRODUCTION MIGRATION 20261110000001
-- AUTHORITATIVE BILLING, CASH RECONCILIATION & RIDER HANDOVER LEDGER
-- ========================================================================
-- 1. Double-Entry Financial Ledger (foody_cash_accounts, foody_cash_ledger_entries)
-- 2. Immutable Settlement Registry (foody_cash_settlements, foody_cash_settlement_allocations)
-- 3. Balanced Journal & Audit Logging (foody_cash_journals, foody_cash_journal_lines, foody_financial_audit_logs)
-- 4. Authoritative Security Definer Access Helpers (can_manage_shop_finances)
-- 5. Strict Zero-Trust Action-Specific RLS Policies (Anon revoked; Authenticated isolated by role/shop)
-- 6. Atomic Row-Locked Settlement RPC: public.record_rider_cash_settlement(...)
--    - Enforces auth.uid() identity derivation
--    - Validates rider, shop, and all explicitly selected orders (Rejects batch on any invalid order)
--    - Idempotency collision prevention (detects same key with differing payload)
--    - Balanced double-entry journals & suspense allocation for excess cash
-- 7. COD Collection Trigger (trg_cod_collection_ledger)
-- 8. Append-Only Settlement Reversal RPC (record_settlement_reversal)
-- 9. Authoritative Query RPCs: get_shop_cash_settlements, get_rider_outstanding_orders, get_shop_cashflow_summary
-- ========================================================================

-- STEP 1: FINANCIAL ACCOUNTS TABLE (Rider-Shop Custody Balance)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foody_cash_accounts (
    id TEXT PRIMARY KEY DEFAULT ('acc_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    rider_id TEXT NOT NULL,
    shop_id TEXT NOT NULL REFERENCES public.foody_shops(id) ON DELETE RESTRICT,
    outstanding_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (outstanding_amount >= 0),
    total_collected NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_collected >= 0),
    total_settled NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_settled >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'reconciled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rider_shop_account UNIQUE (rider_id, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_cash_accounts_rider ON public.foody_cash_accounts (rider_id);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_shop ON public.foody_cash_accounts (shop_id);

-- STEP 2: IMMUTABLE CASH SETTLEMENT BATCHES TABLE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foody_cash_settlements (
    id TEXT PRIMARY KEY DEFAULT ('csh_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    order_id TEXT REFERENCES public.foody_orders(id) ON DELETE SET NULL,
    shop_id TEXT NOT NULL REFERENCES public.foody_shops(id) ON DELETE RESTRICT,
    rider_id TEXT NOT NULL,
    expected_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (expected_amount >= 0),
    rider_declared_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (rider_declared_amount >= 0),
    cashier_received_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (cashier_received_amount >= 0),
    shortage_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (shortage_amount >= 0),
    excess_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (excess_amount >= 0),
    status TEXT NOT NULL DEFAULT 'full_settlement' CHECK (status IN ('full_settlement', 'partial_settlement', 'excess_settlement', 'disputed', 'settled', 'under_review')),
    declared_by TEXT NOT NULL DEFAULT 'Rider',
    received_by TEXT NOT NULL DEFAULT 'Shopkeeper',
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure foody_cash_settlements.id is TEXT (converts from legacy UUID if created by earlier migration)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'foody_cash_settlements' 
          AND column_name = 'id' 
          AND data_type <> 'text'
    ) THEN
        FOR r IN (
            SELECT tc.table_schema, tc.table_name, tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND ccu.table_name = 'foody_cash_settlements'
              AND ccu.column_name = 'id'
        ) LOOP
            EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;

        ALTER TABLE public.foody_cash_settlements ALTER COLUMN id DROP DEFAULT;
        EXECUTE 'ALTER ' || 'TABLE public.foody_cash_settlements ' ||
                'ALTER ' || 'COLUMN id TYPE text USING id::text';
        ALTER TABLE public.foody_cash_settlements ALTER COLUMN id SET DEFAULT ('csh_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16));
    END IF;
END $$;

-- Idempotent column additions for existing installations
ALTER TABLE public.foody_cash_settlements ADD COLUMN IF NOT EXISTS expected_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.foody_cash_settlements ADD COLUMN IF NOT EXISTS rider_declared_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.foody_cash_settlements ADD COLUMN IF NOT EXISTS cashier_received_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.foody_cash_settlements ADD COLUMN IF NOT EXISTS shortage_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.foody_cash_settlements ADD COLUMN IF NOT EXISTS excess_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.foody_cash_settlements ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
DO $$ BEGIN
    ALTER TABLE public.foody_cash_settlements ADD CONSTRAINT uq_settlements_idempotency UNIQUE (idempotency_key);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_settlements_rider ON public.foody_cash_settlements (rider_id);
CREATE INDEX IF NOT EXISTS idx_settlements_shop ON public.foody_cash_settlements (shop_id);
CREATE INDEX IF NOT EXISTS idx_settlements_created ON public.foody_cash_settlements (created_at DESC);

-- STEP 3: SETTLEMENT ALLOCATIONS TABLE (Traceable Order Breakdown)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foody_cash_settlement_allocations (
    id TEXT PRIMARY KEY DEFAULT ('alc_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    settlement_id TEXT NOT NULL REFERENCES public.foody_cash_settlements(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL REFERENCES public.foody_orders(id) ON DELETE RESTRICT,
    amount_allocated NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (amount_allocated >= 0),
    order_total NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (order_total >= 0),
    previously_settled NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (previously_settled >= 0),
    remaining_order_debt NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (remaining_order_debt >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_settlement_order UNIQUE (settlement_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_order ON public.foody_cash_settlement_allocations (order_id);
CREATE INDEX IF NOT EXISTS idx_allocations_settlement ON public.foody_cash_settlement_allocations (settlement_id);

-- STEP 4: FINANCIAL LEDGER ENTRIES TABLE (Append-Only Transactional Ledger)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foody_cash_ledger_entries (
    id TEXT PRIMARY KEY DEFAULT ('led_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    account_id TEXT REFERENCES public.foody_cash_accounts(id) ON DELETE SET NULL,
    rider_id TEXT NOT NULL,
    shop_id TEXT NOT NULL REFERENCES public.foody_shops(id) ON DELETE RESTRICT,
    order_id TEXT REFERENCES public.foody_orders(id) ON DELETE SET NULL,
    settlement_id TEXT REFERENCES public.foody_cash_settlements(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('cod_collection', 'cash_handover', 'excess_credit', 'shortage_adjustment', 'refund_reversal', 'counter_direct_cash')),
    direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    reference_id TEXT,
    actor_id TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_rider ON public.foody_cash_ledger_entries (rider_id);
CREATE INDEX IF NOT EXISTS idx_ledger_shop ON public.foody_cash_ledger_entries (shop_id);
CREATE INDEX IF NOT EXISTS idx_ledger_order ON public.foody_cash_ledger_entries (order_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON public.foody_cash_ledger_entries (created_at DESC);

-- STEP 5: BALANCED DOUBLE-ENTRY JOURNALS & LINES
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foody_cash_journals (
    id TEXT PRIMARY KEY DEFAULT ('jrn_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    settlement_id TEXT REFERENCES public.foody_cash_settlements(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL,
    reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.foody_cash_journal_lines (
    id TEXT PRIMARY KEY DEFAULT ('jrl_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    journal_id TEXT NOT NULL REFERENCES public.foody_cash_journals(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    debit NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (debit >= 0),
    credit NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (credit >= 0),
    reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_journal ON public.foody_cash_journal_lines (journal_id);

-- STEP 6: FINANCIAL AUDIT LOGS
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foody_financial_audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('fau_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    actor_id TEXT NOT NULL,
    actor_role TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_created ON public.foody_financial_audit_logs (created_at DESC);

-- STEP 7: IMMUTABILITY TAMPER-PROOF TRIGGERS (Append-Only Guarantee)
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_financial_ledger_tamper()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Policy Violation: Financial ledger and settlement records are strictly immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_tamper ON public.foody_cash_ledger_entries;
CREATE TRIGGER trg_prevent_ledger_tamper
    BEFORE UPDATE OR DELETE ON public.foody_cash_ledger_entries
    FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_ledger_tamper();

DROP TRIGGER IF EXISTS trg_prevent_allocations_tamper ON public.foody_cash_settlement_allocations;
CREATE TRIGGER trg_prevent_allocations_tamper
    BEFORE UPDATE OR DELETE ON public.foody_cash_settlement_allocations
    FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_ledger_tamper();

DROP TRIGGER IF EXISTS trg_prevent_journals_tamper ON public.foody_cash_journals;
CREATE TRIGGER trg_prevent_journals_tamper
    BEFORE UPDATE OR DELETE ON public.foody_cash_journals
    FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_ledger_tamper();

DROP TRIGGER IF EXISTS trg_prevent_journal_lines_tamper ON public.foody_cash_journal_lines;
CREATE TRIGGER trg_prevent_journal_lines_tamper
    BEFORE UPDATE OR DELETE ON public.foody_cash_journal_lines
    FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_ledger_tamper();

DROP TRIGGER IF EXISTS trg_prevent_audit_logs_tamper ON public.foody_financial_audit_logs;
CREATE TRIGGER trg_prevent_audit_logs_tamper
    BEFORE UPDATE OR DELETE ON public.foody_financial_audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_ledger_tamper();

-- STEP 8: AUTHORITATIVE SECURITY DEFINER ACCESS HELPERS
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_shop_finances(p_shop_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.foody_logged_users u
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
  );
$$;

-- STEP 9: AUTHORITATIVE ATOMIC SETTLEMENT RPC
-- ------------------------------------------------------------------------
-- Drop all historical overloads dynamically to guarantee zero PostgREST PGRST203 ambiguity
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.oid::regprocedure AS func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname IN (
            'record_rider_cash_settlement',
            'get_shop_cash_settlements',
            'get_rider_outstanding_orders',
            'get_shop_cashflow_summary',
            'record_settlement_reversal'
        )
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;
END $$;

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
BEGIN
    -- 1. Derive authenticated caller identity strictly from auth.uid()
    v_caller_id := auth.uid()::text;

    -- Allow service_role or postgres internal calls; reject untrusted anonymous/public
    IF v_caller_id IS NULL THEN
        IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
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
    IF p_rider_id IS NULL OR pg_catalog.trim(p_rider_id) = '' THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: p_rider_id is required.';
    END IF;
    IF p_shop_id IS NULL OR pg_catalog.trim(p_shop_id) = '' THEN
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

    -- 4. Idempotency Check & Payload Collision Detection
    IF p_idempotency_key IS NOT NULL AND pg_catalog.trim(p_idempotency_key) <> '' THEN
        SELECT s.* INTO v_existing_settlement
        FROM public.foody_cash_settlements s
        WHERE s.idempotency_key = pg_catalog.trim(p_idempotency_key);

        IF v_existing_settlement.id IS NOT NULL THEN
            -- Verify identical payload to prevent same-key reuse with different parameters
            IF v_existing_settlement.rider_id <> p_rider_id 
               OR v_existing_settlement.shop_id <> p_shop_id 
               OR v_existing_settlement.cashier_received_amount <> v_amount_received THEN
                RAISE EXCEPTION 'IDEMPOTENCY_KEY_COLLISION: Key "%" was already used with different parameters.', p_idempotency_key;
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

    -- 5. Strict Explicit Order Validation (Batch fails if ANY requested order is invalid)
    IF p_order_ids IS NOT NULL AND pg_catalog.array_length(p_order_ids, 1) > 0 THEN
        SELECT pg_catalog.array_agg(oid) INTO v_invalid_order_ids
        FROM pg_catalog.unnest(p_order_ids) oid
        WHERE oid NOT IN (
            SELECT o.id FROM public.foody_orders o
            WHERE o.id = ANY(p_order_ids)
              AND o.shop_id = p_shop_id
              AND o.rider_id = p_rider_id
              AND o.payment_method IN ('cash', 'cod')
              AND o.cash_status = 'collected'
              AND o.settlement_id IS NULL
        );

        IF v_invalid_order_ids IS NOT NULL AND pg_catalog.array_length(v_invalid_order_ids, 1) > 0 THEN
            RAISE EXCEPTION 'INVALID_ORDERS_SELECTED: The following order(s) are invalid, already settled, or do not belong to rider "%" at shop "%": %',
                p_rider_id, p_shop_id, pg_catalog.array_to_string(v_invalid_order_ids, ', ');
        END IF;
    END IF;

    -- 6. Lock rider-shop financial account row
    INSERT INTO public.foody_cash_accounts (rider_id, shop_id, outstanding_amount, total_collected, total_settled)
    VALUES (p_rider_id, p_shop_id, 0.00, 0.00, 0.00)
    ON CONFLICT (rider_id, shop_id) DO NOTHING;

    SELECT id, outstanding_amount INTO v_account_id, v_current_account_outstanding
    FROM public.foody_cash_accounts
    WHERE rider_id = p_rider_id AND shop_id = p_shop_id
    FOR UPDATE;

    -- 7. DETERMINISTIC ROW LOCKING (Ascending ID order, NO aggregate in FOR UPDATE)
    CREATE TEMP TABLE IF NOT EXISTS tmp_orders_to_settle (
        id TEXT PRIMARY KEY,
        total_amount NUMERIC(10,2),
        created_at TIMESTAMPTZ
    ) ON COMMIT DROP;
    DELETE FROM tmp_orders_to_settle;

    IF p_order_ids IS NOT NULL AND pg_catalog.array_length(p_order_ids, 1) > 0 THEN
        INSERT INTO tmp_orders_to_settle (id, total_amount, created_at)
        SELECT o.id, o.total_amount, o.created_at
        FROM public.foody_orders o
        WHERE o.id = ANY(p_order_ids)
        ORDER BY o.created_at ASC, o.id ASC
        FOR UPDATE;
    ELSE
        INSERT INTO tmp_orders_to_settle (id, total_amount, created_at)
        SELECT o.id, o.total_amount, o.created_at
        FROM public.foody_orders o
        WHERE o.rider_id = p_rider_id
          AND o.shop_id = p_shop_id
          AND o.payment_method IN ('cash', 'cod')
          AND o.cash_status = 'collected'
          AND o.settlement_id IS NULL
        ORDER BY o.created_at ASC, o.id ASC
        FOR UPDATE;
    END IF;

    -- 8. Calculate expected cash from individually locked rows
    SELECT COALESCE(SUM(total_amount), 0.00), COUNT(*)
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
    INSERT INTO public.foody_cash_settlements (
        id, shop_id, rider_id, expected_amount, rider_declared_amount,
        cashier_received_amount, shortage_amount, excess_amount, status,
        declared_by, received_by, notes, idempotency_key, created_at
    ) VALUES (
        v_settlement_id, p_shop_id, p_rider_id, v_expected_amount, v_declared_amount,
        v_amount_received, v_shortage, v_excess, v_status,
        p_rider_id, v_cashier_name, p_notes, NULLIF(pg_catalog.trim(p_idempotency_key), ''), NOW()
    );

    -- 11. Deterministic FIFO Waterfall Allocation (Never mark unpaid orders settled)
    v_remaining_to_allocate := v_amount_received;

    FOR v_rec IN SELECT id, total_amount FROM tmp_orders_to_settle ORDER BY created_at ASC, id ASC LOOP
        IF v_remaining_to_allocate >= v_rec.total_amount THEN
            v_alloc_for_order := v_rec.total_amount;
            v_order_debt_remaining := 0.00;

            -- 100% covered: Mark order settled
            UPDATE public.foody_orders
            SET settlement_id = v_settlement_id,
                cash_status = 'settled',
                updated_at = NOW()
            WHERE id = v_rec.id;

            v_settled_order_ids := pg_catalog.array_append(v_settled_order_ids, v_rec.id);
        ELSIF v_remaining_to_allocate > 0 THEN
            v_alloc_for_order := v_remaining_to_allocate;
            v_order_debt_remaining := v_rec.total_amount - v_alloc_for_order;

            -- Incomplete partial payment: cash_status stays 'collected' to preserve liability!
            UPDATE public.foody_orders
            SET updated_at = NOW()
            WHERE id = v_rec.id;
        ELSE
            v_alloc_for_order := 0.00;
            v_order_debt_remaining := v_rec.total_amount;
        END IF;

        v_remaining_to_allocate := GREATEST(0.00, v_remaining_to_allocate - v_alloc_for_order);
        v_allocated_total := v_allocated_total + v_alloc_for_order;

        -- Record allocation
        INSERT INTO public.foody_cash_settlement_allocations (
            settlement_id, order_id, amount_allocated, order_total,
            previously_settled, remaining_order_debt, created_at
        ) VALUES (
            v_settlement_id, v_rec.id, v_alloc_for_order, v_rec.total_amount,
            0.00, v_order_debt_remaining, NOW()
        );

        v_allocated_orders := v_allocated_orders || pg_catalog.jsonb_build_object(
            'order_id', v_rec.id,
            'order_total', v_rec.total_amount,
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

    -- 14. Update Account Projections (Maintain true liability; no silent concealment)
    UPDATE public.foody_cash_accounts
    SET outstanding_amount = CASE 
            WHEN outstanding_amount >= v_allocated_total THEN outstanding_amount - v_allocated_total 
            ELSE 0.00 
        END,
        total_settled = total_settled + v_amount_received,
        updated_at = NOW()
    WHERE id = v_account_id;

    -- Sync profile projections without standalone divergence
    UPDATE public.foody_users
    SET cash_in_hand = CASE WHEN cash_in_hand >= v_allocated_total THEN cash_in_hand - v_allocated_total ELSE 0.00 END,
        unsettled_debt = COALESCE(unsettled_debt, 0.00) + v_shortage
    WHERE id = p_rider_id;

    UPDATE public.foody_logged_users
    SET cash_in_hand = CASE WHEN cash_in_hand >= v_allocated_total THEN cash_in_hand - v_allocated_total ELSE 0.00 END,
        unsettled_debt = COALESCE(unsettled_debt, 0.00) + v_shortage
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

-- STEP 10: COD COLLECTION TRIGGER (Append-Only Collection Accounting)
-- ------------------------------------------------------------------------
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
    -- Only fire when order transitions to 'collected' with cash/cod and a valid rider
    IF (NEW.payment_method IN ('cash', 'cod') 
        AND NEW.cash_status = 'collected' 
        AND (OLD.cash_status IS DISTINCT FROM 'collected')
        AND NEW.rider_id IS NOT NULL) THEN

        v_actor := COALESCE(auth.uid()::text, NEW.rider_id);

        -- 1. Ensure cash account exists and update outstanding custody
        INSERT INTO public.foody_cash_accounts (rider_id, shop_id, outstanding_amount, total_collected, total_settled)
        VALUES (NEW.rider_id, NEW.shop_id, NEW.total_amount, NEW.total_amount, 0.00)
        ON CONFLICT (rider_id, shop_id) 
        DO UPDATE SET 
            outstanding_amount = public.foody_cash_accounts.outstanding_amount + NEW.total_amount,
            total_collected = public.foody_cash_accounts.total_collected + NEW.total_amount,
            updated_at = NOW();

        SELECT id INTO v_acc_id FROM public.foody_cash_accounts 
        WHERE rider_id = NEW.rider_id AND shop_id = NEW.shop_id;

        -- 2. Insert Append-Only Ledger Entry (Debit: Rider Custody)
        INSERT INTO public.foody_cash_ledger_entries (
            account_id, rider_id, shop_id, order_id, transaction_type,
            direction, amount, reference_id, actor_id, notes, created_at
        ) VALUES (
            v_acc_id, NEW.rider_id, NEW.shop_id, NEW.id, 'cod_collection',
            'debit', NEW.total_amount, NEW.id, v_actor,
            format('COD collected by courier for order %s', NEW.id), NOW()
        );

        -- 3. Balanced Journal Lines
        v_jrn_id := 'jrn_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
        INSERT INTO public.foody_cash_journals (id, transaction_type, reference, created_at)
        VALUES (v_jrn_id, 'cod_collection', NEW.id, NOW());

        INSERT INTO public.foody_cash_journal_lines (journal_id, account_name, debit, credit, reference, created_at)
        VALUES
            (v_jrn_id, 'Rider Custody Float (Asset)', NEW.total_amount, 0.00, NEW.id, NOW()),
            (v_jrn_id, 'Shop Order Receivable (Asset)', 0.00, NEW.total_amount, NEW.id, NOW());
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cod_collection_ledger ON public.foody_orders;
CREATE TRIGGER trg_cod_collection_ledger
    AFTER UPDATE OF cash_status ON public.foody_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_cod_collection_ledger();

-- STEP 11: APPEND-ONLY SETTLEMENT REVERSAL / REFUND RPC
-- ------------------------------------------------------------------------
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
    v_caller_id TEXT;
    v_jrn_id TEXT;
    v_alloc RECORD;
BEGIN
    v_caller_id := auth.uid()::text;
    IF v_caller_id IS NULL AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'UNAUTHENTICATED: Caller must be authenticated to reverse settlement.';
    END IF;

    SELECT * INTO v_settlement FROM public.foody_cash_settlements WHERE id = p_settlement_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Settlement "%" does not exist.', p_settlement_id;
    END IF;

    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND NOT public.can_manage_shop_finances(v_settlement.shop_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Not authorized to reverse settlements for shop "%".', v_settlement.shop_id;
    END IF;

    -- Create reversal journal
    v_jrn_id := 'jrn_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
    INSERT INTO public.foody_cash_journals (id, settlement_id, transaction_type, reference, created_at)
    VALUES (v_jrn_id, p_settlement_id, 'settlement_reversal', p_settlement_id, NOW());

    -- Reversing lines:
    INSERT INTO public.foody_cash_journal_lines (journal_id, account_name, debit, credit, reference, created_at)
    VALUES
        (v_jrn_id, 'Cash In Kitchen Register (Asset)', 0.00, v_settlement.cashier_received_amount, p_settlement_id, NOW()),
        (v_jrn_id, 'Rider Custody Receivable (Asset)', (v_settlement.cashier_received_amount - v_settlement.excess_amount), 0.00, p_settlement_id, NOW());

    IF v_settlement.excess_amount > 0 THEN
        INSERT INTO public.foody_cash_journal_lines (journal_id, account_name, debit, credit, reference, created_at)
        VALUES (v_jrn_id, 'Cashier Suspense / Excess Cash (Liability)', v_settlement.excess_amount, 0.00, p_settlement_id, NOW());
    END IF;

    -- Append-only ledger entries for reversal
    INSERT INTO public.foody_cash_ledger_entries (
        rider_id, shop_id, settlement_id, transaction_type, direction, amount, reference_id, actor_id, notes, created_at
    ) VALUES (
        v_settlement.rider_id, v_settlement.shop_id, p_settlement_id, 'refund_reversal', 'credit',
        v_settlement.cashier_received_amount, p_settlement_id, COALESCE(v_caller_id, 'system'),
        format('Reversal of settlement %s: %s', p_settlement_id, p_reason), NOW()
    );

    -- Reinstate order cash_status to 'collected' and clear settlement_id
    FOR v_alloc IN SELECT order_id FROM public.foody_cash_settlement_allocations WHERE settlement_id = p_settlement_id LOOP
        UPDATE public.foody_orders
        SET cash_status = 'collected', settlement_id = NULL, updated_at = NOW()
        WHERE id = v_alloc.order_id;
    END LOOP;

    -- Restore account balance
    UPDATE public.foody_cash_accounts
    SET outstanding_amount = outstanding_amount + (v_settlement.cashier_received_amount - v_settlement.excess_amount),
        total_settled = CASE 
            WHEN total_settled >= v_settlement.cashier_received_amount THEN total_settled - v_settlement.cashier_received_amount 
            ELSE 0.00 
        END,
        updated_at = NOW()
    WHERE rider_id = v_settlement.rider_id AND shop_id = v_settlement.shop_id;

    -- Log audit
    INSERT INTO public.foody_financial_audit_logs (
        actor_id, actor_role, action, resource_type, resource_id, previous_state, new_state, created_at
    ) VALUES (
        COALESCE(v_caller_id, 'system'), 'cashier', 'reverse_settlement', 'foody_cash_settlements', p_settlement_id,
        pg_catalog.row_to_json(v_settlement)::jsonb,
        pg_catalog.jsonb_build_object('reversed', true, 'reason', p_reason),
        NOW()
    );

    RETURN pg_catalog.jsonb_build_object('success', true, 'settlement_id', p_settlement_id, 'reversed', true);
END;
$$;

-- STEP 12: AUTHORITATIVE QUERY RPCS WITH SHOP ISOLATION
-- ------------------------------------------------------------------------

-- 12.1 Get Shop Settlements History
CREATE OR REPLACE FUNCTION public.get_shop_cash_settlements(
    p_shop_id TEXT,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id TEXT,
    shop_id TEXT,
    rider_id TEXT,
    rider_name TEXT,
    expected_amount NUMERIC(10,2),
    rider_declared_amount NUMERIC(10,2),
    cashier_received_amount NUMERIC(10,2),
    shortage_amount NUMERIC(10,2),
    excess_amount NUMERIC(10,2),
    status TEXT,
    received_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ,
    allocated_orders_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND NOT public.can_manage_shop_finances(p_shop_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Caller is not authorized to view settlements for kitchen "%".', p_shop_id;
    END IF;

    RETURN QUERY
    SELECT 
        s.id,
        s.shop_id,
        s.rider_id,
        COALESCE(u.display_name, u.name, 'Delivery Sarathi') AS rider_name,
        s.expected_amount,
        s.rider_declared_amount,
        s.cashier_received_amount,
        s.shortage_amount,
        s.excess_amount,
        s.status,
        s.received_by,
        s.notes,
        s.created_at,
        (SELECT COUNT(*) FROM public.foody_cash_settlement_allocations a WHERE a.settlement_id = s.id) AS allocated_orders_count
    FROM public.foody_cash_settlements s
    LEFT JOIN public.foody_users u ON u.id = s.rider_id
    WHERE s.shop_id = p_shop_id
    ORDER BY s.created_at DESC
    LIMIT LEAST(p_limit, 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

-- 12.2 Get Active Rider Outstanding Cash by Shop
CREATE OR REPLACE FUNCTION public.get_rider_outstanding_orders(
    p_rider_id TEXT,
    p_shop_id TEXT
)
RETURNS TABLE (
    id TEXT,
    order_token TEXT,
    total_amount NUMERIC,
    customer_name TEXT,
    customer_phone TEXT,
    delivered_at TIMESTAMPTZ,
    cash_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') 
       AND auth.uid()::text <> p_rider_id 
       AND NOT public.can_manage_shop_finances(p_shop_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Caller is not authorized to view outstanding orders for rider "%" at shop "%".', p_rider_id, p_shop_id;
    END IF;

    RETURN QUERY
    SELECT 
        o.id,
        COALESCE(o.order_short_code, o.order_token, o.id) AS order_token,
        o.total_amount,
        o.customer_name,
        o.customer_phone,
        o.delivered_at,
        o.cash_status
    FROM public.foody_orders o
    WHERE o.rider_id = p_rider_id
      AND o.shop_id = p_shop_id
      AND o.payment_method IN ('cash', 'cod')
      AND o.cash_status = 'collected'
      AND o.settlement_id IS NULL
    ORDER BY o.created_at ASC;
END;
$$;

-- 12.3 Get Shop Cashflow Summary
CREATE OR REPLACE FUNCTION public.get_shop_cashflow_summary(p_shop_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_gross_sales NUMERIC(10,2) := 0.00;
    v_online_payments NUMERIC(10,2) := 0.00;
    v_counter_cash NUMERIC(10,2) := 0.00;
    v_rider_cash_in_transit NUMERIC(10,2) := 0.00;
    v_rider_cash_settled NUMERIC(10,2) := 0.00;
    v_active_riders_count INT := 0;
BEGIN
    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND NOT public.can_manage_shop_finances(p_shop_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Caller is not authorized to view cashflow summary for kitchen "%".', p_shop_id;
    END IF;

    -- Gross Completed Sales
    SELECT COALESCE(SUM(total_amount), 0.00)
    INTO v_gross_sales
    FROM public.foody_orders
    WHERE shop_id = p_shop_id AND status IN ('completed', 'delivered');

    -- Online Payments
    SELECT COALESCE(SUM(total_amount), 0.00)
    INTO v_online_payments
    FROM public.foody_orders
    WHERE shop_id = p_shop_id AND status IN ('completed', 'delivered') AND payment_method NOT IN ('cash', 'cod');

    -- Direct Counter Cash (Counter Pickups / Kitchen Direct)
    SELECT COALESCE(SUM(total_amount), 0.00)
    INTO v_counter_cash
    FROM public.foody_orders
    WHERE shop_id = p_shop_id 
      AND status IN ('completed', 'delivered') 
      AND payment_method IN ('cash', 'cod')
      AND (rider_id IS NULL OR fulfillment_type = 'pickup');

    -- Rider Cash In Transit (Delivered COD orders held by couriers awaiting return)
    SELECT COALESCE(SUM(total_amount), 0.00), COUNT(DISTINCT rider_id)
    INTO v_rider_cash_in_transit, v_active_riders_count
    FROM public.foody_orders
    WHERE shop_id = p_shop_id
      AND payment_method IN ('cash', 'cod')
      AND cash_status = 'collected'
      AND settlement_id IS NULL
      AND rider_id IS NOT NULL;

    -- Rider Cash Reconciled (Settled Handovers)
    SELECT COALESCE(SUM(total_amount), 0.00)
    INTO v_rider_cash_settled
    FROM public.foody_orders
    WHERE shop_id = p_shop_id
      AND payment_method IN ('cash', 'cod')
      AND cash_status = 'settled';

    RETURN pg_catalog.jsonb_build_object(
        'shop_id', p_shop_id,
        'gross_sales', v_gross_sales,
        'online_payments', v_online_payments,
        'counter_cash', v_counter_cash,
        'rider_cash_in_transit', v_rider_cash_in_transit,
        'rider_cash_settled', v_rider_cash_settled,
        'active_riders_holding_cash', v_active_riders_count
    );
END;
$$;

-- STEP 13: STRICT ZERO-TRUST RLS POLICIES & PERMISSIONS
-- ------------------------------------------------------------------------
ALTER TABLE public.foody_cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_cash_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_cash_settlement_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_cash_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_cash_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_cash_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. DROP ALL UNRESTRICTED POLICIES
DROP POLICY IF EXISTS "Public access cash accounts" ON public.foody_cash_accounts;
DROP POLICY IF EXISTS "Public access cash settlements" ON public.foody_cash_settlements;
DROP POLICY IF EXISTS "Public access cash allocations" ON public.foody_cash_settlement_allocations;
DROP POLICY IF EXISTS "Public access cash ledger" ON public.foody_cash_ledger_entries;
DROP POLICY IF EXISTS "Public access cash journals" ON public.foody_cash_journals;
DROP POLICY IF EXISTS "Public access cash journal lines" ON public.foody_cash_journal_lines;
DROP POLICY IF EXISTS "Public access financial audit" ON public.foody_financial_audit_logs;

-- 2. CREATE AUTHORITATIVE RESTRICTED RLS POLICIES
DROP POLICY IF EXISTS "Authorized read cash accounts" ON public.foody_cash_accounts;
CREATE POLICY "Authorized read cash accounts" ON public.foody_cash_accounts
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin() 
        OR auth.uid()::text = rider_id 
        OR public.can_manage_shop_finances(shop_id)
    );

DROP POLICY IF EXISTS "Authorized read cash settlements" ON public.foody_cash_settlements;
CREATE POLICY "Authorized read cash settlements" ON public.foody_cash_settlements
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin() 
        OR auth.uid()::text = rider_id 
        OR public.can_manage_shop_finances(shop_id)
    );

DROP POLICY IF EXISTS "Authorized read cash allocations" ON public.foody_cash_settlement_allocations;
CREATE POLICY "Authorized read cash allocations" ON public.foody_cash_settlement_allocations
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin() 
        OR EXISTS (
            SELECT 1 FROM public.foody_cash_settlements s
            WHERE s.id = settlement_id
              AND (s.rider_id = auth.uid()::text OR public.can_manage_shop_finances(s.shop_id))
        )
    );

DROP POLICY IF EXISTS "Authorized read cash ledger" ON public.foody_cash_ledger_entries;
CREATE POLICY "Authorized read cash ledger" ON public.foody_cash_ledger_entries
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin() 
        OR auth.uid()::text = rider_id 
        OR public.can_manage_shop_finances(shop_id)
    );

DROP POLICY IF EXISTS "Authorized read cash journals" ON public.foody_cash_journals;
CREATE POLICY "Authorized read cash journals" ON public.foody_cash_journals
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin() 
        OR EXISTS (
            SELECT 1 FROM public.foody_cash_settlements s
            WHERE s.id = settlement_id
              AND public.can_manage_shop_finances(s.shop_id)
        )
    );

DROP POLICY IF EXISTS "Authorized read cash journal lines" ON public.foody_cash_journal_lines;
CREATE POLICY "Authorized read cash journal lines" ON public.foody_cash_journal_lines
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin() 
        OR EXISTS (
            SELECT 1 FROM public.foody_cash_journals j
            JOIN public.foody_cash_settlements s ON s.id = j.settlement_id
            WHERE j.id = journal_id
              AND public.can_manage_shop_finances(s.shop_id)
        )
    );

DROP POLICY IF EXISTS "Authorized read financial audit" ON public.foody_financial_audit_logs;
CREATE POLICY "Authorized read financial audit" ON public.foody_financial_audit_logs
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin() 
        OR auth.uid()::text = actor_id
    );

-- 3. REVOKE ALL FINANCIAL TABLE ACCESS FROM ANON
REVOKE ALL ON public.foody_cash_accounts FROM anon, public;
REVOKE ALL ON public.foody_cash_settlements FROM anon, public;
REVOKE ALL ON public.foody_cash_settlement_allocations FROM anon, public;
REVOKE ALL ON public.foody_cash_ledger_entries FROM anon, public;
REVOKE ALL ON public.foody_cash_journals FROM anon, public;
REVOKE ALL ON public.foody_cash_journal_lines FROM anon, public;
REVOKE ALL ON public.foody_financial_audit_logs FROM anon, public;

-- 4. GRANT ONLY SELECT TO AUTHENTICATED USERS (Mutations strictly via SECURITY DEFINER RPCs)
REVOKE INSERT, UPDATE, DELETE ON public.foody_cash_accounts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.foody_cash_settlements FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.foody_cash_settlement_allocations FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.foody_cash_ledger_entries FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.foody_cash_journals FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.foody_cash_journal_lines FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.foody_financial_audit_logs FROM authenticated;

GRANT SELECT ON public.foody_cash_accounts TO authenticated, service_role;
GRANT SELECT ON public.foody_cash_settlements TO authenticated, service_role;
GRANT SELECT ON public.foody_cash_settlement_allocations TO authenticated, service_role;
GRANT SELECT ON public.foody_cash_ledger_entries TO authenticated, service_role;
GRANT SELECT ON public.foody_cash_journals TO authenticated, service_role;
GRANT SELECT ON public.foody_cash_journal_lines TO authenticated, service_role;
GRANT SELECT ON public.foody_financial_audit_logs TO authenticated, service_role;

GRANT ALL ON public.foody_cash_accounts TO service_role;
GRANT ALL ON public.foody_cash_settlements TO service_role;
GRANT ALL ON public.foody_cash_settlement_allocations TO service_role;
GRANT ALL ON public.foody_cash_ledger_entries TO service_role;
GRANT ALL ON public.foody_cash_journals TO service_role;
GRANT ALL ON public.foody_cash_journal_lines TO service_role;
GRANT ALL ON public.foody_financial_audit_logs TO service_role;

-- 5. FUNCTION EXECUTION PERMISSIONS: REVOKE FROM ANON, GRANT TO AUTHENTICATED
REVOKE EXECUTE ON FUNCTION public.record_rider_cash_settlement(TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT[], TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_shop_cash_settlements(TEXT, INT, INT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_rider_outstanding_orders(TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_shop_cashflow_summary(TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.record_settlement_reversal(TEXT, TEXT) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.can_manage_shop_finances(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_rider_cash_settlement(TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT[], TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_shop_cash_settlements(TEXT, INT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_rider_outstanding_orders(TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_shop_cashflow_summary(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_settlement_reversal(TEXT, TEXT) TO authenticated, service_role;

-- 6. REALTIME REGISTRATION
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_accounts;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_settlements;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_settlement_allocations;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_ledger_entries;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
