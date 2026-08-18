"use client";

import { useEffect, useId, useRef } from "react";
import { usePressure } from "./state";

/**
 * FEEDBACK, drawn as signal.
 *
 * The wordmark has three states and the pressure knob moves between
 * them continuously: clean at rest, a *little effect* through the
 * middle of the knob's travel, and full effect at the top — the letters
 * displaced, the channels separated, the whole thing blown out for a
 * frame or two before it settles.
 *
 * It is one SVG filter with one animated attribute. Displacement is far
 * cheaper than the alternatives (three stacked copies with blend modes,
 * or a canvas), and because the letters are real text the mark stays
 * selectable, scalable and legible to a screen reader.
 */

export type WordmarkProps = {
  /** Fixed 0—1 distortion. Omit to follow the room's pressure. */
  distortion?: number;
  /** Draw the signal trace travelling through the letterforms. */
  trace?: boolean;
  className?: string;
  title?: string;
};

const WIDTH = 1000;
const HEIGHT = 210;

export function Wordmark({
  distortion,
  trace = false,
  className,
  title = "FEEDBACK",
}: WordmarkProps) {
  const uid = useId().replace(/:/g, "");
  const pressure = usePressure();
  const displace = useRef<SVGFEDisplacementMapElement>(null);
  const turbulence = useRef<SVGFETurbulenceElement>(null);
  const splitRed = useRef<SVGGElement>(null);
  const splitCyan = useRef<SVGGElement>(null);

  useEffect(() => {
    const apply = (level: number) => {
      // Nothing at all until a third of the way up the knob: the mark
      // has to be clean long enough that the first sign of movement
      // reads as something happening to it.
      const eased = Math.max(0, (level - 0.32) / 0.68);
      const amount = Math.pow(eased, 1.7);

      displace.current?.setAttribute("scale", (amount * 26).toFixed(2));
      turbulence.current?.setAttribute(
        "baseFrequency",
        `${(0.006 + amount * 0.03).toFixed(4)} ${(0.02 + amount * 0.16).toFixed(4)}`,
      );

      // Channel separation, held to a couple of pixels until the very
      // top so it never reads as a broken font.
      const split = amount * amount * 9;
      splitRed.current?.setAttribute("transform", `translate(${-split} 0)`);
      splitCyan.current?.setAttribute("transform", `translate(${split} 0)`);
      const veil = (amount * 0.55).toFixed(3);
      splitRed.current?.setAttribute("opacity", veil);
      splitCyan.current?.setAttribute("opacity", veil);
    };

    if (typeof distortion === "number") {
      apply(distortion);
      return;
    }
    if (pressure.reduced) {
      apply(0);
      return;
    }
    return pressure.subscribe((p) => apply(p / 10));
  }, [distortion, pressure]);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <filter id={`erode-${uid}`} x="-12%" y="-30%" width="124%" height="160%">
          <feTurbulence
            ref={turbulence}
            type="fractalNoise"
            baseFrequency="0.006 0.02"
            numOctaves={3}
            seed={7}
            result="noise"
          />
          <feDisplacementMap
            ref={displace}
            in="SourceGraphic"
            in2="noise"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* The letterforms as a clip, so the signal can run inside them. */}
        <clipPath id={`letters-${uid}`}>
          <text
            x={WIDTH / 2}
            y={168}
            textAnchor="middle"
            textLength={WIDTH - 24}
            lengthAdjust="spacingAndGlyphs"
            className="fbk-display"
            fontSize={196}
          >
            FEEDBACK
          </text>
        </clipPath>
      </defs>

      <g filter={`url(#erode-${uid})`}>
        {/* Separated channels sit behind the mark and open up under
            pressure. Screen blending keeps them additive against the
            near-black ground rather than muddying it. */}
        <g ref={splitRed} opacity="0" style={{ mixBlendMode: "screen" }}>
          <MarkText fill="#E23B2E" />
        </g>
        <g ref={splitCyan} opacity="0" style={{ mixBlendMode: "screen" }}>
          <MarkText fill="#2EC8E2" />
        </g>
        <MarkText fill="currentColor" />

        {trace && (
          <g clipPath={`url(#letters-${uid})`}>
            <TravellingTrace />
          </g>
        )}
      </g>
    </svg>
  );
}

function MarkText({ fill }: { fill: string }) {
  return (
    <text
      x={WIDTH / 2}
      y={168}
      textAnchor="middle"
      textLength={WIDTH - 24}
      lengthAdjust="spacingAndGlyphs"
      className="fbk-display"
      fontSize={196}
      fill={fill}
    >
      FEEDBACK
    </text>
  );
}

/**
 * A wave travelling through the letterforms, clipped so it only ever
 * appears inside the type. Slow — one pass every ten seconds — because
 * at rest this page is supposed to be quiet, and the mark should look
 * like it is idling on a live channel rather than animating.
 */
function TravellingTrace() {
  const group = useRef<SVGGElement>(null);
  const pressure = usePressure();

  useEffect(() => {
    if (pressure.reduced) return;
    const node = group.current;
    if (!node) return;

    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = ((now - start) / 10000) % 1;
      node.setAttribute("transform", `translate(${(-WIDTH + t * WIDTH * 2).toFixed(1)} 0)`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pressure.reduced]);

  return (
    <g ref={group}>
      <path
        d={TRACE_PATH}
        fill="none"
        stroke="#E23B2E"
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d={TRACE_PATH}
        fill="none"
        stroke="#F7E3BC"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </g>
  );
}

/** One burst of signal, half a mark wide, built once at module load. */
const TRACE_PATH = (() => {
  const mid = HEIGHT / 2 + 14;
  const span = WIDTH * 0.55;
  const from = WIDTH * 0.72;
  let d = "";
  for (let i = 0; i <= 90; i += 1) {
    const t = i / 90;
    const x = from + t * span;
    // A packet: full amplitude in the middle, tapering to nothing at
    // both ends, so it reads as something passing through rather than
    // as a wave that is simply there.
    const envelope = Math.sin(t * Math.PI);
    const y = mid - Math.sin(t * Math.PI * 2 * 7) * 62 * envelope;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
})();
