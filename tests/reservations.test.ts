import { describe, expect, it } from "vitest";
import {
  findSlots,
  pickTable,
  turnFor,
  type ServicePeriod,
  type SlotQuery,
  type Table,
} from "@/lib/reservations/availability";
import { localDate, localTime, zonedToUtc } from "@/lib/reservations/time";

const TZ = "America/New_York";

const dinner: ServicePeriod = {
  id: "dinner",
  name: "Dinner",
  daysOfWeek: [2, 3, 4, 5, 6], // Tue–Sat
  firstSeating: "17:00",
  lastSeating: "21:00",
  slotMinutes: 30,
  turnMinutes: { "2": 90, "4": 105, "99": 120 },
  maxCoversPerSlot: null,
  depositCentsPerCover: 0,
};

const tables: Table[] = [
  { id: "t2a", label: "2A", minCovers: 1, maxCovers: 2, online: true, active: true },
  { id: "t4a", label: "4A", minCovers: 2, maxCovers: 4, online: true, active: true },
  { id: "t6a", label: "6A", minCovers: 4, maxCovers: 6, online: true, active: true },
  { id: "bar", label: "Bar 2", minCovers: 1, maxCovers: 2, online: false, active: true },
];

// Friday 13 Nov 2026; "now" is the Tuesday before, midday local.
const FRI = "2026-11-13";
const NOW = zonedToUtc("2026-11-10", "12:00", TZ);

function q(over: Partial<SlotQuery> = {}): SlotQuery {
  return {
    venue: { timezone: TZ, bookingHorizonDays: 60, minNoticeMinutes: 60, maxPartyOnline: 8 },
    date: FRI,
    partySize: 2,
    periods: [dinner],
    tables,
    holds: [],
    bookings: [],
    closed: false,
    now: NOW,
    channel: "online",
    ...over,
  };
}

describe("time helpers", () => {
  it("round-trips venue-local wall time", () => {
    const t = zonedToUtc(FRI, "19:30", TZ);
    expect(t.toISOString()).toBe("2026-11-14T00:30:00.000Z"); // EST, UTC-5
    expect(localDate(t, TZ)).toBe(FRI);
    expect(localTime(t, TZ)).toBe("19:30");
  });

  it("is correct either side of daylight saving", () => {
    expect(zonedToUtc("2026-07-10", "19:30", TZ).toISOString()).toBe("2026-07-10T23:30:00.000Z"); // EDT
    expect(zonedToUtc("2026-03-08", "19:30", TZ).toISOString()).toBe("2026-03-08T23:30:00.000Z"); // DST day
  });
});

describe("findSlots", () => {
  it("offers every seating in the period", () => {
    const times = findSlots(q()).map((s) => s.time);
    expect(times).toEqual(["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"]);
  });

  it("gives a two the two-top, not the four-top", () => {
    expect(findSlots(q())[0].tableId).toBe("t2a");
  });

  it("returns nothing on closed days and days the period doesn't run", () => {
    expect(findSlots(q({ closed: true }))).toEqual([]);
    expect(findSlots(q({ date: "2026-11-16" }))).toEqual([]); // Monday
  });

  it("spills to the next table that fits when the best one is held", () => {
    const start = zonedToUtc(FRI, "19:00", TZ);
    const holds = [{ tableId: "t2a", start, end: new Date(start.getTime() + 90 * 60_000) }];
    const at7 = findSlots(q({ holds })).find((s) => s.time === "19:00")!;
    expect(at7.tableId).toBe("t4a");
  });

  it("respects turn times: a held table is blocked for the whole turn", () => {
    const start = zonedToUtc(FRI, "19:00", TZ);
    const end = new Date(start.getTime() + 90 * 60_000);
    const holds = ["t2a", "t4a", "t6a"].map((tableId) => ({ tableId, start, end }));
    const times = findSlots(q({ holds })).map((s) => s.time);
    // 17:30 + 90 min ends exactly at 19:00 and is fine; 18:00 would
    // run into it, and so would anything until the 20:30 release.
    expect(times).toEqual(["17:00", "17:30", "20:30", "21:00"]);
  });

  it("keeps staff-only tables off the website but available to the host", () => {
    const allHeld = ["t2a", "t4a"].map((tableId) => ({
      tableId,
      start: zonedToUtc(FRI, "17:00", TZ),
      end: zonedToUtc(FRI, "23:59", TZ),
    }));
    expect(findSlots(q({ holds: allHeld }))).toEqual([]);
    expect(findSlots(q({ holds: allHeld, channel: "staff" }))[0].tableId).toBe("bar");
  });

  it("applies pacing caps per slot", () => {
    const paced = { ...dinner, maxCoversPerSlot: 6 };
    const at7 = zonedToUtc(FRI, "19:00", TZ);
    const bookings = [{ startsAt: at7, partySize: 5 }];
    const times = findSlots(q({ periods: [paced], bookings })).map((s) => s.time);
    expect(times).not.toContain("19:00");
    expect(times).toContain("19:30");
  });

  it("enforces online notice, horizon and party-size limits", () => {
    const sameDay = zonedToUtc(FRI, "18:15", TZ);
    expect(findSlots(q({ now: sameDay })).map((s) => s.time)).toEqual(["19:30", "20:00", "20:30", "21:00"]);
    expect(findSlots(q({ date: "2027-03-12" }))).toEqual([]); // beyond 60 days
    expect(findSlots(q({ partySize: 10 }))).toEqual([]);
    expect(findSlots(q({ date: "2026-11-06" }))).toEqual([]); // the past
  });

  it("prices the deposit per cover", () => {
    const withDeposit = { ...dinner, depositCentsPerCover: 2500 };
    expect(findSlots(q({ periods: [withDeposit], partySize: 4 }))[0].depositCents).toBe(10000);
  });

  it("doesn't offer a time twice when periods overlap", () => {
    const late = { ...dinner, id: "late", firstSeating: "21:00", lastSeating: "22:00" };
    const times = findSlots(q({ periods: [dinner, late] })).map((s) => s.time);
    expect(times.filter((t) => t === "21:00")).toHaveLength(1);
    expect(times.at(-1)).toBe("22:00");
  });
});

describe("turnFor / pickTable", () => {
  it("uses the smallest bracket that fits the party", () => {
    expect(turnFor(dinner, 2)).toBe(90);
    expect(turnFor(dinner, 3)).toBe(105);
    expect(turnFor(dinner, 12)).toBe(120);
  });

  it("returns null when nothing seats the party", () => {
    const s = zonedToUtc(FRI, "19:00", TZ);
    expect(pickTable(tables, [], 9, s, new Date(s.getTime() + 3_600_000), "staff")).toBeNull();
  });
});
