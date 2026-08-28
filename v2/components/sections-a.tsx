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

/**
 * The photograph is the hero: full bleed to the top and right edges,
 * the technician's hand on the open panel, and the signal starting at
 * his fingertips before cascading down into section 01.
 */
export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-bone">
      <div className="relative mx-auto min-h-[560px] max-w-[1440px] lg:min-h-[640px]">
        {/* The panel, edge to edge. */}
        <Plate
          slot="hero-technician"
          parallax={26}
          className="absolute inset-y-0 right-0 hidden w-[58%] overflow-hidden lg:block"
          imgClassName="h-full w-full object-cover"
        />

        <div className="relative z-10 max-w-[520px] px-5 pb-16 pt-16 lg:px-10 lg:pt-24">
          <Reveal>
            <p className="o-label text-ink-mute">{HERO.eyebrow}</p>
            <h1 className="o-display mt-5 text-[clamp(44px,5.4vw,74px)]">
              {HERO.headA}
              <br />
              <span className="text-signal">{HERO.headB}</span>
            </h1>
            <p className="mt-6 max-w-[34ch] text-[15px] leading-relaxed text-ink-soft">
              {HERO.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#s1" className="o-btn">{HERO.primary}</a>
              <a href="#close" className="o-btn o-btn-ghost">{HERO.secondary} →</a>
            </div>
          </Reveal>
        </div>

        {/* Phones get the photo below the words instead of beside. */}
        <Plate
          slot="hero-technician"
          className="h-[320px] w-full overflow-hidden lg:hidden"
          imgClassName="h-full w-full object-cover"
        />
      </div>

      {/* The signal starts at the technician's hand in the wiring and
          cascades down through the photograph into the building. */}
      <Thread
        d={`M71 34 C 74 44, 66 52, 67 62 C 68 72, 58 82, ${X.heroOut} 100`}
        nodes={[[71, 34, 0.14], [67, 62, 0.55]]}
        className="hidden lg:block"
      />
    </section>
  );
}

/* --------------------------------------------- 01 · into the building --- */

/**
 * The building band: the cut-away photograph and the four-system rail
 * share one dark panel that bleeds to the right edge, the thread
 * routing down through the floors.
 */
export function S1Building() {
  return (
    <section id="s1" className="relative bg-bone">
      <div className="grid items-stretch lg:grid-cols-[minmax(320px,1fr)_2.1fr]">
        <div className="flex items-center px-5 py-14 lg:px-10">
          <SectionIntro
            n="01"
            title={<>The signal enters the building.</>}
            copy="One condition can touch comfort, equipment and operations. Orravan sees the relationship."
          />
        </div>

        <div className="o-panel grid min-h-[420px] sm:grid-cols-[2fr_1fr]">
          <Plate
            slot="building-section"
            parallax={20}
            className="min-h-[300px] overflow-hidden"
            imgClassName="h-full w-full object-cover"
          />
          <ul className="flex flex-col justify-center gap-6 border-l border-rule-dark px-6 py-8">
            {SPACES.map((space, i) => (
              <Reveal key={space.label} delay={i * 110}>
                <li className="flex items-center gap-3.5">
                  <SpaceIcon kind={space.icon} lit={i === 3} />
                  <span>
                    <span className="o-label block text-[10px] text-bone">{space.label}</span>
                    <span className="text-xs text-bone/60">{space.detail}</span>
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>

      {/* Down through the floors of the cut-away. */}
      <Thread
        d={`M${X.heroOut} 0 C ${X.heroOut} 14, 50 24, 54 42 C 58 62, 44 76, ${X.s1Out} 100`}
        nodes={[[54, 42, 0.45], [48, 72, 0.7]]}
        className="hidden lg:block"
      />
    </section>
  );
}

/* --------------------------------------------- 02 · to the equipment --- */

/**
 * One dark band, edge to edge: the three layers the client shot — air,
 * water, control — as flush panels, the heading overlaid on the first
 * behind a scrim, the thread weaving through the machinery.
 */
export function S2Equipment() {
  return (
    <section className="o-panel relative">
      <div className="grid min-h-[440px] md:grid-cols-3">
        <div className="relative overflow-hidden">
          <Plate
            slot="equipment-air"
            parallax={22}
            className="absolute inset-0"
            imgClassName="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[rgba(17,18,20,0.88)] via-[rgba(17,18,20,0.45)] to-transparent" />
          <div className="relative flex h-full min-h-[320px] flex-col justify-center p-6 lg:p-10">
            <p className="o-num text-[40px] text-bone/40">02</p>
            <h2 className="o-display mt-1 text-[clamp(26px,2.4vw,36px)] text-bone">
              Down to
              <br />
              the equipment.
            </h2>
            <p className="mt-4 max-w-[26ch] text-[13px] leading-relaxed text-bone/70">
              Mechanical systems, automation and the people who service
              them—working from the same information.
            </p>
            <ul className="mt-7 space-y-2">
              {["Air", "Water", "Control"].map((layer) => (
                <li key={layer} className="o-label border-l-2 border-signal pl-3 text-[10px] text-bone/85">
                  {layer}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Plate
          slot="equipment-plant"
          parallax={18}
          className="min-h-[260px] overflow-hidden"
          imgClassName="h-full w-full object-cover"
        />
        <Plate
          slot="equipment-racks"
          parallax={14}
          className="min-h-[260px] overflow-hidden"
          imgClassName="h-full w-full object-cover"
        />
      </div>

      {/* Threading the pipes: across all three layers. */}
      <Thread
        d={`M${X.s1Out} 0 C ${X.s1Out} 14, 40 22, 48 36 C 58 52, 70 40, 78 52 C 84 61, 70 74, ${X.s2Out} 100`}
        nodes={[[48, 36, 0.4], [78, 52, 0.62]]}
        className="hidden lg:block"
      />
    </section>
  );
}

/* ----------------------------------------------- 03 · the briefing --- */

/**
 * The briefing is one dark panel bleeding to the right edge: the board
 * on the left of it, the people reading it on the right, flush.
 */
export function S3Briefing() {
  return (
    <section className="relative bg-bone">
      <div className="grid items-stretch lg:grid-cols-[minmax(320px,1fr)_2.4fr]">
        <div className="flex items-center px-5 py-14 lg:px-10">
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
        </div>

        <div className="o-panel grid min-h-[400px] xl:grid-cols-[1.7fr_1fr]">
          <div className="flex flex-col justify-center">
            <p className="o-label border-b border-rule-dark px-6 py-3.5 text-[10px] text-bone/70">
              Intelligent service briefing
            </p>
            <div className="grid gap-x-6 gap-y-7 p-6 sm:grid-cols-2 lg:grid-cols-3">
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

          <Plate
            slot="briefing-viewers"
            parallax={14}
            className="hidden min-h-[400px] overflow-hidden border-l border-rule-dark xl:block"
            imgClassName="h-full w-full object-cover"
          />
        </div>
      </div>

      <Thread
        d={`M${X.s2Out} 0 C ${X.s2Out} 14, 72 28, 70 50 C 68 72, ${X.s3Out} 84, ${X.s3Out} 100`}
        nodes={[[70, 50, 0.5]]}
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
