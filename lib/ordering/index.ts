import { randomBytes } from "node:crypto";
import type { Sql } from "postgres";
import { assertIncluded, isIncluded } from "../billing/entitlements";
import { normalizePhone } from "../guests/phone";
import { choosePromotion, promotionsForOrder, type PromoChoice } from "../marketing/promotions";
import { sendSms, type SmsSender } from "../messaging/sms";
import { assertCan, type Tenant } from "../platform/tenant";
import { aliasNoteSql, log } from "../reservations/repo";
import { localDate, localTime, minutesOf, weekday, zonedToUtc } from "../reservations/time";
import { menuServedAt, type MenuAvailability, type SiteContent } from "../sites/content";

/**
 * Online ordering: pickup and catering from the restaurant's own site,
 * with no marketplace commission. The menu is the published website
 * menu; prices are always worked out here, on the server, from that
 * menu — whatever a browser sends is only item ids and quantities.
 */

export type OrderKind = "pickup" | "catering";
export type OrderStatus = "awaiting_payment" | "placed" | "accepted" | "ready" | "completed" | "cancelled";

export interface OrderingSettings {
  pickupEnabled: boolean;
  cateringEnabled: boolean;
  taxBps: number;
  leadMinutes: number;
  cateringLeadHours: number;
  cateringMinCents: number;
  pausedUntil: Date | null;
  soldOut: string[];
}

export const DEFAULT_SETTINGS: OrderingSettings = {
  pickupEnabled: false, cateringEnabled: false, taxBps: 0, leadMinutes: 25,
  cateringLeadHours: 48, cateringMinCents: 0, pausedUntil: null, soldOut: [],
};

export const LIMITS = { lines: 40, qty: 50, cateringQty: 500, note: 140, notes: 500, tipShare: 0.5 };

export async function getOrderingSettings(sql: Sql, orgId: string): Promise<OrderingSettings> {
  const [r] = await sql<{ pickup_enabled: boolean; catering_enabled: boolean; tax_bps: number; lead_minutes: number;
    catering_lead_hours: number; catering_min_cents: number; paused_until: Date | null; sold_out: string[] }[]>`
    select * from ordering_settings where org_id = ${orgId}`;
  if (!r) return { ...DEFAULT_SETTINGS };
  return {
    pickupEnabled: r.pickup_enabled, cateringEnabled: r.catering_enabled, taxBps: r.tax_bps, leadMinutes: r.lead_minutes,
    cateringLeadHours: r.catering_lead_hours, cateringMinCents: r.catering_min_cents, pausedUntil: r.paused_until, soldOut: r.sold_out,
  };
}

export async function saveOrderingSettings(sql: Sql, t: Tenant, s: OrderingSettings): Promise<string | null> {
  assertCan(t, "manage_venue");
  await assertIncluded(sql, t.orgId, "ordering");
  if (!Number.isInteger(s.taxBps) || s.taxBps < 0 || s.taxBps > 2500) return "Tax must be between 0% and 25%.";
  if (!Number.isInteger(s.leadMinutes) || s.leadMinutes < 5 || s.leadMinutes > 240) return "Pickup lead time must be 5 to 240 minutes.";
  if (!Number.isInteger(s.cateringLeadHours) || s.cateringLeadHours < 2 || s.cateringLeadHours > 720) return "Catering notice must be 2 to 720 hours.";
  if (!Number.isInteger(s.cateringMinCents) || s.cateringMinCents < 0) return "Enter a catering minimum.";
  await sql`
    insert into ordering_settings (org_id, pickup_enabled, catering_enabled, tax_bps, lead_minutes, catering_lead_hours, catering_min_cents, paused_until, sold_out, updated_by)
    values (${t.orgId}, ${s.pickupEnabled}, ${s.cateringEnabled}, ${s.taxBps}, ${s.leadMinutes}, ${s.cateringLeadHours}, ${s.cateringMinCents},
            ${s.pausedUntil}, ${s.soldOut}, ${t.actor})
    on conflict (org_id) do update set pickup_enabled = excluded.pickup_enabled, catering_enabled = excluded.catering_enabled,
      tax_bps = excluded.tax_bps, lead_minutes = excluded.lead_minutes, catering_lead_hours = excluded.catering_lead_hours,
      catering_min_cents = excluded.catering_min_cents, paused_until = excluded.paused_until, sold_out = excluded.sold_out,
      updated_by = excluded.updated_by, updated_at = now()`;
  await log(sql, t.orgId, t.actor, "ordering.settings_saved", "ordering_settings", t.orgId, {
    pickup: s.pickupEnabled, catering: s.cateringEnabled, taxBps: s.taxBps, soldOut: s.soldOut.length,
  });
  return null;
}

