"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { CustomEase } from "gsap/CustomEase";
import { EASE } from "./motion";

let registered = false;

/** Register GSAP plugins and named eases exactly once, client-side. */
export function setupGsap() {
  if (registered || typeof window === "undefined") return;
  registered = true;
  gsap.registerPlugin(ScrollTrigger, Flip, CustomEase);
  CustomEase.create(EASE.expansion, EASE.expansionCurve);
}

export { gsap, ScrollTrigger, Flip };
