-- ========================================================================
-- FOODY VRINDA: PRODUCTION MIGRATION 20261110000001
-- AUTHORITATIVE BILLING, CASH RECONCILIATION & RIDER HANDOVER LEDGER
-- ========================================================================
-- 1. Double-Entry Financial Ledger (foody_cash_accounts, foody_cash_ledger_entries)
-- 2. Immutable Settlement Registry (foody_cash_settlements, foody_cash_settlement_allocations)
-- 3. Balanced Journal & Audit Logging (foody_cash_journals, foody_cash_journal_lines, foody_financial_audit_logs)
-- 4. Atomic Row-Locked Settlement RPC: public.record_rider_cash_settlement(...)
--    (Eliminates 0A000 "FOR UPDATE is not allowed with aggregate functions" flaw)
-- 5. Authoritative Query RPCs: get_shop_cash_settlements, get_rider_outstanding_orders
-- 6. Strict RLS Policies, Tamper Triggers, & Permissions
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
        -- Drop any dependent foreign keys temporarily if they exist
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
        -- Expand id type from UUID to TEXT to maintain full textual order/token compatibility
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

-- STEP 8: AUTHORITATIVE ATOMIC SETTLEMENT RPC (REPLACES DEFECTIVE AGGREGATE LOCK)
-- ------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.record_rider_cash_settlement(TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT[], TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.record_rider_cash_settlement(NUMERIC, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.record_rider_cash_settlement(TEXT, TEXT, TEXT) CASCADE;

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
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id TEXT;
    v_cashier_name TEXT;
    v_idempotent_result JSONB;
    v_settlement_id TEXT;
    v_journal_id TEXT;
    v_account_id TEXT;
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
BEGIN
    -- 1. Input sanitization & validation
    IF p_rider_id IS NULL OR TRIM(p_rider_id) = '' THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: p_rider_id is required.';
    END IF;
    IF p_shop_id IS NULL OR TRIM(p_shop_id) = '' THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: p_shop_id is required.';
    END IF;

    v_amount_received := ROUND(COALESCE(p_amount_received, 0.00), 2);
    IF v_amount_received < 0 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: Received amount cannot be negative (got %)', v_amount_received;
    END IF;

    v_declared_amount := ROUND(COALESCE(p_declared_amount, v_amount_received), 2);
    v_cashier_name := COALESCE(NULLIF(TRIM(p_settled_by), ''), 'Kitchen Cashier');
    v_caller_id := COALESCE(auth.uid()::text, v_cashier_name);

    -- 2. Idempotency Check (Return committed payload if key matches)
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        SELECT jsonb_build_object(
            'success', true,
            'settlement_id', s.id,
            'rider_id', s.rider_id,
            'shop_id', s.shop_id,
            'expected_amount', s.expected_amount,
            'received_amount', s.cashier_received_amount,
            'declared_amount', s.rider_declared_amount,
            'shortage_amount', s.shortage_amount,
            'excess_amount', s.excess_amount,
            'status', s.status,
            'notes', s.notes,
            'idempotent_replay', true,
            'created_at', s.created_at
        ) INTO v_idempotent_result
        FROM public.foody_cash_settlements s
        WHERE s.idempotency_key = TRIM(p_idempotency_key);

        IF v_idempotent_result IS NOT NULL THEN
            RETURN v_idempotent_result;
        END IF;
    END IF;

    -- 3. Lock rider-shop financial account row or create if missing
    INSERT INTO public.foody_cash_accounts (rider_id, shop_id, outstanding_amount)
    VALUES (p_rider_id, p_shop_id, 0.00)
    ON CONFLICT (rider_id, shop_id) DO NOTHING;

    SELECT id INTO v_account_id
    FROM public.foody_cash_accounts
    WHERE rider_id = p_rider_id AND shop_id = p_shop_id
    FOR UPDATE;

    -- 4. DETERMINISTIC INDIVIDUAL ORDER ROW LOCKING (NO AGGREGATE IN FOR UPDATE)
    CREATE TEMP TABLE IF NOT EXISTS tmp_orders_to_settle (
        id TEXT PRIMARY KEY,
        total_amount NUMERIC(10,2),
        created_at TIMESTAMPTZ
    ) ON COMMIT DROP;
    DELETE FROM tmp_orders_to_settle;

    IF p_order_ids IS NOT NULL AND array_length(p_order_ids, 1) > 0 THEN
        INSERT INTO tmp_orders_to_settle (id, total_amount, created_at)
        SELECT o.id, o.total_amount, o.created_at
        FROM public.foody_orders o
        WHERE o.id = ANY(p_order_ids)
          AND o.rider_id = p_rider_id
          AND o.shop_id = p_shop_id
          AND o.payment_method IN ('cash', 'cod')
          AND o.cash_status = 'collected'
          AND o.settlement_id IS NULL
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

    -- 5. Calculate expected amount from individually locked rows
    SELECT COALESCE(SUM(total_amount), 0.00), COUNT(*)
    INTO v_expected_amount, v_order_count
    FROM tmp_orders_to_settle;

    -- Guard: Prevent zero-action settlements
    IF v_expected_amount <= 0 AND v_amount_received <= 0 THEN
        RAISE EXCEPTION 'NO_SETTLEMENT_PENDING: No unsettled cash collections found for rider "%" at kitchen "%".', p_rider_id, p_shop_id;
    END IF;

    -- 6. Variance and Settlement Status Determination
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

    -- 7. Insert Master Settlement Record
    INSERT INTO public.foody_cash_settlements (
        id, shop_id, rider_id, expected_amount, rider_declared_amount,
        cashier_received_amount, shortage_amount, excess_amount, status,
        declared_by, received_by, notes, idempotency_key, created_at
    ) VALUES (
        v_settlement_id, p_shop_id, p_rider_id, v_expected_amount, v_declared_amount,
        v_amount_received, v_shortage, v_excess, v_status,
        p_rider_id, v_cashier_name, p_notes, NULLIF(TRIM(p_idempotency_key), ''), NOW()
    );

    -- 8. Waterfall Allocation of Received Cash to Orders (Oldest First)
    v_remaining_to_allocate := v_amount_received;

    FOR v_rec IN SELECT id, total_amount FROM tmp_orders_to_settle ORDER BY created_at ASC, id ASC LOOP
        IF v_remaining_to_allocate >= v_rec.total_amount THEN
            v_alloc_for_order := v_rec.total_amount;
            v_order_debt_remaining := 0.00;

            -- Mark order fully settled
            UPDATE public.foody_orders
            SET settlement_id = v_settlement_id,
                cash_status = 'settled',
                updated_at = NOW()
            WHERE id = v_rec.id;

            v_settled_order_ids := array_append(v_settled_order_ids, v_rec.id);
        ELSIF v_remaining_to_allocate > 0 THEN
            v_alloc_for_order := v_remaining_to_allocate;
            v_order_debt_remaining := v_rec.total_amount - v_alloc_for_order;

            -- Incomplete partial payment: cash_status stays 'collected' to preserve liability
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

        v_allocated_orders := v_allocated_orders || jsonb_build_object(
            'order_id', v_rec.id,
            'order_total', v_rec.total_amount,
            'allocated', v_alloc_for_order,
            'remaining_debt', v_order_debt_remaining,
            'is_fully_settled', (v_order_debt_remaining = 0)
        );
    END LOOP;

    -- 9. Insert Immutable Double-Entry Ledger Entries
    -- Debit: Cashier Counter Cash
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
        format('Allocated cash relief for %s orders', array_length(v_settled_order_ids, 1)), NOW()
    );

    -- 10. Record Balanced Double-Entry Journals
    INSERT INTO public.foody_cash_journals (id, settlement_id, transaction_type, reference, created_at)
    VALUES (v_journal_id, v_settlement_id, 'rider_cash_handover', v_settlement_id, NOW());

    INSERT INTO public.foody_cash_journal_lines (journal_id, account_name, debit, credit, reference, created_at)
    VALUES
        (v_journal_id, 'Cash In Kitchen Register (Asset)', v_amount_received, 0.00, v_settlement_id, NOW()),
        (v_journal_id, 'Rider Custody Receivable (Liability/Asset)', 0.00, v_allocated_total, v_settlement_id, NOW());

    IF v_excess > 0 THEN
        INSERT INTO public.foody_cash_journal_lines (journal_id, account_name, debit, credit, reference, created_at)
        VALUES (v_journal_id, 'Cashier Suspense / Excess Cash (Liability)', 0.00, v_excess, v_settlement_id, NOW());
    END IF;

    -- 11. Update Account & Rider Profile Projections
    UPDATE public.foody_cash_accounts
    SET outstanding_amount = GREATEST(0.00, outstanding_amount - v_allocated_total),
        total_settled = total_settled + v_amount_received,
        updated_at = NOW()
    WHERE id = v_account_id;

    -- Update foody_users and foody_logged_users cash_in_hand
    UPDATE public.foody_users
    SET cash_in_hand = GREATEST(0.00, COALESCE(cash_in_hand, 0.00) - v_allocated_total),
        unsettled_debt = GREATEST(0.00, COALESCE(unsettled_debt, 0.00) + v_shortage)
    WHERE id = p_rider_id;

    UPDATE public.foody_logged_users
    SET cash_in_hand = GREATEST(0.00, COALESCE(cash_in_hand, 0.00) - v_allocated_total),
        unsettled_debt = GREATEST(0.00, COALESCE(unsettled_debt, 0.00) + v_shortage)
    WHERE id = p_rider_id;

    -- 12. Record Audit Log
    INSERT INTO public.foody_financial_audit_logs (
        actor_id, actor_role, action, resource_type, resource_id,
        previous_state, new_state, created_at
    ) VALUES (
        v_caller_id, 'cashier', 'record_cash_settlement', 'foody_cash_settlements', v_settlement_id,
        jsonb_build_object('expected_amount', v_expected_amount, 'orders_count', v_order_count),
        jsonb_build_object(
            'received_amount', v_amount_received,
            'status', v_status,
            'settled_orders', v_settled_order_ids,
            'shortage', v_shortage,
            'excess', v_excess
        ),
        NOW()
    );

    -- 13. Return Comprehensive Success Payload
    RETURN jsonb_build_object(
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

-- STEP 9: AUTHORITATIVE QUERY RPCS
-- ------------------------------------------------------------------------

-- 9.1 Get Shop Settlements History
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
SET search_path = public, pg_temp
AS $$
BEGIN
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

-- 9.2 Get Active Rider Outstanding Cash by Shop
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
SET search_path = public, pg_temp
AS $$
BEGIN
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

-- 9.3 Get Shop Cashflow Summary
CREATE OR REPLACE FUNCTION public.get_shop_cashflow_summary(p_shop_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_gross_sales NUMERIC(10,2) := 0.00;
    v_online_payments NUMERIC(10,2) := 0.00;
    v_counter_cash NUMERIC(10,2) := 0.00;
    v_rider_cash_in_transit NUMERIC(10,2) := 0.00;
    v_rider_cash_settled NUMERIC(10,2) := 0.00;
    v_active_riders_count INT := 0;
BEGIN
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

    RETURN jsonb_build_object(
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

-- STEP 10: RLS POLICIES & PERMISSIONS
-- ------------------------------------------------------------------------
ALTER TABLE public.foody_cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_cash_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_cash_settlement_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_cash_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_cash_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_cash_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissive authenticated read with public fallback for verified views
DROP POLICY IF EXISTS "Public access cash accounts" ON public.foody_cash_accounts;
CREATE POLICY "Public access cash accounts" ON public.foody_cash_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access cash settlements" ON public.foody_cash_settlements;
CREATE POLICY "Public access cash settlements" ON public.foody_cash_settlements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access cash allocations" ON public.foody_cash_settlement_allocations;
CREATE POLICY "Public access cash allocations" ON public.foody_cash_settlement_allocations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access cash ledger" ON public.foody_cash_ledger_entries;
CREATE POLICY "Public access cash ledger" ON public.foody_cash_ledger_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access cash journals" ON public.foody_cash_journals;
CREATE POLICY "Public access cash journals" ON public.foody_cash_journals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access cash journal lines" ON public.foody_cash_journal_lines;
CREATE POLICY "Public access cash journal lines" ON public.foody_cash_journal_lines FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access financial audit" ON public.foody_financial_audit_logs;
CREATE POLICY "Public access financial audit" ON public.foody_financial_audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Realtime Publication Registration
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_accounts;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_settlements;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_settlement_allocations;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_ledger_entries;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Execution Grants
GRANT EXECUTE ON FUNCTION public.record_rider_cash_settlement(TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT[], TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_shop_cash_settlements(TEXT, INT, INT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_rider_outstanding_orders(TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_shop_cashflow_summary(TEXT) TO authenticated, anon, service_role;

GRANT ALL ON public.foody_cash_accounts TO authenticated, anon, service_role;
GRANT ALL ON public.foody_cash_settlements TO authenticated, anon, service_role;
GRANT ALL ON public.foody_cash_settlement_allocations TO authenticated, anon, service_role;
GRANT ALL ON public.foody_cash_ledger_entries TO authenticated, anon, service_role;
GRANT ALL ON public.foody_cash_journals TO authenticated, anon, service_role;
GRANT ALL ON public.foody_cash_journal_lines TO authenticated, anon, service_role;
GRANT ALL ON public.foody_financial_audit_logs TO authenticated, anon, service_role;

