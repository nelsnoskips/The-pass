import type { Sql } from "postgres";
import { log } from "../reservations/repo";
import { assertCan, type Tenant } from "../platform/tenant";
import { evaluate } from "./policy";
import type { AgentContext, ToolDef } from "./tool";

/**
 * Approving runs exactly the stored tool call — no model involved — after
 * re-checking policy, because the world may have changed since the agent
 * proposed it (a guest opted out, a budget cap moved).
 */

export type ApproveResult =
  | { ok: true; result: unknown }
  | { ok: false; reason: "not_found" | "already_decided" | "blocked" | "failed" | "not_now"; detail?: string };

export async function approveProposal(
  sql: Sql,
  tenant: Tenant,
  proposalId: string,
  tools: ToolDef[],
  now = new Date(),
): Promise<ApproveResult> {
  const [pending] = await sql<{ tool: string; status: string }[]>`
    select tool, status from agent_proposals where id = ${proposalId} and org_id = ${tenant.orgId}`;
  if (!pending) return { ok: false, reason: "not_found" };
  if (pending.status !== "pending") return { ok: false, reason: "already_decided" };

  // The approver needs the permission themselves — checked before the
  // proposal is claimed, so a refusal leaves it pending for someone who can.
  const tool = tools.find((t) => t.name === pending.tool);
  if (tool) assertCan(tenant, tool.requires);

  // Claim it: only one approval can win.
  const [p] = await sql<{ id: string; agent_id: string; tool: string; input: Record<string, unknown>; run_id: string | null }[]>`
    update agent_proposals set status = 'executed', decided_by = ${tenant.actor}, decided_at = now()
    where id = ${proposalId} and org_id = ${tenant.orgId} and status = 'pending'
    returning id, agent_id, tool, input, run_id`;
  if (!p) return { ok: false, reason: "already_decided" };

  const fail = async (status: "blocked" | "failed", detail: string) => {
    await sql`update agent_proposals set status = ${status}, result = ${sql.json({ error: detail })} where id = ${p.id}`;
    await log(sql, tenant.orgId, tenant.actor, `agent.proposal_${status}`, "agent_proposal", p.id, { detail });
    return { ok: false as const, reason: status, detail };
  };
  if (!tool) return fail("failed", `Tool ${p.tool} no longer exists.`);

  const ctx: AgentContext = {
    sql, now, agentId: p.agent_id, runId: p.run_id,
    tenant: { ...tenant, actor: `agent:${p.agent_id}` },
  };
  const verdict = await evaluate(tool, ctx, p.input, "execute");
  if (verdict.kind === "deny" && verdict.later) {
    // Right action, wrong moment: hand it back to the queue.
    await sql`update agent_proposals set status = 'pending', decided_by = null, decided_at = null where id = ${p.id}`;
    return { ok: false, reason: "not_now", detail: verdict.reason };
  }
  if (verdict.kind === "deny") return fail("blocked", verdict.reason);

  try {
    const result = await tool.run(ctx, p.input);
    await sql`update agent_proposals set result = ${sql.json((result ?? { ok: true }) as never)} where id = ${p.id}`;
    await log(sql, tenant.orgId, tenant.actor, "agent.proposal_approved", "agent_proposal", p.id, { tool: p.tool });
    return { ok: true, result };
  } catch (err) {
    return fail("failed", err instanceof Error ? err.message : String(err));
  }
}

export async function rejectProposal(sql: Sql, tenant: Tenant, proposalId: string): Promise<boolean> {
  const rows = await sql`
    update agent_proposals set status = 'rejected', decided_by = ${tenant.actor}, decided_at = now()
    where id = ${proposalId} and org_id = ${tenant.orgId} and status = 'pending'
    returning id`;
  if (rows.length) await log(sql, tenant.orgId, tenant.actor, "agent.proposal_rejected", "agent_proposal", proposalId);
  return rows.length > 0;
}
