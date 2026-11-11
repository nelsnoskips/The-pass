import { can } from "../platform/tenant";
import type { AgentContext, Phase, ToolDef } from "./tool";

/**
 * The policy layer: plain code that decides, for one tool call, whether
 * it runs now, waits for a person, or is refused. The model's output is
 * an input here, never the decision.
 */

export type Verdict =
  | { kind: "run" }
  | { kind: "propose" }
  | { kind: "deny"; reason: string; later?: boolean };

export async function evaluate(
  tool: ToolDef,
  ctx: AgentContext,
  input: Record<string, unknown>,
  phase: Phase,
): Promise<Verdict> {
  if (!can(ctx.tenant, tool.requires)) {
    return { kind: "deny", reason: `This agent isn't permitted to ${tool.requires.replace("_", " ")}.` };
  }
  if (tool.check) {
    const c = await tool.check(ctx, input, phase);
    if (!c.ok) return { kind: "deny", reason: c.reason, later: c.later };
  }
  // An approved proposal has had its person; it runs.
  if (phase === "execute") return { kind: "run" };
  return tool.tier === "auto" ? { kind: "run" } : { kind: "propose" };
}
