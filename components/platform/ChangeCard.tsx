import Link from "next/link";
import { FormButton } from "@/components/platform/FormButton";
import { applyChangeAction, dismissChangeAction, undoChangeAction } from "@/lib/assistant/actions";
import type { ChangeRow } from "@/lib/assistant";
import { ACTION_AREAS, type ActionArea } from "@/lib/assistant/chat-actions";
import { formatLever, lever, PILLARS, type Pillar } from "@/lib/levers";

const STATUS = {
  applied: { text: "Applied", tone: "go" },
  pending: { text: "Waiting for you", tone: "warn" },
  undone: { text: "Undone", tone: "" },
  dismissed: { text: "Dismissed", tone: "" },
  failed: { text: "Not applied", tone: "stop" },
} as const;

const ACTION_STATUS = { ...STATUS, applied: { text: "Done", tone: "go" } } as const;

const ago = (d: Date) => {
  const m = Math.max(1, Math.round((Date.now() - d.getTime()) / 60_000));
  return m < 60 ? `${m}m ago` : m < 48 * 60 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

/**
 * One change the assistant made or wants to make, exactly: which setting,
 * before → after, who asked, what happened, and where to see it. An
 * action (a booking, a cancellation, an order, the team) shows what it
 * will do the same way; it has Apply but no Undo.
 */
export function ChangeCard({ c, org, thread, names, canDecide }: { c: ChangeRow; org: string; thread: string; names: Map<string, string>; canDecide: boolean }) {
  if (c.kind === "action") return <ActionCard c={c} org={org} thread={thread} canDecide={canDecide} />;
  const pillar = c.pillar as Pillar;
  const def = lever(c.pillar, c.lever);
  const fmt = (v: unknown) => (def ? formatLever(def, v as never, names) : JSON.stringify(v));
  const s = STATUS[c.status];
  const fields = { org, id: c.id, thread };
  return (
    <article id={`c-${c.id}`} className={`pf-change ${c.status}`}>
      <div className="h">
        <span className="where">{PILLARS[pillar]?.label ?? c.pillar} · {c.label}</span>
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
          {PILLARS[pillar] && <Link href={`/r/${org}/${PILLARS[pillar].page}#levers`} className="pf-btn small quiet">See it in {PILLARS[pillar].label} →</Link>}
        </span>
      </div>
    </article>
  );
}

function ActionCard({ c, org, thread, canDecide }: { c: ChangeRow; org: string; thread: string; canDecide: boolean }) {
  const area = ACTION_AREAS[c.pillar as ActionArea];
  const s = ACTION_STATUS[c.status];
  const fields = { org, id: c.id, thread };
  const text = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : JSON.stringify(v));
  const before = text(c.before);
  return (
    <article id={`c-${c.id}`} className={`pf-change action ${c.status}`}>
      <div className="h">
        <span className="where">{area?.label ?? c.pillar} · {c.label}</span>
        <span className={`pf-pill dot ${s.tone}`}>{s.text}</span>
      </div>
      <div className="diff">
        <span className="before" aria-label="Now">{before}</span>
        <span className="arrow" aria-hidden>→</span>
        <span className="after" aria-label={before ? "After" : "Will be made"}>{text(c.after)}</span>
      </div>
      {c.reason && <p className="why">{c.reason}</p>}
      {c.error && <p className="pf-msg err" style={{ margin: 0, fontSize: 12.5 }}>{c.error}</p>}
      <div className="f">
        <span className="who mono">
          {c.status === "pending" ? `Proposed ${ago(c.created_at)} · nothing happens until you press Apply` :
            `${c.status === "applied" ? "Done by " + (c.decided_by ?? "") + " · can't be undone here, ask to reverse it" : c.status === "dismissed" ? "Dismissed" : "Not done"} · ${ago(c.decided_at ?? c.created_at)}`}
        </span>
        <span className="acts">
          {c.status === "pending" && canDecide && (
            <>
              <FormButton action={applyChangeAction} fields={fields} className="pf-btn small primary">Apply</FormButton>
              <FormButton action={dismissChangeAction} fields={fields} className="pf-btn small quiet">Dismiss</FormButton>
            </>
          )}
          {area && <Link href={`/r/${org}/${area.page}`} className="pf-btn small quiet">See it in {area.label} →</Link>}
        </span>
      </div>
    </article>
  );
}
