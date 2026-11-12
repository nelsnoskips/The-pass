import type { Sql } from "postgres";
import { localDate } from "../reservations/time";

/**
 * Report periods: the last 7, 30 or 90 days ending today (in the
 * restaurant's own timezone), and the same number of days just before,
 * for "compared with the previous period". Dates are "yyyy-mm-dd" and
 * both ends are included.
 */

export const PERIODS = [7, 30, 90] as const;
export type PeriodDays = (typeof PERIODS)[number];

export interface Range { since: string; until: string }
export interface Periods { days: PeriodDays; tz: string; cur: Range; prev: Range }

export function parseDays(raw: string | undefined | null, fallback: PeriodDays = 30): PeriodDays {
  return PERIODS.find((d) => String(d) === raw) ?? fallback;
}

/** "2026-11-12" + n days (n may be negative). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Every date from since to until, inclusive. */
export function datesIn(r: Range): string[] {
  const out: string[] = [];
  for (let d = r.since; d <= r.until; d = addDays(d, 1)) out.push(d);
  return out;
}

export function periodsFor(days: PeriodDays, today: string, tz = "UTC"): Periods {
  const cur = { since: addDays(today, -(days - 1)), until: today };
  const prev = { since: addDays(today, -(2 * days - 1)), until: addDays(today, -days) };
  return { days, tz, cur, prev };
}

/** The timezone reports are read in: the group's first venue's. */
export async function orgTimezone(sql: Sql, orgId: string): Promise<string> {
  const [v] = await sql<{ timezone: string }[]>`
    select timezone from venues where org_id = ${orgId} order by created_at, id limit 1`;
  return v?.timezone ?? "America/New_York";
}

export async function periodsForOrg(sql: Sql, orgId: string, days: PeriodDays, now = new Date()): Promise<Periods> {
  const tz = await orgTimezone(sql, orgId);
  return periodsFor(days, localDate(now, tz), tz);
}

/** Change from the previous period. null when either side is missing. */
export interface Change { delta: number | null; pct: number | null }

export function change(cur: number | null, prev: number | null): Change {
  if (cur === null || prev === null) return { delta: null, pct: null };
  return { delta: cur - prev, pct: prev === 0 ? null : ((cur - prev) / Math.abs(prev)) * 100 };
}

/** A share as a percentage, or null when there is nothing to share out. */
export function share(part: number, whole: number): number | null {
  return whole > 0 ? (part / whole) * 100 : null;
}
