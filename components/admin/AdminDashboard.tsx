"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, MenuItem, MenuCategory } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useStaffSession } from "@/hooks/useStaffSession";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import {
  ChefHat, Utensils, Table as TableIcon, AlertCircle, RefreshCw,
  LayoutGrid, Pizza, ArrowRight, TrendingUp, TrendingDown, Calendar,
  DollarSign, ShoppingBag, Clock, BarChart3, PieChart as PieChartIcon,
  Users, Flame, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Package, History, Sparkles, Settings
} from "lucide-react";
import Link from "next/link";
import { BlurFade, GradientBlob, FloatingElement } from "@/components/ui/magic-effects";
import { COLORS, ROLE_COLORS, alpha } from "@/lib/theme";

/**
 * Admin wears honey as its family colour.
 *
 * `accent` is a FILL (2.54:1 on cream — never text), `accentText` is the
 * text-safe depth, and `accentDeep` is for white text on a honey fill
 * (white on `accent` is only 2.74:1).
 */
const ADMIN_COLORS = {
  primary: ROLE_COLORS.admin.base,
  primaryDark: ROLE_COLORS.admin.dark,
  primaryLight: ROLE_COLORS.admin.light,
  secondary: ROLE_COLORS.server.base,
  secondaryDark: ROLE_COLORS.server.dark,
  secondaryLight: ROLE_COLORS.server.light,
  accent: COLORS.accent,
  accentDark: COLORS.accentDark,
  accentDeep: COLORS.accentDeep,
  accentText: COLORS.accentText,
  accentLight: COLORS.accentLight,
  bg: COLORS.bg,
  surface: COLORS.surface,
  text: COLORS.text,
  textMuted: COLORS.textMuted,
  success: COLORS.success,
  danger: COLORS.danger,
};

// ============ Types ============
interface DailyStats {
  date: string;
  orders: number;
  revenue: number;
}

interface Stats {
  todayOrders: number;
  todayRevenue: number;
  weekOrders: number;
  weekRevenue: number;
  monthOrders: number;
  monthRevenue: number;
  activeOrders: number;
  readyOrders: number;
  pendingOrders: number;
  completedOrders: number;
  avgOrderValue: number;
  topItems: { name: string; qty: number }[];
  hourlyData: { hour: string; orders: number }[];
  statusData: { name: string; value: number; color: string }[];
}

