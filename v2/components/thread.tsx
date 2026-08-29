"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The service thread: one continuous SVG path travelling the whole page
 * — person, building, equipment, intelligence, response, verification,
 * record — drawn by scroll with rounded turns and a node at each
 * meaningful milestone.
 *
 * Sections declare anchors with <ThreadPoint x y node green />; the
 * thread measures them in page order and routes a smooth vertical
 * spline through the marks. Blue while the work is active, green from
 * the verification point on. Under reduced motion the complete path is
 * shown statically.
 */

type Pt = { x: number; y: number; node: boolean; green: boolean };

const CURVE_MAX = 130;

/** A 0-size anchor the thread routes through. Parent must be relative. */
export function ThreadPoint({
  x,
  y,
  node = false,
  green = false,
}: {
  /** Fractions of the parent box. */
  x: number;
  y: number;
  /** Draw a milestone node here. */
  node?: boolean;
  /** The verification point: the thread turns green from here on. */
  green?: boolean;
}) {
  return (
    <span
      aria-hidden
      data-thread
      data-node={node ? "1" : undefined}
      data-green={green ? "1" : undefined}
      className="pointer-events-none absolute h-0 w-0"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    />
  );
}

/** Smooth path through the points: vertical tangents, rounded turns. */
function buildPath(points: Pt[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const k = Math.min(CURVE_MAX, Math.max(24, (b.y - a.y) / 2));
    d += ` C ${a.x.toFixed(1)} ${(a.y + k).toFixed(1)}, ${b.x.toFixed(1)} ${(b.y - k).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}

export function ServiceThread() {
  const [geom, setGeom] = useState<{
    w: number;
    h: number;
    oy: number;
    dBlue: string;
    dGreen: string;
    nodes: Pt[];
  } | null>(null);
  const blueRef = useRef<SVGPathElement>(null);
  const greenRef = useRef<SVGPathElement>(null);
  const nodesRef = useRef<SVGGElement>(null);
  const still = useRef(false);

  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    still.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let measure = 0;

    const build = () => {
      const host = document.querySelector("main");
      const marks = Array.from(
        document.querySelectorAll<HTMLElement>("[data-thread]"),
      );
      if (!host || marks.length < 2) return;
      const hostRect = host.getBoundingClientRect();
      const ox = hostRect.left + window.scrollX;
      const oy = hostRect.top + window.scrollY;
      const points: Pt[] = marks
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            x: r.left + window.scrollX - ox,
            y: r.top + window.scrollY - oy,
            node: el.dataset.node === "1",
            green: el.dataset.green === "1",
          };
        })
        .sort((a, b) => a.y - b.y);

      const splitAt = points.findIndex((p) => p.green);
      const blue = splitAt === -1 ? points : points.slice(0, splitAt + 1);
      const green = splitAt === -1 ? [] : points.slice(splitAt);
      setGeom({
        w: hostRect.width,
        h: hostRect.height,
        oy,
        dBlue: buildPath(blue),
        dGreen: green.length > 1 ? buildPath(green) : "",
        nodes: points.filter((p) => p.node),
      });
    };

    build();
    // Photos and fonts settle late; re-measure a few times, then on resize.
    const timers = [400, 1200, 2600].map((t) => window.setTimeout(build, t));
    const onResize = () => {
      window.clearTimeout(measure);
      measure = window.setTimeout(build, 200);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      window.clearTimeout(measure);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  /* Draw with scroll: reveal the path down to the "ink line" 70% into
     the viewport, mapped through sampled arc length so speed follows
     the path, not the page. */
  useEffect(() => {
    if (!geom) return;
    const paths = [blueRef.current, greenRef.current].filter(
      Boolean,
    ) as SVGPathElement[];
    if (paths.length === 0) return;

    const samples = paths.map((path) => {
      const total = path.getTotalLength();
      const table: { len: number; y: number }[] = [];
      const step = Math.max(8, total / 400);
      for (let len = 0; len <= total; len += step) {
        table.push({ len, y: path.getPointAtLength(len).y });
      }
      table.push({ len: total, y: path.getPointAtLength(total).y });
      path.style.strokeDasharray = `${total}`;
      return { path, total, table };
    });

    if (still.current) {
      paths.forEach((p) => p.style.setProperty("stroke-dashoffset", "0"));
      nodesRef.current
        ?.querySelectorAll("circle")
        .forEach((c) => c.style.setProperty("opacity", "1"));
      return;
    }

    let frame = 0;
    let queued = false;
    const read = () => {
      queued = false;
      const ink = window.scrollY + window.innerHeight * 0.7 - geom.oy;
      samples.forEach(({ path, total, table }) => {
        let revealed = 0;
        for (const s of table) {
          if (s.y <= ink) revealed = s.len;
        }
        path.style.strokeDashoffset = `${(total - revealed).toFixed(1)}`;
      });
      nodesRef.current?.querySelectorAll("circle").forEach((c) => {
        const y = Number(c.getAttribute("cy"));
        c.style.opacity = y <= ink ? "1" : "0";
      });
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [geom]);

  if (!geom) return null;

  return (
    <svg
      className="o-thread"
      width={geom.w}
      height={geom.h}
      viewBox={`0 0 ${geom.w} ${geom.h}`}
      aria-hidden
    >
      <path
        ref={blueRef}
        d={geom.dBlue}
        fill="none"
        stroke="#3564D4"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 5px rgba(53, 100, 212, 0.4))" }}
      />
      {geom.dGreen && (
        <path
          ref={greenRef}
          d={geom.dGreen}
          fill="none"
          stroke="#4D9A5F"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 5px rgba(77, 154, 95, 0.35))" }}
        />
      )}
      <g ref={nodesRef}>
        {geom.nodes.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="var(--bone)"
            stroke={p.green ? "#4D9A5F" : "#3564D4"}
            strokeWidth="2"
            style={{ opacity: 0, transition: "opacity 700ms ease" }}
          />
        ))}
      </g>
    </svg>
  );
}
