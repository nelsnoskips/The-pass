/**
 * Date-range presets and comparison-period logic.
 *
 * All dates are ISO `yyyy-mm-dd` strings interpreted in the brand/location
 * timezone. Partial periods ("This Month") compare only the same number of
 * elapsed days in the prior period.
 */

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last_7"
  | "last_30"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

export type ComparisonMode = "previous_period" | "previous_year" | "none";

export interface DateRange {
  start: string;
  end: string;
}

export const PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_7: "Last 7 Days",
  last_30: "Last 30 Days",
  this_month: "This Month",
  last_month: "Last Month",
  this_quarter: "This Quarter",
  this_year: "This Year",
  custom: "Custom",
};

export const COMPARISON_LABELS: Record<ComparisonMode, string> = {
  previous_period: "Previous period",
  previous_year: "Previous year",
  none: "No comparison",
};

export function toISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** Inclusive day count between two ISO dates. */
export function daySpan(range: DateRange): number {
  const ms =
    parseISODate(range.end).getTime() - parseISODate(range.start).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

export function eachDay(range: DateRange): string[] {
  const days: string[] = [];
  let cursor = range.start;
  while (cursor <= range.end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/**
 * Resolve a preset to a concrete range. `today` is the current date in the
 * reporting timezone; reporting data runs through yesterday, so ranges that
 * would end today end yesterday instead (except the explicit Today preset).
 */
export function resolvePreset(
  preset: DateRangePreset,
  today: string,
  custom?: DateRange,
): DateRange {
  const yesterday = addDays(today, -1);
  switch (preset) {
    case "today":
      return { start: today, end: today };
    case "yesterday":
      return { start: yesterday, end: yesterday };
    case "last_7":
      return { start: addDays(yesterday, -6), end: yesterday };
    case "last_30":
      return { start: addDays(yesterday, -29), end: yesterday };
    case "this_month": {
      const d = parseISODate(today);
      const start = toISODate(
        new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)),
      );
      return { start, end: today < start ? start : minISO(yesterday, today) };
    }
    case "last_month": {
      const d = parseISODate(today);
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0));
      return { start: toISODate(start), end: toISODate(end) };
    }
    case "this_quarter": {
      const d = parseISODate(today);
      const qStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
      const start = toISODate(
        new Date(Date.UTC(d.getUTCFullYear(), qStartMonth, 1)),
      );
      return { start, end: minISO(yesterday, today) < start ? start : minISO(yesterday, today) };
    }
    case "this_year": {
      const d = parseISODate(today);
      const start = toISODate(new Date(Date.UTC(d.getUTCFullYear(), 0, 1)));
      return { start, end: minISO(yesterday, today) < start ? start : minISO(yesterday, today) };
    }
    case "custom":
      return custom ?? { start: addDays(yesterday, -29), end: yesterday };
  }
}

function minISO(a: string, b: string): string {
  return a < b ? a : b;
}

/**
 * Comparison range for a resolved current range.
 *
 * - `previous_period`: the same number of days immediately before the range.
 *   This also implements the partial-period rule — "This Month" resolves to
 *   elapsed days only, so the comparison covers the same elapsed count.
 * - `previous_year`: the same calendar dates one year earlier.
 */
export function comparisonRange(
  range: DateRange,
  mode: ComparisonMode,
  preset?: DateRangePreset,
): DateRange | null {
  if (mode === "none") return null;
  if (mode === "previous_year") {
    return { start: shiftYear(range.start), end: shiftYear(range.end) };
  }
  // Month-shaped presets compare against the same elapsed days of the prior month.
  if (preset === "this_month" || preset === "last_month") {
    const start = parseISODate(range.start);
    const prevStart = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1),
    );
    const elapsed = daySpan(range);
    const prevMonthDays = new Date(
      Date.UTC(prevStart.getUTCFullYear(), prevStart.getUTCMonth() + 1, 0),
    ).getUTCDate();
    const days = Math.min(elapsed, prevMonthDays);
    return {
      start: toISODate(prevStart),
      end: addDays(toISODate(prevStart), days - 1),
    };
  }
  const span = daySpan(range);
  const end = addDays(range.start, -1);
  return { start: addDays(end, -(span - 1)), end };
}

function shiftYear(iso: string): string {
  const d = parseISODate(iso);
  const shifted = new Date(
    Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate()),
  );
  return toISODate(shifted);
}

/** Daily grouping up to 90 days, weekly beyond. */
export function chartGrouping(range: DateRange): "day" | "week" {
  return daySpan(range) <= 90 ? "day" : "week";
}

export function formatRangeLabel(range: DateRange): string {
  const fmt = (iso: string) =>
    parseISODate(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  if (range.start === range.end) return fmt(range.start);
  return `${fmt(range.start)} – ${fmt(range.end)}`;
}

/** Today's ISO date in a given IANA timezone. */
export function todayInTimezone(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA yields yyyy-mm-dd
}
