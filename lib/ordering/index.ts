import { randomBytes } from "node:crypto";
import type { Sql } from "postgres";
import { normalizePhone } from "../guests/phone";
import { sendSms, type SmsSender } from "../messaging/sms";
import { assertCan, type Tenant } from "../platform/tenant";
import { log } from "../reservations/repo";
import { localDate, localTime, minutesOf, weekday, zonedToUtc } from "../reservations/time";
import type { SiteContent } from "../sites/content";

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
  | { ok: true; lines: PricedLine[]; subtotalCents: number; taxCents: number; tipCents: number; totalCents: number }
  | { ok: false; error: string };

/** Every item that can be ordered: on the menu, priced, not sold out. */
export function orderableItems(content: SiteContent, soldOut: string[] = []) {
  const out = new Map<string, { id: string; name: string; description: string; priceCents: number; menu: string; section: string; tags: string[] }>();
  for (const m of content.menus) for (const s of m.sections) for (const i of s.items) {
    if (i.priceCents === null || soldOut.includes(i.id) || out.has(i.id)) continue;
    out.set(i.id, { id: i.id, name: i.name, description: i.description, priceCents: i.priceCents, menu: m.name, section: s.name, tags: i.tags });
  }
  return out;
}

export function priceCart(content: SiteContent, settings: OrderingSettings, kind: OrderKind, cart: CartLine[], tipCents = 0): Priced {
  const items = orderableItems(content, settings.soldOut);
  if (!Array.isArray(cart) || cart.length === 0) return { ok: false, error: "Your order is empty." };
  if (cart.length > LIMITS.lines) return { ok: false, error: "That's a lot of lines — please call us for an order this size." };
  const maxQty = kind === "catering" ? LIMITS.cateringQty : LIMITS.qty;
  const lines: PricedLine[] = [];
  for (const c of cart) {
    const item = items.get(String(c?.itemId));
    if (!item) return { ok: false, error: "Something in your order is no longer available. Please review it." };
    const qty = Number(c.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) return { ok: false, error: `Quantities are 1 to ${maxQty}.` };
    const note = String(c.note ?? "").trim().slice(0, LIMITS.note);
    lines.push({ itemId: item.id, name: item.name, qty, unitCents: item.priceCents, lineCents: item.priceCents * qty, note });
  }
  const subtotalCents = lines.reduce((s, l) => s + l.lineCents, 0);
  if (kind === "catering" && subtotalCents < settings.cateringMinCents) {
    return { ok: false, error: `Catering orders start at $${(settings.cateringMinCents / 100).toFixed(0)}.` };
  }
  // Round half up, per order: what a register does.
  const taxCents = Math.round((subtotalCents * settings.taxBps) / 10_000);
  const tip = Math.max(0, Math.round(Number(tipCents) || 0));
  if (tip > subtotalCents * LIMITS.tipShare) return { ok: false, error: "That tip looks like a typo. Please check it." };
  return { ok: true, lines, subtotalCents, taxCents, tipCents: tip, totalCents: subtotalCents + taxCents + tip };
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
  now?: Date;
}

export type PlaceResult =
  | { ok: true; id: string; number: number; token: string; totalCents: number; readyAt: Date }
  | { ok: false; error: string };

