import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import demo from "@/lib/sites/demo-content.json";
import { approveProposal } from "@/lib/agent-runtime/proposals";
import { PAID_ADS_TOOLS } from "@/lib/agent-runtime/agents/paid-ads";
import { paidAdsAgent } from "@/lib/agent-runtime/agents/paid-ads";
import { reservationsAgent } from "@/lib/agent-runtime/agents/reservations";
import { runAgent, type MessagesClient } from "@/lib/agent-runtime/runner";
import { scheduledRuns } from "@/lib/agent-runtime/schedule";
import { appIsLive, loadGuestApp, publicProgram, publishApp, saveAppDraft } from "@/lib/app/repo";
import { defaultAppConfig } from "@/lib/app/config";
import { chat, proposeChange } from "@/lib/assistant";
import {
  assertIncluded, includes, NotIncluded, planFor, requestPlanChange, setPlan,
} from "@/lib/billing/entitlements";
import { marketingWarningFor, usageFor } from "@/lib/billing/usage";
import { createCard } from "@/lib/giftcards";
import { saveProgram } from "@/lib/guests/loyalty";
import { earnReward } from "@/lib/guests/visits";
import { setLever } from "@/lib/levers";
import { saveDraft, schedule, sendNow } from "@/lib/marketing/campaigns";
import { createPromotion, hasAutomaticPromotions, promotionsForOrder } from "@/lib/marketing/promotions";
import { createSegment } from "@/lib/marketing/segments";
import { getOrderingSettings, placeOrder, saveOrderingSettings, setKitchenState, DEFAULT_SETTINGS } from "@/lib/ordering";
import { sendCancellationNotice } from "@/lib/reservations/notify";
import { publishVersion, saveVersion } from "@/lib/sites/repo";
import type { SiteContent } from "@/lib/sites/content";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";

type Block = Anthropic.Beta.Messages.BetaContentBlock;
const text = (t: string): Block => ({ type: "text", text: t, citations: null }) as Block;

