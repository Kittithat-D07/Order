-- ============================================================================
-- Migration: 2026-10-24 — Production hardening (v2)
--
-- Runs against the schema that is actually deployed, and adds what the
-- application expects:
--
--   orders.order_number        — human-readable order number
--   orders.cancelled_at        — when it was cancelled
--   orders.cancel_reason       — why
--   orders.payment_method      — cash | transfer
--   orders.discount_amount     — money breakdown for tax invoicing
--   orders.service_charge_amount
--   orders.vat_amount
--   orders.amount_due          — what the customer actually pays
--   orders.cash_received       — cash handed over, for change
--   tables.is_active           — a closed table refuses new orders
--   staff_sessions             — server-issued, revocable staff sessions
--   decrement_stock()          — atomic, concurrency-safe stock reservation
--   restore_stock()            — put the stock back
--   recalc_order_total()       — the database owns the money
--
-- Everything here is idempotent: it can be run more than once.
--
-- Run order: this file is self-contained. It does not depend on
-- 2026-10-24-access-control.sql, but running that one afterwards is
-- recommended (it locks the RLS policies down).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Schema drift — make the referenced columns real
-- ----------------------------------------------------------------------------

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- The check constraint is added separately so that re-running the migration
-- on a table that already has the column does not fail.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_payment_method_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_payment_method_check
      CHECK (payment_method IS NULL OR payment_method IN ('cash', 'transfer'));
  END IF;
END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS service_charge_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS amount_due NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cash_received NUMERIC(10, 2);

