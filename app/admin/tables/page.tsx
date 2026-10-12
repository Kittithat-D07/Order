"use client";

import { useEffect, useState } from "react";
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
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { generateQrToken } from "@/lib/utils";

export default function AdminTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ใช้ origin ปัจจุบันเสมอ → สแกน QR แล้วเปิดได้จากทุกที่
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

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

  const addTable = async () => {
    if (!newTableNumber.trim()) return;
    const supabase = createClient();
    const token = generateQrToken();
    const { error } = await supabase.from("tables").insert({
      table_number: newTableNumber.trim(),
      qr_token: token,
    });
    if (error) {
      alert("เพิ่มโต๊ะไม่สำเร็จ: " + error.message);
    } else {
      setNewTableNumber("");
      load();
    }
  };

  const deleteTable = async (id: string) => {
    if (!confirm("ลบโต๊ะนี้?")) return;
    const supabase = createClient();

    // ลบ orders ที่เกี่ยวข้องก่อน
    await supabase.from("orders").delete().eq("table_id", id);

    // ลบโต๊ะ
    const { error } = await supabase.from("tables").delete().eq("id", id);
    if (error) {
      alert("ลบไม่สำเร็จ: " + error.message);
    } else {
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
  };

  const copyUrl = async (table: Table) => {
    const url = `${baseUrl}/menu?table=${table.qr_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(table.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      alert("คัดลอกไม่ได้");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 animate-pulse" />
        <p className="text-sm text-stone-500">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b border-stone-200/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/admin"
            className="w-9 h-9 rounded-lg hover:bg-stone-200/60 flex items-center justify-center transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
              <QrCodeIcon size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">จัดการโต๊ะ & QR</h1>
              <p className="text-xs text-stone-500">{tables.length} โต๊ะ</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {/* Add Table */}
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-orange-500" />
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
            <button onClick={addTable} className="btn-primary px-5 py-3 rounded-xl">
              <Plus size={16} /> เพิ่ม
            </button>
          </div>
        </div>

        {/* Tables Grid */}
        {tables.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-orange-100 flex items-center justify-center">
              <QrCodeIcon size={28} className="text-orange-500" />
            </div>
            <p className="font-semibold text-stone-700">ยังไม่มีโต๊ะ</p>
            <p className="text-sm text-stone-500 mt-1">เพิ่มโต๊ะแรกเพื่อสร้าง QR Code</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((t) => {
              const url = `${baseUrl}/menu?table=${t.qr_token}`;
              return (
                <div
                  key={t.id}
                  className="card-interactive overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-3 text-white text-center">
                    <p className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">
                      Table
                    </p>
                    <h3 className="text-2xl font-bold leading-tight">
                      {t.table_number}
                    </h3>
                  </div>

                  {/* QR */}
                  <div className="p-4 flex flex-col items-center">
                    {qrImages[t.id] ? (
                      <div className="relative">
                        <div className="absolute -inset-2 bg-gradient-to-br from-orange-200 to-amber-200 rounded-2xl blur opacity-50" />
                        <img
                          src={qrImages[t.id]}
                          alt={`QR for ${t.table_number}`}
                          className="relative w-44 h-44 border border-stone-200 rounded-xl bg-white"
                        />
                      </div>
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
                          <Check size={12} className="text-green-600 shrink-0" />
                          <span className="text-green-600 font-semibold">คัดลอกแล้ว</span>
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
                      onClick={() => deleteTable(t.id)}
                      className="w-11 h-auto rounded-xl border border-stone-200 hover:bg-red-50 hover:border-red-200 text-stone-500 hover:text-red-600 flex items-center justify-center transition active:scale-95"
                      title="ลบโต๊ะ"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
