/**
 * Every plate on the page, addressed by slot.
 *
 * These are the delivered direction-2 assets. Photographic plates use
 * the web set (.webp — 33-166KB each); the two official logos ship as
 * PNG with alpha, and are never redrawn, recoloured or cropped. The
 * hero's leader and building are real cut-outs with alpha, which is
 * what lets them run as independent parallax layers.
 *
 * Until a file exists at a slot's path the slot renders a composed
 * placeholder, so the page is reviewable before the library lands and
 * dropping the files in is the whole deployment step.
 */

/** Every asset URL goes through here so a based build stays whole. */
export const asset = (path: string) =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

export type Slot = { src: string; alt: string; brief: string };

const img = (file: string) => `/images/${file}`;

export const IMAGES: Record<string, Slot> = {
  /* --- the identity. Never substitute a generated mark. -------------- */
  "logo-light": {
    src: img("24-official-logo-on-light.png"),
    alt: "Orravan",
    brief: "Official dark wordmark. Ivory and white surfaces only. Min height 32px.",
  },
  "logo-reverse": {
    src: img("23-official-logo-reverse.png"),
    alt: "Orravan",
    brief: "Official reverse wordmark. Blue and charcoal surfaces only. Min height 32px.",
  },

  /* --- the hero, three independent layers ---------------------------- */
  "hero-blueprint": {
    src: img("01-hero-blueprint-background.webp"),
    alt: "",
    brief: "Blueprint field. Hero base layer, full bleed, moves slowest.",
  },
  "hero-leader": {
    src: img("02-hero-facility-leader-cutout.webp"),
    alt: "A facility leader reading the building's status",
    brief: "Alpha cut-out. Hero left/centre layer, contained, never cropped.",
  },
  "hero-building": {
    src: img("03-hero-building-cutaway-cutout.webp"),
    alt: "The building in section",
    brief: "Alpha cut-out. Hero right layer, contained, moves fastest.",
  },

  /* --- one view. every system. --------------------------------------- */
  "view-building": {
    src: img("04-one-view-building-section.webp"),
    alt: "A building in section: occupied space, controls and mechanical",
    brief: "Connected systems section. 16:9.",
  },

  /* --- less dashboard. more direction. -------------------------------- */
  "signal-people": {
    src: img("05-software-people-plate.webp"),
    alt: "A facility leader and an Orravan specialist reading a signal together",
    brief: "Software introduction. 3:2.",
  },

  /* --- from signal to decision ---------------------------------------- */
  "decision-remote": {
    src: img("06-response-remote-specialist.webp"),
    alt: "A remote specialist reviewing the signal",
    brief: "Response sequence, stage one. 4:5.",
  },
  "decision-field": {
    src: img("07-response-field-technician.webp"),
    alt: "A field technician on site",
    brief: "Response sequence, stage two. 4:5.",
  },
  "decision-client": {
    src: img("08-response-facility-leader.webp"),
    alt: "The client receiving confirmation",
    brief: "Response sequence, stage three. 4:5.",
  },

  /* --- resolution you can see ----------------------------------------- */
  "resolution-people": {
    src: img("09-verified-outcome-lobby.webp"),
    alt: "A comfortable lobby, the work verified",
    brief: "Resolution section. 16:9.",
  },

  /* --- intelligence, applied ------------------------------------------ */
  "service-automation": {
    src: img("10-service-building-automation.webp"),
    alt: "Building automation controls",
    brief: "Service card. 4:5.",
  },
  "service-hvac": {
    src: img("11-service-hvac-systems.webp"),
    alt: "HVAC plant",
    brief: "Service card. 4:5.",
  },
  "service-monitoring": {
    src: img("12-service-remote-monitoring.webp"),
    alt: "Remote monitoring",
    brief: "Service card. 4:5.",
  },
  "service-inventory": {
    src: img("13-service-inventory-fabrication.webp"),
    alt: "Inventory and fabrication",
    brief: "Service card. 4:5.",
  },

  /* --- software sees. experience decides. ------------------------------ */
  "difference-software": {
    src: img("14-software-operations-center.webp"),
    alt: "The Orravan operations centre",
    brief: "Software Sees. 3:2.",
  },
  "difference-experience": {
    src: img("15-senior-field-specialist.webp"),
    alt: "A senior Orravan field specialist",
    brief: "Experience Decides. 3:2.",
  },

  /* --- build what buildings become ------------------------------------- */
  team: {
    src: img("16-team-careers.webp"),
    alt: "The Orravan team",
    brief: "Careers and team. 16:9.",
  },

  /* --- built for every industry ----------------------------------------- */
  "industry-healthcare": { src: img("17-industry-healthcare.webp"), alt: "Healthcare", brief: "Industry. 3:2." },
  "industry-commercial": { src: img("18-industry-commercial.webp"), alt: "Commercial", brief: "Industry. 3:2." },
  "industry-education": { src: img("19-industry-education.webp"), alt: "Education", brief: "Industry. 3:2." },
  "industry-hospitality": { src: img("20-industry-hospitality.webp"), alt: "Hospitality", brief: "Industry. 3:2." },
  "industry-restaurants": { src: img("21-industry-restaurants.webp"), alt: "Restaurants", brief: "Industry. 3:2." },
  "industry-mission": { src: img("22-industry-mission-critical.webp"), alt: "Mission critical", brief: "Industry. 3:2." },
};
