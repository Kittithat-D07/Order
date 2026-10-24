"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, OrderStatus, Bill } from "@/lib/types";
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS } from "@/lib/utils";
import { COLORS, alpha } from "@/lib/theme";
import { ToastStack, useToasts } from "@/components/ui/toast";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Utensils,
  XCircle,
  ArrowLeft,
  Sparkles,
  Receipt,
  Bell,
  AlertCircle,
  Flame,
  Heart,
  Star,
  Leaf,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";

/* ============================================================
   🌅 ORGANIC WARM - Aura Bistro Order Status
============================================================ */

const STATUS_CONFIG: Record<
  OrderStatus,
  {
    gradient: string;
    color: string;
    label: string;
    title: string;
    desc: string;
    emoji: string;
  }
> = {
  pending: {
    gradient: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.primary} 100%)`,
    color: COLORS.primary,
    label: "รอยืนยัน",
    title: "รับออร์เดอร์แล้ว",
    desc: "ร้านกำลังตรวจสอบออร์เดอร์ของคุณ",
    emoji: "🌿",
  },
  preparing: {
    gradient: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.danger} 100%)`,
    color: COLORS.primary,
    label: "กำลังทำ",
    title: "กำลังทำอาหารให้คุณ",
    desc: "เชฟกำลังทำอาหารให้คุณ รอสักครู่นะคะ",
    emoji: "🍳",
  },
  served: {
    gradient: `linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.successText} 100%)`,
    color: COLORS.success,
    label: "เสิร์ฟแล้ว",
    title: "เสิร์ฟเรียบร้อย",
    desc: "อาหารถูกเสิร์ฟแล้ว ทานเลยครับ 🍽️",
    emoji: "✨",
  },
  completed: {
    gradient: `linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.successText} 100%)`,
    color: COLORS.success,
    label: "เสร็จสิ้น",
    title: "ออร์เดอร์เสร็จสิ้น",
    desc: "ออร์เดอร์เสร็จเรียบร้อยแล้ว",
    emoji: "🎉",
  },
  cancelled: {
    gradient: `linear-gradient(135deg, ${COLORS.textSoft} 0%, ${COLORS.textMuted} 100%)`,
    color: COLORS.textMuted,
    label: "ยกเลิก",
    title: "ออร์เดอร์ถูกยกเลิก",
    desc: "ออร์เดอร์นี้ถูกยกเลิกแล้ว",
    emoji: "🍃",
  },
};

// Per-item status config
const ITEM_STATUS_CONFIG: Record<
  "pending" | "preparing" | "ready" | "served" | "cancelled",
  { label: string; sublabel: string; bg: string; ring: string; color: string; dot: string; emoji: string }
> = {
  pending: {
    label: "รอครัว",
    sublabel: "ยังไม่เริ่มทำ",
    bg: `linear-gradient(135deg, ${COLORS.secondaryLight} 0%, ${COLORS.surface3} 100%)`,
    ring: "ring-warn/30",
    color: COLORS.textMuted,
    dot: COLORS.warning,
    emoji: "🌿",
  },
  preparing: {
    label: "กำลังทำ",
    sublabel: "เชฟกำลังปรุงอยู่",
    bg: `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.accentLight} 100%)`,
    ring: "ring-brand/30",
    color: COLORS.primary,
    dot: COLORS.primary,
    emoji: "🔥",
  },
  ready: {
    label: "พร้อมเสิร์ฟ",
    sublabel: "รอเสริฟ์นำไปเสิร์ฟ",
    bg: `linear-gradient(135deg, ${COLORS.accentLight} 0%, ${COLORS.warningLight} 100%)`,
    ring: "ring-accent/40",
    color: COLORS.accent,
    dot: COLORS.accent,
    emoji: "✨",
  },
  served: {
    label: "เสร็จแล้ว",
    sublabel: "เสิร์ฟเรียบร้อย",
    bg: `linear-gradient(135deg, ${COLORS.successLight} 0%, ${COLORS.surface2} 100%)`,
    ring: "ring-ok/30",
    color: COLORS.successText,
    dot: COLORS.success,
    emoji: "🌟",
  },
  cancelled: {
    label: "ยกเลิก",
    sublabel: "เมนูนี้ถูกยกเลิก",
    bg: "bg-stone-100",
    ring: "ring-stone-200",
    color: COLORS.textMuted,
    dot: COLORS.textSoft,
    emoji: "🍂",
  },
};

