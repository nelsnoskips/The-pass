"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import clsx from "clsx";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStoredState } from "@/lib/useStoredState";
import type {
  AgentDefinition,
  AgentProposal,
  Confidence,
  Decision,
} from "@/lib/agents/types";

const CONFIDENCE_TONE: Record<Confidence, BadgeTone> = {
  high: "emerald",
  medium: "champagne",
  low: "slate",
};

type View = "open" | "approved" | "dismissed";

interface StoredDecision {
  decision: Decision;
  at: string;
}

/**
 * The approval queue. Decisions are recorded per brand in this browser
 * while the platform runs on demo data; the server-side record (and the
 * push to Google/Meta) arrives with the live connectors. Proposals that
 * no longer fire drop out of the queue on their own, so a stored decision
 * for a vanished id is harmless.
 */
export function AgentQueue({
  proposals,
  agents,
  canAct,
  storageKey,
}: {
  proposals: AgentProposal[];
  agents: AgentDefinition[];
  canAct: boolean;
  storageKey: string;
}) {
  const [decisions, setDecisions, loaded] = useStoredState<Record<string, StoredDecision>>(
    storageKey,
    {},
  );
  const [view, setView] = useState<View>("open");
  const [agentFilter, setAgentFilter] = useState<string>("all");

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;
  const liveAgents = agents.filter((a) => a.status === "live");

  const buckets = useMemo(() => {
    const b: Record<View, AgentProposal[]> = { open: [], approved: [], dismissed: [] };
    for (const p of proposals) {
      if (agentFilter !== "all" && p.agent !== agentFilter) continue;
      const d = decisions[p.id]?.decision;
      b[d ?? "open"].push(p);
    }
    return b;
  }, [proposals, decisions, agentFilter]);

  const decide = (id: string, decision: Decision | null) =>
    setDecisions((prev) => {
      const next = { ...prev };
      if (decision) next[id] = { decision, at: new Date().toISOString() };
      else delete next[id];
      return next;
    });

  const shown = buckets[view];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Proposal status" className="flex gap-1 rounded-xl border border-line bg-surface p-1">
          {(["open", "approved", "dismissed"] as View[]).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors",
                view === v ? "bg-ink text-white" : "text-slate hover:text-ink",
              )}
            >
              {v === "open" ? "To review" : v}
              <span className="ml-1.5 tabular-nums opacity-70">{loaded ? buckets[v].length : "·"}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-slate">
          Agent
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[12.5px] text-ink"
          >
            <option value="all">All agents</option>
            {liveAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!canAct && (
        <p className="rounded-xl bg-canvas px-4 py-2.5 text-[12.5px] text-slate">
          You can read the queue. Approving changes to spend is up to the account&apos;s marketer or admin.
        </p>
      )}

      {shown.length === 0 ? (
        <EmptyState
          title={view === "open" ? "Nothing waiting on you" : `Nothing ${view} yet`}
          body={
            view === "open"
              ? "The agents found nothing worth changing in this range. They re-check every time the data syncs."
              : "Decisions you make in the queue show up here."
          }
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((p) => {
            const d = decisions[p.id];
            return (
              <li key={p.id}>
                <Card as="article" className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="cobalt">{agentName(p.agent)}</Badge>
                    <Badge tone={CONFIDENCE_TONE[p.confidence]}>
                      {p.confidence} confidence
                    </Badge>
                    {d && (
                      <span className="text-[11.5px] text-slate">
                        {d.decision === "approved" ? "Approved" : "Dismissed"}{" "}
                        {new Date(d.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2.5 text-[15.5px] font-semibold leading-snug text-ink">{p.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink/80">{p.rationale}</p>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                    {p.evidence.map((e) => (
                      <div key={e.label}>
                        <dt className="micro-label text-slate">{e.label}</dt>
                        <dd className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink">{e.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-3 rounded-xl bg-canvas px-3.5 py-2.5">
                    <p className="micro-label text-champagne">The change</p>
                    <p className="mt-0.5 text-[13px] text-ink">{p.action}</p>
                    {p.impact && <p className="mt-1.5 text-[12.5px] text-slate">{p.impact}</p>}
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    {canAct && !d && (
                      <>
                        <button
                          onClick={() => decide(p.id, "approved")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-cobalt px-3.5 py-2 text-[13px] font-medium text-white hover:bg-cobalt/90"
                        >
                          <Check size={15} aria-hidden /> Approve
                        </button>
                        <button
                          onClick={() => decide(p.id, "dismissed")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-[13px] font-medium text-ink hover:bg-canvas"
                        >
                          <X size={15} aria-hidden /> Dismiss
                        </button>
                      </>
                    )}
                    {canAct && d && (
                      <button
                        onClick={() => decide(p.id, null)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-[13px] font-medium text-ink hover:bg-canvas"
                      >
                        <RotateCcw size={14} aria-hidden /> Undo
                      </button>
                    )}
                    <Link href={p.href} className="ml-auto text-[12.5px] font-medium text-cobalt hover:underline">
                      See the data →
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
