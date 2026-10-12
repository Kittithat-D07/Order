-- =====================================================
-- Migration: ระบบบิล
-- =====================================================

-- ตารางบิล
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

-- Function สร้างเลขบิล
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

-- RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read bills" ON public.bills;
DROP POLICY IF EXISTS "Allow public write bills" ON public.bills;

CREATE POLICY "Allow public read bills" ON public.bills FOR SELECT USING (true);
CREATE POLICY "Allow public write bills" ON public.bills FOR ALL USING (true) WITH CHECK (true);

-- Realtime
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

-- Trigger: บันทึกยอดอัตโนมัติเมื่อสร้างบิล
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
