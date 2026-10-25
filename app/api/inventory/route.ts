import { NextRequest, NextResponse } from "next/server";
import { requireStaff, apiError } from "@/lib/api/staff-guard";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";

/**
 * Inventory endpoint: list low-stock + allow stock updates.
 * Auto-marks item as unavailable when stock reaches 0.
 *
 * The stock write requires a staff session. Previously any anonymous
 * request could set the stock of any dish to any number.
 */

export async function GET(req: NextRequest) {
  const guard = await requireStaff(req, ["kitchen", "server", "admin"]);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createServerClientWithServiceRole();
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, name, stock_count, low_stock_threshold, is_available, categories:category_id(name)")
      .order("stock_count", { ascending: true });

    if (error) {
      return apiError("โหลดข้อมูลสต็อกไม่สำเร็จ", 500, "db_error");
    }

    const lowStock = (data || []).filter(
      (i: any) => i.stock_count > 0 && i.stock_count <= i.low_stock_threshold
    );
    const outOfStock = (data || []).filter((i: any) => i.stock_count === 0);

    return NextResponse.json({
      ok: true,
      lowStock,
      outOfStock,
      total: data?.length ?? 0,
    });
  } catch (e: any) {
    console.error("[INVENTORY] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireStaff(req, ["kitchen", "server", "admin"]);
  if (!guard.ok) return guard.response;

  try {
    const { itemId, stock_count } = await req.json();

    if (!itemId || typeof stock_count !== "number" || stock_count < 0) {
      return apiError("ข้อมูลไม่ถูกต้อง", 400, "invalid_input");
    }

    const supabase = createServerClientWithServiceRole();

    // Auto-mark unavailable when stock = 0.
    const isAvailable = stock_count > 0;

    const { data, error } = await supabase
      .from("menu_items")
      .update({
        stock_count,
        is_available: isAvailable,
        marked_unavailable_at: isAvailable ? null : new Date().toISOString(),
        marked_unavailable_by: isAvailable ? null : guard.identity.displayName,
      })
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      console.error("[INVENTORY] update failed:", error.message);
      return apiError("อัปเดตสต็อกไม่สำเร็จ", 500, "db_error");
    }

    return NextResponse.json({ ok: true, item: data });
  } catch (e: any) {
    console.error("[INVENTORY] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}
