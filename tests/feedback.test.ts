import { describe, expect, it } from "vitest";
import {
  ALL_ITEMS,
  FEEDBACK_POINT,
  PRESSURE_MAX,
  RELEASE,
  SET_LIST,
  STAGES,
  clampPressure,
  itemByCode,
  orderCount,
  orderNumber,
  orderTotal,
  pressureForStage,
  pressureLevel,
  stageIndexAt,
  stageProgressAt,
} from "@/lib/feedback";

/**
 * The pressure engine is the room's only real logic: every visual on
 * the FEEDBACK page is a function of it, so it is the thing worth
 * pinning down. The rest of these check that the set list, the receipt
 * and the tray cannot disagree about a price.
 */

describe("pressure", () => {
  it("clamps to the knob's travel", () => {
    expect(clampPressure(-4)).toBe(0);
    expect(clampPressure(42)).toBe(PRESSURE_MAX);
    expect(clampPressure(Number.NaN)).toBe(0);
    expect(clampPressure(6.5)).toBe(6.5);
  });

  it("normalises the level across the full sweep", () => {
    expect(pressureLevel(0)).toBe(0);
    expect(pressureLevel(5)).toBe(0.5);
    expect(pressureLevel(PRESSURE_MAX)).toBe(1);
  });

  it("shows one frame at a time, in order, across the sweep", () => {
    expect(stageIndexAt(0)).toBe(0);
    expect(stageIndexAt(PRESSURE_MAX)).toBe(STAGES.length - 1);

    let last = 0;
    for (let p = 0; p <= PRESSURE_MAX; p += 0.05) {
      const index = stageIndexAt(p);
      // Never skips a frame and never goes backwards.
      expect(index - last).toBeLessThanOrEqual(1);
      expect(index).toBeGreaterThanOrEqual(last);
      last = index;
    }
    expect(last).toBe(STAGES.length - 1);
  });

  it("reports progress inside the current frame, not across the sweep", () => {
    STAGES.forEach((stage, i) => {
      expect(stageProgressAt(stage.at)).toBeCloseTo(0, 5);
      const next = STAGES[i + 1];
      if (next) {
        expect(stageProgressAt((stage.at + next.at) / 2)).toBeCloseTo(0.5, 5);
      }
    });
    expect(stageProgressAt(PRESSURE_MAX)).toBeCloseTo(1, 5);
  });

  it("seeks to a pressure that actually shows the frame asked for", () => {
    STAGES.forEach((_, i) => {
      expect(stageIndexAt(pressureForStage(i))).toBe(i);
    });
    // Out-of-range indices land on a real frame rather than throwing.
    expect(stageIndexAt(pressureForStage(-3))).toBe(0);
    expect(stageIndexAt(pressureForStage(99))).toBe(STAGES.length - 1);
  });

  it("puts the feedback point inside the last frame", () => {
    expect(FEEDBACK_POINT).toBeLessThan(PRESSURE_MAX);
    expect(stageIndexAt(FEEDBACK_POINT)).toBe(STAGES.length - 1);
  });
});

describe("the set list", () => {
  it("numbers every track once", () => {
    const codes = ALL_ITEMS.map((item) => item.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).not.toContain(RELEASE.code);
  });

  it("keeps availability reportable as a percentage", () => {
    ALL_ITEMS.forEach((item) => {
      expect(item.availability).toBeGreaterThanOrEqual(0);
      expect(item.availability).toBeLessThanOrEqual(100);
    });
  });

  it("flattens to exactly what the sets hold", () => {
    expect(ALL_ITEMS.length).toBe(
      SET_LIST.reduce((n, set) => n + set.items.length, 0),
    );
  });
});

describe("the ticket", () => {
  it("totals from the set list rather than from the caller", () => {
    const lines = [
      { code: "01", qty: 2 },
      { code: "03", qty: 1 },
    ];
    const expected = itemByCode("01")!.price * 2 + itemByCode("03")!.price;
    expect(orderTotal(lines)).toBe(expected);
    expect(orderCount(lines)).toBe(3);
  });

  it("ignores a line for something that is no longer on the menu", () => {
    expect(orderTotal([{ code: "does-not-exist", qty: 3 }])).toBe(0);
    expect(orderCount([{ code: "does-not-exist", qty: 3 }])).toBe(3);
  });

  it("prints a stable four-digit number for the same ticket", () => {
    expect(orderNumber(482)).toBe(orderNumber(482));
    expect(orderNumber(482)).toMatch(/^\d{4}$/);
    expect(orderNumber(-999.6)).toMatch(/^\d{4}$/);
  });
});
