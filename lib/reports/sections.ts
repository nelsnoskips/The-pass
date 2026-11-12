import type { Sql } from "postgres";
import { assertCan, type Tenant } from "../platform/tenant";
import { datesIn, type Periods, type Range } from "./period";
import { visitsCte } from "./overview";

/**
 * The detail behind the overview, one function per reporting tab.
 * Days with nothing on them are filled in as zero (a quiet Tuesday is
 * real), and every query is scoped to the tenant's org.
 */

const n = (v: unknown) => Number(v ?? 0);

/* ----------------------------------------------------------- bookings -- */

export interface DayCount { day: string; bookings: number; covers: number }

export const PARTY_BUCKETS = ["1", "2", "3", "4", "5", "6", "7", "8+"] as const;

export function partyBucket(size: number): (typeof PARTY_BUCKETS)[number] {
  return size >= 8 ? "8+" : (String(Math.max(1, size)) as (typeof PARTY_BUCKETS)[number]);
}

export interface BookingsReport {
  days: DayCount[];
  /** The previous period's days, same length, oldest first. */
  prevDays: DayCount[];
  total: { bookings: number; covers: number };
  prevTotal: { bookings: number; covers: number };
  bySource: { source: string; bookings: number; covers: number }[];
  byParty: { size: string; bookings: number }[];
  /** heat[dow][hour] = bookings starting then; dow 0 = Sunday. */
  heat: number[][];
  hours: number[];
}

async function bookingRows(sql: Sql, orgId: string, r: Range) {
  return sql<{ day: string; dow: number; hour: number; source: string; party_size: number; bookings: string; covers: string }[]>`
    select to_char((r.starts_at at time zone v.timezone)::date, 'YYYY-MM-DD') as day,
           extract(dow from r.starts_at at time zone v.timezone)::int as dow,
           extract(hour from r.starts_at at time zone v.timezone)::int as hour,
           r.source, r.party_size, count(*) as bookings, sum(r.party_size) as covers
    from reservations r join venues v on v.id = r.venue_id
    where r.org_id = ${orgId} and r.status <> 'cancelled'
      and (r.starts_at at time zone v.timezone)::date between ${r.since}::date and ${r.until}::date
    group by 1, 2, 3, 4, 5`;
}

function byDay(rows: { day: string; bookings: string; covers: string }[], r: Range): DayCount[] {
  const m = new Map<string, DayCount>(datesIn(r).map((d) => [d, { day: d, bookings: 0, covers: 0 }]));
  for (const x of rows) {
    const d = m.get(x.day);
    if (d) { d.bookings += n(x.bookings); d.covers += n(x.covers); }
  }
  return [...m.values()];
}

export async function bookingsReport(sql: Sql, t: Tenant, p: Periods): Promise<BookingsReport> {
  assertCan(t, "view");
  const [cur, prev] = await Promise.all([bookingRows(sql, t.orgId, p.cur), bookingRows(sql, t.orgId, p.prev)]);
  const days = byDay(cur, p.cur);
  const prevDays = byDay(prev, p.prev);
  const sum = (ds: DayCount[]) => ds.reduce((s, d) => ({ bookings: s.bookings + d.bookings, covers: s.covers + d.covers }), { bookings: 0, covers: 0 });

  const src = new Map<string, { bookings: number; covers: number }>();
  const party = new Map<string, number>(PARTY_BUCKETS.map((b) => [b, 0]));
  const heat = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const x of cur) {
    const s = src.get(x.source) ?? { bookings: 0, covers: 0 };
    s.bookings += n(x.bookings); s.covers += n(x.covers);
    src.set(x.source, s);
    const b = partyBucket(x.party_size);
    party.set(b, (party.get(b) ?? 0) + n(x.bookings));
    heat[x.dow][x.hour] += n(x.bookings);
  }
  // Only the hours anything happens in, so the grid isn't mostly night.
  const used = Array.from({ length: 24 }, (_, h) => h).filter((h) => heat.some((row) => row[h] > 0));
  const hours = used.length ? Array.from({ length: used[used.length - 1] - used[0] + 1 }, (_, i) => used[0] + i) : [];

  return {
    days, prevDays, total: sum(days), prevTotal: sum(prevDays),
    bySource: [...src.entries()].map(([source, v]) => ({ source, ...v })).sort((a, b) => b.bookings - a.bookings || a.source.localeCompare(b.source)),
    byParty: PARTY_BUCKETS.map((size) => ({ size, bookings: party.get(size) ?? 0 })),
    heat, hours,
  };
}

