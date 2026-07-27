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
  /** expanded content stagger-in — starts only after the Flip completes */
  expandContentIn: 0.6,
  /** expanded content fade-out before the close Flip starts */
  expandContentOut: 0.2,
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

/**
 * Particle drag field (hero + work cards) — CPU envelope and the
 * displacement-field physics run in components/gl/shaders/sim.frag.
 */
export const PARTICLE = {
  /** how fast the grain/chroma envelope rises on cursor movement */
  attack: 0.22,
  /** first-stage release — quick collapse */
  releaseFast: 0.1,
  /** second-stage release — slow final settle */
  releaseSlow: 0.03,
  /** envelope level below which release switches to the slow stage */
  releaseKnee: 0.3,
  /** resting envelope floor — grain persists, the image stays alive */
  restHero: 0.07,
  restCard: 0.05,
  /** displacement ceiling in uv units */
  maxShiftHero: 0.22,
  maxShiftCard: 0.12, // ~55% of hero — grid must stay legible
  /** field physics: drag along cursor vector, spring home, damped settle */
  drag: 2.4,
  springK: 0.03,
  damping: 0.72,
  dt: 1.0,
  /** cursor proximity falloff radius (uv units, aspect-corrected) */
  radiusHero: 0.24,
  radiusCard: 0.34,
  /** sim field resolution (longest side, texels) */
  simSize: 192,
} as const;

/** Deformable mesh-text (About + Contact headlines) — reference physics. */
export const MESH_TEXT = {
  gridW: 96,
  gridH: 40,
  drag: 1.8,
  springK: 0.08,
  damping: 0.9,
  dt: 0.1,
  chroma: 0.005,
  /** cursor proximity falloff (normalized element space) */
  radius: 0.05,
  /** chromatic fringe colors — confirmed decision: NOT the site palette */
  colorA: "#ff40c0", // magenta
  colorB: "#40ff80", // green
  /** fringe colors cycle every ~400 ms */
  colorCycleMs: 400,
} as const;

/** Scroll-driven fluid gradient background. */
export const FLUID = {
  /** resting pulse — barely-there motion, never frozen */
  restFlow: 0.045,
  /** how strongly Lenis scroll velocity agitates the fluid */
  agitation: 0.02,
  /** cap on the agitation contribution */
  maxFlow: 1.6,
  /** per-second decay of stored momentum once scrolling stops (inertia) */
  decay: 1.4,
  /** smoothing toward the target flow (per-frame lerp at 60 fps) */
  smoothing: 0.06,
  /** render density cap — lowest-priority GPU consumer on the page */
  dprCap: 1.0,
  /** film grain amplitude over the gradient */
  grain: 0.05,
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