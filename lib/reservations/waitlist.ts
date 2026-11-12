import type { Sql } from "postgres";
import { normalizePhone } from "../guests/phone";
import { sendSms, type SmsSender } from "../messaging/sms";
import { assertCan, type Tenant } from "../platform/tenant";
import { roundQuote, STALE_SEATED_HOURS } from "./floor";
import { log, seatWalkIn, type WalkInResult } from "./repo";

/**
 * The host stand's waitlist: parties standing at the door with a quoted
 * wait (walkin_waitlist), next to today's online "text me if a table
 * opens" sign-ups (waitlist_requests). Texts here are transactional —
 * about the guest's own place in line — and recorded in guest_messages.
 */

export interface WaitingParty {
  id: string;
  name: string;
  phone: string | null;
  partySize: number;
  quotedMinutes: number;
  textedAt: Date | null;
  createdAt: Date;
}

export type AddResult = { ok: true; id: string } | { ok: false; reason: "invalid_phone" | "invalid" };

export async function addToWaitlist(
  sql: Sql, tenant: Tenant,
  input: { venueId: string; name: string; phone: string; partySize: number; quotedMinutes: number },
): Promise<AddResult> {
  assertCan(tenant, "book", input.venueId);
  const phone = input.phone.trim() ? normalizePhone(input.phone) : null;
  if (input.phone.trim() && !phone) return { ok: false, reason: "invalid_phone" };
  const name = input.name.trim().slice(0, 120) || "Walk-in";
  if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > 30) return { ok: false, reason: "invalid" };
  if (!Number.isInteger(input.quotedMinutes) || input.quotedMinutes < 0 || input.quotedMinutes > 240) return { ok: false, reason: "invalid" };
  const [v] = await sql`select 1 from venues where id = ${input.venueId} and org_id = ${tenant.orgId}`;
  if (!v) return { ok: false, reason: "invalid" };
  const [w] = await sql<{ id: string }[]>`
    insert into walkin_waitlist (org_id, venue_id, name, phone, party_size, quoted_minutes, created_by)
    values (${tenant.orgId}, ${input.venueId}, ${name}, ${phone}, ${input.partySize}, ${input.quotedMinutes}, ${tenant.actor})
    returning id`;
  await log(sql, tenant.orgId, tenant.actor, "waitlist.added", "waitlist", w.id, { partySize: input.partySize, quotedMinutes: input.quotedMinutes });
  return { ok: true, id: w.id };
}

/** Who is waiting at the door, first come first. Drops parties added more than 12 hours ago. */
export async function waitingList(sql: Sql, tenant: Tenant, venueId: string, now = new Date()): Promise<WaitingParty[]> {
  assertCan(tenant, "view", venueId);
  const rows = await sql<{ id: string; name: string; phone: string | null; party_size: number; quoted_minutes: number; texted_at: Date | null; created_at: Date }[]>`
    select id, name, phone, party_size, quoted_minutes, texted_at, created_at from walkin_waitlist
    where org_id = ${tenant.orgId} and venue_id = ${venueId} and status = 'waiting'
      and created_at > ${new Date(now.getTime() - 12 * 3_600_000)}
    order by created_at`;
  return rows.map((r) => ({
    id: r.id, name: r.name, phone: r.phone, partySize: r.party_size, quotedMinutes: r.quoted_minutes,
    textedAt: r.texted_at, createdAt: r.created_at,
  }));
}

async function entry(sql: Sql, tenant: Tenant, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [w] = await sql<{ id: string; venue_id: string; name: string; phone: string | null; party_size: number; status: string }[]>`
    select id, venue_id, name, phone, party_size, status from walkin_waitlist where id = ${id} and org_id = ${tenant.orgId}`;
  if (w) assertCan(tenant, "book", w.venue_id);
  return w ?? null;
}

async function recordText(sql: Sql, tenant: Tenant, phone: string, name: string, body: string, r: Awaited<ReturnType<SmsSender>>) {
  const [g] = await sql<{ id: string }[]>`
    insert into guests (org_id, phone, name) values (${tenant.orgId}, ${phone}, ${name})
    on conflict (org_id, phone) do update set name = guests.name returning id`;
  await sql`
    insert into guest_messages (org_id, guest_id, kind, body, status, provider_id, error, sent_by)
    values (${tenant.orgId}, ${g.id}, 'transactional', ${body}, ${r.status},
            ${r.status === "sent" ? r.providerId : null}, ${r.status === "failed" ? r.error : null}, ${tenant.actor})`;
}

export type TextResult = "ok" | "not_found" | "no_phone" | "failed";

/** "Your table is ready." Dry run when texting isn't set up. */
export async function textTableReady(
  sql: Sql, tenant: Tenant, id: string, opts: { restaurant: string; sender?: SmsSender },
): Promise<TextResult> {
  const w = await entry(sql, tenant, id);
  if (!w || w.status !== "waiting") return "not_found";
  if (!w.phone) return "no_phone";
  const body = `${opts.restaurant}: your table for ${w.party_size} is ready. Please come to the host stand.`;
  const r = await (opts.sender ?? sendSms)(w.phone, body);
  await recordText(sql, tenant, w.phone, w.name, body, r);
  if (r.status === "failed") return "failed";
  await sql`update walkin_waitlist set texted_at = now(), updated_at = now() where id = ${w.id}`;
  await log(sql, tenant.orgId, tenant.actor, "waitlist.texted", "waitlist", w.id, { status: r.status });
  return "ok";
}

export type SeatFromWaitlist = WalkInResult | { ok: false; reason: "not_found" };

