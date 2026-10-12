"use client";

import { useEffect, useState } from "react";
import { useStaffSession } from "@/hooks/useStaffSession";
import { StaffLogin } from "@/components/staff/StaffLogin";
import { ServerView } from "@/components/staff/ServerView";
import { LogOut } from "lucide-react";

export default function ServerPage() {
  const { session, hydrated, logout } = useStaffSession();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (hydrated && session && (session.role === "server" || session.role === "admin")) {
      setAuthed(true);
    }
  }, [hydrated, session]);

  if (!hydrated) return null;

  if (!authed) {
    return <StaffLogin onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">🍽️ หน้าจอเสริฟ์</h1>
          <p className="text-xs opacity-90">
            {session?.displayName} {session?.role === "admin" && "• (ผู้จัดการ)"}
          </p>
        </div>
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold flex items-center gap-1.5"
        >
          <LogOut size={14} /> ออก
        </button>
      </header>

      <ServerView />
    </div>
  );
}
