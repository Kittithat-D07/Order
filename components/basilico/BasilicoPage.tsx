"use client";

import { useEffect, useState } from "react";
import Lenis from "lenis";
import { ScrollTrigger, registerGsap } from "@/lib/basilico/gsap-setup";
import { refreshTriggers } from "@/lib/basilico/gsap-setup";
import { setLenis } from "@/lib/basilico/lenis-store";
import { CustomCursor } from "@/components/basilico/CustomCursor";
import { Navbar } from "@/components/basilico/Navbar";
import { Hero } from "@/components/basilico/Hero";
import { FeaturedDishes, FullMenuModal } from "@/components/basilico/FeaturedDishes";
import { About } from "@/components/basilico/About";
import { TastingMenu } from "@/components/basilico/TastingMenu";
import { Experience } from "@/components/basilico/Experience";
import { Testimonials } from "@/components/basilico/Testimonials";
import { Reservation } from "@/components/basilico/Reservation";
import { Gallery } from "@/components/basilico/Gallery";
import { Footer } from "@/components/basilico/Footer";

export function BasilicoPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    registerGsap();
    const lenis = new Lenis({ duration: 1.4, smoothWheel: true });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    const onLoad = () => refreshTriggers();
    window.addEventListener("load", onLoad);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("load", onLoad);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return (
    <div className="basilico min-h-screen bg-[#070707] text-white antialiased">
      {/* Scoped type + cursor rules: Playfair for serif, hide native cursor on fine pointers */}
      <style>{`
        .basilico .font-serif { font-family: var(--font-playfair), "Playfair Display", Georgia, serif; }
        @media (pointer: fine) {
          .basilico, .basilico a, .basilico button, .basilico input, .basilico select, .basilico textarea, .basilico [data-hover] { cursor: none; }
        }
      `}</style>

      <CustomCursor />
      <Navbar />

      <main className="mx-auto max-w-[1280px]">
        <Hero />
        <FeaturedDishes onOpenMenu={() => setMenuOpen(true)} />
        <About />
        <TastingMenu />
        <Experience />
        <Testimonials />
        <Reservation />
        <Gallery />
      </main>

      <div className="mx-auto max-w-[1280px]">
        <Footer />
      </div>

      <FullMenuModal open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
