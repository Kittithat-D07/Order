"use client";

import { useCart } from "@/lib/store/cart";
import { formatPrice } from "@/lib/utils";
import { X, Trash2, ShoppingBag, MessageSquare, Plus, Minus } from "lucide-react";
import { useState, useEffect } from "react";
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
      {/* Backdrop */}
      <AnimatePresence>
        {mounted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            onClick={onClose}
            aria-label="ปิดตะกร้า"
          />
        )}
      </AnimatePresence>

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="absolute right-0 bottom-0 top-0 w-full max-w-md bg-gradient-to-b from-stone-50 to-stone-100 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="bg-white border-b border-stone-200/80">
          <div className="flex items-center justify-between p-5">
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <ShoppingBag size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900 leading-tight">ตะกร้าของฉัน</h2>
                <p className="text-sm text-stone-500">{totalItems} รายการ</p>
              </div>
            </motion.div>
            <motion.button
              whileTap={{ scale: 0.9, rotate: 90 }}
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
              aria-label="ปิด"
            >
              <X size={18} className="text-stone-600" />
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
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-4"
            >
              <span className="text-5xl">🛒</span>
            </motion.div>
            <p className="font-semibold text-stone-700 text-lg">ตะกร้าว่างเปล่า</p>
            <p className="text-sm text-stone-400 mt-2">เลือกเมนูที่ชอบแล้วกดเพิ่มเลย</p>
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
                  className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100"
                >
                  {/* Item Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-stone-900 line-clamp-1 text-base">
                        {item.name}
                      </h4>
                      <p className="text-sm text-stone-500 mt-0.5">
                        ฿{item.price.toLocaleString()} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-base bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                        ฿{(item.price * item.quantity).toLocaleString()}
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={() => useCart.getState().removeItem(item.menu_item_id)}
                        className="mt-1.5 text-stone-400 hover:text-red-500 transition-colors p-1 -mr-1"
                        aria-label="ลบ"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-stone-100 rounded-full p-1">
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() =>
                          useCart.getState().updateQuantity(item.menu_item_id, item.quantity - 1)
                        }
                        className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-orange-50 transition-colors"
                      >
                        <Minus size={14} className="text-orange-600" />
                      </motion.button>
                      <motion.span
                        key={item.quantity}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-10 text-center font-bold text-stone-800 text-base"
                      >
                        {item.quantity}
                      </motion.span>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() =>
                          useCart.getState().updateQuantity(item.menu_item_id, item.quantity + 1)
                        }
                        className="w-9 h-9 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
                      >
                        <Plus size={14} className="text-white" />
                      </motion.button>
                    </div>
                    
                    {/* Note Button */}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        setEditingNote(
                          editingNote === item.menu_item_id ? null : item.menu_item_id
                        )
                      }
                      className={`text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                        item.note
                          ? "bg-orange-100 text-orange-700"
                          : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                      }`}
                    >
                      <MessageSquare size={14} />
                      {item.note ? "แก้โน้ต" : "เพิ่มโน้ต"}
                    </motion.button>
                  </div>

                  {/* Note Input */}
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

                  {/* Note Display */}
                  <AnimatePresence>
                    {item.note && editingNote !== item.menu_item_id && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 text-sm text-stone-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100"
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

        {/* Footer - Total & Checkout */}
        <div className="border-t border-stone-200/80 bg-white p-5 safe-bottom">
          <div className="flex justify-between items-baseline mb-4">
            <span className="text-base text-stone-600">รวมทั้งหมด</span>
            <motion.span 
              key={total}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent"
            >
              ฿{total.toLocaleString()}
            </motion.span>
          </div>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCheckout}
            disabled={items.length === 0}
            className="w-full py-4 rounded-2xl text-white text-lg font-bold shadow-xl shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all"
            style={{
              background: items.length > 0 
                ? "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)" 
                : undefined
            }}
          >
            {items.length > 0 ? "ยืนยันสั่งอาหาร 🍜" : "ยังไม่มีรายการ"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
