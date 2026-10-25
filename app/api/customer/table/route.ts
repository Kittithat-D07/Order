import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithServiceRole } from "@/lib/supabase/server-auth";
import { getSchemaCaps } from "@/lib/supabase/schema";

/**
 * The table token comes from the query string, so this route can never be
 * prerendered.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Resolve a table from its QR token.
 *
 * The customer scans a QR code and lands on /menu?table=<token>. The token
 * is the only thing that identifies which table they are sitting at, and
 * it is also what lets the server scope their order to their own table.
 *
 * The response deliberately contains only what the customer needs: the
 * table id and number. The qr_token itself is not echoed back — the
 * customer already has it in their URL.
 */

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "missing_token" },
        { status: 400 }
      );
    }

    const supabase = createServerClientWithServiceRole();
    const caps = await getSchemaCaps(supabase);

    const { data, error } = await supabase
      .from("tables")
      .select(
        caps.tableActive ? "id, table_number, is_active" : "id, table_number"
      )
      .eq("qr_token", token)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "invalid_token" },
        { status: 404 }
      );
    }

    const table = data as unknown as {
      id: string;
      table_number: string;
      is_active?: boolean;
    };

    // A closed table refuses new orders. When the column is not there yet
    // every table is treated as open.
    if (caps.tableActive && table.is_active === false) {
      return NextResponse.json(
        { ok: false, error: "table_closed" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      table: {
        id: table.id,
        table_number: table.table_number,
      },
    });
  } catch (e: any) {
    console.error("[CUSTOMER TABLE] error:", e?.message || e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
