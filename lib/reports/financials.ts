import type { Sql } from "postgres";
import { assertCan, type Tenant } from "../platform/tenant";
import type { Periods, Range } from "./period";

/**
 * The money that moved through The Pass: deposits, no-show fees, gift
 * card sales and online order payments (the payments table), plus gift
 * card redemptions, which spend down what the restaurant owes card
 * holders rather than bring money in.
 *
 * Dating: a payment counts as collected on the day it was made, and a
 * refund on the day it was refunded (the row's last update), so a
 * deposit taken in one period and refunded in the next shows in both —
 * as it would on a bank statement. Payouts to the bank are Stripe's and
 * aren't recorded here yet: they are null, never 0.
 */

export const PAYMENT_KINDS = ["deposit", "no_show_fee", "gift_card", "order"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export const PAYMENT_STATUSES = ["pending", "held", "captured", "refunded", "failed", "canceled"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** What the transactions list can be filtered to. Redemptions aren't payments. */
export const TX_KINDS = [...PAYMENT_KINDS, "redemption"] as const;
export type TxKind = (typeof TX_KINDS)[number];
export const TX_STATUSES = [...PAYMENT_STATUSES, "redeemed"] as const;
export type TxStatus = (typeof TX_STATUSES)[number];

export const KIND_LABEL: Record<TxKind, string> = {
  deposit: "Deposit", no_show_fee: "No-show fee", gift_card: "Gift card sale", order: "Online order", redemption: "Gift card redeemed",
};

export interface KindTotals { kind: PaymentKind; collectedCents: number; refundedCents: number; netCents: number; count: number }

export interface FinancialSummary {
  /** False until the restaurant has taken any payment through The Pass. */
  hasPayments: boolean;
  /** Money taken in the period (captured, including what was later refunded). */
  collectedCents: number | null;
  refundedCents: number | null;
  netCents: number | null;
  prevCollectedCents: number | null;
  prevRefundedCents: number | null;
  prevNetCents: number | null;
  byKind: KindTotals[];
  /** Started checkouts in the period that haven't been paid. */
  pendingCents: number | null;
  pendingCount: number;
  failedCount: number;
  /** Deposits held right now (marked paid, not yet captured or returned). */
  depositsHeldCents: number | null;
  depositsHeldCount: number;
  /** What the restaurant owes on active gift cards right now. */
  giftLiabilityCents: number | null;
  giftCardsOutstanding: number;
  /** Gift card sales and redemptions in the period. */
  giftSoldCents: number | null;
  giftRedeemedCents: number | null;
  /** Online orders paid at the counter: money The Pass never touched. */
  payAtPickupCents: number | null;
  payAtPickupCount: number;
  /** Not recorded until Stripe is connected. */
  payoutsCents: null;
}

const n = (v: unknown) => Number(v ?? 0);

async function moneyIn(sql: Sql, orgId: string, tz: string, r: Range) {
  const [rows, refundRows] = await Promise.all([
    sql<{ kind: PaymentKind; collected: string; count: string }[]>`
      select kind, coalesce(sum(amount_cents), 0) as collected, count(*) as count from payments
      where org_id = ${orgId} and status in ('captured', 'refunded')
        and (created_at at time zone ${tz})::date between ${r.since}::date and ${r.until}::date
      group by kind`,
    sql<{ kind: PaymentKind; refunded: string }[]>`
      select kind, coalesce(sum(amount_cents), 0) as refunded from payments
      where org_id = ${orgId} and status = 'refunded'
        and (updated_at at time zone ${tz})::date between ${r.since}::date and ${r.until}::date
      group by kind`,
  ]);
  const byKind: KindTotals[] = PAYMENT_KINDS.map((kind) => {
    const c = rows.find((x) => x.kind === kind);
    const f = refundRows.find((x) => x.kind === kind);
    const collectedCents = n(c?.collected);
    const refundedCents = n(f?.refunded);
    return { kind, collectedCents, refundedCents, netCents: collectedCents - refundedCents, count: n(c?.count) };
  });
  const collectedCents = byKind.reduce((s, k) => s + k.collectedCents, 0);
  const refundedCents = byKind.reduce((s, k) => s + k.refundedCents, 0);
  return { byKind, collectedCents, refundedCents, netCents: collectedCents - refundedCents };
}

export async function financialSummary(sql: Sql, t: Tenant, p: Periods): Promise<FinancialSummary> {
  assertCan(t, "view");
  const org = t.orgId;
  const [cur, prev, [s]] = await Promise.all([
    moneyIn(sql, org, p.tz, p.cur),
    moneyIn(sql, org, p.tz, p.prev),
    sql`select
          exists (select 1 from payments where org_id = ${org}) as has_payments,
          exists (select 1 from gift_cards where org_id = ${org}) as has_gift,
          exists (select 1 from orders where org_id = ${org}) as has_orders,
          (select coalesce(sum(amount_cents), 0) from payments where org_id = ${org} and status = 'pending'
             and (created_at at time zone ${p.tz})::date between ${p.cur.since}::date and ${p.cur.until}::date) as pending_cents,
          (select count(*) from payments where org_id = ${org} and status = 'pending'
             and (created_at at time zone ${p.tz})::date between ${p.cur.since}::date and ${p.cur.until}::date) as pending_count,
          (select count(*) from payments where org_id = ${org} and status = 'failed'
             and (created_at at time zone ${p.tz})::date between ${p.cur.since}::date and ${p.cur.until}::date) as failed_count,
          (select coalesce(sum(amount_cents), 0) from payments where org_id = ${org} and kind = 'deposit' and status = 'held') as held_cents,
          (select count(*) from payments where org_id = ${org} and kind = 'deposit' and status = 'held') as held_count,
          (select coalesce(sum(balance_cents), 0) from gift_cards where org_id = ${org} and status = 'active') as liability,
          (select count(*) from gift_cards where org_id = ${org} and status = 'active' and balance_cents > 0) as outstanding,
          (select coalesce(sum(initial_cents), 0) from gift_cards where org_id = ${org} and status <> 'void'
             and (activated_at at time zone ${p.tz})::date between ${p.cur.since}::date and ${p.cur.until}::date) as gift_sold,
          (select coalesce(sum(amount_cents), 0) from gift_card_redemptions where org_id = ${org}
             and (created_at at time zone ${p.tz})::date between ${p.cur.since}::date and ${p.cur.until}::date) as gift_redeemed,
          (select coalesce(sum(o.total_cents), 0) from orders o join venues v on v.id = o.venue_id
             where o.org_id = ${org} and o.payment = 'at_pickup' and o.status <> 'cancelled'
               and (o.created_at at time zone v.timezone)::date between ${p.cur.since}::date and ${p.cur.until}::date) as at_pickup_cents,
          (select count(*) from orders o join venues v on v.id = o.venue_id
             where o.org_id = ${org} and o.payment = 'at_pickup' and o.status <> 'cancelled'
               and (o.created_at at time zone v.timezone)::date between ${p.cur.since}::date and ${p.cur.until}::date) as at_pickup_count`,
  ]);
  const has = Boolean(s.has_payments);
  const gift = Boolean(s.has_gift);
  const pay = <T>(v: T) => (has ? v : null);
  return {
    hasPayments: has,
    collectedCents: pay(cur.collectedCents), refundedCents: pay(cur.refundedCents), netCents: pay(cur.netCents),
    prevCollectedCents: pay(prev.collectedCents), prevRefundedCents: pay(prev.refundedCents), prevNetCents: pay(prev.netCents),
    byKind: cur.byKind,
    pendingCents: pay(n(s.pending_cents)), pendingCount: n(s.pending_count), failedCount: n(s.failed_count),
    depositsHeldCents: pay(n(s.held_cents)), depositsHeldCount: n(s.held_count),
    giftLiabilityCents: gift ? n(s.liability) : null, giftCardsOutstanding: n(s.outstanding),
    giftSoldCents: gift ? n(s.gift_sold) : null, giftRedeemedCents: gift ? n(s.gift_redeemed) : null,
    payAtPickupCents: s.has_orders ? n(s.at_pickup_cents) : null, payAtPickupCount: n(s.at_pickup_count),
    payoutsCents: null,
  };
}

/* -------------------------------------------------------- transactions -- */

export interface Transaction {
  id: string;
  kind: TxKind;
  status: TxStatus;
  amountCents: number;
  /** Who paid or whose card it was. */
  who: string | null;
  /** What it was for: "Booking Nov 14, party of 4", "Order 1042", a card code. */
  ref: string | null;
  provider: string | null;
  providerRef: string | null;
  createdAt: Date;
  updatedAt: Date;
  guestId: string | null;
}

export interface TxFilter { kind?: TxKind | null; status?: TxStatus | null; range: Range; tz: string; page?: number; pageSize?: number }

export function parseTxKind(v: string | undefined | null): TxKind | null {
  return (TX_KINDS as readonly string[]).includes(v ?? "") ? (v as TxKind) : null;
}
export function parseTxStatus(v: string | undefined | null): TxStatus | null {
  return (TX_STATUSES as readonly string[]).includes(v ?? "") ? (v as TxStatus) : null;
}

function ledger(sql: Sql, orgId: string) {
  return sql`
    select p.id::text as id, p.kind, p.status, p.amount_cents, p.provider, coalesce(p.provider_charge_ref, p.provider_ref) as provider_ref,
           p.created_at, p.updated_at,
           coalesce(g.name, o.name, gc.purchaser_name) as who,
           coalesce(g.id, o.guest_id) as guest_id,
           case when p.reservation_id is not null then 'booking:' || to_char(r.starts_at at time zone v.timezone, 'YYYY-MM-DD') || ':' || r.party_size
                when p.order_id is not null then 'order:' || o.number
                when p.gift_card_id is not null then 'card:' || gc.code
           end as ref
    from payments p
    left join reservations r on r.id = p.reservation_id and r.org_id = p.org_id
    left join venues v on v.id = r.venue_id
    left join guests g on g.id = r.guest_id and g.org_id = p.org_id
    left join orders o on o.id = p.order_id and o.org_id = p.org_id
    left join gift_cards gc on gc.id = p.gift_card_id and gc.org_id = p.org_id
    where p.org_id = ${orgId}
    union all
    select gr.id::text, 'redemption', 'redeemed', gr.amount_cents, null, null, gr.created_at, gr.created_at,
           coalesce(gc.recipient_name, gc.purchaser_name), null::uuid, 'card:' || gc.code
    from gift_card_redemptions gr join gift_cards gc on gc.id = gr.gift_card_id and gc.org_id = gr.org_id
    where gr.org_id = ${orgId}`;
}

function describe(ref: string | null): string | null {
  if (!ref) return null;
  const [type, a, b] = ref.split(":");
  if (type === "booking") {
    const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${a}T12:00:00Z`));
    return `Booking ${day}, party of ${b}`;
  }
  if (type === "order") return `Order ${a}`;
  if (type === "card") return `Card ${a}`;
  return null;
}

export async function transactions(sql: Sql, t: Tenant, f: TxFilter): Promise<{ rows: Transaction[]; total: number; page: number; pages: number; pageSize: number }> {
  assertCan(t, "view");
  const pageSize = Math.min(500, Math.max(1, f.pageSize ?? 50));
  const where = sql`
    where (x.created_at at time zone ${f.tz})::date between ${f.range.since}::date and ${f.range.until}::date
      ${f.kind ? sql`and x.kind = ${f.kind}` : sql``}
      ${f.status ? sql`and x.status = ${f.status}` : sql``}`;
  const [{ total }] = await sql<{ total: string }[]>`select count(*) as total from (${ledger(sql, t.orgId)}) x ${where}`;
  const pages = Math.max(1, Math.ceil(n(total) / pageSize));
  const page = Math.min(Math.max(1, Math.floor(f.page ?? 1)), pages);
  const rows = await sql<{ id: string; kind: TxKind; status: TxStatus; amount_cents: number; provider: string | null; provider_ref: string | null;
    created_at: Date; updated_at: Date; who: string | null; guest_id: string | null; ref: string | null }[]>`
    select * from (${ledger(sql, t.orgId)}) x ${where}
    order by x.created_at desc, x.id limit ${pageSize} offset ${(page - 1) * pageSize}`;
  return {
    total: n(total), page, pages, pageSize,
    rows: rows.map((r) => ({
      id: r.id, kind: r.kind, status: r.status, amountCents: r.amount_cents, who: r.who, ref: describe(r.ref),
      provider: r.provider, providerRef: r.provider_ref, createdAt: r.created_at, updatedAt: r.updated_at, guestId: r.guest_id,
    })),
  };
}
