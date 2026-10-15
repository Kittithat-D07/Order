"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useStaffSession, StaffRole } from "@/hooks/useStaffSession";
import { ShieldAlert, LogIn, LogOut, ChefHat, Utensils, Settings } from "lucide-react";

interface RoleGuardProps {
  allowedRoles: StaffRole[];
  children: React.ReactNode;
  pageName?: string;
}

/**
 * RoleGuard v2 - ตรวจสอบสิทธิ์แบบ "เข้มงวด"
 *
 * - ถ้า role ตรง → แสดง children
 * - ถ้ายังไม่ login → แสดงปุ่มให้ไป login (ไม่ auto-login)
 * - ถ้า role ไม่ตรง → แสดงปุ่มให้ logout & ไป login ใหม่ (ไม่ auto-switch)
 *   เพื่อป้องกัน infinite loop และไม่เปลี่ยน role ของ user โดยไม่ตั้งใจ
 */
export function RoleGuard({
  allowedRoles,
  children,
  pageName = "หน้านี้",
}: RoleGuardProps) {
  const { session, hydrated, logout } = useStaffSession();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    if (session && allowedRoles.includes(session.role)) {
      setAuthorized(true);
    } else {
      setAuthorized(false);
    }
  }, [hydrated, session, allowedRoles]);

  // ยังโหลด session ไม่เสร็จ
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-stone-300 border-t-orange-500 rounded-full"
        />
      </div>
    );
  }

  // ยังไม่ได้ login
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl"
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
            <LogIn className="text-white" size={24} />
          </div>
          <h2 className="text-lg font-bold text-stone-800 mb-1">ยังไม่ได้เข้าสู่ระบบ</h2>
          <p className="text-sm text-stone-500 mb-4">กรุณาเลือกบทบาทเพื่อเข้าใช้งาน{pageName}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-md"
          >
            ไปหน้าเลือกบทบาท
          </button>
        </motion.div>
      </div>
    );
  }

  // login แล้ว แต่ role ไม่ตรง
  if (!allowedRoles.includes(session.role)) {
    const roleIcons: Record<StaffRole, any> = {
      kitchen: ChefHat,
      server: Utensils,
      admin: Settings,
    };
    const CurrentIcon = roleIcons[session.role];

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-orange-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl"
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg">
            <ShieldAlert className="text-white" size={24} />
          </div>
          <h2 className="text-lg font-bold text-stone-800 mb-1">สิทธิ์ไม่ตรงกัน</h2>
          <p className="text-sm text-stone-600 mb-3">
            คุณเข้าสู่ระบบในฐานะ
          </p>
          <div className="flex items-center justify-center gap-2 mb-3 px-3 py-2 rounded-xl bg-stone-100">
            <CurrentIcon size={16} className="text-stone-600" />
            <span className="text-sm font-bold text-stone-800">{session.displayName}</span>
          </div>
          <p className="text-sm text-stone-600 mb-4">
            แต่หน้า <b>{pageName}</b> ต้องการสิทธิ์: <br/>
            <b className="text-orange-600">{allowedRoles.join(", ")}</b>
          </p>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> เปลี่ยนบทบาท
          </button>
        </motion.div>
      </div>
    );
  }

  // ผ่าน
  return <>{children}</>;
}
