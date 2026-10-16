"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useStaffSession } from "@/hooks/useStaffSession";
import { ServerView } from "@/components/staff/ServerView";
import { LogOut, Utensils, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { StaffNameModal } from "@/components/auth/StaffNameModal";

const SERVER_COLORS = {
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
  success: "#4F7942",
};

function ServerContent() {
  const router = useRouter();
  const { session, logout } = useStaffSession();
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Listen for realtime status changes from ServerView via custom event
  useEffect(() => {
    const onStatus = (e: any) => {
      setRealtimeStatus(e.detail.status);
      if (e.detail.lastUpdate) setLastUpdate(new Date(e.detail.lastUpdate));
    };
    window.addEventListener("server-realtime-status", onStatus);
    return () => window.removeEventListener("server-realtime-status", onStatus);
  }, []);

  // Default to online for SSR consistency, then update
  useEffect(() => {
    setRealtimeStatus("online");
    setLastUpdate(new Date());
  }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: SERVER_COLORS.bg }}>
      {/* Decorative leaves */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="leaf-deco text-7xl pointer-events-none fixed"
        style={{ top: "120px", right: "20px", color: SERVER_COLORS.secondary, opacity: 0.1, zIndex: 0 }}
      >
        🌿
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="leaf-deco text-6xl pointer-events-none fixed"
        style={{ top: "400px", left: "15px", color: SERVER_COLORS.accent, opacity: 0.08, zIndex: 0 }}
      >
        🍃
      </motion.div>

      {/* Header - STICKY TOP-0 ALWAYS */}
      <header
        className="sticky top-0 z-50 text-white"
        style={{
          background: `linear-gradient(135deg, ${SERVER_COLORS.primary} 0%, ${SERVER_COLORS.accent} 100%)`,
          boxShadow: "0 8px 24px -4px rgba(184, 92, 56, 0.3)"
        }}
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-4 pt-2.5 pb-2 flex items-center justify-between gap-2">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2.5 min-w-0"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shrink-0"
              style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)" }}
            >
              <Utensils size={18} className="text-white" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <h1
                className="text-base font-bold flex items-center gap-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                <span className="truncate">หน้าจอเสริฟ์</span>
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-white shrink-0"
                />
              </h1>
              <p className="text-[10px] opacity-90 truncate">
                {session?.displayName}
              </p>
            </div>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0"
            style={{
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.2)"
            }}
          >
            <LogOut size={13} />
            <span>ออก</span>
          </motion.button>
        </div>

        {/* Realtime status - ALWAYS visible in header */}
        <div
          className="px-3 sm:px-4 pb-2 flex items-center justify-between text-[10px]"
          style={{ background: "rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center gap-1.5 max-w-3xl mx-auto w-full">
            <span className={`relative flex w-2 h-2 rounded-full shrink-0 ${
              realtimeStatus === "online" ? "bg-green-400" : realtimeStatus === "offline" ? "bg-red-400" : "bg-amber-400"
            }`}>
              {realtimeStatus === "online" && (
                <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
              )}
            </span>
            <span className="font-medium">
              {realtimeStatus === "online" && "🟢 Realtime เชื่อมต่ออยู่"}
              {realtimeStatus === "offline" && "🔴 Realtime ขาดการเชื่อมต่อ"}
              {realtimeStatus === "connecting" && "🟡 กำลังเชื่อมต่อ..."}
            </span>
            {lastUpdate && (
              <>
                <span className="opacity-50">•</span>
                <span className="opacity-90">
                  อัปเดต {lastUpdate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 pb-32 sm:pb-32 pt-3">
        <ServerView />
      </main>

      <BottomTabBar />
      <StaffNameModal />
    </div>
  );
}

export default function ServerPage() {
  return (
    <RoleGuard allowedRoles={["server", "admin"]} pageName="หน้าจอเสริฟ์">
      <ServerContent />
    </RoleGuard>
  );
}
