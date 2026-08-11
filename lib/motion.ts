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

/**
 * Liquid surfaces — hero reveal aperture + work-card hover.
 * Shares the noise/flow vocabulary of the fluid background
 * (components/gl/shaders/liquid.glsl).
 */
export const LIQUID = {
  /* --- hero aperture (cursor-driven reveal of the bottom layer) --- */
  /** widest the window ever opens, in aspect-corrected uv units */
  maxRadius: 0.46,
  /** cursor speed → aperture openness (speed is uv/second) */
  velocityResponse: 1.5,
  /** per-frame lerp while opening — quick to answer fast motion */
  openInertia: 0.14,
  /** per-frame lerp while closing — slower, liquid settling shut */
  closeInertia: 0.045,
  /** how much the shared flow field wobbles the aperture boundary */
  edgeDistort: 0.5,
  /** ripple applied to the revealed layer inside the window */
  interiorFlow: 0.03,

  /* --- scroll-driven warp of the hero surface (Lenis velocity) --- */
  /** scroll velocity → warp envelope */
  scrollResponse: 0.03,
  /** per-second decay of the warp once scrolling stops */
  scrollDecay: 2.2,
  /** uv displacement at full warp — deliberately subtle */
  heroWarpAmp: 0.014,

  /**
   * --- hero body: the element itself flexes with scroll direction ---
   * A CSS transform on the hero media block, on top of (and independent
   * from) the in-shader pixel warp. Scrolling down anchors the body at its
   * top edge and lets it trail downward; scrolling up anchors it at the
   * bottom — so the two directions read differently, like a semi-liquid
   * object being pushed. Both axes only ever scale *up*, so the full-bleed
   * media can never expose a gap, and the transform is dropped entirely at
   * rest so the canvas stays pixel-crisp.
   */
  /** vertical stretch at full deflection — the master intensity knob */
  bodyStretch: 0.12,
  /** how much of that stretch the horizontal axis gets (< 1 ⇒ elongation) */
  bodyNarrow: 0.35,
  /** signed lean in degrees at full deflection — direction made visible */
  bodySkew: 1.8,
  /** Lenis velocity that counts as a full push */
  bodyVelocityScale: 30,
  /** per-frame lerp while the push builds */
  bodyInertia: 0.18,
  /** per-second settle back to the resting shape — inertia, never a cut */
  bodyDecay: 3.2,

  /* --- work-card hover (a supporting echo, not the signature) --- */
  /** max liquid displacement on a card ≈ 55 % of the hero's warp character */
  cardPushAmp: 0.055,
  /** falloff radius of the push around the cursor */
  cardPushRadius: 0.42,
  /** per-frame lerp of the card push envelope while the cursor moves */
  cardInertia: 0.12,
  /** per-second decay of the card push once the cursor slows or leaves */
  cardDecay: 2.4,
  /** cards get a gentler share of the scroll warp than the hero */
  cardWarpAmp: 0.008,

  /* --- shared --- */
  /** autonomous drift level on touch devices, so mobile is never dead */
  ambient: 0.28,
  /** idle seconds before the ambient drift takes over on touch */
  ambientIdle: 1.6,
  /** device-pixel-ratio ceilings */
  heroDprCap: 1.75,
  cardDprCap: 1.5,
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