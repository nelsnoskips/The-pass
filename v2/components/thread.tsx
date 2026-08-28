"use client";

import { useEffect, useRef } from "react";
import { useSectionProgress } from "./ui";

/**
 * The service thread — the one element the whole identity hangs on.
 *
 * Each section owns a segment of the line, authored in a 0—100
 * percentage space and entering at the x-position the previous section
 * exited, so ten segments chain into one continuous thread down the
 * page. The segment inks itself in as the visitor scrolls (stroke-dash
 * scrub on rAF, no re-renders), and every node lights with a pulse the
 * moment the line reaches it.
 *
 * The path is rebuilt in real pixels whenever the section resizes —
 * dashing a stretched viewBox tears the line apart in Chromium, so the
 * SVG always works at 1:1 and the geometry scales in JS instead.
 *
 * Colour is state: blue while Orravan is working, green from the
 * moment the work is verified — exactly as the page's copy promises.
 */

export type ThreadProps = {
  /** SVG path in a 0-100 x, 0-100 y box (percentages of the section). */
  d: string;
  /** Nodes along the line: [x%, y%, progress at which the line arrives]. */
  nodes?: [number, number, number][];
  color?: "signal" | "verified" | "transition";
  className?: string;
  /** Finish drawing this far through the section's travel. */
  span?: number;
};

export function Thread({ d, nodes = [], color = "signal", className, span = 0.82 }: ThreadProps) {
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const glow = useRef<SVGPathElement>(null);
  const pulse = useRef<SVGPathElement>(null);
  const nodeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const length = useRef(1);
  const drawn = useRef(0);
  const cleanup = useRef<(() => void) | null>(null);

  /* Scale the %-space path into the section's pixels, re-measure, and
     keep the current draw state. */
  useEffect(() => {
    const host = svg.current?.parentElement;
    if (!host) return;

    const rebuild = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      const px = scalePath(d, w / 100, h / 100);
      svg.current?.setAttribute("viewBox", `0 0 ${w} ${h}`);
      for (const p of [path.current, glow.current, pulse.current]) p?.setAttribute("d", px);
      const l = path.current?.getTotalLength() ?? 1;
      length.current = l;
      for (const p of [path.current, glow.current]) {
        if (!p) continue;
        p.style.strokeDasharray = `${l}`;
        p.style.strokeDashoffset = `${l * (1 - drawn.current)}`;
      }
      if (pulse.current) {
        pulse.current.style.strokeDasharray = `${l * 0.05} ${l * 1.05}`;
        pulse.current.style.strokeDashoffset = `${l}`;
      }
    };

    /* A signal travels the drawn portion of the line, over and over —
       the page's premise made visible. One rAF, alive only on screen,
       and never under reduced motion. */
    let frame = 0;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let visible = false;
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
      });
      if (svg.current) io.observe(svg.current);
      let start = 0;
      const tick = (now: number) => {
        frame = requestAnimationFrame(tick);
        if (!visible || drawn.current < 0.12 || !pulse.current) return;
        if (!start) start = now;
        const t = ((now - start) / 3800) % 1;
        const l = length.current;
        // From the segment's start to the tip of whatever is drawn.
        const travel = l * drawn.current * t;
        pulse.current.style.strokeDashoffset = `${l - travel}`;
        pulse.current.style.opacity = t > 0.88 ? `${(1 - t) * 4.5}` : "0.55";
      };
      frame = requestAnimationFrame(tick);
      const cleanupIo = io;
      cleanup.current = () => {
        cancelAnimationFrame(frame);
        cleanupIo.disconnect();
      };
    }

    rebuild();
    const observer = new ResizeObserver(rebuild);
    observer.observe(host);
    return () => {
      observer.disconnect();
      cleanup.current?.();
    };
  }, [d]);

  const ref = useSectionProgress<HTMLDivElement>((p) => {
    const t = Math.min(1, p / span);
    if (t === drawn.current) return;
    drawn.current = t;
    const offset = length.current * (1 - t);
    path.current?.style.setProperty("stroke-dashoffset", `${offset}`);
    glow.current?.style.setProperty("stroke-dashoffset", `${offset}`);
    nodes.forEach(([, , at], i) => {
      nodeRefs.current[i]?.setAttribute("data-lit", t >= at ? "true" : "false");
    });
  });

  const stroke =
    color === "verified"
      ? "var(--thread-green)"
      : color === "transition"
        ? "url(#o-thread-transition)"
        : "var(--thread-blue)";
  const nodeColor = color === "signal" ? "var(--thread-blue)" : "var(--thread-green)";

  return (
    <div ref={ref} className={`o-thread ${className ?? ""}`} aria-hidden>
      <svg ref={svg} className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="o-thread-transition" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--thread-blue)" />
            <stop offset="62%" stopColor="var(--thread-blue)" />
            <stop offset="88%" stopColor="var(--thread-green)" />
          </linearGradient>
        </defs>

        {/* The light the line throws, then the line itself. */}
        <path
          ref={glow}
          fill="none"
          stroke={stroke}
          strokeWidth={6}
          strokeLinecap="round"
          opacity={0.16}
          style={{ filter: "blur(2.5px)" }}
        />
        <path ref={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        <path
          ref={pulse}
          fill="none"
          stroke="#8fb0ee"
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={0}
          style={{ mixBlendMode: "screen" }}
        />
      </svg>

      {/* Nodes live outside the SVG so they stay round at any size. */}
      {nodes.map(([x, y], i) => (
        <span
          key={i}
          ref={(node) => {
            nodeRefs.current[i] = node;
          }}
          data-lit="false"
          className="o-node"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            ["--o-node-color" as string]: nodeColor,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Scale a path authored in 0-100 space into pixels. The segments only
 * use absolute M/C/L commands, so coordinates alternate x, y for the
 * whole string and can be scaled positionally.
 */
function scalePath(d: string, sx: number, sy: number): string {
  let isX = true;
  return d.replace(/-?\d+(?:\.\d+)?/g, (raw) => {
    const value = parseFloat(raw) * (isX ? sx : sy);
    isX = !isX;
    return value.toFixed(1);
  });
}
