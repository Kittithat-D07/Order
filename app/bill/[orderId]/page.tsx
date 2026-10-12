"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
} from "lucide-react";
import {
  BlurFade,
  GradientBlob,
  FloatingElement,
  Shimmer,
} from "@/components/ui/magic-effects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// สี/label ของแต่ละสถานะ item
const ITEM_STATUS_CONFIG: Record<
  OrderItemStatus,
  { label: string; color: string; bg: string; ring: string; icon: any }
> = {
  pending: {
    label: "รอครัว",
    color: "text-stone-500",
    bg: "bg-stone-50",
    ring: "ring-stone-200",
    icon: Clock,
  },
  preparing: {
    label: "กำลังทำ",
    color: "text-orange-600",
    bg: "bg-orange-50",
    ring: "ring-orange-200",
    icon: ChefHat,
  },
  ready: {
    label: "พร้อมเสิร์ฟ",
    color: "text-blue-600",
    bg: "bg-blue-50",
    ring: "ring-blue-200",
    icon: Bell,
  },
  served: {
    label: "เสิร์ฟแล้ว",
    color: "text-green-600",
    bg: "bg-green-50",
    ring: "ring-green-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "ยกเลิก",
    color: "text-red-500",
    bg: "bg-red-50",
    ring: "ring-red-200",
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

  // โหลด order + items
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
      const { data: billData, error: billErr } = await supabase
        .from("bills")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (!billErr && billData) {
        setBill(billData as Bill);
      }
      setLoading(false);
    };

    load();

    // Realtime: orders table
    const orderChannel = supabase
      .channel(`bill-order-${orderId}-${Date.now()}`)
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

    // Realtime: order_items (filter by order_id)
    const itemsChannel = supabase
      .channel(`bill-items-${orderId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        (payload) => {
          const newItem = payload.new as { order_id?: string };
          const oldItem = payload.old as { order_id?: string };
          if (newItem?.order_id === orderId || oldItem?.order_id === orderId) {
            console.log("🍜 Item updated → reload");
            loadOrder(true);
          }
        }
      )
      .subscribe();

    // Realtime: bills
    const billChannel = supabase
      .channel(`bill-${orderId}-${Date.now()}`)
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

    // Polling fallback
    pollIntervalRef.current = setInterval(() => {
      loadOrder(true);
    }, 5000);

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(billChannel);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
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

  // นับจำนวน item แต่ละสถานะ
  const items = order.order_items ?? [];
  const counts = {
    pending: items.filter((i) => (i as any).status === "pending").length,
    preparing: items.filter((i) => (i as any).status === "preparing").length,
    ready: items.filter((i) => (i as any).status === "ready").length,
    served: items.filter((i) => (i as any).status === "served").length,
    cancelled: items.filter((i) => (i as any).status === "cancelled").length,
  };
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
          body { background: white; }
        }
      `}</style>

      {/* Background blobs */}
      <GradientBlob className="top-[-150px] right-[-100px]" color="bg-amber-300/30" />
      <GradientBlob className="top-[40%] left-[-100px]" color="bg-orange-300/30" delay={2} />
      <GradientBlob className="bottom-[-100px] right-[20%]" color="bg-red-300/30" delay={4} />

      <FloatingElement className="top-32 right-12" delay={0}>
        <Receipt className="w-6 h-6 text-amber-400/50" />
      </FloatingElement>
      <FloatingElement className="bottom-32 left-12" delay={2}>
        <Sparkles className="w-5 h-5 text-orange-400/50" />
      </FloatingElement>

      <div className="relative z-10 max-w-md mx-auto p-4 print:p-0">
        {/* Header (no print) */}
        <BlurFade delay={0.1}>
          <div className="no-print mb-4 flex items-center justify-between">
            <Button onClick={() => router.back()} variant="ghost" size="sm">
              <ArrowLeft size={14} className="mr-1.5" /> กลับ
            </Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handlePrint}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30"
              >
                <Printer size={14} className="mr-1.5" /> พิมพ์บิล
              </Button>
            </motion.div>
          </div>
        </BlurFade>

        {/* Bill Card */}
        <BlurFade delay={0.2}>
          <Card className="bg-white/90 backdrop-blur-md shadow-2xl print:shadow-none print:rounded-none border-0 overflow-hidden">
            <div className="relative bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 p-6 text-white overflow-hidden">
              <Shimmer />
              <div className="relative z-10 text-center">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg"
                >
                  <span className="text-3xl">🍜</span>
                </motion.div>
                <h1 className="text-xl font-bold">ร้านอาหาร QR Order</h1>
                <p className="text-xs text-orange-100 mt-1 flex items-center justify-center gap-1">
                  <Sparkles size={12} />
                  ใบเสร็จรับเงิน / Receipt
                </p>
              </div>
            </div>

            <CardContent className="p-6">
              {/* Bill Info */}
              <div className="space-y-2 text-sm mb-4 pb-4 border-b-2 border-dashed border-stone-300">
                <div className="flex justify-between">
                  <span className="text-stone-500">เลขที่บิล:</span>
                  <span className="font-mono font-semibold text-orange-600">
                    {bill?.bill_number ?? "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">ออร์เดอร์:</span>
                  <span className="font-mono text-stone-700">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">โต๊ะ:</span>
                  <Badge variant="default" className="font-semibold">
                    {order.tables?.table_number}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">วันที่:</span>
                  <span className="text-stone-700">
                    {formatDateTime(bill?.requested_at ?? order.created_at)}
                  </span>
                </div>
              </div>

              {/* Items (with per-item status) */}
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" />
                  รายการ ({items.length})
                </h2>

                {/* Status summary (no print) */}
                <div className="no-print mb-3 grid grid-cols-4 gap-1.5 text-center">
                  <div className={`py-1.5 rounded-lg text-[10px] font-semibold ${counts.pending > 0 ? "bg-stone-100 text-stone-600" : "bg-stone-50 text-stone-300"}`}>
                    <Clock className="w-3 h-3 mx-auto mb-0.5" />
                    {counts.pending} รอ
                  </div>
                  <div className={`py-1.5 rounded-lg text-[10px] font-semibold ${counts.preparing > 0 ? "bg-orange-100 text-orange-700" : "bg-stone-50 text-stone-300"}`}>
                    <ChefHat className="w-3 h-3 mx-auto mb-0.5" />
                    {counts.preparing} ทำ
                  </div>
                  <div className={`py-1.5 rounded-lg text-[10px] font-semibold ${counts.ready > 0 ? "bg-blue-100 text-blue-700" : "bg-stone-50 text-stone-300"}`}>
                    <Bell className="w-3 h-3 mx-auto mb-0.5" />
                    {counts.ready} ส่ง
                  </div>
                  <div className={`py-1.5 rounded-lg text-[10px] font-semibold ${counts.served > 0 ? "bg-green-100 text-green-700" : "bg-stone-50 text-stone-300"}`}>
                    <CheckCircle2 className="w-3 h-3 mx-auto mb-0.5" />
                    {counts.served} เสร็จ
                  </div>
                </div>

                {/* All done banner */}
                {allDone && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="no-print mb-3 p-2.5 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs font-semibold text-green-700">
                      ทุกเมนูเสิร์ฟเรียบร้อยแล้ว 🎉
                    </p>
                  </motion.div>
                )}

                <div className="space-y-2">
                  {items.map((it, idx) => {
                    const status = ((it as any).status ?? "pending") as OrderItemStatus;
                    const cfg = ITEM_STATUS_CONFIG[status] ?? ITEM_STATUS_CONFIG.pending;
                    const ItemIcon = cfg.icon;
                    return (
                      <motion.div
                        key={it.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.05 }}
                        className={`flex justify-between items-center text-sm p-2.5 rounded-xl border ${cfg.bg} ${cfg.ring} ring-1 print:border-stone-200 print:bg-white`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {/* Status icon */}
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${status === "preparing" || status === "ready" ? "animate-pulse" : ""} ${cfg.color} bg-white/70`}>
                            <ItemIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-stone-800 font-medium text-sm truncate">
                              {it.menu_items?.name ?? "(เมนูถูกลบ)"}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-stone-500">
                              <span>฿{formatPrice(it.unit_price)} × {it.quantity}</span>
                              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${cfg.color} bg-white/60 print:bg-stone-100`}>
                                {cfg.label}
                              </span>
                            </div>
                            {it.note && (
                              <p className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 truncate">
                                💬 {it.note}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="font-semibold text-stone-800 text-sm flex-shrink-0 ml-2">
                          ฿{formatPrice(it.subtotal)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t-2 border-dashed border-stone-300">
                <div className="flex justify-between items-baseline">
                  <span className="text-base font-semibold text-stone-700">รวมทั้งหมด</span>
                  <motion.span
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent"
                  >
                    ฿{formatPrice(order.total_amount)}
                  </motion.span>
                </div>
              </div>

              {/* Print Status */}
              {bill?.printed_at && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-center justify-center gap-1.5 text-xs text-green-600"
                >
                  <CheckCircle2 size={12} />
                  <span>พิมพ์เมื่อ {formatDateTime(bill.printed_at)}</span>
                </motion.div>
              )}

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-stone-200 text-center text-xs text-stone-400">
                <p className="text-base">🙏 ขอบคุณที่ใช้บริการ</p>
                <p className="mt-1">Thank you for your visit</p>
              </div>
            </CardContent>
          </Card>
        </BlurFade>

        {/* Status (no print) */}
        {!bill && (
          <BlurFade delay={0.3}>
            <Card className="no-print mt-4 border-amber-200 bg-amber-50/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <p className="font-semibold text-amber-800">⏳ กำลังรอเปิดบิล</p>
                </div>
                <p className="text-xs text-amber-700">
                  กดปุ่ม "ขอบิล" ในหน้าออร์เดอร์ หรือรอให้ทางร้านเปิดบิลให้
                </p>
              </CardContent>
            </Card>
          </BlurFade>
        )}

        {/* Help info */}
        <div className="no-print mt-3 text-center text-[10px] text-stone-400">
          <p>หน้านี้อัปเดตอัตโนมัติทุก 5 วินาที • รอเมนูที่เหลือได้เลย</p>
        </div>
      </div>
    </div>
  );
}
