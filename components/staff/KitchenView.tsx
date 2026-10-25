"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { OrderWithItems, OrderItemStatus } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { COLORS, alpha } from "@/lib/theme";
import { Check, Flame, Sparkles, ChefHat } from "lucide-react";
import { ToastStack, useToasts } from "@/components/ui/toast";

/* ============================================================
   👨‍🍳 KITCHEN BOARD — built for the hot line.
   Oldest ticket first. Live age. One tap per state change.
============================================================ */

/** Minutes after which a ticket is considered late. */
const LATE_MINUTES = 20;
/** Minutes after which a ticket is critical. */
const CRITICAL_MINUTES = 30;

type ItemStage = "new" | "doing" | "ready" | "done" | "cancelled";

export function KitchenView({ mode = "active" }: { mode?: "active" | "done" }) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const { toasts, toast, dismiss } = useToasts();

  const loadOrders = useCallback(async () => {
    // The kitchen reads through the server. The browser no longer holds
    // credentials that can read every order in the restaurant.
    try {
      const res = await fetch(`/api/staff/orders?mode=${mode}&limit=200`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok && Array.isArray(data.orders)) {
        setOrders(data.orders as unknown as OrderWithItems[]);
      }
    } catch {
      // A dropped connection is not worth shouting about on a kitchen
      // screen — the next poll will pick it up.
    }
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    loadOrders();

    // Poll every few seconds. Realtime cannot be used here: it evaluates
    // RLS with the connection's JWT, not with a per-request header, so a
    // realtime channel would either see nothing or see everything.
    const interval = setInterval(loadOrders, 5000);

    return () => clearInterval(interval);
  }, [loadOrders]);

  // The age counter has to actually tick — a frozen number is worse than none.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const updateItem = async (itemId: string, newStatus: OrderItemStatus) => {
    // Goes through the server, which checks the staff session and derives
    // the order's overall status itself. The browser no longer writes to
    // the database directly with the public key.
    const res = await fetch("/api/staff/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, status: newStatus }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data?.message || "อัปเดตสถานะไม่สำเร็จ", "bad");
      return;
    }

    await loadOrders();
  };

  /** The single next state for a dish — one tap, not two. */
  const nextStatus = (status: OrderItemStatus): OrderItemStatus | null => {
    if (status === "pending") return "preparing";
    if (status === "preparing") return "ready";
    if (status === "ready") return "served";
    return null;
  };

  const stageOf = (status: string): ItemStage => {
    if (status === "pending") return "new";
    if (status === "preparing") return "doing";
    if (status === "ready") return "ready";
    if (status === "served") return "done";
    if (status === "cancelled") return "cancelled";
    return "new";
  };

  const worstAge = useMemo(() => {
    if (orders.length === 0) return 0;
    return Math.max(
      ...orders.map((o) => Math.floor((now - new Date(o.created_at).getTime()) / 60000))
    );
  }, [orders, now]);

  const dishCount = useMemo(
    () => orders.reduce((sum, o) => sum + (o.order_items ?? []).filter((i) => i.status !== "served" && i.status !== "cancelled").length, 0),
    [orders]
  );

  return (
    <div className="px-3 sm:px-4 pb-6 max-w-3xl mx-auto">
      {/* Header — the oldest ticket is the number that matters */}
      <div
        className="mb-4 flex items-center justify-between gap-3 p-4 rounded-2xl"
        style={{
          background: COLORS.surface,
          boxShadow: "var(--shadow-sm)",
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
            }}
            aria-hidden="true"
          >
            {mode === "active" ? "👨‍🍳" : "✨"}
          </div>
          <div className="min-w-0">
            <h2
              className="text-lg font-bold leading-tight truncate"
              style={{ color: COLORS.text, fontFamily: "'Playfair Display', serif" }}
            >
              {mode === "active" ? "ออร์เดอร์ในครัว" : "เสร็จแล้ว"}
            </h2>
            <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>
              {mode === "active"
                ? `${dishCount} จาน · เก่าสุด ${worstAge} นาที`
                : `${orders.length} ออร์เดอร์`}
            </p>
          </div>
        </div>

        {/* Worst-case indicator — the only number a hot line needs */}
        {mode === "active" && orders.length > 0 && (
          <div
            className="px-3.5 py-2 rounded-2xl text-center shrink-0"
            style={{
              background:
                worstAge >= CRITICAL_MINUTES
                  ? COLORS.dangerLight
                  : worstAge >= LATE_MINUTES
                    ? COLORS.warningLight
                    : COLORS.surface2,
            }}
            aria-label={`ออร์เดอร์เก่าสุด ${worstAge} นาที`}
          >
            <p
              className="text-xl font-bold leading-none tabular-nums"
              style={{
                color:
                  worstAge >= CRITICAL_MINUTES
                    ? COLORS.dangerText
                    : worstAge >= LATE_MINUTES
                      ? COLORS.warningText
                      : COLORS.text,
              }}
            >
              {worstAge}
            </p>
            <p
              className="text-[10px] font-semibold mt-0.5"
              style={{
                color:
                  worstAge >= CRITICAL_MINUTES
                    ? COLORS.dangerText
                    : worstAge >= LATE_MINUTES
                      ? COLORS.warningText
                      : COLORS.textMuted,
              }}
            >
              นาที
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20" style={{ color: COLORS.textMuted }} role="status">
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl mb-3"
            aria-hidden="true"
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
          <div className="text-5xl mb-3" aria-hidden="true">
            🍳
          </div>
          <p className="text-sm font-medium" style={{ color: COLORS.text }}>
            {mode === "active" ? "ยังไม่มีออร์เดอร์" : "ยังไม่มีออร์เดอร์ที่เสร็จแล้ว"}
          </p>
          <p className="text-xs mt-1">ออร์เดอร์ใหม่จะปรากฏที่นี่ทันที</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              now={now}
              onUpdateItem={updateItem}
              nextStatus={nextStatus}
              stageOf={stageOf}
              mode={mode}
            />
          ))}
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function OrderCard({
  order,
  now,
  onUpdateItem,
  nextStatus,
  stageOf,
  mode = "active",
}: {
  order: OrderWithItems;
  now: number;
  onUpdateItem: (id: string, status: OrderItemStatus) => void;
  nextStatus: (status: OrderItemStatus) => OrderItemStatus | null;
  stageOf: (status: string) => ItemStage;
  mode?: "active" | "done";
}) {
  const ageMin = Math.floor((now - new Date(order.created_at).getTime()) / 60000);
  const isLate = ageMin >= LATE_MINUTES && mode === "active";
  const isCritical = ageMin >= CRITICAL_MINUTES && mode === "active";

  const items = order.order_items ?? [];
  const totalItems = items.length;
  const doneItems = items.filter((it) => it.status === "ready" || it.status === "served").length;

  const headerBg = isCritical
    ? `linear-gradient(135deg, ${COLORS.danger} 0%, ${COLORS.dangerText} 100%)`
    : isLate
      ? `linear-gradient(135deg, ${COLORS.warning} 0%, ${COLORS.warningText} 100%)`
      : `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: COLORS.surface,
        boxShadow: "var(--shadow)",
        border: `1px solid ${isCritical || isLate ? alpha("danger", 0.25) : COLORS.border}`,
      }}
    >
      {/* Header — table, age, progress */}
      <div className="p-4 flex items-center justify-between text-white" style={{ background: headerBg }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-2xl shrink-0">
            {order.tables?.table_number ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="text-xs opacity-85 tabular-nums">#{order.id.slice(0, 8)}</p>
            <p className="text-sm font-bold flex items-center gap-1.5">
              <span aria-hidden="true">⏱</span>
              {ageMin < 1 ? "เพิ่งเข้ามา" : `${ageMin} นาที`}
              {isLate && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-white/25">
                  {isCritical ? "ช้ามาก" : "ใกล้สาย"}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold tabular-nums">
            {doneItems}/{totalItems} เสร็จ
          </p>
          <p className="text-xs opacity-85">เก่าสุดก่อน</p>
        </div>
      </div>

      {/* Items */}
      <div className="p-3 sm:p-4 space-y-2.5">
        {items.map((item) => {
          const stage = stageOf(item.status);
          if (stage === "cancelled") return null;
          const next = nextStatus(item.status);
          return (
            <div
              key={item.id}
              className="rounded-xl p-3.5"
              style={{
                background:
                  stage === "doing"
                    ? COLORS.primaryLight
                    : stage === "ready"
                      ? COLORS.successLight
                      : COLORS.surface2,
                border: `1px solid ${
                  stage === "doing"
                    ? alpha("primary", 0.25)
                    : stage === "ready"
                      ? alpha("success", 0.25)
                      : COLORS.border
                }`,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-bold text-lg flex-1 leading-tight" style={{ color: COLORS.text }}>
                  <span style={{ color: COLORS.primaryText }}>{item.quantity}×</span>{" "}
                  {item.menu_items?.name ?? "เมนู"}
                </p>
                <StatusBadge stage={stage} />
              </div>

              {/* The note is the highest-value datum on the ticket — make it loud */}
              {item.note && (
                <div
                  className="text-sm font-semibold px-3 py-2 rounded-xl mb-3 flex items-start gap-2"
                  style={{
                    background: COLORS.surface,
                    color: COLORS.primaryDark,
                    border: `1px solid ${alpha("primary", 0.19)}`,
                  }}
                >
                  <span aria-hidden="true">💬</span>
                  <span>{item.note}</span>
                </div>
              )}

              {mode === "active" && next && (
                <button
                  onClick={() => onUpdateItem(item.id, next)}
                  className="w-full min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                  style={
                    stage === "new"
                      ? {
                          background: COLORS.primary,
                          color: COLORS.onPrimary,
                          boxShadow: "0 6px 16px -4px rgba(168, 72, 42, 0.5)",
                        }
                      : stage === "doing"
                        ? {
                            background: COLORS.success,
                            color: "#FFFFFF",
                            boxShadow: "0 6px 16px -4px rgba(63, 107, 52, 0.45)",
                          }
                        : {
                            background: COLORS.accentDeep,
                            color: "#FFFFFF",
                            boxShadow: "0 6px 16px -4px rgba(102, 72, 16, 0.45)",
                          }
                  }
                  aria-label={
                    next === "preparing"
                      ? `เริ่มทำ ${item.menu_items?.name}`
                      : next === "ready"
                        ? `พร้อมเสิร์ฟ ${item.menu_items?.name}`
                        : `เสิร์ฟแล้ว ${item.menu_items?.name}`
                  }
                >
                  {next === "preparing" && (
                    <>
                      <Flame size={16} aria-hidden="true" /> เริ่มทำ
                    </>
                  )}
                  {next === "ready" && (
                    <>
                      <Sparkles size={16} aria-hidden="true" /> พร้อมเสิร์ฟ
                    </>
                  )}
                  {next === "served" && (
                    <>
                      <Check size={16} aria-hidden="true" /> เสิร์ฟแล้ว
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function StatusBadge({ stage }: { stage: ItemStage }) {
  const map: Record<ItemStage, { label: string; bg: string; color: string }> = {
    new: { label: "รอครัว", bg: COLORS.surface3, color: COLORS.text },
    doing: { label: "กำลังทำ", bg: COLORS.primary, color: COLORS.onPrimary },
    ready: { label: "พร้อมเสิร์ฟ", bg: COLORS.success, color: "#FFFFFF" },
    done: { label: "เสิร์ฟแล้ว", bg: COLORS.successLight, color: COLORS.successText },
    cancelled: { label: "ยกเลิก", bg: COLORS.dangerLight, color: COLORS.dangerText },
  };
  const s = map[stage];
  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}
