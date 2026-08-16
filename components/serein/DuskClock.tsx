"use client";

import { useEffect, useState } from "react";

/**
 * The tide is the clock: computes tonight's actual sunset for Santa
 * Barbara (NOAA solar position approximation — no API, no network) and
 * shows when the first course is served. Renders a stable fallback
 * until mounted so SSR and client agree.
 */

const LAT = 34.4208;
const LON = -119.6982;

function sunsetFor(date: Date): Date {
  // NOAA simplified sunset calculation.
  const rad = Math.PI / 180;
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000);
  const zenith = 90.833;
  const D = dayOfYear + (18 - LON / 15) / 24;
  const M = 0.9856 * D - 3.289;
  let L = M + 1.916 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 282.634;
  L = ((L % 360) + 360) % 360;
  let RA = Math.atan(0.91764 * Math.tan(L * rad)) / rad;
  RA = ((RA % 360) + 360) % 360;
  RA += (Math.floor(L / 90) - Math.floor(RA / 90)) * 90;
  RA /= 15;
  const sinDec = 0.39782 * Math.sin(L * rad);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(zenith * rad) - sinDec * Math.sin(LAT * rad)) / (cosDec * Math.cos(LAT * rad));
  const H = (Math.acos(cosH) / rad) / 15;
  const T = H + RA - 0.06571 * D - 6.622;
  let UT = T - LON / 15;
  UT = ((UT % 24) + 24) % 24;
  const sunset = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  sunset.setUTCMinutes(Math.round(UT * 60));
  return sunset;
}

export function DuskClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const sunset = sunsetFor(new Date());
    setTime(
      sunset.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Los_Angeles",
      }),
    );
  }, []);

  return (
    <p className="srn-serif text-[clamp(44px,7vw,96px)] leading-none text-[#E9E5DB]">
      {time ?? "—"}
      <span className="ml-4 align-middle text-[16px] tracking-[0.26em] text-[#C9884B]">
        TONIGHT&apos;S DUSK
      </span>
    </p>
  );
}
