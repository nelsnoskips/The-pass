"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { cancelBooking } from "@/lib/sites/actions";
import { guard } from "./net";

/**
 * Cancelling is two steps, and the second says exactly what happens to
 * the deposit before the guest commits.
 */
export function CancelBooking({ token, slug, summary, outcome, refund }: {
  token: string; slug: string;
  /** "your table for 2 on Fri, Nov 13 at 7:30 PM" */
  summary: string;
  /** From cancelOutcome(): the same rule the refund follows. */
  outcome: string;
  refund: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [text, setText] = useState(outcome);
  const [expectRefund, setExpectRefund] = useState(refund);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const confirmRef = useRef<HTMLDivElement>(null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = new FormData(e.currentTarget);
    start(async () => {
      const r = await guard(() => cancelBooking({ error: null }, form));
      if (!r.ok) { setError(r.error); return; }
      if (r.value.outcome) {
        // The cut-off passed while the page was open: say so, ask again.
        setText(r.value.outcome);
        setExpectRefund(false);
        setError("The cut-off has just passed, so the refund has changed. Still want to cancel?");
        return;
      }
      setError(r.value.error);
    });
  };

  if (!asking) {
    return (
      <button type="button" className="site-btn ghost" onClick={() => {
        setAsking(true);
        requestAnimationFrame(() => confirmRef.current?.focus());
      }}>Cancel this reservation</button>
    );
  }
  return (
    <form onSubmit={submit} className="site-panel site-stack site-confirm">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="site" value={slug} />
      <input type="hidden" name="expectRefund" value={expectRefund ? "1" : "0"} />
      <div ref={confirmRef} tabIndex={-1} role="group" aria-labelledby="cx-title">
        <h2 id="cx-title" style={{ fontSize: 24 }}>Cancel {summary}?</h2>
        <p style={{ margin: "10px 0 0" }}>{text}</p>
      </div>
      {error && <p className="site-error" role="alert">{error}</p>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="submit" className="site-btn" disabled={pending}>{pending ? "Cancelling…" : "Yes, cancel it"}</button>
        <button type="button" className="site-btn ghost" onClick={() => { setAsking(false); setError(null); }}>Keep my booking</button>
      </div>
    </form>
  );
}
