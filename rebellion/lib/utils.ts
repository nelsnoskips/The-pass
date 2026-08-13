import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an ISO date for the happenings rail.
 * Parsed and formatted in UTC so the server and client always agree — a
 * locale-drifting date in the rail would hydrate mismatched.
 */
export function eventDate(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(d);
  return {
    month: fmt({ month: "short" }).toUpperCase(),
    day: fmt({ day: "numeric" }),
    weekday: fmt({ weekday: "short" }).toUpperCase(),
    full: fmt({ weekday: "long", month: "long", day: "numeric" }),
    iso,
  };
}
