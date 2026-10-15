"use client";

import { MenuItem } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/lib/store/cart";
import { Plus, Minus, ImageOff, XCircle } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ===== FOOD PLACEHOLDER IMAGES ===== */
const FOOD_GRADIENTS = [
  "linear-gradient(135deg, #FFECD2 0%, #FCB69F 100%)",  // Peach
  "linear-gradient(135deg, #FFE5B4 0%, #FFD093 100%)",   // Honey
  "linear-gradient(135deg, #FFF0F5 0%, #FFE4E1 100%)",   // Rose
  "linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",  // Mint
  "linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)",   // Lemon
  "linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)",  // Pink
  "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",  // Sky
];

const FOOD_ICONS = ["🍜", "🍲", "🥗", "🍛", "🥘", "🍝", "🍱"];

function getFoodStyle(index: number) {
  const gradientIndex = index % FOOD_GRADIENTS.length;
  const iconIndex = index % FOOD_ICONS.length;
  return {
    gradient: FOOD_GRADIENTS[gradientIndex],
    icon: FOOD_ICONS[iconIndex],
  };
}

export function MenuItemCard({ item, index = 0 }: { item: MenuItem; index?: number }) {
  const addItem = useCart((s) => s.addItem);
  const cartItem = useCart((s) =>
    s.items.find((i) => i.menu_item_id === item.id)
  );
  const [imgError, setImgError] = useState(false);

  const foodStyle = getFoodStyle(index);

  // ถ้าไม่ available (แม่ครัว/แอดมินกดปิด)
  if (!item.is_available) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative card overflow-hidden opacity-60"
      >
        <div className="p-4 flex items-center gap-4">
          {/* Food Image */}
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shrink-0"
            style={{ background: foodStyle.gradient }}
          >
            {item.image_url && !imgError ? (
              <img
                src={item.image_url}
                alt={item.name}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <span>{foodStyle.icon}</span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-500 line-clamp-1 text-base">
              {item.name}
            </h3>
            {item.description && (
              <p className="text-sm text-stone-400 mt-0.5 line-clamp-1">
                {item.description}
              </p>
            )}
            {/* Unavailable Badge */}
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              หมดชั่วคราว
            </span>
          </div>
          
          <div className="text-right shrink-0">
            <div className="text-stone-400 line-through text-sm">
              {formatPrice(item.price)}
            </div>
          </div>
        </div>
        
        {/* Sold Out Overlay */}
        <div className="absolute inset-0 bg-stone-900/5 flex items-center justify-end pr-4">
          <div className="bg-stone-800/80 text-white text-xs font-semibold px-3 py-1 rounded-full">
            หมด
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="card-interactive overflow-hidden group"
    >
      {/* Image Section - 16:10 aspect ratio */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {item.image_url && !imgError ? (
          <>
            <img
              src={item.image_url}
              alt={item.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* Image Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </>
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center text-6xl"
            style={{ background: foodStyle.gradient }}
          >
            {foodStyle.icon}
          </div>
        )}
        
        {/* Badge: Recommended */}
        {(item as any).is_recommended && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-bold shadow-lg flex items-center gap-1">
            ⭐ แนะนำ
          </div>
        )}
        
        {/* Price Tag */}
        <div className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm shadow-md">
          <span className="text-sm font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            ฿{formatPrice(item.price)}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h3 className="font-semibold text-stone-900 line-clamp-1 text-base">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-sm text-stone-500 mt-1 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Add to Cart Button */}
        <div className="flex items-center justify-end mt-3">
          <AnimatePresence mode="wait">
            {cartItem ? (
              <motion.div
                key="quantity-control"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1 bg-orange-50 rounded-full p-1 ring-2 ring-orange-200"
              >
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() =>
                    useCart.getState().updateQuantity(item.id, cartItem.quantity - 1)
                  }
                  className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-orange-50 transition-colors"
                >
                  <Minus size={14} className="text-orange-600" />
                </motion.button>
                
                <motion.span
                  key={cartItem.quantity}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-8 text-center font-bold text-orange-700 text-sm"
                >
                  {cartItem.quantity}
                </motion.span>
                
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() =>
                    useCart.getState().updateQuantity(item.id, cartItem.quantity + 1)
                  }
                  className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
                >
                  <Plus size={14} className="text-white" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="add-button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileTap={{ scale: 0.9 }}
                onClick={() =>
                  addItem({
                    menu_item_id: item.id,
                    name: item.name,
                    price: item.price,
                    image_url: item.image_url,
                    note: "",
                  })
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-shadow"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>เพิ่ม</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
