"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FEATURED_DISHES, FULL_MENU } from "@/lib/basilico/data";
import { Reveal } from "@/components/basilico/Reveal";

export function FeaturedDishes({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <section id="dishes" className="scroll-mt-20 py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-5 md:px-8">
        <Reveal>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="mb-3 text-xs font-light uppercase tracking-[0.4em] text-[#D9A35F]">
                Signature Collection
              </p>
              <h2 className="font-serif text-4xl text-white md:text-5xl">
                Featured Dishes
              </h2>
            </div>
            <button
              onClick={onOpenMenu}
              className="group flex items-center gap-2 rounded-full border border-[#D9A35F]/50 px-6 py-3 text-sm font-light tracking-[0.12em] text-[#D9A35F] transition-all duration-500 hover:bg-[#D9A35F] hover:text-[#070707]"
            >
              View Full Menu
              <ArrowRight size={16} className="transition-transform duration-500 group-hover:translate-x-1" />
            </button>
          </div>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_DISHES.map((dish, i) => (
            <Reveal key={dish.name} delay={(i % 4) * 0.12}>
              <article className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(217,163,95,0.06)] backdrop-blur-md transition-all duration-700 hover:shadow-[0_0_30px_rgba(217,163,95,0.15)]">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={dish.image}
                    alt={dish.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070707]/70 via-transparent to-transparent" />
                  <span className="absolute right-4 top-4 rounded-full border border-white/10 bg-[#070707]/50 px-4 py-1.5 font-serif text-lg text-[#D9A35F] backdrop-blur-md">
                    {dish.price}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl text-white">{dish.name}</h3>
                  <p className="mt-2 text-sm font-light leading-relaxed text-[#BDBDBD]">
                    {dish.description}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FullMenuModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[150] overflow-y-auto bg-[#070707]/80 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Full menu"
    >
      <div
        className="mx-auto my-10 w-[min(92vw,900px)] rounded-3xl border border-white/10 bg-[#0c0c0c]/95 p-8 shadow-[0_0_30px_rgba(217,163,95,0.15)] md:p-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-light uppercase tracking-[0.4em] text-[#D9A35F]">
            Basilico
          </p>
          <h2 className="font-serif text-4xl text-white md:text-5xl">The Menu</h2>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-[#D9A35F] to-transparent" />
        </div>

        <div className="space-y-12">
          {FULL_MENU.map((cat) => (
            <div key={cat.title}>
              <h3 className="mb-6 text-center font-serif text-2xl italic text-[#D9A35F]">
                {cat.title}
              </h3>
              <ul className="space-y-5">
                {cat.items.map((item) => (
                  <li key={item.name}>
                    <div className="flex items-baseline gap-3">
                      <span className="font-serif text-lg text-white">{item.name}</span>
                      <span
                        aria-hidden
                        className="mx-1 flex-1 border-b border-dashed border-white/20"
                      />
                      <span className="font-serif text-lg text-[#D9A35F]">{item.price}</span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm font-light text-[#BDBDBD]">
                        {item.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={onClose}
            className="rounded-full border border-[#D9A35F] px-8 py-3 text-sm font-light tracking-[0.14em] text-[#D9A35F] transition-all duration-500 hover:bg-[#D9A35F] hover:text-[#070707]"
          >
            Close Menu
          </button>
        </div>
      </div>
    </motion.div>
  );
}
