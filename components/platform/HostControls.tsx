"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import {
  addWaiting, changeStatus, markPaid, notifySignup, phoneBooking, redeemReward, removeWaiting, seatOptions, seatWaiting,
  staffTimes, textReady, undoChange, walkIn, type FormState,
} from "@/lib/platform/host-actions";
import type { ReservationStatus, TableChoice } from "@/lib/reservations/repo";
import { safeCall } from "./safe-call";

/* --------------------------------------------------------------- toast --
 * "Seated Ana at T5 · Undo" for 10 seconds. Lives above the rows, so it
 * survives the row moving (a late party drops back into its time slot
 * once seated) and the page refreshing.
 */

interface Toast { text: string; undo?: { org: string; id: string }; key: number }
const ToastContext = createContext<(t: Omit<Toast, "key">) => void>(() => {});
const TOAST_MS = 10_000;

export function HostToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const show = useCallback((t: Omit<Toast, "key">) => { setError(null); setToast({ ...t, key: Date.now() }); }, []);
  useEffect(() => {
    if (!toast || error) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, error]);
  const undo = () => {
    if (!toast?.undo) return;
    const { org, id } = toast.undo;
    start(async () => {
      const r = await safeCall(() => undoChange(org, id));
      if (r.error) setError(r.error);
      else setToast({ text: "Undone", key: Date.now() });
    });
  };
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pf-toast-wrap" aria-live="polite">
        {toast && (
          <div className="pf-toast" key={toast.key} role="status">
            <span>{error ?? toast.text}</span>
            {toast.undo && !error && toast.text !== "Undone" && (
              <button type="button" className="pf-btn small" onClick={undo} disabled={pending}>{pending ? "…" : "Undo"}</button>
            )}
            <button type="button" className="pf-btn small quiet" aria-label="Dismiss" onClick={() => setToast(null)}>✕</button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

/* -------------------------------------------------------- row actions -- */

export interface RowInfo {
  org: string;
  id: string;
  status: ReservationStatus;
  canAct: boolean;
  /** "Ana Perez, party of 2 at 5:00 PM" — the accessible name's subject. */
  who: string;
  isToday: boolean;
  /** Epoch ms from which a no-show may be marked. */
  noShowFrom: number;
  /** "5:15 PM" — when No-show becomes available. */
  noShowLabel: string;
  /** Epoch ms until which the last Seat / Done / No-show can be undone, or null. */
  undoUntil: number | null;
  /** What the undo would take back ("Seated", "Done", "No-show"). */
  undoLabel: string | null;
}

/** The time, to the nearest 5 seconds; null while rendering on the server. */
const TICK = 5_000;
const subscribeClock = (cb: () => void) => {
  const t = setInterval(cb, TICK);
  return () => clearInterval(t);
};
function useNow(): number | null {
  return useSyncExternalStore(subscribeClock, () => Math.floor(Date.now() / TICK) * TICK, () => null);
}

export function StatusButtons(p: RowInfo) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [tables, setTables] = useState<TableChoice[] | null>(null);
  const toast = useContext(ToastContext);
  const now = useNow();
  if (!p.canAct) return null;

  const go = (next: ReservationStatus, opts: { confirm?: string; tableId?: string } = {}) => {
    if (opts.confirm && !window.confirm(opts.confirm)) return;
    setError(null);
    start(async () => {
      const r = await safeCall(() => changeStatus(p.org, p.id, next, opts.tableId));
      if (r.error) {
        setError(r.error);
        if ("pick" in r && r.pick) await loadTables();
        return;
      }
      setTables(null);
      setMore(false);
      if ("done" in r && r.done) toast({ text: r.done, undo: { org: p.org, id: p.id } });
    });
  };
  const loadTables = async () => {
    const t = await safeCall(async () => ({ error: null, tables: await seatOptions(p.org, p.id) }));
    if ("tables" in t) setTables(t.tables);
    else setError(t.error);
  };
  const undo = () => {
    setError(null);
    start(async () => {
      const r = await safeCall(() => undoChange(p.org, p.id));
      if (r.error) setError(r.error);
      else toast({ text: "Undone" });
    });
  };

  const waiting = p.status === "booked" || p.status === "confirmed";
  const noShowOk = now !== null && now >= p.noShowFrom;
  const canUndoNow = p.undoUntil !== null && now !== null && now < p.undoUntil;

  return (
    <div className="pf-res-actions">
      {waiting && p.isToday && (
        <button className="pf-btn go small" disabled={pending} onClick={() => go("seated")} aria-label={`Seat ${p.who}`}>Seat</button>
      )}
      {p.status === "seated" && (
        <button className="pf-btn small" disabled={pending} onClick={() => go("completed")} aria-label={`Table free: ${p.who} has left`}>Table free</button>
      )}
      {canUndoNow && (
        <button className="pf-btn small quiet" disabled={pending} onClick={undo} aria-label={`Undo ${p.undoLabel ?? "last change"} for ${p.who}`}>
          Undo {p.undoLabel?.toLowerCase()}
        </button>
      )}
      {waiting && (
        <button className="pf-btn small quiet pf-more" aria-expanded={more} onClick={() => setMore((m) => !m)} aria-label={`More actions for ${p.who}`}>
          More <span aria-hidden>▾</span>
        </button>
      )}
      {waiting && more && (
        <div className="pf-more-menu" role="group" aria-label={`More actions for ${p.who}`}>
          {p.isToday && (
            <button className="pf-btn small" disabled={pending} onClick={() => { setError(null); start(loadTables); }} aria-label={`Seat ${p.who} at another table`}>
              Seat at another table…
            </button>
          )}
          {p.isToday && (
            <button className="pf-btn small" disabled={pending || !noShowOk}
              onClick={() => go("no_show", { confirm: "Mark this party as a no-show? It counts against the guest's record. You can undo for 15 minutes." })}
              aria-label={noShowOk ? `Mark ${p.who} a no-show` : `No-show for ${p.who} available from ${p.noShowLabel}`}>
              {noShowOk ? "No-show" : `No-show from ${p.noShowLabel}`}
            </button>
          )}
          <button className="pf-btn small quiet danger" disabled={pending}
            onClick={() => go("cancelled", { confirm: "Cancel this booking? The guest will be texted that the restaurant cancelled, and any deposit is refunded. This can't be undone." })}
            aria-label={`Cancel the booking for ${p.who}`}>
            Cancel booking
          </button>
        </div>
      )}
      {tables && (
        <div className="pf-picker" role="group" aria-label={`Choose a table for ${p.who}`}>
          <span className="pf-picker-label">Seat at</span>
          {tables.length === 0 && <span className="pf-sub">No table fits this party.</span>}
          {tables.map((t) => (
            <button key={t.id} className={`pf-btn small${t.free ? " go" : ""}`} disabled={pending || !t.free}
              onClick={() => go("seated", { tableId: t.id })}
              aria-label={t.free ? `Seat ${p.who} at ${t.label}, seats ${t.minCovers} to ${t.maxCovers}` : `${t.label} unavailable${t.occupiedBy ? `, ${t.occupiedBy} seated` : ""}`}>
              {t.label}<span className="pf-picker-size">{t.minCovers}–{t.maxCovers}</span>
              {!t.free && <span className="pf-picker-size">{t.occupiedBy ? "occupied" : "held"}</span>}
            </button>
          ))}
          <button className="pf-btn small quiet" onClick={() => setTables(null)}>Close</button>
        </div>
      )}
      {error && <span className="pf-msg err" role="alert">{error}</span>}
    </div>
  );
}

/* --------------------------------------------------------------- forms -- */

type Field = NonNullable<FormState["field"]>;

function useFieldFocus(state: { field?: FormState["field"]; error: string | null }) {
  const refs = useRef<Partial<Record<Field, HTMLElement | null>>>({});
  useEffect(() => {
    if (state.error && state.field) refs.current[state.field]?.focus();
  }, [state]);
  const bind = (f: Field) => (el: HTMLElement | null) => { refs.current[f] = el; };
  return bind;
}

const EMPTY: FormState = { ok: null, error: null };

export function WalkInForm({ org, venueId }: { org: string; venueId: string }) {
  const [party, setParty] = useState("2");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [quote, setQuote] = useState("");
  const [state, setState] = useState<FormState>(EMPTY);
  const [waitlisting, setWaitlisting] = useState(false);
  const [pending, start] = useTransition();
  const bind = useFieldFocus(state);
  const edit = (set: (v: string) => void) => (e: { target: { value: string } }) => {
    set(e.target.value);
    if (state.error || state.ok) setState(EMPTY);
  };
  const reset = () => { setParty("2"); setName(""); setPhone(""); setQuote(""); setWaitlisting(false); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await safeCall(() => walkIn(org, venueId, { party: Number(party), name, phone }));
      setState(r as FormState);
      if ((r as FormState).ok) reset();
      else if ((r as FormState).quote != null) { setQuote(String((r as FormState).quote)); setWaitlisting(true); }
    });
  };
  const waitlist = () => {
    start(async () => {
      const r = await safeCall(() => addWaiting(org, venueId, { party: Number(party), name, phone, quote: Number(quote || 0) }));
      setState(r as FormState);
      if ((r as FormState).ok) reset();
    });
  };
  const inv = (f: Field) => state.error && state.field === f ? { "aria-invalid": true as const, "aria-describedby": "wi-err" } : {};

  return (
    <form onSubmit={submit} className="pf-body" noValidate>
      <div className="pf-row2">
        <div className="pf-field">
          <label htmlFor="wi-party">Party</label>
          <input id="wi-party" ref={bind("party")} name="party" type="number" min={1} max={30} value={party} onChange={edit(setParty)} required inputMode="numeric" {...inv("party")} />
        </div>
        <div className="pf-field">
          <label htmlFor="wi-name">Name</label>
          <input id="wi-name" ref={bind("name")} name="name" placeholder="Walk-in" value={name} onChange={edit(setName)} autoComplete="off" {...inv("name")} />
        </div>
      </div>
      <div className="pf-field">
        <label htmlFor="wi-phone">Mobile (optional)</label>
        <input id="wi-phone" ref={bind("phone")} name="phone" type="tel" inputMode="tel" value={phone} onChange={edit(setPhone)} autoComplete="off" {...inv("phone")} />
      </div>
      <div className="pf-form-actions">
        <button className="pf-btn go" type="submit" disabled={pending}>{pending ? "Finding a table…" : "Seat now"}</button>
        {!waitlisting && <button className="pf-btn quiet" type="button" onClick={() => { setWaitlisting(true); if (!quote) setQuote("20"); }}>Waitlist…</button>}
      </div>
      {waitlisting && (
        <div className="pf-waitadd">
          <div className="pf-field">
            <label htmlFor="wi-quote">Quoted wait (min)</label>
            <input id="wi-quote" ref={bind("quote")} type="number" min={0} max={240} step={5} inputMode="numeric" value={quote} onChange={edit(setQuote)} {...inv("quote")} />
          </div>
          <button className="pf-btn primary" type="button" onClick={waitlist} disabled={pending}>
            Add to waitlist · quote {quote || 0} min
          </button>
        </div>
      )}
      {state.ok && <p className="pf-msg ok" role="status">{state.ok}</p>}
      {state.error && <p className="pf-msg err" role="alert" id="wi-err">{state.error}</p>}
    </form>
  );
}

