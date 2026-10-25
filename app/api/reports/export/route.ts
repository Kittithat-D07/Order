import { NextRequest, NextResponse } from "next/server";
import { requireStaff, apiError } from "@/lib/api/staff-guard";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";
import { getSchemaCaps } from "@/lib/supabase/schema";

// Force dynamic rendering - this route uses request.url
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Daily revenue report export as CSV.
 *
 * This used to be reachable by anyone with no authentication at all, which
 * meant the full revenue of the restaurant could be downloaded by guessing
 * the URL. It now requires a staff session.
 *
 * Query params: from, to (YYYY-MM-DD)
 */

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const guard = await requireStaff(req, ["admin"]);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(req.url);
    const from =
      searchParams.get("from") ||
      new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const to = searchParams.get("to") || new Date().toISOString().split("T")[0];

    const supabase = createServerClientWithServiceRole();
    const caps = await getSchemaCaps(supabase);

    const orderColumns = [
      "id",
      "status",
      "total_amount",
      "created_at",
      ...(caps.orderNumber ? ["order_number"] : []),
      ...(caps.amountDue ? ["amount_due"] : []),
      ...(caps.paymentMethod ? ["payment_method"] : []),
    ].join(",\n        ");

    const { data, error } = await supabase
      .from("orders")
      .select(`
        ${orderColumns},
        table:tables(table_number),
        order_items(quantity, subtotal, menu_items(name, price))
      `)
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[EXPORT CSV] query failed:", error.message);
      return apiError("โหลดข้อมูลไม่สำเร็จ", 500, "db_error");
    }

    // Build CSV
    const header = [
      "วันที่",
      "เวลา",
      "เลขออร์เดอร์",
      "โต๊ะ",
      "สถานะ",
      "วิธีชำระเงิน",
      "รายการ",
      "ยอดรวม",
    ];

    const rows: string[] = [header.join(",")];

    // Cancelled orders are not revenue and must not appear in the totals.
    const billable = (data || []).filter((o: any) => o.status !== "cancelled");

    for (const order of billable as any[]) {
      const created = new Date(order.created_at);
      const date = created.toLocaleDateString("th-TH");
      const time = created.toLocaleTimeString("th-TH");
      const tableNum = order.table?.table_number ?? "-";
      const itemNames = (order.order_items || [])
        .map((it: any) => `${it.menu_items?.name || "?"}×${it.quantity}`)
        .join("; ");

      rows.push(
        [
          escapeCsv(date),
          escapeCsv(time),
          escapeCsv(order.order_number || order.id.slice(0, 8)),
          escapeCsv(tableNum),
          escapeCsv(order.status),
          escapeCsv(order.payment_method ?? "-"),
          escapeCsv(itemNames),
          escapeCsv(order.amount_due ?? order.total_amount),
        ].join(",")
      );
    }

    // Add summary footer
    const total = billable.reduce(
      (s: number, o: any) => s + Number(o.amount_due ?? o.total_amount),
      0
    );
    const count = billable.length;
    rows.push("");
    rows.push(`รวมออร์เดอร์,${count} รายการ,,,,,,${total}`);

    const csv = "\uFEFF" + rows.join("\n"); // BOM for Excel Thai

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-${from}-to-${to}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[EXPORT CSV] error:", e?.message || e);
    return apiError("เกิดข้อผิดพลาด", 500, "server_error");
  }
}
