"use client";

import { useRef } from "react";
import { LIQUID } from "@/lib/motion";
import { getLenis } from "@/lib/scroll";

/**
 * CPU side of the liquid surfaces: smoothed cursor, cursor speed, and the
 * three envelopes the shader reads.
 *
 *  - `reveal` (hero aperture): rises with cursor speed and eases open
 *    quickly, eases shut slowly, and reaches exactly 0 when the cursor
 *    rests — the window closes completely, leaving only the top layer.
 *  - `push` (card hover): the same speed signal at a lower ceiling, with
 *    an exponential settle once the cursor slows or leaves.
 *  - `scroll`: driven by Lenis velocity, decaying with inertia — the
 *    surface is a liquid the scroll disturbs.
 *
 * Optional ambient mode (touch): after a short idle window the cursor
 * drifts autonomously so the effect is alive without a pointer.
 */

export interface LiquidDynamics {
  cursor: { x: number; y: number };
  /**
   * Aperture centres, head first. Each chases the cursor with a longer lag
   * than the one before it, which is what gives the opening its trailing
   * tail; summed and thresholded in the shader they fuse into one goo blob.
   */
  blobs: { x: number; y: number }[];
  /** smoothed cursor speed, roughly 0–1 */
  speed: number;
  reveal: number;
  push: number;
  scroll: number;
  /** feed a pointer/touch position, normalized 0–1 (y up) */
  input: (x: number, y: number) => void;
  /** pointer left the tracked area */
  release: () => void;
  /** advance one frame; dt in seconds */
  update: (dt: number, elapsed: number) => void;
}

export function createLiquidDynamics(ambient: boolean): LiquidDynamics {
  const target = { x: 0.5, y: 0.5 };
  let lastInputAt = -Infinity;
  let hasPointer = false;
  let speedTarget = 0;
  let lastScrollY = typeof window === "undefined" ? 0 : window.scrollY;

  const blobCount = Math.max(1, Math.min(5, LIQUID.blobCount));

  const d: LiquidDynamics = {
    cursor: { x: 0.5, y: 0.5 },
    blobs: Array.from({ length: blobCount }, () => ({ x: 0.5, y: 0.5 })),
    speed: 0,
    reveal: 0,
    push: 0,
    scroll: 0,

    input(x: number, y: number) {
      const dx = x - target.x;
      const dy = y - target.y;
      const dist = Math.hypot(dx, dy);
      if (!hasPointer) {
        // entering the element must not read as a huge jump in speed
        d.cursor.x = x;
        d.cursor.y = y;
        hasPointer = true;
      } else {
        speedTarget = Math.min(1.5, speedTarget + dist * 7);
      }
      target.x = x;
      target.y = y;
      lastInputAt = performance.now() / 1000;
    },

    release() {
      hasPointer = false;
      speedTarget = 0;
    },

    update(dt: number, elapsed: number) {
      const now = performance.now() / 1000;
      const idle = now - lastInputAt;

      // touch devices: autonomous drift takes over after a beat of stillness
      if (ambient && idle > LIQUID.ambientIdle) {
        const nx = 0.5 + 0.3 * Math.sin(elapsed * 0.27);
        const ny = 0.5 + 0.26 * Math.sin(elapsed * 0.36 + 1.7);
        const dist = Math.hypot(nx - target.x, ny - target.y);
        target.x = nx;
        target.y = ny;
        speedTarget = Math.max(speedTarget, LIQUID.ambient + dist * 5);
        hasPointer = true;
      }

      // frame-rate-independent lerp helper (constants tuned at 60 fps)
      const f = (k: number) => 1 - Math.pow(1 - k, dt * 60);

      d.cursor.x += (target.x - d.cursor.x) * f(0.18);
      d.cursor.y += (target.y - d.cursor.y) * f(0.18);

      // the speed signal bleeds off fast once the pointer stops moving
      speedTarget *= Math.pow(0.0025, dt);
      d.speed += (speedTarget - d.speed) * f(0.2);

      // --- hero aperture: quick to open, slow to settle shut -------------
      const revealTarget = hasPointer
        ? Math.min(1, d.speed * LIQUID.velocityResponse)
        : 0;
      d.reveal +=
        (revealTarget - d.reveal) *
        f(revealTarget > d.reveal ? LIQUID.openInertia : LIQUID.closeInertia);
      if (d.reveal < 0.01 && revealTarget === 0) d.reveal = 0;

      // --- aperture centres: each lags more than the one ahead of it ------
      // Faster cursor ⇒ longer lag ⇒ the tail stretches out behind it.
      const stretch = 1 + d.speed * LIQUID.tailStretch;
      for (let i = 0; i < d.blobs.length; i++) {
        const b = d.blobs[i];
        if (d.reveal === 0) {
          // window shut: collapse everything onto the cursor so the next
          // opening starts clean instead of dragging a stale tail
          b.x = d.cursor.x;
          b.y = d.cursor.y;
          continue;
        }
        const t = d.blobs.length > 1 ? i / (d.blobs.length - 1) : 0;
        const lag =
          (LIQUID.blobLeadLag +
            (LIQUID.blobTailLag - LIQUID.blobLeadLag) * t) *
          stretch;
        const k = 1 - Math.exp(-dt / Math.max(lag / 3, 1e-4));
        b.x += (d.cursor.x - b.x) * k;
        b.y += (d.cursor.y - b.y) * k;
      }

      // --- card push ------------------------------------------------------
      const pushTarget = hasPointer ? Math.min(1, d.speed * 1.35) : 0;
      if (pushTarget > d.push) {
        d.push += (pushTarget - d.push) * f(LIQUID.cardInertia);
      } else {
        d.push += (pushTarget - d.push) * (1 - Math.exp(-LIQUID.cardDecay * dt));
      }

      // --- scroll-driven warp --------------------------------------------
      const lenis = getLenis();
      let v: number;
      if (lenis) {
        v = Math.abs(lenis.velocity);
      } else {
        v = Math.abs(window.scrollY - lastScrollY) / Math.max(dt, 1e-3) / 60;
        lastScrollY = window.scrollY;
      }
      const scrollTarget = Math.min(1, v * LIQUID.scrollResponse);
      if (scrollTarget > d.scroll) {
        d.scroll += (scrollTarget - d.scroll) * f(0.25);
      } else {
        d.scroll +=
          (scrollTarget - d.scroll) * (1 - Math.exp(-LIQUID.scrollDecay * dt));
      }
    },
  };

  return d;
}

/** Stable per-component dynamics instance. */
export function useLiquidDynamics(ambient: boolean) {
  const ref = useRef<LiquidDynamics | null>(null);
  if (ref.current === null) {
    ref.current = createLiquidDynamics(ambient);
  }
  return ref.current;
}
