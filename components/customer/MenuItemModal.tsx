"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Minus,
  Heart,
  Clock,
  Flame,
  Leaf,
  AlertTriangle,
  Sparkles,
  ShoppingBag,
  ChefHat,
} from "lucide-react";
import { MenuItem } from "@/lib/types";
import { COLORS, FOOD_EMOJIS, baht, alpha } from "@/lib/theme";

interface MenuItemModalProps {
  item: MenuItem | null;
  open: boolean;
  onClose: () => void;
  onAdd: (item: MenuItem, qty: number, note: string) => void;
  isFav: boolean;
  onToggleFav: () => void;
}

/**
 * Allergen chips. Every colour is drawn from the token palette so no
 * un-tokenised navy slips into the warm system.
 */
const ALLERGEN_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  nuts: { label: "ถั่ว", emoji: "🥜", color: COLORS.primaryDark },
  gluten: { label: "กลูเตน", emoji: "🌾", color: COLORS.warning },
  dairy: { label: "นมวัว", emoji: "🥛", color: COLORS.accent },
  eggs: { label: "ไข่", emoji: "🥚", color: COLORS.danger },
  shellfish: { label: "อาหารทะเล", emoji: "🦐", color: COLORS.primaryDeep },
  soy: { label: "ถั่วเหลือง", emoji: "🫘", color: COLORS.accentDark },
  fish: { label: "ปลา", emoji: "🐟", color: COLORS.primaryDeep },
};

/**
 * Quick note chips — the six things a Thai kitchen is actually asked for.
 * Typing "ไม่เผ็ด" one-handed at a table is the difference between
 * getting what you ordered and what you did not.
 */
const QUICK_NOTES = [
  { label: "ไม่เผ็ด", value: "ไม่เผ็ด" },
  { label: "เผ็ดน้อย", value: "เผ็ดน้อย" },
  { label: "ไม่ใส่ผัก", value: "ไม่ใส่ผัก" },
  { label: "เพิ่มข้าว", value: "เพิ่มข้าว" },
  { label: "ไม่ใส่ถั่ว", value: "ไม่ใส่ถั่ว" },
  { label: "น้ำแข็งแยก", value: "น้ำแข็งแยก" },
];

