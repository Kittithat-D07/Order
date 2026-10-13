"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStaffSession, StaffRole } from "@/hooks/useStaffSession";
import { ShieldAlert, LogIn } from "lucide-react";

interface RoleGuardProps {
  allowedRoles: StaffRole[];
  children: React.ReactNode;
  pageName?: string;
}

/**
 * RoleGuard - ตรวจสอบสิทธิ์ (โหมด "พนักงานเชื่อใจ" ไม่ต้อง PIN)
 *
 * - ถ้า role ตรง → แสดง children
 * - ถ้า role ไม่ตรง → auto-switch role เป็น role แรกที่อนุญาต
 *   (พนักงานไม่กี่คน แชร์ลิงก์กันได้เลย)
 */
export function RoleGuard({
  allowedRoles,
  children,
  pageName = "หน้านี้",
}: RoleGuardProps) {
  const { session, hydrated, quickLogin } = useStaffSession();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    // ยังไม่ login → quickLogin ด้วย role แรกที่อนุญาต
    if (!session) {
      quickLogin(allowedRoles[0]);
      return;
    }

    // role ไม่ตรง → สลับ role ให้ตรงกับหน้านี้
    if (!allowedRoles.includes(session.role)) {
      quickLogin(allowedRoles[0]);
      return;
    }

    setAuthorized(true);
  }, [hydrated, session, allowedRoles, quickLogin]);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 mx-auto border-4 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-stone-600">กำลังเตรียมหน้า{pageName}...</p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
