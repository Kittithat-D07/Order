"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, OrderStatus } from "@/lib/types";
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Utensils,
  XCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

const STATUS_ICONS: Record<OrderStatus, any> = {
  pending: Clock,
  preparing: ChefHat,
  served: CheckCircle2,
  cancelled: XCircle,
};

const STATUS_CONFIG: Record<
  OrderStatus,
  { bg: string; color: string; label: string; desc: string }
> = {
  pending: {
    bg: "from-amber-100 to-orange-100",
    color: "text-amber-600",
    label: "รอยืนยัน",
    desc: "ร้านกำลังตรวจสอบออร์เดอร์ของคุณ",
  },
  preparing: {
    bg: "from-orange-100 to-red-100",
    color: "text-orange-600",
    label: "กำลังทำ",
    desc: "เชฟกำลังทำอาหารให้คุณ รอสักครู่นะคะ",
  },
  served: {
    bg: "from-green-100 to-emerald-100",
    color: "text-green-600",
    label: "เสิร์ฟแล้ว",
    desc: "อาหารถูกเสิร์ฟแล้ว ขอให้มื้อนี้เป็นมื้อที่อร่อย! 🍽️",
  },
  cancelled: {
    bg: "from-stone-100 to-stone-200",
    color: "text-stone-500",
    label: "ยกเลิก",
    desc: "ออร์เดอร์ถูกยกเลิก",
  },
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
          setOrder((prev) =>
            prev ? ({ ...prev, ...newRow } as OrderWithItems) : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
          <Loader2 className="animate-spin text-white" size={24} />
        </div>
        <p className="text-sm text-stone-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
            <XCircle size={32} className="text-red-600" />
          </div>
          <p className="text-stone-800 font-semibold mb-1">เกิดข้อผิดพลาด</p>
          <p className="text-stone-600 text-sm">{error ?? "ไม่พบออร์เดอร์"}</p>
        </div>
      </div>
    );
  }

  const status = order.status as OrderStatus;
  const Icon = STATUS_ICONS[status];
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="min-h-screen pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-400" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative px-6 pt-12 pb-10 text-center text-white">
          <p className="text-xs font-medium opacity-80 mb-1">
            โต๊ะ {order.tables?.table_number}
          </p>

          {/* Status Icon */}
          <div className="relative inline-block mb-5">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-110" />
            <div className="relative w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40">
              <Icon size={38} strokeWidth={2.2} />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-1">สั่งอาหารสำเร็จ!</h1>
          <p className="text-sm opacity-80">#{order.id.slice(0, 8).toUpperCase()}</p>

          {/* Order ID Badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium">
            <Clock size={12} />
            {formatDateTime(order.created_at)}
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 -mt-3">
        {/* Status Card */}
        <div
          className={`card-interactive p-5 mb-4 bg-gradient-to-br ${cfg.bg} border-0`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center shadow-sm`}>
              <Icon size={24} className={cfg.color} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</h2>
              <p className="text-sm text-stone-600 leading-snug">{cfg.desc}</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mt-5 flex items-center gap-1">
            {(["pending", "preparing", "served"] as OrderStatus[]).map((s, i) => {
              const isActive = status === s;
              const isPast =
                (status === "preparing" && s === "pending") ||
                (status === "served" && (s === "pending" || s === "preparing"));
              const cfg2 = STATUS_CONFIG[s];
              const Icon2 = STATUS_ICONS[s];
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all ${
                        isPast
                          ? "bg-green-500 text-white"
                          : isActive
                          ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md"
                          : "bg-white text-stone-400"
                      }`}
                    >
                      {isPast ? <CheckCircle2 size={16} /> : <Icon2 size={14} />}
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        isActive ? "text-orange-700" : isPast ? "text-green-700" : "text-stone-400"
                      }`}
                    >
                      {cfg2.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${
                        isPast ? "bg-green-400" : "bg-stone-300"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Items */}
        <div className="card p-5 mb-4">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
            <Utensils size={15} className="text-orange-500" />
            รายการอาหาร
          </h3>
          <div className="space-y-2.5">
            {order.order_items?.map((it) => (
              <div
                key={it.id}
                className="flex justify-between items-start gap-3 py-2 border-b border-stone-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">
                    {it.menu_items?.name ?? "(เมนูถูกลบ)"}
                    <span className="text-stone-500 font-normal ml-1">× {it.quantity}</span>
                  </p>
                  {it.note && (
                    <p className="text-xs text-stone-500 italic mt-0.5">
                      💬 {it.note}
                    </p>
                  )}
                </div>
                <span className="font-semibold text-sm text-stone-800 shrink-0">
                  ฿{formatPrice(it.subtotal)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-baseline mt-4 pt-3 border-t border-stone-200">
            <span className="text-sm text-stone-500">รวมทั้งหมด</span>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              ฿{formatPrice(order.total_amount)}
            </span>
          </div>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl mb-6">
          <div className="w-8 h-8 rounded-lg bg-amber-200/60 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">เคล็ดลับ</p>
            <p className="text-xs text-amber-700 mt-0.5">
              หน้านี้อัปเดตอัตโนมัติเมื่อเชฟเปลี่ยนสถานะ — ไม่ต้องรีเฟรช!
            </p>
          </div>
        </div>

        <a
          href="/"
          className="flex items-center justify-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition py-3"
        >
          <ArrowLeft size={14} /> กลับหน้าหลัก
        </a>
      </main>
    </div>
  );
}
