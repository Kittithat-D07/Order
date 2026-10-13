"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, OrderItemStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { ChefHat, Check, Clock, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function KitchenView({ mode = "active" }: { mode?: "active" | "done" }) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadOrders();
    const channel = supabase
      .channel(`kitchen-orders-${mode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders()
      )
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
      const all = data as any as OrderWithItems[];
      // กรองตาม mode
      const filtered = all.filter((o) => {
        const items = o.order_items ?? [];
        if (mode === "active") {
          // ยังไม่ served (มี item ที่ยังไม่ served/cancelled)
          return items.some(
            (it) => it.status !== "served" && it.status !== "cancelled"
          );
        } else {
          // done = served ทั้งหมด
          return (
            items.length > 0 &&
            items.every((it) => it.status === "served" || it.status === "cancelled")
          );
        }
      });
      setOrders(filtered);
    }
    setLoading(false);
  };

  const updateItem = async (itemId: string, newStatus: OrderItemStatus) => {
    const { data: item } = await supabase
      .from("order_items")
      .update({ status: newStatus })
      .eq("id", itemId)
      .select("order_id")
      .single();

    if (!item) return;

    // คำนวณ order status
    const { data: items } = await supabase
      .from("order_items")
      .select("status")
      .eq("order_id", item.order_id);

    if (!items) return;

    const allServed = items.every(
      (i) => i.status === "served" || i.status === "cancelled"
    );
    const anyPreparing = items.some(
      (i) =>
        i.status === "preparing" ||
        i.status === "ready" ||
        i.status === "served"
    );

    let orderStatus: "pending" | "preparing" | "served" = "pending";
    if (allServed) {
      orderStatus = "served";
    } else if (anyPreparing) {
      orderStatus = "preparing";
    }

    await supabase
      .from("orders")
      .update({ status: orderStatus })
      .eq("id", item.order_id);
  };

  const getItemStatus = (status: string): "new" | "doing" | "ready" => {
    if (status === "pending") return "new";
    if (status === "preparing") return "doing";
    if (status === "ready") return "ready";
    return "new";
  };

  return (
    <div className="p-3 sm:p-4 max-w-3xl mx-auto">
      {/* Header count */}
      <div className="mb-4 flex items-center justify-between bg-white rounded-2xl p-4 border-2 border-stone-200 shadow-sm">
        <h2 className="text-lg sm:text-xl font-bold text-stone-800 flex items-center gap-2">
          {mode === "active" ? (
            <>
              <ChefHat className="w-6 h-6 text-orange-500" />
              ออร์เดอร์ที่กำลังทำ
            </>
          ) : (
            <>
              <CheckCircle2 className="w-6 h-6 text-blue-500" />
              เสร็จแล้ว (เสริฟ์นำไปแล้ว)
            </>
          )}
        </h2>
        <span className="text-base font-bold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-full">
          {orders.length} ออร์เดอร์
        </span>
      </div>

      {loading ? (
        <div className="text-center py-20 text-stone-400">
          <p>กำลังโหลด...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          {mode === "active" ? (
            <>
              <ChefHat size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">ยังไม่มีออร์เดอร์</p>
            </>
          ) : (
            <>
              <CheckCircle2 size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">ยังไม่มีออร์เดอร์ที่เสร็จแล้ว</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateItem={updateItem}
                mode={mode}
                getItemStatus={getItemStatus}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  onUpdateItem,
  getItemStatus,
  mode = "active",
}: {
  order: OrderWithItems;
  onUpdateItem: (id: string, status: OrderItemStatus) => void;
  getItemStatus: (s: string) => "new" | "doing" | "ready";
  mode?: "active" | "done";
}) {
  const ageMin = Math.floor(
    (Date.now() - new Date(order.created_at).getTime()) / 60000
  );
  const isOld = ageMin > 10;

  // แยก items ตามสถานะ
  const itemsByStatus = {
    new: (order.order_items ?? []).filter((it) => it.status === "pending"),
    doing: (order.order_items ?? []).filter((it) => it.status === "preparing"),
    ready: (order.order_items ?? []).filter((it) => it.status === "ready"),
  };

  const totalItems = (order.order_items ?? []).length;
  const doneItems = itemsByStatus.ready.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-white rounded-2xl border-2 overflow-hidden shadow-md ${
        mode === "done" ? "border-blue-200" : isOld ? "border-red-400" : "border-stone-200"
      }`}
    >
      {/* Header: โต๊ะ + เวลา */}
      <div
        className={`px-4 py-3.5 flex items-center justify-between ${
          mode === "done"
            ? "bg-gradient-to-r from-blue-50 to-cyan-50"
            : isOld
            ? "bg-red-50"
            : "bg-gradient-to-r from-orange-50 to-amber-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white flex items-center justify-center font-bold text-xl">
            {order.tables?.table_number ?? "?"}
          </div>
          <div>
            <p className="text-xs text-stone-500 font-mono">
              #{order.id.slice(0, 8)}
            </p>
            <p
              className={`text-sm font-bold ${
                isOld ? "text-red-600" : "text-stone-700"
              }`}
            >
              ⏱ {ageMin} นาทีที่แล้ว
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-stone-400">
            {formatDateTime(order.created_at)}
          </p>
          <p className="text-sm text-stone-700 font-bold">
            {doneItems}/{totalItems} เสร็จ
          </p>
        </div>
      </div>

      {/* Items list */}
      <div className="p-4 space-y-3">
        {(order.order_items ?? []).map((item) => {
          const status = getItemStatus(item.status);
          return (
            <div
              key={item.id}
              className="border-2 border-stone-200 rounded-xl p-3.5"
            >
              {/* Item name + qty */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-bold text-stone-800 text-lg flex-1">
                  <span className="text-orange-600">{item.quantity}×</span>{" "}
                  {item.menu_items?.name}
                </p>
                <StatusBadge status={status} />
              </div>

              {/* Note */}
              {item.note && (
                <p className="text-sm bg-amber-50 text-amber-800 p-2.5 rounded-lg mb-2.5">
                  💬 {item.note}
                </p>
              )}

              {/* Action buttons - ครัวกดได้แค่ 2 ปุ่ม */}
              {mode === "active" && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() => onUpdateItem(item.id, "preparing")}
                    disabled={item.status === "preparing"}
                    className={`py-3.5 px-3 rounded-xl text-base font-bold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                      item.status === "preparing"
                        ? "bg-amber-500 text-white shadow-md"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100 border-2 border-amber-200"
                    }`}
                  >
                    <ChefHat size={16} />
                    กำลังทำ
                  </button>
                  <button
                    onClick={() => onUpdateItem(item.id, "ready")}
                    disabled={item.status === "ready"}
                    className={`py-3.5 px-3 rounded-xl text-base font-bold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                      item.status === "ready"
                        ? "bg-green-500 text-white shadow-md"
                        : "bg-green-50 text-green-700 hover:bg-green-100 border-2 border-green-200"
                    }`}
                  >
                    <Check size={16} />
                    รอเสริฟ
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: "new" | "doing" | "ready" }) {
  const map = {
    new: {
      label: "รอครัว",
      className: "bg-red-100 text-red-700 border-red-200",
      icon: Clock,
    },
    doing: {
      label: "กำลังทำ",
      className: "bg-amber-100 text-amber-700 border-amber-200",
      icon: ChefHat,
    },
    ready: {
      label: "พร้อมเสริฟ",
      className: "bg-green-100 text-green-700 border-green-200",
      icon: Check,
    },
  };
  const s = map[status];
  const Icon = s.icon;
  return (
    <span
      className={`text-sm font-bold px-3 py-1.5 rounded-full border-2 flex items-center gap-1 ${s.className}`}
    >
      <Icon size={12} />
      {s.label}
    </span>
  );
}
