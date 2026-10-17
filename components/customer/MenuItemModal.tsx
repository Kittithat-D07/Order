"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Heart, Clock, Flame, Leaf, AlertTriangle, Sparkles, ShoppingBag, ChefHat } from "lucide-react";
import { MenuItem } from "@/lib/types";

interface MenuItemModalProps {
  item: MenuItem | null;
  open: boolean;
  onClose: () => void;
  onAdd: (item: MenuItem, qty: number, note: string) => void;
  isFav: boolean;
  onToggleFav: () => void;
}

const ALLERGEN_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  nuts: { label: "ถั่ว", emoji: "🥜", color: "#B85C38" },
  gluten: { label: "กลูเตน", emoji: "🌾", color: "#C8932F" },
  dairy: { label: "นมวัว", emoji: "🥛", color: "#6B7B5F" },
  eggs: { label: "ไข่", emoji: "🥚", color: "#A03826" },
  shellfish: { label: "อาหารทะเล", emoji: "🦐", color: "#1B4965" },
  soy: { label: "ถั่วเหลือง", emoji: "🫘", color: "#8B6F47" },
  fish: { label: "ปลา", emoji: "🐟", color: "#1B4965" },
};

const COLORS = {
  primary: "#B85C38",
  primaryDark: "#8B3F1A",
  primaryLight: "#F4DCC4",
  secondary: "#6B7B5F",
  secondaryLight: "#DDE3D2",
  accent: "#C8932F",
  accentLight: "#F0D78C",
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  text: "#2C2620",
  textMuted: "#6B5F54",
  border: "#E8DFD0",
  success: "#4F7942",
  danger: "#A03826",
};

const FOOD_EMOJIS = ["🍜", "🥗", "🍕", "🍔", "🍣", "🍱", "🥘", "🍝", "🍤", "🥩", "🌮", "🍛"];
const GRADIENTS = [
  `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.secondaryLight} 100%)`,
  `linear-gradient(135deg, ${COLORS.accentLight} 0%, ${COLORS.primaryLight} 100%)`,
  `linear-gradient(135deg, ${COLORS.secondaryLight} 0%, ${COLORS.accentLight} 100%)`,
];

