"use client";

import { useState } from "react";
import { CLOSE, DIFFERENCE, INDUSTRIES, RECORD, SERVICES, TEAM } from "@/lib/site";
import { Band, Head } from "./sections-a";
import { Plate, Reveal } from "./ui";

/* ------------------------------------------------ intelligence, applied --- */

export function Services() {
  return (
    <Band id="services">
      <Head
        lines={SERVICES.head}
        aside={
          <a
            href="#close"
            className="mt-7 inline-flex min-h-[44px] items-center border border-ink/30 px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink/5"
          >
            {SERVICES.cta}
          </a>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:pr-10">
        {SERVICES.items.map((item) => (
          <Reveal key={item.name}>
            <article className="flex h-full flex-col">
              <Plate
                slot={item.slot}
                parallax={8}
                className="aspect-[4/5] overflow-hidden"
                imgClassName="h-full w-full object-cover"
              />
              <div className="flex flex-1 flex-col border border-t-0 border-rule bg-bone p-4">
                <p className="o-label text-[10px] text-ink">{item.name}</p>
                <p className="mt-2 text-[12px] leading-snug text-ink-mute">{item.detail}</p>
                <span className="o-label mt-auto pt-4 text-[10px] text-[var(--orravan-blue)]">
                  Learn more →
                </span>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Band>
  );
}

/* ------------------------------- software sees, experience decides --- */

export function Difference() {
  return (
    <Band dark>
      <Head
        dark
        lines={DIFFERENCE.head}
        copy={DIFFERENCE.copy}
        aside={
          <a
            href="#team"
            className="mt-7 inline-flex min-h-[44px] items-center border border-bone/45 px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-bone transition-colors hover:bg-bone/10"
          >
            {DIFFERENCE.cta}
          </a>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {["difference-software", "difference-experience"].map((slot) => (
          <Reveal key={slot}>
            <Plate
              slot={slot}
              parallax={12}
              className="aspect-[3/2] overflow-hidden"
              imgClassName="h-full w-full object-cover object-top"
            />
          </Reveal>
        ))}
      </div>
    </Band>
  );
}

/* ------------------------------------- build what buildings become --- */

export function Team() {
  return (
    <Band id="team">
      <Head
        lines={TEAM.head}
        copy={TEAM.copy}
        aside={
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#close" className="o-btn bg-[var(--orravan-blue)]">
              {TEAM.primary}
            </a>
            <a
              href="#close"
              className="inline-flex min-h-[44px] items-center border border-ink/30 px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink/5"
            >
              {TEAM.secondary}
            </a>
          </div>
        }
      />

      <Reveal>
        <Plate
          slot="team"
          parallax={10}
          className="aspect-[16/9] overflow-hidden"
          imgClassName="h-full w-full object-cover object-[center_12%]"
        />
      </Reveal>
    </Band>
  );
}

/* ----------------------------------------- built for every industry --- */

export function Industries() {
  const [open, setOpen] = useState(0);

  return (
    <Band id="industries">
      <Head lines={INDUSTRIES.head} />

      <div>
        <div className="flex flex-wrap gap-x-7 gap-y-2 border-b border-rule pb-3">
          {INDUSTRIES.tabs.map((tab, i) => {
            const active = i === open;
            return (
              <button
                key={tab.name}
                type="button"
                onClick={() => setOpen(i)}
                aria-pressed={active}
                className={`o-label relative min-h-[36px] text-[10px] transition-colors ${
                  active ? "text-[var(--orravan-blue)]" : "text-ink-mute hover:text-ink"
                }`}
              >
                {tab.name}
                <span
                  className="absolute inset-x-0 -bottom-3 h-[2px] bg-[var(--orravan-blue)] transition-opacity"
                  style={{ opacity: active ? 1 : 0 }}
                />
              </button>
            );
          })}
        </div>

        {/* Every panel stays mounted so switching is a cross-fade, not a
            reflow — the section never jumps as tabs change. */}
        <div className="relative mt-4 aspect-[3/2] overflow-hidden">
          {INDUSTRIES.tabs.map((tab, i) => (
            <div
              key={tab.name}
              aria-hidden={i !== open}
              className="absolute inset-0 transition-opacity duration-500"
              style={{ opacity: i === open ? 1 : 0 }}
            >
              <Plate
                slot={tab.slot}
                className="h-full"
                imgClassName="h-full w-full object-cover object-center"
              />
            </div>
          ))}
        </div>
      </div>
    </Band>
  );
}

/* --------------------------------- client record. complete. verified --- */

export function Record() {
  return (
    <Band id="record">
      <Head lines={RECORD.head} />

      <Reveal className="lg:pr-10">
        <div className="border border-rule bg-white shadow-[0_24px_60px_rgba(23,24,26,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3.5">
            <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="o-num text-[12px] font-semibold text-ink">{RECORD.order}</span>
              <span className="text-[13px] text-ink-soft">{RECORD.subject}</span>
            </span>
            <span className="o-label text-[10px] text-[var(--orravan-blue)]">{RECORD.cta} →</span>
          </div>

          <ol className="grid gap-y-6 p-5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-0 lg:divide-x lg:divide-rule [&>li]:lg:px-4 [&>li:first-child]:lg:pl-0">
            {RECORD.steps.map((step, i) => (
              <li key={step.stage}>
                <Reveal>
                  <span className="flex items-center gap-2">
                    <Mark done={i > 1} />
                    <span className="o-label text-[9.5px] text-ink">{step.stage}</span>
                  </span>
                  <p className="o-num mt-2 text-[11px] text-ink-mute">{step.time}</p>
                  <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">{step.detail}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
    </Band>
  );
}

/** Blue while the work is moving, green once it is verified. */
function Mark({ done }: { done: boolean }) {
  return (
    <span
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white"
      style={{ background: done ? "var(--verified)" : "var(--orravan-blue)" }}
    >
      <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" aria-hidden>
        <path d="M3 8.5 L6.5 12 L13 4.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------- the close --- */

export function Close() {
  return (
    <section id="close" className="relative overflow-x-clip bg-[var(--orravan-blue)] text-white">
      <div className="grid gap-8 px-5 py-16 lg:grid-cols-[minmax(240px,320px)_1fr] lg:gap-10 lg:px-10">
        <Reveal>
          <h2 className="o-display text-[clamp(3rem,5.5vw,6rem)] leading-[0.88] tracking-[0.004em]">
            {CLOSE.head.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>
        </Reveal>

        <Reveal delay={120} className="flex flex-col justify-center gap-6">
          <p className="max-w-[38ch] text-[15px] leading-relaxed text-white/75">{CLOSE.copy}</p>
          <div className="flex flex-wrap gap-3">
            <a href="#top" className="o-btn-solid">
              {CLOSE.primary}
            </a>
            <a href="#top" className="o-btn-line">
              {CLOSE.secondary}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
