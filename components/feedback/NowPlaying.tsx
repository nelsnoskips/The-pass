"use client";

import { useEffect, useRef, useState } from "react";
import { RELEASE, money } from "@/lib/feedback";
import { Plate } from "./Plate";
import { useEntered } from "./useScrollProgress";
import { useOrder, usePressure, useSound } from "./state";

/**
 * 05 / NOW PLAYING — the monthly burger, released like a tape.
 *
 * A special that is only ever a line on a menu is forgotten by the time
 * the guest reaches the counter. Published as a release — with a cover,
 * a catalogue number, a run that ends, and a track listing that is
 * really the ingredients — it becomes something worth coming back for,
 * and the site accumulates a back catalogue instead of going stale.
 *
 * The reels turn only while the section is on screen. The card tilts to
 * the cursor. The stamp lands once, when the section arrives.
 */

export function NowPlaying() {
  const { ref, entered } = useEntered<HTMLElement>(0.3);
  const card = useRef<HTMLDivElement>(null);
  const pressure = usePressure();
  const order = useOrder();
  const sound = useSound();
  const [revealed, setRevealed] = useState(0);
  const tracks = pressure.reduced ? RELEASE.tracks.length : revealed;

  /* The card leans toward the cursor — a couple of degrees, no more.
     Written straight to the node, so moving the mouse across this
     section costs no renders. */
  useEffect(() => {
    if (pressure.reduced) return;
    const node = card.current;
    if (!node) return;

    const move = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      node.style.transform = `perspective(900px) rotateY(${(x * 8).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg)`;
    };
    const leave = () => {
      node.style.transform = "";
    };

    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", leave);
    return () => {
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
    };
  }, [pressure.reduced]);

  /* Liner notes: the track listing reveals a line at a time. */
  useEffect(() => {
    if (!entered || pressure.reduced) return;
    const id = window.setInterval(() => {
      setRevealed((n) => {
        if (n >= RELEASE.tracks.length) {
          window.clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 130);
    return () => window.clearInterval(id);
  }, [entered, pressure.reduced]);

  return (
    <section
      ref={ref}
      id="now-playing"
      className="relative bg-[#100c0a] px-5 py-16 sm:px-8"
      aria-labelledby="release-heading"
    >
      <p className="fbk-label flex items-center gap-3 text-[rgba(232,225,211,0.6)]">
        <span className="fbk-chip">05</span> Now playing
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_minmax(280px,420px)] lg:items-center">
        <div>
          <h2
            id="release-heading"
            className="fbk-display text-[clamp(34px,5.5vw,64px)]"
          >
            Now playing:
            <br />
            <span className="text-[var(--fb-red)]">{RELEASE.title}.</span>
          </h2>
          <p className="fbk-label mt-4 text-[rgba(232,225,211,0.6)]">
            {RELEASE.through}
          </p>

          <p className="fbk-label mt-10 text-[rgba(232,225,211,0.45)]">
            Track listing / Ingredients
          </p>
          <ol className="fbk-mono mt-3 space-y-1.5 text-[13px]">
            {RELEASE.tracks.map((track, i) => (
              <li
                key={track}
                className="flex gap-4"
                style={{
                  opacity: i < tracks ? 1 : 0,
                  transform: i < tracks ? "none" : "translateY(6px)",
                  transition: "opacity 260ms ease, transform 260ms ease",
                }}
              >
                <span className="text-[rgba(232,225,211,0.4)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{track}</span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={() => {
              order.add(RELEASE.code);
              sound.click();
            }}
            className="fbk-btn mt-8"
          >
            Add the release · {money(RELEASE.price)}
          </button>
        </div>

        {/* The cassette: cover, reels, stamp. */}
        <div ref={card} className="relative transition-transform duration-200">
          <div className="relative border border-[rgba(232,225,211,0.2)] bg-[#0b0908] p-4">
            <Plate
              src={RELEASE.cover}
              alt={`${RELEASE.title} — this month's burger`}
              className="aspect-square w-full"
              imgClassName="h-full w-full object-cover"
            />
            <div className="mt-4">
              <Cassette spinning={entered && !pressure.reduced} />
            </div>
            <p className="fbk-mono mt-3 flex justify-between text-[10px] text-[rgba(232,225,211,0.5)]">
              <span>{RELEASE.format}</span>
              <span>SIDE A</span>
            </p>
          </div>

          {entered && (
            <span
              className={`fbk-label absolute -bottom-5 right-4 z-10 border-2 border-[var(--fb-red)] px-3 py-1.5 text-[var(--fb-red)] ${
                pressure.reduced ? "" : "fbk-stamped"
              }`}
              style={{ transform: "rotate(-9deg)" }}
            >
              {RELEASE.note}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/** A tape deck, drawn: two reels, one full, one filling. */
function Cassette({ spinning }: { spinning: boolean }) {
  return (
    <svg viewBox="0 0 320 120" className="w-full" aria-hidden>
      <rect x="2" y="2" width="316" height="116" fill="#15100e" stroke="rgba(232,225,211,0.22)" />
      <rect x="26" y="18" width="268" height="52" fill="#0b0908" stroke="rgba(232,225,211,0.14)" />
      {[
        { cx: 96, r: 26, slow: false },
        { cx: 224, r: 26, slow: true },
      ].map((reel) => (
        <g key={reel.cx}>
          <circle cx={reel.cx} cy="44" r={reel.r} fill="#2a2320" />
          <circle cx={reel.cx} cy="44" r={reel.r - 8} fill="#0b0908" />
          <g
            className={spinning ? `fbk-spool${reel.slow ? " fbk-spool-slow" : ""}` : undefined}
            style={{ transformOrigin: `${reel.cx}px 44px` }}
          >
            {Array.from({ length: 6 }, (_, i) => {
              const angle = (i / 6) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={reel.cx + Math.cos(angle) * 6}
                  y1={44 + Math.sin(angle) * 6}
                  x2={reel.cx + Math.cos(angle) * 16}
                  y2={44 + Math.sin(angle) * 16}
                  stroke="rgba(232,225,211,0.55)"
                  strokeWidth="2.5"
                />
              );
            })}
          </g>
        </g>
      ))}
      <rect x="26" y="84" width="268" height="20" fill="#0b0908" stroke="rgba(232,225,211,0.12)" />
    </svg>
  );
}
