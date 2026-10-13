"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, Utensils, Settings, Sparkles, ArrowRight, Lock, X } from "lucide-react";
import { useStaffSession, StaffRole } from "@/hooks/useStaffSession";
import { BlurFade, GradientBlob, FloatingElement } from "@/components/ui/magic-effects";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
    subtitle: "จัดการเมนู โต๊ะ รายงาน (ต้องใส่ PIN)",
    gradient: "from-purple-500 to-pink-500",
    shadowColor: "shadow-purple-500/40",
    hoverColor: "hover:border-purple-400",
    emoji: "👔",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { quickLogin, login, session, hydrated } = useStaffSession();
  const [loading, setLoading] = useState<StaffRole | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

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

  const handleSelectRole = async (role: StaffRole) => {
    // Admin ต้องใส่ PIN
    if (role === "admin") {
      setShowPinModal(true);
      setPin("");
      setPinError("");
      return;
    }

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

  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      setPinError("PIN ต้องมีอย่างน้อย 4 หลัก");
      return;
    }

    setPinLoading(true);
    setPinError("");

    const result = await login("admin", pin);

    if (!result.ok) {
      setPinError(result.error || "PIN ไม่ถูกต้อง");
      setPin("");
      setPinLoading(false);
      return;
    }

    setShowPinModal(false);
    setPinLoading(false);
    router.push("/admin");
  };

  const handlePinKeyPress = (digit: string) => {
    if (pin.length >= 6) return;
    setPin((prev) => prev + digit);
    setPinError("");
  };

  const handlePinDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError("");
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
                        {option.role === "admin" && (
                          <Lock size={12} className="text-purple-500" />
                        )}
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

      {/* PIN Modal for Admin */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !pinLoading && setShowPinModal(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full"
            >
              {/* Close button */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Lock size={18} className="text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-stone-800">ใส่ PIN ผู้จัดการ</h2>
                </div>
                <button
                  onClick={() => setShowPinModal(false)}
                  disabled={pinLoading}
                  className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center disabled:opacity-50"
                >
                  <X size={18} className="text-stone-500" />
                </button>
              </div>

              {/* PIN dots */}
              <div className="flex justify-center gap-3 mb-4">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={{
                      scale: pin.length > i ? 1.2 : 1,
                      backgroundColor: pin.length > i ? "#a855f7" : "#e7e5e4",
                    }}
                    className="w-4 h-4 rounded-full bg-stone-200"
                  />
                ))}
              </div>

              {pinError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-red-500 text-sm mb-3"
                >
                  {pinError}
                </motion.p>
              )}

              {/* Number pad */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <motion.button
                    key={n}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handlePinKeyPress(String(n))}
                    disabled={pinLoading}
                    className="aspect-square rounded-2xl bg-stone-100 hover:bg-stone-200 text-2xl font-semibold text-stone-800 transition-colors disabled:opacity-50"
                  >
                    {n}
                  </motion.button>
                ))}
                <div />
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handlePinKeyPress("0")}
                  disabled={pinLoading}
                  className="aspect-square rounded-2xl bg-stone-100 hover:bg-stone-200 text-2xl font-semibold text-stone-800 transition-colors disabled:opacity-50"
                >
                  0
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handlePinDelete}
                  disabled={pinLoading}
                  className="aspect-square rounded-2xl bg-stone-100 hover:bg-red-100 text-stone-600 hover:text-red-600 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  ←
                </motion.button>
              </div>

              {/* Submit */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handlePinSubmit}
                disabled={pin.length < 4 || pinLoading}
                className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {pinLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    กำลังตรวจสอบ...
                  </>
                ) : (
                  <>
                    เข้าสู่ระบบ
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>

              <p className="text-center text-xs text-stone-400 mt-3">
                🔒 เฉพาะผู้จัดการเท่านั้น
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
