"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, setupGsap } from "@/lib/gsapSetup";
import { setLenis } from "@/lib/scroll";
import { SCROLL } from "@/lib/motion";

/**
 * Lenis wrapper. Drives Lenis from the GSAP ticker so ScrollTrigger,
 * scroll-spy, and every scroll-linked effect share one clock.
 * Skipped entirely under prefers-reduced-motion — native scroll remains.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    setupGsap();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      lerp: SCROLL.lerp,
      wheelMultiplier: SCROLL.wheelMultiplier,
      smoothWheel: true,
    });
    setLenis(lenis);

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return <>{children}</>;
}
