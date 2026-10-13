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
import { StaffNameModal } from "@/components/auth/StaffNameModal";

function AdminContent() {
  const router = useRouter();
  const { session, logout } = useStaffSession();

  return (
    <div className="min-h-screen bg-stone-50 overflow-x-hidden">
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50" />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <GradientBlob className="top-[-150px] right-[-100px] w-72 h-72 sm:w-96 sm:h-96" color="bg-purple-300/30" />
        <GradientBlob className="top-[40%] left-[-100px] w-72 h-72 sm:w-96 sm:h-96" color="bg-pink-300/30" delay={2} />
        <GradientBlob className="bottom-[-100px] right-[30%] w-72 h-72 sm:w-96 sm:h-96" color="bg-rose-300/30" delay={4} />
      </div>

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <FloatingElement className="top-32 left-4 sm:left-12" delay={0}>
          <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400/30" />
        </FloatingElement>
        <FloatingElement className="top-48 right-4 sm:right-16" delay={1}>
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400/30" />
        </FloatingElement>
      </div>

      {/* Header (ผู้จัดการ) - ติดบนสุดของจอเสมอ */}
      <header
        className="sticky top-0 z-50 bg-gradient-to-r from-purple-500/95 via-pink-500/95 to-rose-500/95 text-white shadow-lg shadow-purple-500/30 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-2 flex items-center justify-between gap-2">
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-2.5 min-w-0">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center shadow-lg shrink-0"
              >
                <Settings size={20} className="sm:hidden" />
                <Settings size={18} className="hidden sm:block" />
              </motion.div>
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-base sm:text-sm text-white flex items-center gap-2">
                  <span className="truncate">ผู้จัดการ</span>
                  <PulseDot color="bg-white" />
                </h1>
                <p className="text-[11px] sm:text-[10px] text-white/80 truncate">
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
            className="px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-sm sm:text-xs font-medium text-white bg-white/20 hover:bg-white/30 active:bg-white/40 transition flex items-center gap-1.5 shrink-0 border border-white/30"
          >
            <LogOut size={15} className="sm:hidden" />
            <LogOut size={13} className="hidden sm:block" />
            <span>ออก</span>
          </motion.button>
        </div>
      </header>

      <main className="relative z-10 pb-32 sm:pb-32">
        <AdminDashboard />
      </main>

      <BottomTabBar />
      <StaffNameModal />
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
