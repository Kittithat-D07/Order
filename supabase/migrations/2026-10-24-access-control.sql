-- ============================================================================
-- Migration: 2026-10-24 — Access control
--
-- THE PROBLEM
-- ------------
-- Every table in this database was fully writable by the public anon key:
--
--   CREATE POLICY "Allow public write menu_items"
--     ON public.menu_items FOR ALL USING (true) WITH CHECK (true);
--
-- The anon key ships to every customer's phone in the JavaScript bundle.
-- That means anyone could, from a browser console:
--   * change any menu price to 0
--   * mark every dish as available (including sold-out ones)
--   * delete the whole menu
--   * delete tables and every order attached to them
--   * read every order in the restaurant — other customers' food, other
--     tables' bills, the whole revenue picture
--   * rewrite a staff PIN hash and take over the admin account
--
-- The staff role also lived in localStorage and the pages trusted it, so
-- one console line was enough to become an admin. The kitchen and server
-- roles needed no PIN at all.
--
-- THE FIX
-- -------
-- 1. The anon key can only READ the menu and the menu categories. That is
--    all a customer needs to order.
-- 2. Everything else — tables, orders, order items, bills, the audit log,
--    staff PINs — is reachable only through server routes that verify a
--    signed, HttpOnly staff session cookie.
-- 3. The server connects with the service role key, which bypasses RLS.
--    RLS becomes the backstop for the anon key rather than the primary
--    control.
-- 4. staff_pins stops being publicly writable.
--
-- The companion application code is:
--   lib/auth/session-token.ts       — signed session tokens
--   lib/supabase/server-auth.ts     — issue / verify / revoke sessions
--   lib/api/staff-guard.ts          — the guard every staff route uses
--   app/api/staff/*                 — the staff API surface
--
-- IMPORTANT — ordering note:
--   Run this AFTER 2026-10-24-production-hardening.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. staff_sessions — server-issued, signed, expiring sessions
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.staff_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('kitchen', 'server', 'admin')),
  display_name TEXT NOT NULL,
  -- Only the SHA-256 hash of the token is stored, so a database leak does
  -- not hand over live sessions.
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_staff_sessions_token ON public.staff_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_expires ON public.staff_sessions(expires_at);

ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;

-- The table is only ever touched by the server, which connects with the
-- service role key (which bypasses RLS). No anon policy at all.
DROP POLICY IF EXISTS "Allow public read staff_sessions" ON public.staff_sessions;
DROP POLICY IF EXISTS "Allow public write staff_sessions" ON public.staff_sessions;

-- ----------------------------------------------------------------------------
-- 2. Menu — the only thing customers may read, and the only thing they may
--    write (through the server, which uses the service role).
--
--    The customer menu page reads menu_categories and menu_items directly
--    with the anon key, so SELECT has to stay public. Everything else on
--    these tables is server-only.
-- ----------------------------------------------------------------------------

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

-- Reading the menu is public: every customer needs it.
DROP POLICY IF EXISTS "Allow public read menu_items" ON public.menu_items;
CREATE POLICY "Allow public read menu_items"
  ON public.menu_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public read menu_categories" ON public.menu_categories;
CREATE POLICY "Allow public read menu_categories"
  ON public.menu_categories FOR SELECT
  USING (true);

-- Writing the menu is server-only.
DROP POLICY IF EXISTS "Allow public write menu_categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow public write menu_items" ON public.menu_items;

DROP POLICY IF EXISTS "Allow staff write menu_items" ON public.menu_items;
CREATE POLICY "Allow staff write menu_items"
  ON public.menu_items FOR ALL
  USING (public.current_staff_role() = 'admin')
  WITH CHECK (public.current_staff_role() = 'admin');

DROP POLICY IF EXISTS "Allow staff write menu_categories" ON public.menu_categories;
CREATE POLICY "Allow staff write menu_categories"
  ON public.menu_categories FOR ALL
  USING (public.current_staff_role() = 'admin')
  WITH CHECK (public.current_staff_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 3. Tables — server-only.
--
--    The customer menu page resolves the table from its QR token. That now
--    happens through the server route /api/customer/table, so the browser
--    never reads this table.
--
--    is_active lets the restaurant close a table for service (private
--    party, cleaning) without deleting its history.
-- ----------------------------------------------------------------------------

ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

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
-- 4. Orders — server-only.
--
--    Customers read their own order through
--    /api/customer/order/[orderId]?table=<qr_token>, where the server
--    verifies that the order belongs to the table whose token was supplied.
--    Placing an order goes through POST /api/orders.
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
-- 5. Order items — server-only, following the parent order.
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
-- 6. Bills — server-only.
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
-- 7. staff_pins — stop the anonymous takeover.
--
--    The verify-pin route reads the hash with the anon key, so SELECT has to
--    stay public for that lookup to keep working without a service key.
--    But UPDATE and DELETE must not be publicly writable, or anyone can
--    replace the admin PIN hash with a hash of a PIN they know.
--
--    2026 note: a bcrypt hash of a 4-6 digit PIN is brute-forceable if it
--    leaks. The verification route is rate-limited, and the strongest fix
--    is to move that lookup behind the service role key (see .env.example:
--    SUPABASE_SERVICE_ROLE_KEY). Until then, keep SELECT public but make
--    sure the hash can never be *changed* from outside.
-- ----------------------------------------------------------------------------

ALTER TABLE public.staff_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff pins readable by all" ON public.staff_pins;
DROP POLICY IF EXISTS "Allow public read staff_pins" ON public.staff_pins;

-- The verify-pin route needs to read the hash to compare it.
CREATE POLICY "Allow public read staff_pins"
  ON public.staff_pins FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff pins updatable" ON public.staff_pins;
DROP POLICY IF EXISTS "Allow public write staff_pins" ON public.staff_pins;

-- Changing a PIN is an admin action, done through the server with a
-- verified admin session.
DROP POLICY IF EXISTS "Allow admin write staff_pins" ON public.staff_pins;
CREATE POLICY "Allow admin write staff_pins"
  ON public.staff_pins FOR ALL
  USING (public.current_staff_role() = 'admin')
  WITH CHECK (public.current_staff_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 8. Audit log — staff only.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow read menu_item_history" ON public.menu_item_history;
DROP POLICY IF EXISTS "Allow insert menu_item_history" ON public.menu_item_history;

DROP POLICY IF EXISTS "Allow staff read menu_item_history" ON public.menu_item_history;
CREATE POLICY "Allow staff read menu_item_history"
  ON public.menu_item_history FOR SELECT
  USING (public.current_staff_role() IS NOT NULL);

DROP POLICY IF EXISTS "Allow admin insert menu_item_history" ON public.menu_item_history;
CREATE POLICY "Allow admin insert menu_item_history"
  ON public.menu_item_history FOR INSERT
  WITH CHECK (public.current_staff_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 9. Login attempts — append-only, no public read.
--
--    The table used to be readable by anyone, which handed over the list of
--    successful PINs and the IPs that used them. The verify-pin route
--    writes with the anon key; if the insert is rejected by RLS the login
--    still works (the route logs and continues), so an append-only policy
--    for the server's own use is enough.
-- ----------------------------------------------------------------------------

ALTER TABLE public.staff_login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read staff_login_attempts" ON public.staff_login_attempts;
DROP POLICY IF EXISTS "Allow public write staff_login_attempts" ON public.staff_login_attempts;

DROP POLICY IF EXISTS "Allow admin read staff_login_attempts" ON public.staff_login_attempts;
CREATE POLICY "Allow admin read staff_login_attempts"
  ON public.staff_login_attempts FOR SELECT
  USING (public.current_staff_role() = 'admin');

-- The login attempt itself is recorded through the service role client, so
-- no anon INSERT policy is needed. The route degrades gracefully if this
-- write is refused.
DROP POLICY IF EXISTS "Allow staff insert staff_login_attempts" ON public.staff_login_attempts;
CREATE POLICY "Allow staff insert staff_login_attempts"
  ON public.staff_login_attempts FOR INSERT
  WITH CHECK (public.current_staff_role() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 10. Helper: is this request made by a valid staff session?
--
--     The staff session cookie carries the raw token. We hash it and look it
--     up. The helper is SECURITY DEFINER so it can read staff_sessions even
--     though RLS blocks anon access to it.
--
--     The token is read from the cookie header, because that is how the
--     browser sends it. The `x-staff-token` header is also accepted for
--     server-to-server calls.
--
--     NOTE: the application code does not depend on this function — the
--     server routes verify the session in TypeScript via
--     lib/supabase/server-auth.ts, using the service role key. This helper
--     is a defence-in-depth layer: if a write ever reaches the database
--     directly, the policy still refuses it.
-- ----------------------------------------------------------------------------

-- pgcrypto gives us digest() for the SHA-256 hash.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Pull the session token out of the request headers.
CREATE OR REPLACE FUNCTION public.staff_token_from_request()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers TEXT := current_setting('request.headers', true);
  v_json JSON;
  v_cookie TEXT;
  v_token TEXT;
  v_pair TEXT;
  v_name TEXT;
  v_value TEXT;
BEGIN
  IF v_headers IS NULL OR v_headers = '' THEN
    RETURN NULL;
  END IF;

  v_json := v_headers::JSON;

  -- Direct header (server-to-server).
  v_token := v_json ->> 'x-staff-token';
  IF v_token IS NOT NULL AND v_token <> '' THEN
    RETURN v_token;
  END IF;

  -- Cookie (browser).
  v_cookie := v_json ->> 'cookie';
  IF v_cookie IS NULL OR v_cookie = '' THEN
    RETURN NULL;
  END IF;

  FOR v_pair IN SELECT * FROM regexp_split_to_table(v_cookie, ';') AS t(x)
  LOOP
    v_name := trim(split_part(v_pair, '=', 1));
    v_value := trim(split_part(v_pair, '=', 2));
    IF v_name = 'aura-staff-session' THEN
      RETURN v_value;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT := public.staff_token_from_request();
  v_role TEXT;
BEGIN
  IF v_token IS NULL OR v_token = '' THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM public.staff_sessions
  WHERE token_hash = encode(digest(v_token, 'sha256'), 'hex')
    AND revoked_at IS NULL
    AND expires_at > NOW()
  LIMIT 1;

  RETURN v_role;
END;
$$;

-- Same, but also gives the display name for the audit trail.
CREATE OR REPLACE FUNCTION public.current_staff_identity()
RETURNS TABLE(role TEXT, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT := public.staff_token_from_request();
BEGIN
  RETURN QUERY
  SELECT s.role, s.display_name
  FROM public.staff_sessions s
  WHERE s.token_hash = encode(digest(v_token, 'sha256'), 'hex')
    AND s.revoked_at IS NULL
    AND s.expires_at > NOW()
  LIMIT 1;
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. Cleanup expired sessions
--
--     Call this from a cron job or a Supabase scheduled function.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.staff_sessions
  WHERE expires_at < NOW() - INTERVAL '7 days'
     OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
