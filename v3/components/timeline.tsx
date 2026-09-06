"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HISTORY, LANES, MILESTONES, SPAN, type Milestone } from "@/lib/company";

/**
 * The history as an instrument.
 *
 * Orravan's whole argument is that they read a building's trend and act
 * on it, so the company's own history is drawn the way their software
 * draws a system: a time axis, lanes for each kind of signal, and a
 * playhead sweeping left to right. Scrolling the section moves the
 * playhead; each milestone lights as the year reaches it. That makes
 * the section do two jobs — it tells the story, and it demonstrates the
 * product's way of seeing.
 *
 * Three rules it holds to:
 *
 * The scrub is not the only way in. Every node is a real <button>, so
 * the whole thing works by keyboard and reads correctly to a screen
 * reader; clicking scrolls to that year so pointer and scroll never
 * disagree about what is active.
 *
 * Nothing is plotted that was not supplied. Headcount appears as two
 * labelled figures at 2021 and 2024 because those are the two numbers
 * Orravan gave. There is no growth curve between them, because that
 * curve would be a drawing of data nobody has.
 *
 * Below 900px the stage stops being a chart. Sticky scrubbing on a
 * phone is a way to lose people, so the same nodes reflow into an
 * ordinary vertical list — one DOM tree, positioned only where there is
 * room to position it.
 */

/** Position as a fraction of the plotted span — the unit the CSS wants,
    so a node and the playhead resolve to the same x at any width. */
const F = (at: number) => (at - SPAN.from) / (SPAN.to - SPAN.from);
const X = (at: number) => F(at) * 100;

const YEARS = [2014, 2016, 2018, 2020, 2022, 2024];

/** Scroll distance the sweep is spread over, as a multiple of viewport. */
const TRAVEL = 2.4;

