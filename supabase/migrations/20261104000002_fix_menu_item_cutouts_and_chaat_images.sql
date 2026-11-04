-- ========================================================================
-- FOODY VRINDA: MIGRATION 20261104000002
-- FIX MENU ITEM CUTOUTS & ALOO CHAAT IMAGES
-- ========================================================================

-- 1. Correct Aloo Chat image in Vishnu Fast Food and any other branches
UPDATE public.foody_menus
SET 
  image = 'https://i.postimg.cc/B6Lwwp2w/Vibrant-Garnished-Potato-Chaat-Bowl.png',
  updated_at = NOW()
WHERE 
  id = 'menu-vff-aloo-chat' 
  OR LOWER(name) LIKE '%aloo chat%' 
  OR LOWER(name) LIKE '%aalu chat%';

-- 2. Upgrade Sahi Paneer / Shahi Paneer to authentic creamy paneer curry cutout
UPDATE public.foody_menus
SET 
  image = 'https://i.postimg.cc/k47Z6tQ4/Creamy-Shahi-Paneer-Curry-Bowl.png',
  updated_at = NOW()
WHERE 
  (LOWER(name) LIKE '%sahi paneer%' OR LOWER(name) LIKE '%shahi paneer%') 
  AND (image IS NULL OR image LIKE '%curry.webp' OR image LIKE '%curry.png');

