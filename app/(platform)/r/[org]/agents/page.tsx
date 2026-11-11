import { ProposalActions } from "@/components/platform/ProposalActions";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

const AGENTS: Record<string, { name: string; what: string }> = {
  reservations: { name: "Reservations Agent", what: "Watches the book for quiet nights and fills them from your own regulars." },
  reviews: { name: "Reviews Agent", what: "Drafts a reply to every new Google review, for you to post." },
};

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

  const [pending, history, runs] = await Promise.all([
    sql<{ id: string; agent_id: string; title: string; rationale: string; input: { message?: string; guest_ids?: string[] }; created_at: Date }[]>`
      select id, agent_id, title, rationale, input, created_at from agent_proposals
      where org_id = ${tenant.orgId} and status = 'pending' order by created_at desc limit 50`,
    sql<{ id: string; agent_id: string; title: string; status: string; decided_by: string | null; decided_at: Date | null }[]>`
      select id, agent_id, title, status, decided_by, decided_at from agent_proposals
      where org_id = ${tenant.orgId} and status <> 'pending' order by decided_at desc nulls last limit 20`,
    sql<{ agent_id: string; status: string; summary: string | null; started_at: Date }[]>`
      select distinct on (agent_id) agent_id, status, summary, started_at from agent_runs
      where org_id = ${tenant.orgId} order by agent_id, started_at desc`,
  ]);
  const lastRun = new Map(runs.map((r) => [r.agent_id, r]));
  const canMessage = can(tenant, "message_guests");

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Agents</h1>
          <p className="pf-sub">They read your book and your guest list, and propose. Nothing reaches a guest until you approve it.</p>
        </div>
      </div>

      <div className="pf-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {Object.entries(AGENTS).map(([id, a]) => {
          const run = lastRun.get(id);
          return (
            <div key={id} className={`pf-stat${run ? " live" : ""}`}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{a.name}</div>
              <span style={{ display: "block", marginTop: 4 }}>{a.what}</span>
              <span className="mono" style={{ display: "block", marginTop: 10, color: "var(--faint)" }}>
                {run ? `Last run ${ago(run.started_at)} · ${run.status}` : "Not run yet · runs on a schedule"}
              </span>
              {run?.summary && <span style={{ display: "block", marginTop: 8, color: "var(--ink)" }}>{run.summary}</span>}
            </div>
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
              <article key={p.id} style={{ padding: "16px", borderTop: "1px solid var(--rule)", display: "grid", gap: 12 }}>
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
                <ProposalActions org={org.slug} id={p.id} canApprove={canMessage} />
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