export function Timeline() {
  const section = useRef<HTMLElement>(null);
  const playhead = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [lit, setLit] = useState<boolean[]>(() => MILESTONES.map(() => false));
  const [still, setStill] = useState(false);

  /* Two conditions turn the sweep off, and they want identical
     behaviour: reduced motion, and any screen too narrow to draw the
     chart. Both leave a static diagram with every milestone lit —
     because a node that never lights reads as a milestone that never
     happened, and on a phone nothing would ever light it. */
  useEffect(() => {
    const queries = [
      window.matchMedia("(prefers-reduced-motion: reduce)"),
      window.matchMedia("(max-width: 899px)"),
    ];
    const apply = () => {
      const off = queries.some((q) => q.matches);
      setStill(off);
      if (off) setLit(MILESTONES.map(() => true));
    };
    apply();
    queries.forEach((q) => q.addEventListener("change", apply));
    return () => queries.forEach((q) => q.removeEventListener("change", apply));
  }, []);

  /* The sweep. One rAF-throttled listener; the playhead is written
     straight to the DOM so a scroll never costs a React render, and
     only the active index — which changes a dozen times in the whole
     section — goes through state. */
  useEffect(() => {
    // On the first render `still` is false — the media queries have not
    // been read yet — so this effect runs once and writes an unlit
    // state. When it turns out there is no sweep, restore every
    // milestone rather than leaving the first render's answer standing.
    if (still) {
      setLit(MILESTONES.map(() => true));
      return;
    }
    const node = section.current;
    if (!node) return;

    let queued = false;
    let last = -1;

    const read = () => {
      queued = false;
      const rect = node.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / travel));

      // Ease the ends so the first and last milestones get room to be
      // read rather than flashing past at the turn.
      const year = SPAN.from + p * (SPAN.to - SPAN.from);
      playhead.current?.style.setProperty("--sweep-n", p.toFixed(4));

      let idx = 0;
      const next = MILESTONES.map((m, i) => {
        const on = m.at <= year;
        if (on) idx = i;
        return on;
      });
      // Before the sweep reaches the first milestone there is nothing
      // passed, but the card is already showing it — so light it. The
      // node the card is describing is never drawn as not-yet-reached.
      next[idx] = true;
      if (idx !== last) {
        last = idx;
        setActive(idx);
        setLit(next);
      }
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [still]);

  /* Clicking a node scrolls the page to the moment that node lights,
     so the pointer and the sweep are always telling the same story. */
  const goTo = useCallback(
    (i: number) => {
      const node = section.current;
      if (!node) return setActive(i);
      if (still) return setActive(i);
      const p = (MILESTONES[i].at - SPAN.from) / (SPAN.to - SPAN.from);
      const travel = node.offsetHeight - window.innerHeight;
      window.scrollTo({
        top: node.offsetTop + travel * p + 2,
        behavior: "smooth",
      });
    },
    [still],
  );

  const onKey = (e: React.KeyboardEvent) => {
    const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
    const fwd = e.key === "ArrowRight" || e.key === "ArrowDown";
    if (!back && !fwd) return;
    e.preventDefault();
    const next = Math.min(MILESTONES.length - 1, Math.max(0, active + (fwd ? 1 : -1)));
    setActive(next);
    goTo(next);
    stage.current
      ?.querySelector<HTMLButtonElement>(`[data-i="${next}"]`)
      ?.focus({ preventScroll: true });
  };

  const current = MILESTONES[active];

  return (
    <section
      ref={section}
      id="history"
      className="o-tl"
      style={{ "--travel": `${TRAVEL * 100}vh` } as React.CSSProperties}
      data-still={still || undefined}
      aria-labelledby="tl-head"
    >
      <div className="o-tl-stick" data-still={still || undefined}>
        <div className="o-tl-inner">
          {/* ---------------------------------------------- the head -- */}
          <header className="o-tl-head">
            <p className="o-label text-[10px] text-[var(--orravan-blue)]">
              {HISTORY.eyebrow}
            </p>
            <h2
              id="tl-head"
              className="o-display mt-2 text-[length:var(--head)] leading-[0.88]"
            >
              {HISTORY.head.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </h2>
            <p className="mt-3 max-w-[38ch] text-[13.5px] leading-relaxed text-ink-soft">
              {HISTORY.copy}
            </p>
          </header>

          {/* --------------------------------------------- the chart -- */}
          <div
            ref={stage}
            className="o-tl-stage"
            role="group"
            aria-label="Company history"
            onKeyDown={onKey}
          >
            {/* The grid: year ticks and one rule per lane. Decorative, so
                it is hidden from the reading order entirely. */}
            <svg className="o-tl-grid" aria-hidden preserveAspectRatio="none">
              {LANES.map((lane, i) => (
                <line
                  key={lane.id}
                  x1="0"
                  x2="100%"
                  y1={`${((i + 0.5) / LANES.length) * 100}%`}
                  y2={`${((i + 0.5) / LANES.length) * 100}%`}
                />
              ))}
            </svg>

            <div className="o-tl-years" aria-hidden>
              {YEARS.map((y) => (
                <span key={y} style={{ left: `${X(y)}%` }}>
                  {y}
                </span>
              ))}
            </div>

            <div className="o-tl-lanes" aria-hidden>
              {LANES.map((lane) => (
                <span key={lane.id} className="o-label">
                  {lane.short}
                </span>
              ))}
            </div>

            {/* The playhead. Its position is a custom property written on
                every frame, so nothing re-renders to move it. */}
            <div ref={playhead} className="o-tl-sweep" aria-hidden />

            {MILESTONES.map((m, i) => (
              <Node
                key={m.id}
                m={m}
                i={i}
                lane={LANES.findIndex((l) => l.id === m.lane)}
                flip={LANES.findIndex((l) => l.id === m.lane) === 0}
                lit={lit[i]}
                active={i === active}
                onPick={() => {
                  setActive(i);
                  goTo(i);
                }}
              />
            ))}
          </div>

          {/* ---------------------------------------------- the card -- */}
          <div className="o-tl-card" aria-live="polite">
            <p className="o-label text-[10px] text-[var(--orravan-blue)]">
              {current.stamp}
              {!current.exact && <span className="o-tl-approx"> · year</span>}
            </p>
            <div className="o-tl-card-body">
              {current.figure && (
                <span className="o-display o-tl-figure">{current.figure}</span>
              )}
              <div>
                <h3 className="o-display o-tl-title">{current.title}</h3>
                <p className="o-tl-detail">{current.detail}</p>
              </div>
            </div>
            <p className="o-tl-count o-label">
              {String(active + 1).padStart(2, "0")} / {MILESTONES.length}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Node({
  m,
  i,
  lane,
  flip,
  lit,
  active,
  onPick,
}: {
  m: Milestone;
  i: number;
  lane: number;
  /** Top lane writes its label below the dot; there is no room above. */
  flip: boolean;
  lit: boolean;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      data-i={i}
      className="o-tl-node"
      data-lit={lit || undefined}
      data-on={active || undefined}
      data-flip={flip || undefined}
      aria-current={active ? "true" : undefined}
      onClick={onPick}
      style={
        {
          "--x-n": F(m.at).toFixed(4),
          "--y": `${((lane + 0.5) / LANES.length) * 100}%`,
        } as React.CSSProperties
      }
    >
      <span className="o-tl-dot" aria-hidden />
      <span className="o-tl-node-text">
        <span className="o-label o-tl-node-year">{m.stamp}</span>
        <span className="o-tl-node-title">{m.title}</span>
      </span>
    </button>
  );
}
