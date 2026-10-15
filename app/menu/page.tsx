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
  ChefHat,
  Loader2,
  ShoppingBag,
  AlertCircle,
  Search,
  Sparkles,
  Flame,
  Star,
  Clock,
  MapPin,
  Plus,
  Heart,
  X,
} from "lucide-react";

/* ============================================================
   🍜 Aura Bistro — Warm Thai Restaurant Design System
   Palette:
    - Primary:   #E85A35 (Terracotta)
    - Secondary: #F59E0B (Amber)
    - Background:#FAF8F5 (Warm Cream)
    - Surface:   #FFFFFF
============================================================ */

const COLORS = {
  primary: "#E85A35",
  primaryDark: "#C8431F",
  primaryLight: "#FFF0ED",
  secondary: "#F59E0B",
  secondaryLight: "#FEF3C7",
  bg: "#FAF8F5",
  surface: "#FFFFFF",
  surface2: "#F5F3F0",
  border: "#E8E4DF",
  text: "#1C1917",
  textMuted: "#78716C",
  success: "#16A34A",
  danger: "#DC2626",
};

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
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: COLORS.bg }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl"
        style={{ 
          background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
          boxShadow: `0 20px 40px -8px rgba(232, 90, 53, 0.4)`
        }}
      >
        <ChefHat className="text-white" size={32} />
      </motion.div>
      <div className="text-center">
        <p className="text-lg font-semibold text-stone-800" style={{ fontFamily: "'Prompt', sans-serif" }}>
          กำลังโหลดเมนู...
        </p>
        <p className="text-sm text-stone-500 mt-1">เตรียมความอร่อยให้คุณ</p>
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

  const featuredItems = useMemo(() => items.slice(0, 3), [items]);

  const handleCategoryClick = (catId: string) => {
    setActiveCategory(catId);
    const el = categoryRefs.current[catId];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 160;
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

    // เช็ค order ล่าสุดของโต๊ะนี้
    const { data: lastOrder } = await supabase
      .from("orders")
      .select("id, paid_at, session_number, status")
      .eq("table_id", table.id)
      .order("session_number", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ถ้ามี order ค้างอยู่และยังไม่จ่ายเงิน
    if (lastOrder && !lastOrder.paid_at && lastOrder.status !== "cancelled") {
      const ok = confirm(
        `โต๊ะนี้มีออร์เดอร์ค้างอยู่ (รอบที่ ${lastOrder.session_number})\n\n` +
        `กด "ตกลง" เพื่อเพิ่มรายการเข้าออร์เดอร์เดิม\n` +
        `กด "ยกเลิก" เพื่อยกเลิกออร์เดอร์เก่าแล้วเริ่มใหม่`
      );
      if (ok) {
        // เพิ่มรายการเข้าออร์เดอร์เดิม
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

        // อัปเดต total_amount
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
        // ยกเลิกออร์เดอร์เก่า
        await supabase
          .from("orders")
          .update({ status: "cancelled", paid_at: new Date().toISOString() })
          .eq("id", lastOrder.id);
      }
    }

    // สร้างออร์เดอร์ใหม่
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

  // helper: คำนวณ total ของ order
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
          className="max-w-sm text-center p-8 bg-white rounded-3xl shadow-lg border border-stone-100"
        >
          <div
            className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.danger} 0%, #B91C1C 100%)`,
              boxShadow: `0 12px 24px -4px rgba(220, 38, 38, 0.3)`
            }}
          >
            <AlertCircle size={36} className="text-white" />
          </div>
          <p className="text-stone-800 font-bold text-xl mb-3" style={{ fontFamily: "'Prompt', sans-serif" }}>
            เกิดข้อผิดพลาด
          </p>
          <p className="text-stone-600 text-sm leading-relaxed">{error}</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg"
          >
            ลองใหม่
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: COLORS.bg }}>
      {/* ============ HERO BANNER ============ */}
      <section
        className="relative h-72 overflow-hidden"
        style={{ background: COLORS.bg }}
      >
        {/* Hero Background - Cozy restaurant */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(28,25,23,0.6) 100%), url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80')`,
          }}
        />

        {/* Top Status Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="px-4 py-2 rounded-full bg-white/95 backdrop-blur-md text-xs font-semibold flex items-center gap-2 shadow-lg"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span style={{ color: COLORS.text }}>เปิดให้บริการ</span>
          </motion.div>
          
          <motion.button
            whileTap={{ scale: 0.9, rotate: 90 }}
            onClick={() => setCartOpen(true)}
            className="relative w-12 h-12 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          >
            <ShoppingBag size={20} style={{ color: COLORS.text }} />
            {totalCount > 0 && (
              <motion.span
                key={totalCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 min-w-[22px] h-6 px-1.5 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                  boxShadow: `0 4px 12px -2px rgba(232, 90, 53, 0.4)`
                }}
              >
                {totalCount}
              </motion.span>
            )}
          </motion.button>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-[10px] uppercase tracking-[0.25em] opacity-90 font-semibold mb-1">
              Welcome to
            </p>
            <h1
              className="text-4xl font-bold leading-none mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Aura Bistro
            </h1>
            <p className="text-sm opacity-90 mb-4" style={{ fontFamily: "'Prompt', sans-serif" }}>
              🍜 ออร่า บิสโทร • โต๊ะ {table?.table_number}
            </p>
          </motion.div>

          {/* Quick Info Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <PillBadge icon={<Star size={11} className="fill-yellow-300 text-yellow-500" />} text="4.8 (1.2k)" />
            <PillBadge icon={<Clock size={11} />} text="20-30 นาที" />
            <PillBadge icon={<MapPin size={11} />} text="1.2 km" />
            <PillBadge icon={<Sparkles size={11} />} text="ส่งฟรี" highlight />
          </motion.div>
        </div>
      </section>

      {/* ============ SEARCH BAR (Floating) ============ */}
      <div className="sticky top-0 z-30 -mt-6 px-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <div 
            className="relative bg-white rounded-2xl shadow-xl border border-stone-100"
            style={{ boxShadow: "0 8px 24px -4px rgba(0,0,0,0.08)" }}
          >
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="ค้นหาเมนูอร่อย..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-transparent outline-none text-base rounded-2xl"
              style={{ color: COLORS.text }}
            />
            {searchQuery && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
              >
                <X size={14} />
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      {/* ============ HORIZONTAL CATEGORY PILLS ============ */}
      {categories.length > 0 && !searchQuery && (
        <div className="sticky top-[76px] z-20 bg-white/90 backdrop-blur-md border-b border-stone-200/40 mt-4">
          <div className="max-w-3xl mx-auto px-4 py-3 overflow-x-auto no-scrollbar">
            <div className="flex gap-3">
              {categories.map((cat) => {
                const itemCount = items.filter((i) => i.category_id === cat.id).length;
                if (itemCount === 0) return null;
                const isActive = activeCategory === cat.id;
                return (
                  <motion.button
                    key={cat.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? "text-white shadow-lg"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                    style={isActive ? { 
                      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                      boxShadow: `0 4px 12px -2px rgba(232, 90, 53, 0.35)`
                    } : {}}
                  >
                    <span className="text-base">
                      {getCategoryEmoji(cat.name)}
                    </span>
                    <span>{cat.name}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============ MAIN CONTENT ============ */}
      <main className="max-w-3xl mx-auto px-4 py-6">
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
            <>
              {/* FEATURED / CHEF'S PICK */}
              {featuredItems.length > 0 && (
                <FeaturedSection
                  items={featuredItems}
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
            </>
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
                className="w-full rounded-2xl p-5 flex items-center justify-between shadow-2xl text-white"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                  boxShadow: `0 20px 40px -8px rgba(232, 90, 53, 0.4)`
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <ShoppingBag size={24} />
                    </div>
                    <motion.span
                      key={totalCount}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 min-w-[24px] h-6 px-2 rounded-full bg-white text-sm font-bold flex items-center justify-center shadow-lg"
                      style={{ color: COLORS.primary }}
                    >
                      {totalCount}
                    </motion.span>
                  </div>
                  <div className="text-left">
                    <p className="text-xs opacity-90">ตะกร้าของคุณ</p>
                    <p className="text-xl font-bold leading-tight">
                      ฿{cartTotal.toLocaleString()} • {totalCount} รายการ
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm px-5 py-3 rounded-xl font-semibold">
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
          className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-sm flex items-center justify-center"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)` }}
            >
              <ChefHat size={24} className="text-white" />
            </motion.div>
            <p className="text-lg font-semibold text-stone-800">กำลังสั่งอาหาร...</p>
            <p className="text-sm text-stone-500">รอสักครู่นะคะ</p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

/* ============================================================
   SUB-COMPONENTS
============================================================ */

function PillBadge({
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
      className={`px-3 py-1.5 rounded-full backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 shadow-lg ${
        highlight ? "bg-gradient-to-r from-amber-400 to-orange-400 text-white" : "bg-white/20 text-white"
      }`}
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
    <section className="mb-8">
      <div className="flex items-end justify-between mb-5">
        <div>
          <p
            className="text-xs font-bold tracking-wider uppercase mb-1"
            style={{ color: COLORS.primary }}
          >
            ✨ Signature
          </p>
          <h2
            className="text-2xl font-bold leading-tight"
            style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text }}
          >
            เมนูซิกเนเจอร์
          </h2>
          <p className="text-sm text-stone-500 mt-1">Chef's Pick — คัดสรรโดยเชฟ</p>
        </div>
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: COLORS.secondaryLight }}
        >
          <Flame size={24} style={{ color: COLORS.primary }} />
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
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
    "linear-gradient(135deg, #FFECD2 0%, #FCB69F 100%)",
    "linear-gradient(135deg, #FFE5B4 0%, #FFD093 100%)",
    "linear-gradient(135deg, #FFF0F5 0%, #FFE4E1 100%)",
  ];
  const gradient = gradients[idx % gradients.length];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.1, type: "spring", damping: 20, stiffness: 200 }}
      whileHover={{ y: -6 }}
      className="flex-shrink-0 w-64 bg-white rounded-2xl overflow-hidden shadow-md border border-stone-100"
      style={{ boxShadow: "0 8px 24px -4px rgba(0,0,0,0.08)" }}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: gradient }}
          >
            <span className="text-6xl">🍜</span>
          </div>
        )}
        
        {/* Chef's Pick Badge */}
        <div 
          className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-white text-[10px] font-bold flex items-center gap-1.5 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)` }}
        >
          <Sparkles size={10} /> CHEF'S PICK
        </div>
        
        {/* Favorite Button */}
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={onFav}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-lg"
        >
          <Heart
            size={16}
            className={isFav ? "fill-red-500 text-red-500" : "text-stone-400"}
          />
        </motion.button>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-base leading-tight line-clamp-2" style={{ color: COLORS.text }}>
          {item.name}
        </h3>
        {item.description && (
          <p className="text-sm text-stone-500 mt-1 line-clamp-1">{item.description}</p>
        )}
        
        <div className="flex items-center justify-between mt-3">
          <p
            className="text-xl font-bold"
            style={{ color: COLORS.primary, fontFamily: "'Playfair Display', serif" }}
          >
            ฿{Number(item.price).toLocaleString()}
          </p>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onAdd}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg"
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
              boxShadow: `0 4px 12px -2px rgba(232, 90, 53, 0.4)`
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
      transition={{ delay: catIdx * 0.05, type: "spring", damping: 20, stiffness: 200 }}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-lg font-bold flex items-center gap-2.5"
          style={{ color: COLORS.text }}
        >
          <span className="text-2xl">{getCategoryEmoji(category.name)}</span>
          <span>{category.name}</span>
          <span className="text-sm text-stone-400 font-normal">({items.length})</span>
        </h2>
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
    "linear-gradient(135deg, #FFECD2 0%, #FCB69F 100%)",
    "linear-gradient(135deg, #FFE5B4 0%, #FFD093 100%)",
    "linear-gradient(135deg, #FFF0F5 0%, #FFE4E1 100%)",
    "linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",
  ];
  const gradient = gradients[idx % gradients.length];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04, type: "spring", damping: 20, stiffness: 200 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl p-4 flex gap-4 shadow-sm border border-stone-100 hover:shadow-md transition-shadow"
    >
      {/* Food Image */}
      <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl"
            style={{ background: gradient }}
          >
            🍜
          </div>
        )}
        {(item as any).is_recommended && (
          <div className="absolute top-1 left-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[8px] font-bold">
            ⭐
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-base leading-tight line-clamp-2" style={{ color: COLORS.text }}>
            {item.name}
          </h3>
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={onFav}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
          >
            <Heart size={16} className={isFav ? "fill-red-500 text-red-500" : "text-stone-300"} />
          </motion.button>
        </div>
        {item.description && (
          <p className="text-sm text-stone-500 mt-1 line-clamp-2 leading-relaxed">
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
            className="px-5 py-2 rounded-full text-white text-sm font-semibold shadow-lg flex items-center gap-1.5"
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
              boxShadow: `0 4px 12px -2px rgba(232, 90, 53, 0.35)`
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
        <div
          className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center text-5xl"
          style={{ background: COLORS.secondaryLight }}
        >
          🔍
        </div>
        <p className="text-stone-500 text-lg font-medium">ไม่พบ "{query}"</p>
        <p className="text-stone-400 text-sm mt-2">ลองค้นหาคำอื่น</p>
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

/* Helper: emoji for category name */
function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("แนะนำ") || lower.includes("signature") || lower.includes("พิเศษ")) return "✨";
  if (lower.includes("ก๋วยเตี๋ยว") || lower.includes("noodle")) return "🍜";
  if (lower.includes("ข้าว") || lower.includes("rice")) return "🍚";
  if (lower.includes("เครื่องดื่ม") || lower.includes("drink") || lower.includes("ชา") || lower.includes("กาแฟ") || lower.includes("coffee")) return "☕";
  if (lower.includes("ของหวาน") || lower.includes("dessert") || lower.includes("หวาน")) return "🍰";
  if (lower.includes("ยำ") || lower.includes("salad")) return "🥗";
  if (lower.includes("ปิ้ง") || lower.includes(" grill") || lower.includes("ย่าง")) return "🍢";
  if (lower.includes("ทอด") || lower.includes("fried")) return "🍤";
  if (lower.includes("ซุป") || lower.includes("soup")) return "🍲";
  return "🍽️";
}
