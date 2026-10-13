"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { type LucideIcon, ChefHat, Utensils, Pizza, LayoutGrid, BarChart3, CheckCircle2, Home, AlertTriangle, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStaffSession } from "@/hooks/useStaffSession";

type TabItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  matchPaths?: string[];
  color: string;
};

// Tabs แยกตาม role — เพิ่มหน้าแรก (Dashboard) ให้ทุก role
const tabsByRole: Record<string, TabItem[]> = {
  kitchen: [
    { href: "/kitchen", icon: ChefHat, label: "กำลังทำ", matchPaths: ["/kitchen"], color: "text-amber-600" },
    { href: "/kitchen/done", icon: CheckCircle2, label: "เสร็จแล้ว", matchPaths: ["/kitchen/done"], color: "text-blue-600" },
    { href: "/kitchen/stock", icon: AlertTriangle, label: "สต็อก", matchPaths: ["/kitchen/stock"], color: "text-rose-600" },
  ],
  server: [
    { href: "/server", icon: Utensils, label: "รับออร์เดอร์", matchPaths: ["/server"], color: "text-blue-600" },
  ],
  admin: [
    { href: "/admin", icon: Home, label: "หน้าหลัก", matchPaths: ["/admin"], color: "text-purple-600" },
    { href: "/admin/tables", icon: LayoutGrid, label: "โต๊ะ", matchPaths: ["/admin/tables"], color: "text-orange-600" },
    { href: "/admin/menu", icon: Pizza, label: "เมนู", matchPaths: ["/admin/menu"], color: "text-green-600" },
    { href: "/admin/history", icon: History, label: "ประวัติ", matchPaths: ["/admin/history"], color: "text-indigo-600" },
  ],
};

export function BottomTabBar() {
  const pathname = usePathname();
  const { session, hydrated } = useStaffSession();

  if (!hydrated || !session) return null;

  const tabs = tabsByRole[session.role] ?? [];

  // สี gradient ตาม role
  const gradientMap: Record<string, string> = {
    kitchen: "from-orange-500 to-amber-500",
    server: "from-blue-500 to-cyan-500",
    admin: "from-purple-500 to-pink-500",
  };
  const activeGradient = gradientMap[session.role] ?? "from-stone-500 to-stone-600";

  return (
    <nav
      className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none"
      style={{ bottom: "max(16px, env(safe-area-inset-bottom, 0px))" }}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="pointer-events-auto bg-white/95 backdrop-blur-xl rounded-full shadow-2xl shadow-stone-900/20 border border-stone-200/80 px-2 py-2"
      >
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.matchPaths?.some((p) => pathname === p) ?? false;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex flex-col items-center justify-center px-4 sm:px-5 py-2 min-w-[64px] sm:min-w-[72px] active:scale-90 transition-transform rounded-full"
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomTabIndicator"
                    className={`absolute inset-0 rounded-full bg-gradient-to-br ${activeGradient} shadow-lg`}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 transition-colors",
                    isActive ? "text-white" : "text-stone-500"
                  )}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isActive ? "drop-shadow-sm" : ""}
                  />
                  <span className={cn("text-[9px] sm:text-[10px] font-semibold", isActive && "font-bold")}>
                    {tab.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </nav>
  );
}
