import type { Sql } from "postgres";
import { assertCan, type Tenant } from "../platform/tenant";
import { share, type Periods, type Range } from "./period";
import type { Unit } from "./format";

/**
 * The reporting overview: the handful of numbers an owner asks about,
 * this period beside the one before, each with one plain sentence saying
 * exactly what is counted. A number for something the restaurant hasn't
 * set up (no online ordering, no loyalty, no gift cards) is null and
 * shows as —, not 0.
 */

export interface Metric {
  key: string;
  label: string;
  unit: Unit;
  definition: string;
  cur: number | null;
  prev: number | null;
  /** Whether up is good (no-shows: it isn't). */
  upIsGood: boolean;
}

export interface Raw {
  bookings: number; covers: number; noShows: number; settled: number;
  orders: number; salesCents: number;
  newGuests: number; visitors: number; returning: number;
  messages: number;
  rewardsEarned: number; rewardsRedeemed: number;
  giftSoldCents: number; giftSold: number; giftRedeemedCents: number;
}

export interface Available { ordering: boolean; loyalty: boolean; giftCards: boolean }

const n = (v: unknown) => Number(v ?? 0);

/** Every visit we know of: bookings that were seated, and matched checks. */
export function visitsCte(sql: Sql, orgId: string) {
  return sql`
    select r.guest_id, r.starts_at as at from reservations r
      where r.org_id = ${orgId} and r.status in ('seated', 'completed')
    union all
    select c.guest_id, c.closed_at as at from guest_checks c
      where c.org_id = ${orgId} and c.guest_id is not null`;
}

export async function rawFor(sql: Sql, orgId: string, tz: string, r: Range): Promise<Raw> {
  const [[res], [ord], [gst], [vis], [msg], [loy], [gift]] = await Promise.all([
    sql`select count(*) filter (where r.status <> 'cancelled') as bookings,
               coalesce(sum(r.party_size) filter (where r.status in ('seated', 'completed')), 0) as covers,
               count(*) filter (where r.status = 'no_show') as no_shows,
               count(*) filter (where r.status in ('seated', 'completed', 'no_show') and r.source <> 'walk_in') as settled
        from reservations r join venues v on v.id = r.venue_id
        where r.org_id = ${orgId} and (r.starts_at at time zone v.timezone)::date between ${r.since}::date and ${r.until}::date`,
    sql`select count(*) as orders, coalesce(sum(o.total_cents), 0) as sales
        from orders o join venues v on v.id = o.venue_id
        where o.org_id = ${orgId} and o.status not in ('cancelled', 'awaiting_payment') and o.payment <> 'refunded'
          and (o.created_at at time zone v.timezone)::date between ${r.since}::date and ${r.until}::date`,
    sql`select count(*) as n from guests
        where org_id = ${orgId} and (created_at at time zone ${tz})::date between ${r.since}::date and ${r.until}::date`,
    sql`with visits as (${visitsCte(sql, orgId)}),
             came as (select distinct guest_id from visits where (at at time zone ${tz})::date between ${r.since}::date and ${r.until}::date)
        select count(*) as visitors,
               count(*) filter (where exists (select 1 from visits b where b.guest_id = came.guest_id and (b.at at time zone ${tz})::date < ${r.since}::date)) as returning
        from came`,
    sql`select count(*) as n from guest_messages
        where org_id = ${orgId} and status = 'sent' and (created_at at time zone ${tz})::date between ${r.since}::date and ${r.until}::date`,
    sql`select count(*) filter (where (earned_at at time zone ${tz})::date between ${r.since}::date and ${r.until}::date) as earned,
               count(*) filter (where (redeemed_at at time zone ${tz})::date between ${r.since}::date and ${r.until}::date) as redeemed
        from loyalty_rewards where org_id = ${orgId}`,
    sql`select
          (select count(*) from gift_cards where org_id = ${orgId} and status <> 'void'
             and (activated_at at time zone ${tz})::date between ${r.since}::date and ${r.until}::date) as sold,
          (select coalesce(sum(initial_cents), 0) from gift_cards where org_id = ${orgId} and status <> 'void'
             and (activated_at at time zone ${tz})::date between ${r.since}::date and ${r.until}::date) as sold_cents,
          (select coalesce(sum(amount_cents), 0) from gift_card_redemptions where org_id = ${orgId}
             and (created_at at time zone ${tz})::date between ${r.since}::date and ${r.until}::date) as redeemed_cents`,
  ]);
  return {
    bookings: n(res.bookings), covers: n(res.covers), noShows: n(res.no_shows), settled: n(res.settled),
    orders: n(ord.orders), salesCents: n(ord.sales),
    newGuests: n(gst.n), visitors: n(vis.visitors), returning: n(vis.returning),
    messages: n(msg.n),
    rewardsEarned: n(loy.earned), rewardsRedeemed: n(loy.redeemed),
    giftSold: n(gift.sold), giftSoldCents: n(gift.sold_cents), giftRedeemedCents: n(gift.redeemed_cents),
  };
}

