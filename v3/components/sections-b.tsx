"use client";

import { DIFFERENCE, INDUSTRIES, RECORD, SERVICES, TEAM } from "@/lib/site";
import { Band, Head } from "./sections-a";
import { asset } from "@/lib/images";
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
            className="mt-5 inline-flex min-h-[44px] items-center border border-ink/30 px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink/5"
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
                className="h-[max(130px,9.8vw)] overflow-hidden"
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
            className="mt-5 inline-flex min-h-[44px] items-center border border-bone/45 px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-bone transition-colors hover:bg-bone/10"
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
              className="h-[max(175px,14.5vw)] overflow-hidden"
              imgClassName={`h-full w-full object-cover ${
                slot === "difference-experience" ? "object-[50%_35%]" : "object-top"
              }`}
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
          <div className="mt-5 flex flex-wrap gap-3">
            <a href={asset("/team")} className="o-btn bg-[var(--orravan-blue)]">
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
          className="h-[max(190px,17vw)] overflow-hidden"
          imgClassName="h-full w-full object-cover object-[50%_35%]"
        />
      </Reveal>
    </Band>
  );
}

/* ----------------------------------------- built for every industry --- */

export function Industries() {
  return (
    <Band id="industries">
      <Head lines={INDUSTRIES.head} copy={INDUSTRIES.copy} />

      {/* Every market on the page at once, as Orravan asked, rather than
          one behind a tab. Scattered: alternate tiles sit lower and the
          sizes vary, so it reads as a wall of the buildings they work in
          rather than a filing system. Each plate keeps its own vertical
          focus — a shared value clips somebody in every frame. */}
      <ol className="o-markets">
        {INDUSTRIES.tabs.map((tab, i) => (
          <li key={tab.name} className="o-market" data-i={i}>
            <Reveal delay={i * 70}>
              <Plate
                slot={tab.slot}
                parallax={6}
                className="o-market-plate"
                imgClassName="h-full w-full object-cover"
                imgStyle={{ objectPosition: `50% ${tab.focus}` }}
              />
              <span className="o-market-name">
                <span className="o-label o-market-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="o-display">{tab.name}</span>
              </span>
            </Reveal>
          </li>
        ))}
      </ol>
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

