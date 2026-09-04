/**
 * Who Orravan is: the history, and the people.
 *
 * The milestones are the client's own, supplied 3 Sep 2026. Nothing
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
    id: "founded",
    lane: "company",
    at: 2014.58,
    stamp: "Aug 2014",
    exact: true,
    title: "Rigo Navarro Sr. founds Orravan",
    detail:
      "One tradesman, one truck, and a conviction that commercial mechanical work is a service business before it is a parts business.",
  },
  {
    id: "mechanical",
    lane: "sector",
    at: 2014.75,
    stamp: "2014",
    exact: false,
    title: "Mechanical sector launched",
    detail:
      "The founding discipline. Commercial mechanical work becomes the base every other capability is built on.",
  },
  {
    id: "truck-1",
    lane: "fleet",
    at: 2014.9,
    stamp: "2014",
    exact: false,
    title: "First truck",
    detail: "Rigo Sr.'s Mercedes Sprinter. The whole company fits in it.",
  },
  {
    id: "chiller",
    lane: "sector",
    at: 2015.37,
    stamp: "May 2015",
    exact: true,
    title: "Chiller mechanical",
    detail:
      "Central plant work joins the offer — the heaviest equipment in the building, and the least forgiving of guesswork.",
  },
  {
    id: "truck-2",
    lane: "fleet",
    at: 2015.7,
    stamp: "2015",
    exact: false,
    title: "Second truck",
    detail: "Rigo Jr.'s Sprinter. Two trucks, two generations.",
  },
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
    at: 2024.5,
    stamp: "2024",
    exact: false,
    title: "Fifty on the team",
    detail: "Headcount doubles in three years without the standard moving.",
    figure: "50",
  },
];

/** The axis runs a little either side of the real span — but only a
    little past the end, so the last milestone lands with runway to be
    read rather than arriving in the final few pixels of the scroll. */
export const SPAN = { from: 2014.2, to: 2024.75 } as const;

export const HISTORY = {
  eyebrow: "2014 — today",
  head: ["Ten years,", "one standard."],
  copy:
    "From one truck in 2014 to a union shop of fifty. Scroll it through, or jump straight to any year.",
} as const;

/* ------------------------------------------------------------- team --- */

/** True while the roster below is scaffolding rather than real staff. */
export const PLACEHOLDER = true;

export type Person = {
  id: string;
  name: string;
  role: string;
  /** Rendered in the portrait tile until headshots arrive. */
  initials: string;
  since?: string;
  bio: string;
  quote?: string;
  focus?: string[];
};

export type Department = {
  id: string;
  name: string;
  blurb: string;
  people: Person[];
};

const lorem =
  "Placeholder biography. Two or three sentences on what this person is responsible for, how long they have been at Orravan, and the kind of problem a client would call them about.";

export const LEADERSHIP: Person[] = [
  {
    id: "founder",
    name: "Rigo Navarro Sr.",
    role: "Founder",
    initials: "RN",
    since: "2014",
    bio: lorem,
    quote: "We started with one truck and the same standard we hold now.",
    focus: ["Mechanical", "Company"],
  },
  {
    id: "lead-2",
    name: "Name Surname",
    role: "President",
    initials: "NS",
    bio: lorem,
    focus: ["Operations"],
  },
  {
    id: "lead-3",
    name: "Name Surname",
    role: "Vice President",
    initials: "NS",
    bio: lorem,
    focus: ["Projects"],
  },
  {
    id: "lead-4",
    name: "Name Surname",
    role: "Director of Operations",
    initials: "NS",
    bio: lorem,
    focus: ["Service", "Dispatch"],
  },
];

export const DEPARTMENTS: Department[] = [
  {
    id: "mechanical",
    name: "Mechanical",
    blurb: "Retrofit, central plant and project delivery.",
    people: [
      { id: "m1", name: "Name Surname", role: "Mechanical Superintendent", initials: "NS", bio: lorem },
      { id: "m2", name: "Name Surname", role: "Project Manager", initials: "NS", bio: lorem },
      { id: "m3", name: "Name Surname", role: "Lead Pipefitter", initials: "NS", bio: lorem },
    ],
  },
  {
    id: "automation",
    name: "Automation & Controls",
    blurb: "DDC controls, integration, programming and support.",
    people: [
      { id: "a1", name: "Name Surname", role: "Controls Manager", initials: "NS", bio: lorem },
      { id: "a2", name: "Name Surname", role: "Systems Engineer", initials: "NS", bio: lorem },
      { id: "a3", name: "Name Surname", role: "Automation Technician", initials: "NS", bio: lorem },
    ],
  },
  {
    id: "service",
    name: "Service",
    blurb: "Maintenance, emergency response and the on-call rotation.",
    people: [
      { id: "s1", name: "Name Surname", role: "Service Manager", initials: "NS", bio: lorem },
      { id: "s2", name: "Name Surname", role: "Lead Service Technician", initials: "NS", bio: lorem },
      { id: "s3", name: "Name Surname", role: "Dispatcher", initials: "NS", bio: lorem },
    ],
  },
  {
    id: "operations",
    name: "Operations",
    blurb: "Estimating, purchasing, parts and the back office.",
    people: [
      { id: "o1", name: "Name Surname", role: "Estimator", initials: "NS", bio: lorem },
      { id: "o2", name: "Name Surname", role: "Parts Manager", initials: "NS", bio: lorem },
      { id: "o3", name: "Name Surname", role: "Office Manager", initials: "NS", bio: lorem },
    ],
  },
];

export const TEAM_PAGE = {
  eyebrow: "Who we are",
  head: ["The people", "behind the work."],
  copy:
    "Controls, mechanical, service and the office. Fifty people, one standard, and a name on every job.",
  orgHead: ["Meet", "the team."],
  orgCopy:
    "Leadership first, then the four groups that run the work. Open anyone to read what they do.",
  careersHead: ["Build what", "buildings become."],
  careersCopy:
    "We hire trained trades and keep them. If that is the kind of shop you want to work in, we would like to hear from you.",
  careersCta: "Explore careers",
} as const;
