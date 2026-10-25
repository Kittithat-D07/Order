-- ============================================================================
-- Migration: 2026-10-24b — Fix the search_path of the session helpers
--
-- THE PROBLEM
-- ------------
-- 2026-10-24-access-control.sql created the session helpers with:
--
--   SET search_path = public
--
-- On Supabase, pgcrypto is installed in the `extensions` schema, not in
-- `public`. With `search_path` pinned to `public` only, the call to
-- `digest(v_token, 'sha256')` cannot be resolved, and the function fails at
-- runtime with:
--
--   42883: function digest(text, unknown) does not exist
--
-- The failure is not limited to the function itself. Every RLS policy that
-- calls `public.current_staff_role()` evaluates that expression on every row
-- access, so the error surfaces as a 400 on ordinary reads of `tables`,
-- `orders`, `bills` and friends — the whole staff UI stops working even
-- though the policies themselves were created correctly.
--
-- CONFIRMING THE DIAGNOSIS
-- ------------------------
--   SELECT public.current_staff_role();
--
-- returns the error above. Compare with:
--
--   SELECT encode(digest('x', 'sha256'), 'hex');
--
-- which works, because the session's own search_path still includes
-- `extensions`.
--
-- THE FIX
-- -------
-- Recreate the three helpers with a search_path that includes both schemas:
--
--   SET search_path = public, extensions, pg_temp
--
-- `public` comes first so the project's own objects keep priority, and
-- `pg_temp` is listed last so a temporary object can never shadow a real
-- one. `pg_temp` is always searched last regardless of position, but
-- listing it explicitly documents the intent.
--
-- This file is idempotent — it can be run more than once.
--
-- Run order: after 2026-10-24-access-control.sql.
-- ============================================================================

-- pgcrypto must be present for digest() to exist at all.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. staff_token_from_request
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.staff_token_from_request()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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

-- ----------------------------------------------------------------------------
-- 2. current_staff_role
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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

-- ----------------------------------------------------------------------------
-- 3. current_staff_identity
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_staff_identity()
RETURNS TABLE(role TEXT, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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
-- 4. cleanup_expired_sessions
--
--    Included for consistency: every helper in this family now shares the
--    same search_path.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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

-- ----------------------------------------------------------------------------
-- 5. Verification
--
--    This must return NULL (not an error). If it errors, the search_path
--    still cannot see digest().
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  PERFORM public.current_staff_role();
  RAISE NOTICE 'OK: current_staff_role() resolves digest() and runs cleanly.';
END $$;
