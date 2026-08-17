/**
 * HOUSE ISSUE — neighborhood deli, rotisserie and goods, Los Angeles.
 *
 * The concept: everything the house makes is published as an issue.
 * A seasonal menu, a collaboration, a run of goods — each one is
 * numbered, dated, and archived, so the site has a reason to be
 * revisited and the brand accumulates depth instead of going stale.
 *
 * Issues are records here, which is what makes the archive, the
 * individual issue pages, and the masthead all agree without anyone
 * maintaining them separately.
 */

export type MenuItem = {
  name: string;
  detail: string;
  price: string;
  /** Items the rotisserie makes: they run out with the birds. */
  fromRotisserie?: boolean;
};
export type MenuSection = { title: string; note?: string; items: MenuItem[] };

export type Good = {
  name: string;
  detail: string;
  price: string;
  issue: number;
  status: "in stock" | "low" | "sold out";
};

/** The three plates the current issue leads with, as ordered items. */
export type Feature = {
  code: string;
  name: string;
  price: string;
  availability: "good" | "limited" | "gone";
  image: string;
};

/** A Drop product: merchandise published with the issue. */
export type DropItem = {
  name: string;
  variant: string;
  price: string;
  image: string;
};

export type Issue = {
  number: number;
  /** Display date, e.g. "August 2026". */
  dated: string;
  title: string;
  standfirst: string;
  /** The one thing this issue is about. */
  lede: string;
  features: Feature[];
  drop: DropItem[];
  sections: MenuSection[];
  goods: Good[];
  /** Short notes from the counter: the house's editorial voice. */
  notes: { title: string; body: string }[];
  current: boolean;
};

export const HOUSE = {
  name: "HOUSE ISSUE",
  mark: "H/01",
  descriptor: "Neighborhood Deli, Rotisserie & Goods",
  place: "Los Angeles, California",
  address: "1806 W Sunset Blvd, Los Angeles, CA 90026",
  phone: "(323) 555-1806",
  hours: "11am — 9pm",
  hoursLong: "Open today · 11am — 9pm",
  kitchenNote: "Rotisserie from 11am, until it runs out",
  motto: "Made for the block",
  promise: "Good food. Good people. Same table.",
  /** Birds put on at open; the live counter reads down from here. */
  birdsAtOpen: 60,
} as const;

export type Event = { day: string; time: string; title: string; detail: string };

export const THIS_WEEK: Event[] = [
  { day: "Friday", time: "6pm", title: "Friday Vinyl", detail: "Crate digs and community jams" },
  { day: "Saturday", time: "11am", title: "Saturday Chicken Run", detail: "5K. Good food. Better people." },
  { day: "Sunday", time: "4pm", title: "Sunday Family Table", detail: "Long table, big portions" },
];

export const COLLAB = {
  partner: "Bricks & Wood",
  what: "Tee drop and pop-up",
  when: "Sat 5/24 · 12 to 4pm",
} as const;

