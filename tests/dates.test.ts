import { describe, expect, it } from "vitest";
import {
  chartGrouping,
  comparisonRange,
  daySpan,
  eachDay,
  resolvePreset,
} from "@/lib/dates";

const TODAY = "2026-08-12";

describe("resolvePreset", () => {
  it("last_30 covers the 30 days ending yesterday", () => {
    const r = resolvePreset("last_30", TODAY);
    expect(r).toEqual({ start: "2026-07-13", end: "2026-08-11" });
    expect(daySpan(r)).toBe(30);
  });

  it("this_month runs from the 1st through elapsed days", () => {
    const r = resolvePreset("this_month", TODAY);
    expect(r.start).toBe("2026-08-01");
    expect(r.end).toBe("2026-08-11");
  });

  it("last_month covers the full prior calendar month", () => {
    expect(resolvePreset("last_month", TODAY)).toEqual({
      start: "2026-07-01",
      end: "2026-07-31",
    });
  });

  it("handles month boundaries in last_month from January", () => {
    expect(resolvePreset("last_month", "2026-01-15")).toEqual({
      start: "2025-12-01",
      end: "2025-12-31",
    });
  });
});

describe("comparisonRange", () => {
  it("previous_period immediately precedes with the same span", () => {
    const current = { start: "2026-07-13", end: "2026-08-11" };
    const prev = comparisonRange(current, "previous_period");
    expect(prev).toEqual({ start: "2026-06-13", end: "2026-07-12" });
    expect(daySpan(prev!)).toBe(30);
  });

  it("this_month compares only the same number of elapsed days in the prior month", () => {
    const current = resolvePreset("this_month", TODAY); // Aug 1–11 = 11 days
    const prev = comparisonRange(current, "previous_period", "this_month");
    expect(prev).toEqual({ start: "2026-07-01", end: "2026-07-11" });
    expect(daySpan(prev!)).toBe(daySpan(current));
  });

  it("clamps elapsed days to the prior month's length", () => {
    // March 31 elapsed days vs February.
    const current = { start: "2026-03-01", end: "2026-03-30" };
    const prev = comparisonRange(current, "previous_period", "this_month");
    expect(prev!.start).toBe("2026-02-01");
    expect(prev!.end).toBe("2026-02-28");
  });

  it("previous_year shifts the same calendar dates back one year", () => {
    const prev = comparisonRange(
      { start: "2026-07-13", end: "2026-08-11" },
      "previous_year",
    );
    expect(prev).toEqual({ start: "2025-07-13", end: "2025-08-11" });
  });

  it("none returns null", () => {
    expect(
      comparisonRange({ start: "2026-07-13", end: "2026-08-11" }, "none"),
    ).toBeNull();
  });
});

describe("chart grouping and day iteration", () => {
  it("groups daily up to 90 days and weekly beyond", () => {
    expect(chartGrouping({ start: "2026-05-14", end: "2026-08-11" })).toBe("day");
    expect(chartGrouping({ start: "2026-01-01", end: "2026-08-11" })).toBe("week");
  });

  it("eachDay is inclusive and ordered", () => {
    const days = eachDay({ start: "2026-07-30", end: "2026-08-02" });
    expect(days).toEqual(["2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02"]);
  });
});
