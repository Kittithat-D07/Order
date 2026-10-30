"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap, registerGsap } from "@/lib/basilico/gsap-setup";
import { Reveal } from "@/components/basilico/Reveal";

const CARDS = [
  {
    title: "The Dining Room",
    text: "Candlelight, dark oak, and forty-two seats — never more.",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Private Dining",
    text: "A hidden salon for twelve, with its own chef and cellar pour.",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "The Wine Cellar",
    text: "Six hundred labels, sleeping beneath the restaurant.",
    image:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1000&auto=format&fit=crop",
  },
];

export function Experience() {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGsap();
    const el = bgRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { yPercent: -12 },
        {
          yPercent: 12,
          ease: "none",
          scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section id="experience" className="relative scroll-mt-20 overflow-hidden py-28 md:py-40">
      {/* parallax backdrop */}
      <div className="absolute inset-0">
        <div ref={bgRef} className="absolute -inset-y-[15%] inset-x-0">
          <Image
            src="https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=1600&auto=format&fit=crop"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-40"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#070707] via-[#070707]/40 to-[#070707]" />
      </div>

      <div className="relative mx-auto max-w-[1280px] px-5 md:px-8">
        <Reveal className="mb-14 text-center">
          <p className="mb-3 text-xs font-light uppercase tracking-[0.4em] text-[#D9A35F]">
            Beyond the Plate
          </p>
          <h2 className="font-serif text-4xl text-white md:text-5xl">
            An Immersive Evening
          </h2>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.12}>
              <div className="group relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/10">
                <Image
                  src={c.image}
                  alt={c.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-[2s] ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707]/90 via-[#070707]/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7">
                  <h3 className="font-serif text-2xl text-white">{c.title}</h3>
                  <p className="mt-2 text-sm font-light leading-relaxed text-[#BDBDBD]">
                    {c.text}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
