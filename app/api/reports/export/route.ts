import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

// Force dynamic rendering - this route uses request.url
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Daily revenue report export as CSV.
 * Query params: from, to (YYYY-MM-DD), table_id (optional)
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
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const to = searchParams.get("to") || new Date().toISOString().split("T")[0];

    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total_amount,
        created_at,
        table:tables(table_number),
        order_items(quantity, subtotal, menu_items(name, price))
      `)
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Build CSV
    const header = [
      "วันที่",
      "เวลา",
      "เลขออร์เดอร์",
      "โต๊ะ",
      "สถานะ",
      "รายการ",
      "ยอดรวม",
    ];

    const rows: string[] = [header.join(",")];

    for (const order of data || []) {
      const created = new Date(order.created_at);
      const date = created.toLocaleDateString("th-TH");
      const time = created.toLocaleTimeString("th-TH");
      const tableNum = (order as any).table?.table_number ?? "-";
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
          escapeCsv(itemNames),
          escapeCsv(order.total_amount),
        ].join(",")
      );
    }

    // Add summary footer
    const total = (data || []).reduce((s, o) => s + Number(o.total_amount), 0);
    const count = (data || []).length;
    rows.push("");
    rows.push(`รวมออร์เดอร์,${count} รายการ,,,,,${total}`);

    const csv = "\uFEFF" + rows.join("\n"); // BOM for Excel Thai

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-${from}-to-${to}.csv"`,
      },
    });
  } catch (e: any) {
    console.error("[EXPORT CSV] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
