/**
 * FEEDBACK — smash burgers, fries, shakes. A burger counter run like a
 * venue: the menu is a set list, the sauces are a pedal board, the
 * monthly special is a release, and the loyalty card is an all-ages
 * pass.
 *
 * The whole room is built on one idea — *signal* — and one number:
 * pressure. Pressure is what the visitor applies with the amp knob, and
 * it is the same number that cooks the burger, drives the waveform,
 * distorts the wordmark and finally hands over the order button. Every
 * interaction on the page reads from it, so the site behaves like one
 * instrument rather than a page of separate effects.
 *
 * Everything here is data so the page, the full set list and the
 * receipt printed in the footer cannot disagree with each other.
 */

export const FEEDBACK = {
  name: "FEEDBACK",
  mark: "FB",
  descriptor: "Smash Burgers · Fries · Shakes",
  motto: "Built loud.",
  place: "Rivertown, USA",
  address: "1624 Pressure Ave.",
  city: "Rivertown, USA",
  phone: "(615) 555-1945",
  hours: "Mon — Sun · 11am — 11pm",
  hoursShort: "Open today · 11am—11pm",
  /** Read out under the hero: the griddle is a live instrument. */
  griddleTemp: "425°F",
  crossStreets: ["Riverside Ave.", "Smashburg St."],
} as const;

/* ------------------------------------------------ the pressure --- */

/** The knob travels 0 to 10, and so does everything downstream. */
export const PRESSURE_MIN = 0;
export const PRESSURE_MAX = 10;

/**
 * Above this the room is in maximum feedback: the wordmark blows out,
 * the swell plays, and the order button is handed over. Deliberately
 * short of 10 so the last few degrees of the knob are spent *inside*
 * the loud moment rather than arriving at it.
 */
export const FEEDBACK_POINT = 9.4;

export type BuildStage = {
  /** 1-indexed, because the frames down the right of the hero are numbered. */
  n: number;
  name: string;
  /** What the counter would call it. */
  caption: string;
  /** Pressure at which this stage takes over. */
  at: number;
  /** The full-bleed still for this frame. Falls back to the drawn stage. */
  image: string;
  /**
   * Set on the frame that resolves: instead of another full-bleed still,
   * the stage cuts to the griddle and presents the burger isolated. It
   * is the moment the cook stops and the product is handed over.
   */
  resolves?: boolean;
};

/**
 * Five frames: the same burger, five points through the cook. The knob
 * scrubs between them, and the numbered frames down the right of the
 * hero are the same five, clickable — a manual scrubber for anyone who
 * would rather jump than drag.
 */
export const STAGES: BuildStage[] = [
  {
    n: 1,
    name: "Raw patty",
    caption: "Ball of chuck, waiting over the heat",
    at: 0,
    image: "/images/feedback/process-01-raw-patty.jpg",
  },
  {
    n: 2,
    name: "First smash",
    caption: "Pressed thin — the edges start to catch",
    at: 2,
    image: "/images/feedback/process-02-first-smash.jpg",
  },
  {
    n: 3,
    name: "Onions",
    caption: "Griddled onion pressed into the crust",
    at: 4,
    image: "/images/feedback/process-03-griddled-onions.jpg",
  },
  {
    n: 4,
    name: "Cheese melt",
    caption: "Double American, over the edge",
    at: 6,
    image: "/images/feedback/process-04-cheese-melt.jpg",
  },
  {
    n: 5,
    name: "The Feedback",
    caption: "Bun on. Pickles in. Signal live.",
    at: 8,
    image: "/images/feedback/process-05-finished-burger.jpg",
    resolves: true,
  },
];

/** Which of the five frames a given pressure is showing. 0-indexed. */
export function stageIndexAt(pressure: number): number {
  let index = 0;
  for (let i = 0; i < STAGES.length; i += 1) {
    if (pressure >= STAGES[i].at) index = i;
  }
  return index;
}

/**
 * How far through the *current* frame the pressure sits, 0 to 1. This
 * is what makes the transitions read as a track changing rather than a
 * slideshow: each ingredient drops on its own progress, not on a step.
 */
export function stageProgressAt(pressure: number): number {
  const index = stageIndexAt(pressure);
  const from = STAGES[index].at;
  const to = index + 1 < STAGES.length ? STAGES[index + 1].at : PRESSURE_MAX;
  if (to <= from) return 1;
  return clamp01((pressure - from) / (to - from));
}

/** The pressure that puts a given frame exactly on screen. */
export function pressureForStage(index: number): number {
  const at = Math.min(Math.max(index, 0), STAGES.length - 1);
  const stage = STAGES[at];
  // Land a little inside the frame so the stage reads as settled.
  const next = STAGES[at + 1];
  return next ? (stage.at + next.at) / 2 : PRESSURE_MAX;
}

