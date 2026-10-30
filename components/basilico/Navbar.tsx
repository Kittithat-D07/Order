"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/lib/basilico/data";
import { scrollToSection } from "@/lib/basilico/lenis-store";

export function Navbar() {
  const [open, setOpen] = useState(false);

  const go = (href: string) => {
    setOpen(false);
    scrollToSection(href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-[100] border-b border-white/10 bg-[#070707]/50 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-5 md:px-8">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="font-serif text-2xl tracking-[0.18em] text-white"
          aria-label="Basilico home"
        >
          BASI<span className="text-[#D9A35F]">LICO</span>
        </button>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => go(l.href)}
              className="text-sm font-light tracking-[0.14em] text-[#BDBDBD] transition-colors duration-300 hover:text-[#D9A35F]"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => go("#reserve")}
            className="hidden rounded-full border border-[#D9A35F] px-6 py-2.5 text-sm font-light tracking-[0.14em] text-[#D9A35F] transition-all duration-500 hover:bg-[#D9A35F] hover:text-[#070707] hover:shadow-[0_0_30px_rgba(217,163,95,0.35)] sm:block"
          >
            Reserve Table
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-white/10 bg-white/5 p-2.5 text-white lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="overflow-hidden border-t border-white/10 bg-[#070707]/90 backdrop-blur-md lg:hidden"
            aria-label="Mobile"
          >
            <div className="mx-auto flex max-w-[1280px] flex-col gap-1 px-5 py-4">
              {NAV_LINKS.map((l) => (
                <button
                  key={l.href}
                  onClick={() => go(l.href)}
                  className="rounded-xl px-4 py-3 text-left text-base font-light tracking-[0.12em] text-[#BDBDBD] transition-colors hover:bg-white/5 hover:text-[#D9A35F]"
                >
                  {l.label}
                </button>
              ))}
              <button
                onClick={() => go("#reserve")}
                className="mt-2 rounded-full border border-[#D9A35F] px-6 py-3 text-sm tracking-[0.14em] text-[#D9A35F]"
              >
                Reserve Table
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
