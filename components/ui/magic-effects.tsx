"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * AnimatedGrid - เส้นตารางเคลื่อนไหว (Magic UI style)
 */
export function AnimatedGrid({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-stone-50",
        className
      )}
    >
      <div className="absolute inset-0 [background-size:40px_40px] [background-image:linear-gradient(to_right,rgba(251,146,60,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(251,146,60,0.08)_1px,transparent_1px)]" />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-light/0 via-brand-light/30 to-accent-light/0"
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * BlurFade - Fade in with blur (Magic UI style)
 */
export function BlurFade({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * GradientBlob - ก้อนสีเบลอเคลื่อนไหว
 */
export function GradientBlob({
  className,
  delay = 0,
  color = "",
}: {
  className?: string;
  delay?: number;
  color?: string;
}) {
  return (
    <motion.div
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl opacity-50",
        color,
        className
      )}
      animate={{
        x: [0, 30, -20, 0],
        y: [0, -30, 20, 0],
        scale: [1, 1.1, 0.9, 1],
      }}
      transition={{
        duration: 15,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

/**
 * Shimmer - แสงวิบวับวิ่งผ่าน
 */
export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-stone-100",
        className
      )}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}

/**
 * PulseDot - จุดเต้น (สำหรับสถานะ online)
 */
export function PulseDot({
  color = "bg-ok",
}: {
  color?: string;
}) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
          color
        )}
      />
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          color
        )}
      />
    </span>
  );
}

/**
 * FloatingElement - ลอยขึ้นลง
 */
export function FloatingElement({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{
        duration: 3,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
