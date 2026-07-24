"use client";

import gsap from "gsap";
import { palettes, type PaletteKey } from "./palettes";
import { DUR, EASE } from "./motion";

let activeKey: PaletteKey = "default";
let tween: gsap.core.Tween | null = null;

/**
 * Tween the five mesh CSS custom properties on :root toward a palette.
 * The mesh gradient (and anything else reading the variables) follows
 * automatically — like a room's lighting shifting, never a hard cut.
 */
export function transitionPalette(key: PaletteKey, duration: number = DUR.palette) {
  if (typeof document === "undefined" || key === activeKey) return;
  activeKey = key;
  const p = palettes[key];
  tween?.kill();
  tween = gsap.to(document.documentElement, {
    "--mesh-base": p.base,
    "--mesh-1": p.c1,
    "--mesh-2": p.c2,
    "--mesh-3": p.c3,
    "--mesh-4": p.c4,
    duration,
    ease: EASE.palette,
    overwrite: "auto",
  });
}

export function resetPalette(duration?: number) {
  transitionPalette("default", duration);
}

export function getActivePalette(): PaletteKey {
  return activeKey;
}
