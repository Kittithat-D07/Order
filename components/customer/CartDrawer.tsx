"use client";

import { useCart } from "@/lib/store/cart";
import { formatPrice } from "@/lib/utils";
import { X, Trash2, ShoppingBag } from "lucide-react";
import { useState } from "react";

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/50"
        onClick={onClose}
        aria-label="ปิดตะกร้า"
      />
      <div className="w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingBag size={20} /> ตะกร้า ({totalItems})
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center"
            aria-label="ปิด"
          >
            <X size={18} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-stone-500 p-8 text-center">
            ยังไม่มีรายการในตะกร้า
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.map((item) => (
              <div
                key={item.menu_item_id}
                className="border border-stone-200 rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {formatPrice(item.price)} × {item.quantity} ={" "}
                      <span className="font-semibold text-brand-600">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      useCart.getState().removeItem(item.menu_item_id)
                    }
                    className="text-stone-400 hover:text-red-500"
                    aria-label="ลบ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        useCart
                          .getState()
                          .updateQuantity(item.menu_item_id, item.quantity - 1)
                      }
                      className="w-7 h-7 rounded-full border border-stone-300 flex items-center justify-center hover:bg-stone-100 text-sm"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        useCart
                          .getState()
                          .updateQuantity(item.menu_item_id, item.quantity + 1)
                      }
                      className="w-7 h-7 rounded-full border border-stone-300 flex items-center justify-center hover:bg-stone-100 text-sm"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      setEditingNote(
                        editingNote === item.menu_item_id ? null : item.menu_item_id
                      )
                    }
                    className="text-xs text-brand-600 hover:underline"
                  >
                    {item.note ? "แก้โน้ต" : "+ เพิ่มโน้ต"}
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
                    className="mt-2 w-full px-2 py-1 text-sm border border-stone-300 rounded"
                    autoFocus
                  />
                )}

                {item.note && editingNote !== item.menu_item_id && (
                  <p className="mt-1.5 text-xs text-stone-500 italic">
                    หมายเหตุ: {item.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="border-t p-4 space-y-3">
          <div className="flex justify-between text-lg font-bold">
            <span>รวมทั้งหมด</span>
            <span className="text-brand-600">{formatPrice(total)}</span>
          </div>
          <button
            onClick={onCheckout}
            disabled={items.length === 0}
            className="w-full py-3 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold"
          >
            ยืนยันสั่งอาหาร
          </button>
        </div>
      </div>
    </div>
  );
}
