import Link from "next/link";
import { notFound } from "next/navigation";
import { FormButton } from "@/components/platform/FormButton";
import { agentActivity, agentMetrics, type ActivityItem } from "@/lib/agent-runtime/activity";
import { actionWords, actorLabel, AGENT_CARDS } from "@/lib/agent-runtime/catalog";
import { AGENT_GOALS, formatGoal, MAX_INSTRUCTIONS, readAgentSettings } from "@/lib/agent-runtime/settings";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { saveAgentGoalsAction, saveAgentInstructionsAction, setAgentEnabledAction } from "@/lib/platform/agent-settings-actions";
import { can } from "@/lib/platform/tenant";
import { formatIn, venueTz } from "@/lib/platform/when";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = AGENT_CARDS.find((a) => a.id === id);
  return { title: card ? `${card.name} station · The Pass` : "Stations · The Pass" };
}

const PER_PAGE = 20;


const RUN = {
  completed: { text: "Finished", tone: "go" },
  running: { text: "Running", tone: "warn" },
  stopped: { text: "Stopped", tone: "" },
  failed: { text: "Failed", tone: "stop" },
} as Record<string, { text: string; tone: string }>;

const trigger = (t: string) => (t === "schedule" ? "Scheduled" : t.startsWith("request:") ? `Asked by ${t.slice(8)}` : t);

/** One change-log entry, in words. */
function logLine(agentId: string, item: Extract<ActivityItem, { kind: "log" }>): string {
  const d = item.detail as Record<string, { before: unknown; after: unknown } | unknown>;
  if (item.action === "agent.settings_changed") {
    const parts = Object.entries(d).map(([k, v]) => {
      const c = v as { before: unknown; after: unknown };
      if (k === "enabled") return c.after ? "Switched on" : "Switched off";
      if (k === "instructions") return c.after ? "Changed the instructions" : "Cleared the instructions";
      const def = (AGENT_GOALS[agentId] ?? []).find((g) => g.key === k);
      return def ? `${def.label}: ${formatGoal(def, c.before as never)} → ${formatGoal(def, c.after as never)}` : k;
    });
    return parts.join(" · ") || "Settings changed";
  }
  if (item.action === "agent.denied" && typeof d.reason === "string") return `Stopped by a rule: ${d.reason}`;
  return actionWords(item.action);
}

/**
 * One station of The Pass: whether it's on, what the restaurant has told
 * it, its limits, how it's doing, and everything it has done.
 */
