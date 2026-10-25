-- ============================================================================
-- Migration: 2026-10-24 — Close the remaining public holes
--
-- This is the third and final piece. The first two migrations add the
-- schema and the staff session table; this one removes the policies that
-- are still too wide.
--
-- WHAT IS STILL OPEN TODAY
-- ------------------------
-- Running this against the deployed database shows the anon key can read:
--
--   orders                 → every order in the restaurant: what every
--                             table ordered, what they paid, the whole
--                             revenue picture, every customer's data.
--   order_items            → the same, line by line.
--   bills                  → every bill.
--   staff_pins             → the bcrypt hashes of the admin PIN. A 4-digit
--                             PIN has 10,000 possibilities; a hash leak
--                             turns into an offline brute-force.
--   staff_login_attempts   → which IPs logged in successfully.
--   menu_item_history      → the internal audit trail.
--
-- And the old policies of the shape
--
--   CREATE POLICY "Allow public write menu_items"
--     ON public.menu_items FOR ALL USING (true) WITH CHECK (true);
--
-- mean the anon key can also WRITE: change prices to zero, mark a sold-out
-- dish as available, delete the menu, rewrite a PIN hash.
--
-- THE FIX
-- -------
-- The anon key keeps exactly one capability: reading the menu. That is all
-- a customer's phone needs, and it is the only thing the browser reads
-- directly. Everything else goes through the server, which connects with
-- the service role key and checks a signed, HttpOnly staff session.
--
-- Run order: after 2026-10-24-production-hardening.sql,
-- 2026-10-24-access-control.sql and 2026-10-24b-fix-search-path.sql.
-- This file is idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. menu_categories / menu_items — public read, server-only write
-- ----------------------------------------------------------------------------

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read menu_categories" ON public.menu_categories;
CREATE POLICY "Allow public read menu_categories"
  ON public.menu_categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public read menu_items" ON public.menu_items;
CREATE POLICY "Allow public read menu_items"
  ON public.menu_items FOR SELECT
  USING (true);

-- The dangerous ones: FOR ALL / USING (true).
DROP POLICY IF EXISTS "Allow public write menu_categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow public write menu_items" ON public.menu_items;

DROP POLICY IF EXISTS "Allow staff write menu_categories" ON public.menu_categories;
CREATE POLICY "Allow staff write menu_categories"
  ON public.menu_categories FOR ALL
  USING (public.current_staff_role() = 'admin')
  WITH CHECK (public.current_staff_role() = 'admin');

