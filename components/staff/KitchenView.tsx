"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, OrderItemStatus } from "@/lib/types";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { ChefHat, Check, Clock, Volume2 } from "lucide-react";

export function KitchenView() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filter, setFilter] = useState<"new" | "doing" | "ready">("new");
  const supabase = createClient();

  useEffect(() => {
    loadOrders();
    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(`*, tables:table_id (*), order_items (*, menu_items (*))`)
      .order("created_at", { ascending: false });

    if (data) {
      // กรอง: เฉพาะ order ที่มี item ที่ยังไม่ served
      const active = (data as any as OrderWithItems[]).filter((o) =>
        o.order_items?.some((it) => it.status !== "served" && it.status !== "cancelled")
      );
      setOrders(active);
    }
  };

  const updateItem = async (itemId: string, newStatus: OrderItemStatus) => {
    const supabase = createClient();
    // อัพเดท order_item
    const { data: item } = await supabase
      .from("order_items")
      .update({ status: newStatus })
      .eq("id", itemId)
      .select("order_id")
      .single();

    if (!item) return;

    // โหลด order_items ทั้งหมดของ order นี้ เพื่อคำนวณ order.status
    const { data: items } = await supabase
      .from("order_items")
      .select("status")
      .eq("order_id", item.order_id);

    if (!items) return;

    // คำนวณ order status
    const allServed = items.every((i) => i.status === "served" || i.status === "cancelled");
    const allReady = items.every(
      (i) => i.status === "ready" || i.status === "served" || i.status === "cancelled"
    );
    const anyPreparing = items.some((i) => i.status === "preparing" || i.status === "ready" || i.status === "served");

    let orderStatus: "pending" | "preparing" | "served" = "pending";
    if (allServed) {
      orderStatus = "served";
    } else if (anyPreparing) {
      orderStatus = "preparing";
    }

    // อัพเดท orders.status (trigger realtime ให้ลูกค้าเห็น)
    await supabase
      .from("orders")
      .update({ status: orderStatus })
      .eq("id", item.order_id);
  };

  // แยก items ตาม filter
  const filteredItems = orders.flatMap((o) =>
    (o.order_items ?? [])
      .filter((it) => {
        if (filter === "new") return it.status === "pending";
        if (filter === "doing") return it.status === "preparing";
        if (filter === "ready") return it.status === "ready";
        return false;
      })
      .map((it) => ({ ...it, order: o }))
  );

  const counts = {
    new: orders.flatMap((o) => o.order_items ?? []).filter((it) => it.status === "pending").length,
    doing: orders.flatMap((o) => o.order_items ?? []).filter((it) => it.status === "preparing").length,
    ready: orders.flatMap((o) => o.order_items ?? []).filter((it) => it.status === "ready").length,
  };

  return (
    <div className="p-4">
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <FilterTab active={filter === "new"} onClick={() => setFilter("new")} icon={Clock} label="รอครัว" count={counts.new} color="red" />
        <FilterTab active={filter === "doing"} onClick={() => setFilter("doing")} icon={ChefHat} label="กำลังทำ" count={counts.doing} color="amber" />
        <FilterTab active={filter === "ready"} onClick={() => setFilter("ready")} icon={Check} label="พร้อมเสิร์ฟ" count={counts.ready} color="green" />
      </div>

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <ChefHat size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">ไม่มีออร์เดอร์ในหมวดนี้</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map((it) => {
            const ageMin = Math.floor((Date.now() - new Date(it.order.created_at).getTime()) / 60000);
            const isOld = ageMin > 10;
            return (
              <div
                key={it.id}
                className={`bg-white rounded-xl border-2 overflow-hidden shadow-sm ${
                  isOld ? "border-red-300" : "border-stone-200"
                }`}
              >
                <div className={`px-3 py-2 flex items-center justify-between ${isOld ? "bg-red-50" : "bg-stone-50"}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center text-xs font-bold">
                      {it.order.tables?.table_number ?? "?"}
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-500 font-mono">#{it.order.id.slice(0, 6)}</p>
                      <p className={`text-[10px] font-bold ${isOld ? "text-red-600" : "text-stone-600"}`}>
                        ⏱ {ageMin} นาทีที่แล้ว
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-400">{formatDateTime(it.order.created_at)}</p>
                </div>

                <div className="p-3">
                  <p className="font-bold text-stone-800 text-base mb-1">
                    <span className="text-orange-600">{it.quantity}×</span> {it.menu_items?.name}
                  </p>
                  {it.note && (
                    <p className="text-xs bg-amber-50 text-amber-800 p-2 rounded-lg mb-2">
                      💬 {it.note}
                    </p>
                  )}

                  {filter === "new" && (
                    <button
                      onClick={() => updateItem(it.id, "preparing")}
                      className="w-full py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-95"
                    >
                      <ChefHat size={16} /> เริ่มทำ
                    </button>
                  )}
                  {filter === "doing" && (
                    <button
                      onClick={() => updateItem(it.id, "ready")}
                      className="w-full py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Check size={16} /> พร้อมเสิร์ฟ
                    </button>
                  )}
                  {filter === "ready" && (
                    <div className="w-full py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-bold flex items-center justify-center gap-2">
                      <Volume2 size={16} /> รอเสริฟ์นำไป
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  count: number;
  color: "red" | "amber" | "green";
}) {
  const colorMap = {
    red: "from-red-500 to-pink-500",
    amber: "from-amber-500 to-orange-500",
    green: "from-green-500 to-emerald-500",
  };
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition whitespace-nowrap ${
        active
          ? `bg-gradient-to-r ${colorMap[color]} text-white shadow-md`
          : "bg-white text-stone-600 border border-stone-200 hover:border-stone-300"
      }`}
    >
      <Icon size={14} />
      {label}
      {count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? "bg-white/20" : "bg-stone-100"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
