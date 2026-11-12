import { describe, expect, it } from "vitest";
import {
  canUndo, formatLate, HOLD_GRACE_MINUTES, isLate, LATE_AFTER_MINUTES, lateFirst, minutesLate, orderLate, placedAgo,
  roundQuote, UNDO_MINUTES, withinHoldGrace,
} from "@/lib/reservations/floor";

const T = new Date("2026-11-12T23:00:00Z");
const at = (min: number) => new Date(T.getTime() + min * 60_000);

describe("host stand clock rules", () => {
  it("a party is late 15 minutes after their time, and the pill reads h:mm", () => {
    expect(LATE_AFTER_MINUTES).toBe(15);
    expect(isLate(T, at(14))).toBe(false);
    expect(isLate(T, at(15))).toBe(true);
    expect(minutesLate(T, at(47))).toBe(47);
    expect(formatLate(47)).toBe("0:47");
    expect(formatLate(167)).toBe("2:47");
    expect(formatLate(-3)).toBe("0:00");
  });

  it("keeps a late party's table for 30 minutes past their time", () => {
    expect(HOLD_GRACE_MINUTES).toBe(30);
    expect(withinHoldGrace(T, at(30))).toBe(true);
    expect(withinHoldGrace(T, at(31))).toBe(false);
  });

  it("undo lasts 15 minutes", () => {
    expect(UNDO_MINUTES).toBe(15);
    expect(canUndo(T, at(15))).toBe(true);
    expect(canUndo(T, at(16))).toBe(false);
  });

  it("sorts late parties to the top, most late first", () => {
    const rows = [
      { id: "a", startsAt: at(-60), status: "completed" },
      { id: "b", startsAt: at(-20), status: "booked" },
      { id: "c", startsAt: at(-50), status: "confirmed" },
      { id: "d", startsAt: at(10), status: "booked" },
      { id: "e", startsAt: at(-5), status: "booked" },
    ];
    expect(lateFirst(rows, T).map((r) => r.id)).toEqual(["c", "b", "a", "d", "e"]);
  });

  it("tickets show their age and go late past their ready time while still open", () => {
    expect(placedAgo(at(-6), T)).toBe("Placed 6 min ago");
    expect(placedAgo(at(0), T)).toBe("Placed just now");
    expect(placedAgo(at(-65), T)).toBe("Placed 1 h 5 min ago");
    expect(orderLate("accepted", at(-1), T)).toBe(true);
    expect(orderLate("ready", at(-1), T)).toBe(false);
    expect(orderLate("placed", at(5), T)).toBe(false);
  });

  it("quotes waits in 5-minute steps between 5 and 120", () => {
    expect(roundQuote(0)).toBe(5);
    expect(roundQuote(22)).toBe(25);
    expect(roundQuote(500)).toBe(120);
  });
});
