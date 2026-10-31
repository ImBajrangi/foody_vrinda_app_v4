-- ========================================================================
-- FOODY VRINDA: SHOP SELF-DELIVERY RPC & PERMISSIONS MIGRATION
-- Migration Version: 10
-- ========================================================================

-- 1. Ensure columns exist on foody_shops
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS self_delivery BOOLEAN DEFAULT FALSE;
ALTER TABLE public.foody_shops ADD COLUMN IF NOT EXISTS can_deliver BOOLEAN DEFAULT FALSE;

-- 2. Grant table update permissions to authenticated and anon
GRANT UPDATE ON public.foody_shops TO authenticated, anon;

-- 3. Idempotent RLS policy for shop updates
DROP POLICY IF EXISTS "Allow staff and owners to update foody_shops" ON public.foody_shops;
CREATE POLICY "Allow staff and owners to update foody_shops"
    ON public.foody_shops FOR UPDATE
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 4. Atomic SECURITY DEFINER RPC to toggle self-delivery
CREATE OR REPLACE FUNCTION public.toggle_shop_self_delivery(
    p_shop_id TEXT,
    p_self_delivery BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated public.foody_shops%ROWTYPE;
BEGIN
    UPDATE public.foody_shops
    SET 
        self_delivery = p_self_delivery,
        can_deliver = p_self_delivery,
        updated_at = NOW()
    WHERE id = p_shop_id
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Shop "%" does not exist.', p_shop_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'shop_id', v_updated.id,
        'self_delivery', v_updated.self_delivery,
        'can_deliver', v_updated.can_deliver
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_shop_self_delivery(TEXT, BOOLEAN) TO authenticated, anon, service_role;

-- 5. Upgrade toggle_shop_status to support self-delivery optionally
CREATE OR REPLACE FUNCTION public.toggle_shop_status(
    p_shop_id TEXT,
    p_is_open BOOLEAN DEFAULT NULL,
    p_is_online BOOLEAN DEFAULT NULL,
    p_self_delivery BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated public.foody_shops%ROWTYPE;
BEGIN
    UPDATE public.foody_shops
    SET 
        is_open = COALESCE(p_is_open, is_open),
        is_online = COALESCE(p_is_online, is_online),
        self_delivery = COALESCE(p_self_delivery, self_delivery),
        can_deliver = COALESCE(p_self_delivery, can_deliver),
        updated_at = NOW()
    WHERE id = p_shop_id
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Shop "%" does not exist.', p_shop_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_updated.id,
        'is_open', v_updated.is_open,
        'is_online', v_updated.is_online,
        'self_delivery', v_updated.self_delivery,
        'can_deliver', v_updated.can_deliver
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_shop_status(TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';

