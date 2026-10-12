"use client";

import { useCart } from "@/lib/store/cart";
import { formatPrice } from "@/lib/utils";
import { X, Trash2, ShoppingBag, MessageSquare, Plus, Minus } from "lucide-react";
import { useState, useEffect } from "react";

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
      <div
        className={`flex-1 bg-stone-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-label="ปิดตะกร้า"
      />

      {/* Drawer */}
      <div
        className={`w-full max-w-md bg-stone-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          mounted ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="glass border-b border-stone-200/60">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
                <ShoppingBag size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight">ตะกร้าของฉัน</h2>
                <p className="text-xs text-stone-500">{totalItems} รายการ</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-stone-200/60 flex items-center justify-center transition"
              aria-label="ปิด"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-500 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mb-3">
              <ShoppingBag size={32} className="text-stone-300" />
            </div>
            <p className="font-medium text-stone-600">ยังไม่มีรายการในตะกร้า</p>
            <p className="text-xs text-stone-400 mt-1">เลือกเมนูที่ชอบแล้วกดเพิ่มเลย</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {items.map((item) => (
              <div
                key={item.menu_item_id}
                className="bg-white border border-stone-200 rounded-2xl p-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-stone-900 line-clamp-1">
                      {item.name}
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      ฿{item.price} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                      ฿{(item.price * item.quantity).toFixed(0)}
                    </div>
                    <button
                      onClick={() =>
                        useCart.getState().removeItem(item.menu_item_id)
                      }
                      className="mt-1 text-stone-400 hover:text-red-500 transition p-1 -mr-1"
                      aria-label="ลบ"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-stone-100 rounded-full p-0.5">
                    <button
                      onClick={() =>
                        useCart
                          .getState()
                          .updateQuantity(item.menu_item_id, item.quantity - 1)
                      }
                      className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-90 transition"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-7 text-center text-sm font-bold text-stone-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        useCart
                          .getState()
                          .updateQuantity(item.menu_item_id, item.quantity + 1)
                      }
                      className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm flex items-center justify-center active:scale-90 transition"
                    >
                      <Plus size={12} className="text-white" />
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      setEditingNote(
                        editingNote === item.menu_item_id ? null : item.menu_item_id
                      )
                    }
                    className={`text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-full transition ${
                      item.note
                        ? "bg-orange-100 text-orange-700"
                        : "text-stone-500 hover:bg-stone-100"
                    }`}
                  >
                    <MessageSquare size={12} />
                    {item.note ? "แก้โน้ต" : "เพิ่มโน้ต"}
                  </button>
                </div>

                {editingNote === item.menu_item_id && (
                  <input
                    type="text"
                    value={item.note}
                    onChange={(e) =>
                      useCart
                        .getState()
                        .updateNote(item.menu_item_id, e.target.value)
                    }
                    placeholder="เช่น ไม่เผ็ด, ไม่ใส่ผัก"
                    className="input mt-2.5 text-sm py-2"
                    autoFocus
                  />
                )}

                {item.note && editingNote !== item.menu_item_id && (
                  <p className="mt-2 text-xs text-stone-600 italic bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-100">
                    💬 {item.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-stone-200/80 bg-white p-4 safe-bottom">
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-sm text-stone-500">รวมทั้งหมด</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              ฿{formatPrice(total)}
            </span>
          </div>
          <button
            onClick={onCheckout}
            disabled={items.length === 0}
            className="btn-primary w-full py-3.5 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            ยืนยันสั่งอาหาร
          </button>
        </div>
      </div>
    </div>
  );
}
