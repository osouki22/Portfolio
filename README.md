# Esteban Souki — Portfolio

Single-page experimental portfolio for a Senior Product Designer.
Next.js 15 · TypeScript · Tailwind v4 · GSAP (ScrollTrigger + Flip) · Lenis · `ogl` WebGL liquid shaders.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
```

Deploys zero-config on Vercel (static output, one route).

## Replacing the placeholder images with real ones

Every image on the site is referenced by path from `lib/work.ts` and
`lib/content.ts` — no component hardcodes a path. The repo ships with
generated placeholders; to swap in real assets, **drop your files at these
exact paths with these exact filenames** and nothing else needs to change:

```
public/hero/portrait-top.jpg           ← 3840×2160 (16:9) — the layer you see
public/hero/portrait-bottom.jpg        ← 3840×2160 (16:9) — revealed through
                                          the liquid aperture at the cursor
public/work/aurabrew/main.jpg
public/work/aurabrew/detail-01.jpg
public/work/aurabrew/detail-02.jpg
public/work/aurabrew/detail-03.jpg
public/work/aurabrew/detail-04.jpg
public/work/silvrbank/…                ← same five filenames
public/work/instantbox/…
public/work/bark/…
public/work/alejandra-pelay/…
```

Notes:

- `npm run assets:placeholders` regenerates placeholders for **missing**
  files only — it never overwrites a file that exists.
- The hero text sits in the portrait's negative space. The current portrait
  holds its negative space on the **left**; if the replacement is composed
  the other way, flip `heroTextAlign` in `lib/content.ts` from `'left'` to
  `'right'` — that is the only change needed.
- Card crops are 4:3 and the detail crops vary (16:9, 4:5, 4:3, 3:2), all
  via `object-cover` — any reasonably large image works, no exact sizes
  required beyond the hero's 3840×2160.

## Where things live

- **Colors / palettes** → `lib/palettes.ts` (the only place color is defined)
- **Copy** → `lib/content.ts` (hero/about/contact) and `lib/work.ts` (projects)
- **Motion constants** (every duration and ease) → `lib/motion.ts`
- **Liquid shaders** → `components/gl/shaders/liquid.glsl` (shared noise/flow) and
  `liquid.frag` (hero aperture + card hover); uniform contract in `CLAUDE.md`

See `CLAUDE.md` for the full architecture, palette-system, and shader docs.
