"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems } from "@/lib/types";
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Receipt,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  BlurFade,
  GradientBlob,
  FloatingElement,
  PulseDot,
} from "@/components/ui/magic-effects";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { RoleGuard } from "@/components/auth/RoleGuard";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  preparing: "bg-orange-100 text-orange-700 border-orange-200",
  served: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-stone-100 text-stone-600 border-stone-200",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_items(*)), tables(*)")
        .order("created_at", { ascending: false })
        .limit(100);
      setOrders((data as OrderWithItems[]) ?? []);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 relative overflow-hidden flex items-center justify-center">
        <GradientBlob className="top-[-100px] left-[-100px]" color="bg-purple-300/30" />
        <GradientBlob className="bottom-[-100px] right-[-100px]" color="bg-pink-300/30" delay={1} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/40"
        >
          <BarChart3 className="text-white" size={28} />
        </motion.div>
      </div>
    );
  }

  // Calculate stats
  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const todayOrders = orders.filter(
    (o) => new Date(o.created_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/30 via-pink-50/30 to-rose-50/30 relative overflow-hidden">
      {/* Background blobs */}
      <GradientBlob className="top-[-100px] right-[-100px]" color="bg-purple-300/20" />
      <GradientBlob className="top-[40%] left-[-100px]" color="bg-pink-300/20" delay={3} />
      <GradientBlob className="bottom-[10%] right-[20%]" color="bg-rose-300/20" delay={5} />

      {/* Floating */}
      <FloatingElement className="top-32 right-12" delay={0}>
        <BarChart3 className="w-6 h-6 text-purple-400/40" />
      </FloatingElement>
      <FloatingElement className="bottom-32 left-12" delay={2}>
        <Sparkles className="w-5 h-6 text-pink-400/40" />
      </FloatingElement>

      <header className="sticky top-14 z-20 backdrop-blur-md bg-white/70 border-b border-purple-200/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/admin"
            className="w-9 h-9 rounded-lg hover:bg-purple-100 flex items-center justify-center transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <BlurFade>
            <div className="flex items-center gap-2.5 flex-1">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/30"
              >
                <Receipt size={18} className="text-white" />
              </motion.div>
              <div>
                <h1 className="font-bold text-base leading-tight flex items-center gap-2">
                  ประวัติออร์เดอร์
                  <PulseDot color="bg-purple-500" />
                </h1>
                <p className="text-xs text-stone-500">{orders.length} รายการ</p>
              </div>
            </div>
          </BlurFade>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <BlurFade delay={0.1}>
            <Card className="border-0 shadow-md hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs text-stone-500 font-medium">ทั้งหมด</p>
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {orders.length}
                </p>
              </CardContent>
            </Card>
          </BlurFade>
          <BlurFade delay={0.2}>
            <Card className="border-0 shadow-md hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs text-stone-500 font-medium">วันนี้</p>
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  {todayOrders}
                </p>
              </CardContent>
            </Card>
          </BlurFade>
          <BlurFade delay={0.3} className="col-span-2 sm:col-span-1">
            <Card className="border-0 shadow-md hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs text-stone-500 font-medium">รายได้รวม</p>
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  ฿{totalRevenue.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </BlurFade>
        </div>

        {/* Orders Table */}
        {orders.length === 0 ? (
          <BlurFade delay={0.4}>
            <Card>
              <CardContent className="p-10 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-purple-100 flex items-center justify-center">
                  <Receipt size={28} className="text-purple-500" />
                </div>
                <p className="font-semibold text-stone-700">ยังไม่มีออร์เดอร์</p>
                <p className="text-sm text-stone-500 mt-1">ออร์เดอร์จะปรากฏที่นี่เมื่อลูกค้าสั่งอาหาร</p>
              </CardContent>
            </Card>
          </BlurFade>
        ) : (
          <BlurFade delay={0.4}>
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-purple-50 to-pink-50 text-left">
                    <tr>
                      <th className="p-3 font-semibold text-stone-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          เวลา
                        </div>
                      </th>
                      <th className="p-3 font-semibold text-stone-700">โต๊ะ</th>
                      <th className="p-3 font-semibold text-stone-700">รายการ</th>
                      <th className="p-3 text-right font-semibold text-stone-700">ยอด</th>
                      <th className="p-3 font-semibold text-stone-700">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, idx) => (
                      <motion.tr
                        key={o.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + idx * 0.03 }}
                        className="border-t border-stone-100 hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-pink-50/30 transition"
                      >
                        <td className="p-3 text-xs">
                          {formatDateTime(o.created_at)}
                        </td>
                        <td className="p-3">
                          <Badge variant="default" className="font-medium">
                            {o.tables?.table_number ?? "?"}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-stone-600">
                          {o.order_items?.length ?? 0} รายการ
                        </td>
                        <td className="p-3 text-right font-bold bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                          {formatPrice(o.total_amount)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                              STATUS_COLORS[o.status] ?? STATUS_COLORS.pending
                            }`}
                          >
                            {ORDER_STATUS_LABELS[o.status]}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </BlurFade>
        )}
      </main>
      <BottomTabBar />
    </div>
  );
}
