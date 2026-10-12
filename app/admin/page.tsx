"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStaffSession } from "@/hooks/useStaffSession";
import { StaffLogin } from "@/components/staff/StaffLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { LogOut, ChefHat, Utensils, Settings, Sparkles, BarChart3 } from "lucide-react";
import Link from "next/link";
import { BlurFade, GradientBlob, FloatingElement, PulseDot } from "@/components/ui/magic-effects";

export default function AdminPage() {
  const { session, hydrated, logout } = useStaffSession();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (hydrated && session && (session.role === "admin" || session.role === "server")) {
      setAuthed(true);
    }
  }, [hydrated, session]);

  if (!hydrated) return null;

  if (!authed) {
    return <StaffLogin onSuccess={() => setAuthed(true)} />;
  }

  const navItems = [
    { href: "/kitchen", icon: ChefHat, label: "ครัว", color: "hover:bg-orange-50 hover:text-orange-700" },
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

      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-purple-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/30"
              >
                <Settings size={20} />
              </motion.div>
              <div>
                <h1 className="font-bold text-base text-stone-800 flex items-center gap-2">
                  ผู้จัดการ
                  <PulseDot color="bg-purple-500" />
                </h1>
                <p className="text-[10px] text-stone-500">{session?.displayName}</p>
              </div>
            </div>
          </BlurFade>

          <nav className="flex items-center gap-1 flex-wrap">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 ${item.color} transition flex items-center gap-1.5`}
                  >
                    <Icon size={14} /> {item.label}
                  </Link>
                </motion.div>
              );
            })}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition flex items-center gap-1.5"
            >
              <LogOut size={14} /> ออก
            </motion.button>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <AdminDashboard />
      </main>
    </div>
  );
}