export default async function AgentPage({ params, searchParams }: {
  params: Promise<{ org: string; id: string }>;
  searchParams: Promise<{ ok?: string; err?: string; page?: string }>;
}) {
  const { org: slug, id } = await params;
  const q = await searchParams;
  const card = AGENT_CARDS.find((a) => a.id === id);
  if (!card) notFound();
  const { tenant, org, venues } = await requireTenant(slug);
  const tz = venueTz(venues);
  const when = (d: Date) => formatIn(d, tz, "datetime");
  const sql = db()!;
  const page = Math.max(0, Math.floor(Number(q.page) || 0));

  const [settings, metrics, activity] = await Promise.all([
    readAgentSettings(sql, tenant.orgId, id),
    agentMetrics(sql, tenant, id),
    agentActivity(sql, tenant, id, page, PER_PAGE),
  ]);
  const manage = can(tenant, "manage_venue");
  const goals = AGENT_GOALS[id] ?? [];
  const fields = { org: org.slug, agent: id };

  return (
    <>
      <p style={{ margin: "0 0 10px" }}><Link href={`/r/${org.slug}/agents`} className="pf-btn small quiet">← Stations</Link></p>
      <div className="pf-head">
        <div>
          <p className="pf-station-of" style={{ margin: "0 0 4px" }}>The Pass · station</p>
          <h1>{card.name}</h1>
          <p className="pf-sub">{card.does} {card.approval}</p>
        </div>
        <div className="pf-agent-switch">
          <span className={`pf-pill dot ${settings.enabled ? "go" : "stop"}`}>{settings.enabled ? "On" : "Off"}</span>
          {manage && (
            settings.enabled
              ? <FormButton action={setAgentEnabledAction} fields={{ ...fields, enabled: "off" }} className="pf-btn small">Switch off</FormButton>
              : <FormButton action={setAgentEnabledAction} fields={{ ...fields, enabled: "on" }} className="pf-btn small primary">Switch on</FormButton>
          )}
        </div>
      </div>

      {q.ok && <p className="pf-msg ok" role="status" style={{ marginBottom: 14 }}>{q.ok}</p>}
      {q.err && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>{q.err}</p>}
      {!settings.enabled && (
        <p className="pf-msg err" style={{ marginBottom: 14 }}>
          Switched off. The Pass won&rsquo;t work this station on schedule or when asked. Anything it already proposed is still waiting on the Stations page.
        </p>
      )}

      <section className="pf-panel" style={{ marginBottom: 18 }}>
        <h2>Last 28 days</h2>
        <div className="pf-kpis">
          {[["Runs", metrics.runs], ["Proposals", metrics.proposals], ["Approved", metrics.approved], ["Dismissed", metrics.dismissed]].map(([l, v]) => (
            <div key={l} className="pf-kpi"><span className="l">{l}</span><b className="mono">{v}</b></div>
          ))}
        </div>
      </section>

      <div className="pf-layout">
        <section className="pf-panel" aria-label="Activity">
          <h2>Activity</h2>
          {activity.items.length === 0 ? (
            <p className="pf-empty">{page ? "Nothing further back." : "Nothing yet. Runs, proposals and changes to its settings show up here."}</p>
          ) : (
            <ol className="pf-agent-log">
              {activity.items.map((it, i) => (
                <li key={`${it.kind}-${it.at.getTime()}-${i}`}>
                  {it.kind === "run" ? (
                    <>
                      <span className="t">
                        <span className={`pf-pill ${RUN[it.status]?.tone ?? ""}`}>{RUN[it.status]?.text ?? it.status}</span>{" "}
                        Run · {trigger(it.trigger)}
                      </span>
                      {it.summary && <span className="b">{it.summary}</span>}
                      {it.error && <span className="b err">{it.error}</span>}
                    </>
                  ) : (
                    <span className="t">{logLine(id, it)}{!it.actor.startsWith("agent:") && <span className="s"> · {actorLabel(it.actor)}</span>}</span>
                  )}
                  <span className="s mono">{when(it.at)}</span>
                </li>
              ))}
            </ol>
          )}
          {(page > 0 || activity.more) && (
            <div className="pf-body" style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--rule)" }}>
              {page > 0 ? <Link className="pf-btn small" href={`/r/${org.slug}/agents/${id}${page > 1 ? `?page=${page - 1}` : ""}`}>← Newer</Link> : <span />}
              {activity.more && <Link className="pf-btn small" href={`/r/${org.slug}/agents/${id}?page=${page + 1}`}>Older →</Link>}
            </div>
          )}
        </section>

        <aside className="pf-sticky" style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <section className="pf-panel">
            <h2>Your instructions</h2>
            {manage ? (
              <form action={saveAgentInstructionsAction} className="pf-body">
                <input type="hidden" name="org" value={org.slug} />
                <input type="hidden" name="agent" value={id} />
                <div className="pf-field">
                  <label htmlFor="ag-ins">How The Pass should sound here, and what never to say</label>
                  <textarea id="ag-ins" name="instructions" rows={7} maxLength={MAX_INSTRUCTIONS} defaultValue={settings.instructions}
                    placeholder={id === "reviews" ? "e.g. Warm, never stiff. Never mention parking. Call it the patio, not the terrace." : "e.g. Warm and brief. Never offer discounts. We're closed for private events on the first Monday."} />
                </div>
                <p className="pf-sub" style={{ margin: 0 }}>Up to {MAX_INSTRUCTIONS.toLocaleString("en-US")} characters. These shape its voice and choices; they can&rsquo;t switch off approvals, consent or any limit.</p>
                <button className="pf-btn primary">Save instructions</button>
              </form>
            ) : (
              <p className="pf-body" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{settings.instructions || <span className="pf-sub">None.</span>}</p>
            )}
          </section>

          <section className="pf-panel">
            <h2>Limits</h2>
            {goals.length === 0 ? (
              <p className="pf-empty" style={{ padding: "18px 16px" }}>Nothing to set. It only saves drafts; nothing goes live until you publish.</p>
            ) : manage ? (
              <form action={saveAgentGoalsAction} className="pf-body">
                <input type="hidden" name="org" value={org.slug} />
                <input type="hidden" name="agent" value={id} />
                {goals.map((g) => (
                  <div key={g.key} className="pf-field">
                    <label htmlFor={`g-${g.key}`}>{g.label}{g.unit ? ` (${g.unit})` : g.kind === "money" ? " ($ a day)" : ""}</label>
                    {g.kind === "bool" ? (
                      <select id={`g-${g.key}`} name={g.key} defaultValue={settings.goals[g.key] ? "on" : "off"}>
                        <option value="on">On</option>
                        <option value="off">Off</option>
                      </select>
                    ) : g.kind === "text" ? (
                      <input id={`g-${g.key}`} name={g.key} maxLength={g.max} defaultValue={String(settings.goals[g.key] ?? "")} />
                    ) : (
                      <input id={`g-${g.key}`} name={g.key} inputMode="decimal"
                        defaultValue={g.kind === "money" ? (Number(settings.goals[g.key]) / 100).toFixed(2) : String(settings.goals[g.key])} />
                    )}
                    <span className="pf-sub" style={{ fontSize: 12 }}>{g.help}</span>
                  </div>
                ))}
                <button className="pf-btn primary">Save limits</button>
              </form>
            ) : (
              <div className="pf-body">
                {goals.map((g) => <p key={g.key} style={{ margin: 0 }}><span className="pf-sub">{g.label}:</span> {formatGoal(g, settings.goals[g.key])}</p>)}
              </div>
            )}
          </section>
          {settings.updatedBy && settings.updatedAt && (
            <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>Last changed by {settings.updatedBy}, {when(settings.updatedAt)}.</p>
          )}
        </aside>
      </div>
    </>
  );
}