/** Pause and sold-out: what anyone on the floor can change mid-service. */
export async function setKitchenState(sql: Sql, t: Tenant, k: { pausedUntil: Date | null; soldOut: string[] }): Promise<void> {
  assertCan(t, "book");
  await assertIncluded(sql, t.orgId, "ordering");
  await sql`
    insert into ordering_settings (org_id, paused_until, sold_out, updated_by) values (${t.orgId}, ${k.pausedUntil}, ${k.soldOut}, ${t.actor})
    on conflict (org_id) do update set paused_until = excluded.paused_until, sold_out = excluded.sold_out,
      updated_by = excluded.updated_by, updated_at = now()`;
  await log(sql, t.orgId, t.actor, "ordering.kitchen", "ordering_settings", t.orgId, { pausedUntil: k.pausedUntil, soldOut: k.soldOut });
}

/* ------------------------------------------------------------ pricing -- */

export interface CartLine { itemId: string; qty: number; note?: string }
export interface PricedLine { itemId: string; name: string; qty: number; unitCents: number; lineCents: number; note: string }

export type Priced =
  | {
      ok: true; lines: PricedLine[]; subtotalCents: number; discountCents: number; taxCents: number; tipCents: number; totalCents: number;
      promotion: { id: string; name: string; code: string | null } | null;
    }
  | {
      ok: false; error: string;
      /** Cart item ids that can't be had (sold out, off the menu, or not
       *  served at the chosen time), so the page can name and remove them. */
      unavailable?: string[];
    };

/** A venue-local moment: "yyyy-mm-dd" and "HH:MM". */
export interface LocalWhen { date: string; time: string }

export interface OrderableItem {
  id: string; name: string; description: string; priceCents: number; menu: string; section: string; tags: string[];
  /** When it's served: one window per menu it appears on; null = whenever the kitchen is open. */
  availability: MenuAvailability[] | null;
}

/**
 * Every item that can be ordered: on the menu, priced, not sold out —
 * and, given a time, on a menu served then (a brunch dish isn't
 * orderable for Wednesday dinner).
 */
export function orderableItems(content: SiteContent, soldOut: string[] = [], at?: LocalWhen | null) {
  const out = new Map<string, OrderableItem>();
  for (const m of content.menus) {
    if (at && !menuServedAt(m, at.date, at.time)) continue;
    for (const s of m.sections) for (const i of s.items) {
      if (i.priceCents === null || soldOut.includes(i.id)) continue;
      const seen = out.get(i.id);
      if (seen) {
        // On more than one menu: served whenever any of them is.
        if (seen.availability) seen.availability = m.availability ? [...seen.availability, m.availability] : null;
        continue;
      }
      out.set(i.id, {
        id: i.id, name: i.name, description: i.description, priceCents: i.priceCents, menu: m.name, section: s.name, tags: i.tags,
        availability: m.availability ? [m.availability] : null,
      });
    }
  }
  return out;
}

/** Any item on the site by id, orderable or not, for naming what's gone. */
function itemName(content: SiteContent, id: string): string | null {
  for (const m of content.menus) for (const s of m.sections) for (const i of s.items) if (i.id === id) return i.name;
  return null;
}

/** "Baklava", "Baklava and Gyro", "Baklava, Gyro and 2 more". */
function nameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

