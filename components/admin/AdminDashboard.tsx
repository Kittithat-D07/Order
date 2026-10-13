"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems } from "@/lib/types";
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
  Users, Flame, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import Link from "next/link";
import { BlurFade, GradientBlob, FloatingElement } from "@/components/ui/magic-effects";

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
    loadOrders();
    const channel = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => loadOrders())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(`*, tables:table_id (*), order_items (*, menu_items (*))`)
      .order("created_at", { ascending: false });
    if (data) setOrders(data as any as OrderWithItems[]);
    setLoading(false);
  };

  // ============ Stats Calculation ============
  const stats = useMemo<Stats>(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setMonth(monthStart.getMonth() - 1);

    const todayOrders = orders.filter(o => new Date(o.created_at) >= todayStart);
    const weekOrders = orders.filter(o => new Date(o.created_at) >= weekStart);
    const monthOrders = orders.filter(o => new Date(o.created_at) >= monthStart);

    const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total_amount), 0);
    const weekRevenue = weekOrders.reduce((s, o) => s + Number(o.total_amount), 0);
    const monthRevenue = monthOrders.reduce((s, o) => s + Number(o.total_amount), 0);

    const activeOrders = orders.filter(o => o.order_items?.some(it => ["pending", "preparing"].includes(it.status)));
    const readyOrders = orders.filter(o => o.order_items?.some(it => it.status === "ready"));
    const pendingOrders = orders.filter(o => o.status === "pending" || o.order_items?.some(it => it.status === "pending"));
    const completedOrders = orders.filter(o => o.status === "completed");

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

    // Status data
    const statusCounts = { pending: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 };
    orders.forEach(o => {
      o.order_items?.forEach(it => {
        if (it.status in statusCounts) statusCounts[it.status as keyof typeof statusCounts] += it.quantity;
      });
    });
    const statusData = [
      { name: "รอดำเนินการ", value: statusCounts.pending, color: "#f59e0b" },
      { name: "กำลังทำ", value: statusCounts.preparing, color: "#3b82f6" },
      { name: "พร้อมเสิร์ฟ", value: statusCounts.ready, color: "#22c55e" },
      { name: "เสร็จสิ้น", value: statusCounts.completed, color: "#6b7280" },
      { name: "ยกเลิก", value: statusCounts.cancelled, color: "#ef4444" },
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
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6">
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
                  : "bg-white text-stone-600 hover:bg-stone-50 border border-stone-200"
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
            <OverviewTab stats={stats} orders={orders.slice(0, 5)} loading={loading} />
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
function OverviewTab({ stats, orders, loading }: { stats: Stats; orders: OrderWithItems[]; loading: boolean }) {
  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KPICard
          icon={ShoppingBag}
          label="ออร์เดอร์วันนี้"
          value={stats.todayOrders}
          sub={`฿${stats.todayRevenue.toLocaleString()}`}
          trend={stats.todayOrders}
          color="blue"
          gradient="from-blue-500 to-cyan-500"
        />
        <KPICard
          icon={DollarSign}
          label="รายได้วันนี้"
          value={`฿${stats.todayRevenue.toLocaleString()}`}
          sub={`เฉลี่ย ฿${Math.round(stats.avgOrderValue)}/ออร์เดอร์`}
          color="green"
          gradient="from-green-500 to-emerald-500"
        />
        <KPICard
          icon={Flame}
          label="กำลังทำ"
          value={stats.activeOrders}
          sub={`รอเสิร์ฟ ${stats.readyOrders}`}
          trend={stats.activeOrders}
          color="amber"
          gradient="from-amber-500 to-orange-500"
        />
        <KPICard
          icon={CheckCircle}
          label="เสร็จสิ้น"
          value={stats.completedOrders}
          sub={`เดือนนี้ ${stats.monthOrders} ออร์เดอร์`}
          trend={stats.completedOrders}
          color="purple"
          gradient="from-purple-500 to-pink-500"
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-[10px] text-stone-500 mb-1">สัปดาห์นี้</p>
          <p className="font-bold text-lg text-stone-800">{stats.weekOrders} ออร์เดอร์</p>
          <p className="text-xs text-green-600 font-medium">฿{stats.weekRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text[10px] text-stone-500 mb-1">เดือนนี้</p>
          <p className="font-bold text-lg text-stone-800">{stats.monthOrders} ออร์เดอร์</p>
          <p className="text-xs text-green-600 font-medium">฿{stats.monthRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-[10px] text-stone-500 mb-1">สถานะ</p>
          <div className="flex gap-1 justify-center flex-wrap">
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
              {stats.pendingOrders} รอ
            </span>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
              {stats.activeOrders - stats.pendingOrders} ทำ
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Hourly Orders Chart */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-800 flex items-center gap-2">
              <Clock size={16} className="text-blue-500" />
              จำนวนออร์เดอร์ตามชั่วโมง
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.hourlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
                formatter={(v) => [`${v} ออร์เดอร์`, "จำนวน"]}
              />
              <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-800 flex items-center gap-2">
              <PieChartIcon size={16} className="text-pink-500" />
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
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
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
            <TrendingUp size={16} className="text-green-500" />
            อันดับเมนูขายดี
          </h3>
          {stats.topItems.length > 0 ? (
            <div className="space-y-2">
              {stats.topItems.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    idx === 0 ? "bg-amber-400 text-white" :
                    idx === 1 ? "bg-stone-300 text-white" :
                    idx === 2 ? "bg-amber-600 text-white" :
                    "bg-stone-100 text-stone-500"
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
            <Clock size={16} className="text-blue-500" />
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
                <div key={o.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 transition">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                    o.status === "completed" ? "bg-green-100 text-green-700" :
                    o.order_items?.some(it => it.status === "ready") ? "bg-blue-100 text-blue-700" :
                    o.order_items?.some(it => it.status === "preparing") ? "bg-amber-100 text-amber-700" :
                    "bg-stone-100 text-stone-600"
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

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickAction href="/admin/tables" icon={LayoutGrid} label="จัดการโต๊ะ" color="orange" />
        <QuickAction href="/admin/menu" icon={Pizza} label="จัดการเมนู" color="green" />
        <QuickAction href="/kitchen" icon={ChefHat} label="หน้าครัว" color="amber" />
        <QuickAction href="/server" icon={Utensils} label="หน้าเสิร์ฟ์" color="blue" />
      </div>
    </>
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
          <Calendar size={16} className="text-purple-500" />
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
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-600 hover:bg-purple-100 hover:text-purple-700 transition"
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
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-stone-500 mb-1 block">วันสิ้นสุด</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-4 text-white">
          <p className="text-xs opacity-80 mb-1">จำนวนออร์เดอร์</p>
          <p className="text-2xl font-bold">{totalOrders}</p>
          <p className="text-xs opacity-80 mt-1">{dailyData.length} วัน</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-4 text-white">
          <p className="text-xs opacity-80 mb-1">รายได้รวม</p>
          <p className="text-2xl font-bold">฿{totalRevenue.toLocaleString()}</p>
          <p className="text-xs opacity-80 mt-1">ช่วงที่เลือก</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-4 text-white">
          <p className="text-xs opacity-80 mb-1">เฉลี่ย/วัน</p>
          <p className="text-2xl font-bold">฿{Math.round(avgDaily).toLocaleString()}</p>
          <p className="text-xs opacity-80 mt-1">รายได้ต่อวัน</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-white">
          <p className="text-xs opacity-80 mb-1">สูงสุด/วัน</p>
          <p className="text-2xl font-bold">฿{Math.round(maxRevenue).toLocaleString()}</p>
          <p className="text-xs opacity-80 mt-1">วันที่มีรายได้สูงสุด</p>
        </div>
      </div>

      {/* Daily Revenue Bar Chart */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
        <h3 className="font-bold text-stone-800 flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-green-500" />
          รายได้รายวัน (฿)
        </h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `฿${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
                formatter={(v: any, name: string) => [
                  name === "revenue" ? `฿${Number(v).toLocaleString()}` : `${v} ออร์เดอร์`,
                  name === "revenue" ? "รายได้" : "ออร์เดอร์"
                ]}
              />
              <Bar dataKey="revenue" name="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
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
          <TrendingUp size={16} className="text-blue-500" />
          ออร์เดอร์ & รายได้ (เปรียบเทียบ)
        </h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `฿${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
                formatter={(v: any, name: string) => [
                  name === "revenue" ? `฿${Number(v).toLocaleString()}` : `${v} ออร์เดอร์`,
                  name === "revenue" ? "รายได้" : "ออร์เดอร์"
                ]}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
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
                  <tr key={i} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-2 px-2 text-stone-700">{d.date}</td>
                    <td className="py-2 px-2 text-right font-medium text-stone-800">{d.orders}</td>
                    <td className="py-2 px-2 text-right font-bold text-green-700">฿{d.revenue.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-stone-500 text-xs">
                      {d.orders > 0 ? `฿${Math.round(d.revenue / d.orders)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-stone-50 rounded-b-xl">
                  <td className="py-2 px-2 font-bold text-stone-800">รวม ({dailyData.length} วัน)</td>
                  <td className="py-2 px-2 text-right font-bold text-stone-800">{totalOrders}</td>
                  <td className="py-2 px-2 text-right font-bold text-green-700">฿{totalRevenue.toLocaleString()}</td>
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
    </>
  );
}

// ============ Reusable Components ============
function KPICard({ icon: Icon, label, value, sub, trend, color, gradient }: any) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl border border-stone-200 p-4"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md`}>
          <Icon size={18} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-full ${
            trend > 0 ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"
          }`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}
          </div>
        )}
      </div>
      <p className="text-[10px] text-stone-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-stone-800 leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-stone-400 mt-1">{sub}</p>}
    </motion.div>
  );
}

function QuickAction({ href, icon: Icon, label, color }: any) {
  const colorMap: Record<string, string> = {
    orange: "from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600",
    green: "from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600",
    amber: "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
    blue: "from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600",
  };
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`bg-gradient-to-br ${colorMap[color]} rounded-2xl p-4 text-white text-center cursor-pointer transition-all shadow-md hover:shadow-lg`}
      >
        <Icon size={20} className="mx-auto mb-1.5" />
        <p className="text-xs font-semibold">{label}</p>
      </motion.div>
    </Link>
  );
}
