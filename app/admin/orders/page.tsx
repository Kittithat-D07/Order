"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems } from "@/lib/types";
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_items(*)), tables(*)")
        .order("created_at", { ascending: false })
        .limit(100);
      setOrders((data as OrderWithItems[]) ?? []);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">กำลังโหลด...</div>;
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto p-4 flex items-center gap-3">
          <Link href="/admin" className="p-1 hover:bg-stone-100 rounded">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-bold text-lg">ประวัติออร์เดอร์</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {orders.length === 0 ? (
          <p className="text-center text-stone-500 py-12">ยังไม่มีออร์เดอร์</p>
        ) : (
          <div className="bg-white rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-left">
                <tr>
                  <th className="p-3">เวลา</th>
                  <th className="p-3">โต๊ะ</th>
                  <th className="p-3">รายการ</th>
                  <th className="p-3 text-right">ยอด</th>
                  <th className="p-3">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t hover:bg-stone-50">
                    <td className="p-3 text-xs">
                      {formatDateTime(o.created_at)}
                    </td>
                    <td className="p-3 font-medium">
                      {o.tables?.table_number ?? "?"}
                    </td>
                    <td className="p-3 text-xs text-stone-600">
                      {o.order_items?.length ?? 0} รายการ
                    </td>
                    <td className="p-3 text-right font-bold text-brand-600">
                      {formatPrice(o.total_amount)}
                    </td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-stone-100">
                        {ORDER_STATUS_LABELS[o.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
