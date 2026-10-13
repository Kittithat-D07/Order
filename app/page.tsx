"use client";

import { motion } from "framer-motion";
import { ChefHat, Utensils, Settings, Sparkles, ArrowRight } from "lucide-react";
import { useStaffSession, StaffRole } from "@/hooks/useStaffSession";
import { BlurFade, GradientBlob, FloatingElement } from "@/components/ui/magic-effects";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface RoleOption {
  role: StaffRole;
  icon: typeof ChefHat;
  title: string;
  subtitle: string;
  gradient: string;
  shadowColor: string;
  hoverColor: string;
  emoji: string;
}

const roleOptions: RoleOption[] = [
  {
    role: "kitchen",
    icon: ChefHat,
    title: "พนักงานครัว",
    subtitle: "ดูออร์เดอร์ที่เข้าครัว ทำอาหาร",
    gradient: "from-orange-500 to-amber-500",
    shadowColor: "shadow-orange-500/40",
    hoverColor: "hover:border-orange-400",
    emoji: "👨‍🍳",
  },
  {
    role: "server",
    icon: Utensils,
    title: "พนักงานเสิร์ฟ",
    subtitle: "รับออร์เดอร์ เสิร์ฟอาหาร",
    gradient: "from-blue-500 to-cyan-500",
    shadowColor: "shadow-blue-500/40",
    hoverColor: "hover:border-blue-400",
    emoji: "🍽️",
  },
  {
    role: "admin",
    icon: Settings,
    title: "ผู้จัดการ",
    subtitle: "จัดการเมนู โต๊ะ และรายงาน",
    gradient: "from-purple-500 to-pink-500",
    shadowColor: "shadow-purple-500/40",
    hoverColor: "hover:border-purple-400",
    emoji: "👔",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { quickLogin, session, hydrated } = useStaffSession();
  const [loading, setLoading] = useState<StaffRole | null>(null);

  // ถ้า login แล้ว → redirect ไปหน้าที่เหมาะสม
  useEffect(() => {
    if (!hydrated) return;
    if (!session) return; // ยังไม่ login → อยู่หน้านี้

    const roleMap: Record<StaffRole, string> = {
      kitchen: "/kitchen",
      server: "/server",
      admin: "/admin",
    };
    router.replace(roleMap[session.role]);
  }, [hydrated, session, router]);

  const handleSelectRole = (role: StaffRole) => {
    setLoading(role);
    quickLogin(role);

    setTimeout(() => {
      const roleMap: Record<StaffRole, string> = {
        kitchen: "/kitchen",
        server: "/server",
        admin: "/admin",
      };
      router.push(roleMap[role]);
    }, 300);
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-stone-200 border-t-orange-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background blobs */}
      <GradientBlob className="top-[-150px] left-[-100px] w-96 h-96" color="bg-orange-300/40" />
      <GradientBlob className="top-[20%] right-[-100px] w-96 h-96" color="bg-rose-300/40" delay={2} />
      <GradientBlob className="bottom-[-100px] left-[20%] w-96 h-96" color="bg-amber-300/40" delay={4} />

      {/* Floating */}
      <FloatingElement className="top-20 left-8" delay={0}>
        <Sparkles className="w-8 h-8 text-orange-400/40" />
      </FloatingElement>
      <FloatingElement className="bottom-32 right-12" delay={1}>
        <Sparkles className="w-6 h-6 text-rose-400/40" />
      </FloatingElement>

      <div className="max-w-md w-full relative z-10">
        {/* Header */}
        <BlurFade delay={0.1}>
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500 flex items-center justify-center shadow-2xl shadow-orange-500/40"
            >
              <span className="text-4xl">🍜</span>
            </motion.div>
            <h1 className="text-3xl font-bold text-stone-800 mb-2">
              ยินดีต้อนรับ
            </h1>
            <p className="text-stone-600 text-sm">
              เลือกบทบาทของคุณเพื่อเริ่มต้นใช้งาน
            </p>
          </div>
        </BlurFade>

        {/* Role cards */}
        <div className="space-y-3">
          {roleOptions.map((option, idx) => {
            const Icon = option.icon;
            const isLoading = loading === option.role;
            return (
              <BlurFade key={option.role} delay={0.2 + idx * 0.1}>
                <motion.button
                  onClick={() => handleSelectRole(option.role)}
                  disabled={!!loading}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full text-left rounded-2xl border-2 border-stone-200 bg-white p-4 shadow-md hover:shadow-xl transition-all duration-200 ${option.hoverColor} ${isLoading ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${option.gradient} flex items-center justify-center ${option.shadowColor} shadow-lg`}
                    >
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                        />
                      ) : (
                        <Icon size={24} className="text-white" />
                      )}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{option.emoji}</span>
                        <h3 className="font-bold text-stone-800">{option.title}</h3>
                      </div>
                      <p className="text-sm text-stone-500">{option.subtitle}</p>
                    </div>
                    {!isLoading && (
                      <motion.div
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowRight size={20} className="text-stone-400" />
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              </BlurFade>
            );
          })}
        </div>

        {/* Demo link */}
        <BlurFade delay={0.6}>
          <motion.a
            href="/demo"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-6 w-full text-center block rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-4 text-stone-500 text-sm hover:bg-stone-100 transition-colors"
          >
            ดู UI Demo (ไม่ต้อง login)
          </motion.a>
        </BlurFade>
      </div>
    </div>
  );
}
