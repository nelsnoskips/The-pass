"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideProposal, dismissAllAction } from "@/lib/platform/agent-actions";

/**
 * Approve or dismiss one proposal. A text that would go out now asks
 * first, with the exact number of guests it reaches.
 */
export function ProposalActions({ org, id, canApprove, recipients, sendsNow, label = "Approve" }: {
  org: string; id: string; canApprove: boolean;
  /** Guests a text would reach; null when the proposal isn't a text. */
  recipients?: number | null;
  sendsNow?: boolean;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const go = (decision: "approve" | "reject") => {
    if (decision === "approve" && typeof recipients === "number" && sendsNow) {
      if (!window.confirm(`Sends now to ${recipients} guest${recipients === 1 ? "" : "s"} — Send?`)) return;
    }
    start(async () => {
      const r = await decideProposal(org, id, decision);
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: r.result ?? "Done." });
      // Let the outcome be read, then move it to history.
      if (!r.error) setTimeout(() => router.refresh(), 2500);
    });
  };
  if (msg?.ok) return <p className="pf-msg ok" role="status">{msg.text}</p>;
  return (
    <div className="pf-res-actions" style={{ justifyContent: "flex-start" }}>
      {canApprove ? (
        <>
          <button className="pf-btn ai" disabled={pending} onClick={() => go("approve")}>
            <span aria-hidden>✦</span> {pending ? "Working…" : label}
          </button>
          <button className="pf-btn quiet" disabled={pending} onClick={() => go("reject")}>Dismiss</button>
        </>
      ) : (
        <span className="pf-sub">Waiting for a manager to approve.</span>
      )}
      {msg && !msg.ok && <span className="pf-msg err" role="alert">{msg.text}</span>}
    </div>
  );
}

/** Clear every pending proposal from one station, after a confirm. */
export function DismissAll({ org, agentId, agentName, count }: { org: string; agentId: string; agentName: string; count: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const go = () => {
    if (!window.confirm(`Dismiss all ${count} waiting from ${agentName}? Nothing is sent or changed.`)) return;
    start(async () => {
      const r = await dismissAllAction(org, agentId);
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: r.result ?? "Done." });
      if (!r.error) router.refresh();
    });
  };
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button type="button" className="pf-btn small quiet" disabled={pending || count === 0} onClick={go}>
        {pending ? "Dismissing…" : `Dismiss all from this station (${count})`}
      </button>
      {msg && <span className={`pf-msg ${msg.ok ? "ok" : "err"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</span>}
    </span>
  );
}
