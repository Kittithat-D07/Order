"use client";

import { OrderWithItems, OrderStatus } from "@/lib/types";
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { ChevronRight, X, Check } from "lucide-react";

const STATUS_FLOW: OrderStatus[] = ["pending", "preparing", "served"];

const NEXT_LABEL: Record<OrderStatus, string> = {
  pending: "รับออร์เดอร์",
  preparing: "เสิร์ฟแล้ว",
  served: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

const STATUS_ACCENT: Record<OrderStatus, string> = {
  pending: "bg-amber-500",
  preparing: "bg-blue-500",
  served: "bg-green-500",
  cancelled: "bg-stone-500",
};

export function OrderCard({ order }: { order: OrderWithItems }) {
  const [updating, setUpdating] = useState(false);
  const supabase = createClient();

  const updateStatus = async (newStatus: OrderStatus) => {
    setUpdating(true);
    await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id);
    setUpdating(false);
  };

  const status = order.status as OrderStatus;
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1];
  const itemCount = order.order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition">
      {/* Top accent bar */}
      <div className={`h-1 ${STATUS_ACCENT[status]}`} />

      <div className="p-3.5">
        {/* Header */}
        <div className="flex justify-between items-start mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center text-xs font-bold">
              {order.tables?.table_number ?? "?"}
            </div>
            <div>
              <p className="font-bold text-sm text-stone-900 leading-tight">
                โต๊ะ {order.tables?.table_number ?? "?"}
              </p>
              <p className="text-[10px] text-stone-500">
                {formatDateTime(order.created_at)}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-stone-400 font-mono">
            #{order.id.slice(0, 6)}
          </span>
        </div>

        {/* Items */}
        <div className="text-xs space-y-1 mb-2.5 max-h-32 overflow-y-auto pr-1">
          {order.order_items?.map((it) => (
            <div key={it.id} className="flex justify-between gap-2">
              <span className="text-stone-700 truncate flex-1">
                <span className="text-orange-600 font-semibold">{it.quantity}×</span>{" "}
                {it.menu_items?.name ?? "(เมนูถูกลบ)"}
                {it.note && (
                  <span className="block text-[10px] text-stone-400 italic pl-3">
                    💬 {it.note}
                  </span>
                )}
              </span>
              <span className="text-stone-500 text-[11px] shrink-0">
                ฿{formatPrice(it.subtotal)}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2.5 border-t border-stone-100">
          <div>
            <p className="text-[10px] text-stone-500">{itemCount} รายการ</p>
            <p className="font-bold text-base bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              ฿{formatPrice(order.total_amount)}
            </p>
          </div>

          <div className="flex gap-1.5">
            {status === "pending" && (
              <button
                onClick={() => updateStatus("cancelled")}
                disabled={updating}
                className="w-8 h-8 rounded-lg border border-stone-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-stone-500 flex items-center justify-center transition active:scale-90"
                title="ยกเลิก"
              >
                <X size={14} />
              </button>
            )}
            {nextStatus && (
              <button
                onClick={() => updateStatus(nextStatus)}
                disabled={updating}
                className="px-3 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-md text-white text-xs font-semibold flex items-center gap-1 transition active:scale-95"
              >
                {nextStatus === "served" ? (
                  <Check size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
                {NEXT_LABEL[status]}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
