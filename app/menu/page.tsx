"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/store/cart";
import { MenuItem, MenuCategory, Table } from "@/lib/types";
import { MenuItemCard } from "@/components/customer/MenuItemCard";
import { CartDrawer } from "@/components/customer/CartDrawer";
import { ShoppingBag, ChefHat, Loader2 } from "lucide-react";

export default function MenuPage() {
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

  const setTableInCart = useCart((s) => s.setTable);
  const cartTotal = useCart((s) => s.total());
  const cartItems = useCart((s) => s.items);
  const totalCount = useCart((s) => s.totalItems());
  const clearCart = useCart((s) => s.clear);

  useEffect(() => {
    if (!token) {
      setError("ไม่พบรหัสโต๊ะในลิงก์ กรุณาสแกน QR Code ที่โต๊ะอีกครั้ง");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    (async () => {
      try {
        // 1) ดึงข้อมูลโต๊ะ
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

        // 2) ดึงหมวดเมนู
        const { data: catData } = await supabase
          .from("menu_categories")
          .select("*")
          .order("display_order", { ascending: true });

        // 3) ดึงเมนู
        const { data: itemData } = await supabase
          .from("menu_items")
          .select("*")
          .order("display_order", { ascending: true });

        setCategories(catData ?? []);
        setItems(itemData ?? []);
      } catch (e) {
        setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, setTableInCart]);

  const handleCheckout = async () => {
    if (!table || cartItems.length === 0) return;
    setSubmitting(true);

    const supabase = createClient();
    const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

    // 1) สร้าง order
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

    // 2) เพิ่ม order_items
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-3xl mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="text-brand-500" size={24} />
            <div>
              <h1 className="font-bold">เมนูอาหาร</h1>
              <p className="text-xs text-stone-500">โต๊ะ {table?.table_number}</p>
            </div>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative w-10 h-10 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center"
            aria-label="เปิดตะกร้า"
          >
            <ShoppingBag size={18} />
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-8">
        {categories.length === 0 && (
          <p className="text-center text-stone-500 py-12">
            ยังไม่มีเมนูในระบบ
          </p>
        )}

        {categories.map((cat) => {
          const catItems = items.filter((i) => i.category_id === cat.id);
          if (catItems.length === 0) return null;
          return (
            <section key={cat.id}>
              <h2 className="text-xl font-bold mb-3 sticky top-[72px] bg-stone-50 py-2">
                {cat.name}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {catItems.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-stone-500">{totalCount} รายการ</p>
              <p className="text-lg font-bold text-brand-600">
                {cartTotal.toFixed(0)} บาท
              </p>
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="px-6 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold"
            >
              ดูตะกร้า
            </button>
          </div>
        </div>
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
      />

      {submitting && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="animate-spin" /> กำลังสั่งอาหาร...
          </div>
        </div>
      )}
    </div>
  );
}
