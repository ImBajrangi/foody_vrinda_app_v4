-- ========================================================================
-- FOODY VRINDA: MIGRATION 20261104000003
-- FIX SAHI PANEER IMAGE URL (REPLACE BROKEN HASH WITH VERIFIED ASSET)
-- ========================================================================

UPDATE public.foody_menus
SET 
  image = 'https://i.postimg.cc/pd6bm2TQ/Creamy-Paneer-Curry-Bowl.png',
  updated_at = NOW()
WHERE 
  id = 'menu-brb-sahi-paneer' 
  OR LOWER(name) LIKE '%sahi paneer%' 
  OR LOWER(name) LIKE '%shahi paneer%';

