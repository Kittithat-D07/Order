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

export function useStaffSession() {
  const [session, setSessionState] = useState<StaffSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSessionState(JSON.parse(stored));
      } catch {}
    }
    setHydrated(true);
  }, []);

  // Login แบบเลือก role แล้วเข้าได้เลย (ไม่ต้องใส่ PIN)
  const quickLogin = (role: StaffRole) => {
    const names: Record<StaffRole, string> = {
      kitchen: "พนักงานครัว",
      server: "พนักงานเสิร์ฟ",
      admin: "ผู้จัดการ",
    };
    const newSession: StaffSession = {
      role,
      displayName: names[role],
      loggedInAt: new Date().toISOString(),
    };
    setSessionState(newSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    return { ok: true };
  };

  // Login แบบเดิม (เช็ค PIN)
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

  return { session, hydrated, login, logout };
}
