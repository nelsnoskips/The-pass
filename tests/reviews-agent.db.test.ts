import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomBytes, randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { reviewsAgent } from "@/lib/agent-runtime/agents/reviews";
import { approveProposal } from "@/lib/agent-runtime/proposals";
import { runAgent, type MessagesClient } from "@/lib/agent-runtime/runner";
import { seal } from "@/lib/integrations/secrets";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";

process.env.INTEGRATIONS_KEY ??= randomBytes(32).toString("base64");
process.env.GOOGLE_CLIENT_ID = "c";
process.env.GOOGLE_CLIENT_SECRET = "s";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;
type Block = Anthropic.Beta.Messages.BetaContentBlock;
const toolUse = (name: string, input: unknown): Block => ({ type: "tool_use", id: `toolu_${randomUUID()}`, name, input }) as Block;
const text = (t: string): Block => ({ type: "text", text: t, citations: null }) as Block;
const scripted = (turns: Block[][]): MessagesClient => {
  let i = 0;
  return { beta: { messages: { async create(params) {
    const content = turns[i++] ?? [text("Done.")];
    return { id: "m", type: "message", role: "assistant", model: params.model, content,
      stop_reason: content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn", stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } as unknown as Anthropic.Beta.Messages.BetaMessage;
  } } } };
};

d("Reviews Agent", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  let orgId = "", reviewId = "";
  let owner: Tenant, host: Tenant;
  const posted: string[] = [];
  const realFetch = globalThis.fetch;

  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Santorini', ${`ra-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    await sql`insert into org_integrations (org_id, provider, status, settings, secret, updated_by)
              values (${orgId}, 'google_business', 'connected', ${sql.json({ account: "accounts/1", location: "locations/2", title: "S" })}, ${seal("rt")}, 'test')`;
    const [r] = await sql<{ id: string }[]>`
      insert into reviews (org_id, source, external_id, author, rating, body, reviewed_at)
      values (${orgId}, 'google', 'g-1', 'Maria K.', 5, 'The saganaki was incredible.', now()) returning id`;
    reviewId = r.id;
    owner = { orgId, actor: "owner@ra", role: "owner", venueIds: null };
    host = { orgId, actor: "host@ra", role: "host", venueIds: null };
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const u = String(input);
      if (u.includes("oauth2.googleapis.com/token")) return new Response(JSON.stringify({ access_token: "at" }), { status: 200 });
      if (u.endsWith("/reply")) { posted.push(JSON.parse(String(init?.body)).comment); return new Response("{}", { status: 200 }); }
      return new Response("{}", { status: 404 });
    }) as typeof fetch;
  });
  afterAll(async () => { globalThis.fetch = realFetch; await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  const reply = "Thank you, Maria — we'll tell the kitchen the saganaki made your night. See you again soon.";

  it("drafts a reply as a proposal; nothing is posted", async () => {
    const out = await runAgent({
      sql, agent: reviewsAgent(), tenant: owner, trigger: "test", task: "Check reviews.",
      client: scripted([
        [toolUse("get_unanswered_reviews", { limit: 5 })],
        [toolUse("post_review_reply", { review_id: reviewId, reply, rationale: "Five stars, mentions the saganaki." })],
        [text("1 reply waiting for approval.")],
      ]),
    });
    expect(out.actions.map((a) => a.verdict)).toEqual(["ran", "proposed"]);
    expect(posted).toEqual([]);
  });

  it("won't draft twice for a review already waiting", async () => {
    const out = await runAgent({
      sql, agent: reviewsAgent(), tenant: owner, trigger: "test", task: "Again.",
      client: scripted([[toolUse("get_unanswered_reviews", { limit: 5 })], [text("Nothing new.")]]),
    });
    expect(out.status).toBe("completed");
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from agent_proposals where org_id = ${orgId} and status = 'pending'`;
    expect(n).toBe(1);
  });

  it("approval posts exactly the drafted text, once; hosts can't approve", async () => {
    const [p] = await sql<{ id: string }[]>`select id from agent_proposals where org_id = ${orgId} and status = 'pending'`;
    await expect(approveProposal(sql, host, p.id, reviewsAgent().tools)).rejects.toBeInstanceOf(Forbidden);
    expect(await approveProposal(sql, owner, p.id, reviewsAgent().tools)).toMatchObject({ ok: true });
    expect(posted).toEqual([reply]);
    const [r] = await sql<{ reply: string }[]>`select reply from reviews where id = ${reviewId}`;
    expect(r.reply).toBe(reply);
  });

  it("refuses a reply to a review that's already answered", async () => {
    const out = await runAgent({
      sql, agent: reviewsAgent(), tenant: owner, trigger: "test", task: "x",
      client: scripted([[toolUse("post_review_reply", { review_id: reviewId, reply, rationale: "r" })], [text("ok")]]),
    });
    expect(out.actions[0].verdict).toBe("denied");
  });
});
