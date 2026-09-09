-- ========================================================================
-- FOODY VRINDA: SUPABASE ROLE CATEGORY SELECTION & FOREIGN KEY MIGRATION
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- 
-- PURPOSE:
-- 1. Creates public.foody_roles table as the master category catalog.
-- 2. Seeds all official roles (customer, delivery, kitchen, owner, developer).
-- 3. Cleans existing user rows to prevent any foreign key violations.
-- 4. Establishes FOREIGN KEY relations on role & shop_id.
-- 5. Enables the green 🔗 link icon and dropdown category selection in 
--    Supabase Table Editor (identical to the shop_id relation).
-- 6. Reloads PostgREST schema cache immediately.
-- ========================================================================

-- STEP 1: Create Master Roles Table (Lookup Catalog)
CREATE TABLE IF NOT EXISTS public.foody_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    hierarchy_level INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper trigger for auto updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_foody_roles_updated_at ON public.foody_roles;
CREATE TRIGGER trg_foody_roles_updated_at
    BEFORE UPDATE ON public.foody_roles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- STEP 2: Seed Official Roles & Categories
INSERT INTO public.foody_roles (id, name, description, icon, hierarchy_level)
VALUES 
    ('customer', 'Customer / Devotee', 'Standard user placing orders, exploring menus, and tracking prasadam deliveries', 'Sparkles', 1),
    ('delivery', 'Delivery Sarathi', 'Fleet rider partners fulfilling and delivering dispatched orders across Vrindavan', 'Truck', 2),
    ('kitchen', 'Kitchen Staff / Chef', 'Kitchen staff managing live KDS tickets, preparation states, and dish availability', 'ChefHat', 3),
    ('owner', 'Store Owner / Admin', 'Kitchen and store administrators overseeing menus, orders, pricing & shop analytics', 'ShieldCheck', 4),
    ('developer', 'Master Developer', 'System administrator with root debug access, database management, and system overrides', 'Terminal', 5),
    ('grand_admin', 'Grand Admin', 'Supreme platform custodian and immutable root administrator with permanent permissions', 'Crown', 6)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    hierarchy_level = EXCLUDED.hierarchy_level,
    updated_at = NOW();

-- STEP 3: Ensure public.foody_shops table has main branch
INSERT INTO public.foody_shops (id, name, address, phone)
VALUES ('shop-vrinda-main', 'Foody Vrinda - Main Branch', 'Raman Reti, Vrindavan, Mathura, UP 281121', '+91 98765 43210')
ON CONFLICT (id) DO NOTHING;

-- STEP 4: Ensure Tables and Columns Exist
CREATE TABLE IF NOT EXISTS public.foody_logged_users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    shop_id TEXT NOT NULL DEFAULT 'shop-vrinda-main',
    shop_ids JSONB DEFAULT '["shop-vrinda-main"]'::jsonb,
    dev_permissions JSONB DEFAULT '[]'::jsonb,
    login_method TEXT DEFAULT 'email',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.foody_users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    shop_id TEXT DEFAULT 'shop-vrinda-main',
    shop_ids JSONB DEFAULT '["shop-vrinda-main"]'::jsonb,
    dev_permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 5: Pre-normalize Data (Guarantees zero FK violations on existing rows)
UPDATE public.foody_users 
SET role = 'customer' 
WHERE role IS NULL OR role NOT IN (SELECT id FROM public.foody_roles);

UPDATE public.foody_logged_users 
SET role = 'customer' 
WHERE role IS NULL OR role NOT IN (SELECT id FROM public.foody_roles);

UPDATE public.foody_users 
SET shop_id = 'shop-vrinda-main' 
WHERE shop_id IS NULL OR shop_id NOT IN (SELECT id FROM public.foody_shops);

UPDATE public.foody_logged_users 
SET shop_id = 'shop-vrinda-main' 
WHERE shop_id IS NULL OR shop_id NOT IN (SELECT id FROM public.foody_shops);

