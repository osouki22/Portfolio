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
  gl/           LiquidCanvas (hero mask + card hover), MeshText,
                useLiquidDynamics,
                shaders/ (quad.vert, liquid.glsl ← shared chunk,
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

## Liquid surfaces (hero + work cards) — shader contract

One shader, `liquid.frag`, two instances driven purely by uniforms:

| Uniform | Meaning |
| --- | --- |
| `uTop` / `uBottom` | the two hero layers; the card binds one texture to both |
| `uMask` | `1` = hero aperture, `0` = card (single layer, no aperture) |
| `uReveal` | 0–1 aperture openness, CPU-driven by cursor speed with inertia |
| `uPush` | 0–1 cursor-push envelope (cards) |
| `uScroll` | 0–1 scroll warp envelope, from Lenis velocity |
| `uCursor` | cursor 0–1 (hero: viewport; card: its own box) |
| `uMaxRadius`, `uEdgeDistort`, `uInteriorFlow` | aperture size / boundary wobble / inner ripple |
| `uPushAmp`, `uPushRadius`, `uWarpAmp` | per-instance displacement ceilings |
| `uTime`, `uResolution`, `uImageResolution` | clock + cover-fit math |

**Hero:** the aperture opens at the cursor and reveals `portrait-bottom`
through a boundary wobbled by `lqFlow` (never a clean circle); its radius
tracks cursor speed, easing open fast and shut slowly, and the mask fades
out as it shrinks so at rest **only the top layer remains**.
**Card:** no aperture — the project image must stay readable — just a
liquid push around the cursor at roughly half the hero's ceiling.

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

CPU envelopes live in `useLiquidDynamics.ts` (`LIQUID` constants in
`lib/motion.ts`). Note the canvas is `pointer-events-none`, so **pointer
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
