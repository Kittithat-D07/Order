import { NextRequest, NextResponse } from "next/server";
import { requireStaff, apiError } from "@/lib/api/staff-guard";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";
import { getSchemaCaps } from "@/lib/supabase/schema";
import { reserveStock, restoreStock } from "@/lib/supabase/stock";

/**
 * Staff adds items to an existing order.
 *
 * Same rule as the customer flow: the price comes from the database, never
 * from the request body, and the total is recalculated by the database
 * trigger. A staff member on the floor cannot accidentally (or
 * deliberately) add a dish at the wrong price.
 */

interface AddItemsBody {
  orderId?: string;
  items?: {
    menu_item_id?: string;
    quantity?: number;
    note?: string;
  }[];
}

export async function POST(req: NextRequest) {
  const guard = await requireStaff(req, ["server", "admin"]);
  if (!guard.ok) return guard.response;

  try {
    const body = (await req.json()) as AddItemsBody;
    const orderId = body.orderId;
    const lines = Array.isArray(body.items) ? body.items : [];

    if (!orderId) {
      return apiError("ไม่พบออร์เดอร์", 400, "invalid_input");
    }
    if (lines.length === 0) {
      return apiError("ไม่มีรายการที่จะเพิ่ม", 400, "empty_cart");
    }

    const cleanLines = lines
      .filter((l) => l.menu_item_id && typeof l.quantity === "number" && l.quantity > 0)
      .map((l) => ({
        menu_item_id: l.menu_item_id as string,
        quantity: Math.min(Math.floor(l.quantity as number), 99),
        note: typeof l.note === "string" ? l.note.slice(0, 200) : null,
      }));

    if (cleanLines.length === 0) {
      return apiError("ไม่มีรายการที่จะเพิ่ม", 400, "empty_cart");
    }

    const supabase = createServerClientWithServiceRole();
    const caps = await getSchemaCaps(supabase);

    // The order must be open.
    const { data: order } = await supabase
      .from("orders")
      .select("id, status, paid_at")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      return apiError("ไม่พบออร์เดอร์", 404, "not_found");
    }
    if (order.paid_at) {
      return apiError("ออร์เดอร์นี้ปิดบิลแล้ว ไม่สามารถเพิ่มรายการ", 409, "order_closed");
    }

    // Read the real prices.
    const menuItemIds = [...new Set(cleanLines.map((l) => l.menu_item_id))];
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id, name, price, is_available")
      .in("id", menuItemIds);

    if (!menuItems) {
      return apiError("โหลดเมนูไม่สำเร็จ", 503, "menu_unavailable");
    }

    const priceById = new Map(menuItems.map((m: any) => [m.id, m]));

    for (const line of cleanLines) {
      const item = priceById.get(line.menu_item_id) as any;
      if (!item) {
        return apiError("มีเมนูบางรายการไม่พบ", 400, "item_not_found");
      }
      if (!item.is_available) {
        return apiError(
          `"${item.name}" หมดชั่วคราว`,
          409,
          "item_unavailable"
        );
      }
    }

    // Reserve stock, then insert the items.
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
        for (const r of reserved) {
          await restoreStock(supabase, r.menu_item_id, r.quantity, caps.stockRpc);
        }

        return apiError(
          `"${result.itemName ?? "เมนู"}" หมดเพียงเท่านี้`,
          409,
          "out_of_stock"
        );
      }

      reserved.push(line);
    }

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
      for (const r of reserved) {
        await restoreStock(supabase, r.menu_item_id, r.quantity, caps.stockRpc);
      }

      console.error("[STAFF ORDER ITEMS] insert failed:", itemsErr.message);
      return apiError("เพิ่มรายการไม่สำเร็จ", 500, "db_error");
    }

    // The item was added to a live order, so the kitchen needs to see it.
    await supabase
      .from("orders")
      .update({ status: "preparing", server_name: guard.identity.displayName })
      .eq("id", orderId);

    // The database trigger normally keeps the total in sync. Until the
    // migration is applied the server does it, using the prices it read
    // from the database.
    const { data: currentItems } = await supabase
      .from("order_items")
      .select("subtotal")
      .eq("order_id", orderId);

    const serverTotal = (currentItems ?? []).reduce(
      (sum: number, it: any) => sum + Number(it.subtotal ?? 0),
      0
    );

    const { data: storedOrder } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("id", orderId)
      .maybeSingle();

    if (storedOrder && Number(storedOrder.total_amount) !== serverTotal) {
      await supabase
        .from("orders")
        .update({ total_amount: serverTotal })
        .eq("id", orderId);
    }

    return NextResponse.json({ ok: true, added: rows.length });
  } catch (e: any) {
    console.error("[STAFF ORDER ITEMS] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}
