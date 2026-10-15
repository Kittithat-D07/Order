"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStaffSession } from "@/hooks/useStaffSession";
import { User, ArrowRight, X } from "lucide-react";

const NAME_KEY = "staff-display-name";

/**
 * StaffNameModal
 * - ถ้ายังไม่มีชื่อ → ขอให้พิมพ์ก่อน (เก็บ localStorage)
 * - ใช้บันทึก actor_name ใน audit log
 */
export function StaffNameModal() {
  const { session, hydrated, setDisplayName } = useStaffSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

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
    if (isDefault && !stored) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [hydrated, session]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(NAME_KEY, trimmed);
    setDisplayName(trimmed);
    setOpen(false);
  };

  const handleSkip = () => {
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
              <User className="text-white" size={26} />
            </div>
            <h2 className="text-lg font-bold text-center text-stone-800 mb-1">
              ยินดีต้อนรับ! 👋
            </h2>
            <p className="text-sm text-stone-500 text-center mb-5">
              กรอกชื่อของคุณ (จะแสดงในประวัติการแก้ไขเมนู)
            </p>

            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="เช่น สมชาย, พี่แม็ค, ..."
              className="w-full px-4 py-3 border-2 border-stone-200 rounded-2xl text-center text-lg font-bold text-stone-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 rounded-2xl text-stone-500 font-bold text-sm hover:bg-stone-50 transition"
              >
                ข้าม
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={!name.trim()}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm flex items-center justify-center gap-1 disabled:opacity-50 shadow-md shadow-orange-500/30"
              >
                <span>เริ่มใช้งาน</span>
                <ArrowRight size={16} />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
