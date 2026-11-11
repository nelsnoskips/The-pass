import Link from "next/link";
import { FormButton } from "@/components/platform/FormButton";
import { applyChangeAction, dismissChangeAction, undoChangeAction } from "@/lib/assistant/actions";
import type { ChangeRow } from "@/lib/assistant";
import { formatLever, lever, PILLARS } from "@/lib/levers";

const STATUS = {
  applied: { text: "Applied", tone: "go" },
  pending: { text: "Waiting for you", tone: "warn" },
  undone: { text: "Undone", tone: "" },
  dismissed: { text: "Dismissed", tone: "" },
  failed: { text: "Not applied", tone: "stop" },
} as const;

const ago = (d: Date) => {
  const m = Math.max(1, Math.round((Date.now() - d.getTime()) / 60_000));
  return m < 60 ? `${m}m ago` : m < 48 * 60 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

/**
 * One change the assistant made or wants to make, exactly: which setting,
 * before → after, who asked, what happened, and where to see it.
 */
export function ChangeCard({ c, org, thread, names, canDecide }: { c: ChangeRow; org: string; thread: string; names: Map<string, string>; canDecide: boolean }) {
  const def = lever(c.pillar, c.lever);
  const fmt = (v: unknown) => (def ? formatLever(def, v as never, names) : JSON.stringify(v));
  const s = STATUS[c.status];
  const fields = { org, id: c.id, thread };
  return (
    <article id={`c-${c.id}`} className={`pf-change ${c.status}`}>
      <div className="h">
        <span className="where">{PILLARS[c.pillar]?.label ?? c.pillar} · {c.label}</span>
        <span className={`pf-pill dot ${s.tone}`}>{s.text}</span>
      </div>
      <div className="diff">
        <span className="before" aria-label="Before">{fmt(c.before)}</span>
        <span className="arrow" aria-hidden>→</span>
        <span className="after" aria-label="After">{fmt(c.after)}</span>
      </div>
      {c.reason && <p className="why">{c.reason}</p>}
      {c.error && <p className="pf-msg err" style={{ margin: 0, fontSize: 12.5 }}>{c.error}</p>}
      <div className="f">
        <span className="who mono">
          {c.status === "pending" ? `Proposed ${ago(c.created_at)} · needs your Apply` :
            `${c.status === "applied" ? (c.risk === "auto" ? "Applied" : "Applied by " + (c.decided_by ?? "")) : c.status === "undone" ? "Undone by " + (c.decided_by ?? "") : c.status === "dismissed" ? "Dismissed" : "Failed"} · ${ago(c.decided_at ?? c.created_at)}`}
        </span>
        <span className="acts">
          {c.status === "pending" && canDecide && (
            <>
              <FormButton action={applyChangeAction} fields={fields} className="pf-btn small primary">Apply</FormButton>
              <FormButton action={dismissChangeAction} fields={fields} className="pf-btn small quiet">Dismiss</FormButton>
            </>
          )}
          {c.status === "applied" && canDecide && <FormButton action={undoChangeAction} fields={fields} className="pf-btn small">Undo</FormButton>}
          {PILLARS[c.pillar] && <Link href={`/r/${org}/${PILLARS[c.pillar].page}#levers`} className="pf-btn small quiet">See it in {PILLARS[c.pillar].label} →</Link>}
        </span>
      </div>
    </article>
  );
}
