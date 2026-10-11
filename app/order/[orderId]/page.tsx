"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, OrderStatus } from "@/lib/types";
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS } from "@/lib/utils";
import { CheckCircle2, Clock, ChefHat, Utensils, XCircle, Loader2 } from "lucide-react";

const STATUS_ICONS: Record<OrderStatus, any> = {
  pending: Clock,
  preparing: ChefHat,
  served: CheckCircle2,
  cancelled: XCircle,
};

const STATUS_DESC: Record<OrderStatus, string> = {
  pending: "ร้านกำลังตรวจสอบออร์เดอร์ของคุณ",
  preparing: "เชฟกำลังทำอาหารให้คุณ",
  served: "อาหารถูกเสิร์ฟแล้ว ขอให้มื้อนี้เป็นมื้อที่อร่อย!",
  cancelled: "ออร์เดอร์ถูกยกเลิก",
};

export default function OrderStatusPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_items(*)), tables(*)")
        .eq("id", orderId)
        .single();

      if (error || !data) {
        setError("ไม่พบออร์เดอร์");
      } else {
        setOrder(data as OrderWithItems);
      }
      setLoading(false);
    };

    load();

    // Subscribe realtime
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newRow = payload.new as Partial<OrderWithItems>;
          setOrder((prev) => (prev ? { ...prev, ...newRow } as OrderWithItems : prev));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-red-600">{error ?? "ไม่พบออร์เดอร์"}</p>
      </div>
    );
  }

  const Icon = STATUS_ICONS[order.status as OrderStatus];
  const label = ORDER_STATUS_LABELS[order.status];
  const desc = STATUS_DESC[order.status as OrderStatus];

  return (
    <div className="min-h-screen pb-12">
      <header className="bg-brand-500 text-white p-6 text-center">
        <p className="text-sm opacity-90">โต๊ะ {order.tables?.table_number}</p>
        <h1 className="text-2xl font-bold mt-1">สถานะออร์เดอร์</h1>
        <p className="text-xs opacity-75 mt-1 font-mono">#{order.id.slice(0, 8)}</p>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <section className="bg-white rounded-xl p-6 shadow-sm border text-center">
          <div
            className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
              order.status === "cancelled"
                ? "bg-stone-200"
                : order.status === "served"
                ? "bg-green-100"
                : "bg-brand-100"
            }`}
          >
            <Icon
              size={40}
              className={
                order.status === "cancelled"
                  ? "text-stone-500"
                  : order.status === "served"
                  ? "text-green-600"
                  : "text-brand-600"
              }
            />
          </div>
          <h2 className="text-2xl font-bold mt-3">{label}</h2>
          <p className="text-stone-600 mt-1 text-sm">{desc}</p>
          <p className="text-xs text-stone-400 mt-2">
            {formatDateTime(order.created_at)}
          </p>
        </section>

        <section className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Utensils size={16} /> รายการอาหาร
          </h3>
          <div className="space-y-2">
            {order.order_items?.map((it) => (
              <div
                key={it.id}
                className="flex justify-between items-start text-sm border-b last:border-0 pb-2 last:pb-0"
              >
                <div className="flex-1">
                  <p>
                    {it.menu_items?.name ?? "(เมนูถูกลบ)"}{" "}
                    <span className="text-stone-500">× {it.quantity}</span>
                  </p>
                  {it.note && (
                    <p className="text-xs text-stone-500 italic mt-0.5">
                      หมายเหตุ: {it.note}
                    </p>
                  )}
                </div>
                <span className="font-medium">{formatPrice(it.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t font-bold">
            <span>รวม</span>
            <span className="text-brand-600">
              {formatPrice(order.total_amount)}
            </span>
          </div>
        </section>

        <a
          href="/"
          className="block text-center text-sm text-stone-500 hover:underline"
        >
          กลับหน้าหลัก
        </a>
      </main>
    </div>
  );
}
