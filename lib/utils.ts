import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as a Thai-grouped amount with NO currency symbol.
 *
 * Use this when the template already supplies a "฿" prefix. Use
 * `formatBaht` when it does not. Mixing the two is how you get "฿฿75".
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

/** Format an amount with its baht symbol, ready to render on its own. */
export function formatBaht(price: number): string {
  return `฿${formatPrice(price)}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateQrToken(): string {
  // short readable token like "t01-abc123"
  const random = Math.random().toString(36).slice(2, 8);
  return `t-${Date.now().toString(36)}-${random}`;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "รอรับออร์เดอร์",
  preparing: "กำลังทำ",
  served: "เสิร์ฟแล้ว",
  completed: "ปิดยอดแล้ว",
  cancelled: "ยกเลิก",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-surface-3 text-ink border-line",
  preparing: "bg-brand-light text-brand-dark border-brand",
  served: "bg-ok-light text-ok-text border-ok",
  completed: "bg-surface-3 text-ink border-line",
  cancelled: "bg-bad-light text-bad-text border-bad",
};