export function PhoneBookingForm({ org, venueId, date }: { org: string; venueId: string; date: string }) {
  const [party, setParty] = useState("2");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<FormState>(EMPTY);
  const [pending, start] = useTransition();
  const [times, setTimes] = useState<{ time: string; label: string }[] | null>(null);
  const [loading, startLoad] = useTransition();
  const [booked, setBooked] = useState(0);
  const bind = useFieldFocus(state);
  const size = Math.max(1, Math.min(30, Number(party) || 1));

  useEffect(() => {
    let live = true;
    startLoad(async () => {
      try {
        const t = await staffTimes(org, venueId, date, size);
        if (!live) return;
        setTimes(t);
        // Keep the chosen time while it's still free.
        setTime((cur) => (t.some((x) => x.time === cur) ? cur : ""));
      } catch {
        if (live) setTimes((cur) => cur ?? []);
      }
    });
    return () => { live = false; };
  }, [org, venueId, date, size, booked]);

  const edit = (set: (v: string) => void) => (e: { target: { value: string } }) => {
    set(e.target.value);
    if (state.error || state.ok) setState(EMPTY);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await safeCall(() => phoneBooking(org, venueId, { date, time, party: size, name, phone, notes })) as FormState;
      setState(r);
      if (r.ok) { setName(""); setPhone(""); setNotes(""); setTime(""); setParty("2"); }
      if (r.ok || r.field === "time") setBooked((n) => n + 1);
    });
  };
  const inv = (f: Field) => state.error && state.field === f ? { "aria-invalid": true as const, "aria-describedby": "pb-err" } : {};

  return (
    <form onSubmit={submit} className="pf-body" noValidate>
      <div className="pf-row2">
        <div className="pf-field">
          <label htmlFor="pb-party">Party</label>
          <input id="pb-party" ref={bind("party")} name="party" type="number" min={1} max={30} value={party} required inputMode="numeric"
            onChange={edit(setParty)} {...inv("party")} />
        </div>
        <div className="pf-field">
          <label htmlFor="pb-time">Time</label>
          <select id="pb-time" ref={bind("time")} name="time" required value={time} onChange={edit(setTime)} disabled={!times?.length} {...inv("time")}>
            <option value="">{times === null || loading ? "Loading…" : times.length ? "Choose a time" : "Nothing free"}</option>
            {times?.map((t) => <option key={t.time} value={t.time}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div className="pf-field">
        <label htmlFor="pb-name">Name</label>
        <input id="pb-name" ref={bind("name")} name="name" required value={name} onChange={edit(setName)} autoComplete="off" {...inv("name")} />
      </div>
      <div className="pf-field">
        <label htmlFor="pb-phone">Mobile</label>
        <input id="pb-phone" ref={bind("phone")} name="phone" type="tel" inputMode="tel" value={phone} onChange={edit(setPhone)} autoComplete="off" {...inv("phone")} />
      </div>
      <div className="pf-field">
        <label htmlFor="pb-notes">Notes</label>
        <input id="pb-notes" name="notes" placeholder="Birthday, high chair, allergy…" value={notes} onChange={edit(setNotes)} />
      </div>
      <button className="pf-btn primary" type="submit" disabled={pending || !times?.length}>{pending ? "Booking…" : "Book"}</button>
      {state.ok && <p className="pf-msg ok" role="status">{state.ok}</p>}
      {state.error && <p className="pf-msg err" role="alert" id="pb-err">{state.error}</p>}
    </form>
  );
}

/* --------------------------------------------------------- small buttons -- */

function InlineAction({ label, pendingLabel = "…", className = "pf-btn small", ariaLabel, title, run, confirm, onDone }: {
  label: ReactNode; pendingLabel?: string; className?: string; ariaLabel?: string; title?: string;
  run: () => Promise<{ error: string | null; done?: string }>; confirm?: string; onDone?: (done?: string) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button type="button" className={className} disabled={pending} aria-label={ariaLabel} title={title}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          start(async () => {
            const r = await safeCall(run);
            if (r.error) setError(r.error);
            else onDone?.("done" in r ? r.done : undefined);
          });
        }}>
        {pending ? pendingLabel : label}
      </button>
      {error && <span className="pf-msg err" role="alert">{error}</span>}
    </>
  );
}