/* ------------------------------------------------------- online orders -- */

export interface SalesDay { day: string; orders: number; salesCents: number }

export interface OrdersReport {
  days: SalesDay[];
  prevDays: SalesDay[];
  total: { orders: number; salesCents: number };
  prevTotal: { orders: number; salesCents: number };
  byKind: { kind: "pickup" | "catering"; orders: number; salesCents: number }[];
  /** Paid online through The Pass vs paid at the counter. */
  byPayment: { paidOnlineCents: number; atPickupCents: number; paidOnline: number; atPickup: number };
  topItems: { name: string; qty: number; salesCents: number }[];
}

const LIVE_ORDER = (sql: Sql) => sql`o.status not in ('cancelled', 'awaiting_payment') and o.payment <> 'refunded'`;

async function orderRows(sql: Sql, orgId: string, r: Range) {
  return sql<{ day: string; kind: "pickup" | "catering"; payment: string; orders: string; sales: string }[]>`
    select to_char((o.created_at at time zone v.timezone)::date, 'YYYY-MM-DD') as day, o.kind, o.payment,
           count(*) as orders, sum(o.total_cents) as sales
    from orders o join venues v on v.id = o.venue_id
    where o.org_id = ${orgId} and ${LIVE_ORDER(sql)}
      and (o.created_at at time zone v.timezone)::date between ${r.since}::date and ${r.until}::date
    group by 1, 2, 3`;
}

function salesByDay(rows: { day: string; orders: string; sales: string }[], r: Range): SalesDay[] {
  const m = new Map<string, SalesDay>(datesIn(r).map((d) => [d, { day: d, orders: 0, salesCents: 0 }]));
  for (const x of rows) {
    const d = m.get(x.day);
    if (d) { d.orders += n(x.orders); d.salesCents += n(x.sales); }
  }
  return [...m.values()];
}

export async function ordersReport(sql: Sql, t: Tenant, p: Periods): Promise<OrdersReport> {
  assertCan(t, "view");
  const [cur, prev, items] = await Promise.all([
    orderRows(sql, t.orgId, p.cur),
    orderRows(sql, t.orgId, p.prev),
    sql<{ name: string; qty: string; sales: string }[]>`
      select coalesce(i->>'name', 'Item') as name, sum(coalesce((i->>'qty')::int, 0)) as qty, sum(coalesce((i->>'lineCents')::int, 0)) as sales
      from orders o join venues v on v.id = o.venue_id
      cross join lateral jsonb_array_elements(case when jsonb_typeof(o.items) = 'array' then o.items else '[]'::jsonb end) i
      where o.org_id = ${t.orgId} and ${LIVE_ORDER(sql)}
        and (o.created_at at time zone v.timezone)::date between ${p.cur.since}::date and ${p.cur.until}::date
      group by 1 order by 2 desc, 3 desc, 1 limit 10`,
  ]);
  const days = salesByDay(cur, p.cur);
  const prevDays = salesByDay(prev, p.prev);
  const sum = (ds: SalesDay[]) => ds.reduce((s, d) => ({ orders: s.orders + d.orders, salesCents: s.salesCents + d.salesCents }), { orders: 0, salesCents: 0 });
  const kind = (k: "pickup" | "catering") => cur.filter((x) => x.kind === k).reduce((s, x) => ({ kind: k, orders: s.orders + n(x.orders), salesCents: s.salesCents + n(x.sales) }), { kind: k, orders: 0, salesCents: 0 });
  const pay = cur.reduce((s, x) => {
    if (x.payment === "paid") { s.paidOnline += n(x.orders); s.paidOnlineCents += n(x.sales); }
    else if (x.payment === "at_pickup") { s.atPickup += n(x.orders); s.atPickupCents += n(x.sales); }
    return s;
  }, { paidOnlineCents: 0, atPickupCents: 0, paidOnline: 0, atPickup: 0 });
  return {
    days, prevDays, total: sum(days), prevTotal: sum(prevDays),
    byKind: [kind("pickup"), kind("catering")],
    byPayment: pay,
    topItems: items.map((i) => ({ name: i.name, qty: n(i.qty), salesCents: n(i.sales) })),
  };
}

