-- =====================================================
-- 🍜 Restaurant QR Order - Complete Setup (รันครั้งเดียวจบ)
-- =====================================================
-- วิธีใช้:
-- 1. ไปที่ https://supabase.com/dashboard/project/tkmxgyvabxwofhkxzrxa/sql
-- 2. New query
-- 3. Copy ทั้งหมดนี้ไปวาง → Run
-- 4. รอ ~10 วินาที → เสร็จ!
-- =====================================================

-- =====================================================
-- PART 1: Extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PART 2: Core Tables
-- =====================================================

-- TABLES (โต๊ะในร้าน)
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number TEXT NOT NULL UNIQUE,
  qr_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tables_qr_token ON public.tables(qr_token);

-- MENU CATEGORIES (หมวดเมนู)
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MENU ITEMS (รายการอาหาร)
-- หมายเหตุ: prep_time_minutes/low_stock_threshold/stock_count/is_signature/allergens
-- จะถูกเพิ่มผ่าน ALTER TABLE ด้านล่าง เพื่อให้รันซ้ำได้
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

-- เพิ่มคอลัมน์ใหม่ (idempotent)
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS prep_time_minutes INT NOT NULL DEFAULT 10;

ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS low_stock_threshold INT NOT NULL DEFAULT 0;

ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS stock_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS is_signature BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS allergens TEXT[];

-- ORDERS (ออร์เดอร์)
-- หมายเหตุ: คอลัมน์ order_number/cancelled_at/cancel_reason/estimated_ready_at
-- จะถูกเพิ่มผ่าน ALTER TABLE ด้านล่าง เพื่อให้รันซ้ำได้
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

-- เพิ่มคอลัมน์ใหม่ (idempotent)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_number TEXT;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS estimated_ready_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- Auto-generate order_number เมื่อ INSERT (รูปแบบ: A-001, A-002, ...)
CREATE OR REPLACE FUNCTION generate_order_number() RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.order_number IS NULL THEN
    SELECT COALESCE(MAX(
      CAST(SPLIT_PART(order_number, '-', 2) AS INTEGER)
    ), 0) + 1
    INTO next_num
    FROM public.orders
    WHERE order_number LIKE 'A-%';
    NEW.order_number := 'A-' || LPAD(next_num::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_order_number ON public.orders;
CREATE TRIGGER trg_generate_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- ORDER ITEMS (รายการย่อยในออร์เดอร์)
-- หมายเหตุ: คอลัมน์ status ถูกเพิ่มผ่าน ALTER TABLE ด้านล่าง
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

-- เพิ่มคอลัมน์ status (idempotent)
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled'));

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_order_items_status ON public.order_items(status);

-- =====================================================
-- PART 3: Staff PINs (hashed + rate limit table)
-- =====================================================
-- 1) ตรวจสอบว่าตารางมีอยู่จริงไหม และมีคอลัมน์อะไรบ้าง
DO $$
DECLARE
  has_pin BOOLEAN;
  has_pin_hash BOOLEAN;
BEGIN
  -- ถ้ายังไม่มีตาราง → สร้างใหม่ (มี pin_hash เป็น NOT NULL)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'staff_pins'
  ) THEN
    CREATE TABLE public.staff_pins (
      role TEXT PRIMARY KEY CHECK (role IN ('kitchen', 'server', 'admin')),
      pin_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    -- ตารางมีอยู่แล้ว → เช็คว่ามี pin หรือ pin_hash
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'staff_pins' AND column_name = 'pin'
    ) INTO has_pin;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'staff_pins' AND column_name = 'pin_hash'
    ) INTO has_pin_hash;

    -- ถ้ามี 'pin' เก่า แต่ไม่มี 'pin_hash' → ลด NOT NULL ของ pin, เพิ่ม pin_hash
    IF has_pin AND NOT has_pin_hash THEN
      -- ลด NOT NULL constraint ของ pin
      ALTER TABLE public.staff_pins ALTER COLUMN pin DROP NOT NULL;
      -- เพิ่มคอลัมน์ pin_hash (NULL ก่อน)
      ALTER TABLE public.staff_pins ADD COLUMN pin_hash TEXT;
    END IF;
  END IF;
