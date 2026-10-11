import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const orderId = req.nextUrl.searchParams.get("id");

  if (orderId) {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, menu_items(*)), tables(*)")
      .eq("id", orderId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ order: data });
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*, tables(table_number), order_items(*, menu_items(name))")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data });
}
