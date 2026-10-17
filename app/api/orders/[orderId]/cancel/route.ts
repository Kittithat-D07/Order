import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

/**
 * Customer cancel order endpoint.
 * 
 * Rules:
 * - Only pending orders can be cancelled (not yet preparing)
 * - Must be within 5 minutes of order creation
 * - Stock is restored for cancelled items
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

    const supabase = createClient();

    // Load order with items
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`*, order_items (*)`)
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        { ok: false, error: "ไม่พบออร์เดอร์" },
        { status: 404 }
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
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
      })
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

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[CANCEL ORDER] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
