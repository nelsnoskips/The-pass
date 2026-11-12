import type { Sql } from "postgres";
import { planRefusal } from "../billing/entitlements";
import { consentFilter } from "../platform/audiences";
import { assertCan, type Tenant } from "../platform/tenant";
import { log } from "../reservations/repo";

/**
 * Segments: saved guest audiences, built from what the restaurant
 * already knows — visits, no-shows, consent, loyalty, online orders.
 *
 * A segment is a set of rules, all of which must hold (AND). Members
 * are worked out live from the guest list every time, so a segment
 * never goes stale. The same rules produce the SQL and the plain-English
 * description, so what the owner reads is what the query does.
 */

export interface SegmentRules {
  /** Visited at least N times. */
  minVisits?: number;
  /** Has visited, but not in the last N days. */
  lapsedDays?: number;
  /** Last visit within the last N days. */
  visitedWithinDays?: number;
  /** No completed visit on record. */
  neverVisited?: boolean;
  /** Never made a reservation. */
  neverBooked?: boolean;
  /** At least N no-shows. */
  minNoShows?: number;
  /** First seen within the last N days. */
  joinedWithinDays?: number;
  smsConsent?: boolean;
  emailConsent?: boolean;
  /** Has a loyalty reward earned and not yet used. */
  openReward?: boolean;
  /** At least one online order (not cancelled, not unpaid). */
  orderedOnline?: boolean;
  /** Spent at least this much on online orders, in cents. */
  minOnlineSpendCents?: number;
}

export interface Segment {
  /** A built-in key ("regulars") or a segments.id. */
  id: string;
  name: string;
  rules: SegmentRules;
  builtin: boolean;
  createdBy: string | null;
  createdAt: Date | null;
}

const builtin = (id: string, name: string, rules: SegmentRules): Segment => ({ id, name, rules, builtin: true, createdBy: null, createdAt: null });

export const BUILTIN_SEGMENTS: Segment[] = [
  builtin("regulars", "Regulars", { minVisits: 3 }),
  builtin("lapsed", "Lapsed 45+ days", { minVisits: 2, lapsedDays: 45 }),
  builtin("new", "New this month", { joinedWithinDays: 30 }),
  builtin("textable", "Text-able", { smsConsent: true }),
  builtin("emailable", "Email-able", { emailConsent: true }),
  builtin("vip", "VIP", { minVisits: 10 }),
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 86_400_000;

/* ------------------------------------------------------- describing -- */

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const dollars = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: c % 100 ? 2 : 0, minimumFractionDigits: c % 100 ? 2 : 0 })}`;

/** "Guests who have visited at least 3 times and can get texts." */
export function describeRules(r: SegmentRules): string {
  const parts: string[] = [];
  if (r.neverVisited) parts.push("have never visited");
  if (r.minVisits) parts.push(`have visited at least ${plural(r.minVisits, "time")}`);
  if (r.lapsedDays) parts.push(`haven't visited in ${plural(r.lapsedDays, "day")}`);
  if (r.visitedWithinDays) parts.push(`visited in the last ${plural(r.visitedWithinDays, "day")}`);
  if (r.joinedWithinDays) parts.push(`were first seen in the last ${plural(r.joinedWithinDays, "day")}`);
  if (r.neverBooked) parts.push("have never made a reservation");
  if (r.minNoShows) parts.push(`have ${r.minNoShows === 1 ? "at least one no-show" : `at least ${r.minNoShows} no-shows`}`);
  if (r.openReward) parts.push("have a loyalty reward waiting");
  if (r.orderedOnline) parts.push("have ordered online");
  if (r.minOnlineSpendCents) parts.push(`have spent ${dollars(r.minOnlineSpendCents)} or more online`);
  if (r.smsConsent) parts.push("can get texts");
  if (r.emailConsent) parts.push("can get emails");
  if (parts.length === 0) return "Every guest.";
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
  return `Guests who ${list}.`;
}

/* ---------------------------------------------------------- parsing -- */

const INT_RULES: { key: keyof SegmentRules; label: string; min: number; max: number }[] = [
  { key: "minVisits", label: "Visits", min: 1, max: 1000 },
  { key: "lapsedDays", label: "Days since last visit", min: 1, max: 3650 },
  { key: "visitedWithinDays", label: "Visited within", min: 1, max: 3650 },
  { key: "joinedWithinDays", label: "First seen within", min: 1, max: 3650 },
  { key: "minNoShows", label: "No-shows", min: 1, max: 100 },
];
const BOOL_RULES: (keyof SegmentRules)[] = ["neverVisited", "neverBooked", "smsConsent", "emailConsent", "openReward", "orderedOnline"];

