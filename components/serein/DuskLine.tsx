"use client";

import { useEffect, useState } from "react";
import { formatSunset } from "@/lib/serein-sun";

/**
 * One line no template can fake: tonight's actual computed dusk over
 * Santa Barbara, in the hero's opening act. Placeholder until mounted
 * so SSR and client agree.
 */
export function DuskLine() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => setTime(formatSunset(new Date())), []);

  return (
    <p className="srn-label mt-10 text-[12px] text-[#C9884B]/90">
      Tonight over Santa Barbara, the light leaves at {time ?? "—"}
    </p>
  );
}
