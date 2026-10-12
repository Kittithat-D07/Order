"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OrderWithItems, Bill } from "@/lib/types";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { Printer, ArrowLeft, CheckCircle2, Clock } from "lucide-react";

export default function BillPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = params.orderId;

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      // โหลด order
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_items(*)), tables(*)")
        .eq("id", orderId)
        .single();

      if (orderErr || !orderData) {
        setError("ไม่พบออร์เดอร์");
        setLoading(false);
        return;
      }
      setOrder(orderData as OrderWithItems);

      // โหลดบิล
      const { data: billData, error: billErr } = await supabase
        .from("bills")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (!billErr && billData) {
        setBill(billData as Bill);
      }
      setLoading(false);
    };

    load();

    // Subscribe to order changes
    const orderChannel = supabase
      .channel(`bill-order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newRow = payload.new as Partial<OrderWithItems>;
          setOrder((prev) =>
            prev ? ({ ...prev, ...newRow } as OrderWithItems) : prev
          );
        }
      )
      .subscribe();

    // Subscribe to bill changes
    const billChannel = supabase
      .channel(`bill-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bills",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setBill(payload.new as Bill);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(billChannel);
    };
  }, [orderId]);

  const handlePrint = async () => {
    if (bill && !bill.printed_at) {
      const supabase = createClient();
      await supabase
        .from("bills")
        .update({ printed_at: new Date().toISOString() })
        .eq("id", bill.id);
    }
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-500">กำลังโหลดบิล...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-stone-800 font-semibold mb-1">เกิดข้อผิดพลาด</p>
          <p className="text-stone-600 text-sm">{error ?? "ไม่พบออร์เดอร์"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 print:bg-white">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <div className="max-w-md mx-auto p-4 print:p-0">
        {/* Header (no print) */}
        <div className="no-print mb-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft size={14} /> กลับ
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600"
          >
            <Printer size={14} /> พิมพ์บิล
          </button>
        </div>

        {/* Bill Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="text-center mb-6 pb-4 border-b-2 border-dashed border-stone-300">
            <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <span className="text-2xl">🍜</span>
            </div>
            <h1 className="text-xl font-bold text-stone-900">ร้านอาหาร QR Order</h1>
            <p className="text-xs text-stone-500 mt-1">ใบเสร็จรับเงิน / Receipt</p>
          </div>

          {/* Bill Info */}
          <div className="space-y-1.5 text-sm mb-4 pb-4 border-b border-stone-200">
            <div className="flex justify-between">
              <span className="text-stone-500">เลขที่บิล:</span>
              <span className="font-mono font-semibold">
                {bill?.bill_number ?? "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">ออร์เดอร์:</span>
              <span className="font-mono text-stone-700">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">โต๊ะ:</span>
              <span className="font-semibold">{order.tables?.table_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">วันที่:</span>
              <span className="text-stone-700">{formatDateTime(bill?.requested_at ?? order.created_at)}</span>
            </div>
          </div>

          {/* Items */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-stone-700 mb-2">รายการ</h2>
            <div className="space-y-2">
              {order.order_items?.map((it) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <p className="text-stone-800">
                      {it.menu_items?.name ?? "(เมนูถูกลบ)"}
                    </p>
                    <p className="text-xs text-stone-500">
                      ฿{formatPrice(it.unit_price)} × {it.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-stone-800">
                    ฿{formatPrice(it.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="pt-4 border-t-2 border-dashed border-stone-300">
            <div className="flex justify-between items-baseline">
              <span className="text-base font-semibold text-stone-700">รวมทั้งหมด</span>
              <span className="text-2xl font-bold text-orange-600">
                ฿{formatPrice(order.total_amount)}
              </span>
            </div>
          </div>

          {/* Print Status */}
          {bill?.printed_at && (
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-green-600">
              <CheckCircle2 size={12} />
              <span>พิมพ์เมื่อ {formatDateTime(bill.printed_at)}</span>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-stone-200 text-center text-xs text-stone-400">
            <p>🙏 ขอบคุณที่ใช้บริการ</p>
            <p className="mt-1">Thank you for your visit</p>
          </div>
        </div>

        {/* Status (no print) */}
        {!bill && (
          <div className="no-print mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <p className="font-semibold mb-1">⏳ กำลังรอเปิดบิล</p>
            <p className="text-xs">กดปุ่ม "ขอบิล" ในหน้าออร์เดอร์ หรือรอให้ทางร้านเปิดบิลให้</p>
          </div>
        )}
      </div>
    </div>
  );
}
