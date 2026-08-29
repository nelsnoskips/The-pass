"use client";

import { DECISION, RESOLUTION, SIGNAL, VIEW } from "@/lib/site";
import { Plate, Reveal } from "./ui";

/* -------------------------------------------------------- the frame --- */

/** Every section opens the same way: the heading on the left rail, the
    work to the right of it, bleeding to the page edge. */
export function Band({
  id,
  dark = false,
  children,
  className,
}: {
  id?: string;
  dark?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`relative overflow-x-clip ${dark ? "bg-[#111214] text-bone" : "bg-paper text-ink"} ${className ?? ""}`}
    >
      <div className="grid gap-8 py-14 pl-5 pr-5 lg:grid-cols-[minmax(240px,320px)_1fr] lg:gap-10 lg:pl-10 lg:pr-0">
        {children}
      </div>
    </section>
  );
}

export function Head({
  lines,
  copy,
  aside,
  dark = false,
}: {
  lines: readonly string[];
  copy?: string;
  aside?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <Reveal className="lg:pt-2">
      <h2 className="o-display text-[clamp(3rem,5.5vw,6rem)] leading-[0.88] tracking-[0.004em]">
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h2>
      {copy && (
        <p
          className={`mt-5 max-w-[34ch] text-[14px] leading-relaxed ${
            dark ? "text-bone/65" : "text-ink-soft"
          }`}
        >
          {copy}
        </p>
      )}
      {aside}
    </Reveal>
  );
}

/* --------------------------------------------- one view, every system --- */

export function OneView() {
  return (
    <Band id="systems">
      <Head lines={VIEW.head} />

      <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(280px,400px)_1fr]">
        <ul className="relative z-10 grid gap-3">
          {VIEW.layers.map((layer) => (
            <li key={layer.label}>
              <Reveal>
                <span className="flex items-center justify-between gap-5 border border-rule bg-bone px-5 py-4">
                  <span>
                    <span className="o-label block text-[10px] text-ink">{layer.label}</span>
                    <span className="mt-1 block text-[12px] text-ink-mute">{layer.detail}</span>
                  </span>
                  <span className="o-num flex h-8 w-8 shrink-0 items-center justify-center bg-[var(--orravan-blue)] text-[12px] font-semibold text-white">
                    {layer.n}
                  </span>
                </span>
              </Reveal>
            </li>
          ))}
        </ul>

        {/* The building sits over the rail's right edge, as in the mock. */}
        <Reveal className="lg:-ml-16">
          <Plate
            slot="view-building"
            parallax={14}
            className="aspect-[16/9] overflow-hidden"
            imgClassName="h-full w-full object-cover object-top"
          />
        </Reveal>
      </div>
    </Band>
  );
}

/* ------------------------------------ less dashboard, more direction --- */

export function LessDashboard() {
  return (
    <Band id="how">
      <Head
        lines={SIGNAL.head}
        copy={SIGNAL.copy}
        aside={
          <a href="#record" className="o-btn mt-7 inline-flex bg-[var(--orravan-blue)]">
            {SIGNAL.cta}
          </a>
        }
      />

      <Reveal className="relative">
        <div className="grid items-stretch lg:grid-cols-[1fr_minmax(240px,26%)]">
          <SignalConsole />
          {/* The people the signal is for. */}
          <Plate
            slot="signal-people"
            parallax={10}
            className="hidden h-full min-h-[300px] overflow-hidden lg:block"
            imgClassName="h-full w-full object-cover object-[86%_26%]"
          />
        </div>
      </Reveal>
    </Band>
  );
}

/** The product, rendered as sharp interface rather than a screenshot:
    the plan on the left, the signal explained in plain language on the
    right — the argument the section is making, legible at any size. */
