export function formatPrice(price: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
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
  cancelled: "ยกเลิก",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  preparing: "bg-blue-100 text-blue-800 border-blue-300",
  served: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-gray-200 text-gray-700 border-gray-300",
};
