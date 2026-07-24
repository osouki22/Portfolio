# Esteban Souki — Portfolio

Single-page experimental portfolio for a Senior Product Designer. Four sections
on one route: **Hero → About → Work → Contact**. Dark mesh-gradient backgrounds,
Klein-blue default palette, a WebGL glitch shader as the site's signature effect.

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
  layout/       SideNav, SmoothScroll (Lenis), MeshGradient
  sections/     Hero, About, Work, Contact
  work/         WorkGrid, WorkCard, WorkExpanded
  gl/           GlitchCanvas, useGlitchUniforms, shaders/ (glitch.vert, glitch.frag)
lib/
  palettes.ts   ALL palettes — single source of truth for color
  work.ts       ALL project data (copy, kickers, image paths, palette key)
  content.ts    Hero / About / Contact copy + heroTextAlign
  motion.ts     ALL durations & easing constants — tune motion globally here
  paletteController.ts  transitions the CSS mesh variables via GSAP
  scroll.ts     shared Lenis instance accessor
  useMediaQuery.ts
public/
  hero/portrait.jpg          3840×2160 hero image
  work/<slug>/{main,detail-01..04}.jpg
```

## Palette system

The mesh gradient reads **only** five CSS custom properties on `:root`:
`--mesh-base`, `--mesh-1` … `--mesh-4`. Palettes live in `lib/palettes.ts`.
`transitionPalette(key)` (in `lib/paletteController.ts`) tweens those variables
with GSAP (~0.9 s) — the room's lighting shifts, never a hard cut.

**To change a palette:** edit the hex values in `lib/palettes.ts`. Nothing else.
Every project in `lib/work.ts` references a palette by key; hovering a Work
card or opening a project transitions the page to that palette, mouse-out /
close returns to `default` (Klein blue).

## Glitch shader contract

One shader (`components/gl/shaders/glitch.frag`) instantiated twice with
different parameter sets (hero = aggressive, work cards ≈ 55 % of hero
displacement). Uniform contract:

| Uniform | Type | Meaning |
| --- | --- | --- |
| `uTexture` | sampler2D | source image |
| `uTime` | float | elapsed seconds |
| `uMouse` | vec2 | cursor 0–1 within the element |
| `uMouseDir` | vec2 | smoothed cursor direction (drives RGB-split axis) |
| `uVelocity` | float | smoothed cursor speed 0–1 |
| `uIntensity` | float | master multiplier, CPU-driven attack/decay (rest floor > 0) |
| `uMaxShift` | float | per-instance strip-displacement ceiling |
| `uResolution` | vec2 | canvas size in px |
| `uImageResolution` | vec2 | texture size (cover-fit math) |

Effect order inside the shader: strip displacement (re-randomized ~12×/s, not
continuous) → RGB channel separation → scanlines (px-locked frequency) → grain.
CPU-side dynamics live in `useGlitchUniforms.ts`: fast attack on movement,
two-stage release (quick collapse, slow settle) to a non-zero rest floor.

Performance rules: **never more than two live WebGL contexts** (hero + the one
hovered card). Cards mount/destroy their canvas on hover; rAF loops pause via
IntersectionObserver when off-screen. Reduced motion or WebGL failure ⇒ static
image + CSS grain overlay — the site must be fully usable with zero WebGL.

## Image path convention

All image paths are declared in `lib/work.ts` / `lib/content.ts` — **never
hardcode an image path in a component**. To swap in real assets, drop files at
the exact existing paths (same filenames):

```
public/hero/portrait.jpg                  (3840×2160)
public/work/<slug>/main.jpg
public/work/<slug>/detail-01.jpg … detail-04.jpg
```

Slugs: `aurabrew`, `silvrbank`, `instantbox`, `bark`, `alejandra-pelay`.
`scripts/generate-placeholders.mjs` creates placeholders for any *missing*
file (it never overwrites an existing one): `npm run assets:placeholders`.

## Motion

All durations/eases are named constants in `lib/motion.ts`. Intent:
glitch = fast, mechanical, discrete. About float = slow, organic, breathing.
Work expansion = weighty custom bezier, never snappy. Palette shifts = slow,
ambient. Scroll reveals = one restrained idea, precisely executed.

## Commit conventions

Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `style:`,
`perf:`, `docs:`. High-risk effects are developed on `feature/*` branches and
merged once working. Keep the mainline deployable at every commit.
