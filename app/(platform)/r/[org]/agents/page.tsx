import { includes, planFor, type Feature } from "@/lib/billing/entitlements";
import Link from "next/link";
import { DismissAll, ProposalActions } from "@/components/platform/ProposalActions";
import { actorLabel, AGENT_CARDS, agentName, wantsTo } from "@/lib/agent-runtime/catalog";
import { readAllAgentSettings } from "@/lib/agent-runtime/settings";
import { db } from "@/lib/db";
import { approvalPermission, canDismissAll, isStale, proposalRecipients, sendTiming, type Recipient } from "@/lib/platform/approvals";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { ago, formatIn, venueTz } from "@/lib/platform/when";
import { formatPhone } from "@/lib/sites/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stations · The Pass" };

const AGENTS = Object.fromEntries(AGENT_CARDS.map((a) => [a.id, a]));
const quote = { margin: 0, padding: "12px 14px", borderRadius: 12, background: "oklch(0 0 0 / 0.25)", border: "1px solid var(--rule)" } as const;

/**
 * What The Pass is doing, station by station. The approvals queue first
 * — what it wants to do, who it reaches, when it would happen — then the
 * stations themselves and what was decided. Approving runs exactly the
 * stored action and nothing else. (The URL stays /agents.)
 */
export default async function Stations({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ agent?: string }> }) {
  const { org: slug } = await params;
  const q = await searchParams;
  const { tenant, org, venues } = await requireTenant(slug);
  const tz = venueTz(venues);
  const sql = db()!;
  const filter = q.agent && AGENTS[q.agent] ? q.agent : null;
  const now = new Date();

  const [pending, waitingBy, history, runs, counts, lastProposed] = await Promise.all([
    sql<{ id: string; agent_id: string; tool: string; title: string; rationale: string; input: { message?: string; guest_ids?: string[]; reply?: string }; created_at: Date }[]>`
      select id, agent_id, tool, title, rationale, input, created_at from agent_proposals
      where org_id = ${tenant.orgId} and status = 'pending' ${filter ? sql`and agent_id = ${filter}` : sql``}
      order by created_at desc limit 30`,
    sql<{ agent_id: string; n: number }[]>`
      select agent_id, count(*)::int as n from agent_proposals where org_id = ${tenant.orgId} and status = 'pending' group by agent_id`,
    sql<{ id: string; agent_id: string; title: string; status: string; decided_by: string | null; decided_at: Date | null }[]>`
      select id, agent_id, title, status, decided_by, decided_at from agent_proposals
      where org_id = ${tenant.orgId} and status <> 'pending' order by decided_at desc nulls last limit 20`,
    sql<{ agent_id: string; status: string; summary: string | null; started_at: Date }[]>`
      select distinct on (agent_id) agent_id, status, summary, started_at from agent_runs
      where org_id = ${tenant.orgId} order by agent_id, started_at desc`,
    sql<{ agent_id: string; proposed: number; approved: number }[]>`
      select agent_id, count(*)::int as proposed, count(*) filter (where status = 'executed')::int as approved
      from agent_proposals where org_id = ${tenant.orgId} and created_at > now() - interval '28 days' group by agent_id`,
    sql<{ agent_id: string; last: Date }[]>`
      select agent_id, max(created_at) as last from agent_proposals where org_id = ${tenant.orgId} group by agent_id`,
  ]);
  const recipients = new Map<string, Recipient[]>(await Promise.all(
    pending.filter((p) => Array.isArray(p.input.guest_ids)).map(async (p) => [p.id, await proposalRecipients(sql, tenant, p.input.guest_ids)] as [string, Recipient[]]),
  ));
  const [settings, plan] = await Promise.all([readAllAgentSettings(sql, tenant.orgId), planFor(sql, tenant.orgId)]);
  const stats = new Map(counts.map((c) => [c.agent_id, c]));
  const lastRun = new Map(runs.map((r) => [r.agent_id, r]));
  const lastProp = new Map(lastProposed.map((r) => [r.agent_id, r.last]));
  const waiting = new Map(waitingBy.map((w) => [w.agent_id, w.n]));
  const totalWaiting = waitingBy.reduce((s, w) => s + w.n, 0);
  const shownWaiting = filter ? (waiting.get(filter) ?? 0) : totalWaiting;
  // Approving needs the same permission the action does.
  const canApprove = (agent: string) => can(tenant, approvalPermission(agent));
  const timing = sendTiming(now, tz);
  const base = `/r/${org.slug}/agents`;

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Stations</h1>
          <p className="pf-sub">What The Pass is doing, station by station. Nothing reaches a guest or spends money until you approve it.</p>
        </div>
      </div>

      <section className="pf-panel pf-queue" id="queue" aria-label="Waiting for your approval" style={{ marginBottom: 22 }}>
        <h2>Waiting for you · {totalWaiting}</h2>
        {totalWaiting > 0 && (
          <nav className="pf-filters" aria-label="Filter by station">
            <Link href={`${base}#queue`} className="pf-chip" aria-current={!filter ? "page" : undefined}>All · {totalWaiting}</Link>
            {AGENT_CARDS.filter((a) => waiting.get(a.id)).map((a) => (
              <Link key={a.id} href={`${base}?agent=${a.id}#queue`} className="pf-chip" aria-current={filter === a.id ? "page" : undefined}>{a.name} · {waiting.get(a.id)}</Link>
            ))}
            {filter && canDismissAll(tenant, filter) && (
              <span style={{ marginLeft: "auto" }}><DismissAll org={org.slug} agentId={filter} agentName={agentName(filter)} count={waiting.get(filter) ?? 0} /></span>
            )}
          </nav>
        )}
        {pending.length === 0 ? (
          <p className="pf-empty">Nothing waiting. When The Pass wants to act, it shows up here first.</p>
        ) : (
          <>
            {!filter && totalWaiting > 1 && (
              <p className="pf-sub" style={{ margin: 0, padding: "10px 16px 0" }}>Pick a station above to see only its proposals, or to dismiss them all at once.</p>
            )}
            {pending.map((p) => {
              const stale = isStale(p.created_at, now);
              const who = recipients.get(p.id);
              const textable = who?.filter((r) => r.canText) ?? [];
              const isText = Boolean(p.input.message) && who !== undefined;
              return (
                <article key={p.id} id={`p-${p.id}`} className="pf-proposal">
                  <div className="pf-res-meta" style={{ marginTop: 0 }}>
                    <span className="pf-pill dot info">Proposed by {actorLabel(`agent:${p.agent_id}`)}</span>
                    <span className="mono"><time dateTime={p.created_at.toISOString()} title={formatIn(p.created_at, tz, "long")}>{ago(p.created_at)}</time></span>
                    {stale && <span className="pf-pill warn">Stale — numbers from {formatIn(p.created_at, tz, "datetime")}</span>}
                  </div>
                  <div className="pf-res-name">{wantsTo(p.title)}</div>
                  {p.rationale && <p style={{ margin: 0, color: "var(--muted)" }}>{p.rationale}</p>}
                  {stale && <p className="pf-sub" style={{ margin: 0 }}>This was drawn up more than a day ago. Consent and opt-outs are checked again when you approve; the reasoning may be out of date.</p>}
                  {p.input.reply && (
                    <blockquote style={quote}>
                      <span className="pf-field"><label style={{ marginBottom: 6 }}>The reply, as it will appear on Google</label></span>
                      {p.input.reply}
                    </blockquote>
                  )}
                  {p.input.message && (
                    <blockquote style={quote}>
                      <span className="pf-field"><label style={{ marginBottom: 6 }}>The text, as guests will get it</label></span>
                      {p.input.message} <span style={{ color: "var(--faint)" }}>Reply STOP to opt out.</span>
                    </blockquote>
                  )}
                  {isText && who && (
                    <details className="pf-recipients" open={who.length <= 6}>
                      <summary>
                        Who gets it · <b>{textable.length}</b> guest{textable.length === 1 ? "" : "s"}
                        {who.length > textable.length && <span className="pf-sub"> · {who.length - textable.length} skipped (no consent on record or opted out)</span>}
                      </summary>
                      <div className="pf-scroll">
                        <table className="pf-table">
                          <thead><tr><th>Guest</th><th>Last visit</th><th>Consent</th></tr></thead>
                          <tbody>
                            {who.map((r) => (
                              <tr key={r.id}>
                                <td><Link href={`/r/${org.slug}/guests/${r.id}`}>{r.name}</Link><div className="pf-sub" style={{ margin: 0 }}>{r.phone.startsWith("+") ? formatPhone(r.phone) : "No mobile number"}</div></td>
                                <td className="num">{r.lastVisitAt ? formatIn(r.lastVisitAt, tz, "date") : "—"}<div className="pf-sub" style={{ margin: 0 }}>{r.visits} visit{r.visits === 1 ? "" : "s"}</div></td>
                                <td>
                                  {r.optedOutAt ? <span className="pf-pill stop">Opted out {formatIn(r.optedOutAt, tz, "day")} · skipped</span>
                                    : r.consentAt && r.canText ? <span>Said yes {formatIn(r.consentAt, tz, "date")}{r.consentSource ? ` via ${r.consentSource}` : ""}</span>
                                    : <span className="pf-pill">No consent on record · skipped</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                  {isText && <p className="pf-sub" style={{ margin: 0 }}><b style={{ color: "var(--ink)", fontWeight: 600 }}>When it sends:</b> {timing.text} Anyone texted by another campaign this week is skipped.</p>}
                  <ProposalActions org={org.slug} id={p.id} canApprove={canApprove(p.agent_id)}
                    recipients={isText ? textable.length : null} sendsNow={timing.now}
                    label={isText ? "Approve & send" : p.input.reply ? "Approve & post" : "Approve"} />
                </article>
              );
            })}
            {shownWaiting > pending.length && (
              <p className="pf-sub" style={{ margin: 0, padding: "12px 16px" }}>Showing the newest {pending.length} of {shownWaiting}. Decide or dismiss these to see the rest.</p>
            )}
          </>
        )}
      </section>

      <div className="pf-agents">
        {AGENT_CARDS.map((a) => {
          const run = lastRun.get(a.id);
          const st = stats.get(a.id);
          const off = settings.get(a.id)?.enabled === false;
          // Proposals are activity too: a station with work in the queue has run.
          const last = [run?.started_at, lastProp.get(a.id)].filter((d): d is Date => Boolean(d)).sort((x, y) => y.getTime() - x.getTime())[0] ?? null;
          const outOfPlan = !includes(plan, `station:${a.id}` as Feature);
          const on = !off && !outOfPlan && Boolean(last && now.getTime() - last.getTime() < 14 * 86_400_000);
          if (outOfPlan) {
            return (
              <article key={a.id} className="pf-agent-card pf-agent-out">
                <div className="top">
                  <span className="ic" aria-hidden><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={a.icon} /></svg></span>
                  <span className="state off">In The Pass plan</span>
                </div>
                <h3><Link href={`/r/${org.slug}/agents/${a.id}`} className="pf-agent-link">{a.name}</Link></h3>
                <p className="pf-station-of">Station of The Pass</p>
                <p className="does">{a.does}</p>
                <p className="rule">Not running: this station comes with The Pass plan. Nothing it did before has been deleted.</p>
                <p className="more"><Link href={`/r/${org.slug}/agents/${a.id}`}>What it would do →</Link></p>
              </article>
            );
          }
          return (
            <article key={a.id} className="pf-agent-card">
              <div className="top">
                <span className="ic" aria-hidden><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={a.icon} /></svg></span>
                <span className={`state${on ? " on" : ""}${off ? " off" : ""}`}>{off ? "Off" : on ? "Working" : last ? "Idle" : "Not run yet"}</span>
              </div>
              <h3><Link href={`/r/${org.slug}/agents/${a.id}`} className="pf-agent-link">{a.name}</Link></h3>
              <p className="pf-station-of">Station of The Pass</p>
              <p className="tags">{a.tags.join(" · ")}</p>
              <p className="does">{a.does}</p>
              <p className="rule">{a.approval}</p>
              <div className="metrics">
                <div><span>Proposed</span><b className="mono">{st?.proposed ?? 0}</b></div>
                <div><span>Approved</span><b className="mono">{st?.approved ?? 0}</b></div>
                <div><span>Last active</span><b className="mono">{last ? ago(last) : "—"}</b></div>
              </div>
              {waiting.get(a.id) ? <p className="sum"><Link href={`${base}?agent=${a.id}#queue`}>{waiting.get(a.id)} waiting for you</Link></p> : null}
              {run?.summary && <p className="sum">{run.summary}</p>}
              <p className="more"><Link href={`/r/${org.slug}/agents/${a.id}`}>Settings and activity →</Link></p>
            </article>
          );
        })}
      </div>
      <p className="pf-sub" style={{ margin: "-10px 0 22px" }}>Proposed and approved cover the last 28 days.</p>

      <section className="pf-panel">
        <h2>Decided</h2>
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
                  {h.decided_by && <span>{actorLabel(h.decided_by)}</span>}
                  {h.decided_at && <span className="mono">{formatIn(h.decided_at, tz, "datetime")}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
