"use client";

import { useRef } from "react";
import { PARTICLE } from "@/lib/motion";

/**
 * CPU side of the glitch: smoothed mouse, travel direction, velocity, and
 * the master intensity with fast attack and a two-stage release (quick
 * collapse, then a slow settle to a non-zero rest floor — the image never
 * fully goes still).
 *
 * Optional ambient mode (touch devices): after a short idle window the
 * cursor drifts autonomously on a lissajous path so the effect stays alive
 * without input.
 */

export interface GlitchDynamics {
  mouse: { x: number; y: number };
  mouseDir: { x: number; y: number };
  velocity: number;
  intensity: number;
  /** feed a pointer/touch position, normalized 0-1 (y up) */
  input: (x: number, y: number) => void;
  /** cursor left the tracked area */
  release: () => void;
  /** advance one frame; dt in seconds */
  update: (dt: number, elapsed: number) => void;
}

export function createGlitchDynamics(
  restIntensity: number,
  ambient: boolean
): GlitchDynamics {
  const target = { x: 0.5, y: 0.5 };
  let lastInputAt = -Infinity;
  let hasInput = false;
  let velocityTarget = 0;

  const d: GlitchDynamics = {
    mouse: { x: 0.5, y: 0.5 },
    mouseDir: { x: 1, y: 0 },
    velocity: 0,
    intensity: restIntensity,

    input(x: number, y: number) {
      const now = performance.now() / 1000;
      const dx = x - target.x;
      const dy = y - target.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.0005) {
        // exposential-ish smoothing of travel direction
        d.mouseDir.x += (dx / dist - d.mouseDir.x) * 0.2;
        d.mouseDir.y += (dy / dist - d.mouseDir.y) * 0.2;
      }
      // speed → velocity target (normalized: full-element crossing ≈ 1)
      velocityTarget = Math.min(1, velocityTarget + dist * 6);
      target.x = x;
      target.y = y;
      lastInputAt = now;
      hasInput = true;
    },

    release() {
      hasInput = false;
    },

    update(dt: number, elapsed: number) {
      const now = performance.now() / 1000;
      const idle = now - lastInputAt;

      // ambient drift for touch: takes over after a beat of inactivity
      if (ambient && idle > 1.6) {
        target.x = 0.5 + 0.34 * Math.sin(elapsed * 0.23);
        target.y = 0.5 + 0.3 * Math.sin(elapsed * 0.31 + 1.7);
        velocityTarget = Math.max(velocityTarget, 0.16 + 0.1 * Math.sin(elapsed * 0.5));
        hasInput = true;
      }

      // frame-rate-independent lerp factors (constants tuned at 60 fps)
      const f = (k: number) => 1 - Math.pow(1 - k, dt * 60);

      d.mouse.x += (target.x - d.mouse.x) * f(0.18);
      d.mouse.y += (target.y - d.mouse.y) * f(0.18);

      // velocity target bleeds off quickly once input stops
      velocityTarget *= Math.pow(0.0025, dt);
      d.velocity += (velocityTarget - d.velocity) * f(0.16);

      // intensity: fast attack toward 1 while moving; two-stage release
      const active = hasInput && idle < 0.12 && velocityTarget > 0.02;
      if (active) {
        d.intensity += (1 - d.intensity) * f(PARTICLE.attack);
      } else {
        const k =
          d.intensity > PARTICLE.releaseKnee ? PARTICLE.releaseFast : PARTICLE.releaseSlow;
        d.intensity += (restIntensity - d.intensity) * f(k);
      }
    },
  };

  return d;
}

/** Stable per-component dynamics instance. */
export function useGlitchUniforms(restIntensity: number, ambient: boolean) {
  const ref = useRef<GlitchDynamics | null>(null);
  if (ref.current === null) {
    ref.current = createGlitchDynamics(restIntensity, ambient);
  }
  return ref.current;
}
