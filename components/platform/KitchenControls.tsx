"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { cancelOrderInline, kitchenInline, orderStatusInline } from "@/lib/ordering/actions";
import { safeCall } from "./safe-call";

/**
 * The kitchen board's buttons. Each call is wrapped: a failed tap or a
 * dropped connection shows an error beside the button and the board
 * stays as it was.
 */

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (call: () => Promise<{ error: string | null }>, then?: () => void) => {
    setError(null);
    start(async () => {
      const r = await safeCall(call);
      if (r.error) setError(r.error);
      else then?.();
    });
  };
  return { pending, error, run };
}

const Err = ({ error }: { error: string | null }) => (error ? <span className="pf-msg err" role="alert">{error}</span> : null);

export function TicketActions({ org, id, number, name, next, cancellable, reasons }: {
  org: string; id: string; number: number; name: string;
  next: { to: string; label: string; tone: string } | null;
  cancellable: boolean; reasons: readonly string[];
}) {
  const { pending, error, run } = useAction();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const why = reason === "other" ? other.trim() : reason;
  return (
    <div className="pf-ticket-actions">
      {next && (
        <button type="button" className={`pf-btn small ${next.tone}`} disabled={pending}
          aria-label={`${next.label} — order ${number} for ${name}`}
          onClick={() => run(() => orderStatusInline(org, id, next.to))}>
          {next.label}
        </button>
      )}
      {cancellable && !cancelling && (
        <button type="button" className="pf-btn small quiet pf-push" disabled={pending} aria-expanded={false}
          aria-label={`Cancel order ${number} for ${name} and text the guest`} onClick={() => setCancelling(true)}>
          Cancel · text guest
        </button>
      )}
      {cancelling && (
        <div className="pf-cancel-confirm" role="group" aria-label={`Cancel order ${number}`}>
          <label htmlFor={`why-${id}`}>Why are you cancelling #{number}?</label>
          <select id={`why-${id}`} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(error) && !why}>
            <option value="">Choose a reason…</option>
            {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="other">Something else…</option>
          </select>
          {reason === "other" && (
            <input aria-label="Reason" value={other} onChange={(e) => setOther(e.target.value)} maxLength={200} placeholder="Say why" />
          )}
          <div className="pf-ticket-actions">
            <button type="button" className="pf-btn small danger" disabled={pending || why.length < 3}
              onClick={() => run(() => cancelOrderInline(org, id, why), () => setCancelling(false))}>
              {pending ? "Cancelling…" : `Cancel #${number} and text ${name.split(/\s+/)[0]}`}
            </button>
            <button type="button" className="pf-btn small quiet" onClick={() => { setCancelling(false); setReason(""); }}>Keep order</button>
          </div>
        </div>
      )}
      <Err error={error} />
    </div>
  );
}

export function PauseControls({ org, paused, until }: { org: string; paused: boolean; until: string | null }) {
  const { pending, error, run } = useAction();
  return (
    <div className="pf-kbar-group" role="group" aria-label="Pause new pickup orders">
      {paused ? (
        <>
          <span className="pf-pill warn">Paused until {until}</span>
          <button type="button" className="pf-btn small primary" disabled={pending} onClick={() => run(() => kitchenInline(org, { pause: "resume" }))}>Resume orders</button>
        </>
      ) : (
        <>
          <span className="pf-kbar-label">Slammed? Pause</span>
          {["15", "30", "60"].map((m) => (
            <button key={m} type="button" className="pf-btn small" disabled={pending} aria-label={`Pause new orders for ${m} minutes`}
              onClick={() => run(() => kitchenInline(org, { pause: m }))}>{m} min</button>
          ))}
        </>
      )}
      <Err error={error} />
    </div>
  );
}

export function EightySix({ org, menu, soldOut, canEdit }: { org: string; menu: { id: string; name: string }[]; soldOut: string[]; canEdit: boolean }) {
  const { pending, error, run } = useAction();
  const [chosen, setPick] = useState("");
  const out = menu.filter((m) => soldOut.includes(m.id));
  const available = menu.filter((m) => !soldOut.includes(m.id));
  const pick = available.some((m) => m.id === chosen) ? chosen : "";
  return (
    <div className="pf-kbar-group pf-86" role="group" aria-label="86'd dishes">
      {out.length === 0 ? <span className="pf-kbar-label">Nothing&rsquo;s 86&rsquo;d.</span> : (
        <ul className="pf-86-list">
          {out.map((m) => (
            <li key={m.id}>
              <button type="button" className="pf-86-chip" disabled={pending || !canEdit} aria-label={`${m.name} is 86'd. Bring it back`}
                title="Tap to bring it back" onClick={() => run(() => kitchenInline(org, { item: m.id }))}>
                <span aria-hidden>✕</span> <s>{m.name}</s> — 86&rsquo;d
              </button>
            </li>
          ))}
        </ul>
      )}
      {canEdit && available.length > 0 && (
        <form className="pf-86-add" onSubmit={(e) => { e.preventDefault(); if (pick) run(() => kitchenInline(org, { item: pick }), () => setPick("")); }}>
          <label htmlFor="eighty-six" className="pf-visually-hidden">Dish to 86</label>
          <select id="eighty-six" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">86 a dish…</option>
            {available.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button type="submit" className="pf-btn small danger" disabled={pending || !pick}>86 it</button>
        </form>
      )}
      <Err error={error} />
    </div>
  );
}

/**
 * The settings drawer below the board. Opens itself when the page is
 * reached with #levers or #settings (change cards link to #levers).
 */
export function SettingsDrawer({ children, summary }: { children: ReactNode; summary: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => {
      if (["#levers", "#settings"].includes(window.location.hash)) {
        setOpen(true);
        requestAnimationFrame(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView());
      }
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);
  return (
    <details className="pf-panel pf-drawer" id="settings" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>{summary}</summary>
      <div className="pf-drawer-body">{children}</div>
    </details>
  );
}