/**
 * Rules from loose input (a form, stored JSON, a model). Unknown keys are
 * dropped; numbers must be whole and in range; at least one rule.
 */
export function parseRules(input: Record<string, unknown>): { ok: true; rules: SegmentRules } | { ok: false; error: string } {
  const rules: SegmentRules = {};
  for (const r of INT_RULES) {
    const raw = input[r.key];
    if (raw === undefined || raw === null || raw === "" || raw === false) continue;
    const n = Number(String(raw).trim());
    if (!Number.isInteger(n) || n < r.min || n > r.max) return { ok: false, error: `${r.label} must be a whole number from ${r.min} to ${r.max}.` };
    (rules[r.key] as number) = n;
  }
  for (const k of BOOL_RULES) {
    const v = input[k];
    if (v === true || v === "on" || v === "true" || v === "1") (rules[k] as boolean) = true;
  }
  const spend = input.minOnlineSpendCents ?? (input.minOnlineSpend !== undefined && input.minOnlineSpend !== "" ? Math.round(Number(String(input.minOnlineSpend).replace(/[$,\s]/g, "")) * 100) : undefined);
  if (spend !== undefined && spend !== null && spend !== "") {
    const c = Number(spend);
    if (!Number.isInteger(c) || c < 1 || c > 100_000_000) return { ok: false, error: "Online spend must be an amount in dollars." };
    rules.minOnlineSpendCents = c;
  }
  if (Object.keys(rules).length === 0) return { ok: false, error: "Pick at least one rule." };
  if (rules.neverVisited && (rules.minVisits || rules.lapsedDays || rules.visitedWithinDays)) {
    return { ok: false, error: "“Never visited” can't be combined with visit counts or visit dates." };
  }
  if (rules.lapsedDays && rules.visitedWithinDays && rules.visitedWithinDays <= rules.lapsedDays) {
    return { ok: false, error: "“Visited within” must be longer than “not visited in”, or nobody matches." };
  }
  return { ok: true, rules };
}

/* -------------------------------------------------------------- SQL -- */

/** The rules as a SQL condition on a guest row aliased `g`. */
export function rulesWhere(sql: Sql, r: SegmentRules, now: Date) {
  const ago = (days: number) => new Date(now.getTime() - days * DAY);
  const paidOrder = sql`o.guest_id = g.id and o.org_id = g.org_id and o.status not in ('cancelled', 'awaiting_payment')`;
  const parts = [
    r.minVisits ? sql`and g.visit_count >= ${r.minVisits}` : null,
    r.lapsedDays ? sql`and g.last_visit_at is not null and g.last_visit_at < ${ago(r.lapsedDays)}` : null,
    r.visitedWithinDays ? sql`and g.last_visit_at >= ${ago(r.visitedWithinDays)}` : null,
    r.neverVisited ? sql`and g.visit_count = 0 and g.last_visit_at is null` : null,
    r.joinedWithinDays ? sql`and g.created_at >= ${ago(r.joinedWithinDays)}` : null,
    r.neverBooked ? sql`and not exists (select 1 from reservations rv where rv.guest_id = g.id and rv.org_id = g.org_id)` : null,
    r.minNoShows ? sql`and g.no_show_count >= ${r.minNoShows}` : null,
    r.smsConsent ? sql`and ${consentFilter(sql, "sms")}` : null,
    r.emailConsent ? sql`and ${consentFilter(sql, "email")}` : null,
    r.openReward ? sql`and exists (select 1 from loyalty_rewards lr where lr.guest_id = g.id and lr.org_id = g.org_id and lr.redeemed_at is null)` : null,
    r.orderedOnline ? sql`and exists (select 1 from orders o where ${paidOrder})` : null,
    r.minOnlineSpendCents ? sql`and (select coalesce(sum(o.total_cents), 0) from orders o where ${paidOrder}) >= ${r.minOnlineSpendCents}` : null,
  ].filter((p) => p !== null);
  return parts.reduce((acc, p) => sql`${acc} ${p}`, sql``);
}

/* ------------------------------------------------------------- reads -- */

type SegmentRow = { id: string; name: string; rules: SegmentRules; created_by: string; created_at: Date };
const fromRow = (r: SegmentRow): Segment => ({ id: r.id, name: r.name, rules: r.rules, builtin: false, createdBy: r.created_by, createdAt: r.created_at });

export async function listSegments(sql: Sql, t: Tenant): Promise<Segment[]> {
  assertCan(t, "view");
  const rows = await sql<SegmentRow[]>`
    select id, name, rules, created_by, created_at from segments where org_id = ${t.orgId} order by created_at desc limit 200`;
  return [...BUILTIN_SEGMENTS, ...rows.map(fromRow)];
}

