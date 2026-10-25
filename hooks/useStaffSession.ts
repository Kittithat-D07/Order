"use client";

import { useState, useEffect, useCallback } from "react";

export type StaffRole = "kitchen" | "server" | "admin";

interface StaffSession {
  role: StaffRole;
  displayName: string;
  loggedInAt: string;
}

/** Human-readable role names — staff must never see a raw enum. */
export const ROLE_LABELS: Record<StaffRole, string> = {
  kitchen: "พนักงานครัว",
  server: "พนักงานเสริฟ์",
  admin: "ผู้จัดการ",
};

/**
 * Staff session state.
 *
 * The authoritative session lives on the server as an HttpOnly cookie. This
 * hook only mirrors what the server says, so it can be used to decide what
 * to render — but it is never the thing that grants access. Every write
 * goes through a server route that checks the cookie itself.
 *
 * The previous version kept the role in localStorage, which meant the
 * browser was the security boundary: one console line was enough to become
 * an admin, and the kitchen and server roles needed no PIN at all.
 */
export function useStaffSession() {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Ask the server who we are. The cookie is HttpOnly, so this is the only
  // way the client can learn whether it is signed in.
  const syncSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/verify-pin", { cache: "no-store" });
      if (!res.ok) {
        setSession(null);
        return null;
      }
      const data = await res.json();
      if (!data.authenticated) {
        setSession(null);
        return null;
      }
      const next: StaffSession = {
        role: data.role,
        displayName: data.displayName || ROLE_LABELS[data.role as StaffRole],
        loggedInAt: new Date().toISOString(),
      };
      setSession(next);
      return next;
    } catch {
      setSession(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await syncSession();
      if (!cancelled) setHydrated(true);
    })();

    // Another tab signed in or out — re-check.
    const onFocus = () => {
      syncSession();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [syncSession]);

  /**
   * Sign in with a PIN. The server verifies the PIN with bcrypt, issues the
   * HttpOnly session cookie and returns the display name.
   */
  const login = async (role: StaffRole, pin: string) => {
    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, pin }),
      });

      const data = await res.json().catch(() => ({}));

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
        if (data.error === "session_failed") {
          return { ok: false, error: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่" };
        }
        return { ok: false, error: "เข้าสู่ระบบไม่สำเร็จ" };
      }

      const next: StaffSession = {
        role: data.role || role,
        displayName: data.displayName || ROLE_LABELS[role],
        loggedInAt: new Date().toISOString(),
      };
      setSession(next);
      return { ok: true };
    } catch {
      return { ok: false, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  };

  /** Sign out — the server revokes the session and clears the cookie. */
  const logout = async () => {
    try {
      await fetch("/api/auth/verify-pin", { method: "DELETE" });
    } catch {
      // The local state is cleared either way.
    }
    setSession(null);
  };

  /** Update the display name shown on tickets. */
  const setDisplayName = (name: string) => {
    setSession((prev) =>
      prev ? { ...prev, displayName: name.trim() || ROLE_LABELS[prev.role] } : prev
    );
  };

  return { session, hydrated, login, setDisplayName, logout, refresh: syncSession };
}
