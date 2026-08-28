"use client";

import { FLOW, RESPONSE, SERVICES, VERIFIED } from "@/lib/site";
import { useState } from "react";
import { LivePlate } from "./live";
import { asset } from "@/lib/images";
import { SectionIntro } from "./sections-a";
import { ThreadPoint } from "./thread";
import { Plate, Reveal } from "./ui";

/* -------------------------------------------- 04 · the response --- */

export function S4Response() {
  return (
    <section data-rail="04" className="relative overflow-x-clip bg-bone">
      <div className="py-10 pl-5 lg:pl-10">
        <div className="grid gap-8 pr-5 lg:grid-cols-[minmax(260px,340px)_1fr] lg:pr-0">
          <SectionIntro
            n="04"
            title={<>The thread becomes a response.</>}
            copy="The right people. The right action. Confirmed."
          />

          {/* The mock's frame: the three moments cut at a gentle slant,
              the thread travelling beneath them with a node per panel. */}
          <div className="relative">
            {/* The descent from 03 lands in the bone corner before the
                under-card run begins. */}
            <ThreadPoint x={0.004} y={1.06} />
            <div className="grid gap-2 min-[900px]:grid-cols-3 min-[900px]:px-8">
              {RESPONSE.map((step, i) => (
                <Reveal key={step.time} delay={i * 300}>
                  <article className="relative min-h-[320px] overflow-hidden min-[900px]:h-[23vw] min-[900px]:-skew-x-[5deg]">
                    <div className="absolute inset-y-0 -inset-x-10 min-[900px]:skew-x-[5deg]">
                      {/* Top-anchored so heads are never clipped at any
                          viewport width. */}
                      <Plate
                        slot={step.slot}
                        className="absolute inset-0"
                        imgClassName="h-full w-full object-cover object-top"
                      />
                      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[rgba(17,18,20,0.85)] via-[rgba(17,18,20,0.45)] to-transparent" />
                    </div>
                    <div className="relative p-4 min-[900px]:skew-x-[5deg] min-[900px]:px-7">
                      <span className="o-num text-[15px] text-bone">{step.time}</span>
                      <p className="o-label pt-1 text-[10px] text-bone">{step.who}</p>
                      <p className="pt-0.5 text-[12px] text-bone/75">{step.did}</p>
                    </div>
                    {/* The thread runs underneath the card. */}
                    <ThreadPoint x={0.5} y={1.06} node />
                  </article>
                </Reveal>
              ))}
            </div>
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
                {VERIFIED.chips.map((chip, i) => (
                  <li key={chip} className="text-center">
                    <Reveal delay={700 + i * 250}>
                      <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-ink/25 text-verified">
                        <Check className="h-4 w-4" />
                      </span>
                      <span className="o-label mt-2 block text-[8.5px] leading-tight text-ink-mute">
                        {chip}
                      </span>
                    </Reveal>
                  </li>
                ))}
              </ul>
            }
          />

          {/* The approved lobby, once, continuous: seated client left,
              open lobby center, specialist far right. The verification
              point lives in the opening — the thread turns green here. */}
          {/* The photograph as supplied, uncropped at every width: the
              seated client left, the specialist right, nobody cut. */}
          <Reveal className="relative">
            <div className="relative overflow-hidden">
              <Plate
                slot="verified-band"
                className="w-full"
                imgClassName="h-auto w-full"
              />
              <ThreadPoint x={0.52} y={0.56} node green />
              <VerifiedCard />
            </div>
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
      className={`absolute bottom-[24%] right-[15%] w-[215px] rounded-[2px] bg-white p-3.5 shadow-[0_18px_40px_rgba(23,24,26,0.25)] ${
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
        <div className="relative grid items-stretch gap-8 pr-5 lg:grid-cols-[minmax(260px,340px)_1.35fr_1fr] lg:pr-0">
          {/* A short continuation down the seam between the accordion
              and the ops room. */}
          <ThreadPoint x={0.69} y={0.5} node />
          <SectionIntro
            n="06"
            title={<>One thread. Every Orravan service.</>}
            copy="Whichever system needs attention, it is the same intelligence, the same people, the same record."
          />

          {/* Fixed floor so an opening item never moves the section. */}
          <div className="min-h-[420px] divide-y divide-rule self-start border-y border-rule">
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
                    className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-300"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr", opacity: isOpen ? 1 : 0 }}
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
            <div className="relative h-full min-h-[420px] overflow-hidden">
              <LivePlate
                slot="services-control"
                video="/images/monitoring-live.mp4"
                parallax={16}
                className="absolute inset-0"
                imgClassName="h-full w-full object-cover"
              />
            </div>
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

          {/* Four tiles, one row, identical aspect; the thread passes
              beneath with a node per tile. The Orravan mark rides the
              van as an overlay — never baked into the photograph. */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.stops.map((slot, i) => (
              <Reveal key={slot} delay={i * 120}>
                <div className="relative aspect-[4/5] w-full overflow-hidden">
                  <Plate
                    slot={slot}
                    parallax={10}
                    className="absolute inset-0"
                    imgClassName={`h-full w-full object-cover ${
                      slot === "flow-van" ? "object-[15%_50%]" : ""
                    }`}
                  />
                  {slot === "flow-van" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset("/images/15-official-orravan-logo.png")}
                      alt=""
                      aria-hidden
                      className="absolute right-[8%] top-[42%] w-[36%] opacity-85 mix-blend-multiply"
                    />
                  )}
                  {/* Beneath the tile; the chain runs right-to-left so
                      the thread arrives from the ops room cleanly. */}
                  <ThreadPoint x={0.5} y={1.05 + (3 - i) * 0.006} node />
                </div>
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
