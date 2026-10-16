"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Utensils,
  Sparkles,
  ArrowLeft,
  Receipt,
  Flame,
  Leaf,
  Star,
} from "lucide-react";
import Link from "next/link";

/* ============================================================
   🌅 ORGANIC WARM - Aura Bistro Demo
============================================================ */

const COLORS: Record<string, string> = {
  primary: "#B85C38",
  primaryDark: "#8B3F1A",
  primaryLight: "#F4DCC4",
  secondary: "#6B7B5F",
  secondaryDark: "#4A5942",
  secondaryLight: "#DDE3D2",
  accent: "#C8932F",
  accentLight: "#F0D78C",
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  border: "#E8DFD0",
  text: "#2C2620",
  textMuted: "#6B5F54",
  success: "#4F7942",
  danger: "#A03826",
};

const STATUS_CONFIG = {
  pending: { bg: "from-amber-50 to-orange-50", color: COLORS.primary, label: "รอยืนยัน", desc: "ร้านกำลังตรวจสอบออร์เดอร์", emoji: "🌿" },
  preparing: { bg: "from-orange-50 to-red-50", color: COLORS.primary, label: "กำลังทำ", desc: "เชฟกำลังทำอาหารให้คุณ", emoji: "🍳" },
  served: { bg: "from-green-50 to-emerald-50", color: COLORS.success, label: "เสิร์ฟแล้ว", desc: "อาหารถูกเสิร์ฟแล้ว 🍽️", emoji: "✨" },
  cancelled: { bg: "from-stone-100 to-stone-200", color: "#6b7280", label: "ยกเลิก", desc: "ออร์เดอร์ถูกยกเลิก", emoji: "🍂" },
};

const DEMO_ORDER = {
  id: "demo-12345",
  status: "preparing" as const,
  table_number: "A5",
  total_amount: 285,
  created_at: new Date().toISOString(),
  order_items: [
    { id: 1, quantity: 1, menu_items: { name: "ผัดไทยกุ้งสด", price: 120, emoji: "🍜" } },
    { id: 2, quantity: 2, menu_items: { name: "ต้มยำกุ้ง", price: 80, emoji: "🍲" } },
    { id: 3, quantity: 1, menu_items: { name: "ข้าวเหนียวมะม่วง", price: 65, emoji: "🥭" } },
  ],
};

export default function DemoPage() {
  const order = DEMO_ORDER;
  const cfg = STATUS_CONFIG[order.status];

  return (
    <div className="min-h-screen relative" style={{ background: COLORS.bg }}>
      {/* Decorative leaves */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="leaf-deco text-7xl"
        style={{ top: "80px", right: "20px", color: COLORS.secondary, opacity: 0.12 }}
      >
        🌿
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="leaf-deco text-5xl"
        style={{ top: "350px", left: "15px", color: COLORS.accent, opacity: 0.1 }}
      >
        🍃
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="leaf-deco text-5xl"
        style={{ bottom: "100px", right: "30px", color: COLORS.primary, opacity: 0.1 }}
      >
        🌶️
      </motion.div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <Link href="/">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
              style={{ background: COLORS.surface, color: COLORS.textMuted, boxShadow: "0 4px 12px -2px rgba(139, 63, 26, 0.1)" }}
            >
              <ArrowLeft size={16} /> กลับ
            </motion.button>
          </Link>
          <div
            className="px-4 py-1.5 rounded-full text-xs font-bold"
            style={{ background: COLORS.accentLight, color: COLORS.primaryDark }}
          >
            🌿 DEMO MODE
          </div>
        </motion.div>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <p className="text-xs uppercase tracking-[0.3em] mb-2 font-semibold" style={{ color: COLORS.accent }}>
            ✨ Welcome to
          </p>
          <h1
            className="text-6xl text-sunset leading-none mb-1"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontStyle: "italic" }}
          >
            Aura
          </h1>
          <h2
            className="text-3xl leading-none mb-3"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: COLORS.text }}
          >
            BISTRO
          </h2>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            โต๊ะ {order.table_number} • #{order.id.slice(0, 8)}
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl overflow-hidden mb-6"
          style={{ 
            background: COLORS.surface,
            boxShadow: "0 24px 60px -12px rgba(139, 63, 26, 0.18)",
            border: "1px solid rgba(232, 223, 208, 0.5)"
          }}
        >
          <div
            className="p-6 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)` }}
          >
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")" }} />
            <div className="relative z-10 flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-full flex items-center justify-center text-4xl"
                style={{ background: "rgba(255,255,255,0.25)", backdropFilter: "blur(10px)" }}
              >
                {cfg.emoji}
              </motion.div>
              <div className="flex-1">
                <div
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 text-white"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                >
                  {cfg.label}
                </div>
                <p className="text-white text-sm opacity-90">{cfg.desc}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl p-5 mb-6"
          style={{ 
            background: COLORS.surface,
            boxShadow: "0 12px 32px -6px rgba(139, 63, 26, 0.12)",
            border: "1px solid rgba(232, 223, 208, 0.5)"
          }}
        >
          <h3 className="font-bold mb-4 flex items-center gap-2 text-base" style={{ color: COLORS.text }}>
            <Utensils size={18} style={{ color: COLORS.primary }} />
            รายการอาหาร
          </h3>
          <div className="space-y-3">
            {order.order_items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primaryLight}15 0%, ${COLORS.secondaryLight}15 100%)`,
                  border: "1px solid rgba(232, 223, 208, 0.5)"
                }}
              >
                <span className="text-4xl">{item.menu_items.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: COLORS.text }}>{item.menu_items.name}</p>
                  <p className="text-sm" style={{ color: COLORS.textMuted }}>×{item.quantity}</p>
                </div>
                <p className="font-bold text-lg" style={{ color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}>
                  ฿{(item.menu_items.price * item.quantity).toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Total Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-3xl overflow-hidden mb-6"
          style={{ 
            background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
            boxShadow: "0 24px 60px -12px rgba(184, 92, 56, 0.4)"
          }}
        >
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">ยอดรวมทั้งหมด</p>
              <p className="text-4xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                ฿{order.total_amount.toLocaleString()}
              </p>
            </div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl"
            >
              🍜
            </motion.div>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 text-center font-semibold text-base"
            style={{ background: "rgba(255,255,255,0.15)", color: "white", borderTop: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Receipt size={16} className="inline mr-2" />
            ขอบิล / เรียกเก็บเงิน
          </motion.button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs"
          style={{ color: COLORS.textMuted }}
        >
          🌿 This is a demo preview • UI effects by Magic UI + Framer Motion
        </motion.p>
      </div>
    </div>
  );
}
