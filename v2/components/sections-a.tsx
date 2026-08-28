"use client";

import { useState } from "react";
import { HERO, INCIDENT, SPACES } from "@/lib/site";
import { asset } from "@/lib/images";
import { ParallaxY, Plate, Reveal, SignalLine, usePointerDepth } from "./ui";
import { LivePlate } from "./live";

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
        <LivePlate
          slot="hero-technician"
          video="/images/hero-live.mp4"
          parallax={26}
          className="absolute inset-y-0 right-0 hidden w-[58%] overflow-hidden lg:block"
          imgClassName="h-full w-full object-cover"
        />

        <div className="relative z-10 max-w-[560px] px-5 pb-16 pt-16 lg:px-10 lg:pt-24">
          <Reveal>
            <p className="o-label text-ink-mute">{HERO.eyebrow}</p>
            <h1 className="o-display mt-5 text-[clamp(44px,5.4vw,74px)]">
              <span className="o-mask">
                <span>{HERO.headA}</span>
              </span>
              <span className="o-mask o-mask-2 text-signal">
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
      <div className="grid items-stretch lg:grid-cols-[minmax(320px,1fr)_2.1fr]">
        <div className="flex items-center px-5 py-10 lg:px-10">
          <SectionIntro
            n="01"
            title={<>The signal enters the building.</>}
            copy="One condition can touch comfort, equipment and operations. Orravan sees the relationship."
          />
        </div>

        <div className="o-panel grid min-h-[420px] sm:grid-cols-[2fr_1fr]">
          <div className="relative min-h-[300px]">
            <SignalLine className="inset-x-0 top-[30%] z-10 mix-blend-screen" />
            <LivePlate
              slot="building-section"
              video="/images/building-live.mp4"
              parallax={20}
              className="absolute inset-0 overflow-hidden"
              imgClassName="h-full w-full object-cover"
            />
            <FloorLights />
          </div>
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
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(14,15,17,0.78)] via-transparent to-transparent" />
        <SignalLine className="inset-x-0 top-[56%] z-10 mix-blend-screen" />

        <div className="relative z-10 flex min-h-[460px] flex-col px-5 py-10 lg:px-10">
          <div className="max-w-[380px]">
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
          {/* The three layers, spaced down the band the way the mock
              floats them on the photograph. */}
          <ul className="mb-2 mt-auto space-y-7 pt-10">
            {["Air", "Water", "Control"].map((layer) => (
              <li key={layer} className="o-label text-[10px] tracking-[0.2em] text-bone/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
                {layer}
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
 * The briefing is one dark panel bleeding to the right edge: the board
 * on the left of it, the people reading it on the right, flush.
 */
export function S3Briefing() {
  return (
    <section data-rail="03" className="o-panel relative overflow-hidden">
      {/* The room behind the briefing, generated to the mock's backdrop:
          the ops floor out of focus, almost black. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset("/images/briefing-bg.jpg")}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        onError={(event) => {
          (event.target as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="absolute inset-0 bg-[rgba(12,13,15,0.6)]" />

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

        <Reveal className="grid min-h-[400px] items-stretch lg:grid-cols-[2fr_1fr]">
          {/* The briefing as the command center's wall display. */}
          <div className="my-8 flex flex-col justify-center border border-[#1d2a45] bg-gradient-to-b from-[#0a1120] to-[#0b0e15] shadow-[0_0_60px_rgba(43,107,255,0.16),0_30px_70px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-[#1d2a45] px-6 py-3.5">
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
            <div className="grid gap-x-0 gap-y-7 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-y-0 xl:divide-x xl:divide-[#1d2a45] xl:p-0 xl:py-6 [&>div]:xl:px-5">
              <Briefed label="What changed" order={1}>
                {INCIDENT.what}
                <span className="mt-1.5 block text-[11px] text-bone/45">{INCIDENT.since}</span>
              </Briefed>
              <Briefed label="Why it matters" order={2}>
                {INCIDENT.why[0]}
                <span className="mt-1.5 block text-bone/70">{INCIDENT.why[1]}</span>
              </Briefed>
              <Briefed label="Recommended response" order={3}>
                {INCIDENT.response}
                <span className="o-stamp-priority o-label mt-2 block text-[10px] text-warn">
                  Priority: {INCIDENT.priority}
                </span>
              </Briefed>
              <Briefed label="Assigned specialist" order={4}>
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
              <Briefed label="Status" order={5}>
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

          {/* The people reading it — framed on them, flush to the edge. */}
          <LivePlate
            slot="briefing-viewers"
            video="/images/briefing-live.mp4"
            parallax={14}
            className="hidden min-h-[400px] overflow-hidden lg:block"
            imgClassName="h-full w-full object-cover object-[72%_center]"
          />
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

/**
 * The cut-away's floors illuminate top to bottom as the section
 * arrives — the signal finding its floor.
 */
function FloorLights() {
  const [stage, setStage] = useState(0);
  return (
    <div
      aria-hidden
      ref={(node) => {
        if (!node) return;
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            [1, 2, 3].forEach((n) => setTimeout(() => setStage(n), 300 + n * 420));
          },
          { threshold: 0.5 },
        );
        observer.observe(node);
      }}
      className="pointer-events-none absolute inset-0"
    >
      <span className="o-floor" data-lit={stage >= 1} style={{ top: "6%", height: "27%" }} />
      <span className="o-floor" data-lit={stage >= 2} style={{ top: "38%", height: "27%" }} />
      <span className="o-floor" data-lit={stage >= 3} style={{ top: "70%", height: "26%" }} />
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
