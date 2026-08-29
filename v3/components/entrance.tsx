"use client";

import { useEffect, useRef } from "react";
import { ENTRANCE, NAV } from "@/lib/site";
import { IMAGES, asset } from "@/lib/images";

/**
 * The entrance.
 *
 * A full blue plate with the mark centred, the building just readable
 * behind it. One short scroll — about 70vh, a single flick — carries
 * the mark up and away, separates the building and the facility leader
 * into depth planes, lands the headline, and hands the page over to the
 * navigation.
 *
 * Everything is written straight to the DOM on animation frames, so the
 * scrub costs no React renders. The two doors stay mounted and hittable
 * the whole way through: they only drift, they never fade or lift out
 * of the pointer's way.
 *
 * Reduced motion skips the sequence entirely — the plate is one screen
 * tall and shows the finished hero on arrival.
 */

/** Smooth the raw scroll fraction so the sequence eases, not ramps. */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
/** Map p onto [from, to] and clamp: each act owns a slice of the scrub. */
const at = (p: number, from: number, to: number) =>
  Math.min(1, Math.max(0, (p - from) / (to - from)));

export function Entrance() {
  const section = useRef<HTMLElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const building = useRef<HTMLDivElement>(null);
  const leader = useRef<HTMLDivElement>(null);
  const headline = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLUListElement>(null);
  const doors = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = section.current;
    if (!node) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** The finished hero: what reduced motion sees on arrival. */
    const settle = () => {
      mark.current?.style.setProperty("opacity", "0");
      mark.current?.style.setProperty("transform", "translate3d(0,-30px,0)");
      cue.current?.style.setProperty("opacity", "0");
      building.current?.style.setProperty("opacity", "0.22");
      building.current?.style.setProperty("transform", "translate3d(0,0,0) scale(1)");
      leader.current?.style.setProperty("opacity", "0.55");
      leader.current?.style.setProperty("transform", "translate3d(0,0,0)");
      headline.current?.style.setProperty("opacity", "1");
      headline.current?.style.setProperty("transform", "translate3d(0,0,0)");
      chips.current?.style.setProperty("opacity", "1");
      doors.current?.style.setProperty("transform", "translate3d(0,0,0)");
      document.documentElement.dataset.entered = "true";
    };

    if (still) {
      settle();
      return;
    }

    let frame = 0;
    let queued = false;

    const read = () => {
      queued = false;
      const rect = node.getBoundingClientRect();
      const travel = node.offsetHeight - window.innerHeight;
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;

      // 1-5 — the mark rises a little and goes.
      const gone = ease(at(p, 0, 0.45));
      mark.current?.style.setProperty("opacity", `${1 - gone}`);
      mark.current?.style.setProperty(
        "transform",
        `translate3d(0, ${(-42 * gone).toFixed(1)}px, 0) scale(${(1 - 0.06 * gone).toFixed(3)})`,
      );
      cue.current?.style.setProperty("opacity", `${1 - ease(at(p, 0, 0.18))}`);

      // 6 — the building and the leader separate into depth planes.
      const back = ease(at(p, 0, 0.85));
      building.current?.style.setProperty("opacity", `${(0.1 + 0.12 * back).toFixed(3)}`);
      building.current?.style.setProperty(
        "transform",
        `translate3d(0, ${(46 * (1 - back)).toFixed(1)}px, 0) scale(${(1.07 - 0.07 * back).toFixed(3)})`,
      );
      const front = ease(at(p, 0.22, 0.85));
      leader.current?.style.setProperty("opacity", `${(0.55 * front).toFixed(3)}`);
      leader.current?.style.setProperty(
        "transform",
        `translate3d(${(70 * (1 - front)).toFixed(1)}px, ${(-18 * (1 - front)).toFixed(1)}px, 0)`,
      );

      // 7 — the headline lands.
      const said = ease(at(p, 0.34, 0.72));
      headline.current?.style.setProperty("opacity", `${said}`);
      headline.current?.style.setProperty(
        "transform",
        `translate3d(0, ${(26 * (1 - said)).toFixed(1)}px, 0)`,
      );
      chips.current?.style.setProperty("opacity", `${ease(at(p, 0.4, 0.95))}`);

      // The doors drift with the headline — never out of reach.
      doors.current?.style.setProperty(
        "transform",
        `translate3d(0, ${(18 * ease(at(p, 0, 0.6))).toFixed(1)}px, 0)`,
      );

      // 8 — the navigation takes over.
      document.documentElement.dataset.entered = p > 0.55 ? "true" : "false";
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
      delete document.documentElement.dataset.entered;
    };
  }, []);

  return (
    <section ref={section} id="top" className="o-entrance">
      <div className="o-entrance-stage">
        {/* The building, deep behind everything. */}
        <div ref={building} className="o-plane o-plane-building">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset(IMAGES["entrance-building"].src)} alt="" aria-hidden />
        </div>

        {/* The facility leader, the nearer plane. */}
        <div ref={leader} className="o-plane o-plane-leader">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset(IMAGES["entrance-leader"].src)}
            alt={IMAGES["entrance-leader"].alt}
          />
        </div>

        {/* What the building is saying, quietly, throughout. */}
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

        <div className="o-entrance-centre">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div ref={mark} className="o-entrance-mark">
            <img src={asset(IMAGES.logo.src)} alt="Orravan" />
          </div>

          <h1 ref={headline} className="o-entrance-head">
            <span>{ENTRANCE.headA}</span>
            <span>{ENTRANCE.headB}</span>
          </h1>

          <div ref={doors} className="o-doors">
            <a href="#record" className="o-btn o-btn-line">
              {NAV.portal}
            </a>
            <a href="#close" className="o-btn o-btn-solid">
              {NAV.request}
            </a>
          </div>

          <div ref={cue} className="o-cue" aria-hidden>
            <span>{ENTRANCE.cue}</span>
            <svg viewBox="0 0 16 9" width="16" height="9" fill="none">
              <path d="M1 1 L8 8 L15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