export const ISSUES: Issue[] = [
  {
    number: 1,
    dated: "Sunday Edition · August 2026",
    title: "Chickens and the things that go beside them",
    standfirst:
      "The first issue: one bird, done properly, and the counter that grew around it.",
    lede:
      "We opened with a rotisserie and a slicer and an argument about whether a deli needs anything else. It does not, mostly. What follows is what we make every day, plus the things we could not help making.",
    features: [
      { code: "HI-001", name: "Turkey Club", price: "14", availability: "good", image: "/images/house/cutout-turkey-club.png" },
      { code: "HI-002", name: "Rotisserie Plate", price: "18", availability: "good", image: "/images/house/cutout-rotisserie-plate.png" },
      { code: "HI-003", name: "Crispy Potatoes", price: "6", availability: "good", image: "/images/house/cutout-crispy-potatoes.png" },
    ],
    drop: [
      { name: "Block Tee", variant: "Natural", price: "36", image: "/images/house/cut-tee.png" },
      { name: "H/01 Cap", variant: "Washed black", price: "32", image: "/images/house/cut-cap.png" },
      { name: "Chili Oil", variant: "8oz, made for the block", price: "14", image: "/images/house/cut-chili-oil.png" },
      { name: "Sandwich Wrap", variant: "10 pack", price: "8", image: "/images/house/cut-wrap.png" },
    ],
    sections: [
      {
        title: "From the Rotisserie",
        note: "From 11am, until it runs out",
        items: [
          { name: "Half Chicken", detail: "Brined two days, oregano, lemon, drippings", price: "14", fromRotisserie: true },
          { name: "Whole Chicken", detail: "With bread beneath it, which is the point", price: "26", fromRotisserie: true },
          { name: "Chicken, Rice, Green Sauce", detail: "The plate we eat on our own break", price: "16", fromRotisserie: true },
          { name: "Potatoes, Under the Bird", detail: "Cooked in what falls", price: "7", fromRotisserie: true },
        ],
      },
      {
        title: "Sandwiches",
        note: "On house sesame rolls, all day",
        items: [
          { name: "The Number One", detail: "Mortadella, provolone, hot peppers, herb salad", price: "15" },
          { name: "Chopped Chicken", detail: "Yesterday's bird, celery, aioli, dill pickle", price: "14" },
          { name: "The Vegetable", detail: "Roasted squash, whipped feta, chili crisp, mint", price: "13" },
          { name: "Tuna, Properly", detail: "Oil-packed, red onion, lemon, too much of it", price: "14" },
        ],
      },
      {
        title: "From the Case",
        note: "By the pound, until we sell out",
        items: [
          { name: "Marinated Beans", detail: "Gigante, tomato, oregano, good oil", price: "9" },
          { name: "Cucumber Salad", detail: "Salted, dilled, cold as it gets", price: "8" },
          { name: "Potato Salad", detail: "Mustard, no mayonnaise, an ongoing debate", price: "8" },
          { name: "Olives and Feta", detail: "A pile of them, a slab of it", price: "10" },
        ],
      },
    ],
    goods: [
      { name: "House Hot Sauce", detail: "Fermented fresno, garlic, vinegar. 8oz.", price: "12", issue: 1, status: "in stock" },
      { name: "Green Sauce, Jarred", detail: "The one from the chicken plate. 8oz.", price: "11", issue: 1, status: "low" },
      { name: "Canvas Tote", detail: "Screened by hand in Frogtown. Heavy 12oz duck.", price: "28", issue: 1, status: "in stock" },
      { name: "House Coffee, Whole Bean", detail: "Roasted for us in Glassell Park. 12oz.", price: "19", issue: 1, status: "in stock" },
    ],
    notes: [
      {
        title: "On running out",
        body: "We cook a set number of birds. When they are gone the rotisserie is off and the sandwiches carry the afternoon. This is not scarcity as a tactic; it is what happens when you refuse to hold food under a lamp.",
      },
      {
        title: "On the bread",
        body: "Sesame rolls, baked two blocks away, delivered twice a day. If you come at four the second delivery has landed and the rolls are still warm. We are telling you this because we would want to know.",
      },
    ],
    current: true,
  },
];

export function currentIssue(): Issue {
  return ISSUES.find((i) => i.current) ?? ISSUES[0];
}

export function getIssue(n: number): Issue | undefined {
  return ISSUES.find((i) => i.number === n);
}

/** Every good ever published, newest issue first. */
export function allGoods(): Good[] {
  return [...ISSUES]
    .sort((a, b) => b.number - a.number)
    .flatMap((i) => i.goods);
}

export const FULFILMENT = {
  /** Delivery runs the block and a mile around it. */
  radius: "One mile of the shop",
  fee: 4,
  pickupWait: "Twenty minutes, longer at noon",
  deliveryWait: "Forty minutes, we will text you",
} as const;

export function issueLabel(n: number): string {
  return `No. ${String(n).padStart(3, "0")}`;
}
