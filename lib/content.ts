/**
 * Hero / About / Contact copy — final, verbatim. Structural knobs
 * (heroTextAlign) live here so layout code never needs editing when
 * assets change.
 */

export const hero = {
  name: "Esteban Souki",
  role: "Senior Product Designer",
  /**
   * Two pixel-aligned full-bleed layers, both 3840×2160. The top layer is
   * what you see; the bottom layer is revealed through the liquid aperture
   * that opens at the cursor. Swap either by dropping a file at the same
   * path — no code change.
   */
  portraitTop: {
    src: "/hero/portrait-top.jpg",
    width: 3840,
    height: 2160,
    alt: "Portrait of Esteban Souki",
  },
  portraitBottom: {
    src: "/hero/portrait-bottom.jpg",
    width: 3840,
    height: 2160,
    alt: "",
  },
  /**
   * Which side of the portrait holds the negative space (and therefore the
   * name). The current portrait carries its dark blue-green negative space
   * on the LEFT, face on the right. Swap the portrait for a differently
   * composed image → flip this one value.
   */
  heroTextAlign: "left" as "left" | "right",
} as const;

export const about = {
  title: "Design is how I think. Not just what I make.",
  description:
    "More than ten years working end-to-end across fintech, banking, sports tech, and crypto. Systems, motion, and AI, not as separate disciplines, but as one process applied at different layers.",
} as const;

export const contact = {
  title: "Contact",
  subtitle: "Get in touch, collaborate or say hello.",
  email: "osouki22@gmail.com",
  emailHref: "mailto:osouki22@gmail.com",
  phone: "+34 691 263 134",
  phoneHref: "tel:+34691263134",
  linkedin: "https://www.linkedin.com/in/estebansouki/",
  linkedinLabel: "LinkedIn",
  location: "MADRID",
  coordinates: "40.4168° N, 3.7038° O",
} as const;

export const sections = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "work", label: "Work" },
  { id: "contact", label: "Contact" },
] as const;

export type SectionId = (typeof sections)[number]["id"];
