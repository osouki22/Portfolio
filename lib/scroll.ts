"use client";

import type Lenis from "lenis";

/**
 * Shared accessor for the single Lenis instance created by SmoothScroll.
 * Null when smooth scroll is disabled (reduced motion) — callers must
 * fall back to native scrolling.
 */
let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Scroll to an element or selector, smooth when Lenis is active. */
export function scrollToSection(target: string | HTMLElement) {
  if (lenis) {
    lenis.scrollTo(target, { offset: 0 });
  } else {
    const el =
      typeof target === "string" ? document.querySelector(target) : target;
    el?.scrollIntoView({ behavior: "smooth" });
  }
}

/** Lock/unlock page scroll (used by the expanded work view). */
export function lockScroll() {
  lenis?.stop();
  document.documentElement.classList.add("scroll-locked");
}

export function unlockScroll() {
  lenis?.start();
  document.documentElement.classList.remove("scroll-locked");
}
