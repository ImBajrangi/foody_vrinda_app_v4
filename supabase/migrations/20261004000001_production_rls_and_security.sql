-- =====================================================================
-- FOODY VRINDA: ZERO-TRUST PRODUCTION SECURITY ARCHITECTURE (V5.3.9)
-- 
-- 1. Zero Direct Order Mutation (No Direct INSERT, No Direct UPDATE)
--    - Server-side validated creation via create_validated_order() RPC
--    - Narrow state transitions via transition_order_status() & assign_order_rider() RPCs
-- 2. Zero Order Conflict Exposure
--    - Rejects existing order IDs explicitly (No ON CONFLICT DO UPDATE data leakage)
--    - Minimal payload returned (Least-Privilege data boundary)
-- 3. Zero Role Escalation / Profile Self-Elevation
--    - Direct INSERT revoked on foody_users & foody_logged_users
--    - Kernel Trigger blocks any non-admin from creating or updating privileged roles
--    - Secure sync_authenticated_profile() RPC hardcodes role = 'customer'
-- 4. Verified Delivered-Only Review Pipeline (submit_verified_review RPC)
-- 5. Mandatory 10-Digit Phone-Verified Guest Tracking (get_guest_order_tracking RPC)
-- =====================================================================

-- =====================================================================
-- STEP 1: REVOKE OVERLY BROAD PRIVILEGES & SET LEAST PRIVILEGE
-- =====================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Public read-only catalog tables & views
GRANT SELECT ON public.foody_shops TO anon, authenticated;
GRANT SELECT ON public.foody_menus TO anon, authenticated;
GRANT SELECT ON public.foody_presets TO anon, authenticated;
GRANT SELECT ON public.foody_offers TO anon, authenticated;
GRANT SELECT ON public.foody_reviews TO anon, authenticated;
GRANT SELECT ON public.foody_roles TO anon, authenticated;

-- Security-barrier public catalog views
DROP VIEW IF EXISTS public.public_shop_catalog CASCADE;
CREATE OR REPLACE VIEW public.public_shop_catalog WITH (security_barrier = true) AS
  SELECT *
  FROM public.foody_shops
  WHERE COALESCE(is_deleted, false) IS FALSE AND COALESCE(is_active, true) IS TRUE;

DROP VIEW IF EXISTS public.public_menu_catalog CASCADE;
CREATE OR REPLACE VIEW public.public_menu_catalog WITH (security_barrier = true) AS
  SELECT *
  FROM public.foody_menus;

GRANT SELECT ON public.public_shop_catalog TO anon, authenticated;
GRANT SELECT ON public.public_menu_catalog TO anon, authenticated;

-- Orders: Authenticated & guest can SELECT own records. Direct INSERT/UPDATE revoked!
GRANT SELECT ON public.foody_orders TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.foody_orders FROM anon, authenticated;

-- User Profiles: SELECT and UPDATE own profile. Direct client INSERT revoked!
GRANT SELECT, UPDATE ON public.foody_users TO anon, authenticated;
GRANT SELECT, UPDATE ON public.foody_logged_users TO anon, authenticated;
REVOKE INSERT, DELETE ON public.foody_users FROM anon, authenticated;
REVOKE INSERT, DELETE ON public.foody_logged_users FROM anon, authenticated;

-- Operational tables for authenticated staff
GRANT INSERT, UPDATE, DELETE ON public.foody_menus TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.foody_shops TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.foody_presets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.foody_offers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.foody_cash_settlements TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.foody_notifications TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================================
-- STEP 2: RBAC SECURITY DEFINER HELPER FUNCTIONS
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.foody_logged_users
    WHERE id = auth.uid()::text 
      AND role IN ('developer', 'grand_admin', 'admin', 'platform_admin', 'master_dev')
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.foody_logged_users
  WHERE id = auth.uid()::text AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_shop_ids()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT ARRAY(SELECT jsonb_array_elements_text(shop_ids)) FROM public.foody_logged_users WHERE id = auth.uid()::text AND shop_ids IS NOT NULL AND is_active = true),
    (SELECT ARRAY[shop_id] FROM public.foody_logged_users WHERE id = auth.uid()::text AND shop_id IS NOT NULL AND is_active = true),
    ARRAY[]::text[]
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_shop_ids() TO anon, authenticated, service_role;