export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function clampPressure(n: number): number {
  if (Number.isNaN(n)) return PRESSURE_MIN;
  return Math.min(PRESSURE_MAX, Math.max(PRESSURE_MIN, n));
}

/** Normalized 0—1 pressure, which is what most of the visuals want. */
export function pressureLevel(pressure: number): number {
  return clamp01((pressure - PRESSURE_MIN) / (PRESSURE_MAX - PRESSURE_MIN));
}

/* ------------------------------------------------------- the menu --- */

export type MenuItem = {
  /** Track number on the set list. */
  code: string;
  name: string;
  detail: string;
  /** Whole dollars: this counter does not deal in cents. */
  price: number;
  image: string;
  /** How much of today's prep is left, 0—100. Feeds the channel meter. */
  availability: number;
  kind: "burger" | "side" | "shake";
};

export const SET_LIST: { title: string; note?: string; items: MenuItem[] }[] = [
  {
    title: "Main set",
    note: "Smashed to order on a 425° flat top",
    items: [
      {
        code: "01",
        name: "The Feedback",
        detail: "Double smash, American, onions, pickles, house sauce.",
        price: 9,
        image: "/images/feedback/menu-feedback-burger.jpg",
        availability: 86,
        kind: "burger",
      },
      {
        code: "02",
        name: "Clean Channel",
        detail: "Single smash, American, pickles, onions, house sauce.",
        price: 7,
        image: "/images/feedback/menu-clean-channel.jpg",
        availability: 94,
        kind: "burger",
      },
      {
        code: "03",
        name: "Distortion Fries",
        detail: "Crispy fries, seasoned salt.",
        price: 5,
        image: "/images/feedback/menu-distortion-fries.jpg",
        availability: 72,
        kind: "side",
      },
    ],
  },
  {
    title: "Second set",
    items: [
      {
        code: "04",
        name: "Overdrive",
        detail: "Triple smash, double American, griddled onion, spicy boost.",
        price: 13,
        image: "/images/feedback/menu-overdrive.jpg",
        availability: 41,
        kind: "burger",
      },
      {
        code: "05",
        name: "Soundcheck",
        detail: "Single smash, no cheese, lettuce, tomato, house sauce.",
        price: 7,
        image: "/images/feedback/menu-soundcheck.jpg",
        availability: 90,
        kind: "burger",
      },
      {
        code: "06",
        name: "Loaded Distortion",
        detail: "Distortion fries, cheese sauce, griddled onion, house sauce.",
        price: 8,
        image: "/images/feedback/menu-loaded.jpg",
        availability: 55,
        kind: "side",
      },
    ],
  },
  {
    title: "Encore",
    note: "Hand-spun, one thickness only",
    items: [
      {
        code: "07",
        name: "Vanilla Hum",
        detail: "Frozen custard, real vanilla.",
        price: 6,
        image: "/images/feedback/menu-vanilla-hum.jpg",
        availability: 100,
        kind: "shake",
      },
      {
        code: "08",
        name: "Black Noise",
        detail: "Dark chocolate malt, sea salt.",
        price: 6,
        image: "/images/feedback/menu-black-noise.jpg",
        availability: 78,
        kind: "shake",
      },
    ],
  },
];

/** Everything on the set list, flat — the order tray works from this. */
export const ALL_ITEMS: MenuItem[] = SET_LIST.flatMap((set) => set.items);

export function itemByCode(code: string): MenuItem | undefined {
  return ALL_ITEMS.find((item) => item.code === code);
}

/** The three the hero leads with, in comp order. */
export const LEAD_ITEMS: MenuItem[] = SET_LIST[0].items;

/* ------------------------------------------------- the pedalboard --- */

export type SaucePersonality = "smooth" | "aggressive" | "clipped";

export type Sauce = {
  id: string;
  name: string;
  /** What the waveform does when this pedal is engaged. */
  personality: SaucePersonality;
  heat: "mild" | "medium" | "loud";
  description: string;
  image: string;
  /** Indicator colour when lit. */
  led: string;
};

export const SAUCES: Sauce[] = [
  {
    id: "house",
    name: "House Sauce",
    personality: "smooth",
    heat: "mild",
    description:
      "The clean signal. Mayo, ketchup, pickle brine, a lot of black pepper. On every burger unless you say otherwise.",
    image: "/images/feedback/sauce-house.png",
    led: "#E23B2E",
  },
  {
    id: "spicy",
    name: "Spicy Boost",
    personality: "aggressive",
    heat: "loud",
    description:
      "Gain stage. Fermented chili, roasted garlic, vinegar. Peaks hard, then gets out of the way.",
    image: "/images/feedback/sauce-spicy.png",
    led: "#E23B2E",
  },
  {
    id: "garlic",
    name: "Garlic Crunch",
    personality: "clipped",
    heat: "medium",
    description:
      "Clipped and crunchy. Confit garlic, crisp shallot, chili oil. Texture you can hear.",
    image: "/images/feedback/sauce-garlic.png",
    led: "#E8A33D",
  },
];

