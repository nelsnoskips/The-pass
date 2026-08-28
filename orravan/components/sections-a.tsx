"use client";

import { HERO, INCIDENT, SPACES } from "@/lib/site";
import { Thread } from "./thread";
import { Plate, Reveal } from "./ui";

/* The thread's hand-off points between sections, in % of width. Each
   section enters where the one above exited, so ten segments read as
   one continuous line down the page. */
export const X = {
  heroOut: 58,
  s1Out: 46,
  s2Out: 60,
  s3Out: 64,
  s4Out: 30,
  s5Out: 72,
  s6Out: 22,
  s7Out: 88,
  s8Out: 50,
  s9Out: 42,
} as const;

/* ------------------------------------------------------------ hero --- */

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-bone">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 pb-16 pt-14 lg:grid-cols-[1fr_1.05fr] lg:px-8 lg:pb-20">
        <div className="relative z-10 max-w-[520px] pt-6">
          <Reveal>
            <p className="o-label text-ink-mute">{HERO.eyebrow}</p>
            <h1 className="o-display mt-5 text-[clamp(44px,5.6vw,76px)]">
              {HERO.headA}
              <br />
              <span className="text-signal">{HERO.headB}</span>
            </h1>
            <p className="mt-6 max-w-[36ch] text-[15px] leading-relaxed text-ink-soft">
              {HERO.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#s1" className="o-btn">{HERO.primary}</a>
              <a href="#close" className="o-btn o-btn-ghost">{HERO.secondary} →</a>
            </div>
          </Reveal>
        </div>

        <div className="relative min-h-[380px] lg:min-h-[520px]">
          <Plate
            slot="hero-technician"
            className="absolute inset-0 overflow-hidden rounded-md"
            imgClassName="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* The signal leaves the panel the technician has open and heads
          for the building: the story starts here. */}
      <Thread
        d={`M62 34 C 58 48, 66 58, 60 70 C 55 80, ${X.heroOut} 90, ${X.heroOut} 100`}
        nodes={[[62, 34, 0.12]]}
        className="hidden lg:block"
      />
    </section>
  );
}

/* --------------------------------------------- 01 · into the building --- */

