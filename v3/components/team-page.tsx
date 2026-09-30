"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEPARTMENTS,
  LEADERSHIP,
  TEAM_PAGE,
  type Person,
} from "@/lib/company";
import { Band, Head } from "./sections-a";
import { Reveal } from "./ui";
import { asset } from "@/lib/images";

/**
 * Meet the team.
 *
 * Alex asked to lose the department headings and try two layouts from
 * the pages Orravan liked: a stacked list where every person's quote
 * and bio sit in the open, and a side-scroll strip. Both are built here
 * behind a small switch so the team can compare them on the real page
 * with their own people in it, rather than on a mock. The chosen one
 * stays; the switch and the other go.
 *
 * Order carries the hierarchy now that headings don't: leadership
 * first, then everyone else in the order Alex's spreadsheet listed
 * them. Each person's group survives as a small label, not a heading.
 *
 * `?view=scroll` opens straight on the strip, so either layout can be
 * sent as its own link.
 */

export function TeamIntro() {
  return (
    <Band id="team-intro">
      <Head lines={TEAM_PAGE.head} copy={TEAM_PAGE.copy} />
      <Reveal>
        <dl className="o-team-stats">
          {[
            { k: "Founded", v: "2014" },
            { k: "On the team", v: "50" },
            { k: "Union shop", v: "Since 2023" },
            { k: "Disciplines", v: "Four" },
          ].map((s) => (
            <div key={s.k}>
              <dt className="o-label">{s.k}</dt>
              <dd className="o-display">{s.v}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </Band>
  );
}

type View = "stacked" | "scroll";

const VIEWS: { id: View; label: string }[] = [
  { id: "stacked", label: "Stacked" },
  { id: "scroll", label: "Side-scroll" },
];

type Member = Person & { group: string };

/** One list, no headings: leadership, then the groups in roster order. */
const TEAM: Member[] = [
  ...LEADERSHIP.map((p) => ({ ...p, group: "Leadership" })),
  ...DEPARTMENTS.flatMap((d) => d.people.map((p) => ({ ...p, group: d.name }))),
];

export function Org() {
  const [view, setView] = useState<View>("stacked");
  const [open, setOpen] = useState<Person | null>(null);

  // Read the layout from the address so each can be sent as a link.
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "scroll" || v === "stacked") setView(v);
  }, []);

  const choose = (v: View) => {
    setView(v);
    const url = new URL(window.location.href);
    if (v === "stacked") url.searchParams.delete("view");
    else url.searchParams.set("view", v);
    window.history.replaceState(null, "", url);
  };

  return (
    <Band id="org">
      <Head
        lines={TEAM_PAGE.orgHead}
        copy={TEAM_PAGE.orgCopy}
        aside={<Switch view={view} onChange={choose} />}
      />

      {/* min-w-0: without it the strip's content width props the grid
          column open and the whole page scrolls sideways. */}
      <div className="min-w-0">
        {view === "stacked" ? <Stack /> : <Strip onOpen={setOpen} />}
      </div>

      {open && <Profile p={open} onClose={() => setOpen(null)} />}
    </Band>
  );
}