/* ---------------------------------------------------- now playing --- */

/** The monthly burger, released like a tape rather than listed as a special. */
export const RELEASE = {
  title: "Brighter Noise",
  format: "FB—BN",
  through: "Available through Oct 31",
  price: 12,
  code: "BN",
  cover: "/images/feedback/now-playing-cassette-burger.jpg",
  /** Track listing, which is to say ingredients. */
  tracks: [
    "Double smash patty",
    "American cheese",
    "Caramelized onions",
    "Bacon jam",
    "Pickles",
    "House sauce",
  ],
  note: "Limited run",
} as const;

/* ------------------------------------------------------- all ages --- */

export const EVENT = {
  title: "All ages. All volume.",
  date: "Fri. Oct 31",
  time: "8pm",
  detail: "All ages · Local bands · Loud food",
  image: "/images/feedback/all-ages-crowd.jpg",
} as const;

export const LOYALTY = {
  name: "All Ages Pass",
  stamps: 10,
  reward: "10 stamps / free burger",
} as const;

export type MerchItem = {
  name: string;
  detail: string;
  price: number;
  image: string;
};

export const MERCH: MerchItem[] = [
  {
    name: "Feedback Tee",
    detail: "Heavyweight cotton, screen printed front and back.",
    price: 28,
    image: "/images/feedback/merch-tee.png",
  },
  {
    name: "FB Cap",
    detail: "Washed maroon, embroidered mark.",
    price: 32,
    image: "/images/feedback/merch-cap.png",
  },
];

/* -------------------------------------------------- the surfaces --- */

/**
 * Photographed stock and panels. These are grounds rather than content:
 * the sections read them through CSS backgrounds, so a section is never
 * waiting on an image to be laid out.
 */
export const SURFACE = {
  griddle: "/images/feedback/hero-griddle-background.jpg",
  /** The finished burger, isolated — the hero's resting state. */
  hero: "/images/feedback/hero-burger-cutout.png",
  /** The macro cross-section behind the torn sheet. */
  anatomy: "/images/feedback/signal-burger-closeup.jpg",
  bonePaper: "/images/feedback/texture-bone-paper.jpg",
  oxbloodPaper: "/images/feedback/texture-oxblood-paper.jpg",
  oxbloodPanel: "/images/feedback/paper-oxblood-panel.jpg",
  ampGrille: "/images/feedback/texture-amp-grille.jpg",
  receipt: "/images/feedback/paper-receipt-blank.png",
} as const;

/**
 * The wordmark in its three states — clean, signal, overload.
 *
 * NOT WIRED YET, deliberately: the supplied artwork is set flush to its
 * canvas on both sides, so the F loses its stem and the K its right leg
 * at any size. The hero draws the mark as SVG instead, which renders the
 * whole word, stays crisp at any width, responds to *any* pressure value
 * rather than three of them, and is real text to a screen reader.
 *
 * Re-export these with side bearing — even 4% of the canvas each side —
 * and swapping them in is a one-line change in the hero.
 */
export const MARK = {
  clean: "/images/feedback/logo-feedback-01-clean.png",
  signal: "/images/feedback/logo-feedback-02-signal.png",
  overload: "/images/feedback/logo-feedback-03-overload.png",
} as const;

/* ---------------------------------------------- signal, annotated --- */

/** Callouts drawn onto the cross-section in section 02. */
export const ANATOMY = [
  { label: "Maximum contact", detail: "Every gram on the steel", at: 22 },
  { label: "Double American", detail: "Melted over the edge", at: 42 },
  { label: "Griddled onion", detail: "Pressed into the crust", at: 62 },
  { label: "House signal", detail: "Sauce, top and bottom", at: 82 },
] as const;

/* ------------------------------------------------------ the order --- */

export type OrderLine = { code: string; qty: number };

export function orderTotal(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => {
    const item = itemByCode(line.code);
    return item ? sum + item.price * line.qty : sum;
  }, 0);
}

export function orderCount(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}

/** Receipts are numbered from a fixed seed so the footer looks staffed. */
export function orderNumber(seed: number): string {
  return String(400 + (Math.abs(Math.round(seed)) % 600)).padStart(4, "0");
}

export function money(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}
