import Link from "next/link";
import { OrderBoard } from "@/components/admin/OrderBoard";
import { ChefHat, Utensils, Table as TableIcon, History } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md group-hover:scale-105 transition">
                <ChefHat size={18} className="text-white" strokeWidth={2.2} />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-base leading-tight">แดชบอร์ด</h1>
                <p className="text-xs text-stone-500">จัดการออร์เดอร์เรียลไทม์</p>
              </div>
            </Link>
            <nav className="flex gap-1 bg-stone-100/80 p-1 rounded-xl">
              <Link
                href="/admin/menu"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-white hover:shadow-sm transition flex items-center gap-1.5"
              >
                <Utensils size={14} /> เมนู
              </Link>
              <Link
                href="/admin/tables"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-white hover:shadow-sm transition flex items-center gap-1.5"
              >
                <TableIcon size={14} /> โต๊ะ
              </Link>
              <Link
                href="/admin/orders"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-white hover:shadow-sm transition flex items-center gap-1.5"
              >
                <History size={14} /> ประวัติ
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5">
        <OrderBoard />
      </main>
    </div>
  );
}