function scripted(turns: Block[][], usage = { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 50 }) {
  const seen: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming[] = [];
  let i = 0;
  const client: MessagesClient = {
    beta: { messages: { async create(params) {
      seen.push(structuredClone(params));
      const content = turns[i++] ?? [text("Done.")];
      return {
        id: "msg", type: "message", role: "assistant", model: params.model, content,
        stop_reason: content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn", stop_sequence: null,
        usage: { ...usage, cache_creation_input_tokens: 0 },
      } as unknown as Anthropic.Beta.Messages.BetaMessage;
    } } },
  };
  return { client, seen };
}

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("plans, entitlements and usage against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  const tag = randomUUID().slice(0, 8);
  const siteSlug = `bill-${tag}`;
  let orgA = "", orgB = "", venueA = "";
  let owner: Tenant, manager: Tenant, host: Tenant, staff: Tenant, ownerB: Tenant;
  const notified: string[] = [];
  const notify = async (m: { subject: string }) => { notified.push(m.subject); return { ok: true }; };
  const logged = async (orgId: string, action: string) =>
    (await sql<{ n: number }[]>`select count(*)::int as n from change_log where org_id = ${orgId} and action = ${action}`)[0].n;
  const toHost = () => setPlan(sql, staff, { plan: "host", founding: false, locations: 1 });
  const toPass = () => setPlan(sql, staff, { plan: "the_pass", founding: false, locations: 1 });

  beforeAll(async () => {
    const [a] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Billing A', ${`billa-${tag}`}) returning id`;
    const [b] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Billing B', ${`billb-${tag}`}) returning id`;
    orgA = a.id; orgB = b.id;
    const [v] = await sql<{ id: string }[]>`
      insert into venues (org_id, name, slug, timezone, phone) values (${orgA}, 'Main', 'main', 'America/Los_Angeles', '+13105550100') returning id`;
    venueA = v.id;
    await sql`insert into venues (org_id, name, slug) values (${orgA}, 'Second', 'second')`;
    await sql`insert into venues (org_id, name, slug) values (${orgB}, 'Main', 'main')`;
    owner = { orgId: orgA, actor: `owner-${tag}@a.example`, role: "owner", venueIds: null };
    manager = { orgId: orgA, actor: `mgr-${tag}@a.example`, role: "manager", venueIds: null };
    host = { orgId: orgA, actor: `host-${tag}@a.example`, role: "host", venueIds: null };
    staff = { orgId: orgA, actor: "team@thepass.example", role: "staff", venueIds: null };
    ownerB = { orgId: orgB, actor: `owner-${tag}@b.example`, role: "owner", venueIds: null };
    const [s] = await sql<{ id: string }[]>`insert into sites (org_id, venue_id, slug) values (${orgA}, ${venueA}, ${siteSlug}) returning id`;
    const saved = await saveVersion(sql, owner, s.id, demo);
    if (!saved.ok) throw new Error("site");
    await publishVersion(sql, owner, s.id, saved.versionId);
  });

  afterAll(async () => {
    await sql`delete from orgs where id in (${orgA}, ${orgB})`;
    await sql.end();
  });

  it("an org with no plan row is on The Pass, one location per venue", async () => {
    const p = await planFor(sql, orgA);
    expect(p).toMatchObject({ plan: "the_pass", founding: false, locations: 2, isDefault: true });
    expect(includes(p, "ordering")).toBe(true);
    expect(includes(p, "station:paid_ads")).toBe(true);
    await expect(assertIncluded(sql, orgA, "campaigns")).resolves.toBeUndefined();
  });

  it("only The Pass's staff change the plan; owners ask, and the founder hears about it", async () => {
    await expect(setPlan(sql, owner, { plan: "host", founding: false, locations: 1 })).rejects.toBeInstanceOf(Forbidden);
    await expect(setPlan(sql, manager, { plan: "host", founding: false, locations: 1 })).rejects.toBeInstanceOf(Forbidden);
    expect(await setPlan(sql, staff, { plan: "group", founding: false, locations: 2 })).toMatchObject({ ok: false });
    expect(await setPlan(sql, staff, { plan: "nope", founding: false, locations: 1 })).toMatchObject({ ok: false });
    expect(await planFor(sql, orgA)).toMatchObject({ plan: "the_pass", isDefault: true });

    await expect(requestPlanChange(sql, host, { plan: "group" }, notify)).rejects.toBeInstanceOf(Forbidden);
    expect(await requestPlanChange(sql, owner, { plan: "group", feature: "reviews", note: "We're opening a fifth" }, notify)).toEqual({ ok: true, already: false });
    expect(await requestPlanChange(sql, manager, { plan: "group" }, notify)).toEqual({ ok: true, already: true });
    expect(notified).toHaveLength(1);
    expect(notified[0]).toContain("Billing A wants Group");
    expect(await logged(orgA, "plan.change_requested")).toBe(1);
    // A request changes nothing.
    expect((await planFor(sql, orgA)).plan).toBe("the_pass");
  });

  it("downgrading to Host refuses excluded actions on the server, with a plain reason", async () => {
    // Set up while everything is included.
    expect(await saveOrderingSettings(sql, owner, { ...DEFAULT_SETTINGS, pickupEnabled: true, cateringEnabled: true })).toBeNull();
    const promo = await createPromotion(sql, owner, { name: "Ten off", code: `TEN${tag.slice(0, 4).toUpperCase()}`, automatic: false, kind: "percent_order", percent: "10" });
    expect(promo.ok).toBe(true);
    const auto = await createPromotion(sql, owner, { name: "Auto", code: "", automatic: true, kind: "percent_order", percent: "5" });
    expect(auto.ok).toBe(true);
    const seg = await createSegment(sql, owner, "Big spenders", { minVisits: "4" });
    expect(seg.ok).toBe(true);
    const draft = await saveDraft(sql, owner, { name: "Tuesday", channel: "sms", segment: "regulars", body: "Come in Tuesday." });
    if (!draft.ok) throw new Error(draft.error);
    const later = await saveDraft(sql, owner, { name: "Later", channel: "sms", segment: "regulars", body: "Later text." });
    if (!later.ok) throw new Error(later.error);
    const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    expect(await schedule(sql, owner, later.id, `${soon}T12:00`)).toMatchObject({ ok: true });
    expect(await saveProgram(sql, owner, { active: true, visitsRequired: 2, reward: "A dessert" })).toBeNull();
    const app = await saveAppDraft(sql, owner, defaultAppConfig(demo as unknown as SiteContent));
    expect(app.ok).toBe(true);
    expect(await publishApp(sql, owner)).toEqual({ ok: true });
    expect(await loadGuestApp(sql, siteSlug)).not.toBeNull();
    const [prop] = await sql<{ id: string }[]>`
      insert into agent_proposals (org_id, agent_id, tool, input, title, rationale)
      values (${orgA}, 'paid_ads', 'set_campaign_budget', '{}'::jsonb, 'Raise a budget', 'x') returning id`;

    const r = await toHost();
    expect(r).toMatchObject({ ok: true });
    const [log] = await sql<{ actor: string; detail: Record<string, { before: unknown; after: unknown }> }[]>`
      select actor, detail from change_log where org_id = ${orgA} and action = 'plan.changed'`;
    expect(log.actor).toBe(staff.actor);
    expect(log.detail.plan).toEqual({ before: "the_pass (default)", after: "host" });

    // Ordering: settings, the kitchen board and guests' orders.
    await expect(saveOrderingSettings(sql, owner, { ...DEFAULT_SETTINGS, pickupEnabled: false })).rejects.toBeInstanceOf(NotIncluded);
    await expect(setKitchenState(sql, host, { pausedUntil: null, soldOut: [] })).rejects.toThrow(/Online ordering comes with The Pass plan/);
    const order = await placeOrder(sql, {
      orgId: orgA, venueId: venueA, timezone: "America/Los_Angeles", content: demo as unknown as SiteContent, kind: "pickup",
      cart: [{ itemId: "gyro", qty: 1 }], tipCents: 0, date: "2030-01-15", time: "18:00", name: "Ana", phone: "305-555-0199", payOnline: false,
    });
    expect(order).toMatchObject({ ok: false, error: expect.stringMatching(/isn't available here/) });

    // A campaign send, a new draft, a schedule, a segment, a promotion.
    expect(await sendNow(sql, owner, draft.id, { baseUrl: "https://x.example" })).toMatchObject({ ok: false, error: expect.stringMatching(/campaigns comes with The Pass plan/i) });
    expect(await saveDraft(sql, owner, { name: "x", channel: "sms", segment: "regulars", body: "y" })).toMatchObject({ ok: false });
    expect(await schedule(sql, owner, draft.id, "2030-01-15T12:00")).toMatchObject({ ok: false });
    expect(await createSegment(sql, owner, "Nope", {})).toMatchObject({ ok: false });
    expect(await createPromotion(sql, owner, { name: "Nope", code: "NOPE1", automatic: false, kind: "percent_order", percent: "10" })).toMatchObject({ ok: false });
    expect(await saveProgram(sql, owner, { active: true, visitsRequired: 3, reward: "x" })).toMatch(/Loyalty comes with The Pass plan/);
    expect(await publishApp(sql, owner)).toMatchObject({ ok: false });
    await expect(createCard(sql, orgA, { amountCents: 5000, purchaserName: "A", purchaserEmail: "a@example.com" })).rejects.toBeInstanceOf(NotIncluded);

    // A station run: refused before the model is called, and nothing recorded as a run.
    const s = scripted([[text("should not be called")]]);
    const run = await runAgent({ sql, agent: paidAdsAgent(), tenant: owner, trigger: "test", task: "x", client: s.client });
    expect(run).toMatchObject({ status: "stopped", runId: "", summary: expect.stringMatching(/Paid ads station comes with The Pass plan/) });
    expect(s.seen).toHaveLength(0);
    expect((await sql`select 1 from agent_runs where org_id = ${orgA} and agent_id = 'paid_ads'`).length).toBe(0);
    // Stations in Host still run.
    const res = scripted([[text("Nothing to do.")]]);
    expect((await runAgent({ sql, agent: reservationsAgent(), tenant: owner, trigger: "test", task: "x", client: res.client })).status).toBe("completed");
    // A waiting proposal from an excluded station can't be approved, and stays waiting.
    expect(await approveProposal(sql, owner, prop.id, PAID_ADS_TOOLS)).toMatchObject({ ok: false, reason: "blocked" });
    expect((await sql<{ status: string }[]>`select status from agent_proposals where id = ${prop.id}`)[0].status).toBe("pending");

    // The chat: levers for excluded areas refused in code, whoever asks.
    const [th] = await sql<{ id: string }[]>`insert into chat_threads (org_id, created_by) values (${orgA}, ${owner.actor}) returning id`;
    expect(await proposeChange(sql, owner, th.id, "ordering", "prep_minutes", "30", "busy")).toEqual({ error: expect.stringMatching(/Online ordering comes with The Pass plan/) });
    expect(await setLever(sql, owner, "loyalty", "visits_required", "4", "settings")).toMatchObject({ ok: false, error: expect.stringMatching(/Loyalty/) });
    // Included levers still work.
    expect(await proposeChange(sql, owner, th.id, "reservations", "max_party_online", "6", "bigger tables")).toMatchObject({ status: "applied" });
  });

  it("the chat isn't offered tools or settings for excluded areas", async () => {
    const [th] = await sql<{ id: string }[]>`insert into chat_threads (org_id, created_by) values (${orgA}, ${owner.actor}) returning id`;
    const s = scripted([
      [{ type: "tool_use", id: "t1", name: "get_settings", input: { pillar: "all" } } as Block],
      [{ type: "tool_use", id: "t2", name: "change_setting", input: { pillar: "ordering", key: "pickup_enabled", value: "off", reason: "x" } } as Block],
      [text("Online ordering comes with The Pass plan.")],
    ]);
    await chat(sql, owner, th.id, "turn off pickup", s.client);
    const tools = (s.seen[0].tools ?? []) as { name: string; input_schema: { properties: Record<string, { enum?: string[] }> } }[];
    const names = tools.map((t) => t.name);
    for (const gone of ["list_open_orders", "update_order_status", "list_segments", "list_campaigns", "draft_campaign"]) expect(names).not.toContain(gone);
    expect(names).toContain("create_booking");
    const pillars = tools.find((t) => t.name === "change_setting")!.input_schema.properties.pillar.enum;
    expect(pillars).toEqual(["reservations", "website"]);
    expect(String(s.seen[0].system)).toContain("on the Host plan");
    // get_settings returned no ordering, loyalty or app levers; change_setting refused.
    const results = JSON.stringify(s.seen[1].messages.at(-1));
    expect(results).not.toContain("pickup_enabled");
    expect(results).not.toContain("visits_required");
    expect(JSON.stringify(s.seen[2].messages.at(-1))).toContain("comes with The Pass plan");
    // The reply's tokens are recorded for metering.
    const [m] = await sql<{ usage: { input_tokens: number; output_tokens: number } }[]>`
      select usage from chat_messages where thread_id = ${th.id} and role = 'assistant'`;
    expect(m.usage).toMatchObject({ input_tokens: 3000, output_tokens: 600 });
  });

  it("guest pages and links for excluded features don't show", async () => {
    expect(await loadGuestApp(sql, siteSlug)).toBeNull();
    expect(await appIsLive(sql, orgA)).toBe(false);
    expect(await publicProgram(sql, orgA)).toBeNull();
    expect(await promotionsForOrder(sql, orgA, null, new Date())).toEqual([]);
    expect(await hasAutomaticPromotions(sql, orgA)).toBe(false);
    // Visits still count; rewards aren't earned on Host.
    const [g] = await sql<{ id: string }[]>`insert into guests (org_id, phone, name) values (${orgA}, ${`+1555${tag.replace(/\D/g, "").padEnd(7, "1").slice(0, 7)}`}, 'Visit Guest') returning id`;
    expect(await earnReward(sql, orgA, g.id, 2)).toBeNull();
  });

  it("the scheduler skips stations the plan doesn't include", async () => {
    await sql`insert into reviews (org_id, source, external_id, author, rating, body) values (${orgA}, 'google', ${`r-${tag}`}, 'A', 5, 'Lovely')`;
    const mine = async () => (await scheduledRuns(sql)).runs.filter((r) => r.org === `billa-${tag}`).map((r) => r.agent).sort();
    expect(await mine()).toEqual(["reservations"]);
  });

  it("upgrading turns it all back on, as it was; nothing was deleted", async () => {
    // Data is all still there.
    const [counts] = await sql<{ promos: number; segs: number; camps: number; scheduled: number }[]>`
      select (select count(*)::int from promotions where org_id = ${orgA}) as promos,
             (select count(*)::int from segments where org_id = ${orgA}) as segs,
             (select count(*)::int from campaigns where org_id = ${orgA}) as camps,
             (select count(*)::int from campaigns where org_id = ${orgA} and status = 'scheduled') as scheduled`;
    expect(counts).toEqual({ promos: 2, segs: 1, camps: 2, scheduled: 0 }); // the scheduled one went back to draft
    expect(await logged(orgA, "campaign.unscheduled")).toBe(1);
    expect((await getOrderingSettings(sql, orgA)).pickupEnabled).toBe(true);

    expect(await toPass()).toMatchObject({ ok: true });
    expect(await loadGuestApp(sql, siteSlug)).not.toBeNull();
    expect(await publicProgram(sql, orgA)).toMatchObject({ visitsRequired: 2 });
    expect((await promotionsForOrder(sql, orgA, null, new Date())).length).toBe(2);
    expect(await hasAutomaticPromotions(sql, orgA)).toBe(true);
    expect(await saveOrderingSettings(sql, owner, { ...(await getOrderingSettings(sql, orgA)), leadMinutes: 30 })).toBeNull();
    const mine = (await scheduledRuns(sql)).runs.filter((r) => r.org === `billa-${tag}`).map((r) => r.agent).sort();
    expect(mine).toEqual(["reservations", "reviews"]);
    // The open request for The Pass, if any, is closed by the change; Group's stays open.
    expect((await sql`select 1 from plan_requests where org_id = ${orgA} and status = 'open' and plan = 'group'`).length).toBe(1);
  });

  it("counts this month's usage in the restaurant's timezone: sent vs dry run, transactional vs marketing", async () => {
    const now = new Date("2025-11-12T20:00:00Z");
    // Nov 1 00:00 in Los Angeles is 07:00 UTC.
    const [g] = await sql<{ id: string }[]>`insert into guests (org_id, phone, name) values (${orgA}, '+13105550111', 'Usage Guest') returning id`;
    const msg = (channel: string, kind: string, status: string, at: string) =>
      sql`insert into guest_messages (org_id, guest_id, channel, kind, body, status, sent_by, created_at) values (${orgA}, ${g.id}, ${channel}, ${kind}, 'x', ${status}, 'system', ${at})`;
    await msg("sms", "transactional", "sent", "2025-11-01T07:30:00Z");  // Nov 1, 12:30 am in LA: this month
    await msg("sms", "transactional", "sent", "2025-11-01T06:30:00Z");  // Oct 31, 11:30 pm in LA: last month
    await msg("sms", "marketing", "sent", "2025-11-10T18:00:00Z");
    await msg("sms", "marketing", "sent", "2025-11-11T18:00:00Z");
    await msg("sms", "marketing", "dry_run", "2025-11-11T18:00:00Z");
    await msg("sms", "transactional", "failed", "2025-11-11T18:00:00Z");
    await msg("email", "marketing", "sent", "2025-11-11T18:00:00Z");
    await msg("email", "marketing", "dry_run", "2025-11-11T18:00:00Z");
    await msg("sms", "transactional", "sent", "2025-12-01T08:30:00Z");  // next month
    await sql`insert into agent_runs (org_id, agent_id, trigger, usage, started_at)
              values (${orgA}, 'reservations', 'test', ${sql.json({ input_tokens: 40000, output_tokens: 4000, cache_read_input_tokens: 1000 })}, '2025-11-05T12:00:00Z')`;
    await sql`insert into agent_runs (org_id, agent_id, trigger, usage, started_at)
              values (${orgA}, 'reservations', 'test', ${sql.json({ input_tokens: 99999, output_tokens: 1 })}, '2025-10-31T12:00:00Z')`;

    const u = await usageFor(sql, orgA, now);
    expect(u.month).toMatchObject({ label: "November 2025", tz: "America/Los_Angeles", daysElapsed: 12, daysInMonth: 30 });
    expect(u.month.start.toISOString()).toBe("2025-11-01T07:00:00.000Z");
    expect(u.texts).toEqual({ sent: 3, transactional: 1, marketing: 2, dryRun: 1, failed: 1 });
    expect(u.emails).toEqual({ sent: 1, dryRun: 1 });
    // Runs this month (the test runs above are dated now, not November 2025) plus chat replies.
    expect(u.ai.stations).toEqual({ input: 40000, output: 4000, cacheRead: 1000 });
    expect(u.ai.runs).toBe(1);
    // Another org sees none of it.
    expect((await usageFor(sql, orgB, now)).texts.sent).toBe(0);
  });

  it("over the allowance, a marketing send warns (never blocks) and transactional texts always go", async () => {
    await toHost(); // 500 texts included for one location
    const now = new Date();
    const [g] = await sql<{ id: string }[]>`insert into guests (org_id, phone, name) values (${orgA}, '+13105550122', 'Over Guest') returning id`;
    const before = (await usageFor(sql, orgA, now)).texts.sent;
    await sql`insert into guest_messages (org_id, guest_id, kind, body, status, sent_by, created_at)
              select ${orgA}, ${g.id}, 'transactional', 'x', 'sent', 'system', ${now} from generate_series(1, ${450 - before})`;
    const w = await marketingWarningFor(sql, orgA, 100, now);
    expect(w).toMatchObject({ included: 500, over: 50, cents: 65 });
    expect(w!.text).toBe("~50 texts over your 500 — about $0.65 at cost.");
    expect(await marketingWarningFor(sql, orgA, 40, now)).toBeNull();

    await sql`insert into guest_messages (org_id, guest_id, kind, body, status, sent_by, created_at)
              select ${orgA}, ${g.id}, 'transactional', 'x', 'sent', 'system', ${now} from generate_series(1, 100)`;
    const sent: string[] = [];
    await sendCancellationNotice(sql, { orgId: orgA, guestId: g.id, phone: "+13105550122", restaurant: "A", when: "Fri", restaurantPhone: null },
      async (to) => { sent.push(to); return { status: "sent", providerId: "SM1" }; });
    expect(sent).toEqual(["+13105550122"]);
    expect((await usageFor(sql, orgA, now)).texts.transactional).toBeGreaterThanOrEqual(551);
    await toPass();
  });

  it("isolation: one org's plan, requests and usage never touch another's", async () => {
    await toHost();
    expect((await planFor(sql, orgB)).plan).toBe("the_pass");
    expect(await saveOrderingSettings(sql, ownerB, { ...DEFAULT_SETTINGS, pickupEnabled: true })).toBeNull();
    expect((await sql`select 1 from plan_requests where org_id = ${orgB}`).length).toBe(0);
    // A staff tenant is scoped to one org: changing A leaves B alone.
    expect((await sql`select 1 from org_plans where org_id = ${orgB}`).length).toBe(0);
    await toPass();
  });
});
