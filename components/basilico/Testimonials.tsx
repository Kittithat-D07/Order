"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { TESTIMONIALS } from "@/lib/basilico/data";
import { Reveal } from "@/components/basilico/Reveal";

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const total = TESTIMONIALS.length;

  const go = (next: number, d: number) => {
    setDir(d);
    setIndex((next + total) % total);
  };

  const t = TESTIMONIALS[index];

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-5 md:px-8">
        <Reveal className="mb-12 text-center">
          <p className="mb-3 text-xs font-light uppercase tracking-[0.4em] text-[#D9A35F]">
            Critical Acclaim
          </p>
          <h2 className="font-serif text-4xl text-white md:text-5xl">
            Words From the Critics
          </h2>
        </Reveal>

        <Reveal>
          <div className="relative mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 px-8 py-12 text-center shadow-[0_0_30px_rgba(217,163,95,0.08)] backdrop-blur-md md:px-14">
            <Quote className="mx-auto mb-6 text-[#D9A35F]/60" size={36} />
            <AnimatePresence mode="wait" custom={dir}>
              <motion.figure
                key={index}
                initial={{ opacity: 0, x: 60 * dir }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 * dir }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                <blockquote className="font-serif text-2xl italic leading-relaxed text-white md:text-3xl">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-7">
                  <p className="text-sm font-normal tracking-[0.2em] text-[#D9A35F]">
                    {t.author}
                  </p>
                  <p className="mt-1 text-xs font-light tracking-[0.14em] text-[#BDBDBD]">
                    {t.role}
                  </p>
                </figcaption>
              </motion.figure>
            </AnimatePresence>

            <div className="mt-9 flex items-center justify-center gap-4">
              <button
                onClick={() => go(index - 1, -1)}
                className="rounded-full border border-white/15 p-3 text-[#BDBDBD] transition-all duration-400 hover:border-[#D9A35F]/60 hover:text-[#D9A35F]"
                aria-label="Previous testimonial"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex gap-2">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => go(i, i > index ? 1 : -1)}
                    aria-label={`Go to testimonial ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === index ? "w-8 bg-[#D9A35F]" : "w-1.5 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => go(index + 1, 1)}
                className="rounded-full border border-white/15 p-3 text-[#BDBDBD] transition-all duration-400 hover:border-[#D9A35F]/60 hover:text-[#D9A35F]"
                aria-label="Next testimonial"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
