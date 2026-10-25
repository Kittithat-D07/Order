import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";
import { getSchemaCaps } from "@/lib/supabase/schema";
import { reserveStock, restoreStock } from "@/lib/supabase/stock";

/**
 * Customer order placement.
 *
 * Two things changed here compared to the old client-side flow:
 *
 * 1. THE PRICE IS THE SERVER'S BUSINESS.
 *    The browser used to send `unit_price` and `subtotal` for every line,
 *    and the order total was the sum of whatever the browser said. A
 *    tampered request could order a 490฿ dish for 1฿. Now the server reads
 *    the real prices from menu_items and ignores anything the client sends.
 *
 * 2. STOCK IS RESERVED ATOMICALLY.
 *    The server calls decrement_stock() for every line. If any line is out
 *    of stock the whole order is rejected and the stock taken so far is
 *    given back, so two customers racing for the last portion cannot both
 *    win it.
 */

interface CartLine {
  menu_item_id?: string;
  quantity?: number;
  note?: string;
}

interface OrderBody {
  /** The table's QR token — the proof that the customer is at that table. */
  table?: string;
  items?: CartLine[];
  note?: string;
}

/**
 * Reading orders.
 *
 * This endpoint used to hand back every order in the restaurant to anyone
 * who asked for it — every table's food, every bill, the whole revenue
 * picture. Customers now read their own order through
 * /api/customer/order/[orderId] (which checks the table's QR token), and
 * staff read through /api/staff/orders (which requires a session).
 *
 * There is deliberately no GET here any more.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "not_found",
      message: "ใช้ /api/customer/order/[orderId] หรือ /api/staff/orders",
    },
    { status: 404 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OrderBody;
    const lines = Array.isArray(body.items) ? body.items : [];

    // The table is identified by its QR token, not by an id.
    //
    // With an id, anyone could post an order onto another table's bill.
    // With the token — which only exists in the QR code on that table —
    // an order can only ever land on the table the customer is sitting at.
    const tableToken = body.table;

    if (!tableToken) {
      return NextResponse.json(
        { ok: false, error: "missing_table" },
        { status: 400 }
      );
    }
    if (lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: "empty_cart" },
        { status: 400 }
      );
    }

    // Sanitise the lines.
    const cleanLines = lines
      .filter((l) => l.menu_item_id && typeof l.quantity === "number" && l.quantity > 0)
      .map((l) => ({
        menu_item_id: l.menu_item_id as string,
        quantity: Math.min(Math.floor(l.quantity as number), 99),
        note: typeof l.note === "string" ? l.note.slice(0, 200) : null,
      }));

    if (cleanLines.length === 0) {
      return NextResponse.json(
        { ok: false, error: "empty_cart" },
        { status: 400 }
      );
    }

    const supabase = createServerClientWithServiceRole();
    const caps = await getSchemaCaps(supabase);

    // Verify the table exists and is open.
    const { data: table } = await supabase
      .from("tables")
      .select(caps.tableActive ? "id, table_number, is_active" : "id, table_number")
      .eq("qr_token", tableToken)
      .maybeSingle();

    if (!table) {
      return NextResponse.json(
        { ok: false, error: "table_not_found" },
        { status: 404 }
      );
    }

    // A closed table refuses new orders.
    if (caps.tableActive && (table as any).is_active === false) {
      return NextResponse.json(
        {
          ok: false,
          error: "table_closed",
          message: "โต๊ะนี้ถูกปิดการให้บริการชั่วคราว กรุณาติดต่อพนักงาน",
        },
        { status: 403 }
      );
    }

    const tableId = (table as any).id as string;

    // Read the real prices from the database. Anything the client sent for
    // price is ignored on purpose.
    const menuItemIds = [...new Set(cleanLines.map((l) => l.menu_item_id))];
    const { data: menuItems, error: menuErr } = await supabase
      .from("menu_items")
      .select("id, name, price, is_available")
      .in("id", menuItemIds);

    if (menuErr || !menuItems) {
      console.error("[ORDERS] menu lookup failed:", menuErr?.message);
      return NextResponse.json(
        { ok: false, error: "menu_unavailable" },
        { status: 503 }
      );
    }

    const priceById = new Map(menuItems.map((m: any) => [m.id, m]));

    for (const line of cleanLines) {
      const item = priceById.get(line.menu_item_id) as any;
      if (!item) {
        return NextResponse.json(
          {
            ok: false,
            error: "item_not_found",
            message: "มีเมนูบางรายการไม่พบ กรุณาลองใหม่",
          },
          { status: 400 }
        );
      }
      if (!item.is_available) {
        return NextResponse.json(
          {
            ok: false,
            error: "item_unavailable",
            message: `"${item.name}" หมดชั่วคราว กรุณาเลือกเมนูอื่น`,
          },
          { status: 409 }
        );
      }
    }

    // Find an open order for this table, or start a new one.
    const { data: openOrders } = await supabase
      .from("orders")
      .select("id, session_number, status, paid_at")
      .eq("table_id", tableId)
      .is("paid_at", null)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1);

    const existing = openOrders && openOrders.length > 0 ? openOrders[0] : null;

    let orderId: string;
    let sessionNumber: number;

    if (existing) {
      orderId = existing.id;
      sessionNumber = existing.session_number ?? 1;
    } else {
      const nextSession = await nextSessionNumber(supabase, tableId);
      sessionNumber = nextSession;

      const { data: newOrder, error: orderErr } = await supabase
        .from("orders")
        .insert({
          table_id: tableId,
          status: "pending",
          note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
          session_number: nextSession,
        })
        .select("id, session_number")
        .single();

      if (orderErr || !newOrder) {
        console.error("[ORDERS] create failed:", orderErr?.message);
        return NextResponse.json(
          { ok: false, error: "order_failed" },
          { status: 500 }
        );
      }
      orderId = newOrder.id;
    }

    // Reserve stock for every line. If any line fails, undo the rest.
    const reserved: { menu_item_id: string; quantity: number }[] = [];

    for (const line of cleanLines) {
      const item = priceById.get(line.menu_item_id) as any;
      const result = await reserveStock(
        supabase,
        line.menu_item_id,
        line.quantity,
        item?.name,
        caps.stockRpc
      );

      if (!result.ok) {
        // Roll back what we already took.
        for (const r of reserved) {
          await restoreStock(supabase, r.menu_item_id, r.quantity, caps.stockRpc);
        }

        return NextResponse.json(
          {
            ok: false,
            error: "out_of_stock",
            message: `"${result.itemName ?? "เมนู"}" หมดเพียงเท่านี้ กรุณาปรับจำนวน`,
          },
          { status: 409 }
        );
      }

      reserved.push(line);
    }

    // Insert the items. Prices come from the database, not the client.
    const rows = cleanLines.map((line) => {
      const item = priceById.get(line.menu_item_id) as any;
      const price = Number(item.price);
      return {
        order_id: orderId,
        menu_item_id: line.menu_item_id,
        quantity: line.quantity,
        unit_price: price,
        note: line.note,
        subtotal: price * line.quantity,
      };
    });

    const { error: itemsErr } = await supabase.from("order_items").insert(rows);

    if (itemsErr) {
      // Give the stock back — the order never happened.
      for (const r of reserved) {
        await restoreStock(supabase, r.menu_item_id, r.quantity, caps.stockRpc);
      }

      console.error("[ORDERS] item insert failed:", itemsErr.message);
      return NextResponse.json(
        { ok: false, error: "order_failed" },
        { status: 500 }
      );
    }

    // The database trigger recalculates total_amount and amount_due. When
    // the trigger is not there yet (migration not applied), the server
    // writes the total itself — from the prices it read from the
    // database, never from anything the browser sent.
    const serverTotal = rows.reduce((sum, r) => sum + Number(r.subtotal), 0);

    const { data: storedOrder } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("id", orderId)
      .maybeSingle();

    if (storedOrder && Number(storedOrder.total_amount) !== serverTotal) {
      // The trigger is missing (or the total drifted). The server is the
      // only writer, so it fixes the number.
      await supabase
        .from("orders")
        .update({ total_amount: serverTotal })
        .eq("id", orderId);
    }

    const finalColumns = [
      "id",
      "total_amount",
      "session_number",
      ...(caps.amountDue ? ["amount_due"] : []),
      ...(caps.orderNumber ? ["order_number"] : []),
    ].join(", ");

    const { data: finalOrder } = await supabase
      .from("orders")
      .select(finalColumns)
      .eq("id", orderId)
      .single();

    return NextResponse.json({
      ok: true,
      order: finalOrder,
      orderId,
      sessionNumber,
    });
  } catch (e: any) {
    console.error("[ORDERS] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/** The next session number for a table (round 1, 2, 3...). */
async function nextSessionNumber(
  supabase: ReturnType<typeof createServerClientWithServiceRole>,
  tableId: string
): Promise<number> {
  const { data } = await supabase
    .from("orders")
    .select("session_number")
    .eq("table_id", tableId)
    .order("session_number", { ascending: false })
    .limit(1);

  const current = data && data.length > 0 ? Number(data[0].session_number ?? 0) : 0;
  return current + 1;
}
