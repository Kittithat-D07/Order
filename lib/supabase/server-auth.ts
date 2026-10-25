import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_TTL_HOURS,
  createStaffToken,
  sha256,
  verifyStaffToken,
  type StaffRole,
} from "@/lib/auth/session-token";
import { getSchemaCaps } from "@/lib/supabase/schema";

export { SESSION_COOKIE };
export type { StaffRole };

/**
 * Server-side staff authentication.
 *
 * Why this exists
 * ---------------
 * The staff role used to live in localStorage and the pages trusted it.
 * That is not a security boundary: anyone can open the browser console and
 * write `localStorage.setItem("staff-session", ...)` with the admin role.
 * Combined with the old permissive RLS policies, that handed full control
 * of the database to any customer who opened devtools.
 *
 * The new model:
 *   - PIN verification happens on the server.
 *   - On success the server issues a random session token, stores only its
 *     SHA-256 hash in the database, and sets it as an HttpOnly cookie.
 *   - The browser cannot read or forge the cookie (HttpOnly + no way to
 *     derive the token from the stored hash).
 *   - Every staff write goes through a server route that verifies the
 *     cookie before touching the database.
 */

/** Server-only Supabase client. Uses the service role key when available. */
export function createServerClientWithServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Without a service key we fall back to the anon key. Writes that require
  // elevated rights will then fail loudly rather than silently succeed.
  const key = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookies().getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies().set(name, value, options);
          });
        } catch {
          // Called from a Server Component — the middleware refreshes it.
        }
      },
    },
  });
}

/**
 * Is the service role key configured?
 *
 * This matters because the staff session table has no INSERT policy for the
 * anon key — by design, so a browser cannot mint itself an admin session.
 * Writing the session row therefore *requires* the service role key.
 */
export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** A regular server-side client that honours RLS (anon key). */
export function createServerClientAnon() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return cookies().getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookies().set(name, value, options);
            });
          } catch {
            // Server Component — safe to ignore.
          }
        },
      },
    }
  );
}

export interface StaffIdentity {
  role: StaffRole;
  displayName: string;
  sessionId: string;
}

/**
 * Create a staff session and set the cookie.
 *
 * Returns the raw token, which is only ever handed to the browser inside
 * the HttpOnly cookie — never in a JSON body.
 *
 * When the `staff_sessions` table exists the session is also recorded in
 * the database, which makes revocation possible. When the table is not
 * there yet (the migration has not been run), we fall back to a stateless
 * signed token: it is still signed, still HttpOnly, still expires — it just
 * cannot be revoked individually until the migration is applied.
 */
export async function createStaffSession(
  role: StaffRole,
  displayName: string,
  meta?: { ip?: string; userAgent?: string }
): Promise<string> {
  // The token is signed so the middleware can check it without a database
  // round trip. Only its hash is stored.
  const payload = await createStaffToken(role, SESSION_TTL_HOURS);
  const tokenHash = await sha256(payload.token);
  const expiresAt = new Date(payload.expiresAt).toISOString();

  const supabase = createServerClientWithServiceRole();
  const caps = await getSchemaCaps(supabase);

  // The session row can only be written with the service role key: the
  // table deliberately has no INSERT policy for the anon key, so that a
  // browser cannot mint itself an admin session.
  //
  // Without the service role key we cannot write the row, so we fall back
  // to a stateless signed token. It is still signed, still HttpOnly, still
  // expires — it just cannot be revoked individually until the key is set.
  const canPersist = caps.staffSessions && hasServiceRoleKey();

  if (canPersist) {
    const { error } = await supabase.from("staff_sessions").insert({
      role,
      display_name: displayName,
      token_hash: tokenHash,
      expires_at: expiresAt,
      ip_address: meta?.ip ?? null,
      user_agent: meta?.userAgent ?? null,
    });

    if (error) {
      console.error("[STAFF SESSION] insert failed:", error.message);
      throw new Error("ไม่สามารถสร้างเซสชันได้");
    }
  } else if (!caps.staffSessions) {
    console.warn(
      "[STAFF SESSION] staff_sessions table not found — using a stateless session. " +
        "Run supabase/migrations/2026-10-24-access-control.sql to enable revocation."
    );
  } else {
    console.warn(
      "[STAFF SESSION] SUPABASE_SERVICE_ROLE_KEY is not set — using a stateless session. " +
        "Sessions cannot be revoked until the key is added to .env.local."
    );
  }

  cookies().set(SESSION_COOKIE, payload.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_HOURS * 3600,
  });

  return payload.token;
}

/**
 * Read and verify the current staff session. Returns null when signed out.
 *
 * The signed token is always checked. The database lookup is an extra
 * step that catches revoked sessions — and it is skipped when the
 * `staff_sessions` table has not been created yet.
 */
export async function getStaffSession(): Promise<StaffIdentity | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // Fast path: a forged or expired token never reaches the database.
  const parsed = await verifyStaffToken(token);
  if (!parsed) return null;

  const supabase = createServerClientWithServiceRole();
  const caps = await getSchemaCaps(supabase);

  // The session row is only written when the service role key is present.
  // Without it there is no row to look up, and the lookup would fail for a
  // reason that has nothing to do with the session being invalid. Treat a
  // missing key as "stateless" rather than "signed out".
  if (!caps.staffSessions || !hasServiceRoleKey()) {
    return {
      role: parsed.role,
      displayName: parsed.role,
      sessionId: "stateless",
    };
  }

  const tokenHash = await sha256(token);

  const { data, error } = await supabase
    .from("staff_sessions")
    .select("id, role, display_name, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  return {
    role: data.role as StaffRole,
    displayName: data.display_name,
    sessionId: data.id,
  };
}

/** Revoke the current session (logout). */
export async function revokeStaffSession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return;

  const supabase = createServerClientWithServiceRole();
  const caps = await getSchemaCaps(supabase);

  if (caps.staffSessions && hasServiceRoleKey()) {
    await supabase
      .from("staff_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", await sha256(token));
  }

  cookies().delete(SESSION_COOKIE);
}

/**
 * Constant-time comparison helper for token checks.
 *
 * Implemented without Node's `crypto.timingSafeEqual` so that this module
 * stays importable from the Edge runtime: the loop always runs to the end,
 * so the time it takes does not depend on where the first difference is.
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
