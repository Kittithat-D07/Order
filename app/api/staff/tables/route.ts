import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireStaff, apiError } from "@/lib/api/staff-guard";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";
import { getSchemaCaps } from "@/lib/supabase/schema";

/**
 * Table management (admin only).
 *
 * Tables carry the QR token that customers scan, so this is sensitive:
 * creating, renaming or deleting a table changes what a customer's phone
 * can reach. It now requires a verified admin session on the server.
 */

interface TableBody {
  id?: string;
  table_number?: string;
  /** Delete this table and every order attached to it. */
  deleteWithOrders?: boolean;
}

export async function GET(req: NextRequest) {
  const guard = await requireStaff(req, ["admin", "server"]);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createServerClientWithServiceRole();
    const caps = await getSchemaCaps(supabase);

    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .order("table_number");

    if (error) {
      console.error("[STAFF TABLES] query failed:", error.message);
      return apiError("โหลดข้อมูลโต๊ะไม่สำเร็จ", 500, "db_error");
    }

    // How many orders each table has. The UI needs this to decide between
    // closing a table (safe) and deleting it (destroys the history).
    const { data: counts } = await supabase
      .from("orders")
      .select("table_id")
      .not("table_id", "is", null);

    const orderCountByTable = new Map<string, number>();
    for (const row of (counts ?? []) as any[]) {
      const key = row.table_id as string;
      orderCountByTable.set(key, (orderCountByTable.get(key) ?? 0) + 1);
    }

    const tables = ((data ?? []) as any[]).map((t) => ({
      ...t,
      order_count: orderCountByTable.get(t.id) ?? 0,
    }));

    return NextResponse.json({ ok: true, tables, tableActive: caps.tableActive });
  } catch (e: any) {
    console.error("[STAFF TABLES] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireStaff(req, ["admin"]);
  if (!guard.ok) return guard.response;

  try {
    const body = (await req.json()) as TableBody;

    const supabase = createServerClientWithServiceRole();

    // --- Rename an existing table ---
    if (body.id && body.table_number) {
      const name = body.table_number.trim();
      if (!name) return apiError("กรุณากรอกชื่อโต๊ะ", 400, "invalid_input");

      const { data, error } = await supabase
        .from("tables")
        .update({ table_number: name })
        .eq("id", body.id)
        .select()
        .single();

      if (error) {
        console.error("[STAFF TABLES] rename failed:", error.message);
        // A duplicate table number is the common case.
        if (error.code === "23505") {
          return apiError(`มีโต๊ะหมายเลข "${name}" อยู่แล้ว`, 409, "duplicate");
        }
        return apiError("เปลี่ยนชื่อโต๊ะไม่สำเร็จ", 500, "db_error");
      }

      return NextResponse.json({ ok: true, table: data });
    }

    // --- Create a new table ---
    const name = body.table_number?.trim();
    if (!name) return apiError("กรุณากรอกชื่อโต๊ะ", 400, "invalid_input");

    // The QR token is the secret in the QR code. It must be unguessable.
    const qrToken = randomBytes(16).toString("hex");

    const { data, error } = await supabase
      .from("tables")
      .insert({ table_number: name, qr_token: qrToken })
      .select()
      .single();

    if (error) {
      console.error("[STAFF TABLES] insert failed:", error.message);
      if (error.code === "23505") {
        return apiError(`มีโต๊ะหมายเลข "${name}" อยู่แล้ว`, 409, "duplicate");
      }
      return apiError("เพิ่มโต๊ะไม่สำเร็จ", 500, "db_error");
    }

    return NextResponse.json({ ok: true, table: data });
  } catch (e: any) {
    console.error("[STAFF TABLES] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}

/**
 * Close or delete a table.
 *
 * Deleting a table that still has orders would destroy the revenue
 * history — the orders cascade with it. So the safe default is to CLOSE
 * the table: it stops taking orders, the QR code stops working, and the
 * history stays intact for the reports.
 *
 * A hard delete is only allowed when the table has never been used.
 */
export async function DELETE(req: NextRequest) {
  const guard = await requireStaff(req, ["admin"]);
  if (!guard.ok) return guard.response;

  try {
    const id = req.nextUrl.searchParams.get("id");
    const mode = req.nextUrl.searchParams.get("mode") ?? "close";
    const force = req.nextUrl.searchParams.get("withOrders") === "true";

    if (!id) return apiError("ไม่พบ id", 400, "invalid_input");

    const supabase = createServerClientWithServiceRole();
    const caps = await getSchemaCaps(supabase);

    // Count what is attached to this table so the UI can report it.
    const { count: orderCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("table_id", id);

    // --- Close (the default, and the safe one) ---
    if (mode === "close") {
      if (!caps.tableActive) {
        return apiError(
          "ยังไม่รองรับการปิดโต๊ะ กรุณารัน migration ก่อน",
          503,
          "schema_not_ready"
        );
      }

      const { error } = await supabase
        .from("tables")
        .update({ is_active: false })
        .eq("id", id);

      if (error) {
        console.error("[STAFF TABLES] close failed:", error.message);
        return apiError("ปิดโต๊ะไม่สำเร็จ", 500, "db_error");
      }

      return NextResponse.json({
        ok: true,
        closed: true,
        deletedOrders: 0,
        orderCount: orderCount ?? 0,
      });
    }

    // --- Hard delete ---
    if ((orderCount ?? 0) > 0 && !force) {
      return apiError(
        `โต๊ะนี้มีออร์เดอร์ ${orderCount} รายการ การลบจะทำให้ประวัติยอดขายหายไป ` +
          "แนะนำให้ปิดโต๊ะแทน",
        409,
        "table_has_orders"
      );
    }

    if ((orderCount ?? 0) > 0 && force) {
      // Explicitly removing the orders keeps the revenue report honest
      // instead of leaving orphans behind.
      await supabase.from("orders").delete().eq("table_id", id);
    }

    const { error } = await supabase.from("tables").delete().eq("id", id);

    if (error) {
      console.error("[STAFF TABLES] delete failed:", error.message);
      return apiError("ลบโต๊ะไม่สำเร็จ", 500, "db_error");
    }

    return NextResponse.json({ ok: true, deletedOrders: orderCount ?? 0 });
  } catch (e: any) {
    console.error("[STAFF TABLES] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}
