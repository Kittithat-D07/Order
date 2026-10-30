import type Lenis from "lenis";

let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Smooth-scroll to an anchor id (e.g. "#dishes"). Falls back to native. */
export function scrollToSection(selector: string) {
  const current = lenis;
  if (current) {
    current.scrollTo(selector, { offset: -72, duration: 1.6 });
    return;
  }
  document.querySelector(selector)?.scrollIntoView({ behavior: "smooth" });
}
