/**
 * BLUE at the Gale — content and the image manifest for the concept room.
 *
 * Every photograph the page wants is declared here with `src: null` until
 * the client's assets land. Each frame paints its own stage light in CSS,
 * so the room reads as lit and finished with no photography at all; when a
 * file is dropped into `public/images/blue/` under the documented name,
 * flip the `src` and the photograph sits over that light instead of
 * replacing a grey box. See `public/images/blue/README.md`.
 */

export type Frame = {
  /** Path under /public once the asset lands, or null while it hasn't. */
  src: string | null;
  alt: string;
  /** object-position for the crop, so the subject survives every ratio. */
  pos?: string;
  /** Which stage light the CSS placeholder paints when src is null. */
  light: "candle" | "cobalt" | "turn" | "night";
};

export const NAV = [
  { href: "#tonight", label: "Tonight" },
  { href: "#experience", label: "The Experience" },
  { href: "#calendar", label: "Calendar" },
  { href: "#membership", label: "Membership" },
  { href: "#private", label: "Private Events" },
] as const;

export const VENUE = {
  name: "BLUE",
  sub: "At the Gale South Beach",
  street: "1690 Collins Avenue",
  city: "Miami Beach, FL 33139",
  phone: "305 604 1800",
  phoneHref: "tel:+13056041800",
  email: "info@blueatgale.com",
} as const;

/* ------------------------------------------------------ the hero --- */

/** The open-curtain scene, separated into planes. Each is optional: the
 *  stage composes with whichever ones exist. */
export const HERO_PLANES = {
  scrim: {
    src: null,
    alt: "",
    light: "night",
  } as Frame,
  microphone: {
    src: null,
    alt: "",
    light: "cobalt",
  } as Frame,
  curtainLeft: { src: null, alt: "", light: "night" } as Frame,
  curtainRight: { src: null, alt: "", light: "night" } as Frame,
  tables: { src: null, alt: "", light: "candle" } as Frame,
  /** The single flat frame used under reduced motion and with no JS. */
  still: {
    src: null,
    alt: "The room at BLUE, curtains open on a lit microphone",
    light: "cobalt",
  } as Frame,
};

/* --------------------------------------------- this week at blue --- */

export type Performance = {
  date: string;
  day: string;
  billing: string;
  artist: string;
  format: string;
  sets: string;
  note: string;
  frame: Frame;
};

export const WEEK: Performance[] = [
  {
    date: "22",
    day: "Thursday",
    billing: "Blue Standards",
    artist: "Marcus Johnson Quartet",
    format: "Trumpet, piano, bass, brushes",
    sets: "8PM & 10PM",
    note: "The room's own repertoire, played by the people who wrote the arrangements.",
    frame: {
      src: null,
      alt: "Marcus Johnson at the microphone in a dark room",
      pos: "center 32%",
      light: "candle",
    },
  },
  {
    date: "23",
    day: "Friday",
    billing: "Latin Friday",
    artist: "Laura Chavez Ensemble",
    format: "Voice, guitar, percussion",
    sets: "9PM & 11PM",
    note: "Bolero and son through the first seating, and the floor open by midnight.",
    frame: {
      src: null,
      alt: "Laura Chavez singing under a single warm light",
      pos: "center 30%",
      light: "cobalt",
    },
  },
  {
    date: "24",
    day: "Saturday",
    billing: "Cabaret Saturday",
    artist: "Nicole Arends in Blue",
    format: "Voice and a seven-piece",
    sets: "9PM & 11PM",
    note: "The late set the room is named for. Reservations close early on Saturdays.",
    frame: {
      src: null,
      alt: "Nicole Arends at a vintage microphone in blue light",
      pos: "center 28%",
      light: "night",
    },
  },
];

/* --------------------------------------------------- the evening --- */

export const EVENING = [
  { time: "7:00", title: "The room opens", detail: "Champagne on the terrace while the light goes off the water." },
  { time: "8:00", title: "One seating", detail: "Four courses, served to the whole room at the same hour." },
  { time: "9:00", title: "The first set", detail: "The lights come down and the stage takes the room." },
  { time: "11:00", title: "The turn", detail: "Second set. Lights lower. The floor opens." },
  { time: "1:00", title: "After hours", detail: "The bar stays, the room stays, and so does the band." },
];

/* -------------------------------------------------- behind the bar --- */

export const BAR = [
  { name: "Aegean Martini", detail: "Gin, dry vermouth, olive oil washed, brined caper leaf" },
  { name: "Clarity Negroni", detail: "Clarified and poured tableside from a single decanter" },
  { name: "Bollinger, by the glass", detail: "Special Cuvée, opened to order, never held over" },
  { name: "The Gale Old Fashioned", detail: "Cane-rested rye, burnt orange, house bitters" },
  { name: "Caviar and blini", detail: "Ossetra, crème fraîche, warm buckwheat" },
  { name: "Oysters, the half dozen", detail: "Cold, dressed with nothing but a lemon" },
];

/* --------------------------------------------------- membership --- */

export const MEMBER_RIGHTS = [
  "A named bottle locker behind the bar",
  "Champagne stored under your own name",
  "Personal glassware, kept and polished for you",
  "Rooftop and beach access at the Gale",
  "First call on Basel week and holiday seatings",
];

export const MEMBERSHIP_FRAMES: Frame[] = [
  { src: null, alt: "A named brass bottle locker, B 07", pos: "center", light: "candle" },
  { src: null, alt: "The back bar, bottles held in low light", pos: "center", light: "night" },
  { src: null, alt: "Personal crystal on a polished counter", pos: "center", light: "candle" },
  { src: null, alt: "The rooftop pool at the Gale at dusk", pos: "center", light: "cobalt" },
];

/* ------------------------------------------------ private events --- */

export const PRIVATE = [
  { title: "Art Basel Dinner", detail: "Ninety seated, one seating, the room closed to the public.", frame: { src: null, alt: "A long table set for a private dinner", pos: "center 46%", light: "candle" } as Frame },
  { title: "Fashion Presentation", detail: "The stage becomes a runway; the terrace becomes the reception.", frame: { src: null, alt: "A model on the BLUE stage", pos: "center 38%", light: "cobalt" } as Frame },
  { title: "Intimate Wedding", detail: "Ceremony on the terrace, dinner below, the band already here.", frame: { src: null, alt: "A couple on the dance floor", pos: "center 34%", light: "candle" } as Frame },
  { title: "Corporate Reception", detail: "Full buyout, four hundred standing, one bill.", frame: { src: null, alt: "A reception filling the room", pos: "center 46%", light: "night" } as Frame },
];

/* --------------------------------------------------- the descent --- */

export const DESCENT: Frame[] = [
  { src: null, alt: "The Gale South Beach on Collins Avenue at night", pos: "center 58%", light: "night" },
  { src: null, alt: "The stair down from the Gale lobby", pos: "center", light: "candle" },
  { src: null, alt: "The blue door at the bottom of the stair", pos: "center", light: "cobalt" },
];

export const FOOTER_NAV = [
  { heading: "The Room", links: ["Tonight", "Calendar", "The Experience", "Membership", "Private Events"] },
  { heading: "Practical", links: ["Instagram", "Dress Code", "FAQs", "Careers", "Privacy Policy"] },
];
