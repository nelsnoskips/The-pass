import { replyToReview } from "../../integrations/google";
import type { AgentSpec } from "../runner";
import { defineTool } from "../tool";

/**
 * Reviews Agent: drafts a reply to each unanswered review in the
 * restaurant's voice. Posting is public and permanent, so every reply is
 * a proposal; approving posts exactly the reviewed text to Google.
 */

const unanswered = defineTool<{ limit: number }>({
  name: "get_unanswered_reviews",
  description: "Reviews with no reply yet, newest first: id, author's display name, star rating (1–5), text, date. Also returns the restaurant's name.",
  inputSchema: {
    type: "object",
    properties: { limit: { type: "integer", enum: [5, 10, 20], description: "How many to fetch." } },
    required: ["limit"],
    additionalProperties: false,
  },
  tier: "auto",
  requires: "view",
  async run(ctx, { limit }) {
    const [org] = await ctx.sql<{ name: string }[]>`select name from orgs where id = ${ctx.tenant.orgId}`;
    // Reviews already waiting in the approval queue are left out, so the
    // agent never drafts two replies to one review.
    const reviews = await ctx.sql<{ id: string; author: string | null; rating: number | null; body: string | null; reviewed_at: Date | null }[]>`
      select r.id, r.author, r.rating, r.body, r.reviewed_at from reviews r
      where r.org_id = ${ctx.tenant.orgId} and r.reply is null
        and not exists (select 1 from agent_proposals p where p.org_id = r.org_id and p.status = 'pending'
                        and p.tool = 'post_review_reply' and p.input->>'review_id' = r.id::text)
      order by r.reviewed_at desc nulls last limit ${limit}`;
    return { restaurant: org?.name, reviews };
  },
});

const postReply = defineTool<{ review_id: string; reply: string; rationale: string }>({
  name: "post_review_reply",
  description:
    "Post a public reply to one review on Google. Write as the restaurant: thank the guest by first name, respond to the specific thing they said, and invite them back. For a critical review, acknowledge it plainly, don't argue, don't promise compensation, and offer a way to talk (the restaurant's phone or 'ask for the manager'). Two to four sentences. No emojis, no hashtags, no marketing. Put why in rationale.",
  inputSchema: {
    type: "object",
    properties: {
      review_id: { type: "string" },
      reply: { type: "string" },
      rationale: { type: "string" },
    },
    required: ["review_id", "reply", "rationale"],
    additionalProperties: false,
  },
  tier: "approve",
  requires: "manage_venue",
  title: (i) => `Reply to a review: “${i.reply.slice(0, 70)}${i.reply.length > 70 ? "…" : ""}”`,
  async check(ctx, input) {
    const reply = String(input.reply ?? "").trim();
    if (reply.length < 10 || reply.length > 1500) return { ok: false, reason: "Keep the reply between 10 and 1,500 characters." };
    if (!/^[0-9a-f-]{36}$/i.test(String(input.review_id))) return { ok: false, reason: "Unknown review id." };
    const [r] = await ctx.sql<{ reply: string | null }[]>`
      select reply from reviews where id = ${String(input.review_id)} and org_id = ${ctx.tenant.orgId}`;
    if (!r) return { ok: false, reason: "Unknown review id." };
    if (r.reply) return { ok: false, reason: "That review already has a reply." };
    return { ok: true };
  },
  async run(ctx, input) {
    await replyToReview(ctx.sql, ctx.tenant.orgId, input.review_id, input.reply.trim(), ctx.tenant.actor);
    return { posted: true };
  },
});

export function reviewsAgent(): AgentSpec {
  return {
    id: "reviews",
    name: "Reviews Agent",
    effort: "low",
    maxTurns: 12,
    system: `You are the Reviews Agent for a restaurant, inside The Pass. Each run, fetch the unanswered reviews and draft one reply per review with post_review_reply. Every reply goes to the owner for approval before it's posted, so draft one for each review rather than asking.

Reply as the restaurant, in a warm, plain, specific voice. Use the guest's first name if it looks like a real name. Mention the specific thing they praised or raised. For four and five stars: thank them and invite them back. For three stars or fewer: acknowledge what went wrong without arguing or making excuses, don't offer refunds or free food, and invite them to get in touch. Never invent details about the restaurant, dishes or staff that the review didn't mention.

Finish with one line for the owner: how many replies are waiting for approval.`,
    tools: [unanswered, postReply],
  };
}
