import Link from "next/link";
import { ChefHat, QrCode, Sparkles, ArrowRight, Smartphone, Zap, Monitor, Utensils, Settings } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-stone-50">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -left-32 w-72 h-72 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative max-w-md mx-auto px-6 pt-12 pb-12 sm:max-w-2xl">
        {/* Hero Icon */}
        <div className="flex justify-center mb-6 animate-scale-in">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500 rounded-3xl blur-2xl opacity-40" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
              <ChefHat size={40} className="text-white" strokeWidth={2.2} />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-10 animate-slide-down">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium mb-3">
            <Sparkles size={12} />
            ระบบจัดการร้านอาหาร
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2">
            ร้านอาหาร<br />
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              QR Order
            </span>
          </h1>
          <p className="text-stone-600 text-sm sm:text-base">
            เลือกบทบาทของคุณเพื่อเริ่มใช้งาน
          </p>
        </div>

        {/* Staff Roles */}
        <div className="space-y-3 mb-6">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider px-1">
            👨‍🍳 สำหรับพนักงาน
          </div>

          <Link
            href="/kitchen"
            className="card-interactive group block p-4 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-md">
                <ChefHat size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">หน้าจอครัว</h3>
                <p className="text-sm text-stone-500">ดูออร์เดอร์ ทำอาหาร</p>
              </div>
              <ArrowRight
                size={20}
                className="text-stone-400 group-hover:translate-x-1 transition-transform"
              />
            </div>
          </Link>

          <Link
            href="/server"
            className="card-interactive group block p-4 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                <Utensils size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">หน้าจอเสริฟ์</h3>
                <p className="text-sm text-stone-500">เสิร์ฟอาหาร จัดการโต๊ะ</p>
              </div>
              <ArrowRight
                size={20}
                className="text-stone-400 group-hover:translate-x-1 transition-transform"
              />
            </div>
          </Link>

          <Link
            href="/admin"
            className="card-interactive group block p-4 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center shadow-md">
                <Settings size={22} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">ผู้จัดการ / แอดมิน</h3>
                <p className="text-sm text-stone-500">จัดการเมนู โต๊ะ รายงาน</p>
              </div>
              <ArrowRight
                size={20}
                className="text-stone-400 group-hover:translate-x-1 transition-transform"
              />
            </div>
          </Link>
        </div>

        {/* Customer Section */}
        <div className="space-y-3 mb-8">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider px-1">
            📱 สำหรับลูกค้า
          </div>

          <Link
            href="/menu?table=t01-demo-aaaa"
            className="card-interactive group block p-4 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md">
                <Smartphone size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">สแกน QR โต๊ะ T01 (ทดสอบ)</h3>
                <p className="text-sm text-stone-500">ดูเมนูและสั่งอาหาร</p>
              </div>
              <ArrowRight
                size={20}
                className="text-stone-400 group-hover:translate-x-1 transition-transform"
              />
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="card p-3 text-center">
            <div className="w-9 h-9 mx-auto mb-1.5 rounded-xl bg-orange-100 flex items-center justify-center">
              <QrCode size={18} className="text-orange-600" />
            </div>
            <p className="text-xs font-medium text-stone-700">QR ต่อโต๊ะ</p>
          </div>
          <div className="card p-3 text-center">
            <div className="w-9 h-9 mx-auto mb-1.5 rounded-xl bg-amber-100 flex items-center justify-center">
              <Zap size={18} className="text-amber-600" />
            </div>
            <p className="text-xs font-medium text-stone-700">เรียลไทม์</p>
          </div>
          <div className="card p-3 text-center">
            <div className="w-9 h-9 mx-auto mb-1.5 rounded-xl bg-blue-100 flex items-center justify-center">
              <Monitor size={18} className="text-blue-600" />
            </div>
            <p className="text-xs font-medium text-stone-700">3 หน้าจอ</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1">
          <p className="text-xs text-stone-400">
            🔐 PIN: <span className="font-mono text-stone-600">1234</span> (ครัว) · <span className="font-mono text-stone-600">5678</span> (เสริฟ์) · <span className="font-mono text-stone-600">0000</span> (แอดมิน)
          </p>
          <p className="text-xs text-stone-400">
            v1.0 · ระบบสั่งอาหารผ่าน QR
          </p>
        </div>
      </div>
    </main>
  );
}