-- STEP 6: Apply Foreign Key Relations
-- Dropping legacy constraints if present
ALTER TABLE public.foody_users DROP CONSTRAINT IF EXISTS fk_foody_users_role;
ALTER TABLE public.foody_users DROP CONSTRAINT IF EXISTS foody_users_role_check;
ALTER TABLE public.foody_users DROP CONSTRAINT IF EXISTS fk_foody_users_shop;

ALTER TABLE public.foody_logged_users DROP CONSTRAINT IF EXISTS fk_foody_logged_users_role;
ALTER TABLE public.foody_logged_users DROP CONSTRAINT IF EXISTS foody_logged_users_role_check;
ALTER TABLE public.foody_logged_users DROP CONSTRAINT IF EXISTS fk_foody_logged_users_shop;

-- Adding relational Foreign Keys (Supabase detects these to show 🔗 and dropdown choices)
ALTER TABLE public.foody_users
    ADD CONSTRAINT fk_foody_users_role
    FOREIGN KEY (role) REFERENCES public.foody_roles(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.foody_users
    ADD CONSTRAINT fk_foody_users_shop
    FOREIGN KEY (shop_id) REFERENCES public.foody_shops(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.foody_logged_users
    ADD CONSTRAINT fk_foody_logged_users_role
    FOREIGN KEY (role) REFERENCES public.foody_roles(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.foody_logged_users
    ADD CONSTRAINT fk_foody_logged_users_shop
    FOREIGN KEY (shop_id) REFERENCES public.foody_shops(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- STEP 7: Configure Replica Identity for Realtime Streaming
ALTER TABLE public.foody_roles REPLICA IDENTITY FULL;
ALTER TABLE public.foody_logged_users REPLICA IDENTITY FULL;
ALTER TABLE public.foody_users REPLICA IDENTITY FULL;

-- STEP 8: Configure Row Level Security (RLS)
ALTER TABLE public.foody_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access roles" ON public.foody_roles;
CREATE POLICY "Public access roles" ON public.foody_roles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_logged_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access logged users" ON public.foody_logged_users;
CREATE POLICY "Public access logged users" ON public.foody_logged_users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.foody_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access users" ON public.foody_users;
CREATE POLICY "Public access users" ON public.foody_users FOR ALL USING (true) WITH CHECK (true);

-- STEP 9: Enable Realtime Broadcast
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_roles; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_logged_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- STEP 10: Grand Admin Immutability Safeguards
-- Ensures no one can update or downgrade any user once assigned 'grand_admin'
CREATE OR REPLACE FUNCTION public.protect_grand_admin_role()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role = 'grand_admin' AND NEW.role <> 'grand_admin' THEN
        RAISE EXCEPTION 'PERMISSION DENIED: Grand Admin role is permanent and immutable. It cannot be altered or downgraded.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_logged_grand_admin ON public.foody_logged_users;
CREATE TRIGGER trg_protect_logged_grand_admin
    BEFORE UPDATE ON public.foody_logged_users
    FOR EACH ROW EXECUTE FUNCTION public.protect_grand_admin_role();

DROP TRIGGER IF EXISTS trg_protect_users_grand_admin ON public.foody_users;
CREATE TRIGGER trg_protect_users_grand_admin
    BEFORE UPDATE ON public.foody_users
    FOR EACH ROW EXECUTE FUNCTION public.protect_grand_admin_role();

CREATE OR REPLACE FUNCTION public.prevent_grand_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role = 'grand_admin' THEN
        RAISE EXCEPTION 'PERMISSION DENIED: Grand Admin account is permanent and cannot be deleted.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_delete_logged_grand_admin ON public.foody_logged_users;
CREATE TRIGGER trg_prevent_delete_logged_grand_admin
    BEFORE DELETE ON public.foody_logged_users
    FOR EACH ROW EXECUTE FUNCTION public.prevent_grand_admin_deletion();

DROP TRIGGER IF EXISTS trg_prevent_delete_users_grand_admin ON public.foody_users;
CREATE TRIGGER trg_prevent_delete_users_grand_admin
    BEFORE DELETE ON public.foody_users
    FOR EACH ROW EXECUTE FUNCTION public.prevent_grand_admin_deletion();

-- STEP 11: Refresh Supabase Studio / PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
