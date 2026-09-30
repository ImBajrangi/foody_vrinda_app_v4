-- ========================================================================
-- FOODY VRINDA v5.3.5 — SEED PRODUCTION MENUS FOR ALL 3 KITCHENS
-- Seeds sacred Satvik prasad menus for Vrinda Main, Prem Mandir & Banke Bihari
-- ========================================================================

INSERT INTO public.foody_menus (
    id, shop_id, name, subtitle, description, category, price, image, tag, kcal, nutrition, is_available, is_deleted
) VALUES
-- 1. Vrinda Cloud Kitchen (Main)
('dish-v1', 'shop-vrinda-main', 'Cheese With Satvik Burger', 'Cheesy satvik artisanal burger', 'Fresh baked artisanal whole wheat bun filled with pure paneer patty, garden crisp lettuce, heirloom tomatoes, and creamy satvik herbal cheese.', 'Snacks', 140, '/dishes/burger.png', 'Popular Choice', '260 kcal', '{"carbs": "32g", "fat": "11g", "protein": "14g", "kcal": "260 kcal"}'::jsonb, true, false),
('dish-v2', 'shop-vrinda-main', 'Royal Vedic Thali', 'Complete nutritional Satvik platter', 'Steaming aromatic Govind Bhog rice, 4 whole wheat phulkas, Dal Makhani with desi ghee, Paneer Butter Masala, seasonal Subzi, sweet Gulab Jamun, and crisp Papad.', 'Meals', 220, '/dishes/thali.png', 'Devotee Favorite', '480 kcal', '{"carbs": "68g", "fat": "16g", "protein": "22g", "kcal": "480 kcal"}'::jsonb, true, false),
('dish-v3', 'shop-vrinda-main', 'Kesariya Rabdi Kheer', 'Slow simmered thickened milk dessert', 'Rich Govind Bhog rice kheer infused with pure Kashmiri saffron, crushed green cardamom, roasted almond slivers, pistachios, and pure chironji.', 'Sweets & Prasad', 120, '/dishes/sweet.png', 'Sacred Prasad', '210 kcal', '{"carbs": "28g", "fat": "9g", "protein": "7g", "kcal": "210 kcal"}'::jsonb, true, false),
('dish-v4', 'shop-vrinda-main', 'Paneer Satvik Pizza (10")', 'Crispy thin crust with desi herbs', 'Hand-tossed thin crust with fresh tomato basil coulis, diced fresh Malai paneer, bell peppers, sweet corn, and mozzarella cheese.', 'Snacks', 240, '/dishes/pizza.png', 'Chef Special', '340 kcal', '{"carbs": "42g", "fat": "14g", "protein": "18g", "kcal": "340 kcal"}'::jsonb, true, false),
('dish-v5', 'shop-vrinda-main', 'Vrindavan Special Matka Lassi', 'Chilled sweet creamy curd', 'Traditional earthen pot churned sweet creamy curd garnished with thick malai rabdi layer, pistachios, and saffron strands.', 'Beverages', 80, '/dishes/sweet.png', 'Refreshing', '160 kcal', '{"carbs": "24g", "fat": "6g", "protein": "8g", "kcal": "160 kcal"}'::jsonb, true, false),

-- 2. Prem Mandir Prasad Kitchen
('dish-p1', 'shop-prem-mandir', 'Prem Mandir Makhan Malai', 'Fluffy divine frothy sweet prasad', 'Heavenly light, cloud-like churned sweet cream infused with kesar, pistachios, and silver vark prepared in traditional Braj tradition.', 'Sweets & Prasad', 150, '/dishes/sweet.png', 'Mandir Special', '190 kcal', '{"carbs": "22g", "fat": "12g", "protein": "5g", "kcal": "190 kcal"}'::jsonb, true, false),
('dish-p2', 'shop-prem-mandir', 'Brijwasi Special Khichdi', 'Pure Desi Ghee Moong Dal Khichdi', 'Fragrant Govind Bhog rice and split green gram simmered with whole spices, topped with generous golden A2 cow desi ghee and roasted cumin.', 'Meals', 160, '/dishes/thali.png', 'Light & Pure', '320 kcal', '{"carbs": "52g", "fat": "9g", "protein": "12g", "kcal": "320 kcal"}'::jsonb, true, false),
('dish-p3', 'shop-prem-mandir', 'Pure Ghee Poori Sabzi (4 pcs)', 'Crisp golden pooris with hing aloo', 'Four hot puffed whole wheat pooris fried in pure ghee, served with tangy Mathura-style spiced potato curry and sweet pumpkin subzi.', 'Meals', 180, '/dishes/thali.png', 'Temple Classic', '420 kcal', '{"carbs": "58g", "fat": "18g", "protein": "8g", "kcal": "420 kcal"}'::jsonb, true, false),
('dish-p4', 'shop-prem-mandir', 'Shahi Kesar Pedha Box (250g)', 'Traditional slow-caramelized mawa', 'Authentic dark roasted mawa pedha rolled in fine bura sugar and cardamom, direct from sacred Braj confectioners.', 'Sweets & Prasad', 180, '/dishes/sweet.png', 'Gift Pack', '380 kcal', '{"carbs": "55g", "fat": "14g", "protein": "9g", "kcal": "380 kcal"}'::jsonb, true, false),

-- 3. Shri Banke Bihari Dham Kitchen
('dish-b1', 'shop-banke-bihari', 'Banke Bihari Mathura Peda (250g)', 'Sacred temple bhog peda', 'Celebrated caramel-brown Mathura peda crafted from fresh khoya, raw cane sugar, and freshly crushed cardamom seeds.', 'Sweets & Prasad', 190, '/dishes/sweet.png', 'Bihari Ji Prasad', '390 kcal', '{"carbs": "58g", "fat": "15g", "protein": "10g", "kcal": "390 kcal"}'::jsonb, true, false),
('dish-b2', 'shop-banke-bihari', 'Chhapan Bhog Thali', 'Grand festival feast platter', 'Luxurious spread featuring 2 paneer delicacies, dal baati churma, 4 desi ghee rotis, pulav, 2 sweets, raita, and fresh salad.', 'Meals', 350, '/dishes/thali.png', 'Royal Feast', '620 kcal', '{"carbs": "85g", "fat": "24g", "protein": "26g", "kcal": "620 kcal"}'::jsonb, true, false),
('dish-b3', 'shop-banke-bihari', 'Bedmi Poori with Aloo Jhol', 'Crispy urad dal stuffed pooris', 'Three thick crispy urad dal pooris served with spicy slow-cooked Vrindavan aloo rasdaar sabzi and methi chutney.', 'Meals', 160, '/dishes/thali.png', 'Morning Special', '380 kcal', '{"carbs": "54g", "fat": "15g", "protein": "9g", "kcal": "380 kcal"}'::jsonb, true, false),
('dish-b4', 'shop-banke-bihari', 'Kesariya Malai Lassi Special', 'Thick creamy saffron yogurt beverage', 'Rich hand-churned buffalo curd sweetened and blended with kesar syrup, topped with thick clotted cream and crushed cashews.', 'Beverages', 90, '/dishes/sweet.png', 'Best Seller', '180 kcal', '{"carbs": "26g", "fat": "8g", "protein": "7g", "kcal": "180 kcal"}'::jsonb, true, false)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    image = EXCLUDED.image,
    tag = EXCLUDED.tag,
    kcal = EXCLUDED.kcal,
    nutrition = EXCLUDED.nutrition,
    is_available = true,
    is_deleted = false,
    category = EXCLUDED.category;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
