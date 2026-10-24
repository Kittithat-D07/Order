"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { Table } from "@/lib/types";
import {
  Plus,
  Download,
  Trash2,
  ArrowLeft,
  Copy,
  Check,
  QrCode as QrCodeIcon,
  Search,
  X,
  Maximize2,
  Printer,
  Edit2,
  Save,
  Package,
  Sparkles,
  Grid3x3,
} from "lucide-react";
import Link from "next/link";
import { generateQrToken } from "@/lib/utils";
import { BlurFade, GradientBlob, FloatingElement, PulseDot } from "@/components/ui/magic-effects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { RoleGuard } from "@/components/auth/RoleGuard";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export default function AdminTablesPage() {
  return (
    <RoleGuard allowedRoles={["admin"]} pageName="จัดการโต๊ะ">
      <AdminTablesContent />
    </RoleGuard>
  );
}

function AdminTablesContent() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zoomedTable, setZoomedTable] = useState<Table | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ใช้ origin ปัจจุบันเสมอ
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  // Toast helper
  const showToast = (message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("tables")
      .select("*")
      .order("table_number");
    setTables(data ?? []);
    setLoading(false);

    if (data) {
      const qrMap: Record<string, string> = {};
      for (const t of data) {
        const url = `${baseUrl}/menu?table=${t.qr_token}`;
        qrMap[t.id] = await QRCode.toDataURL(url, {
          width: 400,
          margin: 2,
          color: { dark: "#1c1917", light: "#ffffff" },
        });
      }
      setQrImages(qrMap);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // กรองตาม search
  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables;
    const q = searchQuery.toLowerCase();
    return tables.filter((t) =>
      t.table_number.toLowerCase().includes(q) ||
      t.qr_token.toLowerCase().includes(q)
    );
  }, [tables, searchQuery]);

  const addTable = async () => {
    if (!newTableNumber.trim()) {
      showToast("กรุณากรอกชื่อโต๊ะ", "error");
      return;
    }

    // เช็คซ้ำ
    if (tables.some((t) => t.table_number === newTableNumber.trim())) {
      showToast("มีโต๊ะนี้อยู่แล้ว", "error");
      return;
    }

    const supabase = createClient();
    const token = generateQrToken();
    const { error } = await supabase.from("tables").insert({
      table_number: newTableNumber.trim(),
      qr_token: token,
    });
    if (error) {
      showToast("เพิ่มโต๊ะไม่สำเร็จ: " + error.message, "error");
    } else {
      setNewTableNumber("");
      showToast(`เพิ่มโต๊ะ ${newTableNumber} สำเร็จ`, "success");
      load();
    }
  };

  const deleteTable = async (id: string) => {
    const table = tables.find((t) => t.id === id);
    if (!confirm(`ลบโต๊ะ ${table?.table_number}?`)) return;
    const supabase = createClient();

    await supabase.from("orders").delete().eq("table_id", id);
    const { error } = await supabase.from("tables").delete().eq("id", id);
    if (error) {
      showToast("ลบไม่สำเร็จ: " + error.message, "error");
    } else {
      showToast(`ลบโต๊ะ ${table?.table_number} แล้ว`, "success");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      load();
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`ลบโต๊ะ ${selectedIds.size} โต๊ะ?`)) return;

    const supabase = createClient();
    const ids = Array.from(selectedIds);

    // ลบ orders ที่เกี่ยวข้อง
    await supabase.from("orders").delete().in("table_id", ids);
    // ลบโต๊ะ
    const { error } = await supabase.from("tables").delete().in("id", ids);

    if (error) {
      showToast("ลบไม่สำเร็จ: " + error.message, "error");
    } else {
      showToast(`ลบ ${ids.length} โต๊ะสำเร็จ`, "success");
      setSelectedIds(new Set());
      load();
    }
  };

  const downloadQR = (table: Table) => {
    const dataUrl = qrImages[table.id];
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-table-${table.table_number}.png`;
    a.click();
    showToast(`ดาวน์โหลด QR ${table.table_number} แล้ว`, "success");
  };

  const downloadAllQR = () => {
    let count = 0;
    for (const t of tables) {
      const dataUrl = qrImages[t.id];
      if (dataUrl) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `qr-table-${t.table_number}.png`;
        a.click();
        count++;
      }
    }
    showToast(`ดาวน์โหลด QR ทั้งหมด ${count} โต๊ะ`, "success");
  };

  const copyUrl = async (table: Table) => {
    const url = `${baseUrl}/menu?table=${table.qr_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(table.id);
      setTimeout(() => setCopiedId(null), 1500);
      showToast("คัดลอก URL แล้ว", "success");
    } catch {
      showToast("คัดลอกไม่ได้", "error");
    }
  };

  const startEdit = (table: Table) => {
    setEditingId(table.id);
    setEditingName(table.table_number);
  };

  const saveEdit = async (id: string) => {
    if (!editingName.trim()) {
      showToast("กรุณากรอกชื่อโต๊ะ", "error");
      return;
    }

    if (tables.some((t) => t.id !== id && t.table_number === editingName.trim())) {
      showToast("มีชื่อโต๊ะนี้อยู่แล้ว", "error");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("tables")
      .update({ table_number: editingName.trim() })
      .eq("id", id);

    if (error) {
      showToast("แก้ไขไม่สำเร็จ: " + error.message, "error");
    } else {
      showToast("แก้ไขสำเร็จ", "success");
      setEditingId(null);
      load();
    }
  };

  const printQR = (table: Table) => {
    const dataUrl = qrImages[table.id];
    if (!dataUrl) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>QR - ${table.table_number}</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
            h1 { font-size: 64px; margin: 20px; font-weight: 900; }
            img { width: 400px; height: 400px; }
            p { font-family: monospace; font-size: 12px; color: #666; word-break: break-all; max-width: 400px; text-align: center; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>โต๊ะ ${table.table_number}</h1>
          <img src="${dataUrl}" />
          <p>${baseUrl}/menu?table=${table.qr_token}</p>
          <button onclick="window.print()" style="margin-top:20px;padding:10px 20px;font-size:16px;cursor:pointer;">พิมพ์</button>
        </body>
      </html>
    `);
    w.document.close();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTables.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTables.map((t) => t.id)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas relative overflow-hidden flex flex-col items-center justify-center gap-3">
        <GradientBlob className="top-[-100px] left-[-100px]" color="bg-brand/10" />
        <GradientBlob className="bottom-[-100px] right-[-100px]" color="bg-accent/10" delay={1} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-accent flex items-center justify-center shadow-2xl shadow-brand/30"
        >
          <QrCodeIcon className="text-white" size={28} />
        </motion.div>
        <div className="flex items-center gap-2">
          <PulseDot color="bg-brand" />
          <p className="text-sm text-stone-600 font-medium">กำลังโหลดโต๊ะ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-canvas relative overflow-hidden">
      {/* Background blobs */}
      <GradientBlob className="top-[-100px] right-[-100px]" color="bg-brand/10" />
      <GradientBlob className="top-[40%] left-[-100px]" color="bg-accent/10" delay={3} />
      <GradientBlob className="bottom-[10%] right-[20%]" color="bg-warn/10" delay={5} />

      {/* Floating */}
      <FloatingElement className="top-32 right-12" delay={0}>
        <Grid3x3 className="w-6 h-6 text-brand/40" />
      </FloatingElement>
      <FloatingElement className="bottom-32 left-12" delay={2}>
        <Sparkles className="w-5 h-6 text-accent/40" />
      </FloatingElement>

      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/admin"
            className="w-9 h-9 rounded-lg hover:bg-stone-200/60 flex items-center justify-center transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center shadow-md">
              <QrCodeIcon size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">จัดการโต๊ะ & QR</h1>
              <p className="text-xs text-stone-500">
                {tables.length} โต๊ะ {selectedIds.size > 0 && `• เลือก ${selectedIds.size}`}
              </p>
            </div>
          </div>
          {tables.length > 0 && (
            <button
              onClick={downloadAllQR}
              className="btn-primary px-3 py-2 rounded-xl text-xs hidden sm:flex"
              title="ดาวน์โหลด QR ทั้งหมด"
            >
              <Download size={14} /> ทั้งหมด
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {/* Add Table */}
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-accent flex items-center justify-center">
              <Plus size={14} className="text-white" />
            </div>
            <h2 className="font-bold text-sm">เพิ่มโต๊ะใหม่</h2>
          </div>
          <div className="flex gap-2">
            <input
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              placeholder="เช่น T05, A1, B2"
              className="input flex-1"
              onKeyDown={(e) => e.key === "Enter" && addTable()}
            />
            <button
              onClick={addTable}
              className="btn-primary px-5 py-3 rounded-xl whitespace-nowrap"
            >
              <Plus size={16} /> เพิ่ม
            </button>
          </div>
        </div>

        {/* Search & Bulk Actions */}
        {tables.length > 0 && (
          <div className="card p-3 flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาโต๊ะ..."
                className="input pl-9 pr-9 py-2 text-sm w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-stone-200 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={toggleSelectAll}
              className="text-xs px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 transition whitespace-nowrap"
            >
              {selectedIds.size === filteredTables.length && filteredTables.length > 0
                ? "ยกเลิกเลือก"
                : "เลือกทั้งหมด"}
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={deleteSelected}
                className="text-xs px-3 py-2 rounded-xl bg-bad-light border border-bad/40 text-bad-text hover:bg-bad/20 transition flex items-center gap-1.5 whitespace-nowrap"
              >
                <Trash2 size={14} /> ลบ {selectedIds.size} โต๊ะ
              </button>
            )}
          </div>
        )}

        {/* Tables Grid */}
        {tables.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-brand-light flex items-center justify-center">
              <QrCodeIcon size={28} className="text-brand" />
            </div>
            <p className="font-semibold text-stone-700">ยังไม่มีโต๊ะ</p>
            <p className="text-sm text-stone-500 mt-1">เพิ่มโต๊ะแรกเพื่อสร้าง QR Code</p>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-stone-500">ไม่พบโต๊ะที่ค้นหา</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredTables.map((t) => {
              const url = `${baseUrl}/menu?table=${t.qr_token}`;
              const isSelected = selectedIds.has(t.id);
              const isEditing = editingId === t.id;

              return (
                <motion.div
                  key={t.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ y: -4 }}
                  className={`card-interactive overflow-hidden transition-all ${
                    isSelected ? "ring-2 ring-brand ring-offset-2" : ""
                  }`}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-br from-brand to-accent p-3 text-white flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">
                        Table
                      </p>
                      {isEditing ? (
                        <input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(t.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xl font-bold leading-tight bg-white/20 border border-white/40 rounded px-2 py-1 outline-none w-full mt-0.5"
                          autoFocus
                        />
                      ) : (
                        <h3 className="text-2xl font-bold leading-tight">
                          {t.table_number}
                        </h3>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(t.id);
                      }}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition shrink-0 ${
                        isSelected
                          ? "bg-white border-white"
                          : "border-white/60 hover:border-white"
                      }`}
                    >
                      {isSelected && (
                        <Check size={14} className="text-brand" strokeWidth={3} />
                      )}
                    </button>
                  </div>

                  {/* QR */}
                  <div className="p-4 flex flex-col items-center">
                    {qrImages[t.id] ? (
                      <button
                        onClick={() => setZoomedTable(t)}
                        className="relative group"
                      >
                        <div className="absolute -inset-2 bg-gradient-to-br from-brand-light to-accent-light rounded-2xl blur opacity-50 group-hover:opacity-75 transition" />
                        <img
                          src={qrImages[t.id]}
                          alt={`QR for ${t.table_number}`}
                          className="relative w-44 h-44 border border-stone-200 rounded-xl bg-white"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                            <Maximize2 size={16} className="text-white" />
                          </div>
                        </div>
                      </button>
                    ) : (
                      <div className="w-44 h-44 skeleton rounded-xl" />
                    )}

                    {/* URL */}
                    <button
                      onClick={() => copyUrl(t)}
                      className="mt-3 w-full text-[11px] text-stone-500 font-mono break-all bg-stone-50 hover:bg-stone-100 rounded-lg px-2 py-1.5 transition flex items-center justify-center gap-1.5"
                      title="คลิกเพื่อคัดลอก"
                    >
                      {copiedId === t.id ? (
                        <>
                          <Check size={12} className="text-ok-text shrink-0" />
                          <span className="text-ok-text font-semibold">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} className="shrink-0" />
                          <span className="truncate">{url}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    <button
                      onClick={() => downloadQR(t)}
                      className="btn-primary flex-1 py-2.5 rounded-xl text-sm"
                    >
                      <Download size={14} /> ดาวน์โหลด
                    </button>
                    <button
                      onClick={() => printQR(t)}
                      className="w-11 h-auto rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 flex items-center justify-center transition active:scale-95"
                      title="พิมพ์"
                    >
                      <Printer size={14} />
                    </button>
                    {isEditing ? (
                      <button
                        onClick={() => saveEdit(t.id)}
                        className="w-11 h-auto rounded-xl bg-ok-light border border-ok/40 text-ok-text flex items-center justify-center transition active:scale-95"
                        title="บันทึก"
                      >
                        <Save size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => startEdit(t)}
                        className="w-11 h-auto rounded-xl border border-stone-200 hover:bg-accent-light hover:border-accent/40 text-stone-500 hover:text-accent-dark flex items-center justify-center transition active:scale-95"
                        title="แก้ไขชื่อ"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteTable(t.id)}
                      className="w-11 h-auto rounded-xl border border-stone-200 hover:bg-bad-light hover:border-bad/40 text-stone-500 hover:text-bad-text flex items-center justify-center transition active:scale-95"
                      title="ลบโต๊ะ"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>

      {/* Zoom Modal */}
      {zoomedTable && (
        <div
          onClick={() => setZoomedTable(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`QR โต๊ะ ${zoomedTable.table_number}`}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">
                  Table
                </p>
                <h2 className="text-3xl font-bold">{zoomedTable.table_number}</h2>
              </div>
              <button
                onClick={() => setZoomedTable(null)}
                aria-label="ปิด"
                className="w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            {qrImages[zoomedTable.id] && (
              <img
                src={qrImages[zoomedTable.id]}
                alt={`QR for ${zoomedTable.table_number}`}
                className="w-full border border-stone-200 rounded-2xl"
              />
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => downloadQR(zoomedTable)}
                className="btn-primary flex-1 py-3 rounded-xl"
              >
                <Download size={16} /> ดาวน์โหลด
              </button>
              <button
                onClick={() => printQR(zoomedTable)}
                className="btn-secondary px-5 py-3 rounded-xl"
              >
                <Printer size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg font-medium text-sm pointer-events-auto animate-slide-up ${
              t.type === "success"
                ? "bg-ok text-white"
                : t.type === "error"
                ? "bg-bad text-white"
                : "bg-ink text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
      <BottomTabBar />
    </div>
  );
}
