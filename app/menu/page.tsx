"use client";

import { Suspense, useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/store/cart";
import { MenuItem, MenuCategory, Table } from "@/lib/types";
import { CartDrawer } from "@/components/customer/CartDrawer";
import { MenuItemModal } from "@/components/customer/MenuItemModal";
import { COLORS, categoryEmoji, baht } from "@/lib/theme";
import {
  Loader2,
  ShoppingBag,
  AlertCircle,
  Search,
  X,
  Clock,
  MapPin,
  Plus,
  Heart,
  Star,
  ChefHat,
  Check,
} from "lucide-react";

/* ============================================================
   🌅 BOLD TERRACOTTA — Aura Bistro customer menu
   One warm clay family. Images lead. Ordering takes three taps.
============================================================ */

export default function MenuPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MenuContent />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-6"
      style={{ background: COLORS.bg }}
      role="status"
      aria-live="polite"
    >
      <motion.div
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="text-6xl"
        aria-hidden="true"
      >
        🍜
      </motion.div>
      <p className="text-base" style={{ color: COLORS.textMuted }}>
        กำลังโหลดเมนู...
      </p>
    </div>
  );
}

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "bad";
}

function MenuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("table");

  const [table, setTable] = useState<Table | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const setTableInCart = useCart((s) => s.setTable);
  const cartTotal = useCart((s) => s.total());
  const cartItems = useCart((s) => s.items);
  const totalCount = useCart((s) => s.totalItems());
  const clearCart = useCart((s) => s.clear);
  const addItem = useCart((s) => s.addItem);

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const toastId = useRef(0);

  const pushToast = useCallback((message: string, tone: "ok" | "bad" = "ok") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    if (!token) {
      setError("ไม่พบรหัสโต๊ะในลิงก์ กรุณาสแกน QR Code ที่โต๊ะอีกครั้ง");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    (async () => {
      try {
        // The table is resolved on the server: the QR token is what scopes
        // the customer's order to their table, so the browser does not need
        // to read the tables table itself.
        const tableRes = await fetch(
          `/api/customer/table?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const tableData = await tableRes.json().catch(() => ({}));

        if (!tableRes.ok || !tableData.ok) {
          setError("QR Code ไม่ถูกต้องหรือโต๊ะนี้ถูกลบไปแล้ว");
          setLoading(false);
          return;
        }

        const table = tableData.table as Table;
        setTable(table);
        // The token is kept in the cart: it is the customer's proof of being
        // at this table, and the order page needs it to read the order back.
        setTableInCart(table.id, table.table_number, token);

        const [catRes, itemRes] = await Promise.all([
          supabase
            .from("menu_categories")
            .select("*")
            .order("display_order", { ascending: true }),
          supabase
            .from("menu_items")
            .select("*")
            .order("display_order", { ascending: true }),
        ]);

        if (catRes.error) throw catRes.error;
        if (itemRes.error) throw itemRes.error;

        const catData = catRes.data ?? [];
        const itemData = itemRes.data ?? [];

        setCategories(catData);
        setItems(itemData);
        if (catData.length > 0) setActiveCategory(catData[0].id);

        if (catData.length === 0 || itemData.length === 0) {
          setError("ยังไม่มีเมนูในร้านครับ กรุณาติดต่อพนักงานเพื่อเปิดเมนู");
        }
      } catch {
        setError("เกิดข้อผิดพลาดในการโหลดเมนู กรุณาลองใหม่อีกครั้ง");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, setTableInCart]);

  /** Items the customer can actually order right now. */
  const orderableItems = useMemo(() => items.filter((i) => i.is_available), [items]);
  /** Items that are currently sold out — shown, but not orderable. */
  const soldOutItems = useMemo(() => items.filter((i) => !i.is_available), [items]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return orderableItems;
    const q = searchQuery.trim().toLowerCase();
    return orderableItems.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q)
    );
  }, [orderableItems, searchQuery]);

  /** Signature dishes first, then everything else — a real recommendation, not a slice. */
  const featuredItems = useMemo(() => {
    const signatures = orderableItems.filter((i) => i.is_signature);
    const rest = orderableItems.filter((i) => !i.is_signature);
    return [...signatures, ...rest].slice(0, 4);
  }, [orderableItems]);

  const handleCategoryClick = (catId: string) => {
    setActiveCategory(catId);
    const el = categoryRefs.current[catId];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const quickAdd = (item: MenuItem) => {
    if (!item.is_available) {
      pushToast(`${item.name} หมดชั่วคราว`, "bad");
      return;
    }
    addItem({
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url ?? null,
      quantity: 1,
      note: "",
    });
    pushToast(`เพิ่ม ${item.name} แล้ว`, "ok");
  };

  const handleCheckout = async () => {
    if (!table || cartItems.length === 0) return;
    // Guard against a double tap: without this, two rapid taps insert two
    // orders and the customer is charged twice.
    if (submitting) return;
    setSubmitting(true);

    // The order goes through the server. It reads the real prices, checks
    // stock, and calculates the total — the browser never sends a price and
    // never decides what the order costs.
    //
    // The table's QR token identifies the table. The server resolves it to
    // the table id itself, so an order can only ever land on the table the
    // customer is actually sitting at.
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: token,
          items: cartItems.map((i) => ({
            menu_item_id: i.menu_item_id,
            quantity: i.quantity,
            note: i.note || null,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        const message =
          data?.message ||
          (data?.error === "out_of_stock"
            ? "บางเมนูหมดแล้ว กรุณาปรับจำนวน"
            : "สั่งอาหารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        pushToast(message, "bad");
        setSubmitting(false);
        return;
      }

      clearCart();
      router.push(`/order/${data.orderId}`);
    } catch {
      pushToast("สั่งอาหารไม่สำเร็จ กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตแล้วลองใหม่", "bad");
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: COLORS.bg }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm text-center p-8 bg-white rounded-3xl"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <div
            className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: COLORS.dangerLight }}
          >
            <AlertCircle size={26} style={{ color: COLORS.dangerText }} />
          </div>
          <h1
            className="text-2xl font-bold mb-3"
            style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text }}
          >
            เปิดเมนูไม่ได้
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: COLORS.textMuted }}>
            {error}
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => window.location.reload()}
            className="mt-6 btn-primary w-full"
          >
            ลองใหม่อีกครั้ง
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const signatureItem = featuredItems[0];
  const otherFeatured = featuredItems.slice(1, 4);

  return (
    <div className="min-h-screen pb-32 relative" style={{ background: COLORS.bg }}>
      {/* ============ STICKY HEADER — brand, table, cart ============ */}
      <header
        className="sticky top-0 z-30 backdrop-blur-lg"
        style={{ background: "rgba(250, 246, 240, 0.88)", borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p
              className="text-lg font-bold leading-none truncate"
              style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text }}
            >
              Aura Bistro
            </p>
            <p className="text-xs mt-1 truncate" style={{ color: COLORS.textMuted }}>
              โต๊ะ {table?.table_number} • Thai Garden Kitchen
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setCartOpen(true)}
            className="relative w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: COLORS.surface,
              boxShadow: "var(--shadow-sm)",
              border: `1px solid ${COLORS.border}`,
            }}
            aria-label={`เปิดตะกร้า มี ${totalCount} รายการ`}
          >
            <ShoppingBag size={19} style={{ color: COLORS.text }} />
            {totalCount > 0 && (
              <motion.span
                key={totalCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[22px] h-6 px-1.5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                style={{
                  background: COLORS.primary,
                  boxShadow: "0 4px 12px -2px rgba(168, 72, 42, 0.5)",
                }}
                aria-hidden="true"
              >
                {totalCount}
              </motion.span>
            )}
          </motion.button>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative pt-8 pb-6 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Table + status */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 mb-6"
          >
            <span
              className="px-3.5 py-1.5 rounded-full text-sm font-bold flex items-center gap-2"
              style={{ background: COLORS.primaryLight, color: COLORS.primaryDark }}
            >
              โต๊ะ {table?.table_number}
            </span>
            {soldOutItems.length > 0 && (
              <span
                className="px-3.5 py-1.5 rounded-full text-sm font-medium"
                style={{ background: COLORS.surface2, color: COLORS.textMuted }}
              >
                หมด {soldOutItems.length} เมนูวันนี้
              </span>
            )}
          </motion.div>

          {/* Wordmark — one expression, not three */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mb-7"
          >
            <h1
              className="text-5xl md:text-6xl leading-none"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontStyle: "italic",
                color: COLORS.primaryText,
              }}
            >
              Aura Bistro
            </h1>
            <p className="text-base mt-2" style={{ color: COLORS.textMuted }}>
              ออร่า บิสโทร • Thai Garden Kitchen
            </p>
          </motion.div>

          {/* Facts that matter to a customer deciding to order */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="flex items-center gap-2 flex-wrap mb-8"
          >
            <span
              className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
              style={{
                background: COLORS.surface,
                color: COLORS.textMuted,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <Clock size={12} /> ใช้เวลา 15-25 นาที
            </span>
            <span
              className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
              style={{ background: COLORS.primary, color: COLORS.onPrimary }}
            >
              <MapPin size={12} /> ส่งถึงโต๊ะ
            </span>
          </motion.div>

          {/* Signature dish hero — one dish, chosen by the kitchen */}
          {signatureItem && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              onClick={() => setSelectedItem(signatureItem)}
              className="relative block w-full h-60 sm:h-72 rounded-3xl overflow-hidden mb-8 text-left"
              style={{ boxShadow: "var(--shadow-lg)" }}
              aria-label={`ดูรายละเอียด ${signatureItem.name}`}
            >
              {signatureItem.image_url ? (
                <img
                  src={signatureItem.image_url}
                  alt={signatureItem.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-9xl"
                  style={{ background: `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.accentLight} 100%)` }}
                  aria-hidden="true"
                >
                  {categoryEmoji(signatureItem.name)}
                </div>
              )}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(36,30,25,0.78) 0%, transparent 60%)" }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mb-2"
                  style={{ background: COLORS.onPrimary, color: COLORS.primaryDark }}
                >
                  <Star size={11} className="fill-current" /> เมนูแนะนำ
                </span>
                <h2
                  className="text-2xl sm:text-3xl font-bold"
                  style={{ fontFamily: "'Playfair Display', serif", color: "#FFFFFF" }}
                >
                  {signatureItem.name}
                </h2>
                {signatureItem.description && (
                  <p className="text-sm mt-1 line-clamp-2" style={{ color: "rgba(255,255,255,0.88)" }}>
                    {signatureItem.description}
                  </p>
                )}
              </div>
            </motion.button>
          )}
        </div>
      </section>

      {/* ============ SEARCH ============ */}
      <div className="px-4 mb-5">
        <div className="max-w-3xl mx-auto">
          <label htmlFor="menu-search" className="sr-only">
            ค้นหาเมนู
          </label>
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: COLORS.textSoft }}
            />
            <input
              id="menu-search"
              type="search"
              placeholder="ค้นหาเมนู เช่น ก๋วยเตี๋ยว ข้าวผัด"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 bg-white rounded-full outline-none text-base"
              style={{
                color: COLORS.text,
                boxShadow: "var(--shadow-sm)",
                border: `1px solid ${COLORS.border}`,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: COLORS.surface2, color: COLORS.textMuted }}
                aria-label="ล้างคำค้นหา"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============ CATEGORY PILLS ============ */}
      {categories.length > 0 && !searchQuery && (
        <div
          className="sticky top-16 z-20 backdrop-blur-lg mb-6"
          style={{ background: "rgba(250, 246, 240, 0.9)", borderBottom: `1px solid ${COLORS.border}` }}
        >
          <div className="max-w-3xl mx-auto px-4 py-3 overflow-x-auto scroll-hint">
            <div className="flex gap-2 w-max">
              {categories.map((cat) => {
                const count = orderableItems.filter((i) => i.category_id === cat.id).length;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    aria-pressed={isActive}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors"
                    style={
                      isActive
                        ? {
                            background: COLORS.primary,
                            color: COLORS.onPrimary,
                            boxShadow: "0 4px 12px -4px rgba(168, 72, 42, 0.5)",
                          }
                        : {
                            background: COLORS.surface,
                            color: COLORS.textMuted,
                            border: `1px solid ${COLORS.border}`,
                          }
                    }
                  >
                    <span aria-hidden="true">{categoryEmoji(cat.name)}</span>
                    <span>{cat.name}</span>
                    <span
                      className="text-xs tabular-nums"
                      style={{ opacity: isActive ? 0.8 : 0.6 }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============ MAIN CONTENT ============ */}
      <main className="max-w-3xl mx-auto px-4 pb-8">
        {searchQuery ? (
          <SearchResults
            query={searchQuery}
            items={filteredItems}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            onAdd={quickAdd}
            onItemClick={setSelectedItem}
            onClear={() => setSearchQuery("")}
          />
        ) : (
          <div className="space-y-10">
            {/* Other recommendations — horizontal, so they cost one row not three */}
            {otherFeatured.length > 0 && (
              <section>
                <div className="flex items-baseline justify-between mb-4">
                  <h2
                    className="text-2xl font-bold"
                    style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text }}
                  >
                    ลองชิมอีก
                  </h2>
                  <span className="text-xs" style={{ color: COLORS.textSoft }}>
                    เลื่อนดูเพิ่ม
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scroll-hint -mx-4 px-4">
                  {otherFeatured.map((item) => (
                    <FeaturedCard
                      key={item.id}
                      item={item}
                      isFav={favorites.has(item.id)}
                      onFav={() => toggleFavorite(item.id)}
                      onAdd={() => quickAdd(item)}
                      onItemClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All categories */}
            {categories.map((cat, catIdx) => {
              const catItems = orderableItems.filter((i) => i.category_id === cat.id);
              const catSoldOut = soldOutItems.filter((i) => i.category_id === cat.id);
              if (catItems.length === 0 && catSoldOut.length === 0) return null;
              return (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  items={catItems}
                  soldOut={catSoldOut}
                  catIdx={catIdx}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  onAdd={quickAdd}
                  onItemClick={setSelectedItem}
                  onMount={(el) => (categoryRefs.current[cat.id] = el)}
                />
              );
            })}

            {/* Everything is sold out */}
            {orderableItems.length === 0 && soldOutItems.length > 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🍽️</div>
                <p
                  className="text-xl font-bold mb-2"
                  style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text }}
                >
                  เมนูหมดทั้งหมดชั่วคราว
                </p>
                <p className="text-sm" style={{ color: COLORS.textMuted }}>
                  กรุณาสั่งเมนูอื่นระหว่างร้านเตรียมของใหม่
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============ FLOATING CART BAR ============ */}
      <AnimatePresence>
        {totalCount > 0 && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-20 safe-bottom"
          >
            <div className="max-w-3xl mx-auto p-4">
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCartOpen(true)}
                className="w-full rounded-full p-2 flex items-center justify-between text-white min-h-[60px]"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                  boxShadow: "0 20px 40px -8px rgba(168, 72, 42, 0.5)",
                }}
                aria-label={`เปิดตะกร้า มี ${totalCount} รายการ รวม ${baht(cartTotal)} บาท`}
              >
                <div className="flex items-center gap-3 pl-2.5">
                  <div className="relative">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.2)" }}
                    >
                      <ShoppingBag size={20} />
                    </div>
                    <span
                      className="absolute -top-1 -right-1 min-w-[22px] h-6 px-1.5 rounded-full text-sm font-bold flex items-center justify-center"
                      style={{ background: COLORS.onPrimary, color: COLORS.primaryDark }}
                      aria-hidden="true"
                    >
                      {totalCount}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-xs opacity-90">ตะกร้าของคุณ</p>
                    <p className="text-lg font-bold leading-tight">
                      ฿{baht(cartTotal)} • {totalCount} รายการ
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm mr-1"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                >
                  <span>ดูตะกร้า</span>
                  <span aria-hidden="true">→</span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ TOASTS ============ */}
      <div
        className="fixed bottom-28 left-0 right-0 z-40 flex flex-col items-center gap-2 px-4 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className="px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-2 max-w-sm"
              style={{
                background: t.tone === "ok" ? COLORS.text : COLORS.danger,
                color: "#FFFFFF",
                boxShadow: "var(--shadow-md)",
              }}
            >
              {t.tone === "ok" ? <Check size={16} /> : <AlertCircle size={16} />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onCheckout={handleCheckout} />

      <MenuItemModal
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        isFav={selectedItem ? favorites.has(selectedItem.id) : false}
        onToggleFav={() => selectedItem && toggleFavorite(selectedItem.id)}
        onAdd={(item, qty, note) => {
          addItem({
            menu_item_id: item.id,
            name: item.name,
            price: item.price,
            image_url: item.image_url ?? null,
            quantity: qty,
            note,
          });
          pushToast(`เพิ่ม ${item.name} ×${qty} แล้ว`, "ok");
        }}
      />

      {submitting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(36, 30, 25, 0.6)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-10 flex flex-col items-center gap-4 mx-4"
            style={{ boxShadow: "var(--shadow-lg)" }}
            role="status"
            aria-live="polite"
          >
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-5xl"
              aria-hidden="true"
            >
              🍳
            </motion.div>
            <p
              className="text-xl font-bold"
              style={{ fontFamily: "'Playfair Display', serif", color: COLORS.primaryText }}
            >
              กำลังส่งออร์เดอร์...
            </p>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              กรุณารอสักครู่ ไม่ต้องปิดหน้านี้
            </p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

/* ============================================================
   SUB-COMPONENTS
============================================================ */

function FeaturedCard({
  item,
  isFav,
  onFav,
  onAdd,
  onItemClick,
}: {
  item: MenuItem;
  isFav: boolean;
  onFav: () => void;
  onAdd: () => void;
  onItemClick: () => void;
}) {
  return (
    // Not a <button>: it contains a favourite button and an add button, and a
    // button inside a button is invalid HTML that breaks keyboard activation.
    <div
      className="w-[240px] shrink-0 bg-white rounded-3xl overflow-hidden text-left"
      style={{
        boxShadow: "var(--shadow-sm)",
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div className="relative h-32 overflow-hidden">
        <button
          onClick={onItemClick}
          className="block w-full h-full"
          aria-label={`ดูรายละเอียด ${item.name}`}
        >
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-5xl"
              style={{ background: `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.accentLight} 100%)` }}
              aria-hidden="true"
            >
              {categoryEmoji(item.name)}
            </div>
          )}
        </button>
        <button
          onClick={onFav}
          className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.92)" }}
          aria-label={isFav ? `เอาออกจากรายการโปรด ${item.name}` : `เพิ่ม ${item.name} ในรายการโปรด`}
          aria-pressed={isFav}
        >
          <Heart
            size={16}
            className={isFav ? "fill-current" : ""}
            style={{ color: isFav ? COLORS.primaryText : COLORS.textSoft }}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="p-4">
        <button onClick={onItemClick} className="block w-full text-left">
          <h3
            className="font-bold text-base leading-tight mb-1 line-clamp-2"
            style={{ color: COLORS.text, fontFamily: "'Playfair Display', serif" }}
          >
            {item.name}
          </h3>
        </button>
        <div className="flex items-center justify-between mt-3">
          <p className="text-lg font-bold" style={{ color: COLORS.primaryText }}>
            ฿{baht(item.price)}
          </p>
          <button
            onClick={onAdd}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white"
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
              boxShadow: "0 4px 12px -2px rgba(168, 72, 42, 0.4)",
            }}
            aria-label={`เพิ่ม ${item.name} ลงตะกร้า`}
          >
            <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CategorySection({
  category,
  items,
  soldOut,
  catIdx,
  favorites,
  toggleFavorite,
  onAdd,
  onItemClick,
  onMount,
}: {
  category: MenuCategory;
  items: MenuItem[];
  soldOut: MenuItem[];
  catIdx: number;
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  onAdd: (item: MenuItem) => void;
  onItemClick: (item: MenuItem) => void;
  onMount: (el: HTMLElement | null) => void;
}) {
  return (
    <motion.section
      ref={onMount}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: catIdx * 0.05 }}
    >
      <div
        className="flex items-center gap-3 mb-4 pb-3 border-b"
        style={{ borderColor: COLORS.border }}
      >
        <span className="text-3xl" aria-hidden="true">
          {categoryEmoji(category.name)}
        </span>
        <div className="flex-1">
          <h2
            className="text-xl leading-tight"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: COLORS.text }}
          >
            {category.name}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: COLORS.textSoft }}>
            {items.length} เมนู
            {soldOut.length > 0 && ` · หมด ${soldOut.length}`}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <ListItem
            key={item.id}
            item={item}
            isFav={favorites.has(item.id)}
            onFav={() => toggleFavorite(item.id)}
            onAdd={() => onAdd(item)}
            onItemClick={() => onItemClick(item)}
          />
        ))}

        {/* Sold out — visible so the customer knows it exists, clearly not orderable */}
        {soldOut.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl p-4 flex gap-4 items-center opacity-70"
            style={{
              background: COLORS.surface2,
              border: `1px dashed ${COLORS.borderStrong}`,
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center text-3xl grayscale"
              style={{ background: COLORS.surface3 }}
              aria-hidden="true"
            >
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-full h-full object-cover grayscale" />
              ) : (
                categoryEmoji(item.name)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight" style={{ color: COLORS.textMuted }}>
                {item.name}
              </h3>
              <p className="text-xs mt-1" style={{ color: COLORS.textSoft }}>
                หมดชั่วคราว
                {item.unavailable_reason?.trim() ? ` — ${item.unavailable_reason.trim()}` : ""}
              </p>
            </div>
            <span
              className="px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
              style={{ background: COLORS.dangerLight, color: COLORS.dangerText }}
            >
              หมด
            </span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function ListItem({
  item,
  isFav,
  onFav,
  onAdd,
  onItemClick,
}: {
  item: MenuItem;
  isFav: boolean;
  onFav: () => void;
  onAdd: () => void;
  onItemClick: () => void;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-3.5 flex gap-3.5 items-center"
      style={{ boxShadow: "var(--shadow-sm)", border: `1px solid ${COLORS.border}` }}
    >
      {/* The dish image opens the details — a real button, keyboard reachable */}
      <button
        onClick={onItemClick}
        className="relative w-[72px] h-[72px] rounded-2xl overflow-hidden shrink-0"
        aria-label={`ดูรายละเอียด ${item.name}`}
      >
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl"
            style={{ background: `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.accentLight} 100%)` }}
            aria-hidden="true"
          >
            {categoryEmoji(item.name)}
          </div>
        )}
      </button>

      {/* Name and price open the details */}
      <button onClick={onItemClick} className="flex-1 min-w-0 text-left">
        <h3 className="font-bold text-base leading-tight" style={{ color: COLORS.text }}>
          {item.name}
        </h3>
        {item.description && (
          <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: COLORS.textMuted }}>
            {item.description}
          </p>
        )}
        <p className="text-lg font-bold mt-1.5" style={{ color: COLORS.primaryText }}>
          ฿{baht(item.price)}
        </p>
      </button>

      {/* Actions */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <button
          onClick={onFav}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          aria-label={isFav ? `เอาออกจากรายการโปรด ${item.name}` : `เพิ่ม ${item.name} ในรายการโปรด`}
          aria-pressed={isFav}
        >
          <Heart
            size={18}
            className={isFav ? "fill-current" : ""}
            style={{ color: isFav ? COLORS.primaryText : COLORS.textSoft }}
          />
        </button>
        <button
          onClick={onAdd}
          className="h-10 px-4 rounded-full text-white text-sm font-semibold flex items-center gap-1.5 min-w-[76px] justify-center"
          style={{
            background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
            boxShadow: "0 4px 12px -2px rgba(168, 72, 42, 0.4)",
          }}
          aria-label={`เพิ่ม ${item.name} ลงตะกร้า`}
        >
          <Plus size={14} strokeWidth={3} aria-hidden="true" />
          เพิ่ม
        </button>
      </div>
    </div>
  );
}

function SearchResults({
  query,
  items,
  favorites,
  toggleFavorite,
  onAdd,
  onItemClick,
  onClear,
}: {
  query: string;
  items: MenuItem[];
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  onAdd: (item: MenuItem) => void;
  onItemClick: (item: MenuItem) => void;
  onClear: () => void;
}) {
  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
        <div className="text-5xl mb-4" aria-hidden="true">
          🍽️
        </div>
        <p
          className="text-xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text }}
        >
          ไม่พบ “{query}”
        </p>
        <p className="text-sm mb-6" style={{ color: COLORS.textMuted }}>
          ลองค้นหาด้วยชื่อเมนู เช่น “ก๋วยเตี๋ยว” หรือ “ข้าวผัด”
        </p>
        <button onClick={onClear} className="btn-secondary">
          ดูเมนูทั้งหมด
        </button>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <p className="text-sm mb-4" style={{ color: COLORS.textMuted }}>
        พบ <span className="font-bold" style={{ color: COLORS.primaryText }}>{items.length}</span>{" "}
        รายการสำหรับ “{query}”
      </p>
      <div className="space-y-2.5">
        {items.map((item) => (
          <ListItem
            key={item.id}
            item={item}
            isFav={favorites.has(item.id)}
            onFav={() => toggleFavorite(item.id)}
            onAdd={() => onAdd(item)}
            onItemClick={() => onItemClick(item)}
          />
        ))}
      </div>
    </motion.div>
  );
}
