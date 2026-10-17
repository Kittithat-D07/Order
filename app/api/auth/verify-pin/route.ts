import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

/**
 * Server-side PIN verification with rate limiting.
 *
 * Security:
 * - PINs stored as bcrypt hashes in DB (never plaintext)
 * - Rate limit: 5 attempts / 15 min per IP+role
 * - Returns display name only on success
 * - Audit logged in staff_login_attempts
 */

interface Body {
  role: "kitchen" | "server" | "admin";
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

    // Use service-role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Get the PIN hash + display name
    const { data, error } = await supabase
      .from("staff_pins")
      .select("pin_hash, display_name")
      .eq("role", role)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "role_not_found" }, { status: 404 });
    }

    // Verify PIN
    const ok = await bcrypt.compare(pin, data.pin_hash);

    // Log attempt (success or failure)
    await supabase.from("staff_login_attempts").insert({
      role,
      success: ok,
      ip_address: ip,
    });

    if (!ok) {
      recordAttempt(rateKey);
      return NextResponse.json({ ok: false, error: "invalid_pin" }, { status: 401 });
    }

    // Clear attempts on success
    attempts.delete(rateKey);

    return NextResponse.json({
      ok: true,
      displayName: data.display_name,
    });
  } catch (e: any) {
    console.error("[PIN VERIFY] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
