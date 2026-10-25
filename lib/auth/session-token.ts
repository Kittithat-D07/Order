/**
 * Staff session tokens.
 *
 * The token is a self-describing string:
 *
 *   <role>.<expiresAtMs>.<random>.<hmac>
 *
 * The HMAC covers the first three parts and is signed with SESSION_SECRET.
 * That gives us two useful properties:
 *
 *   1. The middleware can check the token without a database round trip —
 *      it can tell "this is a valid, unexpired admin session" from
 *      "this is a forged or expired token" before deciding whether to
 *      redirect.
 *   2. Only the SHA-256 hash is stored in the database, so a database leak
 *      does not hand over live sessions. The raw token exists only in the
 *      HttpOnly cookie.
 *
 * The server-side helpers in lib/supabase/server-auth.ts remain the
 * authoritative check — they look the session up in the database, which is
 * what makes revocation work.
 *
 * Runtime note: this module is imported by middleware.ts, which runs on the
 * Edge runtime. Node's `crypto` module is not available there, so everything
 * below is built on the Web Crypto API (`globalThis.crypto.subtle`) instead.
 * That API exists in the Edge runtime and in Node 18+, so the same module
 * works on both sides of the boundary.
 */

export const SESSION_COOKIE = "aura-staff-session";

/** How long a staff session lasts. */
export const SESSION_TTL_HOURS = 12;

export type StaffRole = "kitchen" | "server" | "admin";

const encoder = new TextEncoder();

let warnedAboutFallbackSecret = false;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value) return value;

  // A known signing secret means anyone can forge an admin token. This is
  // fine for a local dev server with no staff data, but it must never be
  // the reason a production deployment is insecure.
  if (!warnedAboutFallbackSecret) {
    warnedAboutFallbackSecret = true;
    console.warn(
      "[SESSION] SESSION_SECRET is not set — using the built-in fallback. " +
        "Staff tokens are forgeable until you set SESSION_SECRET (openssl rand -hex 32)."
    );
  }
  return "aura-fallback-secret";
}

/** Hex-encode bytes. Matches `encode(digest(...), 'hex')` in Postgres. */
function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Constant-time string comparison.
 *
 * `crypto.timingSafeEqual` from Node needs Buffers, which the Edge runtime
 * does not have. Comparing hex digests with a fixed-length XOR accumulator
 * gives the same property: the loop always runs to the end, so the time it
 * takes does not depend on where the first difference is.
 */
function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Hash a session token for storage.
 *
 * This is a plain SHA-256 hex digest on purpose: the database-side helper
 * `public.current_staff_role()` hashes the same token with
 * `encode(digest(v_token, 'sha256'), 'hex')`, so both sides have to agree
 * byte for byte.
 */
export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(new Uint8Array(digest));
}

/** HMAC-SHA256 of `body`, hex encoded. */
async function hmacHex(secretValue: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretValue),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return toHex(new Uint8Array(signature));
}

export interface StaffTokenPayload {
  role: StaffRole;
  expiresAt: number;
  random: string;
  /** The full token, needed to store its hash. */
  token: string;
}

/** Create a new signed session token. */
export async function createStaffToken(
  role: StaffRole,
  ttlHours = SESSION_TTL_HOURS
): Promise<StaffTokenPayload> {
  const expiresAt = Date.now() + ttlHours * 3600 * 1000;

  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const random = toHex(randomBytes);

  const body = `${role}.${expiresAt}.${random}`;
  const signature = await hmacHex(secret(), body);
  const token = `${body}.${signature}`;

  return { role, expiresAt, random, token };
}

/**
 * Verify a token's signature and expiry.
 *
 * Returns null for anything malformed, forged or expired. This is a fast
 * check, not an authority: a revoked session still passes here. The
 * database lookup in server-auth.ts is what catches revocation.
 */
export async function verifyStaffToken(
  token: string | undefined | null
): Promise<{ role: StaffRole; expiresAt: number } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;

  const [role, expiryRaw, random, signature] = parts;
  const expiresAt = Number(expiryRaw);

  if (!role || !random || !signature) return null;
  if (!Number.isFinite(expiresAt)) return null;
  if (expiresAt < Date.now()) return null;
  if (role !== "kitchen" && role !== "server" && role !== "admin") return null;

  const expected = await hmacHex(secret(), `${role}.${expiryRaw}.${random}`);

  // Constant-time comparison so the check does not leak the signature.
  if (!timingSafeEqualString(expected, signature)) return null;

  return { role, expiresAt };
}
