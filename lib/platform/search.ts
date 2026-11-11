import type { Sql } from "postgres";
import { assertCan, type Tenant } from "./tenant";

/**
 * One search box for the whole restaurant: guests, bookings, orders and
 * gift cards, scoped to the tenant's org like every other read.
 */

export interface SearchHit {
  kind: "guest" | "booking" | "order" | "gift_card";
  title: string;
  detail: string;
  href: string;
}

export async function searchEverything(sql: Sql, t: Tenant, org: string, raw: string, now = new Date()): Promise<SearchHit[]> {
  assertCan(t, "view");
  const q = raw.trim().slice(0, 60);
  if (q.length < 2) return [];
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const digits = q.replace(/\D/g, "");
  const phone = digits.length >= 4 ? `%${digits}%` : null;
  const num = /^#?\d{3,7}$/.test(q) ? Number(q.replace("#", "")) : null;
  const code = q.toUpperCase().replace(/[^A-Z0-9]/g, "");

  const [guests, bookings, orders, cards] = await Promise.all([
    sql<{ id: string; name: string; phone: string; visit_count: number }[]>`
      select id, name, phone, visit_count from guests
      where org_id = ${t.orgId} and (name ilike ${like} or email ilike ${like} or (${phone}::text is not null and phone like ${phone}))
      order by last_visit_at desc nulls last limit 5`,
    sql<{ id: string; name: string; party_size: number; starts_at: Date; tz: string; status: string }[]>`
      select r.id, g.name, r.party_size, r.starts_at, v.timezone as tz, r.status from reservations r
      join guests g on g.id = r.guest_id join venues v on v.id = r.venue_id
      where r.org_id = ${t.orgId} and r.starts_at > ${new Date(now.getTime() - 86_400_000)}
        and (g.name ilike ${like} or (${phone}::text is not null and g.phone like ${phone}))
      order by r.starts_at limit 5`,
    sql<{ id: string; number: number; name: string; status: string; total_cents: number }[]>`
      select id, number, name, status, total_cents from orders
      where org_id = ${t.orgId} and (name ilike ${like} or number = ${num ?? -1})
      order by created_at desc limit 5`,
    code.length >= 4
      ? sql<{ code: string; balance_cents: number; status: string }[]>`
          select code, balance_cents, status from gift_cards
          where org_id = ${t.orgId} and replace(code, '-', '') like ${`%${code}%`} limit 3`
      : Promise.resolve([] as { code: string; balance_cents: number; status: string }[]),
  ]);

  const money = (c: number) => `$${(c / 100).toFixed(2)}`;
  const when = (d: Date, tz: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz }).format(d);
  const ymd = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  return [
    ...guests.map((g): SearchHit => ({ kind: "guest", title: g.name, detail: `${g.phone.startsWith("+") ? g.phone : "no phone"} · ${g.visit_count} visit${g.visit_count === 1 ? "" : "s"}`, href: `/r/${org}/guests?q=${encodeURIComponent(g.name)}` })),
    ...bookings.map((b): SearchHit => ({ kind: "booking", title: `${b.name} ×${b.party_size}`, detail: `${when(b.starts_at, b.tz)} · ${b.status}`, href: `/r/${org}/host?date=${ymd(b.starts_at, b.tz)}` })),
    ...orders.map((o): SearchHit => ({ kind: "order", title: `Order #${o.number} · ${o.name}`, detail: `${money(o.total_cents)} · ${o.status.replace("_", " ")}`, href: `/r/${org}/orders` })),
    ...cards.map((c): SearchHit => ({ kind: "gift_card", title: `Gift card ${c.code}`, detail: `${money(c.balance_cents)} left · ${c.status}`, href: `/r/${org}/gift-cards?code=${encodeURIComponent(c.code)}` })),
  ];
}
