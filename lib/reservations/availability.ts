import { daysBetween, localDate, minutesOf, timeOf, weekday, zonedToUtc } from "./time";

/**
 * The booking engine's core: which times can a party of N have on a
 * date, and which table each would get.
 *
 * Pure: everything it needs is passed in, so the exact rule that decides
 * a guest's options is unit-tested without a database. The database's
 * exclusion constraint is the final word on double-booking; this decides
 * what to offer, and is re-run inside the booking transaction.
 */

export interface VenueRules {
  timezone: string;
  bookingHorizonDays: number;
  minNoticeMinutes: number;
  maxPartyOnline: number;
}

export interface ServicePeriod {
  id: string;
  name: string;
  daysOfWeek: number[];
  /** "HH:MM", venue-local. */
  firstSeating: string;
  lastSeating: string;
  slotMinutes: number;
  /** Max party size -> minutes, e.g. { "2": 75, "4": 90, "99": 120 }. */
  turnMinutes: Record<string, number>;
  maxCoversPerSlot: number | null;
  depositCentsPerCover: number;
}

export interface Table {
  id: string;
  label: string;
  minCovers: number;
  maxCovers: number;
  online: boolean;
  active: boolean;
}

/** A live hold on a table. */
export interface Hold {
  tableId: string;
  start: Date;
  end: Date;
}

/** A live booking, for pacing. */
export interface BookingStart {
  startsAt: Date;
  partySize: number;
}

export interface Slot {
  /** "HH:MM", venue-local. */
  time: string;
  startsAt: Date;
  endsAt: Date;
  tableId: string;
  periodId: string;
  depositCents: number;
}

export type Channel = "online" | "staff";

export interface SlotQuery {
  venue: VenueRules;
  /** "yyyy-mm-dd", venue-local. */
  date: string;
  partySize: number;
  periods: ServicePeriod[];
  tables: Table[];
  holds: Hold[];
  bookings: BookingStart[];
  closed: boolean;
  now: Date;
  /** Online guests get the venue's limits; staff at the host stand don't. */
  channel: Channel;
}

export function turnFor(period: ServicePeriod, partySize: number): number {
  const keys = Object.keys(period.turnMinutes)
    .map(Number)
    .filter((k) => Number.isFinite(k))
    .sort((a, b) => a - b);
  const key = keys.find((k) => k >= partySize) ?? keys[keys.length - 1];
  return key === undefined ? 90 : period.turnMinutes[String(key)];
}

/**
 * Best-fit table for a party over [start, end): the smallest table that
 * seats them and is free. Smallest-first keeps the six-top open for the
 * six who book later.
 */
export function pickTable(
  tables: Table[],
  holds: Hold[],
  partySize: number,
  start: Date,
  end: Date,
  channel: Channel,
): Table | null {
  const candidates = tables
    .filter(
      (t) =>
        t.active &&
        (channel === "staff" || t.online) &&
        t.minCovers <= partySize &&
        t.maxCovers >= partySize,
    )
    .sort((a, b) => a.maxCovers - b.maxCovers || a.label.localeCompare(b.label));
  for (const t of candidates) {
    const clash = holds.some(
      (h) => h.tableId === t.id && h.start < end && start < h.end,
    );
    if (!clash) return t;
  }
  return null;
}

export function findSlots(q: SlotQuery): Slot[] {
  const { venue, date, partySize, channel } = q;
  if (q.closed || partySize < 1) return [];

  if (channel === "online") {
    if (partySize > venue.maxPartyOnline) return [];
    const ahead = daysBetween(localDate(q.now, venue.timezone), date);
    if (ahead < 0 || ahead > venue.bookingHorizonDays) return [];
  }
  const earliest =
    channel === "online"
      ? new Date(q.now.getTime() + venue.minNoticeMinutes * 60_000)
      : q.now;

  const day = weekday(date);
  const seen = new Set<string>();
  const out: Slot[] = [];

  for (const period of q.periods) {
    if (!period.daysOfWeek.includes(day)) continue;
    const turn = turnFor(period, partySize);
    const step = Math.max(1, period.slotMinutes);

    for (
      let m = minutesOf(period.firstSeating);
      m <= minutesOf(period.lastSeating);
      m += step
    ) {
      const time = timeOf(m);
      if (seen.has(time)) continue;
      const startsAt = zonedToUtc(date, time, venue.timezone);
      if (startsAt < earliest) continue;
      const endsAt = new Date(startsAt.getTime() + turn * 60_000);

      if (period.maxCoversPerSlot !== null) {
        const starting = q.bookings
          .filter((b) => b.startsAt.getTime() === startsAt.getTime())
          .reduce((s, b) => s + b.partySize, 0);
        if (starting + partySize > period.maxCoversPerSlot) continue;
      }

      const table = pickTable(q.tables, q.holds, partySize, startsAt, endsAt, channel);
      if (!table) continue;

      seen.add(time);
      out.push({
        time,
        startsAt,
        endsAt,
        tableId: table.id,
        periodId: period.id,
        depositCents: period.depositCentsPerCover * partySize,
      });
    }
  }

  return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
