"use client";

import { useEffect, type RefObject } from "react";
import { gsap } from "./gsapSetup";
import { getLenis } from "./scroll";
import { LIQUID } from "./motion";

/**
 * Element-level companion to the in-shader liquid warp: the hero's media
 * block itself flexes with the scroll, like a semi-liquid object being
 * pushed. Signed Lenis velocity drives it, so the two directions differ —
 * scrolling down anchors the body at its top edge and lets it trail
 * downward, scrolling up anchors it at the bottom — and it settles back
 * with inertia rather than snapping.
 *
 * Deliberately kept on a separate layer from the shader effects:
 *  - the aperture is normalized to the viewport (`trackWindow`), so this
 *    transform can never feed back into the cursor mask's coordinates;
 *  - CSS transforms don't change border-box size, so the canvas's
 *    ResizeObserver never fires because of it;
 *  - both axes only scale *up*, so a full-bleed hero can't expose a gap;
 *  - at rest the transform is removed entirely, leaving the canvas crisp.
 *
 * Runs on the GSAP ticker (the same clock as Lenis and ScrollTrigger),
 * pauses off-screen, and is skipped under prefers-reduced-motion.
 */
export function useLiquidBody(
  ref: RefObject<HTMLElement | null>,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let signed = 0; // smoothed, signed deflection -1..1
    let lastPos = window.scrollY;
    let attached = false;

    const tick = (_t: number, deltaMs: number) => {
      const dt = Math.min(0.05, deltaMs / 1000);

      const lenis = getLenis();
      const pos = lenis ? lenis.scroll : window.scrollY;
      const delta = pos - lastPos;
      lastPos = pos;

      // Lenis velocity while it is actually moving; a plain position delta
      // when Lenis is absent (reduced motion elsewhere on the page).
      let v = lenis ? lenis.velocity : delta / Math.max(dt, 1e-3) / 60;

      // Lenis keeps its last velocity after its animation finishes, so a
      // stalled scroll position must force the reading to zero — otherwise
      // the body would never fully return to its resting shape.
      if (Math.abs(delta) < 0.05) v = 0;

      const target = Math.max(
        -1,
        Math.min(1, v / LIQUID.bodyVelocityScale)
      );

      // build quickly with the push, settle back with inertia
      if (Math.abs(target) > Math.abs(signed)) {
        const k = 1 - Math.pow(1 - LIQUID.bodyInertia, dt * 60);
        signed += (target - signed) * k;
      } else {
        signed += (target - signed) * (1 - Math.exp(-LIQUID.bodyDecay * dt));
      }
      // below this the shape is sub-pixel — drop the transform entirely
      if (Math.abs(signed) < 0.004) signed = 0;

      if (signed === 0) {
        // fully at rest — no transform at all, canvas stays pixel-crisp
        if (el.style.transform) {
          el.style.transform = "";
          el.style.transformOrigin = "";
        }
        return;
      }

      const mag = Math.abs(signed);
      const scaleY = 1 + mag * LIQUID.bodyStretch;
      const scaleX = 1 + mag * LIQUID.bodyStretch * LIQUID.bodyNarrow;
      const skew = signed * LIQUID.bodySkew;

      // the anchored edge is what makes down and up read differently
      el.style.transformOrigin = signed > 0 ? "50% 0%" : "50% 100%";
      el.style.transform = `scale(${scaleX.toFixed(5)}, ${scaleY.toFixed(
        5
      )}) skewY(${skew.toFixed(4)}deg)`;
    };

    const setAttached = (on: boolean) => {
      if (on === attached) return;
      attached = on;
      if (on) {
        gsap.ticker.add(tick);
      } else {
        gsap.ticker.remove(tick);
        el.style.transform = "";
        el.style.transformOrigin = "";
        signed = 0;
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => setAttached(entry.isIntersecting && !document.hidden),
      { threshold: 0 }
    );
    io.observe(el);

    const onVisibility = () =>
      setAttached(!document.hidden && el.getBoundingClientRect().bottom > 0);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      setAttached(false);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ref, enabled]);
}
