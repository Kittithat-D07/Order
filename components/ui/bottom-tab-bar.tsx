"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  type LucideIcon,
  ChefHat,
  Utensils,
  Pizza,
  LayoutGrid,
  BarChart3,
  CheckCircle2,
  Home,
  AlertTriangle,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStaffSession } from "@/hooks/useStaffSession";

type TabItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  matchPaths?: string[];
};

/**
 * Tabs are grouped by role, but every role wears a *depth of the same
 * terracotta family* — never a stock hue. A chef, a server and an owner in
 * the same building must be able to tell it is the same product.
 */
const tabsByRole: Record<string, TabItem[]> = {
  kitchen: [
    { href: "/kitchen", icon: ChefHat, label: "กำลังทำ", matchPaths: ["/kitchen"] },
    { href: "/kitchen/done", icon: CheckCircle2, label: "เสร็จแล้ว", matchPaths: ["/kitchen/done"] },
    { href: "/kitchen/stock", icon: AlertTriangle, label: "สต็อก", matchPaths: ["/kitchen/stock"] },
  ],
  server: [
    { href: "/server", icon: Utensils, label: "รับออร์เดอร์", matchPaths: ["/server"] },
  ],
  admin: [
    { href: "/admin", icon: Home, label: "หน้าหลัก", matchPaths: ["/admin"] },
    { href: "/admin/tables", icon: LayoutGrid, label: "โต๊ะ", matchPaths: ["/admin/tables"] },
    { href: "/admin/menu", icon: Pizza, label: "เมนู", matchPaths: ["/admin/menu"] },
    { href: "/admin/history", icon: History, label: "ประวัติ", matchPaths: ["/admin/history"] },
  ],
};

/** Active-tab fill per role — three depths of one hue. */
const ROLE_FILL: Record<string, string> = {
  kitchen: "rgb(var(--rgb-primary))",
  server: "rgb(var(--rgb-accent))",
  admin: "rgb(var(--rgb-primary-deep))",
};

export function BottomTabBar() {
  const pathname = usePathname();
  const { session, hydrated } = useStaffSession();

  if (!hydrated || !session) return null;

  const tabs = tabsByRole[session.role] ?? [];
  const activeFill = ROLE_FILL[session.role] ?? "rgb(var(--rgb-text-muted))";

  return (
    <nav
      className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none"
      style={{ bottom: "max(16px, env(safe-area-inset-bottom, 0px))" }}
      aria-label="เมนูหลัก"
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="pointer-events-auto bg-surface/95 backdrop-blur-xl rounded-full shadow-lg shadow-text/10 border border-line px-2 py-2"
      >
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.matchPaths?.some((p) => pathname === p) ?? false;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className="relative flex flex-col items-center justify-center px-4 sm:px-5 py-2 min-w-[64px] sm:min-w-[72px] min-h-[44px] active:scale-90 transition-transform rounded-full"
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomTabIndicator"
                    className="absolute inset-0 rounded-full shadow-md"
                    style={{ background: activeFill }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 transition-colors",
                    isActive ? "text-on-primary" : "text-ink-muted"
                  )}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isActive ? "drop-shadow-sm" : ""}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "text-[10px] sm:text-[11px] font-semibold",
                      isActive && "font-bold"
                    )}
                  >
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
