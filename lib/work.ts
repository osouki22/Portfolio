import type { PaletteKey } from "./palettes";

/**
 * All project data — copy, kickers, image paths, palette refs.
 * Components never hardcode image paths; everything routes through here.
 * To swap in real assets, drop files at these exact paths (see CLAUDE.md).
 */

export interface WorkProject {
  slug: string;
  title: string;
  kicker: string;
  palette: PaletteKey;
  mainImage: string;
  detailImages: [string, string, string, string];
  intro: string;
  problem: string;
  approach: string;
  shipped: string;
}

const img = (slug: string, name: string) => `/work/${slug}/${name}.jpg`;

const details = (slug: string): [string, string, string, string] => [
  img(slug, "detail-01"),
  img(slug, "detail-02"),
  img(slug, "detail-03"),
  img(slug, "detail-04"),
];

export const projects: WorkProject[] = [
  {
    slug: "aurabrew",
    title: "AuraBrew",
    kicker: "Product Design · AI-Assisted Build · Interaction Design",
    palette: "aurabrew",
    mainImage: img("aurabrew", "main"),
    detailImages: details("aurabrew"),
    intro:
      "Mobile-first brewing app that transforms manual coffee extraction into a sensory, guided experience.",
    problem:
      "Manual coffee brewing methods like V60 or Chemex produce exceptional results, but the process is unforgiving. Precise ratios, specific pouring stages, bloom times, water temperature. Most people who care enough to brew manually still rely on a combination of notes, timers, and memory. The experience is fragmented, and the margin for error is real.",
    approach:
      "The goal was to design a brewing companion that removed the cognitive load without removing the ritual. The app guides users through each phase of the extraction in real time, calculating precise water targets based on their coffee mass and chosen recipe, and communicating through light, sound, and movement rather than raw numbers on a screen. The design challenge was specific: make a highly technical process feel calm and sensory, not clinical. I conceived, designed, and shipped the product end to end, without a development team and without using Figma.",
    shipped:
      "A fully deployed, mobile-first web app, live and usable in production. Built independently using AI tooling as a technical collaborator, with all creative direction, product decisions, and design execution handled by me.",
  },
  {
    slug: "silvrbank",
    title: "SilvrBank",
    kicker: "UX Architecture · Design Systems · Motion Systems",
    palette: "silvrbank",
    mainImage: img("silvrbank", "main"),
    detailImages: details("silvrbank"),
    intro:
      "Digital experience and identity design for a fresh, mobile-first banking app.",
    problem:
      "Large traditional banks have a digital credibility gap. Their products were built for retention, not acquisition. They work for customers who already know how to navigate them, and fail, visually and functionally, at attracting anyone newer or more demanding. A major Spanish bank came to us with exactly that tension: modernize aggressively enough to compete for a younger segment, without alienating the legacy clients who represented the bulk of their assets.",
    approach:
      "Research came first. Stakeholder workshops, user interviews, and persona mapping across both existing and target profiles gave us a clear picture of the gap. From those findings I took ownership of the UX architecture, the core interaction flows, and the full design language of the product. I also led the team responsible for the design system and the motion system. The motion system was not decorative: we defined a structured set of animation tokens mapped to specific interaction types, so every transition and micro-interaction had a reason and a consistent behavior. That is what gives a product that curated, modern feel without it reading as gratuitous.",
    shipped:
      "The high-fidelity design was set aside when the proposed direction proved incompatible with the bank's existing technical architecture. That is a real constraint in enterprise banking. What did carry forward: the design system and the motion system were adopted as foundational pillars of the client's current product infrastructure. The product hasn't launched publicly, so the brand appears under a fictional name in the portfolio.",
  },
  {
    slug: "instantbox",
    title: "Instant Box",
    kicker: "Product Design · Service Design · Conversion Strategy",
    palette: "instantbox",
    mainImage: img("instantbox", "main"),
    detailImages: details("instantbox"),
    intro:
      "Full website design for an electric vehicle charger installation company.",
    problem:
      "Their contracting flow had a very high abandonment rate. The checkout process asked highly technical questions that most users simply didn't know how to answer, which led to a second, costly issue: installers arriving on site without the right equipment, because the answers collected upstream were wrong or incomplete.",
    approach:
      "To treat this as more than a visual redesign. We rebuilt the entire checkout logic from the ground up, cutting the number of questions by more than 50%, and worked directly with installers to understand which information actually mattered on their end, then reverse-engineered the flow to collect exactly that, in language a non-technical user could answer correctly.",
    shipped:
      "A redesigned web platform and a checkout flow that reduced friction at the exact point where users had been dropping off. Result: lead generation increased by more than 40%. Customer support inquiries dropped significantly as users understood the flow better, and redundant installer visits decreased substantially, though the exact percentage on that last metric isn't available.",
  },
  {
    slug: "bark",
    title: "Bark",
    kicker: "UX Research · Information Architecture · Product Design",
    palette: "bark",
    mainImage: img("bark", "main"),
    detailImages: details("bark"),
    intro:
      "Mobile app focused on helping people find and connect with the right pet companion.",
    problem:
      "Adopting a pet in Spain is unnecessarily hard. Every shelter operates differently: some use email, some use Facebook, some have forms, some require phone calls. There is no unified process, no clear path forward, and enough friction to cool off people who genuinely wanted to adopt. Research and interviews with both shelters and prospective adopters confirmed what the numbers suggested: the process itself was killing conversions that should have been easy.",
    approach:
      "The insight that drove the design was that adoption is a two-sided problem. Shelters are not just listing animals, they are screening homes. So we built around a bilateral matching system: adopters create a search profile, shelters create offer profiles, and when there is mutual interest the shelter can evaluate the adopter before moving forward. If the profile meets their criteria, the platform opens a direct communication channel for interviews and coordination. I handled the full product end to end, from research and information architecture through UX flows and interface design, building a single coherent system that served two very different users.",
    shipped:
      "Complete UX and UI across both sides of the product, delivered during the presale phase. The project did not move into development, but the matching logic and dual-profile system are fully designed and documented in the portfolio.",
  },
  {
    slug: "alejandra-pelay",
    title: "Alejandra Pelay",
    kicker: "Brand Identity · Art Direction · Visual Systems",
    palette: "alejandraPelay",
    mainImage: img("alejandra-pelay", "main"),
    detailImages: details("alejandra-pelay"),
    intro:
      "Personal brand design for a young architect, focused on clarity, character, and professional presence.",
    problem:
      "A young architect starting her independent practice faces a specific credibility gap: her work is strong, but nothing around her yet signals that. The risk is a brand that either overclaims, projecting a seniority she hasn't accumulated, or underclaims, blending into the generic visual language of early-career portfolios.",
    approach:
      "The goal was not to make her look established. It was to make her look intentional. Every decision, from typography to color to tone, was made to communicate precision and character without erasing her personality. That distinction matters: confidence is not the same as experience, and the brand needed to project one without faking the other. I delivered a complete branding system, built to be scalable as her practice grows.",
    shipped:
      "A full visual identity system including all brand assets needed for current use and future scalability. A website is planned as the next phase. The project is presented in the portfolio as an example of strategic brand thinking applied to a real client with a specific positioning challenge.",
  },
];

export function getProjectIndex(slug: string): number {
  return projects.findIndex((p) => p.slug === slug);
}
