"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { MenuItem, MenuCategory } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ToastStack, useToasts } from "@/components/ui/toast";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ArrowLeft,
  ImageIcon,
  Utensils,
  Sparkles,
  ChefHat,
} from "lucide-react";
import Link from "next/link";
import {
  BlurFade,
  GradientBlob,
  FloatingElement,
  PulseDot,
} from "@/components/ui/magic-effects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { RoleGuard } from "@/components/auth/RoleGuard";

export default function AdminMenuPage() {
  return (
    <RoleGuard allowedRoles={["admin"]} pageName="จัดการเมนู">
      <AdminMenuContent />
    </RoleGuard>
  );
}

function AdminMenuContent() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const { toasts, toast, dismiss } = useToasts();

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

    const res = await fetch("/api/staff/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast(data?.message || "เพิ่มหมวดหมู่ไม่สำเร็จ", "bad");
      return;
    }

    setNewCategoryName("");
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("ลบหมวดนี้? เมนูในหมวดจะถูกลบไปด้วย")) return;

    const res = await fetch(`/api/staff/categories?id=${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      toast(data?.message || "ลบหมวดหมู่ไม่สำเร็จ", "bad");
      return;
    }

    if (data.deletedItems > 0) {
      toast(`ลบหมวดหมู่แล้ว พร้อมเมนู ${data.deletedItems} รายการ`, "ok");
    }
    load();
  };

  const saveItem = async () => {
    if (!editingItem) return;

    const payload = {
      id: editingItem.id,
      name: editingItem.name,
      category_id: editingItem.category_id,
      description: editingItem.description ?? null,
      price: Number(editingItem.price),
      image_url: editingItem.image_url ?? null,
      is_available: editingItem.is_available ?? true,
      display_order: editingItem.display_order ?? 0,
    };

    const res = await fetch("/api/staff/menu", {
      method: editingItem.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast(data?.message || "บันทึกเมนูไม่สำเร็จ", "bad");
      return;
    }

    setEditingItem(null);
    load();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("ลบเมนูนี้?")) return;

    const res = await fetch(`/api/staff/menu?id=${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      toast(data?.message || "ลบเมนูไม่สำเร็จ", "bad");
      return;
    }

    toast("ลบเมนูแล้ว", "ok");
    load();
  };

  const toggleAvailable = async (item: MenuItem) => {
    try {
      const res = await fetch("/api/staff/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_available: !item.is_available }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast(data?.message || "เปลี่ยนสถานะเมนูไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "bad");
        return;
      }

      toast(
        item.is_available
          ? `ปิด "${item.name}" ชั่วคราว — ลูกค้าจะสั่งไม่ได้`
          : `เปิด "${item.name}" ให้บริการแล้ว`,
        "ok"
      );
      load();
    } catch {
      toast("เกิดข้อผิดพลาดในการเปลี่ยนสถานะเมนู", "bad");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas relative overflow-hidden flex items-center justify-center">
        <GradientBlob className="top-[-100px] left-[-100px]" color="bg-brand/10" />
        <GradientBlob className="bottom-[-100px] right-[-100px]" color="bg-accent/10" delay={1} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-accent-deep flex items-center justify-center shadow-2xl shadow-brand/30"
        >
          <Utensils className="text-white" size={28} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas relative overflow-x-clip">
      {/* Background blobs */}
      <GradientBlob className="top-[-100px] right-[-100px]" color="bg-brand/10" />
      <GradientBlob className="top-[40%] left-[-100px]" color="bg-accent/10" delay={3} />
      <GradientBlob className="bottom-[10%] right-[20%]" color="bg-warn/10" delay={5} />

      {/* Floating */}
      <FloatingElement className="top-32 right-12" delay={0}>
        <Utensils className="w-6 h-6 text-brand/40" />
      </FloatingElement>
      <FloatingElement className="bottom-32 left-12" delay={2}>
        <Sparkles className="w-5 h-6 text-accent/40" />
      </FloatingElement>

      <header className="sticky top-0 z-30 backdrop-blur-md bg-surface/80 border-b border-line">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/admin"
            className="w-9 h-9 rounded-lg hover:bg-brand-light flex items-center justify-center transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <BlurFade>
            <div className="flex items-center gap-2.5 flex-1">
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-accent-deep flex items-center justify-center shadow-md shadow-brand/30"
              >
                <ChefHat size={18} className="text-white" />
              </motion.div>
              <div>
                <h1 className="font-bold text-base leading-tight flex items-center gap-2">
                  จัดการเมนู
                  <PulseDot color="bg-brand" />
                </h1>
                <p className="text-xs text-stone-500">
                  {items.length} เมนู · {categories.length} หมวด
                </p>
              </div>
            </div>
          </BlurFade>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 pt-4 space-y-6">
        {/* Categories */}
        <BlurFade delay={0.1}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 sm:p-5">
              <h2 className="font-bold mb-3 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-brand to-accent" />
                หมวดเมนู
              </h2>
              <div className="flex flex-wrap gap-2 mb-3">
                <AnimatePresence>
                  {categories.map((c, idx) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: idx * 0.05 }}
                      className="px-3 py-1.5 rounded-full bg-gradient-to-r from-brand-light to-accent-light border border-line flex items-center gap-2 text-sm font-medium hover-lift"
                    >
                      {c.name}
                      <button
                        onClick={() => deleteCategory(c.id)}
                        aria-label={`ลบหมวด ${c.name}`}
                        className="w-6 h-6 rounded-full hover:bg-bad-light text-ink-muted hover:text-bad-text flex items-center justify-center transition"
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <div className="flex gap-2">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="เพิ่มหมวดใหม่..."
                  className="flex-1 px-3 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition"
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                />
                <Button
                  onClick={addCategory}
                  className="bg-gradient-to-r from-brand to-accent-deep hover:from-brand-dark hover:to-accent-deep shadow-md shadow-brand/30"
                >
                  <Plus size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </BlurFade>

        {/* Items */}
        <BlurFade delay={0.2}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-gradient-to-b from-brand to-accent-deep" />
                  รายการอาหาร
                </h2>
                <Button
                  onClick={() =>
                    setEditingItem({
                      category_id: categories[0]?.id,
                      is_available: true,
                      display_order: items.length,
                    })
                  }
                  disabled={categories.length === 0}
                  size="sm"
                  className="bg-gradient-to-r from-brand to-accent hover:from-brand-dark hover:to-accent-dark shadow-md shadow-brand/30"
                >
                  <Plus size={14} className="mr-1" /> เพิ่มเมนู
                </Button>
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {items.map((it, idx) => (
                    <motion.div
                      key={it.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.03 }}
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center gap-3 p-3 border border-stone-200 rounded-xl hover:border-brand/40 hover:shadow-md transition-all"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-brand-light to-accent-light rounded-lg flex items-center justify-center shrink-0">
                        {it.image_url ? (
                          <img
                            src={it.image_url}
                            alt={it.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <ImageIcon size={20} className="text-brand-text" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{it.name}</p>
                        <p className="text-xs text-stone-500">
                          {categories.find((c) => c.id === it.category_id)?.name} ·{" "}
                          <span className="font-semibold text-brand-dark">
                            {formatPrice(it.price)}
                          </span>
                        </p>
                      </div>
                      <Badge
                        variant={it.is_available ? "success" : "default"}
                        className={`cursor-pointer ${
                          it.is_available
                            ? "bg-ok-light text-ok-text border-ok"
                            : "bg-bad-light text-bad-text border-bad"
                        }`}
                        onClick={() => toggleAvailable(it)}
                        aria-pressed={it.is_available}
                        aria-label={
                          it.is_available
                            ? `ปิด ${it.name} ชั่วคราว`
                            : `เปิด ${it.name} ให้บริการ`
                        }
                      >
                        {it.is_available ? "เปิดขาย" : "ปิดชั่วคราว"}
                      </Badge>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setEditingItem(it)}
                        aria-label={`แก้ไขเมนู ${it.name}`}
                        className="w-9 h-9 flex items-center justify-center hover:bg-accent-light rounded-lg text-accent-dark"
                      >
                        <Edit2 size={14} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => deleteItem(it.id)}
                        aria-label={`ลบเมนู ${it.name}`}
                        className="w-9 h-9 flex items-center justify-center hover:bg-bad-light rounded-lg text-bad-text"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      </main>

      {/* Edit modal */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-accent-deep flex items-center justify-center shadow-md">
                  {editingItem.id ? (
                    <Edit2 className="w-5 h-5 text-white" />
                  ) : (
                    <Plus className="w-5 h-5 text-white" />
                  )}
                </div>
                <h3 className="font-bold text-lg">
                  {editingItem.id ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}
                </h3>
              </div>

              <div>
                <label className="text-sm text-stone-600 font-medium">หมวด</label>
                <select
                  value={editingItem.category_id ?? ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, category_id: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-stone-600 font-medium">ชื่อเมนู</label>
                <input
                  value={editingItem.name ?? ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, name: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition"
                />
              </div>
              <div>
                <label className="text-sm text-stone-600 font-medium">คำอธิบาย</label>
                <textarea
                  value={editingItem.description ?? ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, description: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm text-stone-600 font-medium">ราคา (บาท)</label>
                <input
                  type="number"
                  value={editingItem.price ?? ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, price: Number(e.target.value) })
                  }
                  className="w-full mt-1 px-3 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition"
                />
              </div>
              <div>
                <label className="text-sm text-stone-600 font-medium">
                  URL รูปภาพ (ถ้ามี)
                </label>
                <input
                  value={editingItem.image_url ?? ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, image_url: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition"
                  placeholder="https://..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setEditingItem(null)}>
                  ยกเลิก
                </Button>
                <Button
                  onClick={saveItem}
                  disabled={!editingItem.name || !editingItem.price}
                  className="bg-gradient-to-r from-brand to-accent-deep hover:from-brand-dark hover:to-accent-deep shadow-md shadow-brand/30"
                >
                  <Save size={14} className="mr-1" /> บันทึก
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <BottomTabBar />
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
