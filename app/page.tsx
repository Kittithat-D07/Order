"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStaffSession } from "@/hooks/useStaffSession";
import { motion } from "framer-motion";

export default function HomePage() {
  const router = useRouter();
  const { session, hydrated } = useStaffSession();

  useEffect(() => {
    if (!hydrated) return;

    // ถ้า login แล้ว → ไปหน้าที่เหมาะสม
    if (session) {
      const roleMap = {
        kitchen: "/kitchen",
        server: "/server",
        admin: "/admin",
      };
      router.replace(roleMap[session.role]);
    } else {
      // ยังไม่ login → ไปหน้า login
      router.replace("/login");
    }
  }, [hydrated, session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-red-50">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="w-14 h-14 border-4 border-stone-200 border-t-orange-500 rounded-full"
      />
    </div>
  );
}
