# Esteban Souki — Portfolio

Single-page experimental portfolio for a Senior Product Designer. Four sections
on one route: **Hero → About → Work → Contact**. Dark fluid-gradient background,
Klein-blue default palette, and **one liquid vocabulary** across the whole site:
the hero's cursor-driven reveal aperture, the work-card hover, and the scrolling
background all ride the same noise/flow field. Deformable mesh-text headlines in
About/Contact.

## Stack (and why)

| Piece | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15, App Router, TypeScript | Static generation for a content-fixed site, zero-config Vercel deploys |
| Styling | Tailwind CSS v4 + CSS custom properties | Tailwind for layout/spacing; **all color flows through CSS variables** (see palette system) |
| GPU effects | `ogl` (~10 kB) | We render one fragment shader on a quad — three.js would be ~600 kB of unused scene graph |
| Animation | GSAP 3 + ScrollTrigger + Flip + CustomEase | Flip powers the shared-element Work expansion; ScrollTrigger drives scroll spy and reveals |
| Smooth scroll | Lenis | Cohesion between scroll, ScrollTrigger, and the fixed side nav. Subtle lerp — refined, not floaty |
| Fonts | Space Grotesk via `next/font/google` (400/500/600/700) | The site is 100 % sans-serif. No serif, no italics anywhere |

Do **not** add dependencies without clear necessity. No UI kits, no icon
libraries — icons are hand-authored inline SVG.

## Folder structure

```
app/            layout.tsx (fonts, Lenis, mesh), page.tsx (section order), globals.css
components/
  layout/       SideNav, SmoothScroll (Lenis), MeshGradient (host), FluidGradient
  sections/     Hero, About, Work, Contact
  work/         WorkGrid, WorkCard, WorkExpanded
  gl/           LiquidCanvas (hero mask), FluidDistortion (card hover), MeshText,
                useLiquidDynamics,
                shaders/ (quad.vert, liquid.glsl ← shared chunk, fluidsim.ts,
                          liquid.frag, fluid.frag, meshtext.vert/.frag)
lib/
  palettes.ts   ALL palettes — single source of truth for color
  work.ts       ALL project data (copy, kickers, image paths, palette key)
  content.ts    Hero / About / Contact copy + heroTextAlign
  motion.ts     ALL durations & easing constants — tune motion globally here
  paletteController.ts  transitions the CSS mesh variables via GSAP
  scroll.ts     shared Lenis instance accessor
  useMediaQuery.ts
public/
  hero/portrait-top.jpg      3840×2160 — the layer you see
  hero/portrait-bottom.jpg   3840×2160 — revealed through the liquid aperture
  work/<slug>/{main,detail-01..04}.jpg
```

## Palette system

The background reads **only** five CSS custom properties on `:root`:
`--mesh-base`, `--mesh-1` … `--mesh-4`. Palettes live in `lib/palettes.ts`.
`transitionPalette(key)` (in `lib/paletteController.ts`) tweens those variables
with GSAP (~0.9 s) — the room's lighting shifts, never a hard cut.
`FluidGradient` re-reads (and re-parses, cached) the variables every frame, so
palette tweens flow straight through the WebGL background too.

**To change a palette:** edit the hex values in `lib/palettes.ts`. Nothing else.
Every project in `lib/work.ts` references a palette by key; hovering a Work
card or opening a project transitions the page to that palette, mouse-out /
close returns to `default` (Klein blue).

## The liquid vocabulary — shared foundation

`components/gl/shaders/liquid.glsl` is the single definition of the site's
wave language: `lqHash` / `lqNoise` / `lqFbm` and `lqFlow` (a domain-warped
flow offset). It is **prepended in TS** to every liquid surface's shader
body (`const fragment = chunk + body`) rather than `#include`d, because
shaders are imported as raw strings. `fluid.frag` (background), and
`liquid.frag` (hero + cards) all ride it — change the noise here and the
whole site changes together.

## Liquid surface (hero) — shader contract

`liquid.frag` now drives the **hero only**; work cards use the fluid
solver documented below. Its uniforms:

| Uniform | Meaning |
| --- | --- |
| `uTop` / `uBottom` | the two hero layers |
| `uMask` | `1` = aperture, `0` = single layer (no aperture) |
| `uReveal` | 0–1 aperture openness, CPU-driven by cursor speed with inertia |
| `uPush` | 0–1 cursor-push envelope (cards) |
| `uScroll` | 0–1 scroll warp envelope, from Lenis velocity |
| `uCursor` | cursor 0–1 (hero: viewport; card: its own box) |
| `uMaxRadius`, `uEdgeDistort`, `uInteriorFlow` | aperture size / boundary wobble / inner ripple |
| `uPushAmp`, `uPushRadius`, `uWarpAmp` | per-instance displacement ceilings |
| `uTime`, `uResolution`, `uImageResolution` | clock + cover-fit math |

