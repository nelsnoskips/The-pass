"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EVENT, LOYALTY, MERCH, money } from "@/lib/feedback";
import { Plate } from "./Plate";
import { useEntered } from "./useScrollProgress";
import { usePressure } from "./state";

/**
 * 06 / ALL AGES — the room, the loyalty pass and the merch table.
 *
 * The motion here is deliberately restrained: a slow push into the
 * crowd photograph, one camera flash as it enters and never again, the
 * loyalty punches stamping in one at a time, and the tee and cap
 * sliding out the way stock gets laid on a table at the back of a
 * venue. After the pedal board, the page needs to come back down.
 */

/** Seven of ten: a real card, part way through. */
const PUNCHED = 7;

export function AllAges() {
  const { ref, entered } = useEntered<HTMLElement>(0.3);
  const pressure = usePressure();
  const [stamping, setStamping] = useState(0);
  // Reduced motion is the finished card, not a card mid-animation.
  const punched = pressure.reduced ? PUNCHED : stamping;

  useEffect(() => {
    if (!entered || pressure.reduced) return;
    const id = window.setInterval(() => {
      setStamping((n) => {
        if (n >= PUNCHED) {
          window.clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 110);
    return () => window.clearInterval(id);
  }, [entered, pressure.reduced]);

  return (
    <section
      ref={ref}
      id="all-ages"
      className="relative overflow-hidden bg-[#0b0908]"
      aria-labelledby="allages-heading"
    >
      {/* The room, pushed into very slowly while it is on screen. */}
      <div className="absolute inset-0">
        <Plate
          src={EVENT.image}
          alt="A packed all-ages room at the counter"
          className="h-full w-full"
          imgClassName="h-full w-full object-cover opacity-45"
          fallback={<div className="fbk-griddle h-full w-full opacity-60" />}
        />
        <div
          aria-hidden
          className="absolute inset-0 h-full w-full"
          style={{
            transform: entered && !pressure.reduced ? "scale(1.06)" : "scale(1)",
            transition: "transform 9s linear",
          }}
        />
        {entered && !pressure.reduced && (
          <span
            aria-hidden
            className="fbk-flash pointer-events-none absolute inset-0 bg-white"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0908] via-[#0b0908]/70 to-[#0b0908]/50" />
      </div>

      <div className="relative px-5 py-16 sm:px-8">
        <p className="fbk-label flex items-center gap-3 text-[rgba(232,225,211,0.65)]">
          <span className="fbk-chip">06</span> All ages
        </p>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div>
            <h2
              id="allages-heading"
              className="fbk-display text-[clamp(36px,6vw,76px)]"
            >
              All ages.
              <br />
              All volume.
            </h2>

            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div>
                <p className="fbk-label text-[rgba(232,225,211,0.5)]">
                  Upcoming show
                </p>
                <p className="fbk-display mt-2 text-[28px]">{EVENT.date}</p>
                <p className="fbk-mono mt-1 text-[13px] text-[rgba(232,225,211,0.75)]">
                  {EVENT.time}
                </p>
                <p className="fbk-mono mt-2 text-[12px] leading-relaxed text-[rgba(232,225,211,0.6)]">
                  {EVENT.detail}
                </p>
                <Link
                  href="/feedback/menu#shows"
                  className="fbk-label mt-4 inline-block text-[var(--fb-red)] underline underline-offset-4"
                >
                  View events →
                </Link>
              </div>

              <div>
                <p className="fbk-label text-[rgba(232,225,211,0.5)]">
                  Merch preview
                </p>
                <div className="mt-3 flex gap-4">
                  {MERCH.map((item, i) => (
                    <div
                      key={item.name}
                      className="flex-1"
                      style={{
                        opacity: entered ? 1 : 0,
                        transform: entered ? "none" : "translateX(28px)",
                        transition: `opacity 420ms ease ${i * 140}ms, transform 420ms cubic-bezier(0.2,0.8,0.3,1) ${i * 140}ms`,
                      }}
                    >
                      <Plate
                        src={item.image}
                        alt={item.name}
                        className="h-24 w-full"
                        imgClassName="h-full w-full object-contain"
                      />
                      <p className="fbk-mono mt-2 text-[11px] text-[rgba(232,225,211,0.7)]">
                        {item.name} · {money(item.price)}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/feedback/merch"
                  className="fbk-label mt-4 inline-block text-[var(--fb-red)] underline underline-offset-4"
                >
                  Shop merch →
                </Link>
              </div>
            </div>
          </div>

          {/* The pass. Ten stamps, and the card knows where it is. */}
          <div className="fbk-paper relative max-w-[380px] rotate-[1deg] border-2 border-[#7E1416] p-5">
            <p className="fbk-display text-center text-[24px] text-[#14100e]">
              {LOYALTY.name}
            </p>
            <p className="fbk-mono mt-1 text-center text-[11px] text-[#14100e]/70">
              {LOYALTY.reward}
            </p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {Array.from({ length: LOYALTY.stamps }, (_, i) => {
                const done = i < punched;
                return (
                  <span
                    key={i}
                    className={`fbk-mono flex aspect-square items-center justify-center rounded-full border-2 text-[12px] ${
                      done
                        ? "border-[#7E1416] bg-[#7E1416] text-[#E8E1D3]"
                        : "border-[#14100e]/30 text-[#14100e]/40"
                    } ${done && !pressure.reduced ? "fbk-stamped" : ""}`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {i + 1}
                  </span>
                );
              })}
            </div>
            <p className="fbk-mono mt-4 text-center text-[10px] text-[#14100e]/55">
              {punched} of {LOYALTY.stamps} · {LOYALTY.stamps - punched} to go
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
