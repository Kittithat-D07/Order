import { NextRequest, NextResponse } from "next/server";
import { requireStaff, apiError } from "@/lib/api/staff-guard";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";
import { getSchemaCaps } from "@/lib/supabase/schema";
import type { OrderItemStatus } from "@/lib/types";

/**
 * Staff order operations: reading orders, item status, claiming, payment.
 *
 * These used to be direct client-side writes with the anon key. Any
 * customer could have called them. Now the server checks the staff session
 * first, and derives the order's overall status itself so the kitchen and
 * the server screens can never disagree about an order.
 */

interface ItemStatusBody {
  itemId?: string;
  status?: OrderItemStatus;
}

interface ClaimBody {
  orderId?: string;
  serverName?: string;
}

interface PayBody {
  orderId?: string;
  method?: "cash" | "transfer";
  cashReceived?: number | null;
}

const ITEM_STATUSES: OrderItemStatus[] = [
  "pending",
  "preparing",
  "ready",
  "served",
  "cancelled",
];

/**
 * GET /api/staff/orders
 *
 * Query params:
 *   mode     = active | done | all
 *   id       = a single order id
 *   limit    = max rows (default 200)
 */
export async function GET(req: NextRequest) {
  const guard = await requireStaff(req, ["kitchen", "server", "admin"]);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") ?? "all";
    const id = searchParams.get("id");
    const limit = Math.min(Number(searchParams.get("limit") ?? 200), 500);

    const supabase = createServerClientWithServiceRole();

    if (id) {
      const { data: order, error } = await supabase
        .from("orders")
        .select("*, tables:table_id (*), order_items (*, menu_items (*))")
        .eq("id", id)
        .maybeSingle();

      if (error || !order) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }

      const { data: bill } = await supabase
        .from("bills")
        .select("*")
        .eq("order_id", id)
        .maybeSingle();

      return NextResponse.json({ ok: true, order, bill: bill ?? null });
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*, tables:table_id (*), order_items (*, menu_items (*))")
      .order("created_at", { ascending: mode === "active" })
      .limit(limit);

    if (error) {
      console.error("[STAFF ORDERS] query failed:", error.message);
      return apiError("โหลดออร์เดอร์ไม่สำเร็จ", 500, "db_error");
    }

    const all = (data ?? []) as any[];

    // The kitchen board cares about items, not orders.
    const filtered =
      mode === "active"
        ? all.filter((o) =>
            (o.order_items ?? []).some(
              (it: any) => it.status !== "served" && it.status !== "cancelled"
            )
          )
        : mode === "done"
          ? all.filter(
              (o) =>
                (o.order_items ?? []).length > 0 &&
                (o.order_items ?? []).every(
                  (it: any) => it.status === "served" || it.status === "cancelled"
                )
            )
          : all;

    return NextResponse.json({ ok: true, orders: filtered });
  } catch (e: any) {
    console.error("[STAFF ORDERS] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}

/** Derive the order's overall status from its items. */
async function syncOrderStatus(
  supabase: ReturnType<typeof createServerClientWithServiceRole>,
  orderId: string
) {
  const { data: items } = await supabase
    .from("order_items")
    .select("status")
    .eq("order_id", orderId);

  if (!items || items.length === 0) return;

  const allServed = items.every(
    (i: any) => i.status === "served" || i.status === "cancelled"
  );
  const anyStarted = items.some(
    (i: any) =>
      i.status === "preparing" || i.status === "ready" || i.status === "served"
  );

  const orderStatus: "pending" | "preparing" | "served" = allServed
    ? "served"
    : anyStarted
      ? "preparing"
      : "pending";

  await supabase.from("orders").update({ status: orderStatus }).eq("id", orderId);
}

/** Move one order item to a new status, claim an order, or take payment. */
export async function PATCH(req: NextRequest) {
  const guard = await requireStaff(req, ["kitchen", "server", "admin"]);
  if (!guard.ok) return guard.response;

  try {
    const body = (await req.json()) as ItemStatusBody & ClaimBody & PayBody;

    // --- Record payment (server/admin) ---
    if (body.orderId && body.method) {
      const guardPay = await requireStaff(req, ["server", "admin"]);
      if (!guardPay.ok) return guardPay.response;

      const supabase = createServerClientWithServiceRole();
      const caps = await getSchemaCaps(supabase);

      const orderColumns = [
        "id",
        "total_amount",
        ...(caps.amountDue ? ["amount_due"] : []),
      ].join(", ");

      const { data: order } = await supabase
        .from("orders")
        .select(orderColumns)
        .eq("id", body.orderId)
        .maybeSingle();

      if (!order) return apiError("ไม่พบออร์เดอร์", 404, "not_found");

      const amountDue = Number(
        (order as any).amount_due ?? (order as any).total_amount ?? 0
      );

      const updatePayload: Record<string, unknown> = {
        paid_at: new Date().toISOString(),
        status: "served",
      };

      // The payment columns only exist once the migration has been applied.
      if (caps.paymentMethod) {
        updatePayload.payment_method = body.method;
      }
      if (caps.cashReceived && body.method === "cash") {
        updatePayload.cash_received = body.cashReceived ?? null;
      }

      const { error: orderErr } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", body.orderId);

      if (orderErr) {
        console.error("[STAFF ORDER] payment failed:", orderErr.message);
        return apiError("บันทึกการชำระเงินไม่สำเร็จ", 500, "db_error");
      }

      // Close the bill if one was requested.
      await supabase
        .from("bills")
        .update({ printed_at: new Date().toISOString() })
        .eq("order_id", body.orderId)
        .is("printed_at", null);

      const change =
        body.method === "cash" && body.cashReceived != null
          ? body.cashReceived - amountDue
          : null;

      return NextResponse.json({ ok: true, amountDue, change });
    }

    // --- Claim an order (server) ---
    if (body.orderId && body.serverName) {
      const supabase = createServerClientWithServiceRole();
      const { error } = await supabase
        .from("orders")
        .update({
          server_name: body.serverName,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", body.orderId);

      if (error) {
        console.error("[STAFF ORDER] claim failed:", error.message);
        return apiError("รับออร์เดอร์ไม่สำเร็จ", 500, "db_error");
      }
      return NextResponse.json({ ok: true });
    }

    // --- Update one item's status ---
    if (!body.itemId || !body.status) {
      return apiError("ข้อมูลไม่ครบ", 400, "invalid_input");
    }
    if (!ITEM_STATUSES.includes(body.status)) {
      return apiError("สถานะไม่ถูกต้อง", 400, "invalid_status");
    }

    const supabase = createServerClientWithServiceRole();

    const { data: item, error: itemErr } = await supabase
      .from("order_items")
      .update({
        status: body.status,
        served_by:
          body.status === "served" ? guard.identity.displayName : null,
        served_at: body.status === "served" ? new Date().toISOString() : null,
      })
      .eq("id", body.itemId)
      .select("order_id")
      .single();

    if (itemErr || !item) {
      console.error("[STAFF ORDER] item update failed:", itemErr?.message);
      return apiError("อัปเดตสถานะไม่สำเร็จ", 500, "db_error");
    }

    await syncOrderStatus(supabase, item.order_id);

    return NextResponse.json({ ok: true, orderId: item.order_id });
  } catch (e: any) {
    console.error("[STAFF ORDER] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}
