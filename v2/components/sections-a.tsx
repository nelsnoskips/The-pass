"use client";

import { HERO, INCIDENT, SPACES } from "@/lib/site";
import { ParallaxY, Plate, Reveal, usePointerDepth } from "./ui";
import { LivePlate } from "./live";
import { ThreadPoint } from "./thread";

/* ------------------------------------------------------------ hero --- */

/**
 * The photograph is the hero: full bleed to the top and right edges,
 * the technician's hand on the open panel, and the signal starting at
 * his fingertips before cascading down into section 01.
 */
export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-bone">
      {/* One viewport after the header: copy 42, photograph 58. */}
      <div className="relative grid lg:min-h-[calc(100vh-100px)] lg:grid-cols-[42%_58%]">
        <div className="relative z-10 flex flex-col justify-center px-5 py-14 lg:px-10">
          <Reveal>
            <p className="o-label text-ink-mute">{HERO.eyebrow}</p>
            <h1 className="o-display o-hero-title mt-5">
              <span className="o-mask o-hero-line">
                <span>{HERO.headA}</span>
              </span>
              <span className="o-mask o-mask-2 o-hero-line text-signal">
                <span>{HERO.headB}</span>
              </span>
            </h1>
            <p className="mt-6 max-w-[34ch] text-[15px] leading-relaxed text-ink-soft">
              {HERO.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#s1" className="o-btn">{HERO.primary}</a>
              <a href="#close" className="o-btn o-btn-ghost">{HERO.secondary} <span className="o-arrow">→</span></a>
            </div>
          </Reveal>
        </div>

        <div className="relative hidden min-h-[520px] overflow-hidden lg:block">
          <LivePlate
            slot="hero-technician"
            video="/images/hero-live.mp4"
            parallax={9}
            className="absolute inset-0"
            imgClassName="h-full w-full object-cover"
          />
          {/* The thread begins at the technician's hands on the panel. */}
          <ThreadPoint x={0.44} y={0.74} node />
        </div>

        {/* Phones get the photo below the words instead of beside. */}
        <Plate
          slot="hero-technician"
          className="h-[320px] w-full overflow-hidden lg:hidden"
          imgClassName="h-full w-full object-cover"
        />
      </div>

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
    <section id="s1" data-rail="01" className="relative bg-bone">
      {/* Copy 28 / building 52 / legend 20 — the whole sectional model,
          never cropped, the legend outside the artwork. */}
      <div className="grid items-stretch lg:grid-cols-[28%_1fr]">
        <div className="flex items-center px-5 py-10 lg:px-10">
          <SectionIntro
            n="01"
            title={<>The signal enters the building.</>}
            copy="One condition can touch comfort, equipment and operations. Orravan sees the relationship."
          />
        </div>

        <div className="grid min-h-[460px] sm:grid-cols-[1.7fr_1fr]">
          {/* The model whole, on the page's own ivory — its white
              surround bleeds straight into the background, the charcoal
              slab flush against it. */}
          <div className="relative flex min-h-[320px] items-center justify-center bg-bone py-6">
            <div className="relative h-[450px] w-full">
              <LivePlate
                slot="building-section"
                video="/images/building-live.mp4"
                className="absolute inset-0"
                imgClassName="h-full w-full object-contain"
              />
              <ThreadPoint x={0.5} y={0.1} node />
              <ThreadPoint x={0.5} y={0.94} />
            </div>
          </div>
          <ul className="o-panel flex flex-col justify-center gap-7 px-8 py-10 lg:px-12">
            {SPACES.map((space, i) => (
              <li key={space.label}>
                <Reveal delay={i * 180}>
                  <span className="flex items-center gap-3.5">
                    <SpaceIcon kind={space.icon} lit={i === 3} />
                    <span>
                      <span className="o-label block text-[10px] text-bone">{space.label}</span>
                      <span className="text-xs text-bone/60">{space.detail}</span>
                    </span>
                  </span>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>

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
  const depth = usePointerDepth<HTMLDivElement>(7);
  return (
    <section data-rail="02" className="o-panel relative">
      <div ref={depth} className="relative min-h-[460px] overflow-hidden">
        {/* The mock's wide shot, whole: the duct and its falling air on
            the left, the plant in the middle, the racks on the right. */}
        <div data-depth className="absolute -inset-1 will-change-transform">
          <LivePlate
            slot="equipment-wide"
            video="/images/equipment-wide-live.mp4"
            className="absolute inset-0"
            imgClassName="h-full w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(14,15,17,0.55)] via-transparent to-transparent" />
        {/* The thread crosses through the machinery, clear of the copy
            panel and the technicians on the right, then leaves at the
            bottom-left so the drop into 03 stays in the dark seam. */}
        <ThreadPoint x={0.5} y={0.55} node />
        <ThreadPoint x={0.262} y={0.94} />

        <div className="relative z-10 flex min-h-[460px] flex-col px-5 py-10 lg:px-10">
          {/* The copy holds a controlled dark panel of its own. */}
          <div className="max-w-[400px] bg-[rgba(10,11,13,0.55)] p-6 backdrop-blur-[2px]">
            <p className="o-num text-[40px] text-bone/40">02</p>
            <h2 className="o-display mt-1 text-[clamp(28px,2.6vw,40px)] text-bone">
              Down to
              <br />
              the equipment.
            </h2>
            <p className="mt-4 max-w-[28ch] text-[13px] leading-relaxed text-bone/70">
              Mechanical systems, automation and the people who service
              them—working from the same information.
            </p>
          </div>
          {/* Air, water, control reveal one at a time as the thread
              passes through each system. */}
          <ul className="mb-2 mt-auto space-y-7 pt-10">
            {["Air", "Water", "Control"].map((layer, i) => (
              <li key={layer}>
                <Reveal delay={260 * i}>
                  <span className="o-label text-[10px] tracking-[0.2em] text-bone/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
                    {layer}
                  </span>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </section>
  );
}

/* ----------------------------------------------- 03 · the briefing --- */

/**
 * The approved section-03 background is the whole band: dark negative
 * space left and center, the facility leader and specialist anchored
 * far right, faces whole. The briefing interface is sharp HTML over
 * the dark space — nothing baked in, no second photograph.
 */
export function S3Briefing() {
  return (
    <section data-rail="03" className="o-panel relative overflow-hidden">
      <Plate
        slot="briefing-band"
        className="absolute inset-0"
        imgClassName="h-full w-full object-cover object-[75%_0%]"
      />
      {/* Legibility scrim over the empty left only. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(10,11,13,0.55)] via-[rgba(10,11,13,0.2)] to-transparent" />
      {/* Down the dark seam between the intro and the board. */}
      <ThreadPoint x={0.262} y={0.9} node />

      <div className="relative grid items-stretch lg:grid-cols-[minmax(300px,1fr)_2.6fr]">
        <div className="flex items-center px-5 py-10 lg:px-10">
          <SectionIntro
            dark
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

        {/* Wide and low over the dark space; the readers keep the far
            right of the frame to themselves. */}
        <Reveal className="flex min-h-[460px] items-center py-10 pr-5 lg:pr-0">
          <div className="flex w-full flex-col justify-center rounded-[2px] border border-white/[0.12] bg-[rgba(8,10,14,0.72)] shadow-[0_30px_70px_rgba(0,0,0,0.5)] backdrop-blur-[2px] lg:w-[74%]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-3.5">
              <p className="o-label text-[10px] text-bone/70">
                Intelligent service briefing
              </p>
              <p className="o-label flex items-center gap-2 text-[9px] text-signal">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-signal/60" />
                  <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                </span>
                Live
              </p>
            </div>
            <div className="grid gap-x-0 gap-y-7 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-y-0 xl:divide-x xl:divide-white/[0.08] xl:p-0 xl:py-6 [&>div]:xl:px-5">
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
                <span className="o-stamp-priority o-label mt-2 block text-[10px] text-warn">
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
                <span className="flex items-center gap-3">
                  {/* The mock's progress donut, slowly turning. */}
                  <svg viewBox="0 0 28 28" className="o-donut h-8 w-8" aria-hidden>
                    <circle cx="14" cy="14" r="11" fill="none" stroke="#1d2a45" strokeWidth="4" />
                    <circle
                      cx="14"
                      cy="14"
                      r="11"
                      fill="none"
                      stroke="var(--signal)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="46 24"
                    />
                  </svg>
                  <span className="o-label text-[10px] text-verified">{INCIDENT.status}</span>
                </span>
              </Briefed>
            </div>
          </div>
        </Reveal>
      </div>

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
      <ParallaxY by={18}>
        <p className={`o-num text-[44px] ${dark ? "text-bone/30" : "text-ink/25"}`}>{n}</p>
      </ParallaxY>
      <h2 className={`o-display mt-1 text-[clamp(26px,2.6vw,38px)] ${dark ? "text-bone" : ""}`}>
        <span className="o-mask">
          <span>{title}</span>
        </span>
      </h2>
      <p className={`mt-4 text-[14px] leading-relaxed ${dark ? "text-bone/65" : "text-ink-soft"}`}>
        {copy}
      </p>
      {aside}
    </Reveal>
  );
}

function Briefed({ label, children, order }: { label: string; children: React.ReactNode; order?: number }) {
  return (
    <div className={order ? `o-brief-item o-brief-${order}` : undefined}>
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
