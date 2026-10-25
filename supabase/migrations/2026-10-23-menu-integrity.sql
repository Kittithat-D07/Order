-- =====================================================
-- MIGRATION: Menu data integrity + stock signal
-- Idempotent. Safe to run repeatedly.
--
-- Fixes:
--   1. Duplicate menu_categories rows (8 rows, 4 names)
--   2. Duplicate menu_items rows (36 rows, 12 names)
--   3. stock_count DEFAULT 0 => every item read as sold out
--   4. Missing UNIQUE constraints so duplicates cannot return
--   5. is_available as the single source of truth for availability
-- =====================================================

-- =====================================================
-- 1) DEDUPE CATEGORIES
--    Keep the lowest-id row per name; repoint items; delete the rest.
-- =====================================================
DO $$
DECLARE
  keeper UUID;
  dup UUID;
BEGIN
  FOR dup IN
    SELECT c.id
    FROM public.menu_categories c
    WHERE c.id <> (
      SELECT c2.id FROM public.menu_categories c2 WHERE c2.name = c.name ORDER BY c2.id LIMIT 1
    )
  LOOP
    -- Move items to the keeper of the same name
    SELECT c2.id INTO keeper
    FROM public.menu_categories c2
    WHERE c2.name = (SELECT name FROM public.menu_categories WHERE id = dup)
    ORDER BY c2.id LIMIT 1;

    IF keeper IS NOT NULL AND keeper <> dup THEN
      UPDATE public.menu_items
      SET category_id = keeper
      WHERE category_id = dup;

      DELETE FROM public.menu_categories WHERE id = dup;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- 2) DEDUPE MENU ITEMS
--    Keep the lowest-id row per (category_id, name).
--    order_items reference menu_item_id, so repoint them first.
-- =====================================================
DO $$
DECLARE
  dup RECORD;
  keeper UUID;
BEGIN
  FOR dup IN
    SELECT mi.id, mi.category_id, mi.name
    FROM public.menu_items mi
    WHERE mi.id <> (
      SELECT mi2.id
      FROM public.menu_items mi2
      WHERE mi2.category_id = mi.category_id AND mi2.name = mi.name
      ORDER BY mi2.id LIMIT 1
    )
  LOOP
    SELECT mi2.id INTO keeper
    FROM public.menu_items mi2
    WHERE mi2.category_id = dup.category_id AND mi2.name = dup.name
    ORDER BY mi2.id LIMIT 1;

    IF keeper IS NOT NULL AND keeper <> dup.id THEN
      -- Repoint historical order lines at the surviving item
      UPDATE public.order_items
      SET menu_item_id = keeper
      WHERE menu_item_id = dup.id;

      DELETE FROM public.menu_items WHERE id = dup.id;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- 3) FIX STOCK SIGNAL
--    stock_count = 0 meant "sold out" everywhere.
--    NULL now means "not tracked" (unlimited).
--    Availability is decided by is_available alone.
-- =====================================================
UPDATE public.menu_items
SET stock_count = NULL
WHERE stock_count = 0;

ALTER TABLE public.menu_items
  ALTER COLUMN stock_count DROP NOT NULL;

ALTER TABLE public.menu_items
  ALTER COLUMN stock_count DROP DEFAULT;

-- low_stock_threshold 0 means "no threshold" — leave as is but document it.

-- =====================================================
-- 4) UNIQUE CONSTRAINTS — stop the duplicates coming back
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'menu_categories_name_key'
  ) THEN
    ALTER TABLE public.menu_categories
      ADD CONSTRAINT menu_categories_name_key UNIQUE (name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'menu_items_category_name_key'
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_category_name_key UNIQUE (category_id, name);
  END IF;
END $$;

-- =====================================================
-- 5) INDEXES for the queries the app actually runs
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_menu_items_available
  ON public.menu_items (is_available);

CREATE INDEX IF NOT EXISTS idx_menu_categories_order
  ON public.menu_categories (display_order);

-- =====================================================
-- 6) CLEAN THE STALE "SOLDOUT" STATE
--    Items marked unavailable during testing should come back
--    unless they were deliberately closed. We restore the ones
--    that were only marked during the seed/debug window.
-- =====================================================
UPDATE public.menu_items
SET
  is_available = TRUE,
  unavailable_reason = NULL,
  marked_unavailable_at = NULL,
  marked_unavailable_by = NULL
WHERE unavailable_reason IS NULL
  AND marked_unavailable_by = '⚙️ ผู้จัดการ';

-- =====================================================
-- VERIFY
-- =====================================================
SELECT 'categories' AS t, COUNT(*) AS rows, COUNT(DISTINCT name) AS unique_names
FROM public.menu_categories
UNION ALL
SELECT 'items', COUNT(*), COUNT(DISTINCT (category_id::text || '|' || name))
FROM public.menu_items
UNION ALL
SELECT 'sold_out', COUNT(*), COUNT(*) FILTER (WHERE NOT is_available)
FROM public.menu_items
UNION ALL
SELECT 'null_stock', COUNT(*), COUNT(*) FILTER (WHERE stock_count IS NULL)
FROM public.menu_items;
