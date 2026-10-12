-- ====================================================================
-- FOODY VRINDA — V5.3.11: SCHEDULE-DRIVEN KITCHEN HOURS & TOGGLE RPC
-- 
-- 1. Evaluates shop status dynamically according to operating schedule in IST
--    (08:00 AM to 10:30 PM). Between open hours = OPEN, after 10:30 PM = CLOSED.
-- 2. Creates Security Definer toggle_shop_status() RPC for manual overrides.
-- ====================================================================

-- 1. Sync Radha Rani Fast Food status according to its IST operating hours
UPDATE public.foody_shops
SET
    is_open = (
        (NOW() AT TIME ZONE 'Asia/Kolkata')::time >= COALESCE(NULLIF(operating_hours->>'openTime', '')::time, '08:00'::time)
        AND
        (NOW() AT TIME ZONE 'Asia/Kolkata')::time <= COALESCE(NULLIF(operating_hours->>'closeTime', '')::time, '22:30'::time)
    ),
    is_online = (
        (NOW() AT TIME ZONE 'Asia/Kolkata')::time >= COALESCE(NULLIF(operating_hours->>'openTime', '')::time, '08:00'::time)
        AND
        (NOW() AT TIME ZONE 'Asia/Kolkata')::time <= COALESCE(NULLIF(operating_hours->>'closeTime', '')::time, '22:30'::time)
    ),
    is_active = true,
    is_deleted = false,
    updated_at = NOW()
WHERE id = 'shop-radha-rani-fast-food--xpvs';

-- Also ensure other active kitchens match their operating schedule
UPDATE public.foody_shops
SET
    is_open = (
        (NOW() AT TIME ZONE 'Asia/Kolkata')::time >= COALESCE(NULLIF(operating_hours->>'openTime', '')::time, '08:00'::time)
        AND
        (NOW() AT TIME ZONE 'Asia/Kolkata')::time <= COALESCE(NULLIF(operating_hours->>'closeTime', '')::time, '22:30'::time)
    ),
    is_online = (
        (NOW() AT TIME ZONE 'Asia/Kolkata')::time >= COALESCE(NULLIF(operating_hours->>'openTime', '')::time, '08:00'::time)
        AND
        (NOW() AT TIME ZONE 'Asia/Kolkata')::time <= COALESCE(NULLIF(operating_hours->>'closeTime', '')::time, '22:30'::time)
    ),
    updated_at = NOW()
WHERE is_deleted IS NOT TRUE AND is_active IS TRUE;

-- 2. Create Security Definer RPC for manual online/offline override
CREATE OR REPLACE FUNCTION public.toggle_shop_status(
    p_shop_id TEXT,
    p_is_open BOOLEAN DEFAULT true,
    p_is_online BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_updated RECORD;
BEGIN
    UPDATE public.foody_shops
    SET
        is_open = p_is_open,
        is_online = p_is_online,
        updated_at = NOW()
    WHERE id = p_shop_id
    RETURNING * INTO v_updated;

    IF v_updated IS NULL THEN
        RAISE EXCEPTION 'Shop % not found', p_shop_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_updated.id,
        'is_open', v_updated.is_open,
        'is_online', v_updated.is_online
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_shop_status(TEXT, BOOLEAN, BOOLEAN) TO anon, authenticated, service_role;
GRANT UPDATE (is_open, is_online, updated_at) ON public.foody_shops TO anon, authenticated;
