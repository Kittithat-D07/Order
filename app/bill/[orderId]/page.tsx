"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, OrderItemStatus, Bill } from "@/lib/types";
import { formatPrice, formatDateTime } from "@/lib/utils";
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Receipt,
  Sparkles,
  ChefHat,
  Bell,
  Utensils,
  XCircle,
  Star,
  Flame,
  Leaf,
  ImageOff,
} from "lucide-react";
import {
  BlurFade,
  GradientBlob,
  FloatingElement,
  Shimmer,
  PulseDot,
} from "@/components/ui/magic-effects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

// สี/label ของแต่ละสถานะ item
const ITEM_STATUS_CONFIG: Record<
  OrderItemStatus,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  pending: {
    label: "รอครัว",
    color: "text-stone-500",
    bg: "bg-stone-50",
    border: "border-stone-200",
    icon: Clock,
  },
  preparing: {
    label: "กำลังทำ",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: ChefHat,
  },
  ready: {
    label: "พร้อมเสิร์ฟ",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Bell,
  },
  served: {
    label: "เสิร์ฟแล้ว",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "ยกเลิก",
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: XCircle,
  },
};

export default function BillPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = params.orderId;

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadOrder = useCallback(async (silent = false) => {
    const supabase = createClient();
    const { data: orderData, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*, menu_items(*)), tables(*)")
      .eq("id", orderId)
      .single();

    if (orderErr || !orderData) {
      if (!silent) setError("ไม่พบออร์เดอร์");
      return;
    }
    setOrder(orderData as OrderWithItems);
  }, [orderId]);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      await loadOrder(true);
      const { data: billData } = await supabase
        .from("bills")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (billData) setBill(billData as Bill);
      setLoading(false);
    };

    load();

    const orderChannel = supabase
      .channel(`bill-order-${orderId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        setOrder((prev) => prev ? ({ ...prev, ...payload.new } as OrderWithItems) : prev);
      })
      .subscribe();

    const itemsChannel = supabase
      .channel(`bill-items-${orderId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "order_items",
      }, (payload) => {
        const newItem = payload.new as { order_id?: string };
        const oldItem = payload.old as { order_id?: string };
        if (newItem?.order_id === orderId || oldItem?.order_id === orderId) {
          loadOrder(true);
        }
      })
      .subscribe();

    const billChannel = supabase
      .channel(`bill-${orderId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "bills",
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          setBill(payload.new as Bill);
        }
      })
      .subscribe();

    pollIntervalRef.current = setInterval(() => loadOrder(true), 5000);

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(billChannel);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [orderId, loadOrder]);

  const handlePrint = async () => {
    if (bill && !bill.printed_at) {
      const supabase = createClient();
      await supabase
        .from("bills")
        .update({ printed_at: new Date().toISOString() })
        .eq("id", bill.id);
    }
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 relative overflow-hidden flex items-center justify-center">
        <GradientBlob className="top-[-100px] right-[-100px]" color="bg-amber-300/30" />
        <GradientBlob className="bottom-[-100px] left-[-100px]" color="bg-orange-300/30" delay={1} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-orange-500/40"
        >
          <Receipt className="text-white" size={28} />
        </motion.div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 relative overflow-hidden flex items-center justify-center p-6">
        <GradientBlob className="top-[-100px] right-[-100px]" color="bg-red-300/30" />
        <BlurFade>
          <Card className="max-w-sm">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Clock className="text-white" size={28} />
              </div>
              <p className="text-stone-800 font-bold text-lg mb-2">เกิดข้อผิดพลาด</p>
              <p className="text-stone-600 text-sm">{error ?? "ไม่พบออร์เดอร์"}</p>
            </CardContent>
          </Card>
        </BlurFade>
      </div>
    );
  }

  const items = order.order_items ?? [];
  const counts = {
    pending: items.filter((i) => (i as any).status === "pending").length,
    preparing: items.filter((i) => (i as any).status === "preparing").length,
    ready: items.filter((i) => (i as any).status === "ready").length,
    served: items.filter((i) => (i as any).status === "served").length,
    cancelled: items.filter((i) => (i as any).status === "cancelled").length,
  };

  const totalItems = items.filter((i) => (i as any).status !== "cancelled").length;
  const allDone =
    counts.pending === 0 &&
    counts.preparing === 0 &&
    counts.ready === 0 &&
    counts.served > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 print:bg-white relative overflow-hidden">

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      {/* Background */}
      <GradientBlob className="top-[-150px] right-[-100px]" color="bg-amber-300/30" />
      <GradientBlob className="top-[40%] left-[-100px]" color="bg-orange-300/30" delay={2} />
      <GradientBlob className="bottom-[-100px] right-[20%]" color="bg-red-300/30" delay={4} />

      <FloatingElement className="top-32 right-12" delay={0}>
        <Receipt className="w-7 h-7 text-amber-400/50" />
      </FloatingElement>
      <FloatingElement className="top-52 left-10" delay={1}>
        <Flame className="w-6 h-6 text-orange-400/50" />
      </FloatingElement>
      <FloatingElement className="bottom-52 right-20" delay={2}>
        <Leaf className="w-5 h-5 text-green-400/50" />
      </FloatingElement>

      <div className="relative z-10 max-w-lg mx-auto px-3 py-4 print:p-0">

        {/* Top bar */}
        <BlurFade delay={0.05}>
          <div className="no-print mb-4 flex items-center justify-between">
            <Button onClick={() => router.back()} variant="ghost" size="sm">
              <ArrowLeft size={14} className="mr-1.5" /> กลับ
            </Button>
            <div className="flex items-center gap-2">
              <PulseDot color="bg-orange-500" />
              <span className="text-xs text-stone-500">อัปเดตทุก 5 วินี</span>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handlePrint}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30"
              >
                <Printer size={14} className="mr-1.5" /> พิมพ์
              </Button>
            </motion.div>
          </div>
        </BlurFade>

        {/* Hero Header */}
        <BlurFade delay={0.1}>
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/60 backdrop-blur-sm rounded-full shadow-sm mb-3">
              <PulseDot color="bg-orange-500" />
              <span className="text-xs font-medium text-stone-600">ใบเสร็จรับเงิน</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 via-amber-500 to-red-500 bg-clip-text text-transparent">
              สถานะออร์เดอร์
            </h1>
            <p className="text-stone-500 mt-1 text-sm">
              โต๊ะ {order.tables?.table_number} • #{order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </BlurFade>

        {/* Bill Card */}
        <BlurFade delay={0.2}>
          <Card className="bg-white/90 backdrop-blur-md shadow-2xl print:shadow-none print:rounded-none border-0 overflow-hidden mb-4">

            {/* Bill Header Banner */}
            <div className="relative bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 p-6 overflow-hidden">
              <Shimmer />
              <div className="relative z-10 flex items-center gap-4">
                <motion.div
                  animate={{ rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg flex-shrink-0"
                >
                  <Utensils className="w-7 h-7 text-white" />
                </motion.div>
                <div className="flex-1">
                  <h2 className="text-white font-bold text-lg leading-tight">ร้านอาหาร QR Order</h2>
                  <p className="text-orange-100 text-xs flex items-center gap-1 mt-0.5">
                    <Sparkles size={11} />
                    ใบเสร็จรับเงิน / Receipt
                  </p>
                  {bill?.bill_number && (
                    <p className="text-white/80 text-xs font-mono mt-1">
                      เลขที่ {bill.bill_number}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5">
                    <p className="text-white text-xs opacity-80">โต๊ะ</p>
                    <p className="text-white font-bold text-xl leading-none">{order.tables?.table_number}</p>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-5">

              {/* Bill Meta */}
              <div className="space-y-1.5 text-sm mb-4 pb-4 border-b-2 border-dashed border-stone-200">
                <div className="flex justify-between">
                  <span className="text-stone-400">วันที่สั่ง:</span>
                  <span className="text-stone-700 font-medium">{formatDateTime(order.created_at)}</span>
                </div>
                {bill?.requested_at && (
                  <div className="flex justify-between">
                    <span className="text-stone-400">ขอบิลเมื่อ:</span>
                    <span className="text-stone-700 font-medium">{formatDateTime(bill.requested_at)}</span>
                  </div>
                )}
                {bill?.printed_at && (
                  <div className="flex justify-between">
                    <span className="text-stone-400">พิมพ์บิล:</span>
                    <span className="text-green-600 font-medium text-xs flex items-center gap-1">
                      <CheckCircle2 size={12} /> {formatDateTime(bill.printed_at)}
                    </span>
                  </div>
                )}
              </div>

              {/* Per-item status summary */}
              <div className="no-print mb-4">
                <h3 className="text-sm font-semibold text-stone-700 mb-2.5 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  สถานะอาหาร ({totalItems} รายการ)
                </h3>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {[
                    { key: "pending", label: "รอ", icon: Clock, cls: "bg-stone-100 text-stone-600" },
                    { key: "preparing", label: "ทำ", icon: ChefHat, cls: "bg-orange-100 text-orange-700" },
                    { key: "ready", label: "ส่ง", icon: Bell, cls: "bg-blue-100 text-blue-700" },
                    { key: "served", label: "เสร็จ", icon: CheckCircle2, cls: "bg-green-100 text-green-700" },
                    { key: "cancelled", label: "ยกเลิก", icon: XCircle, cls: "bg-red-100 text-red-600" },
                  ].map(({ key, label, icon: Icon, cls }) => {
                    const c = counts[key as keyof typeof counts];
                    return (
                      <div key={key} className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-0.5 ${cls}`}>
                        <Icon className="w-4 h-4" />
                        <span>{c}</span>
                        <span className="text-[10px] opacity-70">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* All done banner */}
              {allDone && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="no-print mb-4 p-3 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 flex items-center gap-3"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"
                  >
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </motion.div>
                  <div>
                    <p className="font-bold text-green-800 text-sm">ทุกเมนูเสิร์ฟเรียบร้อยแล้ว 🎉</p>
                    <p className="text-xs text-green-600">ขอบคุณที่รอค่ะ</p>
                  </div>
                </motion.div>
              )}

              {/* Food Items */}
              <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" />
                รายการอาหาร ({items.length})
              </h3>

              <div className="space-y-3">
                <AnimatePresence>
                  {items.map((item, idx) => {
                    const status = ((item as any).status ?? "pending") as OrderItemStatus;
                    const cfg = ITEM_STATUS_CONFIG[status] ?? ITEM_STATUS_CONFIG.pending;
                    const ItemIcon = cfg.icon;
                    const imageUrl = item.menu_items?.image_url;
                    const isAnimating = status === "preparing" || status === "ready";

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.06 }}
                        className={`relative flex items-start gap-3 p-3 rounded-2xl border-2 ${cfg.bg} ${cfg.border} print:border-stone-200 print:bg-white overflow-hidden`}
                      >
                        {/* Food image */}
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white shadow-sm border border-stone-100">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={item.menu_items?.name ?? ""}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-stone-100">
                              <ImageOff className="w-6 h-6 text-stone-300" />
                            </div>
                          )}
                          {/* Status badge on image */}
                          <div className={`absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${status === "served" ? "bg-green-500" : status === "cancelled" ? "bg-red-500" : status === "ready" ? "bg-blue-500" : status === "preparing" ? "bg-orange-500" : "bg-stone-400"}`}>
                            <ItemIcon className="w-3 h-3 text-white" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="font-bold text-stone-800 text-sm leading-tight truncate">
                            {item.menu_items?.name ?? "(เมนูถูกลบ)"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-stone-500 text-xs">
                              ฿{formatPrice((item as any).unit_price ?? item.menu_items?.price)} × {item.quantity}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color} bg-white/70 border ${cfg.border}`}>
                              {cfg.label}
                            </span>
                          </div>
                          {item.note && (
                            <p className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg mt-1.5 italic">
                              💬 {item.note}
                            </p>
                          )}
                          {status === "served" && (item as any).served_by && (
                            <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                              <CheckCircle2 size={10} /> เสิริฟ์โดย {(item as any).served_by}
                            </p>
                          )}
                        </div>

                        {/* Price + animating status */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="font-bold text-stone-800 text-sm">
                            ฿{formatPrice(item.subtotal)}
                          </span>
                          {isAnimating && (
                            <motion.span
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}
                            >
                              {status === "preparing" ? "🔥 กำลังทำ" : "🔔 รอเสิริฟ์"}
                            </motion.span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Total */}
              <div className="mt-5 pt-4 border-t-2 border-dashed border-stone-300">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-base font-semibold text-stone-700">ยอดรวมทั้งหมด</p>
                    <p className="text-xs text-stone-400">{totalItems} รายการ</p>
                  </div>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-right"
                  >
                    <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent leading-none">
                      ฿{formatPrice(order.total_amount)}
                    </p>
                  </motion.div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-stone-200 text-center">
                <p className="text-base text-stone-500">🙏 ขอบคุณที่ใช้บริการ</p>
                <p className="text-xs text-stone-400 mt-0.5">Thank you for your visit</p>
              </div>
            </CardContent>
          </Card>
        </BlurFade>

        {/* Pending bill notice */}
        {!bill && (
          <BlurFade delay={0.4}>
            <Card className="no-print border-amber-200 bg-amber-50/80 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 text-sm">⏳ กำลังรอเปิดบิล</p>
                  <p className="text-xs text-amber-700 mt-0.5">กดปุ่ม "ขอบิล" ในหน้าออร์เดอร์ หรือรอให้ทางร้านเปิดบิลให้</p>
                </div>
              </CardContent>
            </Card>
          </BlurFade>
        )}

        <BlurFade delay={0.5}>
          <p className="no-print text-center text-xs text-stone-400 mt-3">
            อัปเดตอัตโนมัติทุก 5 วินาที
          </p>
        </BlurFade>

      </div>
    </div>
  );
}
