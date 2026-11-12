"use server";

import { revalidatePath } from "next/cache";
import { websiteAgent } from "../agent-runtime/agents/website";
import { runAgent } from "../agent-runtime/runner";
import { db } from "../db";
import { describeChanges } from "../sites/diff";
import { getVersion, listVersions, siteForOrg } from "../sites/repo";
import { requireTenant } from "./context";
import { allow } from "./ratelimit";
import { can } from "./tenant";

export interface AgentEditResult {
  error: string | null;
  summary?: string;
  versionId?: string;
  changes?: string[];
}

/**
 * Run the Website Agent on an owner's request. It acts with the owner's
 * own permissions and can only save a draft; the result comes back with
 * a plain list of what changed and a link to preview it.
 */
export async function askWebsiteAgent(org: string, request: string): Promise<AgentEditResult> {
  const sql = db();
  if (!sql) return { error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  if (!can(tenant, "manage_venue")) return { error: "Your role can't edit the website." };
  const ask = request.trim().slice(0, 1000);
  if (ask.length < 4) return { error: "Describe the change you want." };
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "The assistant isn't switched on for your restaurant yet. Everything here still works by hand: make the change in the editor below." };
  }
  if (!(await allow(sql, "website-agent", tenant.orgId, 30, 60))) {
    return { error: "That's a lot of requests this hour. Try again shortly, or use the editor." };
  }

  const site = await siteForOrg(sql, tenant);
  if (!site) return { error: "This restaurant has no website yet." };
  const [before] = await listVersions(sql, tenant, site.id);
  const outcome = await runAgent({
    sql, agent: websiteAgent(), tenant, trigger: `request:${tenant.actor}`,
    task: `The owner asks: ${ask}`,
  });

  const [after] = await listVersions(sql, tenant, site.id);
  const made = after && after.id !== before?.id && after.created_by === "agent:website" ? after : null;
  revalidatePath(`/r/${org}/website`);
  if (outcome.status === "failed") return { error: "The agent couldn't finish. Nothing was changed." };
  if (!made) return { error: null, summary: outcome.summary };

  const [was, now] = await Promise.all([before ? getVersion(sql, tenant, before.id) : null, getVersion(sql, tenant, made.id)]);
  return {
    error: null,
    summary: outcome.summary,
    versionId: made.id,
    changes: was && now ? describeChanges(was, now) : [],
  };
}