-- =====================================================================
-- STEP 3: KERNEL ROLE ESCALATION PROTECTION TRIGGER (Insert & Update Guard)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.protect_user_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Allow internal postgres and supabase background services (e.g. auth hooks / admin seeders)
  IF current_user IN ('supabase_admin', 'postgres', 'service_role') OR session_user IN ('supabase_admin', 'postgres') THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  -- 1. On INSERT: Non-admins can NEVER self-register with privileged roles or shop ownership
  IF TG_OP = 'INSERT' THEN
    IF NEW.role NOT IN ('customer') OR NEW.shop_id IS NOT NULL OR NEW.shop_ids IS NOT NULL OR (NEW.dev_permissions IS NOT NULL AND NEW.dev_permissions::text != '[]') THEN
      IF NOT public.is_platform_admin() THEN
        NEW.role := 'customer';
        NEW.shop_id := NULL;
        NEW.shop_ids := NULL;
        NEW.dev_permissions := '[]'::jsonb;
      END IF;
    END IF;
  END IF;

  -- 2. On UPDATE: Non-admins can NEVER modify roles, shops, or dev permissions
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.role IS DISTINCT FROM NEW.role OR
        OLD.shop_id IS DISTINCT FROM NEW.shop_id OR
        OLD.shop_ids IS DISTINCT FROM NEW.shop_ids OR
        OLD.dev_permissions IS DISTINCT FROM NEW.dev_permissions) THEN
      IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only platform administrators can modify user roles or shop assignments.';
      END IF;
    END IF;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_foody_users ON public.foody_users;
CREATE TRIGGER trg_protect_foody_users
  BEFORE INSERT OR UPDATE ON public.foody_users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_profile_columns();

DROP TRIGGER IF EXISTS trg_protect_foody_logged_users ON public.foody_logged_users;
CREATE TRIGGER trg_protect_foody_logged_users
  BEFORE INSERT OR UPDATE ON public.foody_logged_users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_profile_columns();

