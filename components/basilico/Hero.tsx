"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap, registerGsap } from "@/lib/basilico/gsap-setup";
import { HERO_BG, HERO_VIDEO } from "@/lib/basilico/data";
import { scrollToSection } from "@/lib/basilico/lenis-store";

const LINES = ["Crafting", "Exceptional", "Culinary", "Experiences"];

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    registerGsap();
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".basil-hero-line",
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.6, stagger: 0.14, ease: "power4.out", delay: 0.25 }
      );
      gsap.fromTo(
        ".basil-hero-fade",
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.4, stagger: 0.16, ease: "power3.out", delay: 1.0 }
      );
      gsap.to(".basil-hero-video", {
        y: -14,
        duration: 2.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#070707]">
        <Image
          src={HERO_BG}
          alt=""
          fill
          priority
          className="object-cover opacity-90"
          sizes="100vw"
        />
        {/* edge vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 45%, rgba(7,7,7,0.55) 100%)",
          }}
        />
        {/* left readability wash */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070707]/60 via-transparent to-transparent" />
        {/* bottom blend into page */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#070707] to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-[1280px] gap-12 px-5 pb-24 pt-36 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-32 lg:pt-44">
        {/* Headline */}
        <div>
          <p className="basil-hero-fade mb-6 text-xs font-light uppercase tracking-[0.4em] text-[#D9A35F]">
            Fine Dining · Est. 2012
          </p>
          <h1 className="font-serif text-[44px] font-medium leading-[1.08] text-white sm:text-[50px] lg:text-[58px]">
            {LINES.map((line) => (
              <span key={line} className="block overflow-hidden pb-1">
                <span
                  className={`basil-hero-line block ${
                    line === "Exceptional"
                      ? "bg-gradient-to-r from-[#D9A35F] via-[#F3D29A] to-[#C97A2B] bg-clip-text text-transparent"
                      : ""
                  }`}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <p className="basil-hero-fade mt-6 max-w-md text-base font-light leading-relaxed text-[#BDBDBD]">
            Seven courses. One fire. An evening composed like music — served
            beneath candlelight in the heart of the city.
          </p>
          <div className="basil-hero-fade mt-9 flex flex-wrap items-center gap-4">
            <button
              onClick={() => scrollToSection("#reserve")}
              className="rounded-full bg-[#D9A35F] px-8 py-3.5 text-sm font-normal tracking-[0.14em] text-[#070707] transition-all duration-500 hover:shadow-[0_0_30px_rgba(217,163,95,0.45)]"
            >
              Reserve Table
            </button>
            <button
              onClick={() => scrollToSection("#dishes")}
              className="rounded-full border border-white/20 px-8 py-3.5 text-sm font-light tracking-[0.14em] text-white transition-all duration-500 hover:border-[#D9A35F]/60 hover:text-[#D9A35F]"
            >
              Explore Menu
            </button>
          </div>
        </div>

        {/* Floating video card */}
        <div className="basil-hero-fade flex justify-center lg:justify-end">
          <div className="basil-hero-video relative w-full max-w-[450px]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(217,163,95,0.15)]">
              <video
                src={HERO_VIDEO}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-[#070707]/50 px-5 py-4 backdrop-blur-md">
                <p className="text-[11px] font-light uppercase tracking-[0.3em] text-[#D9A35F]">
                  Chef&apos;s Special
                </p>
                <p className="mt-1 font-serif text-xl text-white">
                  Truffle Wagyu Ribeye
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
