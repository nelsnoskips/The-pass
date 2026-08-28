"use client";

import { FLOW, RESPONSE, SERVICES, VERIFIED } from "@/lib/site";
import { useState } from "react";
import { X, SectionIntro } from "./sections-a";
import { Thread } from "./thread";
import { Plate, Reveal } from "./ui";

/* -------------------------------------------- 04 · the response --- */

export function S4Response() {
  return (
    <section className="relative bg-bone">
      <div className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_2.1fr]">
          <SectionIntro
            n="04"
            title={<>The thread becomes a response.</>}
            copy="The right people. The right action. Confirmed."
          />

          <div className="grid gap-4 sm:grid-cols-3">
            {RESPONSE.map((step, i) => (
              <Reveal key={step.time} delay={i * 140}>
                <article className="o-card overflow-hidden">
                  <div className="flex items-baseline justify-between px-4 pt-3.5">
                    <span className="o-num text-[15px] text-ink">{step.time}</span>
                    <span className="o-label text-[9px] text-ink-mute">{`0${i + 1}`}</span>
                  </div>
                  <p className="o-label px-4 pt-1 text-[10px] text-signal">{step.who}</p>
                  <p className="px-4 pb-3 pt-0.5 text-[12px] text-ink-soft">{step.did}</p>
                  <Plate
                    slot={step.slot}
                    parallax={10}
                    className="h-36 overflow-hidden"
                    imgClassName="h-full w-full object-cover"
                  />
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* The hand-off section: the line weaves through all three cards
          and leaves green — the work is done, awaiting verification. */}
      <Thread
        color="transition"
        d={`M${X.s3Out} 0 C ${X.s3Out} 12, 40 22, 42 38 C 44 52, 62 48, 68 60 C 74 72, ${X.s4Out} 82, ${X.s4Out} 100`}
        nodes={[[42, 38, 0.36], [68, 60, 0.62], [30, 92, 0.9]]}
        className="hidden lg:block"
      />
    </section>
  );
}

/* --------------------------------------------- 05 · verified green --- */

export function S5Verified() {
  return (
    <section className="relative bg-bone">
      <div className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SectionIntro
            n="05"
            title={
              <>
                Blue while we&rsquo;re working.{" "}
                <span className="text-verified">Green when it&rsquo;s verified.</span>
              </>
            }
            copy="Comfort restored. Systems balanced. Documentation complete."
            aside={
              <ul className="mt-8 grid grid-cols-3 gap-3">
                {VERIFIED.chips.map((chip) => (
                  <li key={chip} className="text-center">
                    <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-ink/25 text-verified">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="o-label mt-2 block text-[8.5px] leading-tight text-ink-mute">
                      {chip}
                    </span>
                  </li>
                ))}
              </ul>
            }
          />

          <Reveal className="relative">
            <Plate
              slot="verified-office"
              parallax={24}
              className="min-h-[320px] overflow-hidden rounded-md"
              imgClassName="h-full w-full object-cover"
            />
            <VerifiedCard />
          </Reveal>
        </div>
      </div>

      <Thread
        color="verified"
        d={`M${X.s4Out} 0 C ${X.s4Out} 16, 60 26, 66 46 C 72 66, ${X.s5Out} 78, ${X.s5Out} 100`}
        nodes={[[66, 46, 0.5]]}
        className="hidden lg:block"
      />
    </section>
  );
}

/** The green card stamps in once the section is on screen. */
function VerifiedCard() {
  const [seen, setSeen] = useState(false);
  return (
    <div
      ref={(node) => {
        if (!node || seen) return;
        const observer = new IntersectionObserver(
          ([entry]) => entry.isIntersecting && setSeen(true),
          { threshold: 0.6 },
        );
        observer.observe(node);
      }}
      className={`absolute bottom-6 right-6 w-[230px] rounded-md bg-white p-4 shadow-[0_18px_40px_rgba(23,24,26,0.25)] ${
        seen ? "o-stamped" : "opacity-0"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-verified text-white">
          <Check className="h-4 w-4" />
        </span>
        <span className="o-label text-[10px] text-verified">Verified</span>
        <span className="o-num ml-auto text-[12px] text-ink-mute">{VERIFIED.time}</span>
      </span>
      <p className="mt-2.5 text-[12px] leading-snug text-ink-soft">{VERIFIED.note}</p>
    </div>
  );
}

/* ------------------------------------------------- 06 · services --- */

export function S6Services() {
  const [open, setOpen] = useState(0);

  return (
    <section id="services" className="relative bg-bone">
      <div className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.4fr_1fr]">
          <SectionIntro
            n="06"
            title={<>One thread. Every Orravan service.</>}
            copy="Whichever system needs attention, it is the same intelligence, the same people, the same record."
          />

          <div className="divide-y divide-rule border-y border-rule">
            {SERVICES.map((service, i) => {
              const isOpen = open === i;
              return (
                <div key={service.name}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(i)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left"
                  >
                    <span className={`o-label text-[11px] ${isOpen ? "text-signal" : "text-ink"}`}>
                      {service.name}
                    </span>
                    <span className="text-lg leading-none text-ink-mute">{isOpen ? "–" : "+"}</span>
                  </button>
                  <div
                    className="grid overflow-hidden transition-[grid-template-rows] duration-300"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="min-h-0">
                      <p className="pb-2 text-[13px] leading-relaxed text-ink-soft">
                        {service.detail}
                      </p>
                      <a href="#close" className="o-link mb-4 inline-block">
                        {service.cta} →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Reveal>
            <Plate
              slot="services-control"
              parallax={16}
              className="min-h-[240px] overflow-hidden rounded-md"
              imgClassName="h-full w-full object-cover"
            />
          </Reveal>
        </div>
      </div>

      <Thread
        color="verified"
        d={`M${X.s5Out} 0 C ${X.s5Out} 20, 40 30, 34 52 C 28 72, ${X.s6Out} 80, ${X.s6Out} 100`}
        className="hidden lg:block"
      />
    </section>
  );
}

/* ------------------------------------------------ 07 · the flow --- */

export function S7Flow() {
  return (
    <section className="relative bg-bone">
      <div className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_2.4fr]">
          <SectionIntro
            n="07"
            title={<>The part is already in the flow.</>}
            copy="Stocked, fabricated and moving before the truck rolls."
            aside={
              <>
                <ul className="mt-6 space-y-2.5">
                  {FLOW.bullets.map((line) => (
                    <li key={line} className="o-label flex items-center gap-2.5 text-[10px] text-ink-soft">
                      <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                      {line}
                    </li>
                  ))}
                </ul>
                <a href="#close" className="o-link mt-6 inline-block">
                  {FLOW.cta} →
                </a>
              </>
            }
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FLOW.stops.map((slot, i) => (
              <Reveal key={slot} delay={i * 120}>
                <Plate
                  slot={slot}
                  parallax={10}
                  className="h-40 overflow-hidden rounded-md sm:h-48"
                  imgClassName="h-full w-full object-cover"
                />
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* The logistics rail: the line runs flat through all four stops. */}
      <Thread
        color="verified"
        d={`M${X.s6Out} 0 C ${X.s6Out} 20, 30 34, 42 44 L 84 44 C 92 44, ${X.s7Out} 70, ${X.s7Out} 100`}
        nodes={[[46, 44, 0.42], [59, 44, 0.54], [72, 44, 0.66], [84, 44, 0.78]]}
        className="hidden lg:block"
      />
    </section>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path d="M3 8.5 L6.5 12 L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
