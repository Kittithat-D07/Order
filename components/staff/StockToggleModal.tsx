"use client";

import { useEffect, useState, useRef } from "react";
import { MenuItem, MenuCategory } from "@/lib/types";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { X, Package, CheckCircle2, XCircle, RefreshCw, Utensils, Search } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useToasts } from "@/components/ui/toast";

interface Props {
  onClose: () => void;
}

/**
 * StockToggleModal
 * ใช้ได้ทั้งในหน้าครัวและเสิร์ฟ
 * - โชว์เมนูทั้งหมด พร้อมปุ่ม "หมด" / "เปิดขาย"
 * - บันทึก audit log อัตโนมัติผ่าน DB trigger
 *
 * Signal design: the row states the CURRENT state and the button states the
 * ACTION. "Sold out" is loud rose — which reads as an alarm — but the calm
 * sage "เปิดขาย" pill was the weaker of the pair, so the screen shouted at
 * cooks about dishes that were perfectly fine. Now an in-stock dish reads
 * calm and a sold-out dish reads clearly unavailable.
 */
export function StockToggleModal({ onClose }: Props) {
  const supabase = createClient();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToasts();
  const panelRef = useRef<HTMLDivElement>(null);

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
    // Polling instead of a realtime subscription — see the note in
    // app/kitchen/stock/page.tsx.
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = async (item: MenuItem) => {
    const next = !item.is_available;

    // The write goes through the server, which checks the staff session.
    // The browser no longer holds credentials that can change the menu.
    const res = await fetch("/api/staff/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_available: next }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง", "bad");
    } else {
      toast(
        next ? `เปิดขาย "${item.name}" แล้ว` : `"${item.name}" หมดชั่วคราว`,
        next ? "ok" : "info"
      );
      load();
    }
  };

  const filtered = items.filter((i) => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-text/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-modal-title"
        tabIndex={-1}
        initial={{ y: 100, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 100, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col overflow-hidden outline-none"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-brand-light">
          <h3 id="stock-modal-title" className="font-bold text-ink flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-md">
              <Package size={18} className="text-on-primary" aria-hidden="true" />
            </div>
            จัดการสต็อกเมนู
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => load()}
              className="w-11 h-11 flex items-center justify-center hover:bg-surface-2 rounded-xl"
              aria-label="โหลดรายการใหม่"
            >
              <RefreshCw size={16} aria-hidden="true" />
            </button>
            <button
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center hover:bg-surface-2 rounded-xl"
              aria-label="ปิดหน้าต่างจัดการสต็อก"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-line-soft">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              aria-hidden="true"
            />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเมนู..."
              aria-label="ค้นหาเมนู"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-20 text-ink-muted" role="status">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" aria-hidden="true" />
              <p className="text-sm">กำลังโหลด...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-ink-muted">
              <Package size={40} className="mx-auto mb-2 opacity-50" aria-hidden="true" />
              <p className="text-sm">ไม่พบเมนู</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => {
                const catItems = filtered.filter((i) => i.category_id === cat.id);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <p className="text-[10px] font-bold text-ink-muted mb-1 px-1">
                      {cat.name} ({catItems.length})
                    </p>
                    <div className="space-y-1.5">
                      {catItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                            item.is_available
                              ? "bg-ok-light/40 border-ok/30"
                              : "bg-surface-2 border-dashed border-line-strong"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-surface-3 overflow-hidden shrink-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Utensils size={14} className="text-ink-soft" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-bold truncate ${
                                item.is_available ? "text-ink" : "text-ink-muted"
                              }`}
                            >
                              {item.name}
                            </p>
                            <p className="text-[10px] text-ink-muted">{formatPrice(item.price)}</p>
                          </div>

                          {/* Current state */}
                          <span
                            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              item.is_available
                                ? "bg-ok text-white"
                                : "bg-surface-3 text-ink-muted"
                            }`}
                          >
                            {item.is_available ? "เปิดขาย" : "หมด"}
                          </span>

                          {/* Action */}
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggle(item)}
                            aria-label={
                              item.is_available
                                ? `ทำเครื่องหมายว่า ${item.name} หมดชั่วคราว`
                                : `เปิดขาย ${item.name} อีกครั้ง`
                            }
                            aria-pressed={!item.is_available}
                            className={`shrink-0 min-h-[36px] min-w-[36px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                              item.is_available
                                ? "bg-bad-light text-bad-text hover:bg-bad/20"
                                : "bg-brand text-on-primary hover:bg-brand-dark"
                            }`}
                          >
                            {item.is_available ? (
                              <>
                                <XCircle size={12} aria-hidden="true" /> หมด
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={12} aria-hidden="true" /> เปิด
                              </>
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
        <div className="px-4 py-2.5 border-t border-line-soft bg-surface-2 text-[10px] text-ink-muted text-center">
          🧾 การเปิด-ปิดเมนูจะถูกบันทึกในประวัติ
        </div>
      </motion.div>
    </motion.div>
  );
}
