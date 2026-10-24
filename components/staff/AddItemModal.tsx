"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, MenuItem } from "@/lib/types";
import { Plus, X, Search } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useToasts } from "@/components/ui/toast";

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
  const { toast } = useToasts();
  const panelRef = useRef<HTMLDivElement>(null);

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

  // Escape closes the sheet; focus moves into it so a keyboard user is not
  // left behind on the page underneath.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      setSubmitting(false);
      toast("เพิ่มรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "bad");
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

    toast(`เพิ่มเมนูสำเร็จ ${cart.length} รายการ โดย ${serverName || "เสริฟ์"}`, "ok");
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 bg-text/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-item-title"
        tabIndex={-1}
        className="bg-surface w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col overflow-hidden outline-none"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-brand-light">
          <h3 id="add-item-title" className="font-bold text-ink flex items-center gap-2">
            <Plus size={18} className="text-brand" aria-hidden="true" /> เพิ่มเมนูให้โต๊ะ
          </h3>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center hover:bg-surface-2 rounded-xl"
            aria-label="ปิดหน้าต่างเพิ่มเมนู"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Active orders selector */}
        {activeOrders.length === 0 ? (
          <div className="p-8 text-center text-ink-muted">
            <p>ยังไม่มีออร์เดอร์ที่กำลังทำ</p>
            <p className="text-xs mt-1">ลูกค้าต้องสั่งอาหารก่อน</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-line-soft flex gap-2 overflow-x-auto">
              {activeOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrderId(o.id)}
                  aria-pressed={selectedOrderId === o.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 min-h-[38px] ${
                    selectedOrderId === o.id
                      ? "bg-brand text-on-primary shadow-md"
                      : "bg-surface-2 text-ink-muted"
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
            <div className="px-4 py-2 border-b border-line-soft">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาเมนู..."
                  aria-label="ค้นหาเมนู"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-2 text-sm outline-none focus:border-brand"
                />
              </div>
              <div className="flex gap-1.5 mt-2 overflow-x-auto" role="group" aria-label="หมวดหมู่เมนู">
                <button
                  onClick={() => setActiveCategory("all")}
                  aria-pressed={activeCategory === "all"}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                    activeCategory === "all" ? "bg-ink text-on-primary" : "bg-surface-2 text-ink-muted"
                  }`}
                >
                  ทั้งหมด
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    aria-pressed={activeCategory === c.id}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                      activeCategory === c.id ? "bg-ink text-on-primary" : "bg-surface-2 text-ink-muted"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto p-3">
              {filteredItems.length === 0 ? (
                <p className="text-center text-sm text-ink-muted py-8">ไม่พบเมนูที่ค้นหา</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => item.is_available && addToCart(item)}
                      disabled={!item.is_available}
                      aria-label={
                        item.is_available
                          ? `เพิ่ม ${item.name} ${formatPrice(item.price)}`
                          : `${item.name} หมดชั่วคราว`
                      }
                      className={`text-left p-2 rounded-lg border transition min-h-[60px] ${
                        item.is_available
                          ? "border-line hover:border-brand hover:bg-brand-light"
                          : "border-dashed border-line-strong bg-surface-2 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <p
                        className={`text-xs font-bold line-clamp-2 ${
                          item.is_available ? "text-ink" : "text-ink-soft"
                        }`}
                      >
                        {item.name}
                      </p>
                      {item.is_available ? (
                        <p className="text-xs text-brand font-bold mt-1">{formatPrice(item.price)}</p>
                      ) : (
                        <p className="text-[10px] text-bad-text font-bold mt-1">🚫 หมด</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="border-t border-line p-3 bg-surface-2">
                <p className="text-[10px] font-bold text-ink-muted mb-1.5">
                  รายการที่จะเพิ่ม ({cart.length})
                </p>
                <div className="space-y-1 mb-2 max-h-24 overflow-y-auto">
                  {cart.map((c) => (
                    <div key={c.menu_item_id} className="flex items-center gap-2 text-xs">
                      <span className="text-brand font-bold w-6">{c.quantity}×</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="font-bold">{formatPrice(c.price * c.quantity)}</span>
                      <button
                        onClick={() => removeFromCart(c.menu_item_id)}
                        className="w-8 h-8 flex items-center justify-center text-bad-text rounded-lg hover:bg-bad-light"
                        aria-label={`ลบ ${c.name}`}
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-ink">รวม {formatPrice(cartTotal)}</span>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4 py-2 min-h-[44px] rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-bold active:scale-95 disabled:opacity-50"
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
  const { toast } = useToasts();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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

    toast(`รับเงิน ${total.toLocaleString()} บาท (${method === "cash" ? "เงินสด" : "โอน"}) เรียบร้อยแล้ว`, "ok");
    onPaid();
  };

  return (
    <div className="fixed inset-0 z-50 bg-text/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bill-payment-title"
        tabIndex={-1}
        className="bg-surface w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden outline-none"
      >
        <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-brand-light">
          <h3 id="bill-payment-title" className="font-bold text-ink flex items-center gap-2">
            💰 ปิดบิล/รับเงิน
          </h3>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center hover:bg-surface-2 rounded-xl"
            aria-label="ปิดหน้าต่างรับเงิน"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="bg-surface-2 rounded-xl p-3">
            <p className="text-xs text-ink-muted">โต๊ะ</p>
            <p className="text-2xl font-bold text-ink">
              {order.tables?.table_number ?? "?"}{" "}
              <span className="text-sm font-normal text-ink-muted">
                รอบที่ {order.session_number}
              </span>
            </p>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-2 text-sm">
                <span className="text-brand font-bold w-7">{it.quantity}×</span>
                <span className="flex-1 truncate">{it.menu_items?.name}</span>
                <span className="font-bold">{Number(it.subtotal).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 bg-brand-light rounded-xl">
            <span className="font-bold text-ink">รวมทั้งหมด</span>
            <span className="text-2xl font-bold text-brand">{total.toLocaleString()} ฿</span>
          </div>

          <div className="grid grid-cols-2 gap-2" role="group" aria-label="วิธีการชำระเงิน">
            <button
              onClick={() => setMethod("cash")}
              aria-pressed={method === "cash"}
              className={`py-2.5 min-h-[44px] rounded-xl text-sm font-bold ${
                method === "cash"
                  ? "bg-ok text-white shadow-md"
                  : "bg-surface-2 text-ink-muted"
              }`}
            >
              💵 เงินสด
            </button>
            <button
              onClick={() => setMethod("transfer")}
              aria-pressed={method === "transfer"}
              className={`py-2.5 min-h-[44px] rounded-xl text-sm font-bold ${
                method === "transfer"
                  ? "bg-accent text-white shadow-md"
                  : "bg-surface-2 text-ink-muted"
              }`}
            >
              📱 โอนจ่าย
            </button>
          </div>

          <button
            onClick={handlePay}
            disabled={submitting}
            className="w-full py-3 min-h-[48px] rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-base active:scale-95 disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : `ยืนยันรับเงิน ${total.toLocaleString()} บาท`}
          </button>
        </div>
      </div>
    </div>
  );
}
