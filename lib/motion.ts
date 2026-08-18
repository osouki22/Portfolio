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
  /**
   * Mouse-driven undulation, both OFF (0) by design: moving the cursor
   * must only open and close the window, never ripple anything.
   *  - edgeDistort wobbled the aperture boundary, which could break the
   *    edge into gaps that showed the page through.
   *  - interiorFlow rippled the revealed layer, deforming the face.
   * Raise either above 0 to bring that undulation back. Neither touches
   * the scroll effects (scrollResponse / heroWarpAmp / silhouette*).
   */
  edgeDistort: 0,
  interiorFlow: 0,

  /**
   * --- aperture shape: a goo blob, not a circle ---
   * The opening is composed from several centres that chase the cursor with
   * increasing lag; their fields are summed and thresholded, so they fuse
   * into one organic shape that stretches and trails while the cursor moves
   * and regroups when it stops. Purely the *silhouette* of the mask — the
   * revealed layer itself is never distorted (see edgeDistort/interiorFlow).
   */
  /** number of centres composing the aperture (shader maximum is 5) */
  blobCount: 4,
  /** lag in seconds of the leading centre — it tracks the cursor closely */
  blobLeadLag: 0.05,
  /** lag of the last centre — this is what produces the trailing tail */
  blobTailLag: 0.32,
  /** head radius as a fraction of maxRadius */
  blobHeadScale: 1.0,
  /** tail radius as a fraction of maxRadius (smaller ⇒ it tapers) */
  blobTailScale: 0.55,
  /** field level counted as inside the blob — lower ⇒ fatter shape */
  gooThreshold: 0.5,
  /** width of that threshold — higher ⇒ softer, gooier fusion */
  gooSoftness: 0.3,
  /** how much cursor speed lengthens the lag, stretching the tail */
  tailStretch: 0.9,

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

  /**
   * --- hero silhouette: the frame itself stops being a rectangle ---
   * A clip-path polygon whose edges are sampled along a bow curve, so the
   * *middle* of each edge swells inward (something border-radius cannot
   * do — it only rounds corners). Applied to the hero section, which
   * carries no transform, so the silhouette and the body flex compose
   * instead of fighting. Corners stay pinned; at rest the clip is removed
   * entirely and the frame is a clean rectangle again.
   */
  /** deepest inward bow, in % of the box — the master silhouette knob */
  silhouetteBow: 7,
  /** the leading edge bows less than the trailing one (mass lags behind) */
  silhouetteLeadRatio: 0.35,
  /** how much of the bow the left/right edges pick up */
  silhouetteSideRatio: 0.25,
  /** secondary ripple riding the bow, so edges undulate, not just arc */
  silhouetteWave: 0.35,
  /** speed of that ripple travelling along the edge */
  silhouetteWaveSpeed: 0.8,
  /** samples per edge — more = smoother curve, longer clip-path string */
  silhouetteSegments: 14,

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

/**
 * Work-card fluid distortion — a real Navier-Stokes style solver
 * (velocity → divergence → pressure → gradient subtract → advection) on
 * float framebuffers, displacing the project image under the cursor.
 * Entirely separate from the hero's LIQUID block so the two can be tuned,
 * or switched off, independently. Only the hovered card ever runs it.
 */
export const CARD_FLUID = {
  /** master switch for the card hover effect */
  enabled: true,
  /** 1–10 → simulation grid height of 128–512 texels (cost grows fast) */
  resolution: 10,
  /** splat radius in px — how wide the cursor's push is */
  cursorSize: 50,
  /** 0–100 → drives both the splat strength and the image displacement */
  intensity: 100,
  /**
   * Multiplier on the final uv displacement. The reference's own scaling
   * tops out at roughly 2 px of movement on a card this size, which reads
   * as "the effect is broken" — this is the knob that makes the ripple
   * actually visible. 1 = the reference's amplitude.
   */
  displacementBoost: 3,
  /** how fast the velocity field dies down (lower = settles sooner) */
  velocityDissipation: 0.97,
  /** how fast the displacement field fades (lower = image recovers sooner) */
  colorDissipation: 0.98,
  /** Jacobi iterations for the pressure solve — the main per-frame cost */
  pressureIterations: 16,
  /** dt multiplier for advecting the displacement field */
  colorAdvectionBoost: 8,
  /** pointer delta multiplier feeding the splat */
  pointerBoost: 6,
  /** canvas drawn larger than the card so the fluid can push past the edge */
  overscan: 1.2,
  /** image inset inside that overscan */
  innerScale: 5 / 6,
  /** device-pixel-ratio ceiling, in line with the rest of the site */
  dprCap: 1.5,
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