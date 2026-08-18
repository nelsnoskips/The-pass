"use client";

import { useRef } from "react";
import { ANATOMY } from "@/lib/feedback";
import { Plate } from "./Plate";
import { Waveform } from "./Waveform";
import { useScrollProgress } from "./useScrollProgress";

/**
 * 02 / THE SIGNAL — "Crisp edges. Heavy feedback."
 *
 * The photograph is pinned and pushed very slightly under the sheet;
 * the torn paper slides across it as the visitor scrolls, and the
 * ingredient annotations draw themselves outward one at a time behind
 * it. The signal runs along the tear, so the edge of the paper is where
 * the sound is — which is the whole conceit of the section.
 *
 * Everything moves on transforms written directly to the nodes: one
 * scroll listener drives the entire composition and React never
 * re-renders through it.
 */

export function SignalSection() {
  const sheet = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const lines = useRef<(HTMLDivElement | null)[]>([]);

  const { ref } = useScrollProgress<HTMLElement>({
    onChange: (p) => {
      // The middle half of the travel is the working range: the section
      // arrives settled and leaves settled.
      const t = Math.min(1, Math.max(0, (p - 0.22) / 0.5));

      // The sheet travels across the photograph rather than onto it:
      // it is legible the whole way, and what changes is how much of
      // the burger is showing beside it.
      sheet.current?.style.setProperty(
        "transform",
        `translate3d(${(-5 + t * 17).toFixed(2)}%, 0, 0)`,
      );
      // The burger pushes the other way, underneath.
      photo.current?.style.setProperty(
        "transform",
        `translate3d(${(t * -3).toFixed(2)}%, 0, 0) scale(${(1.06 + t * 0.05).toFixed(3)})`,
      );

      lines.current.forEach((node, i) => {
        if (!node) return;
        // Each annotation gets its own slice of the travel, so they
        // draw in sequence rather than together.
        const start = 0.32 + i * 0.13;
        const drawn = Math.min(1, Math.max(0, (p - start) / 0.12));
        node.style.setProperty("--fbk-draw", drawn.toFixed(3));
      });
    },
  });

  return (
    <section
      ref={ref}
      id="signal"
      className="fbk-track relative"
      style={{ height: "220vh" }}
      aria-labelledby="signal-heading"
    >
      <div className="fbk-stage flex items-center bg-[#0b0908]">
        {/* The photograph, pinned. */}
        <div ref={photo} className="absolute inset-0 will-change-transform">
          <Plate
            src="/images/feedback/anatomy-cross-section.jpg"
            alt="Cross-section of the double smash: crust, cheese and onion"
            className="h-full w-full"
            imgClassName="h-full w-full object-cover"
            fallback={<AnatomyStandIn />}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0908]/85 via-transparent to-[#0b0908]/70" />
        </div>

        {/* Annotations: the dot lands on the burger, the leader draws
            outward from it, and the label arrives last. One group per
            note, so the three parts can never drift apart. */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          {ANATOMY.map((note, i) => (
            <div
              key={note.label}
              ref={(node) => {
                lines.current[i] = node;
              }}
              className="fbk-cal right-8"
              style={{ top: `${note.at}%`, ["--fbk-draw" as string]: "0" }}
            >
              <span
                className="fbk-cal-dot"
                style={{ transform: "scale(var(--fbk-draw))" }}
              />
              <span
                className="fbk-cal-line"
                style={{ width: "5.5rem", transform: "scaleX(var(--fbk-draw))" }}
              />
              <span
                className="fbk-label whitespace-nowrap text-[var(--fb-bone)]"
                style={{
                  opacity: "var(--fbk-draw)",
                  transition: "opacity 300ms ease",
                }}
              >
                {note.label}
                <span className="fbk-mono ml-2 block text-[10px] normal-case tracking-normal text-[rgba(232,225,211,0.55)]">
                  {note.detail}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* The torn sheet, sliding across. */}
        <div
          ref={sheet}
          className="fbk-torn-b fbk-paper relative z-10 h-full w-[86%] max-w-[760px] will-change-transform"
          style={{ transform: "translate3d(-5%, 0, 0)" }}
        >
          <div className="flex h-full flex-col justify-center px-6 sm:px-12 lg:px-16">
            <p className="fbk-label flex items-center gap-3 text-[#14100e]/60">
              <span className="fbk-chip">02</span> The signal
            </p>
            <h2
              id="signal-heading"
              className="fbk-display mt-6 text-[clamp(38px,7vw,86px)] text-[#14100e]"
            >
              Crisp edges.
              <br />
              Heavy feedback.
            </h2>
            <p className="mt-6 max-w-[40ch] text-[15px] leading-relaxed text-[#14100e]/75">
              Two balls of chuck, pressed flat on a 425° flat top and left alone
              until the edge is lace. Everything after that is just keeping out
              of the way.
            </p>

            {/* The signal runs along the tear itself. */}
            <div className="mt-10 h-12 text-[#14100e]">
              <Waveform
                personality="aggressive"
                amplitude={0.75}
                cycles={22}
                className="h-full w-full"
                strokeWidth={1.25}
                height={48}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Until the macro shot lands: the crust, drawn. */
function AnatomyStandIn() {
  return (
    <div className="fbk-griddle h-full w-full">
      <svg
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="fbk-anat-meat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7A421F" />
            <stop offset="50%" stopColor="#3C2013" />
            <stop offset="100%" stopColor="#1C0F09" />
          </linearGradient>
          <linearGradient id="fbk-anat-cheese" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5C263" />
            <stop offset="100%" stopColor="#CE7A18" />
          </linearGradient>
        </defs>
        {[0, 1].map((row) => (
          <g key={row} transform={`translate(0 ${row * 210})`}>
            <path
              d="M-40 250 q160 -70 340 -60 q220 12 420 -8 q240 -24 520 26 l0 120 l-1280 0 z"
              fill="url(#fbk-anat-meat)"
            />
            <path
              d="M-40 250 q160 -70 340 -60 q220 12 420 -8 q240 -24 520 26"
              fill="none"
              stroke="#B4652A"
              strokeWidth="10"
              opacity="0.65"
            />
            <path
              d="M-40 232 q180 -46 360 -36 q230 12 440 -12 q240 -26 520 20 l0 34
                 q-260 -40 -520 -14 q-210 22 -440 10 q-180 -10 -360 34 z"
              fill="url(#fbk-anat-cheese)"
              opacity="0.9"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
