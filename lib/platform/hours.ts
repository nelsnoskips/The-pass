/**
 * Website opening hours written from the service periods guests book
 * against, so the hours on the site and the times on the booking page
 * come from one place. The owner can still edit the text afterwards.
 */

export interface PeriodLike { name: string; daysOfWeek: number[]; firstSeating: string; lastSeating: string }

const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** The week as restaurants write it: Monday first. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/** "17:00" -> "5 PM", "21:30" -> "9:30 PM" */
export function clock(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

/** Days (0 = Sunday) as "Tue–Sun", "Mon, Wed", or "Every day". */
export function dayRange(days: number[]): string {
  const set = new Set(days);
  if (set.size === 7) return "Every day";
  const runs: number[][] = [];
  for (const d of WEEK) {
    if (!set.has(d)) continue;
    const last = runs[runs.length - 1];
    const prev = last ? last[last.length - 1] : null;
    if (last && WEEK.indexOf(d) === WEEK.indexOf(prev!) + 1) last.push(d);
    else runs.push([d]);
  }
  return runs.map((r) => (r.length >= 3 ? `${NAMES[r[0]]}–${NAMES[r[r.length - 1]]}` : r.map((d) => NAMES[d]).join(", "))).join(", ");
}

/**
 * One row per group of days that share the same services, Monday first;
 * days with no service are listed as Closed.
 */
export function hoursFromPeriods(periods: PeriodLike[]): { days: string; hours: string }[] {
  if (periods.length === 0) return [];
  const sorted = [...periods].sort((a, b) => a.firstSeating.localeCompare(b.firstSeating));
  // First to last seating, named when there's room (the site allows 60 characters a row).
  const span = (p: PeriodLike) => `${clock(p.firstSeating)}–${clock(p.lastSeating)}`;
  const byDay = new Map<number, string>();
  for (const d of WEEK) {
    const serving = sorted.filter((p) => p.daysOfWeek.includes(d));
    const named = serving.map((p) => `${p.name ? `${p.name} ` : ""}${span(p)}`).join(" · ");
    byDay.set(d, !serving.length ? "Closed" : named.length <= 60 ? named : serving.map(span).join(", ").slice(0, 60));
  }
  const groups = new Map<string, number[]>();
  for (const d of WEEK) groups.set(byDay.get(d)!, [...(groups.get(byDay.get(d)!) ?? []), d]);
  return [...groups.entries()]
    .sort(([a, x], [b, y]) => (a === "Closed" ? 1 : 0) - (b === "Closed" ? 1 : 0) || WEEK.indexOf(x[0]) - WEEK.indexOf(y[0]))
    .map(([hours, days]) => ({ days: dayRange(days), hours }));
}
