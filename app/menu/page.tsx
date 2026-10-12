"use client";

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
} from "lucide-react";

export default function MenuPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MenuContent />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
        <Loader2 className="animate-spin text-white" size={24} />
      </div>
      <p className="text-sm text-stone-500">กำลังโหลดเมนู...</p>
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

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <p className="text-stone-800 font-semibold mb-2">เกิดข้อผิดพลาด</p>
          <p className="text-stone-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 glass">
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
        {categories.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-stone-100 flex items-center justify-center">
              <ChefHat size={28} className="text-stone-400" />
            </div>
            <p className="text-stone-500">ยังไม่มีเมนูในระบบ</p>
          </div>
        )}

        {searchQuery ? (
          // Search results
          <section>
            <p className="text-sm text-stone-500 mb-3">
              ผลลัพธ์ "{searchQuery}" ({filteredItems.length} รายการ)
            </p>
            {filteredItems.length === 0 ? (
              <p className="text-center text-stone-400 py-12">ไม่พบเมนูที่ค้นหา</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredItems.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        ) : (
          // Categories
          categories.map((cat) => {
            const catItems = items.filter((i) => i.category_id === cat.id);
            if (catItems.length === 0) return null;
            return (
              <section
                key={cat.id}
                ref={(el) => {
                  categoryRefs.current[cat.id] = el;
                }}
                className="mb-8"
              >
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" />
                  {cat.name}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {catItems.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* Cart Bar */}
      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 safe-bottom">
          <div className="max-w-3xl mx-auto p-3">
            <div className="glass rounded-2xl shadow-lg p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 pl-1">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <ShoppingBag size={20} className="text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-orange-600 text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {totalCount}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-stone-500">รวมทั้งหมด</p>
                  <p className="text-lg font-bold text-stone-900 leading-none mt-0.5">
                    ฿{cartTotal.toFixed(0)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCartOpen(true)}
                className="btn-primary px-5 py-3 rounded-xl text-sm"
              >
                ดูตะกร้า
              </button>
            </div>
          </div>
        </div>
      )}

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
