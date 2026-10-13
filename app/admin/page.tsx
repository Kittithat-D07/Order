"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useStaffSession } from "@/hooks/useStaffSession";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { LogOut, Settings, Sparkles } from "lucide-react";
import { BlurFade, GradientBlob, FloatingElement, PulseDot } from "@/components/ui/magic-effects";
import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { RoleGuard } from "@/components/auth/RoleGuard";

function AdminContent() {
  const router = useRouter();
  const { session, logout } = useStaffSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 relative overflow-x-hidden">
      <GradientBlob className="top-[-150px] right-[-100px] w-72 h-72 sm:w-96 sm:h-96" color="bg-purple-300/30" />
      <GradientBlob className="top-[40%] left-[-100px] w-72 h-72 sm:w-96 sm:h-96" color="bg-pink-300/30" delay={2} />
      <GradientBlob className="bottom-[-100px] right-[30%] w-72 h-72 sm:w-96 sm:h-96" color="bg-rose-300/30" delay={4} />

      <FloatingElement className="top-24 left-4 sm:left-12" delay={0}>
        <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400/50" />
      </FloatingElement>
      <FloatingElement className="top-40 right-4 sm:right-16" delay={1}>
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400/50" />
      </FloatingElement>

      <header
        className="sticky top-0 z-30 backdrop-blur-md bg-white/90 border-b border-purple-200/50 shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top, 0)" }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-2 flex items-center justify-between gap-2">
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-2.5 min-w-0">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0"
              >
                <Settings size={20} className="sm:hidden" />
                <Settings size={18} className="hidden sm:block" />
              </motion.div>
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-base sm:text-sm text-stone-800 flex items-center gap-2">
                  <span className="truncate">ผู้จัดการ</span>
                  <PulseDot color="bg-purple-500" />
                </h1>
                <p className="text-[11px] sm:text-[10px] text-stone-500 truncate">
                  {session?.displayName}
                </p>
              </div>
            </div>
          </BlurFade>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-sm sm:text-xs font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition flex items-center gap-1.5 shrink-0"
          >
            <LogOut size={15} className="sm:hidden" />
            <LogOut size={13} className="hidden sm:block" />
            <span>ออก</span>
          </motion.button>
        </div>
      </header>

      <main className="relative z-10 pb-24 sm:pb-20">
        <AdminDashboard />
      </main>

      <BottomTabBar />
    </div>
  );
}

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={["admin"]} pageName="หน้าจัดการ">
      <AdminContent />
    </RoleGuard>
  );
}
