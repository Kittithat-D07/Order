"use client";

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/store/cart";
import { MenuItem, MenuCategory, Table } from "@/lib/types";
import { CartDrawer } from "@/components/customer/CartDrawer";
import {
  Leaf,
  Loader2,
  ShoppingBag,
  AlertCircle,
  Search,
  Sparkles,
  Clock,
  MapPin,
  Plus,
  Heart,
  X,
  Star,
  ChefHat,
} from "lucide-react";

/* ============================================================
   🌅 ORGANIC WARM - Aura Bistro Garden Restaurant
============================================================ */

const COLORS = {
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
  text: "#2C2620",
  textMuted: "#6B5F54",
};

const FOOD_EMOJIS = ["🍜", "🍲", "🥗", "🍛", "🥘", "🍝", "🍱", "🌶️", "🥢", "🍤"];

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
      className="min-h-screen flex flex-col items-center justify-center gap-5"
      style={{ background: COLORS.bg }}
    >
      <motion.div
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="text-7xl"
      >
        🌿
      </motion.div>
      <div className="text-center">
        <p className="text-2xl text-sunset font-display" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
          Aura Bistro
        </p>
        <p className="text-base text-stone-600 mt-2">กำลังเตรียมอาหารให้คุณ...</p>
      </div>
    </div>
  );
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
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const setTableInCart = useCart((s) => s.setTable);
  const cartTotal = useCart((s) => s.total());
  const cartItems = useCart((s) => s.items);
  const totalCount = useCart((s) => s.totalItems());
  const clearCart = useCart((s) => s.clear);
  const addItem = useCart((s) => s.addItem);

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!token) {
      setError("ไม่พบรหัสโต๊ะในลิงก์ กรุณาสแกน QR Code ที่โต๊ะอีกครั้ง");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    (async () => {
      try {
        const { data: tableData, error: tableErr } = await supabase
          .from("tables").select("*").eq("qr_token", token).single();
        if (tableErr || !tableData) {
          setError("QR Code ไม่ถูกต้องหรือโต๊ะนี้ถูกลบไปแล้ว");
          setLoading(false);
          return;
        }
        setTable(tableData);
        setTableInCart(tableData.id, tableData.table_number);

        const { data: catData } = await supabase
          .from("menu_categories").select("*").order("display_order", { ascending: true });
        const { data: itemData } = await supabase
          .from("menu_items").select("*").order("display_order", { ascending: true });

        setCategories(catData ?? []);
        setItems(itemData ?? []);
        if (catData && catData.length > 0) setActiveCategory(catData[0].id);
      } catch (e) {
        setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, setTableInCart]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const featuredItems = useMemo(() => items.slice(0, 4), [items]);

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
    addItem({
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url ?? null,
      quantity: 1,
      note: "",
    });
  };

  const handleCheckout = async () => {
    if (!table || cartItems.length === 0) return;
    setSubmitting(true);
    const supabase = createClient();
    const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const { data: lastOrder } = await supabase
      .from("orders")
      .select("id, paid_at, session_number, status")
      .eq("table_id", table.id)
      .order("session_number", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastOrder && !lastOrder.paid_at && lastOrder.status !== "cancelled") {
      const ok = confirm(
        `โต๊ะนี้มีออร์เดอร์ค้างอยู่ (รอบที่ ${lastOrder.session_number})\n\n` +
        `กด "ตกลง" เพื่อเพิ่มรายการเข้าออร์เดอร์เดิม\n` +
        `กด "ยกเลิก" เพื่อยกเลิกออร์เดอร์เก่าแล้วเริ่มใหม่`
      );
      if (ok) {
        const orderItemsRows = cartItems.map((i) => ({
          order_id: lastOrder.id,
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          unit_price: i.price,
          note: i.note || null,
          subtotal: i.price * i.quantity,
        }));
        const { error: itemsErr } = await supabase
          .from("order_items")
          .insert(orderItemsRows);
        if (itemsErr) {
          alert("เพิ่มรายการไม่สำเร็จ: " + itemsErr.message);
          setSubmitting(false);
          return;
        }
        await supabase
          .from("orders")
          .update({
            total_amount: total + (await getOrderTotal(supabase, lastOrder.id)),
          })
          .eq("id", lastOrder.id);
        clearCart();
        router.push(`/order/${lastOrder.id}`);
        return;
      } else {
        await supabase
          .from("orders")
          .update({ status: "cancelled", paid_at: new Date().toISOString() })
          .eq("id", lastOrder.id);
      }
    }

    const nextSession = (lastOrder?.session_number ?? 0) + 1;
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        table_id: table.id,
        status: "pending",
        total_amount: total,
        session_number: nextSession,
      })
      .select()
      .single();

    if (orderErr || !order) {
      alert("สั่งอาหารไม่สำเร็จ: " + (orderErr?.message ?? ""));
      setSubmitting(false);
      return;
    }

    const orderItemsRows = cartItems.map((i) => ({
      order_id: order.id,
      menu_item_id: i.menu_item_id,
      quantity: i.quantity,
      unit_price: i.price,
      note: i.note || null,
      subtotal: i.price * i.quantity,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(orderItemsRows);
    if (itemsErr) {
      alert("สั่งอาหารไม่สำเร็จ: " + itemsErr.message);
      setSubmitting(false);
      return;
    }

    clearCart();
    router.push(`/order/${order.id}`);
  };

  const getOrderTotal = async (
    supabase: ReturnType<typeof createClient>,
    orderId: string
  ): Promise<number> => {
    const { data } = await supabase
      .from("order_items")
      .select("subtotal")
      .eq("order_id", orderId);
    return (data ?? []).reduce((s, i) => s + Number(i.subtotal), 0);
  };

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: COLORS.bg }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm text-center p-8 bg-white rounded-3xl"
          style={{ boxShadow: "0 20px 60px -10px rgba(139, 63, 26, 0.2)" }}
        >
          <div className="text-6xl mb-4 animate-sway">🌿</div>
          <p className="text-2xl text-sunset font-bold mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            เกิดข้อผิดพลาด
          </p>
          <p className="text-stone-600 text-sm leading-relaxed">{error}</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="mt-6 btn-primary"
          >
            ลองใหม่อีกครั้ง
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 relative" style={{ background: COLORS.bg }}>
      {/* Decorative leaves - floating in background */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="leaf-deco text-7xl"
        style={{ top: "120px", right: "20px", color: COLORS.secondary, opacity: 0.15 }}
      >
        🌿
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0], rotate: [3, -3, 3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="leaf-deco text-6xl"
        style={{ top: "300px", left: "15px", color: COLORS.accent, opacity: 0.12 }}
      >
        🍃
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="leaf-deco text-5xl"
        style={{ top: "500px", right: "30px", color: COLORS.primary, opacity: 0.1 }}
      >
        🌶️
      </motion.div>

      {/* ============ HERO - Magazine Cover Style ============ */}
      <section className="relative pt-6 pb-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Top Bar - Status & Cart */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full"
                style={{ background: COLORS.success }}
              />
              <span className="text-xs text-stone-500 font-medium">เปิดให้บริการ</span>
            </div>
            
            <motion.button
              whileTap={{ scale: 0.9, rotate: 10 }}
              onClick={() => setCartOpen(true)}
              className="relative w-12 h-12 rounded-full flex items-center justify-center transition-shadow"
              style={{ 
                background: COLORS.surface,
                boxShadow: "0 6px 20px -4px rgba(139, 63, 26, 0.2)"
              }}
            >
              <ShoppingBag size={20} style={{ color: COLORS.text }} />
              {totalCount > 0 && (
                <motion.span
                  key={totalCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 min-w-[22px] h-6 px-2 rounded-full text-white text-xs font-bold flex items-center justify-center"
                  style={{ 
                    background: COLORS.primary,
                    boxShadow: "0 4px 12px -2px rgba(184, 92, 56, 0.4)"
                  }}
                >
                  {totalCount}
                </motion.span>
              )}
            </motion.button>
          </motion.div>

          {/* Title - Magazine Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500 font-semibold mb-3" style={{ fontFamily: "var(--font-body)" }}>
              ✨ Welcome to
            </p>
            <h1
              className="text-6xl md:text-7xl text-sunset leading-none mb-2"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontStyle: "italic" }}
            >
              Aura
            </h1>
            <h2
              className="text-3xl md:text-4xl text-stone-800 leading-none mb-3"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
            >
              BISTRO
            </h2>
            <p className="text-sm text-stone-500" style={{ fontFamily: "var(--font-body)" }}>
              🌿 ออร่า บิสโทร • Thai Garden Kitchen
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full" style={{ background: COLORS.primaryLight }}>
              <span className="text-sm" style={{ color: COLORS.primaryDark, fontWeight: 600 }}>
                โต๊ะ {table?.table_number}
              </span>
            </div>
          </motion.div>

          {/* Quick Info Pills - Hand-stamped style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-2 flex-wrap mb-8"
          >
            <PillStamp icon={<Star size={12} className="fill-current" />} text="4.9 / 5" />
            <PillStamp icon={<Clock size={12} />} text="20-30 นาที" />
            <PillStamp icon={<MapPin size={12} />} text="ส่งฟรี" highlight />
          </motion.div>

          {/* Featured Hero Image - Magazine style */}
          {featuredItems[0] && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative h-72 rounded-3xl overflow-hidden mb-8"
              style={{ 
                boxShadow: "0 30px 60px -15px rgba(139, 63, 26, 0.3)",
                transform: "rotate(-1deg)"
              }}
            >
              {featuredItems[0].image_url ? (
                <img
                  src={featuredItems[0].image_url}
                  alt={featuredItems[0].name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-9xl"
                  style={{ background: `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.secondaryLight} 100%)` }}
                >
                  🍜
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Steam effect */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [-10, -30], opacity: [0, 0.6, 0] }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      delay: i * 0.5,
                      ease: "easeOut"
                    }}
                    className="text-2xl"
                  >
                    💨
                  </motion.div>
                ))}
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <p className="text-xs uppercase tracking-wider opacity-80 font-semibold mb-1">เมนูแนะนำ</p>
                <h3 className="text-3xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {featuredItems[0].name}
                </h3>
                <p className="text-sm opacity-90">{featuredItems[0].description || 'ความอร่อยที่คุณต้องลอง'}</p>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ============ SEARCH BAR ============ */}
      <div className="px-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <div className="relative">
            <Search
              size={18}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="🌿 ค้นหาเมนู..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-12 py-4 bg-white rounded-full outline-none text-base"
              style={{ 
                color: COLORS.text,
                boxShadow: "0 8px 24px -4px rgba(139, 63, 26, 0.08)",
                border: "1px solid rgba(232, 223, 208, 0.5)"
              }}
            />
            {searchQuery && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: COLORS.bg }}
              >
                <X size={14} />
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      {/* ============ CATEGORY PILLS ============ */}
      {categories.length > 0 && !searchQuery && (
        <div className="sticky top-0 z-20 backdrop-blur-md mb-6" style={{ background: "rgba(250, 246, 240, 0.85)" }}>
          <div className="max-w-3xl mx-auto px-4 py-3 overflow-x-auto no-scrollbar">
            <div className="flex gap-2">
              {categories.map((cat, idx) => {
                const itemCount = items.filter((i) => i.category_id === cat.id).length;
                if (itemCount === 0) return null;
                const isActive = activeCategory === cat.id;
                return (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * idx }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCategoryClick(cat.id)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all"
                    style={isActive ? {
                      background: COLORS.primary,
                      color: "white",
                      boxShadow: "0 4px 12px -2px rgba(184, 92, 56, 0.4)"
                    } : {
                      background: "white",
                      color: COLORS.textMuted,
                      border: `1px solid ${COLORS.border}`
                    }}
                  >
                    <span className="text-base">{getCategoryEmoji(cat.name)}</span>
                    <span>{cat.name}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============ MAIN CONTENT ============ */}
      <main className="max-w-3xl mx-auto px-4 pb-8">
        <AnimatePresence mode="popLayout">
          {searchQuery ? (
            <SearchResults
              key="search"
              query={searchQuery}
              items={filteredItems}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              onAdd={quickAdd}
            />
          ) : (
            <div className="space-y-10">
              {/* FEATURED ITEMS */}
              {featuredItems.length > 1 && (
                <FeaturedSection
                  items={featuredItems.slice(1, 4)}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  onAdd={quickAdd}
                />
              )}

              {/* ALL CATEGORIES */}
              {categories.map((cat, catIdx) => {
                const catItems = items.filter((i) => i.category_id === cat.id);
                if (catItems.length === 0) return null;
                return (
                  <CategorySection
                    key={cat.id}
                    category={cat}
                    items={catItems}
                    catIdx={catIdx}
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                    onAdd={quickAdd}
                    onMount={(el) => (categoryRefs.current[cat.id] = el)}
                  />
                );
              })}
            </div>
          )}
        </AnimatePresence>
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
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCartOpen(true)}
                className="w-full rounded-full p-2 flex items-center justify-between text-white"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                  boxShadow: "0 20px 40px -8px rgba(184, 92, 56, 0.5)"
                }}
              >
                <div className="flex items-center gap-3 pl-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <ShoppingBag size={22} />
                    </div>
                    <motion.span
                      key={totalCount}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 min-w-[22px] h-6 px-2 rounded-full bg-white text-sm font-bold flex items-center justify-center"
                      style={{ color: COLORS.primary }}
                    >
                      {totalCount}
                    </motion.span>
                  </div>
                  <div className="text-left pr-2">
                    <p className="text-xs opacity-90">ตะกร้าของคุณ</p>
                    <p className="text-lg font-bold leading-tight">
                      ฿{cartTotal.toLocaleString()} • {totalCount} รายการ
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full font-semibold text-sm mr-1">
                  <span>ดูตะกร้า</span>
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.div>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onCheckout={handleCheckout} />

      {submitting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-10 flex flex-col items-center gap-4"
            style={{ boxShadow: "0 30px 80px -20px rgba(0,0,0,0.3)" }}
          >
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-6xl"
            >
              🍳
            </motion.div>
            <p className="text-2xl text-sunset font-bold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              กำลังส่งออร์เดอร์...
            </p>
            <p className="text-sm text-stone-500">กรุณารอสักครู่</p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

/* ============================================================
   SUB-COMPONENTS
============================================================ */

function PillStamp({
  icon,
  text,
  highlight = false,
}: {
  icon: React.ReactNode;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
      style={
        highlight
          ? { background: COLORS.accent, color: "white" }
          : { background: "white", color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }
      }
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}

function FeaturedSection({
  items,
  favorites,
  toggleFavorite,
  onAdd,
}: {
  items: MenuItem[];
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  onAdd: (item: MenuItem) => void;
}) {
  return (
    <section>
      <div className="flex items-end justify-between mb-5">
        <div>
          <p
            className="text-xs uppercase tracking-[0.2em] font-bold mb-1"
            style={{ color: COLORS.accent }}
          >
            ✨ Chef's Selection
          </p>
          <h2
            className="text-3xl text-sunset"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
          >
            เมนูแนะนำ
          </h2>
        </div>
        <div className="text-3xl animate-sway">🌿</div>
      </div>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <FeaturedCard
            key={item.id}
            item={item}
            idx={idx}
            isFav={favorites.has(item.id)}
            onFav={() => toggleFavorite(item.id)}
            onAdd={() => onAdd(item)}
          />
        ))}
      </div>
    </section>
  );
}

