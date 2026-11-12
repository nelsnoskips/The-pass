import type { Sql } from "postgres";
import { localDate } from "../reservations/time";
import { formatPhone } from "../sites/format";
import { assertCan, type Tenant } from "./tenant";
import { DEFAULT_TZ } from "./when";

/**
 * One search box for the whole restaurant: guests, bookings, orders and
 * gift cards, scoped to the tenant's org like every other read. Words a
 * host would type — "8pm", "tonight", "tomorrow 7:30", "fri" — find
 * bookings by their time in the restaurant's timezone.
 */

export interface SearchHit {
  kind: "guest" | "booking" | "order" | "gift_card";
  title: string;
  detail: string;
  href: string;
}

/** Status words as a host says them, not as the database stores them. */
export const STATUS_LABEL: Record<string, string> = {
  booked: "Booked", confirmed: "Confirmed", seated: "Seated", completed: "Finished", cancelled: "Cancelled", no_show: "No-show",
  awaiting_payment: "Waiting for payment", placed: "New", accepted: "Being made", ready: "Ready for pickup",
  active: "Active", pending: "Unpaid", void: "Void",
};
export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s.replace(/_/g, " ");

export interface BookingQuery {
  /** The venue-local date asked for, "yyyy-mm-dd", if any. */
  date: string | null;
  /** The venue-local time asked for, "HH:MM", if any. */
  time: string | null;
  /** Whatever's left: a name or phone digits. */
  rest: string;
}

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * Pull a day ("tonight", "today", "tomorrow", "fri") and a time ("8pm",
 * "8:30 pm", "20:00") out of a search, in the restaurant's timezone.
 */
