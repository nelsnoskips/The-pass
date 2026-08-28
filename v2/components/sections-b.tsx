"use client";

import { FLOW, RESPONSE, SERVICES, VERIFIED } from "@/lib/site";
import { useState } from "react";
import { LivePlate } from "./live";
import { SectionIntro } from "./sections-a";
import { Plate, Reveal, SignalLine } from "./ui";

/* -------------------------------------------- 04 · the response --- */

export function S4Response() {
  return (
    <section data-rail="04" className="relative bg-bone">
      <div className="py-10 pl-5 lg:pl-10">
        <div className="grid gap-8 pr-5 lg:grid-cols-[minmax(260px,340px)_1fr] lg:pr-0">
          <SectionIntro
            n="04"
            title={<>The thread becomes a response.</>}
            copy="The right people. The right action. Confirmed."
          />

          {/* The mock's frame: the three moments cut at a slant, the
              signal line running through all of them. */}
          <div className="relative">
            <div className="grid gap-2 sm:grid-cols-3 sm:px-4">
              {RESPONSE.map((step, i) => (
                <Reveal key={step.time} delay={i * 140}>
                  <article className="relative min-h-[300px] overflow-hidden sm:-skew-x-[8deg]">
                    <div className="absolute inset-y-0 -inset-x-14 sm:skew-x-[8deg]">
                      <Plate
                        slot={step.slot}
                        parallax={12}
                        className="absolute inset-0"
                        imgClassName="h-full w-full object-cover"
                      />
                      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[rgba(17,18,20,0.85)] via-[rgba(17,18,20,0.45)] to-transparent" />
                    </div>
                    <div className="relative p-4 sm:skew-x-[8deg] sm:px-8">
                      <span className="o-num text-[15px] text-bone">{step.time}</span>
                      <p className="o-label pt-1 text-[10px] text-bone">{step.who}</p>
                      <p className="pt-0.5 text-[12px] text-bone/75">{step.did}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
            <SignalLine className="inset-x-0 top-[48%] z-10 hidden mix-blend-screen sm:block" />
          </div>
        </div>
      </div>

    </section>
  );
}

/* --------------------------------------------- 05 · verified green --- */

export function S5Verified() {
  return (
    <section data-rail="05" className="relative bg-bone">
      <div className="py-10 pl-5 lg:pl-10">
        <div className="grid items-start gap-8 pr-5 lg:grid-cols-[minmax(260px,340px)_1fr] lg:pr-0">
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
            {/* One continuous band: the office flows into the leader on
                the right, a soft shadow seam instead of a hard cut. */}
            <div className="relative grid min-h-[380px] sm:grid-cols-[1.5fr_1fr]">
              <Plate
                slot="verified-office"
                parallax={24}
                className="overflow-hidden"
                imgClassName="h-full w-full object-cover object-[20%_center]"
              />
              <div className="relative hidden overflow-hidden sm:block">
                <Plate
                  slot="response-leader"
                  parallax={14}
                  className="absolute inset-0"
                  imgClassName="h-full w-full object-cover object-[60%_center]"
                />
                <div className="absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-black/30 to-transparent" />
              </div>
              <SignalLine color="green" className="inset-x-0 bottom-[15%] z-10 mix-blend-screen" />
            </div>
            <VerifiedCard />
          </Reveal>
        </div>
      </div>

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
      className={`absolute bottom-10 right-[31%] w-[210px] bg-white p-3.5 shadow-[0_18px_40px_rgba(23,24,26,0.25)] ${
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
    <section id="services" data-rail="06" className="relative bg-bone">
      <div className="py-10 pl-5 lg:pl-10">
        <div className="grid items-stretch gap-8 pr-5 lg:grid-cols-[minmax(260px,340px)_1.2fr_1fr] lg:pr-0">
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

          {/* The ops room holds the full height of the section. */}
          <Reveal className="h-full">
            <LivePlate
              slot="services-control"
              video="/images/monitoring-live.mp4"
              parallax={16}
              className="h-full min-h-[360px] overflow-hidden"
              imgClassName="h-full w-full object-cover"
            />
          </Reveal>
        </div>
      </div>

    </section>
  );
}

/* ------------------------------------------------ 07 · the flow --- */

export function S7Flow() {
  return (
    <section data-rail="07" className="relative bg-bone">
      <div className="py-10 pl-5 lg:pl-10">
        <div className="grid items-stretch gap-8 pr-5 lg:grid-cols-[minmax(260px,340px)_1fr] lg:pr-0">
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

          {/* The strip runs the full height of the text beside it, one
              flowing row. */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FLOW.stops.map((slot, i) => (
              <Reveal key={slot} delay={i * 120} className="h-full">
                <Plate
                  slot={slot}
                  parallax={10}
                  className="h-full min-h-[240px] overflow-hidden"
                  imgClassName="h-full w-full object-cover"
                />
              </Reveal>
            ))}
          </div>
        </div>
      </div>

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
