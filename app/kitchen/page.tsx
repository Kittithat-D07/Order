"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useStaffSession } from "@/hooks/useStaffSession";
import { KitchenView } from "@/components/staff/KitchenView";
import { LogOut, ChefHat, Sparkles, ArrowLeft } from "lucide-react";
import { BlurFade, GradientBlob, FloatingElement, PulseDot } from "@/components/ui/magic-effects";
import { Button } from "@/components/ui/button";
import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { StaffNameModal } from "@/components/auth/StaffNameModal";

function KitchenContent() {
  const router = useRouter();
  const { session, logout } = useStaffSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 relative overflow-x-hidden">
      {/* Background blobs */}
      <GradientBlob className="top-[-150px] left-[-100px] w-72 h-72 sm:w-96 sm:h-96" color="bg-orange-300/30" />
      <GradientBlob className="top-[30%] right-[-100px] w-72 h-72 sm:w-96 sm:h-96" color="bg-red-300/30" delay={2} />
      <GradientBlob className="bottom-[-100px] left-[30%] w-72 h-72 sm:w-96 sm:h-96" color="bg-amber-300/30" delay={4} />

      {/* Floating */}
      <FloatingElement className="top-24 right-4 sm:right-12" delay={0}>
        <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-orange-400/50" />
      </FloatingElement>
      <FloatingElement className="top-40 left-4 sm:left-12" delay={1}>
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400/50" />
      </FloatingElement>

      {/* Header (ครัว) - ชิดบนสุด */}
      <header
        className="sticky top-0 z-30 bg-gradient-to-r from-orange-500/95 via-amber-500/95 to-orange-500/95 text-white shadow-lg shadow-orange-500/30"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-2.5 sm:pb-2 pt-2 flex items-center justify-between gap-2">
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-2.5 min-w-0">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-lg shrink-0"
              >
                <ChefHat size={20} strokeWidth={2.2} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-base font-bold flex items-center gap-2">
                  <span className="truncate">หน้าจอครัว</span>
                  <PulseDot color="bg-white" />
                </h1>
                <p className="text-[10px] sm:text-[10px] opacity-90 truncate">
                  {session?.displayName} • จัดการออร์เดอร์
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
            className="px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-sm sm:text-xs font-medium bg-white/20 hover:bg-white/30 active:bg-white/40 text-white border border-white/30 flex items-center gap-1.5 shrink-0"
          >
            <LogOut size={15} className="sm:hidden" />
            <LogOut size={13} className="hidden sm:block" />
            <span>ออก</span>
          </motion.button>
        </div>
      </header>

      <main className="relative z-10 pb-24 sm:pb-20">
        <KitchenView />
      </main>

      <BottomTabBar />
      <StaffNameModal />
    </div>
  );
}

export default function KitchenPage() {
  return (
    <RoleGuard allowedRoles={["kitchen", "admin"]} pageName="หน้าจอครัว">
      <KitchenContent />
    </RoleGuard>
  );
}
