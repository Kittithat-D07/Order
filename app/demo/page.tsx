"use client";

import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import Link from "next/link";
import {
  BlurFade,
  GradientBlob,
  FloatingElement,
  PulseDot,
  Shimmer,
} from "@/components/ui/magic-effects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

// Demo data
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

const STATUS_CONFIG = {
  pending: { bg: "from-amber-100 to-orange-100", color: "text-amber-600", label: "รอยืนยัน", desc: "ร้านกำลังตรวจสอบออร์เดอร์" },
  preparing: { bg: "from-orange-100 to-red-100", color: "text-orange-600", label: "กำลังทำ", desc: "เชฟกำลังทำอาหารให้คุณ" },
  served: { bg: "from-green-100 to-emerald-100", color: "text-green-600", label: "เสิร์ฟแล้ว", desc: "อาหารถูกเสิร์ฟแล้ว 🍽️" },
  cancelled: { bg: "from-stone-100 to-stone-200", color: "text-stone-500", label: "ยกเลิก", desc: "ออร์เดอร์ถูกยกเลิก" },
};

export default function DemoPage() {
  const order = DEMO_ORDER;
  const cfg = STATUS_CONFIG[order.status];
  const StatusIcon = order.status === "preparing" ? ChefHat : Clock;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 relative overflow-hidden">
      {/* Animated gradient blobs background */}
      <GradientBlob className="top-[-100px] left-[-100px]" color="bg-orange-300/30" />
      <GradientBlob className="top-[20%] right-[-150px]" color="bg-amber-300/30" delay={2} />
      <GradientBlob className="bottom-[-100px] left-[20%]" color="bg-red-300/30" delay={4} />

      {/* Floating elements */}
      <FloatingElement className="top-20 right-10" delay={0}>
        <Sparkles className="w-8 h-8 text-orange-400/50" />
      </FloatingElement>
      <FloatingElement className="top-40 left-8" delay={1}>
        <Flame className="w-6 h-6 text-red-400/50" />
      </FloatingElement>
      <FloatingElement className="bottom-40 right-20" delay={2}>
        <Leaf className="w-7 h-7 text-green-400/50" />
      </FloatingElement>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <BlurFade delay={0.1}>
          <div className="flex items-center justify-between mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับ
              </Button>
            </Link>
            <Badge variant="warning" className="animate-pulse">
              <Sparkles className="w-3 h-3 mr-1" />
              DEMO MODE
            </Badge>
          </div>
        </BlurFade>

        {/* Hero Header with gradient animation */}
        <BlurFade delay={0.2}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full shadow-sm mb-4">
              <PulseDot color="bg-orange-500" />
              <span className="text-sm font-medium text-stone-600">Live Preview</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 via-amber-500 to-red-500 bg-clip-text text-transparent animate-gradient">
              สถานะออร์เดอร์
            </h1>
            <p className="text-stone-500 mt-2">โต๊ะ {order.table_number} • #{order.id.slice(0, 8)}</p>
          </div>
        </BlurFade>

        {/* Status Card */}
        <BlurFade delay={0.3}>
          <Card className="mb-6 overflow-hidden border-0 shadow-xl">
            <div className={`bg-gradient-to-r ${cfg.bg} p-6 relative`}>
              <Shimmer />
              <div className="relative z-10 flex items-center gap-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className={`w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg`}
                >
                  <StatusIcon className={`w-8 h-8 ${cfg.color}`} />
                </motion.div>
                <div className="flex-1">
                  <Badge variant="default" className="mb-2">
                    {cfg.label}
                  </Badge>
                  <p className={`text-sm ${cfg.color} font-medium`}>{cfg.desc}</p>
                </div>
              </div>
            </div>
          </Card>
        </BlurFade>

        {/* Order Items */}
        <BlurFade delay={0.4}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-500" />
                รายการอาหาร
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence>
                {order.order_items.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-50/50 to-amber-50/50 hover:from-orange-100/80 hover:to-amber-100/80 transition-all hover-lift"
                  >
                    <span className="text-3xl">{item.menu_items.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-stone-800">{item.menu_items.name}</p>
                      <p className="text-sm text-stone-500">x{item.quantity}</p>
                    </div>
                    <p className="font-bold text-orange-600">
                      {formatPrice(item.menu_items.price * item.quantity)}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        </BlurFade>

        {/* Total & Bill Button */}
        <BlurFade delay={0.6}>
          <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-orange-100 text-sm">ยอดรวมทั้งหมด</p>
                  <p className="text-4xl font-bold">{formatPrice(order.total_amount)}</p>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Receipt className="w-12 h-12 text-orange-200" />
                </motion.div>
              </div>
              <Button
                variant="secondary"
                size="lg"
                className="w-full bg-white text-orange-600 hover:bg-orange-50"
              >
                <Receipt className="w-4 h-4 mr-2" />
                ขอบิล / เรียกเก็บเงิน
              </Button>
            </CardContent>
          </Card>
        </BlurFade>

        <BlurFade delay={0.7}>
          <p className="text-center text-xs text-stone-400 mt-6">
            ✨ This is a demo preview • UI effects by Magic UI + Framer Motion
          </p>
        </BlurFade>
      </div>
    </div>
  );
}
