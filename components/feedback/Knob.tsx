"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PRESSURE_MAX, pressureLevel } from "@/lib/feedback";
import { usePressure, useSound } from "./state";

/**
 * TURN IT UP — the amplifier knob, and the only control that matters.
 *
 * It behaves like a real one: drag it, throw a wheel at it, or tab to it
 * and use the arrow keys. Vertical travel rather than rotational
 * tracking, because every hardware plug-in settled on vertical drag for
 * the same reason — chasing an arc with a mouse is miserable.
 *
 * It is a `role="slider"`, so a keyboard or screen-reader visitor gets
 * the identical mechanism rather than a described one. Turning it up is
 * how the burger gets cooked and how the order button is revealed, so
 * this cannot be a mouse-only party trick.
 */

const SWEEP_START = -150;
const SWEEP_END = 150;
/** Pixels of drag for the full 0—10 sweep. */
const TRAVEL = 220;

export type KnobProps = {
  onChange: (pressure: number) => void;
  onCommit?: (pressure: number) => void;
  className?: string;
};

export function Knob({ onChange, onCommit, className }: KnobProps) {
  const pressure = usePressure();
  const sound = useSound();
  const dial = useRef<SVGGElement>(null);
  const finger = useRef<SVGGElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const detent = useRef(0);

  /* The dial is repainted from the room's pressure, not from local
     state, so the numbered frames and the scroll move it too. */
  useEffect(
    () =>
      pressure.subscribe((p) => {
        const angle = SWEEP_START + pressureLevel(p) * (SWEEP_END - SWEEP_START);
        dial.current?.setAttribute("transform", `rotate(${angle.toFixed(2)} 100 100)`);
        finger.current?.setAttribute("transform", `rotate(${angle.toFixed(2)} 100 100)`);
        if (readout.current) readout.current.textContent = p.toFixed(1);
        wrap.current?.setAttribute("aria-valuenow", p.toFixed(1));
        wrap.current?.setAttribute("aria-valuetext", `Pressure ${p.toFixed(1)} of 10`);

        // A detent click at each whole number, the way a stepped pot
        // feels. Only while the visitor is the one turning it.
        const notch = Math.round(p);
        if (notch !== detent.current) {
          detent.current = notch;
          if (dragging) sound.click();
        }
      }),
    [pressure, sound, dragging],
  );

  const begin = useCallback(
    (event: React.PointerEvent) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      const startY = event.clientY;
      const startValue = pressure.read();
      setDragging(true);

      const move = (e: PointerEvent) => {
        const delta = (startY - e.clientY) / TRAVEL;
        onChange(startValue + delta * PRESSURE_MAX);
      };
      const end = () => {
        setDragging(false);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        onCommit?.(pressure.read());
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    },
    [onChange, onCommit, pressure],
  );

  const key = useCallback(
    (event: React.KeyboardEvent) => {
      const current = pressure.read();
      const step = event.shiftKey ? 0.1 : 0.5;
      const map: Record<string, number> = {
        ArrowUp: current + step,
        ArrowRight: current + step,
        ArrowDown: current - step,
        ArrowLeft: current - step,
        PageUp: current + 2,
        PageDown: current - 2,
        Home: 0,
        End: PRESSURE_MAX,
      };
      const next = map[event.key];
      if (next === undefined) return;
      event.preventDefault();
      onChange(next);
      onCommit?.(next);
    },
    [onChange, onCommit, pressure],
  );

  const wheel = useCallback(
    (event: React.WheelEvent) => {
      // Only claim the wheel while the pointer is actually over the
      // knob, and only then stop the page scrolling underneath it.
      event.stopPropagation();
      const next = pressure.read() - event.deltaY / 90;
      onChange(next);
      onCommit?.(next);
    },
    [onChange, onCommit, pressure],
  );

  return (
    <div className={className}>
      <div
        ref={wrap}
        role="slider"
        tabIndex={0}
        aria-label="Apply pressure"
        aria-valuemin={0}
        aria-valuemax={PRESSURE_MAX}
        aria-valuenow={0}
        aria-valuetext="Pressure 0 of 10"
        onPointerDown={begin}
        onKeyDown={key}
        onWheel={wheel}
        className="relative block touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-[#E23B2E]"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        <svg viewBox="0 0 200 200" className="w-full">
          {/* Numerals around the sweep, 0 at the bottom left, 10 at the
              bottom right, the way the panel is silkscreened. */}
          {Array.from({ length: 11 }, (_, i) => {
            const angle =
              ((SWEEP_START + (i / 10) * (SWEEP_END - SWEEP_START)) * Math.PI) / 180;
            const r = 86;
            const x = 100 + Math.sin(angle) * r;
            const y = 100 - Math.cos(angle) * r;
            const hot = i >= 8;
            return (
              <text
                key={i}
                x={x}
                y={y + 4}
                textAnchor="middle"
                className="fbk-mono"
                fontSize="12"
                fill={hot ? "#E23B2E" : "rgba(232,225,211,0.55)"}
              >
                {i}
              </text>
            );
          })}

          {/* Tick marks. */}
          {Array.from({ length: 21 }, (_, i) => {
            const angle =
              ((SWEEP_START + (i / 20) * (SWEEP_END - SWEEP_START)) * Math.PI) / 180;
            const major = i % 2 === 0;
            const inner = major ? 64 : 68;
            const outer = 72;
            return (
              <line
                key={i}
                x1={100 + Math.sin(angle) * inner}
                y1={100 - Math.cos(angle) * inner}
                x2={100 + Math.sin(angle) * outer}
                y2={100 - Math.cos(angle) * outer}
                stroke="rgba(232,225,211,0.35)"
                strokeWidth={major ? 1.6 : 1}
              />
            );
          })}

          {/* The knob body: knurled collar, brushed face, one pointer. */}
          <circle cx="100" cy="100" r="56" fill="#0d0a09" />
          <circle
            cx="100"
            cy="100"
            r="54"
            fill="url(#fbk-knob-collar)"
            stroke="rgba(0,0,0,0.7)"
          />
          <circle cx="100" cy="100" r="42" fill="url(#fbk-knob-face)" />
          <circle
            cx="100"
            cy="100"
            r="42"
            fill="none"
            stroke="rgba(232,225,211,0.14)"
          />

          <g ref={dial}>
            <rect x="98.4" y="60" width="3.2" height="26" rx="1.6" fill="#E8E1D3" />
          </g>

          {/* The hand on the panel: it rides the value, so the knob
              always looks like it is being held where it is set. */}
          <g ref={finger} opacity="0.9">
            <g transform="translate(100 24)">
              <path
                d="M0 -6 L7 6 L-7 6 Z"
                fill="#E23B2E"
                stroke="#0b0908"
                strokeWidth="1"
              />
            </g>
          </g>

          <defs>
            <radialGradient id="fbk-knob-collar" cx="0.35" cy="0.28" r="0.85">
              <stop offset="0%" stopColor="#6a5f57" />
              <stop offset="55%" stopColor="#2d2622" />
              <stop offset="100%" stopColor="#100c0a" />
            </radialGradient>
            <linearGradient id="fbk-knob-face" x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#5b524a" />
              <stop offset="45%" stopColor="#312a26" />
              <stop offset="100%" stopColor="#171310" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <p className="fbk-label mt-3 flex items-baseline gap-2 text-[rgba(232,225,211,0.5)]">
        Pressure
        <span ref={readout} className="fbk-mono text-[15px] text-[#E8E1D3]">
          0.0
        </span>
        <span className="text-[rgba(232,225,211,0.35)]">/ 10</span>
      </p>
    </div>
  );
}

