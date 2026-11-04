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
  image = 'https://i.postimg.cc/pd6bm2TQ/Creamy-Paneer-Curry-Bowl.png',
  updated_at = NOW()
WHERE 
  id = 'menu-brb-sahi-paneer'
  OR (LOWER(name) LIKE '%sahi paneer%' OR LOWER(name) LIKE '%shahi paneer%');