// ============ Main Component ============
export function AdminDashboard() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "reports">("overview");
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return {
      start: start.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0],
    };
  });
  const supabase = createClient();

  useEffect(() => {
    loadAll();

    // Poll rather than subscribe. Realtime evaluates RLS with the
    // connection's JWT, so under the tightened policies a channel would
    // deliver nothing. The menu stays realtime-friendly because it is
    // publicly readable, but orders have to come through the server.
    const interval = setInterval(loadAll, 8000);
    return () => clearInterval(interval);
  }, []);

  const loadAll = async () => {
    // Orders come from the server (staff session required). The menu is
    // still public — every customer needs to read it.
    const [ordersRes, menuRes, catRes] = await Promise.all([
      fetch("/api/staff/orders?mode=all&limit=500", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ ok: false })),
      supabase.from("menu_items").select("*").order("display_order"),
      supabase.from("menu_categories").select("*").order("display_order"),
    ]);
    if (ordersRes?.ok && Array.isArray(ordersRes.orders)) {
      setOrders(ordersRes.orders as any as OrderWithItems[]);
    }
    if (menuRes.data) setMenuItems(menuRes.data);
    if (catRes.data) setCategories(catRes.data);
    setLoading(false);
  };

  const toggleItemStock = async (item: MenuItem) => {
    // The write goes through the server, which checks the staff session.
    await fetch("/api/staff/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_available: !item.is_available }),
    });
  };

  // ============ Stats Calculation ============
  const stats = useMemo<Stats>(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setMonth(monthStart.getMonth() - 1);

    // Cancelled orders are not revenue. They were being counted as income,
    // which inflated every revenue figure on the dashboard.
    const billable = orders.filter((o) => o.status !== "cancelled");

    const todayOrders = billable.filter(o => new Date(o.created_at) >= todayStart);
    const weekOrders = billable.filter(o => new Date(o.created_at) >= weekStart);
    const monthOrders = billable.filter(o => new Date(o.created_at) >= monthStart);

    const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total_amount), 0);
    const weekRevenue = weekOrders.reduce((s, o) => s + Number(o.total_amount), 0);
    const monthRevenue = monthOrders.reduce((s, o) => s + Number(o.total_amount), 0);

    const activeOrders = orders.filter(o => o.order_items?.some(it => ["pending", "preparing"].includes(it.status)));
    const readyOrders = orders.filter(o => o.order_items?.some(it => it.status === "ready"));
    const pendingOrders = orders.filter(o => o.status === "pending" || o.order_items?.some(it => it.status === "pending"));
    // `orders.status` only allows pending | preparing | served | cancelled —
    // there is no "completed", so this filter never matched anything and the
    // "เสร็จสิ้น" KPI always read zero. A paid/served order is the real
    // definition of done.
    const completedOrders = orders.filter(o => o.status === "served" || o.paid_at != null);

    // Top items
    const itemCounts: Record<string, number> = {};
    orders.forEach(o => o.order_items?.forEach(it => {
      const name = it.menu_items?.name || it.menu_item_id;
      itemCounts[name] = (itemCounts[name] || 0) + it.quantity;
    }));
    const topItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));

    // Hourly data
    const hourlyMap: Record<string, number> = {};
    orders.forEach(o => {
      const h = new Date(o.created_at).getHours();
      const label = `${h}:00`;
      hourlyMap[label] = (hourlyMap[label] || 0) + 1;
    });
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      orders: hourlyMap[`${i}:00`] || 0,
    }));

    // Status data — colours come from the theme so the chart cannot
    // introduce a hue that exists nowhere else in the product.
    const statusCounts = { pending: 0, preparing: 0, ready: 0, served: 0, cancelled: 0 };
    orders.forEach(o => {
      o.order_items?.forEach(it => {
        if (it.status in statusCounts) statusCounts[it.status as keyof typeof statusCounts] += it.quantity;
      });
    });
    const statusData = [
      { name: "รอดำเนินการ", value: statusCounts.pending, color: COLORS.warning },
      { name: "กำลังทำ", value: statusCounts.preparing, color: COLORS.accent },
      { name: "พร้อมเสิร์ฟ", value: statusCounts.ready, color: COLORS.success },
      { name: "เสร็จสิ้น", value: statusCounts.served, color: COLORS.primary },
      { name: "ยกเลิก", value: statusCounts.cancelled, color: COLORS.danger },
    ].filter(s => s.value > 0);

    return {
      todayOrders: todayOrders.length,
      todayRevenue,
      weekOrders: weekOrders.length,
      weekRevenue,
      monthOrders: monthOrders.length,
      monthRevenue,
      activeOrders: activeOrders.length,
      readyOrders: readyOrders.length,
      pendingOrders: pendingOrders.length,
      completedOrders: completedOrders.length,
      avgOrderValue: todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0,
      topItems,
      hourlyData,
      statusData,
    };
  }, [orders]);

  // ============ Daily Chart Data ============
  const dailyData = useMemo<DailyStats[]>(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const days: DailyStats[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOrders = orders.filter(o => {
        const od = new Date(o.created_at);
        return od.getFullYear() === d.getFullYear() &&
               od.getMonth() === d.getMonth() &&
               od.getDate() === d.getDate();
      });
      days.push({
        date: d.toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
      });
    }
    return days;
  }, [orders, dateRange]);

  return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4" style={{ color: ADMIN_COLORS.text }}>
      {/* ===== เมนูหลัก (Quick Menu Grid) ===== */}
      <div>
        <h2 className="text-sm font-bold mb-2.5 flex items-center gap-1.5 px-1" style={{ color: ADMIN_COLORS.text }}>
          <Sparkles size={14} style={{ color: ADMIN_COLORS.accentText }} />
          เมนูจัดการ
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <BigMenuCard
            href="/admin/tables"
            icon={LayoutGrid}
            label="จัดการโต๊ะ"
            description="เปิด-ปิด โต๊ะ · QR Code"
            gradient="from-brand to-accent-deep"
            shadow="shadow-brand/30"
            iconBg={ADMIN_COLORS.primaryLight}
            iconColor={ADMIN_COLORS.primaryDark}
          />
          <BigMenuCard
            href="/admin/menu"
            icon={Pizza}
            label="จัดการเมนู"
            description="เพิ่ม/ลบ/แก้ สินค้า"
            gradient="from-brand to-brand-dark"
            shadow="shadow-brand/30"
            iconBg={ADMIN_COLORS.secondaryLight}
            iconColor={ADMIN_COLORS.secondaryDark}
          />
          <BigMenuCard
            href="/admin/history"
            icon={History}
            label="ประวัติเมนู"
            description="Audit log การแก้ไข"
            gradient="from-accent-deep to-primary"
            shadow="shadow-accent/30"
            iconBg={ADMIN_COLORS.accentLight}
            iconColor={ADMIN_COLORS.accentDark}
          />
          <BigMenuCard
            href="/kitchen"
            icon={ChefHat}
            label="หน้าจอครัว"
            description="จอสำหรับพนักงานครัว"
            gradient="from-brand-dark to-primary"
            shadow="shadow-brand/30"
            iconBg={ADMIN_COLORS.primaryLight}
            iconColor={ADMIN_COLORS.primaryDark}
          />
          <BigMenuCard
            href="/server"
            icon={Utensils}
            label="หน้าจอเสิร์ฟ์"
            description="จอสำหรับพนักงานเสิร์ฟ"
            gradient="from-accent-deep to-secondary"
            shadow="shadow-accent/30"
            iconBg={ADMIN_COLORS.secondaryLight}
            iconColor={ADMIN_COLORS.secondaryDark}
          />
          <BigMenuCard
            href="/kitchen/stock"
            icon={AlertTriangle}
            label="จัดการสต็อก"
            description="เปิด-ปิด เมนูที่หมด"
            gradient="from-bad to-bad-text"
            shadow="shadow-bad/30"
            iconBg={COLORS.dangerLight}
            iconColor={COLORS.dangerText}
          />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 sticky top-[60px] z-20 bg-gradient-to-br from-brand-light/95 via-brand-light/95 to-accent-light/95 backdrop-blur-md py-2 -mx-3 px-3 sm:-mx-4 sm:px-4">
        {[
          { id: "overview", label: "📊 ภาพรวม", icon: BarChart3 },
          { id: "reports", label: "📋 รายงาน", icon: PieChartIcon },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-brand to-accent-deep text-white shadow-lg shadow-brand/30"
                  : "bg-white text-stone-600 hover:bg-surface-2 border border-stone-200"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <OverviewTab stats={stats} orders={orders.slice(0, 5)} loading={loading} menuItems={menuItems} categories={categories} onToggleStock={toggleItemStock} />
          </motion.div>
        ) : (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ReportsTab stats={stats} dailyData={dailyData} dateRange={dateRange} setDateRange={setDateRange} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Overview Tab ============
function OverviewTab({
  stats, orders, loading, menuItems, categories, onToggleStock
}: {
  stats: Stats;
  orders: OrderWithItems[];
  loading: boolean;
  menuItems: MenuItem[];
  categories: MenuCategory[];
  onToggleStock: (item: MenuItem) => void;
}) {
  const soldOutItems = menuItems.filter(i => !i.is_available);
  return (
    <>
      {/* KPI Cards — every gradient is a depth of the terracotta family */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KPICard
          icon={ShoppingBag}
          label="ออร์เดอร์วันนี้"
          value={stats.todayOrders}
          sub={`฿${stats.todayRevenue.toLocaleString()}`}
          trend={stats.todayOrders}
          accent={COLORS.primary}
        />
        <KPICard
          icon={DollarSign}
          label="รายได้วันนี้"
          value={`฿${stats.todayRevenue.toLocaleString()}`}
          sub={`เฉลี่ย ฿${Math.round(stats.avgOrderValue)}/ออร์เดอร์`}
          accent={COLORS.success}
        />
        <KPICard
          icon={Flame}
          label="กำลังทำ"
          value={stats.activeOrders}
          sub={`รอเสิร์ฟ ${stats.readyOrders}`}
          trend={stats.activeOrders}
          accent={COLORS.accent}
        />
        <KPICard
          icon={CheckCircle}
          label="เสร็จสิ้น"
          value={stats.completedOrders}
          sub={`เดือนนี้ ${stats.monthOrders} ออร์เดอร์`}
          trend={stats.completedOrders}
          accent={COLORS.primaryDark}
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface rounded-xl border border-line p-3 text-center">
          <p className="text-[10px] text-ink-muted mb-1">สัปดาห์นี้</p>
          <p className="font-bold text-lg text-ink">{stats.weekOrders} ออร์เดอร์</p>
          <p className="text-xs text-ok-text font-medium">฿{stats.weekRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-surface rounded-xl border border-line p-3 text-center">
          <p className="text-[10px] text-ink-muted mb-1">เดือนนี้</p>
          <p className="font-bold text-lg text-ink">{stats.monthOrders} ออร์เดอร์</p>
          <p className="text-xs text-ok-text font-medium">฿{stats.monthRevenue.toLocaleString()}</p>
        </div>
        <div className={`rounded-xl border p-3 text-center ${
          soldOutItems.length > 0
            ? "bg-bad-light border-bad/30"
            : "bg-surface border-line"
        }`}>
          <p className="text-[10px] text-ink-muted mb-1">เมนูที่หมด</p>
          <p className={`font-bold text-lg ${soldOutItems.length > 0 ? "text-bad-text" : "text-ink"}`}>
            {soldOutItems.length} เมนู
          </p>
          <p className={`text-xs font-medium ${soldOutItems.length > 0 ? "text-bad-text" : "text-ok-text"}`}>
            {soldOutItems.length > 0 ? "ต้องเติม!" : "ครบทุกเมนู"}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Hourly Orders Chart */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-800 flex items-center gap-2">
              <Clock size={16} className="text-brand-text" />
              จำนวนออร์เดอร์ตามชั่วโมง
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.hourlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderSoft} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, fontSize: 12 }}
                formatter={(v) => [`${v} ออร์เดอร์`, "จำนวน"]}
              />
              <Bar dataKey="orders" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-800 flex items-center gap-2">
              <PieChartIcon size={16} className="text-accent-text" />
              สถานะออร์เดอร์
            </h3>
          </div>
          {stats.statusData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, fontSize: 12 }}
                    formatter={(v, name) => [`${v} รายการ`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {stats.statusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-stone-600 flex-1 truncate">{item.name}</span>
                    <span className="text-xs font-bold text-stone-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-stone-400 text-sm">
              ยังไม่มีข้อมูล
            </div>
          )}
        </div>
      </div>

      {/* Top Items + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Selling Items */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <h3 className="font-bold text-stone-800 flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-ok" />
            อันดับเมนูขายดี
          </h3>
          {stats.topItems.length > 0 ? (
            <div className="space-y-2">
              {stats.topItems.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    idx === 0 ? "bg-brand text-white" :
                    idx === 1 ? "bg-accent-deep text-white" :
                    idx === 2 ? "bg-brand-dark text-white" :
                    "bg-surface-2 text-ink-muted"
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-sm text-stone-700 flex-1 truncate">{item.name}</span>
                  <span className="text-sm font-bold text-stone-800">{item.qty} จาน</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-stone-400 text-sm py-8">ยังไม่มีข้อมูลการขาย</p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <h3 className="font-bold text-stone-800 flex items-center gap-2 mb-3">
            <Clock size={16} className="text-brand-text" />
            ออร์เดอร์ล่าสุด
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-stone-200 rounded w-3/4" />
                    <div className="h-2 bg-stone-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2 transition">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                    o.status === "completed" ? "bg-ok-light text-ok-text" :
                    o.order_items?.some(it => it.status === "ready") ? "bg-accent-light text-brand-dark" :
                    o.order_items?.some(it => it.status === "preparing") ? "bg-warn-light text-warn-text" :
                    "bg-surface-2 text-ink-muted"
                  }`}>
                    {o.tables?.table_number || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">
                      {o.order_items?.map(it => it.menu_items?.name).filter(Boolean).slice(0, 2).join(", ") || "—"}
                    </p>
                    <p className="text-[10px] text-stone-400">
                      {new Date(o.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-stone-800">฿{Number(o.total_amount).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-stone-400 text-sm py-8">ยังไม่มีออร์เดอร์</p>
          )}
        </div>
      </div>

      {/* Sold Out Items (real-time) */}
      {soldOutItems.length > 0 && (
        <div className="bg-bad-light rounded-2xl border-2 border-bad/30 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-bad-text flex items-center gap-2">
              <AlertTriangle size={16} aria-hidden="true" />
              เมนูที่หมดตอนนี้ ({soldOutItems.length})
            </h3>
            <Link href="/admin/menu" className="text-xs text-bad-text hover:underline font-medium">
              จัดการ →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {soldOutItems.map(item => {
              const cat = categories.find(c => c.id === item.category_id);
              return (
                <div key={item.id} className="bg-surface rounded-xl p-3 flex items-center gap-3 border border-bad/30">
                  <div className="w-10 h-10 rounded-lg bg-bad/15 flex items-center justify-center shrink-0">
                    <Package size={18} className="text-bad" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-ink truncate">{item.name}</p>
                    <p className="text-[10px] text-ink-muted truncate">
                      {cat?.name ?? "—"} · ฿{Number(item.price).toLocaleString()}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onToggleStock(item)}
                    className="shrink-0 min-h-[36px] px-2.5 py-1.5 rounded-lg bg-brand text-on-primary hover:bg-brand-dark text-xs font-bold flex items-center gap-1"
                    aria-label={`เปิดขาย ${item.name} อีกครั้ง`}
                  >
                    <CheckCircle size={12} aria-hidden="true" />
                    เปิด
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions (เดิม) - ย้ายไปอยู่บนเป็นเมนูหลักแล้ว */}
    </>
  );
}

// ============ Big Menu Card (หน้าหลัก) ============
function BigMenuCard({
  href, icon: Icon, label, description, gradient, shadow, iconBg, iconColor
}: {
  href: string;
  icon: any;
  label: string;
  description: string;
  gradient: string;
  shadow: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -3, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className={`relative bg-white rounded-2xl border-2 border-stone-200 hover:border-transparent p-4 cursor-pointer transition-all overflow-hidden group shadow-sm hover:shadow-xl ${shadow}`}
      >
        {/* Gradient background on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        <div className="relative z-10 group-hover:text-white transition-colors">
          <div className={`w-12 h-12 rounded-xl ${iconBg} group-hover:bg-white/20 flex items-center justify-center mb-3 transition-colors`}>
            <Icon size={24} className={`${iconColor} group-hover:text-white transition-colors`} />
          </div>
          <h3 className="font-bold text-base text-stone-800 group-hover:text-white mb-0.5">
            {label}
          </h3>
          <p className="text-[11px] text-stone-500 group-hover:text-white/80 leading-snug">
            {description}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-stone-400 group-hover:text-white">
            <span>เปิด</span>
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// ============ Reports Tab ============
function ReportsTab({
  stats, dailyData, dateRange, setDateRange
}: {
  stats: Stats;
  dailyData: DailyStats[];
  dateRange: { start: string; end: string };
  setDateRange: (r: { start: string; end: string }) => void;
}) {
  const totalOrders = dailyData.reduce((s, d) => s + d.orders, 0);
  const totalRevenue = dailyData.reduce((s, d) => s + d.revenue, 0);
  const avgDaily = dailyData.length > 0 ? totalRevenue / dailyData.length : 0;
  const maxRevenue = Math.max(...dailyData.map(d => d.revenue), 1);

  // Quick date presets
  const presets = [
    { label: "วันนี้", days: 0 },
    { label: "7 วัน", days: 6 },
    { label: "14 วัน", days: 13 },
    { label: "30 วัน", days: 29 },
  ];

  return (
    <>
      {/* Date Range Picker */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
        <h3 className="font-bold text-stone-800 flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-accent-text" />
          เลือกช่วงวันที่
        </h3>
        <div className="flex gap-2 mb-3">
          {presets.map(p => (
            <motion.button
              key={p.label}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - p.days);
                setDateRange({
                  start: start.toISOString().split("T")[0],
                  end: end.toISOString().split("T")[0],
                });
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 text-ink-muted hover:bg-accent-light hover:text-brand-dark transition"
            >
              {p.label}
            </motion.button>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-stone-500 mb-1 block">วันเริ่มต้น</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-brand"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-stone-500 mb-1 block">วันสิ้นสุด</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-gradient-to-br from-brand to-accent-deep rounded-2xl p-4 text-white">
          <p className="text-xs opacity-80 mb-1">จำนวนออร์เดอร์</p>
          <p className="text-2xl font-bold">{totalOrders}</p>
          <p className="text-xs opacity-80 mt-1">{dailyData.length} วัน</p>
        </div>
        <div className="bg-gradient-to-br from-ok to-ok-text rounded-2xl p-4 text-white">
          <p className="text-xs opacity-80 mb-1">รายได้รวม</p>
          <p className="text-2xl font-bold">฿{totalRevenue.toLocaleString()}</p>
          <p className="text-xs opacity-80 mt-1">ช่วงที่เลือก</p>
        </div>
        <div className="bg-gradient-to-br from-accent-deep to-brand rounded-2xl p-4 text-white">
          <p className="text-xs opacity-80 mb-1">เฉลี่ย/วัน</p>
          <p className="text-2xl font-bold">฿{Math.round(avgDaily).toLocaleString()}</p>
          <p className="text-xs opacity-80 mt-1">รายได้ต่อวัน</p>
        </div>
        <div className="bg-gradient-to-br from-brand-dark to-primary rounded-2xl p-4 text-white">
          <p className="text-xs opacity-80 mb-1">สูงสุด/วัน</p>
          <p className="text-2xl font-bold">฿{Math.round(maxRevenue).toLocaleString()}</p>
          <p className="text-xs opacity-80 mt-1">วันที่มีรายได้สูงสุด</p>
        </div>
      </div>

      {/* Daily Revenue Bar Chart */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
        <h3 className="font-bold text-stone-800 flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-ok" />
          รายได้รายวัน (฿)
        </h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderSoft} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `฿${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, fontSize: 12 }}
                formatter={((v: any, name: any) => [
                  name === "revenue" ? `฿${Number(v).toLocaleString()}` : `${v} ออร์เดอร์`,
                  name === "revenue" ? "รายได้" : "ออร์เดอร์"
                ]) as any}
              />
              <Bar dataKey="revenue" name="revenue" fill={COLORS.success} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-stone-400 text-sm">
            ไม่มีข้อมูลในช่วงที่เลือก
          </div>
        )}
      </div>

      {/* Orders + Revenue Combined Line Chart */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
        <h3 className="font-bold text-stone-800 flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-brand-text" />
          ออร์เดอร์ & รายได้ (เปรียบเทียบ)
        </h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderSoft} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `฿${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, fontSize: 12 }}
                formatter={((v: any, name: any) => [
                  name === "revenue" ? `฿${Number(v).toLocaleString()}` : `${v} ออร์เดอร์`,
                  name === "revenue" ? "รายได้" : "ออร์เดอร์"
                ]) as any}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="orders" stroke={COLORS.accent} strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke={COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-stone-400 text-sm">
            ไม่มีข้อมูลในช่วงที่เลือก
          </div>
        )}
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <h3 className="font-bold text-stone-800 flex items-center gap-2 mb-3">
          <TableIcon size={16} className="text-stone-500" />
          รายละเอียดรายวัน
        </h3>
        {dailyData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-2 px-2 text-xs text-stone-500 font-medium">วันที่</th>
                  <th className="text-right py-2 px-2 text-xs text-stone-500 font-medium">ออร์เดอร์</th>
                  <th className="text-right py-2 px-2 text-xs text-stone-500 font-medium">รายได้</th>
                  <th className="text-right py-2 px-2 text-xs text-stone-500 font-medium">เฉลี่ย</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((d, i) => (
                  <tr key={i} className="border-b border-stone-100 hover:bg-surface-2">
                    <td className="py-2 px-2 text-stone-700">{d.date}</td>
                    <td className="py-2 px-2 text-right font-medium text-stone-800">{d.orders}</td>
                    <td className="py-2 px-2 text-right font-bold text-ok-text">฿{d.revenue.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-stone-500 text-xs">
                      {d.orders > 0 ? `฿${Math.round(d.revenue / d.orders)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2 rounded-b-xl">
                  <td className="py-2 px-2 font-bold text-stone-800">รวม ({dailyData.length} วัน)</td>
                  <td className="py-2 px-2 text-right font-bold text-stone-800">{totalOrders}</td>
                  <td className="py-2 px-2 text-right font-bold text-ok-text">฿{totalRevenue.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right font-bold text-stone-800">
                    ฿{totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-center text-stone-400 text-sm py-8">ไม่มีข้อมูลในช่วงที่เลือก</p>
        )}
      </div>

      {/* Export CSV button */}
      <div
        className="mt-4 p-4 rounded-2xl flex items-center justify-between"
        style={{
          background: `linear-gradient(135deg, ${alpha("accent-light", 0.25)} 0%, ${alpha("accent-light", 0.25)} 100%)`,
          border: `1px solid ${alpha("accent", 0.19)}`,
        }}
      >
        <div>
          <p className="font-bold text-sm" style={{ color: ADMIN_COLORS.text }}>
            🌿 Export รายงานยอดขาย
          </p>
          <p className="text-xs mt-0.5" style={{ color: ADMIN_COLORS.textMuted }}>
            ดาวน์โหลด CSV (Excel-compatible)
          </p>
        </div>
        <motion.a
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          href={`/api/reports/export?from=${dateRange.start}&to=${dateRange.end}`}
          download
          className="px-4 py-2.5 rounded-full text-white text-sm font-semibold flex items-center gap-2"
          style={{
            background: `linear-gradient(135deg, ${ADMIN_COLORS.primary} 0%, ${ADMIN_COLORS.accentDeep} 100%)`,
            boxShadow: "0 8px 20px -4px rgba(184, 92, 56, 0.4)",
          }}
        >
          📊 Download CSV
        </motion.a>
      </div>
    </>
  );
}

// ============ Reusable Components ============
function KPICard({ icon: Icon, label, value, sub, trend, accent }: any) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-surface rounded-2xl border border-line p-4"
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-md"
          style={{ background: accent }}
        >
          <Icon size={18} aria-hidden="true" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-full ${
            trend > 0 ? "bg-ok-light text-ok-text" : "bg-surface-2 text-ink-muted"
          }`}>
            {trend > 0 ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}
            {Math.abs(trend)}
          </div>
        )}
      </div>
      <p className="text-[10px] text-ink-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-ink leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-ink-soft mt-1">{sub}</p>}
    </motion.div>
  );
}

function QuickAction({ href, icon: Icon, label, color }: any) {
  // deprecated - ใช้ BigMenuCard แทน
  return null;
}

