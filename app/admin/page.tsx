"use client";

import { useEffect, useState } from "react";
import { useStaffSession } from "@/hooks/useStaffSession";
import { StaffLogin } from "@/components/staff/StaffLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { LogOut, ChefHat, Utensils } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const { session, hydrated, logout } = useStaffSession();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (hydrated && session && (session.role === "admin" || session.role === "server")) {
      setAuthed(true);
    }
  }, [hydrated, session]);

  if (!hydrated) return null;

  if (!authed) {
    return <StaffLogin onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center text-lg">
              ⚙️
            </div>
            <div>
              <h1 className="font-bold text-base text-stone-800">ผู้จัดการ</h1>
              <p className="text-[10px] text-stone-500">{session?.displayName}</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 flex-wrap">
            <Link
              href="/kitchen"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-orange-50 hover:text-orange-700 transition flex items-center gap-1.5"
            >
              <ChefHat size={14} /> ครัว
            </Link>
            <Link
              href="/server"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-blue-50 hover:text-blue-700 transition flex items-center gap-1.5"
            >
              <Utensils size={14} /> เสริฟ์
            </Link>
            <Link
              href="/admin/orders"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-white hover:shadow-sm transition flex items-center gap-1.5"
            >
              📊 ประวัติ
            </Link>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition flex items-center gap-1.5"
            >
              <LogOut size={14} /> ออก
            </button>
          </nav>
        </div>
      </header>

      <AdminDashboard />
    </div>
  );
}
