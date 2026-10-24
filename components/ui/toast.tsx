"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, Info, X } from "lucide-react";
import { COLORS } from "@/lib/theme";

/* ============================================================
   🍃 TOAST — replaces native alert().
   Native dialogs break the visual language, block the screen and
   cannot carry a recovery action. These can.
============================================================ */

export type ToastTone = "ok" | "bad" | "info";

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

const TONE_STYLES: Record<ToastTone, { bg: string; icon: React.ReactNode }> = {
  ok: { bg: "var(--color-text)", icon: <Check size={16} /> },
  bad: { bg: "var(--color-danger)", icon: <AlertCircle size={16} /> },
  info: { bg: "var(--color-accent-dark)", icon: <Info size={16} /> },
};

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      className="fixed bottom-24 left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="pointer-events-auto px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-2.5 max-w-sm"
            style={{
              background: TONE_STYLES[t.tone].bg,
              color: "#FFFFFF",
              boxShadow: "var(--shadow-md)",
            }}
          >
            {TONE_STYLES[t.tone].icon}
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick();
                  onDismiss(t.id);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold underline underline-offset-2 shrink-0"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => onDismiss(t.id)}
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 opacity-70 hover:opacity-100"
              aria-label="ปิดการแจ้งเตือน"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hook that gives a component a toast queue.
 *
 *   const { toasts, toast, dismiss } = useToasts();
 *   toast("เพิ่มแล้ว");
 *   toast("สั่งไม่สำเร็จ", "bad");
 */
export function useToasts(duration = 4200) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const toast = useCallback(
    (
      message: string,
      tone: ToastTone = "ok",
      action?: ToastMessage["action"]
    ) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, tone, action }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss, duration]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach(clearTimeout);
    };
  }, []);

  return { toasts, toast, dismiss };
}
