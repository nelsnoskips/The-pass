import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { runAgent, type MessagesClient } from "@/lib/agent-runtime/runner";
import { approveProposal, rejectProposal } from "@/lib/agent-runtime/proposals";
import { reservationsAgent } from "@/lib/agent-runtime/agents/reservations";
import { evaluate } from "@/lib/agent-runtime/policy";
import { defineTool, type AgentContext } from "@/lib/agent-runtime/tool";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";
import { zonedToUtc } from "@/lib/reservations/time";
import type { SmsResult } from "@/lib/messaging/sms";

/**
 * The runtime's guarantees, against real Postgres, with the model
 * scripted: what an agent asks for is never what decides what happens.
 */
const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;
const TZ = "America/New_York";
// A Tuesday, 2pm local: inside the sending window.
const DAY = zonedToUtc("2026-11-10", "14:00", TZ);
const NIGHT = zonedToUtc("2026-11-10", "23:30", TZ);

type Block = Anthropic.Beta.Messages.BetaContentBlock;
const toolUse = (name: string, input: unknown): Block =>
  ({ type: "tool_use", id: `toolu_${randomUUID()}`, name, input }) as Block;
const text = (t: string): Block => ({ type: "text", text: t, citations: null }) as Block;

/** A model that plays back a fixed script and records what it was sent. */
function scripted(turns: Block[][]) {
  const seen: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming[] = [];
  let i = 0;
  const client: MessagesClient = {
    beta: {
      messages: {
        async create(params) {
          seen.push(structuredClone(params));
          const content = turns[i++] ?? [text("Done.")];
          return {
            id: "msg", type: "message", role: "assistant", model: params.model, content,
            stop_reason: content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn",
            stop_sequence: null,
            usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
          } as unknown as Anthropic.Beta.Messages.BetaMessage;
        },
      },
    },
  };
  return { client, seen };
}

