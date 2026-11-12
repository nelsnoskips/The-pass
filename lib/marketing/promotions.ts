import type { Sql } from "postgres";
import { isIncluded, planRefusal } from "../billing/entitlements";
import { assertCan, type Tenant } from "../platform/tenant";
import { log } from "../reservations/repo";

/**
 * Promotions for online ordering: promo codes and automatic discounts.
 *
 * The rule, everywhere:  total = subtotal − discount + tax on (subtotal −
 * discount) + tip. One promotion per order — the code the guest typed or
 * the best automatic one, whichever saves more. A discount never exceeds
 * the subtotal. Uses are counted from orders (a cancelled order, or an
 * online payment abandoned for an hour, gives its use back), and
 * re-checked inside the order transaction so the last use can't be
 * spent twice.
 */

export type PromoKind = "percent_order" | "amount_order" | "amount_item";

export interface Promotion {
  id: string;
  name: string;
  /** null = automatic: applies without a code. */
  code: string | null;
  kind: PromoKind;
  percent: number | null;
  amountCents: number | null;
  itemId: string | null;
  minSubtotalCents: number;
  startsAt: Date | null;
  endsAt: Date | null;
  maxUses: number | null;
  maxUsesPerPhone: number | null;
  active: boolean;
  /** Uses so far (all guests), and by this guest's phone when known. */
  uses: number;
  phoneUses: number;
}

export interface PromoLine { itemId: string; name: string; qty: number; unitCents: number; lineCents: number }

export type Discount = { ok: true; discountCents: number } | { ok: false; error: string };

const money = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;

/** What one promotion takes off this cart, or why it doesn't apply. */
export function discountFor(p: Promotion, lines: PromoLine[], subtotalCents: number, now: Date): Discount {
  if (!p.active) return { ok: false, error: "That code isn't active." };
  if (p.startsAt && now < p.startsAt) return { ok: false, error: "That code isn't active yet." };
  if (p.endsAt && now >= p.endsAt) return { ok: false, error: "That code has expired." };
  if (p.maxUses !== null && p.uses >= p.maxUses) return { ok: false, error: "That code has been used up." };
  if (p.maxUsesPerPhone !== null && p.phoneUses >= p.maxUsesPerPhone) return { ok: false, error: "You've already used that code." };
  if (subtotalCents < p.minSubtotalCents) return { ok: false, error: `That code is for orders of ${money(p.minSubtotalCents)} or more.` };
  let off = 0;
  if (p.kind === "percent_order") off = Math.round((subtotalCents * (p.percent ?? 0)) / 100);
  else if (p.kind === "amount_order") off = p.amountCents ?? 0;
  else {
    const line = lines.find((l) => l.itemId === p.itemId);
    if (!line) return { ok: false, error: "That code is for a dish that isn't in your order." };
    // Off each one ordered, never more than the dish costs.
    off = Math.min(p.amountCents ?? 0, line.unitCents) * line.qty;
  }
  return { ok: true, discountCents: Math.max(0, Math.min(off, subtotalCents)) };
}

export interface PromoChoice { code?: string | null; promotions: Promotion[]; now: Date }
export type Applied =
  | { ok: true; discountCents: number; promotion: { id: string; name: string; code: string | null } | null }
  | { ok: false; error: string };

/** The code the guest typed (it must apply), or else nothing; then the
 *  best automatic promotion if it saves more. */
export function choosePromotion(choice: PromoChoice, lines: PromoLine[], subtotalCents: number): Applied {
  const code = (choice.code ?? "").trim().toUpperCase();
  let best: { p: Promotion; off: number } | null = null;
  if (code) {
    const p = choice.promotions.find((x) => x.code !== null && x.code.toUpperCase() === code);
    if (!p) return { ok: false, error: "That code isn't valid." };
    const d = discountFor(p, lines, subtotalCents, choice.now);
    if (!d.ok) return d;
    best = { p, off: d.discountCents };
  }
  for (const p of choice.promotions.filter((x) => x.code === null)) {
    const d = discountFor(p, lines, subtotalCents, choice.now);
    if (d.ok && d.discountCents > 0 && (!best || d.discountCents > best.off)) best = { p, off: d.discountCents };
  }
  return best
    ? { ok: true, discountCents: best.off, promotion: { id: best.p.id, name: best.p.name, code: best.p.code } }
    : { ok: true, discountCents: 0, promotion: null };
}

/* ------------------------------------------------------------ storage -- */

