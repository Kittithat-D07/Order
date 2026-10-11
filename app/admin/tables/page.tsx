"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { Table } from "@/lib/types";
import { Plus, Download, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { generateQrToken } from "@/lib/utils";

export default function AdminTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("tables")
      .select("*")
      .order("table_number");
    setTables(data ?? []);
    setLoading(false);

    // สร้าง QR สำหรับทุกโต๊ะ
    if (data) {
      const qrMap: Record<string, string> = {};
      for (const t of data) {
        const url = `${baseUrl}/menu?table=${t.qr_token}`;
        qrMap[t.id] = await QRCode.toDataURL(url, { width: 256, margin: 2 });
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
    if (!confirm("ลบโต๊ะนี้? ออร์เดอร์ทั้งหมดจะถูกลบด้วย")) return;
    const supabase = createClient();
    await supabase.from("tables").delete().eq("id", id);
    load();
  };

  const downloadQR = (table: Table) => {
    const dataUrl = qrImages[table.id];
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${table.table_number}.png`;
    a.click();
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
          <h1 className="font-bold text-lg">จัดการโต๊ะ & QR Code</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        <section className="bg-white rounded-lg p-4">
          <h2 className="font-bold mb-3">เพิ่มโต๊ะใหม่</h2>
          <div className="flex gap-2">
            <input
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              placeholder="เช่น T05"
              className="flex-1 px-3 py-2 border border-stone-300 rounded-lg"
              onKeyDown={(e) => e.key === "Enter" && addTable()}
            />
            <button
              onClick={addTable}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg flex items-center gap-1"
            >
              <Plus size={16} /> เพิ่ม
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-lg p-4 text-center border"
            >
              <h3 className="font-bold text-lg mb-1">โต๊ะ {t.table_number}</h3>
              <p className="text-xs text-stone-500 mb-3 font-mono break-all">
                {baseUrl}/menu?table={t.qr_token}
              </p>
              {qrImages[t.id] && (
                <img
                  src={qrImages[t.id]}
                  alt={`QR for ${t.table_number}`}
                  className="w-40 h-40 mx-auto border border-stone-200 rounded"
                />
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => downloadQR(t)}
                  className="flex-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded text-sm flex items-center justify-center gap-1"
                >
                  <Download size={14} /> ดาวน์โหลด
                </button>
                <button
                  onClick={() => deleteTable(t.id)}
                  className="px-3 py-1.5 border border-stone-300 hover:bg-stone-100 text-red-500 rounded text-sm"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
