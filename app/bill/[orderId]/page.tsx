"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, OrderItemStatus, Bill } from "@/lib/types";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { COLORS, alpha } from "@/lib/theme";
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

/* ============================================================
   🌅 ORGANIC WARM - Aura Bistro Bill
============================================================ */

const ITEM_STATUS_CONFIG: Record<
  OrderItemStatus,
  { label: string; color: string; bg: string; border: string; emoji: string }
> = {
  pending: {
    label: "รอครัว",
    color: COLORS.textMuted,
    bg: COLORS.secondaryLight,
    border: COLORS.secondary,
    emoji: "🌿",
  },
  preparing: {
    label: "กำลังทำ",
    color: COLORS.primary,
    bg: COLORS.primaryLight,
    border: COLORS.primary,
    emoji: "🔥",
  },
  ready: {
    label: "พร้อมเสิร์ฟ",
    color: COLORS.accent,
    bg: COLORS.accentLight,
    border: COLORS.accent,
    emoji: "✨",
  },
  served: {
    label: "เสิร์ฟแล้ว",
    color: COLORS.successText,
    bg: COLORS.successLight,
    border: COLORS.success,
    emoji: "🌟",
  },
  cancelled: {
    label: "ยกเลิก",
    color: COLORS.textMuted,
    bg: COLORS.surface3,
    border: COLORS.borderStrong,
    emoji: "🍂",
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
        .from("bills").select("*").eq("order_id", orderId).maybeSingle();
      if (billData) setBill(billData as Bill);
      setLoading(false);
    };

    load();

    const orderChannel = supabase
      .channel(`bill-order-${orderId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}`,
      }, (payload) => {
        setOrder((prev) => prev ? ({ ...prev, ...payload.new } as OrderWithItems) : prev);
      })
      .subscribe();

    const itemsChannel = supabase
      .channel(`bill-items-${orderId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "order_items",
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
        event: "*", schema: "public", table: "bills", filter: `order_id=eq.${orderId}`,
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: COLORS.bg }}>
        <motion.div
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-7xl"
        >
          🍳
        </motion.div>
        <div className="text-center">
          <p className="text-2xl text-brand font-display" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
            Aura Bistro
          </p>
          <p className="text-base" style={{ color: COLORS.textMuted, marginTop: "0.5rem" }}>
            กำลังโหลดบิล...
          </p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: COLORS.bg }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm text-center p-8"
          style={{ 
            background: COLORS.surface, 
            borderRadius: "1.75rem", 
            boxShadow: "0 20px 60px -10px rgba(139, 63, 26, 0.2)"
          }}
        >
          <div className="text-7xl mb-4 animate-sway">🌿</div>
          <p className="text-2xl text-brand font-bold mb-3" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
            เกิดข้อผิดพลาด
          </p>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>{error ?? "ไม่พบออร์เดอร์"}</p>
        </motion.div>
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
    counts.pending === 0 && counts.preparing === 0 && counts.ready === 0 && counts.served > 0;

  return (
    <div className="min-h-screen pb-12 relative" style={{ background: COLORS.bg }}>
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Decorative leaves */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="leaf-deco text-7xl"
        style={{ top: "60px", right: "20px", color: COLORS.secondary, opacity: 0.1 }}
      >
        🍃
      </motion.div>

      {/* Top bar */}
      <BlurFade delay={0.05}>
        <div className="no-print sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b p-4" style={{ borderColor: "rgba(232, 223, 208, 0.5)" }}>
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{ background: COLORS.bg, color: COLORS.textMuted }}
            >
              <ArrowLeft size={14} /> กลับ
            </motion.button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: COLORS.success }} />
              <span className="text-xs" style={{ color: COLORS.textMuted }}>อัปเดตทุก 5 วินี</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrint}
              className="px-4 py-2 rounded-full text-white text-sm font-semibold"
              style={{
                background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                boxShadow: "0 6px 16px -3px rgba(184, 92, 56, 0.4)"
              }}
            >
              <Printer size={14} className="mr-1.5" /> พิมพ์
            </motion.button>
          </div>
        </div>
      </BlurFade>

      <div className="relative z-10 max-w-lg mx-auto px-3 py-4">

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-6"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-bold mb-1" style={{ color: COLORS.accent }}>
            ✨ Welcome to
          </p>
          <h1 className="text-4xl text-brand" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontStyle: "italic" }}>
            Aura Bistro
          </h1>
          <h2 className="text-2xl" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: COLORS.text }}>
            ใบเสร็จรับเงิน
          </h2>
          <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
            โต๊ะ {order.tables?.table_number} • #{order.id.slice(0, 8).toUpperCase()}
          </p>
        </motion.div>

        {/* Bill Card - Receipt Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl overflow-hidden mb-4"
          style={{ 
            background: COLORS.surface,
            boxShadow: "0 24px 60px -12px rgba(139, 63, 26, 0.2)",
            border: "1px solid rgba(232, 223, 208, 0.5)"
          }}
        >
          {/* Receipt Header */}
          <div
            className="p-6 text-center text-white relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)` }}
          >
            {/* Paper texture */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")" }} />
            
            <div className="relative z-10">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-4xl"
                style={{ background: "rgba(255,255,255,0.25)" }}
              >
                🍜
              </motion.div>
              <h3 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                Aura Bistro
              </h3>
              <p className="text-xs opacity-80 mt-1">🌿 Thai Garden Kitchen</p>
              {bill?.bill_number && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-mono bg-white/20 backdrop-blur-sm">
                  <Receipt size={14} />
                  เลขที่ {bill.bill_number}
                </div>
              )}
            </div>
          </div>

          {/* Receipt Body */}
          <div className="p-5">
            {/* Meta info */}
            <div className="space-y-1.5 text-sm mb-5 pb-4" style={{ borderBottom: "2px dashed rgba(232, 223, 208, 0.8)" }}>
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>วันที่สั่ง:</span>
                <span className="font-medium" style={{ color: COLORS.text }}>{formatDateTime(order.created_at)}</span>
              </div>
              {bill?.requested_at && (
                <div className="flex justify-between">
                  <span style={{ color: COLORS.textMuted }}>ขอบิลเมื่อ:</span>
                  <span className="font-medium" style={{ color: COLORS.text }}>{formatDateTime(bill.requested_at)}</span>
                </div>
              )}
              {bill?.printed_at && (
                <div className="flex justify-between">
                  <span style={{ color: COLORS.textMuted }}>พิมพ์บิล:</span>
                  <span className="font-medium text-sm flex items-center gap-1" style={{ color: COLORS.success }}>
                    <CheckCircle2 size={12} /> {formatDateTime(bill.printed_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Status summary */}
            <div className="no-print mb-4">
              <h4 className="text-sm font-bold mb-2.5 flex items-center gap-2" style={{ color: COLORS.text }}>
                <Star size={14} style={{ color: COLORS.accent }} />
                สถานะอาหาร ({totalItems} รายการ)
              </h4>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {[
                  { key: "pending", label: "รอ", emoji: "🌿", bg: COLORS.secondaryLight, color: COLORS.secondary },
                  { key: "preparing", label: "ทำ", emoji: "🔥", bg: COLORS.primaryLight, color: COLORS.primary },
                  { key: "ready", label: "ส่ง", emoji: "✨", bg: COLORS.accentLight, color: COLORS.accent },
                  { key: "served", label: "เสร็จ", emoji: "🌟", bg: COLORS.successLight, color: COLORS.successText },
                  { key: "cancelled", label: "ยกเลิก", emoji: "🍂", bg: COLORS.surface3, color: COLORS.textMuted },
                ].map(({ key, label, emoji, bg, color }) => {
                  const c = counts[key as keyof typeof counts];
                  return (
                    <div
                      key={key}
                      className="py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-0.5"
                      style={{ background: bg, color }}
                    >
                      <span className="text-base">{emoji}</span>
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
                className="no-print mb-4 p-3 rounded-2xl flex items-center gap-3"
                style={{ background: COLORS.successLight, border: `2px solid ${COLORS.success}` }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl" style={{ background: COLORS.success }}>
                  ✨
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: COLORS.success }}>ทุกเมนูเสิร์ฟเรียบร้อยแล้ว 🎉</p>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>ขอบคุณที่รอค่ะ</p>
                </div>
              </motion.div>
            )}

            {/* Food Items */}
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: COLORS.text }}>
              <span className="text-lg">🍜</span>
              รายการอาหาร ({items.length})
            </h4>

            <div className="space-y-3">
              <AnimatePresence>
                {items.map((item, idx) => {
                  const status = ((item as any).status ?? "pending") as OrderItemStatus;
                  const cfg = ITEM_STATUS_CONFIG[status] ?? ITEM_STATUS_CONFIG.pending;
                  const imageUrl = item.menu_items?.image_url;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.06 }}
                      className="flex items-start gap-3 p-3 rounded-2xl"
                      style={{ 
                        background: cfg.bg, 
                        border: `1px solid ${cfg.border}20`,
                      }}
                    >
                      {/* Food image */}
                      <div
                        className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                        style={{ background: "white", border: "1px solid rgba(232, 223, 208, 0.5)" }}
                      >
                        {imageUrl ? (
                          <img src={imageUrl} alt={item.menu_items?.name ?? ""} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            🍜
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="font-bold text-sm leading-tight" style={{ color: COLORS.text }}>
                          {item.menu_items?.name ?? "(เมนูถูกลบ)"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs" style={{ color: COLORS.textMuted }}>
                            ฿{formatPrice((item as any).unit_price ?? item.menu_items?.price)} × {item.quantity}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "white", color: cfg.color, border: `1px solid ${cfg.border}40` }}
                          >
                            {cfg.emoji} {cfg.label}
                          </span>
                        </div>
                        {item.note && (
                          <p className="text-[10px] mt-1.5 px-2 py-1 rounded-lg italic" style={{ background: "white", color: COLORS.accent }}>
                            💬 {item.note}
                          </p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="font-bold text-sm" style={{ color: COLORS.text }}>
                          ฿{formatPrice(item.subtotal)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Total */}
            <div className="mt-5 pt-4" style={{ borderTop: "2px dashed rgba(232, 223, 208, 0.8)" }}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-base font-semibold" style={{ color: COLORS.text }}>ยอดรวมทั้งหมด</p>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>{totalItems} รายการ</p>
                </div>
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="text-right"
                >
                  <p className="text-4xl font-bold text-brand" style={{ fontFamily: "'Playfair Display', serif" }}>
                    ฿{formatPrice(order.total_amount)}
                  </p>
                </motion.div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 text-center" style={{ borderTop: "1px solid rgba(232, 223, 208, 0.5)" }}>
              <p className="text-base" style={{ color: COLORS.textMuted, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                🙏 ขอบคุณที่ใช้บริการ
              </p>
              <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>Thank you for your visit</p>
              <p className="text-xs mt-2" style={{ color: COLORS.secondary }}>🌿 Aura Bistro • Thai Garden Kitchen</p>
            </div>
          </div>
        </motion.div>

        {/* Pending bill notice */}
        {!bill && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="no-print p-4 rounded-2xl mb-4"
            style={{ background: COLORS.accentLight, border: `1px solid ${alpha("accent", 0.19)}` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: COLORS.accent }}>
                ⏳
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: COLORS.primaryDark }}>⏳ กำลังรอเปิดบิล</p>
                <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                  กดปุ่ม "ขอบิล" ในหน้าออร์เดอร์ หรือรอให้ทางร้านเปิดบิลให้
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="no-print text-center text-xs"
          style={{ color: COLORS.textMuted }}
        >
          อัปเดตอัตโนมัติทุก 5 วินาที
        </motion.p>
      </div>
    </div>
  );
}

function BlurFade({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
