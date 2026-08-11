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
  enabled = true,
  frameRef?: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const frame = frameRef?.current ?? null;

    let signed = 0; // smoothed, signed deflection -1..1
    let lastPos = window.scrollY;
    let attached = false;

    /**
     * The silhouette: each edge is sampled along a bow curve so the middle
     * of the edge swells inward — the frame stops being a rectangle rather
     * than merely getting rounded corners. A travelling secondary ripple
     * keeps it undulating instead of a clean parabola. Corners stay pinned,
     * so the shape can never tear away from the layout.
     */
    const silhouette = (s: number, t: number) => {
      const mag = Math.abs(s);
      const bow = LIQUID.silhouetteBow * mag;
      const lead = bow * LIQUID.silhouetteLeadRatio;
      // scrolling down ⇒ the top edge trails and bows deepest; up mirrors it
      const top = s > 0 ? bow : lead;
      const bottom = s > 0 ? lead : bow;
      const side = bow * LIQUID.silhouetteSideRatio;
      const n = LIQUID.silhouetteSegments;

      const wave = (u: number, phase: number) =>
        Math.sin(Math.PI * u) *
        (1 +
          LIQUID.silhouetteWave *
            Math.sin(u * Math.PI * 3 + t * LIQUID.silhouetteWaveSpeed + phase));

      const pts: string[] = [];
      const p = (x: number, y: number) =>
        pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);

      for (let i = 0; i <= n; i++) {
        const u = i / n;
        p(u * 100, top * wave(u, 0));
      }
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        p(100 - side * wave(u, 1.7), u * 100);
      }
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        p(100 - u * 100, 100 - bottom * wave(1 - u, 3.1));
      }
      for (let i = 1; i < n; i++) {
        const u = i / n;
        p(side * wave(1 - u, 4.6), 100 - u * 100);
      }
      return `polygon(${pts.join(", ")})`;
    };

    const tick = (t: number, deltaMs: number) => {
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
        // fully at rest — no transform at all, canvas stays pixel-crisp,
        // and the frame goes back to being a plain rectangle (no clipping)
        if (el.style.transform) {
          el.style.transform = "";
          el.style.transformOrigin = "";
        }
        if (frame && frame.style.clipPath) frame.style.clipPath = "";
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

      // the frame's own outline, deformed by the same deflection
      if (frame) frame.style.clipPath = silhouette(signed, t);
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
        if (frame) frame.style.clipPath = "";
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
  }, [ref, enabled, frameRef]);
}
