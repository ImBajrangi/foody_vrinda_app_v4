-- ========================================================================
-- FOODY VRINDA: PRODUCTION MIGRATION 20261104000001
-- FIX PHONE AUTHENTICATION, RPC LOOKUP & SHOP ASSIGNMENT RULES
-- ========================================================================

-- 1. Create secure server-side phone profile resolver function
CREATE OR REPLACE FUNCTION public.lookup_phone_user_profile(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_phone TEXT;
  v_user RECORD;
  v_shop_id TEXT;
BEGIN
  -- Normalize to clean 10-digit mobile number
  v_clean_phone := RIGHT(REGEXP_REPLACE(COALESCE(p_phone, ''), '\D', '', 'g'), 10);
  IF length(v_clean_phone) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid 10-digit phone number format');
  END IF;

  -- Search in public.foody_logged_users first (most up-to-date active session store)
  SELECT 
    id, display_name, email, phone, avatar_url, address, role, shop_id, shop_ids, dev_permissions, is_active, delivery_status, delivery_type
  INTO v_user
  FROM public.foody_logged_users
  WHERE 
    phone = v_clean_phone 
    OR phone = '+91' || v_clean_phone 
    OR phone = '91' || v_clean_phone
    OR phone LIKE '%' || v_clean_phone
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  -- Fallback to public.foody_users
  IF v_user.id IS NULL THEN
    SELECT 
      id, display_name, email, phone, avatar_url, address, role, shop_id, shop_ids, dev_permissions, is_active, delivery_status, delivery_type
    INTO v_user
    FROM public.foody_users
    WHERE 
      phone = v_clean_phone 
      OR phone = '+91' || v_clean_phone 
      OR phone = '91' || v_clean_phone
      OR phone LIKE '%' || v_clean_phone
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_user.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No profile found with this phone number');
  END IF;

  -- Clean shop assignment (prevent dead shop-vrinda-main)
  v_shop_id := v_user.shop_id;
  IF v_shop_id = 'shop-vrinda-main' THEN
    v_shop_id := NULL;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user.id,
      'display_name', v_user.display_name,
      'email', v_user.email,
      'phone', v_user.phone,
      'avatar_url', v_user.avatar_url,
      'address', v_user.address,
      'role', v_user.role,
      'shop_id', v_shop_id,
      'shop_ids', v_user.shop_ids,
      'dev_permissions', v_user.dev_permissions,
      'is_active', COALESCE(v_user.is_active, true),
      'delivery_status', COALESCE(v_user.delivery_status, 'approved'),
      'delivery_type', COALESCE(v_user.delivery_type, 'independent')
    )
  );
END;
$$;

-- Grant EXECUTE permission to anon, authenticated and service_role
GRANT EXECUTE ON FUNCTION public.lookup_phone_user_profile(TEXT) TO anon, authenticated, service_role;

-- 2. Clean up staff accounts with mismatched or empty shop assignments in production
-- A) Reassign Vineeta Sharma (kitchen_chef_radhe / 9634811050) to active kitchen shop-radharani-aajnokh
UPDATE public.foody_logged_users
SET 
  shop_id = 'shop-radharani-aajnokh',
  shop_ids = jsonb_build_array('shop-radharani-aajnokh'),
  role = 'kitchen',
  updated_at = NOW()
WHERE 
  id = 'fc8f36a8-ddd8-4bb1-b986-414184fc4d91' 
  OR phone LIKE '%9634811050%';

UPDATE public.foody_users
SET 
  shop_id = 'shop-radharani-aajnokh',
  shop_ids = jsonb_build_array('shop-radharani-aajnokh'),
  role = 'kitchen',
  updated_at = NOW()
WHERE 
  id = 'fc8f36a8-ddd8-4bb1-b986-414184fc4d91' 
  OR phone LIKE '%9634811050%';

-- B) Normalize shop_ids for Vishnu Fast Food staff
UPDATE public.foody_logged_users
SET 
  shop_ids = jsonb_build_array('shop-vishnu-fast-food'),
  updated_at = NOW()
WHERE 
  shop_id = 'shop-vishnu-fast-food' 
  AND (shop_ids IS NULL OR shop_ids = '[]'::jsonb);

UPDATE public.foody_users
SET 
  shop_ids = jsonb_build_array('shop-vishnu-fast-food'),
  updated_at = NOW()
WHERE 
  shop_id = 'shop-vishnu-fast-food' 
  AND (shop_ids IS NULL OR shop_ids = '[]'::jsonb);

-- C) Remove references to deactivated 'shop-vrinda-main'
UPDATE public.foody_logged_users
SET 
  shop_id = NULL,
  shop_ids = '[]'::jsonb,
  updated_at = NOW()
WHERE shop_id = 'shop-vrinda-main';

UPDATE public.foody_users
SET 
  shop_id = NULL,
  shop_ids = '[]'::jsonb,
  updated_at = NOW()
WHERE shop_id = 'shop-vrinda-main';

-- D) Alter default column constraint if shop-vrinda-main was set as default
DO $$
BEGIN
  ALTER TABLE public.foody_logged_users ALTER COLUMN shop_id DROP DEFAULT;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.foody_users ALTER COLUMN shop_id DROP DEFAULT;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

