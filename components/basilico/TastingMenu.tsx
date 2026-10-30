"use client";

import { useEffect, useRef } from "react";
import { gsap, registerGsap } from "@/lib/basilico/gsap-setup";
import { TASTING_COLUMNS } from "@/lib/basilico/data";
import { Reveal } from "@/components/basilico/Reveal";

export function TastingMenu() {
  const colsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGsap();
    const el = colsRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".basil-taste-col",
        { y: 64, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.4,
          stagger: 0.22,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section id="tasting" className="scroll-mt-20 py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-5 md:px-8">
        <Reveal className="mb-14 text-center">
          <p className="mb-3 text-xs font-light uppercase tracking-[0.4em] text-[#D9A35F]">
            Seven Courses · ฿4,900
          </p>
          <h2 className="font-serif text-4xl text-white md:text-5xl">
            The Tasting Journey
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base font-light text-[#BDBDBD]">
            A single evening, told in three acts. Wine pairing available with
            every chapter.
          </p>
        </Reveal>

        <div ref={colsRef} className="grid gap-6 md:grid-cols-3">
          {TASTING_COLUMNS.map((col) => (
            <div
              key={col.heading}
              className="basil-taste-col rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_30px_rgba(217,163,95,0.08)] backdrop-blur-md"
              style={{ opacity: 0 }}
            >
              <h3 className="mb-7 text-center font-serif text-2xl italic text-[#D9A35F]">
                {col.heading}
              </h3>
              <ol className="space-y-6">
                {col.courses.map((c) => (
                  <li key={c.no} className="flex gap-4">
                    <span className="font-serif text-lg text-[#D9A35F]/70">{c.no}</span>
                    <div>
                      <p className="font-serif text-lg text-white">{c.name}</p>
                      <p className="mt-0.5 text-sm font-light text-[#BDBDBD]">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