END $$;

-- 2) Hash จาก PIN เริ่มต้น: 123456 / 567890 / 000000
-- (bcrypt hash - generated via bcrypt.hashSync('PIN', 10))
INSERT INTO public.staff_pins (role, pin_hash, display_name) VALUES
  ('kitchen', '$2a$10$1hZgjTCsj124SnAy3utLdOKeFAVInc6LXu2FLoUWD59n0wg0c4uaq', '👨‍🍳 ครัว'),
  ('server', '$2a$10$Ffhw/yiyi/PHvVixQKwdTuJPdhE6axRJWb0sKcT24RkjmMjcMFil6', '🍽️ เสริฟ์'),
  ('admin', '$2a$10$yEwUc0j58FpXzOCmujr6/e0F1VzSrMfY9R/dVZIqSyIFa4yMW8gAG', '⚙️ ผู้จัดการ')
ON CONFLICT (role) DO UPDATE
  SET pin_hash = EXCLUDED.pin_hash, display_name = EXCLUDED.display_name, updated_at = NOW();

-- 3) ลบคอลัมน์ pin เก่า (ถ้ามี) + บังคับ NOT NULL บน pin_hash
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_pins' AND column_name = 'pin'
  ) THEN
    ALTER TABLE public.staff_pins DROP COLUMN pin;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_pins' AND column_name = 'pin_hash'
  ) THEN
    -- อัปเดต pin_hash ที่อาจยังเป็น NULL
    UPDATE public.staff_pins SET pin_hash = '$2a$10$1hZgjTCsj124SnAy3utLdOKeFAVInc6LXu2FLoUWD59n0wg0c4uaq'
      WHERE role = 'kitchen' AND pin_hash IS NULL;
    UPDATE public.staff_pins SET pin_hash = '$2a$10$Ffhw/yiyi/PHvVixQKwdTuJPdhE6axRJWb0sKcT24RkjmMjcMFil6'
      WHERE role = 'server' AND pin_hash IS NULL;
    UPDATE public.staff_pins SET pin_hash = '$2a$10$yEwUc0j58FpXzOCmujr6/e0F1VzSrMfY9R/dVZIqSyIFa4yMW8gAG'
      WHERE role = 'admin' AND pin_hash IS NULL;

    -- เปลี่ยนเป็น NOT NULL
    ALTER TABLE public.staff_pins ALTER COLUMN pin_hash SET NOT NULL;
  END IF;
END $$;

-- Staff login attempts (rate limit + audit)
CREATE TABLE IF NOT EXISTS public.staff_login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_role_time ON public.staff_login_attempts(role, attempted_at DESC);

-- =====================================================
-- PART 4: Migration 002 - Server Name
-- =====================================================
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS server_name TEXT;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Backfill order_number ให้ออร์เดอร์เก่าที่ยังไม่มี
DO $$
DECLARE
  rec RECORD;
  next_num INTEGER := 1;
BEGIN
  FOR rec IN
    SELECT id FROM public.orders
    WHERE order_number IS NULL
    ORDER BY created_at ASC
  LOOP
    UPDATE public.orders
    SET order_number = 'A-' || LPAD(next_num::TEXT, 3, '0')
    WHERE id = rec.id;
    next_num := next_num + 1;
  END LOOP;
END $$;

-- Unique index (ถ้ายังไม่มี)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number_unique
  ON public.orders(order_number)
  WHERE order_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_server ON public.orders(server_name);

-- =====================================================
-- PART 4.5: Menu item extensions (คอลัมน์ใหม่ถูกเพิ่มด้านบนแล้ว)
-- =====================================================
-- (เพิ่ม prep_time_minutes, low_stock_threshold, stock_count,
--  is_signature, allergens ที่ด้านบนของ PART 2)

-- =====================================================
-- PART 5: Migration 003 - Item Status
-- =====================================================
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled'));

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS served_by TEXT;

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_order_items_status ON public.order_items(status);

