"use client";

import { OrderWithItems, OrderItemStatus } from "@/lib/types";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { X, Check, ChefHat, Bell, Utensils } from "lucide-react";
import { useServerName } from "@/hooks/useServerName";

const STATUS_FLOW: Record<OrderItemStatus, OrderItemStatus | null> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
  served: null,
  cancelled: null,
};

const STATUS_LABEL: Record<OrderItemStatus, string> = {
  pending: "รอ",
  preparing: "กำลังทำ",
  ready: "พร้อมเสิร์ฟ",
  served: "เสิร์ฟแล้ว",
  cancelled: "ยกเลิก",
};

/** Status badges use the semantic tokens — the same palette the kitchen uses. */
const STATUS_BADGE: Record<OrderItemStatus, string> = {
  pending: "bg-surface-3 text-ink-muted",
  preparing: "bg-warn-light text-warn-text",
  ready: "bg-accent-light text-brand-dark",
  served: "bg-ok-light text-ok-text",
  cancelled: "bg-bad-light text-bad-text",
};

const STATUS_ACCENT: Record<OrderItemStatus, string> = {
  pending: "bg-line-strong",
  preparing: "bg-warn",
  ready: "bg-accent",
  served: "bg-ok",
  cancelled: "bg-bad",
};

const OVERALL_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "รอครัว", color: "bg-surface-3 text-ink-muted" },
  preparing: { label: "กำลังทำ", color: "bg-warn-light text-warn-text" },
  partial_ready: { label: "พร้อมเสิร์ฟบางส่วน", color: "bg-accent-light text-brand-dark" },
  completed: { label: "เสร็จสิ้น", color: "bg-ok-light text-ok-text" },
};

