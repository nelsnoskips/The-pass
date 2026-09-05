"use client";

import { useEffect, useRef, useState } from "react";
import { CHAPTERS, STORY } from "@/lib/company";
import { asset, IMAGES } from "@/lib/images";

/**
 * Ten years, travelling sideways.
 *
 * The team page draws the history as an instrument, which is the right
 * register for someone who has gone looking for it. A visitor landing
 * on the homepage has not gone looking for anything — they want to feel
 * that this company has been doing the work a while, and feeling is a
 * job for photographs, not for a chart. So the same decade runs here as
 * seven full-bleed frames that travel horizontally while the page
 * scrolls down, the year set large across each one.
 *
 * The pin is the whole effect and also the whole risk: a horizontal
 * track inside a sticky stage is one bad measurement away from a
 * sideways-scrolling page. It is built so the track can only ever be
 * moved by transform, never by layout, and the stage clips.
 *
 * Under reduced motion, and on anything too narrow to hold a frame
 * beside its neighbour, there is no pin and no travel: the same frames
 * stack vertically and the section becomes an ordinary photo essay.
 */

export function Story() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const queries = [
      window.matchMedia("(prefers-reduced-motion: reduce)"),
      window.matchMedia("(max-width: 899px)"),
    ];
    const apply = () => setStill(queries.some((q) => q.matches));
    apply();
    queries.forEach((q) => q.addEventListener("change", apply));
    return () => queries.forEach((q) => q.removeEventListener("change", apply));
  }, []);

  useEffect(() => {
    if (still) {
      // Leaving a stale transform behind would shift the stacked frames
      // off their own column.
      if (track.current) track.current.style.transform = "";
      return;
    }
    const host = section.current;
    const rail = track.current;
    if (!host || !rail) return;

    let queued = false;

    const read = () => {
      queued = false;
      const rect = host.getBoundingClientRect();
      const down = rect.height - window.innerHeight;
      const raw = down <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / down));

      // Hold at both ends. Without the lead-in the first frame is
      // already sliding off before the heading has been read; without
      // the tail the last one arrives and leaves in the same instant.
      const LEAD = 0.1;
      const TAIL = 0.07;
      const p = Math.min(1, Math.max(0, (raw - LEAD) / (1 - LEAD - TAIL)));

      // Travel is measured every frame rather than cached: the frames
      // are sized in vw, so a resize changes the distance and a stale
      // number would strand the last chapter off-screen.
      const across = Math.max(0, rail.scrollWidth - rail.parentElement!.clientWidth);
      rail.style.transform = `translate3d(${-(p * across).toFixed(1)}px, 0, 0)`;
      if (fill.current) fill.current.style.transform = `scaleX(${p.toFixed(4)})`;
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

  return (
    <section
      ref={section}
      id="story"
      className="o-st"
      data-still={still || undefined}
      /* One screen to read the head, then one per chapter to travel. */
      style={{ "--travel": `${100 + CHAPTERS.length * 62}vh` } as React.CSSProperties}
      aria-labelledby="st-head"
    >
      <div className="o-st-stick">
        <header className="o-st-head">
          <p className="o-label text-[10px] text-[var(--orravan-blue)]">{STORY.eyebrow}</p>
          <h2 id="st-head" className="o-display o-st-title">
            {STORY.head.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </h2>
          <p className="o-st-copy">{STORY.copy}</p>
          <a href={asset("/team")} className="o-link o-st-cta">
            {STORY.cta} &rarr;
          </a>
        </header>

        <div className="o-st-window">
          <ol ref={track} className="o-st-track">
            {CHAPTERS.map((c) => {
              const plate = IMAGES[c.slot];
              return (
                <li key={c.id} className="o-st-frame">
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset(plate.src)}
                      alt={plate.alt}
                      style={{ objectPosition: c.focus }}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="o-st-year o-display" aria-hidden>
                      {c.year}
                    </span>
                    <figcaption>
                      <span className="o-label o-st-kicker">{c.kicker}</span>
                      <span className="o-st-frame-title o-display">{c.title}</span>
                      <span className="o-st-line">{c.line}</span>
                    </figcaption>
                  </figure>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="o-st-rail" aria-hidden>
          <span ref={fill} className="o-st-rail-fill" />
          <span className="o-st-rail-ends o-label">
            <span>2014</span>
            <span>Today</span>
          </span>
        </div>
      </div>
    </section>
  );
}
