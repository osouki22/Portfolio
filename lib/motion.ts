/**
 * Every duration and easing curve on the site, named in one place.
 * Tune motion globally here — components never hardcode timing.
 *
 * Intent:
 *  - glitch: fast, mechanical, discrete (hardware failure)
 *  - about float: slow, continuous, organic (breathing)
 *  - work expansion: confident and substantial, never snappy
 *  - palette shifts: slow and ambient, like a room's lighting changing
 *  - scroll reveals: restrained, one idea executed precisely
 */

export const DUR = {
  /** mesh palette crossfade */
  palette: 0.85,
  /** Flip open of a work card into the expanded view */
  expandOpen: 0.95,
  /** Flip close back to the grid */
  expandClose: 0.75,
  /** prev/next content swap inside the expanded view (faster than the Flip) */
  projectSwap: 0.45,
  /** scroll-in reveal of section content */
  reveal: 1.0,
  /** grid cards fading back when one expands */
  gridRecede: 0.6,
  /** side-nav label reveal */
  navLabel: 0.35,
} as const;

export const EASE = {
  /** default deceleration for reveals and UI */
  out: "power3.out",
  /** symmetric moves (palette, nav scroll) */
  inOut: "power2.inOut",
  /**
   * The work expansion — a custom curve with weight: fast commitment,
   * long confident settle. Registered as "expansion" via CustomEase.
   */
  expansionCurve: "M0,0 C0.72,0 0.16,1 1,1",
  expansion: "expansion",
  /** prev/next swap — quicker, decisive */
  swap: "power2.out",
  /** palette drift */
  palette: "sine.inOut",
} as const;

/** Glitch CPU-side dynamics (per-frame lerp factors at 60 fps). */
export const GLITCH = {
  /** how fast uIntensity rises on cursor movement */
  attack: 0.22,
  /** first-stage release — quick collapse */
  releaseFast: 0.1,
  /** second-stage release — slow final settle */
  releaseSlow: 0.03,
  /** intensity below which release switches to the slow stage */
  releaseKnee: 0.3,
  /** resting intensity floor — scanlines/grain persist, image stays alive */
  restHero: 0.07,
  restCard: 0.05,
  /** strip re-randomization rate (Hz) — discrete, not continuous */
  stepRate: 12.0,
  /** max horizontal strip displacement (uv units) */
  maxShiftHero: 0.16,
  maxShiftCard: 0.09, // ~55% of hero — grid must stay legible
} as const;

/** About floating text. */
export const FLOAT = {
  /** vertical drift amplitude in px */
  amp: 5,
  /** rotational drift amplitude in degrees */
  rot: 0.6,
  /** base period in seconds (per-word phase offsets desynchronize it) */
  period: 6.5,
  /** cursor repulsion radius in px */
  radius: 180,
  /** max repulsion displacement in px */
  push: 26,
  /** over-damped spring: per-frame lerp toward target (no bounce) */
  damping: 0.075,
} as const;

/** Lenis config — refined, not floaty. */
export const SCROLL = {
  lerp: 0.09,
  wheelMultiplier: 1.0,
} as const;
