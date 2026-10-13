"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useStaffSession, StaffRole } from "@/hooks/useStaffSession";
import { ShieldAlert, LogIn } from "lucide-react";

interface RoleGuardProps {
  allowedRoles: StaffRole[];
  redirectTo?: string;
  children: React.ReactNode;
  pageName?: string;
}

/**
 * RoleGuard - ตรวจสอบสิทธิ์ก่อนเข้าหน้า
 * - ถ้า role ตรงกับ allowedRoles → แสดง children
 * - ถ้า role ไม่ตรง → redirect ไปหน้า login
 * - ถ้ายังไม่ login → redirect ไปหน้า login
 */
export function RoleGuard({
  allowedRoles,
  redirectTo = "/login",
  children,
  pageName = "หน้านี้",
}: RoleGuardProps) {
  const router = useRouter();
  const { session, hydrated } = useStaffSession();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    if (!session) {
      // ยังไม่ได้ login → ไปหน้า login
      router.replace(redirectTo);
      return;
    }

    if (!allowedRoles.includes(session.role)) {
      // login แล้ว แต่ role ไม่ตรง → ไปหน้า login
      router.replace(redirectTo);
      return;
    }

    setAuthorized(true);
  }, [hydrated, session, allowedRoles, redirectTo, router]);

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

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert size={32} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-stone-800 mb-2">
            ไม่มีสิทธิ์เข้าถึง
          </h2>
          <p className="text-sm text-stone-600 mb-4">
            คุณไม่มีสิทธิ์เข้าใช้งาน{pageName}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-stone-500">
            <LogIn size={14} />
            <span>กำลังเปลี่ยนเส้นทาง...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
