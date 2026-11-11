import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { randomBytes, randomUUID } from "node:crypto";
import { findAdIssues, PAID_ADS_TOOLS, type CampaignTotals } from "@/lib/agent-runtime/agents/paid-ads";
import { evaluate } from "@/lib/agent-runtime/policy";
import { approveProposal } from "@/lib/agent-runtime/proposals";
import type { AgentContext } from "@/lib/agent-runtime/tool";
import { seal } from "@/lib/integrations/secrets";
import type { Tenant } from "@/lib/platform/tenant";

process.env.INTEGRATIONS_KEY ??= randomBytes(32).toString("base64");
process.env.GOOGLE_CLIENT_ID = "c";
process.env.GOOGLE_CLIENT_SECRET = "s";
process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "dev-token";

const camp = (o: Partial<CampaignTotals>): CampaignTotals => ({
  platform: "google", campaignId: "x", name: "X", status: "enabled", dailyBudgetCents: 3000, budgetShared: false,
  spendCents: 0, clicks: 0, conversions: 0, conversionValueCents: 0, ...o,
});

describe("Paid Ads rules", () => {
  it("flags the expensive campaign, the budget-limited winner, spend with no results, and junk searches", () => {
    const f = findAdIssues([
      camp({ campaignId: "cheap", name: "Brand", spendCents: 88_000, conversions: 80, dailyBudgetCents: 3000 }), // $11 each, at budget
      camp({ campaignId: "dear", name: "Generic", spendCents: 60_000, conversions: 20 }), // $30 each
      camp({ campaignId: "dead", name: "Display", spendCents: 5_000, clicks: 300, conversions: 0 }),
      camp({ campaignId: "tiny", name: "Tiny", spendCents: 900, conversions: 0 }), // too little to judge
      camp({ campaignId: "off", name: "Old", status: "paused", spendCents: 9_000 }),
    ], [
      { campaignId: "dear", term: "greek restaurant jobs", clicks: 2, spendCents: 300, conversions: 0 },
      { campaignId: "dear", term: "gyro near me", clicks: 14, spendCents: 2_100, conversions: 0 },
      { campaignId: "dear", term: "greek food las olas", clicks: 40, spendCents: 6_000, conversions: 6 },
      { campaignId: "dear", term: "dinner tonight", clicks: 3, spendCents: 400, conversions: 0 },
    ], 30);
    expect(f.map((x) => [x.kind, x.campaignId, "term" in x ? x.term : ""])).toEqual([
      ["expensive", "dear", ""],
      ["budget_limited", "cheap", ""],
      ["no_results", "dead", ""],
      ["wasted_term", "dear", "greek restaurant jobs"],
      ["wasted_term", "dear", "gyro near me"],
    ]);
  });

  it("doesn't judge cost per result on fewer than 10 results", () => {
    expect(findAdIssues([
      camp({ campaignId: "a", spendCents: 1000, conversions: 9 }),
      camp({ campaignId: "b", spendCents: 9000, conversions: 9 }),
    ], [], 30)).toEqual([]);
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("Paid Ads Agent tools against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  let orgId = "";
  let owner: Tenant, host: Tenant;
  const tool = (n: string) => PAID_ADS_TOOLS.find((t) => t.name === n)!;
  const ctx = (): AgentContext => ({ sql, tenant: { ...owner, actor: "agent:paid_ads" }, agentId: "paid_ads", runId: null, now: new Date("2026-11-11T12:00:00Z") });
  const calls: { url: string; body: string }[] = [];

  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Santorini Taverna', ${`pa-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    owner = { orgId, actor: "owner@pa", role: "owner", venueIds: null };
    host = { orgId, actor: "host@pa", role: "host", venueIds: null };
    await sql`insert into org_integrations (org_id, provider, status, account_label, settings, secret, updated_by)
              values (${orgId}, 'google_ads', 'connected', 'Santorini Ads', ${sql.json({ customerId: "222" })}, ${seal("refresh")}, 't')`;
    await sql`insert into ad_campaigns (org_id, platform, account_id, campaign_id, name, status, channel, daily_budget_cents, budget_ref, budget_shared) values
      (${orgId}, 'google', '222', '9001', 'Search | Las Olas', 'enabled', 'search', 3000, 'customers/222/campaignBudgets/5', false),
      (${orgId}, 'google', '222', '9002', 'Shared budget', 'enabled', 'search', 5000, 'customers/222/campaignBudgets/6', true),
      (${orgId}, 'meta', '555', 'm1', 'Reservations | IG', 'active', 'meta', null, null, false)`;
    await sql`insert into ad_search_terms (org_id, campaign_id, ad_group_id, term, clicks, spend_cents, conversions, since, until) values
      (${orgId}, '9001', '77', 'greek restaurant jobs', 4, 600, 0, '2026-10-12', '2026-11-10'),
      (${orgId}, '9001', '77', 'santorini taverna menu', 30, 900, 0, '2026-10-12', '2026-11-10'),
      (${orgId}, '9001', '77', 'greek food las olas', 40, 6000, 6, '2026-10-12', '2026-11-10')`;
    vi.stubGlobal("fetch", (async (input: string | URL | Request, init?: RequestInit) => {
      const u = String(input);
      calls.push({ url: u, body: init?.body ? String(init.body) : "" });
      if (u.includes("oauth2.googleapis.com/token")) return new Response(JSON.stringify({ access_token: "at" }));
      if (u.includes(":mutate")) return new Response(JSON.stringify({ results: [{ resourceName: "ok" }] }));
      return new Response("{}", { status: 404 });
    }) as typeof fetch);
  });
  afterEach(() => { calls.length = 0; });
  afterAll(async () => { vi.unstubAllGlobals(); await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  const verdict = (n: string, input: Record<string, unknown>) => evaluate(tool(n), ctx(), input, "propose");
  const budget = (to: number, extra: Record<string, unknown> = {}) =>
    ({ campaign_id: "9001", campaign_name: "Search | Las Olas", from_cents: 3000, to_cents: to, rationale: "r", ...extra });

  it("budget changes: proposed within limits, refused outside them", async () => {
    expect(await verdict("set_daily_budget", budget(3600))).toEqual({ kind: "propose" });
    expect(await verdict("set_daily_budget", budget(2000))).toEqual({ kind: "propose" });
    expect((await verdict("set_daily_budget", budget(4600))).kind).toBe("deny"); // over +50%
    expect((await verdict("set_daily_budget", budget(50))).kind).toBe("deny"); // under $1
    expect((await verdict("set_daily_budget", budget(3600, { from_cents: 2500 }))).kind).toBe("deny"); // stale
    expect((await verdict("set_daily_budget", budget(3600, { campaign_name: "Something else" }))).kind).toBe("deny");
    expect((await verdict("set_daily_budget", { ...budget(6000), campaign_id: "9002", campaign_name: "Shared budget", from_cents: 5000 })).kind).toBe("deny");
    expect((await verdict("set_daily_budget", { ...budget(3600), campaign_id: "m1", campaign_name: "Reservations | IG" })).kind).toBe("deny"); // Meta: read-only
  });

  it("negatives: only searches people made, that never converted, and never the restaurant's own name", async () => {
    const neg = (term: string) => ({ campaign_id: "9001", campaign_name: "Search | Las Olas", term, match_type: "PHRASE", rationale: "r" });
    expect(await verdict("add_negative_keyword", neg("greek restaurant jobs"))).toEqual({ kind: "propose" });
    expect((await verdict("add_negative_keyword", neg("greek food las olas"))).kind).toBe("deny"); // converted
    expect((await verdict("add_negative_keyword", neg("cheap pizza"))).kind).toBe("deny"); // never searched
    expect((await verdict("add_negative_keyword", neg("santorini taverna menu"))).kind).toBe("deny"); // own name
  });

  it("approving writes exactly the reviewed change to Google, records it, and needs approve_spend", async () => {
    const [p] = await sql<{ id: string }[]>`
      insert into agent_proposals (org_id, agent_id, tool, input, title, rationale)
      values (${orgId}, 'paid_ads', 'set_daily_budget', ${sql.json(budget(3600))}, 't', 'r') returning id`;
    await expect(approveProposal(sql, host, p.id, PAID_ADS_TOOLS)).rejects.toThrow();
    expect(calls).toHaveLength(0);

    expect(await approveProposal(sql, owner, p.id, PAID_ADS_TOOLS)).toMatchObject({ ok: true });
    const m = calls.find((c) => c.url.endsWith("/customers/222/campaignBudgets:mutate"))!;
    expect(JSON.parse(m.body)).toEqual({ operations: [{ update: { resourceName: "customers/222/campaignBudgets/5", amountMicros: "36000000" }, updateMask: "amount_micros" }] });
    const [c] = await sql<{ daily_budget_cents: string }[]>`select daily_budget_cents from ad_campaigns where org_id = ${orgId} and campaign_id = '9001'`;
    expect(Number(c.daily_budget_cents)).toBe(3600);
    const [l] = await sql<{ actor: string; action: string }[]>`
      select actor, action from change_log where org_id = ${orgId} and action = 'ads.budget_changed'`;
    expect(l).toEqual({ actor: "agent:paid_ads", action: "ads.budget_changed" });

    // The same proposal again is stale now: the budget it was based on moved.
    const [p2] = await sql<{ id: string }[]>`
      insert into agent_proposals (org_id, agent_id, tool, input, title, rationale)
      values (${orgId}, 'paid_ads', 'set_daily_budget', ${sql.json(budget(3600))}, 't', 'r') returning id`;
    expect(await approveProposal(sql, owner, p2.id, PAID_ADS_TOOLS)).toMatchObject({ ok: false, reason: "blocked" });
  });

  it("an approved negative goes to Google and isn't found again", async () => {
    const input = { campaign_id: "9001", campaign_name: "Search | Las Olas", term: "greek restaurant jobs", match_type: "PHRASE", rationale: "r" };
    const [p] = await sql<{ id: string }[]>`
      insert into agent_proposals (org_id, agent_id, tool, input, title, rationale)
      values (${orgId}, 'paid_ads', 'add_negative_keyword', ${sql.json(input)}, 't', 'r') returning id`;
    expect(await approveProposal(sql, owner, p.id, PAID_ADS_TOOLS)).toMatchObject({ ok: true });
    expect(JSON.parse(calls.find((c) => c.url.includes("campaignCriteria:mutate"))!.body).operations[0].create)
      .toEqual({ campaign: "customers/222/campaigns/9001", negative: true, keyword: { text: "greek restaurant jobs", matchType: "PHRASE" } });
    const review = (await tool("get_ad_review").run(ctx(), {})) as { findings: { kind: string; term?: string }[]; campaigns: { campaignId: string }[] };
    expect(review.findings.some((f) => f.term === "greek restaurant jobs")).toBe(false);
    expect(review.campaigns.map((c) => c.campaignId).sort()).toEqual(["9001", "9002", "m1"]);
  });
});
