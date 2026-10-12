"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStaffSession } from "@/hooks/useStaffSession";
import { KitchenView } from "@/components/staff/KitchenView";
import { createClient } from "@/lib/supabase/client";
import { LogOut, ChefHat, Flame, Sparkles } from "lucide-react";
import { BlurFade, GradientBlob, FloatingElement, PulseDot } from "@/components/ui/magic-effects";
import { Button } from "@/components/ui/button";

export default function KitchenPage() {
  const { session, hydrated, logout, quickLogin } = useStaffSession();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (hydrated) {
      if (session && session.role === "kitchen") {
        setAuthed(true);
      } else {
        // เข้าหน้านี้ได้เลยโดยไม่ต้อง login
        quickLogin("kitchen");
        setAuthed(true);
      }
    }
  }, [hydrated, session, quickLogin]);

  if (!hydrated) return null;
  if (!authed) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 relative overflow-hidden">
      {/* Background blobs */}
      <GradientBlob className="top-[-150px] left-[-100px]" color="bg-orange-300/30" />
      <GradientBlob className="top-[30%] right-[-100px]" color="bg-red-300/30" delay={2} />
      <GradientBlob className="bottom-[-100px] left-[30%]" color="bg-amber-300/30" delay={4} />

      {/* Floating */}
      <FloatingElement className="top-20 right-12" delay={0}>
        <Flame className="w-7 h-7 text-orange-400/50" />
      </FloatingElement>
      <FloatingElement className="top-40 left-12" delay={1}>
        <Sparkles className="w-5 h-5 text-amber-400/50" />
      </FloatingElement>
      <FloatingElement className="bottom-32 right-16" delay={2}>
        <ChefHat className="w-6 h-6 text-red-400/50" />
      </FloatingElement>

      <header className="sticky top-0 z-30 backdrop-blur-md bg-gradient-to-r from-orange-500/95 via-amber-500/95 to-orange-500/95 text-white shadow-lg shadow-orange-500/30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg"
              >
                <ChefHat size={26} strokeWidth={2.2} />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  หน้าจอครัว
                  <PulseDot color="bg-white" />
                </h1>
                <p className="text-xs opacity-90">
                  {session?.displayName} • จัดการออร์เดอร์เข้าครัว
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
        <KitchenView />
      </main>
    </div>
  );
}