export async function placeOrder(sql: Sql, input: PlaceInput): Promise<PlaceResult> {
  const now = input.now ?? new Date();
  const settings = await getOrderingSettings(sql, input.orgId);
  if (input.kind === "pickup" && !settings.pickupEnabled) return { ok: false, error: "Online ordering is off right now." };
  if (input.kind === "catering" && !settings.cateringEnabled) return { ok: false, error: "Catering orders aren't taken online right now." };
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "Please add your name." };
  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, error: "Please add a mobile number we can text when it's ready." };
  const email = input.email?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That email doesn't look right." };
  const headcount = input.kind === "catering" ? Number(input.headcount) : null;
  if (input.kind === "catering" && (!Number.isInteger(headcount) || headcount! < 1 || headcount! > 2000)) return { ok: false, error: "How many people is it for?" };

  const priced = priceCart(input.content, settings, input.kind, input.cart, input.tipCents);
  if (!priced.ok) return priced;
  const times = readyTimes(await venuePeriods(sql, input.orgId, input.venueId), input.timezone, now, settings, input.kind);
  const slot = times.find((t) => t.date === input.date && t.time === input.time);
  if (!slot) return { ok: false, error: input.kind === "pickup" && settings.pausedUntil && settings.pausedUntil > now
    ? "The kitchen is catching up — please pick a later time." : "That time isn't available any more. Please pick another." };

  const token = randomBytes(18).toString("base64url");
  return sql.begin(async (tx) => {
    const [g] = await tx<{ id: string }[]>`
      insert into guests (org_id, phone, name, email) values (${input.orgId}, ${phone}, ${name}, ${email})
      on conflict (org_id, phone) do update set email = coalesce(excluded.email, guests.email)
      returning id`;
    // Order numbers: per restaurant, readable, serialized by the lock.
    await tx`select pg_advisory_xact_lock(hashtext(${`orders:${input.orgId}`}))`;
    const [{ n }] = await tx<{ n: number }[]>`select coalesce(max(number), 1000)::int + 1 as n from orders where org_id = ${input.orgId}`;
    const [o] = await tx<{ id: string }[]>`
      insert into orders (org_id, venue_id, guest_id, number, kind, status, payment, name, phone, email, ready_at, headcount, notes,
                          items, subtotal_cents, tax_cents, tip_cents, total_cents, manage_token)
      values (${input.orgId}, ${input.venueId}, ${g.id}, ${n}, ${input.kind},
              ${input.payOnline ? "awaiting_payment" : "placed"}, ${input.payOnline ? "pending" : "at_pickup"},
              ${name}, ${phone}, ${email}, ${slot.at}, ${headcount}, ${String(input.notes ?? "").trim().slice(0, LIMITS.notes)},
              ${tx.json(priced.lines as never)}, ${priced.subtotalCents}, ${priced.taxCents}, ${priced.tipCents}, ${priced.totalCents}, ${token})
      returning id`;
    await tx`insert into change_log (org_id, actor, action, entity, entity_id, detail)
             values (${input.orgId}, 'guest', 'order.placed', 'order', ${o.id},
                     ${tx.json({ number: n, kind: input.kind, total_cents: priced.totalCents, pay: input.payOnline ? "online" : "at_pickup" })})`;
    return { ok: true as const, id: o.id, number: n, token, totalCents: priced.totalCents, readyAt: slot.at };
  });
}

/* ------------------------------------------------------------- status -- */

/** Where an order can go from each state. Anything else is refused. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["cancelled"],
  placed: ["accepted", "cancelled"],
  accepted: ["ready", "cancelled"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
};

export async function setOrderStatus(
  sql: Sql, t: Tenant, orderId: string, to: OrderStatus, opts: { restaurant: string; sender?: SmsSender } ,
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
  await log(sql, t.orgId, t.actor, `order.${to}`, "order", o.id, { number: o.number });

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

export interface OrderRow {
  id: string; number: number; kind: OrderKind; status: OrderStatus; payment: string;
  name: string; phone: string; readyAt: Date; headcount: number | null; notes: string;
  items: PricedLine[]; totalCents: number; subtotalCents: number; taxCents: number; tipCents: number; createdAt: Date;
}

const toRow = (r: Record<string, unknown>): OrderRow => ({
  id: r.id as string, number: r.number as number, kind: r.kind as OrderKind, status: r.status as OrderStatus,
  payment: r.payment as string, name: r.name as string, phone: r.phone as string, readyAt: r.ready_at as Date,
  headcount: (r.headcount as number | null) ?? null, notes: r.notes as string, items: r.items as PricedLine[],
  totalCents: r.total_cents as number, subtotalCents: r.subtotal_cents as number, taxCents: r.tax_cents as number,
  tipCents: r.tip_cents as number, createdAt: r.created_at as Date,
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
