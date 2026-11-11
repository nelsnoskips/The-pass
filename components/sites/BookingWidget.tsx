"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { findTimes, joinWaitlistAction, reserve, type ReserveState, type TimeOption } from "@/lib/sites/actions";

/**
 * The guest's booking flow: party and date, then a time, then who they
 * are. The only client JavaScript on a restaurant site. Times come from
 * the reservations engine and are re-checked when the booking is made,
 * so a stale button can't double-book a table.
 */
export function BookingWidget({
  slug,
  today,
  maxDate,
  maxParty,
  restaurant,
  initialDate,
  initialParty,
  policy,
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
  /** Shown before booking, never after. */
  policy?: string;
}) {
  const [party, setParty] = useState(initialParty && initialParty <= maxParty ? initialParty : 2);
  const [date, setDate] = useState(initialDate && initialDate >= today && initialDate <= maxDate ? initialDate : today);
  const [times, setTimes] = useState<TimeOption[] | null>(null);
  const [open, setOpen] = useState(true);
  const [time, setTime] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [state, submit, pending] = useActionState<ReserveState, FormData>(reserve, { error: null });
  const detailsRef = useRef<HTMLDivElement>(null);
  const request = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    startLoading(async () => {
      const { times: found, open: serving } = await findTimes(slug, date, party);
      // A slower, older answer must not overwrite a newer one.
      if (id !== request.current) return;
      setTimes(found);
      setOpen(serving);
      setTime((current) => (found.some((t) => t.time === current) ? current : null));
    });
  }, [slug, date, party]);

  // "That time was just taken": the list is stale, so fetch it again.
  useEffect(() => {
    if (!state.error) return;
    const id = ++request.current;
    startLoading(async () => {
      const { times: found } = await findTimes(slug, date, party);
      if (id !== request.current) return;
      setTimes(found);
      setTime((current) => (found.some((t) => t.time === current) ? current : null));
    });
    // Only when a new error arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const choose = (t: string) => {
    setTime(t);
    requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const chosen = times?.find((t) => t.time === time) ?? null;
  // Times arrive in order, so grouping by service keeps them in order.
  const groups: [string, TimeOption[]][] = [];
  for (const t of times ?? []) {
    const last = groups[groups.length - 1];
    if (last && last[0] === t.period) last[1].push(t);
    else groups.push([t.period, [t]]);
  }

  return (
    <form action={submit} className="site-panel site-stack">
      <input type="hidden" name="site" value={slug} />
      <input type="hidden" name="time" value={time ?? ""} />
      <div className="site-hp" aria-hidden>
        <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="site-row">
        <div className="site-field">
          <label htmlFor="bk-party">Guests</label>
          <select id="bk-party" name="party" value={party} onChange={(e) => setParty(Number(e.target.value))}>
            {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
            ))}
          </select>
        </div>
        <div className="site-field">
          <label htmlFor="bk-date">Date</label>
          <input id="bk-date" type="date" name="date" value={date} min={today} max={maxDate} required
            onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
      </div>

      <div>
        <p className="site-legend" id="bk-times">Time</p>
        <div aria-live="polite">
          {times === null ? (
            <p className="site-note" style={{ marginTop: 10 }}>Finding tables…</p>
          ) : times.length === 0 ? (
            <div style={{ marginTop: 10 }}>
              {open ? (
                <>
                  <p className="site-note">
                    No tables online for {party} on that day. Try another date, call us, or we can text you if one opens.
                  </p>
                  <Waitlist slug={slug} date={date} party={party} />
                </>
              ) : (
                <p className="site-note">We&rsquo;re closed that day. Please pick another date.</p>
              )}
            </div>
          ) : (
            <div role="group" aria-labelledby="bk-times" style={{ opacity: loading ? 0.5 : 1 }}>
              {groups.map(([period, options]) => (
                <div key={period}>
                  {groups.length > 1 && <p className="site-period">{period}</p>}
                  <div className="site-times">
                    {options.map((t) => (
                      <button key={t.time} type="button" className="site-time" aria-pressed={time === t.time} onClick={() => choose(t.time)}>
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
              <input id="bk-name" name="name" autoComplete="name" required maxLength={120} />
            </div>
            <div className="site-field">
              <label htmlFor="bk-phone">Mobile</label>
              <input id="bk-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required placeholder="(555) 555-0100" />
            </div>
          </div>
          <div className="site-field">
            <label htmlFor="bk-email">Email (optional)</label>
            <input id="bk-email" name="email" type="email" autoComplete="email" maxLength={200} />
          </div>
          <div className="site-field">
            <label htmlFor="bk-notes">Anything we should know? (optional)</label>
            <textarea id="bk-notes" name="notes" maxLength={500} placeholder="Allergies, a birthday, a high chair…" />
          </div>
          <label className="site-check">
            <input type="checkbox" name="marketing" />
            <span>Text me occasional news and invitations from {restaurant}. Message and data rates may apply. Reply STOP any time. Not required to book.</span>
          </label>

          {(chosen.depositCents > 0 || policy) && (
            <div className="site-note" style={{ borderLeft: "2px solid var(--accent)", paddingLeft: 12 }}>
              {chosen.depositCents > 0 && (
                <p style={{ margin: "0 0 4px", color: "var(--ink)" }}>
                  A ${(chosen.depositCents / 100).toFixed(0)} deposit holds this table. It comes off your bill.
                </p>
              )}
              {policy && <p style={{ margin: 0 }}>{policy}</p>}
            </div>
          )}

          {state.error && <p className="site-error" role="alert">{state.error}</p>}

          <button type="submit" className="site-btn large" disabled={pending}>
            {pending ? "Booking…" : `Book ${party} at ${chosen.label}`}
          </button>
          <p className="site-note">We&rsquo;ll text a confirmation to your mobile with a link to change or cancel.</p>
        </div>
      )}
      {!chosen && state.error && <p className="site-error" role="alert">{state.error}</p>}
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
      setState(await joinWaitlistAction({ error: null }, f));
    });
  return (
    <div className="site-stack" style={{ marginTop: 14, gap: 12 }}>
      <div className="site-row">
        <div className="site-field">
          <label htmlFor="wl-name">Name</label>
          <input id="wl-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="site-field">
          <label htmlFor="wl-phone">Mobile</label>
          <input id="wl-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      {state.error && <p className="site-error" role="alert">{state.error}</p>}
      <button type="button" className="site-btn" disabled={pending || !name.trim() || !phone.trim()} onClick={send}>
        {pending ? "Adding…" : "Add me to the list"}
      </button>
    </div>
  );
}
