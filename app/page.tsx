import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">ร้านอาหาร QR Order</h1>
      <p className="text-stone-600 mb-8 max-w-md">
        ระบบสั่งอาหารผ่าน QR Code ที่โต๊ะ<br />
        ลูกค้าสแกน QR เพื่อดูเมนูและสั่งอาหาร ร้านรับออร์เดอร์แบบเรียลไทม์
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/menu?table=t01-demo-aaaa"
          className="px-6 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition"
        >
          ทดสอบหน้าลูกค้า (โต๊ะ T01)
        </Link>
        <Link
          href="/admin"
          className="px-6 py-3 rounded-lg border border-stone-300 hover:bg-stone-100 font-medium transition"
        >
          เข้าสู่แดชบอร์ดร้าน
        </Link>
      </div>
      <p className="text-xs text-stone-400 mt-12">
        สำหรับทดสอบ: <code>/menu?table=t01-demo-aaaa</code> ... <code>t04-demo-dddd</code>
      </p>
    </main>
  );
}