export async function getSegment(sql: Sql, t: Tenant, id: string): Promise<Segment | null> {
  assertCan(t, "view");
  const b = BUILTIN_SEGMENTS.find((s) => s.id === id);
  if (b) return b;
  if (!UUID.test(id)) return null;
  const [r] = await sql<SegmentRow[]>`select id, name, rules, created_by, created_at from segments where id = ${id} and org_id = ${t.orgId}`;
  return r ? fromRow(r) : null;
}

export async function segmentCount(sql: Sql, t: Tenant, rules: SegmentRules, now = new Date()): Promise<number> {
  assertCan(t, "view");
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from guests g where g.org_id = ${t.orgId} ${rulesWhere(sql, rules, now)}`;
  return n;
}

/** Members, and how many of them have consent for texts and for email. */
export async function segmentCounts(sql: Sql, t: Tenant, rules: SegmentRules, now = new Date()): Promise<{ members: number; sms: number; email: number }> {
  assertCan(t, "view");
  const [r] = await sql<{ members: number; sms: number; email: number }[]>`
    select count(*)::int as members,
           count(*) filter (where ${consentFilter(sql, "sms")})::int as sms,
           count(*) filter (where ${consentFilter(sql, "email")})::int as email
    from guests g where g.org_id = ${t.orgId} ${rulesWhere(sql, rules, now)}`;
  return r;
}

export async function segmentMemberIds(sql: Sql, t: Tenant, rules: SegmentRules, now = new Date()): Promise<string[]> {
  assertCan(t, "view");
  const rows = await sql<{ id: string }[]>`
    select g.id from guests g where g.org_id = ${t.orgId} ${rulesWhere(sql, rules, now)}
    order by g.visit_count desc, g.created_at limit 20000`;
  return rows.map((r) => r.id);
}

export interface MemberRow {
  id: string; name: string; phone: string; email: string | null; visit_count: number; no_show_count: number;
  last_visit_at: Date | null; created_at: Date; online_cents: number;
  sms_ok: boolean; email_ok: boolean;
}

export async function segmentMembers(
  sql: Sql, t: Tenant, rules: SegmentRules, opts: { page?: number; pageSize?: number } = {}, now = new Date(),
): Promise<MemberRow[]> {
  assertCan(t, "view");
  const size = Math.min(Math.max(opts.pageSize ?? 50, 1), 10_000);
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  return sql<MemberRow[]>`
    select g.id, g.name, g.phone, g.email, g.visit_count, g.no_show_count, g.last_visit_at, g.created_at,
           (select coalesce(sum(o.total_cents), 0)::int from orders o
             where o.guest_id = g.id and o.org_id = g.org_id and o.status not in ('cancelled', 'awaiting_payment')) as online_cents,
           (${consentFilter(sql, "sms")}) as sms_ok,
           coalesce((${consentFilter(sql, "email")}), false) as email_ok
    from guests g where g.org_id = ${t.orgId} ${rulesWhere(sql, rules, now)}
    order by g.visit_count desc, g.last_visit_at desc nulls last, g.created_at desc
    limit ${size} offset ${(page - 1) * size}`;
}

/* ------------------------------------------------------------ writes -- */

export async function createSegment(
  sql: Sql, t: Tenant, name: string, input: Record<string, unknown>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  assertCan(t, "message_guests");
  const refused = await planRefusal(sql, t.orgId, "segments");
  if (refused) return { ok: false, error: refused };
  const n = name.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!n) return { ok: false, error: "Give the segment a name." };
  const parsed = parseRules(input);
  if (!parsed.ok) return parsed;
  const [s] = await sql<{ id: string }[]>`
    insert into segments (org_id, name, rules, created_by) values (${t.orgId}, ${n}, ${sql.json(parsed.rules as never)}, ${t.actor}) returning id`;
  await log(sql, t.orgId, t.actor, "segment.created", "segment", s.id, { name: n, rules: parsed.rules });
  return { ok: true, id: s.id };
}

export async function deleteSegment(sql: Sql, t: Tenant, id: string): Promise<boolean> {
  assertCan(t, "message_guests");
  if (!UUID.test(id)) return false;
  const rows = await sql<{ name: string }[]>`delete from segments where id = ${id} and org_id = ${t.orgId} returning name`;
  if (!rows.length) return false;
  await log(sql, t.orgId, t.actor, "segment.deleted", "segment", id, { name: rows[0].name });
  return true;
}
