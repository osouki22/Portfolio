/**
 * Single source of truth for every mesh-gradient palette on the site.
 *
 * The mesh gradient reads only the five CSS custom properties
 * (--mesh-base, --mesh-1..4); changing a palette here requires no other
 * code changes anywhere.
 */

export interface Palette {
  base: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
}

export const palettes = {
  /** Klein blue — Hero, About, Contact, and the Work grid at rest. */
  default: {
    base: "#050914",
    c1: "#002FA7", // Klein blue
    c2: "#0B4FD8",
    c3: "#1B1F5C",
    c4: "#001233",
  },
  /** warm, sensory, coffee ritual — amber and roasted tones */
  aurabrew: {
    base: "#0D0705",
    c1: "#C4762A",
    c2: "#7A3B12",
    c3: "#E0A55C",
    c4: "#2A1409",
  },
  /** cool, precise, modern fintech — silver-cyan on deep slate */
  silvrbank: {
    base: "#05080D",
    c1: "#4DA6C7",
    c2: "#8FA8B8",
    c3: "#1E3A4C",
    c4: "#0A1620",
  },
  /** electric mobility — high-voltage green on graphite */
  instantbox: {
    base: "#050A07",
    c1: "#39D98A",
    c2: "#0E7A4A",
    c3: "#B8F5D4",
    c4: "#0A1A12",
  },
  /** warm, approachable, human-animal connection — terracotta and cream */
  bark: {
    base: "#0E0806",
    c1: "#E07A4F",
    c2: "#F2C89B",
    c3: "#8A3F22",
    c4: "#241009",
  },
  /** architectural restraint — bone, stone, structural neutrals */
  alejandraPelay: {
    base: "#0A0908",
    c1: "#D9D2C7",
    c2: "#8C8378",
    c3: "#4A443C",
    c4: "#1A1714",
  },
} as const satisfies Record<string, Palette>;

export type PaletteKey = keyof typeof palettes;
