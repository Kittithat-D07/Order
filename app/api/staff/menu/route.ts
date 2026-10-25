import { NextRequest, NextResponse } from "next/server";
import { requireStaff, apiError } from "@/lib/api/staff-guard";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";

/**
 * Staff menu management.
 *
 * Moving menu writes off the browser client and onto the server is what
 * makes the RLS policies in 2026-10-24-access-control.sql meaningful:
 * the anon key can no longer change a price or delete a dish, because the
 * browser never talks to the database with it for write operations.
 *
 * Routes:
 *   PATCH  /api/staff/menu   → toggle availability or update stock
 *   POST   /api/staff/menu   → create a menu item
 *   DELETE /api/staff/menu   → delete a menu item
 */

interface MenuBody {
  id?: string;
  name?: string;
  description?: string | null;
  price?: number;
  category_id?: string;
  image_url?: string | null;
  display_order?: number;
  is_available?: boolean;
  stock_count?: number | null;
  low_stock_threshold?: number | null;
  prep_time_minutes?: number | null;
  is_signature?: boolean;
  allergens?: string[] | null;
}

export async function PATCH(req: NextRequest) {
  const guard = await requireStaff(req, ["admin", "kitchen"]);
  if (!guard.ok) return guard.response;

  try {
    const body = (await req.json()) as MenuBody;
    const { id } = body;

    if (!id) return apiError("ไม่พบ id ของเมนู", 400, "invalid_input");

    const supabase = createServerClientWithServiceRole();

    // Build the update payload from only the fields we allow to change.
    const payload: Record<string, unknown> = {};

    if (typeof body.is_available === "boolean") {
      payload.is_available = body.is_available;
      payload.marked_unavailable_at = body.is_available
        ? null
        : new Date().toISOString();
      payload.marked_unavailable_by = body.is_available
        ? null
        : guard.identity.displayName;
      if (body.is_available) {
        payload.unavailable_reason = null;
      }
    }

    if (typeof body.stock_count === "number") {
      if (body.stock_count < 0) {
        return apiError("จำนวนสต็อกต้องไม่ติดลบ", 400, "invalid_input");
      }
      payload.stock_count = body.stock_count;
      // Stock hitting zero takes the dish off the shelf automatically.
      if (body.stock_count === 0) {
        payload.is_available = false;
        payload.unavailable_reason = "สินค้าหมด";
        payload.marked_unavailable_at = new Date().toISOString();
        payload.marked_unavailable_by = guard.identity.displayName;
      } else if (body.is_available === undefined) {
        // Restocking a dish that was only off because it ran out brings it
        // back, but a dish a manager deliberately paused stays paused.
        const { data: current } = await supabase
          .from("menu_items")
          .select("unavailable_reason, is_available")
          .eq("id", id)
          .maybeSingle();

        if (current && !current.is_available && current.unavailable_reason === "สินค้าหมด") {
          payload.is_available = true;
          payload.unavailable_reason = null;
          payload.marked_unavailable_at = null;
          payload.marked_unavailable_by = null;
        }
      }
    }

    if (typeof body.low_stock_threshold === "number") {
      payload.low_stock_threshold = body.low_stock_threshold;
    }
    if (typeof body.prep_time_minutes === "number") {
      payload.prep_time_minutes = body.prep_time_minutes;
    }

    if (Object.keys(payload).length === 0) {
      return apiError("ไม่มีข้อมูลที่จะอัปเดต", 400, "nothing_to_update");
    }

    const { data, error } = await supabase
      .from("menu_items")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[STAFF MENU] update failed:", error.message);
      return apiError("อัปเดตไม่สำเร็จ", 500, "db_error");
    }

    return NextResponse.json({ ok: true, item: data });
  } catch (e: any) {
    console.error("[STAFF MENU] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireStaff(req, ["admin"]);
  if (!guard.ok) return guard.response;

  try {
    const body = (await req.json()) as MenuBody;

    if (!body.name?.trim()) {
      return apiError("กรุณากรอกชื่อเมนู", 400, "invalid_input");
    }
    if (typeof body.price !== "number" || body.price < 0) {
      return apiError("ราคาไม่ถูกต้อง", 400, "invalid_input");
    }
    if (!body.category_id) {
      return apiError("กรุณาเลือกหมวดหมู่", 400, "invalid_input");
    }

    const supabase = createServerClientWithServiceRole();

    const payload = {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      price: body.price,
      category_id: body.category_id,
      image_url: body.image_url?.trim() || null,
      display_order: body.display_order ?? 0,
      is_available: body.is_available ?? true,
      stock_count: body.stock_count ?? -1,
      low_stock_threshold: body.low_stock_threshold ?? null,
      prep_time_minutes: body.prep_time_minutes ?? null,
      is_signature: body.is_signature ?? false,
      allergens: body.allergens ?? null,
    };

    const { data, error } = await supabase
      .from("menu_items")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[STAFF MENU] insert failed:", error.message);
      return apiError("เพิ่มเมนูไม่สำเร็จ", 500, "db_error");
    }

    return NextResponse.json({ ok: true, item: data });
  } catch (e: any) {
    console.error("[STAFF MENU] error:", e?.message || e);
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
    const { error } = await supabase.from("menu_items").delete().eq("id", id);

    if (error) {
      console.error("[STAFF MENU] delete failed:", error.message);
      return apiError("ลบไม่สำเร็จ", 500, "db_error");
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[STAFF MENU] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}
