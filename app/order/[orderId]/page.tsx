"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, OrderStatus, Bill } from "@/lib/types";
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
  Receipt,
  AlertCircle,
  Flame,
  Heart,
} from "lucide-react";
import { BlurFade, GradientBlob, FloatingElement, PulseDot, Shimmer } from "@/components/ui/magic-effects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const [bill, setBill] = useState<Bill | null>(null);
  const [requestingBill, setRequestingBill] = useState(false);
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

      // โหลดบิล (ถ้ามี)
      const { data: billData } = await supabase
        .from("bills")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
      if (billData) setBill(billData as Bill);

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

    // Subscribe to bill
    const billChannel = supabase
      .channel(`order-bill-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bills",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setBill(payload.new as Bill);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(billChannel);
    };
  }, [orderId]);

  // ตรวจสอบว่าทุกรายการเสิร์ฟแล้วหรือยัง
  const allServed = order?.order_items?.every(
    (it) => (it as any).status === "served" || (it as any).status === "cancelled"
  ) ?? false;

  const handleRequestBill = async () => {
    if (!order || bill) return;
    setRequestingBill(true);
    const supabase = createClient();
    await supabase.from("bills").insert({
      order_id: order.id,
      total_amount: order.total_amount,
    });
    setRequestingBill(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 relative overflow-hidden flex flex-col items-center justify-center gap-4">
        <GradientBlob className="top-[-100px] left-[-100px]" color="bg-orange-300/30" />
        <GradientBlob className="bottom-[-100px] right-[-100px]" color="bg-amber-300/30" delay={1} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-orange-500/40"
        >
          <Loader2 className="text-white" size={28} />
        </motion.div>
        <div className="flex items-center gap-2">
          <PulseDot color="bg-orange-500" />
          <p className="text-sm text-stone-600 font-medium">กำลังโหลดออร์เดอร์...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 relative overflow-hidden flex items-center justify-center p-6">
        <GradientBlob className="top-[-100px] right-[-100px]" color="bg-red-300/30" />
        <GradientBlob className="bottom-[-100px] left-[-100px]" color="bg-orange-300/30" delay={1} />
        <BlurFade>
          <div className="max-w-sm text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-red-500/40"
            >
              <AlertCircle size={36} className="text-white" />
            </motion.div>
            <p className="text-stone-800 font-bold text-lg mb-2">เกิดข้อผิดพลาด</p>
            <p className="text-stone-600 text-sm mb-6">{error ?? "ไม่พบออร์เดอร์"}</p>
            <Link href="/menu?table=t01-demo-aaaa">
              <Button className="bg-gradient-to-r from-orange-500 to-amber-500">
                <ArrowLeft size={14} className="mr-2" /> กลับไปสั่งอาหาร
              </Button>
            </Link>
          </div>
        </BlurFade>
      </div>
    );
  }

  const status = order.status as OrderStatus;
  const Icon = STATUS_ICONS[status];
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="min-h-screen pb-12 relative overflow-hidden bg-stone-50">
      {/* Animated Background Blobs */}
      <GradientBlob
        className="w-96 h-96 bg-gradient-to-br from-orange-300 to-amber-300 -top-20 -right-20"
        delay={0}
      />
      <GradientBlob
        className="w-80 h-80 bg-gradient-to-br from-amber-200 to-yellow-200 top-1/2 -left-20"
        delay={3}
      />
      <GradientBlob
        className="w-72 h-72 bg-gradient-to-br from-rose-200 to-orange-200 bottom-0 right-0"
        delay={6}
      />

      {/* Floating decorations */}
      <FloatingElement className="top-32 right-8" delay={0}>
        <Flame className="w-6 h-6 text-orange-400/50" />
      </FloatingElement>
      <FloatingElement className="top-1/2 left-4" delay={2}>
        <Heart className="w-5 h-5 text-rose-400/50" />
      </FloatingElement>
      <FloatingElement className="bottom-32 right-12" delay={4}>
        <Sparkles className="w-5 h-5 text-amber-400/50" />
      </FloatingElement>

      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-400 animate-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-300/20 rounded-full blur-2xl" />

        <div className="relative px-6 pt-12 pb-10 text-center text-white">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xs font-medium opacity-90 mb-1 flex items-center justify-center gap-1.5"
          >
            <PulseDot color="bg-white" />
            โต๊ะ {order.tables?.table_number}
          </motion.p>

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
      </motion.div>

      <main className="max-w-md mx-auto px-4 -mt-3">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
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
        </motion.div>

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card p-5 mb-4"
        >
          <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
            <Utensils size={15} className="text-orange-500" />
            รายการอาหาร
          </h3>
          <div className="space-y-2.5">
            <AnimatePresence>
              {order.order_items?.map((it, idx) => (
                <motion.div
                  key={it.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
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
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="flex justify-between items-baseline mt-4 pt-3 border-t border-stone-200">
            <span className="text-sm text-stone-500">รวมทั้งหมด</span>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              ฿{formatPrice(order.total_amount)}
            </span>
          </div>
        </motion.div>

        {/* Tip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-start gap-3 p-4 bg-amber-50/80 backdrop-blur-sm rounded-2xl mb-4 border border-amber-200/50"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-200/60 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">เคล็ดลับ</p>
            <p className="text-xs text-stone-600 mt-0.5">
              หน้านี้อัปเดตอัตโนมัติเมื่อเชฟเปลี่ยนสถานะ — ไม่ต้องรีเฟรช!
            </p>
          </div>
        </motion.div>

        {/* Bill Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {bill ? (
            <Link href={`/bill/${order.id}`} className="block">
              <Button variant="success" size="lg" className="w-full">
                <Receipt size={18} />
                ดูบิล ({bill.bill_number})
              </Button>
            </Link>
          ) : allServed ? (
            <Button
              onClick={handleRequestBill}
              disabled={requestingBill}
              size="lg"
              className="w-full"
            >
              {requestingBill ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Receipt size={18} />
              )}
              ขอบิล / Request Bill
            </Button>
          ) : null}
        </motion.div>

        <a
          href="/"
          className="flex items-center justify-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition py-3 mt-2"
        >
          <ArrowLeft size={14} /> กลับหน้าหลัก
        </a>
      </main>
    </div>
  );
}
