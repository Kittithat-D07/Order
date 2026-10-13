"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useStaffSession } from "@/hooks/useStaffSession";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { LogOut, ChefHat, Utensils, Settings, Sparkles, BarChart3, LayoutGrid, Pizza } from "lucide-react";
import Link from "next/link";
import { BlurFade, GradientBlob, FloatingElement, PulseDot } from "@/components/ui/magic-effects";

export default function AdminPage() {
  const router = useRouter();
  const { session, hydrated, logout, quickLogin } = useStaffSession();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (hydrated) {
      if (session && (session.role === "admin" || session.role === "server")) {
        setAuthed(true);
      } else {
        // เข้าหน้านี้ได้เลยโดยไม่ต้อง login
        quickLogin("admin");
        setAuthed(true);
      }
    }
  }, [hydrated, session, quickLogin]);

  if (!hydrated) return null;
  if (!authed) return null;

  const navItems = [
    { href: "/admin/tables", icon: LayoutGrid, label: "โต๊ะ", color: "hover:bg-orange-50 hover:text-orange-700" },
    { href: "/admin/menu", icon: Pizza, label: "เมนู", color: "hover:bg-green-50 hover:text-green-700" },
    { href: "/kitchen", icon: ChefHat, label: "ครัว", color: "hover:bg-amber-50 hover:text-amber-700" },
    { href: "/server", icon: Utensils, label: "เสริฟ์", color: "hover:bg-blue-50 hover:text-blue-700" },
    { href: "/admin/orders", icon: BarChart3, label: "ประวัติ", color: "hover:bg-purple-50 hover:text-purple-700" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 relative overflow-hidden">
      {/* Background blobs */}
      <GradientBlob className="top-[-150px] right-[-100px]" color="bg-purple-300/30" />
      <GradientBlob className="top-[40%] left-[-100px]" color="bg-pink-300/30" delay={2} />
      <GradientBlob className="bottom-[-100px] right-[30%]" color="bg-rose-300/30" delay={4} />

      {/* Floating */}
      <FloatingElement className="top-20 left-12" delay={0}>
        <Settings className="w-7 h-7 text-purple-400/50" />
      </FloatingElement>
      <FloatingElement className="top-40 right-16" delay={1}>
        <Sparkles className="w-5 h-5 text-pink-400/50" />
      </FloatingElement>

      {/* Header (ผู้จัดการ) - อยู่บนสุด ชิดขอบบน */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-purple-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/30"
              >
                <Settings size={18} />
              </motion.div>
              <div>
                <h1 className="font-bold text-sm text-stone-800 flex items-center gap-2">
                  ผู้จัดการ
                  <PulseDot color="bg-purple-500" />
                </h1>
                <p className="text-[10px] text-stone-500">{session?.displayName}</p>
              </div>
            </div>
          </BlurFade>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition flex items-center gap-1.5"
          >
            <LogOut size={13} /> ออก
          </motion.button>
        </div>
      </header>

      {/* Nav bar (โต๊ะ/เมนู/ครัว/...) - แยกออกมา ชิดขอบบน ไม่ wrap */}
      <nav className="sticky top-[57px] z-20 backdrop-blur-md bg-white/70 border-b border-purple-200/40">
        <div className="max-w-7xl mx-auto px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 ${item.color} transition flex items-center gap-1.5 whitespace-nowrap`}
                >
                  <Icon size={13} /> {item.label}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </nav>

      <main className="relative z-10">
        <AdminDashboard />
      </main>
    </div>
  );
}
