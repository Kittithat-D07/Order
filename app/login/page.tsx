"use client";

// หน้านี้ถูกลบไปแล้ว (เปลี่ยนเป็นระบบ staff session)
// Redirect ไปหน้าหลัก
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
