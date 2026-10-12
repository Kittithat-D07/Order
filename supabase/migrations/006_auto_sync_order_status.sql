-- Migration 006: Auto-sync orders.status from order_items
-- ทำให้ orders.status อัพเดทอัตโนมัติเมื่อ order_items เปลี่ยน (100% realtime)
-- แก้ปัญหา: Kitchen/Server อัพเดท item แล้ว แต่ orders.status ไม่อัพเดท

-- =====================================================
-- 1. Function: คำนวณ order status จาก items
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_order_status(p_order_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_total INT;
  v_served INT;
  v_cancelled INT;
  v_active INT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'served'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status IN ('pending', 'preparing', 'ready'))
  INTO v_total, v_served, v_cancelled, v_active
  FROM public.order_items
  WHERE order_id = p_order_id;

  -- ถ้าทุก item served/cancelled → served
  IF v_total > 0 AND v_active = 0 THEN
    RETURN 'served';
  END IF;

  -- ถ้ามี item กำลังทำ/พร้อมเสิร์ฟ → preparing
  IF EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_id = p_order_id
    AND status IN ('preparing', 'ready', 'served')
  ) THEN
    RETURN 'preparing';
  END IF;

  -- default
  RETURN 'pending';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. Trigger function: อัพเดท orders.status เมื่อ order_items เปลี่ยน
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_order_status()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_new_status TEXT;
  v_old_status TEXT;
BEGIN
  -- ระบุ order_id ที่เปลี่ยน
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  -- คำนวณ status ใหม่
  v_new_status := public.calculate_order_status(v_order_id);

  -- ดึง status เก่ามาเทียบ
  SELECT status INTO v_old_status FROM public.orders WHERE id = v_order_id;

  -- อัพเดทเฉพาะเมื่อเปลี่ยนจริง
  IF v_old_status IS DISTINCT FROM v_new_status THEN
    UPDATE public.orders
    SET status = v_new_status, updated_at = NOW()
    WHERE id = v_order_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. สร้าง triggers บน order_items (INSERT/UPDATE/DELETE)
-- =====================================================
DROP TRIGGER IF EXISTS trg_sync_order_status ON public.order_items;
CREATE TRIGGER trg_sync_order_status
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_status();

-- =====================================================
-- 4. แก้ข้อมูลเก่า: อัพเดท orders.status ทั้งหมดให้ตรงกับ items
-- =====================================================
DO $$
DECLARE
  r RECORD;
  v_new TEXT;
BEGIN
  FOR r IN SELECT id FROM public.orders LOOP
    v_new := public.calculate_order_status(r.id);
    UPDATE public.orders
    SET status = v_new, updated_at = NOW()
    WHERE id = r.id AND status IS DISTINCT FROM v_new;
  END LOOP;
END $$;

-- =====================================================
-- 5. เพิ่ม realtime สำหรับ bills (ถ้ายังไม่มี)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'bills'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
  END IF;
END $$;
