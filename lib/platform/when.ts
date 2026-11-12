/**
 * Dates and times on platform screens, always in the restaurant's own
 * timezone — never the server's (UTC on Netlify) and never the viewer's
 * laptop. Every absolute time a page shows goes through one of these.
 */

/** Used only when an org has no venue yet (and so no timezone). */
export const DEFAULT_TZ = "America/New_York";

/** The restaurant's timezone: its first venue's. */
export function venueTz(venues: { timezone: string }[] | null | undefined): string {
  return venues?.[0]?.timezone || DEFAULT_TZ;
}

const STYLES = {
  /** Nov 12, 2026 */
  date: { month: "short", day: "numeric", year: "numeric" },
  /** Nov 12 */
  day: { month: "short", day: "numeric" },
  /** Nov 12, 6:31 PM */
  datetime: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  /** Thu, Nov 12, 6:31 PM */
  long: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  /** 6:31 PM */
  time: { hour: "numeric", minute: "2-digit" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type WhenStyle = keyof typeof STYLES;

const cache = new Map<string, Intl.DateTimeFormat>();

/** Format an instant in `tz`. Null or invalid dates render "—". */
export function formatIn(d: Date | string | null | undefined, tz: string, style: WhenStyle = "datetime"): string {
  if (d === null || d === undefined) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  const key = `${tz}|${style}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { ...STYLES[style], timeZone: tz });
    cache.set(key, f);
  }
  return f.format(date);
}

/** "5m ago", "3h ago", "2d ago" — relative, so timezone-free. */
export function ago(d: Date, now = Date.now()): string {
  const m = Math.max(1, Math.round((now - d.getTime()) / 60_000));
  return m < 60 ? `${m}m ago` : m < 48 * 60 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
}
