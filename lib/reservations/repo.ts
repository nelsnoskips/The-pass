import { randomBytes, randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { assertCan, type Tenant } from "../platform/tenant";
import {
  findSlots,
  pickTable,
  turnFor,
  type BookingStart,
  type Channel,
  type Hold,
  type ServicePeriod,
  type Slot,
  type Table,
  type VenueRules,
} from "./availability";
import { localDate as localDateOf, zonedToUtc } from "./time";

/**
 * Reservations, in the database. Every function is scoped by org_id —
 * a reservation id from another org simply isn't found.
 */

type Q = Sql | TransactionSql;

export type ReservationStatus =
  | "booked" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";

export interface Reservation {
  id: string;
  venueId: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  startsAt: Date;
  endsAt: Date;
  status: ReservationStatus;
  source: string;
  notes: string | null;
  depositCents: number;
  manageToken: string;
  tableLabels: string[];
  /** Completed visits and no-shows before this booking. */
  guestVisits: number;
  guestNoShows: number;
  depositStatus?: string;
}

/** Statuses that hold a table. */
const LIVE: ReservationStatus[] = ["booked", "confirmed", "seated"];

/** US-default E.164. Returns null for anything that can't be a phone. */
export function normalizePhone(raw: string): string | null {
  const plus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (plus) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

interface Bundle {
  venue: VenueRules & { id: string };
  periods: ServicePeriod[];
  tables: Table[];
  holds: Hold[];
  bookings: BookingStart[];
  closed: boolean;
}

async function loadBundle(
  q: Q, orgId: string, venueId: string, date: string,
  /** A booking being moved: its own seat and pacing don't count against it. */
  exclude: string | null = null,
): Promise<Bundle | null> {
  const [v] = await q<{
    id: string; timezone: string; booking_horizon_days: number;
    min_notice_minutes: number; max_party_online: number;
  }[]>`
    select id, timezone, booking_horizon_days, min_notice_minutes, max_party_online
    from venues where id = ${venueId} and org_id = ${orgId}
  `;
  if (!v) return null;

  // The whole local day plus the longest turn either side covers every
  // hold that could touch a seating on this date.
  const dayStart = zonedToUtc(date, "00:00", v.timezone);
  const from = new Date(dayStart.getTime() - 6 * 3_600_000);
  const to = new Date(dayStart.getTime() + 30 * 3_600_000);

  const [periods, tables, holds, bookings, closures] = await Promise.all([
    q<{
      id: string; name: string; days_of_week: number[]; first_seating: string;
      last_seating: string; slot_minutes: number; turn_minutes: Record<string, number>;
      max_covers_per_slot: number | null; deposit_cents_per_cover: number;
    }[]>`select * from service_periods where venue_id = ${venueId} and org_id = ${orgId}`,
    q<{ id: string; label: string; min_covers: number; max_covers: number; online: boolean; active: boolean }[]>`
      select id, label, min_covers, max_covers, online, active
      from dining_tables where venue_id = ${venueId} and org_id = ${orgId}`,
    q<{ table_id: string; start: Date; end: Date }[]>`
      select rt.table_id, lower(rt.during) as start, upper(rt.during) as end
      from reservation_tables rt
      join dining_tables t on t.id = rt.table_id
      where t.venue_id = ${venueId} and rt.org_id = ${orgId} and rt.live
        and rt.during && tstzrange(${from}, ${to})
        ${exclude ? q`and rt.reservation_id <> ${exclude}` : q``}`,
    q<{ starts_at: Date; party_size: number }[]>`
      select starts_at, party_size from reservations
      where venue_id = ${venueId} and org_id = ${orgId}
        and status = any(${LIVE}::reservation_status[])
        and starts_at >= ${from} and starts_at < ${to}
        ${exclude ? q`and id <> ${exclude}` : q``}`,
    q`select 1 from venue_closures where venue_id = ${venueId} and org_id = ${orgId} and date = ${date}`,
  ]);

  return {
    venue: {
      id: v.id,
      timezone: v.timezone,
      bookingHorizonDays: v.booking_horizon_days,
      minNoticeMinutes: v.min_notice_minutes,
      maxPartyOnline: v.max_party_online,
    },
    periods: periods.map((p) => ({
      id: p.id,
      name: p.name,
      daysOfWeek: p.days_of_week.map(Number),
      firstSeating: p.first_seating.slice(0, 5),
      lastSeating: p.last_seating.slice(0, 5),
      slotMinutes: p.slot_minutes,
      turnMinutes: p.turn_minutes,
      maxCoversPerSlot: p.max_covers_per_slot,
      depositCentsPerCover: p.deposit_cents_per_cover,
    })),
    tables: tables.map((t) => ({
      id: t.id, label: t.label, minCovers: t.min_covers, maxCovers: t.max_covers,
      online: t.online, active: t.active,
    })),
    holds: holds.map((h) => ({ tableId: h.table_id, start: h.start, end: h.end })),
    bookings: bookings.map((b) => ({ startsAt: b.starts_at, partySize: b.party_size })),
    closed: closures.length > 0,
  };
}

export async function availableSlots(
  sql: Sql,
  input: { orgId: string; venueId: string; date: string; partySize: number; channel: Channel; now?: Date; exclude?: string },
): Promise<Slot[]> {
  const b = await loadBundle(sql, input.orgId, input.venueId, input.date, input.exclude ?? null);
  if (!b) return [];
  return findSlots({ ...b, date: input.date, partySize: input.partySize, channel: input.channel, now: input.now ?? new Date() });
}

export interface BookInput {
  orgId: string;
  venueId: string;
  date: string;
  /** "HH:MM", venue-local. */
  time: string;
  partySize: number;
  guest: { name: string; phone: string; email?: string | null; smsMarketingConsent?: boolean };
  source: string;
  notes?: string | null;
  /** Email of the staff member, or "guest". */
  actor: string;
  channel: Channel;
  now?: Date;
}

export type BookResult =
  | { ok: true; reservation: Reservation }
  | { ok: false; reason: "invalid_phone" | "invalid_name" | "unavailable" | "venue_not_found" | "already_booked" | "too_many" };

/**
 * Book a table. The slot is re-checked inside the transaction, and the
 * exclusion constraint settles any race: if another booking took the
 * table between our read and our write, we retry and the engine picks
 * the next table that fits — or reports the time as gone.
 */
export async function book(sql: Sql, input: BookInput): Promise<BookResult> {
  // A walk-in at the host stand may have no phone. They get a guest
  // record that can never be texted (no "+"), rather than a fake number.
  const staffNoPhone = input.channel === "staff" && !input.guest.phone.trim();
  const phone = staffNoPhone ? `none:${randomUUID()}` : normalizePhone(input.guest.phone);
  if (!phone) return { ok: false, reason: "invalid_phone" };
  const name = input.guest.name.trim();
  if (!name) return { ok: false, reason: "invalid_name" };

  // Online, a booking belongs to a phone number, and a phone number gets
  // one table per service day and a handful of attempts an hour. This is
  // what makes hoarding tables to resell tedious; staff are not limited.
  if (input.channel === "online") {
    const limited = await onlineLimits(sql, input.orgId, input.venueId, phone, input.date);
    if (limited) return { ok: false, reason: limited };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await sql.begin(async (tx) => {
        const b = await loadBundle(tx, input.orgId, input.venueId, input.date);
        if (!b) return { ok: false as const, reason: "venue_not_found" as const };
        const slot = findSlots({
          ...b, date: input.date, partySize: input.partySize,
          channel: input.channel, now: input.now ?? new Date(),
        }).find((s) => s.time === input.time);
        if (!slot) return { ok: false as const, reason: "unavailable" as const };

        const consent = input.guest.smsMarketingConsent === true;
        const [guest] = await tx<{ id: string; name: string; phone: string }[]>`
          insert into guests (org_id, phone, name, email, sms_consent_at, sms_consent_source)
          values (${input.orgId}, ${phone}, ${name}, ${input.guest.email ?? null},
                  ${consent ? new Date() : null}, ${consent ? `booking:${input.source}` : null})
          on conflict (org_id, phone) do update set
            name = excluded.name,
            email = coalesce(excluded.email, guests.email),
            sms_consent_at = coalesce(guests.sms_consent_at, excluded.sms_consent_at),
            sms_consent_source = coalesce(guests.sms_consent_source, excluded.sms_consent_source)
          returning id, name, phone
        `;

        const token = randomBytes(18).toString("base64url");
        const [r] = await tx<{ id: string; created_at: Date }[]>`
          insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at,
                                    source, notes, deposit_cents, deposit_status, manage_token)
          values (${input.orgId}, ${input.venueId}, ${guest.id}, ${input.partySize},
                  ${slot.startsAt}, ${slot.endsAt}, ${input.source}, ${input.notes ?? null},
                  ${slot.depositCents}, ${slot.depositCents > 0 ? "pending" : "none"}, ${token})
          returning id, created_at
        `;
        await tx`
          insert into reservation_tables (reservation_id, table_id, org_id, during)
          values (${r.id}, ${slot.tableId}, ${input.orgId}, tstzrange(${slot.startsAt}, ${slot.endsAt}, '[)'))
        `;
        await log(tx, input.orgId, input.actor, "reservation.created", "reservation", r.id, {
          partySize: input.partySize, startsAt: slot.startsAt, tableId: slot.tableId, source: input.source,
        });

        const table = b.tables.find((t) => t.id === slot.tableId)!;
        return {
          ok: true as const,
          reservation: {
            id: r.id, venueId: input.venueId, guestId: guest.id, guestName: guest.name,
            guestPhone: guest.phone, partySize: input.partySize, startsAt: slot.startsAt,
            endsAt: slot.endsAt, status: "booked" as const, source: input.source,
            notes: input.notes ?? null, depositCents: slot.depositCents, manageToken: token,
            tableLabels: [table.label], guestVisits: 0, guestNoShows: 0,
          },
        };
      });
      return result;
    } catch (err) {
      // 23P01: exclusion_violation — someone else got the table first.
      if ((err as { code?: string }).code === "23P01" && attempt < 2) continue;
      if ((err as { code?: string }).code === "23P01") return { ok: false, reason: "unavailable" };
      throw err;
    }
  }
  return { ok: false, reason: "unavailable" };
}

const MAX_BOOKINGS_PER_PHONE_PER_HOUR = 4;

async function onlineLimits(
  sql: Sql, orgId: string, venueId: string, phone: string, date: string,
): Promise<"already_booked" | "too_many" | null> {
  const [v] = await sql<{ timezone: string }[]>`
    select timezone from venues where id = ${venueId} and org_id = ${orgId}`;
  if (!v) return null;
  const from = zonedToUtc(date, "00:00", v.timezone);
  const to = new Date(from.getTime() + 24 * 3_600_000);
  const [row] = await sql<{ same_day: number; last_hour: number }[]>`
    select
      count(*) filter (where r.venue_id = ${venueId} and r.status = any(${LIVE}::reservation_status[])
                         and r.starts_at >= ${from} and r.starts_at < ${to})::int as same_day,
      count(*) filter (where r.created_at > now() - interval '1 hour')::int as last_hour
    from reservations r join guests g on g.id = r.guest_id
    where r.org_id = ${orgId} and g.phone = ${phone}`;
  if (row.same_day > 0) return "already_booked";
  if (row.last_hour >= MAX_BOOKINGS_PER_PHONE_PER_HOUR) return "too_many";
  return null;
}

/** Status changes from the host stand. */
/**
 * Which status may follow which. Enforced here, not in any screen, so a
 * party that sat down can never later be charged as a no-show, and a
 * released table can't be quietly re-held.
 */
const NEXT: Record<ReservationStatus, ReservationStatus[]> = {
  booked: ["confirmed", "seated", "no_show", "cancelled"],
  confirmed: ["seated", "no_show", "cancelled"],
  seated: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export type StatusResult = "ok" | "not_found" | "invalid";

export async function setStatus(
  sql: Sql,
  tenant: Tenant,
  reservationId: string,
  status: ReservationStatus,
): Promise<StatusResult> {
  return sql.begin(async (tx): Promise<StatusResult> => {
    const [r] = await tx<{ venue_id: string; guest_id: string; status: ReservationStatus }[]>`
      select venue_id, guest_id, status from reservations
      where id = ${reservationId} and org_id = ${tenant.orgId}
      for update
    `;
    if (!r) return "not_found";
    assertCan(tenant, "book", r.venue_id);
    if (r.status === status) return "ok";
    if (!NEXT[r.status].includes(status)) return "invalid";

    await tx`update reservations set status = ${status}, updated_at = now()
             where id = ${reservationId} and org_id = ${tenant.orgId}`;
    if (!LIVE.includes(status)) {
      await tx`update reservation_tables set live = false
               where reservation_id = ${reservationId} and org_id = ${tenant.orgId}`;
    }
    if (status === "completed" && r.status !== "completed") {
      await tx`update guests set visit_count = visit_count + 1, last_visit_at = now()
               where id = ${r.guest_id} and org_id = ${tenant.orgId}`;
    }
    if (status === "no_show" && r.status !== "no_show") {
      await tx`update guests set no_show_count = no_show_count + 1
               where id = ${r.guest_id} and org_id = ${tenant.orgId}`;
    }
    await log(tx, tenant.orgId, tenant.actor, `reservation.${status}`, "reservation", reservationId, { from: r.status });
    return "ok" as const;
  });
}

/** A guest cancelling from their own link. */
export async function cancelByToken(sql: Sql, token: string): Promise<boolean> {
  return sql.begin(async (tx) => {
    const [r] = await tx<{ id: string; org_id: string; status: ReservationStatus }[]>`
      select id, org_id, status from reservations where manage_token = ${token} for update
    `;
    if (!r || !LIVE.includes(r.status) || r.status === "seated") return false;
    await tx`update reservations set status = 'cancelled', updated_at = now() where id = ${r.id}`;
    await tx`update reservation_tables set live = false where reservation_id = ${r.id}`;
    await log(tx, r.org_id, "guest", "reservation.cancelled", "reservation", r.id, { from: r.status });
    return true;
  });
}

/** The host stand's book for one local day. */
export async function dayBook(sql: Sql, tenant: Tenant, venueId: string, date: string): Promise<Reservation[]> {
  assertCan(tenant, "view", venueId);
  const [v] = await sql<{ timezone: string }[]>`
    select timezone from venues where id = ${venueId} and org_id = ${tenant.orgId}`;
  if (!v) return [];
  const from = zonedToUtc(date, "00:00", v.timezone);
  const to = new Date(from.getTime() + 24 * 3_600_000);
  const rows = await sql<{
    id: string; venue_id: string; guest_id: string; name: string; phone: string;
    party_size: number; starts_at: Date; ends_at: Date; status: ReservationStatus;
    source: string; notes: string | null; deposit_cents: number; manage_token: string;
    labels: string[] | null; visit_count: number; no_show_count: number; deposit_status: string;
  }[]>`
    select r.id, r.venue_id, r.guest_id, g.name, g.phone, r.party_size, r.starts_at, r.ends_at,
           r.status, r.source, r.notes, r.deposit_cents, r.manage_token, g.visit_count, g.no_show_count, r.deposit_status,
           array_agg(t.label order by t.label) filter (where t.label is not null) as labels
    from reservations r
    join guests g on g.id = r.guest_id
    left join reservation_tables rt on rt.reservation_id = r.id
    left join dining_tables t on t.id = rt.table_id
    where r.org_id = ${tenant.orgId} and r.venue_id = ${venueId}
      and r.starts_at >= ${from} and r.starts_at < ${to}
    group by r.id, g.name, g.phone, g.visit_count, g.no_show_count
    order by r.starts_at, g.name
  `;
  return rows.map((r) => ({
    id: r.id, venueId: r.venue_id, guestId: r.guest_id, guestName: r.name, guestPhone: r.phone,
    partySize: r.party_size, startsAt: r.starts_at, endsAt: r.ends_at, status: r.status,
    source: r.source, notes: r.notes, depositCents: r.deposit_cents, manageToken: r.manage_token,
    tableLabels: r.labels ?? [], guestVisits: r.visit_count, guestNoShows: r.no_show_count,
    depositStatus: r.deposit_status,
  }));
}

export async function log(
  q: Q, orgId: string, actor: string, action: string, entity: string,
  entityId: string | null, detail: Record<string, unknown> = {},
) {
  await q`insert into change_log (org_id, actor, action, entity, entity_id, detail)
          values (${orgId}, ${actor}, ${action}, ${entity}, ${entityId}, ${q.json(detail as never)})`;
}

// Re-exported for callers that seat walk-ins on a specific table.
export { pickTable, turnFor };

/** What a guest sees from their own link. */
export interface GuestBooking {
  id: string;
  orgId: string;
  venueId: string;
  venueName: string;
  timezone: string;
  guestName: string;
  partySize: number;
  startsAt: Date;
  status: ReservationStatus;
  notes: string | null;
}

export async function bookingByToken(sql: Sql, token: string): Promise<GuestBooking | null> {
  if (!token || token.length > 64) return null;
  const [r] = await sql<{
    id: string; org_id: string; venue_id: string; venue_name: string; timezone: string;
    name: string; party_size: number; starts_at: Date; status: ReservationStatus; notes: string | null;
  }[]>`
    select r.id, r.org_id, r.venue_id, v.name as venue_name, v.timezone, g.name,
           r.party_size, r.starts_at, r.status, r.notes
    from reservations r
    join venues v on v.id = r.venue_id
    join guests g on g.id = r.guest_id
    where r.manage_token = ${token}`;
  if (!r) return null;
  return {
    id: r.id, orgId: r.org_id, venueId: r.venue_id, venueName: r.venue_name, timezone: r.timezone,
    guestName: r.name, partySize: r.party_size, startsAt: r.starts_at, status: r.status, notes: r.notes,
  };
}

export type WalkInResult =
  | { ok: true; reservationId: string; tableLabel: string }
  | { ok: false; reason: "no_table" | "invalid_name" | "invalid_phone" | "venue_not_found" };

/**
 * Seat a walk-in now, on the best free table for the whole turn. Staff
 * only, so staff-held tables (the bar) count, and there is no slot grid:
 * a walk-in arrives when they arrive.
 */
export async function seatWalkIn(
  sql: Sql,
  tenant: Tenant,
  input: { venueId: string; partySize: number; name: string; phone: string; now?: Date },
): Promise<WalkInResult> {
  assertCan(tenant, "book", input.venueId);
  const name = input.name.trim() || "Walk-in";
  const phone = input.phone.trim() ? normalizePhone(input.phone) : `none:${randomUUID()}`;
  if (!phone) return { ok: false, reason: "invalid_phone" };
  const now = input.now ?? new Date();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await sql.begin(async (tx) => {
        const [v] = await tx<{ timezone: string }[]>`
          select timezone from venues where id = ${input.venueId} and org_id = ${tenant.orgId}`;
        if (!v) return { ok: false as const, reason: "venue_not_found" as const };
        const b = await loadBundle(tx, tenant.orgId, input.venueId, localDateOf(now, v.timezone));
        if (!b) return { ok: false as const, reason: "venue_not_found" as const };
        const period = b.periods[0];
        const turn = period ? turnFor(period, input.partySize) : 90;
        const end = new Date(now.getTime() + turn * 60_000);
        const table = pickTable(b.tables, b.holds, input.partySize, now, end, "staff");
        if (!table) return { ok: false as const, reason: "no_table" as const };

        const [g] = await tx<{ id: string }[]>`
          insert into guests (org_id, phone, name) values (${tenant.orgId}, ${phone}, ${name})
          on conflict (org_id, phone) do update set name = excluded.name
          returning id`;
        const [r] = await tx<{ id: string }[]>`
          insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, status, source, manage_token)
          values (${tenant.orgId}, ${input.venueId}, ${g.id}, ${input.partySize}, ${now}, ${end}, 'seated', 'walk_in',
                  ${randomBytes(18).toString("base64url")})
          returning id`;
        await tx`insert into reservation_tables (reservation_id, table_id, org_id, during)
                 values (${r.id}, ${table.id}, ${tenant.orgId}, tstzrange(${now}, ${end}, '[)'))`;
        await log(tx, tenant.orgId, tenant.actor, "reservation.walk_in", "reservation", r.id, { partySize: input.partySize, tableId: table.id });
        return { ok: true as const, reservationId: r.id, tableLabel: table.label };
      });
    } catch (err) {
      if ((err as { code?: string }).code === "23P01" && attempt < 2) continue;
      if ((err as { code?: string }).code === "23P01") return { ok: false, reason: "no_table" };
      throw err;
    }
  }
  return { ok: false, reason: "no_table" };
}

