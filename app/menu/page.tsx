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
   🎨 Aura Bistro — Modern Warm Minimalist Design System
   Palette:
   - Cream:      #FAF6F0
   - Off-white:  #FFFCF7
   - Beige:      #E8DDD0
   - Terracotta: #E85A35
   - Charcoal:   #1C1917
============================================================ */

const COLORS = {
  cream: "#FAF6F0",
  offwhite: "#FFFCF7",
  beige: "#E8DDD0",
  terracotta: "#E85A35",
  terracottaDark: "#C8431F",
  charcoal: "#1C1917",
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
      className="min-h-screen flex flex-col items-center justify-center gap-3"
      style={{ background: COLORS.cream }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
        style={{ background: COLORS.terracotta }}
      >
        <ChefHat className="text-white" size={28} />
      </motion.div>
      <p className="text-sm text-stone-600 font-medium" style={{ fontFamily: "'Prompt', sans-serif" }}>
        กำลังโหลดเมนู...
      </p>
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
    addItem({ ...item, quantity: 1, note: "" });
  };

  const handleCheckout = async () => {
    if (!table || cartItems.length === 0) return;
    setSubmitting(true);
    const supabase = createClient();
    const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({ table_id: table.id, status: "pending", total_amount: total })
      .select().single();

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

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: COLORS.cream }}
      >
        <div className="max-w-sm text-center">
          <div
            className="w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center shadow-xl"
            style={{ background: COLORS.terracotta }}
          >
            <AlertCircle size={36} className="text-white" />
          </div>
          <p className="text-stone-800 font-bold text-lg mb-2" style={{ fontFamily: "'Prompt', sans-serif" }}>
            เกิดข้อผิดพลาด
          </p>
          <p className="text-stone-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: COLORS.cream, fontFamily: "'Prompt', 'Sukhumvit Set', sans-serif" }}>
      {/* Load Prompt font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;800&family=Playfair+Display:wght@500;700;900&display=swap"
        rel="stylesheet"
      />

      {/* ============ HERO BANNER ============ */}
      <section className="relative h-[340px] overflow-hidden">
        {/* Hero image - cozy bistro */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(28,25,23,0.55) 100%), url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80')`,
          }}
        />

        {/* Top status badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur text-[11px] font-semibold flex items-center gap-1.5 shadow-md"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span style={{ color: COLORS.charcoal }}>เปิดให้บริการ</span>
          </motion.div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setCartOpen(true)}
            className="relative w-11 h-11 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-md"
          >
            <ShoppingBag size={18} style={{ color: COLORS.charcoal }} />
            {totalCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-white text-[11px] font-bold flex items-center justify-center shadow-md"
                style={{ background: COLORS.terracotta }}
              >
                {totalCount}
              </span>
            )}
          </motion.button>
        </div>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-[11px] uppercase tracking-[0.2em] opacity-80 font-medium mb-1">
              Welcome to
            </p>
            <h1
              className="text-4xl font-bold leading-none mb-1"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Aura Bistro
            </h1>
            <p className="text-sm opacity-90 mb-3" style={{ fontFamily: "'Prompt', sans-serif" }}>
              ออร่า บิสโทร • โต๊ะ {table?.table_number}
            </p>
          </motion.div>

          {/* Quick info badges */}
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
          <div className="relative bg-white rounded-2xl shadow-xl shadow-stone-900/5 border border-stone-100">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="ค้นหาเมนูอร่อย..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-transparent outline-none text-sm rounded-2xl"
              style={{ color: COLORS.charcoal }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* ============ HORIZONTAL CATEGORY PILLS ============ */}
      {categories.length > 0 && !searchQuery && (
        <div className="sticky top-[72px] z-20 bg-white/80 backdrop-blur-md border-b border-stone-200/40 mt-4">
          <div className="max-w-3xl mx-auto px-4 py-3 overflow-x-auto no-scrollbar">
            <div className="flex gap-2.5">
              {categories.map((cat) => {
                const itemCount = items.filter((i) => i.category_id === cat.id).length;
                if (itemCount === 0) return null;
                const isActive = activeCategory === cat.id;
                return (
                  <motion.button
                    key={cat.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? "text-white shadow-md"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                    style={isActive ? { background: COLORS.terracotta } : {}}
                  >
                    <span className="text-base">
                      {cat.icon ?? getCategoryEmoji(cat.name)}
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
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-20 safe-bottom"
          >
            <div className="max-w-3xl mx-auto p-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ y: -2 }}
                onClick={() => setCartOpen(true)}
                className="w-full rounded-2xl p-4 flex items-center justify-between shadow-2xl text-white"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.terracotta} 0%, ${COLORS.terracottaDark} 100%)`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <ShoppingBag size={20} />
                    </div>
                    <motion.span
                      key={totalCount}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-white text-[10px] font-bold flex items-center justify-center shadow-md"
                      style={{ color: COLORS.terracotta }}
                    >
                      {totalCount}
                    </motion.span>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] opacity-90">ตะกร้าของคุณ</p>
                    <p className="text-base font-bold leading-tight">
                      ฿{cartTotal.toFixed(0)} • {totalCount} รายการ
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">ดูตะกร้า</span>
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
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
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 flex items-center gap-3 shadow-xl">
            <Loader2 className="animate-spin" size={20} style={{ color: COLORS.terracotta }} />
            <span className="font-medium">กำลังสั่งอาหาร...</span>
          </div>
        </div>
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
      className={`px-2.5 py-1 rounded-full backdrop-blur-md text-[10px] font-semibold flex items-center gap-1 ${
        highlight ? "bg-amber-400/90 text-stone-900" : "bg-white/20 text-white"
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
      <div className="flex items-end justify-between mb-4">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.2em] font-semibold"
            style={{ color: COLORS.terracotta }}
          >
            ✨ Signature
          </p>
          <h2
            className="text-2xl font-bold leading-tight"
            style={{ fontFamily: "'Playfair Display', serif", color: COLORS.charcoal }}
          >
            เมนูซิกเนเจอร์
          </h2>
          <p className="text-xs text-stone-500">Chef's Pick — คัดสรรโดยเชฟ</p>
        </div>
        <Flame size={20} style={{ color: COLORS.terracotta }} />
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
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
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.1 }}
      whileHover={{ y: -4 }}
      className="flex-shrink-0 w-64 bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100"
    >
      <div className="relative h-40 overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${COLORS.beige} 0%, ${COLORS.cream} 100%)` }}
          >
            <ChefHat size={36} className="text-stone-300" />
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-400 text-stone-900 text-[9px] font-bold flex items-center gap-1">
          <Sparkles size={8} /> CHEF'S PICK
        </div>
        <button
          onClick={onFav}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-md"
        >
          <Heart
            size={14}
            className={isFav ? "fill-red-500 text-red-500" : "text-stone-500"}
          />
        </button>
      </div>
      <div className="p-3">
        <h3 className="font-bold text-sm leading-tight line-clamp-2" style={{ color: COLORS.charcoal }}>
          {item.name}
        </h3>
        {item.description && (
          <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-2.5">
          <div>
            <p
              className="text-lg font-bold leading-none"
              style={{ color: COLORS.terracotta, fontFamily: "'Playfair Display', serif" }}
            >
              ฿{Number(item.price).toFixed(0)}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onAdd}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md"
            style={{ background: COLORS.terracotta }}
          >
            <Plus size={16} strokeWidth={2.5} />
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: catIdx * 0.05 }}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-lg font-bold flex items-center gap-2"
          style={{ color: COLORS.charcoal }}
        >
          <span className="text-xl">{category.icon ?? getCategoryEmoji(category.name)}</span>
          <span>{category.name}</span>
          <span className="text-xs text-stone-400 font-normal">({items.length})</span>
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl p-3 flex gap-3 shadow-sm border border-stone-100 hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${COLORS.beige} 0%, ${COLORS.cream} 100%)` }}
          >
            <ChefHat size={26} className="text-stone-300" />
          </div>
        )}
        {item.is_recommended && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-stone-900 text-[8px] font-bold">
            ⭐ แนะนำ
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-sm leading-tight line-clamp-2" style={{ color: COLORS.charcoal }}>
            {item.name}
          </h3>
          <button onClick={onFav} className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
            <Heart size={14} className={isFav ? "fill-red-500 text-red-500" : "text-stone-300"} />
          </button>
        </div>
        {item.description && (
          <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-1.5">
          <p
            className="text-base font-bold"
            style={{ color: COLORS.terracotta, fontFamily: "'Playfair Display', serif" }}
          >
            ฿{Number(item.price).toFixed(0)}
          </p>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onAdd}
            className="px-3 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1 shadow-md"
            style={{ background: COLORS.terracotta }}
          >
            <Plus size={12} strokeWidth={3} /> เพิ่ม
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
          className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
          style={{ background: COLORS.beige }}
        >
          <Search size={26} className="text-stone-400" />
        </div>
        <p className="text-stone-500 text-sm">ไม่พบเมนู "{query}"</p>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <p className="text-sm text-stone-500 mb-3">
        ผลลัพธ์สำหรับ "<span className="font-bold" style={{ color: COLORS.terracotta }}>{query}</span>" ({items.length} รายการ)
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
