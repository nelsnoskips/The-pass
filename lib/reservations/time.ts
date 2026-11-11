/**
 * Venue-local wall time <-> instants, with no date library.
 *
 * A reservation is "7:30pm on Friday in Fort Lauderdale" to everyone
 * involved; the database stores an instant. These helpers are the only
 * place that conversion happens, and they are DST-correct because they
 * ask Intl for the zone's offset at the instant rather than assuming one.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(tz, f);
  }
  return f;
}

function parts(instant: Date, tz: string) {
  const out: Record<string, number> = {};
  for (const p of formatter(tz).formatToParts(instant)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Offset of `tz` from UTC at `instant`, in ms (east positive). */
function offsetMs(instant: Date, tz: string): number {
  const p = parts(instant, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** "2026-11-13" + "19:30" in `tz` -> the instant. In the spring-forward
 *  gap (a time that doesn't exist) it lands an hour later, which is what
 *  a host would mean. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = offsetMs(new Date(guess), tz);
  let t = guess - first;
  const second = offsetMs(new Date(t), tz);
  if (second !== first) t = guess - second;
  return new Date(t);
}

/** The venue-local calendar date of an instant, "yyyy-mm-dd". */
export function localDate(instant: Date, tz: string): string {
  const p = parts(instant, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** The venue-local wall time of an instant, "HH:MM". */
export function localTime(instant: Date, tz: string): string {
  const p = parts(instant, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** 0 = Sunday, for a calendar date (timezone-free). */
export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Whole days from `a` to `b`, both "yyyy-mm-dd". */
export function daysBetween(a: string, b: string): number {
  const toMs = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toMs(b) - toMs(a)) / 86_400_000);
}

export function minutesOf(time: string): number {
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

export function timeOf(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
