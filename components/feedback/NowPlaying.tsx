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

      {/* Stacked, not two columns: this section now shares a row with
          All Ages, so its own width is half the page. */}
      <div className="mt-8 grid gap-10">
        <div>
          <h2
            id="release-heading"
            className="fbk-display text-[clamp(34px,3.6vw,52px)]"
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
        <div ref={card} className="relative max-w-[420px] transition-transform duration-200">
          <div className="relative border border-[rgba(232,225,211,0.2)] bg-[#0b0908] p-4">
            <Plate
              src={RELEASE.cover}
              alt={`${RELEASE.title} — this month's burger`}
              className="aspect-square w-full"
              imgClassName="h-full w-full object-cover"
            />
            <div className="mt-4">
              <Transport spinning={entered && !pressure.reduced} />
            </div>
          </div>

          {entered && (
            <span
              className={`fbk-label absolute -bottom-5 left-4 z-10 border-2 border-[var(--fb-red)] px-3 py-1.5 text-[var(--fb-red)] ${
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

/**
 * The transport, not the tape.
 *
 * The photograph above is already a cassette, so drawing a second one
 * underneath it only competes. What is missing from a still is that the
 * thing is *running* — so this is the deck: two spools turning and a
 * position line creeping across, which is the one piece of information
 * a photograph cannot carry.
 */
function Transport({ spinning }: { spinning: boolean }) {
  return (
    <div className="flex items-center gap-3 border-t border-[rgba(232,225,211,0.14)] pt-3">
      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden>
        <circle cx="10" cy="10" r="9" fill="none" stroke="rgba(232,225,211,0.3)" />
        <g className={spinning ? "fbk-spool" : undefined} style={{ transformOrigin: "10px 10px" }}>
          {[0, 1, 2].map((i) => (
            <line
              key={i}
              x1="10"
              y1="10"
              x2={10 + Math.cos((i / 3) * Math.PI * 2) * 7}
              y2={10 + Math.sin((i / 3) * Math.PI * 2) * 7}
              stroke="rgba(232,225,211,0.65)"
              strokeWidth="1.6"
            />
          ))}
        </g>
      </svg>

      <span className="fbk-mono text-[10px] tracking-widest text-[rgba(232,225,211,0.55)]">
        {RELEASE.format}
      </span>

      <span className="relative h-px flex-1 bg-[rgba(232,225,211,0.18)]">
        <span
          className={`absolute inset-y-0 left-0 bg-[var(--fb-red)] ${spinning ? "fbk-creep" : ""}`}
          style={{ width: spinning ? undefined : "38%" }}
        />
      </span>

      <span className="fbk-mono text-[10px] tracking-widest text-[rgba(232,225,211,0.55)]">
        SIDE A
      </span>

      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden>
        <circle cx="10" cy="10" r="9" fill="none" stroke="rgba(232,225,211,0.3)" />
        <g
          className={spinning ? "fbk-spool fbk-spool-slow" : undefined}
          style={{ transformOrigin: "10px 10px" }}
        >
          {[0, 1, 2].map((i) => (
            <line
              key={i}
              x1="10"
              y1="10"
              x2={10 + Math.cos((i / 3) * Math.PI * 2 + 0.6) * 7}
              y2={10 + Math.sin((i / 3) * Math.PI * 2 + 0.6) * 7}
              stroke="rgba(232,225,211,0.65)"
              strokeWidth="1.6"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
