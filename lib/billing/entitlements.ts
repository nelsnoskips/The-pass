import type { Sql } from "postgres";
import { sendMail } from "../email";
import { log } from "../reservations/repo";
import { Forbidden, can, type Tenant } from "../platform/tenant";
import {
  DEFAULT_PLAN, FOUNDING_OFFER, PLANS, isPlanId,
  type Feature, type FeatureId, type PlanId, type StationId,
} from "./plans";

/**
 * What a restaurant's plan includes, enforced on the server.
 *
 * Pages for what isn't included show "Included in The Pass plan" (never
 * a 404); actions and jobs refuse with a plain reason (NotIncluded); the
 * scheduler skips stations that aren't in the plan; the chat isn't
 * offered tools for them. Changing plan never deletes anything: it hides
 * and stops, and upgrading turns it all back on.
 */

export type { Feature, FeatureId, PlanId, StationId } from "./plans";

export interface OrgPlan {
  plan: PlanId;
  founding: boolean;
  /** yyyy-mm-dd, the last day the founding price is locked. */
  foundingLockedUntil: string | null;
  locations: number;
  startedAt: Date | null;
  updatedBy: string | null;
  updatedAt: Date | null;
  /** No row yet: the default plan, until The Pass's team sets one. */
  isDefault: boolean;
}

/** The parts of the business, in plain words, for the "not in your plan" page and the billing page. */
export const FEATURE_INFO: Record<Feature, { label: string; does: string; area: "Dining room" | "Online" | "Marketing" | "Guests" | "Money" | "Station" }> = {
  ordering: { label: "Online ordering", area: "Online", does: "Pickup orders from your own website, paid online, with a kitchen board, pause, 86 and a text when it's ready. No marketplace commission." },
  catering: { label: "Catering orders", area: "Online", does: "Catering orders with notice, headcount and a minimum, on your own site." },
  promotions: { label: "Promotions", area: "Marketing", does: "Promo codes and automatic discounts on online orders, with what each one brought in." },
  campaigns: { label: "Text and email campaigns", area: "Marketing", does: "Campaigns to the guests who said yes, with consent, quiet hours and unsubscribe handled for you." },
  segments: { label: "Guest segments", area: "Marketing", does: "Saved groups of guests — lapsed regulars, big spenders, birthdays this month — to send to or export." },
  loyalty: { label: "Loyalty", area: "Guests", does: "Every few visits earns a reward, counted from bookings and your point of sale." },
  gift_cards: { label: "Gift cards", area: "Money", does: "Sold on your website, emailed as a code, spent across as many visits as it takes. No expiry, no fees." },
  reviews: { label: "Reviews", area: "Guests", does: "Your Google reviews in one place, with replies drafted in your voice." },
  ads: { label: "Ads reporting", area: "Marketing", does: "Google and Meta spend, results and cost per result beside your real bookings." },
  app: { label: "Your guest app", area: "Online", does: "Your own installable app on guests' home screens: book, order, rewards and gift cards." },
  financials: { label: "Financials", area: "Money", does: "Sales, deposits, gift cards and payouts in one place, with an export for your accountant." },
  reporting_full: { label: "Full reporting", area: "Marketing", does: "Orders, messages, marketing and ads reporting beside your bookings." },
  "station:reservations": { label: "Reservations station", area: "Station", does: "Spots quiet nights ahead and drafts a text to regulars who haven't been in. Every text waits for you." },
  "station:website": { label: "Website station", area: "Station", does: "Makes the change you describe to your site as a draft. Nothing goes live until you publish." },
  "station:reviews": { label: "Reviews station", area: "Station", does: "Drafts a reply to each new Google review in your voice. Replies post only after you approve." },
  "station:paid_ads": { label: "Paid ads station", area: "Station", does: "Reads your Google and Meta numbers weekly and proposes budget moves. Every change waits for you." },
};

export const stationFeature = (agentId: string): Feature | null =>
  (["reservations", "website", "reviews", "paid_ads"] as string[]).includes(agentId) ? (`station:${agentId}` as Feature) : null;

/** The chat's lever pillars that belong to a feature. Reservations and the website are in every plan. */
export const PILLAR_FEATURE: Record<string, FeatureId | undefined> = { ordering: "ordering", loyalty: "loyalty", app: "app" };

