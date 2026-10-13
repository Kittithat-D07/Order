"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MenuItem, MenuCategory } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useStaffSession } from "@/hooks/useStaffSession";
import { X, Package, CheckCircle2, XCircle, RefreshCw, Utensils, Search } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

/**
 * StockToggleModal
 * ใช้ได้ทั้งในหน้าครัวและเสิร์ฟ
 * - โชว์เมนูทั้งหมด พร้อมปุ่ม "หมด" / "เปิดขาย"
 * - บันทึก audit log อัตโนมัติผ่าน DB trigger
 */
export function StockToggleModal({ onClose }: Props) {
  const supabase = createClient();
  const { session } = useStaffSession();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: cats }, { data: its }] = await Promise.all([
      supabase.from("menu_categories").select("*").order("display_order"),
      supabase.from("menu_items").select("*").order("display_order"),
    ]);
    setCategories(cats ?? []);
    setItems(its ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("stock-modal")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const toggle = async (item: MenuItem) => {
    const next = !item.is_available;
    const { error } = await supabase
      .from("menu_items")
      .update({
        is_available: next,
        marked_unavailable_at: next ? null : new Date().toISOString(),
        marked_unavailable_by: next ? null : session?.displayName ?? "staff",
      })
      .eq("id", item.id);

    if (error) {
      showToast("❌ เกิดข้อผิดพลาด");
    } else {
      showToast(next ? `✅ เปิดขาย "${item.name}"` : `🚫 "${item.name}" หมดชั่วคราว`);
      load();
    }
  };

  const filtered = items.filter(i => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 100, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-rose-50 to-pink-50">
          <h3 className="font-bold text-stone-800 flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-md">
              <Package size={18} className="text-white" />
            </div>
            จัดการสต็อกเมนู
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => load()}
              className="p-1.5 hover:bg-white/60 rounded-lg"
            >
              <RefreshCw size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/60 rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-stone-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเมนู..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50 text-sm outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-20 text-stone-400">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
              <p className="text-sm">กำลังโหลด...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-stone-400">
              <Package size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">ไม่พบเมนู</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map(cat => {
                const catItems = filtered.filter(i => i.category_id === cat.id);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <p className="text-[10px] font-bold text-stone-500 mb-1 px-1">
                      {cat.name} ({catItems.length})
                    </p>
                    <div className="space-y-1.5">
                      {catItems.map(item => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                            !item.is_available
                              ? "bg-rose-50 border-rose-200"
                              : "bg-white border-stone-200"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden shrink-0">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Utensils size={14} className="text-stone-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-stone-800 truncate">{item.name}</p>
                            <p className="text-[10px] text-stone-500">฿{formatPrice(item.price)}</p>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggle(item)}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                              item.is_available
                                ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                          >
                            {item.is_available ? (
                              <><XCircle size={12} /> หมด</>
                            ) : (
                              <><CheckCircle2 size={12} /> เปิด</>
                            )}
                          </motion.button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-stone-100 bg-stone-50 text-[10px] text-stone-500 text-center">
          🧾 การเปิด-ปิดเมนูจะถูกบันทึกในประวัติ
        </div>
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-stone-900 text-white text-sm font-bold shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
