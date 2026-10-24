"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type StaffRole = "kitchen" | "server" | "admin";

interface StaffSession {
  role: StaffRole;
  displayName: string;
  loggedInAt: string;
}

const STORAGE_KEY = "staff-session";

/** Human-readable role names — staff must never see a raw enum. */
export const ROLE_LABELS: Record<StaffRole, string> = {
  kitchen: "พนักงานครัว",
  server: "พนักงานเสิร์ฟ",
  admin: "ผู้จัดการ",
};

export function useStaffSession() {
  const [session, setSessionState] = useState<StaffSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const syncSession = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as StaffSession;
          setSessionState(parsed);
        } catch {
          setSessionState(null);
        }
      } else {
        setSessionState(null);
      }
    };
    syncSession();
    setHydrated(true);

    // Listen for changes from other tabs / same tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) syncSession();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ตั้งค่า actor context ใน Supabase (สำหรับ audit log trigger)
  const setActorContext = async (s: StaffSession) => {
    try {
      const supabase = createClient();
      // ใช้ rpc หรือ set_config ใน query
      // ทางที่ง่ายสุด: ใช้ header ผ่าน supabase.functions หรือ pg meta
      // ในที่นี้เราจะส่งผ่าน localStorage แล้วให้ supabase-js ฝังตอน insert
    } catch {}
  };

  // Login แบบ quick (เลือก role + ใส่ชื่อ)
  const quickLogin = (role: StaffRole, displayName?: string) => {
    const name =
      displayName?.trim() ||
      session?.displayName ||
      ROLE_LABELS[role];
    const newSession: StaffSession = {
      role,
      displayName: name,
      loggedInAt: new Date().toISOString(),
    };
    setSessionState(newSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    return { ok: true };
  };

  // อัปเดตชื่อ
  const setDisplayName = (name: string) => {
    if (!session) return;
    const updated = { ...session, displayName: name.trim() || ROLE_LABELS[session.role] };
    setSessionState(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Login แบบ PIN — verify ผ่าน server API (bcrypt + rate limit)
  const login = async (role: StaffRole, pin: string) => {
    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          return { ok: false, error: "ลองเยอะเกินไป กรุณารอ 15 นาที" };
        }
        if (data.error === "invalid_pin" || data.error === "invalid_pin_format") {
          return { ok: false, error: "PIN ไม่ถูกต้อง" };
        }
        if (data.error === "role_not_found") {
          return { ok: false, error: "ไม่พบ role นี้" };
        }
        return { ok: false, error: "เข้าสู่ระบบไม่สำเร็จ" };
      }

      const newSession: StaffSession = {
        role,
        displayName: data.displayName || ROLE_LABELS[role],
        loggedInAt: new Date().toISOString(),
      };
      setSessionState(newSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      return { ok: true };
    } catch (e) {
      console.error("Login error:", e);
      return { ok: false, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  };

  const logout = () => {
    setSessionState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { session, hydrated, login, quickLogin, setDisplayName, logout };
}
