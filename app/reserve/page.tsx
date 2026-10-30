import type { Metadata } from "next";
import { AuraReservePage } from "@/components/aura/AuraReservePage";

export const metadata: Metadata = {
  title: "จองโต๊ะ — Aura Bistro ร้านอาหารไทยในสวน",
  description:
    "จองโต๊ะ Aura Bistro ล่วงหน้า เลือกวัน เวลา โซนที่นั่งในสวน ทางร้านโทรยืนยันภายใน 2 ชั่วโมง ไม่ต้องมัดจำ",
};

export default function Page() {
  return <AuraReservePage />;
}
