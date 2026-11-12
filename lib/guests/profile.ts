import { actorLabel } from "../agent-runtime/catalog";
import type { Sql } from "postgres";
import { log } from "../reservations/repo";
import { assertCan, type Tenant } from "../platform/tenant";

/**
 * One guest, everything the restaurant knows about them: contact and
 * consent, visits, loyalty, bookings, orders, gift cards and every
 * message sent, plus one timeline that puts it all in order.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface GuestCore {
  id: string; name: string; phone: string; email: string | null; notes: string | null; tags: string[];
  smsConsentAt: Date | null; smsConsentSource: string | null; smsOptedOutAt: Date | null;
  emailConsentAt: Date | null; emailConsentSource: string | null; emailOptedOutAt: Date | null;
  visitCount: number; noShowCount: number; lastVisitAt: Date | null; totalSpendCents: number; createdAt: Date;
}

export interface ProfileBooking { id: string; startsAt: Date; timezone: string; venue: string; partySize: number; status: string; source: string; depositCents: number; depositStatus: string; createdAt: Date }
export interface ProfileOrder { id: string; number: number; kind: string; status: string; payment: string; totalCents: number; readyAt: Date; createdAt: Date }
export interface ProfileCard { id: string; code: string; status: string; initialCents: number; balanceCents: number; recipientName: string | null; createdAt: Date; role: "bought" | "received" }
export interface ProfileMessage { id: string; channel: string; kind: string; body: string; status: string; sentBy: string; createdAt: Date }
export interface ProfileReward { id: string; reward: string; earnedAtVisit: number; earnedAt: Date; redeemedAt: Date | null }
export interface ProfileCheck { id: string; source: string; amountCents: number; closedAt: Date }

export interface TimelineEvent { at: Date; kind: "joined" | "booking" | "visit" | "no_show" | "order" | "gift_card" | "message" | "reward" | "consent" | "edit"; title: string; detail?: string }

export interface GuestProfile {
  guest: GuestCore;
  loyalty: { active: boolean; visitsRequired: number; reward: string; towardNext: number | null } | null;
  rewards: ProfileReward[];
  upcoming: ProfileBooking[];
  past: ProfileBooking[];
  orders: ProfileOrder[];
  giftCards: ProfileCard[];
  messages: ProfileMessage[];
  checks: ProfileCheck[];
  timeline: TimelineEvent[];
}

const fmtMoney = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export async function guestProfile(sql: Sql, t: Tenant, guestId: string, now = new Date()): Promise<GuestProfile | null> {
  assertCan(t, "view");
  if (!UUID.test(guestId)) return null;
  const [g] = await sql<{
    id: string; name: string; phone: string; email: string | null; notes: string | null; tags: string[];
    sms_consent_at: Date | null; sms_consent_source: string | null; sms_opted_out_at: Date | null;
    email_consent_at: Date | null; email_consent_source: string | null; email_opted_out_at: Date | null;
    visit_count: number; no_show_count: number; last_visit_at: Date | null; total_spend_cents: string; created_at: Date;
  }[]>`
    select id, name, phone, email, notes, tags, sms_consent_at, sms_consent_source, sms_opted_out_at,
           email_consent_at, email_consent_source, email_opted_out_at, visit_count, no_show_count, last_visit_at, total_spend_cents, created_at
    from guests where id = ${guestId} and org_id = ${t.orgId}`;
  if (!g) return null;
  const email = g.email?.trim().toLowerCase() || null;

  const [bookings, orders, cards, messages, rewards, checks, program, edits] = await Promise.all([
    sql<{ id: string; starts_at: Date; timezone: string; venue: string; party_size: number; status: string; source: string; deposit_cents: number; deposit_status: string; created_at: Date }[]>`
      select r.id, r.starts_at, v.timezone, v.name as venue, r.party_size, r.status, r.source, r.deposit_cents, r.deposit_status, r.created_at
      from reservations r join venues v on v.id = r.venue_id
      where r.org_id = ${t.orgId} and r.guest_id = ${g.id} order by r.starts_at desc limit 200`,
    sql<{ id: string; number: number; kind: string; status: string; payment: string; total_cents: number; ready_at: Date; created_at: Date }[]>`
      select id, number, kind, status, payment, total_cents, ready_at, created_at from orders
      where org_id = ${t.orgId} and guest_id = ${g.id} order by created_at desc limit 100`,
    email
      ? sql<{ id: string; code: string; status: string; initial_cents: number; balance_cents: number; recipient_name: string | null; created_at: Date; bought: boolean }[]>`
          select id, code, status, initial_cents, balance_cents, recipient_name, created_at, lower(purchaser_email) = ${email} as bought
          from gift_cards where org_id = ${t.orgId} and (lower(purchaser_email) = ${email} or lower(recipient_email) = ${email})
          order by created_at desc limit 50`
      : Promise.resolve([]),
    sql<{ id: string; channel: string; kind: string; body: string; status: string; sent_by: string; created_at: Date }[]>`
      select id, channel, kind, body, status, sent_by, created_at from guest_messages
      where org_id = ${t.orgId} and guest_id = ${g.id} order by created_at desc limit 100`,
    sql<{ id: string; reward: string; earned_at_visit: number; earned_at: Date; redeemed_at: Date | null }[]>`
      select id, reward, earned_at_visit, earned_at, redeemed_at from loyalty_rewards
      where org_id = ${t.orgId} and guest_id = ${g.id} order by earned_at desc`,
    sql<{ id: string; source: string; amount_cents: number; closed_at: Date }[]>`
      select id, source, amount_cents, closed_at from guest_checks
      where org_id = ${t.orgId} and guest_id = ${g.id} order by closed_at desc limit 100`,
    sql<{ active: boolean; visits_required: number; reward: string }[]>`
      select active, visits_required, reward from loyalty_programs where org_id = ${t.orgId}`,
    sql<{ actor: string; action: string; detail: Record<string, unknown>; created_at: Date }[]>`
      select actor, action, detail, created_at from change_log
      where org_id = ${t.orgId} and entity = 'guest' and entity_id = ${g.id} order by created_at desc limit 50`,
  ]);

  const guest: GuestCore = {
    id: g.id, name: g.name, phone: g.phone, email: g.email, notes: g.notes, tags: g.tags ?? [],
    smsConsentAt: g.sms_consent_at, smsConsentSource: g.sms_consent_source, smsOptedOutAt: g.sms_opted_out_at,
    emailConsentAt: g.email_consent_at, emailConsentSource: g.email_consent_source, emailOptedOutAt: g.email_opted_out_at,
    visitCount: g.visit_count, noShowCount: g.no_show_count, lastVisitAt: g.last_visit_at,
    totalSpendCents: Number(g.total_spend_cents), createdAt: g.created_at,
  };
  const all: ProfileBooking[] = bookings.map((b) => ({
    id: b.id, startsAt: b.starts_at, timezone: b.timezone, venue: b.venue, partySize: b.party_size, status: b.status,
    source: b.source, depositCents: b.deposit_cents, depositStatus: b.deposit_status, createdAt: b.created_at,
  }));
  const upcoming = all.filter((b) => b.startsAt >= now && ["booked", "confirmed", "seated"].includes(b.status)).reverse();
  const past = all.filter((b) => !upcoming.includes(b));
  const p = program[0];
  const loyalty = p ? {
    active: p.active, visitsRequired: p.visits_required, reward: p.reward,
    towardNext: p.active ? guest.visitCount % p.visits_required : null,
  } : null;

  const profile: Omit<GuestProfile, "timeline"> = {
    guest, loyalty, upcoming, past,
    rewards: rewards.map((r) => ({ id: r.id, reward: r.reward, earnedAtVisit: r.earned_at_visit, earnedAt: r.earned_at, redeemedAt: r.redeemed_at })),
    orders: orders.map((o) => ({ id: o.id, number: o.number, kind: o.kind, status: o.status, payment: o.payment, totalCents: o.total_cents, readyAt: o.ready_at, createdAt: o.created_at })),
    giftCards: cards.map((c) => ({ id: c.id, code: c.code, status: c.status, initialCents: c.initial_cents, balanceCents: c.balance_cents, recipientName: c.recipient_name, createdAt: c.created_at, role: c.bought ? "bought" as const : "received" as const })),
    messages: messages.map((m) => ({ id: m.id, channel: m.channel, kind: m.kind, body: m.body, status: m.status, sentBy: m.sent_by, createdAt: m.created_at })),
    checks: checks.map((c) => ({ id: c.id, source: c.source, amountCents: c.amount_cents, closedAt: c.closed_at })),
  };
  return { ...profile, timeline: buildTimeline(profile, edits, now) };
}

const SOURCE: Record<string, string> = { website: "website", phone: "phone", walk_in: "walk-in", google: "Google", instagram: "Instagram", import: "import", agent: "The Pass", host: "host stand" };
const STATUS: Record<string, string> = { booked: "Booked", confirmed: "Confirmed", seated: "Seated", completed: "Visited", cancelled: "Cancelled", no_show: "No-show" };

/** Everything, newest first. Pure: built from what guestProfile loaded. */
export function buildTimeline(
  p: Omit<GuestProfile, "timeline">,
  edits: { actor: string; action: string; detail: Record<string, unknown>; created_at: Date }[] = [],
  now = new Date(),
): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  const g = p.guest;
  ev.push({ at: g.createdAt, kind: "joined", title: "Added to your guest list" });
  if (g.smsConsentAt) ev.push({ at: g.smsConsentAt, kind: "consent", title: "Agreed to marketing texts", detail: g.smsConsentSource ? `via ${g.smsConsentSource}` : undefined });
  if (g.smsOptedOutAt) ev.push({ at: g.smsOptedOutAt, kind: "consent", title: "Stopped marketing texts" });
  if (g.emailConsentAt) ev.push({ at: g.emailConsentAt, kind: "consent", title: "Agreed to marketing emails", detail: g.emailConsentSource ? `via ${g.emailConsentSource}` : undefined });
  if (g.emailOptedOutAt) ev.push({ at: g.emailOptedOutAt, kind: "consent", title: "Unsubscribed from marketing emails" });
  for (const b of [...p.upcoming, ...p.past]) {
    const kind = b.status === "no_show" ? "no_show" : b.status === "completed" || b.status === "seated" ? "visit" : "booking";
    const ahead = kind === "booking" && b.startsAt > now;
    const at = ahead ? b.createdAt : b.startsAt;
    const prefix = ahead ? "Booked a table" : b.source === "walk_in" ? "Walked in" : STATUS[b.status] ?? b.status;
    ev.push({ at, kind, title: `${prefix}, party of ${b.partySize}`, detail: `${b.venue}${b.source !== "walk_in" ? ` · from ${SOURCE[b.source] ?? b.source}` : ""}${b.depositCents ? ` · ${fmtMoney(b.depositCents)} deposit ${b.depositStatus}` : ""}` });
  }
  for (const c of p.checks) ev.push({ at: c.closedAt, kind: "visit", title: `Paid a ${fmtMoney(c.amountCents)} check`, detail: `from ${c.source}` });
  for (const o of p.orders) ev.push({ at: o.createdAt, kind: "order", title: `${o.kind === "catering" ? "Catering" : "Pickup"} order ${o.number}, ${fmtMoney(o.totalCents)}`, detail: `${o.status.replace("_", " ")} · ${o.payment === "paid" ? "paid online" : o.payment === "at_pickup" ? "pay at pickup" : o.payment}` });
  for (const c of p.giftCards) ev.push({ at: c.createdAt, kind: "gift_card", title: c.role === "bought" ? `Bought a ${fmtMoney(c.initialCents)} gift card` : `Received a ${fmtMoney(c.initialCents)} gift card`, detail: `${c.code} · ${fmtMoney(c.balanceCents)} left · ${c.status}` });
  for (const m of p.messages) ev.push({ at: m.createdAt, kind: "message", title: `${m.channel === "email" ? "Email" : "Text"}: ${m.kind === "marketing" ? "marketing" : "about their booking or order"}`, detail: `${m.status === "sent" ? "Sent" : m.status === "dry_run" ? "Not sent (no provider)" : "Failed"} · ${m.body.slice(0, 120)}` });
  for (const r of p.rewards) {
    ev.push({ at: r.earnedAt, kind: "reward", title: `Earned ${r.reward}`, detail: `at visit ${r.earnedAtVisit}` });
    if (r.redeemedAt) ev.push({ at: r.redeemedAt, kind: "reward", title: `Redeemed ${r.reward}` });
  }
  for (const e of edits) {
    const fields = Array.isArray(e.detail?.fields) ? (e.detail.fields as string[]).join(", ") : null;
    ev.push({ at: e.created_at, kind: "edit", title: e.action === "guest.updated" ? `Profile edited${fields ? `: ${fields}` : ""}` : e.action, detail: `by ${actorLabel(e.actor)}` });
  }
  return ev.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/* --------------------------------------------------------------- edit -- */

