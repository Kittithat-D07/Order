"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, OrderItemStatus, Bill, MenuItem } from "@/lib/types";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { useStaffSession } from "@/hooks/useStaffSession";
import { Utensils, Bell, Check, Volume2, Clock, X, Receipt, Plus } from "lucide-react";
import { AddItemModal, BillPaymentModal } from "./AddItemModal";

export function ServerView() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [filter, setFilter] = useState<"ready" | "active" | "completed" | "bills">("ready");
  const [serverName, setServerName] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [showBillModal, setShowBillModal] = useState<string | null>(null);
  const supabase = createClient();
  const { session } = useStaffSession();

  useEffect(() => {
    setServerName(session?.displayName ?? "");
    loadOrders();
    loadBills();
    const channel = supabase
      .channel("server-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => loadOrders()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bills" },
        () => loadBills()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(`*, tables:table_id (*), order_items (*, menu_items (*))`)
      .order("created_at", { ascending: false });

    if (data) {
      setOrders(data as any as OrderWithItems[]);
    }
  };

  const loadBills = async () => {
    const { data } = await supabase
      .from("bills")
      .select("*")
      .order("requested_at", { ascending: false });
    if (data) setBills(data as Bill[]);
  };

  const updateItem = async (itemId: string, newStatus: OrderItemStatus) => {
    const supabase = createClient();
    // อัพเดท order_item
    const { data: item } = await supabase
      .from("order_items")
      .update({
        status: newStatus,
        served_by: newStatus === "served" ? serverName : null,
        served_at: newStatus === "served" ? new Date().toISOString() : null,
      })
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

    const allServed = items.every((i) => i.status === "served" || i.status === "cancelled");
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

  const claimOrder = async (orderId: string) => {
    await supabase
      .from("orders")
      .update({ server_name: serverName, claimed_at: new Date().toISOString() })
      .eq("id", orderId);
  };

  // แยก items ตาม filter (กรองเฉพาะ order ที่ยังไม่ paid)
  const itemsByFilter = (orderList: OrderWithItems[]) => {
    return orderList
      .filter((o) => !o.paid_at) // ซ่อน order ที่จ่ายเงินแล้ว
      .flatMap((o) =>
        (o.order_items ?? [])
          .filter((it) => {
            if (filter === "ready") return it.status === "ready";
            if (filter === "active")
              return ["pending", "preparing"].includes(it.status);
            if (filter === "completed") return it.status === "served";
            return false;
          })
          .map((it) => ({ ...it, order: o }))
      );
  };

  const filteredItems = itemsByFilter(orders);

  // Group by table
  const groupedByTable = filteredItems.reduce((acc, it) => {
    const tableNum = it.order.tables?.table_number ?? "?";
    if (!acc[tableNum]) acc[tableNum] = [];
    acc[tableNum].push(it);
    return acc;
  }, {} as Record<string, typeof filteredItems>);

  const counts = {
    ready: orders.flatMap((o) => o.order_items ?? []).filter((it) => it.status === "ready").length,
    active: orders.flatMap((o) => o.order_items ?? []).filter((it) => ["pending", "preparing"].includes(it.status)).length,
    completed: orders.flatMap((o) => o.order_items ?? []).filter((it) => it.status === "served").length,
    bills: bills.length,
  };

  return (
    <div className="p-4">
      {/* Name input */}
      <div className="mb-4 bg-white rounded-xl p-3 border border-stone-200 flex items-center gap-2">
        <span className="text-xs text-stone-500">เสริฟ์ชื่อ:</span>
        <input
          value={serverName}
          onChange={(e) => setServerName(e.target.value)}
          className="flex-1 outline-none text-sm font-semibold text-stone-800"
          placeholder="พิมพ์ชื่อเสริฟ์..."
        />
      </div>

      {/* Action bar */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setShowAddItem(true)}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md active:scale-95"
        >
          <Plus size={16} /> เพิ่มเมนูให้โต๊ะ
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <FilterTab active={filter === "ready"} onClick={() => setFilter("ready")} icon={Bell} label="พร้อมเสิร์ฟ" count={counts.ready} color="blue" />
        <FilterTab active={filter === "active"} onClick={() => setFilter("active")} icon={Clock} label="กำลังทำ" count={counts.active} color="amber" />
        <FilterTab active={filter === "completed"} onClick={() => setFilter("completed")} icon={Check} label="เสร็จแล้ว" count={counts.completed} color="green" />
        <FilterTab active={filter === "bills"} onClick={() => setFilter("bills")} icon={Receipt} label="บิล" count={counts.bills} color="orange" />
      </div>

      {/* Bills View OR Table groups */}
      {filter === "bills" ? (
        <div className="space-y-3">
          {bills.length === 0 ? (
            <div className="text-center py-20 text-stone-400">
              <Receipt size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">ยังไม่มีลูกค้าขอบิล</p>
            </div>
          ) : (
            bills.map((bill) => {
              const order = orders.find((o) => o.id === bill.order_id);
              return (
                <Link
                  key={bill.id}
                  href={`/bill/${bill.order_id}`}
                  target="_blank"
                  className="block bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border-2 border-orange-200 hover:border-orange-400 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-orange-700 text-lg">
                      🧾 {bill.bill_number}
                    </span>
                    <span className="text-xs text-stone-500">
                      {formatDateTime(bill.requested_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-stone-600">
                        โต๊ะ <span className="font-bold text-stone-800">{order?.tables?.table_number ?? "?"}</span>
                      </p>
                      <p className="text-xs text-stone-500">
                        กดเพื่อดู/พิมพ์บิล
                      </p>
                    </div>
                    <span className="text-xl font-bold text-orange-600">
                      ฿{formatPrice(bill.total_amount)}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      ) : (
        <>
          {Object.keys(groupedByTable).length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <Utensils size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">ไม่มีรายการในหมวดนี้</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByTable).map(([tableNum, items]) => {
            const order = items[0].order;
            return (
              <div key={tableNum + order.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold">
                      {tableNum}
                    </div>
                    <div>
                      <p className="font-bold text-stone-800">โต๊ะ {tableNum}</p>
                      <p className="text-[10px] text-stone-500">
                        {order.server_name ? `🍽️ ${order.server_name}` : "ยังไม่มีเสริฟ์รับ"}
                        {" • "}
                        {formatDateTime(order.created_at)}
                      </p>
                    </div>
                  </div>
                  {!order.server_name && serverName && (
                    <button
                      onClick={() => claimOrder(order.id)}
                      className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold"
                    >
                      รับออร์เดอร์
                    </button>
                  )}
                  {order.server_name && filter === "completed" && !order.paid_at && (
                    <button
                      onClick={() => setShowBillModal(order.id)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold flex items-center gap-1 active:scale-95"
                    >
                      <Receipt size={12} /> ปิดบิล/รับเงิน
                    </button>
                  )}
                  {order.paid_at && (
                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center gap-1">
                      💰 จ่ายแล้ว
                    </span>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-stone-50"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-stone-800">
                          <span className="text-orange-600">{it.quantity}×</span> {it.menu_items?.name}
                        </p>
                        {it.note && <p className="text-[10px] text-stone-500 italic">💬 {it.note}</p>}
                        {it.served_by && (
                          <p className="text-[10px] text-green-600">✓ เสริฟ์โดย {it.served_by}</p>
                        )}
                      </div>

                      {it.status === "ready" && (
                        <button
                          onClick={() => updateItem(it.id, "served")}
                          className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold flex items-center gap-1 active:scale-95"
                        >
                          <Check size={12} /> นำไปเสิร์ฟ
                        </button>
                      )}
                      {it.status === "preparing" && (
                        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                          🔥 กำลังทำ
                        </span>
                      )}
                      {it.status === "pending" && (
                        <span className="px-2 py-1 rounded-full bg-stone-200 text-stone-600 text-[10px] font-bold">
                          ⏳ รอครัว
                        </span>
                      )}
                      {it.status === "served" && (
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                          ✓ แล้ว
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <AddItemModal
          orders={orders}
          onClose={() => setShowAddItem(false)}
          onAdded={() => {
            setShowAddItem(false);
            loadOrders();
          }}
          serverName={serverName}
        />
      )}

      {/* Bill Payment Modal */}
      {showBillModal && (
        <BillPaymentModal
          orderId={showBillModal}
          orders={orders}
          onClose={() => setShowBillModal(null)}
          onPaid={() => {
            setShowBillModal(null);
            loadOrders();
            loadBills();
          }}
        />
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
  color: "blue" | "amber" | "green" | "orange";
}) {
  const colorMap = {
    blue: "from-blue-500 to-cyan-500",
    amber: "from-amber-500 to-orange-500",
    green: "from-green-500 to-emerald-500",
    orange: "from-orange-500 to-amber-500",
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
