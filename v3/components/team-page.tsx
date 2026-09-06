"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEPARTMENTS,
  LEADERSHIP,
  PLACEHOLDER,
  TEAM_PAGE,
  type Person,
} from "@/lib/company";
import { Band, Head } from "./sections-a";
import { Reveal } from "./ui";

/**
 * Meet the team.
 *
 * Don asked for an org chart that feels personal rather than a list of
 * names and titles, which are close to opposite things: a boxes-and-
 * lines chart is the least human diagram there is. So the structure is
 * carried by grouping — leadership first, then the four groups that run
 * the work — and every node is a portrait tile that opens a profile.
 * The hierarchy is legible without a single connector line.
 *
 * Headshots have not been taken yet, so the tile falls back to a
 * monogram on a tonal block. That is a deliberate placeholder rather
 * than a grey silhouette: it looks finished at a glance, and swapping
 * in Danny's photographs later is a file change with no layout
 * consequence.
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

export function Org() {
  const [open, setOpen] = useState<Person | null>(null);

  return (
    <Band id="org">
      <Head lines={TEAM_PAGE.orgHead} copy={TEAM_PAGE.orgCopy} />

      <div>
        {PLACEHOLDER && (
          <p className="o-team-note o-label">
            Template — awaiting the employee list and headshots
          </p>
        )}

        <section aria-labelledby="org-lead">
          <h3 id="org-lead" className="o-team-group o-label">
            Leadership
          </h3>
          <ul className="o-team-grid" data-lead>
            {LEADERSHIP.map((p, i) => (
              <Tile key={p.id} p={p} i={i} onOpen={() => setOpen(p)} />
            ))}
          </ul>
        </section>

        {DEPARTMENTS.map((d) => (
          <section key={d.id} aria-labelledby={`org-${d.id}`}>
            <h3 id={`org-${d.id}`} className="o-team-group o-label">
              {d.name}
              <span className="o-team-blurb">{d.blurb}</span>
            </h3>
            <ul className="o-team-grid">
              {d.people.map((p, i) => (
                <Tile key={p.id} p={p} i={i} onOpen={() => setOpen(p)} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {open && <Profile p={open} onClose={() => setOpen(null)} />}
    </Band>
  );
}

function Tile({ p, i, onOpen }: { p: Person; i: number; onOpen: () => void }) {
  return (
    <li>
      <Reveal delay={i * 60}>
        <button type="button" className="o-team-tile" onClick={onOpen}>
          <span className="o-team-portrait" aria-hidden>
            <span className="o-display">{p.initials}</span>
          </span>
          <span className="o-team-name">{p.name}</span>
          <span className="o-team-role o-label">{p.role}</span>
        </button>
      </Reveal>
    </li>
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

        <span className="o-team-portrait" data-big aria-hidden>
          <span className="o-display">{p.initials}</span>
        </span>

        <p className="o-label text-[10px] text-[var(--orravan-blue)]">{p.role}</p>
        <h3 className="o-display o-team-profile-name">{p.name}</h3>
        {p.since && <p className="o-label o-team-since">At Orravan since {p.since}</p>}

        <p className="o-team-bio">{p.bio}</p>

        {p.quote && <blockquote className="o-team-quote">{p.quote}</blockquote>}

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
