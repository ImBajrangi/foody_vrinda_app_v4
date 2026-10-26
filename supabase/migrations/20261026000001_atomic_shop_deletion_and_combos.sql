-- ========================================================================
-- ATOMIC SHOP DELETION & CATALOG ISOLATION RPC
-- Ensures menus belonging to a deleted shop are permanently removed
-- and NEVER reassigned or leaked to another shop or default shop.
-- ========================================================================

CREATE OR REPLACE FUNCTION public.delete_shop_and_cascade_menus(target_shop_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_menus INT := 0;
    v_shop_deleted BOOLEAN := false;
BEGIN
    IF target_shop_id IS NULL OR TRIM(target_shop_id) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid shop ID');
    END IF;

    -- 1. Permanently delete all menus belonging to this specific shop
    DELETE FROM public.foody_menus
    WHERE shop_id = target_shop_id;
    GET DIAGNOSTICS v_deleted_menus = ROW_COUNT;

    -- 2. Detach any staff or delivery members assigned to this shop
    UPDATE public.foody_logged_users
    SET shop_id = NULL, shop_ids = '[]'::jsonb
    WHERE shop_id = target_shop_id;

    UPDATE public.foody_users
    SET shop_id = NULL, shop_ids = '[]'::jsonb
    WHERE shop_id = target_shop_id;

    -- 3. Attempt hard delete of shop, or soft delete if historical orders reference it
    BEGIN
        DELETE FROM public.foody_shops
        WHERE id = target_shop_id;
        v_shop_deleted := true;
    EXCEPTION WHEN foreign_key_violation THEN
        -- If historical orders reference the shop, safely mark as deleted & offline
        UPDATE public.foody_shops
        SET is_active = false, is_deleted = true, is_online = false, is_open = false, updated_at = NOW()
        WHERE id = target_shop_id;
        v_shop_deleted := true;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'shop_id', target_shop_id,
        'deleted_menus_count', v_deleted_menus,
        'shop_deleted', v_shop_deleted
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_shop_and_cascade_menus(TEXT) TO anon, authenticated, service_role;