d("agent runtime", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 5, onnotice: () => {} });
  let orgId = "";
  let owner: Tenant, host: Tenant;
  const g = { consented: "", noConsent: "", optedOut: "" };
  const sent: { to: string; body: string }[] = [];
  const sender = async (to: string, body: string): Promise<SmsResult> => {
    sent.push({ to, body });
    return { status: "sent", providerId: `SM${sent.length}` };
  };
  const agent = reservationsAgent(sender);

  beforeAll(async () => {
    const [org] = await sql<{ id: string }[]>`
      insert into orgs (name, slug) values ('Runtime', ${`rt-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = org.id;
    const [v] = await sql<{ id: string }[]>`
      insert into venues (org_id, name, slug, timezone) values (${orgId}, 'Main', 'main', ${TZ}) returning id`;
    await sql`insert into dining_tables (org_id, venue_id, label, max_covers) values (${orgId}, ${v.id}, '4A', 4), (${orgId}, ${v.id}, '4B', 4)`;
    await sql`insert into service_periods (org_id, venue_id, name, days_of_week, first_seating, last_seating)
              values (${orgId}, ${v.id}, 'Dinner', '{2,3,4,5,6}', '17:00', '21:00')`;
    const longAgo = new Date(DAY.getTime() - 80 * 86_400_000);
    const mk = async (name: string, phone: string, consent: boolean, optedOut = false) => {
      const [r] = await sql<{ id: string }[]>`
        insert into guests (org_id, phone, name, visit_count, last_visit_at, sms_consent_at, sms_consent_source, sms_opted_out_at)
        values (${orgId}, ${phone}, ${name}, 4, ${longAgo}, ${consent ? longAgo : null}, ${consent ? "booking:website" : null}, ${optedOut ? longAgo : null})
        returning id`;
      return r.id;
    };
    g.consented = await mk("Ana Perez", "+19545550001", true);
    g.noConsent = await mk("Ben Cole", "+19545550002", false);
    g.optedOut = await mk("Cy Dunn", "+19545550003", true, true);
    owner = { orgId, actor: "owner@rt", role: "owner", venueIds: null };
    host = { orgId, actor: "host@rt", role: "host", venueIds: null };
  });

  afterAll(async () => {
    await sql`delete from orgs where id = ${orgId}`;
    await sql.end();
  });

  const run = (turns: Block[][], now = DAY) => {
    const s = scripted(turns);
    return runAgent({ sql, agent, tenant: owner, trigger: "test", task: "Weekly check.", client: s.client, now }).then((outcome) => ({ outcome, seen: s.seen }));
  };

  it("runs read tools immediately and hands the results back to the model", async () => {
    const { outcome, seen } = await run([
      [toolUse("get_bookings_outlook", { days: 3 })],
      [toolUse("find_lapsed_guests", { min_visits: 2, lapsed_days: 60 })],
      [text("Quiet week; nothing proposed.")],
    ]);
    expect(outcome.status).toBe("completed");
    expect(outcome.summary).toBe("Quiet week; nothing proposed.");
    expect(outcome.actions.map((a) => a.verdict)).toEqual(["ran", "ran"]);

    // The lapsed-guest result is what the model saw on its third turn.
    const last = seen[2].messages.at(-1)!;
    const payload = JSON.parse(((last.content as Anthropic.Beta.Messages.BetaToolResultBlockParam[])[0].content as string));
    expect(payload.guests.map((x: { firstName: string }) => x.firstName)).toEqual(["Ana"]);
    expect(payload.leftOutNoConsentOrRecentlyTexted).toBe(2);
    // Tools go to the model as strict, and the request opts into fallbacks.
    expect(seen[0].tools!.every((t) => "strict" in t && t.strict === true)).toBe(true);
    expect(seen[0].fallbacks).toBe("default");
  });

  it("queues a marketing text instead of sending it", async () => {
    sent.length = 0;
    const { outcome } = await run([
      [toolUse("send_guest_sms", { guest_ids: [g.consented, g.noConsent], message: "Thursday's quiet — come see us.", rationale: "Thursday has 0 of 8 seats booked." })],
      [text("Proposed one text.")],
    ]);
    expect(outcome.actions[0].verdict).toBe("proposed");
    expect(sent).toEqual([]);
    const [p] = await sql<{ status: string; rationale: string; title: string }[]>`
      select status, rationale, title from agent_proposals where id = ${outcome.actions[0].detail!}`;
    expect(p.status).toBe("pending");
    expect(p.rationale).toContain("0 of 8");
    expect(p.title).toContain("Text 2 guests");
  });

  it("refuses outright when nobody on the list has consented, and tells the model why", async () => {
    const { outcome, seen } = await run([
      [toolUse("send_guest_sms", { guest_ids: [g.noConsent, g.optedOut], message: "Come in!", rationale: "x" })],
      [text("Couldn't text anyone.")],
    ]);
    expect(outcome.actions[0].verdict).toBe("denied");
    const result = (seen[1].messages.at(-1)!.content as Anthropic.Beta.Messages.BetaToolResultBlockParam[])[0];
    expect(result.is_error).toBe(true);
    expect(result.content).toContain("Refused by policy");
    const [l] = await sql<{ action: string }[]>`
      select action from change_log where org_id = ${orgId} and action = 'agent.denied' order by id desc limit 1`;
    expect(l).toBeDefined();
  });

  it("on approval sends only to consenting guests, adds the opt-out, and records it", async () => {
    sent.length = 0;
    const { outcome } = await run([
      [toolUse("send_guest_sms", { guest_ids: [g.consented, g.noConsent, g.optedOut], message: "Thursday's quiet — come see us.", rationale: "r" })],
    ]);
    const id = outcome.actions[0].detail!;

    // A host can't approve messaging; the proposal stays pending for someone who can.
    await expect(approveProposal(sql, host, id, agent.tools, DAY)).rejects.toBeInstanceOf(Forbidden);
    // Outside the sending window it is blocked, not sent.
    // (Blocked proposals are final; propose again for the daytime case.)
    const night = await approveProposal(sql, owner, id, agent.tools, NIGHT);
    expect(night).toMatchObject({ ok: false, reason: "blocked" });
    expect(sent).toEqual([]);

    const again = await run([[toolUse("send_guest_sms", { guest_ids: [g.consented, g.noConsent, g.optedOut], message: "Thursday's quiet — come see us.", rationale: "r" })]]);
    const res = await approveProposal(sql, owner, again.outcome.actions[0].detail!, agent.tools, DAY);
    expect(res).toMatchObject({ ok: true, result: { sent: 1, skipped: 2 } });
    expect(sent).toEqual([{ to: "+19545550001", body: "Thursday's quiet — come see us. Reply STOP to opt out." }]);
    // Approving twice does nothing.
    expect(await approveProposal(sql, owner, again.outcome.actions[0].detail!, agent.tools, DAY)).toMatchObject({ ok: false, reason: "already_decided" });

    const msgs = await sql<{ sent_by: string; kind: string }[]>`select sent_by, kind from guest_messages where org_id = ${orgId}`;
    expect(msgs).toEqual([{ sent_by: "agent:reservations", kind: "marketing" }]);
  });

  it("won't text the same guest twice in a week", async () => {
    const { outcome } = await run([
      [toolUse("send_guest_sms", { guest_ids: [g.consented], message: "Friday too!", rationale: "r" })],
    ]);
    expect(outcome.actions[0]).toMatchObject({ verdict: "denied" });
  });

  it("re-checks consent at approval: an opt-out after the proposal blocks the send", async () => {
    const [fresh] = await sql<{ id: string }[]>`
      insert into guests (org_id, phone, name, visit_count, last_visit_at, sms_consent_at, sms_consent_source)
      values (${orgId}, '+19545550009', 'Dee Fox', 3, ${new Date(DAY.getTime() - 70 * 86_400_000)}, now(), 'booking:website') returning id`;
    const { outcome } = await run([[toolUse("send_guest_sms", { guest_ids: [fresh.id], message: "We miss you.", rationale: "r" })]]);
    expect(outcome.actions[0].verdict).toBe("proposed");
    await sql`update guests set sms_opted_out_at = now() where id = ${fresh.id}`;
    sent.length = 0;
    expect(await approveProposal(sql, owner, outcome.actions[0].detail!, agent.tools, DAY)).toMatchObject({ ok: false, reason: "blocked" });
    expect(sent).toEqual([]);
  });

  it("rejecting a proposal closes it, and other orgs can't touch it", async () => {
    const [fresh] = await sql<{ id: string }[]>`
      insert into guests (org_id, phone, name, visit_count, last_visit_at, sms_consent_at, sms_consent_source)
      values (${orgId}, '+19545550010', 'Eli Gray', 3, ${new Date(DAY.getTime() - 70 * 86_400_000)}, now(), 'booking:website') returning id`;
    const { outcome } = await run([[toolUse("send_guest_sms", { guest_ids: [fresh.id], message: "Hello again.", rationale: "r" })]]);
    const id = outcome.actions[0].detail!;
    const stranger: Tenant = { orgId: randomUUID(), actor: "x@y", role: "owner", venueIds: null };
    expect(await approveProposal(sql, stranger, id, agent.tools, DAY)).toMatchObject({ ok: false, reason: "not_found" });
    expect(await rejectProposal(sql, owner, id)).toBe(true);
    expect(await approveProposal(sql, owner, id, agent.tools, DAY)).toMatchObject({ ok: false, reason: "already_decided" });
  });

  it("stops a runaway loop and records the run", async () => {
    const loop = Array.from({ length: 20 }, () => [toolUse("get_bookings_outlook", { days: 3 })]);
    const s = scripted(loop);
    const outcome = await runAgent({ sql, agent: { ...agent, maxTurns: 3 }, tenant: owner, trigger: "test", task: "t", client: s.client, now: DAY });
    expect(outcome.status).toBe("stopped");
    expect(s.seen).toHaveLength(3);
    const [r] = await sql<{ status: string; usage: { input_tokens: number } }[]>`select status, usage from agent_runs where id = ${outcome.runId}`;
    expect(r).toMatchObject({ status: "stopped", usage: { input_tokens: 30 } });
  });

  it("policy: an agent whose tenant lacks the permission is denied before any rule runs", async () => {
    const tool = defineTool<Record<string, never>>({
      name: "x", description: "", tier: "auto", requires: "approve_spend",
      inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      run: async () => "ran",
    });
    const ctx: AgentContext = { sql, tenant: host, agentId: "t", runId: null, now: DAY };
    expect(await evaluate(tool, ctx, {}, "execute")).toMatchObject({ kind: "deny" });
    expect(await evaluate(tool, { ...ctx, tenant: owner }, {}, "execute")).toEqual({ kind: "run" });
  });
});
