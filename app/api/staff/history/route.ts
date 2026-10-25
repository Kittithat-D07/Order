import { NextRequest, NextResponse } from "next/server";
import { requireStaff, apiError } from "@/lib/api/staff-guard";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";

/**
 * Audit trail of menu changes.
 *
 * The history records who changed which dish, when and how. It was
 * readable by anyone with the anon key, which meant the audit log was not
 * an audit log — it was a public feed of the restaurant's internal
 * activity. It now requires an admin session.
 */

export async function GET(req: NextRequest) {
  const guard = await requireStaff(req, ["admin"]);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 200), 500);

    const supabase = createServerClientWithServiceRole();
    const { data, error } = await supabase
      .from("menu_item_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[STAFF HISTORY] query failed:", error.message);
      return apiError("โหลดประวัติไม่สำเร็จ", 500, "db_error");
    }

    return NextResponse.json({ ok: true, entries: data ?? [] });
  } catch (e: any) {
    console.error("[STAFF HISTORY] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}
