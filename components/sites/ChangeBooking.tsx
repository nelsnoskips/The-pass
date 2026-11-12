"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { changeBooking, findChangeTimes, type ReserveField, type TimeOption } from "@/lib/sites/actions";
import { guard } from "./net";

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [loading, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<ReserveField | undefined>();
  const [pending, startSubmit] = useTransition();
  const req = useRef(0);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = ++req.current;
    start(async () => {
      const r = await guard(() => findChangeTimes(token, date, party));
      if (id !== req.current) return;
      if (!r.ok) { setLoadError(r.error); return; }
      setLoadError(null);
      setTimes(r.value);
      setTime((cur) => (r.value.some((x) => x.time === cur) ? cur : null));
    });
  }, [open, token, date, party, reload]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = new FormData(e.currentTarget);
    startSubmit(async () => {
      const r = await guard(() => changeBooking({ error: null }, form));
      const s = r.ok ? r.value : { error: r.error, field: undefined };
      setError(s.error);
      setField(s.field);
      if (s.field === "time") setReload((n) => n + 1);
      requestAnimationFrame(() => errorRef.current?.focus());
    });
  };
  const clear = () => { setError(null); setField(undefined); };

  if (!open) {
    return <button type="button" className="site-btn" onClick={() => setOpen(true)}>Change date, time or guests</button>;
  }
  return (
    <form onSubmit={submit} className="site-panel site-stack">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="site" value={slug} />
      <input type="hidden" name="time" value={time ?? ""} />
      <div className="site-row">
        <div className="site-field">
          <label htmlFor="ch-party">Guests</label>
          <select id="ch-party" name="party" value={party} onChange={(e) => { setParty(Number(e.target.value)); clear(); }}>
            {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>)}
          </select>
        </div>
        <div className="site-field">
          <label htmlFor="ch-date">Date</label>
          <input id="ch-date" type="date" name="date" value={date} min={today} max={maxDate} onChange={(e) => { if (e.target.value) { setDate(e.target.value); clear(); } }} />
        </div>
      </div>
      <div aria-live="polite">
        {loadError ? (
          <div>
            <p className="site-error" role="alert">{loadError}</p>
            <button type="button" className="site-btn ghost" style={{ marginTop: 10 }} disabled={loading} onClick={() => setReload((n) => n + 1)}>{loading ? "Trying…" : "Try again"}</button>
          </div>
        ) : times === null ? <p className="site-note">Finding tables…</p>
          : times.length === 0 ? <p className="site-note">Nothing free for {party} that day. Try another date, or call us.</p>
          : (
            <div className={`site-times${loading ? " site-busy" : ""}`} role="group" aria-label="New time" aria-busy={loading}
              aria-invalid={field === "time" || undefined}>
              {times.map((t) => (
                <button key={t.time} type="button" className="site-time" aria-pressed={time === t.time} disabled={loading} onClick={() => { setTime(t.time); clear(); }}>{t.label}</button>
              ))}
            </div>
          )}
      </div>
      {error && <p className="site-error" role="alert" ref={errorRef} tabIndex={-1}>{error}</p>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="submit" className="site-btn" disabled={!time || pending}>{pending ? "Saving…" : "Move my booking"}</button>
        <button type="button" className="site-btn ghost" onClick={() => setOpen(false)}>Keep it as it is</button>
      </div>
    </form>
  );
}
