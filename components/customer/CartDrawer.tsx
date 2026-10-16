"use client";

import { useCart } from "@/lib/store/cart";
import { formatPrice } from "@/lib/utils";
import { X, Trash2, ShoppingBag, MessageSquare, Plus, Minus } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const COLORS: Record<string, string> = {
  primary: "#B85C38",
  primaryDark: "#8B3F1A",
  primaryLight: "#F4DCC4",
  secondary: "#6B7B5F",
  secondaryDark: "#4A5942",
  secondaryLight: "#DDE3D2",
  accent: "#C8932F",
  accentLight: "#F0D78C",
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  border: "#E8DFD0",
  text: "#2C2620",
  textMuted: "#6B5F54",
  success: "#4F7942",
  danger: "#A03826",
};

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

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [open]);

  if (!open) return null;

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
            aria-label="ปิดตะกร้า"
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="absolute right-0 bottom-0 top-0 w-full max-w-md flex flex-col"
        style={{ background: COLORS.bg }}
      >
        {/* Header */}
        <div className="bg-white border-b" style={{ borderColor: "rgba(232, 223, 208, 0.6)" }}>
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
                  boxShadow: "0 6px 16px -3px rgba(184, 92, 56, 0.4)"
                }}
              >
                <ShoppingBag size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: COLORS.text }}>
                  ตะกร้าของฉัน
                </h2>
                <p className="text-sm text-stone-500">{totalItems} รายการ</p>
              </div>
            </motion.div>
            <motion.button
              whileTap={{ scale: 0.9, rotate: 90 }}
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: COLORS.bg }}
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
            className="flex-1 flex flex-col items-center justify-center text-stone-500 p-8 text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [-2, 2, -2] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-7xl mb-4"
            >
              🌿
            </motion.div>
            <p className="text-2xl mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: COLORS.text }}>
              ตะกร้าว่างเปล่า
            </p>
            <p className="text-sm text-stone-500">เลือกเมนูที่ชอบแล้วกดเพิ่มเลย</p>
          </motion.div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence mode="popLayout">
              {items.map((item, idx) => (
                <motion.div
                  key={item.menu_item_id}
                  layout
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50, scale: 0.9 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="bg-white rounded-2xl p-4"
                  style={{ 
                    boxShadow: "0 4px 12px -2px rgba(139, 63, 26, 0.08)",
                    border: "1px solid rgba(232, 223, 208, 0.5)"
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base leading-tight" style={{ color: COLORS.text }}>
                        {item.name}
                      </h4>
                      <p className="text-sm text-stone-500 mt-0.5">
                        ฿{item.price.toLocaleString()} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold" style={{ color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}>
                        ฿{(item.price * item.quantity).toLocaleString()}
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={() => useCart.getState().removeItem(item.menu_item_id)}
                        className="mt-1.5 text-stone-400 hover:text-red-500 transition-colors p-1 -mr-1"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-full p-1" style={{ background: COLORS.bg }}>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() =>
                          useCart.getState().updateQuantity(item.menu_item_id, item.quantity - 1)
                        }
                        className="w-9 h-9 rounded-full bg-white flex items-center justify-center"
                        style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
                      >
                        <Minus size={14} style={{ color: COLORS.primary }} />
                      </motion.button>
                      <motion.span
                        key={item.quantity}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-10 text-center font-bold text-base"
                        style={{ color: COLORS.text }}
                      >
                        {item.quantity}
                      </motion.span>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() =>
                          useCart.getState().updateQuantity(item.menu_item_id, item.quantity + 1)
                        }
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                        style={{ 
                          background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`
                        }}
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
                      className="text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
                      style={
                        item.note
                          ? { background: COLORS.primaryLight, color: COLORS.primaryDark }
                          : { background: COLORS.bg, color: COLORS.textMuted }
                      }
                    >
                      <MessageSquare size={14} />
                      {item.note ? "แก้โน้ต" : "เพิ่มโน้ต"}
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {editingNote === item.menu_item_id && (
                      <motion.input
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        type="text"
                        value={item.note}
                        onChange={(e) =>
                          useCart.getState().updateNote(item.menu_item_id, e.target.value)
                        }
                        placeholder="เช่น ไม่เผ็ด, ไม่ใส่ผัก"
                        className="input mt-3 text-sm py-2.5"
                        autoFocus
                      />
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {item.note && editingNote !== item.menu_item_id && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 text-sm text-stone-600 px-3 py-2 rounded-xl"
                        style={{ background: COLORS.secondaryLight }}
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
        <div className="bg-white border-t p-5 safe-bottom" style={{ borderColor: "rgba(232, 223, 208, 0.6)" }}>
          <div className="flex justify-between items-baseline mb-4">
            <span className="text-sm text-stone-600" style={{ fontFamily: "var(--font-body)" }}>
              ยอดรวมทั้งหมด
            </span>
            <motion.span
              key={total}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl text-sunset"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
            >
              ฿{total.toLocaleString()}
            </motion.span>
          </div>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCheckout}
            disabled={items.length === 0}
            className="w-full py-4 rounded-full text-white text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{
              background: items.length > 0
                ? `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`
                : COLORS.textMuted,
              boxShadow: items.length > 0
                ? "0 12px 28px -6px rgba(184, 92, 56, 0.5)"
                : "none"
            }}
          >
            {items.length > 0 ? "🌿 ยืนยันสั่งอาหาร" : "ยังไม่มีรายการ"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