function FeaturedCard({
  item,
  idx,
  isFav,
  onFav,
  onAdd,
}: {
  item: MenuItem;
  idx: number;
  isFav: boolean;
  onFav: () => void;
  onAdd: () => void;
}) {
  const gradients = [
    `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.secondaryLight} 100%)`,
    `linear-gradient(135deg, ${COLORS.accentLight} 0%, ${COLORS.primaryLight} 100%)`,
    `linear-gradient(135deg, ${COLORS.secondaryLight} 0%, ${COLORS.accentLight} 100%)`,
  ];
  const gradient = gradients[idx % gradients.length];
  const emoji = FOOD_EMOJIS[idx % FOOD_EMOJIS.length];
  const rotations = ["-0.5deg", "0.5deg", "-1deg"];
  const rotation = rotations[idx % rotations.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
      whileHover={{ y: -4, rotate: 0 }}
      className="flex gap-4 p-4 bg-white rounded-3xl cursor-pointer"
      style={{ 
        boxShadow: "0 8px 24px -4px rgba(139, 63, 26, 0.1)",
        transform: `rotate(${rotation})`,
        border: "1px solid rgba(232, 223, 208, 0.5)"
      }}
    >
      {/* Image */}
      <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-5xl"
            style={{ background: gradient }}
          >
            {emoji}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-lg leading-tight" style={{ color: COLORS.text, fontFamily: "'Playfair Display', serif" }}>
            {item.name}
          </h3>
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={onFav}
            className="w-7 h-7 flex items-center justify-center rounded-full shrink-0"
          >
            <Heart size={16} className={isFav ? "fill-current" : ""} style={{ color: isFav ? COLORS.primary : "#D4CFC8" }} />
          </motion.button>
        </div>
        {item.description && (
          <p className="text-sm text-stone-500 mb-2 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto">
          <p
            className="text-xl font-bold text-sunset"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            ฿{Number(item.price).toLocaleString()}
          </p>
          <motion.button
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.05 }}
            onClick={onAdd}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white"
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
              boxShadow: "0 4px 12px -2px rgba(184, 92, 56, 0.4)"
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function CategorySection({
  category,
  items,
  catIdx,
  favorites,
  toggleFavorite,
  onAdd,
  onMount,
}: {
  category: MenuCategory;
  items: MenuItem[];
  catIdx: number;
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  onAdd: (item: MenuItem) => void;
  onMount: (el: HTMLElement | null) => void;
}) {
  return (
    <motion.section
      ref={onMount}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: catIdx * 0.05 }}
    >
      <div className="flex items-baseline gap-3 mb-5 pb-3 border-b" style={{ borderColor: COLORS.border }}>
        <span className="text-4xl">{getCategoryEmoji(category.name)}</span>
        <div className="flex-1">
          <h2
            className="text-2xl"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: COLORS.text }}
          >
            {category.name}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">{items.length} เมนู</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {items.map((item, idx) => (
          <ListItem
            key={item.id}
            item={item}
            idx={idx}
            isFav={favorites.has(item.id)}
            onFav={() => toggleFavorite(item.id)}
            onAdd={() => onAdd(item)}
          />
        ))}
      </div>
    </motion.section>
  );
}