/**
 * SIGNAL PRESSURE — the panel meter beside the knob. Read-only: it
 * reports what the knob is doing, and lags it very slightly the way a
 * needle with mass would.
 */
export function PressureGauge({ className }: { className?: string }) {
  const pressure = usePressure();
  const needle = useRef<SVGGElement>(null);

  useEffect(() => {
    let target = 0;
    let shown = 0;
    let frame = 0;

    const stop = pressure.subscribe((p) => {
      target = pressureLevel(p);
    });

    const tick = () => {
      // Chases the value and overshoots a little on a fast move, which
      // is what makes it read as a needle rather than as a bar.
      shown += (target - shown) * 0.14;
      const angle = -52 + shown * 104;
      needle.current?.setAttribute("transform", `rotate(${angle.toFixed(2)} 100 92)`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      stop();
      cancelAnimationFrame(frame);
    };
  }, [pressure]);

  return (
    <svg viewBox="0 0 200 110" className={className} aria-hidden>
      <path
        d="M28 92 A72 72 0 0 1 172 92"
        fill="none"
        stroke="rgba(232,225,211,0.2)"
        strokeWidth="1.5"
      />
      {/* The red zone, where the room is about to feed back. */}
      <path
        d="M140 40 A72 72 0 0 1 172 92"
        fill="none"
        stroke="#E23B2E"
        strokeWidth="3"
        opacity="0.8"
      />
      {Array.from({ length: 9 }, (_, i) => {
        const angle = ((-90 + (i / 8) * 180) * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={100 + Math.cos(angle) * 60}
            y1={92 + Math.sin(angle) * 60}
            x2={100 + Math.cos(angle) * 68}
            y2={92 + Math.sin(angle) * 68}
            stroke="rgba(232,225,211,0.35)"
            strokeWidth="1.2"
          />
        );
      })}
      <g ref={needle}>
        <line x1="100" y1="92" x2="100" y2="30" stroke="#E8E1D3" strokeWidth="2" />
      </g>
      <circle cx="100" cy="92" r="5" fill="#2b2521" stroke="rgba(232,225,211,0.4)" />
      <text x="24" y="106" className="fbk-mono" fontSize="9" fill="rgba(232,225,211,0.45)">
        MIN
      </text>
      <text
        x="176"
        y="106"
        textAnchor="end"
        className="fbk-mono"
        fontSize="9"
        fill="rgba(232,225,211,0.45)"
      >
        MAX
      </text>
      <text
        x="100"
        y="106"
        textAnchor="middle"
        className="fbk-mono"
        fontSize="8.5"
        fill="rgba(232,225,211,0.35)"
        letterSpacing="1.5"
      >
        SIGNAL PRESSURE
      </text>
    </svg>
  );
}
