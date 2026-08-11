/**
 * Every duration and easing curve on the site, named in one place.
 * Tune motion globally here — components never hardcode timing.
 *
 * Intent:
 *  - liquid effects (hero mask, card hover, background): one water-like
 *    vocabulary — responsive to input, settling with inertia, never harsh
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

/** Lenis config — refined, not floaty. */
export const SCROLL = {
  lerp: 0.09,
  wheelMultiplier: 1.0,
} as const;