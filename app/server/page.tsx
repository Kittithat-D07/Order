"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStaffSession } from "@/hooks/useStaffSession";
import { ServerView } from "@/components/staff/ServerView";
import { LogOut, Utensils, Sparkles, Star } from "lucide-react";
import { BlurFade, GradientBlob, FloatingElement, PulseDot } from "@/components/ui/magic-effects";
import { Button } from "@/components/ui/button";

export default function ServerPage() {
  const { session, hydrated, logout, quickLogin } = useStaffSession();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (hydrated) {
      if (session && (session.role === "server" || session.role === "admin")) {
        setAuthed(true);
      } else {
        // เข้าหน้านี้ได้เลยโดยไม่ต้อง login
        quickLogin("server");
        setAuthed(true);
      }
    }
  }, [hydrated, session, quickLogin]);

  if (!hydrated) return null;
  if (!authed) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 relative overflow-hidden">
      {/* Background blobs */}
      <GradientBlob className="top-[-150px] right-[-100px]" color="bg-blue-300/30" />
      <GradientBlob className="top-[40%] left-[-100px]" color="bg-cyan-300/30" delay={2} />
      <GradientBlob className="bottom-[-100px] right-[30%]" color="bg-sky-300/30" delay={4} />

      {/* Floating */}
      <FloatingElement className="top-20 left-12" delay={0}>
        <Utensils className="w-7 h-7 text-blue-400/50" />
      </FloatingElement>
      <FloatingElement className="top-40 right-16" delay={1}>
        <Sparkles className="w-5 h-5 text-cyan-400/50" />
      </FloatingElement>
      <FloatingElement className="bottom-32 left-16" delay={2}>
        <Star className="w-6 h-6 text-sky-400/50" />
      </FloatingElement>

      <header className="sticky top-0 z-30 backdrop-blur-md bg-gradient-to-r from-blue-500/95 via-cyan-500/95 to-blue-500/95 text-white shadow-lg shadow-blue-500/30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg"
              >
                <Utensils size={26} strokeWidth={2.2} />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  หน้าจอเสริฟ์
                  <PulseDot color="bg-white" />
                </h1>
                <p className="text-xs opacity-90">
                  {session?.displayName} {session?.role === "admin" && "• (ผู้จัดการ)"}
                </p>
              </div>
            </div>
          </BlurFade>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={logout}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
            >
              <LogOut size={14} className="mr-1.5" /> ออก
            </Button>
          </motion.div>
        </div>
      </header>

      <main className="relative z-10">
        <ServerView />
      </main>
    </div>
  );
}
