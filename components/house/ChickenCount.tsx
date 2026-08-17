"use client";

import { useEffect, useState } from "react";
import { HOUSE } from "@/lib/house";

/**
 * Live status: how many birds are left. A rotisserie that cooks a set
 * number and stops is the truest thing about this house, so the site
 * says it out loud and keeps saying it as the day goes.
 *
 * The count reads down from opening across the service window, which
 * makes the page feel staffed rather than published. Renders a stable
 * placeholder until mounted, since it depends on the visitor's clock.
 */

const OPEN_HOUR = 11;
const CLOSE_HOUR = 21;

function birdsLeft(now: Date): { left: number; stamp: string } {
  const hours = now.getHours() + now.getMinutes() / 60;
  const through = Math.min(
    1,
    Math.max(0, (hours - OPEN_HOUR) / (CLOSE_HOUR - OPEN_HOUR)),
  );
  // Sells faster over lunch, slows through the afternoon.
  const curve = Math.pow(through, 0.72);
  const left = Math.max(0, Math.round(HOUSE.birdsAtOpen * (1 - curve)));
  const stamp = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return { left, stamp };
}

export function ChickenCount({ variant }: { variant: "pill" | "sticker" }) {
  const [state, setState] = useState<{ left: number; stamp: string } | null>(null);

  useEffect(() => {
    const tick = () => setState(birdsLeft(new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

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
      <p className="hse-display mt-1 text-[64px] leading-[0.85]">
        {state === null ? "··" : state.left}
        {!sold && <span className="ml-2 text-[24px]">left</span>}
      </p>
      <p className="hse-label mt-3 opacity-70">
        {state === null ? "Checking the spit" : `As of ${state.stamp}`}
      </p>
    </div>
  );
}
