"use client";

import { MenuItem } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/lib/store/cart";
import { Plus, Minus, ImageOff } from "lucide-react";
import { useState } from "react";

export function MenuItemCard({ item }: { item: MenuItem }) {
  const addItem = useCart((s) => s.addItem);
  const cartItem = useCart((s) =>
    s.items.find((i) => i.menu_item_id === item.id)
  );
  const [imgError, setImgError] = useState(false);

  // ถ้าไม่ available
  if (!item.is_available) {
    return (
      <div className="card opacity-60 grayscale">
        <div className="p-4 flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-700 line-clamp-1">
              {item.name}
            </h3>
            {item.description && (
              <p className="text-sm text-stone-500 mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
            <span className="inline-block mt-2 text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
              หมดชั่วคราว
            </span>
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold text-stone-500">
              {formatPrice(item.price)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-interactive overflow-hidden">
      {/* Image */}
      {item.image_url && !imgError ? (
        <div className="relative aspect-[16/10] bg-stone-100 overflow-hidden">
          <img
            src={item.image_url}
            alt={item.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      ) : (
        <div className="aspect-[16/10] bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50 flex items-center justify-center">
          <div className="text-center">
            <ImageOff size={28} className="text-orange-300 mx-auto mb-1" />
            <p className="text-xs text-orange-400 font-medium">ไม่มีรูปภาพ</p>
          </div>
        </div>
      )}

      <div className="p-3.5">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-900 line-clamp-1">
              {item.name}
            </h3>
            {item.description && (
              <p className="text-sm text-stone-500 mt-0.5 line-clamp-2 leading-snug">
                {item.description}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold text-base bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {formatPrice(item.price)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          {cartItem ? (
            <div className="flex items-center gap-1 bg-orange-50 rounded-full p-1">
              <button
                onClick={() =>
                  useCart
                    .getState()
                    .updateQuantity(item.id, cartItem.quantity - 1)
                }
                className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-90 transition"
                aria-label="ลดจำนวน"
              >
                <Minus size={14} className="text-orange-600" />
              </button>
              <span className="w-7 text-center font-bold text-orange-700 text-sm">
                {cartItem.quantity}
              </span>
              <button
                onClick={() =>
                  useCart
                    .getState()
                    .updateQuantity(item.id, cartItem.quantity + 1)
                }
                className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm flex items-center justify-center active:scale-90 transition"
                aria-label="เพิ่มจำนวน"
              >
                <Plus size={14} className="text-white" />
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
              className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold flex items-center gap-1 shadow-md hover:shadow-lg active:scale-95 transition"
            >
              <Plus size={14} /> เพิ่ม
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
