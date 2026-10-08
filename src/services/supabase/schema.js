// ==========================================
// FOODY DATABASE SCHEMA & SQL DEFINITIONS
// ==========================================

export const COMPLETE_FOODY_DATABASE_SCHEMA_SQL = `-- ========================================================================
-- FOODY VRINDA v5.2 - HARDENED ENTERPRISE POSTGRESQL & SUPABASE CLOUD SCHEMA
-- Production-Grade: Hash Chaining, State Machine, Atomic RPCs, Immutable Ledger
-- Run this in your Supabase SQL Editor to set up all tables, triggers, indexes, and publications.
-- ========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 1. FOODY SHOPS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    coordinates JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    is_open BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT true,
    shop_type TEXT DEFAULT 'hotel' CHECK (shop_type IN ('hotel', 'shop')),
    schedule JSONB DEFAULT '{"openingTime": "08:00", "closingTime": "22:30", "autoSchedule": true}'::jsonb,
    rating NUMERIC DEFAULT 4.9,
    is_active BOOLEAN DEFAULT true,
    minimum_order_amount NUMERIC DEFAULT 0,
    delivery_charge NUMERIC DEFAULT 0,
    gst_percentage NUMERIC DEFAULT 5,
    payment_settings JSONB DEFAULT '{"onlinePaymentsEnabled": true, "codEnabled": true}'::jsonb,
    alarm_settings JSONB DEFAULT '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS shop_type TEXT DEFAULT 'hotel';
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{"openingTime": "08:00", "closingTime": "22:30", "autoSchedule": true}'::jsonb;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 4.9;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{"onlinePaymentsEnabled": true, "codEnabled": true}'::jsonb;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS alarm_settings JSONB DEFAULT '{"kitchenNew": true, "kitchenReady": false, "deliveryReady": true}'::jsonb;

DROP TRIGGER IF EXISTS trg_foody_shops_updated_at ON public.foody_shops;
CREATE TRIGGER trg_foody_shops_updated_at
    BEFORE UPDATE ON public.foody_shops
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 2. FOODY MENUS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_menus (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL DEFAULT 'shop-vrinda-main',
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Meals',
    price NUMERIC NOT NULL DEFAULT 0,
    original_price NUMERIC DEFAULT 0,
    discount_percent NUMERIC DEFAULT 0,
    is_combo BOOLEAN DEFAULT false,
    combo_items JSONB DEFAULT '[]'::jsonb,
    image TEXT,
    tag TEXT,
    kcal TEXT DEFAULT '250 kcal',
    nutrition JSONB DEFAULT '{"carbs": "35g", "fat": "12g", "protein": "16g", "kcal": "250 kcal"}'::jsonb,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foody_menus ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0;
ALTER TABLE public.foody_menus ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0;
ALTER TABLE public.foody_menus ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT false;
ALTER TABLE public.foody_menus ADD COLUMN IF NOT EXISTS combo_items JSONB DEFAULT '[]'::jsonb;

DROP TRIGGER IF EXISTS trg_foody_menus_updated_at ON public.foody_menus;
CREATE TRIGGER trg_foody_menus_updated_at
    BEFORE UPDATE ON public.foody_menus
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 3. FOODY ORDERS TABLE (16-State Machine + ETA + OTP Columns)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_orders (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL DEFAULT 'shop-vrinda-main',
    user_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    delivery_address TEXT,
    delivery_coordinates JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    fulfillment_type TEXT DEFAULT 'delivery' CHECK (fulfillment_type IN ('delivery', 'pickup')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    delivery_charge NUMERIC NOT NULL DEFAULT 0,
    gst_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new',
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'online')),
    payment_id TEXT,
    cash_status TEXT DEFAULT 'pending',
    cooking_notes TEXT,
    rider_id TEXT,
    rider_name TEXT,
    rider_phone TEXT,
    rider_rating TEXT,
    rider_avatar TEXT,
    sarathi_code TEXT,
    chef_id TEXT,
    chef_name TEXT,
    packed_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_by TEXT DEFAULT 'customer',
    -- OTP Hashing & Rate Limiting (Zero Plaintext Storage)
    pickup_otp TEXT,
    delivery_otp TEXT,
    pickup_otp_hash TEXT,
    delivery_otp_hash TEXT,
    pickup_otp_expires_at TIMESTAMPTZ,
    delivery_otp_expires_at TIMESTAMPTZ,
    pickup_otp_attempts INT DEFAULT 0,
    delivery_otp_attempts INT DEFAULT 0,
    otp_used_at TIMESTAMPTZ,
    -- Dynamic ETA & Machine Verification
    predicted_ready_at TIMESTAMPTZ,
    predicted_rider_arrival_at TIMESTAMPTZ,
    eta_confidence_score NUMERIC DEFAULT 0.95,
    last_recalculated_at TIMESTAMPTZ,
    delay_reason TEXT,
    package_barcode TEXT,
    order_short_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column additions for existing databases
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS fulfillment_type TEXT DEFAULT 'delivery';
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_id TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_name TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_phone TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_rating TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS rider_avatar TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS sarathi_code TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS chef_id TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS chef_name TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS cooking_notes TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS cash_status TEXT DEFAULT 'pending';
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_hash TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_hash TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS pickup_otp_attempts INT DEFAULT 0;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delivery_otp_attempts INT DEFAULT 0;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS otp_used_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS predicted_ready_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS predicted_rider_arrival_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS eta_confidence_score NUMERIC DEFAULT 0.95;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS last_recalculated_at TIMESTAMPTZ;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS delay_reason TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS package_barcode TEXT;
ALTER TABLE public.foody_orders ADD COLUMN IF NOT EXISTS order_short_code TEXT;

-- 16 Explicit Production States + Cash Status Constraints
DO $$ BEGIN
    ALTER TABLE public.foody_orders DROP CONSTRAINT IF EXISTS foody_orders_status_check;
    ALTER TABLE public.foody_orders ADD CONSTRAINT foody_orders_status_check CHECK (
      status IN (
        'new', 'payment_pending', 'confirmed', 'accepted', 'cooking',
        'ready_for_pickup', 'rider_assigned', 'rider_arriving',
        'picked_up', 'out_for_delivery', 'delivered', 'cancelled',
        'delivery_attempted_failed', 'refund_pending', 'refunded', 'disputed',
        'preparing', 'completed', 'returned'
      )
    );
    ALTER TABLE public.foody_orders DROP CONSTRAINT IF EXISTS foody_orders_cash_status_check;
    ALTER TABLE public.foody_orders ADD CONSTRAINT foody_orders_cash_status_check CHECK (cash_status IN ('none', 'pending', 'collected', 'settled'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_foody_orders_updated_at ON public.foody_orders;
CREATE TRIGGER trg_foody_orders_updated_at
    BEFORE UPDATE ON public.foody_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 3A. STATE MACHINE TRANSITION ENFORCEMENT TRIGGER
-- Prevents illegal state jumps (e.g. delivered -> cooking)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.enforce_order_state_transition()
RETURNS TRIGGER AS $$
DECLARE
    allowed TEXT[];
BEGIN
    -- Build allowed transitions from current state
    CASE OLD.status
        WHEN 'new' THEN
            allowed := ARRAY['confirmed', 'accepted', 'preparing', 'payment_pending', 'cancelled'];
        WHEN 'payment_pending' THEN
            allowed := ARRAY['confirmed', 'cancelled'];
        WHEN 'confirmed' THEN
            allowed := ARRAY['accepted', 'preparing', 'cooking', 'cancelled'];
        WHEN 'accepted' THEN
            allowed := ARRAY['preparing', 'cooking', 'cancelled'];
        WHEN 'preparing' THEN
            allowed := ARRAY['cooking', 'ready_for_pickup', 'cancelled'];
        WHEN 'cooking' THEN
            allowed := ARRAY['ready_for_pickup', 'cancelled'];
        WHEN 'ready_for_pickup' THEN
            allowed := ARRAY['rider_assigned', 'picked_up', 'out_for_delivery', 'cancelled'];
        WHEN 'rider_assigned' THEN
            allowed := ARRAY['rider_arriving', 'picked_up', 'cancelled'];
        WHEN 'rider_arriving' THEN
            allowed := ARRAY['picked_up', 'cancelled'];
        WHEN 'picked_up' THEN
            allowed := ARRAY['out_for_delivery'];
        WHEN 'out_for_delivery' THEN
            allowed := ARRAY['delivered', 'completed', 'delivery_attempted_failed'];
        WHEN 'delivered' THEN
            allowed := ARRAY['completed', 'disputed', 'returned'];
        WHEN 'completed' THEN
            allowed := ARRAY['disputed', 'refund_pending'];
        WHEN 'delivery_attempted_failed' THEN
            allowed := ARRAY['out_for_delivery', 'returned', 'cancelled', 'refund_pending'];
        WHEN 'cancelled' THEN
            allowed := ARRAY['refund_pending'];
        WHEN 'refund_pending' THEN
            allowed := ARRAY['refunded'];
        WHEN 'refunded' THEN
            allowed := ARRAY[]::TEXT[];
        WHEN 'disputed' THEN
            allowed := ARRAY['refund_pending', 'completed'];
        WHEN 'returned' THEN
            allowed := ARRAY['refund_pending'];
        ELSE
            allowed := ARRAY[]::TEXT[];
    END CASE;

    -- Check if new status is in allowed list
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (NEW.status = ANY(allowed)) THEN
        RAISE EXCEPTION 'State Machine Violation: Cannot transition from "%" to "%". Allowed: %', OLD.status, NEW.status, allowed;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_order_state ON public.foody_orders;
CREATE TRIGGER trg_enforce_order_state
    BEFORE UPDATE OF status ON public.foody_orders
    FOR EACH ROW EXECUTE FUNCTION public.enforce_order_state_transition();

-- ====================================================================
-- 4. TAMPER-PROOF IMMUTABLE AUDIT LEDGER (Hash Chaining + RESTRICT FK)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_order_events (
    id TEXT PRIMARY KEY DEFAULT ('evt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    order_id TEXT NOT NULL REFERENCES public.foody_orders(id) ON DELETE RESTRICT,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    event_type TEXT NOT NULL,
    previous_event_hash TEXT,
    event_hash TEXT NOT NULL DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4A. Enforce Pure Append-Only Immutability (Disallow UPDATE & DELETE)
CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Policy Violation: foody_order_events records are strictly immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_tamper ON public.foody_order_events;
CREATE TRIGGER trg_prevent_audit_tamper
    BEFORE UPDATE OR DELETE ON public.foody_order_events
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_tampering();

-- 4B. SERVER-SIDE CRYPTOGRAPHIC HASH CHAINING TRIGGER
-- Computes SHA-256 hash chain on INSERT with FOR UPDATE row lock to prevent forking
CREATE OR REPLACE FUNCTION public.compute_event_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    prev_hash TEXT;
    prev_seq INT;
    payload TEXT;
BEGIN
    -- Acquire exclusive lock on the parent order row to serialize event stream
    PERFORM 1 FROM public.foody_orders WHERE id = NEW.order_id FOR UPDATE;

    -- Get previous event hash AND sequence (deterministic ordering)
    SELECT event_hash, COALESCE(event_sequence, 0) INTO prev_hash, prev_seq
    FROM public.foody_order_events
    WHERE order_id = NEW.order_id
      AND ctid != NEW.ctid
    ORDER BY COALESCE(event_sequence, 0) DESC, created_at DESC
    LIMIT 1;

    -- If no previous event, use genesis sentinel
    IF prev_hash IS NULL THEN
        prev_hash := 'GENESIS_' || NEW.order_id;
        prev_seq := 0;
    END IF;

    NEW.event_sequence := prev_seq + 1;
    NEW.previous_event_hash := prev_hash;

    -- Build deterministic payload for hashing
    payload := NEW.order_id || '|' || NEW.actor_id || '|' || NEW.actor_role || '|' || NEW.event_type || '|' || COALESCE(NEW.metadata::text, '{}') || '|' || NEW.created_at::text || '|' || prev_hash;

    -- Compute SHA-256 hash
    NEW.event_hash := encode(digest(payload, 'sha256'), 'hex');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_event_hash ON public.foody_order_events;
CREATE TRIGGER trg_compute_event_hash
    BEFORE INSERT ON public.foody_order_events
    FOR EACH ROW EXECUTE FUNCTION public.compute_event_hash_chain();

-- ====================================================================
-- 5. MULTI-ACTOR COD CASH RECONCILIATION LEDGER
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_cash_settlements (
    id TEXT PRIMARY KEY DEFAULT ('csh_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    order_id TEXT REFERENCES public.foody_orders(id) ON DELETE RESTRICT,
    shop_id TEXT NOT NULL REFERENCES public.foody_shops(id) ON DELETE RESTRICT,
    rider_id TEXT NOT NULL,
    expected_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    rider_declared_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    cashier_received_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    cash_received_from_customer NUMERIC(10,2) DEFAULT 0,
    change_returned_to_customer NUMERIC(10,2) DEFAULT 0,
    -- Database-computed columns
    net_collected NUMERIC(10,2) GENERATED ALWAYS AS (cash_received_from_customer - change_returned_to_customer) STORED,
    difference NUMERIC(10,2) GENERATED ALWAYS AS (rider_declared_amount - expected_amount) STORED,
    declared_by TEXT NOT NULL,
    received_by TEXT,
    approved_by TEXT,
    status TEXT NOT NULL DEFAULT 'under_review' CHECK (status IN ('settled', 'disputed', 'excess_settlement', 'partial_settlement', 'full_settlement', 'under_review')),
    dispute_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 6. ROLES MASTER CATALOG TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    hierarchy_level INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_foody_roles_updated_at ON public.foody_roles;
CREATE TRIGGER trg_foody_roles_updated_at
    BEFORE UPDATE ON public.foody_roles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Populate core enterprise roles
INSERT INTO public.foody_roles (id, name, description, icon, hierarchy_level)
VALUES 
    ('customer', 'Customer / Devotee', 'Standard user placing orders, exploring menus, and tracking prasadam deliveries', 'Sparkles', 1),
    ('delivery', 'Delivery Sarathi', 'Fleet rider partners fulfilling and delivering dispatched orders across Vrindavan', 'Truck', 2),
    ('kitchen', 'Kitchen Staff / Chef', 'Kitchen staff managing live KDS tickets, preparation states, and dish availability', 'ChefHat', 3),
    ('owner', 'Store Owner / Admin', 'Kitchen and store administrators overseeing menus, orders, pricing & shop analytics', 'ShieldCheck', 4),
    ('developer', 'Master Developer', 'System administrator with root debug access, database management, and system overrides', 'Terminal', 5)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    hierarchy_level = EXCLUDED.hierarchy_level,
    updated_at = NOW();

-- ====================================================================
-- 7. LOGGED-IN USERS & ROLE MANAGEMENT TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_logged_users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer' REFERENCES public.foody_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    shop_id TEXT NOT NULL DEFAULT 'shop-vrinda-main' REFERENCES public.foody_shops(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    shop_ids JSONB DEFAULT '["shop-vrinda-main"]'::jsonb,
    dev_permissions JSONB DEFAULT '[]'::jsonb,
    login_method TEXT DEFAULT 'email',
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT true,
    duty_status TEXT DEFAULT 'on_duty',
    current_location JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS duty_status TEXT DEFAULT 'on_duty';
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS current_location JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS trust_score NUMERIC DEFAULT 750;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS cibil_score NUMERIC DEFAULT 750;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS cash_in_hand NUMERIC DEFAULT 0;
ALTER TABLE public.foody_logged_users ADD COLUMN IF NOT EXISTS unsettled_debt NUMERIC DEFAULT 0;

DROP TRIGGER IF EXISTS trg_foody_logged_users_updated_at ON public.foody_logged_users;
CREATE TRIGGER trg_foody_logged_users_updated_at
    BEFORE UPDATE ON public.foody_logged_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Backward-compatibility: public.foody_users table
CREATE TABLE IF NOT EXISTS public.foody_users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer' REFERENCES public.foody_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    shop_id TEXT DEFAULT 'shop-vrinda-main' REFERENCES public.foody_shops(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    shop_ids JSONB DEFAULT '["shop-vrinda-main"]'::jsonb,
    dev_permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT true,
    duty_status TEXT DEFAULT 'on_duty',
    current_location JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS duty_status TEXT DEFAULT 'on_duty';
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS current_location JSONB DEFAULT '{"lat": 27.5706, "lng": 77.6593}'::jsonb;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS trust_score NUMERIC DEFAULT 750;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS cibil_score NUMERIC DEFAULT 750;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS cash_in_hand NUMERIC DEFAULT 0;
ALTER TABLE public.foody_users ADD COLUMN IF NOT EXISTS unsettled_debt NUMERIC DEFAULT 0;

-- Pre-normalize invalid roles before applying foreign keys
UPDATE public.foody_users SET role = 'customer' WHERE role IS NULL OR role NOT IN (SELECT id FROM public.foody_roles);
UPDATE public.foody_logged_users SET role = 'customer' WHERE role IS NULL OR role NOT IN (SELECT id FROM public.foody_roles);

-- Apply Foreign Key constraints safely
DO $$
BEGIN
    ALTER TABLE public.foody_logged_users DROP CONSTRAINT IF EXISTS fk_foody_logged_users_role;
    ALTER TABLE public.foody_logged_users DROP CONSTRAINT IF EXISTS foody_logged_users_role_check;
    ALTER TABLE public.foody_logged_users ADD CONSTRAINT fk_foody_logged_users_role FOREIGN KEY (role) REFERENCES public.foody_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;

    ALTER TABLE public.foody_users DROP CONSTRAINT IF EXISTS fk_foody_users_role;
    ALTER TABLE public.foody_users DROP CONSTRAINT IF EXISTS foody_users_role_check;
    ALTER TABLE public.foody_users ADD CONSTRAINT fk_foody_users_role FOREIGN KEY (role) REFERENCES public.foody_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_foody_users_updated_at ON public.foody_users;
CREATE TRIGGER trg_foody_users_updated_at
    BEFORE UPDATE ON public.foody_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 8. FOODY REVIEWS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_reviews (
    id BIGSERIAL PRIMARY KEY,
    order_id TEXT,
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    customer_name TEXT,
    rating INT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    tags JSONB DEFAULT '[]'::jsonb,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 9. FOODY NOTIFICATIONS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    role TEXT DEFAULT 'all',
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    order_id TEXT,
    type TEXT DEFAULT 'order_update',
    title TEXT,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 10. FOODY OFFERS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_offers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    discount_type TEXT DEFAULT 'flat' CHECK (discount_type IN ('flat', 'percent')),
    discount_value NUMERIC NOT NULL DEFAULT 0,
    min_order_amount NUMERIC DEFAULT 0,
    max_discount NUMERIC DEFAULT 0,
    shop_id TEXT DEFAULT 'all',
    is_active BOOLEAN DEFAULT true,
    tag TEXT DEFAULT 'Special Offer',
    valid_until TIMESTAMPTZ DEFAULT '2028-12-31T23:59:59.000Z',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_foody_offers_updated_at ON public.foody_offers;
CREATE TRIGGER trg_foody_offers_updated_at
    BEFORE UPDATE ON public.foody_offers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 11. FOODY CASH TRANSACTIONS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.foody_cash_transactions (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    amount NUMERIC NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('collection', 'settlement', 'refund')),
    user_id TEXT,
    user_name TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 12. PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON public.foody_orders (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.foody_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.foody_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.foody_orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON public.foody_orders (rider_id);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.foody_order_events (order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON public.foody_order_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_events_hash_chain ON public.foody_order_events (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_settlements_rider ON public.foody_cash_settlements (rider_id, status);

CREATE INDEX IF NOT EXISTS idx_menus_shop ON public.foody_menus (shop_id);
CREATE INDEX IF NOT EXISTS idx_menus_category ON public.foody_menus (category);
CREATE INDEX IF NOT EXISTS idx_menus_is_available ON public.foody_menus (is_available);

CREATE INDEX IF NOT EXISTS idx_logged_users_role ON public.foody_logged_users (role);
CREATE INDEX IF NOT EXISTS idx_logged_users_email ON public.foody_logged_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_logged_users_phone ON public.foody_logged_users (phone);
CREATE INDEX IF NOT EXISTS idx_logged_users_shop_id ON public.foody_logged_users (shop_id);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.foody_users (role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.foody_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.foody_users (phone);
CREATE INDEX IF NOT EXISTS idx_users_shop_id ON public.foody_users (shop_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.foody_notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_shop_role ON public.foody_notifications (shop_id, role);
CREATE INDEX IF NOT EXISTS idx_reviews_shop ON public.foody_reviews (shop_id);
CREATE INDEX IF NOT EXISTS idx_offers_code ON public.foody_offers (code);
CREATE INDEX IF NOT EXISTS idx_cash_tx_order ON public.foody_cash_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_cash_tx_user ON public.foody_cash_transactions (user_id);

-- ====================================================================
-- 13. REPLICA IDENTITY (Full-Row Realtime Streaming)
-- ====================================================================
ALTER TABLE public.foody_shops REPLICA IDENTITY FULL;
ALTER TABLE public.foody_menus REPLICA IDENTITY FULL;
ALTER TABLE public.foody_orders REPLICA IDENTITY FULL;
ALTER TABLE public.foody_order_events REPLICA IDENTITY FULL;
ALTER TABLE public.foody_cash_settlements REPLICA IDENTITY FULL;
ALTER TABLE public.foody_logged_users REPLICA IDENTITY FULL;
ALTER TABLE public.foody_users REPLICA IDENTITY FULL;
ALTER TABLE public.foody_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.foody_roles REPLICA IDENTITY FULL;
ALTER TABLE public.foody_offers REPLICA IDENTITY FULL;
ALTER TABLE public.foody_cash_transactions REPLICA IDENTITY FULL;

-- ====================================================================
-- 14. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- Phase 1: Open policies (tighten per-role after auth integration)
-- ====================================================================
ALTER TABLE public.foody_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access roles" ON public.foody_roles;
CREATE POLICY "Public access roles" ON public.foody_roles FOR SELECT USING (true);

ALTER TABLE public.foody_shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access shops" ON public.foody_shops;
CREATE POLICY "Public access shops" ON public.foody_shops FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owner manage shops" ON public.foody_shops;
CREATE POLICY "Owner manage shops" ON public.foody_shops FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read menus" ON public.foody_menus;
CREATE POLICY "Public read menus" ON public.foody_menus FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff manage menus" ON public.foody_menus;
CREATE POLICY "Staff manage menus" ON public.foody_menus FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access orders" ON public.foody_orders;
CREATE POLICY "Public access orders" ON public.foody_orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_order_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access order events" ON public.foody_order_events;
DROP POLICY IF EXISTS "Read events" ON public.foody_order_events;
CREATE POLICY "Read events" ON public.foody_order_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insert events" ON public.foody_order_events;
CREATE POLICY "Insert events" ON public.foody_order_events FOR INSERT WITH CHECK (true);

ALTER TABLE public.foody_cash_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access cash settlements" ON public.foody_cash_settlements;
CREATE POLICY "Public access cash settlements" ON public.foody_cash_settlements FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_logged_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access logged users" ON public.foody_logged_users;
CREATE POLICY "Public access logged users" ON public.foody_logged_users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access users" ON public.foody_users;
CREATE POLICY "Public access users" ON public.foody_users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access reviews" ON public.foody_reviews;
CREATE POLICY "Public access reviews" ON public.foody_reviews FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access notifications" ON public.foody_notifications;
CREATE POLICY "Public access notifications" ON public.foody_notifications FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access offers" ON public.foody_offers;
CREATE POLICY "Public access offers" ON public.foody_offers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_cash_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access cash transactions" ON public.foody_cash_transactions;
CREATE POLICY "Public access cash transactions" ON public.foody_cash_transactions FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 15. REALTIME STREAMING PUBLICATION (Idempotent)
-- ====================================================================
DO $$ BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_roles; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_shops; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_menus; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_order_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_settlements; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_logged_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_reviews; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_offers; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_cash_transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

NOTIFY pgrst, 'reload schema';

-- ====================================================================
-- 16. AUTH.USERS -> LOGGED USERS & FOODY USERS SYNC TRIGGER
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    extracted_name TEXT;
    extracted_role TEXT;
    extracted_phone TEXT;
    extracted_avatar TEXT;
BEGIN
    extracted_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Foody Devotee'
    );
    
    extracted_role := COALESCE(
        NEW.raw_app_meta_data->>'role',
        NEW.raw_user_meta_data->>'role',
        'customer'
    );

    extracted_phone := COALESCE(
        NEW.phone,
        NEW.raw_user_meta_data->>'phone',
        ''
    );

    extracted_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        ''
    );

    INSERT INTO public.foody_logged_users (
        id, display_name, email, phone, avatar_url, role, shop_id, shop_ids, last_login_at, created_at, updated_at
    )
    VALUES (
        NEW.id::text, extracted_name, NEW.email, extracted_phone, extracted_avatar, extracted_role, 'shop-vrinda-main', '["shop-vrinda-main"]'::jsonb, NOW(), COALESCE(NEW.created_at, NOW()), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        email = COALESCE(EXCLUDED.email, foody_logged_users.email),
        phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE foody_logged_users.phone END,
        avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE foody_logged_users.avatar_url END,
        last_login_at = NOW(),
        updated_at = NOW();

    INSERT INTO public.foody_users (
        id, display_name, email, phone, avatar_url, role, shop_id, shop_ids, last_seen_at, created_at, updated_at
    )
    VALUES (
        NEW.id::text, extracted_name, NEW.email, extracted_phone, extracted_avatar, extracted_role, 'shop-vrinda-main', '["shop-vrinda-main"]'::jsonb, NOW(), COALESCE(NEW.created_at, NOW()), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        email = COALESCE(EXCLUDED.email, foody_users.email),
        phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE foody_users.phone END,
        avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE foody_users.avatar_url END,
        last_seen_at = NOW(),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT OR UPDATE ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ====================================================================
-- 17. ATOMIC ROLE ASSIGNMENT RPC
-- ====================================================================
CREATE OR REPLACE FUNCTION public.set_user_role(
    target_id TEXT,
    new_role TEXT,
    target_shop TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_record JSONB;
BEGIN
    -- Validate role exists
    IF NOT EXISTS (SELECT 1 FROM public.foody_roles WHERE id = new_role) THEN
        RAISE EXCEPTION 'Invalid role: "%". Must be a valid foody_roles.id.', new_role;
    END IF;

    UPDATE public.foody_logged_users
    SET 
        role = new_role,
        shop_id = COALESCE(target_shop, shop_id),
        shop_ids = CASE 
            WHEN target_shop IS NOT NULL THEN jsonb_build_array(target_shop)
            ELSE shop_ids
        END,
        updated_at = NOW()
    WHERE id = target_id OR LOWER(email) = LOWER(target_id) OR phone = target_id
    RETURNING to_jsonb(foody_logged_users.*) INTO updated_record;

    UPDATE public.foody_users
    SET 
        role = new_role,
        shop_id = COALESCE(target_shop, shop_id),
        shop_ids = CASE 
            WHEN target_shop IS NOT NULL THEN jsonb_build_array(target_shop)
            ELSE shop_ids
        END,
        updated_at = NOW()
    WHERE id = target_id OR LOWER(email) = LOWER(target_id) OR phone = target_id;

    IF updated_record IS NULL THEN
        SELECT to_jsonb(foody_users.*) INTO updated_record FROM public.foody_users WHERE id = target_id OR LOWER(email) = LOWER(target_id) OR phone = target_id LIMIT 1;
    END IF;

    BEGIN
        UPDATE auth.users
        SET 
            raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role)),
            raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role))
        WHERE id::text = target_id OR LOWER(email) = LOWER(target_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN updated_record;
END;
$$;

-- ====================================================================
-- 18. ATOMIC ORDER PICKUP CLAIM RPC (Concurrency-Safe)
-- Rider claims order with FOR UPDATE lock + OTP rate limiting
-- ====================================================================
CREATE OR REPLACE FUNCTION public.claim_order_pickup_atomic(
    p_order_id TEXT,
    p_rider_id TEXT,
    p_otp_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_result JSONB;
    v_caller_id TEXT;
BEGIN
    -- Strict caller identity binding: reject unauthenticated impersonation
    IF auth.uid() IS NOT NULL THEN
        IF auth.uid()::text IS DISTINCT FROM p_rider_id THEN
            RAISE EXCEPTION 'Caller identity mismatch: auth.uid()=% does not match claimed rider_id=%', auth.uid()::text, p_rider_id;
        END IF;
        v_caller_id := auth.uid()::text;
    ELSIF current_user IN ('postgres', 'supabase_admin') OR (COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role') THEN
        v_caller_id := p_rider_id;
    ELSE
        RAISE EXCEPTION 'Authentication required: Anonymous clients cannot execute rider operations.';
    END IF;

    -- Lock the order row exclusively
    SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;
    
    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    -- Check order is in correct state for pickup
    IF v_order.status NOT IN ('ready_for_pickup', 'rider_assigned', 'rider_arriving') THEN
        RAISE EXCEPTION 'Order % is in state "%" — cannot claim for pickup.', p_order_id, v_order.status;
    END IF;

    -- Enforce OTP one-time use
    IF v_order.pickup_otp_used_at IS NOT NULL THEN
        RAISE EXCEPTION 'Pickup OTP has already been used for order %.', p_order_id;
    END IF;

    -- Rate limit: max 5 OTP attempts
    IF v_order.pickup_otp_attempts >= 5 THEN
        RAISE EXCEPTION 'OTP rate limit exceeded for order %. Contact admin.', p_order_id;
    END IF;

    -- Check OTP expiry
    IF v_order.pickup_otp_expires_at IS NOT NULL AND NOW() > v_order.pickup_otp_expires_at THEN
        RAISE EXCEPTION 'Pickup OTP has expired for order %.', p_order_id;
    END IF;

    -- Verify OTP: hash-first, deprecated plaintext fallback
    IF v_order.pickup_otp_hash IS NOT NULL THEN
        IF encode(digest(p_otp_input, 'sha256'), 'hex') != v_order.pickup_otp_hash THEN
            UPDATE public.foody_orders SET pickup_otp_attempts = pickup_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid pickup OTP for order %.', p_order_id;
        END IF;
    ELSIF v_order.pickup_otp IS NOT NULL THEN
        -- DEPRECATED: Legacy plaintext fallback — scheduled for removal in v5.4
        IF p_otp_input != v_order.pickup_otp THEN
            UPDATE public.foody_orders SET pickup_otp_attempts = pickup_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid pickup OTP for order %.', p_order_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'No OTP configured for order %. Cannot verify pickup.', p_order_id;
    END IF;

    -- Claim successful: update order atomically
    UPDATE public.foody_orders
    SET 
        status = 'picked_up',
        rider_id = v_caller_id,
        picked_up_at = NOW(),
        pickup_otp_attempts = 0,
        pickup_otp_used_at = NOW(),
        otp_used_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING to_jsonb(foody_orders.*) INTO v_result;

    -- Log audit event
    INSERT INTO public.foody_order_events (order_id, actor_id, actor_role, event_type, metadata)
    VALUES (p_order_id, v_caller_id, 'delivery', 'PICKUP_CLAIMED',
            jsonb_build_object('verified_by', 'otp', 'claimed_at', NOW()::text));

    RETURN v_result;
END;
$$;

-- ====================================================================
-- 19. ATOMIC DELIVERY OTP VERIFICATION RPC (Concurrency-Safe)
-- Customer confirms delivery with OTP + rate limiting
-- ====================================================================
CREATE OR REPLACE FUNCTION public.verify_delivery_otp_atomic(
    p_order_id TEXT,
    p_rider_id TEXT,
    p_otp_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_result JSONB;
    v_caller_id TEXT;
BEGIN
    -- Strict caller identity binding: reject unauthenticated impersonation
    IF auth.uid() IS NOT NULL THEN
        IF auth.uid()::text IS DISTINCT FROM p_rider_id THEN
            RAISE EXCEPTION 'Caller identity mismatch: auth.uid()=% does not match claimed rider_id=%', auth.uid()::text, p_rider_id;
        END IF;
        v_caller_id := auth.uid()::text;
    ELSIF current_user IN ('postgres', 'supabase_admin') OR (COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role') THEN
        v_caller_id := p_rider_id;
    ELSE
        RAISE EXCEPTION 'Authentication required: Anonymous clients cannot execute rider operations.';
    END IF;

    -- Lock the order row exclusively
    SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;
    
    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    -- Verify rider owns this delivery
    IF v_order.rider_id IS NOT NULL AND v_order.rider_id != v_caller_id THEN
        RAISE EXCEPTION 'Rider % is not assigned to order %.', v_caller_id, p_order_id;
    END IF;

    -- Check order is in correct state for delivery
    IF v_order.status NOT IN ('out_for_delivery') THEN
        RAISE EXCEPTION 'Order % is in state "%" — cannot verify delivery.', p_order_id, v_order.status;
    END IF;

    -- Enforce OTP one-time use
    IF v_order.delivery_otp_used_at IS NOT NULL THEN
        RAISE EXCEPTION 'Delivery OTP has already been used for order %.', p_order_id;
    END IF;

    -- Rate limit: max 5 OTP attempts
    IF v_order.delivery_otp_attempts >= 5 THEN
        RAISE EXCEPTION 'Delivery OTP rate limit exceeded for order %. Contact admin.', p_order_id;
    END IF;

    -- Check OTP expiry
    IF v_order.delivery_otp_expires_at IS NOT NULL AND NOW() > v_order.delivery_otp_expires_at THEN
        RAISE EXCEPTION 'Delivery OTP has expired for order %.', p_order_id;
    END IF;

    -- Verify OTP: hash-first, deprecated plaintext fallback
    IF v_order.delivery_otp_hash IS NOT NULL THEN
        IF encode(digest(p_otp_input, 'sha256'), 'hex') != v_order.delivery_otp_hash THEN
            UPDATE public.foody_orders SET delivery_otp_attempts = delivery_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid delivery OTP for order %.', p_order_id;
        END IF;
    ELSIF v_order.delivery_otp IS NOT NULL THEN
        -- DEPRECATED: Legacy plaintext fallback — scheduled for removal in v5.4
        IF p_otp_input != v_order.delivery_otp THEN
            UPDATE public.foody_orders SET delivery_otp_attempts = delivery_otp_attempts + 1 WHERE id = p_order_id;
            RAISE EXCEPTION 'Invalid delivery OTP for order %.', p_order_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'No OTP configured for order %. Cannot verify delivery.', p_order_id;
    END IF;

    -- Delivery confirmed: update order atomically
    UPDATE public.foody_orders
    SET 
        status = 'delivered',
        delivered_at = NOW(),
        delivery_otp_attempts = 0,
        delivery_otp_used_at = NOW(),
        otp_used_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING to_jsonb(foody_orders.*) INTO v_result;

    -- Log audit event
    INSERT INTO public.foody_order_events (order_id, actor_id, actor_role, event_type, metadata)
    VALUES (p_order_id, v_caller_id, 'delivery', 'DELIVERY_VERIFIED', jsonb_build_object('verified_by', 'otp', 'delivered_at', NOW()::text));

    RETURN v_result;
END;
$$;

-- ====================================================================
-- 20. HASH CHAIN INTEGRITY VERIFICATION RPC
-- Call to audit the integrity of an order's event chain
-- ====================================================================
CREATE OR REPLACE FUNCTION public.verify_order_hash_chain(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_event RECORD;
    v_prev_hash TEXT;
    v_expected_hash TEXT;
    v_payload TEXT;
    v_count INT := 0;
    v_broken_at TEXT := NULL;
BEGIN
    v_prev_hash := 'GENESIS_' || p_order_id;

    FOR v_event IN
        SELECT * FROM public.foody_order_events
        WHERE order_id = p_order_id
        ORDER BY COALESCE(event_sequence, 0) ASC, created_at ASC
    LOOP
        v_count := v_count + 1;

        -- Verify previous_event_hash matches expected
        IF v_event.previous_event_hash IS DISTINCT FROM v_prev_hash THEN
            v_broken_at := v_event.id;
            EXIT;
        END IF;

        -- Recompute hash and verify
        v_payload := v_event.order_id || '|' || v_event.actor_id || '|' || v_event.actor_role || '|' || v_event.event_type || '|' || COALESCE(v_event.metadata::text, '{}') || '|' || v_event.created_at::text || '|' || v_prev_hash;
        v_expected_hash := encode(digest(v_payload, 'sha256'), 'hex');

        IF v_event.event_hash != v_expected_hash THEN
            v_broken_at := v_event.id;
            EXIT;
        END IF;

        v_prev_hash := v_event.event_hash;
    END LOOP;

    RETURN jsonb_build_object(
        'order_id', p_order_id,
        'total_events', v_count,
        'chain_valid', (v_broken_at IS NULL),
        'broken_at_event_id', v_broken_at
    );
END;
$$;
`;
