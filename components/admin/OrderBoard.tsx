"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, OrderStatus } from "@/lib/types";
import { OrderCard } from "./OrderCard";
import { ORDER_STATUS_LABELS } from "@/lib/utils";
import { Clock, ChefHat, CheckCircle2, Inbox } from "lucide-react";

const COLUMNS: {
  status: OrderStatus;
  icon: any;
  gradient: string;
  badge: string;
}[] = [
  {
    status: "pending",
    icon: Clock,
    gradient: "from-amber-500 to-orange-500",
    badge: "bg-amber-100 text-amber-700",
  },
  {
    status: "preparing",
    icon: ChefHat,
    gradient: "from-blue-500 to-indigo-500",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    status: "served",
    icon: CheckCircle2,
    gradient: "from-green-500 to-emerald-500",
    badge: "bg-green-100 text-green-700",
  },
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
      <div className="p-12 text-center">
        <div className="inline-block w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 animate-pulse" />
        <p className="text-stone-500 mt-3">กำลังโหลดออร์เดอร์...</p>
      </div>
    );
  }

  const totalOrders = orders.length;
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div>
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-4">
          <p className="text-xs text-stone-500 font-medium">ออร์เดอร์ทั้งหมด</p>
          <p className="text-2xl font-bold text-stone-900 mt-1">{totalOrders}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 font-medium">รอยืนยัน</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {pendingCount}
            {pendingCount > 0 && <span className="ml-1 inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 font-medium">เสิร์ฟแล้ว</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {orders.filter((o) => o.status === "served").length}
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);
          const Icon = col.icon;
          return (
            <div key={col.status} className="flex flex-col min-h-[200px]">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${col.gradient} flex items-center justify-center shadow-sm`}
                  >
                    <Icon size={14} className="text-white" />
                  </div>
                  <h3 className="font-bold text-sm text-stone-800">
                    {ORDER_STATUS_LABELS[col.status]}
                  </h3>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${col.badge}`}
                >
                  {colOrders.length}
                </span>
              </div>

              {/* Column Body */}
              <div className="flex-1 bg-stone-100/60 rounded-2xl p-2.5 space-y-2.5 border border-stone-200/50">
                {colOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-stone-400">
                    <Inbox size={28} className="mb-2 opacity-50" />
                    <p className="text-xs">ไม่มีออร์เดอร์</p>
                  </div>
                ) : (
                  colOrders.map((order, i) => (
                    <div
                      key={order.id}
                      className="animate-slide-down"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <OrderCard order={order} />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
