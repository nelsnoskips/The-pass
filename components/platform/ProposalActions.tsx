"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideProposal } from "@/lib/platform/agent-actions";

export function ProposalActions({ org, id, canApprove }: { org: string; id: string; canApprove: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const go = (decision: "approve" | "reject") =>
    start(async () => {
      const r = await decideProposal(org, id, decision);
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: r.result ?? "Done." });
      // Let the outcome be read, then move it to history.
      if (!r.error) setTimeout(() => router.refresh(), 2500);
    });
  if (msg?.ok) return <p className="pf-msg ok" role="status">{msg.text}</p>;
  return (
    <div className="pf-res-actions" style={{ justifyContent: "flex-start" }}>
      {canApprove ? (
        <>
          <button className="pf-btn ai" disabled={pending} onClick={() => go("approve")}>
            <span aria-hidden>✦</span> {pending ? "Working…" : "Approve & send"}
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
