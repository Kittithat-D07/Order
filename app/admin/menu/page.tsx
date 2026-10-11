"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MenuItem, MenuCategory } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { Plus, Edit2, Trash2, Save, X, ArrowLeft, ImageIcon } from "lucide-react";
import Link from "next/link";

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const load = async () => {
    const supabase = createClient();
    const [{ data: catData }, { data: itemData }] = await Promise.all([
      supabase.from("menu_categories").select("*").order("display_order"),
      supabase.from("menu_items").select("*").order("display_order"),
    ]);
    setCategories(catData ?? []);
    setItems(itemData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    const supabase = createClient();
    await supabase.from("menu_categories").insert({
      name: newCategoryName.trim(),
      display_order: categories.length,
    });
    setNewCategoryName("");
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("ลบหมวดนี้? เมนูในหมวดจะถูกลบไปด้วย")) return;
    const supabase = createClient();
    await supabase.from("menu_categories").delete().eq("id", id);
    load();
  };

  const saveItem = async () => {
    if (!editingItem) return;
    const supabase = createClient();
    const payload = {
      category_id: editingItem.category_id,
      name: editingItem.name,
      description: editingItem.description ?? null,
      price: Number(editingItem.price),
      image_url: editingItem.image_url ?? null,
      is_available: editingItem.is_available ?? true,
      display_order: editingItem.display_order ?? 0,
    };

    if (editingItem.id) {
      await supabase.from("menu_items").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("menu_items").insert(payload);
    }
    setEditingItem(null);
    load();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("ลบเมนูนี้?")) return;
    const supabase = createClient();
    await supabase.from("menu_items").delete().eq("id", id);
    load();
  };

  const toggleAvailable = async (item: MenuItem) => {
    const supabase = createClient();
    await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);
    load();
  };

  if (loading) {
    return <div className="p-8 text-center">กำลังโหลด...</div>;
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto p-4 flex items-center gap-3">
          <Link href="/admin" className="p-1 hover:bg-stone-100 rounded">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-bold text-lg">จัดการเมนู</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Categories */}
        <section className="bg-white rounded-lg p-4">
          <h2 className="font-bold mb-3">หมวดเมนู</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="px-3 py-1.5 rounded-full bg-stone-100 flex items-center gap-2 text-sm"
              >
                {c.name}
                <button
                  onClick={() => deleteCategory(c.id)}
                  className="text-stone-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="เพิ่มหมวดใหม่..."
              className="flex-1 px-3 py-2 border border-stone-300 rounded-lg"
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <button
              onClick={addCategory}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg"
            >
              <Plus size={16} />
            </button>
          </div>
        </section>

        {/* Items */}
        <section className="bg-white rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">รายการอาหาร</h2>
            <button
              onClick={() =>
                setEditingItem({
                  category_id: categories[0]?.id,
                  is_available: true,
                  display_order: items.length,
                })
              }
              disabled={categories.length === 0}
              className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:bg-stone-300 text-white rounded-lg text-sm flex items-center gap-1"
            >
              <Plus size={14} /> เพิ่มเมนู
            </button>
          </div>

          <div className="space-y-2">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-3 p-3 border border-stone-200 rounded-lg"
              >
                <div className="w-12 h-12 bg-stone-100 rounded flex items-center justify-center shrink-0">
                  {it.image_url ? (
                    <img
                      src={it.image_url}
                      alt={it.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <ImageIcon size={20} className="text-stone-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{it.name}</p>
                  <p className="text-xs text-stone-500">
                    {categories.find((c) => c.id === it.category_id)?.name} ·{" "}
                    {formatPrice(it.price)}
                  </p>
                </div>
                <button
                  onClick={() => toggleAvailable(it)}
                  className={`text-xs px-2 py-1 rounded ${
                    it.is_available
                      ? "bg-green-100 text-green-700"
                      : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {it.is_available ? "เปิดขาย" : "ปิด"}
                </button>
                <button
                  onClick={() => setEditingItem(it)}
                  className="p-1.5 hover:bg-stone-100 rounded"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => deleteItem(it.id)}
                  className="p-1.5 hover:bg-stone-100 rounded text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Edit modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-3">
            <h3 className="font-bold text-lg">
              {editingItem.id ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}
            </h3>
            <div>
              <label className="text-sm text-stone-600">หมวด</label>
              <select
                value={editingItem.category_id ?? ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, category_id: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-stone-600">ชื่อเมนู</label>
              <input
                value={editingItem.name ?? ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, name: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm text-stone-600">คำอธิบาย</label>
              <textarea
                value={editingItem.description ?? ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, description: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm text-stone-600">ราคา (บาท)</label>
              <input
                type="number"
                value={editingItem.price ?? ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, price: Number(e.target.value) })
                }
                className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm text-stone-600">URL รูปภาพ (ถ้ามี)</label>
              <input
                value={editingItem.image_url ?? ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, image_url: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg"
                placeholder="https://..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 border border-stone-300 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveItem}
                disabled={!editingItem.name || !editingItem.price}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-stone-300 text-white rounded-lg flex items-center gap-1"
              >
                <Save size={14} /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
