/**
 * Who Orravan is: the history, and the people.
 *
 * The milestones are the client's own, supplied 3 Sep 2026, with the 2025 retrofit team and the
 * 25-in-2021 headcount confirmed by Alex on 9 Sep. On 13 Oct Alex moved
 * fifty on the team to 2025 and asked for the history to start at 2016,
 * so the 2014 and 2015 entries are gone (the founding year stays in the
 * headline and the team page). Nothing
 * here is inferred — where a month was given it is kept, where only a
 * year was given the entry sits at mid-year and `precision` says so, so
 * the timeline can render an honest tick rather than implying a date
 * nobody stated.
 *
 * The roster is a template. Don's employee list has not arrived, so
 * every person below is a placeholder carrying a real role: the shape
 * of the page is settled and adding people is data entry, not a
 * rebuild. `PLACEHOLDER` is what the page reads to know it should say
 * so out loud rather than presenting invented staff as fact.
 */

export type Lane = "company" | "sector" | "fleet" | "credential" | "people";

export const LANES: { id: Lane; label: string; short: string }[] = [
  { id: "company", label: "The company", short: "Company" },
  { id: "sector", label: "What we do", short: "Sectors" },
  { id: "fleet", label: "On the road", short: "Fleet" },
  { id: "credential", label: "Recognition", short: "Credentials" },
  { id: "people", label: "The team", short: "People" },
];

export type Milestone = {
  id: string;
  lane: Lane;
  /** Decimal year, used for horizontal position. */
  at: number;
  /** What the axis prints. */
  stamp: string;
  /** True when the client gave a month; false when only a year. */
  exact: boolean;
  title: string;
  detail: string;
  /** Rendered as a large figure on the card — real numbers only. */
  figure?: string;
};

export const MILESTONES: Milestone[] = [
  {
    id: "automation",
    lane: "sector",
    at: 2016.27,
    stamp: "Apr 2016",
    exact: true,
    title: "Automation sector launched",
    detail:
      "Controls and building automation come in-house. The company stops being the people who fix the equipment and starts being the people who know what it is doing.",
  },
  {
    id: "truck-3",
    lane: "fleet",
    at: 2016.7,
    stamp: "2016",
    exact: false,
    title: "Third truck",
    detail: "Danny's Sprinter. A fleet, now, rather than a vehicle.",
  },
  {
    id: "sbe",
    lane: "credential",
    at: 2018.5,
    stamp: "2018",
    exact: false,
    title: "SBE / Minority certification",
    detail:
      "Formal recognition of how the company was built, and the credential that opens institutional and public work.",
  },
  {
    id: "shop",
    lane: "company",
    at: 2020.5,
    stamp: "2020",
    exact: false,
    title: "Office and shop purchased",
    detail:
      "A permanent home. Fabrication, staging and stock move under one roof the company owns.",
  },
  {
    id: "twentyfive",
    lane: "people",
    at: 2021.5,
    stamp: "2021",
    exact: false,
    title: "Twenty-five on the team",
    detail: "Seven years from one truck to a workforce.",
    figure: "25",
  },
  {
    id: "union",
    lane: "company",
    at: 2023.5,
    stamp: "2023",
    exact: false,
    title: "Orravan joins the union",
    detail:
      "A commitment to trained, fairly paid trades — and to the standard of work that comes with them.",
  },
  {
    id: "fifty",
    lane: "people",
    at: 2025.35,
    stamp: "2025",
    exact: false,
    title: "Fifty on the team",
    detail: "Headcount doubles in four years without the standard moving.",
    figure: "50",
  },
  {
    id: "retrofit",
    lane: "sector",
    at: 2025.5,
    stamp: "2025",
    exact: false,
    title: "Retrofit mechanical team launched",
    detail:
      "A dedicated team for the first of the four pillars: lifting performance, reliability and comfort in buildings already running.",
  },
];

/** The axis runs a little either side of the real span — but only a
    little past the end, so the last milestone lands with runway to be
    read rather than arriving in the final few pixels of the scroll. */
export const SPAN = { from: 2016.0, to: 2025.75 } as const;

export const HISTORY = {
  eyebrow: "2016 — today",
  head: ["Ten years,", "one standard."],
  copy:
    "From three trucks in 2016 to a union shop of fifty. Scroll it through, or jump straight to any year.",
} as const;

/* ------------------------------------------------------------- team --- */

