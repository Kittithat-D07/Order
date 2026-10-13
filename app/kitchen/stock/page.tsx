"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MenuItem, MenuCategory } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useStaffSession } from "@/hooks/useStaffSession";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Sparkles, Utensils, Clock, X } from "lucide-react";
import { BlurFade, GradientBlob, FloatingElement, PulseDot } from "@/components/ui/magic-effects";
import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { RoleGuard } from "@/components/auth/RoleGuard";

interface MenuItemWithStatus extends MenuItem {
  marked_unavailable_at?: string | null;
  marked_unavailable_by?: string | null;
  unavailable_reason?: string | null;
}

function StockContent() {
  const supabase = createClient();
  const { session } = useStaffSession();
  const [items, setItems] = useState<MenuItemWithStatus[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "available" | "soldout">("all");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const load = async () => {
    const [{ data: cats }, { data: its }] = await Promise.all([
      supabase.from("menu_categories").select("*").order("display_order"),
      supabase.from("menu_items").select("*").order("display_order"),
    ]);
    setCategories(cats ?? []);
    setItems((its ?? []) as MenuItemWithStatus[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("stock-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2000);
  };

  // สลับสถานะ: เปิด ↔ หมด (toggle is_available)
  const toggleStock = async (item: MenuItemWithStatus) => {
    const isAvailable = !item.is_available;
    const { error } = await supabase
      .from("menu_items")
      .update({
        is_available: isAvailable,
        marked_unavailable_at: isAvailable ? null : new Date().toISOString(),
        marked_unavailable_by: isAvailable ? null : session?.displayName ?? "แม่ครัว",
      })
      .eq("id", item.id);

    if (error) {
      showToast("error", "เกิดข้อผิดพลาด");
    } else {
      showToast(
        "success",
        isAvailable ? `✅ เปิดขาย "${item.name}" แล้ว` : `🚫 "${item.name}" หมดชั่วคราว`
      );
      load();
    }
  };

  // ดูว่าหมดนานเท่าไหร่
  const getDuration = (iso?: string | null) => {
    if (!iso) return "";
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "เมื่อกี้";
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} ชม. ${mins % 60} นาทีที่แล้ว`;
  };

  const filtered = items.filter(i => {
    if (filter === "available") return i.is_available;
    if (filter === "soldout") return !i.is_available;
    return true;
  });

  const soldOutCount = items.filter(i => !i.is_available).length;
  const availableCount = items.filter(i => i.is_available).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 relative overflow-x-hidden">
      <GradientBlob className="top-[-150px] right-[-100px] w-72 h-72" color="bg-rose-300/30" />
      <GradientBlob className="top-[40%] left-[-100px] w-72 h-72" color="bg-pink-300/30" delay={2} />
      <GradientBlob className="bottom-[-100px] right-[30%] w-72 h-72" color="bg-orange-300/30" delay={4} />

      <FloatingElement className="top-32 right-8" delay={0}>
        <Sparkles className="w-6 h-6 text-rose-400/50" />
      </FloatingElement>
      <FloatingElement className="top-48 left-8" delay={1}>
        <Utensils className="w-5 h-6 text-pink-400/50" />
      </FloatingElement>

      <header
        className="sticky top-0 z-30 bg-gradient-to-r from-rose-500/95 via-pink-500/95 to-rose-500/95 text-white shadow-lg shadow-rose-500/30"
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-2.5 sm:pb-2 pt-2 flex items-center justify-between gap-2">
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-2.5 min-w-0">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-lg shrink-0"
              >
                <AlertTriangle size={20} strokeWidth={2.2} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold flex items-center gap-2">
                  <span className="truncate">จัดการสต็อก</span>
                  <PulseDot color="bg-white" />
                </h1>
                <p className="text-[10px] opacity-90 truncate">
                  {session?.displayName} • แจ้งเมนูหมด
                </p>
              </div>
            </div>
          </BlurFade>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => load()}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
          >
            <RefreshCw size={16} />
          </motion.button>
        </div>

        {/* Stats bar */}
        <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-2.5 flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-2 py-1 rounded-full">
            <CheckCircle2 size={12} />
            <span className="font-bold">{availableCount}</span> เปิดขาย
          </div>
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-2 py-1 rounded-full">
            <XCircle size={12} />
            <span className="font-bold">{soldOutCount}</span> หมด
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-32">
        {/* Filter chips */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { id: "all", label: `ทั้งหมด (${items.length})`, color: "bg-stone-100 text-stone-700" },
            { id: "available", label: `เปิดขาย (${availableCount})`, color: "bg-green-100 text-green-700" },
            { id: "soldout", label: `หมด (${soldOutCount})`, color: "bg-rose-100 text-rose-700" },
          ].map(f => (
            <motion.button
              key={f.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filter === f.id
                  ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md"
                  : f.color
              }`}
            >
              {f.label}
            </motion.button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-stone-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">กำลังโหลด...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <Utensils size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">ไม่มีเมนู</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map(cat => {
              const catItems = filtered.filter(i => i.category_id === cat.id);
              if (catItems.length === 0) return null;
              return (
                <div key={cat.id} className="mb-4">
                  <h2 className="text-sm font-bold text-stone-700 mb-2 px-2 flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-gradient-to-b from-rose-500 to-pink-500" />
                    {cat.name}
                    <span className="text-xs text-stone-400 font-normal">({catItems.length})</span>
                  </h2>
                  <AnimatePresence>
                    <div className="space-y-2">
                      {catItems.map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`bg-white rounded-2xl border-2 p-3 flex items-center gap-3 transition-all ${
                            !item.is_available
                              ? "border-rose-300 bg-rose-50/50"
                              : "border-stone-200"
                          }`}
                        >
                          <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Utensils size={18} className="text-stone-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-stone-800 truncate">{item.name}</p>
                            {!item.is_available ? (
                              <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-0.5">
                                <Clock size={10} />
                                หมดเมื่อ {getDuration(item.marked_unavailable_at)}
                                {item.marked_unavailable_by && ` · ${item.marked_unavailable_by}`}
                              </p>
                            ) : (
                              <p className="text-[11px] text-green-600 font-medium">พร้อมเสิร์ฟ</p>
                            )}
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleStock(item)}
                            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                              item.is_available
                                ? "bg-rose-100 text-rose-700 hover:bg-rose-200 border-2 border-rose-200"
                                : "bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-200"
                            }`}
                          >
                            {item.is_available ? (
                              <>
                                <XCircle size={14} />
                                <span>หมด</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={14} />
                                <span>เปิดขาย</span>
                              </>
                            )}
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomTabBar />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-2xl text-white text-sm font-bold flex items-center gap-2 ${
              toast.type === "success" ? "bg-gradient-to-r from-green-500 to-emerald-500" : "bg-gradient-to-r from-rose-500 to-red-500"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function KitchenStockPage() {
  return (
    <RoleGuard allowedRoles={["kitchen", "admin"]} pageName="จัดการสต็อก">
      <StockContent />
    </RoleGuard>
  );
}
