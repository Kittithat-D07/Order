import Link from "next/link";
import { OrderBoard } from "@/components/admin/OrderBoard";
import { ChefHat, Utensils, Table as TableIcon, History } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="text-brand-500" size={24} />
            <div>
              <h1 className="font-bold text-lg">แดชบอร์ดร้านอาหาร</h1>
              <p className="text-xs text-stone-500">จัดการออร์เดอร์แบบเรียลไทม์</p>
            </div>
          </div>
          <nav className="flex gap-1 text-sm">
            <Link
              href="/admin/menu"
              className="px-3 py-1.5 rounded hover:bg-stone-100 flex items-center gap-1"
            >
              <Utensils size={14} /> เมนู
            </Link>
            <Link
              href="/admin/tables"
              className="px-3 py-1.5 rounded hover:bg-stone-100 flex items-center gap-1"
            >
              <TableIcon size={14} /> โต๊ะ
            </Link>
            <Link
              href="/admin/orders"
              className="px-3 py-1.5 rounded hover:bg-stone-100 flex items-center gap-1"
            >
              <History size={14} /> ประวัติ
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <OrderBoard />
      </main>
    </div>
  );
}