export interface GuestEdit { name: string; email: string; notes: string; tags: string }

/** "regular, VIP,  vip , shellfish allergy" → ["regular", "VIP", "shellfish allergy"]. */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
  }
  return out.slice(0, 20);
}

export type EditResult = { ok: true; changed: string[] } | { ok: false; error: string };

/** Name, email, tags and notes. Phone is the guest's identity and isn't edited here. */
export async function updateGuest(sql: Sql, t: Tenant, guestId: string, e: GuestEdit): Promise<EditResult> {
  assertCan(t, "manage_venue");
  if (!UUID.test(guestId)) return { ok: false, error: "Guest not found." };
  const name = e.name.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!name) return { ok: false, error: "Add the guest's name." };
  const email = e.email.trim().toLowerCase() || null;
  if (email && !EMAIL.test(email)) return { ok: false, error: "That email doesn't look right." };
  const notes = e.notes.trim().slice(0, 2000) || null;
  const tags = parseTags(e.tags);

  return sql.begin(async (tx): Promise<EditResult> => {
    const [before] = await tx<{ name: string; email: string | null; notes: string | null; tags: string[] }[]>`
      select name, email, notes, tags from guests where id = ${guestId} and org_id = ${t.orgId} for update`;
    if (!before) return { ok: false, error: "Guest not found." };
    const after = { name, email, notes, tags };
    const changed = (Object.keys(after) as (keyof typeof after)[]).filter((k) => JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null));
    if (!changed.length) return { ok: true, changed };
    await tx`update guests set name = ${name}, email = ${email}, notes = ${notes}, tags = ${tags} where id = ${guestId} and org_id = ${t.orgId}`;
    await log(tx, t.orgId, t.actor, "guest.updated", "guest", guestId, {
      fields: changed,
      before: Object.fromEntries(changed.map((k) => [k, before[k] ?? null])),
      after: Object.fromEntries(changed.map((k) => [k, after[k]])),
    });
    return { ok: true, changed };
  });
}
