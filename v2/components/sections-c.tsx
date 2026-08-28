"use client";

import { useState } from "react";
import { CLOSE, RECORD, TEAM } from "@/lib/site";
import { X, SectionIntro } from "./sections-a";
import { Thread } from "./thread";
import { ParallaxY, Plate, Reveal } from "./ui";

/* --------------------------------------------------- 08 · the team --- */

export function S8Team() {
  return (
    <section className="relative bg-bone">
      <div className="mx-auto max-w-[1440px] py-16 pl-5 lg:pl-10">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(320px,1fr)_2.3fr]">
          <SectionIntro
            n="08"
            title={<>The thread is only as strong as the team.</>}
            copy={TEAM.copy}
            aside={
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#close" className="o-btn">{TEAM.primary}</a>
                <a href="#close" className="o-btn o-btn-ghost">{TEAM.secondary} →</a>
              </div>
            }
          />

          <Reveal>
            <Plate
              slot="team-table"
              parallax={22}
              className="min-h-[380px] overflow-hidden"
              imgClassName="h-full w-full object-cover"
            />
          </Reveal>
        </div>
      </div>

      <Thread
        color="verified"
        d={`M${X.s7Out} 0 C ${X.s7Out} 18, 70 30, 60 50 C 52 68, ${X.s8Out} 80, ${X.s8Out} 100`}
        className="hidden lg:block"
      />
    </section>
  );
}

/* ------------------------------------------- 09 · the service record --- */

export function S9Record() {
  return (
    <section id="record" className="relative bg-bone">
      <div className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_2.3fr]">
          <SectionIntro
            n="09"
            title={<>Different buildings. One standard of response.</>}
            copy="Every incident closes the same way: verified, documented, and yours to keep."
          />

          <Reveal>
            <ParallaxY by={10}>
            <div className="o-card overflow-hidden">
              <p className="o-label border-b border-rule px-6 py-3.5 text-[10px] text-ink-mute">
                Service record
              </p>
              <div className="grid gap-8 p-6 lg:grid-cols-[220px_1fr_190px]">
                <RecordTimeline />
                <RecordTable />
                <RecordDocs />
              </div>
            </div>
            </ParallaxY>
          </Reveal>
        </div>
      </div>

      <Thread
        color="verified"
        d={`M${X.s8Out} 0 C ${X.s8Out} 16, 34 28, 30 50 C 26 72, ${X.s9Out} 82, ${X.s9Out} 100`}
        className="hidden lg:block"
      />
    </section>
  );
}

/** The green spine: each stage lights in turn as the section arrives. */
function RecordTimeline() {
  const [seen, setSeen] = useState(false);
  return (
    <ol
      ref={(node) => {
        if (!node || seen) return;
        const observer = new IntersectionObserver(
          ([entry]) => entry.isIntersecting && setSeen(true),
          { threshold: 0.5 },
        );
        observer.observe(node);
      }}
      className="relative space-y-5 border-l-2 border-verified/40 pl-5"
    >
      {RECORD.timeline.map((stop, i) => (
        <li
          key={stop.stage}
          className="relative transition-all duration-500"
          style={{
            opacity: seen ? 1 : 0,
            transform: seen ? "none" : "translateX(-10px)",
            transitionDelay: `${i * 160}ms`,
          }}
        >
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-verified bg-white" />
          <p className="o-label text-[10px] text-ink">{stop.stage}</p>
          <p className="o-num text-[13px] text-ink-mute">{stop.time}</p>
        </li>
      ))}
    </ol>
  );
}

function RecordTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[380px] text-left text-[12px]">
        <thead>
          <tr className="o-label text-[9px] text-ink-mute">
            {["Event", "Details", "By", "Time"].map((h) => (
              <th key={h} className="border-b border-rule pb-2.5 pr-4 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RECORD.rows.map((row) => (
            <tr key={row.event} className="align-top">
              <td className="border-b border-rule/60 py-2.5 pr-4 font-semibold text-ink">
                {row.event}
              </td>
              <td className="border-b border-rule/60 py-2.5 pr-4 text-ink-soft">{row.details}</td>
              <td className="border-b border-rule/60 py-2.5 pr-4 text-ink-mute">{row.by}</td>
              <td className="o-num border-b border-rule/60 py-2.5 text-ink-mute">{row.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordDocs() {
  return (
    <div>
      <p className="o-label text-[9px] text-ink-mute">Documents</p>
      <ul className="mt-3 space-y-2">
        {RECORD.documents.map((doc) => (
          <li key={doc.name}>
            <a
              href="#"
              className="flex items-center justify-between gap-3 rounded border border-rule px-3 py-2 text-[12px] text-ink-soft transition-colors hover:border-signal hover:text-signal"
            >
              {doc.name}
              <span className="o-label text-[9px] text-ink-mute">{doc.kind}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------ 10 · close --- */

export function S10Close() {
  const [seen, setSeen] = useState(false);

  return (
    <section id="close" className="relative bg-bone">
      <div className="mx-auto max-w-[1280px] px-5 pb-24 pt-16 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.5fr]">
          <SectionIntro n="10" title={<>The full thread. In your hands.</>} copy={CLOSE.copy} />

          <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-center">
            {/* The thread's destination: the verified check. */}
            <div
              ref={(node) => {
                if (!node || seen) return;
                const observer = new IntersectionObserver(
                  ([entry]) => entry.isIntersecting && setSeen(true),
                  { threshold: 0.7 },
                );
                observer.observe(node);
              }}
              className={`relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-[6px] border-signal ${
                seen ? "o-stamped" : "opacity-0"
              }`}
            >
              <svg viewBox="0 0 40 40" className="h-16 w-16 text-ink" fill="none" aria-hidden>
                <path d="M8 22 L17 30 L33 10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="flex flex-col items-center gap-3 lg:items-start">
              <div className="flex flex-wrap justify-center gap-3">
                <a href="#" className="o-btn">{CLOSE.primary}</a>
                <a href="#" className="o-btn o-btn-ghost">{CLOSE.secondary} →</a>
              </div>
              <a href="#" className="o-link">{CLOSE.tertiary} →</a>
            </div>
          </div>
        </div>
      </div>

      {/* The last segment lands on the check dead-centre of the ring. */}
      <Thread
        color="verified"
        d={`M${X.s9Out} 0 C ${X.s9Out} 22, 52 30, 56 48 C 59 60, 57 64, 57 70`}
        span={0.7}
        className="hidden lg:block"
      />
    </section>
  );
}
