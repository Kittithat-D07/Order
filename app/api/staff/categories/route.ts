import { NextRequest, NextResponse } from "next/server";
import { requireStaff, apiError } from "@/lib/api/staff-guard";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";

/**
 * Menu category management (admin only).
 *
 * Deleting a category cascades to its menu items, so it is guarded behind
 * an explicit admin session on the server.
 */

interface CategoryBody {
  id?: string;
  name?: string;
  display_order?: number;
}

export async function POST(req: NextRequest) {
  const guard = await requireStaff(req, ["admin"]);
  if (!guard.ok) return guard.response;

  try {
    const body = (await req.json()) as CategoryBody;
    const name = body.name?.trim();

    if (!name) {
      return apiError("กรุณากรอกชื่อหมวดหมู่", 400, "invalid_input");
    }

    const supabase = createServerClientWithServiceRole();

    const { data: existing } = await supabase
      .from("menu_categories")
      .select("id, display_order")
      .order("display_order", { ascending: false })
      .limit(1);

    const nextOrder =
      body.display_order ??
      (existing && existing.length > 0 ? Number(existing[0].display_order ?? 0) + 1 : 0);

    const { data, error } = await supabase
      .from("menu_categories")
      .insert({ name, display_order: nextOrder })
      .select()
      .single();

    if (error) {
      console.error("[STAFF CATEGORIES] insert failed:", error.message);
      return apiError("เพิ่มหมวดหมู่ไม่สำเร็จ", 500, "db_error");
    }

    return NextResponse.json({ ok: true, category: data });
  } catch (e: any) {
    console.error("[STAFF CATEGORIES] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireStaff(req, ["admin"]);
  if (!guard.ok) return guard.response;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return apiError("ไม่พบ id", 400, "invalid_input");

    const supabase = createServerClientWithServiceRole();

    // Check what will be lost before deleting, so the UI can warn properly.
    const { count } = await supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    const { error } = await supabase.from("menu_categories").delete().eq("id", id);

    if (error) {
      console.error("[STAFF CATEGORIES] delete failed:", error.message);
      return apiError("ลบหมวดหมู่ไม่สำเร็จ", 500, "db_error");
    }

    return NextResponse.json({ ok: true, deletedItems: count ?? 0 });
  } catch (e: any) {
    console.error("[STAFF CATEGORIES] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}