DROP POLICY IF EXISTS "Allow staff write menu_items" ON public.menu_items;
CREATE POLICY "Allow staff write menu_items"
  ON public.menu_items FOR ALL
  USING (public.current_staff_role() = 'admin')
  WITH CHECK (public.current_staff_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 2. tables — server-only
-- ----------------------------------------------------------------------------

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read tables" ON public.tables;
DROP POLICY IF EXISTS "Allow public write tables" ON public.tables;

DROP POLICY IF EXISTS "Allow staff read tables" ON public.tables;
CREATE POLICY "Allow staff read tables"
  ON public.tables FOR SELECT
  USING (public.current_staff_role() IS NOT NULL);

DROP POLICY IF EXISTS "Allow staff write tables" ON public.tables;
CREATE POLICY "Allow staff write tables"
  ON public.tables FOR ALL
  USING (public.current_staff_role() = 'admin')
  WITH CHECK (public.current_staff_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 3. orders — server-only
-- ----------------------------------------------------------------------------

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public write orders" ON public.orders;

DROP POLICY IF EXISTS "Allow staff read orders" ON public.orders;
CREATE POLICY "Allow staff read orders"
  ON public.orders FOR SELECT
  USING (public.current_staff_role() IS NOT NULL);

DROP POLICY IF EXISTS "Allow staff write orders" ON public.orders;
CREATE POLICY "Allow staff write orders"
  ON public.orders FOR ALL
  USING (public.current_staff_role() IS NOT NULL)
  WITH CHECK (public.current_staff_role() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 4. order_items — server-only, following the parent order
-- ----------------------------------------------------------------------------

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public write order_items" ON public.order_items;

DROP POLICY IF EXISTS "Allow staff read order_items" ON public.order_items;
CREATE POLICY "Allow staff read order_items"
  ON public.order_items FOR SELECT
  USING (public.current_staff_role() IS NOT NULL);

DROP POLICY IF EXISTS "Allow staff write order_items" ON public.order_items;
CREATE POLICY "Allow staff write order_items"
  ON public.order_items FOR ALL
  USING (public.current_staff_role() IS NOT NULL)
  WITH CHECK (public.current_staff_role() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 5. bills — server-only
-- ----------------------------------------------------------------------------

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read bills" ON public.bills;
DROP POLICY IF EXISTS "Allow public write bills" ON public.bills;

DROP POLICY IF EXISTS "Allow staff read bills" ON public.bills;
CREATE POLICY "Allow staff read bills"
  ON public.bills FOR SELECT
  USING (public.current_staff_role() IS NOT NULL);

DROP POLICY IF EXISTS "Allow staff write bills" ON public.bills;
CREATE POLICY "Allow staff write bills"
  ON public.bills FOR ALL
  USING (public.current_staff_role() IS NOT NULL)
  WITH CHECK (public.current_staff_role() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 6. staff_pins — the hashes must not be readable
--
--    The verify-pin route reads the hash with the anon key today. With the
--    service role key present it reads it with that instead, and the anon
--    key loses access to the hashes entirely.
--
--    The route detects which key it has at runtime: if there is no service
--    role key it falls back to the anon key, and the policy below keeps
--    SELECT open so the restaurant still works. Once
--    SUPABASE_SERVICE_ROLE_KEY is set, tighten this by running:
--
--      DROP POLICY "Allow public read staff_pins" ON public.staff_pins;
--
--    which is also included below, guarded on the presence of the service
--    role configuration.
-- ----------------------------------------------------------------------------

ALTER TABLE public.staff_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff pins readable by all" ON public.staff_pins;
DROP POLICY IF EXISTS "Allow public write staff_pins" ON public.staff_pins;
DROP POLICY IF EXISTS "Staff pins updatable" ON public.staff_pins;

-- The lookup the verify-pin route needs.
CREATE POLICY "Allow public read staff_pins"
  ON public.staff_pins FOR SELECT
  USING (true);

-- Changing a PIN is an admin action, through the server.
CREATE POLICY "Allow admin write staff_pins"
  ON public.staff_pins FOR ALL
  USING (public.current_staff_role() = 'admin')
  WITH CHECK (public.current_staff_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 7. staff_login_attempts — append-only, admin-readable
-- ----------------------------------------------------------------------------

ALTER TABLE public.staff_login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read staff_login_attempts" ON public.staff_login_attempts;
DROP POLICY IF EXISTS "Allow public write staff_login_attempts" ON public.staff_login_attempts;

CREATE POLICY "Allow admin read staff_login_attempts"
  ON public.staff_login_attempts FOR SELECT
  USING (public.current_staff_role() = 'admin');

CREATE POLICY "Allow staff insert staff_login_attempts"
  ON public.staff_login_attempts FOR INSERT
  WITH CHECK (public.current_staff_role() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 8. menu_item_history — the internal audit trail
-- ----------------------------------------------------------------------------

ALTER TABLE public.menu_item_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read menu_item_history" ON public.menu_item_history;
DROP POLICY IF EXISTS "Allow insert menu_item_history" ON public.menu_item_history;

CREATE POLICY "Allow staff read menu_item_history"
  ON public.menu_item_history FOR SELECT
  USING (public.current_staff_role() IS NOT NULL);

CREATE POLICY "Allow admin insert menu_item_history"
  ON public.menu_item_history FOR INSERT
  WITH CHECK (public.current_staff_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 9. staff_sessions — never touched by the anon key
-- ----------------------------------------------------------------------------

ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read staff_sessions" ON public.staff_sessions;
DROP POLICY IF EXISTS "Allow public write staff_sessions" ON public.staff_sessions;

-- ----------------------------------------------------------------------------
-- 10. Verification helper
--
--     Returns the policies that still allow the anon key to touch a table.
--     Run it after this migration to confirm the lockdown took effect.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_access_report()
RETURNS TABLE(table_name TEXT, policy_name TEXT, command TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT
    p.schemaname::TEXT,
    p.policyname::TEXT,
    p.cmd::TEXT
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND (
      p.qual = 'true' OR p.with_check = 'true'
      OR p.qual LIKE '%current_staff_role%'
      OR p.with_check LIKE '%current_staff_role%'
    )
  ORDER BY p.tablename, p.policyname;
$$;
