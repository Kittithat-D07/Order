import Link from "next/link";
import { ChefHat, QrCode, Sparkles, ArrowRight, Smartphone, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -left-32 w-72 h-72 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative max-w-md mx-auto px-6 pt-16 pb-12 sm:max-w-2xl">
        {/* Hero Icon */}
        <div className="flex justify-center mb-8 animate-scale-in">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500 rounded-3xl blur-2xl opacity-40" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
              <ChefHat size={40} className="text-white" strokeWidth={2.2} />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-12 animate-slide-down">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium mb-4">
            <Sparkles size={12} />
            ระบบสั่งอาหารอัจฉริยะ
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            ร้านอาหาร<br />
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              QR Order
            </span>
          </h1>
          <p className="text-stone-600 text-base sm:text-lg max-w-sm mx-auto">
            ลูกค้าสแกน QR เพื่อดูเมนูและสั่งอาหาร<br />
            ร้านรับออร์เดอร์แบบเรียลไทม์
          </p>
        </div>

        {/* Action Cards */}
        <div className="space-y-3 mb-12">
          <Link
            href="/menu?table=t01-demo-aaaa"
            className="card-interactive group block p-5 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
                <Smartphone size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">ทดสอบหน้าลูกค้า</h3>
                <p className="text-sm text-stone-500">สแกน QR โต๊ะ T01</p>
              </div>
              <ArrowRight
                size={20}
                className="text-stone-400 group-hover:translate-x-1 transition-transform"
              />
            </div>
          </Link>

          <Link
            href="/admin"
            className="card-interactive group block p-5 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center shadow-md">
                <Zap size={22} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">แดชบอร์ดร้าน</h3>
                <p className="text-sm text-stone-500">จัดการเมนู ออร์เดอร์ โต๊ะ</p>
              </div>
              <ArrowRight
                size={20}
                className="text-stone-400 group-hover:translate-x-1 transition-transform"
              />
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="card p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-orange-100 flex items-center justify-center">
              <QrCode size={20} className="text-orange-600" />
            </div>
            <p className="text-xs font-medium text-stone-700">QR ต่อโต๊ะ</p>
          </div>
          <div className="card p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-amber-100 flex items-center justify-center">
              <Zap size={20} className="text-amber-600" />
            </div>
            <p className="text-xs font-medium text-stone-700">เรียลไทม์</p>
          </div>
        </div>

        {/* Demo hint */}
        <p className="text-center text-xs text-stone-400">
          สำหรับทดสอบ: <code className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-600">/menu?table=t01-demo-aaaa</code>
        </p>
      </div>
    </main>
  );
}