/** True while the roster below is scaffolding rather than real staff.
    False since 14 Sep 2026: the names, titles, groups, start years and
    quotes are Alex's spreadsheet, verbatim apart from two spelling
    corrections. Headshots from the studio shoot landed 24 Sep 2026. */
export const PLACEHOLDER = false;

export type Person = {
  id: string;
  name: string;
  role: string;
  /** Shown in the portrait tile when there is no photograph. */
  initials: string;
  /** Square headshot under /images/team/. Omit and the tile shows initials. */
  photo?: string;
  since?: string;
  /** Optional: most of the roster supplied a quote, not a biography. */
  bio?: string;
  quote?: string;
  /** Who said the quote, when it is not the person's own. */
  cite?: string;
  focus?: string[];
};

export type Department = {
  id: string;
  name: string;
  blurb: string;
  people: Person[];
};

export const LEADERSHIP: Person[] = [
  {
    id: "rigo-sr",
    name: "Rigo Navarro Sr.",
    role: "Founder",
    initials: "RN",
    photo: "/images/team/rigo-sr.webp",
    since: "2014",
    focus: ["Owner"],
  },
  {
    id: "danny",
    name: "Danny Navarro",
    role: "Chief Executive Officer",
    initials: "DN",
    photo: "/images/team/danny.webp",
    since: "2016",
    quote: "Success is built when nobody is watching.",
    focus: ["Owner"],
  },
  {
    id: "rigo-jr",
    name: "Rigo Navarro Jr.",
    role: "Chief Operating Officer",
    initials: "RN",
    photo: "/images/team/rigo-jr.webp",
    since: "2015",
    quote: "Success is earned, not given.",
    focus: ["Owner"],
  },
  {
    id: "don",
    name: "Don Bach",
    role: "President",
    initials: "DB",
    since: "2024",
    photo: "/images/team/don.webp",
    focus: ["Operations"],
  },
];

export const DEPARTMENTS: Department[] = [
  {
    id: "mechanical",
    name: "Mechanical",
    blurb: "Central plant, service and the on-call rotation.",
    people: [
      {
        id: "ray",
        name: "Ray Romaine",
        role: "VP of Operations",
        initials: "RR",
      },
      {
        id: "simon",
        name: "Simon Kang",
        role: "Mechanical Foreman",
        initials: "SK",
        photo: "/images/team/simon.webp",
        since: "2025",
        quote: "Do or do not, there is no try.",
      },
    ],
  },
  {
    id: "retrofit",
    name: "Retrofit",
    blurb: "Mechanical retrofit projects, from estimate to commissioning.",
    people: [
      {
        id: "lupe",
        name: "Lupe Hernandez",
        role: "Retrofit Projects Foreman",
        initials: "LH",
        photo: "/images/team/lupe.webp",
        since: "2025",
        quote:
          "We are in the country of opportunities. No one is coming to rescue your potential or hand you evolution on a silver platter, so do not wait for circumstances to align. Go find it and get it yourself. But ambition alone isn't enough; excellence is a discipline, not a luxury budget. Do it correctly the first time, and you will permanently bypass the hidden costs of doing it twice.",
      },
      {
        id: "juan",
        name: "Juan Rodriguez",
        role: "Project Manager",
        initials: "JR",
        photo: "/images/team/juan.webp",
        since: "2021",
        quote: "Speak like it's delusional until it isn't.",
      },
    ],
  },
  {
    id: "automation",
    name: "Automation & Controls",
    blurb: "DDC controls, integration, programming and support.",
    people: [
      {
        id: "alfred",
        name: "Alfred Rojas",
        role: "Controls Lead Engineer",
        initials: "AR",
        photo: "/images/team/alfred.webp",
        since: "2019",
        quote: "The way to get started is to quit talking and begin doing.",
      },
      {
        id: "victor",
        name: "Victor Dorado",
        role: "Account Executive",
        initials: "VD",
        photo: "/images/team/victor.webp",
        since: "2026",
        bio:
          "Credibility is built through action and results. From the Marine Corps to the field, to managing projects, and now as an Account Executive, Victor has held to one idea: a commitment only means something if you follow through on it. Leadership is taking ownership, delivering on what you promise, and earning the trust of your team and customers through consistent performance.",
        quote:
          "Words are words, explanations are explanations, promises are promises, but only performance is reality.",
        cite: "Harold S. Geneen",
      },
    ],
  },
  {
    id: "office",
    name: "Sales & Office",
    blurb: "Accounts, estimating and the people who keep the shop running.",
    people: [
      {
        id: "jessica",
        name: "Jessica Sanchez",
        role: "Sr. Account Executive",
        initials: "JS",
        photo: "/images/team/jessica.webp",
        since: "2025",
        quote: "Your experiences will either make you bitter or better.",
      },
      {
        id: "kendall",
        name: "Kendall Yanez",
        role: "Account Executive",
        initials: "KY",
        photo: "/images/team/kendall.webp",
        since: "2026",
        quote: "Don't wait for opportunity. Create it.",
      },
      {
        id: "christine",
        name: "Christine Escala",
        role: "Office Manager",
        initials: "CE",
        photo: "/images/team/christine.webp",
        since: "2026",
        quote: "With a little patience, a little persistence, and a lot of heart, you'll figure it out.",
      },
      {
        id: "alex",
        name: "Alex Jimenez",
        role: "Project Coordinator",
        initials: "AJ",
        photo: "/images/team/alex.webp",
      },
    ],
  },
];