export function MarkPaidButton({ org, id, who }: { org: string; id: string; who: string }) {
  return <InlineAction label="Deposit paid" ariaLabel={`Deposit paid for ${who}`} run={() => markPaid(org, id)} />;
}

export function RedeemButton({ org, id, reward, who }: { org: string; id: string; reward: string; who: string }) {
  return (
    <InlineAction className="pf-btn small ai" title={`Mark ${reward} as given`} ariaLabel={`Give ${who} their reward: ${reward}`}
      label={<><span aria-hidden>✦</span> Reward: {reward}</>} run={() => redeemReward(org, id)} />
  );
}

export function WaitlistActions({ org, id, who, hasPhone, texted }: { org: string; id: string; who: string; hasPhone: boolean; texted: boolean }) {
  const toast = useContext(ToastContext);
  return (
    <div className="pf-res-actions">
      {hasPhone && (
        <InlineAction label={texted ? "Text again" : "Text: table ready"} ariaLabel={`Text ${who}: table ready`}
          run={() => textReady(org, id)} onDone={() => toast({ text: `Texted ${who.split(",")[0]}` })} />
      )}
      <InlineAction className="pf-btn small go" label="Seat" ariaLabel={`Seat ${who} at a free table`}
        run={() => seatWaiting(org, id)} onDone={(d) => toast({ text: d ?? "Seated" })} />
      <InlineAction className="pf-btn small quiet" label="Remove" ariaLabel={`Remove ${who} from the waitlist`}
        confirm={`Remove ${who.split(",")[0]} from the waitlist?`} run={() => removeWaiting(org, id)} />
    </div>
  );
}

export function NotifyButton({ org, id, who, notified }: { org: string; id: string; who: string; notified: boolean }) {
  const toast = useContext(ToastContext);
  return (
    <div className="pf-res-actions">
      <InlineAction label={notified ? "Notify again" : "Notify: table open"} ariaLabel={`Text ${who} that a table opened`}
        run={() => notifySignup(org, id)} onDone={() => toast({ text: `Texted ${who.split(",")[0]}` })} />
    </div>
  );
}
