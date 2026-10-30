"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * Custom dot cursor. Desktop pointers only — hidden on touch devices.
 * The native cursor is suppressed via scoped CSS in the page (pointer:fine).
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    setEnabled(true);
    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as HTMLElement | null;
      setHovering(!!t?.closest("a, button, input, select, textarea, [data-hover]"));
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      {/* core dot */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[200] rounded-full"
        style={{
          x: sx,
          y: sy,
          translateX: "-50%",
          translateY: "-50%",
          width: hovering ? 56 : 10,
          height: hovering ? 56 : 10,
          backgroundColor: hovering ? "rgba(217,163,95,0.18)" : "#D9A35F",
          border: hovering ? "1px solid rgba(217,163,95,0.8)" : "none",
        }}
        transition={{ type: "tween", duration: 0.25 }}
      />
      {/* trailing ring */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[200] hidden rounded-full border border-[#D9A35F]/40 md:block"
        style={{ x, y, translateX: "-50%", translateY: "-50%", width: 34, height: 34 }}
      />
    </>
  );
}
