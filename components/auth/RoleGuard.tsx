"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useStaffSession, StaffRole, ROLE_LABELS } from "@/hooks/useStaffSession";
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
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-line border-t-brand rounded-full"
          role="status"
          aria-label="กำลังโหลด"
        />
      </div>
    );
  }

  // ยังไม่ได้ login
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface rounded-2xl p-6 max-w-sm w-full text-center shadow-lg"
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand flex items-center justify-center shadow-lg">
            <LogIn className="text-on-primary" size={24} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-ink mb-1">ยังไม่ได้เข้าสู่ระบบ</h2>
          <p className="text-sm text-ink-muted mb-4">
            กรุณาเลือกบทบาทเพื่อเข้าใช้งาน{pageName}
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 min-h-[48px] rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-sm shadow-md"
          >
            ไปหน้าเลือกบทบาท
          </button>
        </motion.div>
      </div>
    );
  }

  // login แล้ว แต่ role ไม่ตรง
  if (!authorized) {
    const roleIcons: Record<StaffRole, typeof ChefHat> = {
      kitchen: ChefHat,
      server: Utensils,
      admin: Settings,
    };
    const CurrentIcon = roleIcons[session.role];

    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface rounded-2xl p-6 max-w-sm w-full text-center shadow-lg"
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bad flex items-center justify-center shadow-lg">
            <ShieldAlert className="text-white" size={24} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-ink mb-1">สิทธิ์ไม่ตรงกัน</h2>
          <p className="text-sm text-ink-muted mb-3">คุณเข้าสู่ระบบในฐานะ</p>
          <div className="flex items-center justify-center gap-2 mb-3 px-3 py-2 rounded-xl bg-surface-2">
            <CurrentIcon size={16} className="text-ink-muted" aria-hidden="true" />
            <span className="text-sm font-bold text-ink">
              {session.displayName} ({ROLE_LABELS[session.role]})
            </span>
          </div>
          <p className="text-sm text-ink-muted mb-4">
            แต่หน้า <b>{pageName}</b> ต้องการสิทธิ์:{" "}
            <b className="text-brand-text">{allowedRoles.map((r) => ROLE_LABELS[r]).join(" หรือ ")}</b>
          </p>
          <button
            onClick={async () => {
              // Await the logout so the server clears the session cookie
              // before we navigate — otherwise the middleware would still
              // see a valid session and bounce the user straight back.
              await logout();
              router.push("/");
            }}
            className="w-full py-3 min-h-[48px] rounded-xl bg-bad hover:bg-bad-text text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
          >
            <LogOut size={16} aria-hidden="true" /> เปลี่ยนบทบาท
          </button>
        </motion.div>
      </div>
    );
  }

  // ผ่าน
  return <>{children}</>;
}
