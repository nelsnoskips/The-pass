"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { findNextAvailable, findTimes, joinWaitlistAction, reserve, type ReserveField, type TimeOption } from "@/lib/sites/actions";
import { formatDeposit, policySentence } from "@/lib/reservations/policy";
import { guard } from "./net";

/** "yyyy-mm-dd" + n days. */
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "Fri, Nov 14" for a venue-local date. */
function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

/**
 * The guest's booking flow: party and date, then a time, then who they
 * are. Times come from the reservations engine and are re-checked when
 * the booking is made, so a stale button can't double-book a table.
 *
 * Every field is held here, not in the form, so a failed or dropped
 * submit never wipes what the guest typed.
 */
export function BookingWidget({
  slug,
  today,
  maxDate,
  maxParty,
  restaurant,
  initialDate,
  initialParty,
  cutoffHours,
  policyNote,
}: {
  slug: string;
  /** Venue-local "yyyy-mm-dd". */
  today: string;
  maxDate: string;
  maxParty: number;
  restaurant: string;
  /** From a waitlist text's link. */
  initialDate?: string;
  initialParty?: number;
  /** venues.cancel_cutoff_hours: the rule the refund follows. */
  cutoffHours: number;
  /** The owner's own words, shown under the rule. */
  policyNote?: string;
}) {
  const [party, setParty] = useState(initialParty && initialParty <= maxParty ? initialParty : 2);
  const [date, setDate] = useState(initialDate && initialDate >= today && initialDate <= maxDate ? initialDate : today);
  const [times, setTimes] = useState<TimeOption[] | null>(null);
  const [open, setOpen] = useState(true);
  const [next, setNext] = useState<{ date: string; times: TimeOption[] } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  // Who it's for: controlled, so nothing is lost when a submit fails.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [emailMarketing, setEmailMarketing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<ReserveField | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [pending, startSubmit] = useTransition();

  const detailsRef = useRef<HTMLDivElement>(null);
  const timesRef = useRef<HTMLDivElement>(null);
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
  };
  const errorRef = useRef<HTMLParagraphElement>(null);
  const request = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    startLoading(async () => {
      const r = await guard(() => findTimes(slug, date, party));
      // A slower, older answer must not overwrite a newer one.
      if (id !== request.current) return;
      if (!r.ok) { setLoadError(r.error); return; }
      setLoadError(null);
      const { times: found, open: serving } = r.value;
      setTimes(found);
      setOpen(serving);
      setTime((current) => (found.some((t) => t.time === current) ? current : null));
      // A full or closed day: offer the next one with a table.
      if (found.length === 0) {
        const n = await guard(() => findNextAvailable(slug, date, party));
        if (id === request.current) setNext(n.ok ? n.value : null);
      } else setNext(null);
    });
  }, [slug, date, party, reload]);

  // After a failed submit, take the guest to what needs fixing.
  useEffect(() => {
    if (!attempt) return;
    const target = field === "time" ? timesRef.current?.querySelector<HTMLElement>("button:not([disabled])") ?? timesRef.current
      : field ? fieldRefs[field].current : errorRef.current;
    target?.focus();
    // Only when a new failure arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const clearError = () => { if (error) { setError(null); setField(undefined); } };
  const edit = <T,>(set: (v: T) => void) => (v: T) => { set(v); clearError(); };

  const choose = (t: string) => {
    setTime(t);
    clearError();
    requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = new FormData(e.currentTarget);
    startSubmit(async () => {
      const r = await guard(() => reserve({ error: null }, form));
      if (!r.ok) { setError(r.error); setField(undefined); setAttempt((n) => n + 1); return; }
      setError(r.value.error);
      setField(r.value.field);
      if (r.value.error) setAttempt((n) => n + 1);
      // "That time was just taken": the list is stale, so fetch it again.
      if (r.value.field === "time") setReload((n) => n + 1);
    });
  };

  const chosen = times?.find((t) => t.time === time) ?? null;
  // Times arrive in order, so grouping by service keeps them in order.
  const groups: [string, TimeOption[]][] = [];
  for (const t of times ?? []) {
    const last = groups[groups.length - 1];
    if (last && last[0] === t.period) last[1].push(t);
    else groups.push([t.period, [t]]);
  }
  const tomorrow = addDays(today, 1);
  const invalid = (f: ReserveField) => (field === f ? { "aria-invalid": true, "aria-describedby": "bk-error" } : {});
  const errorBox = error && <p id="bk-error" ref={errorRef} tabIndex={-1} className="site-error" role="alert">{error}</p>;

  return (
    <form onSubmit={submit} className="site-panel site-stack">
      <input type="hidden" name="site" value={slug} />
      <input type="hidden" name="time" value={time ?? ""} />
      <div className="site-hp" aria-hidden>
        <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="site-row">
        <div className="site-field">
          <label htmlFor="bk-party">Guests</label>
          <select id="bk-party" name="party" value={party} onChange={(e) => { setParty(Number(e.target.value)); clearError(); }}>
            {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
            ))}
          </select>
        </div>
        <div className="site-field">
          <label htmlFor="bk-date">Date</label>
          <input id="bk-date" type="date" name="date" value={date} min={today} max={maxDate} required
            onChange={(e) => { if (e.target.value) { setDate(e.target.value); clearError(); } }} />
        </div>
      </div>
      <div className="site-quick" role="group" aria-label="Quick dates">
        <button type="button" className="site-chip" aria-pressed={date === today} onClick={() => { setDate(today); clearError(); }}>Tonight</button>
        {tomorrow <= maxDate && (
          <button type="button" className="site-chip" aria-pressed={date === tomorrow} onClick={() => { setDate(tomorrow); clearError(); }}>Tomorrow</button>
        )}
      </div>

      <div>
        <p className="site-legend" id="bk-times">Time</p>
        <div aria-live="polite">
          {loadError ? (
            <div style={{ marginTop: 10 }}>
              <p className="site-error" role="alert">{loadError}</p>
              <button type="button" className="site-btn ghost" style={{ marginTop: 10 }} onClick={() => setReload((n) => n + 1)} disabled={loading}>
                {loading ? "Trying…" : "Try again"}
              </button>
            </div>
          ) : times === null ? (
            <p className="site-note" style={{ marginTop: 10 }}>Finding tables…</p>
          ) : times.length === 0 ? (
            <div style={{ marginTop: 10 }}>
              <p className="site-note">
                {open
                  ? <>No tables online for {party} on {dayLabel(date)}.{next ? "" : " Try another date, call us, or we can text you if one opens."}</>
                  : <>We&rsquo;re closed on {dayLabel(date)}.</>}
              </p>
              {next && (
                <div className="site-next">
                  <p style={{ margin: 0 }}>Next table for {party}: <b>{dayLabel(next.date)}</b></p>
                  <div className="site-times">
                    {next.times.map((t) => (
                      <button key={t.time} type="button" className="site-time" onClick={() => { setDate(next.date); choose(t.time); }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="site-link" onClick={() => setDate(next.date)}>See all times on {dayLabel(next.date)}</button>
                </div>
              )}
              {open && <Waitlist slug={slug} date={date} party={party} />}
            </div>
          ) : (
            <div ref={timesRef} tabIndex={-1} role="group" aria-labelledby="bk-times" aria-busy={loading}
              className={loading ? "site-busy" : undefined}>
              {groups.map(([period, options]) => (
                <div key={period}>
                  {groups.length > 1 && <p className="site-period">{period}</p>}
                  <div className="site-times">
                    {options.map((t) => (
                      <button key={t.time} type="button" className="site-time" aria-pressed={time === t.time} disabled={loading} onClick={() => choose(t.time)}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="site-note" style={{ marginTop: 12 }}>More than {maxParty}? Call us and we&rsquo;ll set it up.</p>
      </div>

      {chosen && (
        <div ref={detailsRef} className="site-stack" style={{ borderTop: "1px solid var(--rule)", paddingTop: 22 }}>
          <div className="site-row">
            <div className="site-field">
              <label htmlFor="bk-name">Name</label>
              <input id="bk-name" ref={fieldRefs.name} name="name" autoComplete="name" required maxLength={120}
                value={name} onChange={(e) => edit(setName)(e.target.value)} {...invalid("name")} />
            </div>
            <div className="site-field">
              <label htmlFor="bk-phone">Mobile</label>
              <input id="bk-phone" ref={fieldRefs.phone} name="phone" type="tel" autoComplete="tel" inputMode="tel" required placeholder="(555) 555-0100"
                value={phone} onChange={(e) => edit(setPhone)(e.target.value)} {...invalid("phone")} />
            </div>
          </div>
          <div className="site-field">
            <label htmlFor="bk-email">Email (optional)</label>
            <input id="bk-email" ref={fieldRefs.email} name="email" type="email" autoComplete="email" maxLength={200}
              value={email} onChange={(e) => edit(setEmail)(e.target.value)} {...invalid("email")} />
          </div>
          <div className="site-field">
            <label htmlFor="bk-notes">Anything we should know? (optional)</label>
            <textarea id="bk-notes" name="notes" maxLength={500} placeholder="Allergies, a birthday, a high chair…"
              value={notes} onChange={(e) => edit(setNotes)(e.target.value)} />
          </div>
          <label className="site-check">
            <input type="checkbox" name="marketing" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
            <span>Text me occasional news and invitations from {restaurant}. Message and data rates may apply. Reply STOP any time. Not required to book.</span>
          </label>
          <label className="site-check">
            <input type="checkbox" name="emailMarketing" checked={emailMarketing} onChange={(e) => setEmailMarketing(e.target.checked)} />
            <span>Email me news from {restaurant} too (if you gave an email). Unsubscribe any time.</span>
          </label>

          <div className="site-note site-policy">
            {chosen.depositCents > 0 && (
              <p style={{ color: "var(--ink)" }}>A {formatDeposit(chosen.depositCents)} deposit holds this table. It comes off your bill.</p>
            )}
            <p>{policySentence(cutoffHours, chosen.depositCents)}</p>
            {policyNote && <p>{policyNote}</p>}
          </div>

          {errorBox}

          <button type="submit" className="site-btn large" disabled={pending}>
            {pending ? "Booking…" : `Book ${party} at ${chosen.label}`}
          </button>
          <p className="site-note">We&rsquo;ll text a confirmation to your mobile with a link to change or cancel.</p>
        </div>
      )}
      {!chosen && errorBox}
    </form>
  );
}

/** "Tell me if a table opens". It sits inside the booking form, and a
 *  form can't nest in a form, so it sends its own fields directly. */
function Waitlist({ slug, date, party }: { slug: string; date: string; party: number }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<{ error: string | null; joined?: boolean }>({ error: null });
  const [pending, start] = useTransition();
  if (state.joined) {
    return <p className="site-note" role="status" style={{ marginTop: 12 }}>You&rsquo;re on the list. If a table for {party} opens that day, we&rsquo;ll text you a link — first to book gets it.</p>;
  }
  if (!open) {
    return <button type="button" className="site-btn ghost" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>Text me if a table opens</button>;
  }
  const send = () =>
    start(async () => {
      const f = new FormData();
      f.set("site", slug); f.set("date", date); f.set("party", String(party)); f.set("name", name); f.set("phone", phone);
      const r = await guard(() => joinWaitlistAction({ error: null }, f));
      setState(r.ok ? r.value : { error: r.error });
    });
  return (
    <div className="site-stack" style={{ marginTop: 14, gap: 12 }}>
      <div className="site-row">
        <div className="site-field">
          <label htmlFor="wl-name">Name</label>
          <input id="wl-name" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setState({ error: null }); }} />
        </div>
        <div className="site-field">
          <label htmlFor="wl-phone">Mobile</label>
          <input id="wl-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setState({ error: null }); }} />
        </div>
      </div>
      {state.error && <p className="site-error" role="alert">{state.error}</p>}
      <button type="button" className="site-btn" disabled={pending || !name.trim() || !phone.trim()} onClick={send}>
        {pending ? "Adding…" : "Add me to the list"}
      </button>
    </div>
  );
}
