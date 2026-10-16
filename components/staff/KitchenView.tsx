"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, OrderItemStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, Check, Clock, CheckCircle2, Flame, Sparkles } from "lucide-react";

/* ============================================================
   🌅 ORGANIC WARM - Aura Bistro Kitchen View
============================================================ */

const COLORS: Record<string, string> = {
  primary: "#B85C38",
  primaryDark: "#8B3F1A",
  primaryLight: "#F4DCC4",
  secondary: "#6B7B5F",
  secondaryDark: "#4A5942",
  secondaryLight: "#DDE3D2",
  accent: "#C8932F",
  accentLight: "#F0D78C",
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  border: "#E8DFD0",
  text: "#2C2620",
  textMuted: "#6B5F54",
  success: "#4F7942",
  danger: "#A03826",
};

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
  }, [mode]);

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(`*, tables:table_id (*), order_items (*, menu_items (*))`)
      .order("created_at", { ascending: false });

    if (data) {
      const all = data as any as OrderWithItems[];
      const filtered = all.filter((o) => {
        const items = o.order_items ?? [];
        if (mode === "active") {
          return items.some((it) => it.status !== "served" && it.status !== "cancelled");
        } else {
          return items.length > 0 && items.every((it) => it.status === "served" || it.status === "cancelled");
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

    const { data: items } = await supabase
      .from("order_items")
      .select("status")
      .eq("order_id", item.order_id);

    if (!items) return;

    const allServed = items.every((i) => i.status === "served" || i.status === "cancelled");
    const anyPreparing = items.some(
      (i) => i.status === "preparing" || i.status === "ready" || i.status === "served"
    );

    let orderStatus: "pending" | "preparing" | "served" = "pending";
    if (allServed) orderStatus = "served";
    else if (anyPreparing) orderStatus = "preparing";

    await supabase.from("orders").update({ status: orderStatus }).eq("id", item.order_id);
  };

  const getItemStatus = (status: string): "new" | "doing" | "ready" => {
    if (status === "pending") return "new";
    if (status === "preparing") return "doing";
    if (status === "ready") return "ready";
    return "new";
  };

  return (
    <div className="px-3 sm:px-4 pb-6 max-w-3xl mx-auto">
      {/* Header */}
      <div
        className="mb-4 flex items-center justify-between p-4 rounded-2xl"
        style={{ 
          background: COLORS.surface,
          boxShadow: "0 8px 24px -4px rgba(139, 63, 26, 0.1)",
          border: "1px solid rgba(232, 223, 208, 0.5)"
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ 
              background: mode === "active" 
                ? `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`
                : `linear-gradient(135deg, ${COLORS.secondary} 0%, ${COLORS.secondaryDark} 100%)`
            }}
          >
            {mode === "active" ? "👨‍🍳" : "✨"}
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: COLORS.text, fontFamily: "'Playfair Display', serif" }}>
              {mode === "active" ? "ออร์เดอร์ที่กำลังทำ" : "เสร็จแล้ว"}
            </h2>
            <p className="text-xs" style={{ color: COLORS.textMuted }}>
              {mode === "active" ? "🍳 เชฟกำลังทำอาหาร" : "✅ เสริฟ์นำไปแล้ว"}
            </p>
          </div>
        </div>
        <div
          className="px-4 py-2 rounded-full text-sm font-bold"
          style={{ 
            background: mode === "active" ? COLORS.primaryLight : COLORS.secondaryLight,
            color: mode === "active" ? COLORS.primaryDark : COLORS.secondaryDark
          }}
        >
          {orders.length} ออร์เดอร์
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20" style={{ color: COLORS.textMuted }}>
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl mb-3"
          >
            🍳
          </motion.div>
          <p className="text-sm">กำลังโหลด...</p>
        </div>
      ) : orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
          style={{ color: COLORS.textMuted }}
        >
          <div className="text-6xl mb-3 animate-sway">🌿</div>
          <p className="text-sm">
            {mode === "active" ? "ยังไม่มีออร์เดอร์" : "ยังไม่มีออร์เดอร์ที่เสร็จแล้ว"}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
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
  const ageMin = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const isOld = ageMin > 10;

  const itemsByStatus = {
    new: (order.order_items ?? []).filter((it) => it.status === "pending"),
    doing: (order.order_items ?? []).filter((it) => it.status === "preparing"),
    ready: (order.order_items ?? []).filter((it) => it.status === "ready"),
  };

  const totalItems = (order.order_items ?? []).length;
  const doneItems = itemsByStatus.ready.length;

  const headerBg = mode === "done" 
    ? `linear-gradient(135deg, ${COLORS.secondary} 0%, ${COLORS.secondaryDark} 100%)`
    : isOld
    ? `linear-gradient(135deg, ${COLORS.danger} 0%, #7f1d1d 100%)`
    : `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="rounded-2xl overflow-hidden"
      style={{ 
        background: COLORS.surface,
        boxShadow: "0 12px 32px -6px rgba(139, 63, 26, 0.12)",
        border: `1px solid ${isOld && mode === "active" ? COLORS.danger + "40" : "rgba(232, 223, 208, 0.5)"}`
      }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between text-white"
        style={{ background: headerBg }}
      >
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-2xl">
            {order.tables?.table_number ?? "?"}
          </div>
          <div>
            <p className="text-xs opacity-80 font-mono">#{order.id.slice(0, 8)}</p>
            <p className={`text-sm font-bold ${isOld && mode === "active" ? "text-red-100" : ""}`}>
              ⏱ {ageMin} นาทีที่แล้ว
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-80">{formatDateTime(order.created_at)}</p>
          <p className="text-sm font-bold">
            {doneItems}/{totalItems} เสร็จ
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-3">
        {(order.order_items ?? []).map((item) => {
          const status = getItemStatus(item.status);
          return (
            <div
              key={item.id}
              className="rounded-xl p-4"
              style={{ 
                background: status === "doing" 
                  ? COLORS.primaryLight 
                  : status === "ready"
                  ? COLORS.accentLight
                  : status === "new"
                  ? "#fef3c7"
                  : "#f5f5f4",
                border: `1px solid ${
                  status === "doing" 
                    ? COLORS.primary 
                    : status === "ready"
                    ? COLORS.accent
                    : status === "new"
                    ? "#f59e0b"
                    : "#9ca3af"
                }30`
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="font-bold text-lg flex-1" style={{ color: COLORS.text }}>
                  <span style={{ color: COLORS.primary }}>{item.quantity}×</span>{" "}
                  {item.menu_items?.name}
                </p>
                <StatusBadge status={status} />
              </div>

              {item.note && (
                <p
                  className="text-sm p-2.5 rounded-xl mb-3"
                  style={{ 
                    background: "white", 
                    color: COLORS.accent,
                    border: `1px solid ${COLORS.accent}30`
                  }}
                >
                  💬 {item.note}
                </p>
              )}

              {mode === "active" && (
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onUpdateItem(item.id, "preparing")}
                    disabled={item.status === "preparing"}
                    className="py-3.5 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                    style={
                      item.status === "preparing"
                        ? { background: COLORS.primary, color: "white", boxShadow: `0 6px 16px -3px ${COLORS.primary}60` }
                        : { background: "white", color: COLORS.primary, border: `2px solid ${COLORS.primary}30` }
                    }
                  >
                    🔥 กำลังทำ
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onUpdateItem(item.id, "ready")}
                    disabled={item.status === "ready"}
                    className="py-3.5 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                    style={
                      item.status === "ready"
                        ? { background: COLORS.success, color: "white", boxShadow: `0 6px 16px -3px ${COLORS.success}60` }
                        : { background: "white", color: COLORS.success, border: `2px solid ${COLORS.success}30` }
                    }
                  >
                    ✨ รอเสริฟ
                  </motion.button>
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
      bg: "#fef3c7",
      color: "#92400e",
      emoji: "🌿",
    },
    doing: {
      label: "กำลังทำ",
      bg: COLORS.primaryLight,
      color: COLORS.primaryDark,
      emoji: "🔥",
    },
    ready: {
      label: "พร้อมเสริฟ",
      bg: COLORS.accentLight,
      color: COLORS.accent,
      emoji: "✨",
    },
  };
  const s = map[status];
  return (
    <span
      className="text-sm font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
      style={{ background: s.bg, color: s.color }}
    >
      <span>{s.emoji}</span>
      {s.label}
    </span>
  );
}
