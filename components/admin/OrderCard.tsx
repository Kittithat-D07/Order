"use client";

import { OrderWithItems, OrderItemStatus } from "@/lib/types";
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { ChevronRight, X, Check, ChefHat, Bell, Utensils } from "lucide-react";
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

const STATUS_BADGE: Record<OrderItemStatus, string> = {
  pending: "bg-stone-100 text-stone-600",
  preparing: "bg-amber-100 text-amber-700",
  ready: "bg-blue-100 text-blue-700",
  served: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const STATUS_ACCENT: Record<OrderItemStatus, string> = {
  pending: "bg-stone-300",
  preparing: "bg-amber-500",
  ready: "bg-blue-500",
  served: "bg-green-500",
  cancelled: "bg-red-500",
};

const OVERALL_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "รอครัว", color: "bg-amber-100 text-amber-700" },
  preparing: { label: "กำลังทำ", color: "bg-blue-100 text-blue-700" },
  partial_ready: { label: "พร้อมเสิร์ฟบางส่วน", color: "bg-cyan-100 text-cyan-700" },
  completed: { label: "เสร็จสิ้น", color: "bg-green-100 text-green-700" },
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
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition">
      {/* Top accent bar */}
      <div className={`h-1 ${overall === "completed" ? "bg-green-500" : overall === "partial_ready" ? "bg-cyan-500" : "bg-amber-500"}`} />

      <div className="p-3.5">
        {/* Header */}
        <div className="flex justify-between items-start mb-2.5 gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-stone-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {order.tables?.table_number ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-sm text-stone-900 leading-tight">
                  โต๊ะ {order.tables?.table_number ?? "?"}
                </p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${OVERALL_STATUS_LABEL[overall].color}`}>
                  {OVERALL_STATUS_LABEL[overall].label}
                </span>
              </div>
              <p className="text-[10px] text-stone-500">
                {formatDateTime(order.created_at)} • {itemCount} รายการ
              </p>
            </div>
          </div>
          <span className="text-[10px] text-stone-400 font-mono shrink-0">
            #{order.id.slice(0, 6)}
          </span>
        </div>

        {/* Server info */}
        {isClaimed ? (
          <div className={`mb-2.5 px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5 ${isMyOrder ? "bg-green-50 text-green-700" : "bg-stone-50 text-stone-600"}`}>
            <Utensils size={11} />
            <span className="font-medium">
              {isMyOrder ? "คุณ" : order.server_name}
            </span>
            {isMyOrder && <span className="text-[10px]">กำลังดูแล</span>}
          </div>
        ) : serverName ? (
          <button
            onClick={claimOrder}
            className="w-full mb-2.5 px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Bell size={11} />
            รับออร์เดอร์นี้
          </button>
        ) : (
          <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-[11px] text-center">
            ⚠️ ใส่ชื่อเสริฟ์ที่มุมขวาบนก่อน
          </div>
        )}

        {/* Items - แต่ละเมนูแยกสถานะ */}
        <div className="space-y-1.5 mb-2.5">
          {items.map((it) => {
            const nextStatus = STATUS_FLOW[it.status as OrderItemStatus];
            const itemStatus = it.status as OrderItemStatus;
            return (
              <div
                key={it.id}
                className="rounded-lg border border-stone-200 overflow-hidden"
              >
                <div className={`h-0.5 ${STATUS_ACCENT[itemStatus]}`} />
                <div className="p-2 bg-white">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-stone-800">
                        <span className="text-orange-600 font-semibold">{it.quantity}×</span>{" "}
                        {it.menu_items?.name ?? "(เมนูถูกลบ)"}
                      </p>
                      {it.note && (
                        <p className="text-[10px] text-stone-400 italic pl-3 mt-0.5">
                          💬 {it.note}
                        </p>
                      )}
                      {it.served_by && itemStatus === "served" && (
                        <p className="text-[10px] text-green-600 pl-3 mt-0.5">
                          ✓ เสิร์ฟโดย {it.served_by}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[itemStatus]}`}>
                        {STATUS_LABEL[itemStatus]}
                      </span>
                      <span className="text-[10px] text-stone-500">฿{formatPrice(it.subtotal)}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {itemStatus !== "served" && itemStatus !== "cancelled" && (
                    <div className="flex gap-1">
                      {itemStatus === "ready" && (
                        <button
                          onClick={() => updateItemStatus(it.id, "served")}
                          disabled={updating === it.id}
                          className="flex-1 h-7 rounded-md bg-green-500 hover:bg-green-600 text-white text-[10px] font-semibold flex items-center justify-center gap-1 transition active:scale-95"
                        >
                          <Check size={10} /> นำไปเสิร์ฟ
                        </button>
                      )}
                      {nextStatus && itemStatus !== "ready" && (
                        <button
                          onClick={() => updateItemStatus(it.id, nextStatus)}
                          disabled={updating === it.id}
                          className="flex-1 h-7 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-semibold flex items-center justify-center gap-1 transition active:scale-95"
                        >
                          {nextStatus === "preparing" ? <ChefHat size={10} /> : <Check size={10} />}
                          {nextStatus === "preparing" ? "เริ่มทำ" : "พร้อมเสิร์ฟ"}
                        </button>
                      )}
                      {itemStatus === "pending" && (
                        <button
                          onClick={() => updateItemStatus(it.id, "cancelled")}
                          disabled={updating === it.id}
                          className="w-7 h-7 rounded-md border border-stone-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-stone-500 flex items-center justify-center transition active:scale-90"
                          title="ยกเลิก"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2.5 border-t border-stone-100">
          <div>
            <p className="text-[10px] text-stone-500">
              {servedCount}/{totalItems} เสร็จ • {readyCount} พร้อมเสิร์ฟ
            </p>
            <p className="font-bold text-base bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              ฿{formatPrice(order.total_amount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
