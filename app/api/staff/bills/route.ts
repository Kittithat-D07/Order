import { NextRequest, NextResponse } from "next/server";
import { requireStaff, apiError } from "@/lib/api/staff-guard";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";

/**
 * Staff read of the requested bills.
 *
 * Bills used to be readable by anyone who knew the URL. Now it needs a
 * staff session.
 */
export async function GET(req: NextRequest) {
  const guard = await requireStaff(req, ["server", "admin"]);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createServerClientWithServiceRole();
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[STAFF BILLS] query failed:", error.message);
      return apiError("โหลดบิลไม่สำเร็จ", 500, "db_error");
    }

    return NextResponse.json({ ok: true, bills: data ?? [] });
  } catch (e: any) {
    console.error("[STAFF BILLS] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}

/**
 * Mark a bill as printed.
 *
 * The bill page is a staff screen. Marking the bill printed is a write, so
 * it goes through the server rather than straight from the browser.
 */
export async function PATCH(req: NextRequest) {
  const guard = await requireStaff(req, ["server", "admin"]);
  if (!guard.ok) return guard.response;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      billId?: string;
      orderId?: string;
    };

    if (!body.billId && !body.orderId) {
      return apiError("ไม่พบเลขบิล", 400, "invalid_input");
    }

    const supabase = createServerClientWithServiceRole();

    let query = supabase
      .from("bills")
      .update({ printed_at: new Date().toISOString() });

    if (body.billId) {
      query = query.eq("id", body.billId);
    } else {
      query = query.eq("order_id", body.orderId!);
    }

    const { error } = await query;

    if (error) {
      console.error("[STAFF BILLS] print failed:", error.message);
      return apiError("บันทึกการพิมพ์ไม่สำเร็จ", 500, "db_error");
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[STAFF BILLS] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}
