import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";

/**
 * Customer reads their own order.
 *
 * The customer proves which table they are at with the table's QR token.
 * The server looks the order up, checks that the order belongs to a table
 * with that token, and only then returns it. Without this check, knowing
 * any order id would let someone read every order in the restaurant.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // The order id comes from the path. The query string is accepted too,
    // so older links keep working.
    const orderId = params?.orderId || req.nextUrl.searchParams.get("id");
    const tableToken = req.nextUrl.searchParams.get("table");

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "missing_order" },
        { status: 400 }
      );
    }

    if (!tableToken) {
      return NextResponse.json(
        { ok: false, error: "missing_table_token" },
        { status: 401 }
      );
    }

    const supabase = createServerClientWithServiceRole();

    // Load the order together with the token of the table it belongs to.
    const { data: order, error } = await supabase
      .from("orders")
      .select("*, order_items(*, menu_items(*)), tables!inner(qr_token, table_number)")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    // The token must match the order's own table.
    const orderTable = (order as any).tables;
    if (!orderTable || orderTable.qr_token !== tableToken) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    // The bill for this order, if one was requested.
    const { data: bill } = await supabase
      .from("bills")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    return NextResponse.json({ ok: true, order, bill: bill ?? null });
  } catch (e: any) {
    console.error("[ORDER STATUS] error:", e?.message || e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
