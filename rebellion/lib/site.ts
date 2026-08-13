/**
 * Site content.
 *
 * Placeholder copy and data live here so the CMS wiring (blueprint §11) has a
 * single shape to target later. Anything marked PLACEHOLDER is unverified and
 * must be confirmed with the client before launch — the blueprint's source
 * caution in §15 applies to hours, address, phone, capacities and prices.
 */

import { images, type ImageName } from "./images";

export const site = {
  name: "Rebellion Beachside Bar & Bistro",
  shortName: "Rebellion Beachside",
  parent: "Rebellion Restaurants",
  tagline: "Rebel against the ordinary.",
  description:
    "A chef-driven beachside bistro, private gathering place, and bottle shop for people who would rather not do the expected.",
  /* PLACEHOLDER — verify NAP against the client's Google Business Profile. */
  address: {
    street: "200 N Orlando Ave",
    city: "Cocoa Beach",
    state: "FL",
    zip: "32931",
  },
  phone: "321.784.9463",
  phoneHref: "tel:+13217849463",
  email: "hello@rebellionbeachside.com",
  /* Reservation platform deep link — swap for the live OpenTable/Resy URL and
     preserve campaign parameters (blueprint §11). */
  reserveUrl: "/reserve",
  mapUrl: "https://maps.google.com/?q=200+N+Orlando+Ave+Cocoa+Beach+FL+32931",
  social: {
    instagram: "https://www.instagram.com/rebellionbeachside/",
    facebook: "https://www.facebook.com/",
  },
} as const;

/* PLACEHOLDER — confirm service hours, happy hour and kitchen close. */
export const hours = [
  { days: "Mon – Thu", time: "4PM – 10PM" },
  { days: "Fri – Sat", time: "11AM – 11PM" },
  { days: "Sun", time: "11AM – 9PM" },
];

/** Primary navigation — blueprint §06, ordered by intent, not department. */
export const nav = [
  { label: "Menus", href: "/menus" },
  { label: "Happenings", href: "/happenings" },
  { label: "Private Events", href: "/private-events" },
  { label: "Bottle Shop", href: "/bottle-shop" },
  { label: "Story", href: "/story" },
  { label: "Visit", href: "/visit" },
];

/** Module 02 — "Choose your Rebellion". Three ways in, no more. */
export const experiences: {
  key: string;
  title: string;
  line: string;
  cta: string;
  href: string;
  image: ImageName;
}[] = [
  {
    key: "dine",
    title: "Dine",
    line: "Chef-driven menus, craft cocktails & thoughtful wines.",
    cta: "Explore menus",
    href: "/menus",
    image: "dine",
  },
  {
    key: "gather",
    title: "Gather",
    line: "From date nights to big celebrations, we've got you.",
    cta: "Private events",
    href: "/private-events",
    image: "gather",
  },
  {
    key: "take-it-home",
    title: "Take It Home",
    line: "Curated wines, cocktails & provisions to enjoy anywhere.",
    cta: "Shop bottle shop",
    href: "/bottle-shop",
    image: "takeItHome",
  },
];

/** Module 04–06 — the three feature panels beneath the experience cards. */
export const features: {
  key: string;
  eyebrow: string;
  lines: string[];
  cta: string;
  href: string;
  image: ImageName;
  tone: "ink" | "ink-soft" | "oxblood";
}[] = [
  {
    key: "food",
    eyebrow: "Featured Food",
    lines: ["Seasonal ingredients.", "Big flavors.", "Zero shortcuts."],
    cta: "See what's cooking",
    href: "/menus",
    image: "featuredFood",
    tone: "ink",
  },
  {
    key: "cocktails",
    eyebrow: "Featured Cocktails",
    lines: ["Original pours,", "fresh ingredients,", "rebel spirit."],
    cta: "View cocktails",
    href: "/menus#cocktails",
    image: "featuredCocktail",
    tone: "ink-soft",
  },
  {
    key: "events",
    eyebrow: "Private Events",
    lines: [
      "Birthdays, anniversaries,",
      "rehearsals, or full buyouts.",
      "Make it unforgettable.",
    ],
    cta: "Plan your event",
    href: "/private-events",
    image: "privateEvents",
    tone: "oxblood",
  },
];

