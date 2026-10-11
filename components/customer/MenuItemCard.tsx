"use client";

import { MenuItem } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/lib/store/cart";
import { Plus, Minus } from "lucide-react";

export function MenuItemCard({ item }: { item: MenuItem }) {
  const addItem = useCart((s) => s.addItem);
  const cartItem = useCart((s) =>
    s.items.find((i) => i.menu_item_id === item.id)
  );

  if (!item.is_available) {
    return (
      <div className="border border-stone-200 rounded-xl p-4 bg-stone-100 opacity-60">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-stone-700">{item.name}</h3>
            {item.description && (
              <p className="text-sm text-stone-500 mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="font-semibold text-stone-500">
              {formatPrice(item.price)}
            </div>
            <span className="text-xs text-stone-500">หมดชั่วคราว</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-stone-200 rounded-xl p-4 bg-white hover:shadow-md transition">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-stone-900">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-stone-500 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-semibold text-brand-600">
            {formatPrice(item.price)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {cartItem ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                useCart
                  .getState()
                  .updateQuantity(item.id, cartItem.quantity - 1)
              }
              className="w-8 h-8 rounded-full border border-stone-300 flex items-center justify-center hover:bg-stone-100"
              aria-label="ลดจำนวน"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center font-medium">
              {cartItem.quantity}
            </span>
            <button
              onClick={() =>
                useCart
                  .getState()
                  .updateQuantity(item.id, cartItem.quantity + 1)
              }
              className="w-8 h-8 rounded-full border border-stone-300 flex items-center justify-center hover:bg-stone-100"
              aria-label="เพิ่มจำนวน"
            >
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() =>
              addItem({
                menu_item_id: item.id,
                name: item.name,
                price: item.price,
                image_url: item.image_url,
                note: "",
              })
            }
            className="px-4 py-1.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium flex items-center gap-1"
          >
            <Plus size={14} /> เพิ่ม
          </button>
        )}
      </div>
    </div>
  );
}
