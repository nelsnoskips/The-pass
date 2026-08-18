"use client";

import { useRef } from "react";
import { ANATOMY, SURFACE } from "@/lib/feedback";
import { Plate } from "./Plate";
import { Waveform } from "./Waveform";
import { useScrollProgress } from "./useScrollProgress";

/**
 * 02 / THE SIGNAL — "Crisp edges. Heavy feedback."
 *
 * The comp's device, built literally: the section is a sheet of the
 * bone stock with a long diagonal rip torn out of its upper right, and
 * the macro cross-section shows through the rip. The photograph is
 * pinned and pushed very slightly under the paper as the visitor
 * scrolls; the sheet itself drifts a few percent, so the rip travels
 * over the burger. The fiber layer under the torn edge is what makes
 * the rip read as torn paper rather than a mask.
 *
 * The ingredient callouts sit inside the rip, on the photograph, and
 * draw themselves outward one at a time. Everything moves on transforms
 * written straight to the nodes — one scroll listener, no re-renders.
 */

export function SignalSection() {
  const sheet = useRef<HTMLDivElement>(null);
  const fiber = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const lines = useRef<(HTMLDivElement | null)[]>([]);

  const { ref } = useScrollProgress<HTMLElement>({
    onChange: (p) => {
      const t = Math.min(1, Math.max(0, (p - 0.22) / 0.5));

      // The sheet slides a few percent so the rip moves over the
      // burger; the fiber layer rides with it, offset, so the torn
      // edge stays lit the whole way.
      const drift = (-3.2 + t * 3.2).toFixed(2);
      sheet.current?.style.setProperty("transform", `translate3d(${drift}%, 0, 0)`);
      fiber.current?.style.setProperty(
        "transform",
        `translate3d(calc(${drift}% + 7px), -5px, 0)`,
      );

      // The burger pushes the other way, underneath.
      photo.current?.style.setProperty(
        "transform",
        `translate3d(${(t * -2.5).toFixed(2)}%, 0, 0) scale(${(1.05 + t * 0.05).toFixed(3)})`,
      );

      lines.current.forEach((node, i) => {
        if (!node) return;
        const start = 0.3 + i * 0.12;
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
      <div className="fbk-stage bg-[#0b0908]">
        {/* The photograph, pinned under everything. */}
        <div ref={photo} className="absolute inset-0 will-change-transform">
          <Plate
            src={SURFACE.anatomy}
            alt="Cross-section of the double smash: crust, cheese and onion"
            className="h-full w-full"
            imgClassName="h-full w-full object-cover"
            fallback={<div className="fbk-griddle h-full w-full" />}
          />
          {/* A breath of shade in the rip's corner so the callout type
              stays legible over the brightest part of the crust. */}
          <div className="absolute inset-0 bg-gradient-to-l from-[#0b0908]/55 via-transparent to-transparent" />
        </div>

        {/* The fiber inside the sheet, peeking past the torn edge. */}
        <div
          ref={fiber}
          className="fbk-torn-sheet fbk-tear-fiber absolute inset-0 will-change-transform"
          style={{ transform: "translate3d(calc(-3.2% + 7px), -5px, 0)" }}
          aria-hidden
        />

        {/* The sheet itself, with the diagonal rip cut out of it. */}
        <div
          ref={sheet}
          className="fbk-torn-sheet fbk-stock absolute inset-0 will-change-transform"
          style={{ transform: "translate3d(-3.2%, 0, 0)" }}
          aria-hidden
        />

        {/* The printed side of the sheet. */}
        <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-12 lg:px-16">
          <div className="max-w-[560px]">
            <p className="fbk-label flex items-center gap-3 text-[#14100e]/60">
              <span className="fbk-chip">02</span> The signal
            </p>
            <h2
              id="signal-heading"
              className="fbk-display mt-6 text-[clamp(38px,6.4vw,84px)] text-[#14100e]"
            >
              Crisp edges.
              <br />
              Heavy feedback.
            </h2>
            <p className="mt-6 max-w-[38ch] text-[15px] leading-relaxed text-[#14100e]/75">
              Two balls of chuck, pressed flat on a 425° flat top and left
              alone until the edge is lace. Everything after that is just
              keeping out of the way.
            </p>
          </div>

          {/* The signal, printed on the sheet under the headline. */}
          <div className="mt-10 h-12 max-w-[560px] text-[#14100e]">
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

        {/* Callouts inside the rip, drawing outward toward the edge. */}
        <div className="pointer-events-none absolute inset-0 z-10 hidden lg:block">
          {ANATOMY.map((note, i) => (
            <div
              key={note.label}
              ref={(node) => {
                lines.current[i] = node;
              }}
              className="fbk-cal right-8"
              style={{ top: `${9 + i * 16}%`, ["--fbk-draw" as string]: "0" }}
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
      </div>
    </section>
  );
}
