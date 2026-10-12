"use client";

import { useState } from "react";
import { useStaffSession, StaffRole } from "@/hooks/useStaffSession";
import { ChefHat, Utensils, Settings, X, Lock, ArrowRight } from "lucide-react";

const ROLE_CONFIG: Record<StaffRole, { icon: any; color: string; bg: string; label: string }> = {
  kitchen: { icon: ChefHat, color: "text-orange-600", bg: "bg-orange-50 border-orange-200", label: "ครัว" },
  server: { icon: Utensils, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "เสริฟ์" },
  admin: { icon: Settings, color: "text-purple-600", bg: "bg-purple-50 border-purple-200", label: "ผู้จัดการ" },
};

export function StaffLogin({ onSuccess }: { onSuccess?: () => void }) {
  const [selectedRole, setSelectedRole] = useState<StaffRole | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useStaffSession();

  const handleLogin = async () => {
    if (!selectedRole || !pin) return;
    setLoading(true);
    setError("");
    const result = await login(selectedRole, pin);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "เข้าสู่ระบบไม่สำเร็จ");
      setPin("");
    } else {
      onSuccess?.();
    }
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white text-3xl mb-3 shadow-lg">
              🍜
            </div>
            <h1 className="text-2xl font-bold text-stone-800">ร้านอาหาร</h1>
            <p className="text-sm text-stone-500 mt-1">เลือกบทบาทเพื่อเข้าใช้งาน</p>
          </div>

          <div className="space-y-3">
            {(Object.keys(ROLE_CONFIG) as StaffRole[]).map((role) => {
              const cfg = ROLE_CONFIG[role];
              const Icon = cfg.icon;
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full p-4 rounded-2xl border-2 ${cfg.bg} hover:scale-[1.02] active:scale-95 transition flex items-center gap-3`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center ${cfg.color}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-bold text-base ${cfg.color}`}>{cfg.label}</p>
                    <p className="text-xs text-stone-500">
                      {role === "kitchen" && "จัดการออร์เดอร์เข้าครัว"}
                      {role === "server" && "เสิร์ฟอาหารและจัดการโต๊ะ"}
                      {role === "admin" && "จัดการเมนูและดูรายงาน"}
                    </p>
                  </div>
                  <ArrowRight className="text-stone-400" size={20} />
                </button>
              );
            })}
          </div>

          <p className="text-center text-[10px] text-stone-400 mt-6">
            v2.0 • Restaurant QR Order System
          </p>
        </div>
      </div>
    );
  }

  const cfg = ROLE_CONFIG[selectedRole];
  const Icon = cfg.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className={`rounded-2xl border-2 ${cfg.bg} p-6 shadow-xl`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center ${cfg.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className={`font-bold text-lg ${cfg.color}`}>{cfg.label}</p>
                <p className="text-xs text-stone-500">ใส่ PIN 4 หลัก</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedRole(null);
                setPin("");
                setError("");
              }}
              className="w-8 h-8 rounded-lg hover:bg-white/50 flex items-center justify-center text-stone-500"
            >
              <X size={18} />
            </button>
          </div>

          <div className="bg-white rounded-xl p-4 mb-3">
            <div className="flex justify-center gap-2 mb-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${
                    pin.length > i ? "border-orange-500 bg-orange-50 text-orange-600" : "border-stone-200"
                  }`}
                >
                  {pin.length > i ? "•" : ""}
                </div>
              ))}
            </div>

            {error && (
              <p className="text-xs text-red-600 text-center mb-2">❌ {error}</p>
            )}

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => pin.length < 4 && setPin(pin + n)}
                  className="aspect-square rounded-lg bg-stone-100 hover:bg-stone-200 active:scale-95 text-xl font-bold text-stone-700 transition"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPin("")}
                className="aspect-square rounded-lg bg-stone-100 hover:bg-red-100 text-stone-500 text-xs font-semibold"
              >
                ล้าง
              </button>
              <button
                onClick={() => pin.length < 4 && setPin(pin + "0")}
                className="aspect-square rounded-lg bg-stone-100 hover:bg-stone-200 active:scale-95 text-xl font-bold text-stone-700 transition"
              >
                0
              </button>
              <button
                onClick={() => setPin(pin.slice(0, -1))}
                className="aspect-square rounded-lg bg-stone-100 hover:bg-orange-100 text-stone-500 text-xs font-semibold"
              >
                ⌫
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={pin.length !== 4 || loading}
            className={`w-full py-3 rounded-xl font-bold text-white transition active:scale-95 flex items-center justify-center gap-2 ${
              pin.length === 4
                ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md"
                : "bg-stone-300 cursor-not-allowed"
            }`}
          >
            <Lock size={16} />
            {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
          </button>

          <p className="text-center text-[10px] text-stone-400 mt-3">
            💡 PIN เริ่มต้น: ครัว=1234, เสริฟ์=5678
          </p>
        </div>
      </div>
    </div>
  );
}
