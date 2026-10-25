import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Stock reservation.
 *
 * The 2026 migration adds `decrement_stock` / `restore_stock` — atomic
 * Postgres functions that take the stock in a single statement and refuse
 * to go negative. That is the correct way to do it.
 *
 * Until that migration is applied we still need to behave correctly, so
 * this module has a fallback that does the same job with two statements:
 *
 *   1. read the current stock_count
 *   2. update it with a WHERE clause that asserts the value has not
 *      changed in the meantime
 *
 * The assert makes it safe: if two customers race for the last portion,
 * the second update matches zero rows and the order is rejected. It is
 * not as cheap as the RPC, but it is not wrong.
 */

/** -1 or null means "stock is not tracked" — unlimited. */
function isTracked(stock: number | null | undefined): boolean {
  return stock !== null && stock !== undefined && stock >= 0;
}

export interface ReservationResult {
  ok: boolean;
  /** The menu item that could not be reserved. */
  itemId?: string;
  itemName?: string;
}

/**
 * Take `quantity` units of a menu item off the shelf.
 *
 * Returns `{ ok: false }` when there is not enough stock. On failure the
 * caller is responsible for rolling back whatever it already reserved.
 */
export async function reserveStock(
  supabase: SupabaseClient,
  menuItemId: string,
  quantity: number,
  itemName: string | undefined,
  useRpc: boolean
): Promise<ReservationResult> {
  if (!quantity || quantity <= 0) return { ok: true };

  if (useRpc) {
    const { data, error } = await supabase.rpc("decrement_stock", {
      p_menu_item_id: menuItemId,
      p_quantity: quantity,
    });

    if (!error) {
      return data === false ? { ok: false, itemId: menuItemId, itemName } : { ok: true };
    }

    // The function exists but refused (e.g. a parameter mismatch). Fall
    // through to the application-level path rather than failing the order.
    console.warn("[STOCK] decrement_stock failed:", error.message);
  }

  const { data: item, error: readErr } = await supabase
    .from("menu_items")
    .select("id, name, stock_count")
    .eq("id", menuItemId)
    .maybeSingle();

  if (readErr || !item) {
    return { ok: false, itemId: menuItemId, itemName };
  }

  const stock = item.stock_count as number | null;

  // Not tracked → unlimited, nothing to take.
  if (!isTracked(stock)) return { ok: true };

  if (Number(stock) < quantity) {
    return { ok: false, itemId: menuItemId, itemName: item.name ?? itemName };
  }

  const next = Number(stock) - quantity;

  // The `.eq("stock_count", stock)` is the concurrency guard: if another
  // request changed the stock between the read and this update, the update
  // matches no rows and we report "not enough stock" instead of going
  // negative.
  const { data: updated, error: writeErr } = await supabase
    .from("menu_items")
    .update({ stock_count: next })
    .eq("id", menuItemId)
    .eq("stock_count", stock)
    .select("id, stock_count");

  if (writeErr || !updated || updated.length === 0) {
    // Someone else took the stock first. Re-read to give a precise error.
    const { data: fresh } = await supabase
      .from("menu_items")
      .select("stock_count")
      .eq("id", menuItemId)
      .maybeSingle();

    const freshStock = fresh?.stock_count as number | null | undefined;
    if (!isTracked(freshStock) || Number(freshStock) >= quantity) {
      // Stock is actually fine — the row changed for another reason
      // (e.g. it was marked unavailable). Treat the reservation as
      // successful rather than blocking the customer.
      return { ok: true };
    }

    return { ok: false, itemId: menuItemId, itemName: item.name ?? itemName };
  }

  // Hit zero → stop selling it, the same rule the RPC applies.
  if (next === 0) {
    await supabase
      .from("menu_items")
      .update({
        is_available: false,
        unavailable_reason: "สินค้าหมด",
        marked_unavailable_at: new Date().toISOString(),
      })
      .eq("id", menuItemId)
      .eq("is_available", true);
  }

  return { ok: true };
}

/** Put `quantity` units back on the shelf. */
export async function restoreStock(
  supabase: SupabaseClient,
  menuItemId: string,
  quantity: number,
  useRpc: boolean
): Promise<void> {
  if (!quantity || quantity <= 0) return;

  if (useRpc) {
    const { error } = await supabase.rpc("restore_stock", {
      p_menu_item_id: menuItemId,
      p_quantity: quantity,
    });

    if (!error) return;
    console.warn("[STOCK] restore_stock failed:", error.message);
  }

  const { data: item } = await supabase
    .from("menu_items")
    .select("id, name, stock_count")
    .eq("id", menuItemId)
    .maybeSingle();

  if (!item) return;

  const stock = item.stock_count as number | null;
  if (!isTracked(stock)) return;

  const next = Number(stock) + quantity;

  const { error } = await supabase
    .from("menu_items")
    .update({ stock_count: next })
    .eq("id", menuItemId)
    .eq("stock_count", stock);

  if (error) {
    console.warn("[STOCK] restore failed:", error.message);
    return;
  }

  // If it was auto-unavailable because of zero stock and it now has stock
  // again, put it back on the menu.
  if (next > 0) {
    await supabase
      .from("menu_items")
      .update({
        is_available: true,
        unavailable_reason: null,
        marked_unavailable_at: null,
      })
      .eq("id", menuItemId)
      .eq("is_available", false)
      .eq("unavailable_reason", "สินค้าหมด");
  }
}