export function OrderCard({ order }: { order: OrderWithItems }) {
  const [updating, setUpdating] = useState<string | null>(null);
  const supabase = createClient();
  const { name: serverName } = useServerName();

  // คำนวณ overall status จาก items
  const items = order.order_items ?? [];
  const totalItems = items.length;
  const readyCount = items.filter((i) => i.status === "ready").length;
  const servedCount = items.filter((i) => i.status === "served").length;
  const preparingCount = items.filter((i) => i.status === "preparing").length;

  let overall: "pending" | "preparing" | "partial_ready" | "completed" = "pending";
  if (servedCount === totalItems && totalItems > 0) overall = "completed";
  else if (readyCount > 0) overall = "partial_ready";
  else if (preparingCount > 0) overall = "preparing";

  const updateItemStatus = async (itemId: string, newStatus: OrderItemStatus) => {
    setUpdating(itemId);
    await supabase
      .from("order_items")
      .update({
        status: newStatus,
        served_by: newStatus === "served" ? serverName : null,
        served_at: newStatus === "served" ? new Date().toISOString() : null,
      })
      .eq("id", itemId);
    setUpdating(null);
  };

  const claimOrder = async () => {
    await supabase
      .from("orders")
      .update({ server_name: serverName, claimed_at: new Date().toISOString() })
      .eq("id", order.id);
  };

  const isClaimed = !!order.server_name;
  const isMyOrder = order.server_name === serverName;
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden hover:shadow-md transition">
      {/* Top accent bar */}
      <div
        className={`h-1 ${
          overall === "completed"
            ? "bg-ok"
            : overall === "partial_ready"
              ? "bg-accent"
              : "bg-warn"
        }`}
      />

      <div className="p-3.5">
        {/* Header */}
        <div className="flex justify-between items-start mb-2.5 gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-ink text-on-primary flex items-center justify-center text-xs font-bold shrink-0">
              {order.tables?.table_number ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-bold text-sm text-ink leading-tight">
                  โต๊ะ {order.tables?.table_number ?? "?"}
                </p>
                {/* 11px, not 9px — the badge is read at arm's length. */}
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${OVERALL_STATUS_LABEL[overall].color}`}
                >
                  {OVERALL_STATUS_LABEL[overall].label}
                </span>
              </div>
              <p className="text-[11px] text-ink-muted">
                {formatDateTime(order.created_at)} • {itemCount} รายการ
              </p>
            </div>
          </div>
          <span className="text-[11px] text-ink-soft font-mono shrink-0">
            #{order.id.slice(0, 6)}
          </span>
        </div>

        {/* Server info — always name the server. "คุณ" is ambiguous when two
            servers are looking at the same board. */}
        {isClaimed ? (
          <div
            className={`mb-2.5 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 ${
              isMyOrder ? "bg-ok-light text-ok-text" : "bg-surface-2 text-ink-muted"
            }`}
          >
            <Utensils size={11} aria-hidden="true" />
            <span className="font-medium">{order.server_name}</span>
            {isMyOrder && (
              <span className="text-[11px] font-semibold">(คุณ)</span>
            )}
          </div>
        ) : serverName ? (
          <button
            onClick={claimOrder}
            className="w-full mb-2.5 px-2.5 py-2 min-h-[40px] rounded-lg bg-ok-light hover:bg-ok/20 text-ok-text text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Bell size={12} aria-hidden="true" />
            รับออร์เดอร์นี้
          </button>
        ) : (
          <div className="mb-2.5 px-2.5 py-2 rounded-lg bg-warn-light text-warn-text text-xs text-center">
            ⚠️ กรุณาใส่ชื่อเสริฟ์ก่อนรับออร์เดอร์
          </div>
        )}

        {/* Items - แต่ละเมนูแยกสถานะ */}
        <div className="space-y-1.5 mb-2.5">
          {items.map((it) => {
            const nextStatus = STATUS_FLOW[it.status as OrderItemStatus];
            const itemStatus = it.status as OrderItemStatus;
            return (
              <div key={it.id} className="rounded-lg border border-line overflow-hidden">
                <div className={`h-0.5 ${STATUS_ACCENT[itemStatus]}`} />
                <div className="p-2 bg-surface">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ink">
                        <span className="text-brand font-semibold">{it.quantity}×</span>{" "}
                        {it.menu_items?.name ?? "(เมนูถูกลบ)"}
                      </p>
                      {it.note && (
                        <p className="text-[11px] text-accent italic pl-3 mt-0.5">
                          💬 {it.note}
                        </p>
                      )}
                      {it.served_by && itemStatus === "served" && (
                        <p className="text-[11px] text-ok-text pl-3 mt-0.5">
                          ✓ เสิร์ฟโดย {it.served_by}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[itemStatus]}`}
                      >
                        {STATUS_LABEL[itemStatus]}
                      </span>
                      <span className="text-[11px] text-ink-muted">{formatPrice(it.subtotal)}</span>
                    </div>
                  </div>

                  {/* Action buttons — 36px tall, not 28px */}
                  {itemStatus !== "served" && itemStatus !== "cancelled" && (
                    <div className="flex gap-1">
                      {itemStatus === "ready" && (
                        <button
                          onClick={() => updateItemStatus(it.id, "served")}
                          disabled={updating === it.id}
                          className="flex-1 min-h-[36px] rounded-md bg-ok hover:opacity-90 text-white text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95"
                        >
                          <Check size={12} aria-hidden="true" /> นำไปเสิร์ฟ
                        </button>
                      )}
                      {nextStatus && itemStatus !== "ready" && (
                        <button
                          onClick={() => updateItemStatus(it.id, nextStatus)}
                          disabled={updating === it.id}
                          className="flex-1 min-h-[36px] rounded-md bg-brand hover:bg-brand-dark text-white text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95"
                        >
                          {nextStatus === "preparing" ? (
                            <ChefHat size={12} aria-hidden="true" />
                          ) : (
                            <Check size={12} aria-hidden="true" />
                          )}
                          {nextStatus === "preparing" ? "เริ่มทำ" : "พร้อมเสิร์ฟ"}
                        </button>
                      )}
                      {itemStatus === "pending" && (
                        <button
                          onClick={() => updateItemStatus(it.id, "cancelled")}
                          disabled={updating === it.id}
                          className="w-9 min-h-[36px] rounded-md border border-line hover:bg-bad-light hover:border-bad/40 hover:text-bad-text text-ink-muted flex items-center justify-center transition active:scale-90"
                          aria-label={`ยกเลิก ${it.menu_items?.name ?? "เมนู"}`}
                          title="ยกเลิก"
                        >
                          <X size={12} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer — the total is a number the operator may read aloud, so it
            is plain text, not gradient-clipped. */}
        <div className="flex justify-between items-center pt-2.5 border-t border-line-soft">
          <div>
            <p className="text-[11px] text-ink-muted">
              {servedCount}/{totalItems} เสร็จ • {readyCount} พร้อมเสิร์ฟ
            </p>
            <p className="font-bold text-base text-brand">
              ฿{formatPrice(order.total_amount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
