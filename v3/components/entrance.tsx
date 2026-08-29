"use client";

import { useEffect, useRef } from "react";
import { ENTRANCE, NAV } from "@/lib/site";
import { IMAGES, asset } from "@/lib/images";

/**
 * The blue entry and the hero it hands over to.
 *
 * Entry: a full Orravan-blue viewport, the official mark centred, and
 * exactly two actions. Between 0 and 25vh of scroll the entry layer
 * fades and rises 24px and the blueprint field appears underneath.
 * The hero copy then reveals line by line behind a clip mask, and the
 * navigation takes the page.
 *
 * The hero is three independent layers moving at different rates —
 * blueprint slowest, facility leader nearly with the page, building
 * cut-away fastest — with the whole budget kept under 48px of travel,
 * plus a few pixels of pointer depth. Restraint is the point: this is
 * depth, not a ride.
 *
 * The two actions never fade out and never leave the pointer's reach;
 * they are the same two doors in the entry and in the hero, so they
 * rise with the entry layer but hold full opacity throughout.
 *
 * Everything is written straight to the DOM on animation frames, so the
 * scrub costs no React renders. Reduced motion gets the finished hero
 * immediately, with no scrubbing and no parallax.
 */

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (t: number) => Math.min(1, Math.max(0, t));

/** Travel budget for the whole hero, in pixels. Stays under 48. */
const TRAVEL = 44;

