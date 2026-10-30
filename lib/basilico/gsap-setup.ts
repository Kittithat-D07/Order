import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/** Register GSAP plugins exactly once (safe to call from any component). */
export function registerGsap() {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
}

/** Refresh triggers after images/fonts settle. */
export function refreshTriggers() {
  try {
    ScrollTrigger.refresh();
  } catch {
    /* noop */
  }
}

export { gsap, ScrollTrigger };
