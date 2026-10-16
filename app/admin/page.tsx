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
import { cn } from "@/lib/utils";

const ADMIN_COLORS = {
  primary: "#B85C38",
  primaryDark: "#8B3F1A",
  primaryLight: "#F4DCC4",
  secondary: "#6B7B5F",
  secondaryDark: "#4A5942",
  secondaryLight: "#DDE3D2",
  accent: "#C8932F",
  accentLight: "#F0D78C",
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  text: "#2C2620",
  textMuted: "#6B5F54",
};

function AdminContent() {
  const router = useRouter();
  const { session, logout } = useStaffSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 overflow-x-hidden">
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-stone-100 via-stone-50 to-stone-100" />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute top-[-150px] right-[-100px] w-72 h-72 sm:w-96 sm:h-96 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${ADMIN_COLORS.primaryLight} 0%, transparent 70%)` }}
        />
        <div
          className="absolute top-[40%] left-[-100px] w-72 h-72 sm:w-96 sm:h-96 rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${ADMIN_COLORS.secondaryLight} 0%, transparent 70%)`, animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-[-100px] right-[30%] w-72 h-72 sm:w-96 sm:h-96 rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${ADMIN_COLORS.accentLight} 0%, transparent 70%)`, animationDelay: "4s" }}
        />
      </div>

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <FloatingElement className="top-32 left-4 sm:left-12" delay={0}>
          <Settings className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: ADMIN_COLORS.secondary, opacity: 0.3 }} />
        </FloatingElement>
        <FloatingElement className="top-48 right-4 sm:right-16" delay={1}>
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: ADMIN_COLORS.accent, opacity: 0.3 }} />
        </FloatingElement>
      </div>

      {/* Header (ผู้จัดการ) */}
      <header
        className={cn(
          "sticky top-0 z-50 text-white",
          "transition-all duration-300 ease-out",
          scrolled
            ? "shadow-2xl backdrop-blur-xl border-b"
            : "shadow-lg backdrop-blur-md"
        )}
        style={{ 
          background: `linear-gradient(135deg, ${ADMIN_COLORS.primary} 0%, ${ADMIN_COLORS.accent} 100%)`,
          borderColor: "rgba(255,255,255,0.1)"
        }}
      >
        <div
          className={cn(
            "max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between gap-2 transition-all duration-300",
            scrolled ? "py-1.5 sm:py-1" : "py-2.5 sm:py-2"
          )}
        >
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-2.5 min-w-0">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className={cn(
                  "rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center shadow-lg shrink-0 transition-all duration-300",
                  scrolled ? "w-8 h-8" : "w-10 h-10 sm:w-9 sm:h-9"
                )}
              >
                <Settings size={scrolled ? 16 : 20} className="sm:hidden" />
                <Settings size={scrolled ? 14 : 18} className="hidden sm:block" />
              </motion.div>
              <div className="min-w-0 flex-1">
                <h1 className={cn(
                  "font-bold text-white flex items-center gap-2 transition-all duration-300",
                  scrolled ? "text-sm sm:text-xs" : "text-base sm:text-sm"
                )}>
                  <span className="truncate">ผู้จัดการ</span>
                  <PulseDot color="bg-white" />
                </h1>
                <p className={cn(
                  "text-white/80 truncate transition-all duration-300",
                  scrolled ? "text-[10px] sm:hidden" : "text-[11px] sm:text-[10px]"
                )}>
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
              router.push("/");
            }}
            className={cn(
              "rounded-lg font-medium text-white bg-white/20 hover:bg-white/30 active:bg-white/40 transition-all flex items-center gap-1.5 shrink-0 border border-white/30",
              scrolled ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 sm:px-2.5 sm:py-1.5 text-sm sm:text-xs"
            )}
          >
            <LogOut size={scrolled ? 12 : 15} className="sm:hidden" />
            <LogOut size={scrolled ? 11 : 13} className="hidden sm:block" />
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
