"use client";

import { useEffect, useState } from "react";
import { formatSunset } from "@/lib/serein-sun";

/**
 * The tide is the clock: tonight's actual Santa Barbara sunset, computed
 * locally. Renders a placeholder until mounted so SSR and client agree.
 */
export function DuskClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => setTime(formatSunset(new Date())), []);

  return (
    <p className="srn-serif text-[clamp(44px,7vw,96px)] leading-none text-[#E9E5DB]">
      {time ?? "\u2014"}
      <span className="ml-4 align-middle text-[16px] tracking-[0.26em] text-[#C9884B]">
        TONIGHT&apos;S DUSK
      </span>
    </p>
  );
}