export function S1Building() {
  return (
    <section id="s1" className="relative bg-bone">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_1.5fr] lg:px-8">
        <SectionIntro
          n="01"
          title={<>The signal enters the building.</>}
          copy="One condition can touch comfort, equipment and operations. Orravan sees the relationship."
        />

        <Reveal className="relative">
          <div className="o-panel relative grid gap-0 overflow-hidden rounded-md lg:grid-cols-[1.6fr_1fr]">
            <Plate
              slot="building-section"
              className="min-h-[300px]"
              imgClassName="h-full w-full object-cover opacity-90"
            />
            <ul className="flex flex-col justify-center gap-5 p-6">
              {SPACES.map((space, i) => (
                <li key={space.label} className="flex items-center gap-3.5">
                  <SpaceIcon kind={space.icon} lit={i === 3} />
                  <span>
                    <span className="o-label block text-[10px] text-bone">{space.label}</span>
                    <span className="text-xs text-bone/60">{space.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      <Thread
        d={`M${X.heroOut} 0 C ${X.heroOut} 18, 48 26, 52 44 C 56 64, 42 74, ${X.s1Out} 100`}
        nodes={[[52, 44, 0.5]]}
        className="hidden lg:block"
      />
    </section>
  );
}

/* --------------------------------------------- 02 · to the equipment --- */

export function S2Equipment() {
  return (
    <section className="o-panel relative">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_1.6fr] lg:px-8">
        <SectionIntro
          n="02"
          dark
          title={<>Down to the equipment.</>}
          copy="Mechanical systems, automation and the people who service them—working from the same information."
          aside={
            <ul className="mt-8 space-y-2">
              {["Air", "Water", "Control"].map((layer) => (
                <li key={layer} className="o-label border-l-2 border-signal/60 pl-3 text-[10px] text-bone/70">
                  {layer}
                </li>
              ))}
            </ul>
          }
        />

        <Reveal className="grid gap-3 sm:grid-cols-[1.7fr_1fr]">
          <Plate
            slot="equipment-plant"
            className="min-h-[280px] overflow-hidden rounded-md"
            imgClassName="h-full w-full object-cover"
          />
          <Plate
            slot="equipment-racks"
            className="min-h-[280px] overflow-hidden rounded-md"
            imgClassName="h-full w-full object-cover"
          />
        </Reveal>
      </div>

      <Thread
        d={`M${X.s1Out} 0 C ${X.s1Out} 16, 58 30, 55 50 C 52 70, ${X.s2Out} 82, ${X.s2Out} 100`}
        nodes={[[55, 50, 0.5]]}
        className="hidden lg:block"
      />
    </section>
  );
}

/* ----------------------------------------------- 03 · the briefing --- */

export function S3Briefing() {
  return (
    <section className="relative bg-bone">
      <div className="mx-auto max-w-[1280px] px-5 py-16 lg:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_2fr]">
          <SectionIntro
            n="03"
            title={<>Thousands of signals. One clear next move.</>}
            copy="Complex signals become clear language and a plan built for your building."
            aside={
              <a href="#services" className="o-btn mt-8">
                Explore building intelligence
              </a>
            }
          />

          <div className="relative">
            <Reveal>
              <div className="o-panel overflow-hidden rounded-md">
                <p className="o-label border-b border-rule-dark px-6 py-3.5 text-[10px] text-bone/70">
                  Intelligent service briefing
                </p>
                <div className="grid gap-6 p-6 sm:grid-cols-2 xl:grid-cols-5">
                  <Briefed label="What changed">
                    {INCIDENT.what}
                    <span className="mt-1.5 block text-[11px] text-bone/45">{INCIDENT.since}</span>
                  </Briefed>
                  <Briefed label="Why it matters">
                    {INCIDENT.why[0]}
                    <span className="mt-1.5 block text-bone/70">{INCIDENT.why[1]}</span>
                  </Briefed>
                  <Briefed label="Recommended response">
                    {INCIDENT.response}
                    <span className="o-label mt-2 block text-[10px] text-warn">
                      Priority: {INCIDENT.priority}
                    </span>
                  </Briefed>
                  <Briefed label="Assigned specialist">
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal/25 text-[12px] font-bold text-bone">
                        MS
                      </span>
                      <span>
                        {INCIDENT.specialist.name}
                        <span className="mt-0.5 block text-[11px] text-bone/50">
                          {INCIDENT.specialist.role}
                        </span>
                      </span>
                    </span>
                  </Briefed>
                  <Briefed label="Status">
                    <span className="o-label inline-flex items-center gap-2 text-[10px] text-verified">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute h-full w-full animate-ping rounded-full bg-verified/60" />
                        <span className="h-2 w-2 rounded-full bg-verified" />
                      </span>
                      {INCIDENT.status}
                    </span>
                  </Briefed>
                </div>
              </div>
            </Reveal>

            <Reveal delay={140} className="mt-3 flex justify-end">
              <Plate
                slot="briefing-viewers"
                className="h-40 w-full max-w-[380px] overflow-hidden rounded-md"
                imgClassName="h-full w-full object-cover"
              />
            </Reveal>
          </div>
        </div>
      </div>

      <Thread
        d={`M${X.s2Out} 0 C ${X.s2Out} 14, 70 30, 68 52 C 66 74, ${X.s3Out} 84, ${X.s3Out} 100`}
        nodes={[[68, 52, 0.5]]}
        className="hidden lg:block"
      />
    </section>
  );
}

/* ------------------------------------------------------- primitives --- */

export function SectionIntro({
  n,
  title,
  copy,
  dark = false,
  aside,
}: {
  n: string;
  title: React.ReactNode;
  copy: string;
  dark?: boolean;
  aside?: React.ReactNode;
}) {
  return (
    <Reveal className="max-w-[420px]">
      <p className={`o-num text-[44px] ${dark ? "text-bone/30" : "text-ink/25"}`}>{n}</p>
      <h2 className={`o-display mt-2 text-[clamp(26px,2.6vw,38px)] ${dark ? "text-bone" : ""}`}>
        {title}
      </h2>
      <p className={`mt-4 text-[14px] leading-relaxed ${dark ? "text-bone/65" : "text-ink-soft"}`}>
        {copy}
      </p>
      {aside}
    </Reveal>
  );
}

function Briefed({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="o-label mb-2 text-[9px] text-bone/45">{label}</p>
      <div className="text-[13px] leading-snug text-bone/90">{children}</div>
    </div>
  );
}

function SpaceIcon({ kind, lit }: { kind: string; lit?: boolean }) {
  const paths: Record<string, string> = {
    space: "M4 20 L4 9 L12 4 L20 9 L20 20 M9 20 L9 13 L15 13 L15 20",
    controls: "M5 6 h14 M5 12 h14 M5 18 h14 M9 4 v4 M15 10 v4 M7 16 v4",
    mechanical: "M12 7 a5 5 0 1 1 -0.01 0 M12 2 v3 M12 19 v3 M2 12 h3 M19 12 h3",
    monitored: "M3 12 C 7 5, 17 5, 21 12 C 17 19, 7 19, 3 12 M12 12 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0",
  };
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
        lit ? "border-signal text-signal" : "border-bone/30 text-bone/75"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
        <path d={paths[kind]} />
      </svg>
    </span>
  );
}
