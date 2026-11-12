/**
 * An "add to calendar" file for a guest's booking (RFC 5545). Times are
 * written in UTC, so every calendar app shows them in the guest's own
 * zone without needing a VTIMEZONE block.
 */

export interface IcsBooking {
  /** Stable per booking, so re-adding updates the same event. */
  uid: string;
  restaurant: string;
  partySize: number;
  startsAt: Date;
  endsAt: Date;
  address?: string | null;
  phone?: string | null;
  manageUrl?: string | null;
  /** When the file was made. */
  now?: Date;
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escape a TEXT value: backslash, semicolon, comma and newlines. */
export function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are folded with CRLF + space. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let size = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, "utf8");
    if (size + n > (parts.length ? 74 : 75)) { parts.push(cur); cur = ""; size = 0; }
    cur += ch; size += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

export function bookingIcs(b: IcsBooking): string {
  const guests = `${b.partySize} ${b.partySize === 1 ? "guest" : "guests"}`;
  const desc = [
    `Table for ${guests} at ${b.restaurant}.`,
    b.phone ? `Call: ${b.phone}` : "",
    b.manageUrl ? `Change or cancel: ${b.manageUrl}` : "",
  ].filter(Boolean).join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Pass//Reservations//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.uid}`,
    `DTSTAMP:${stamp(b.now ?? new Date())}`,
    `DTSTART:${stamp(b.startsAt)}`,
    `DTEND:${stamp(b.endsAt)}`,
    `SUMMARY:${icsText(`${b.restaurant} · table for ${guests}`)}`,
    ...(b.address ? [`LOCATION:${icsText(b.address)}`] : []),
    `DESCRIPTION:${icsText(desc)}`,
    ...(b.manageUrl ? [`URL:${b.manageUrl}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT2H",
    `DESCRIPTION:${icsText(`${b.restaurant} in 2 hours`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