/* -------------------------------------------------------------- guests -- */

export const VISIT_BUCKETS = [
  { label: "1 visit", min: 1, max: 1 },
  { label: "2 visits", min: 2, max: 2 },
  { label: "3–4 visits", min: 3, max: 4 },
  { label: "5–9 visits", min: 5, max: 9 },
  { label: "10+ visits", min: 10, max: Number.MAX_SAFE_INTEGER },
] as const;

export interface GuestsReport {
  /** Guests who visited in the period, split by whether it was their first time. */
  firstTime: number; returning: number;
  prevFirstTime: number; prevReturning: number;
  newGuests: number; prevNewGuests: number;
  /** All time, from each guest's visit count. */
  frequency: { label: string; guests: number }[];
  neverVisited: number;
  top: { id: string; name: string; visits: number; noShows: number; lastVisitAt: Date | null; spendCents: number | null }[];
}

async function visitorSplit(sql: Sql, orgId: string, tz: string, r: Range) {
  const [x] = await sql<{ visitors: string; returning: string; new_guests: string }[]>`
    with visits as (${visitsCte(sql, orgId)}),
         came as (select distinct guest_id from visits where (at at time zone ${tz})::date between ${r.since}::date and ${r.until}::date)
    select count(*) as visitors,
           count(*) filter (where exists (select 1 from visits b where b.guest_id = came.guest_id and (b.at at time zone ${tz})::date < ${r.since}::date)) as returning,
           (select count(*) from guests where org_id = ${orgId} and (created_at at time zone ${tz})::date between ${r.since}::date and ${r.until}::date) as new_guests
    from came`;
  return { firstTime: n(x.visitors) - n(x.returning), returning: n(x.returning), newGuests: n(x.new_guests) };
}

export async function guestsReport(sql: Sql, t: Tenant, p: Periods): Promise<GuestsReport> {
  assertCan(t, "view");
  const [cur, prev, freq, top] = await Promise.all([
    visitorSplit(sql, t.orgId, p.tz, p.cur),
    visitorSplit(sql, t.orgId, p.tz, p.prev),
    sql<{ visit_count: number; guests: string }[]>`
      select visit_count, count(*) as guests from guests where org_id = ${t.orgId} group by visit_count`,
    sql<{ id: string; name: string; visit_count: number; no_show_count: number; last_visit_at: Date | null; total_spend_cents: string }[]>`
      select id, name, visit_count, no_show_count, last_visit_at, total_spend_cents from guests
      where org_id = ${t.orgId} and visit_count > 0
      order by visit_count desc, last_visit_at desc nulls last, name limit 10`,
  ]);
  return {
    firstTime: cur.firstTime, returning: cur.returning, prevFirstTime: prev.firstTime, prevReturning: prev.returning,
    newGuests: cur.newGuests, prevNewGuests: prev.newGuests,
    frequency: VISIT_BUCKETS.map((b) => ({ label: b.label, guests: freq.filter((f) => f.visit_count >= b.min && f.visit_count <= b.max).reduce((s, f) => s + n(f.guests), 0) })),
    neverVisited: freq.filter((f) => f.visit_count <= 0).reduce((s, f) => s + n(f.guests), 0),
    top: top.map((g) => ({ id: g.id, name: g.name, visits: g.visit_count, noShows: g.no_show_count, lastVisitAt: g.last_visit_at, spendCents: n(g.total_spend_cents) || null })),
  };
}