/** Does the plan include it? Takes a plan id or an org's plan. */
export function includes(plan: PlanId | OrgPlan, feature: Feature): boolean {
  const p = PLANS[typeof plan === "string" ? plan : plan.plan];
  if (feature.startsWith("station:")) return p.stations.includes(feature.slice(8) as StationId);
  return p.features.includes(feature as FeatureId);
}

/** The cheapest plan that includes a feature, for "Included in … plan". */
export function planIncluding(feature: Feature): PlanId {
  return includes("host", feature) ? "host" : "the_pass";
}

export function notIncludedReason(feature: Feature, plan: PlanId = "host"): string {
  return `${FEATURE_INFO[feature].label} comes with The Pass plan. This restaurant is on ${PLANS[plan].name}, so it's switched off — nothing has been deleted.`;
}

export class NotIncluded extends Error {
  constructor(public feature: Feature, plan: PlanId = "host") {
    super(notIncludedReason(feature, plan));
    this.name = "NotIncluded";
  }
}

export async function planFor(sql: Sql, orgId: string): Promise<OrgPlan> {
  const [row] = await sql<{ plan: string; founding: boolean; founding_locked_until: string | null; locations: number; started_at: Date; updated_by: string | null; updated_at: Date }[]>`
    select plan, founding, to_char(founding_locked_until, 'YYYY-MM-DD') as founding_locked_until, locations, started_at, updated_by, updated_at
    from org_plans where org_id = ${orgId}`;
  if (row && isPlanId(row.plan)) {
    return {
      plan: row.plan, founding: row.founding, foundingLockedUntil: row.founding_locked_until, locations: row.locations,
      startedAt: row.started_at, updatedBy: row.updated_by, updatedAt: row.updated_at, isDefault: false,
    };
  }
  // No row: the default plan, one location per venue.
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from venues where org_id = ${orgId}`;
  return { plan: DEFAULT_PLAN, founding: false, foundingLockedUntil: null, locations: Math.max(1, n), startedAt: null, updatedBy: null, updatedAt: null, isDefault: true };
}

export async function isIncluded(sql: Sql, orgId: string, feature: Feature): Promise<boolean> {
  return includes(await planFor(sql, orgId), feature);
}

/** Throws NotIncluded when the org's plan leaves the feature out. */
export async function assertIncluded(sql: Sql, orgId: string, feature: Feature): Promise<void> {
  const p = await planFor(sql, orgId);
  if (!includes(p, feature)) throw new NotIncluded(feature, p.plan);
}

/** The refusal in words, or null when included — for actions that return an error rather than throw. */
export async function planRefusal(sql: Sql, orgId: string, feature: Feature): Promise<string | null> {
  const p = await planFor(sql, orgId);
  return includes(p, feature) ? null : notIncludedReason(feature, p.plan);
}

/** Whether the founding price applies on a date (yyyy-mm-dd). */
export function foundingApplies(p: Pick<OrgPlan, "founding" | "foundingLockedUntil">, onDate: string): boolean {
  return p.founding && (!p.foundingLockedUntil || onDate <= p.foundingLockedUntil);
}

/* ------------------------------------------------------ changing it -- */

export interface PlanInput { plan: string; founding: boolean; foundingLockedUntil?: string | null; locations: number }

/**
 * Set an org's plan. Only The Pass's own staff can; owners ask with
 * requestPlanChange. Logged as plan.changed with before and after.
 * Moving to a plan without campaigns puts scheduled campaigns back to
 * drafts (logged), so nothing goes out later by surprise; nothing is deleted.
 */
export async function setPlan(sql: Sql, t: Tenant, input: PlanInput, now = new Date()): Promise<{ ok: true; changed: string[] } | { ok: false; error: string }> {
  if (t.role !== "staff") throw new Forbidden("manage_team");
  if (!isPlanId(input.plan)) return { ok: false, error: "Pick Host, The Pass or Group." };
  const locations = Math.floor(Number(input.locations));
  if (!Number.isFinite(locations) || locations < 1 || locations > 500) return { ok: false, error: "Locations must be between 1 and 500." };
  if (input.plan === "group" && locations < PLANS.group.minLocations) return { ok: false, error: `Group is for ${PLANS.group.minLocations} or more locations.` };
  let lock = input.foundingLockedUntil?.trim() || null;
  if (lock && !/^\d{4}-\d{2}-\d{2}$/.test(lock)) return { ok: false, error: "The founding lock date should look like 2028-11-30." };
  if (input.founding && !lock) {
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() + FOUNDING_OFFER.lockMonths);
    lock = d.toISOString().slice(0, 10);
  }
  if (!input.founding) lock = null;

  const before = await planFor(sql, t.orgId);
  const after = { plan: input.plan, founding: Boolean(input.founding), foundingLockedUntil: lock, locations };
  const changed = (["plan", "founding", "foundingLockedUntil", "locations"] as const).filter((k) => before.isDefault || before[k] !== after[k]);
  if (!changed.length) return { ok: true, changed: [] };

  await sql.begin(async (tx) => {
    await tx`
      insert into org_plans (org_id, plan, founding, founding_locked_until, locations, started_at, updated_by, updated_at)
      values (${t.orgId}, ${after.plan}, ${after.founding}, ${lock}, ${locations}, ${now}, ${t.actor}, ${now})
      on conflict (org_id) do update set plan = excluded.plan, founding = excluded.founding,
        founding_locked_until = excluded.founding_locked_until, locations = excluded.locations,
        started_at = case when org_plans.plan = excluded.plan then org_plans.started_at else excluded.started_at end,
        updated_by = excluded.updated_by, updated_at = excluded.updated_at`;
    const detail = Object.fromEntries(changed.map((k) => [k, { before: before.isDefault && k === "plan" ? `${before[k]} (default)` : before[k], after: after[k] }]));
    await log(tx as unknown as Sql, t.orgId, t.actor, "plan.changed", "org_plan", t.orgId, detail);
    if (!includes(after.plan, "campaigns")) {
      const held = await tx<{ id: string }[]>`
        update campaigns set status = 'draft', scheduled_for = null, scheduled_by = null, scheduled_role = null, updated_at = now()
        where org_id = ${t.orgId} and status = 'scheduled' returning id`;
      for (const c of held) await log(tx as unknown as Sql, t.orgId, t.actor, "campaign.unscheduled", "campaign", c.id, { reason: "The plan changed to one without campaigns." });
    }
    await tx`update plan_requests set status = 'done' where org_id = ${t.orgId} and status = 'open' and plan = ${after.plan}`;
  });
  return { ok: true, changed };
}

/**
 * "Talk to us about upgrading": records the request and tells the
 * founder. No payment, nothing switched on — a person follows up.
 * Owners and managers can ask; one open request per plan at a time.
 */
export async function requestPlanChange(
  sql: Sql, t: Tenant, input: { plan: string; feature?: string | null; note?: string }, notify: typeof sendMail = sendMail,
): Promise<{ ok: true; already: boolean } | { ok: false; error: string }> {
  if (!can(t, "manage_venue")) throw new Forbidden("manage_venue");
  if (!isPlanId(input.plan)) return { ok: false, error: "Pick a plan." };
  const feature = input.feature && input.feature in FEATURE_INFO ? input.feature : null;
  const [open] = await sql<{ id: string }[]>`
    select id from plan_requests where org_id = ${t.orgId} and plan = ${input.plan} and status = 'open' limit 1`;
  if (open) return { ok: true, already: true };
  const current = await planFor(sql, t.orgId);
  const note = String(input.note ?? "").trim().slice(0, 500);
  const [r] = await sql<{ id: string }[]>`
    insert into plan_requests (org_id, requested_by, plan, feature, note)
    values (${t.orgId}, ${t.actor}, ${input.plan}, ${feature}, ${note}) returning id`;
  await log(sql, t.orgId, t.actor, "plan.change_requested", "plan_request", r.id, { from: current.plan, to: input.plan, feature });
  const [org] = await sql<{ name: string; slug: string }[]>`select name, slug from orgs where id = ${t.orgId}`;
  await notify({
    subject: `Plan request: ${org?.name ?? "a restaurant"} wants ${PLANS[input.plan].name}`,
    text: [
      `${t.actor} at ${org?.name} (/r/${org?.slug}) asked to talk about moving from ${PLANS[current.plan].name} to ${PLANS[input.plan].name}.`,
      feature ? `They were looking at: ${FEATURE_INFO[feature as Feature].label}.` : "",
      note ? `Their note: ${note}` : "",
      `Nothing has changed yet. Set the plan on /r/${org?.slug}/settings/billing.`,
    ].filter(Boolean).join("\n\n"),
  }).catch(() => null);
  return { ok: true, already: false };
}
