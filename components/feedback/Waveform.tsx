"use client";

import { useEffect, useId, useRef } from "react";
import type { SaucePersonality } from "@/lib/feedback";
import { usePressure } from "./state";

/**
 * The signal itself, drawn as an SVG path so it stays sharp and
 * responsive at any width without a canvas or a bitmap.
 *
 * Three personalities, because the pedal board changes what the room
 * sounds like and the waveform has to agree with it: the house sauce is
 * a clean sine, the spicy boost is a gain stage with hard peaks, and
 * the garlic crunch is clipped flat at the top and bottom. They are
 * genuinely different functions, not the same wave at three heights —
 * that is the whole point of the interaction.
 */

export type WaveformProps = {
  personality?: SaucePersonality;
  /** 0—1. Ignored when `fromPressure` is set. */
  amplitude?: number;
  /** Take the amplitude from the room's pressure instead. */
  fromPressure?: boolean;
  /** Travel left to right forever. Off under reduced motion. */
  travel?: boolean;
  /** Cycles across the full width. */
  cycles?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
  height?: number;
};

const SAMPLES = 220;

/** One sample of the wave, in -1—1, for a given personality. */
function sample(
  personality: SaucePersonality,
  t: number,
  phase: number,
  cycles: number,
): number {
  const angle = (t * cycles + phase) * Math.PI * 2;

  if (personality === "smooth") {
    // Two partials only: round, even, nothing sticking out.
    return Math.sin(angle) * 0.78 + Math.sin(angle * 2) * 0.18;
  }

  if (personality === "aggressive") {
    // Sharpened peaks with a fast partial riding on top, and every
    // seventh crest pushed harder so it reads as transient rather than
    // as a louder sine.
    const base = Math.sign(Math.sin(angle)) * Math.pow(Math.abs(Math.sin(angle)), 0.42);
    const spike = Math.sin(angle * 7.3) * 0.22;
    const accent = Math.sin(t * cycles * Math.PI * 2 * 0.5) > 0.86 ? 1.35 : 1;
    return clamp(base * accent + spike, -1, 1);
  }

  // Clipped: flat-topped, with a step quantisation that gives the trace
  // its crunch. This is the one that looks like it would hurt.
  const raw = Math.sin(angle) * 1.6 + Math.sin(angle * 3.1) * 0.35;
  const clipped = clamp(raw, -0.82, 0.82);
  return Math.round(clipped * 6) / 6;
}

function clamp(n: number, min: number, max: number) {
  return n < min ? min : n > max ? max : n;
}

function buildPath(
  personality: SaucePersonality,
  amplitude: number,
  phase: number,
  cycles: number,
  width: number,
  height: number,
): string {
  const mid = height / 2;
  // Leave a hairline of headroom so a full-amplitude peak is not clipped
  // by the viewBox.
  const reach = mid * 0.94 * amplitude;
  let d = "";
  for (let i = 0; i <= SAMPLES; i += 1) {
    const t = i / SAMPLES;
    const x = t * width;
    const y = mid - sample(personality, t, phase, cycles) * reach;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

export function Waveform({
  personality = "smooth",
  amplitude = 0.5,
  fromPressure = false,
  travel = true,
  cycles = 9,
  stroke = "currentColor",
  strokeWidth = 1.5,
  className,
  height = 64,
}: WaveformProps) {
  const path = useRef<SVGPathElement>(null);
  const pressure = usePressure();
  const settings = useRef({ personality, amplitude, cycles, fromPressure });
  useEffect(() => {
    settings.current = { personality, amplitude, cycles, fromPressure };
  });

  const WIDTH = 1000;

  useEffect(() => {
    const node = path.current;
    if (!node) return;

    // The amplitude that pressure asks for, kept in a ref so the draw
    // loop never re-subscribes and React never re-renders for it.
    const level = { value: fromPressure ? 0 : amplitude };
    const stop = fromPressure
      ? pressure.subscribe((p) => {
          // A little floor so the trace is never a dead line, and a
          // curve so the top of the knob still has somewhere to go.
          level.value = 0.12 + Math.pow(p / 10, 1.35) * 0.88;
        })
      : undefined;

    const draw = (phase: number) => {
      const s = settings.current;
      node.setAttribute(
        "d",
        buildPath(s.personality, level.value, phase, s.cycles, WIDTH, height),
      );
    };

    if (!travel || pressure.reduced) {
      draw(0);
      return () => stop?.();
    }

    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      // One cycle every four seconds: this is a signal idling, not a
      // loading spinner.
      draw(((now - start) / 4000) % 1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      stop?.();
    };
  }, [travel, height, fromPressure, amplitude, pressure]);

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${WIDTH} ${height}`}
      preserveAspectRatio="none"
      className={className}
    >
      <path
        ref={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * A short waveform that follows the cursor. Small, monochrome, and
 * differenced against whatever is under it — a pointer, not an effect.
 */
export function CursorWave() {
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const pressure = usePressure();

  useEffect(() => {
    if (pressure.reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const node = wrap.current;
    if (!node) return;
    let x = -100;
    let y = -100;
    let frame = 0;
    // Trails by a fraction rather than tracking exactly: a cursor that
    // lags very slightly reads as physical instead of as a sticker.
    let drawnX = x;
    let drawnY = y;

    const move = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
    };
    const tick = () => {
      drawnX += (x - drawnX) * 0.35;
      drawnY += (y - drawnY) * 0.35;
      node.style.transform = `translate3d(${drawnX - 22}px, ${drawnY - 8}px, 0)`;
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", move, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, [pressure.reduced]);

  return (
    <div ref={wrap} className="fbk-cursor" aria-hidden key={id}>
      <Waveform
        className="h-4 w-11 text-[#E8E1D3]"
        cycles={3}
        amplitude={0.7}
        strokeWidth={1.5}
        height={18}
      />
    </div>
  );
}
