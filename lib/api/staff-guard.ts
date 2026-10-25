import { NextRequest, NextResponse } from "next/server";
import { getStaffSession, StaffRole } from "@/lib/supabase/server-auth";

/**
 * Guard for staff-only API routes.
 *
 * Every privileged write goes through here. The check is server-side against
 * the HttpOnly session cookie, so it cannot be bypassed from the browser.
 */
export async function requireStaff(
  req: NextRequest,
  allowed: StaffRole[]
): Promise<
  | { ok: true; identity: { role: StaffRole; displayName: string; sessionId: string } }
  | { ok: false; response: NextResponse }
> {
  const session = await getStaffSession();

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "not_authenticated", message: "กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      ),
    };
  }

  if (!allowed.includes(session.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "forbidden",
          message: `หน้านี้ต้องใช้สิทธิ์: ${allowed.join(", ")}`,
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, identity: session };
}

/** JSON error helper that keeps the shape consistent across routes. */
export function apiError(message: string, status = 400, code = "error") {
  return NextResponse.json({ ok: false, error: code, message }, { status });
}
