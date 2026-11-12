/**
 * The plans, and every number billing uses, in one place.
 *
 * EVERY PRICE AND COST HERE IS A HYPOTHESIS, not a settled price list:
 * see docs/company/04-pricing-and-unit-economics.md §1. Change a number
 * here and the pricing page, the billing page, the invoice preview and
 * the campaign overage warning all follow.
 *
 * Money is integer cents. Costs that are fractions of a cent (a text,
 * a token) are stored per 1,000 or per million, so the arithmetic stays
 * in integers until the final rounding.
 *
 * The Pass is one agent. Plans differ only by which stations it runs
 * and which parts of the business it covers — never by selling agents
 * or stations one at a time (docs/company/08-positioning-the-one-agent.md).
 */

export type PlanId = "host" | "the_pass" | "group";

/** Restaurants set up before plans existed have no plan row: they get this. */
export const DEFAULT_PLAN: PlanId = "the_pass";

/** The parts of the business a plan can leave out. Reservations, the host
 *  stand, the guest list, the website and Ask The Pass are in every plan. */
export const FEATURES = [
  "ordering", "catering", "promotions", "campaigns", "segments", "loyalty",
  "gift_cards", "reviews", "ads", "app", "financials", "reporting_full",
] as const;
export type FeatureId = (typeof FEATURES)[number];

/** The stations of The Pass (runtime agent ids). */
export const STATIONS = ["reservations", "website", "reviews", "paid_ads"] as const;
export type StationId = (typeof STATIONS)[number];

export type Feature = FeatureId | `station:${StationId}`;

export interface Plan {
  id: PlanId;
  name: string;
  /** One line, plain English. */
  tagline: string;
  /** List price per location per month, cents. Hypothesis. */
  listCents: number;
  /** Founding price per location per month, cents. Hypothesis. */
  foundingCents: number;
  /** Texts included per location per month. Hypothesis. */
  textsIncluded: number;
  /** Fewest locations the plan is for (Group). */
  minLocations: number;
  features: readonly FeatureId[];
  stations: readonly StationId[];
}

const EVERYTHING = FEATURES;

export const PLANS: Record<PlanId, Plan> = {
  host: {
    id: "host", name: "Host",
    tagline: "The dining room: reservations, the host stand, your guest list and your website.",
    listCents: 19_900, foundingCents: 14_900, textsIncluded: 500, minLocations: 1,
    features: [], stations: ["reservations", "website"],
  },
  the_pass: {
    id: "the_pass", name: "The Pass",
    tagline: "Everything: the dining room plus online orders, marketing, loyalty, reviews, ads and your app.",
    listCents: 59_900, foundingCents: 44_900, textsIncluded: 2_000, minLocations: 1,
    features: EVERYTHING, stations: STATIONS,
  },
  group: {
    id: "group", name: "Group",
    tagline: "The Pass for groups of 5 or more locations. Group-level reporting is coming.",
    listCents: 59_900, foundingCents: 44_900, textsIncluded: 2_000, minLocations: 5,
    features: EVERYTHING, stations: STATIONS,
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
export const isPlanId = (x: unknown): x is PlanId => typeof x === "string" && x in PLANS;

/** Every location after the first is this much off. Hypothesis. */
export const ADDITIONAL_LOCATION_DISCOUNT_PCT = 20;

/** The founding offer: the first 50 restaurants, price locked 24 months. */
export const FOUNDING_OFFER = { restaurants: 50, lockMonths: 24 };

/**
 * What a text costs us beyond the allowance, billed at cost. ESTIMATE:
 * Twilio US long code ~$0.0083 + carrier fee ~$0.0035–0.005 ≈ $0.012–0.013
 * per segment (docs/company/04 §3). Cents per 1,000 texts: 1,300 = $0.013 each.
 */
export const SMS_COST_CENTS_PER_1000 = 1_300;

/** Email cost, for The Pass's staff only. ASSUMPTION, not sourced: ~$1 per 1,000. */
export const EMAIL_COST_CENTS_PER_1000 = 100;

/**
 * AI model prices, cents per million tokens, for The Pass's staff only.
 * UNVERIFIED PLACEHOLDERS from docs/company/04 §3 (Opus 5.5 $4 in / $20
 * out; cache reads assumed at a tenth of input). Check the provider's
 * pricing page before relying on these.
 */
export const AI_CENTS_PER_MTOK = { input: 400, output: 2_000, cacheRead: 40 } as const;

/** The fee promises, in the words the pricing and billing pages use. */
export const FEE_PROMISES = [
  { t: "No per-cover fees", d: "A full Saturday costs the same as a quiet Tuesday." },
  { t: "No per-order or guest fees", d: "Nothing added to your guests' bills, nothing taken from your orders." },
  { t: "No cut of deposits or ad spend", d: "Deposits, gift cards and orders are yours. Ad money goes to Google and Meta, not us." },
  { t: "Card processing at cost", d: "Stripe's own rate, passed straight through. We add nothing." },
  { t: "Texts beyond your allowance at cost", d: "No markup, and no cap: confirmations and reminders always go out." },
  { t: "Month to month", d: "No annual contract and no cancellation fee. Export everything, any time." },
] as const;

/* ------------------------------------------------------------ math -- */

/** Per-location monthly price for a plan, founding or list. */
export function unitPriceCents(plan: PlanId, founding: boolean): number {
  const p = PLANS[plan];
  return founding ? p.foundingCents : p.listCents;
}

/** The monthly plan price for `locations` locations, with the discount on every one after the first. */
export function planPriceCents(plan: PlanId, locations: number, founding: boolean): { grossCents: number; discountCents: number; netCents: number } {
  const n = Math.max(1, Math.floor(locations));
  const unit = unitPriceCents(plan, founding);
  const grossCents = unit * n;
  const discountCents = (n - 1) * Math.round((unit * ADDITIONAL_LOCATION_DISCOUNT_PCT) / 100);
  return { grossCents, discountCents, netCents: grossCents - discountCents };
}

/** Texts included for the whole group in a month. */
export const textsIncluded = (plan: PlanId, locations: number) => PLANS[plan].textsIncluded * Math.max(1, Math.floor(locations));

/** Cost of `texts` texts at cost, rounded to the cent. */
export const smsCostCents = (texts: number) => Math.round((Math.max(0, texts) * SMS_COST_CENTS_PER_1000) / 1000);

/** "$3.12", "$599", "$1,140". Cents in, dollars out. */
export function dollars(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const s = `$${(abs / 100).toLocaleString("en-US", { minimumFractionDigits: abs % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
  return neg ? `−${s}` : s;
}
