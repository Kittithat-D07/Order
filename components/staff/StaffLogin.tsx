"use client";

import { useState } from "react";
import { useStaffSession, StaffRole } from "@/hooks/useStaffSession";
import { ChefHat, Utensils, Settings, ArrowRight } from "lucide-react";

const ROLE_CONFIG: Record<StaffRole, { icon: any; color: string; bg: string; label: string; desc: string; gradient: string }> = {
  kitchen: {
    icon: ChefHat,
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    label: "ครัว",
    desc: "จัดการออร์เดอร์เข้าครัว",
    gradient: "from-orange-500 to-amber-500",
  },
  server: {
    icon: Utensils,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    label: "เสริฟ์",
    desc: "เสิร์ฟอาหารและจัดการโต๊ะ",
    gradient: "from-blue-500 to-cyan-500",
  },
  admin: {
    icon: Settings,
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    label: "ผู้จัดการ",
    desc: "จัดการเมนู โต๊ะ และดูรายงาน",
    gradient: "from-purple-500 to-pink-500",
  },
};

export function StaffLogin({ onSuccess }: { onSuccess?: () => void }) {
  const { quickLogin } = useStaffSession();

  const handleSelect = (role: StaffRole) => {
    quickLogin(role);
    onSuccess?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 text-white text-4xl mb-4 shadow-xl shadow-orange-500/30">
            🍜
          </div>
          <h1 className="text-2xl font-bold text-stone-800">ร้านอาหาร</h1>
          <p className="text-sm text-stone-500 mt-1">เลือกบทบาทเพื่อเข้าใช้งาน</p>
        </div>

        <div className="space-y-3">
          {(Object.keys(ROLE_CONFIG) as StaffRole[]).map((role, idx) => {
            const cfg = ROLE_CONFIG[role];
            const Icon = cfg.icon;
            return (
              <button
                key={role}
                onClick={() => handleSelect(role)}
                className={`w-full p-5 rounded-2xl border-2 ${cfg.bg} hover:scale-[1.02] active:scale-95 transition flex items-center gap-4 shadow-sm`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cfg.gradient} text-white flex items-center justify-center shadow-md`}>
                  <Icon size={26} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-bold text-lg ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{cfg.desc}</p>
                </div>
                <ArrowRight className="text-stone-400" size={22} />
              </button>
            );
          })}
        </div>

        <p className="text-center text-[10px] text-stone-400 mt-8">
          v2.0 • Restaurant QR Order System
        </p>
      </div>
    </div>
  );
}
