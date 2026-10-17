"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, Utensils, Settings, Sparkles, ArrowRight, Lock, X } from "lucide-react";
import { useStaffSession, StaffRole } from "@/hooks/useStaffSession";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/* ============================================================
   🌅 ORGANIC WARM - Aura Bistro Home
============================================================ */

const COLORS: Record<string, string> = {
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
  border: "#E8DFD0",
  text: "#2C2620",
  textMuted: "#6B5F54",
  success: "#4F7942",
  danger: "#A03826",
};

interface RoleOption {
  role: StaffRole;
  icon: typeof ChefHat;
  title: string;
  subtitle: string;
  gradient: string;
  emoji: string;
  bgGradient: string;
}

const roleOptions: RoleOption[] = [
  {
    role: "kitchen",
    icon: ChefHat,
    title: "พนักงานครัว",
    subtitle: "ดูออร์เดอร์ที่เข้าครัว ทำอาหาร",
    gradient: COLORS.primary,
    emoji: "👨‍🍳",
    bgGradient: `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.accentLight} 100%)`,
  },
  {
    role: "server",
    icon: Utensils,
    title: "พนักงานเสิร์ฟ",
    subtitle: "รับออร์เดอร์ เสิร์ฟอาหาร",
    gradient: COLORS.secondary,
    emoji: "🍽️",
    bgGradient: `linear-gradient(135deg, ${COLORS.secondaryLight} 0%, ${COLORS.primaryLight} 100%)`,
  },
  {
    role: "admin",
    icon: Settings,
    title: "ผู้จัดการ",
    subtitle: "จัดการเมนู โต๊ะ รายงาน (ต้องใส่ PIN)",
    gradient: COLORS.accent,
    emoji: "👔",
    bgGradient: `linear-gradient(135deg, ${COLORS.accentLight} 0%, ${COLORS.secondaryLight} 100%)`,
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

  useEffect(() => {
    if (!hydrated) return;
    if (!session) return;

    const roleMap: Record<StaffRole, string> = {
      kitchen: "/kitchen",
      server: "/server",
      admin: "/admin",
    };
    router.replace(roleMap[session.role]);
  }, [hydrated, session, router]);

  const handleSelectRole = async (role: StaffRole) => {
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <motion.div
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-7xl"
        >
          🌿
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: COLORS.bg }}>
      {/* Decorative leaves */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="leaf-deco text-8xl"
        style={{ top: "100px", right: "30px", color: COLORS.secondary, opacity: 0.1 }}
      >
        🌿
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0], rotate: [2, -2, 2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="leaf-deco text-7xl"
        style={{ top: "300px", left: "20px", color: COLORS.accent, opacity: 0.1 }}
      >
        🍃
      </motion.div>
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="leaf-deco text-6xl"
        style={{ bottom: "100px", right: "40px", color: COLORS.primary, opacity: 0.1 }}
      >
        🌶️
      </motion.div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.8, stiffness: 200 }}
            className="w-24 h-24 mx-auto mb-5 rounded-full flex items-center justify-center text-6xl"
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 50%, ${COLORS.secondary} 100%)`,
              boxShadow: "0 20px 60px -10px rgba(184, 92, 56, 0.4)"
            }}
          >
            🍜
          </motion.div>
          <p className="text-xs uppercase tracking-[0.3em] font-bold mb-2" style={{ color: COLORS.accent }}>
            ✨ Welcome to
          </p>
          <h1
            className="text-5xl text-sunset mb-1"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontStyle: "italic" }}
          >
            Aura Bistro
          </h1>
          <h2
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text }}
          >
            ระบบจัดการร้าน
          </h2>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            🌿 Thai Garden Kitchen
          </p>
        </motion.div>

        {/* Role cards */}
        <div className="space-y-4">
          {roleOptions.map((option, idx) => {
            const Icon = option.icon;
            const isLoading = loading === option.role;
            return (
              <motion.button
                key={option.role}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectRole(option.role)}
                disabled={!!loading}
                className="w-full text-left rounded-3xl overflow-hidden"
                style={{ 
                  boxShadow: "0 12px 32px -6px rgba(139, 63, 26, 0.15)",
                  border: "1px solid rgba(232, 223, 208, 0.5)"
                }}
              >
                {/* Card background */}
                <div className="flex items-center gap-4 p-5" style={{ background: COLORS.surface }}>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                    style={{ background: option.bgGradient }}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <span>{option.emoji}</span>
                    )}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg" style={{ color: COLORS.text, fontFamily: "'Playfair Display', serif" }}>
                        {option.title}
                      </h3>
                      {option.role === "admin" && (
                        <Lock size={14} style={{ color: COLORS.accent }} />
                      )}
                    </div>
                    <p className="text-sm" style={{ color: COLORS.textMuted }}>
                      {option.subtitle}
                    </p>
                  </div>
                  {!isLoading && (
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ArrowRight size={20} style={{ color: COLORS.textMuted }} />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Demo link */}
        <motion.a
          href="/demo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-6 w-full text-center block rounded-2xl p-4 text-sm font-medium"
          style={{ 
            color: COLORS.textMuted,
            border: `2px dashed ${COLORS.accent}40`,
            background: `${COLORS.accentLight}20`
          }}
        >
          🌿 ดู UI Demo (ไม่ต้อง login)
        </motion.a>
      </div>

      {/* PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !pinLoading && setShowPinModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(44, 38, 32, 0.6)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl p-6"
              style={{ 
                background: COLORS.surface,
                boxShadow: "0 30px 80px -20px rgba(139, 63, 26, 0.4)"
              }}
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.primary} 100%)` }}
                  >
                    <Lock size={20} className="text-white" />
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: COLORS.text, fontFamily: "'Playfair Display', serif" }}>
                    ใส่ PIN ผู้จัดการ
                  </h2>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9, rotate: 90 }}
                  onClick={() => setShowPinModal(false)}
                  disabled={pinLoading}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: COLORS.bg }}
                >
                  <X size={18} style={{ color: COLORS.textMuted }} />
                </motion.button>
              </div>

              {/* PIN dots */}
              <div className="flex justify-center gap-3 mb-4">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: pin.length > i ? 1.3 : 1,
                      backgroundColor: pin.length > i ? COLORS.accent : "#e8dfd0",
                    }}
                    className="w-4 h-4 rounded-full"
                    transition={{ type: "spring", stiffness: 400 }}
                  />
                ))}
              </div>

              {pinError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm mb-3"
                  style={{ color: "#A03826" }}
                >
                  {pinError}
                </motion.p>
              )}

              {/* Number pad */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <motion.button
                    key={n}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handlePinKeyPress(String(n))}
                    disabled={pinLoading}
                    className="aspect-square rounded-2xl text-2xl font-semibold"
                    style={{ 
                      background: COLORS.bg,
                      color: COLORS.text,
                      border: "1px solid rgba(232, 223, 208, 0.5)"
                    }}
                  >
                    {n}
                  </motion.button>
                ))}
                <div aria-hidden="true" />
                <motion.button
                  key="zero"
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    console.log("[PIN] pressed: 0");
                    handlePinKeyPress("0");
                  }}
                  disabled={pinLoading}
                  data-testid="pin-key-0"
                  className="aspect-square rounded-2xl text-2xl font-semibold cursor-pointer relative z-10"
                  style={{ 
                    background: COLORS.bg,
                    color: COLORS.text,
                    border: "1px solid rgba(232, 223, 208, 0.5)"
                  }}
                >
                  0
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handlePinDelete}
                  disabled={pinLoading}
                  className="aspect-square rounded-2xl flex items-center justify-center"
                  style={{ background: COLORS.bg, border: "1px solid rgba(232, 223, 208, 0.5)" }}
                >
                  ←
                </motion.button>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handlePinSubmit}
                disabled={pin.length < 4 || pinLoading}
                className="w-full py-4 rounded-2xl text-white font-semibold text-lg disabled:opacity-50"
                style={{
                  background: pin.length >= 4
                    ? `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.primary} 100%)`
                    : COLORS.textMuted,
                  boxShadow: pin.length >= 4
                    ? "0 12px 28px -6px rgba(200, 147, 47, 0.5)"
                    : "none"
                }}
              >
                {pinLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ →"}
              </motion.button>

              <p className="text-center text-xs mt-3" style={{ color: COLORS.textMuted }}>
                🔒 เฉพาะผู้จัดการเท่านั้น
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
