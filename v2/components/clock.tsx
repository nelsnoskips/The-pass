"use client";

import { useEffect, useRef } from "react";

/**
 * The service day, run by the scroll.
 *
 * The story's timestamps — detected 6:42, assigned 6:45, corrected
 * 8:12, verified 9:22, documented 9:23 — are pinned to their sections,
 * and the readout interpolates between them as the visitor descends.
 * Scrolling the page is replaying the day; arriving at the record is
 * arriving at 9:23 AM with the work done.
 */

const STOPS: [string, number][] = [
  ["01", 6 * 60 + 42],
  ["03", 6 * 60 + 45],
  ["04", 8 * 60 + 12],
  ["05", 9 * 60 + 22],
  ["09", 9 * 60 + 23],
];

export function ServiceClock() {
  const time = useRef<HTMLSpanElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = new Map(
      Array.from(document.querySelectorAll<HTMLElement>("main section[data-rail]")).map(
        (el) => [el.dataset.rail ?? "", el],
      ),
    );
    const anchors = STOPS.filter(([n]) => sections.has(n)).map(([n, minutes]) => ({
      el: sections.get(n)!,
      minutes,
    }));
    if (anchors.length < 2) return;

    let frame = 0;
    let queued = false;
    let shown = "";

    const read = () => {
      queued = false;
      const line = window.innerHeight * 0.5;
      const points = anchors.map((a) => ({
        y: a.el.getBoundingClientRect().top,
        minutes: a.minutes,
      }));

      let minutes = points[0].minutes;
      if (points[0].y > line) {
        // Before the story starts, hold the opening time faintly.
        wrap.current?.setAttribute("data-live", "false");
      } else {
        wrap.current?.setAttribute("data-live", "true");
        for (let i = 0; i < points.length - 1; i += 1) {
          const a = points[i];
          const b = points[i + 1];
          if (line >= b.y) {
            minutes = b.minutes;
            continue;
          }
          if (line >= a.y) {
            const t = (line - a.y) / Math.max(1, b.y - a.y);
            minutes = a.minutes + (b.minutes - a.minutes) * t;
          }
        }
      }

      const h = Math.floor(minutes / 60);
      const m = Math.floor(minutes % 60);
      const label = `${h}:${String(m).padStart(2, "0")} AM`;
      if (label !== shown && time.current) {
        shown = label;
        time.current.textContent = label;
      }
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={wrap} className="o-clock" data-live="false" aria-hidden>
      <span className="o-clock-dot" />
      <span ref={time} className="o-num">6:42 AM</span>
      <span className="o-clock-label o-label">Service day</span>
    </div>
  );
}
