"use client";

import { useCart } from "@/lib/store/cart";
import { formatPrice } from "@/lib/utils";
import { COLORS } from "@/lib/theme";
import { X, Trash2, ShoppingBag, MessageSquare, Plus, Minus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function CartDrawer({
  open,
  onClose,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
}) {
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const totalItems = useCart((s) => s.totalItems());
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [open]);

  // The drawer is a dialog: Escape closes it, focus stays inside, and the
  // rest of the page is hidden from assistive technology.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const removeItem = (id: string) => {
    useCart.getState().removeItem(id);
    setConfirmDelete(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <AnimatePresence>
        {mounted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={panelRef}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="absolute right-0 bottom-0 top-0 w-full max-w-md flex flex-col"
        style={{ background: COLORS.bg }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        {/* Header */}
        <div className="bg-white border-b" style={{ borderColor: COLORS.border }}>
          <div className="flex items-center justify-between p-5">
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-4"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                  boxShadow: "0 6px 16px -3px rgba(168, 72, 42, 0.4)",
                }}
                aria-hidden="true"
              >
                <ShoppingBag size={22} className="text-white" />
              </div>
              <div>
                <h2
                  id="cart-drawer-title"
                  className="text-2xl"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: "italic",
                    color: COLORS.text,
                  }}
                >
                  ตะกร้าของคุณ
                </h2>
                <p className="text-sm" style={{ color: COLORS.textMuted }}>
                  {totalItems} รายการ
                </p>
              </div>
            </motion.div>
            <motion.button
              whileTap={{ scale: 0.9, rotate: 90 }}
              onClick={onClose}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: COLORS.bg }}
              aria-label="ปิดตะกร้า"
            >
              <X size={18} style={{ color: COLORS.textMuted }} />
            </motion.button>
          </div>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            style={{ color: COLORS.textMuted }}
          >
            <div className="text-7xl mb-4" aria-hidden="true">
              🌿
            </div>
            <p
              className="text-2xl mb-2"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                color: COLORS.text,
              }}
            >
              ตะกร้าว่างเปล่า
            </p>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              เลือกเมนูที่ชอบแล้วกดเพิ่มเลย
            </p>
          </motion.div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.menu_item_id}
                  layout
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50, scale: 0.9 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="bg-white rounded-2xl p-4"
                  style={{
                    boxShadow: "var(--shadow-sm)",
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base leading-tight" style={{ color: COLORS.text }}>
                        {item.name}
                      </h4>
                      <p className="text-sm mt-0.5" style={{ color: COLORS.textMuted }}>
                        ฿{formatPrice(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className="text-lg font-bold"
                        style={{ color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}
                      >
                        ฿{formatPrice(item.price * item.quantity)}
                      </div>
                      {confirmDelete === item.menu_item_id ? (
                        <div className="mt-1.5 flex items-center gap-1">
                          <button
                            onClick={() => removeItem(item.menu_item_id)}
                            className="px-2 py-1 rounded-lg text-xs font-bold text-white"
                            style={{ background: COLORS.danger }}
                            aria-label={`ยืนยันการลบ ${item.name}`}
                          >
                            ลบ
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 rounded-lg text-xs font-medium"
                            style={{ color: COLORS.textMuted }}
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => setConfirmDelete(item.menu_item_id)}
                          className="mt-1.5 w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ color: COLORS.textSoft }}
                          aria-label={`ลบ ${item.name} ออกจากตะกร้า`}
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="flex items-center rounded-full p-1"
                      style={{ background: COLORS.bg }}
                    >
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() =>
                          useCart.getState().updateQuantity(item.menu_item_id, item.quantity - 1)
                        }
                        className="w-11 h-11 rounded-full bg-white flex items-center justify-center"
                        style={{ boxShadow: "var(--shadow-sm)" }}
                        aria-label={`ลดจำนวน ${item.name}`}
                      >
                        <Minus size={14} style={{ color: COLORS.primary }} />
                      </motion.button>
                      <motion.span
                        key={item.quantity}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-10 text-center font-bold text-base"
                        style={{ color: COLORS.text }}
                        aria-live="polite"
                        aria-label={`จำนวน ${item.quantity}`}
                      >
                        {item.quantity}
                      </motion.span>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() =>
                          useCart.getState().updateQuantity(item.menu_item_id, item.quantity + 1)
                        }
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white"
                        style={{
                          background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                        }}
                        aria-label={`เพิ่มจำนวน ${item.name}`}
                      >
                        <Plus size={14} />
                      </motion.button>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        setEditingNote(
                          editingNote === item.menu_item_id ? null : item.menu_item_id
                        )
                      }
                      className="text-sm font-medium flex items-center gap-1.5 px-3.5 py-2.5 rounded-full transition-all min-h-[44px]"
                      style={
                        item.note
                          ? { background: COLORS.primaryLight, color: COLORS.primaryDark }
                          : { background: COLORS.bg, color: COLORS.textMuted }
                      }
                      aria-label={`${item.note ? "แก้" : "เพิ่ม"}โน้ตสำหรับ ${item.name}`}
                    >
                      <MessageSquare size={14} />
                      {item.note ? "แก้โน้ต" : "เพิ่มโน้ต"}
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {editingNote === item.menu_item_id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <input
                          type="text"
                          value={item.note}
                          onChange={(e) =>
                            useCart.getState().updateNote(item.menu_item_id, e.target.value)
                          }
                          placeholder="เช่น ไม่เผ็ด, ไม่ใส่ผัก"
                          className="input mt-3 text-sm"
                          style={{ padding: "0.625rem 1rem" }}
                          aria-label={`โน้ตสำหรับ ${item.name}`}
                          autoFocus
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {item.note && editingNote !== item.menu_item_id && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 text-sm px-3 py-2 rounded-xl"
                        style={{ background: COLORS.accentLight, color: COLORS.accentDark }}
                      >
                        💬 {item.note}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Footer */}
        <div className="bg-white border-t p-5 safe-bottom" style={{ borderColor: COLORS.border }}>
          <div className="flex justify-between items-baseline mb-4">
            <span className="text-sm" style={{ color: COLORS.textMuted }}>
              ยอดรวมทั้งหมด
            </span>
            <motion.span
              key={total}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl text-brand"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
            >
              ฿{formatPrice(total)}
            </motion.span>
          </div>
          <motion.button
            whileHover={items.length > 0 ? { scale: 1.02, y: -2 } : {}}
            whileTap={items.length > 0 ? { scale: 0.98 } : {}}
            onClick={onCheckout}
            disabled={items.length === 0}
            className="w-full min-h-[52px] rounded-full text-white text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{
              background:
                items.length > 0
                  ? `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`
                  : COLORS.textSoft,
              boxShadow:
                items.length > 0 ? "0 12px 28px -6px rgba(168, 72, 42, 0.5)" : "none",
            }}
          >
            {items.length > 0 ? "ยืนยันสั่งอาหาร" : "ยังไม่มีรายการ"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
