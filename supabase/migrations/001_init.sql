-- =====================================================
-- Restaurant QR Order System - Initial Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES (โต๊ะในร้าน)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number TEXT NOT NULL UNIQUE,
  qr_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tables_qr_token ON public.tables(qr_token);

-- =====================================================
-- MENU CATEGORIES (หมวดเมนู)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- MENU ITEMS (รายการอาหาร)
-- =====================================================
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

-- =====================================================
-- ORDERS (ออร์เดอร์)
-- =====================================================
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

-- =====================================================
-- ORDER ITEMS (รายการย่อยในออร์เดอร์)
-- =====================================================
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

-- =====================================================
-- TRIGGER: อัปเดต updated_at บน orders
-- =====================================================
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

-- =====================================================
-- REALTIME: เปิดใช้งานสำหรับ orders และ order_items
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- MVP: เปิดให้ทุกคนเข้าถึงได้ (จะเพิ่ม auth ใน phase ถัดไป)
-- =====================================================
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
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

-- Public read
CREATE POLICY "Allow public read tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Allow public read menu_categories" ON public.menu_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Allow public read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public read order_items" ON public.order_items FOR SELECT USING (true);

-- Public write (MVP)
CREATE POLICY "Allow public write tables" ON public.tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write menu_categories" ON public.menu_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write menu_items" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