function Switch({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="o-team-switch" role="group" aria-label="Team layout">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          className="o-label"
          aria-pressed={view === v.id}
          onClick={() => onChange(v.id)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Stacked: one row per person, everything visible. Nothing to open,
 * which is the point of the Therma page Orravan liked; it reads as a
 * room full of people rather than a directory.
 */
function Stack() {
  return (
    <ol className="o-team-stack">
      {TEAM.map((p) => (
        <li key={p.id}>
          <Reveal>
            <article className="o-team-row" aria-labelledby={`tm-${p.id}`}>
              <Portrait p={p} />
              <div className="o-team-row-text">
                <p className="o-label o-team-row-role">{p.role}</p>
                <h3 id={`tm-${p.id}`} className="o-display o-team-row-name">
                  {p.name}
                </h3>
                <p className="o-label o-team-since">
                  {p.group}
                  {p.since && ` · At Orravan since ${p.since}`}
                </p>
                {p.bio && <p className="o-team-bio">{p.bio}</p>}
                {p.quote && (
                  <blockquote className="o-team-quote">
                    {p.quote}
                    {p.cite && <cite className="o-label o-team-cite">{p.cite}</cite>}
                  </blockquote>
                )}
              </div>
            </article>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

/**
 * Side-scroll: a strip of cards that runs off the right edge of the
 * page, native horizontal scrolling with snap points, so a trackpad,
 * a phone swipe and the arrow buttons all move it. Vertical scrolling
 * is never hijacked; the page still scrolls down past it normally.
 */
function Strip({ onOpen }: { onOpen: (p: Person) => void }) {
  const rail = useRef<HTMLUListElement>(null);
  const [at, setAt] = useState({ start: true, end: false, p: 0 });

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const read = () => {
      const max = el.scrollWidth - el.clientWidth;
      setAt({
        start: el.scrollLeft <= 4,
        end: el.scrollLeft >= max - 4,
        p: max > 0 ? el.scrollLeft / max : 1,
      });
    };
    read();
    el.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      el.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, []);

  const step = (dir: 1 | -1) => {
    const el = rail.current;
    const card = el?.querySelector("li");
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: dir * (card.getBoundingClientRect().width + gap),
      behavior: still ? "auto" : "smooth",
    });
  };

  return (
    <div className="o-team-strip">
      <ul
        ref={rail}
        className="o-team-rail"
        tabIndex={0}
        aria-label="The team. Scroll sideways, or use the arrow buttons."
      >
        {TEAM.map((p) => (
          <li key={p.id}>
            <button type="button" className="o-team-card" onClick={() => onOpen(p)}>
              <Portrait p={p} />
              <span className="o-label o-team-card-group">{p.group}</span>
              <span className="o-display o-team-card-name">{p.name}</span>
              <span className="o-label o-team-role">{p.role}</span>
              {p.quote && <span className="o-team-card-quote">&ldquo;{p.quote}&rdquo;</span>}
            </button>
          </li>
        ))}
      </ul>

      <div className="o-team-strip-foot">
        <span className="o-team-strip-bar" aria-hidden>
          <span style={{ transform: `scaleX(${Math.max(0.06, at.p).toFixed(3)})` }} />
        </span>
        <button type="button" onClick={() => step(-1)} disabled={at.start} aria-label="Previous people">
          &larr;
        </button>
        <button type="button" onClick={() => step(1)} disabled={at.end} aria-label="More people">
          &rarr;
        </button>
      </div>
    </div>
  );
}

/** The face, or the initials standing in for one. Decorative either
    way: the name is always printed beside it. */
function Portrait({ p, big }: { p: Person; big?: boolean }) {
  return (
    <span className="o-team-portrait" data-big={big || undefined} aria-hidden>
      {p.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset(p.photo)} alt="" loading={big ? "eager" : "lazy"} decoding="async" />
      ) : (
        <span className="o-display">{p.initials}</span>
      )}
    </span>
  );
}

/**
 * The profile. A dialog rather than an expanding tile, because opening
 * a card in a grid pushes every other card down and loses the reader's
 * place — and because a bio and a quote want the room.
 */
function Profile({ p, onClose }: { p: Person; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const returnTo = useRef<Element | null>(null);

  useEffect(() => {
    returnTo.current = document.activeElement;
    panel.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      (returnTo.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="o-team-scrim" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`${p.name}, ${p.role}`}
        tabIndex={-1}
        className="o-team-profile"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="o-team-close"
          onClick={onClose}
          aria-label="Close profile"
        >
          &times;
        </button>

        <Portrait p={p} big />

        <p className="o-label text-[10px] text-[var(--orravan-blue)]">{p.role}</p>
        <h3 className="o-display o-team-profile-name">{p.name}</h3>
        {p.since && <p className="o-label o-team-since">At Orravan since {p.since}</p>}

        {p.bio && <p className="o-team-bio">{p.bio}</p>}

        {p.quote && (
          <blockquote className="o-team-quote">
            {p.quote}
            {p.cite && <cite className="o-label o-team-cite">{p.cite}</cite>}
          </blockquote>
        )}

        {p.focus && (
          <ul className="o-team-focus">
            {p.focus.map((f) => (
              <li key={f} className="o-label">
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function Careers() {
  return (
    <Band id="careers" dark>
      <Head
        dark
        lines={TEAM_PAGE.careersHead}
        copy={TEAM_PAGE.careersCopy}
        aside={
          <a href="#close" className="o-btn mt-5 bg-[var(--orravan-blue)]">
            {TEAM_PAGE.careersCta}
          </a>
        }
      />
      <Reveal>
        <ul className="o-team-values">
          {[
            ["Trained trades", "Union shop since 2023, and we keep our people."],
            ["Four disciplines", "Mechanical, automation, service, operations."],
            ["Named on the job", "You own the work you do, start to finish."],
          ].map(([k, v]) => (
            <li key={k}>
              <span className="o-label">{k}</span>
              <p>{v}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </Band>
  );
}
