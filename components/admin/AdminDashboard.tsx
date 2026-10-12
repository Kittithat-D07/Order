"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderCard } from "@/components/admin/OrderCard";
import { OrderWithItems } from "@/lib/types";
import { ChefHat, Utensils, Table as TableIcon, AlertCircle, RefreshCw, LayoutGrid, Pizza, ArrowRight } from "lucide-react";
import Link from "next/link";

export function AdminDashboard() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, ready: 0, today: 0, revenue: 0 });
  const supabase = createClient();

  useEffect(() => {
    loadOrders();
    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => loadOrders()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(`*, tables:table_id (*), order_items (*, menu_items (*))`)
      .order("created_at", { ascending: false });

    if (data) {
      const all = data as any as OrderWithItems[];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = all.filter((o) => new Date(o.created_at) >= today);

      setOrders(all);
      setStats({
        active: all.filter((o) =>
          o.order_items?.some((it) => ["pending", "preparing"].includes(it.status))
        ).length,
        ready: all.flatMap((o) => o.order_items ?? []).filter((it) => it.status === "ready").length,
        today: todayOrders.length,
        revenue: todayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
      });
    }
    setLoading(false);
  };

  // Group by status
  const activeOrders = orders.filter((o) =>
    o.order_items?.some((it) => ["pending", "preparing"].includes(it.status))
  );
  const readyOrders = orders.filter((o) =>
    o.order_items?.some((it) => it.status === "ready")
  );
  const recentOrders = orders.slice(0, 10);

  return (
    <main className="max-w-7xl mx-auto px-4 py-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard icon={ChefHat} label="กำลังทำ" value={stats.active} color="amber" />
        <StatCard icon={Utensils} label="พร้อมเสิร์ฟ" value={stats.ready} color="blue" />
        <StatCard icon={TableIcon} label="ออร์เดอร์วันนี้" value={stats.today} color="green" />
        <StatCard icon={AlertCircle} label="รายได้วันนี้" value={`฿${stats.revenue.toLocaleString()}`} color="purple" />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link href="/admin/tables" className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 hover:scale-[1.02] active:scale-95 transition text-center group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center mx-auto mb-2 shadow-md">
            <LayoutGrid size={18} />
          </div>
          <p className="text-sm font-bold text-stone-800">จัดการโต๊ะ</p>
          <p className="text-[10px] text-stone-500 mt-0.5">QR Code</p>
        </Link>
        <Link href="/admin/menu" className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 hover:scale-[1.02] active:scale-95 transition text-center group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white flex items-center justify-center mx-auto mb-2 shadow-md">
            <Pizza size={18} />
          </div>
          <p className="text-sm font-bold text-stone-800">จัดการเมนู</p>
          <p className="text-[10px] text-stone-500 mt-0.5">รายการอาหาร</p>
        </Link>
        <Link href="/kitchen" className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 hover:scale-[1.02] active:scale-95 transition text-center group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto mb-2 shadow-md">
            <ChefHat size={18} />
          </div>
          <p className="text-sm font-bold text-stone-800">หน้าครัว</p>
          <p className="text-[10px] text-stone-500 mt-0.5">รับออร์เดอร์</p>
        </Link>
        <Link href="/server" className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4 hover:scale-[1.02] active:scale-95 transition text-center group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center mx-auto mb-2 shadow-md">
            <Utensils size={18} />
          </div>
          <p className="text-sm font-bold text-stone-800">หน้าเสริฟ์</p>
          <p className="text-[10px] text-stone-500 mt-0.5">เสิร์ฟอาหาร</p>
        </Link>
      </div>

      {/* Section: Active */}
      <Section
        title="🔥 กำลังทำ"
        count={activeOrders.length}
        color="amber"
      >
        {activeOrders.length === 0 ? (
          <Empty text="ไม่มีออร์เดอร์ที่กำลังทำ" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeOrders.map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </Section>

      {/* Section: Ready to serve */}
      <Section title="🔔 พร้อมเสิร์ฟ" count={readyOrders.length} color="blue">
        {readyOrders.length === 0 ? (
          <Empty text="ไม่มีเมนูที่พร้อมเสิร์ฟ" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {readyOrders.map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </Section>

      {/* Section: Recent */}
      <Section title="📋 ล่าสุด" count={recentOrders.length} color="stone">
        {recentOrders.length === 0 ? (
          <Empty text="ยังไม่มีออร์เดอร์" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentOrders.map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </Section>
    </main>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colorMap: any = {
    amber: "from-amber-500 to-orange-500",
    blue: "from-blue-500 to-cyan-500",
    green: "from-green-500 to-emerald-500",
    purple: "from-purple-500 to-pink-500",
  };
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[color]} text-white flex items-center justify-center`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] text-stone-500">{label}</p>
        <p className="font-bold text-lg text-stone-800">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, count, color, children }: any) {
  const colorMap: any = {
    amber: "text-amber-700",
    blue: "text-blue-700",
    green: "text-green-700",
    stone: "text-stone-700",
  };
  return (
    <section className="mb-6">
      <h2 className={`font-bold text-base mb-2 ${colorMap[color]}`}>
        {title} <span className="text-stone-400 text-sm">({count})</span>
      </h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-400 text-sm">
      {text}
    </div>
  );
}