/**
 * total = subtotal − discount + tax on (subtotal − discount) + tip.
 * The discount (lib/marketing/promotions) never exceeds the subtotal;
 * the tip limit is measured against the subtotal before discount.
 */
export function priceCart(
  content: SiteContent, settings: OrderingSettings, kind: OrderKind, cart: CartLine[], tipCents = 0, promo: PromoChoice | null = null,
  /** The ready time, venue-local: every item must be on a menu served then. */
  at: LocalWhen | null = null,
): Priced {
  const items = orderableItems(content, settings.soldOut, at);
  if (!Array.isArray(cart) || cart.length === 0) return { ok: false, error: "Your order is empty." };
  if (cart.length > LIMITS.lines) return { ok: false, error: "That's a lot of lines — please call us for an order this size." };
  // Name every dish that can't be had, not just the first, so the guest
  // can fix the order in one go.
  const missing = [...new Set(cart.map((c) => String(c?.itemId)).filter((id) => !items.has(id)))];
  if (missing.length) {
    const anyTime = orderableItems(content, settings.soldOut);
    const names = missing.map((id) => itemName(content, id)).filter((n): n is string => Boolean(n));
    const what = names.length ? nameList(names) : "Something in your order";
    const plural = names.length > 1;
    // Only "not served then" when that's the whole story.
    const offHours = Boolean(at) && missing.every((id) => anyTime.has(id));
    const error = offHours
      ? `${what} ${plural ? "aren't" : "isn't"} served at that time. Please pick another time, or remove ${plural ? "them" : "it"}.`
      : `${what} ${plural ? "are" : "is"} no longer available. Please review your order.`;
    return { ok: false, error, unavailable: missing };
  }
  const maxQty = kind === "catering" ? LIMITS.cateringQty : LIMITS.qty;
  const lines: PricedLine[] = [];
  for (const c of cart) {
    const item = items.get(String(c?.itemId))!;
    const qty = Number(c.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) return { ok: false, error: `Quantities are 1 to ${maxQty}.` };
    const note = String(c.note ?? "").trim().slice(0, LIMITS.note);
    lines.push({ itemId: item.id, name: item.name, qty, unitCents: item.priceCents, lineCents: item.priceCents * qty, note });
  }
  const subtotalCents = lines.reduce((s, l) => s + l.lineCents, 0);
  if (kind === "catering" && subtotalCents < settings.cateringMinCents) {
    return { ok: false, error: `Catering orders start at $${(settings.cateringMinCents / 100).toFixed(0)}.` };
  }
  const applied = promo ? choosePromotion(promo, lines, subtotalCents) : { ok: true as const, discountCents: 0, promotion: null };
  if (!applied.ok) return applied;
  const discountCents = Math.min(applied.discountCents, subtotalCents);
  // Round half up, per order: what a register does.
  const taxCents = Math.round(((subtotalCents - discountCents) * settings.taxBps) / 10_000);
  const tip = Math.max(0, Math.round(Number(tipCents) || 0));
  if (tip > subtotalCents * LIMITS.tipShare) return { ok: false, error: "That tip looks like a typo. Please check it." };
  return {
    ok: true, lines, subtotalCents, discountCents, taxCents, tipCents: tip,
    totalCents: subtotalCents - discountCents + taxCents + tip, promotion: applied.promotion,
  };
}

/* -------------------------------------------------------------- times -- */

export interface Period { daysOfWeek: number[]; first: string; last: string }
export interface PickupTime { date: string; time: string; at: Date }

/**
 * When an order can be ready: inside a service period, on a 15-minute
 * grid, after the lead time (minutes for pickup, hours for catering).
 * Pickup is today and tomorrow; catering looks two weeks ahead.
 */
