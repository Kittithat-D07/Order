"use client";

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/store/cart";
import { MenuItem, MenuCategory, Table } from "@/lib/types";
import { MenuItemCard } from "@/components/customer/MenuItemCard";
import { CartDrawer } from "@/components/customer/CartDrawer";
import {
  ChefHat,
  Loader2,
  ShoppingBag,
  AlertCircle,
  Search,
  Sparkles,
  Flame,
} from "lucide-react";
import {
  BlurFade,
  GradientBlob,
  FloatingElement,
} from "@/components/ui/magic-effects";
import { PulseDot } from "@/components/ui/magic-effects";

export default function MenuPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MenuContent />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 relative overflow-hidden flex flex-col items-center justify-center gap-3">
      <GradientBlob className="top-[-100px] left-[-100px]" color="bg-orange-300/30" />
      <GradientBlob className="bottom-[-100px] right-[-100px]" color="bg-amber-300/30" delay={1} />
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-orange-500/40"
      >
        <ChefHat className="text-white" size={28} />
      </motion.div>
      <div className="flex items-center gap-2">
        <PulseDot color="bg-orange-500" />
        <p className="text-sm text-stone-600 font-medium">กำลังโหลดเมนู...</p>
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

  const setTableInCart = useCart((s) => s.setTable);
  const cartTotal = useCart((s) => s.total());
  const cartItems = useCart((s) => s.items);
  const totalCount = useCart((s) => s.totalItems());
  const clearCart = useCart((s) => s.clear);

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
          .from("tables")
          .select("*")
          .eq("qr_token", token)
          .single();

        if (tableErr || !tableData) {
          setError("QR Code ไม่ถูกต้องหรือโต๊ะนี้ถูกลบไปแล้ว");
          setLoading(false);
          return;
        }

        setTable(tableData);
        setTableInCart(tableData.id, tableData.table_number);

        const { data: catData } = await supabase
          .from("menu_categories")
          .select("*")
          .order("display_order", { ascending: true });

        const { data: itemData } = await supabase
          .from("menu_items")
          .select("*")
          .order("display_order", { ascending: true });

        setCategories(catData ?? []);
        setItems(itemData ?? []);
        if (catData && catData.length > 0) {
          setActiveCategory(catData[0].id);
        }
      } catch (e) {
        setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, setTableInCart]);

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const handleCategoryClick = (catId: string) => {
    setActiveCategory(catId);
    const el = categoryRefs.current[catId];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const handleCheckout = async () => {
    if (!table || cartItems.length === 0) return;
    setSubmitting(true);

    const supabase = createClient();
    const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        table_id: table.id,
        status: "pending",
        total_amount: total,
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

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItemsRows);

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
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 relative overflow-hidden flex items-center justify-center p-6">
        <GradientBlob className="top-[-100px] right-[-100px]" color="bg-red-300/30" />
        <GradientBlob className="bottom-[-100px] left-[-100px]" color="bg-orange-300/30" delay={1} />
        <BlurFade>
          <div className="max-w-sm text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-red-500/40"
            >
              <AlertCircle size={36} className="text-white" />
            </motion.div>
            <p className="text-stone-800 font-bold text-lg mb-2">เกิดข้อผิดพลาด</p>
            <p className="text-stone-600 text-sm">{error}</p>
          </div>
        </BlurFade>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-gradient-to-br from-orange-50/30 via-amber-50/30 to-stone-50 relative">
      {/* Background gradient blobs */}
      <GradientBlob className="top-[10%] right-[-150px]" color="bg-orange-300/20" />
      <GradientBlob className="top-[40%] left-[-150px]" color="bg-amber-300/20" delay={3} />
      <GradientBlob className="bottom-[20%] right-[20%]" color="bg-red-300/15" delay={5} />

      {/* Floating decorations */}
      <FloatingElement className="top-32 right-8" delay={0}>
        <Sparkles className="w-6 h-6 text-orange-400/40" />
      </FloatingElement>
      <FloatingElement className="top-1/2 left-4" delay={2}>
        <Flame className="w-5 h-5 text-red-400/40" />
      </FloatingElement>

      {/* Header */}
      <header className="sticky top-0 z-30 glass backdrop-blur-md bg-white/80">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
                <ChefHat size={20} className="text-white" strokeWidth={2.2} />
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight">เมนูอาหาร</h1>
                <p className="text-xs text-stone-500">โต๊ะ {table?.table_number}</p>
              </div>
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="relative w-11 h-11 rounded-full bg-stone-900 hover:bg-stone-800 text-white flex items-center justify-center shadow-md active:scale-95 transition"
              aria-label="เปิดตะกร้า"
            >
              <ShoppingBag size={18} />
              {totalCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center animate-pop shadow-sm">
                  {totalCount}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="ค้นหาเมนู..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 text-sm py-2.5"
            />
          </div>
        </div>

        {/* Category Tabs */}
        {categories.length > 0 && !searchQuery && (
          <div className="border-t border-stone-200/60">
            <div className="max-w-3xl mx-auto px-4 py-2.5 overflow-x-auto no-scrollbar">
              <div className="flex gap-2">
                {categories.map((cat) => {
                  const itemCount = items.filter((i) => i.category_id === cat.id).length;
                  if (itemCount === 0) return null;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`chip ${activeCategory === cat.id ? "chip-active" : ""}`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        <AnimatePresence mode="popLayout">
          {categories.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
                <ChefHat size={28} className="text-stone-400" />
              </div>
              <p className="text-stone-500">ยังไม่มีเมนูในระบบ</p>
            </motion.div>
          )}

          {searchQuery ? (
            <motion.section
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm text-stone-500 mb-3">
                ผลลัพธ์ "<span className="font-semibold text-orange-600">{searchQuery}</span>" ({filteredItems.length} รายการ)
              </p>
              {filteredItems.length === 0 ? (
                <p className="text-center text-stone-400 py-12">ไม่พบเมนูที่ค้นหา</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredItems.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <MenuItemCard item={item} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>
          ) : (
            categories.map((cat, catIdx) => {
              const catItems = items.filter((i) => i.category_id === cat.id);
              if (catItems.length === 0) return null;
              return (
                <BlurFade key={cat.id} delay={catIdx * 0.1}>
                  <section
                    ref={(el) => {
                      categoryRefs.current[cat.id] = el;
                    }}
                    className="mb-8"
                  >
                    <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <motion.span
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: catIdx * 0.1 + 0.2 }}
                        className="w-1 h-6 rounded-full bg-gradient-to-b from-orange-500 to-amber-500 origin-top"
                      />
                      <span className="bg-gradient-to-r from-stone-800 to-stone-600 bg-clip-text text-transparent">
                        {cat.name}
                      </span>
                      <span className="text-xs text-stone-400 font-normal">({catItems.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {catItems.map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: catIdx * 0.1 + idx * 0.05 + 0.1 }}
                        >
                          <MenuItemCard item={item} />
                        </motion.div>
                      ))}
                    </div>
                  </section>
                </BlurFade>
              );
            })
          )}
        </AnimatePresence>
      </main>

      {/* Cart Bar */}
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
              <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-orange-500/20 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 p-[2px]">
                <div className="bg-white rounded-[14px] p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 pl-1">
                    <div className="relative">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg"
                      >
                        <ShoppingBag size={20} className="text-white" />
                      </motion.div>
                      <motion.span
                        key={totalCount}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-orange-600 text-[10px] font-bold flex items-center justify-center shadow-md border-2 border-orange-500"
                      >
                        {totalCount}
                      </motion.span>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">รวมทั้งหมด</p>
                      <p className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent leading-none mt-0.5">
                        ฿{cartTotal.toFixed(0)}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setCartOpen(true)}
                    className="px-5 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-shadow"
                  >
                    ดูตะกร้า →
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
      />

      {submitting && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl p-6 flex items-center gap-3 shadow-xl">
            <Loader2 className="animate-spin text-orange-500" size={20} />
            <span className="font-medium">กำลังสั่งอาหาร...</span>
          </div>
        </div>
      )}
    </div>
  );
}