-- =====================================================================
-- STEP 3.1: HARDENED AUTH.USERS SIGNUP TRIGGER (INSERT ONLY)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_avatar TEXT;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Foody Devotee'
  );
  v_email := NEW.email;
  v_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '');
  v_avatar := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '');

  -- Insert only on new user creation (DO NOTHING on conflict so existing roles/shops are preserved)
  INSERT INTO public.foody_logged_users (
    id, display_name, email, phone, avatar_url, role, is_active, last_login_at, created_at, updated_at
  ) VALUES (
    NEW.id::text, v_name, v_email, v_phone, v_avatar, 'customer', true, NOW(), NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    last_login_at = NOW(),
    updated_at = NOW();

  INSERT INTO public.foody_users (
    id, display_name, email, phone, avatar_url, role, is_active, created_at, updated_at
  ) VALUES (
    NEW.id::text, v_name, v_email, v_phone, v_avatar, 'customer', true, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Secure User Profile Sync RPC (Controlled Profile Management)
DROP FUNCTION IF EXISTS public.sync_authenticated_profile(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.sync_authenticated_profile(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.sync_authenticated_profile();

CREATE OR REPLACE FUNCTION public.sync_authenticated_profile(
  p_display_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT;
  v_email TEXT;
  v_updated_user RECORD;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: must be logged in to sync profile.';
  END IF;

  v_email := auth.jwt() ->> 'email';

  -- Upsert into foody_users strictly with role = 'customer' for regular users
  INSERT INTO public.foody_users (
    id,
    display_name,
    email,
    phone,
    address,
    avatar_url,
    role,
    is_active,
    updated_at
  ) VALUES (
    v_user_id,
    COALESCE(p_display_name, 'Devotee'),
    v_email,
    p_phone,
    p_address,
    p_avatar_url,
    'customer',
    true,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(p_display_name, public.foody_users.display_name),
    phone = COALESCE(p_phone, public.foody_users.phone),
    address = COALESCE(p_address, public.foody_users.address),
    avatar_url = COALESCE(p_avatar_url, public.foody_users.avatar_url),
    updated_at = NOW()
  RETURNING * INTO v_updated_user;

  -- Mirror to foody_logged_users
  INSERT INTO public.foody_logged_users (
    id,
    display_name,
    email,
    phone,
    address,
    avatar_url,
    role,
    is_active,
    last_login_at,
    updated_at
  ) VALUES (
    v_user_id,
    COALESCE(p_display_name, 'Devotee'),
    v_email,
    p_phone,
    p_address,
    p_avatar_url,
    'customer',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(p_display_name, public.foody_logged_users.display_name),
    phone = COALESCE(p_phone, public.foody_logged_users.phone),
    address = COALESCE(p_address, public.foody_logged_users.address),
    avatar_url = COALESCE(p_avatar_url, public.foody_logged_users.avatar_url),
    last_login_at = NOW(),
    updated_at = NOW();

  RETURN to_jsonb(v_updated_user);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_authenticated_profile(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- User Profiles RLS Policies (Read & Update own profile only)
ALTER TABLE public.foody_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_logged_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read profile" ON public.foody_users;
DROP POLICY IF EXISTS "Users update own profile" ON public.foody_users;
DROP POLICY IF EXISTS "Users read logged profile" ON public.foody_logged_users;
DROP POLICY IF EXISTS "Users update logged profile" ON public.foody_logged_users;

CREATE POLICY "Users read profile"
  ON public.foody_users FOR SELECT
  TO anon, authenticated
  USING (
    (id IS NOT NULL AND id = auth.uid()::text)
    OR (shop_id IS NOT NULL AND shop_id = ANY (public.get_auth_shop_ids()))
    OR public.is_platform_admin()
  );

CREATE POLICY "Users update own profile"
  ON public.foody_users FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()::text
    OR public.is_platform_admin()
  )
  WITH CHECK (
    id = auth.uid()::text
    OR public.is_platform_admin()
  );

CREATE POLICY "Users read logged profile"
  ON public.foody_logged_users FOR SELECT
  TO anon, authenticated
  USING (
    (id IS NOT NULL AND id = auth.uid()::text)
    OR (shop_id IS NOT NULL AND shop_id = ANY (public.get_auth_shop_ids()))
    OR public.is_platform_admin()
  );

CREATE POLICY "Users update logged profile"
  ON public.foody_logged_users FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()::text
    OR public.is_platform_admin()
  )
  WITH CHECK (
    id = auth.uid()::text
    OR public.is_platform_admin()
  );

-- =====================================================================
-- STEP 4: STRICT SERVER-SIDE ORDER CREATION RPC (Zero Conflict Exposure)
-- =====================================================================

DROP FUNCTION IF EXISTS public.create_validated_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_validated_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_validated_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.create_validated_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.create_validated_order(
  p_order_id TEXT,
  p_shop_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_delivery_address TEXT,
  p_customer_address TEXT,
  p_items JSONB,
  p_payment_method TEXT DEFAULT 'cod',
  p_cooking_notes TEXT DEFAULT '',
  p_fulfillment_type TEXT DEFAULT 'delivery'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_shop RECORD;
  v_calc_subtotal NUMERIC := 0;
  v_calc_delivery NUMERIC := 0;
  v_calc_gst NUMERIC := 0;
  v_calc_total NUMERIC := 0;
  v_clean_phone TEXT;
  v_user_id TEXT;
  v_item JSONB;
  v_item_id TEXT;
  v_item_qty INT;
  v_db_dish RECORD;
  v_final_items JSONB := '[]'::JSONB;
  v_created_order RECORD;
BEGIN
  -- 1. Validate Input Strings
  IF p_order_id IS NULL OR TRIM(p_order_id) = '' THEN
    RAISE EXCEPTION 'Invalid order: order ID is required.';
  END IF;

  -- 2. Explicit ID Conflict Check (Zero existing order data leakage)
  IF EXISTS (SELECT 1 FROM public.foody_orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION 'Order ID % already exists. Duplicate creation rejected.', p_order_id;
  END IF;

  IF p_customer_name IS NULL OR TRIM(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Invalid order: customer name is required.';
  END IF;

  v_clean_phone := REGEXP_REPLACE(COALESCE(p_customer_phone, ''), '\D', '', 'g');
  IF LENGTH(v_clean_phone) < 10 THEN
    RAISE EXCEPTION 'Invalid order: valid 10-digit phone number is required.';
  END IF;

  -- 3. Validate Shop Status & Multi-Tenant Boundaries
  SELECT * INTO v_shop FROM public.foody_shops WHERE id = p_shop_id AND is_deleted IS NOT TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid order: target kitchen shop does not exist.';
  END IF;

  IF v_shop.is_open IS FALSE OR v_shop.is_online IS FALSE THEN
    RAISE EXCEPTION 'Kitchen is currently closed or offline. Please select an open kitchen.';
  END IF;

  -- 4. Strictly Validate Menu Items & Calculate Server-Side Subtotal (Zero Fallback Bypass)
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Invalid order: items basket cannot be empty.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_item_id := v_item->>'id';
    v_item_qty := COALESCE((v_item->>'quantity')::INT, 1);
    
    IF v_item_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid item quantity for item ID: %', v_item_id;
    END IF;

    -- Strict check: item MUST belong to target shop and be in-stock
    SELECT * INTO v_db_dish 
    FROM public.foody_menus 
    WHERE id = v_item_id 
      AND shop_id = p_shop_id 
      AND is_available IS NOT FALSE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Security rejection: item % does not exist in kitchen % or is currently sold out.', v_item_id, p_shop_id;
    END IF;

    -- Compute subtotal using verified database price
    v_calc_subtotal := v_calc_subtotal + (v_db_dish.price * v_item_qty);
    v_final_items := v_final_items || jsonb_build_array(
      jsonb_build_object(
        'id', v_db_dish.id,
        'name', v_db_dish.name,
        'price', v_db_dish.price,
        'quantity', v_item_qty,
        'category', v_db_dish.category,
        'image', v_db_dish.image
      )
    );
  END LOOP;

  -- 5. Calculate Delivery and Total Charges from Database Shop Record
  v_calc_delivery := COALESCE(v_shop.delivery_charge, 30);
  v_calc_gst := ROUND((v_calc_subtotal * COALESCE(v_shop.gst_percentage, 0) / 100.0), 2);
  v_calc_total := v_calc_subtotal + v_calc_delivery + v_calc_gst;

  -- 6. Resolve Authenticated User ID
  v_user_id := auth.uid()::text;

  -- 7. Insert Clean Order
  INSERT INTO public.foody_orders (
    id,
    shop_id,
    user_id,
    customer_name,
    customer_phone,
    customer_address,
    delivery_address,
    items,
    subtotal,
    delivery_charge,
    gst_amount,
    total_amount,
    status,
    payment_method,
    payment_status,
    cash_status,
    cooking_notes,
    fulfillment_type,
    created_at,
    updated_at
  ) VALUES (
    p_order_id,
    p_shop_id,
    v_user_id,
    TRIM(p_customer_name),
    v_clean_phone,
    COALESCE(p_customer_address, p_delivery_address, 'Vrindavan Dham'),
    COALESCE(p_delivery_address, p_customer_address, 'Vrindavan Dham'),
    v_final_items,
    v_calc_subtotal,
    v_calc_delivery,
    v_calc_gst,
    v_calc_total,
    'placed',
    COALESCE(p_payment_method, 'cod'),
    'pending',
    'pending',
    COALESCE(p_cooking_notes, ''),
    COALESCE(p_fulfillment_type, 'delivery'),
    NOW(),
    NOW()
  )
  RETURNING * INTO v_created_order;

  -- Return Least-Privilege minimal sanitized frontend payload
  RETURN jsonb_build_object(
    'id', v_created_order.id,
    'shop_id', v_created_order.shop_id,
    'status', v_created_order.status,
    'subtotal', v_created_order.subtotal,
    'delivery_charge', v_created_order.delivery_charge,
    'gst_amount', v_created_order.gst_amount,
    'total_amount', v_created_order.total_amount,
    'payment_method', v_created_order.payment_method,
    'payment_status', v_created_order.payment_status,
    'created_at', v_created_order.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_validated_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- =====================================================================
-- STEP 5: STATE-CONTROLLED ORDER TRANSITION RPCs (No Direct Table UPDATE)
-- =====================================================================

DROP FUNCTION IF EXISTS public.transition_order_status(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.transition_order_status(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.transition_order_status(TEXT);

-- 5.1 Controlled State Transitions (Kitchen Staff & Rider Lifecycle)
CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_order_id TEXT,
  p_target_status TEXT,
  p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order RECORD;
  v_caller_role TEXT;
  v_caller_shop_ids TEXT[];
  v_caller_id TEXT;
  v_is_admin BOOLEAN;
BEGIN
  v_caller_id := auth.uid()::text;
  v_is_admin := public.is_platform_admin();
  v_caller_shop_ids := public.get_auth_shop_ids();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required.';
  END IF;

  SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Enforce Allowed State Transition Graph
  CASE v_order.status
    WHEN 'placed' THEN
      IF p_target_status NOT IN ('accepted', 'rejected', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: placed order can only be moved to accepted, rejected, or cancelled.';
      END IF;
    WHEN 'accepted' THEN
      IF p_target_status NOT IN ('preparing', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: accepted order can only be moved to preparing or cancelled.';
      END IF;
    WHEN 'preparing' THEN
      IF p_target_status NOT IN ('ready_for_pickup', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: preparing order can only be moved to ready_for_pickup or cancelled.';
      END IF;
    WHEN 'ready_for_pickup' THEN
      IF p_target_status NOT IN ('out_for_delivery', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: ready order can only be moved to out_for_delivery or cancelled.';
      END IF;
    WHEN 'out_for_delivery' THEN
      IF p_target_status NOT IN ('delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: out_for_delivery order can only be moved to delivered.';
      END IF;
    WHEN 'delivered' THEN
      RAISE EXCEPTION 'Order is already delivered and finalized.';
    WHEN 'cancelled' THEN
      RAISE EXCEPTION 'Order is cancelled and cannot be transitioned.';
    ELSE
      NULL;
  END CASE;

  -- ============================================================
  -- STRICT AUTHORIZATION FOR EVERY STATE TRANSITION
  -- ============================================================
  IF NOT v_is_admin THEN

    -- Kitchen-controlled states
    IF p_target_status IN (
      'accepted',
      'preparing',
      'ready_for_pickup',
      'rejected'
    ) THEN

      IF NOT (v_order.shop_id = ANY(v_caller_shop_ids)) THEN
        RAISE EXCEPTION
          'Unauthorized: only kitchen staff assigned to this shop can perform this transition.';
      END IF;

    -- Delivery-controlled states
    ELSIF p_target_status IN (
      'out_for_delivery',
      'delivered'
    ) THEN

      IF NOT (
        v_order.rider_id = v_caller_id
        OR v_order.shop_id = ANY(v_caller_shop_ids)
      ) THEN
        RAISE EXCEPTION
          'Unauthorized: only assigned rider or authorized shop staff can perform this transition.';
      END IF;

    -- Cancellation
    ELSIF p_target_status = 'cancelled' THEN

      -- Only the customer who owns the order, assigned rider, shop staff, or platform admin may cancel.
      IF NOT (
        v_order.user_id = v_caller_id
        OR v_order.rider_id = v_caller_id
        OR v_order.shop_id = ANY(v_caller_shop_ids)
      ) THEN
        RAISE EXCEPTION
          'Unauthorized: you cannot cancel this order.';
      END IF;

    ELSE
      RAISE EXCEPTION
        'Unauthorized: unsupported order transition.';
    END IF;

  END IF;

  -- Apply Update Atomically
  UPDATE public.foody_orders SET
    status = p_target_status,
    cooking_notes = CASE WHEN p_notes != '' THEN p_notes ELSE cooking_notes END,
    payment_status = CASE WHEN p_target_status = 'delivered' AND payment_method = 'cod' THEN 'paid' ELSE payment_status END,
    cash_status = CASE WHEN p_target_status = 'delivered' AND payment_method = 'cod' THEN 'collected' ELSE cash_status END,
    delivered_at = CASE WHEN p_target_status = 'delivered' THEN NOW() ELSE delivered_at END,
    picked_up_at = CASE WHEN p_target_status = 'out_for_delivery' THEN NOW() ELSE picked_up_at END,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', p_target_status);
END;
$$;

DROP FUNCTION IF EXISTS public.assign_order_rider(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.assign_order_rider(TEXT, TEXT);

-- 5.2 Controlled Rider Assignment RPC (Strict Shop-Authorized Staff Only)
CREATE OR REPLACE FUNCTION public.assign_order_rider(
  p_order_id TEXT,
  p_rider_id TEXT,
  p_rider_name TEXT,
  p_rider_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order RECORD;
  v_caller_id TEXT;
  v_caller_role TEXT;
  v_caller_shop_ids TEXT[];
  v_is_admin BOOLEAN;
BEGIN
  v_caller_id := auth.uid()::text;
  v_caller_role := public.get_auth_role();
  v_caller_shop_ids := public.get_auth_shop_ids();
  v_is_admin := public.is_platform_admin();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required.';
  END IF;

  SELECT *
  INTO v_order
  FROM public.foody_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Only platform admins or staff assigned to this shop may assign riders.
  IF NOT v_is_admin
     AND NOT (v_order.shop_id = ANY(v_caller_shop_ids)) THEN
    RAISE EXCEPTION
      'Unauthorized: only authorized shop staff can assign riders.';
  END IF;

  -- Prevent arbitrary rider impersonation.
  IF p_rider_id IS NULL OR TRIM(p_rider_id) = '' THEN
    RAISE EXCEPTION 'Invalid rider ID.';
  END IF;

  -- Rider must actually exist, be active, and have rider role.
  IF NOT EXISTS (
    SELECT 1
    FROM public.foody_logged_users u
    WHERE u.id = p_rider_id
      AND u.is_active = true
      AND u.role = 'rider'
      AND u.shop_id = v_order.shop_id
  ) AND NOT v_is_admin THEN
    RAISE EXCEPTION
      'Unauthorized: rider is not an active rider assigned to this shop.';
  END IF;

  UPDATE public.foody_orders
  SET
    rider_id = p_rider_id,
    rider_name = p_rider_name,
    rider_phone = p_rider_phone,
    status = CASE
      WHEN status = 'ready_for_pickup'
      THEN 'out_for_delivery'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'rider_id', p_rider_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_order_status(TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_order_rider(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- Orders RLS Policies (Read own/shop orders; Direct INSERT/UPDATE revoked)
ALTER TABLE public.foody_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer place orders" ON public.foody_orders;
DROP POLICY IF EXISTS "View own or shop orders" ON public.foody_orders;
DROP POLICY IF EXISTS "Staff update orders" ON public.foody_orders;

CREATE POLICY "View own or shop orders"
  ON public.foody_orders FOR SELECT
  TO anon, authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid()::text)
    OR (shop_id = ANY (public.get_auth_shop_ids()))
    OR (rider_id IS NOT NULL AND rider_id = auth.uid()::text)
    OR public.is_platform_admin()
  );

-- =====================================================================
-- STEP 6: PII-SAFE GUEST ORDER TRACKING RPC
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_guest_order_tracking(
  p_order_id TEXT, 
  p_customer_phone TEXT
)
RETURNS TABLE (
  id TEXT,
  shop_id TEXT,
  items JSONB,
  total_amount NUMERIC,
  status TEXT,
  payment_method TEXT,
  payment_status TEXT,
  rider_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clean_search_phone TEXT;
BEGIN
  IF p_customer_phone IS NULL OR TRIM(p_customer_phone) = '' THEN
    RAISE EXCEPTION 'Phone verification is required to track guest orders.';
  END IF;

  v_clean_search_phone := RIGHT(REGEXP_REPLACE(p_customer_phone, '\D', '', 'g'), 10);
  IF LENGTH(v_clean_search_phone) < 10 THEN
    RAISE EXCEPTION 'Invalid phone number: 10-digit number required for verification.';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.shop_id,
    o.items,
    o.total_amount,
    o.status,
    o.payment_method,
    o.payment_status,
    o.rider_name,
    o.created_at,
    o.updated_at
  FROM public.foody_orders o
  WHERE o.id = p_order_id
    AND RIGHT(REGEXP_REPLACE(o.customer_phone, '\D', '', 'g'), 10) = v_clean_search_phone
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_order_tracking(TEXT, TEXT) TO anon, authenticated, service_role;

-- =====================================================================
-- STEP 7: VERIFIED DELIVERED-ORDER REVIEW SUBMISSION RPC & CONCURRENCY GUARD
-- =====================================================================

-- Enforce strict database-level unique constraint to prevent race condition duplicates
CREATE UNIQUE INDEX IF NOT EXISTS ux_foody_reviews_order_id ON public.foody_reviews(order_id);

DROP FUNCTION IF EXISTS public.submit_verified_review(TEXT, INT, TEXT, TEXT, JSONB, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.submit_verified_review(TEXT, INT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.submit_verified_review(TEXT, INT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.submit_verified_review(TEXT, INT, TEXT);

CREATE OR REPLACE FUNCTION public.submit_verified_review(
  p_order_id TEXT,
  p_rating INT,
  p_comment TEXT DEFAULT '',
  p_customer_phone TEXT DEFAULT NULL,
  p_tags JSONB DEFAULT '[]'::JSONB,
  p_chef_feedback JSONB DEFAULT '{}'::JSONB,
  p_rider_feedback JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order RECORD;
  v_clean_phone TEXT;
  v_caller_user_id TEXT;
  v_created_review RECORD;
BEGIN
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5 stars.';
  END IF;

  SELECT * INTO v_order FROM public.foody_orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found. Reviews can only be submitted for verified orders.';
  END IF;

  IF v_order.status NOT IN ('delivered', 'completed') THEN
    RAISE EXCEPTION 'Reviews can only be submitted after your order has been delivered.';
  END IF;

  v_caller_user_id := auth.uid()::text;
  IF v_caller_user_id IS NOT NULL AND v_order.user_id IS NOT NULL THEN
    IF v_caller_user_id != v_order.user_id AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Unauthorized: You can only review orders placed from your own account.';
    END IF;
  ELSIF p_customer_phone IS NOT NULL THEN
    v_clean_phone := RIGHT(REGEXP_REPLACE(p_customer_phone, '\D', '', 'g'), 10);
    IF v_clean_phone != RIGHT(REGEXP_REPLACE(v_order.customer_phone, '\D', '', 'g'), 10) AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Phone verification failed: phone does not match order record.';
    END IF;
  ELSE
    IF NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Review submission requires customer identity verification.';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.foody_reviews WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'A review has already been submitted for this order.';
  END IF;

  INSERT INTO public.foody_reviews (
    order_id,
    shop_id,
    customer_name,
    rating,
    tags,
    comment,
    chef_feedback,
    rider_feedback,
    created_at
  ) VALUES (
    v_order.id,
    v_order.shop_id,
    v_order.customer_name,
    p_rating,
    COALESCE(p_tags, '[]'::JSONB),
    COALESCE(p_comment, ''),
    COALESCE(p_chef_feedback, '{}'::JSONB),
    COALESCE(p_rider_feedback, '{}'::JSONB),
    NOW()
  )
  RETURNING * INTO v_created_review;

  RETURN to_jsonb(v_created_review);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_verified_review(TEXT, INT, TEXT, TEXT, JSONB, JSONB, JSONB) TO anon, authenticated, service_role;

-- =====================================================================
-- STEP 8: NOTIFICATIONS RLS (foody_notifications)
-- =====================================================================
ALTER TABLE public.foody_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access notifications" ON public.foody_notifications;
DROP POLICY IF EXISTS "User view own notifications" ON public.foody_notifications;
DROP POLICY IF EXISTS "User update own notifications" ON public.foody_notifications;
DROP POLICY IF EXISTS "Admins insert notifications" ON public.foody_notifications;

CREATE POLICY "User view own notifications"
  ON public.foody_notifications FOR SELECT
  TO anon, authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid()::text)
    OR (shop_id IS NOT NULL AND shop_id = ANY (public.get_auth_shop_ids()))
    OR public.is_platform_admin()
  );

CREATE POLICY "User update own notifications"
  ON public.foody_notifications FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()::text
    OR public.is_platform_admin()
  )
  WITH CHECK (
    user_id = auth.uid()::text
    OR public.is_platform_admin()
  );

CREATE POLICY "Admins insert notifications"
  ON public.foody_notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

-- =====================================================================
-- STEP 9: CASH SETTLEMENTS RLS (foody_cash_settlements)
-- =====================================================================
ALTER TABLE public.foody_cash_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access cash settlements" ON public.foody_cash_settlements;
DROP POLICY IF EXISTS "View cash settlements" ON public.foody_cash_settlements;
DROP POLICY IF EXISTS "Record cash settlements" ON public.foody_cash_settlements;
DROP POLICY IF EXISTS "Shop owner verify settlements" ON public.foody_cash_settlements;

CREATE POLICY "View cash settlements"
  ON public.foody_cash_settlements FOR SELECT
  TO anon, authenticated
  USING (
    (rider_id IS NOT NULL AND rider_id = auth.uid()::text)
    OR (shop_id = ANY (public.get_auth_shop_ids()))
    OR public.is_platform_admin()
  );

CREATE POLICY "Record cash settlements"
  ON public.foody_cash_settlements FOR INSERT
  TO authenticated
  WITH CHECK (
    rider_id = auth.uid()::text
    OR (shop_id = ANY (public.get_auth_shop_ids()))
    OR public.is_platform_admin()
  );

CREATE POLICY "Shop owner verify settlements"
  ON public.foody_cash_settlements FOR UPDATE
  TO authenticated
  USING (
    (shop_id = ANY (public.get_auth_shop_ids()))
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (shop_id = ANY (public.get_auth_shop_ids()))
    OR public.is_platform_admin()
  );

-- =====================================================================
-- STEP 10: REVIEWS READ & MODERATION RLS (foody_reviews)
-- =====================================================================
ALTER TABLE public.foody_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access reviews" ON public.foody_reviews;
DROP POLICY IF EXISTS "Public read reviews" ON public.foody_reviews;
DROP POLICY IF EXISTS "Admins moderate reviews" ON public.foody_reviews;

CREATE POLICY "Public read reviews"
  ON public.foody_reviews FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins moderate reviews"
  ON public.foody_reviews FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- =====================================================================
-- STEP 11: CATALOG RLS (foody_shops, foody_menus, foody_presets, foody_offers)
-- =====================================================================
ALTER TABLE public.foody_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foody_offers ENABLE ROW LEVEL SECURITY;

-- Shops
DROP POLICY IF EXISTS "Public access shops" ON public.foody_shops;
DROP POLICY IF EXISTS "Public read active shops" ON public.foody_shops;
DROP POLICY IF EXISTS "Shop owners update own shop" ON public.foody_shops;
DROP POLICY IF EXISTS "Admins insert delete shops" ON public.foody_shops;

CREATE POLICY "Public read active shops"
  ON public.foody_shops FOR SELECT
  TO anon, authenticated
  USING (is_deleted IS NOT TRUE);

CREATE POLICY "Shop owners update own shop"
  ON public.foody_shops FOR UPDATE
  TO authenticated
  USING (
    id = ANY (public.get_auth_shop_ids())
    OR public.is_platform_admin()
  )
  WITH CHECK (
    id = ANY (public.get_auth_shop_ids())
    OR public.is_platform_admin()
  );

CREATE POLICY "Admins insert delete shops"
  ON public.foody_shops FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Menus
DROP POLICY IF EXISTS "Public access menus" ON public.foody_menus;
DROP POLICY IF EXISTS "Public read menus" ON public.foody_menus;
DROP POLICY IF EXISTS "Kitchen staff manage menu" ON public.foody_menus;

CREATE POLICY "Public read menus"
  ON public.foody_menus FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Kitchen staff manage menu"
  ON public.foody_menus FOR ALL
  TO authenticated
  USING (
    shop_id = ANY (public.get_auth_shop_ids())
    OR public.is_platform_admin()
  )
  WITH CHECK (
    shop_id = ANY (public.get_auth_shop_ids())
    OR public.is_platform_admin()
  );

-- Presets
DROP POLICY IF EXISTS "Public access presets" ON public.foody_presets;
DROP POLICY IF EXISTS "Public read active presets" ON public.foody_presets;
DROP POLICY IF EXISTS "Platform admins manage presets" ON public.foody_presets;

CREATE POLICY "Public read active presets"
  ON public.foody_presets FOR SELECT
  TO anon, authenticated
  USING (is_active IS NOT FALSE);

CREATE POLICY "Platform admins manage presets"
  ON public.foody_presets FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Offers
DROP POLICY IF EXISTS "Public access offers" ON public.foody_offers;
DROP POLICY IF EXISTS "Public read active offers" ON public.foody_offers;
DROP POLICY IF EXISTS "Platform admins manage offers" ON public.foody_offers;

CREATE POLICY "Public read active offers"
  ON public.foody_offers FOR SELECT
  TO anon, authenticated
  USING (is_active IS NOT FALSE);

CREATE POLICY "Platform admins manage offers"
  ON public.foody_offers FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- =====================================================================
-- STEP 12: REALTIME REPLICATION (Selective & Safe)
-- =====================================================================
ALTER TABLE public.foody_shops REPLICA IDENTITY DEFAULT;
ALTER TABLE public.foody_menus REPLICA IDENTITY DEFAULT;
ALTER TABLE public.foody_presets REPLICA IDENTITY DEFAULT;
ALTER TABLE public.foody_offers REPLICA IDENTITY DEFAULT;
ALTER TABLE public.foody_orders REPLICA IDENTITY DEFAULT;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_shops; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_menus; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_presets; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_offers; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.foody_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
