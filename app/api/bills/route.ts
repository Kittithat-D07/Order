import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";
import { getSchemaCaps } from "@/lib/supabase/schema";

/**
 * Customer requests the bill.
 *
 * The bill amount is taken from the order, never from the request body, so
 * a customer cannot ask for a bill that says 1 baht.
 *
 * The request also has to carry the table's QR token, and the server checks
 * that the order belongs to that table. Without that check, anyone who
 * learned an order id could pull up any table's bill.
 */

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      orderId?: string;
      table?: string;
    };
    const orderId = body.orderId;
    const tableToken = body.table;

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
    const caps = await getSchemaCaps(supabase);

    const orderColumns = [
      "id",
      "total_amount",
      "paid_at",
      "status",
      "tables!inner(qr_token)",
      ...(caps.amountDue ? ["amount_due"] : []),
    ].join(", ");

    const { data: order } = await supabase
      .from("orders")
      .select(orderColumns)
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
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

    const orderRow = order as any;

    if (orderRow.paid_at) {
      return NextResponse.json(
        { ok: false, error: "already_paid" },
        { status: 409 }
      );
    }

    // The bill table has a unique constraint on order_id, so asking twice
    // returns the existing bill rather than creating a duplicate.
    const { data: existing } = await supabase
      .from("bills")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, bill: existing, alreadyRequested: true });
    }

    const amountDue = Number(
      (order as any).amount_due ?? (order as any).total_amount ?? 0
    );

    const { data: bill, error } = await supabase
      .from("bills")
      .insert({
        order_id: orderId,
        total_amount: amountDue,
      })
      .select()
      .single();

    if (error) {
      // A concurrent request may have won the race.
      if (error.code === "23505") {
        const { data: raced } = await supabase
          .from("bills")
          .select("*")
          .eq("order_id", orderId)
          .maybeSingle();

        if (raced) {
          return NextResponse.json({ ok: true, bill: raced, alreadyRequested: true });
        }
      }

      console.error("[BILL REQUEST] insert failed:", error.message);
      return NextResponse.json(
        { ok: false, error: "bill_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, bill });
  } catch (e: any) {
    console.error("[BILL REQUEST] error:", e?.message || e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
