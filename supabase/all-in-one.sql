-- =====================================================
-- ไฟล์นี้รวม migration + seed ทั้งหมด รันครั้งเดียวจบ
-- Copy ทั้งหมดไปวางใน Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: MIGRATION (สร้าง tables)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLES
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number TEXT NOT NULL UNIQUE,
  qr_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tables_qr_token ON public.tables(qr_token);

-- MENU CATEGORIES
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'preparing', 'served', 'cancelled')),
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_table ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  note TEXT,
  subtotal NUMERIC(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- TRIGGER
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- REALTIME (safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  END IF;
END $$;

-- RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read tables" ON public.tables;
DROP POLICY IF EXISTS "Allow public write tables" ON public.tables;
DROP POLICY IF EXISTS "Allow public read menu_categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow public write menu_categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow public read menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow public write menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow public read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public write orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public write order_items" ON public.order_items;

CREATE POLICY "Allow public read tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Allow public read menu_categories" ON public.menu_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Allow public read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public read order_items" ON public.order_items FOR SELECT USING (true);

CREATE POLICY "Allow public write tables" ON public.tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write menu_categories" ON public.menu_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write menu_items" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- PART 2: SEED (ใส่ข้อมูลตัวอย่าง)
-- =====================================================

-- หมวดเมนู
INSERT INTO public.menu_categories (name, display_order) VALUES
  ('อาหารจานเดียว', 1),
  ('ก๋วยเตี๋ยว', 2),
  ('เครื่องดื่ม', 3),
  ('ของหวาน', 4)
ON CONFLICT DO NOTHING;

-- เมนู
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

-- โต๊ะ
INSERT INTO public.tables (table_number, qr_token) VALUES
  ('T01', 't01-demo-aaaa'),
  ('T02', 't02-demo-bbbb'),
  ('T03', 't03-demo-cccc'),
  ('T04', 't04-demo-dddd')
ON CONFLICT DO NOTHING;

-- เสร็จแล้ว! ดูผลได้ที่ Table Editor
