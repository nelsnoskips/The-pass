import { randomBytes, randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { countVisit } from "../guests/visits";
import { normalizePhone } from "../guests/phone";
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
import { canUndo, HOLD_GRACE_MINUTES, isLate, STALE_SEATED_HOURS, UNDO_TO } from "./floor";
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
  /** Their table went to a walk-in while they were past the grace window. */
  tableReleased?: boolean;
  createdAt?: Date;
  /** The last status change ("seated", "completed", "walk_in", "undo"…) and when. */
  lastChange?: { action: string; at: Date } | null;
}

/** Statuses that hold a table. */
const LIVE: ReservationStatus[] = ["booked", "confirmed", "seated"];

export { normalizePhone };

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
  guest: { name: string; phone: string; email?: string | null; smsMarketingConsent?: boolean; emailMarketingConsent?: boolean };
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
        const emailConsent = input.guest.emailMarketingConsent === true && Boolean(input.guest.email);
        const [guest] = await tx<{ id: string; name: string; phone: string }[]>`
          insert into guests (org_id, phone, name, email, sms_consent_at, sms_consent_source, email_consent_at, email_consent_source)
          values (${input.orgId}, ${phone}, ${name}, ${input.guest.email ?? null},
                  ${consent ? new Date() : null}, ${consent ? `booking:${input.source}` : null},
                  ${emailConsent ? new Date() : null}, ${emailConsent ? `booking:${input.source}` : null})
          on conflict (org_id, phone) do update set
            -- The name on file stays: a phone already known to the
            -- restaurant keeps the name they know it by. A different name
            -- is kept as a note for the host, once.
            ${aliasNoteSql(tx)}
            email = coalesce(excluded.email, guests.email),
            sms_consent_at = coalesce(guests.sms_consent_at, excluded.sms_consent_at),
            sms_consent_source = coalesce(guests.sms_consent_source, excluded.sms_consent_source),
            email_consent_at = coalesce(guests.email_consent_at, excluded.email_consent_at),
            email_consent_source = coalesce(guests.email_consent_source, excluded.email_consent_source)
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

/**
 * For `insert into guests … on conflict (org_id, phone) do update set`:
 * keep the stored name (fill it only if blank) and note a different one
 * as "Also booked as …", once. Shared with ordering's guest upsert.
 */
export function aliasNoteSql(q: Q) {
  return q`
    name = case when btrim(guests.name) = '' then excluded.name else guests.name end,
    notes = case
      when btrim(guests.name) = '' or lower(btrim(guests.name)) = lower(btrim(excluded.name))
        or position(lower('Also booked as ' || btrim(excluded.name)) in lower(coalesce(guests.notes, ''))) > 0
        then guests.notes
      else concat_ws(E'\n', nullif(guests.notes, ''), 'Also booked as ' || btrim(excluded.name))
    end,`;
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

/**
 * Which status may follow which. Enforced here, not in any screen, so a
 * party that sat down can never later be charged as a no-show, and a
 * released table can't be quietly re-held. Mistakes are put right with
 * `undoStatus`, inside UNDO_MINUTES, not by walking the states backwards.
 */
const NEXT: Record<ReservationStatus, ReservationStatus[]> = {
  booked: ["confirmed", "seated", "no_show", "cancelled"],
  confirmed: ["seated", "no_show", "cancelled"],
  seated: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

/**
 * ok; not_found; invalid (that status can't follow this one); occupied
 * (another party is seated at the table right now); not_today (seat and
 * no-show only on the booking's own day); too_early (no-show before
 * LATE_AFTER_MINUTES past the start); table_unavailable (the chosen table
 * doesn't exist, is too small, or is held by another booking).
 */
export type StatusResult = "ok" | "not_found" | "invalid" | "occupied" | "not_today" | "too_early" | "table_unavailable";

export interface StatusOptions {
  now?: Date;
  /** Seat them at this table instead of the one they were given. */
  tableId?: string;
}

const STATUS_ACTIONS = ["reservation.created", "reservation.confirmed", "reservation.seated", "reservation.completed",
  "reservation.cancelled", "reservation.no_show", "reservation.walk_in", "reservation.undo"];

const staleBefore = (now: Date) => new Date(now.getTime() - STALE_SEATED_HOURS * 3_600_000);

export async function setStatus(
  sql: Sql,
  tenant: Tenant,
  reservationId: string,
  status: ReservationStatus,
  opts: StatusOptions = {},
): Promise<StatusResult> {
  const now = opts.now ?? new Date();
  try {
    return await sql.begin(async (tx): Promise<StatusResult> => {
      const [r] = await tx<{ venue_id: string; guest_id: string; status: ReservationStatus; starts_at: Date; ends_at: Date; party_size: number; timezone: string }[]>`
        select r.venue_id, r.guest_id, r.status, r.starts_at, r.ends_at, r.party_size, v.timezone
        from reservations r join venues v on v.id = r.venue_id
        where r.id = ${reservationId} and r.org_id = ${tenant.orgId}
        for update of r
      `;
      if (!r) return "not_found";
      assertCan(tenant, "book", r.venue_id);
      if (r.status === status) return "ok";
      if (!NEXT[r.status].includes(status)) return "invalid";
      if ((status === "seated" || status === "no_show") && localDateOf(r.starts_at, r.timezone) !== localDateOf(now, r.timezone)) {
        return "not_today";
      }
      if (status === "no_show" && !isLate(r.starts_at, now)) return "too_early";
      if (status === "seated") {
        if (opts.tableId) {
          const moved = await moveTable(tx, tenant, reservationId, r, opts.tableId, now);
          if (moved !== "ok") return moved;
        }
        // Never two seated parties at one table.
        if (await occupantOf(tx, tenant.orgId, reservationId, now)) return "occupied";
        // A late party whose table was released takes it back if it's free.
        await tx`update reservation_tables set live = true
                 where reservation_id = ${reservationId} and org_id = ${tenant.orgId} and not live`;
      }

      await tx`update reservations set status = ${status}, updated_at = now()
               where id = ${reservationId} and org_id = ${tenant.orgId}`;
      if (!LIVE.includes(status)) {
        await tx`update reservation_tables set live = false
                 where reservation_id = ${reservationId} and org_id = ${tenant.orgId}`;
      }
      const detail: Record<string, unknown> = { from: r.status };
      if (status === "completed") {
        // Counts the visit and earns any loyalty reward it completes. What
        // it changed is kept with the log entry, so an undo can reverse it.
        const [g] = await tx<{ last_visit_at: Date | null }[]>`
          select last_visit_at from guests where id = ${r.guest_id} and org_id = ${tenant.orgId}`;
        const reward = await countVisit(tx, tenant.orgId, r.guest_id, now);
        const [after] = await tx<{ visit_count: number }[]>`
          select visit_count from guests where id = ${r.guest_id} and org_id = ${tenant.orgId}`;
        Object.assign(detail, { visitCount: after?.visit_count ?? null, prevLastVisitAt: g?.last_visit_at ?? null, reward });
      }
      if (status === "no_show") {
        await tx`update guests set no_show_count = no_show_count + 1
                 where id = ${r.guest_id} and org_id = ${tenant.orgId}`;
      }
      await log(tx, tenant.orgId, tenant.actor, `reservation.${status}`, "reservation", reservationId, detail);
      return "ok";
    });
  } catch (err) {
    // 23P01: the chosen table is held by another booking.
    if ((err as { code?: string }).code === "23P01") return "table_unavailable";
    throw err;
  }
}

/** Another party seated right now at any of this reservation's tables. */
async function occupantOf(q: Q, orgId: string, reservationId: string, now: Date): Promise<{ id: string } | null> {
  const [o] = await q<{ id: string }[]>`
    select o.id
    from reservation_tables mine
    join reservation_tables other on other.table_id = mine.table_id and other.reservation_id <> mine.reservation_id and other.live
    join reservations o on o.id = other.reservation_id and o.status = 'seated' and o.starts_at > ${staleBefore(now)}
    where mine.reservation_id = ${reservationId} and mine.org_id = ${orgId}
    limit 1`;
  return o ?? null;
}

/** Who is sitting at a table now, for the host stand. */
export interface Occupant {
  reservationId: string;
  tableId: string;
  tableLabel: string;
  guestName: string;
  source: string;
  partySize: number;
  seatedAt: Date;
}

const seatedAtSql = (q: Q) => q`coalesce((
  select max(c.created_at) from change_log c
  where c.org_id = r.org_id and c.entity = 'reservation' and c.entity_id = r.id::text
    and c.action in ('reservation.seated', 'reservation.walk_in')), r.starts_at)`;

/** The party blocking a reservation's table, if any — for the host's error. */
export async function blockingParty(sql: Sql, tenant: Tenant, reservationId: string, now = new Date()): Promise<Occupant | null> {
  const [o] = await sql<{ id: string; table_id: string; label: string; name: string; source: string; party_size: number; seated_at: Date }[]>`
    select r.id, t.id as table_id, t.label, g.name, r.source, r.party_size, ${seatedAtSql(sql)} as seated_at
    from reservation_tables mine
    join reservation_tables other on other.table_id = mine.table_id and other.reservation_id <> mine.reservation_id and other.live
    join reservations r on r.id = other.reservation_id and r.status = 'seated' and r.starts_at > ${staleBefore(now)}
    join guests g on g.id = r.guest_id
    join dining_tables t on t.id = mine.table_id
    where mine.reservation_id = ${reservationId} and mine.org_id = ${tenant.orgId}
    limit 1`;
  return o ? {
    reservationId: o.id, tableId: o.table_id, tableLabel: o.label, guestName: o.name, source: o.source,
    partySize: o.party_size, seatedAt: o.seated_at,
  } : null;
}

/**
 * Move a reservation's hold onto another table. A party seated or seating
 * now holds the new table from now for their turn; one still to come
 * keeps their booked time. The exclusion constraint has the last word.
 */
async function moveTable(
  tx: TransactionSql, tenant: Tenant, reservationId: string,
  r: { venue_id: string; starts_at: Date; ends_at: Date; party_size: number }, tableId: string, now: Date,
): Promise<"ok" | "occupied" | "table_unavailable"> {
  if (!/^[0-9a-f-]{36}$/i.test(tableId)) return "table_unavailable";
  const [t] = await tx<{ id: string; label: string; max_covers: number; active: boolean }[]>`
    select id, label, max_covers, active from dining_tables
    where id = ${tableId} and org_id = ${tenant.orgId} and venue_id = ${r.venue_id}`;
  if (!t || !t.active || t.max_covers < r.party_size) return "table_unavailable";
  const [busy] = await tx`
    select 1 from reservation_tables rt join reservations o on o.id = rt.reservation_id
    where rt.table_id = ${tableId} and rt.live and rt.reservation_id <> ${reservationId}
      and o.status = 'seated' and o.starts_at > ${staleBefore(now)} limit 1`;
  if (busy) return "occupied";
  const before = await tx<{ label: string }[]>`
    select t.label from reservation_tables rt join dining_tables t on t.id = rt.table_id
    where rt.reservation_id = ${reservationId} and rt.org_id = ${tenant.orgId}`;
  const turn = r.ends_at.getTime() - r.starts_at.getTime();
  const start = r.starts_at <= now ? now : r.starts_at;
  const end = new Date(start.getTime() + turn);
  await tx`delete from reservation_tables where reservation_id = ${reservationId} and org_id = ${tenant.orgId}`;
  await tx`insert into reservation_tables (reservation_id, table_id, org_id, during)
           values (${reservationId}, ${tableId}, ${tenant.orgId}, tstzrange(${start}, ${end}, '[)'))`;
  await log(tx, tenant.orgId, tenant.actor, "reservation.table_changed", "reservation", reservationId, {
    from: before.map((b) => b.label), to: t.label,
  });
  return "ok";
}

export type ReassignResult = "ok" | "not_found" | "invalid" | "occupied" | "table_unavailable";

/** Give a booked or seated party a different table. */
export async function reassignTable(
  sql: Sql, tenant: Tenant, reservationId: string, tableId: string, now = new Date(),
): Promise<ReassignResult> {
  try {
    return await sql.begin(async (tx): Promise<ReassignResult> => {
      const [r] = await tx<{ venue_id: string; status: ReservationStatus; starts_at: Date; ends_at: Date; party_size: number }[]>`
        select venue_id, status, starts_at, ends_at, party_size from reservations
        where id = ${reservationId} and org_id = ${tenant.orgId} for update`;
      if (!r) return "not_found";
      assertCan(tenant, "book", r.venue_id);
      if (!LIVE.includes(r.status)) return "invalid";
      return moveTable(tx, tenant, reservationId, r, tableId, now);
    });
  } catch (err) {
    if ((err as { code?: string }).code === "23P01") return "table_unavailable";
    throw err;
  }
}

export interface TableChoice {
  id: string;
  label: string;
  minCovers: number;
  maxCovers: number;
  /** The table they were given. */
  current: boolean;
  /** Free for their whole turn starting now. */
  free: boolean;
  occupiedBy: string | null;
}

/** Tables a party could be seated at now, free and best fit first. */
export async function seatChoices(sql: Sql, tenant: Tenant, reservationId: string, now = new Date()): Promise<TableChoice[]> {
  const [r] = await sql<{ venue_id: string; starts_at: Date; ends_at: Date; party_size: number; timezone: string }[]>`
    select r.venue_id, r.starts_at, r.ends_at, r.party_size, v.timezone
    from reservations r join venues v on v.id = r.venue_id
    where r.id = ${reservationId} and r.org_id = ${tenant.orgId}`;
  if (!r) return [];
  assertCan(tenant, "view", r.venue_id);
  const b = await loadBundle(sql, tenant.orgId, r.venue_id, localDateOf(now, r.timezone), reservationId);
  if (!b) return [];
  const mine = await sql<{ table_id: string }[]>`select table_id from reservation_tables where reservation_id = ${reservationId}`;
  const occ = new Map((await floorNow(sql, tenant, r.venue_id, now)).filter((o) => o.occupant).map((o) => [o.tableId, o.occupant!]));
  const end = new Date(now.getTime() + (r.ends_at.getTime() - r.starts_at.getTime()));
  return b.tables
    .filter((t) => t.active && t.maxCovers >= r.party_size)
    .map((t) => {
      const o = occ.get(t.id);
      const clash = b.holds.some((h) => h.tableId === t.id && h.start < end && now < h.end);
      return {
        id: t.id, label: t.label, minCovers: t.minCovers, maxCovers: t.maxCovers,
        current: mine.some((m) => m.table_id === t.id),
        free: !o && !clash,
        occupiedBy: o ? o.guestName : null,
      };
    })
    .sort((a, b) => Number(b.free) - Number(a.free) || a.maxCovers - b.maxCovers ||
      a.label.localeCompare(b.label, undefined, { numeric: true }));
}

export interface FloorTable {
  tableId: string;
  label: string;
  minCovers: number;
  maxCovers: number;
  occupant: Occupant | null;
}

/** Every active table at a venue, and who is seated at it now. */
export async function floorNow(sql: Sql, tenant: Tenant, venueId: string, now = new Date()): Promise<FloorTable[]> {
  assertCan(tenant, "view", venueId);
  const rows = await sql<{
    id: string; label: string; min_covers: number; max_covers: number;
    reservation_id: string | null; name: string | null; source: string | null; party_size: number | null; seated_at: Date | null;
  }[]>`
    select t.id, t.label, t.min_covers, t.max_covers,
           occ.reservation_id, occ.name, occ.source, occ.party_size, occ.seated_at
    from dining_tables t
    left join lateral (
      select r.id as reservation_id, g.name, r.source, r.party_size, ${seatedAtSql(sql)} as seated_at
      from reservation_tables rt
      join reservations r on r.id = rt.reservation_id
      join guests g on g.id = r.guest_id
      where rt.table_id = t.id and rt.live and r.status = 'seated' and r.starts_at > ${staleBefore(now)}
      order by r.starts_at desc limit 1
    ) occ on true
    where t.venue_id = ${venueId} and t.org_id = ${tenant.orgId} and t.active`;
  return rows
    .map((t) => ({
      tableId: t.id, label: t.label, minCovers: t.min_covers, maxCovers: t.max_covers,
      occupant: t.reservation_id ? {
        reservationId: t.reservation_id, tableId: t.id, tableLabel: t.label, guestName: t.name!, source: t.source!,
        partySize: t.party_size!, seatedAt: t.seated_at!,
      } : null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

/**
 * ok; not_found; invalid (the last change wasn't a seat, done or no-show,
 * or was already undone); expired (older than UNDO_MINUTES); occupied /
 * table_unavailable (putting it back would double up a table).
 */
export type UndoResult = "ok" | "not_found" | "invalid" | "expired" | "occupied" | "table_unavailable";

/**
 * Take back the last Seat, Done or No-show within UNDO_MINUTES, in one
 * transaction with what it changed: a Done gives back the visit (and any
 * unredeemed reward it earned), a No-show gives back the no-show count.
 */
export async function undoStatus(sql: Sql, tenant: Tenant, reservationId: string, now = new Date()): Promise<UndoResult> {
  try {
    return await sql.begin(async (tx): Promise<UndoResult> => {
      const [r] = await tx<{ venue_id: string; guest_id: string; status: ReservationStatus }[]>`
        select venue_id, guest_id, status from reservations
        where id = ${reservationId} and org_id = ${tenant.orgId} for update`;
      if (!r) return "not_found";
      assertCan(tenant, "book", r.venue_id);
      const [last] = await tx<{ id: string; action: string; detail: Record<string, unknown>; created_at: Date }[]>`
        select id, action, detail, created_at from change_log
        where org_id = ${tenant.orgId} and entity = 'reservation' and entity_id = ${reservationId}
          and action = any(${STATUS_ACTIONS})
        order by id desc limit 1`;
      const back = last?.detail?.from as ReservationStatus | undefined;
      if (!last || last.action !== `reservation.${r.status}` || !back || !UNDO_TO[r.status]?.includes(back)) return "invalid";
      if (!canUndo(last.created_at, now)) return "expired";

      if (r.status === "completed" || r.status === "no_show") {
        if (r.status === "completed" && await occupantOf(tx, tenant.orgId, reservationId, now)) return "occupied";
        // Re-hold the table; the exclusion constraint refuses if it's gone.
        await tx`update reservation_tables set live = true where reservation_id = ${reservationId} and org_id = ${tenant.orgId}`;
      }
      if (r.status === "completed") {
        const prev = last.detail.prevLastVisitAt;
        await tx`update guests set visit_count = greatest(visit_count - 1, 0),
                   last_visit_at = ${prev ? new Date(String(prev)) : null}
                 where id = ${r.guest_id} and org_id = ${tenant.orgId}`;
        const visit = Number(last.detail.visitCount);
        if (Number.isInteger(visit) && visit > 0) {
          await tx`delete from loyalty_rewards
                   where guest_id = ${r.guest_id} and org_id = ${tenant.orgId}
                     and earned_at_visit = ${visit} and redeemed_at is null`;
        }
      }
      if (r.status === "no_show") {
        await tx`update guests set no_show_count = greatest(no_show_count - 1, 0)
                 where id = ${r.guest_id} and org_id = ${tenant.orgId}`;
      }
      await tx`update reservations set status = ${back}, updated_at = now()
               where id = ${reservationId} and org_id = ${tenant.orgId}`;
      await log(tx, tenant.orgId, tenant.actor, "reservation.undo", "reservation", reservationId, {
        from: r.status, to: back, undid: last.id,
      });
      return "ok";
    });
  } catch (err) {
    if ((err as { code?: string }).code === "23P01") return "table_unavailable";
    throw err;
  }
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
    released: boolean; last_action: string | null; last_at: Date | null; created_at: Date;
  }[]>`
    select r.id, r.venue_id, r.guest_id, g.name, g.phone, r.party_size, r.starts_at, r.ends_at,
           r.status, r.source, r.notes, r.deposit_cents, r.manage_token, g.visit_count, g.no_show_count, r.deposit_status,
           r.created_at,
           array_agg(t.label order by t.label) filter (where t.label is not null) as labels,
           coalesce(bool_and(not rt.live), false) and r.status in ('booked', 'confirmed') as released,
           last.action as last_action, last.created_at as last_at
    from reservations r
    join guests g on g.id = r.guest_id
    left join reservation_tables rt on rt.reservation_id = r.id
    left join dining_tables t on t.id = rt.table_id
    left join lateral (
      select c.action, c.created_at from change_log c
      where c.org_id = r.org_id and c.entity = 'reservation' and c.entity_id = r.id::text
        and c.action = any(${STATUS_ACTIONS})
      order by c.id desc limit 1
    ) last on true
    where r.org_id = ${tenant.orgId} and r.venue_id = ${venueId}
      and r.starts_at >= ${from} and r.starts_at < ${to}
    group by r.id, g.name, g.phone, g.visit_count, g.no_show_count, last.action, last.created_at
    order by r.starts_at, g.name
  `;
  return rows.map((r) => ({
    id: r.id, venueId: r.venue_id, guestId: r.guest_id, guestName: r.name, guestPhone: r.phone,
    partySize: r.party_size, startsAt: r.starts_at, endsAt: r.ends_at, status: r.status,
    source: r.source, notes: r.notes, depositCents: r.deposit_cents, manageToken: r.manage_token,
    tableLabels: r.labels ?? [], guestVisits: r.visit_count, guestNoShows: r.no_show_count,
    depositStatus: r.deposit_status, tableReleased: r.released, createdAt: r.created_at,
    lastChange: r.last_action ? { action: r.last_action.replace("reservation.", ""), at: r.last_at! } : null,
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
  endsAt: Date;
  /** Integer cents; 0 when the booking has no deposit. */
  depositCents: number;
  /** reservations.deposit_status: none, pending, held, captured, refunded. */
  depositStatus: string;
  /** venues.cancel_cutoff_hours — the rule refundDepositIfDue applies. */
  cancelCutoffHours: number;
  venuePhone: string | null;
  venueAddress: string | null;
}

export async function bookingByToken(sql: Sql, token: string): Promise<GuestBooking | null> {
  if (!token || token.length > 64) return null;
  const [r] = await sql<{
    id: string; org_id: string; venue_id: string; venue_name: string; timezone: string;
    name: string; party_size: number; starts_at: Date; status: ReservationStatus; notes: string | null;
    ends_at: Date; deposit_cents: number; deposit_status: string; cancel_cutoff_hours: number;
    phone: string | null; address: string | null;
  }[]>`
    select r.id, r.org_id, r.venue_id, v.name as venue_name, v.timezone, g.name,
           r.party_size, r.starts_at, r.status, r.notes, r.ends_at, r.deposit_cents, r.deposit_status,
           v.cancel_cutoff_hours, v.phone, v.address
    from reservations r
    join venues v on v.id = r.venue_id
    join guests g on g.id = r.guest_id
    where r.manage_token = ${token}`;
  if (!r) return null;
  return {
    id: r.id, orgId: r.org_id, venueId: r.venue_id, venueName: r.venue_name, timezone: r.timezone,
    guestName: r.name, partySize: r.party_size, startsAt: r.starts_at, status: r.status, notes: r.notes,
    endsAt: r.ends_at, depositCents: r.deposit_cents, depositStatus: r.deposit_status,
    cancelCutoffHours: r.cancel_cutoff_hours, venuePhone: r.phone, venueAddress: r.address,
  };
}

export type WalkInResult =
  | { ok: true; reservationId: string; tableLabel: string }
  | { ok: false; reason: "no_table" | "invalid_name" | "invalid_phone" | "venue_not_found" };

/**
 * Tables a walk-in mustn't take right now, beyond the ordinary holds:
 *  - a table with a party seated at it, however long they've overstayed
 *    their hold (until STALE_SEATED_HOURS — someone forgot Table free);
 *  - a table booked for a party due before the walk-in would finish, or
 *    one running late but still inside HOLD_GRACE_MINUTES of their start.
 *    Past the grace window their table can go to a walk-in; the late
 *    party is seated elsewhere with the table picker.
 * Each is returned as a hold over the walk-in's whole turn. Also returned:
 * the holds of parties already past the grace window, which a walk-in may
 * take over.
 */
async function floorHolds(q: Q, orgId: string, venueId: string, now: Date, end: Date) {
  const graceFrom = new Date(now.getTime() - HOLD_GRACE_MINUTES * 60_000);
  const rows = await q<{ table_id: string; reservation_id: string; start: Date; status: ReservationStatus; starts_at: Date }[]>`
    select rt.table_id, rt.reservation_id, lower(rt.during) as start, r.status, r.starts_at
    from reservation_tables rt
    join reservations r on r.id = rt.reservation_id
    join dining_tables t on t.id = rt.table_id
    where rt.org_id = ${orgId} and t.venue_id = ${venueId} and rt.live
      and (r.status = 'seated' and r.starts_at > ${staleBefore(now)}
        or r.status in ('booked', 'confirmed') and r.starts_at < ${end} and upper(rt.during) > ${staleBefore(now)})`;
  const lapsed = rows.filter((r) => r.status !== "seated" && r.starts_at < graceFrom);
  const block: Hold[] = rows.filter((r) => !lapsed.includes(r)).map((r) => ({ tableId: r.table_id, start: now, end }));
  return { block, lapsed };
}

/**
 * Seat a walk-in now, on the best free table for the whole turn (or on
 * `tableId`, when the host chose one). Staff only, so staff-held tables
 * (the bar) count, and there is no slot grid: a walk-in arrives when
 * they arrive.
 */
export async function seatWalkIn(
  sql: Sql,
  tenant: Tenant,
  input: { venueId: string; partySize: number; name: string; phone: string; now?: Date; tableId?: string },
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
        const floor = await floorHolds(tx, tenant.orgId, input.venueId, now, end);
        const lapsed = (h: Hold) => floor.lapsed.some((l) => l.table_id === h.tableId && l.start.getTime() === h.start.getTime());
        const holds = [...b.holds.filter((h) => !lapsed(h)), ...floor.block];
        const table = input.tableId
          ? b.tables.find((t) => t.id === input.tableId && t.active && t.maxCovers >= input.partySize &&
              !holds.some((h) => h.tableId === t.id && h.start < end && now < h.end)) ?? null
          : pickTable(b.tables, holds, input.partySize, now, end, "staff");
        if (!table) return { ok: false as const, reason: "no_table" as const };
        // A party past the grace window gives up their hold on this table;
        // if they turn up, the host seats them elsewhere.
        for (const l of floor.lapsed.filter((x) => x.table_id === table.id)) {
          await tx`update reservation_tables set live = false
                   where reservation_id = ${l.reservation_id} and table_id = ${table.id} and org_id = ${tenant.orgId}`;
          await log(tx, tenant.orgId, tenant.actor, "reservation.table_released", "reservation", l.reservation_id, {
            tableId: table.id, reason: "late past grace", graceMinutes: HOLD_GRACE_MINUTES,
          });
        }

        // A walk-in who gives a known number keeps the name we know them
        // by; a different name they give is noted once, as for bookings.
        // No name given ("Walk-in") changes nothing; a guest only known as
        // "Walk-in" takes the real name.
        const [g] = await tx<{ id: string }[]>`
          insert into guests (org_id, phone, name) values (${tenant.orgId}, ${phone}, ${name})
          on conflict (org_id, phone) do update set
            name = case when btrim(guests.name) in ('', 'Walk-in') then excluded.name else guests.name end,
            notes = case
              when btrim(guests.name) in ('', 'Walk-in') or excluded.name = 'Walk-in'
                or lower(btrim(guests.name)) = lower(btrim(excluded.name))
                or position(lower('Also booked as ' || btrim(excluded.name)) in lower(coalesce(guests.notes, ''))) > 0
                then guests.notes
              else concat_ws(E'\n', nullif(guests.notes, ''), 'Also booked as ' || btrim(excluded.name))
            end
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
