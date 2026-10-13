"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStaffSession } from "@/hooks/useStaffSession";
import { KitchenView } from "@/components/staff/KitchenView";
import { LogOut, ChefHat, CheckCircle2, ArrowLeft, Sparkles } from "lucide-react";
import { BlurFade, GradientBlob, FloatingElement, PulseDot } from "@/components/ui/magic-effects";
import { Button } from "@/components/ui/button";

export default function KitchenDonePage() {
  const router = useRouter();
  const { session, hydrated, logout, quickLogin } = useStaffSession();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (hydrated) {
      if (session && session.role === "kitchen") {
        setAuthed(true);
      } else {
        quickLogin("kitchen");
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
      <GradientBlob className="top-[30%] left-[-100px]" color="bg-cyan-300/30" delay={2} />
      <GradientBlob className="bottom-[-100px] left-[30%]" color="bg-sky-300/30" delay={4} />

      {/* Floating */}
      <FloatingElement className="top-20 right-12" delay={0}>
        <CheckCircle2 className="w-7 h-7 text-blue-400/50" />
      </FloatingElement>
      <FloatingElement className="top-40 left-12" delay={1}>
        <Sparkles className="w-6 h-6 text-cyan-400/50" />
      </FloatingElement>

      <header className="sticky top-0 z-30 backdrop-blur-md bg-gradient-to-r from-blue-500/95 via-cyan-500/95 to-blue-500/95 text-white shadow-lg shadow-blue-500/30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-2 flex-wrap">
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-3">
              <Link href="/kitchen">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-sm"
                >
                  <ArrowLeft size={18} className="text-stone-700" />
                </motion.div>
              </Link>
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <CheckCircle2 size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2 text-white">
                  หน้าจอครัว - เสร็จแล้ว
                  <PulseDot color="bg-white" />
                </h1>
                <p className="text-xs text-white/90">
                  {session?.displayName} • ออร์เดอร์ที่เสริฟ์นำไปแล้ว
                </p>
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                <LogOut size={14} className="mr-1.5" /> ออก
              </Button>
            </motion.div>
          </BlurFade>
      </header>

      <main className="relative z-10">
        <KitchenView mode="done" />
      </main>
    </div>
  );
}
