"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStaffSession } from "@/hooks/useStaffSession";
import { KitchenView } from "@/components/staff/KitchenView";
import {
  LogOut,
  ChefHat,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Utensils,
  Pizza,
  LayoutGrid,
  BarChart3,
} from "lucide-react";
import { BlurFade, GradientBlob, FloatingElement, PulseDot } from "@/components/ui/magic-effects";
import { Button } from "@/components/ui/button";

export default function KitchenDonePage() {
  const router = useRouter();
  const { session, hydrated, logout, quickLogin } = useStaffSession();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (hydrated) {
      if (session && session.role === "kitchen") {
        setAuthed(true);
      } else {
        quickLogin("kitchen");
        setAuthed(true);
      }
    }
  }, [hydrated, session, quickLogin]);

  if (!hydrated) return null;
  if (!authed) return null;

  const navItems = [
    { href: "/kitchen", icon: ChefHat, label: "ครัว (กำลังทำ)", color: "hover:bg-amber-50 hover:text-amber-700" },
    { href: "/kitchen/done", icon: CheckCircle2, label: "ครัว (เสร็จแล้ว)", color: "hover:bg-blue-50 hover:text-blue-700" },
    { href: "/server", icon: Utensils, label: "เสิร์ฟ", color: "hover:bg-blue-50 hover:text-blue-700" },
    { href: "/admin/menu", icon: Pizza, label: "เมนู", color: "hover:bg-green-50 hover:text-green-700" },
    { href: "/admin/tables", icon: LayoutGrid, label: "โต๊ะ", color: "hover:bg-orange-50 hover:text-orange-700" },
    { href: "/admin/orders", icon: BarChart3, label: "ประวัติ", color: "hover:bg-purple-50 hover:text-purple-700" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 relative overflow-hidden">
      {/* Background blobs */}
      <GradientBlob className="top-[-150px] right-[-100px]" color="bg-blue-300/30" />
      <GradientBlob className="top-[30%] left-[-100px]" color="bg-cyan-300/30" delay={2} />
      <GradientBlob className="bottom-[-100px] left-[30%]" color="bg-sky-300/30" delay={4} />

      {/* Floating */}
      <FloatingElement className="top-20 right-12" delay={0}>
        <CheckCircle2 className="w-7 h-7 text-blue-400/50" />
      </FloatingElement>
      <FloatingElement className="top-40 left-12" delay={1}>
        <Sparkles className="w-6 h-6 text-cyan-400/50" />
      </FloatingElement>

      {/* Header (ครัว-เสร็จแล้ว) - ชิดขอบบน */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-gradient-to-r from-blue-500/95 via-cyan-500/95 to-blue-500/95 text-white shadow-lg shadow-blue-500/30">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-2.5">
              <Link href="/kitchen">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg"
                >
                  <ArrowLeft size={18} className="text-white" />
                </motion.div>
              </Link>
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <CheckCircle2 size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold flex items-center gap-2 text-white">
                  ครัว - เสร็จแล้ว
                  <PulseDot color="bg-white" />
                </h1>
                <p className="text-[10px] text-white/90">
                  {session?.displayName} • ออร์เดอร์ที่เสริฟ์นำไปแล้ว
                </p>
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
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm flex items-center gap-1.5"
          >
            <LogOut size={13} /> ออก
          </motion.button>
        </div>
      </header>

      {/* Nav bar - ชิดขอบบน แยกออกมา */}
      <nav className="sticky top-[53px] z-20 backdrop-blur-md bg-white/80 border-b border-blue-200/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + idx * 0.04 }}
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
        <KitchenView mode="done" />
      </main>
    </div>
  );
}
