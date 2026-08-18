"use client";

import { useEffect, useMemo, useState } from "react";
import { HOUSE } from "@/lib/house";
import { subscribeScrub } from "./scrubStore";

/**
 * Live status: how many birds are left. A rotisserie that cooks a set
 * number and stops is the truest thing about this house, so the site
 * says it out loud and keeps saying it as the day goes.
 *
 * In the hero it does something more. Passed `scrub`, it takes its hour
 * from the scroll rather than the clock: the page opens at eleven with a
 * full spit and runs forward to the present as the visitor scrolls, the
 * count falling with the film behind it. The scroll is the working day.
 * By the time the hero resolves it has caught up with the real time and
 * hands back to the clock, so what finally rests on screen is true.
 *
 * Renders a stable placeholder until mounted, since it depends on the
 * visitor's own clock.
 */

const OPEN_HOUR = 11;
const CLOSE_HOUR = 21;

/** Everything the counter shows is a function of one number: the hour. */
function stateAtHour(hours: number): { left: number; stamp: string } {
  const through = Math.min(
    1,
    Math.max(0, (hours - OPEN_HOUR) / (CLOSE_HOUR - OPEN_HOUR)),
  );
  // Sells faster over lunch, slows through the afternoon.
  const left = Math.max(
    0,
    Math.round(HOUSE.birdsAtOpen * (1 - Math.pow(through, 0.72))),
  );

  const whole = Math.floor(hours);
  const stamped = new Date();
  stamped.setHours(whole, Math.min(59, Math.round((hours - whole) * 60)), 0, 0);
  const stamp = stamped.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return { left, stamp };
}

export function ChickenCount({
  variant,
  scrub = false,
}: {
  variant: "pill" | "sticker";
  /** Take the hour from the scroll instead of the clock. Hero only. */
  scrub?: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d.getHours() + d.getMinutes() / 60);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!scrub) return;
    return subscribeScrub(setProgress);
  }, [scrub]);

  const state = useMemo(() => {
    if (now === null) return null;
    if (!scrub) return stateAtHour(now);
    // Before opening there is no day to play forward; sit at the top.
    const to = Math.max(now, OPEN_HOUR);
    return stateAtHour(OPEN_HOUR + (to - OPEN_HOUR) * progress);
  }, [now, progress, scrub]);

  const sold = state?.left === 0;

  if (variant === "pill") {
    return (
      <span className="hse-label inline-flex items-center gap-2 bg-[#E8552A] px-3 py-1.5 text-[#14120F]">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#14120F]" />
        {state === null
          ? "Chickens on"
          : sold
            ? "Chickens sold out"
            : `Chickens on · ${state.left} left`}
      </span>
    );
  }

  return (
    <div className="hse-sticker inline-block bg-[#E8552A] px-6 py-5 text-[#14120F]">
      <p className="hse-label">Live status</p>
      <p className="hse-display mt-2 text-[26px] leading-none">
        {sold ? "Sold out" : "Chickens on"}
      </p>
      <p className="hse-display hse-num mt-1 text-[64px] leading-[0.85]">
        {state === null ? "··" : state.left}
        {!sold && <span className="ml-2 text-[24px]">left</span>}
      </p>
      <p className="hse-label mt-3 opacity-70">
        {state === null ? "Checking the spit" : `As of ${state.stamp}`}
      </p>
    </div>
  );
}
