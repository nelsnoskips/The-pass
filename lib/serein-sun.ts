/**
 * Sunset for Santa Barbara, computed locally (NOAA approximation, no
 * API). SEREIN seats once, as the sun reaches the water, so the hour
 * moves with the season: the site and the reservation calendar both
 * read tonight's real dusk rather than a fixed time.
 */

const LAT = 34.4208;
const LON = -119.6982;
const RAD = Math.PI / 180;

/** Sunset as a Date for the given calendar day. */
export function sunsetFor(date: Date): Date {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000,
  );
  const zenith = 90.833;
  const D = dayOfYear + (18 - LON / 15) / 24;
  const M = 0.9856 * D - 3.289;
  let L = M + 1.916 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 282.634;
  L = ((L % 360) + 360) % 360;
  let RA = Math.atan(0.91764 * Math.tan(L * RAD)) / RAD;
  RA = ((RA % 360) + 360) % 360;
  RA += (Math.floor(L / 90) - Math.floor(RA / 90)) * 90;
  RA /= 15;
  const sinDec = 0.39782 * Math.sin(L * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(zenith * RAD) - sinDec * Math.sin(LAT * RAD)) / (cosDec * Math.cos(LAT * RAD));
  const H = Math.acos(cosH) / RAD / 15;
  const T = H + RA - 0.06571 * D - 6.622;
  let UT = T - LON / 15;
  UT = ((UT % 24) + 24) % 24;
  const sunset = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  sunset.setUTCMinutes(Math.round(UT * 60));
  return sunset;
}

/** Display-ready local time in Santa Barbara, e.g. "7:45 PM". */
export function formatSunset(date: Date): string {
  return sunsetFor(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

/** Doors open half an hour before the first course. */
export function formatDoors(date: Date): string {
  const d = sunsetFor(date);
  d.setMinutes(d.getMinutes() - 30);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

export const SERVICE_DAYS = [0, 1, 4, 5, 6]; // Sun, Mon, Thu, Fri, Sat

export function isServiceDay(date: Date): boolean {
  return SERVICE_DAYS.includes(date.getDay());
}

/**
 * Stable pseudo-availability for a concept booking flow: derived from
 * the date itself, so a given evening always shows the same state
 * (no flicker between renders, no server/client mismatch).
 */
export function availabilityFor(date: Date): "open" | "few" | "full" {
  const key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const h = (key * 2654435761) % 100;
  if (h < 22) return "full";
  if (h < 45) return "few";
  return "open";
}