/** Seat a waiting party now — on the table the host chose, or the best free one. */
export async function seatFromWaitlist(
  sql: Sql, tenant: Tenant, id: string, opts: { tableId?: string; now?: Date } = {},
): Promise<SeatFromWaitlist> {
  const w = await entry(sql, tenant, id);
  if (!w) return { ok: false, reason: "not_found" };
  // Claim first, so a double tap can't seat them twice.
  const claimed = await sql`update walkin_waitlist set status = 'seated', updated_at = now()
                            where id = ${w.id} and status = 'waiting' returning id`;
  if (!claimed.length) return { ok: false, reason: "not_found" };
  const r = await seatWalkIn(sql, tenant, {
    venueId: w.venue_id, partySize: w.party_size, name: w.name, phone: w.phone ?? "", now: opts.now, tableId: opts.tableId,
  });
  if (!r.ok) {
    await sql`update walkin_waitlist set status = 'waiting', updated_at = now() where id = ${w.id}`;
    return r;
  }
  await sql`update walkin_waitlist set reservation_id = ${r.reservationId} where id = ${w.id}`;
  await log(sql, tenant.orgId, tenant.actor, "waitlist.seated", "waitlist", w.id, { reservationId: r.reservationId, table: r.tableLabel });
  return r;
}

export async function removeFromWaitlist(sql: Sql, tenant: Tenant, id: string): Promise<boolean> {
  const w = await entry(sql, tenant, id);
  if (!w) return false;
  const done = await sql`update walkin_waitlist set status = 'removed', updated_at = now()
                         where id = ${w.id} and status = 'waiting' returning id`;
  if (done.length) await log(sql, tenant.orgId, tenant.actor, "waitlist.removed", "waitlist", w.id, {});
  return done.length > 0;
}

/**
 * A fair quote for a party that doesn't fit now: when the soonest table
 * that fits them frees up, rounded to 5 minutes (5–120). A seated party
 * past their turn counts as leaving in 10 minutes. Null when no table at
 * the venue could ever take them.
 */
export async function quoteWait(sql: Sql, tenant: Tenant, venueId: string, partySize: number, now = new Date()): Promise<number | null> {
  assertCan(tenant, "view", venueId);
  const soon = new Date(now.getTime() + 15 * 60_000);
  const rows = await sql<{ id: string; free_at: Date | null; seated_over: boolean }[]>`
    select t.id,
           max(upper(rt.during)) filter (where rt.table_id is not null) as free_at,
           coalesce(bool_or(r.status = 'seated' and upper(rt.during) <= ${now}), false) as seated_over
    from dining_tables t
    left join reservation_tables rt on rt.table_id = t.id and rt.live and lower(rt.during) <= ${soon}
      and upper(rt.during) > ${new Date(now.getTime() - STALE_SEATED_HOURS * 3_600_000)}
    left join reservations r on r.id = rt.reservation_id
    where t.venue_id = ${venueId} and t.org_id = ${tenant.orgId} and t.active
      and t.max_covers >= ${partySize} and t.min_covers <= ${partySize}
    group by t.id`;
  if (!rows.length) return null;
  const waits = rows.map((r) => {
    const until = r.free_at && r.free_at > now ? (r.free_at.getTime() - now.getTime()) / 60_000 : 0;
    return Math.max(until, r.seated_over ? 10 : 0);
  });
  return roundQuote(Math.min(...waits));
}

/* -------------------------------------- online "text me" sign-ups --- */

export interface NotifyRequest {
  id: string;
  name: string;
  phone: string;
  partySize: number;
  status: "waiting" | "notified";
  notifiedAt: Date | null;
  createdAt: Date;
}

export async function todaysRequests(sql: Sql, tenant: Tenant, venueId: string, date: string): Promise<NotifyRequest[]> {
  assertCan(tenant, "view", venueId);
  const rows = await sql<{ id: string; name: string; phone: string; party_size: number; status: "waiting" | "notified"; notified_at: Date | null; created_at: Date }[]>`
    select id, name, phone, party_size, status, notified_at, created_at from waitlist_requests
    where org_id = ${tenant.orgId} and venue_id = ${venueId} and date = ${date} and status in ('waiting', 'notified')
    order by created_at`;
  return rows.map((r) => ({
    id: r.id, name: r.name, phone: r.phone, partySize: r.party_size, status: r.status, notifiedAt: r.notified_at, createdAt: r.created_at,
  }));
}

/** The host texts an online sign-up that a table has opened. */
export async function notifyRequest(
  sql: Sql, tenant: Tenant, id: string, opts: { restaurant: string; baseUrl: string; sender?: SmsSender },
): Promise<TextResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return "not_found";
  const [w] = await sql<{ id: string; venue_id: string; name: string; phone: string; party_size: number; date: string; slug: string | null }[]>`
    select w.id, w.venue_id, w.name, w.phone, w.party_size, to_char(w.date, 'YYYY-MM-DD') as date, s.slug
    from waitlist_requests w left join sites s on s.venue_id = w.venue_id
    where w.id = ${id} and w.org_id = ${tenant.orgId} and w.status in ('waiting', 'notified')`;
  if (!w) return "not_found";
  assertCan(tenant, "book", w.venue_id);
  const link = w.slug ? ` Book it here: ${opts.baseUrl}/s/${w.slug}/reserve?date=${w.date}&party=${w.party_size}` : " Call us to grab it.";
  const body = `${opts.restaurant}: a table for ${w.party_size} just opened today.${link}`;
  const r = await (opts.sender ?? sendSms)(w.phone, body);
  await recordText(sql, tenant, w.phone, w.name, body, r);
  if (r.status === "failed") return "failed";
  await sql`update waitlist_requests set status = 'notified', notified_at = now() where id = ${w.id}`;
  await log(sql, tenant.orgId, tenant.actor, "waitlist.notified", "waitlist_request", w.id, { status: r.status });
  return "ok";
}
