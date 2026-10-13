"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, MenuItem } from "@/lib/types";
import { Plus, X, Search } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface AddItemModalProps {
  orders: OrderWithItems[];
  onClose: () => void;
  onAdded: () => void;
  serverName: string;
}

export function AddItemModal({ orders, onClose, onAdded, serverName }: AddItemModalProps) {
  const [activeOrders, setActiveOrders] = useState<OrderWithItems[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<{ menu_item_id: string; name: string; price: number; quantity: number; note: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // เฉพาะ order ที่ active (ยังไม่ paid)
    const active = orders.filter((o) => !o.paid_at && o.status !== "cancelled");
    setActiveOrders(active);
    if (active.length > 0) setSelectedOrderId(active[0].id);

    (async () => {
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase.from("menu_categories").select("id, name").order("display_order"),
        supabase.from("menu_items").select("*").order("display_order"),
      ]);
      setCategories(cats ?? []);
      setMenuItems(items ?? []);
    })();
  }, [orders]);

  const filteredItems = menuItems.filter((i) => {
    if (activeCategory !== "all" && i.category_id !== activeCategory) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          note: "",
        },
      ];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.menu_item_id !== id));
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    if (!selectedOrderId || cart.length === 0) return;
    setSubmitting(true);
    const supabase = createClient();

    const orderItemsRows = cart.map((i) => ({
      order_id: selectedOrderId,
      menu_item_id: i.menu_item_id,
      quantity: i.quantity,
      unit_price: i.price,
      note: i.note || null,
      subtotal: i.price * i.quantity,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(orderItemsRows);
    if (itemsErr) {
      alert("เพิ่มรายการไม่สำเร็จ: " + itemsErr.message);
      setSubmitting(false);
      return;
    }

    // คำนวณ total ใหม่
    const { data: allItems } = await supabase
      .from("order_items")
      .select("subtotal")
      .eq("order_id", selectedOrderId);
    const newTotal = (allItems ?? []).reduce((s, i) => s + Number(i.subtotal), 0);

    await supabase
      .from("orders")
      .update({ total_amount: newTotal, status: "preparing" })
      .eq("id", selectedOrderId);

    alert(`เพิ่มเมนูสำเร็จ! (${cart.length} รายการ โดย ${serverName || "เสริฟ์"})`);
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
          <h3 className="font-bold text-stone-800 flex items-center gap-2">
            <Plus size={18} className="text-orange-500" /> เพิ่มเมนูให้โต๊ะ
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Active orders selector */}
        {activeOrders.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            <p>ยังไม่มีออร์เดอร์ที่กำลังทำ</p>
            <p className="text-xs mt-1">ลูกค้าต้องสั่งอาหารก่อน</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-stone-100 flex gap-2 overflow-x-auto">
              {activeOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrderId(o.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
                    selectedOrderId === o.id
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md"
                      : "bg-stone-100 text-stone-700"
                  }`}
                >
                  <span className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                    {o.tables?.table_number ?? "?"}
                  </span>
                  รอบที่ {o.session_number}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-4 py-2 border-b border-stone-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาเมนู..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-stone-50 text-sm outline-none"
                />
              </div>
              <div className="flex gap-1.5 mt-2 overflow-x-auto">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                    activeCategory === "all" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"
                  }`}
                >
                  ทั้งหมด
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                      activeCategory === c.id ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-2">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.is_available && addToCart(item)}
                    disabled={!item.is_available}
                    className={`text-left p-2 rounded-lg border transition ${
                      item.is_available
                        ? "border-stone-200 hover:border-orange-300 hover:bg-orange-50"
                        : "border-dashed border-stone-300 bg-stone-50 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <p className={`text-xs font-bold line-clamp-2 ${item.is_available ? "text-stone-800" : "text-stone-400"}`}>
                      {item.name}
                    </p>
                    {item.is_available ? (
                      <p className="text-xs text-orange-600 font-bold mt-1">{formatPrice(item.price)}</p>
                    ) : (
                      <p className="text-[10px] text-rose-500 font-bold mt-1">🚫 หมด</p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="border-t border-stone-200 p-3 bg-stone-50">
                <p className="text-[10px] font-bold text-stone-500 mb-1.5">รายการที่จะเพิ่ม ({cart.length})</p>
                <div className="space-y-1 mb-2 max-h-24 overflow-y-auto">
                  {cart.map((c) => (
                    <div key={c.menu_item_id} className="flex items-center gap-2 text-xs">
                      <span className="text-orange-600 font-bold w-6">{c.quantity}×</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="font-bold">{formatPrice(c.price * c.quantity)}</span>
                      <button onClick={() => removeFromCart(c.menu_item_id)} className="text-red-500">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800">รวม {formatPrice(cartTotal)}</span>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? "กำลังเพิ่ม..." : "เพิ่มเข้าออร์เดอร์"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function BillPaymentModal({
  orderId,
  orders,
  onClose,
  onPaid,
}: {
  orderId: string;
  orders: OrderWithItems[];
  onClose: () => void;
  onPaid: () => void;
}) {
  const order = orders.find((o) => o.id === orderId);
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<"cash" | "transfer">("cash");

  if (!order) return null;

  const items = (order.order_items ?? []).filter((it) => it.status !== "cancelled");
  const total = items.reduce((s, it) => s + Number(it.subtotal), 0);

  const handlePay = async () => {
    setSubmitting(true);
    const supabase = createClient();

    // mark order ว่าจ่ายแล้ว
    await supabase
      .from("orders")
      .update({
        paid_at: new Date().toISOString(),
        status: "served",
      })
      .eq("id", orderId);

    // mark bills ว่า printed/closed
    await supabase
      .from("bills")
      .update({ printed_at: new Date().toISOString() })
      .eq("order_id", orderId)
      .is("printed_at", null);

    alert(`💰 รับเงิน ${total.toLocaleString()} บาท (${method === "cash" ? "เงินสด" : "โอน"})`);
    onPaid();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
          <h3 className="font-bold text-stone-800 flex items-center gap-2">
            💰 ปิดบิล/รับเงิน
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-xs text-stone-500">โต๊ะ</p>
            <p className="text-2xl font-bold text-stone-800">
              {order.tables?.table_number ?? "?"}{" "}
              <span className="text-sm font-normal text-stone-500">รอบที่ {order.session_number}</span>
            </p>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-2 text-sm">
                <span className="text-orange-600 font-bold w-7">{it.quantity}×</span>
                <span className="flex-1 truncate">{it.menu_items?.name}</span>
                <span className="font-bold">{Number(it.subtotal).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl">
            <span className="font-bold text-stone-800">รวมทั้งหมด</span>
            <span className="text-2xl font-bold text-orange-600">{total.toLocaleString()} ฿</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMethod("cash")}
              className={`py-2.5 rounded-xl text-sm font-bold ${
                method === "cash"
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md"
                  : "bg-stone-100 text-stone-700"
              }`}
            >
              💵 เงินสด
            </button>
            <button
              onClick={() => setMethod("transfer")}
              className={`py-2.5 rounded-xl text-sm font-bold ${
                method === "transfer"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md"
                  : "bg-stone-100 text-stone-700"
              }`}
            >
              📱 โอนจ่าย
            </button>
          </div>

          <button
            onClick={handlePay}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base active:scale-95 disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : `ยืนยันรับเงิน ${total.toLocaleString()} บาท`}
          </button>
        </div>
      </div>
    </div>
  );
}
