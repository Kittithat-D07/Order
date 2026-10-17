import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

/**
 * Inventory endpoint: list low-stock + allow stock updates.
 * Auto-marks item as unavailable when stock reaches 0.
 */

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, name, stock_count, low_stock_threshold, is_available, categories:category_id(name)")
      .order("stock_count", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
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
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { itemId, stock_count } = await req.json();
    if (!itemId || typeof stock_count !== "number" || stock_count < 0) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    const supabase = createClient();
    // Auto-mark unavailable when stock = 0
    const is_available = stock_count > 0;

    const { data, error } = await supabase
      .from("menu_items")
      .update({
        stock_count,
        is_available,
        marked_unavailable_at: is_available ? null : new Date().toISOString(),
        marked_unavailable_by: is_available ? null : "auto-stock",
      })
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