export interface VenueSummary {
  id: string;
  name: string;
  timezone: string;
}

export async function venuesFor(sql: Sql, tenant: Tenant): Promise<VenueSummary[]> {
  const rows = await sql<VenueSummary[]>`
    select id, name, timezone from venues where org_id = ${tenant.orgId} order by name`;
  return rows.filter((v) => tenant.venueIds === null || tenant.venueIds.includes(v.id));
}


export type ModifyResult =
  | { ok: true; startsAt: Date; partySize: number; tableLabel: string }
  | { ok: false; reason: "not_found" | "not_changeable" | "unavailable" };

/**
 * A guest moving their own booking — new day, time or party size — in
 * one step. The old table is held until the new one is secured: if the
 * new time isn't available, nothing changes.
 */
export async function modifyByToken(
  sql: Sql,
  token: string,
  change: { date: string; time: string; partySize: number },
  now = new Date(),
): Promise<ModifyResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await sql.begin(async (tx): Promise<ModifyResult> => {
        const [r] = await tx<{ id: string; org_id: string; venue_id: string; status: ReservationStatus; party_size: number; starts_at: Date }[]>`
          select id, org_id, venue_id, status, party_size, starts_at from reservations
          where manage_token = ${token} for update`;
        if (!r) return { ok: false, reason: "not_found" };
        if (r.status !== "booked" && r.status !== "confirmed") return { ok: false, reason: "not_changeable" };

        const b = await loadBundle(tx, r.org_id, r.venue_id, change.date, r.id);
        if (!b) return { ok: false, reason: "not_found" };
        const slot = findSlots({ ...b, date: change.date, partySize: change.partySize, channel: "online", now })
          .find((s) => s.time === change.time);
        if (!slot) return { ok: false, reason: "unavailable" };

        await tx`update reservation_tables set live = false where reservation_id = ${r.id}`;
        await tx`delete from reservation_tables where reservation_id = ${r.id} and table_id = ${slot.tableId}`;
        await tx`insert into reservation_tables (reservation_id, table_id, org_id, during)
                 values (${r.id}, ${slot.tableId}, ${r.org_id}, tstzrange(${slot.startsAt}, ${slot.endsAt}, '[)'))`;
        await tx`update reservations set starts_at = ${slot.startsAt}, ends_at = ${slot.endsAt},
                   party_size = ${change.partySize}, deposit_cents = ${slot.depositCents},
                   reminder_sent_at = null, updated_at = now()
                 where id = ${r.id}`;
        await log(tx, r.org_id, "guest", "reservation.modified", "reservation", r.id, {
          from: { startsAt: r.starts_at, partySize: r.party_size },
          to: { startsAt: slot.startsAt, partySize: change.partySize, tableId: slot.tableId },
        });
        const table = b.tables.find((t) => t.id === slot.tableId)!;
        return { ok: true, startsAt: slot.startsAt, partySize: change.partySize, tableLabel: table.label };
      });
    } catch (err) {
      if ((err as { code?: string }).code === "23P01" && attempt < 2) continue;
      if ((err as { code?: string }).code === "23P01") return { ok: false, reason: "unavailable" };
      throw err;
    }
  }
  return { ok: false, reason: "unavailable" };
}
