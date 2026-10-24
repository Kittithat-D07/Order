"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, OrderItemStatus, Bill, MenuItem } from "@/lib/types";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { COLORS, alpha } from "@/lib/theme";
import { useStaffSession } from "@/hooks/useStaffSession";
import { useServerName } from "@/hooks/useServerName";
import { Utensils, Bell, Check, Volume2, Clock, X, Receipt, Plus, AlertTriangle, Package } from "lucide-react";
import { StockToggleModal } from "./StockToggleModal";
import { AddItemModal, BillPaymentModal } from "./AddItemModal";

/* ============================================================
   🌅 ORGANIC WARM - Aura Bistro Server View
============================================================ */

export function ServerView() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [filter, setFilter] = useState<"ready" | "active" | "completed" | "bills">("ready");
  const [showAddItem, setShowAddItem] = useState(false);
  const [showBillModal, setShowBillModal] = useState<string | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const supabase = createClient();
  const { session } = useStaffSession();
  // The server's name is persisted — it used to live in component state, so it
  // was wiped on every navigation and every order went unclaimed.
  const { name: serverName, setServerName, hydrated: nameHydrated } = useServerName(
    session?.displayName
  );
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadOrders();
    loadBills();

    const channel = supabase
      .channel("server-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => { loadOrders(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bills" },
        () => { loadBills(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => { loadOrders(); }
      )
      .subscribe((status) => {
        let st: "connecting" | "online" | "offline" = "connecting";
        if (status === "SUBSCRIBED") st = "online";
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") st = "offline";
        setRealtimeStatus(st);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("server-realtime-status", {
            detail: { status: st, lastUpdate: new Date().toISOString() }
          }));
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => { loadOrders(); loadBills(); }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Dispatch lastUpdate to header
  useEffect(() => {
    if (typeof window !== "undefined" && lastUpdate) {
      window.dispatchEvent(new CustomEvent("server-realtime-status", {
        detail: { status: realtimeStatus, lastUpdate: lastUpdate.toISOString() }
      }));
    }
  }, [lastUpdate, realtimeStatus]);

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(`*, tables:table_id (*), order_items (*, menu_items (*))`)
      .order("created_at", { ascending: false });
    if (data) { setOrders(data as any as OrderWithItems[]); setLastUpdate(new Date()); }
  };

  const loadBills = async () => {
    const { data } = await supabase
      .from("bills").select("*").order("requested_at", { ascending: false });
    if (data) setBills(data as Bill[]);
  };

  const updateItem = async (itemId: string, newStatus: OrderItemStatus) => {
    const supabase = createClient();
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

    const { data: items } = await supabase
      .from("order_items").select("status").eq("order_id", item.order_id);
    if (!items) return;

    const allServed = items.every((i) => i.status === "served" || i.status === "cancelled");
    const anyPreparing = items.some((i) => i.status === "preparing" || i.status === "ready" || i.status === "served");

    let orderStatus: "pending" | "preparing" | "served" = "pending";
    if (allServed) orderStatus = "served";
    else if (anyPreparing) orderStatus = "preparing";

    await supabase.from("orders").update({ status: orderStatus }).eq("id", item.order_id);
  };

  const claimOrder = async (orderId: string) => {
    await supabase
      .from("orders")
      .update({ server_name: serverName, claimed_at: new Date().toISOString() })
      .eq("id", orderId);
  };

  const itemsByFilter = (orderList: OrderWithItems[]) => {
    return orderList
      .filter((o) => !o.paid_at)
      .flatMap((o) =>
        (o.order_items ?? [])
          .filter((it) => {
            if (filter === "ready") return it.status === "ready";
            if (filter === "active") return ["pending", "preparing"].includes(it.status);
            if (filter === "completed") return it.status === "served";
            return false;
          })
          .map((it) => ({ ...it, order: o }))
      );
  };

  const filteredItems = itemsByFilter(orders);

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
    <div className="px-3 sm:px-4 pb-6 max-w-3xl mx-auto">
      {/* Realtime status now in sticky header */}

      {/* Name input — persisted, so the name survives navigation */}
      <div
        className="mb-4 p-3 sm:p-4 rounded-2xl flex items-center gap-3"
        style={{ background: COLORS.surface, boxShadow: "0 4px 12px -2px rgba(139, 63, 26, 0.1)", border: "1px solid rgba(232, 223, 208, 0.5)" }}
      >
        <label
          htmlFor="server-name-input"
          className="text-sm font-medium shrink-0"
          style={{ color: COLORS.textMuted }}
        >
          🍽️ เสริฟ์ชื่อ:
        </label>
        <input
          id="server-name-input"
          value={serverName}
          onChange={(e) => setServerName(e.target.value)}
          onBlur={() => setServerName(serverName)}
          disabled={!nameHydrated}
          className="flex-1 outline-none text-base font-semibold py-2 min-h-[44px]"
          style={{ color: COLORS.text, background: "transparent" }}
          placeholder="พิมพ์ชื่อเสริฟ์..."
          autoComplete="name"
        />
      </div>

      {/* Action bar */}
      <div className="mb-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddItem(true)}
          className="w-full py-4 rounded-2xl text-white text-base font-semibold flex items-center justify-center gap-2"
          style={{
            background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
            boxShadow: "0 12px 28px -6px rgba(184, 92, 56, 0.5)"
          }}
        >
          <Plus size={20} strokeWidth={2.5} /> เพิ่มเมนูให้โต๊ะ
        </motion.button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        <FilterTab active={filter === "ready"} onClick={() => setFilter("ready")} emoji="✨" label="พร้อมเสิร์ฟ" count={counts.ready} token="accent" />
        <FilterTab active={filter === "active"} onClick={() => setFilter("active")} emoji="🔥" label="กำลังทำ" count={counts.active} token="primary" />
        <FilterTab active={filter === "completed"} onClick={() => setFilter("completed")} emoji="✅" label="เสร็จแล้ว" count={counts.completed} token="success" />
        <FilterTab active={filter === "bills"} onClick={() => setFilter("bills")} emoji="🧾" label="บิล" count={counts.bills} token="primary" />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowStockModal(true)}
          className="flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-2xl min-w-[64px]"
          style={{ background: COLORS.warningLight, color: COLORS.warningText }}
        >
          <span className="text-lg">📦</span>
          <span className="text-[10px] font-bold">สต็อก</span>
        </motion.button>
      </div>

      {/* Bills View */}
      {filter === "bills" ? (
        <div className="space-y-3">
          {bills.length === 0 ? (
            <div className="text-center py-20" style={{ color: COLORS.textMuted }}>
              <div className="text-6xl mb-3 animate-sway">🌿</div>
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
                  className="block rounded-2xl p-5 transition-all"
                  style={{ 
                    background: COLORS.surface,
                    boxShadow: "0 8px 24px -4px rgba(139, 63, 26, 0.1)",
                    border: `1px solid ${COLORS.accent}40`
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-bold text-xl" style={{ color: COLORS.primary }}>
                      🧾 {bill.bill_number}
                    </span>
                    <span className="text-sm" style={{ color: COLORS.textMuted }}>
                      {formatDateTime(bill.requested_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base" style={{ color: COLORS.text }}>
                        โต๊ะ <span className="font-bold text-xl" style={{ color: COLORS.text }}>{order?.tables?.table_number ?? "?"}</span>
                      </p>
                      <p className="text-sm" style={{ color: COLORS.textMuted }}>กดเพื่อดู/พิมพ์บิล</p>
                    </div>
                    <span className="text-2xl font-bold" style={{ color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}>
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
            <div className="text-center py-20" style={{ color: COLORS.textMuted }}>
              <div className="text-6xl mb-3 animate-sway">🍃</div>
              <p className="text-sm">ไม่มีรายการในหมวดนี้</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByTable).map(([tableNum, items]) => {
                const order = items[0].order;
                return (
                  <div
                    key={tableNum + order.id}
                    className="rounded-2xl overflow-hidden"
                    style={{ 
                      background: COLORS.surface,
                      boxShadow: "0 8px 24px -4px rgba(139, 63, 26, 0.1)",
                      border: "1px solid rgba(232, 223, 208, 0.5)"
                    }}
                  >
                    <div
                      className="p-4 flex items-center justify-between"
                      style={{ background: `linear-gradient(135deg, ${COLORS.secondary} 0%, ${COLORS.secondaryDark} 100%)` }}
                    >
                      <div className="flex items-center gap-3 text-white">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-2xl">
                          {tableNum}
                        </div>
                        <div>
                          <p className="font-bold text-lg">โต๊ะ {tableNum}</p>
                          <p className="text-xs opacity-80">
                            {order.server_name ? `🍽️ ${order.server_name}` : "ยังไม่มีเสริฟ์รับ"}
                            {" • "}
                            {formatDateTime(order.created_at)}
                          </p>
                        </div>
                      </div>
                      {!order.server_name && serverName && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => claimOrder(order.id)}
                          className="px-4 py-2.5 rounded-xl text-white text-sm font-bold"
                          style={{ background: COLORS.success }}
                        >
                          รับออร์เดอร์
                        </motion.button>
                      )}
                      {order.server_name && filter === "completed" && !order.paid_at && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowBillModal(order.id)}
                          className="px-4 py-2.5 rounded-xl text-white text-sm font-bold"
                          style={{
                            background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`
                          }}
                        >
                          <Receipt size={14} className="mr-1 inline" /> ปิดบิล
                        </motion.button>
                      )}
                      {order.paid_at && (
                        <span className="px-3 py-1.5 rounded-full text-sm font-bold text-white" style={{ background: COLORS.success }}>
                          💰 จ่ายแล้ว
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      {items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ background: COLORS.bg }}
                        >
                          <div className="flex-1">
                            <p className="text-base font-semibold" style={{ color: COLORS.text }}>
                              <span style={{ color: COLORS.primary }}>{it.quantity}×</span> {it.menu_items?.name}
                            </p>
                            {it.note && (
                              <p className="text-sm mt-1 italic" style={{ color: COLORS.accent }}>💬 {it.note}</p>
                            )}
                            {it.served_by && (
                              <p className="text-sm mt-1" style={{ color: COLORS.success }}>✓ เสริฟ์โดย {it.served_by}</p>
                            )}
                          </div>

                          {it.status === "ready" && (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => updateItem(it.id, "served")}
                              className="px-4 py-2.5 rounded-xl text-white text-sm font-bold"
                              style={{ background: COLORS.success, boxShadow: `0 4px 12px -2px ${COLORS.success}60` }}
                            >
                              <Check size={14} className="mr-1 inline" /> นำไปเสิร์ฟ
                            </motion.button>
                          )}
                          {it.status === "preparing" && (
                            <span className="px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: COLORS.primaryLight, color: COLORS.primaryDark }}>
                              🔥 กำลังทำ
                            </span>
                          )}
                          {it.status === "pending" && (
                            <span className="px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: COLORS.warningLight, color: COLORS.warningText }}>
                              ⏳ รอครัว
                            </span>
                          )}
                          {it.status === "served" && (
                            <span className="px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: COLORS.successLight, color: COLORS.successText }}>
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

      {showAddItem && (
        <AddItemModal
          orders={orders}
          onClose={() => setShowAddItem(false)}
          onAdded={() => { setShowAddItem(false); loadOrders(); }}
          serverName={serverName}
        />
      )}

      {showBillModal && (
        <BillPaymentModal
          orderId={showBillModal}
          orders={orders}
          onClose={() => setShowBillModal(null)}
          onPaid={() => { setShowBillModal(null); loadOrders(); loadBills(); }}
        />
      )}

      {showStockModal && (
        <StockToggleModal onClose={() => setShowStockModal(false)} />
      )}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  emoji,
  label,
  count,
  token,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  count: number;
  token: "primary" | "accent" | "success";
}) {
  const color = `rgb(var(--rgb-${token}))`;
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all"
      style={active ? {
        background: `linear-gradient(135deg, ${color} 0%, ${alpha(token, 0.8)} 100%)`,
        color: "white",
        boxShadow: `0 6px 16px -3px ${alpha(token, 0.25)}`
      } : {
        background: COLORS.surface,
        color: COLORS.textMuted,
        border: "1px solid rgba(232, 223, 208, 0.5)"
      }}
    >
      <span>{emoji}</span>
      {label}
      {count > 0 && (
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={active ? { background: "rgba(255,255,255,0.25)" } : { background: COLORS.bg }}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}