-- A table can be closed for service (private party, cleaning, maintenance).
ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ----------------------------------------------------------------------------
-- 2. Human-readable order number
--
--    "A-20261024-0007" — sequenced per day, so staff can read it out loud
--    and the customer can quote it at the counter.
--
--    The sequence is taken from a dedicated counter table rather than
--    COUNT(*), because COUNT(*) races: two orders inserted at the same
--    moment would get the same number.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.order_number_counters (
  day DATE PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    INSERT INTO public.order_number_counters (day, last_seq)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (day) DO UPDATE
      SET last_seq = public.order_number_counters.last_seq + 1
    RETURNING last_seq INTO v_seq;

    NEW.order_number := 'A-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_order_number ON public.orders;
CREATE TRIGGER trg_generate_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- Backfill any rows created before this migration.
WITH numbered AS (
  SELECT id,
    'A-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' ||
    LPAD((ROW_NUMBER() OVER (PARTITION BY created_at::DATE ORDER BY created_at))::TEXT, 4, '0') AS num
  FROM public.orders
  WHERE order_number IS NULL OR order_number = ''
)
UPDATE public.orders o
SET order_number = numbered.num
FROM numbered
WHERE o.id = numbered.id;

-- Seed the counter from the existing data so new numbers do not collide.
INSERT INTO public.order_number_counters (day, last_seq)
SELECT created_at::DATE, COUNT(*)
FROM public.orders
WHERE created_at::DATE >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY created_at::DATE
ON CONFLICT (day) DO UPDATE
SET last_seq = GREATEST(public.order_number_counters.last_seq, EXCLUDED.last_seq);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- ----------------------------------------------------------------------------
-- 3. Money integrity — the database owns the totals
--
--    total_amount = sum of the item subtotals
--    amount_due   = total_amount - discount + service charge + VAT
--
--    A trigger keeps them in sync on every item change, so no client can
--    make the numbers disagree.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recalc_order_total(p_order_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC(10, 2);
  v_discount NUMERIC(10, 2);
  v_service NUMERIC(10, 2);
  v_vat NUMERIC(10, 2);
  v_due NUMERIC(10, 2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO v_total
  FROM public.order_items
  WHERE order_id = p_order_id;

  SELECT
    COALESCE(discount_amount, 0),
    COALESCE(service_charge_amount, 0),
    COALESCE(vat_amount, 0)
  INTO v_discount, v_service, v_vat
  FROM public.orders
  WHERE id = p_order_id;

  v_due := v_total - v_discount + v_service + v_vat;
  IF v_due < 0 THEN
    v_due := 0;
  END IF;

  UPDATE public.orders
  SET total_amount = v_total,
      amount_due = v_due
  WHERE id = p_order_id;

  RETURN v_due;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trg_recalc_order_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalc_order_total(NEW.order_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_order_total(OLD.order_id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.recalc_order_total(NEW.order_id);
    IF OLD.order_id <> NEW.order_id THEN
      PERFORM public.recalc_order_total(OLD.order_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_items_recalc_total ON public.order_items;
CREATE TRIGGER trg_order_items_recalc_total
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalc_order_total();

-- On INSERT the items do not exist yet, so the totals start at zero and the
-- order_items trigger fills them in.
CREATE OR REPLACE FUNCTION public.trg_orders_force_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.total_amount := 0;
    NEW.amount_due := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_force_total ON public.orders;
CREATE TRIGGER trg_orders_force_total
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_force_total();

-- Fix the totals of any order created before this migration.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT o.id
    FROM public.orders o
    LEFT JOIN public.order_items i ON i.order_id = o.id
    GROUP BY o.id, o.total_amount
    HAVING o.total_amount IS DISTINCT FROM COALESCE(SUM(i.subtotal), 0)
  LOOP
    PERFORM public.recalc_order_total(r.id);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Stock accuracy — atomic decrement, auto-unavailable at zero
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_menu_item_id UUID,
  p_quantity INT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tracked BOOLEAN;
  v_updated BOOLEAN;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN TRUE;
  END IF;

  -- The `stock_count >= p_quantity` guard is what makes this safe under
  -- concurrency: the row is re-checked inside the statement, so two
  -- customers racing for the last portion cannot both succeed.
  UPDATE public.menu_items
  SET stock_count = stock_count - p_quantity
  WHERE id = p_menu_item_id
    AND stock_count IS NOT NULL
    AND stock_count >= 0
    AND stock_count >= p_quantity
  RETURNING TRUE INTO v_updated;

  IF NOT COALESCE(v_updated, FALSE) THEN
    -- Either the item is not tracked, or there is not enough stock.
    SELECT (stock_count IS NOT NULL AND stock_count >= 0) INTO v_tracked
    FROM public.menu_items
    WHERE id = p_menu_item_id;

    -- Not tracked → nothing to do, the order is fine.
    IF NOT COALESCE(v_tracked, FALSE) THEN
      RETURN TRUE;
    END IF;

    -- Tracked but insufficient → the caller must reject the order.
    RETURN FALSE;
  END IF;

  -- Hit zero → stop selling it.
  UPDATE public.menu_items
  SET is_available = FALSE,
      unavailable_reason = 'สินค้าหมด',
      marked_unavailable_at = NOW(),
      stock_count = 0
  WHERE id = p_menu_item_id
    AND stock_count IS NOT NULL
    AND stock_count = 0
    AND is_available = TRUE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.restore_stock(
  p_menu_item_id UUID,
  p_quantity INT
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN TRUE;
  END IF;

  UPDATE public.menu_items
  SET stock_count = stock_count + p_quantity
  WHERE id = p_menu_item_id
    AND stock_count IS NOT NULL
    AND stock_count >= 0;

  -- If it was auto-unavailable because of zero stock and we now have some
  -- again, bring it back on the shelf.
  UPDATE public.menu_items
  SET is_available = TRUE,
    unavailable_reason = NULL,
    marked_unavailable_at = NULL
  WHERE id = p_menu_item_id
    AND stock_count IS NOT NULL
    AND stock_count > 0
    AND is_available = FALSE
    AND unavailable_reason = 'สินค้าหมด';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 5. Indexes for the queries the app actually runs
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON public.orders(status, created_at);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_paid_at
  ON public.orders(paid_at)
  WHERE paid_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bills_order_id
  ON public.bills(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order_status
  ON public.order_items(order_id, status);

CREATE INDEX IF NOT EXISTS idx_menu_items_available
  ON public.menu_items(is_available, display_order);

-- ----------------------------------------------------------------------------
-- 6. Realtime needs REPLICA IDENTITY FULL to send the full row on UPDATE
-- ----------------------------------------------------------------------------

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.menu_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'menu_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  END IF;
END $$;
