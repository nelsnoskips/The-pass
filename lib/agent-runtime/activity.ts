import type { Sql } from "postgres";
import { assertCan, type Tenant } from "../platform/tenant";

/**
 * What one agent has been doing for one restaurant: its numbers for the
 * last 28 days, and a paged log of its runs, its own change-log entries
 * (actor agent:<id>) and changes people made to its settings.
 */

export interface AgentMetrics { runs: number; proposals: number; approved: number; dismissed: number }

export async function agentMetrics(sql: Sql, t: Tenant, agentId: string, now = new Date()): Promise<AgentMetrics> {
  assertCan(t, "view");
  const since = new Date(now.getTime() - 28 * 86_400_000);
  const [[r], [p]] = await Promise.all([
    sql<{ runs: number }[]>`select count(*)::int as runs from agent_runs
      where org_id = ${t.orgId} and agent_id = ${agentId} and started_at > ${since}`,
    sql<{ proposals: number; approved: number; dismissed: number }[]>`
      select count(*)::int as proposals,
             count(*) filter (where status = 'executed')::int as approved,
             count(*) filter (where status = 'rejected')::int as dismissed
      from agent_proposals where org_id = ${t.orgId} and agent_id = ${agentId} and created_at > ${since}`,
  ]);
  return { runs: r.runs, ...p };
}

export type ActivityItem =
  | { kind: "run"; at: Date; status: string; summary: string | null; error: string | null; trigger: string; finishedAt: Date | null }
  | { kind: "log"; at: Date; actor: string; action: string; detail: Record<string, unknown> };

export async function agentActivity(
  sql: Sql, t: Tenant, agentId: string, page = 0, perPage = 20,
): Promise<{ items: ActivityItem[]; more: boolean }> {
  assertCan(t, "view");
  const p = Math.max(0, Math.floor(page));
  const rows = await sql<{ kind: "run" | "log"; at: Date; status: string | null; summary: string | null; error: string | null;
    who: string; action: string | null; detail: Record<string, unknown> | null; finished_at: Date | null }[]>`
    select * from (
      select 'run' as kind, started_at as at, status, summary, error, trigger as who,
             null::text as action, null::jsonb as detail, finished_at
      from agent_runs where org_id = ${t.orgId} and agent_id = ${agentId}
      union all
      select 'log', created_at, null, null, null, actor, action, detail, null
      from change_log
      where org_id = ${t.orgId}
        and (actor = ${`agent:${agentId}`} or (entity = 'agent_settings' and entity_id = ${agentId}))
    ) x
    order by at desc
    limit ${perPage + 1} offset ${p * perPage}`;
  const items = rows.slice(0, perPage).map((r): ActivityItem => r.kind === "run"
    ? { kind: "run", at: r.at, status: r.status ?? "", summary: r.summary, error: r.error, trigger: r.who, finishedAt: r.finished_at }
    : { kind: "log", at: r.at, actor: r.who, action: r.action ?? "", detail: r.detail ?? {} });
  return { items, more: rows.length > perPage };
}
