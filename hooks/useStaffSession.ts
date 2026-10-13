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

const ROLE_LABELS: Record<StaffRole, string> = {
  kitchen: "พนักงานครัว",
  server: "พนักงานเสิร์ฟ",
  admin: "ผู้จัดการ",
};

export function useStaffSession() {
  const [session, setSessionState] = useState<StaffSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StaffSession;
        setSessionState(parsed);
        // sync actor ให้ supabase รู้ (ใช้กับ audit log trigger)
        setActorContext(parsed);
      } catch {}
    }
    setHydrated(true);
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

  // Login แบบเดิม (เช็ค PIN) — เก็บไว้ใช้กรณีต้องการ
  const login = async (role: StaffRole, pin: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("staff_pins")
      .select("pin, display_name")
      .eq("role", role)
      .single();

    if (error || !data) {
      return { ok: false, error: "ไม่พบ role นี้" };
    }
    if (data.pin !== pin) {
      return { ok: false, error: "PIN ไม่ถูกต้อง" };
    }
    const newSession: StaffSession = {
      role,
      displayName: data.display_name,
      loggedInAt: new Date().toISOString(),
    };
    setSessionState(newSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    return { ok: true };
  };

  const logout = () => {
    setSessionState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { session, hydrated, login, quickLogin, setDisplayName, logout };
}
