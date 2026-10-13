"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { type LucideIcon, ChefHat, Utensils, Pizza, LayoutGrid, BarChart3, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStaffSession } from "@/hooks/useStaffSession";

type TabItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  matchPaths?: string[];
  color: string;
};

// Tabs แยกตาม role
const tabsByRole: Record<string, TabItem[]> = {
  kitchen: [
    { href: "/kitchen", icon: ChefHat, label: "กำลังทำ", matchPaths: ["/kitchen"], color: "text-amber-600" },
    { href: "/kitchen/done", icon: CheckCircle2, label: "เสร็จแล้ว", matchPaths: ["/kitchen/done"], color: "text-blue-600" },
  ],
  server: [
    { href: "/server", icon: Utensils, label: "รับออร์เดอร์", matchPaths: ["/server"], color: "text-blue-600" },
  ],
  admin: [
    { href: "/admin/tables", icon: LayoutGrid, label: "โต๊ะ", matchPaths: ["/admin/tables"], color: "text-orange-600" },
    { href: "/admin/menu", icon: Pizza, label: "เมนู", matchPaths: ["/admin/menu"], color: "text-green-600" },
    { href: "/admin/orders", icon: BarChart3, label: "ประวัติ", matchPaths: ["/admin/orders"], color: "text-purple-600" },
  ],
};

export function BottomTabBar() {
  const pathname = usePathname();
  const { session, hydrated } = useStaffSession();

  // รอ hydrate ก่อน
  if (!hydrated || !session) return null;

  const tabs = tabsByRole[session.role] ?? [];
  const colCount = tabs.length > 0 ? tabs.length : 1;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className={`max-w-md mx-auto grid grid-cols-${colCount}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.matchPaths?.some((p) => pathname === p) ?? false;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-col items-center justify-center py-2 min-h-[56px] active:scale-95 transition-transform"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomTabIndicator"
                  className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full"
                  style={{
                    background: session.role === "kitchen" ? "from-orange-500 to-amber-500" 
                      : session.role === "server" ? "from-blue-500 to-cyan-500"
                      : "from-purple-500 to-pink-500"
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <motion.div
                whileTap={{ scale: 0.85 }}
                className={cn(
                  "flex flex-col items-center gap-0.5",
                  isActive ? tab.color : "text-stone-500"
                )}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? "drop-shadow-sm" : ""}
                />
                <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>
                  {tab.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