export function parseBookingQuery(raw: string, now: Date, tz: string): BookingQuery {
  let s = ` ${raw.toLowerCase()} `;
  const today = localDate(now, tz);
  let date: string | null = null;
  let time: string | null = null;

  const take = (re: RegExp, f: (m: RegExpExecArray) => void) => {
    const m = re.exec(s);
    if (m) { f(m); s = s.slice(0, m.index) + " " + s.slice(m.index + m[0].length); }
  };
  take(/\s(tonight|today)\s/, () => { date = today; });
  take(/\s(tomorrow|tmrw|tmr)\s/, () => { date = addDays(today, 1); });
  if (!date) {
    take(/\s(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|nesday|sday|urday)?\s/, (m) => {
      const want = DAYS.indexOf(m[1].slice(0, 3));
      const dow = new Date(`${today}T12:00:00Z`).getUTCDay();
      date = addDays(today, (want - dow + 7) % 7);
    });
  }
  take(/\s(?:at\s+)?(\d{1,2})(?::([0-5]\d))?\s*(am|pm|a|p)\s/, (m) => {
    const h = Number(m[1]) % 12 + (m[3].startsWith("p") ? 12 : 0);
    if (Number(m[1]) >= 1 && Number(m[1]) <= 12) time = `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
  });
  if (!time) {
    take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\s/, (m) => { time = `${m[1].padStart(2, "0")}:${m[2]}`; });
  }
  const rest = s.replace(/\s(at|for|on)\s/g, " ").replace(/\s+/g, " ").trim();
  return { date, time, rest };
}

/** "20:00" ± minutes, clamped to the day, as "HH:MM" strings. */
function around(time: string, minutes: number): [string, string] {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m;
  const f = (x: number) => `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
  return [f(Math.max(0, t - minutes)), f(Math.min(23 * 60 + 59, t + minutes))];
}

export async function searchEverything(sql: Sql, t: Tenant, org: string, raw: string, now = new Date()): Promise<SearchHit[]> {
  assertCan(t, "view");
  const q = raw.trim().slice(0, 60);
  if (q.length < 2) return [];
  const [venue] = await sql<{ timezone: string }[]>`select timezone from venues where org_id = ${t.orgId} order by created_at limit 1`;
  const tz = venue?.timezone ?? DEFAULT_TZ;
  const bq = parseBookingQuery(q, now, tz);
  const byTime = bq.date !== null || bq.time !== null;
  // With a day or time in it, the rest of the search narrows bookings by name.
  const words = byTime ? bq.rest : q;
  const like = `%${words.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const digits = words.replace(/\D/g, "");
  const phone = digits.length >= 4 ? `%${digits}%` : null;
  const num = /^#?\d{3,7}$/.test(q) ? Number(q.replace("#", "")) : null;
  const code = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const [from, to] = bq.time ? around(bq.time, bq.time.endsWith(":00") ? 30 : 15) : ["00:00", "23:59"];
  const nameFilter = words ? sql`and (g.name ilike ${like} or (${phone}::text is not null and g.phone like ${phone}))` : sql``;

  const [guests, bookings, orders, cards] = await Promise.all([
    byTime ? Promise.resolve([] as { id: string; name: string; phone: string; visit_count: number }[]) : sql<{ id: string; name: string; phone: string; visit_count: number }[]>`
      select id, name, phone, visit_count from guests
      where org_id = ${t.orgId} and (name ilike ${like} or email ilike ${like} or (${phone}::text is not null and phone like ${phone}))
      order by last_visit_at desc nulls last limit 5`,
    sql<{ id: string; name: string; party_size: number; starts_at: Date; tz: string; status: string }[]>`
      select r.id, g.name, r.party_size, r.starts_at, v.timezone as tz, r.status from reservations r
      join guests g on g.id = r.guest_id join venues v on v.id = r.venue_id
      where r.org_id = ${t.orgId}
        ${byTime
          ? sql`and ${bq.date ? sql`(r.starts_at at time zone v.timezone)::date = ${bq.date}::date` : sql`r.starts_at > ${new Date(now.getTime() - 86_400_000)}`}
                and to_char(r.starts_at at time zone v.timezone, 'HH24:MI') between ${from} and ${to}
                ${nameFilter}`
          : sql`and r.starts_at > ${new Date(now.getTime() - 86_400_000)}
                and (g.name ilike ${like} or (${phone}::text is not null and g.phone like ${phone}))`}
      order by r.starts_at limit ${byTime ? 8 : 5}`,
    byTime ? Promise.resolve([] as { id: string; number: number; name: string; status: string; total_cents: number }[]) : sql<{ id: string; number: number; name: string; status: string; total_cents: number }[]>`
      select id, number, name, status, total_cents from orders
      where org_id = ${t.orgId} and (name ilike ${like} or number = ${num ?? -1})
      order by created_at desc limit 5`,
    code.length >= 4 && !byTime
      ? sql<{ code: string; balance_cents: number; status: string }[]>`
          select code, balance_cents, status from gift_cards
          where org_id = ${t.orgId} and replace(code, '-', '') like ${`%${code}%`} limit 3`
      : Promise.resolve([] as { code: string; balance_cents: number; status: string }[]),
  ]);

  const money = (c: number) => `$${(c / 100).toFixed(2)}`;
  const when = (d: Date, tz: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz }).format(d);
  return [
    ...guests.map((g): SearchHit => ({ kind: "guest", title: g.name, detail: `${g.phone.startsWith("+") ? formatPhone(g.phone) : "no phone"} · ${g.visit_count} visit${g.visit_count === 1 ? "" : "s"}`, href: `/r/${org}/guests/${g.id}` })),
    // The host stand opens on that day with this booking highlighted.
    ...bookings.map((b): SearchHit => ({ kind: "booking", title: `${b.name} ×${b.party_size}`, detail: `${when(b.starts_at, b.tz)} · ${statusLabel(b.status)}`, href: `/r/${org}/host?date=${localDate(b.starts_at, b.tz)}&highlight=${b.id}` })),
    ...orders.map((o): SearchHit => ({ kind: "order", title: `Order #${o.number} · ${o.name}`, detail: `${money(o.total_cents)} · ${statusLabel(o.status)}`, href: `/r/${org}/orders` })),
    ...cards.map((c): SearchHit => ({ kind: "gift_card", title: `Gift card ${c.code}`, detail: `${money(c.balance_cents)} left · ${statusLabel(c.status)}`, href: `/r/${org}/gift-cards?code=${encodeURIComponent(c.code)}` })),
  ];
}
