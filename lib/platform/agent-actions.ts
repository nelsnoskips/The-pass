"use server";

import { db } from "../db";
import { approveProposal, rejectProposal } from "../agent-runtime/proposals";
import { RUNNABLE_AGENTS } from "../agent-runtime/registry";
import { requireTenant } from "./context";
import { Forbidden } from "./tenant";

export async function decideProposal(org: string, proposalId: string, decision: "approve" | "reject"): Promise<{ error: string | null; result?: string }> {
  const sql = db();
  if (!sql) return { error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  const [p] = await sql<{ agent_id: string }[]>`
    select agent_id from agent_proposals where id = ${proposalId} and org_id = ${tenant.orgId}`;
  if (!p) return { error: "Proposal not found." };

  try {
    if (decision === "reject") {
      const ok = await rejectProposal(sql, tenant, proposalId);
      return ok ? { error: null, result: "Dismissed." } : { error: "Already decided." };
    }
    const make = RUNNABLE_AGENTS[p.agent_id];
    if (!make) return { error: "That agent no longer exists." };
    // No revalidate here: the card shows its own result, then the page
    // refreshes from the client so the message can be read first.
    const r = await approveProposal(sql, tenant, proposalId, make().tools);
    if (r.ok) return { error: null, result: summarize(r.result) };
    if (r.reason === "not_now") return { error: `${r.detail ?? "Not right now."} It's still waiting — approve it then.` };
    const why = { not_found: "Proposal not found.", already_decided: "Someone already decided this.", blocked: "Blocked", failed: "It failed" }[r.reason];
    return { error: r.detail ? `${why}: ${r.detail}` : why };
  } catch (err) {
    if (err instanceof Forbidden) return { error: "Your role can't approve this." };
    throw err;
  }
}

function summarize(result: unknown): string {
  if (result && typeof result === "object" && "sent" in result) {
    const t = result as { sent: number; dry_run: number; failed: number; skipped: number };
    const parts = [
      t.sent && `${t.sent} sent`,
      t.dry_run && `${t.dry_run} recorded (texting isn't switched on yet)`,
      t.failed && `${t.failed} failed`,
      t.skipped && `${t.skipped} skipped: no consent, opted out, or texted this week`,
    ].filter(Boolean);
    return parts.join(" · ") || "Done.";
  }
  return "Done.";
}
