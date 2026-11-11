"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { changeStatus, markPaid, phoneBooking, redeemReward, staffTimes, walkIn, type FormState } from "@/lib/platform/host-actions";
import type { ReservationStatus } from "@/lib/reservations/repo";

export function StatusButtons({ org, id, status, canAct }: { org: string; id: string; status: ReservationStatus; canAct: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!canAct) return null;
  const go = (next: ReservationStatus, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const r = await changeStatus(org, id, next);
      setError(r.error);
    });
  };
  return (
    <div className="pf-res-actions">
      {(status === "booked" || status === "confirmed") && (
        <>
          <button className="pf-btn go small" disabled={pending} onClick={() => go("seated")}>Seat</button>
          <button className="pf-btn small" disabled={pending} onClick={() => go("no_show", "Mark this party as a no-show? It counts against the guest's record.")}>No-show</button>
          <button className="pf-btn quiet small" disabled={pending} onClick={() => go("cancelled", "Cancel this booking? The guest will be texted that the restaurant cancelled.")}>Cancel</button>
        </>
      )}
      {status === "seated" && (
        <button className="pf-btn small" disabled={pending} onClick={() => go("completed")}>Table free</button>
      )}
      {error && <span className="pf-msg err" role="alert">{error}</span>}
    </div>
  );
}

const EMPTY: FormState = { ok: null, error: null };

export function WalkInForm({ org, venueId }: { org: string; venueId: string }) {
  const [state, submit, pending] = useActionState(walkIn, EMPTY);
  return (
    <form action={submit} className="pf-body" key={state.ok ?? "walkin"}>
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="venue" value={venueId} />
      <div className="pf-row2">
        <div className="pf-field">
          <label htmlFor="wi-party">Party</label>
          <input id="wi-party" name="party" type="number" min={1} max={30} defaultValue={2} required inputMode="numeric" />
        </div>
        <div className="pf-field">
          <label htmlFor="wi-name">Name</label>
          <input id="wi-name" name="name" placeholder="Walk-in" />
        </div>
      </div>
      <div className="pf-field">
        <label htmlFor="wi-phone">Mobile (optional)</label>
        <input id="wi-phone" name="phone" type="tel" inputMode="tel" />
      </div>
      <button className="pf-btn go" type="submit" disabled={pending}>{pending ? "Finding a table…" : "Seat now"}</button>
      {state.ok && <p className="pf-msg ok" role="status">{state.ok}</p>}
      {state.error && <p className="pf-msg err" role="alert">{state.error}</p>}
    </form>
  );
}

export function PhoneBookingForm({ org, venueId, date }: { org: string; venueId: string; date: string }) {
  const [state, submit, pending] = useActionState(phoneBooking, EMPTY);
  const [party, setParty] = useState(2);
  const [times, setTimes] = useState<{ time: string; label: string }[] | null>(null);
  const [loading, start] = useTransition();
  useEffect(() => {
    let live = true;
    start(async () => {
      const t = await staffTimes(org, venueId, date, party);
      if (live) setTimes(t);
    });
    return () => { live = false; };
  }, [org, venueId, date, party, state.ok]);

  return (
    <form action={submit} className="pf-body">
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="venue" value={venueId} />
      <input type="hidden" name="date" value={date} />
      <div className="pf-row2">
        <div className="pf-field">
          <label htmlFor="pb-party">Party</label>
          <input id="pb-party" name="party" type="number" min={1} max={30} value={party} required inputMode="numeric"
            onChange={(e) => setParty(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <div className="pf-field">
          <label htmlFor="pb-time">Time</label>
          <select id="pb-time" name="time" required disabled={loading || !times?.length}>
            {!times?.length && <option value="">{loading ? "Loading…" : "Nothing free"}</option>}
            {times?.map((t) => <option key={t.time} value={t.time}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div className="pf-field">
        <label htmlFor="pb-name">Name</label>
        <input id="pb-name" name="name" required />
      </div>
      <div className="pf-field">
        <label htmlFor="pb-phone">Mobile</label>
        <input id="pb-phone" name="phone" type="tel" inputMode="tel" />
      </div>
      <div className="pf-field">
        <label htmlFor="pb-notes">Notes</label>
        <input id="pb-notes" name="notes" placeholder="Birthday, high chair, allergy…" />
      </div>
      <button className="pf-btn primary" type="submit" disabled={pending || !times?.length}>{pending ? "Booking…" : "Book"}</button>
      {state.ok && <p className="pf-msg ok" role="status">{state.ok}</p>}
      {state.error && <p className="pf-msg err" role="alert">{state.error}</p>}
    </form>
  );
}

export function MarkPaidButton({ org, id }: { org: string; id: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="pf-btn small" disabled={pending} onClick={() => start(async () => { const r = await markPaid(org, id); if (r.error) alert(r.error); })}>
      {pending ? "…" : "Deposit paid"}
    </button>
  );
}

export function RedeemButton({ org, id, reward }: { org: string; id: string; reward: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="pf-btn small ai" disabled={pending} title={`Mark ${reward} as given`}
      onClick={() => start(async () => { const r = await redeemReward(org, id); if (r.error) alert(r.error); })}>
      <span aria-hidden>✦</span> {pending ? "…" : `Reward: ${reward}`}
    </button>
  );
}