type Row = {
  id: string; name: string; code: string | null; kind: PromoKind; percent: number | null; amount_cents: number | null;
  item_id: string | null; min_subtotal_cents: number; starts_at: Date | null; ends_at: Date | null;
  max_uses: number | null; max_uses_per_phone: number | null; active: boolean; uses: number; phone_uses: number;
};
const fromRow = (r: Row): Promotion => ({
  id: r.id, name: r.name, code: r.code, kind: r.kind, percent: r.percent, amountCents: r.amount_cents, itemId: r.item_id,
  minSubtotalCents: r.min_subtotal_cents, startsAt: r.starts_at, endsAt: r.ends_at, maxUses: r.max_uses,
  maxUsesPerPhone: r.max_uses_per_phone, active: r.active, uses: r.uses, phoneUses: r.phone_uses,
});

/** Orders that hold a use: not cancelled, and not an online payment left
 *  unpaid for over an hour. */
const holdsUse = (sql: Sql, now: Date) =>
  sql`o.status <> 'cancelled' and not (o.status = 'awaiting_payment' and o.created_at < ${new Date(now.getTime() - 3_600_000)})`;

/**
 * Promotions a guest's order could use, with use counts. Called by the
 * ordering code with an org id from the published site (no tenant: the
 * guest isn't signed in) — read-only, and only that org's rows.
 */
export async function promotionsForOrder(sql: Sql, orgId: string, phone: string | null, now: Date, ids?: string[]): Promise<Promotion[]> {
  // A plan without promotions: no code or automatic discount applies to a new order.
  if (!ids && !(await isIncluded(sql, orgId, "promotions"))) return [];
  const rows = await sql<Row[]>`
    select p.*,
      (select count(*)::int from orders o where o.promotion_id = p.id and o.org_id = p.org_id and ${holdsUse(sql, now)}) as uses,
      (select count(*)::int from orders o where o.promotion_id = p.id and o.org_id = p.org_id and o.phone = ${phone ?? ""} and ${holdsUse(sql, now)}) as phone_uses
    from promotions p
    where p.org_id = ${orgId}
      ${ids ? sql`and p.id = any(${ids}::uuid[])` : sql``}`;
  return rows.map(fromRow);
}

export async function hasAutomaticPromotions(sql: Sql, orgId: string, now = new Date()): Promise<boolean> {
  if (!(await isIncluded(sql, orgId, "promotions"))) return false;
  const [r] = await sql<{ n: number }[]>`
    select count(*)::int as n from promotions where org_id = ${orgId} and active and code is null
      and (starts_at is null or starts_at <= ${now}) and (ends_at is null or ends_at > ${now})`;
  return r.n > 0;
}

export interface PromotionStats extends Promotion { revenueCents: number; discountCents: number; orders: number; createdAt: Date; createdBy: string }

export async function listPromotions(sql: Sql, t: Tenant, now = new Date()): Promise<PromotionStats[]> {
  assertCan(t, "view");
  const rows = await sql<(Row & { revenue_cents: number; discount_cents: number; orders: number; created_at: Date; created_by: string })[]>`
    select p.*,
      (select count(*)::int from orders o where o.promotion_id = p.id and o.org_id = p.org_id and ${holdsUse(sql, now)}) as uses,
      0 as phone_uses,
      (select count(*)::int from orders o where o.promotion_id = p.id and o.org_id = p.org_id and o.status not in ('cancelled', 'awaiting_payment')) as orders,
      (select coalesce(sum(o.total_cents), 0)::int from orders o where o.promotion_id = p.id and o.org_id = p.org_id and o.status not in ('cancelled', 'awaiting_payment')) as revenue_cents,
      (select coalesce(sum(o.discount_cents), 0)::int from orders o where o.promotion_id = p.id and o.org_id = p.org_id and o.status not in ('cancelled', 'awaiting_payment')) as discount_cents
    from promotions p where p.org_id = ${t.orgId} order by p.active desc, p.created_at desc limit 200`;
  return rows.map((r) => ({ ...fromRow(r), revenueCents: r.revenue_cents, discountCents: r.discount_cents, orders: r.orders, createdAt: r.created_at, createdBy: r.created_by }));
}

export interface PromotionInput {
  name: string; code: string; automatic: boolean; kind: string;
  percent?: string; amount?: string; itemId?: string; minSubtotal?: string;
  startsAt?: Date | null; endsAt?: Date | null; maxUses?: string; maxUsesPerPhone?: string;
}

