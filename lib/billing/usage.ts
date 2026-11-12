import type { Sql } from "postgres";
import { DEFAULT_TZ } from "../platform/when";
import { localDate, zonedToUtc } from "../reservations/time";
import { foundingApplies, planFor, type OrgPlan } from "./entitlements";
import {
  AI_CENTS_PER_MTOK, ADDITIONAL_LOCATION_DISCOUNT_PCT, dollars, EMAIL_COST_CENTS_PER_1000, PLANS,
  planPriceCents, smsCostCents, textsIncluded, unitPriceCents,
} from "./plans";

/**
 * Usage for the current calendar month, in the restaurant's own
 * timezone: texts, emails and AI. Texts are what the allowance counts;
 * a dry-run text (no texting provider connected) never left the
 * building, so it is counted separately and never against the allowance.
 * AI usage and its estimated cost are for The Pass's own staff only.
 *
 * Nothing here blocks a send. Transactional texts (confirmations,
 * reminders, cancellations, ready texts, the waitlist) always go; a
 * marketing send over the allowance shows a warning and is billed at cost.
 */

export interface Month { start: Date; end: Date; label: string; tz: string; daysElapsed: number; daysInMonth: number; firstDay: string }

/** The calendar month containing `now`, in `tz`. */
export function monthIn(tz: string, now = new Date()): Month {
  const today = localDate(now, tz);
  const [y, m, d] = today.split("-").map(Number);
  const firstDay = `${y}-${String(m).padStart(2, "0")}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const start = zonedToUtc(firstDay, "00:00", tz);
  const end = zonedToUtc(next, "00:00", tz);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));
  return { start, end, label, tz, daysElapsed: d, daysInMonth, firstDay };
}

export interface Tokens { input: number; output: number; cacheRead: number }

export interface Usage {
  month: Month;
  texts: {
    /** Sent texts: what counts against the allowance. */
    sent: number; transactional: number; marketing: number;
    /** Recorded but not sent: texting isn't connected. */
    dryRun: number; failed: number;
  };
  emails: { sent: number; dryRun: number };
  ai: { runs: number; replies: number; stations: Tokens; chat: Tokens; total: Tokens };
}

export async function orgTz(sql: Sql, orgId: string): Promise<string> {
  const [v] = await sql<{ timezone: string }[]>`select timezone from venues where org_id = ${orgId} order by created_at limit 1`;
  return v?.timezone || DEFAULT_TZ;
}

const tokens = (r: { input: string | number | null; output: string | number | null; cache: string | number | null } | undefined): Tokens =>
  ({ input: Number(r?.input ?? 0), output: Number(r?.output ?? 0), cacheRead: Number(r?.cache ?? 0) });

export async function usageFor(sql: Sql, orgId: string, now = new Date()): Promise<Usage> {
  const month = monthIn(await orgTz(sql, orgId), now);
  const [[m], [runs], [chat]] = await Promise.all([
    sql<{ sent: number; tx: number; mk: number; dry: number; failed: number; email_sent: number; email_dry: number }[]>`
      select
        count(*) filter (where channel = 'sms' and status = 'sent')::int as sent,
        count(*) filter (where channel = 'sms' and status = 'sent' and kind = 'transactional')::int as tx,
        count(*) filter (where channel = 'sms' and status = 'sent' and kind = 'marketing')::int as mk,
        count(*) filter (where channel = 'sms' and status = 'dry_run')::int as dry,
        count(*) filter (where channel = 'sms' and status = 'failed')::int as failed,
        count(*) filter (where channel = 'email' and status = 'sent')::int as email_sent,
        count(*) filter (where channel = 'email' and status = 'dry_run')::int as email_dry
      from guest_messages where org_id = ${orgId} and created_at >= ${month.start} and created_at < ${month.end}`,
    sql<{ n: number; input: string; output: string; cache: string }[]>`
      select count(*)::int as n,
        coalesce(sum((usage->>'input_tokens')::bigint), 0) as input,
        coalesce(sum((usage->>'output_tokens')::bigint), 0) as output,
        coalesce(sum((usage->>'cache_read_input_tokens')::bigint), 0) as cache
      from agent_runs where org_id = ${orgId} and started_at >= ${month.start} and started_at < ${month.end}`,
    sql<{ n: number; input: string; output: string; cache: string }[]>`
      select count(*)::int as n,
        coalesce(sum((usage->>'input_tokens')::bigint), 0) as input,
        coalesce(sum((usage->>'output_tokens')::bigint), 0) as output,
        coalesce(sum((usage->>'cache_read_input_tokens')::bigint), 0) as cache
      from chat_messages where org_id = ${orgId} and role = 'assistant' and usage is not null
        and created_at >= ${month.start} and created_at < ${month.end}`,
  ]);
  const stations = tokens(runs);
  const chatT = tokens(chat);
  return {
    month,
    texts: { sent: m.sent, transactional: m.tx, marketing: m.mk, dryRun: m.dry, failed: m.failed },
    emails: { sent: m.email_sent, dryRun: m.email_dry },
    ai: {
      runs: runs.n, replies: chat.n, stations, chat: chatT,
      total: { input: stations.input + chatT.input, output: stations.output + chatT.output, cacheRead: stations.cacheRead + chatT.cacheRead },
    },
  };
}

/** Estimated AI cost in cents, from unverified per-token prices. Staff only. */
export function aiCostCents(t: Tokens): number {
  return Math.round((t.input * AI_CENTS_PER_MTOK.input + t.output * AI_CENTS_PER_MTOK.output + t.cacheRead * AI_CENTS_PER_MTOK.cacheRead) / 1_000_000);
}

export const emailCostCents = (n: number) => Math.round((n * EMAIL_COST_CENTS_PER_1000) / 1000);

/** Texts over the allowance and what they cost at cost. */
export function overage(sent: number, included: number): { over: number; cents: number } {
  const over = Math.max(0, sent - included);
  return { over, cents: smsCostCents(over) };
}

/** Straight-line projection of this month's texts to month end. */
export function projectTexts(sent: number, month: Pick<Month, "daysElapsed" | "daysInMonth">): number {
  if (month.daysElapsed <= 0) return sent;
  return Math.round((sent * month.daysInMonth) / month.daysElapsed);
}

/* ------------------------------------------- the marketing warning -- */

export interface OverageWarning { recipients: number; used: number; included: number; over: number; cents: number; text: string }

/**
 * Before a marketing send: would it take the month over the allowance?
 * A warning only — the send is allowed, and the texts over are billed at
 * cost. null when it stays inside the allowance. Transactional texts
 * never come through here.
 */
export function marketingWarning(recipients: number, used: number, included: number): OverageWarning | null {
  const before = Math.max(0, used - included);
  const after = Math.max(0, used + recipients - included);
  const over = after - before;
  if (over <= 0) return null;
  const cents = smsCostCents(over);
  const fmt = (n: number) => n.toLocaleString("en-US");
  const money = `$${(cents / 100).toFixed(2)}`;
  const text = before > 0
    ? `You're already past your ${fmt(included)} included texts this month. These ${fmt(over)} would be billed at cost — about ${money}.`
    : `~${fmt(over)} texts over your ${fmt(included)} — about ${money} at cost.`;
  return { recipients, used, included, over, cents, text };
}