-- =====================================================
-- PART 6: Migration 004 - Table Session + paid_at
-- =====================================================
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS session_number INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON public.orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_table_session ON public.orders(table_id, session_number);

-- =====================================================
-- PART 0: Cleanup conflicting tables (ลบตาราง bills เก่าที่ schema ผิด)
-- =====================================================
DROP TABLE IF EXISTS public.bills CASCADE;

-- =====================================================
-- PART 7: Migration 005 - Bills
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  bill_number TEXT NOT NULL UNIQUE,
  total_amount NUMERIC(10, 2) NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_order ON public.bills(order_id);
CREATE INDEX IF NOT EXISTS idx_bills_number ON public.bills(bill_number);

-- =====================================================
-- PART 8: Migration 005b - Unavailable reason
-- =====================================================
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS unavailable_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marked_unavailable_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marked_unavailable_by TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_menu_items_unavailable
  ON public.menu_items(is_available, unavailable_reason)
  WHERE is_available = false;

-- =====================================================
-- PART 9: Migration 006 - Audit Log
-- =====================================================
CREATE TABLE IF NOT EXISTS public.menu_item_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  menu_item_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'toggled_stock')),
  changes JSONB DEFAULT '{}'::jsonb,
  actor_role TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_history_created
  ON public.menu_item_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_menu_history_item
  ON public.menu_item_history(menu_item_id);

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.log_menu_item_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_role TEXT;
  v_actor_name TEXT;
  v_changes JSONB;
BEGIN
  v_actor_role := COALESCE(current_setting('app.actor_role', true), 'system');
  v_actor_name := COALESCE(current_setting('app.actor_name', true), 'system');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.menu_item_history
      (menu_item_id, menu_item_name, action, changes, actor_role, actor_name)
    VALUES
      (NEW.id, NEW.name, 'created',
       jsonb_build_object('name', NEW.name, 'price', NEW.price, 'category_id', NEW.category_id, 'is_available', NEW.is_available),
       v_actor_role, v_actor_name);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_changes := jsonb_build_object(
      'before', jsonb_build_object(
        'name', OLD.name, 'price', OLD.price, 'is_available', OLD.is_available,
        'description', OLD.description, 'image_url', OLD.image_url, 'category_id', OLD.category_id
      ),
      'after', jsonb_build_object(
        'name', NEW.name, 'price', NEW.price, 'is_available', NEW.is_available,
        'description', NEW.description, 'image_url', NEW.image_url, 'category_id', NEW.category_id
      )
    );

    IF OLD.name = NEW.name
       AND OLD.price = NEW.price
       AND COALESCE(OLD.description,'') = COALESCE(NEW.description,'')
       AND COALESCE(OLD.image_url,'') = COALESCE(NEW.image_url,'')
       AND OLD.category_id = NEW.category_id
       AND OLD.is_available IS DISTINCT FROM NEW.is_available
    THEN
      INSERT INTO public.menu_item_history
        (menu_item_id, menu_item_name, action, changes, actor_role, actor_name)
      VALUES
        (NEW.id, NEW.name, 'toggled_stock', v_changes, v_actor_role, v_actor_name);
    ELSE
      INSERT INTO public.menu_item_history
        (menu_item_id, menu_item_name, action, changes, actor_role, actor_name)
      VALUES
        (NEW.id, NEW.name, 'updated', v_changes, v_actor_role, v_actor_name);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.menu_item_history
      (menu_item_id, menu_item_name, action, changes, actor_role, actor_name)
    VALUES
      (OLD.id, OLD.name, 'deleted',
       jsonb_build_object('name', OLD.name, 'price', OLD.price),
       v_actor_role, v_actor_name);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_menu_item_history ON public.menu_items;
CREATE TRIGGER trg_menu_item_history
AFTER INSERT OR UPDATE OR DELETE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.log_menu_item_change();

