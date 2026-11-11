import { ProposalActions } from "@/components/platform/ProposalActions";
import { AGENT_CARDS } from "@/lib/agent-runtime/catalog";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

const AGENTS = Object.fromEntries(AGENT_CARDS.map((a) => [a.id, a]));

const ago = (d: Date) => {
  const m = Math.round((Date.now() - d.getTime()) / 60_000);
  if (m < 60) return `${m}m ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

/**
 * What the agents want to do, and what they did. Every proposal shows
 * its reasoning and the exact action; approving runs that action and
 * nothing else.
 */
export default async function Agents({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const { tenant, org } = await requireTenant(slug);
  const sql = db()!;

  const [pending, history, runs, counts] = await Promise.all([
    sql<{ id: string; agent_id: string; title: string; rationale: string; input: { message?: string; guest_ids?: string[] }; created_at: Date }[]>`
      select id, agent_id, title, rationale, input, created_at from agent_proposals
      where org_id = ${tenant.orgId} and status = 'pending' order by created_at desc limit 50`,
    sql<{ id: string; agent_id: string; title: string; status: string; decided_by: string | null; decided_at: Date | null }[]>`
      select id, agent_id, title, status, decided_by, decided_at from agent_proposals
      where org_id = ${tenant.orgId} and status <> 'pending' order by decided_at desc nulls last limit 20`,
    sql<{ agent_id: string; status: string; summary: string | null; started_at: Date }[]>`
      select distinct on (agent_id) agent_id, status, summary, started_at from agent_runs
      where org_id = ${tenant.orgId} order by agent_id, started_at desc`,
    sql<{ agent_id: string; proposed: number; approved: number }[]>`
      select agent_id, count(*)::int as proposed, count(*) filter (where status = 'executed')::int as approved
      from agent_proposals where org_id = ${tenant.orgId} and created_at > now() - interval '28 days' group by agent_id`,
  ]);
  const stats = new Map(counts.map((c) => [c.agent_id, c]));
  const lastRun = new Map(runs.map((r) => [r.agent_id, r]));
  const canMessage = can(tenant, "message_guests");
  // Approving needs the same permission the action does.
  const canApprove = (agent: string) => (agent === "paid_ads" ? can(tenant, "approve_spend") : canMessage);

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Agents</h1>
          <p className="pf-sub">They read your book, your guest list and your ads, and propose. Nothing reaches a guest or spends money until you approve it. Numbers cover the last 28 days.</p>
        </div>
      </div>

      <div className="pf-agents">
        {AGENT_CARDS.map((a) => {
          const run = lastRun.get(a.id);
          const st = stats.get(a.id);
          const on = Boolean(run && Date.now() - run.started_at.getTime() < 14 * 86_400_000);
          return (
            <article key={a.id} className="pf-agent-card">
              <div className="top">
                <span className="ic" aria-hidden><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={a.icon} /></svg></span>
                <span className={`state${on ? " on" : ""}`}>{on ? "Working" : run ? "Idle" : "Not run yet"}</span>
              </div>
              <h3>{a.name}</h3>
              <p className="tags">{a.tags.join(" · ")}</p>
              <p className="does">{a.does}</p>
              <p className="rule">{a.approval}</p>
              <div className="metrics">
                <div><span>Proposed</span><b className="mono">{st?.proposed ?? 0}</b></div>
                <div><span>Approved</span><b className="mono">{st?.approved ?? 0}</b></div>
                <div><span>Last run</span><b className="mono">{run ? ago(run.started_at) : "—"}</b></div>
              </div>
              {run?.summary && <p className="sum">{run.summary}</p>}
            </article>
          );
        })}
      </div>

      <div className="pf-layout">
        <section className="pf-panel" aria-label="Waiting for approval">
          <h2>Waiting for you · {pending.length}</h2>
          {pending.length === 0 ? (
            <p className="pf-empty">Nothing waiting. When an agent wants to act, it shows up here first.</p>
          ) : (
            pending.map((p) => (
              <article key={p.id} id={`p-${p.id}`} style={{ scrollMarginTop: 80, padding: "16px", borderTop: "1px solid var(--rule)", display: "grid", gap: 12 }}>
                <div className="pf-res-meta" style={{ marginTop: 0 }}>
                  <span className="pf-pill dot info">{AGENTS[p.agent_id]?.name ?? p.agent_id}</span>
                  <span className="mono">{ago(p.created_at)}</span>
                </div>
                <div className="pf-res-name">{p.title}</div>
                {p.rationale && <p style={{ margin: 0, color: "var(--muted)" }}>{p.rationale}</p>}
                {(p.input as { reply?: string }).reply && (
                  <blockquote style={{ margin: 0, padding: "12px 14px", borderRadius: 12, background: "oklch(0 0 0 / 0.25)", border: "1px solid var(--rule)" }}>
                    <span className="pf-field"><label style={{ marginBottom: 6 }}>The reply, as it will appear on Google</label></span>
                    {(p.input as { reply?: string }).reply}
                  </blockquote>
                )}
                {p.input.message && (
                  <blockquote style={{ margin: 0, padding: "12px 14px", borderRadius: 12, background: "oklch(0 0 0 / 0.25)", border: "1px solid var(--rule)" }}>
                    <span className="pf-field"><label style={{ marginBottom: 6 }}>The text, as guests will get it</label></span>
                    {p.input.message} <span style={{ color: "var(--faint)" }}>Reply STOP to opt out.</span>
                  </blockquote>
                )}
                <ProposalActions org={org.slug} id={p.id} canApprove={canApprove(p.agent_id)} />
              </article>
            ))
          )}
        </section>

        <aside className="pf-sticky">
          <section className="pf-panel">
            <h2>History</h2>
            {history.length === 0 ? (
              <p className="pf-empty" style={{ padding: "24px 16px" }}>No decisions yet.</p>
            ) : (
              <div className="pf-body">
                {history.map((h) => (
                  <div key={h.id} style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 13.5 }}>{h.title}</span>
                    <span className="pf-res-meta" style={{ marginTop: 0 }}>
                      <span className={`pf-pill ${h.status === "executed" ? "go" : h.status === "rejected" ? "" : "stop"}`}>
                        {{ executed: "Approved", rejected: "Dismissed", blocked: "Blocked", failed: "Failed" }[h.status] ?? h.status}
                      </span>
                      {h.decided_by && <span>{h.decided_by}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
