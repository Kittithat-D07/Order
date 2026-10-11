"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, OrderStatus } from "@/lib/types";
import { OrderCard } from "./OrderCard";
import { ORDER_STATUS_LABELS } from "@/lib/utils";

const COLUMNS: { status: OrderStatus; color: string }[] = [
  { status: "pending", color: "border-yellow-400 bg-yellow-50" },
  { status: "preparing", color: "border-blue-400 bg-blue-50" },
  { status: "served", color: "border-green-400 bg-green-50" },
];

export function OrderBoard() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_items(*)), tables(*)")
        .in("status", ["pending", "preparing", "served"])
        .order("created_at", { ascending: true });

      setOrders((data as OrderWithItems[]) ?? []);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("orders-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-stone-500">กำลังโหลด...</div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => o.status === col.status);
        return (
          <div
            key={col.status}
            className={`rounded-lg border-t-4 ${col.color} p-3`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">
                {ORDER_STATUS_LABELS[col.status]}
              </h3>
              <span className="text-xs bg-white px-2 py-0.5 rounded-full">
                {colOrders.length}
              </span>
            </div>
            <div className="space-y-2">
              {colOrders.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-6">
                  ไม่มีออร์เดอร์
                </p>
              ) : (
                colOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
