"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { changeBooking, findChangeTimes, type TimeOption } from "@/lib/sites/actions";

/**
 * Move a booking without losing it: pick a new day, time or party size,
 * and the old table is only let go once the new one is secured.
 */
export function ChangeBooking({ token, slug, date: initialDate, party: initialParty, today, maxDate, maxParty }: {
  token: string; slug: string; date: string; party: number; today: string; maxDate: string; maxParty: number;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [party, setParty] = useState(initialParty);
  const [times, setTimes] = useState<TimeOption[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [loading, start] = useTransition();
  const [state, submit, pending] = useActionState(changeBooking, { error: null });
  const req = useRef(0);

  useEffect(() => {
    if (!open) return;
    const id = ++req.current;
    start(async () => {
      const t = await findChangeTimes(token, date, party);
      if (id !== req.current) return;
      setTimes(t);
      setTime((cur) => (t.some((x) => x.time === cur) ? cur : null));
    });
  }, [open, token, date, party, state]);

  if (!open) {
    return <button type="button" className="site-btn" onClick={() => setOpen(true)}>Change date, time or guests</button>;
  }
  return (
    <form action={submit} className="site-panel site-stack">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="site" value={slug} />
      <input type="hidden" name="time" value={time ?? ""} />
      <div className="site-row">
        <div className="site-field">
          <label htmlFor="ch-party">Guests</label>
          <select id="ch-party" name="party" value={party} onChange={(e) => setParty(Number(e.target.value))}>
            {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>)}
          </select>
        </div>
        <div className="site-field">
          <label htmlFor="ch-date">Date</label>
          <input id="ch-date" type="date" name="date" value={date} min={today} max={maxDate} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
      </div>
      <div aria-live="polite">
        {times === null ? <p className="site-note">Finding tables…</p>
          : times.length === 0 ? <p className="site-note">Nothing free for {party} that day. Try another date, or call us.</p>
          : (
            <div className="site-times" role="group" aria-label="New time" style={{ opacity: loading ? 0.5 : 1 }}>
              {times.map((t) => (
                <button key={t.time} type="button" className="site-time" aria-pressed={time === t.time} onClick={() => setTime(t.time)}>{t.label}</button>
              ))}
            </div>
          )}
      </div>
      {state.error && <p className="site-error" role="alert">{state.error}</p>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="submit" className="site-btn" disabled={!time || pending}>{pending ? "Saving…" : "Move my booking"}</button>
        <button type="button" className="site-btn ghost" onClick={() => setOpen(false)}>Keep it as it is</button>
      </div>
    </form>
  );
}