function SignalConsole() {
  return (
    <div className="grid min-h-[max(340px,26vw)] border border-rule bg-white shadow-[0_30px_70px_rgba(23,24,26,0.14)] sm:grid-cols-[132px_1fr] lg:grid-cols-[132px_1fr_minmax(210px,32%)]">
      {/* Sidebar */}
      <div className="hidden flex-col gap-1 border-r border-rule bg-[#f8f8f6] p-3 sm:flex">
        <p className="o-script mb-3 px-2 text-[15px] text-ink">
          <span className="text-[var(--orravan-blue)]">O</span>rravan
          <span className="text-[9px] text-ink-mute">.ai</span>
        </p>
        {SIGNAL.nav.map((item, i) => (
          <span
            key={item}
            className={`rounded-[2px] px-2 py-1.5 text-[11px] ${
              i === 1 ? "bg-rule/50 font-medium text-ink" : "text-ink-mute"
            }`}
          >
            {item}
          </span>
        ))}
      </div>

      {/* The plan, with the zone in question flagged. */}
      <div className="relative min-h-[220px] p-4">
        <svg viewBox="0 0 320 220" className="h-full w-full" aria-label="Floor plan, zone 4B flagged">
          <rect x="10" y="10" width="300" height="200" fill="none" stroke="#dcd8cd" strokeWidth="1.5" />
          {[70, 130, 190, 250].map((x) => (
            <line key={x} x1={x} y1="10" x2={x} y2="210" stroke="#e6e2d8" strokeWidth="1" />
          ))}
          {[70, 130, 170].map((y) => (
            <line key={y} x1="10" y1={y} x2="310" y2={y} stroke="#e6e2d8" strokeWidth="1" />
          ))}
          <rect x="132" y="72" width="56" height="56" fill="rgba(214,64,64,0.22)" stroke="#d64040" strokeWidth="1.5" />
          <text x="160" y="104" textAnchor="middle" fontSize="9" fill="#b23434" letterSpacing="1">
            4B
          </text>
        </svg>
      </div>

      {/* The signal, in plain language. */}
      <div className="border-t border-rule p-4 lg:border-l lg:border-t-0">
        <p className="o-label text-[9px] text-ink-mute">{SIGNAL.eyebrow}</p>
        <p className="mt-2 text-[15px] font-semibold leading-snug text-ink">{SIGNAL.title}</p>
        <span className="mt-2 inline-flex items-center gap-1.5 bg-[rgba(214,64,64,0.1)] px-2 py-1 text-[10px] font-semibold text-[#b23434]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d64040]" />
          {SIGNAL.priority}
        </span>

        <p className="o-label mt-4 text-[9px] text-ink-mute">Meaning</p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{SIGNAL.meaning}</p>

        <p className="o-label mt-3 text-[9px] text-ink-mute">Recommended action</p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{SIGNAL.action}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="bg-[var(--orravan-blue)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            {SIGNAL.buttons[0]}
          </span>
          <span className="border border-rule px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            {SIGNAL.buttons[1]}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------ from signal to decision --- */

export function ToDecision() {
  return (
    <Band dark>
      <Head
        dark
        lines={DECISION.head}
        copy={DECISION.copy}
        aside={
          <a
            href="#services"
            className="mt-7 inline-flex min-h-[44px] items-center border border-bone/45 px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-bone transition-colors hover:bg-bone/10"
          >
            {DECISION.cta}
          </a>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 lg:pr-10">
        {DECISION.steps.map((step) => (
          <Reveal key={step.n}>
            <article className="relative aspect-[4/5] overflow-hidden">
              <Plate
                slot={step.slot}
                parallax={10}
                className="absolute inset-0"
                imgClassName="h-full w-full object-cover object-top"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(10,11,13,0.92)] via-[rgba(10,11,13,0.6)] to-transparent p-4 pt-14">
                <span className="o-num text-[12px] text-bone/55">{step.n}</span>
                <p className="o-label mt-1 text-[11px] text-bone">{step.role}</p>
                <p className="mt-1.5 text-[12px] leading-snug text-bone/70">{step.detail}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Band>
  );
}

/* -------------------------------------------- resolution you can see --- */

export function Resolution() {
  return (
    <Band>
      <Head lines={RESOLUTION.head} copy={RESOLUTION.copy} />

      <Reveal className="relative">
        <div className="relative aspect-[16/9] overflow-hidden">
          <Plate
            slot="resolution-people"
            parallax={12}
            className="absolute inset-0"
            imgClassName="h-full w-full object-cover object-[36%_18%]"
          />
        </div>

        {/* The card the section is named for. */}
        <div className="o-stamped absolute bottom-6 right-6 w-[min(300px,80%)] border border-rule bg-white p-4 shadow-[0_22px_50px_rgba(23,24,26,0.22)]">
          <span className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-verified text-white">
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
                <path d="M3 8.5 L6.5 12 L13 4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="o-label text-[10px] text-verified">{RESOLUTION.card.status}</span>
          </span>
          <p className="mt-2.5 text-[14px] font-semibold text-ink">{RESOLUTION.card.title}</p>
          <p className="mt-1 text-[11px] font-medium text-verified">{RESOLUTION.card.state}</p>
          <p className="mt-2 text-[12px] leading-snug text-ink-soft">{RESOLUTION.card.note}</p>
          <p className="o-num mt-3 text-[11px] text-ink-mute">{RESOLUTION.card.stamp}</p>
          <p className="text-[11px] text-ink-mute">{RESOLUTION.card.who}</p>
        </div>
      </Reveal>
    </Band>
  );
}