-- Actor context RPC
CREATE OR REPLACE FUNCTION public.set_actor_context(actor_role TEXT, actor_name TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.actor_role', actor_role, true);
  PERFORM set_config('app.actor_name', actor_name, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 10: Migration 006b - Auto-sync order status
-- =====================================================
-- ใช้ dynamic SQL เพื่อหลีกเลี่ยง parse error ตอน column ยังไม่มี
DO $$
BEGIN
  -- เช็คก่อนว่า order_items มี status column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'status'
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.calculate_order_status(p_order_id UUID)
      RETURNS TEXT AS $body$
      DECLARE
        v_total INT;
        v_active INT;
      BEGIN
        SELECT
          COUNT(*),
          COUNT(*) FILTER (WHERE status IN ('pending', 'preparing', 'ready'))
        INTO v_total, v_active
        FROM public.order_items
        WHERE order_id = p_order_id;

        IF v_total > 0 AND v_active = 0 THEN
          RETURN 'served';
        END IF;

        IF EXISTS (
          SELECT 1 FROM public.order_items
          WHERE order_id = p_order_id
          AND status IN ('preparing', 'ready', 'served')
        ) THEN
          RETURN 'preparing';
        END IF;

        RETURN 'pending';
      END;
      $body$ LANGUAGE plpgsql;
    $func$;
  ELSE
    -- Fallback: simple version (ไม่ query status)
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.calculate_order_status(p_order_id UUID)
      RETURNS TEXT AS $body$
      BEGIN
        RETURN 'pending';
      END;
      $body$ LANGUAGE plpgsql;
    $func$;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_order_status()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_new_status TEXT;
  v_old_status TEXT;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  v_new_status := public.calculate_order_status(v_order_id);
  SELECT status INTO v_old_status FROM public.orders WHERE id = v_order_id;

  IF v_old_status IS DISTINCT FROM v_new_status THEN
    UPDATE public.orders
    SET status = v_new_status, updated_at = NOW()
    WHERE id = v_order_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_order_status ON public.order_items;
CREATE TRIGGER trg_sync_order_status
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_status();

-- =====================================================
-- PART 11: Triggers
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

-- Bill number generator
CREATE OR REPLACE FUNCTION public.generate_bill_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.bill_number = 'B' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_bill_number ON public.bills;
CREATE TRIGGER trg_generate_bill_number
  BEFORE INSERT ON public.bills
  FOR EACH ROW
  WHEN (NEW.bill_number IS NULL OR NEW.bill_number = '')
  EXECUTE FUNCTION public.generate_bill_number();

-- Bill total auto-fill
CREATE OR REPLACE FUNCTION public.set_bill_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_amount IS NULL OR NEW.total_amount = 0 THEN
    SELECT total_amount INTO NEW.total_amount
    FROM public.orders
    WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_bill_total ON public.bills;
CREATE TRIGGER trg_set_bill_total
  BEFORE INSERT ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.set_bill_total();

-- =====================================================
-- PART 12: Realtime
-- =====================================================
DO $$
BEGIN
  -- orders
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  -- order_items
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  END IF;

  -- menu_items
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'menu_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  END IF;

  -- bills
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bills'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
  END IF;

  -- menu_item_history
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'menu_item_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_item_history;
  END IF;
END $$;

-- =====================================================
-- PART 13: RLS Policies (เปิดให้ทุกคนเข้าถึงได้ - MVP)
-- =====================================================
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_history ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
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
DROP POLICY IF EXISTS "Allow public read bills" ON public.bills;
DROP POLICY IF EXISTS "Allow public write bills" ON public.bills;
DROP POLICY IF EXISTS "Staff pins readable by all" ON public.staff_pins;
DROP POLICY IF EXISTS "Staff pins updatable" ON public.staff_pins;
DROP POLICY IF EXISTS "Allow read menu_item_history" ON public.menu_item_history;
DROP POLICY IF EXISTS "Allow insert menu_item_history" ON public.menu_item_history;
-- ลบ trigger bills เก่าก่อน
DROP TRIGGER IF EXISTS trg_generate_bill_number ON public.bills;
DROP TRIGGER IF EXISTS trg_set_bill_total ON public.bills;
DROP TRIGGER IF EXISTS trg_sync_order_status ON public.order_items;

-- Recreate policies
CREATE POLICY "Allow public read tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Allow public read menu_categories" ON public.menu_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Allow public read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public read order_items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow public read bills" ON public.bills FOR SELECT USING (true);

CREATE POLICY "Allow public write tables" ON public.tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write menu_categories" ON public.menu_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write menu_items" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public write bills" ON public.bills FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Staff pins readable by all" ON public.staff_pins FOR SELECT USING (true);
CREATE POLICY "Staff pins updatable" ON public.staff_pins FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow read menu_item_history" ON public.menu_item_history FOR SELECT USING (true);
CREATE POLICY "Allow insert menu_item_history" ON public.menu_item_history FOR INSERT WITH CHECK (true);

-- =====================================================
-- PART 14: SEED DATA (ข้อมูลตัวอย่าง)
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
SELECT id, 'ข้าวมันไก่', 'ข้าวมันไก่ต้ม เสิร์ฟพร้อมน้ำจิ้ม', 90.00, NULL, 3
FROM public.menu_categories WHERE name = 'อาหารจานเดียว';

INSERT INTO public.menu_items (category_id, name, description, price, image_url, display_order)
SELECT id, 'ก๋วยเตี๋ยวเรือ', 'ก๋วยเตี๋ยวเรือน้ำใส หมูสับ ลูกชิ้นปลา', 60.00, NULL, 1
FROM public.menu_categories WHERE name = 'ก๋วยเตี๋ยว';

INSERT INTO public.menu_items (category_id, name, description, price, image_url, display_order)
SELECT id, 'ก๋วยเตี๋ยวต้มยำ', 'ก๋วยเตี๋ยวต้มยำรสจัดจ้าน เลือกเส้นได้', 70.00, NULL, 2
FROM public.menu_categories WHERE name = 'ก๋วยเตี๋ยว';

INSERT INTO public.menu_items (category_id, name, description, price, image_url, display_order)
SELECT id, 'ก๋วยเตี๋ยวเย็นตาโฟ', 'ก๋วยเตี๋ยวเย็นตาโฟน้ำข้น ใส่ผักบุ้ง ลูกชิ้น', 65.00, NULL, 3
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
SELECT id, 'โค้ก', 'โคคา-โคลา 325ml', 25.00, NULL, 4
FROM public.menu_categories WHERE name = 'เครื่องดื่ม';

INSERT INTO public.menu_items (category_id, name, description, price, image_url, display_order)
SELECT id, 'บัวลอย', 'บัวลอยน้ำกะทิ ท็อปด้วยไข่หอย', 40.00, NULL, 1
FROM public.menu_categories WHERE name = 'ของหวาน';

INSERT INTO public.menu_items (category_id, name, description, price, image_url, display_order)
SELECT id, 'ทับทิมกรอบ', 'ทับทิมกรอบน้ำกะทิ มะพร้าวอ่อน', 45.00, NULL, 2
FROM public.menu_categories WHERE name = 'ของหวาน';

-- โต๊ะ
INSERT INTO public.tables (table_number, qr_token) VALUES
  ('T01', 't01-demo-aaaa'),
  ('T02', 't02-demo-bbbb'),
  ('T03', 't03-demo-cccc'),
  ('T04', 't04-demo-dddd'),
  ('T05', 't05-demo-eeee'),
  ('T06', 't06-demo-ffff')
ON CONFLICT DO NOTHING;

-- =====================================================
-- เสร็จแล้ว! ✅
-- =====================================================
-- ทดสอบได้ที่:
-- 1. เปิดแอป: http://localhost:3000
-- 2. คลิกเข้าหน้า "ผู้จัดการ" → ใส่ PIN: 0000
-- 3. คลิก "จัดการโต๊ะ" → ดู QR Code
-- 4. สแกน QR → เข้าหน้าเมนูลูกค้า
-- =====================================================