export function MenuItemModal({
  item,
  open,
  onClose,
  onAdd,
  isFav,
  onToggleFav,
}: MenuItemModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setNote("");
      setImgLoaded(false);
      // Lock body scroll
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, item?.id]);

  if (!item) return null;

  const idx = item.id.charCodeAt(0) % FOOD_EMOJIS.length;
  const emoji = FOOD_EMOJIS[idx];
  const gradient = GRADIENTS[idx % GRADIENTS.length];

  const prepTime = (item as any).prep_time_minutes || 10;
  const allergens: string[] = (item as any).allergens || [];
  const isSignature = (item as any).is_signature;
  const stock = (item as any).stock_count ?? -1; // -1 = no limit
  const lowStock = stock >= 0 && stock <= 5;
  const outOfStock = stock === 0;

  const handleAdd = () => {
    if (outOfStock) return;
    onAdd(item, quantity, note);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{
              background: "rgba(44, 38, 32, 0.55)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            aria-hidden="true"
          />

          {/* Sheet - bottom on mobile, center on desktop */}
          <div className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{
                type: "spring",
                damping: 32,
                stiffness: 320,
                mass: 0.8,
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 500) {
                  onClose();
                }
              }}
              className="pointer-events-auto bg-white shadow-2xl flex flex-col overflow-hidden w-full sm:w-[440px] max-h-[92vh] sm:max-h-[90vh]"
              style={{
                borderTopLeftRadius: "28px",
                borderTopRightRadius: "28px",
                border: "1px solid rgba(232, 223, 208, 0.5)",
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="menu-modal-title"
            >
            {/* Drag handle (mobile) */}
            <div className="sm:hidden pt-2 pb-1 flex justify-center">
              <div
                className="w-12 h-1.5 rounded-full"
                style={{ background: "rgba(232, 223, 208, 0.8)" }}
              />
            </div>

            {/* Hero Image */}
            <div className="relative h-56 sm:h-48 overflow-hidden shrink-0">
              {item.image_url ? (
                <>
                  {!imgLoaded && (
                    <div
                      className="absolute inset-0 animate-pulse"
                      style={{ background: gradient }}
                    />
                  )}
                  <motion.img
                    src={item.image_url}
                    alt={item.name}
                    onLoad={() => setImgLoaded(true)}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full h-full object-cover"
                  />
                </>
              ) : (
                <motion.div
                  initial={{ scale: 0.8, rotate: -5 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="w-full h-full flex items-center justify-center text-9xl"
                  style={{ background: gradient }}
                >
                  {emoji}
                </motion.div>
              )}

              {/* Gradient overlay */}
              <div
                className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
                style={{
                  background: "linear-gradient(to top, rgba(255,255,255,0.95) 0%, transparent 100%)",
                }}
              />

              {/* Top-right buttons */}
              <div className="absolute top-3 right-3 flex gap-2 z-10">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={onToggleFav}
                  className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
                  style={{
                    background: "rgba(255,255,255,0.9)",
                    boxShadow: "0 4px 12px -2px rgba(139, 63, 26, 0.2)",
                  }}
                  aria-label={isFav ? "เอาออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
                >
                  <Heart
                    size={18}
                    className={isFav ? "fill-current" : ""}
                    style={{ color: isFav ? COLORS.primary : "#9CA3AF" }}
                  />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={onClose}
                  className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
                  style={{
                    background: "rgba(255,255,255,0.9)",
                    boxShadow: "0 4px 12px -2px rgba(139, 63, 26, 0.2)",
                  }}
                  aria-label="ปิด"
                >
                  <X size={18} style={{ color: COLORS.text }} />
                </motion.button>
              </div>

              {/* Signature badge */}
              {isSignature && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
                  style={{
                    background: "rgba(255,255,255,0.95)",
                    color: COLORS.accent,
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 4px 12px -2px rgba(200, 147, 47, 0.3)",
                  }}
                >
                  <Sparkles size={12} /> เมนูแนะนำ
                </motion.div>
              )}

              {/* Stock badge */}
              {lowStock && !outOfStock && (
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="absolute top-14 left-3 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
                  style={{
                    background: "rgba(160, 56, 38, 0.95)",
                    color: "white",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Flame size={12} /> เหลือ {stock} จาน
                </motion.div>
              )}
            </div>

            {/* Content - scrollable */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-4 -mt-8 relative">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Title + Price */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2
                    id="menu-modal-title"
                    className="text-2xl sm:text-3xl font-bold leading-tight flex-1"
                    style={{
                      color: COLORS.text,
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    {item.name}
                  </h2>
                  <p
                    className="text-2xl sm:text-3xl font-bold shrink-0"
                    style={{
                      color: COLORS.primary,
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    ฿{Number(item.price).toLocaleString()}
                  </p>
                </div>

                {/* Pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                    style={{
                      background: COLORS.secondaryLight,
                      color: COLORS.secondary,
                    }}
                  >
                    <Clock size={12} /> {prepTime} นาที
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                    style={{
                      background: COLORS.primaryLight,
                      color: COLORS.primary,
                    }}
                  >
                    <Leaf size={12} /> สดใหม่ทุกวัน
                  </motion.div>
                  {outOfStock && (
                    <div
                      className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                      style={{
                        background: COLORS.danger,
                        color: "white",
                      }}
                    >
                      <AlertTriangle size={12} /> หมดชั่วคราว
                    </div>
                  )}
                </div>

                {/* Description */}
                {item.description && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="text-sm leading-relaxed mb-4"
                    style={{ color: COLORS.textMuted }}
                  >
                    {item.description}
                  </motion.p>
                )}

                {/* Allergens */}
                {allergens.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-4"
                  >
                    <p
                      className="text-xs font-bold mb-2 uppercase tracking-wider"
                      style={{ color: COLORS.textMuted }}
                    >
                      ⚠️ ส่วนผสมที่อาจแพ้
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allergens.map((a) => {
                        const info = ALLERGEN_LABELS[a] || {
                          label: a,
                          emoji: "🚨",
                          color: COLORS.danger,
                        };
                        return (
                          <div
                            key={a}
                            className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                            style={{
                              background: `${info.color}15`,
                              color: info.color,
                              border: `1px solid ${info.color}30`,
                            }}
                          >
                            <span>{info.emoji}</span>
                            {info.label}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Note input */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mb-4"
                >
                  <label
                    className="text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: COLORS.textMuted }}
                  >
                    <ChefHat size={12} /> หมายเหตุ (ไม่บังคับ)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 200))}
                    placeholder="เช่น ไม่เผ็ด, เพิ่มข้าว, ไม่ใส่ผัก..."
                    maxLength={200}
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-2xl text-sm resize-none focus:outline-none transition-all"
                    style={{
                      background: COLORS.bg,
                      border: `1.5px solid ${COLORS.border}`,
                      color: COLORS.text,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = COLORS.primary;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = COLORS.border;
                    }}
                  />
                  <p
                    className="text-xs mt-1 text-right"
                    style={{ color: COLORS.textMuted }}
                  >
                    {note.length}/200
                  </p>
                </motion.div>
              </motion.div>
            </div>

            {/* Bottom action bar - sticky */}
            <div
              className="px-5 sm:px-6 py-4 border-t shrink-0"
              style={{
                background: "rgba(255,255,255,0.98)",
                backdropFilter: "blur(10px)",
                borderColor: COLORS.border,
              }}
            >
              <div className="flex items-center gap-3">
                {/* Quantity selector */}
                <div
                  className="flex items-center gap-1 rounded-full p-1 shrink-0"
                  style={{
                    background: COLORS.bg,
                    border: `1.5px solid ${COLORS.border}`,
                  }}
                >
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
                    style={{
                      background: "white",
                      boxShadow: "0 2px 6px -1px rgba(139, 63, 26, 0.15)",
                    }}
                    aria-label="ลดจำนวน"
                  >
                    <Minus size={14} style={{ color: COLORS.text }} />
                  </motion.button>
                  <motion.span
                    key={quantity}
                    initial={{ scale: 1.3, color: COLORS.primary }}
                    animate={{ scale: 1, color: COLORS.text }}
                    transition={{ duration: 0.2 }}
                    className="font-bold text-lg w-7 text-center tabular-nums"
                  >
                    {quantity}
                  </motion.span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setQuantity(Math.min(20, quantity + 1))}
                    disabled={quantity >= 20}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                      boxShadow: "0 2px 6px -1px rgba(184, 92, 56, 0.4)",
                    }}
                    aria-label="เพิ่มจำนวน"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </motion.button>
                </div>

                {/* Add to cart button */}
                <motion.button
                  whileHover={!outOfStock ? { scale: 1.02 } : {}}
                  whileTap={!outOfStock ? { scale: 0.97 } : {}}
                  onClick={handleAdd}
                  disabled={outOfStock}
                  className="flex-1 py-3.5 rounded-full text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    background: outOfStock
                      ? COLORS.textMuted
                      : `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`,
                    boxShadow: outOfStock
                      ? "none"
                      : "0 10px 24px -6px rgba(184, 92, 56, 0.5)",
                  }}
                >
                  <ShoppingBag size={16} strokeWidth={2.5} />
                  {outOfStock
                    ? "หมดชั่วคราว"
                    : `เพิ่มลงตะกร้า ฿${(Number(item.price) * quantity).toLocaleString()}`}
                </motion.button>
              </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
