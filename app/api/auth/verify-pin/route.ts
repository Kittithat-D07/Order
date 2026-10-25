import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import {
  createStaffSession,
  revokeStaffSession,
  getStaffSession,
  createServerClientWithServiceRole,
  StaffRole,
} from "@/lib/supabase/server-auth";

/**
 * Server-side PIN verification with rate limiting.
 *
 * Security:
 * - PINs stored as bcrypt hashes in DB (never plaintext)
 * - Rate limit: 5 attempts / 15 min per IP+role
 * - Returns display name only on success
 * - Audit logged in staff_login_attempts
 *
 * On success the server issues an HttpOnly session cookie. The browser
 * never receives the raw token, so it cannot be read or forged from
 * JavaScript. That cookie is what authorises staff writes from here on.
 */

interface Body {
  role: StaffRole;
  pin: string;
}

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// In-memory rate limit (production: use Redis/Upstash)
const attempts = new Map<string, number[]>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const list = attempts.get(key) ?? [];
  const recent = list.filter((t) => now - t < RATE_WINDOW_MS);
  attempts.set(key, recent);
  return recent.length >= RATE_LIMIT;
}

function recordAttempt(key: string) {
  const list = attempts.get(key) ?? [];
  list.push(Date.now());
  attempts.set(key, list);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const { role, pin } = body;

    // Validate
    if (!role || !pin) {
      return NextResponse.json(
        { ok: false, error: "missing_credentials" },
        { status: 400 }
      );
    }
    if (typeof pin !== "string" || pin.length < 4 || pin.length > 8) {
      return NextResponse.json(
        { ok: false, error: "invalid_pin_format" },
        { status: 400 }
      );
    }
    if (!["kitchen", "server", "admin"].includes(role)) {
      return NextResponse.json({ ok: false, error: "invalid_role" }, { status: 400 });
    }

    // Rate limit by IP + role
    const ip = getClientIp(req);
    const rateKey = `${ip}:${role}`;
    if (isRateLimited(rateKey)) {
      return NextResponse.json(
        { ok: false, error: "rate_limited", retryAfter: RATE_WINDOW_MS / 1000 },
        { status: 429 }
      );
    }

    // Read the PIN hash.
    //
    // The service role key is preferred: it means the hashes never need to
    // be readable by the public anon key, which is what lets the lockdown
    // migration remove the public SELECT policy on staff_pins. Without a
    // service key we fall back to the anon key — the restaurant still
    // works, but the hashes stay reachable until the key is added.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = serviceKey
      ? createServerClientWithServiceRole()
      : createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          { auth: { persistSession: false } }
        );

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error("[PIN VERIFY] missing env", {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });
      return NextResponse.json(
        { ok: false, error: "server_misconfigured" },
        { status: 500 }
      );
    }

    // Get the PIN hash + display name
    const { data, error } = await supabase
      .from("staff_pins")
      .select("pin_hash, display_name")
      .eq("role", role)
      .single();

    if (error || !data) {
      console.error("[PIN VERIFY] staff_pins query error:", error);
      return NextResponse.json({ ok: false, error: "role_not_found" }, { status: 404 });
    }

    // Verify PIN
    const ok = await bcrypt.compare(pin, data.pin_hash);

    // Log attempt (success or failure).
    // The audit write goes through the service role client so it works
    // whether or not the anon key has INSERT rights on the table. If the
    // write fails the login still succeeds — auditing must never lock the
    // kitchen out of service.
    await createServerClientWithServiceRole()
      .from("staff_login_attempts")
      .insert({
        role,
        success: ok,
        ip_address: ip,
      })
      .then(({ error: logError }) => {
        if (logError) {
          console.warn("[PIN VERIFY] attempt log skipped:", logError.message);
        }
      });

    if (!ok) {
      recordAttempt(rateKey);
      return NextResponse.json({ ok: false, error: "invalid_pin" }, { status: 401 });
    }

    // Clear attempts on success
    attempts.delete(rateKey);

    // Issue a real, HttpOnly session. This is the real security boundary:
    // the staff role now lives in a signed, server-side session instead of
    // a localStorage value anyone can edit from the console.
    try {
      await createStaffSession(role, data.display_name, {
        ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
      });
    } catch (e) {
      console.error("[PIN VERIFY] session creation failed:", e);
      return NextResponse.json(
        { ok: false, error: "session_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      displayName: data.display_name,
      role,
    });
  } catch (e: any) {
    console.error("[PIN VERIFY] error:", e?.message || e, e?.stack);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}

/** Log out — revoke the server session and clear the cookie. */
export async function DELETE() {
  try {
    await revokeStaffSession();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[PIN VERIFY] logout error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/** Who am I? Used by the client to know whether a session is still alive. */
export async function GET() {
  try {
    const session = await getStaffSession();
    if (!session) {
      return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      authenticated: true,
      role: session.role,
      displayName: session.displayName,
    });
  } catch (e: any) {
    console.error("[PIN VERIFY] session check error:", e?.message || e);
    return NextResponse.json({ ok: false, authenticated: false }, { status: 500 });
  }
}