export function Entrance() {
  const section = useRef<HTMLElement>(null);
  const entry = useRef<HTMLDivElement>(null);
  const doors = useRef<HTMLDivElement>(null);
  const blueprint = useRef<HTMLDivElement>(null);
  const leader = useRef<HTMLDivElement>(null);
  const building = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLUListElement>(null);
  const cue = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = section.current;
    if (!node) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** The finished hero: what reduced motion sees on arrival. */
    const settle = () => {
      entry.current?.style.setProperty("opacity", "0");
      entry.current?.style.setProperty("pointer-events", "none");
      entry.current?.style.setProperty("transform", "translate3d(0,-24px,0)");
      doors.current?.style.setProperty("transform", "translate3d(0,-24px,0)");
      cue.current?.style.setProperty("opacity", "0");
      for (const layer of [blueprint, leader, building]) {
        layer.current?.style.setProperty("opacity", "1");
        layer.current?.style.setProperty("transform", "none");
      }
      if (copy.current) {
        copy.current.style.setProperty("opacity", "1");
        copy.current.dataset.in = "true";
      }
      chips.current?.style.setProperty("opacity", "1");
      document.documentElement.dataset.entered = "true";
    };

    if (still) {
      settle();
      return;
    }

    let frame = 0;
    let queued = false;
    let px = 0;
    let py = 0;

    const read = () => {
      queued = false;
      const vh = window.innerHeight;
      const y = Math.max(0, -node.getBoundingClientRect().top);

      // 2 — the handoff: 0 to 25vh, fade and rise 24px.
      const handoff = ease(clamp(y / (vh * 0.25)));
      entry.current?.style.setProperty("opacity", `${1 - handoff}`);
      entry.current?.style.setProperty("pointer-events", handoff > 0.75 ? "none" : "auto");
      entry.current?.style.setProperty(
        "transform",
        `translate3d(0, ${(-24 * handoff).toFixed(1)}px, 0)`,
      );
      // The doors rise with the entry but keep their opacity and their
      // hit area — they are the hero's actions too.
      doors.current?.style.setProperty(
        "transform",
        `translate3d(0, ${(-24 * handoff).toFixed(1)}px, 0)`,
      );

      cue.current?.style.setProperty("opacity", `${1 - ease(clamp(y / (vh * 0.12)))}`);

      // 3 — the hero's three layers, each at its own rate.
      const q = clamp(y / (vh * 0.6));
      const depth = ease(clamp(y / (vh * 0.3)));
      blueprint.current?.style.setProperty("opacity", `${depth}`);
      blueprint.current?.style.setProperty(
        "transform",
        `translate3d(${(px * 0.4).toFixed(1)}px, ${(q * -TRAVEL * 0.18 + py * 0.4).toFixed(1)}px, 0)`,
      );
      leader.current?.style.setProperty("opacity", `${depth}`);
      leader.current?.style.setProperty(
        "transform",
        `translate3d(${(px * 1).toFixed(1)}px, ${(q * TRAVEL * 0.05 + py).toFixed(1)}px, 0)`,
      );
      building.current?.style.setProperty("opacity", `${depth}`);
      building.current?.style.setProperty(
        "transform",
        `translate3d(${(px * 1.6).toFixed(1)}px, ${(q * TRAVEL * 0.42 + py * 1.6).toFixed(1)}px, 0)`,
      );

      // 4 — the copy reveals by line once the entry has cleared.
      if (copy.current) {
        const shown = ease(clamp((y - vh * 0.1) / (vh * 0.18)));
        copy.current.style.setProperty("opacity", `${shown}`);
        copy.current.style.setProperty("pointer-events", shown > 0.3 ? "auto" : "none");
        copy.current.dataset.in = handoff > 0.6 ? "true" : "false";
      }
      chips.current?.style.setProperty("opacity", `${ease(clamp((y - vh * 0.2) / (vh * 0.3)))}`);

      document.documentElement.dataset.entered = handoff > 0.72 ? "true" : "false";
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      frame = requestAnimationFrame(read);
    };

    /* A few pixels of pointer depth, fine pointers only. */
    const onPointer = (event: PointerEvent) => {
      px = (event.clientX / window.innerWidth - 0.5) * -8;
      py = (event.clientY / window.innerHeight - 0.5) * -5;
      onScroll();
    };
    const fine = window.matchMedia("(pointer: fine)").matches;

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    if (fine) node.addEventListener("pointermove", onPointer);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      node.removeEventListener("pointermove", onPointer);
      delete document.documentElement.dataset.entered;
    };
  }, []);

  return (
    <section ref={section} id="top" className="o-entrance">
      <div className="o-entrance-stage">
        {/* The hero, three independent layers. */}
        <div ref={blueprint} className="o-layer o-layer-blueprint">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset(IMAGES["hero-blueprint"].src)} alt="" aria-hidden />
        </div>
        <div ref={building} className="o-layer o-layer-building">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset(IMAGES["hero-building"].src)} alt={IMAGES["hero-building"].alt} />
        </div>
        <div ref={leader} className="o-layer o-layer-leader">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset(IMAGES["hero-leader"].src)} alt={IMAGES["hero-leader"].alt} />
        </div>

        {/* What the building is saying, in the technical register. */}
        <ul ref={chips} className="o-chips" aria-label="Live conditions">
          {ENTRANCE.chips.map((chip) => (
            <li key={chip.label}>
              <span className="o-chip-dot" />
              <span>
                <span className="o-chip-label">{chip.label}</span>
                <span className="o-chip-state">{chip.state}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* The entry: the mark, two doors, the cue. Centred. */}
        <div ref={entry} className="o-entry">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="o-entry-mark"
            src={asset(IMAGES["logo-reverse"].src)}
            alt={IMAGES["logo-reverse"].alt}
          />
          <div ref={doors} className="o-doors">
            <a href="#record" className="o-btn-line">{NAV.portal}</a>
            <a href="#close" className="o-btn-solid">{NAV.request}</a>
          </div>
          <div ref={cue} className="o-cue" aria-hidden>
            <span>{ENTRANCE.cue}</span>
            <svg viewBox="0 0 16 9" width="16" height="9" fill="none">
              <path d="M1 1 L8 8 L15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* The hero the entry hands over to. Left column. */}
        <div ref={copy} className="o-hero" data-in="false">
          <h1>
            <span className="o-mask"><span>{ENTRANCE.headA}</span></span>
            <span className="o-mask o-mask-2"><span>{ENTRANCE.headB}</span></span>
          </h1>
          <p>{ENTRANCE.body}</p>
          <div className="o-hero-doors">
            <a href="#close" className="o-btn-solid">{ENTRANCE.primary}</a>
            <a href="#close" className="o-btn-line">{ENTRANCE.secondary}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
