"use client";

import { useState, useTransition } from "react";
import { askWebsiteAgent, type AgentEditResult } from "@/lib/platform/website-agent-actions";
import { PublishVersionButton } from "./VersionActions";

const EXAMPLES = [
  "Closed Thanksgiving Day, open again Friday at 5",
  "The lamb chops are now $52",
  "Add a burrata with heirloom tomatoes to the meze, $19, vegetarian",
];

/** Describe a change; get a draft, a list of what changed, and a preview. */
export function WebsiteAgentBox({ org }: { org: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AgentEditResult | null>(null);
  const [pending, start] = useTransition();

  const go = () =>
    start(async () => {
      setResult(null);
      setResult(await askWebsiteAgent(org, text));
    });

  return (
    <section className="pf-panel" style={{ marginBottom: 14 }}>
      <h2>The Pass · Website</h2>
      <div className="pf-body">
        <p className="pf-sub" style={{ margin: 0 }}>Say what to change. You get a draft to preview — nothing goes live until you publish it.</p>
        <textarea className="pf-input" rows={2} value={text} maxLength={1000} placeholder={EXAMPLES[0]}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) go(); }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="pf-btn ai" disabled={pending || text.trim().length < 4} onClick={go}>
            <span aria-hidden>✦</span> {pending ? "Working on it…" : "Make the change"}
          </button>
          {!text && EXAMPLES.slice(1).map((ex) => (
            <button key={ex} type="button" className="pf-btn small quiet" onClick={() => setText(ex)}>{ex}</button>
          ))}
        </div>
        {result?.error && <p className="pf-msg err" role="alert">{result.error}</p>}
        {result && !result.error && (
          <div className="pf-msg ok" role="status" style={{ display: "grid", gap: 8, color: "var(--ink)" }}>
            {result.summary && <span>{result.summary}</span>}
            {result.changes && result.changes.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)" }}>
                {result.changes.map((c) => <li key={c}>{c}</li>)}
              </ul>
            )}
            {result.versionId && (
              <div style={{ display: "flex", gap: 6 }}>
                <a className="pf-btn small" href={`/r/${org}/website/preview/${result.versionId}`} target="_blank" rel="noreferrer">Preview</a>
                <PublishVersionButton org={org} versionId={result.versionId} label="Publish" />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
