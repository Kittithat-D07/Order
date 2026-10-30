"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap, registerGsap } from "@/lib/basilico/gsap-setup";
import { Reveal } from "@/components/basilico/Reveal";

export function About() {
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGsap();
    const el = imgRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { scale: 0.9, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 1.8,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section id="about" className="scroll-mt-20 py-24 md:py-32">
      <div className="mx-auto grid max-w-[1280px] items-center gap-14 px-5 md:px-8 lg:grid-cols-2">
        <Reveal>
          <div>
            <p className="mb-3 text-xs font-light uppercase tracking-[0.4em] text-[#D9A35F]">
              Our Story
            </p>
            <h2 className="font-serif text-4xl leading-tight text-white md:text-5xl">
              Fire, Patience,
              <br />
              and Quiet Precision
            </h2>
            <div className="mt-7 space-y-5 text-base font-light leading-relaxed text-[#BDBDBD]">
              <p>
                Chef Alexander Thorne believes a dish should whisper before it
                sings. At Basilico, oak fire meets modern restraint — every
                plate is built slowly, seasoned boldly, and finished in silence.
              </p>
              <p>
                From dry-aged duck to ember-roasted wagyu, the kitchen honours
                classical French technique while letting Southeast Asian smoke
                and spice speak through the cracks.
              </p>
            </div>
            <p className="mt-8 font-serif text-4xl italic text-[#BDBDBD] opacity-80">
              Alexander Thorne
            </p>
            <p className="mt-1 text-xs font-light uppercase tracking-[0.3em] text-[#D9A35F]/80">
              Chef &amp; Founder
            </p>
          </div>
        </Reveal>

        <div className="flex justify-center" ref={imgRef} style={{ opacity: 0 }}>
          <div className="relative aspect-square w-full max-w-[440px]">
            <div
              aria-hidden
              className="absolute -inset-4 rounded-full border border-[#D9A35F]/20"
            />
            <div
              aria-hidden
              className="absolute -inset-10 rounded-full border border-[#D9A35F]/10"
            />
            <div className="relative h-full w-full overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(217,163,95,0.2)]">
              <Image
                src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=800&auto=format&fit=crop"
                alt="Chef Alexander Thorne at work"
                fill
                sizes="(max-width: 1024px) 90vw, 440px"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-[#070707]/60 px-6 py-2.5 text-xs font-light uppercase tracking-[0.3em] text-[#D9A35F] backdrop-blur-md">
              18 Years of Craft
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
