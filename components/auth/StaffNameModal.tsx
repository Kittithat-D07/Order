"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStaffSession } from "@/hooks/useStaffSession";
import { useServerName } from "@/hooks/useServerName";
import { User, ArrowRight } from "lucide-react";

const NAME_KEY = "staff-display-name";

/**
 * StaffNameModal
 * - ถ้ายังไม่มีชื่อ → ขอให้พิมพ์ก่อน (เก็บ localStorage)
 * - ใช้บันทึก actor_name ใน audit log
 */
export function StaffNameModal() {
  const { session, hydrated, setDisplayName } = useStaffSession();
  const { setServerName } = useServerName();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated || !session) return;
    const stored = localStorage.getItem(NAME_KEY);
    if (stored) {
      setName(stored);
    }
    // เปิด modal เฉพาะเมื่อ:
    // 1. session มี displayName เป็น default
    // 2. และยังไม่มีชื่อใน localStorage
    const isDefault = ["พนักงานครัว", "พนักงานเสิร์ฟ", "ผู้จัดการ"].includes(session.displayName);
    setOpen(isDefault && !stored);
  }, [hydrated, session]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(NAME_KEY, trimmed);
    setDisplayName(trimmed);
    // Keep the shared server-name key in sync so the server screen shows the
    // same person instead of asking again.
    setServerName(trimmed);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-text/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-name-title"
            tabIndex={-1}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-surface rounded-3xl p-6 w-full max-w-sm shadow-lg outline-none"
          >
            <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand/30">
              <User className="text-on-primary" size={26} aria-hidden="true" />
            </div>
            <h2 id="staff-name-title" className="text-lg font-bold text-center text-ink mb-1">
              ยินดีต้อนรับ! 👋
            </h2>
            <p className="text-sm text-ink-muted text-center mb-5">
              กรอกชื่อของคุณ (จะแสดงในประวัติการแก้ไขเมนู)
            </p>

            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="เช่น สมชาย, พี่แม็ค, ..."
              aria-label="ชื่อของคุณ"
              className="w-full px-4 py-3 min-h-[52px] border-2 border-line rounded-2xl text-center text-lg font-bold text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-3 min-h-[48px] rounded-2xl text-ink-muted font-bold text-sm hover:bg-surface-2 transition"
              >
                ข้าม
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={!name.trim()}
                className="flex-1 py-3 min-h-[48px] rounded-2xl bg-brand hover:bg-brand-dark text-white font-bold text-sm flex items-center justify-center gap-1 disabled:opacity-50 shadow-md shadow-brand/30"
              >
                <span>เริ่มใช้งาน</span>
                <ArrowRight size={16} aria-hidden="true" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
