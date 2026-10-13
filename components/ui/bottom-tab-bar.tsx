"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { type LucideIcon, ChefHat, Utensils, Pizza, LayoutGrid, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type TabItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  matchPaths?: string[];
  color: string;
};

const tabs: TabItem[] = [
  { href: "/kitchen", icon: ChefHat, label: "ครัว", matchPaths: ["/kitchen"], color: "text-amber-600" },
  { href: "/server", icon: Utensils, label: "เสิร์ฟ", matchPaths: ["/server"], color: "text-blue-600" },
  { href: "/admin/menu", icon: Pizza, label: "เมนู", matchPaths: ["/admin/menu"], color: "text-green-600" },
  { href: "/admin/tables", icon: LayoutGrid, label: "โต๊ะ", matchPaths: ["/admin/tables"], color: "text-orange-600" },
  { href: "/admin/orders", icon: BarChart3, label: "ประวัติ", matchPaths: ["/admin/orders"], color: "text-purple-600" },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-5">
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
                  className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
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
