"use client";

import Image from "next/image";
import { GALLERY } from "@/lib/basilico/data";
import { Reveal } from "@/components/basilico/Reveal";

export function Gallery() {
  return (
    <section id="gallery" className="scroll-mt-20 py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-5 md:px-8">
        <Reveal className="mb-12 text-center">
          <p className="mb-3 text-xs font-light uppercase tracking-[0.4em] text-[#D9A35F]">
            Visual Story
          </p>
          <h2 className="font-serif text-4xl text-white md:text-5xl">
            Moments in Gold
          </h2>
        </Reveal>

        <div className="columns-2 gap-4 md:columns-3 [&>*]:mb-4">
          {GALLERY.map((g, i) => (
            <Reveal key={g.src + i} delay={(i % 3) * 0.1}>
              <figure
                className={`group relative overflow-hidden rounded-2xl border border-white/10 ${
                  g.tall ? "aspect-[3/4]" : "aspect-square"
                }`}
              >
                <Image
                  src={g.src}
                  alt={g.alt}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  loading="lazy"
                  className="object-cover transition-transform duration-[1.8s] ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707]/60 via-transparent to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                <figcaption className="absolute inset-x-0 bottom-0 translate-y-3 p-4 text-sm font-light tracking-[0.08em] text-white opacity-0 transition-all duration-700 group-hover:translate-y-0 group-hover:opacity-100">
                  {g.alt}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
