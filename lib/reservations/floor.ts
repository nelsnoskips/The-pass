/**
 * The host stand's clock rules, in one place so the screen and the
 * database agree on them. Pure functions: no database, no React.
 *
 *  - LATE_AFTER_MINUTES: a booked party shows a red "Late" pill this long
 *    after their start time, and only then can they be marked a no-show.
 *  - HOLD_GRACE_MINUTES: how long past their start time a booked party's
 *    table is kept for them when seating walk-ins. Inside the grace window
 *    the walk-in auto-pick won't take their table even if their own hold
 *    has run out; past it the table is fair game (the host can still seat
 *    the late party elsewhere with the table picker).
 *  - UNDO_MINUTES: how long a Seat, Done or No-show can be taken back.
 *  - STALE_SEATED_HOURS: a party left "seated" longer than this (nobody
 *    pressed Table free last night) no longer blocks its table.
 */
export const LATE_AFTER_MINUTES = 15;
export const HOLD_GRACE_MINUTES = 30;
export const UNDO_MINUTES = 15;
export const STALE_SEATED_HOURS = 8;

const MIN = 60_000;

/** Whole minutes past the start time (negative if not yet due). */
export function minutesLate(startsAt: Date, now: Date): number {
  return Math.floor((now.getTime() - startsAt.getTime()) / MIN);
}

/** Late enough for the red pill — and for a no-show. */
export function isLate(startsAt: Date, now: Date): boolean {
  return minutesLate(startsAt, now) >= LATE_AFTER_MINUTES;
}

/** "0:47", "2:05". */
export function formatLate(minutes: number): string {
  const m = Math.max(0, minutes);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** Still inside the window where their table is kept for them. */
export function withinHoldGrace(startsAt: Date, now: Date): boolean {
  return now.getTime() - startsAt.getTime() <= HOLD_GRACE_MINUTES * MIN;
}

/** A status change made at `at` can still be undone at `now`. */
export function canUndo(at: Date, now: Date): boolean {
  const age = now.getTime() - at.getTime();
  return age >= -MIN && age <= UNDO_MINUTES * MIN;
}

/** What an undo puts back: from → to. Anything else can't be undone. */
export const UNDO_TO: Partial<Record<string, readonly string[]>> = {
  seated: ["booked", "confirmed"],
  completed: ["seated"],
  no_show: ["booked", "confirmed"],
};

/**
 * The upcoming list, late parties first (most late at the top), then the
 * rest in time order. Returns a new array.
 */
export function lateFirst<T extends { startsAt: Date; status: string }>(rows: T[], now: Date): T[] {
  const waiting = (r: T) => r.status === "booked" || r.status === "confirmed";
  const late = rows.filter((r) => waiting(r) && isLate(r.startsAt, now))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const rest = rows.filter((r) => !late.includes(r));
  return [...late, ...rest];
}

/** "Placed 6 min ago", "Placed 1 h 5 min ago". */
export function placedAgo(createdAt: Date, now: Date): string {
  const m = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / MIN));
  if (m < 1) return "Placed just now";
  if (m < 60) return `Placed ${m} min ago`;
  return `Placed ${Math.floor(m / 60)} h ${m % 60} min ago`;
}

/** A kitchen ticket still open past its ready time. */
export function orderLate(status: string, readyAt: Date, now: Date): boolean {
  return (status === "placed" || status === "accepted") && now.getTime() > readyAt.getTime();
}

/** A quoted wait, rounded to 5 minutes, between 5 and 120. */
export function roundQuote(minutes: number): number {
  return Math.min(120, Math.max(5, Math.ceil(minutes / 5) * 5));
}
