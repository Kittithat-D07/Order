-- Migration: เพิ่ม PIN system สำหรับ staff login
-- แต่ละ role มี PIN แยก (เปลี่ยนได้)

CREATE TABLE IF NOT EXISTS public.staff_pins (
  role TEXT PRIMARY KEY CHECK (role IN ('kitchen', 'server', 'admin')),
  pin TEXT NOT NULL,
  display_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PIN เริ่มต้น (เปลี่ยนได้ใน Supabase)
INSERT INTO public.staff_pins (role, pin, display_name) VALUES
  ('kitchen', '1234', '👨‍🍳 ครัว'),
  ('server', '5678', '🍽️ เสิรฟ์'),
  ('admin', '0000', '⚙️ ผู้จัดการ')
ON CONFLICT (role) DO UPDATE
  SET pin = EXCLUDED.pin, updated_at = NOW();

ALTER TABLE public.staff_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff pins readable by all" ON public.staff_pins;
CREATE POLICY "Staff pins readable by all"
  ON public.staff_pins FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff pins updatable" ON public.staff_pins;
CREATE POLICY "Staff pins updatable"
  ON public.staff_pins FOR ALL
  USING (true)
  WITH CHECK (true);