function ItemStatusRow({ item, status }: { item: any; status: keyof typeof ITEM_STATUS_CONFIG }) {
  const cfg = ITEM_STATUS_CONFIG[status];
  const isActive = status === "preparing" || status === "ready";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, rotate: -1 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className={`relative overflow-hidden p-3.5 rounded-2xl ring-1 ${cfg.ring}`}
      style={{ background: cfg.bg }}
    >
      {isActive && (
        <motion.div
          className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{ backgroundColor: cfg.dot }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0"
          style={{ background: "white" }}
        >
          <span className="text-xl">{cfg.emoji}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: COLORS.text }}>
            {item.menu_items?.name ?? "(เมนูถูกลบ)"}
            <span className="font-normal ml-1" style={{ color: COLORS.textMuted }}>
              × {item.quantity}
            </span>
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] font-bold" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
            <span className="text-stone-400 text-[10px]">·</span>
            <span className="text-[10px]" style={{ color: COLORS.textMuted }}>{cfg.sublabel}</span>
          </div>
        </div>

        {status === "served" && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: COLORS.success }}
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </div>

      {/* Progress bar 4 steps */}
      <div className="mt-3 flex items-center gap-0.5">
        {(["pending", "preparing", "ready", "served"] as const).map((s, i) => {
          const order = ["pending", "preparing", "ready", "served"];
          const currentIdx = order.indexOf(status);
          const thisIdx = i;
          const isPast = thisIdx < currentIdx;
          const isCurrent = thisIdx === currentIdx;
          return (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-all ${
                isPast
                  ? "bg-ok"
                  : isCurrent
                  ? isActive
                    ? "animate-pulse"
                    : ""
                  : "bg-stone-200"
              }`}
              style={isCurrent && isActive ? { background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.primary})` } : isCurrent ? { background: COLORS.primary } : {}}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

export default function OrderStatusPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [tableToken, setTableToken] = useState<string | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [requestingBill, setRequestingBill] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const channelRef = useRef<any>(null);
  const billChannelRef = useRef<any>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const orderStatusRef = useRef<string | null>(null);

  const fetchOrder = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    const supabase = createClient();
    const { data, error: fetchErr } = await supabase
      .from("orders")
      .select("*, order_items(*, menu_items(*)), tables(*)")
      .eq("id", orderId)
      .single();

    if (fetchErr || !data) {
      if (!silent) setError("ไม่พบออร์เดอร์");
    } else {
      const newOrder = data as OrderWithItems;
      setOrder(newOrder);
      setTableToken(newOrder.tables?.qr_token ?? null);
      setLastUpdate(new Date());
      if (orderStatusRef.current && orderStatusRef.current !== newOrder.status) {
        // No vibration: this phone is lying face-up on the customer's table,
        // and a buzz that nobody can explain reads as a malfunction.
        orderStatusRef.current = newOrder.status;
      }
    }
    if (!silent) setIsRefreshing(false);
  };

  const setupRealtime = useCallback(() => {
    const supabase = createClient();
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (billChannelRef.current) supabase.removeChannel(billChannelRef.current);

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          const newRow = payload.new as Partial<OrderWithItems>;
          setOrder((prev) => prev ? ({ ...prev, ...newRow } as OrderWithItems) : prev);
          setLastUpdate(new Date());
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "order_items" },
        () => { fetchOrder(true); }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setIsConnected(true);
        else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
          setTimeout(() => { setupRealtime(); }, 3000);
        }
      });

    const billChannel = supabase
      .channel(`order-bill-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bills", filter: `order_id=eq.${orderId}` },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setBill(payload.new as Bill);
            setLastUpdate(new Date());
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    billChannelRef.current = billChannel;
  }, [orderId]);

  useEffect(() => {
    const load = async () => {
      await fetchOrder(true);
      const supabase = createClient();
      try {
        const { data: billData } = await supabase
          .from("bills").select("*").eq("order_id", orderId).maybeSingle();
        if (billData) setBill(billData as Bill);
      } catch (e) {
        console.warn("bills table not ready:", e);
      }
      setLoading(false);
    };

    load();
    setupRealtime();
    pollIntervalRef.current = setInterval(() => { fetchOrder(true); }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchOrder(true);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      const supabase = createClient();
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      if (billChannelRef.current) { supabase.removeChannel(billChannelRef.current); billChannelRef.current = null; }
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [orderId, setupRealtime]);

  const allServed = order?.order_items?.every(
    (it) => (it as any).status === "served" || (it as any).status === "cancelled"
  ) ?? false;

  // Cancel window: 5 นาที หลังสั่ง + ต้องเป็น pending
  const canCancel = useMemo(() => {
    if (!order) return false;
    if (order.status !== "pending") return false;
    const ageMin = (Date.now() - new Date(order.created_at).getTime()) / 60000;
    return ageMin < 5;
  }, [order]);

  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const { toasts, toast, dismiss } = useToasts();

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "ลูกค้ายกเลิก" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "ยกเลิกออร์เดอร์ไม่สำเร็จ กรุณาลองใหม่", "bad");
        return;
      }
      // รีเฟรชข้อมูล
      await fetchOrder();
      setShowCancelConfirm(false);
      toast("ยกเลิกออร์เดอร์เรียบร้อยแล้ว", "info");
    } catch {
      toast("เกิดข้อผิดพลาดในการยกเลิก กรุณาตรวจสอบสัญญาณอินเทอร์เน็ต", "bad");
    } finally {
      setCancelling(false);
    }
  };

  const handleRequestBill = async () => {
    if (!order || bill) return;
    setRequestingBill(true);
    try {
      const supabase = createClient();
      const { error: billErr } = await supabase.from("bills").insert({
        order_id: order.id,
        total_amount: order.total_amount,
      });
      if (billErr) throw billErr;
      toast("ส่งคำขอบิลแล้ว พนักงานจะนำบิลมาให้", "ok");
    } catch {
      toast("ไม่สามารถส่งคำขอบิลได้ กรุณาแจ้งพนักงานที่โต๊ะ", "bad");
    } finally {
      setRequestingBill(false);
    }
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
            กำลังโหลดออร์เดอร์...
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
          <Link href={tableToken ? `/menu?table=${tableToken}` : "/menu"}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="mt-6 btn-primary"
            >
              <ArrowLeft size={14} className="mr-2" /> กลับไปสั่งอาหาร
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const status = order.status as OrderStatus;
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="min-h-screen pb-12 relative" style={{ background: COLORS.bg }}>
      {/* Decorative leaves */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="leaf-deco text-7xl"
        style={{ top: "120px", right: "20px", color: COLORS.secondary, opacity: 0.12 }}
      >
        🌿
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="leaf-deco text-5xl"
        style={{ top: "400px", left: "15px", color: COLORS.accent, opacity: 0.1 }}
      >
        🍃
      </motion.div>

      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden"
      >
        <div
          className="relative px-6 pt-12 pb-10 text-center text-white"
          style={{ background: cfg.gradient }}
        >
          {/* Texture overlay */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")" }} />

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-sm opacity-90">โต๊ะ</span>
              <span className="font-bold text-xl">{order.tables?.table_number}</span>
            </div>

            {/* Status Icon - Large organic circle */}
            <div className="relative inline-block mb-5 mt-3">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-5xl"
                style={{ background: "rgba(255,255,255,0.25)", backdropFilter: "blur(10px)" }}
              >
                {cfg.emoji}
              </div>
            </div>

            <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
              {status === "cancelled" ? "ออร์เดอร์ถูกยกเลิก" : cfg.title}
            </h1>
            <p className="text-sm opacity-80 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>

            {/* Time badge */}
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm">
              <Clock size={12} />
              {formatDateTime(order.created_at)}
            </div>

            {/* Realtime status */}
            <div className="mt-2 flex items-center justify-center gap-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isConnected ? "online" : "offline"}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                    isConnected ? "bg-ok/30 text-white" : "bg-bad/30 text-white"
                  }`}
                >
                  {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
                  <span>{isConnected ? "Live" : "Reconnect..."}</span>
                </motion.div>
              </AnimatePresence>
              <motion.button
                whileTap={{ scale: 0.9, rotate: 180 }}
                transition={{ duration: 0.3 }}
                onClick={() => fetchOrder()}
                disabled={isRefreshing}
                className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition disabled:opacity-50"
              >
                <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <main className="max-w-md mx-auto px-4 -mt-3">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl p-5 mb-4 bg-white"
          style={{ 
            boxShadow: "0 12px 32px -6px rgba(139, 63, 26, 0.12)",
            border: "1px solid rgba(232, 223, 208, 0.5)"
          }}
        >
          <div className="flex items-center gap-4 mb-5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: `linear-gradient(135deg, ${COLORS.primaryLight}, ${COLORS.accentLight})` }}
            >
              {cfg.emoji}
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: cfg.color, fontFamily: "'Playfair Display', serif" }}>
                {cfg.label}
              </h2>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>{cfg.desc}</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mt-5 flex items-center gap-1">
            {(["pending", "preparing", "served"] as OrderStatus[]).map((s, i) => {
              // `completed` is the paid/closed twin of `served` — both mean the
              // last step is behind the customer.
              const effective = status === "completed" ? "served" : status;
              const isActive = effective === s;
              const isPast =
                (effective === "preparing" && s === "pending") ||
                (effective === "served" && (s === "pending" || s === "preparing"));
              const cfg2 = STATUS_CONFIG[s];
              const emojis = ["🌿", "🔥", "✨"];

              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm text-lg transition-all"
                      style={
                        isPast
                          ? { background: COLORS.success, color: "white" }
                          : isActive
                          ? { background: cfg.gradient, color: "white", boxShadow: "0 4px 12px -2px rgba(184, 92, 56, 0.4)" }
                          : { background: "white", color: COLORS.textMuted, border: "1px solid rgba(232, 223, 208, 0.6)" }
                      }
                    >
                      {isPast ? <CheckCircle2 size={16} className="text-white" /> : emojis[i]}
                    </div>
                    <span
                      className="text-[10px] font-medium"
                      style={
                        isActive ? { color: cfg.color } : isPast ? { color: COLORS.success } : { color: COLORS.textMuted }
                      }
                    >
                      {cfg2.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${
                        isPast ? "" : "bg-stone-200"
                      }`}
                      style={isPast ? { background: COLORS.success } : {}}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Per-item Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="rounded-2xl p-4 mb-4 bg-white"
          style={{ 
            boxShadow: "0 8px 24px -4px rgba(139, 63, 26, 0.1)",
            border: "1px solid rgba(232, 223, 208, 0.5)"
          }}
        >
          <h3 className="font-bold mb-3 flex items-center gap-2 text-sm" style={{ color: COLORS.text }}>
            <span className="text-lg">🍳</span>
            สถานะอาหารแต่ละอย่าง
            <span className="ml-auto text-[10px] font-normal" style={{ color: COLORS.textMuted }}>
              {order.order_items?.length ?? 0} เมนู
            </span>
          </h3>
          <div className="space-y-2">
            {order.order_items?.map((it) => {
              const itemStatus = ((it as any).status ?? "pending") as "pending" | "preparing" | "ready" | "served" | "cancelled";
              return (
                <ItemStatusRow key={it.id} item={it} status={itemStatus} />
              );
            })}
          </div>
        </motion.div>

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl p-5 mb-4 bg-white"
          style={{ 
            boxShadow: "0 8px 24px -4px rgba(139, 63, 26, 0.1)",
            border: "1px solid rgba(232, 223, 208, 0.5)"
          }}
        >
          <h3 className="font-bold mb-3 flex items-center gap-2 text-sm" style={{ color: COLORS.text }}>
            <span className="text-lg">🍜</span>
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
                  className="flex justify-between items-start gap-3 py-2"
                  style={{ borderBottom: "1px solid rgba(232, 223, 208, 0.5)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: COLORS.text }}>
                      {it.menu_items?.name ?? "(เมนูถูกลบ)"}
                      <span className="font-normal ml-1" style={{ color: COLORS.textMuted }}>× {it.quantity}</span>
                    </p>
                    {it.note && (
                      <p className="text-xs mt-0.5 italic" style={{ color: COLORS.accent }}>
                        💬 {it.note}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-sm shrink-0" style={{ color: COLORS.primary }}>
                    ฿{formatPrice(it.subtotal)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="flex justify-between items-baseline mt-4 pt-3">
            <span className="text-sm" style={{ color: COLORS.textMuted }}>รวมทั้งหมด</span>
            <span className="text-2xl font-bold text-brand" style={{ fontFamily: "'Playfair Display', serif" }}>
              ฿{formatPrice(order.total_amount)}
            </span>
          </div>
        </motion.div>

        {/* Tip Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-start gap-3 p-4 rounded-2xl mb-4"
          style={{ background: COLORS.secondaryLight }}
        >
          <span className="text-2xl" aria-hidden="true">🌿</span>
          <div>
            <p className="text-sm font-bold" style={{ color: COLORS.secondaryDark }}>ระหว่างรอ</p>
            <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
              สั่งเพิ่มได้เลยครับ — รายการใหม่จะเข้าไปในออร์เดอร์เดียวกันนี้
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
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                aria-label="ดูบิลและชำระเงิน"
                className="w-full py-4 rounded-full text-white text-lg font-semibold"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.successText} 100%)`,
                  boxShadow: "0 12px 28px -6px rgba(63, 107, 52, 0.5)"
                }}
              >
                <Receipt size={18} className="mr-2" aria-hidden="true" />
                ดูบิล ({bill.bill_number})
              </motion.button>
            </Link>
          ) : allServed ? (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRequestBill}
              disabled={requestingBill}
              className="w-full py-4 rounded-full text-white text-lg font-semibold"
              style={{
                background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.primary} 100%)`,
                boxShadow: "0 12px 28px -6px rgba(200, 147, 47, 0.5)"
              }}
            >
              {requestingBill ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  🍳
                </motion.span>
              ) : (
                <Receipt size={18} className="mr-2" aria-hidden="true" />
              )}
              ขอบิล
            </motion.button>
          ) : null}

          {/* Cancel button - only if eligible */}
          {canCancel && (
            <>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCancelConfirm(true)}
                className="w-full mt-3 py-3 min-h-[44px] rounded-full text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  background: "transparent",
                  color: COLORS.textMuted,
                  border: `1px solid ${alpha("text-muted", 0.25)}`,
                }}
              >
                <XCircle size={14} aria-hidden="true" /> ยกเลิกออร์เดอร์
              </motion.button>
              {/* Say *why* the window is short, and when it closes — a button
                  that silently disappears looks like a bug. */}
              <p className="text-center text-[11px] mt-2" style={{ color: COLORS.textSoft }}>
                ยกเลิกได้ภายใน 5 นาทีหลังสั่ง
              </p>
            </>
          )}

          {/* Once the window closes, say so instead of leaving a mystery. */}
          {!canCancel && order.status === "pending" && (
            <p className="text-center text-[11px] mt-3" style={{ color: COLORS.textSoft }}>
              เลยเวลายกเลิกแล้ว (5 นาทีหลังสั่ง) — หากต้องการเปลี่ยนแปลง
              กรุณาแจ้งพนักงานที่โต๊ะ
            </p>
          )}
        </motion.div>

        {/* Cancel confirm modal */}
        <AnimatePresence>
          {showCancelConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !cancelling && setShowCancelConfirm(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "rgba(44, 38, 32, 0.6)", backdropFilter: "blur(8px)" }}
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-3xl p-6"
                style={{
                  background: COLORS.surface,
                  boxShadow: "0 30px 80px -20px rgba(139, 63, 26, 0.4)",
                }}
              >
                <div className="text-center mb-4">
                  <div
                    className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-3xl"
                    style={{ background: alpha("danger", 0.08) }}
                  >
                    🍂
                  </div>
                  <h3
                    className="text-xl font-bold mb-1"
                    style={{ color: COLORS.text, fontFamily: "'Playfair Display', serif" }}
                  >
                    ยืนยันการยกเลิก?
                  </h3>
                  <p className="text-sm" style={{ color: COLORS.textMuted }}>
                    เมื่อยกเลิกแล้วจะไม่สามารถสั่งอาหารชุดนี้อีกครั้งได้
                  </p>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={cancelling}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium"
                    style={{ background: COLORS.bg, color: COLORS.textMuted }}
                  >
                    ไม่ยกเลิก
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.danger} 0%, ${COLORS.dangerText} 100%)`,
                      boxShadow: `0 8px 20px -4px ${alpha("danger", 0.25)}`,
                    }}
                  >
                    {cancelling ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <Link
          href={order.tables?.qr_token ? `/menu?table=${order.tables.qr_token}` : "/"}
          className="flex items-center justify-center gap-2 text-sm mt-4 py-3"
          style={{ color: COLORS.textMuted }}
        >
          <ArrowLeft size={14} /> สั่งเพิ่มหรือดูเมนู
        </Link>
      </main>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
