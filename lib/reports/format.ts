/**
 * How report numbers are written. Anything missing is "—", never $0 or 0%.
 */

export const DASH = "—";

export function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return DASH;
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const s = (abs / 100).toLocaleString("en-US", { minimumFractionDigits: abs % 100 ? 2 : 0, maximumFractionDigits: 2 });
  return `${neg ? "−" : ""}$${s}`;
}

export function count(n: number | null | undefined): string {
  return n === null || n === undefined ? DASH : n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export function pct(n: number | null | undefined, digits = 0): string {
  return n === null || n === undefined ? DASH : `${n.toFixed(digits)}%`;
}

export type Unit = "money" | "count" | "pct";

export function fmt(unit: Unit, v: number | null): string {
  return unit === "money" ? money(v) : unit === "pct" ? pct(v) : count(v);
}

/**
 * "↑ $120 (+12%) vs previous 30 days". Percentage points for rates, so a
 * no-show rate going from 4% to 6% reads "+2 pts", not "+50%".
 */
export function changeText(unit: Unit, cur: number | null, prev: number | null, days: number): string {
  if (cur === null || prev === null) return prev === null ? `No data for the previous ${days} days` : `Previous ${days} days: ${fmt(unit, prev)}`;
  const delta = cur - prev;
  if (Math.abs(delta) < 1e-9) return `Same as the previous ${days} days`;
  const arrow = delta > 0 ? "↑" : "↓";
  if (unit === "pct") return `${arrow} ${Math.abs(delta).toFixed(1)} pts vs previous ${days} days`;
  const rel = prev !== 0 ? ` (${delta > 0 ? "+" : "−"}${Math.abs((delta / prev) * 100).toFixed(0)}%)` : "";
  return `${arrow} ${fmt(unit, Math.abs(delta))}${rel} vs previous ${days} days`;
}

/** "Nov 12", for a "yyyy-mm-dd" date. */
export function dayLabel(d: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
}
