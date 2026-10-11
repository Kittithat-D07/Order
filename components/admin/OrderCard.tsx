"use client";

import { OrderWithItems, OrderStatus } from "@/lib/types";
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { ChevronRight } from "lucide-react";

type UpdatableOrder = Pick<OrderWithItems, "id" | "status">;

const STATUS_FLOW: OrderStatus[] = ["pending", "preparing", "served"];

const NEXT_LABEL: Record<OrderStatus, string> = {
  pending: "รับออร์เดอร์",
  preparing: "เสิร์ฟแล้ว",
  served: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
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

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-stone-200">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-bold text-sm">
            โต๊ะ {order.tables?.table_number ?? "?"}
          </p>
          <p className="text-xs text-stone-500">
            {formatDateTime(order.created_at)}
          </p>
        </div>
        <p className="text-xs text-stone-400 font-mono">
          #{order.id.slice(0, 6)}
        </p>
      </div>

      <div className="text-xs space-y-1 mb-2 max-h-32 overflow-y-auto">
        {order.order_items?.map((it) => (
          <div key={it.id} className="flex justify-between">
            <span>
              {it.menu_items?.name ?? "(เมนูถูกลบ)"} × {it.quantity}
            </span>
            <span className="text-stone-500">{formatPrice(it.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-2 border-t">
        <span className="font-bold text-brand-600 text-sm">
          {formatPrice(order.total_amount)}
        </span>

        <div className="flex gap-1">
          {status === "pending" && (
            <button
              onClick={() => updateStatus("cancelled")}
              disabled={updating}
              className="text-xs px-2 py-1 rounded border border-stone-300 hover:bg-stone-100"
            >
              ยกเลิก
            </button>
          )}
          {nextStatus && (
            <button
              onClick={() => updateStatus(nextStatus)}
              disabled={updating}
              className="text-xs px-2 py-1 rounded bg-brand-500 hover:bg-brand-600 text-white flex items-center gap-1"
            >
              {NEXT_LABEL[status]} <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
