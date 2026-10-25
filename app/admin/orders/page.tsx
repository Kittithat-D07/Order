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
import { COLORS, ROLE_COLORS } from "@/lib/theme";

/** Admin wears the deepest clay — a third depth of the same family. */
const ADMIN = ROLE_COLORS.admin;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-surface-3 text-ink border-line",
  preparing: "bg-brand-light text-brand-dark border-brand",
  ready: "bg-accent-light text-brand-dark border-accent",
  served: "bg-ok-light text-ok-text border-ok",
  completed: "bg-surface-3 text-ink border-line",
  cancelled: "bg-bad-light text-bad-text border-bad",
};

export default function AdminOrdersPage() {
  return (
    <RoleGuard allowedRoles={["admin"]} pageName="ประวัติออร์เดอร์">
      <AdminOrdersContent />
    </RoleGuard>
  );
}

function AdminOrdersContent() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Orders are read through the server, which requires a staff session.
      try {
        const res = await fetch("/api/staff/orders?mode=all&limit=100", {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.orders)) {
          setOrders(data.orders as OrderWithItems[]);
        }
      } catch {
        // Keep whatever we already have.
      }
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: COLORS.bg }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
          style={{
            background: `linear-gradient(135deg, ${ADMIN.base} 0%, ${ADMIN.dark} 100%)`,
            boxShadow: "0 24px 60px -12px rgba(92, 36, 16, 0.4)"
          }}
        >
          🍳
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
    <div className="min-h-screen relative overflow-x-clip" style={{ background: COLORS.bg }}>
      {/* Background blobs */}
      <GradientBlob className="top-[-100px] right-[-100px]" color="bg-brand/10" />
      <GradientBlob className="top-[40%] left-[-100px]" color="bg-accent/10" delay={3} />
      <GradientBlob className="bottom-[10%] right-[20%]" color="bg-brand/8" delay={5} />

      {/* Floating */}
      <FloatingElement className="top-32 right-12" delay={0}>
        <BarChart3 className="w-6 h-6 text-brand/30" />
      </FloatingElement>
      <FloatingElement className="bottom-32 left-12" delay={2}>
        <Sparkles className="w-5 h-6 text-accent/30" />
      </FloatingElement>

      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-line">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/admin"
            className="w-11 h-11 rounded-lg hover:bg-brand-light flex items-center justify-center transition"
            aria-label="กลับไปหน้าผู้จัดการ"
          >
            <ArrowLeft size={18} />
          </Link>
          <BlurFade>
            <div className="flex items-center gap-2.5 flex-1">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${ADMIN.base} 0%, ${ADMIN.dark} 100%)`,
                }}
              >
                <Receipt size={18} className="text-white" />
              </motion.div>
              <div>
                <h1 className="font-bold text-base leading-tight flex items-center gap-2">
                  ประวัติออร์เดอร์
                  <PulseDot color="bg-brand" />
                </h1>
                <p className="text-xs text-ink-muted">{orders.length} รายการ</p>
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
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${ADMIN.base} 0%, ${ADMIN.dark} 100%)` }}
                  >
                    <Receipt className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs text-ink-muted font-medium">ทั้งหมด</p>
                </div>
                <p className="text-2xl font-bold text-brand-strong tabular-nums">{orders.length}</p>
              </CardContent>
            </Card>
          </BlurFade>
          <BlurFade delay={0.2}>
            <Card className="border-0 shadow-md hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${COLORS.accentDeep} 0%, ${COLORS.accentDark} 100%)` }}
                  >
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs text-ink-muted font-medium">วันนี้</p>
                </div>
                <p className="text-2xl font-bold text-brand-strong tabular-nums">{todayOrders}</p>
              </CardContent>
            </Card>
          </BlurFade>
          <BlurFade delay={0.3} className="col-span-2 sm:col-span-1">
            <Card className="border-0 shadow-md hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.successText} 100%)` }}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs text-ink-muted font-medium">รายได้รวม</p>
                </div>
                <p className="text-2xl font-bold text-ok-text tabular-nums">
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
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-brand-light flex items-center justify-center">
                  <Receipt size={28} className="text-brand-text" />
                </div>
                <p className="font-semibold text-ink">ยังไม่มีออร์เดอร์</p>
                <p className="text-sm text-ink-muted mt-1">ออร์เดอร์จะปรากฏที่นี่เมื่อลูกค้าสั่งอาหาร</p>
              </CardContent>
            </Card>
          </BlurFade>
        ) : (
          <BlurFade delay={0.4}>
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-left">
                    <tr>
                      <th className="p-3 font-semibold text-ink">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          เวลา
                        </div>
                      </th>
                      <th className="p-3 font-semibold text-ink">โต๊ะ</th>
                      <th className="p-3 font-semibold text-ink">รายการ</th>
                      <th className="p-3 text-right font-semibold text-ink">ยอด</th>
                      <th className="p-3 font-semibold text-ink">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, idx) => (
                      <motion.tr
                        key={o.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + idx * 0.03 }}
                        className="border-t border-line-soft hover:bg-surface-2 transition"
                      >
                        <td className="p-3 text-xs">
                          {formatDateTime(o.created_at)}
                        </td>
                        <td className="p-3">
                          <Badge variant="default" className="font-medium">
                            {o.tables?.table_number ?? "?"}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-ink-muted">
                          {o.order_items?.length ?? 0} รายการ
                        </td>
                        <td className="p-3 text-right font-bold text-brand-strong tabular-nums">
                          ฿{formatPrice(o.total_amount)}
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

