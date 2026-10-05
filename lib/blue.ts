/**
 * BLUE at the Gale — content for the concept room.
 *
 * Section order, image placement and focal crops follow the client's
 * placement guide and the approved mock in
 * `public/images/blue/00-reference-homepage-mock.png`. Every word on the
 * page lives here as text: the supplied photography carries no type, and
 * dates, set times, menu names and labels must stay in HTML so they can
 * be selected, translated, read aloud and indexed.
 */

const IMG = "/images/blue";

export type Shot = {
  src: string;
  alt: string;
  /** Focal point for the crop, so the subject survives every ratio. */
  pos?: string;
};

export const NAV = [
  { href: "#tonight", label: "Tonight" },
  { href: "#experiences", label: "Experiences" },
  { href: "#calendar", label: "Calendar" },
  { href: "#membership", label: "Membership" },
  { href: "#private", label: "Private Events" },
] as const;

export const VENUE = {
  street: "1690 Collins Avenue",
  city: "Miami Beach, FL 33139",
  phone: "305 604 1800",
  phoneHref: "tel:+13056041800",
  email: "info@blueatgale.com",
} as const;

/* ------------------------------------------------------- the hero --- */

export const HERO: Shot = {
  src: `${IMG}/01-hero-open-curtains-microphone.webp`,
  alt: "The room at BLUE: velvet curtains drawn back on a lit microphone, candlelit tables in the foreground",
  /* The microphone is the anchor of the frame and sits right of centre;
     the crop holds it rather than the geometric middle. */
  pos: "62% 52%",
};

/* --------------------------- from blue hour to after hours (band) --- */

export const EVENING_STATES: (Shot & { caption: string })[] = [
  {
    src: `${IMG}/02-blue-hour-terrace.webp`,
    alt: "Guests on the terrace as the sun goes down over the water",
    caption: "Sunset on the terrace",
    pos: "center 42%",
  },
  {
    src: `${IMG}/03-dinner-show.webp`,
    alt: "A singer and her band playing to a full dining room",
    caption: "Dinner show",
    pos: "center 46%",
  },
  {
    src: `${IMG}/04-after-midnight.webp`,
    alt: "The stage in deep blue light after midnight",
    caption: "After midnight",
    pos: "center 48%",
  },
];

/* ------------------------------------------------ tonight, in one view --- */

export type Billing = {
  /** The date numeral, or null for tonight's own bill. */
  date: string | null;
  day: string;
  billing: string;
  artist: string;
  sets: string;
  shot: Shot;
};

export const TONIGHT: Billing[] = [
  {
    date: null,
    day: "Thursday",
    billing: "Tonight",
    artist: "Marcus Johnson Quartet",
    sets: "8PM & 10PM",
    shot: {
      src: `${IMG}/05-artist-marcus.webp`,
      alt: "Marcus Johnson in profile, in black tie",
      pos: "center 26%",
    },
  },
  {
    date: "23",
    day: "Friday",
    billing: "Latin Friday",
    artist: "Laura Chavez Ensemble",
    sets: "9PM & 11PM",
    shot: {
      src: `${IMG}/06-artist-laura.webp`,
      alt: "Laura Chavez singing into a handheld microphone",
      pos: "center 24%",
    },
  },
  {
    date: "24",
    day: "Saturday",
    billing: "Cabaret Saturday",
    artist: "Nicole Arends in Blue",
    sets: "9PM & 11PM",
    shot: {
      src: `${IMG}/07-artist-nicole.webp`,
      alt: "Nicole Arends at a vintage microphone",
      pos: "center 22%",
    },
  },
];

/* ------------------------------------------- the two full-width acts --- */

export const DINNER: Shot = {
  src: `${IMG}/08-dinner-scored-live.webp`,
  alt: "A table set for dinner while a singer performs behind it",
  pos: "center 34%",
};

export const TURN: Shot = {
  src: `${IMG}/09-room-turns-blue.webp`,
  alt: "The room seen through an oval opening, the floor in deep blue light",
  pos: "center center",
};

/* ---------------------------------------------------- the blue list --- */

/** Six items, left to right as they stand in the photograph. The labels
 *  are HTML beneath the image rather than type baked into it. */
export const BLUE_LIST: { name: string; note?: string }[] = [
  { name: "Aegean Martini" },
  { name: "Clarity Negroni", note: "Poured tableside" },
  { name: "Caviar Blini" },
  { name: "Champagne Bollinger" },
  { name: "Oysters" },
  { name: "Lobster Roll" },
];

export const BLUE_LIST_SHOT: Shot = {
  src: `${IMG}/10-blue-list-cocktails.webp`,
  alt: "Six signature cocktails and bites on a pale blue ground",
  pos: "center bottom",
};

/* ----------------------------------------------------- membership --- */

export const MEMBER_RIGHTS = [
  "Named bottle locker",
  "Stored champagne",
  "Personal glassware",
  "Rooftop & beach access",
];

export const MEMBER_SHOTS: Shot[] = [
  { src: `${IMG}/11-member-blue-door.webp`, alt: "A brass locker plate reading B 07", pos: "center" },
  { src: `${IMG}/12-member-bottle-locker.webp`, alt: "The back bar, bottles held in low light", pos: "center" },
  { src: `${IMG}/13-member-glassware.webp`, alt: "Personal crystal on a polished counter", pos: "center" },
  { src: `${IMG}/14-member-rooftop.webp`, alt: "The rooftop pool at the Gale", pos: "center" },
];

/* -------------------------------------------------- private events --- */

export const EVENTS: (Shot & { title: string })[] = [
  { src: `${IMG}/15-event-art-basel-dinner.webp`, alt: "A long table set for a private dinner", title: "Art Basel Dinner", pos: "center 48%" },
  { src: `${IMG}/16-event-fashion-presentation.webp`, alt: "A model on the BLUE stage", title: "Fashion Presentation", pos: "center 40%" },
  { src: `${IMG}/17-event-intimate-wedding.webp`, alt: "A couple on the floor at a wedding", title: "Intimate Wedding", pos: "center 36%" },
  { src: `${IMG}/18-event-corporate-reception.webp`, alt: "A standing reception filling the room", title: "Corporate Reception", pos: "center 46%" },
];

/* --------------------------------------------- below the surface --- */

export const DESCENT: Shot[] = [
  { src: `${IMG}/19-gale-arrival.webp`, alt: "The Gale South Beach on Collins Avenue at night", pos: "center 56%" },
  { src: `${IMG}/20-hidden-descent.webp`, alt: "The stair down from the Gale lobby", pos: "center" },
  { src: `${IMG}/21-blue-door-entry.webp`, alt: "The blue door at the bottom of the stair", pos: "center" },
];

/* ------------------------------------------------------ final call --- */

export const FINALE: Shot = {
  src: `${IMG}/22-final-performance-cta.webp`,
  alt: "A singer in silhouette at the microphone, her band behind her in blue light",
  /* She stands right of frame; the crop keeps her there and leaves the
     dark left third for the copy. */
  pos: "68% center",
};

export const FOOTER_NAV = [
  { heading: "The Room", links: ["Tonight", "Calendar", "Experiences", "Membership", "Private Events"] },
  { heading: "Practical", links: ["Instagram", "Dress Code", "FAQs", "Careers", "Privacy Policy"] },
];
