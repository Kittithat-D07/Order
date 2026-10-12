-- Migration 004: Table session tracking + paid_at
-- ใช้แยกรอบลูกค้า (เก่าเช็คบิลแล้ว → โต๊ะพร้อมรับลูกค้าใหม่)

-- 1. เพิ่ม paid_at ใน orders (เก็บเวลาที่จ่ายเงินเสร็จ)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 2. เพิ่ม session_number ใน orders (นับรอบลูกค้า 1, 2, 3, ...)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS session_number INT NOT NULL DEFAULT 1;

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON public.orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_table_session ON public.orders(table_id, session_number);

-- 4. View: สถานะโต๊ะปัจจุบัน (รอบลูกค้าปัจจุบัน)
DROP VIEW IF EXISTS public.current_table_session;
CREATE VIEW public.current_table_session AS
SELECT
  t.id AS table_id,
  t.table_number,
  t.qr_token,
  o.id AS current_order_id,
  o.session_number,
  o.status AS order_status,
  o.total_amount,
  o.created_at AS order_started_at,
  o.paid_at,
  CASE
    WHEN o.id IS NULL THEN 'available'
    WHEN o.paid_at IS NOT NULL THEN 'billing'
    WHEN o.status = 'cancelled' THEN 'available'
    ELSE 'occupied'
  END AS table_state,
  (SELECT COUNT(*) FROM public.order_items oi WHERE oi.order_id = o.id) AS item_count,
  (SELECT COUNT(*) FROM public.order_items oi WHERE oi.order_id = o.id AND oi.status = 'served') AS served_count
FROM public.tables t
LEFT JOIN public.orders o ON o.table_id = t.id
  AND o.id = (
    SELECT id FROM public.orders
    WHERE table_id = t.id
    ORDER BY session_number DESC, created_at DESC
    LIMIT 1
  );

-- 5. Realtime สำหรับ orders (paid_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