The aperture opens at the cursor and reveals `portrait-bottom`; its size
tracks cursor speed, easing open fast and shut slowly, and the mask fades
out as it shrinks so at rest **only the top layer remains**.

Its *silhouette* is a goo blob, not a circle: `blobCount` centres chase the
cursor with increasing lag (`useLiquidDynamics`), each contributing a
gaussian field that the shader sums and thresholds (`gooThreshold` /
`gooSoftness`), so they fuse into one organic shape that stretches and
trails while the cursor moves and regroups when it stops. Centre radii
carry `uReveal`, so a shut window is an empty field, and the centres
collapse onto the cursor at rest so the next opening starts clean.
This is purely the mask's outline — the revealed layer is never distorted.

**Confirmed decision: the mouse must not undulate anything in the hero.**
Moving the cursor only opens and closes the window. `uEdgeDistort` (the
boundary wobble, which could break the edge into gaps showing the page
through) and `uInteriorFlow` (the ripple over the revealed layer, which
deformed the face) are both **0** and their noise is branch-skipped. The
scroll-driven effects — `uScroll` warp, body flex, silhouette bow — are a
separate axis and stay fully on; keep them separable when editing.

**Hero body flex** (`lib/useLiquidBody.ts`) is a third, *element-level*
layer on top of those two: a CSS transform on the hero media block driven
by **signed** Lenis velocity, so the body stretches as it is pushed and the
two scroll directions read differently (down anchors the top edge, up the
bottom). Deliberately isolated from the shader work — the aperture is
viewport-normalized so the transform can't feed back into it, CSS
transforms don't trigger the canvas ResizeObserver, both axes only scale
*up* so a full-bleed hero can never expose a gap, and at rest the transform
is removed entirely so the canvas stays pixel-crisp. Master knob:
`LIQUID.bodyStretch`. Note Lenis retains its last `velocity` after its
animation ends, so the hook zeroes the reading when the scroll position
stops changing — without that the body never fully settles.

**Hero silhouette** (same hook, third layer): a `clip-path: polygon()`
whose edges are sampled along a bow curve, so the *middle* of each edge
swells inward and the frame stops being a rectangle — `border-radius` can
only round corners, which is why it isn't used here. It is applied to the
hero **section**, which carries no transform, so silhouette and body flex
compose instead of multiplying. Corners stay pinned (the shape can never
tear away from the layout) and the clip is removed entirely at rest.
Because `clip-path` only ever cuts inward, the bow is inward-only and the
fluid background shows through the curve. Master knob:
`LIQUID.silhouetteBow` (in % of the box; the shipped 2.6 is deliberately
subtle — raise it to ~8–9 to inspect the shape).

CPU envelopes live in `useLiquidDynamics.ts` (`LIQUID` constants in
`lib/motion.ts`).

## Custom cursor

`components/layout/CustomCursor.tsx` (mounted in `app/layout.tsx`) replaces
the native pointer with a hollow ring on **fine-pointer devices only** —
`matchMedia('(pointer: fine)')` gates everything, so touch keeps its normal
behaviour and the native cursor is never hidden there. Hiding is done by
`html[data-custom-cursor] { cursor: none }`, an attribute the component sets
and always removes on cleanup, so nothing can leave the page cursor-less.

One fixed element, one rAF lerping toward the pointer (`CURSOR.followLerp`,
frame-rate compensated; reduced motion pins it to the pointer instead).
Hover state comes from `e.target.closest(...)` over one selector — the GL
canvases are `pointer-events-none`, so the target is always the real DOM
element underneath. `mix-blend-mode: difference` keeps the ring legible on
light and dark alike; set `CURSOR.blendMode` to `"normal"` for literal white.
Constants: `CURSOR` in `lib/motion.ts`.

## Work-card fluid distortion

Cards do **not** use `liquid.frag`. Each hovered card runs a real fluid
solver (`components/gl/FluidDistortion.tsx` + `shaders/fluidsim.ts`,
adapted from an external reference — shaders kept verbatim): splat →
divergence → pressure (Jacobi ×16) → gradient subtract → advection, on
float framebuffers, displacing the project image under the cursor and
settling through dissipation. The image always comes from `lib/work.ts`
(local path), never a remote URL. Constants: `CARD_FLUID` in
`lib/motion.ts`.

