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
import { COLORS, ROLE_COLORS } from "@/lib/theme";

/** The server role wears the deep-clay accent — a different depth of the same
 *  terracotta family, never a stock hue. */
const SERVER = ROLE_COLORS.server;

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

  // The realtime pill reports what the subscription actually says — never a
  // hardcoded "online", which would lie during a network drop.
  useEffect(() => {
    setLastUpdate(new Date());
  }, []);

  return (
    <div className="min-h-screen relative overflow-x-clip" style={{ background: COLORS.bg }}>
      {/* Decorative leaves */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="leaf-deco text-7xl pointer-events-none fixed"
        style={{ top: "120px", right: "20px", color: SERVER.light, opacity: 0.35, zIndex: 0 }}
      >
        🌿
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="leaf-deco text-6xl pointer-events-none fixed"
        style={{ top: "400px", left: "15px", color: SERVER.base, opacity: 0.16, zIndex: 0 }}
      >
        🍃
      </motion.div>

      {/* Header - STICKY TOP-0 ALWAYS */}
      <header
        className="sticky top-0 z-50 text-white"
        style={{
          background: `linear-gradient(135deg, ${SERVER.base} 0%, ${SERVER.dark} 100%)`,
          boxShadow: "0 8px 24px -4px rgba(92, 36, 16, 0.3)"
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
            onClick={async () => {
              // Await the logout so the server clears the session cookie
              // before we navigate — otherwise the middleware would still
              // see a valid session and bounce the user straight back.
              await logout();
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
              realtimeStatus === "online" ? "bg-ok" : realtimeStatus === "offline" ? "bg-bad" : "bg-warn"
            }`}>
              {realtimeStatus === "online" && (
                <span className="absolute inset-0 rounded-full bg-ok animate-ping opacity-75" />
              )}
            </span>
            <span className="font-medium">
              {realtimeStatus === "online" && "🟢 อัปเดตอัตโนมัติ (ทุก 3 วิ)"}
              {realtimeStatus === "offline" && "🔴 ขาดการเชื่อมต่อ — กำลังลองใหม่..."}
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
