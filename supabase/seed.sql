-- =====================================================
-- Seed Data - ตัวอย่างเมนูและโต๊ะสำหรับทดสอบ
-- =====================================================

-- เพิ่มหมวดเมนู
INSERT INTO public.menu_categories (name, display_order) VALUES
  ('อาหารจานเดียว', 1),
  ('ก๋วยเตี๋ยว', 2),
  ('เครื่องดื่ม', 3),
  ('ของหวาน', 4)
ON CONFLICT DO NOTHING;

-- เพิ่มเมนู (อ้างอิง category_id จากชื่อหมวด)
INSERT INTO public.menu_items (category_id, name, description, price, image_url, display_order)
SELECT id, 'ผัดกะเพราหมูสับไข่ดาว', 'ผัดกะเพราหมูสับ เสิร์ฟพร้อมไข่ดาวและข้าวสวยร้อนๆ', 75.00, NULL, 1
FROM public.menu_categories WHERE name = 'อาหารจานเดียว';

INSERT INTO public.menu_items (category_id, name, description, price, image_url, display_order)
SELECT id, 'ข้าวผัดอเมริกัน', 'ข้าวผัดใส่ไส้กรอก แฮม ไข่ และผักรวม', 80.00, NULL, 2
FROM public.menu_categories WHERE name = 'อาหารจานเดียว';

INSERT INTO public.menu_items (category_id, name, description, price, image_url, display_order)
SELECT id, 'ก๋วยเตี๋ยวเรือ', 'ก๋วยเตี๋ยวเรือน้ำใส หมูสับ ลูกชิ้นปลา', 60.00, NULL, 1
FROM public.menu_categories WHERE name = 'ก๋วยเตี๋ยว';

INSERT INTO public.menu_items (category_id, name, description, price, image_url, display_order)
SELECT id, 'ก๋วยเตี๋ยวต้มยำ', 'ก๋วยเตี๋ยวต้มยำรสจัดจ้าน เลือกเส้นได้', 70.00, NULL, 2
FROM public.menu_categories WHERE name = 'ก๋วยเตี๋ยว';

INSERT INTO public.menu_items (category_id, name, description, price, image_url, display_order)
SELECT id, 'ชาเย็น', 'ชาไทยเย็น หวานกลางๆ', 35.00, NULL, 1
FROM public.menu_categories WHERE name = 'เครื่องดื่ม';

INSERT INTO public.menu_items (category_id, name, description, price, image_url, display_order)
SELECT id, 'กาแฟเย็น', 'กาแฟสดชงเย็น', 45.00, NULL, 2
FROM public.menu_categories WHERE name = 'เครื่องดื่ม';

INSERT INTO public.menu_items (category_id, name, description, price, image_url, display_order)
SELECT id, 'น้ำมะนาว', 'น้ำมะนาวสด ไม่ใส่น้ำตาล', 30.00, NULL, 3
FROM public.menu_categories WHERE name = 'เครื่องดื่ม';

INSERT INTO public.menu_items (category_id, name, description, price, image_url, display_order)
SELECT id, 'บัวลอย', 'บัวลอยน้ำกะทิ ท็อปด้วยไข่หอย', 40.00, NULL, 1
FROM public.menu_categories WHERE name = 'ของหวาน';

-- เพิ่มโต๊ะตัวอย่าง 4 โต๊ะ
INSERT INTO public.tables (table_number, qr_token) VALUES
  ('T01', 't01-demo-aaaa'),
  ('T02', 't02-demo-bbbb'),
  ('T03', 't03-demo-cccc'),
  ('T04', 't04-demo-dddd')
ON CONFLICT DO NOTHING;