export const TEAM_PAGE = {
  eyebrow: "Who we are",
  head: ["The people", "behind the work."],
  copy:
    "Mechanical, retrofit, automation and the office. Fifty people, one standard, and a name on every job.",
  orgHead: ["Meet", "the team."],
  orgCopy:
    "The people who run the work, leadership first. Open anyone to read more.",
  careersHead: ["Build what", "buildings become."],
  careersCopy:
    "We hire trained trades and keep them. If that is the kind of shop you want to work in, we would like to hear from you.",
  careersCta: "Explore careers",
} as const;

/* --------------------------------------------- the homepage story --- */

/**
 * The same decade, told as pictures rather than as a chart.
 *
 * The team page runs the full thirteen milestones as an instrument. The
 * homepage cannot ask for that much attention, and a visitor there
 * wants the feeling of a company that has been doing this a while — so
 * this is the highlight reel: seven chapters, each a full photograph
 * with the year set large over it, travelling sideways as the page
 * scrolls.
 *
 * `slot` currently points at plates from the direction-2 library, and
 * every one is a stand-in. The real article is Alex's field
 * photography — the aerial, the vans, the shop — and each entry says
 * in `wants` what it is holding a place for, so the swap is obvious
 * rather than archaeological.
 */
export type Chapter = {
  id: string;
  year: string;
  kicker: string;
  title: string;
  line: string;
  /** The photograph. A chapter without one renders as a lettered frame. */
  slot?: string;
  /** Shown large in a frame that has no photograph. */
  words?: string[];
  /** Vertical framing for the plate, per photograph. */
  focus: string;
  /** What Orravan should send to replace the stand-in. */
  wants: string;
};

export const STORY = {
  eyebrow: "2016 — today",
  head: ["Ten years", "in the building."],
  copy:
    "One truck became a union shop of fifty. The work is the record.",
  cta: "Meet the team",
} as const;

export const CHAPTERS: Chapter[] = [
  {
    id: "c-2016",
    year: "2016",
    kicker: "In-house",
    title: "Automation and controls",
    line: "Orravan stops being the people who fix the equipment and becomes the people who know what it is doing.",
    slot: "story-2016",
    focus: "50% 50%",
    wants: "The automation team, or a real controls panel.",
  },
  {
    id: "c-2018",
    year: "2018",
    kicker: "Recognised",
    title: "SBE / Minority certified",
    line: "Formal recognition of how the company was built — and the credential that opens institutional work.",
    words: ["Small Business Enterprise", "Minority Business Enterprise"],
    focus: "50% 50%",
    wants: "The SBE and MBE emblems, or the replacement photo Alex is sending. The old crew photo came out on 19 Oct: most of the people in it weren't Orravan staff.",
  },
  {
    id: "c-2020",
    year: "2020",
    kicker: "A permanent home",
    title: "Our own shop",
    line: "Fabrication, staging and stock move under one roof the company owns.",
    slot: "story-2020",
    focus: "50% 35%",
    wants: "The actual shop, inside and out. The fleet parked up.",
  },
  {
    id: "c-2023",
    year: "2023",
    kicker: "Union shop",
    title: "Trained trades, fairly paid",
    line: "A commitment to the standard of work that comes with them.",
    slot: "story-2023",
    focus: "50% 35%",
    wants: "The crew on site. Faces, not equipment.",
  },
  {
    id: "c-2025",
    year: "2025",
    kicker: "Today",
    title: "Fifty on the team",
    line: "Headcount doubled in four years without the standard moving.",
    slot: "story-2024",
    focus: "50% 55%",
    wants: "The team aerial shot Alex mentioned.",
  },
];