const GRADIENTS = [
  `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.accentLight} 100%)`,
  `linear-gradient(135deg, ${COLORS.accentLight} 0%, ${COLORS.primaryLight} 100%)`,
  `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.surface3} 100%)`,
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
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setNote("");
      setImgLoaded(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, item?.id]);

  // Escape closes the sheet; focus moves into the panel so keyboard users
  // are not left behind on the page underneath.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // Simple focus trap across the panel's focusable children.
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
    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    });
    return () => {
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [open, onClose]);

  if (!item) return null;

  const idx = item.id.charCodeAt(0) % FOOD_EMOJIS.length;
  const emoji = FOOD_EMOJIS[idx];
  const gradient = GRADIENTS[idx % GRADIENTS.length];

  const prepTime = item.prep_time_minutes || 10;
  const allergens: string[] = item.allergens ?? [];
  const isSignature = item.is_signature;

  /**
   * `is_available` is the single source of truth. `stock_count` is only a
   * hint about how many are left — it never decides whether a dish can be
   * ordered. -1 / null means the count is not tracked.
   */
  const outOfStock = !item.is_available;
  const stock = item.stock_count ?? -1;
  const tracked = stock >= 0;
  const lowStock = tracked && stock > 0 && stock <= 5;

  const handleAdd = () => {
    if (outOfStock) return;
    onAdd(item, quantity, note);
    onClose();
  };

  const total = Number(item.price) * quantity;

  const toggleQuickNote = (value: string) => {
    setNote((prev) => {
      if (prev.includes(value)) return prev.replace(value, "").trim();
      return prev ? `${prev}, ${value}` : value;
    });
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
              background: "rgba(36, 30, 25, 0.55)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            aria-hidden="true"
          />

          {/* Sheet — bottom sheet on mobile, centred dialog on desktop.
              The positioning wrapper is a plain div so Framer Motion's
              transform never fights the centering transform. */}
          <div className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              ref={panelRef}
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
              className="pointer-events-auto bg-white shadow-lg flex flex-col overflow-hidden w-full sm:w-[440px] max-h-[92vh] sm:max-h-[90vh]"
              style={{
                borderTopLeftRadius: "28px",
                borderTopRightRadius: "28px",
                border: "1px solid var(--color-border)",
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="menu-modal-title"
              tabIndex={-1}
            >
              {/* Drag handle (mobile) */}
              <div className="sm:hidden pt-2 pb-1 flex justify-center">
                <div
                  className="w-12 h-1.5 rounded-full"
                  style={{ background: "var(--color-border-strong)" }}
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
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="w-full h-full flex items-center justify-center text-9xl"
                    style={{ background: gradient }}
                    aria-hidden="true"
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

                {/* Top-right buttons — 44px targets */}
                <div className="absolute top-3 right-3 flex gap-2 z-10">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onToggleFav}
                    className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md"
                    style={{
                      background: "rgba(255,255,255,0.92)",
                      boxShadow: "0 4px 12px -2px rgba(92, 36, 16, 0.2)",
                    }}
                    aria-label={isFav ? `เอาออกจากรายการโปรด ${item.name}` : `เพิ่ม ${item.name} ในรายการโปรด`}
                    aria-pressed={isFav}
                  >
                    <Heart
                      size={18}
                      className={isFav ? "fill-current" : ""}
                      style={{ color: isFav ? COLORS.primary : "#9A9089" }}
                    />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md"
                    style={{
                      background: "rgba(255,255,255,0.92)",
                      boxShadow: "0 4px 12px -2px rgba(92, 36, 16, 0.2)",
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
                      boxShadow: "0 4px 12px -2px rgba(92, 36, 16, 0.2)",
                    }}
                  >
                    <Sparkles size={12} /> เมนูแนะนำ
                  </motion.div>
                )}

                {/* Stock badge — only when a real count exists */}
                {lowStock && !outOfStock && (
                  <motion.div
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute top-14 left-3 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
                    style={{
                      background: COLORS.warning,
                      color: "#FFFFFF",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <Flame size={12} /> เหลือ {stock} จาน
                  </motion.div>
                )}
              </div>

              {/* Content — scrollable */}
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
                      ฿{baht(item.price)}
                    </p>
                  </div>

                  {/* Pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span
                      className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                      style={{
                        background: COLORS.surface3,
                        color: COLORS.text,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <Clock size={12} /> ใช้เวลาประมาณ {prepTime} นาที
                    </span>
                    <span
                      className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                      style={{
                        background: COLORS.primaryLight,
                        color: COLORS.primaryDark,
                      }}
                    >
                      <Leaf size={12} /> สดใหม่ทุกวัน
                    </span>
                    {outOfStock && (
                      <span
                        className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                        style={{
                          background: COLORS.danger,
                          color: "#FFFFFF",
                        }}
                      >
                        <AlertTriangle size={12} /> หมดชั่วคราว
                      </span>
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

                  {/* Why it is sold out — name the reason and the recovery */}
                  {outOfStock && (
                    <div
                      className="mb-4 p-3.5 rounded-2xl flex items-start gap-3"
                      style={{ background: COLORS.dangerLight, border: `1px solid ${alpha("danger", 0.19)}` }}
                      role="status"
                    >
                      <AlertTriangle
                        size={16}
                        className="shrink-0 mt-0.5"
                        style={{ color: COLORS.dangerText }}
                      />
                      <div>
                        <p className="text-sm font-bold" style={{ color: COLORS.dangerText }}>
                          เมนูนี้หมดชั่วคราว
                        </p>
                        <p className="text-xs mt-1" style={{ color: COLORS.dangerText }}>
                          {item.unavailable_reason?.trim() ||
                            "ร้านกำลังเตรียมของใหม่ ลองเลือกเมนูอื่นระหว่างรอนะครับ"}
                        </p>
                      </div>
                    </div>
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
                          const info = ALLERGEN_LABELS[a] ?? {
                            label: a,
                            emoji: "🚨",
                            color: COLORS.danger,
                          };
                          return (
                            <span
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
                            </span>
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
                      htmlFor="menu-item-note"
                      className="text-xs font-bold mb-2 flex items-center gap-1.5"
                      style={{ color: COLORS.textMuted }}
                    >
                      <ChefHat size={12} /> หมายเหตุถึงครัว (ไม่บังคับ)
                    </label>

                    {/* Quick chips — the six things Thai kitchens get asked for */}
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {QUICK_NOTES.map((q) => {
                        const active = note.includes(q.value);
                        return (
                          <button
                            key={q.value}
                            type="button"
                            onClick={() => toggleQuickNote(q.value)}
                            aria-pressed={active}
                            className="px-3 py-2 rounded-full text-xs font-medium transition-colors"
                            style={{
                              minHeight: 36,
                              background: active ? COLORS.primary : COLORS.surface2,
                              color: active ? COLORS.onPrimary : COLORS.textMuted,
                              border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
                            }}
                          >
                            {q.label}
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      id="menu-item-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 200))}
                      placeholder="เช่น ไม่เผ็ด, เพิ่มข้าว, ไม่ใส่ผัก..."
                      maxLength={200}
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-2xl text-base resize-none outline-none transition-all"
                      style={{
                        background: COLORS.bg,
                        border: `1.5px solid ${COLORS.border}`,
                        color: COLORS.text,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = COLORS.primary;
                        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(168, 72, 42, 0.14)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = COLORS.border;
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    <p className="text-xs mt-1 text-right" style={{ color: COLORS.textSoft }}>
                      {note.length}/200
                    </p>
                  </motion.div>
                </motion.div>
              </div>

              {/* Bottom action bar — sticky */}
              <div
                className="px-5 sm:px-6 py-4 border-t shrink-0"
                style={{
                  background: "rgba(255,255,255,0.98)",
                  backdropFilter: "blur(10px)",
                  borderColor: COLORS.border,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Quantity selector — 44px targets */}
                  <div
                    className="flex items-center gap-1 rounded-full p-1 shrink-0"
                    style={{
                      background: COLORS.bg,
                      border: `1.5px solid ${COLORS.border}`,
                    }}
                  >
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40"
                      style={{
                        background: "white",
                        boxShadow: "0 2px 6px -1px rgba(92, 36, 16, 0.15)",
                      }}
                      aria-label="ลดจำนวน"
                    >
                      <Minus size={14} style={{ color: COLORS.text }} />
                    </motion.button>
                    <motion.span
                      key={quantity}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="font-bold text-lg w-8 text-center tabular-nums"
                      style={{ color: COLORS.text }}
                      aria-live="polite"
                      aria-label={`จำนวน ${quantity}`}
                    >
                      {quantity}
                    </motion.span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setQuantity(Math.min(20, quantity + 1))}
                      disabled={quantity >= 20}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-40"
                      style={{
                        background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                        boxShadow: "0 2px 6px -1px rgba(168, 72, 42, 0.4)",
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
                    className="flex-1 min-h-[44px] py-3.5 rounded-full text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{
                      background: outOfStock
                        ? COLORS.textSoft
                        : `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`,
                      boxShadow: outOfStock
                        ? "none"
                        : "0 10px 24px -6px rgba(168, 72, 42, 0.5)",
                    }}
                  >
                    <ShoppingBag size={16} strokeWidth={2.5} />
                    {outOfStock
                      ? "หมดชั่วคราว"
                      : `เพิ่มลงตะกร้า ฿${baht(total)}`}
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
