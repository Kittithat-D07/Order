"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, registerGsap } from "@/lib/basilico/gsap-setup";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
}

/** Slow, deliberate scroll reveal — luxury never rushes. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 48,
  duration = 1.4,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGsap();
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration,
          delay,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        }
      );
    }, el);
    return () => ctx.revert();
  }, [delay, y, duration]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
