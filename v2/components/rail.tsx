"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The service thread, made functional.
 *
 * Instead of decorative lines over the photography, the thread is now a
 * fixed hairline rail down the left edge: one stop per section, filling
 * as the visitor descends. It is the page's own service record — blue
 * through the working sections, emerald once the work is verified — and
 * every stop is a working control that jumps to its section.
 *
 * Elite motion is legible motion: the rail always tells you where you
 * are, and nothing about it competes with the photography.
 */

export function ScrollRail() {
  const [stops, setStops] = useState<{ n: string; el: HTMLElement }[]>([]);
  const [active, setActive] = useState(0);
  const fill = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("main section[data-rail]"),
    );
    setStops(sections.map((el) => ({ n: el.dataset.rail ?? "", el })));

    let frame = 0;
    let queued = false;
    const read = () => {
      queued = false;
      const doc = document.documentElement;
      const p = doc.scrollTop / (doc.scrollHeight - doc.clientHeight);
      fill.current?.style.setProperty("transform", `scaleY(${p.toFixed(4)})`);

      const mid = window.innerHeight * 0.45;
      let current = 0;
      sections.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= mid) current = i;
      });
      setActive((prev) => (prev === current ? prev : current));
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

  if (stops.length === 0) return null;

  return (
    <nav aria-label="Page sections" className="o-rail">
      <div className="o-rail-track">
        <div ref={fill} className="o-rail-fill" />
      </div>
      <ol>
        {stops.map((stop, i) => (
          <li key={stop.n}>
            <button
              type="button"
              data-active={i === active}
              data-verified={i >= 4}
              onClick={() => stop.el.scrollIntoView({ behavior: "smooth", block: "start" })}
              aria-label={`Section ${stop.n}`}
            >
              <span className="o-rail-dot" />
              <span className="o-rail-num o-num">{stop.n}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