**Amplitude gotcha:** the reference's own scaling tops out around **2 px**
of displacement on a card this size — the solver runs perfectly and the
effect still looks like nothing at all. `CARD_FLUID.displacementBoost`
(3 = shipped, 1 = the reference's amplitude, 6 = very pronounced) is the
knob that makes it visible; `intensity` feeds both it and the splat.
A flat-colour image also shows nothing, since there are no pixels to
displace — judge the effect on a real project image.

Rules: it needs `OES_texture_float` and complete float FBOs — either
missing degrades silently to the static image. **Only the hovered card
mounts it** (`liquidActive` in `WorkGrid`), so exactly one simulation is
ever alive; its rAF pauses off-screen and on tab blur, and every GL
resource is released on unmount because that happens on every hover-out.
The quad buffers are created once (the reference rebuilt them per blit,
leaking hundreds per second). Touch listeners are passive — unlike the
reference this never preventDefaults, so a drag over a card still scrolls. Note the canvas is `pointer-events-none`, so **pointer
input is taken from `window`** and normalized to the element's box —
listening on the canvas element itself silently never fires.

## Mesh-text headlines (About + Contact)

One shared `<MeshText>` (`components/gl/MeshText.tsx`): the headline is drawn
to a canvas texture (Space Grotesk, white — await `document.fonts` first) and
rendered on a 96×40 vertex grid; the cursor drags vertices with per-vertex
velocity + spring + damping (constants `MESH_TEXT` in `lib/motion.ts`,
reference-faithful). The chromatic fringe cycles magenta `#ff40c0` / green
`#40ff80` every ~400 ms — **confirmed decision: these are NOT palette colors,
do not recolor them.** The DOM text stays in the tree for layout/a11y and is
the reduced-motion/no-WebGL fallback.

## Fluid gradient background

`FluidGradient` (hosted by `MeshGradient`): domain-warped fbm on ogl, colors
from the `--mesh-*` vars. Motion is **scroll-driven** via Lenis velocity —
barely-there pulse at rest, turbulence scales with scroll speed, inertial
decay on stop (constants `FLUID` in `lib/motion.ts`). Lowest-priority
renderer: density capped (dpr ≤ 0.75), pauses under the opaque expanded Work
view and on tab blur; reduced motion ⇒ motionless frame (palette still live).
No-WebGL fallback: the original CSS radial-blob mesh (kept in globals.css).

Performance rules: **never more than two live image-effect contexts** (hero +
the one hovered card — cards mount/destroy their canvas on hover). MeshText and
FluidGradient each own one low-cost context; every rAF loop pauses via
IntersectionObserver off-screen and on tab blur. Reduced motion or WebGL
failure ⇒ static image / DOM text + CSS grain overlay — the site must be
fully usable with zero WebGL.

## Image path convention

All image paths are declared in `lib/work.ts` / `lib/content.ts` — **never
hardcode an image path in a component**. To swap in real assets, drop files at
the exact existing paths (same filenames):

```
public/hero/portrait-top.jpg              (3840×2160) — visible by default
public/hero/portrait-bottom.jpg           (3840×2160) — revealed by the aperture
public/work/<slug>/main.jpg
public/work/<slug>/detail-01.jpg … detail-04.jpg
```

The two hero layers must be the **same dimensions and pixel-aligned** — the
aperture cross-fades between them in place, so any offset reads as a jump.

Slugs: `aurabrew`, `silvrbank`, `instantbox`, `bark`, `alejandra-pelay`.
`scripts/generate-placeholders.mjs` creates placeholders for any *missing*
file (it never overwrites an existing one): `npm run assets:placeholders`.
A legacy `hero/portrait.jpg` is promoted to `portrait-top.jpg` by that
script rather than regenerated, so a real portrait is never lost.

## Motion

All durations/eases are named constants in `lib/motion.ts`: `DUR`/`EASE`
(reveals, Flip open/close, expanded-content sequencing), `LIQUID` (hero
aperture, scroll warp, card hover), `MESH_TEXT` (headline physics), `FLUID`
(background flow), `SCROLL` (Lenis). Intent: liquid = responsive to input,
settling with inertia, never harsh — one water vocabulary everywhere.
Mesh-text = inertial drag, elastic no-bounce return. Work expansion = weighty
custom bezier; its content reveals only **after** the Flip completes (and
leaves before the close Flip starts). Fluid background = scroll-driven,
ambient, never distracting. Palette shifts = slow. Scroll reveals = one
restrained idea, precisely executed.

## Commit conventions

Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `style:`,
`perf:`, `docs:`. High-risk effects are developed on `feature/*` branches and
merged once working. Keep the mainline deployable at every commit.
