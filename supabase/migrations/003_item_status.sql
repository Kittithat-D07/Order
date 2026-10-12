-- Migration: Item-level status
-- แต่ละเมนูในออร์เดอร์มี status เป็นของตัวเอง

-- 1. เพิ่ม column status ใน order_items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled'));

-- 2. เพิ่ม column served_by (เสริฟ์คนไหนเสิร์ฟเมนูนี้)
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS served_by TEXT;

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ;

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_order_items_status ON public.order_items(status);

-- 4. Realtime สำหรับ order_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- 5. View: นับสถานะของแต่ละ order
DROP VIEW IF EXISTS public.order_status_summary;
CREATE VIEW public.order_status_summary AS
SELECT
  o.id AS order_id,
  o.table_id,
  o.created_at,
  o.total_amount,
  COUNT(*) FILTER (WHERE oi.status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE oi.status = 'preparing') AS preparing_count,
  COUNT(*) FILTER (WHERE oi.status = 'ready') AS ready_count,
  COUNT(*) FILTER (WHERE oi.status = 'served') AS served_count,
  COUNT(*) FILTER (WHERE oi.status = 'cancelled') AS cancelled_count,
  COUNT(*) AS total_items,
  CASE
    WHEN COUNT(*) FILTER (WHERE oi.status IN ('pending', 'preparing')) = 0
      AND COUNT(*) FILTER (WHERE oi.status = 'served') > 0
    THEN 'completed'
    WHEN COUNT(*) FILTER (WHERE oi.status = 'ready') > 0
    THEN 'partial_ready'
    WHEN COUNT(*) FILTER (WHERE oi.status = 'preparing') > 0
    THEN 'preparing'
    ELSE 'pending'
  END AS overall_status
FROM public.orders o
LEFT JOIN public.order_items oi ON oi.order_id = o.id
GROUP BY o.id;