export async function availability(sql: Sql, orgId: string): Promise<Available> {
  const [a] = await sql<{ ordering: boolean; loyalty: boolean; gift: boolean }[]>`
    select (exists (select 1 from orders where org_id = ${orgId})
            or exists (select 1 from ordering_settings where org_id = ${orgId} and (pickup_enabled or catering_enabled))) as ordering,
           (exists (select 1 from loyalty_programs where org_id = ${orgId})
            or exists (select 1 from loyalty_rewards where org_id = ${orgId})) as loyalty,
           exists (select 1 from gift_cards where org_id = ${orgId}) as gift`;
  return { ordering: a.ordering, loyalty: a.loyalty, giftCards: a.gift };
}

/** Raw counts to the metrics shown. Pure, so the rules are testable. */
export function toMetrics(cur: Raw, prev: Raw, a: Available): Metric[] {
  const both = (f: (r: Raw) => number | null, on = true) => (on ? { cur: f(cur), prev: f(prev) } : { cur: null, prev: null });
  return [
    { key: "covers", label: "Covers", unit: "count", upIsGood: true, ...both((r) => r.covers),
      definition: "People seated: party sizes of bookings and walk-ins that were seated or completed." },
    { key: "bookings", label: "Bookings", unit: "count", upIsGood: true, ...both((r) => r.bookings),
      definition: "Reservations and walk-ins for dates in this period, not counting cancellations." },
    { key: "no_show_rate", label: "No-show rate", unit: "pct", upIsGood: false, ...both((r) => share(r.noShows, r.settled)),
      definition: "Bookings marked no-show, out of bookings whose time has come and gone (walk-ins left out)." },
    { key: "online_sales", label: "Online sales", unit: "money", upIsGood: true, ...both((r) => r.salesCents, a.ordering),
      definition: "Order totals (with tax and tip) for pickup and catering orders placed in this period, paid or pay-at-pickup, not cancelled." },
    { key: "orders", label: "Online orders", unit: "count", upIsGood: true, ...both((r) => r.orders, a.ordering),
      definition: "Pickup and catering orders placed in this period, not cancelled." },
    { key: "average_order", label: "Average order", unit: "money", upIsGood: true,
      ...both((r) => (r.orders ? Math.round(r.salesCents / r.orders) : null), a.ordering),
      definition: "Online sales divided by online orders." },
    { key: "new_guests", label: "New guests", unit: "count", upIsGood: true, ...both((r) => r.newGuests),
      definition: "Guests added to your list for the first time: by booking, ordering or import." },
    { key: "repeat_share", label: "Repeat guests", unit: "pct", upIsGood: true, ...both((r) => share(r.returning, r.visitors)),
      definition: "Of the guests who visited in this period, the share who had visited before it." },
    { key: "messages", label: "Messages sent", unit: "count", upIsGood: true, ...both((r) => r.messages),
      definition: "Texts and emails that actually went out to guests: confirmations, reminders and campaigns." },
    { key: "rewards_earned", label: "Rewards earned", unit: "count", upIsGood: true, ...both((r) => r.rewardsEarned, a.loyalty),
      definition: "Loyalty rewards guests earned by reaching the visit count." },
    { key: "rewards_redeemed", label: "Rewards redeemed", unit: "count", upIsGood: true, ...both((r) => r.rewardsRedeemed, a.loyalty),
      definition: "Loyalty rewards handed over at the host stand." },
    { key: "gift_sold", label: "Gift cards sold", unit: "money", upIsGood: true, ...both((r) => r.giftSoldCents, a.giftCards),
      definition: "Face value of gift cards that went live (paid) in this period, less any voided." },
    { key: "gift_redeemed", label: "Gift cards redeemed", unit: "money", upIsGood: true, ...both((r) => r.giftRedeemedCents, a.giftCards),
      definition: "Amounts taken off gift cards to pay for meals." },
  ];
}

export async function overviewReport(sql: Sql, t: Tenant, p: Periods): Promise<{ metrics: Metric[]; cur: Raw; prev: Raw; available: Available }> {
  assertCan(t, "view");
  const [cur, prev, available] = await Promise.all([
    rawFor(sql, t.orgId, p.tz, p.cur), rawFor(sql, t.orgId, p.tz, p.prev), availability(sql, t.orgId),
  ]);
  return { metrics: toMetrics(cur, prev, available), cur, prev, available };
}
