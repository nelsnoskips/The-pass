import { randomBytes } from "node:crypto";
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
import { zonedToUtc } from "./time";

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

async function loadBundle(q: Q, orgId: string, venueId: string, date: string): Promise<Bundle | null> {
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
        and rt.during && tstzrange(${from}, ${to})`,
    q<{ starts_at: Date; party_size: number }[]>`
      select starts_at, party_size from reservations
      where venue_id = ${venueId} and org_id = ${orgId}
        and status = any(${LIVE}::reservation_status[])
        and starts_at >= ${from} and starts_at < ${to}`,
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
  input: { orgId: string; venueId: string; date: string; partySize: number; channel: Channel; now?: Date },
): Promise<Slot[]> {
  const b = await loadBundle(sql, input.orgId, input.venueId, input.date);
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
  | { ok: false; reason: "invalid_phone" | "invalid_name" | "unavailable" | "venue_not_found" };

/**
 * Book a table. The slot is re-checked inside the transaction, and the
 * exclusion constraint settles any race: if another booking took the
 * table between our read and our write, we retry and the engine picks
 * the next table that fits — or reports the time as gone.
 */
export async function book(sql: Sql, input: BookInput): Promise<BookResult> {
  const phone = normalizePhone(input.guest.phone);
  if (!phone) return { ok: false, reason: "invalid_phone" };
  const name = input.guest.name.trim();
  if (!name) return { ok: false, reason: "invalid_name" };

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
            tableLabels: [table.label],
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

/** Status changes from the host stand. */
export async function setStatus(
  sql: Sql,
  tenant: Tenant,
  reservationId: string,
  status: ReservationStatus,
): Promise<boolean> {
  return sql.begin(async (tx) => {
    const [r] = await tx<{ venue_id: string; guest_id: string; status: ReservationStatus }[]>`
      select venue_id, guest_id, status from reservations
      where id = ${reservationId} and org_id = ${tenant.orgId}
      for update
    `;
    if (!r) return false;
    assertCan(tenant, "book", r.venue_id);
    if (r.status === status) return true;

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
    return true;
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
    labels: string[] | null;
  }[]>`
    select r.id, r.venue_id, r.guest_id, g.name, g.phone, r.party_size, r.starts_at, r.ends_at,
           r.status, r.source, r.notes, r.deposit_cents, r.manage_token,
           array_agg(t.label order by t.label) filter (where t.label is not null) as labels
    from reservations r
    join guests g on g.id = r.guest_id
    left join reservation_tables rt on rt.reservation_id = r.id
    left join dining_tables t on t.id = rt.table_id
    where r.org_id = ${tenant.orgId} and r.venue_id = ${venueId}
      and r.starts_at >= ${from} and r.starts_at < ${to}
    group by r.id, g.name, g.phone
    order by r.starts_at, g.name
  `;
  return rows.map((r) => ({
    id: r.id, venueId: r.venue_id, guestId: r.guest_id, guestName: r.name, guestPhone: r.phone,
    partySize: r.party_size, startsAt: r.starts_at, endsAt: r.ends_at, status: r.status,
    source: r.source, notes: r.notes, depositCents: r.deposit_cents, manageToken: r.manage_token,
    tableLabels: r.labels ?? [],
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
