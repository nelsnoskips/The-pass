import type { Sql } from "postgres";
import type { Action, Tenant } from "../platform/tenant";

/**
 * A tool is the only way an agent touches the world. The model sees the
 * name, description and schema; the policy layer sees the tier, the
 * permission it needs, and the hard rules in `check`. The model can't
 * change any of those.
 *
 * Tiers (docs/AGENTIC-PLATFORM.md):
 *   auto    — runs immediately, logged
 *   approve — becomes a proposal; runs only when a person approves it
 * There is no "never" tier on a tool: things an agent must never do are
 * either not tools at all, or are refused by `check` for the specific
 * input (no consent, quiet hours, over the spend cap).
 */

export type Tier = "auto" | "approve";
/** When a check is running: as the agent asks, or as the action fires. */
export type Phase = "propose" | "execute";

export interface AgentContext {
  sql: Sql;
  /** The org the agent works for. actor is "agent:<id>". */
  tenant: Tenant;
  agentId: string;
  runId: string | null;
  now: Date;
}

/** `later`: the action is fine but not now (e.g. outside sending hours);
 *  an approval that hits it leaves the proposal waiting. */
export type CheckResult = { ok: true } | { ok: false; reason: string; later?: boolean };

export interface ToolDef<I = Record<string, unknown>> {
  name: string;
  /** For the model: what it does, when to use it, what it returns. */
  description: string;
  /** JSON Schema with additionalProperties: false; sent with strict: true. */
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
  tier: Tier;
  /** Tenant permission the action needs. */
  requires: Action;
  /** Hard rules for this input, evaluated at proposal time AND again at
   *  execution time, because consent can be withdrawn in between. Rules
   *  about the moment of sending (quiet hours) apply at "execute" only. */
  check?: (ctx: AgentContext, input: I, phase: Phase) => Promise<CheckResult> | CheckResult;
  /** One line for the approval queue, e.g. "Text 14 regulars about Tuesday". */
  title?: (input: I) => string;
  run: (ctx: AgentContext, input: I) => Promise<unknown>;
}

/** Erases the input type so tools of different shapes share a registry. */
export function defineTool<I>(def: ToolDef<I>): ToolDef<Record<string, unknown>> {
  return def as unknown as ToolDef<Record<string, unknown>>;
}