export function readyTimes(periods: Period[], tz: string, now: Date, settings: OrderingSettings, kind: OrderKind): PickupTime[] {
  const earliest = new Date(now.getTime() + (kind === "pickup" ? settings.leadMinutes * 60_000 : settings.cateringLeadHours * 3_600_000));
  const paused = kind === "pickup" && settings.pausedUntil && settings.pausedUntil > now ? settings.pausedUntil : null;
  const start = paused && paused > earliest ? paused : earliest;
  const days = kind === "pickup" ? 2 : 15;
  const out: PickupTime[] = [];
  const today = localDate(now, tz);
  for (let d = 0; d < days; d++) {
    const date = localDate(new Date(zonedToUtc(today, "12:00", tz).getTime() + d * 86_400_000), tz);
    const seen = new Set<string>();
    for (const p of periods.filter((p) => p.daysOfWeek.includes(weekday(date)))) {
      for (let m = minutesOf(p.first); m <= minutesOf(p.last); m += 15) {
        const time = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        if (seen.has(time)) continue;
        const at = zonedToUtc(date, time, tz);
        if (at < start) continue;
        seen.add(time);
        out.push({ date, time, at });
      }
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export async function venuePeriods(sql: Sql, orgId: string, venueId: string): Promise<Period[]> {
  const rows = await sql<{ days_of_week: number[]; first_seating: string; last_seating: string }[]>`
    select days_of_week, to_char(first_seating, 'HH24:MI') as first_seating, to_char(last_seating, 'HH24:MI') as last_seating
    from service_periods where org_id = ${orgId} and venue_id = ${venueId}`;
  return rows.map((r) => ({ daysOfWeek: r.days_of_week, first: r.first_seating, last: r.last_seating }));
}

/* -------------------------------------------------------------- place -- */

export interface PlaceInput {
  orgId: string;
  venueId: string;
  timezone: string;
  content: SiteContent;
  kind: OrderKind;
  cart: CartLine[];
  tipCents?: number;
  /** "yyyy-mm-dd" and "HH:MM", venue-local. */
  date: string;
  time: string;
  name: string;
  phone: string;
  email?: string;
  headcount?: number | null;
  notes?: string;
  /** Online payment will follow; the order waits for it. */
  payOnline: boolean;
  /** A promo code the guest typed. Automatic promotions apply without one. */
  promoCode?: string;
  now?: Date;
}

export type PlaceResult =
  | { ok: true; id: string; number: number; token: string; totalCents: number; readyAt: Date }
  | {
      ok: false; error: string;
      /** Cart item ids that can't be had; see Priced. */
      unavailable?: string[];
      /** The form field to fix, when one is to blame. */
      field?: OrderField;
    };

export type OrderField = "name" | "phone" | "email" | "headcount" | "when" | "cart" | "promo" | "tip";

export async function placeOrder(sql: Sql, input: PlaceInput): Promise<PlaceResult> {
  const now = input.now ?? new Date();
  const settings = await getOrderingSettings(sql, input.orgId);
  if (input.kind === "pickup" && !settings.pickupEnabled) return { ok: false, error: "Online ordering is off right now." };
  if (input.kind === "catering" && !settings.cateringEnabled) return { ok: false, error: "Catering orders aren't taken online right now." };
  // The restaurant's plan has to include it; the switch alone isn't enough.
  if (!(await isIncluded(sql, input.orgId, input.kind === "catering" ? "catering" : "ordering"))) {
    return { ok: false, error: "Online ordering isn't available here. Please call the restaurant to order." };
  }
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "Please add your name.", field: "name" };
  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, error: "Please add a mobile number we can text when it's ready.", field: "phone" };
  const email = input.email?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That email doesn't look right.", field: "email" };
  const headcount = input.kind === "catering" ? Number(input.headcount) : null;
  if (input.kind === "catering" && (!Number.isInteger(headcount) || headcount! < 1 || headcount! > 2000)) return { ok: false, error: "How many people is it for?", field: "headcount" };

  const promotions = await promotionsForOrder(sql, input.orgId, phone, now);
  const promo = { code: input.promoCode ?? null, promotions, now };
  const at = { date: input.date, time: input.time };
  const priced = priceCart(input.content, settings, input.kind, input.cart, input.tipCents, promo, at);
  // Only dishes that are gone get a field; other refusals (a promo code,
  // a tip) read exactly as they always have.
  if (!priced.ok) return priced.unavailable ? { ...priced, field: "cart" } : priced;
  const times = readyTimes(await venuePeriods(sql, input.orgId, input.venueId), input.timezone, now, settings, input.kind);
  const slot = times.find((t) => t.date === input.date && t.time === input.time);
  if (!slot) return { ok: false, field: "when", error: input.kind === "pickup" && settings.pausedUntil && settings.pausedUntil > now
    ? "The kitchen is catching up — please pick a later time." : "That time isn't available any more. Please pick another." };

  const token = randomBytes(18).toString("base64url");
  return sql.begin(async (tx) => {
    const [g] = await tx<{ id: string }[]>`
      insert into guests (org_id, phone, name, email) values (${input.orgId}, ${phone}, ${name}, ${email})
      on conflict (org_id, phone) do update set ${aliasNoteSql(tx)} email = coalesce(excluded.email, guests.email)
      returning id`;
    // Order numbers: per restaurant, readable, serialized by the lock.
    await tx`select pg_advisory_xact_lock(hashtext(${`orders:${input.orgId}`}))`;
    const [{ n }] = await tx<{ n: number }[]>`select coalesce(max(number), 1000)::int + 1 as n from orders where org_id = ${input.orgId}`;
    // Under the same lock, count the promotion's uses again: two guests
    // racing for the last use can't both have it.
    if (priced.promotion) {
      const fresh = await promotionsForOrder(tx as unknown as Sql, input.orgId, phone, now);
      const again = priceCart(input.content, settings, input.kind, input.cart, input.tipCents, { ...promo, promotions: fresh }, at);
      if (!again.ok || again.promotion?.id !== priced.promotion.id || again.totalCents !== priced.totalCents) {
        return { ok: false as const, error: "That promotion was just used up. Please review your order." };
      }
    }
    const [o] = await tx<{ id: string }[]>`
      insert into orders (org_id, venue_id, guest_id, number, kind, status, payment, name, phone, email, ready_at, headcount, notes,
                          items, subtotal_cents, tax_cents, tip_cents, total_cents, manage_token, discount_cents, promotion_id)
      values (${input.orgId}, ${input.venueId}, ${g.id}, ${n}, ${input.kind},
              ${input.payOnline ? "awaiting_payment" : "placed"}, ${input.payOnline ? "pending" : "at_pickup"},
              ${name}, ${phone}, ${email}, ${slot.at}, ${headcount}, ${String(input.notes ?? "").trim().slice(0, LIMITS.notes)},
              ${tx.json(priced.lines as never)}, ${priced.subtotalCents}, ${priced.taxCents}, ${priced.tipCents}, ${priced.totalCents}, ${token},
              ${priced.discountCents}, ${priced.promotion?.id ?? null})
      returning id`;
    await tx`insert into change_log (org_id, actor, action, entity, entity_id, detail)
             values (${input.orgId}, 'guest', 'order.placed', 'order', ${o.id},
                     ${tx.json({ number: n, kind: input.kind, total_cents: priced.totalCents, pay: input.payOnline ? "online" : "at_pickup",
                       ...(priced.promotion ? { promotion: priced.promotion.name, discount_cents: priced.discountCents } : {}) })})`;
    return { ok: true as const, id: o.id, number: n, token, totalCents: priced.totalCents, readyAt: slot.at };
  });
}

/* ------------------------------------------------------------- status -- */

/** Where an order can go from each state. Anything else is refused. */
export const NEXT: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["cancelled"],
  placed: ["accepted", "cancelled"],
  accepted: ["ready", "cancelled"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
};

export async function setOrderStatus(
  sql: Sql, t: Tenant, orderId: string, to: OrderStatus, opts: { restaurant: string; sender?: SmsSender; reason?: string } ,
): Promise<"ok" | "not_found" | "invalid"> {
  assertCan(t, "book");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return "not_found";
  const [o] = await sql<{ id: string; status: OrderStatus; number: number; phone: string; guest_id: string | null; kind: OrderKind }[]>`
    select id, status, number, phone, guest_id, kind from orders where id = ${orderId} and org_id = ${t.orgId}`;
  if (!o) return "not_found";
  if (!NEXT[o.status].includes(to)) return "invalid";
  const done = await sql`update orders set status = ${to}, updated_at = now()
                         where id = ${o.id} and org_id = ${t.orgId} and status = ${o.status} returning id`;
  if (!done.length) return "invalid";
  await log(sql, t.orgId, t.actor, `order.${to}`, "order", o.id, { number: o.number, ...(opts.reason ? { reason: opts.reason } : {}) });

  // The guest hears about the two moments that matter to them.
  const body = to === "ready" && o.kind === "pickup"
    ? `${opts.restaurant}: order ${o.number} is ready for pickup.`
    : to === "cancelled" ? `${opts.restaurant}: we've had to cancel order ${o.number}. We're sorry — please call us with any questions.` : null;
  if (body && o.guest_id && o.phone.startsWith("+")) {
    const r = await (opts.sender ?? sendSms)(o.phone, body);
    await sql`
      insert into guest_messages (org_id, guest_id, kind, body, status, provider_id, error, sent_by)
      values (${t.orgId}, ${o.guest_id}, 'transactional', ${body}, ${r.status},
              ${r.status === "sent" ? r.providerId : null}, ${r.status === "failed" ? r.error : null}, ${t.actor})`;
  }
  return "ok";
}

export const CANCEL_REASONS = ["Out of an ingredient", "Kitchen too busy", "Guest asked to cancel", "Closing early"] as const;

/**
 * The kitchen cancelling an order: always with a reason, which goes in
 * the change log (the guest's text stays the same apology).
 */
export async function cancelOrder(
  sql: Sql, t: Tenant, orderId: string, reason: string, opts: { restaurant: string; sender?: SmsSender },
): Promise<"ok" | "not_found" | "invalid" | "reason_required"> {
  const why = reason.trim().slice(0, 200);
  if (why.length < 3) return "reason_required";
  return setOrderStatus(sql, t, orderId, "cancelled", { ...opts, reason: why });
}

export interface OrderRow {
  id: string; number: number; kind: OrderKind; status: OrderStatus; payment: string;
  name: string; phone: string; readyAt: Date; headcount: number | null; notes: string;
  items: PricedLine[]; totalCents: number; subtotalCents: number; taxCents: number; tipCents: number; createdAt: Date;
  discountCents: number;
}

const toRow = (r: Record<string, unknown>): OrderRow => ({
  id: r.id as string, number: r.number as number, kind: r.kind as OrderKind, status: r.status as OrderStatus,
  payment: r.payment as string, name: r.name as string, phone: r.phone as string, readyAt: r.ready_at as Date,
  headcount: (r.headcount as number | null) ?? null, notes: r.notes as string, items: r.items as PricedLine[],
  totalCents: r.total_cents as number, subtotalCents: r.subtotal_cents as number, taxCents: r.tax_cents as number,
  tipCents: r.tip_cents as number, createdAt: r.created_at as Date, discountCents: (r.discount_cents as number | undefined) ?? 0,
});

/** The kitchen's board: anything open, plus today's finished ones. */
export async function ordersBoard(sql: Sql, t: Tenant, now = new Date()): Promise<OrderRow[]> {
  assertCan(t, "view");
  const rows = await sql`
    select * from orders where org_id = ${t.orgId}
      and (status in ('placed', 'accepted', 'ready')
           or (status in ('completed', 'cancelled') and updated_at > ${new Date(now.getTime() - 18 * 3_600_000)}))
    order by ready_at limit 200`;
  return rows.map(toRow);
}

export async function orderByToken(sql: Sql, token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const [r] = await sql`
    select o.*, s.slug, v.timezone from orders o
    join venues v on v.id = o.venue_id
    left join sites s on s.venue_id = o.venue_id
    where o.manage_token = ${token} limit 1`;
  return r ? { ...toRow(r), slug: r.slug as string | null, timezone: r.timezone as string } : null;
}

export const fmtTime = (at: Date, tz: string) => {
  const t = localTime(at, tz);
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
