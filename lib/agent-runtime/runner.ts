import Anthropic from "@anthropic-ai/sdk";
import type { Sql } from "postgres";
import { log } from "../reservations/repo";
import type { Tenant } from "../platform/tenant";
import { evaluate } from "./policy";
import { ownerBlock, readAgentSettings } from "./settings";
import type { AgentContext, ToolDef } from "./tool";

/**
 * The agent loop: model picks a tool, policy rules on it, the tool runs
 * (or is queued, or refused), the result goes back to the model, repeat.
 *
 * A manual loop rather than the SDK's tool runner so that the policy
 * check sits in front of every single call, and so a queued action can
 * be reported back to the model as "waiting for approval" rather than
 * executed.
 */

export const DEFAULT_MODEL = "claude-opus-5-5";

export interface AgentSpec {
  id: string;
  name: string;
  /** Role, goal and house rules. Stable text: it is the cached prefix. */
  system: string;
  tools: ToolDef[];
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  /** Hard stop on tool-call rounds per run. */
  maxTurns?: number;
}

/** The slice of the SDK the runner uses — narrow so tests can script it. */
export interface MessagesClient {
  beta: {
    messages: {
      create(
        params: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming,
      ): Promise<Anthropic.Beta.Messages.BetaMessage>;
    };
  };
}

export interface RunInput {
  sql: Sql;
  agent: AgentSpec;
  /** The org's tenant; the runner swaps the actor to agent:<id>. */
  tenant: Tenant;
  trigger: string;
  /** What this run is for, e.g. "Nightly check for 2026-11-17". */
  task: string;
  client?: MessagesClient;
  now?: Date;
}

export interface RunOutcome {
  runId: string;
  status: "completed" | "failed" | "stopped";
  summary: string;
  actions: { tool: string; verdict: "ran" | "proposed" | "denied" | "error"; detail?: string }[];
}

export async function runAgent(input: RunInput): Promise<RunOutcome> {
  const { sql, agent } = input;
  const client = input.client ?? new Anthropic();
  const tenant: Tenant = { ...input.tenant, actor: `agent:${agent.id}` };

  // The restaurant's switch and notes. A switched-off agent doesn't run,
  // whoever wakes it; the notes are appended after the agent's own rules.
  const settings = await readAgentSettings(sql, tenant.orgId, agent.id);
  if (!settings.enabled) {
    return { runId: "", status: "stopped", summary: `${agent.name} is switched off for this restaurant.`, actions: [] };
  }
  const system = agent.system + ownerBlock(agent.id, settings);

  const [run] = await sql<{ id: string }[]>`
    insert into agent_runs (org_id, agent_id, trigger)
    values (${tenant.orgId}, ${agent.id}, ${input.trigger})
    returning id`;
  const ctx: AgentContext = { sql, tenant, agentId: agent.id, runId: run.id, now: input.now ?? new Date() };

  const byName = new Map(agent.tools.map((t) => [t.name, t]));
  const tools: Anthropic.Beta.Messages.BetaTool[] = agent.tools.map((t) => ({
    name: t.name,
    description: `${t.description}${t.tier === "approve" ? " Requires a person's approval: calling it queues the action and returns a proposal id, it does not run immediately." : ""}`,
    input_schema: t.inputSchema,
    strict: true,
  }));

  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    { role: "user", content: input.task },
  ];
  const actions: RunOutcome["actions"] = [];
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 };
  const finish = async (status: RunOutcome["status"], summary: string, error?: string) => {
    await sql`update agent_runs set status = ${status}, summary = ${summary}, error = ${error ?? null},
              usage = ${sql.json(usage)}, finished_at = now() where id = ${run.id}`;
    return { runId: run.id, status, summary, actions };
  };

  try {
    for (let turn = 0; turn < (agent.maxTurns ?? 12); turn++) {
      const response = await client.beta.messages.create({
        model: agent.model ?? DEFAULT_MODEL,
        max_tokens: 16000,
        // Policy refusals fall back to another model server-side rather
        // than silently stopping the run.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: agent.effort ?? "medium" },
        cache_control: { type: "ephemeral" },
        system,
        tools,
        messages,
      });
      usage.input_tokens += response.usage.input_tokens;
      usage.output_tokens += response.usage.output_tokens;
      usage.cache_read_input_tokens += response.usage.cache_read_input_tokens ?? 0;

      if (response.stop_reason === "refusal") {
        return await finish("stopped", "The model declined this task.");
      }
      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "pause_turn") continue;
      if (response.stop_reason !== "tool_use") {
        const text = response.content
          .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return await finish(
          response.stop_reason === "max_tokens" ? "stopped" : "completed",
          text || "Finished with nothing to report.",
        );
      }

      const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const tool = byName.get(block.name);
        const args = (block.input ?? {}) as Record<string, unknown>;
        if (!tool) {
          results.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: `Unknown tool ${block.name}.` });
          continue;
        }
        results.push(await handleCall(ctx, tool, block.id, args, actions));
      }
      messages.push({ role: "user", content: results });
    }
    return await finish("stopped", `Stopped after ${agent.maxTurns ?? 12} rounds.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return await finish("failed", "The run failed.", message);
  }
}

async function handleCall(
  ctx: AgentContext,
  tool: ToolDef,
  toolUseId: string,
  args: Record<string, unknown>,
  actions: RunOutcome["actions"],
): Promise<Anthropic.Beta.Messages.BetaToolResultBlockParam> {
  const { sql, tenant } = ctx;
  const verdict = await evaluate(tool, ctx, args, tool.tier === "auto" ? "execute" : "propose");

  if (verdict.kind === "deny") {
    actions.push({ tool: tool.name, verdict: "denied", detail: verdict.reason });
    await log(sql, tenant.orgId, tenant.actor, "agent.denied", "tool", tool.name, { input: args, reason: verdict.reason, runId: ctx.runId });
    return { type: "tool_result", tool_use_id: toolUseId, is_error: true, content: `Refused by policy: ${verdict.reason}` };
  }

  if (verdict.kind === "propose") {
    const rationale = typeof args.rationale === "string" ? args.rationale : "";
    const title = tool.title ? tool.title(args) : tool.name;
    const [p] = await sql<{ id: string }[]>`
      insert into agent_proposals (org_id, agent_id, run_id, tool, input, title, rationale)
      values (${tenant.orgId}, ${ctx.agentId}, ${ctx.runId}, ${tool.name}, ${sql.json(args as never)}, ${title}, ${rationale})
      returning id`;
    actions.push({ tool: tool.name, verdict: "proposed", detail: p.id });
    await log(sql, tenant.orgId, tenant.actor, "agent.proposed", "agent_proposal", p.id, { tool: tool.name, runId: ctx.runId });
    return { type: "tool_result", tool_use_id: toolUseId, content: JSON.stringify({ status: "queued_for_approval", proposalId: p.id }) };
  }

  try {
    const result = await tool.run(ctx, args);
    actions.push({ tool: tool.name, verdict: "ran" });
    return { type: "tool_result", tool_use_id: toolUseId, content: JSON.stringify(result ?? { ok: true }) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    actions.push({ tool: tool.name, verdict: "error", detail: message });
    return { type: "tool_result", tool_use_id: toolUseId, is_error: true, content: message };
  }
}