/** The warning for an org right now, given how many it's about to text. */
export async function marketingWarningFor(sql: Sql, orgId: string, recipients: number, now = new Date()): Promise<OverageWarning | null> {
  const [plan, usage] = await Promise.all([planFor(sql, orgId), usageFor(sql, orgId, now)]);
  return marketingWarning(recipients, usage.texts.sent, textsIncluded(plan.plan, plan.locations));
}

/* ------------------------------------------------ invoice preview -- */

export interface InvoiceLine { label: string; detail?: string; cents: number | null }

export interface InvoicePreview {
  month: string;
  lines: InvoiceLine[];
  totalCents: number;
  /** The unit price used, and whether it was the founding price. */
  unitCents: number; founding: boolean;
  textsIncluded: number;
}

/**
 * What this month's invoice would say if billing were switched on: the
 * plan for each location, the additional-location discount, texts over
 * the allowance at cost, and card processing (Stripe's, not ours).
 * `texts` is how many count: what's been sent so far, or a projection.
 */
export function invoicePreview(plan: Pick<OrgPlan, "plan" | "founding" | "foundingLockedUntil" | "locations">, texts: number, month: Pick<Month, "label" | "firstDay">): InvoicePreview {
  const founding = foundingApplies(plan, month.firstDay);
  const unit = unitPriceCents(plan.plan, founding);
  const price = planPriceCents(plan.plan, plan.locations, founding);
  const included = textsIncluded(plan.plan, plan.locations);
  const o = overage(texts, included);
  const n = plan.locations;
  const lines: InvoiceLine[] = [
    { label: `${PLANS[plan.plan].name} plan × ${n} location${n === 1 ? "" : "s"}`, detail: `${founding ? "founding price " : ""}${dollars(unit)} a location`, cents: price.grossCents },
  ];
  if (n > 1) lines.push({ label: "Additional-location discount", detail: `${ADDITIONAL_LOCATION_DISCOUNT_PCT}% off ${n - 1} location${n - 1 === 1 ? "" : "s"}`, cents: -price.discountCents });
  lines.push({ label: "Texts over the allowance, at cost", detail: `${o.over.toLocaleString("en-US")} of ${texts.toLocaleString("en-US")} (${included.toLocaleString("en-US")} included)`, cents: o.cents });
  lines.push({ label: "Card processing", detail: "Passed through by Stripe — not billed by The Pass", cents: null });
  return { month: month.label, lines, totalCents: price.netCents + o.cents, unitCents: unit, founding, textsIncluded: included };
}
