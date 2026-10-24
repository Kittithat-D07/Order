"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStaffSession } from "@/hooks/useStaffSession";
import { KitchenView } from "@/components/staff/KitchenView";
import { LogOut, CheckCircle2, ArrowLeft, Sparkles } from "lucide-react";
import { BlurFade, GradientBlob, FloatingElement, PulseDot } from "@/components/ui/magic-effects";
import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { RoleGuard } from "@/components/auth/RoleGuard";

function KitchenDoneContent() {
  const router = useRouter();
  const { session, logout } = useStaffSession();

  return (
    <div className="min-h-screen bg-canvas relative overflow-x-hidden">
      <GradientBlob className="top-[-150px] right-[-100px] w-72 h-72 sm:w-96 sm:h-96" color="bg-ok/10" />
      <GradientBlob className="top-[30%] left-[-100px] w-72 h-72 sm:w-96 sm:h-96" color="bg-accent/10" delay={2} />
      <GradientBlob className="bottom-[-100px] left-[30%] w-72 h-72 sm:w-96 sm:h-96" color="bg-brand/10" delay={4} />

      <FloatingElement className="top-24 right-4 sm:right-12" delay={0}>
        <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-ok/40" />
      </FloatingElement>
      <FloatingElement className="top-40 left-4 sm:left-12" delay={1}>
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-accent/40" />
      </FloatingElement>

      {/* Header (ครัว-เสร็จ) - ชิดบนสุด */}
      <header
        className="sticky top-0 z-30 bg-gradient-to-r from-ok to-ok-text text-white shadow-lg shadow-ok/20"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-2.5 sm:pb-2 pt-2 flex items-center justify-between gap-2">
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-2.5 min-w-0">
              <Link href="/kitchen" className="shrink-0">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg"
                >
                  <ArrowLeft size={18} className="text-white" />
                </motion.div>
              </Link>
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-lg shrink-0">
                <CheckCircle2 size={20} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold flex items-center gap-2">
                  <span className="truncate">ครัว - เสร็จแล้ว</span>
                  <PulseDot color="bg-white" />
                </h1>
                <p className="text-[10px] opacity-90 truncate">
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
            className="px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-sm sm:text-xs font-medium bg-white/20 hover:bg-white/30 active:bg-white/40 text-white border border-white/30 flex items-center gap-1.5 shrink-0"
          >
            <LogOut size={15} className="sm:hidden" />
            <LogOut size={13} className="hidden sm:block" />
            <span>ออก</span>
          </motion.button>
        </div>
      </header>

      <main className="relative z-10 pb-32 sm:pb-32">
        <KitchenView mode="done" />
      </main>

      <BottomTabBar />
    </div>
  );
}

export default function KitchenDonePage() {
  return (
    <RoleGuard allowedRoles={["kitchen"]} pageName="หน้าจอครัว (เสร็จแล้ว)">
      <KitchenDoneContent />
    </RoleGuard>
  );
}
