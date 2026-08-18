"use client";

import { useState } from "react";
import { SAUCES } from "@/lib/feedback";
import { Plate } from "./Plate";
import { Waveform } from "./Waveform";
import { useSound } from "./state";

/**
 * 04 / SAUCE PEDAL BOARD — the three sauces as pedals.
 *
 * Engaging one lights its indicator, patches a cable to the board's
 * output, lifts the bottle off the deck, prints its description, and —
 * the part that makes the section worth building — changes what the
 * waveform behind the board *is*. The house sauce is a clean sine, the
 * spicy boost is a gain stage with hard transients, the garlic crunch
 * is clipped and quantised. Three different functions, not three
 * heights of the same one.
 *
 * One pedal is engaged at a time, the way a channel selector works.
 */

export function Pedalboard() {
  const [active, setActive] = useState(SAUCES[0].id);
  const sound = useSound();
  const selected = SAUCES.find((s) => s.id === active) ?? SAUCES[0];

  return (
    <section
      id="sauces"
      className="fbk-steel fbk-grille relative overflow-hidden px-5 py-16 sm:px-8"
      aria-labelledby="sauces-heading"
    >
      {/* The board's own signal, running behind the pedals. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 opacity-25"
      >
        <Waveform
          key={selected.personality}
          personality={selected.personality}
          amplitude={0.85}
          cycles={selected.personality === "clipped" ? 14 : 20}
          className="h-full w-full text-[var(--fb-bone)]"
          strokeWidth={1.5}
          height={160}
        />
      </div>

      <div className="relative">
        <p className="fbk-label flex items-center gap-3 text-[rgba(232,225,211,0.65)]">
          <span className="fbk-chip">04</span> Sauce pedal board
        </p>

        <h2
          id="sauces-heading"
          className="fbk-display mt-8 text-center text-[clamp(32px,5.5vw,64px)]"
        >
          Find your signal.
        </h2>

        <div className="mx-auto mt-12 grid max-w-[900px] grid-cols-3 gap-4 sm:gap-8">
          {SAUCES.map((sauce) => {
            const on = sauce.id === active;
            return (
              <button
                key={sauce.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setActive(sauce.id);
                  sound.click();
                }}
                className="group flex flex-col items-center text-center outline-none"
                style={{
                  transform: on ? "translateY(-10px)" : "none",
                  transition: "transform 200ms cubic-bezier(0.2,0.8,0.3,1)",
                }}
              >
                <Plate
                  src={sauce.image}
                  alt={`${sauce.name} bottle`}
                  className="h-[150px] w-full sm:h-[220px]"
                  imgClassName="h-full w-full object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,0.6)]"
                  fallback={<Bottle sauce={sauce.name} lit={on} led={sauce.led} />}
                />

                {/* The pedal's own panel: indicator, name, gain range. */}
                <span
                  className="mt-3 block w-full border px-2 py-3"
                  style={{
                    borderColor: on
                      ? "rgba(226,59,46,0.6)"
                      : "rgba(232,225,211,0.18)",
                    background: on ? "rgba(226,59,46,0.08)" : "rgba(11,9,8,0.55)",
                    transition: "border-color 180ms ease, background 180ms ease",
                  }}
                >
                  <span
                    className={`fbk-led mx-auto block ${on ? "fbk-led-on" : ""} ${
                      sauce.led === "#E8A33D" ? "fbk-led-amber" : ""
                    }`}
                  />
                  {/* The bottle's own label already says which sauce it
                      is, so the plate under it reports what engaging it
                      does to the signal instead of repeating the name. */}
                  <span className="fbk-display mt-2 block text-[15px] sm:text-[19px]">
                    {sauce.personality}
                  </span>
                  <span className="fbk-mono mt-1 flex justify-between text-[9px] text-[rgba(232,225,211,0.45)]">
                    <span>{sauce.heat}</span>
                    <span>{on ? "ON" : "OFF"}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* The patch cable, running from the engaged pedal to the out. */}
        <Cable index={SAUCES.findIndex((s) => s.id === active)} />

        <p
          key={selected.id}
          className="mx-auto mt-6 max-w-[52ch] text-center text-[14px] leading-relaxed text-[rgba(232,225,211,0.8)]"
          style={{ animation: "fbk-cut-in 260ms ease-out both" }}
        >
          <span className="fbk-label mr-2 text-[var(--fb-red)]">
            {selected.heat}
          </span>
          {selected.description}
        </p>

        <div className="mt-10 flex items-center justify-between border-t border-[rgba(232,225,211,0.14)] pt-4">
          <p className="fbk-label text-[rgba(232,225,211,0.5)]">
            Twist to dial in · More heat · More flavor
          </p>
          <span className="fbk-mono flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(232,225,211,0.3)] text-[11px]">
            FB
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * The patch lead. Drawn as one curve per position rather than animated
 * between them: a cable does not interpolate, it gets re-plugged.
 */
function Cable({ index }: { index: number }) {
  // The pedals sit in a three-column grid, so their centres are at a
  // sixth, a half and five sixths of the board's width.
  const x = [16.67, 50, 83.33][Math.max(0, index)];

  return (
    <div className="relative mx-auto mt-1 max-w-[900px]">
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-16 w-full"
        aria-hidden
      >
        <path
          key={index}
          d={`M${x} 0 C ${x} 30, 50 26, 50 38`}
          fill="none"
          stroke="var(--fb-red)"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          style={{
            strokeDasharray: 200,
            strokeDashoffset: 200,
            animation: "fbk-patch 340ms ease-out forwards",
          }}
        />
      </svg>
      {/* The board's output jack, in real markup so it stays square
          however wide the cable's viewBox is stretched. */}
      <span className="fbk-mono absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border border-[rgba(232,225,211,0.35)] bg-[#0b0908] px-1.5 py-0.5 text-[9px] tracking-widest text-[rgba(232,225,211,0.6)]">
        OUT
      </span>
    </div>
  );
}

/** Stand-in bottle until the squeeze bottles are shot. */
function Bottle({ sauce, lit, led }: { sauce: string; lit: boolean; led: string }) {
  return (
    <svg viewBox="0 0 120 260" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`fbk-btl-${sauce}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#151110" />
          <stop offset="35%" stopColor="#3a322c" />
          <stop offset="70%" stopColor="#221c19" />
          <stop offset="100%" stopColor="#0e0b0a" />
        </linearGradient>
      </defs>
      <path d="M52 8 h16 v26 h-16 z" fill="#1a1513" />
      <path
        d="M36 42 q24 -12 48 0 q10 6 10 22 l0 168 q0 14 -14 14 l-40 0 q-14 0 -14 -14 l0 -168 q0 -16 10 -22 z"
        fill={`url(#fbk-btl-${sauce})`}
        stroke="rgba(232,225,211,0.16)"
      />
      <rect
        x="30"
        y="96"
        width="60"
        height="96"
        fill={led === "#E8A33D" ? "#E8E1D3" : "#7E1416"}
        opacity={lit ? 1 : 0.75}
      />
      <circle cx="60" cy="212" r="5" fill={lit ? led : "rgba(232,225,211,0.2)"} />
    </svg>
  );
}