function ListItem({
  item,
  idx,
  isFav,
  onFav,
  onAdd,
}: {
  item: MenuItem;
  idx: number;
  isFav: boolean;
  onFav: () => void;
  onAdd: () => void;
}) {
  const gradients = [
    `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.secondaryLight} 100%)`,
    `linear-gradient(135deg, ${COLORS.accentLight} 0%, ${COLORS.primaryLight} 100%)`,
    `linear-gradient(135deg, ${COLORS.secondaryLight} 0%, ${COLORS.accentLight} 100%)`,
    `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.accentLight} 100%)`,
  ];
  const gradient = gradients[idx % gradients.length];
  const emoji = FOOD_EMOJIS[(idx + 3) % FOOD_EMOJIS.length];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
      whileHover={{ x: 4 }}
      className="bg-white rounded-2xl p-4 flex gap-4 cursor-pointer"
      style={{ 
        boxShadow: "0 4px 12px -2px rgba(139, 63, 26, 0.08)",
        border: "1px solid rgba(232, 223, 208, 0.5)"
      }}
    >
      {/* Food Image */}
      <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: gradient }}
          >
            {emoji}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="font-bold text-base leading-tight" style={{ color: COLORS.text }}>
          {item.name}
        </h3>
        {item.description && (
          <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mt-auto pt-2">
          <p
            className="text-lg font-bold"
            style={{ color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}
          >
            ฿{Number(item.price).toLocaleString()}
          </p>
          <motion.button
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.05 }}
            onClick={onAdd}
            className="px-4 py-2 rounded-full text-white text-sm font-semibold flex items-center gap-1.5"
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
              boxShadow: "0 4px 12px -2px rgba(184, 92, 56, 0.4)"
            }}
          >
            <Plus size={14} strokeWidth={3} />
            เพิ่ม
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function SearchResults({
  query,
  items,
  favorites,
  toggleFavorite,
  onAdd,
}: {
  query: string;
  items: MenuItem[];
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  onAdd: (item: MenuItem) => void;
}) {
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-20"
      >
        <div className="text-7xl mb-4 animate-sway">🌿</div>
        <p className="text-2xl mb-2 text-sunset" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
          ไม่พบ "{query}"
        </p>
        <p className="text-sm text-stone-500">ลองค้นหาคำอื่น</p>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <p className="text-sm text-stone-500 mb-4">
        ผลลัพธ์สำหรับ "<span className="font-bold" style={{ color: COLORS.primary }}>{query}</span>" ({items.length} รายการ)
      </p>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <ListItem
            key={item.id}
            item={item}
            idx={idx}
            isFav={favorites.has(item.id)}
            onFav={() => toggleFavorite(item.id)}
            onAdd={() => onAdd(item)}
          />
        ))}
      </div>
    </motion.div>
  );
}

function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("แนะนำ") || lower.includes("signature") || lower.includes("พิเศษ")) return "✨";
  if (lower.includes("ก๋วยเตี๋ยว") || lower.includes("noodle")) return "🍜";
  if (lower.includes("ข้าว") || lower.includes("rice")) return "🍚";
  if (lower.includes("เครื่องดื่ม") || lower.includes("drink") || lower.includes("ชา") || lower.includes("กาแฟ") || lower.includes("coffee")) return "🍵";
  if (lower.includes("ของหวาน") || lower.includes("dessert") || lower.includes("หวาน")) return "🍰";
  if (lower.includes("ยำ") || lower.includes("salad")) return "🥗";
  if (lower.includes("ปิ้ง") || lower.includes(" grill") || lower.includes("ย่าง")) return "🍢";
  if (lower.includes("ทอด") || lower.includes("fried")) return "🍤";
  if (lower.includes("ซุป") || lower.includes("soup")) return "🍲";
  return "🌿";
}