const dollarsToCents = (s: string | undefined) => {
  const v = String(s ?? "").replace(/[$,\s]/g, "");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};
const wholeOrNull = (s: string | undefined) => {
  const v = String(s ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};

export async function createPromotion(
  sql: Sql, t: Tenant, input: PromotionInput, validItems?: Set<string>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  assertCan(t, "manage_venue");
  const refused = await planRefusal(sql, t.orgId, "promotions");
  if (refused) return { ok: false, error: refused };
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!name) return { ok: false, error: "Give the promotion a name." };
  const code = input.automatic ? null : input.code.trim().toUpperCase().replace(/\s+/g, "");
  if (code !== null && !/^[A-Z0-9_-]{3,24}$/.test(code)) return { ok: false, error: "A code is 3 to 24 letters or numbers, no spaces." };
  const kind = (["percent_order", "amount_order", "amount_item"] as const).find((k) => k === input.kind);
  if (!kind) return { ok: false, error: "Pick what the promotion takes off." };
  let percent: number | null = null, amountCents: number | null = null, itemId: string | null = null;
  if (kind === "percent_order") {
    percent = wholeOrNull(input.percent);
    if (percent === null || !Number.isInteger(percent) || percent < 1 || percent > 100) return { ok: false, error: "Percent off is a whole number from 1 to 100." };
  } else {
    amountCents = dollarsToCents(input.amount);
    if (amountCents === null || !Number.isInteger(amountCents) || amountCents < 1 || amountCents > 1_000_000) return { ok: false, error: "Enter the amount off in dollars." };
    if (kind === "amount_item") {
      itemId = String(input.itemId ?? "").trim() || null;
      if (!itemId) return { ok: false, error: "Pick the dish it's for." };
      if (validItems && !validItems.has(itemId)) return { ok: false, error: "That dish isn't on the published menu." };
    }
  }
  const min = dollarsToCents(input.minSubtotal) ?? 0;
  if (!Number.isInteger(min) || min < 0) return { ok: false, error: "Minimum order is an amount in dollars." };
  const maxUses = wholeOrNull(input.maxUses);
  const maxPer = wholeOrNull(input.maxUsesPerPhone);
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return { ok: false, error: "Total uses is a whole number, 1 or more." };
  if (maxPer !== null && (!Number.isInteger(maxPer) || maxPer < 1)) return { ok: false, error: "Uses per guest is a whole number, 1 or more." };
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) return { ok: false, error: "The end date must be after the start date." };

  if (code) {
    const [dupe] = await sql`select 1 from promotions where org_id = ${t.orgId} and upper(code) = ${code}`;
    if (dupe) return { ok: false, error: `There's already a promotion with the code ${code}.` };
  }
  const [p] = await sql<{ id: string }[]>`
    insert into promotions (org_id, name, code, kind, percent, amount_cents, item_id, min_subtotal_cents, starts_at, ends_at,
                            max_uses, max_uses_per_phone, created_by)
    values (${t.orgId}, ${name}, ${code}, ${kind}, ${percent}, ${amountCents}, ${itemId}, ${min}, ${input.startsAt ?? null}, ${input.endsAt ?? null},
            ${maxUses}, ${maxPer}, ${t.actor})
    returning id`;
  await log(sql, t.orgId, t.actor, "promotion.created", "promotion", p.id, { name, code, kind, percent, amountCents, itemId, minSubtotalCents: min });
  return { ok: true, id: p.id };
}

export async function setPromotionActive(sql: Sql, t: Tenant, id: string, active: boolean): Promise<boolean> {
  assertCan(t, "manage_venue");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const rows = await sql`update promotions set active = ${active}, updated_at = now() where id = ${id} and org_id = ${t.orgId} returning id`;
  if (rows.length) await log(sql, t.orgId, t.actor, active ? "promotion.resumed" : "promotion.paused", "promotion", id);
  return rows.length > 0;
}

/** Plain-English summary: "20% off orders of $30 or more". */
export function describePromotion(p: Pick<Promotion, "kind" | "percent" | "amountCents" | "itemId" | "minSubtotalCents">, itemName?: string): string {
  const what = p.kind === "percent_order" ? `${p.percent}% off the order`
    : p.kind === "amount_order" ? `${money(p.amountCents ?? 0)} off the order`
    : `${money(p.amountCents ?? 0)} off each ${itemName ?? p.itemId}`;
  return p.minSubtotalCents ? `${what}, on orders of ${money(p.minSubtotalCents)} or more` : what;
}
