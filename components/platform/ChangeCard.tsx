import Link from "next/link";
import { FormButton } from "@/components/platform/FormButton";
import { applyChangeAction, dismissChangeAction, undoChangeAction } from "@/lib/assistant/actions";
import type { ChangeRow } from "@/lib/assistant";
import { ACTION_AREAS, type ActionArea } from "@/lib/assistant/chat-actions";
import { formatLever, lever, PILLARS, type Pillar } from "@/lib/levers";
import { ago, DEFAULT_TZ } from "@/lib/platform/when";

const STATUS = {
  applied: { text: "Applied", tone: "go" },
  pending: { text: "Waiting for you", tone: "warn" },
  undone: { text: "Undone", tone: "" },
  dismissed: { text: "Dismissed", tone: "" },
  failed: { text: "Not applied", tone: "stop" },
} as const;

const ACTION_STATUS = { ...STATUS, applied: { text: "Done", tone: "go" } } as const;

/** Who did it, always by name: the person who pressed the button, or who asked. */
const by = (c: ChangeRow) => c.decided_by || c.requested_by || "someone";

/** A pause that has already run out can't usefully be undone. */
function expired(c: ChangeRow, now = Date.now()): boolean {
  const def = lever(c.pillar, c.lever);
  if (def?.kind !== "minutes_from_now") return false;
  const until = typeof c.after === "string" ? new Date(c.after).getTime() : NaN;
  return c.after === null || !Number.isFinite(until) || until <= now;
}

/**
 * One change the assistant made or wants to make, exactly: which setting,
 * before → after, who asked, what happened, and where to see it. An
 * action (a booking, a cancellation, an order, the team) shows what it
 * will do the same way; it has Apply but no Undo.
 */
export function ChangeCard({ c, org, thread, names, canDecide, tz = DEFAULT_TZ }: { c: ChangeRow; org: string; thread: string; names: Map<string, string>; canDecide: boolean; tz?: string }) {
  if (c.kind === "action") return <ActionCard c={c} org={org} thread={thread} canDecide={canDecide} />;
  const pillar = c.pillar as Pillar;
  const def = lever(c.pillar, c.lever);
  const fmt = (v: unknown) => (def ? formatLever(def, v as never, names, tz) : JSON.stringify(v));
  const ran = c.status === "applied" && expired(c);
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
          {c.status === "pending" ? `Asked by ${c.requested_by} · proposed ${ago(c.created_at)} · needs your Apply` :
            `${c.status === "applied" ? (c.risk === "auto" ? `Applied at once for ${by(c)}` : `Applied by ${by(c)}`) : c.status === "undone" ? `Undone by ${by(c)}` : c.status === "dismissed" ? `Dismissed by ${by(c)}` : `Failed for ${by(c)}`} · ${ago(c.decided_at ?? c.created_at)}${ran ? " · the pause has ended" : ""}`}
        </span>
        <span className="acts">
          {c.status === "pending" && canDecide && (
            <>
              <FormButton action={applyChangeAction} fields={fields} className="pf-btn small primary">Apply</FormButton>
              <FormButton action={dismissChangeAction} fields={fields} className="pf-btn small quiet">Dismiss</FormButton>
            </>
          )}
          {c.status === "applied" && canDecide && !ran && <FormButton action={undoChangeAction} fields={fields} className="pf-btn small">Undo</FormButton>}
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
          {c.status === "pending" ? `Asked by ${c.requested_by} · proposed ${ago(c.created_at)} · nothing happens until you press Apply` :
            `${c.status === "applied" ? `Done by ${by(c)} · can't be undone here, ask to reverse it` : c.status === "dismissed" ? `Dismissed by ${by(c)}` : `Not done (asked by ${c.requested_by})`} · ${ago(c.decided_at ?? c.created_at)}`}
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
