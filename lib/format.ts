/**
 * Display formatting. The em dash (`—`) is the canonical rendering for a
 * metric that does not exist — an unsupported platform metric or a ratio with
 * a zero denominator. It must never be replaced with 0.
 */

export const EM_DASH = "—";

export function formatCents(
  cents: number | null,
  opts: { compact?: boolean } = {},
): string {
  if (cents === null) return EM_DASH;
  const dollars = cents / 100;
  if (opts.compact && Math.abs(dollars) >= 1000) {
    return dollars.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCount(value: number | null): string {
  if (value === null) return EM_DASH;
  return value.toLocaleString("en-US");
}

export function formatPercent(value: number | null, decimals = 2): string {
  if (value === null) return EM_DASH;
  return `${value.toFixed(decimals)}%`;
}

export function formatMultiple(value: number | null): string {
  if (value === null) return EM_DASH;
  return `${value.toFixed(2)}×`;
}

export function formatDecimal(value: number | null, decimals = 1): string {
  if (value === null) return EM_DASH;
  return value.toFixed(decimals);
}

export function formatChange(change: number | null): string {
  if (change === null) return EM_DASH;
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

export function formatDateTime(iso: string, timezone = "America/New_York"): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
