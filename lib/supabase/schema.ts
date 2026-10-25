import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Runtime schema capabilities.
 *
 * The 2026 hardening migration adds columns, an RPC and a sessions table.
 * Between writing that migration and running it, the application must
 * still work — a restaurant cannot afford a deploy that bricks the till.
 *
 * So instead of assuming the new schema exists, we probe for it once per
 * server process and let each route degrade gracefully:
 *
 *   - `orders.amount_due` missing  → fall back to `total_amount`
 *   - `tables.is_active` missing   → treat every table as open
 *   - `decrement_stock` missing     → use the application-level fallback
 *   - `staff_sessions` missing      → use a stateless signed cookie
 *
 * Once the migration is applied the probes flip to `true` and the stronger
 * paths take over, with no code change.
 */

export interface SchemaCaps {
  /** orders.amount_due — the authoritative payable amount. */
  amountDue: boolean;
  /** orders.payment_method — cash vs transfer, for reconciliation. */
  paymentMethod: boolean;
  /** orders.cash_received — cash handed over, for change calculation. */
  cashReceived: boolean;
  /** orders.discount_amount / service_charge_amount / vat_amount. */
  charges: boolean;
  /** orders.order_number — the human-readable order number. */
  orderNumber: boolean;
  /** orders.cancelled_at / cancel_reason. */
  cancellation: boolean;
  /** tables.is_active — a closed table refuses new orders. */
  tableActive: boolean;
  /** staff_sessions — the server-side session table. */
  staffSessions: boolean;
  /** decrement_stock / restore_stock RPCs. */
  stockRpc: boolean;
}

const DEFAULT_CAPS: SchemaCaps = {
  amountDue: false,
  paymentMethod: false,
  cashReceived: false,
  charges: false,
  orderNumber: false,
  cancellation: false,
  tableActive: false,
  staffSessions: false,
  stockRpc: false,
};

let cached: SchemaCaps | null = null;
let inFlight: Promise<SchemaCaps> | null = null;

/** Does this PostgREST error mean "the column or table does not exist"? */
function isMissingColumn(error: any): boolean {
  const message = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`;
  return (
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    /does not exist/i.test(message) ||
    /could not find the (table|column)/i.test(message) ||
    /column .* not found/i.test(message)
  );
}

/** Does this error mean "the function does not exist"? */
function isMissingFunction(error: any): boolean {
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`;
  return error?.code === "PGRST202" || /no matches were found/i.test(message);
}

/** Can we select this column from this table? */
async function columnExists(
  supabase: SupabaseClient,
  table: string,
  column: string
): Promise<boolean> {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (!error) return true;
  // A permission error means the column probably exists — we just cannot
  // read it with this key. Treat that as "present" so we do not silently
  // drop a field that the database actually has.
  if (isMissingColumn(error)) return false;
  return true;
}

/** Is this RPC callable? Probing with quantity 0 is a no-op by design. */
async function rpcExists(
  supabase: SupabaseClient,
  name: string
): Promise<boolean> {
  const { error } = await supabase.rpc(name, {
    p_menu_item_id: "00000000-0000-0000-0000-000000000000",
    p_quantity: 0,
  });
  if (!error) return true;
  return !isMissingFunction(error);
}

/** Probe the database once and remember what is available. */
async function probe(supabase: SupabaseClient): Promise<SchemaCaps> {
  const caps: SchemaCaps = { ...DEFAULT_CAPS };

  const [
    amountDue,
    paymentMethod,
    cashReceived,
    discount,
    serviceCharge,
    vat,
    orderNumber,
    cancelledAt,
    cancelReason,
    tableActive,
    staffSessions,
    stockRpc,
  ] = await Promise.all([
    columnExists(supabase, "orders", "amount_due"),
    columnExists(supabase, "orders", "payment_method"),
    columnExists(supabase, "orders", "cash_received"),
    columnExists(supabase, "orders", "discount_amount"),
    columnExists(supabase, "orders", "service_charge_amount"),
    columnExists(supabase, "orders", "vat_amount"),
    columnExists(supabase, "orders", "order_number"),
    columnExists(supabase, "orders", "cancelled_at"),
    columnExists(supabase, "orders", "cancel_reason"),
    columnExists(supabase, "tables", "is_active"),
    columnExists(supabase, "staff_sessions", "id"),
    rpcExists(supabase, "decrement_stock"),
  ]);

  caps.amountDue = amountDue;
  caps.paymentMethod = paymentMethod;
  caps.cashReceived = cashReceived;
  caps.charges = discount && serviceCharge && vat;
  caps.orderNumber = orderNumber;
  caps.cancellation = cancelledAt && cancelReason;
  caps.tableActive = tableActive;
  caps.staffSessions = staffSessions;
  caps.stockRpc = stockRpc;

  return caps;
}

/**
 * Get the capabilities of the connected database.
 *
 * The result is cached for the lifetime of the server process. If a probe
 * fails outright (network hiccup), we return the conservative defaults so
 * the app keeps running on the older, safer code paths.
 */
export async function getSchemaCaps(
  supabase: SupabaseClient
): Promise<SchemaCaps> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = probe(supabase)
    .then((caps) => {
      cached = caps;
      return caps;
    })
    .catch(() => DEFAULT_CAPS)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Forget the cached capabilities (used by tests and after migrations). */
export function resetSchemaCaps() {
  cached = null;
  inFlight = null;
}