export type Happening = {
  slug: string;
  /** ISO date. The calendar, homepage rail, event page and structured data all
      read this one source (blueprint §11, "single event data source"). */
  date: string;
  kind: string;
  title: string;
  time: string;
  blurb: string;
  image: ImageName;
  ticketed?: boolean;
};

/* PLACEHOLDER — replace with the live events calendar feed. */
export const happenings: Happening[] = [
  {
    slug: "live-music-the-saltbacks",
    date: "2026-09-11",
    kind: "Live Music",
    title: "The Saltbacks",
    time: "7PM – 10PM",
    blurb: "Three pieces, no set list, one very loud opinion about Tom Petty.",
    image: "eventLiveMusic",
  },
  {
    slug: "wine-dinner-old-world-new-stories",
    date: "2026-09-19",
    kind: "Wine Dinner",
    title: "Old World, New Stories",
    time: "6PM – 9PM",
    blurb: "Five courses, five bottles, and the arguments that produced them.",
    image: "eventWineDinner",
    ticketed: true,
  },
  {
    slug: "brunch-club-vinyl-and-mimosas",
    date: "2026-09-26",
    kind: "Brunch Club",
    title: "Vinyl & Mimosas",
    time: "11AM – 2PM",
    blurb: "Records on the turntable, citrus on the bar, nobody in a hurry.",
    image: "eventBrunch",
  },
  {
    slug: "cocktail-class-stirred-not-taught",
    date: "2026-10-03",
    kind: "Cocktail Class",
    title: "Stirred, Not Taught",
    time: "3PM – 5PM",
    blurb: "Build three classics with our bar team. You keep the technique.",
    image: "eventCocktailClass",
    ticketed: true,
  },
  {
    slug: "live-music-the-driftline",
    date: "2026-10-10",
    kind: "Live Music",
    title: "The Driftline",
    time: "7PM – 10PM",
    blurb: "Beach soul with the amps turned toward the water.",
    image: "eventBuyout",
  },
];

/* PLACEHOLDER — menus are illustrative. Real menus must be indexable HTML,
   never PDFs (blueprint §11, SEO/AEO). */
export const menuSections = [
  {
    id: "to-start",
    name: "To Start",
    note: "Built for the middle of the table.",
    items: [
      {
        name: "Gulf Shrimp Toast",
        desc: "Brioche, chili butter, preserved lemon, chives",
        price: "18",
      },
      {
        name: "Charred Octopus",
        desc: "Smoked potato, romesco, pickled fresno",
        price: "21",
      },
      {
        name: "The Board",
        desc: "Three cheeses, two cures, honeycomb, whatever the chef is pickling",
        price: "26",
      },
      {
        name: "Oysters on Ice",
        desc: "Half dozen, cucumber mignonette, hot sauce we make here",
        price: "22",
      },
    ],
  },
  {
    id: "mains",
    name: "Mains",
    note: "Seasonal ingredients. Big flavors. Zero shortcuts.",
    items: [
      {
        name: "Seared Scallops",
        desc: "Black garlic, charred broccolini, brown butter",
        price: "39",
      },
      {
        name: "Berkshire Pork Chop",
        desc: "Stone fruit mostarda, mustard greens, jus",
        price: "42",
      },
      {
        name: "Local Catch",
        desc: "Ask your server — it changes with the boats",
        price: "MP",
      },
      {
        name: "Cacio e Pepe, Our Way",
        desc: "Hand-cut pasta, three peppers, cured yolk",
        price: "28",
      },
    ],
  },
  {
    id: "cocktails",
    name: "Cocktails",
    note: "Original pours, fresh ingredients, rebel spirit.",
    items: [
      {
        name: "The Ordinary (Refused)",
        desc: "Rye, amaro, burnt orange, black walnut",
        price: "16",
      },
      {
        name: "Beachside Spritz",
        desc: "Sparkling wine, grapefruit cordial, sea salt",
        price: "14",
      },
      {
        name: "Low Tide",
        desc: "Mezcal, pineapple, lime, ancho",
        price: "16",
      },
      {
        name: "No Proof, Still Loud",
        desc: "Zero-proof: hibiscus, verjus, tonic",
        price: "11",
      },
    ],
  },
  {
    id: "wine",
    name: "Wine",
    note: "Forty by the glass. Four hundred more downstairs.",
    items: [
      {
        name: "Coastal Whites",
        desc: "Albariño, Assyrtiko, Muscadet — anything that likes salt",
        price: "14+",
      },
      {
        name: "Chillable Reds",
        desc: "Gamay, Trousseau, Frappato — served at the right temperature",
        price: "15+",
      },
      {
        name: "Bubbles",
        desc: "Grower Champagne, Pét-Nat, Cava de Paraje",
        price: "16+",
      },
      {
        name: "The List",
        desc: "Ask for the book. Somebody read every page of it.",
        price: "—",
      },
    ],
  },
];

