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
 * After the 2 Oct call Orravan chose the South Coast Facility Services
 * leadership page as the model: one even grid, no department headings,
 * a square portrait, the name, the title and a "Meet" link. The link
 * opens the profile rather than a separate page, so the quote and bio
 * are one click away without losing the reader's place in the grid.
 *
 * Order carries the hierarchy: leadership first, then everyone else in
 * the order of Alex's spreadsheet.
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

/** One list, no headings: leadership, then the groups in roster order. */
const TEAM: Person[] = [...LEADERSHIP, ...DEPARTMENTS.flatMap((d) => d.people)];

const firstName = (name: string) => name.split(" ")[0];

export function Org() {
  const [open, setOpen] = useState<Person | null>(null);

  return (
    <Band id="org">
      <Head lines={TEAM_PAGE.orgHead} copy={TEAM_PAGE.orgCopy} />

      <ul className="o-team-grid">
        {TEAM.map((p, i) => (
          <li key={p.id}>
            <Reveal delay={(i % 4) * 60}>
              <button type="button" className="o-team-card" onClick={() => setOpen(p)}>
                <Portrait p={p} />
                <span className="o-display o-team-card-name">{p.name}</span>
                <span className="o-label o-team-role">{p.role}</span>
                <span className="o-team-meet">
                  Meet {firstName(p.name)} <span aria-hidden>&rarr;</span>
                </span>
              </button>
            </Reveal>
          </li>
        ))}
      </ul>

      {open && <Profile p={open} onClose={() => setOpen(null)} />}
    </Band>
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
