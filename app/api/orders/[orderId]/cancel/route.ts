import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";
import { getSchemaCaps } from "@/lib/supabase/schema";
import { restoreStock } from "@/lib/supabase/stock";

/**
 * Customer cancel order endpoint.
 *
 * Rules:
 * - Only pending orders can be cancelled (not yet preparing)
 * - Must be within 5 minutes of order creation
 * - Stock is restored for cancelled items
 *
 * The stock restore is what makes this correct: without it, a customer
 * could cancel ten orders and exhaust the kitchen's stock of a dish
 * without ever receiving it.
 *
 * The request must carry the table's QR token, and the server checks that
 * the order belongs to that table. Otherwise, anyone who learned an order
 * id could cancel someone else's order.
 */

const CANCEL_WINDOW_MIN = 5;

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const body = await req.json().catch(() => ({}));
    const reason: string = body.reason || "ลูกค้ายกเลิก";
    const tableToken: string | undefined = body.table;

    if (!tableToken) {
      return NextResponse.json(
        { ok: false, error: "missing_table_token" },
        { status: 401 }
      );
    }

    const supabase = createServerClientWithServiceRole();
    const caps = await getSchemaCaps(supabase);

    // Load order with items
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`*, order_items (*), tables!inner(qr_token)`)
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        { ok: false, error: "ไม่พบออร์เดอร์" },
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

    if (order.status === "cancelled") {
      return NextResponse.json(
        { ok: false, error: "ออร์เดอร์ถูกยกเลิกแล้ว" },
        { status: 400 }
      );
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: "ไม่สามารถยกเลิกได้ เนื่องจากครัวเริ่มทำแล้ว" },
        { status: 400 }
      );
    }

    // Check time window
    const createdAt = new Date(order.created_at).getTime();
    const now = Date.now();
    const diffMin = (now - createdAt) / 1000 / 60;
    if (diffMin > CANCEL_WINDOW_MIN) {
      return NextResponse.json(
        { ok: false, error: `ยกเลิกได้ภายใน ${CANCEL_WINDOW_MIN} นาทีหลังสั่ง` },
        { status: 400 }
      );
    }

    // Update order status
    const updatePayload: Record<string, unknown> = { status: "cancelled" };

    // The audit columns only exist once the migration has been applied.
    if (caps.cancellation) {
      updatePayload.cancelled_at = new Date().toISOString();
      updatePayload.cancel_reason = reason;
    }

    const { error: updateErr } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (updateErr) {
      return NextResponse.json(
        { ok: false, error: "อัปเดตไม่สำเร็จ" },
        { status: 500 }
      );
    }

    // Update all items to cancelled
    await supabase
      .from("order_items")
      .update({ status: "cancelled" })
      .eq("order_id", orderId);

    // Give the stock back. Only items that were not already cancelled are
    // returned, so a double cancel cannot inflate the stock.
    const items = (order.order_items ?? []) as any[];
    const restorable = items.filter((i) => i.status !== "cancelled");

    for (const item of restorable) {
      await restoreStock(
        supabase,
        item.menu_item_id,
        item.quantity,
        caps.stockRpc
      );
    }

    return NextResponse.json({
      ok: true,
      restoredItems: restorable.length,
    });
  } catch (e: any) {
    console.error("[CANCEL ORDER] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