/** Blueprint §08 — private-events occasions. */
export const occasions = [
  {
    title: "Rehearsal Dinners",
    line: "Long table, one menu, no seating-chart drama.",
  },
  { title: "Milestone Celebrations", line: "Birthdays and anniversaries that earn a room." },
  { title: "Corporate Gatherings", line: "Off-sites, client dinners, and quiet deals." },
  { title: "Wine Dinners", line: "Producer-led, paired, and properly poured." },
  { title: "Launches & Press", line: "Standing service, passed plates, full bar." },
  { title: "Full Buyouts", line: "The whole building, exactly your way." },
];

/* PLACEHOLDER — capacities and minimums require the venue walkthrough. */
export const venueFacts = [
  { label: "Seated", value: "Up to 60" },
  { label: "Standing", value: "Up to 90" },
  { label: "Full buyout", value: "Up to 150" },
  { label: "Response time", value: "Same business day" },
];

/** Blueprint §09 — the bottle shop opens as a merchant's edit, not a catalog. */
export const collections = [
  { name: "Chillable Reds", count: 6 },
  { name: "Beachside Whites", count: 7 },
  { name: "Bubbles", count: 5 },
  { name: "Under $30", count: 9 },
  { name: "Staff Picks", count: 4 },
];

/* PLACEHOLDER — inventory, pricing and fulfillment come from the commerce
   platform selected in blueprint §11. */
export const bottles = [
  {
    name: "Sanguine Gamay",
    producer: "Domaine Coteaux",
    region: "Beaujolais, France",
    vintage: "2023",
    style: "Chillable red",
    price: "28",
    note: "Serve it cold. Argue with anyone who says otherwise.",
  },
  {
    name: "Salt & Slate Albariño",
    producer: "Bodega Ría",
    region: "Rías Baixas, Spain",
    vintage: "2024",
    style: "Coastal white",
    price: "24",
    note: "Tastes like the wind coming off the water at 5pm.",
  },
  {
    name: "Pét-Nat No. 4",
    producer: "Ferment Collective",
    region: "Loire Valley, France",
    vintage: "2024",
    style: "Sparkling",
    price: "32",
    note: "Cloudy, a little feral, gone by Sunday.",
  },
  {
    name: "Old Vine Carignan",
    producer: "Casa Vieja",
    region: "Maule, Chile",
    vintage: "2022",
    style: "Structured red",
    price: "26",
    note: "Eighty-year-old vines and a price that makes no sense.",
  },
];

/** Editorial marquee, blueprint §08. */
export const marqueeWords = [
  "Food",
  "Wine",
  "Cocktails",
  "Gatherings",
  "Cocoa Beach",
];

export { images };
