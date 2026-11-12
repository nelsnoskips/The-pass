import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import type { MessagesClient } from "@/lib/agent-runtime/runner";
import { applyChange, chat, dismissChange, newThread, undoChange, type ChangeRow } from "@/lib/assistant";
import { parseClock } from "@/lib/assistant/chat-actions";
import type { SmsResult } from "@/lib/messaging/sms";
import type { Tenant } from "@/lib/platform/tenant";
import { zonedToUtc } from "@/lib/reservations/time";

type Block = Anthropic.Beta.Messages.BetaContentBlock;
const toolUse = (name: string, input: unknown): Block => ({ type: "tool_use", id: `toolu_${randomUUID()}`, name, input }) as Block;
const text = (t: string): Block => ({ type: "text", text: t, citations: null }) as Block;

function scripted(turns: Block[][]) {
  const seen: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming[] = [];
  let i = 0;
  const client: MessagesClient = {
    beta: { messages: { async create(params) {
      seen.push(structuredClone(params));
      const content = turns[i++] ?? [text("Done.")];
      return {
        id: "msg", type: "message", role: "assistant", model: params.model, content,
        stop_reason: content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn", stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      } as unknown as Anthropic.Beta.Messages.BetaMessage;
    } } },
  };
  return { client, seen };
}

/** The tool results the model was sent back, by tool name, in order. */
function results(seen: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming[]) {
  const out: Record<string, unknown>[] = [];
  for (const p of seen) {
    const last = p.messages[p.messages.length - 1];
    if (Array.isArray(last.content)) {
      for (const b of last.content) if (b.type === "tool_result") out.push(JSON.parse(String(b.content)));
    }
  }
  return out;
}

describe("clock parsing", () => {
  it("reads the ways people write a time", () => {
    expect(parseClock("19:30")).toBe("19:30");
    expect(parseClock("7:30pm")).toBe("19:30");
    expect(parseClock("7 PM")).toBe("19:00");
    expect(parseClock("12am")).toBe("00:00");
    expect(parseClock("25:00")).toBeNull();
    expect(parseClock("soon")).toBeNull();
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;
const TZ = "America/New_York";
// A Tuesday afternoon; the bookings are for Friday the 13th.
const NOW = zonedToUtc("2026-11-10", "14:00", TZ);
const FRI = "2026-11-13";

d("chat actions against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 5, onnotice: () => {} });
  let orgId = "", venueId = "";
  let owner: Tenant, manager: Tenant, host: Tenant, viewer: Tenant, stranger: Tenant;
  const sent: { to: string; body: string }[] = [];
  const sender = async (to: string, body: string): Promise<SmsResult> => { sent.push({ to, body }); return { status: "sent", providerId: `SM${sent.length}` }; };
  const changes = (thread: string) => sql<ChangeRow[]>`select * from chat_changes where thread_id = ${thread} order by created_at`;
  const ask = async (t: Tenant, turns: Block[][]) => {
    const thread = await newThread(sql, t, "x");
    const s = scripted([...turns, [text("It's waiting for your Apply.")]]);
    await chat(sql, t, thread, "please", s.client, NOW);
    return { thread, seen: s.seen, cards: await changes(thread) };
  };

  beforeAll(async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Actions Co', ${`ca-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    const [v] = await sql<{ id: string }[]>`
      insert into venues (org_id, name, slug, timezone, phone) values (${orgId}, 'Main', 'main', ${TZ}, '(954) 555-0100') returning id`;
    venueId = v.id;
    await sql`insert into dining_tables (org_id, venue_id, label, max_covers) values (${orgId}, ${venueId}, '4A', 4)`;
    await sql`insert into service_periods (org_id, venue_id, name, days_of_week, first_seating, last_seating)
              values (${orgId}, ${venueId}, 'Dinner', '{2,3,4,5,6}', '17:00', '21:00')`;
    owner = { orgId, actor: "owner@ca", role: "owner", venueIds: null };
    manager = { orgId, actor: "manager@ca", role: "manager", venueIds: null };
    host = { orgId, actor: "host@ca", role: "host", venueIds: null };
    viewer = { orgId, actor: "viewer@ca", role: "viewer", venueIds: null };
    stranger = { orgId: randomUUID(), actor: "x", role: "owner", venueIds: null };
  });
  afterAll(async () => { await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  it("create_booking: a card with the booking and table; made only on Apply, as the person who pressed it", async () => {
    const { cards, seen } = await ask(host, [[toolUse("create_booking", { name: "Maria Lopez", phone: "(954) 555-1234", party_size: 4, date: FRI, time: "7:30pm", notes: "Anniversary" })]]);
    expect(cards).toHaveLength(1);
    const [c] = cards;
    expect(c).toMatchObject({ kind: "action", action: "create_booking", pillar: "reservations", status: "pending", risk: "confirm", before: "", requested_by: "host@ca" });
    expect(c.after).toContain("Maria Lopez");
    expect(c.after).toContain("4 guests");
    expect(c.after).toContain("7:30 PM");
    expect(c.after).toContain("table 4A");
    expect(c.action_input).toMatchObject({ venue_id: venueId, phone: "+19545551234", time: "19:30", party_size: 4 });
    expect(results(seen)[0]).toMatchObject({ status: "waiting_for_apply" });
    // Nothing booked yet.
    expect(await sql`select 1 from reservations where org_id = ${orgId}`).toHaveLength(0);

    // A viewer can't; another restaurant can't even see it.
    expect(await applyChange(sql, viewer, c.id, NOW)).toMatchObject({ ok: false, error: expect.stringContaining("role") });
    expect(await applyChange(sql, stranger, c.id, NOW)).toMatchObject({ ok: false });
    expect((await sql<{ status: string }[]>`select status from chat_changes where id = ${c.id}`)[0].status).toBe("pending");

    // Two presses at once make one booking.
    const both = await Promise.all([applyChange(sql, owner, c.id, NOW), applyChange(sql, owner, c.id, NOW)]);
    expect(both.filter((r) => r.ok)).toHaveLength(1);
    const res = await sql<{ id: string; source: string; party_size: number; notes: string }[]>`select id, source, party_size, notes from reservations where org_id = ${orgId}`;
    expect(res).toEqual([{ id: expect.any(String), source: "phone", party_size: 4, notes: "Anniversary" }]);
    const [done] = await sql<ChangeRow[]>`select * from chat_changes where id = ${c.id}`;
    expect(done).toMatchObject({ status: "applied", decided_by: "owner@ca", result: { reservation_id: res[0].id, table: "4A" } });
    const [logged] = await sql<{ actor: string }[]>`select actor from change_log where org_id = ${orgId} and action = 'reservation.created'`;
    expect(logged.actor).toBe("owner@ca");
    // Actions can't be undone from the card.
    expect(await undoChange(sql, owner, c.id)).toMatchObject({ ok: false, error: expect.stringContaining("ask") });
  });

  it("create_booking: a time that isn't free gives the options and no card", async () => {
    const { cards, seen } = await ask(owner, [[toolUse("create_booking", { name: "Sam", phone: "", party_size: 2, date: FRI, time: "19:30", notes: "" })]]);
    expect(cards).toHaveLength(0);
    expect(String(results(seen)[0].error)).toMatch(/isn't free for 2 that day\. Free nearby: .*PM/);
    const { cards: none } = await ask(viewer, [[toolUse("create_booking", { name: "Sam", phone: "", party_size: 2, date: FRI, time: "17:00", notes: "" })]]);
    expect(none).toHaveLength(0);
  });

  it("cancel_booking: finds the booking, cancels on Apply and texts the guest", async () => {
    // Ambiguous: two Marias that day.
    const [g] = await sql<{ id: string }[]>`insert into guests (org_id, phone, name) values (${orgId}, '+19545550000', 'Maria Other') returning id`;
    const start = zonedToUtc(FRI, "17:00", TZ);
    await sql`insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, manage_token)
              values (${orgId}, ${venueId}, ${g.id}, 2, ${start}, ${new Date(start.getTime() + 90 * 60_000)}, ${randomUUID()})`;
    const amb = await ask(owner, [[toolUse("cancel_booking", { guest_name: "maria", date: FRI, time: "" })]]);
    expect(amb.cards).toHaveLength(0);
    expect(String(results(amb.seen)[0].error)).toContain("More than one booking");

    const { cards } = await ask(owner, [[toolUse("cancel_booking", { guest_name: "maria", date: FRI, time: "7:30 pm" })]]);
    const [c] = cards;
    expect(c).toMatchObject({ kind: "action", action: "cancel_booking", status: "pending", after: "Cancelled" });
    expect(c.before).toContain("Maria Lopez · 4 guests");
    expect(c.reason).toContain("gets a text");
    expect(await applyChange(sql, owner, c.id, NOW, { sender })).toEqual({ ok: true });
    const [r] = await sql<{ status: string }[]>`select r.status from reservations r join guests g on g.id = r.guest_id where g.name = 'Maria Lopez' and r.org_id = ${orgId}`;
    expect(r.status).toBe("cancelled");
    expect(sent).toEqual([{ to: "+19545551234", body: expect.stringContaining("we've had to cancel your reservation") }]);
    const [m] = await sql<{ kind: string; status: string }[]>`select kind, status from guest_messages where org_id = ${orgId}`;
    expect(m).toEqual({ kind: "transactional", status: "sent" });
    const [after] = await sql<ChangeRow[]>`select * from chat_changes where id = ${c.id}`;
    expect(after).toMatchObject({ status: "applied", after: "Cancelled · guest texted", decided_by: "owner@ca" });

    // Already cancelled: a second card for it can't apply.
    const again = await ask(owner, [[toolUse("cancel_booking", { guest_name: "Maria Other", date: FRI, time: "" })]]);
    await sql`update reservations set status = 'seated' where guest_id = ${g.id}`;
    expect(await applyChange(sql, owner, again.cards[0].id, NOW, { sender })).toMatchObject({ ok: false, error: expect.stringContaining("seated") });
    expect((await sql<{ status: string }[]>`select status from chat_changes where id = ${again.cards[0].id}`)[0].status).toBe("failed");
  });

  it("cancel_booking without Twilio records a dry run", async () => {
    const [g] = await sql<{ id: string }[]>`insert into guests (org_id, phone, name) values (${orgId}, '+19545550111', 'Dry Run') returning id`;
    const start = zonedToUtc(FRI, "20:00", TZ);
    await sql`insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, manage_token)
              values (${orgId}, ${venueId}, ${g.id}, 2, ${start}, ${new Date(start.getTime() + 90 * 60_000)}, ${randomUUID()})`;
    const { cards } = await ask(owner, [[toolUse("cancel_booking", { guest_name: "Dry Run", date: FRI, time: "" })]]);
    expect(await applyChange(sql, owner, cards[0].id, NOW)).toEqual({ ok: true });
    const [m] = await sql<{ status: string }[]>`select status from guest_messages where guest_id = ${g.id}`;
    expect(m.status).toBe("dry_run");
  });

  it("update_order_status: only the next step, re-checked at Apply, logged as the person", async () => {
    const [g] = await sql<{ id: string }[]>`insert into guests (org_id, phone, name) values (${orgId}, '+19545550222', 'Olu Order') returning id`;
    const [o] = await sql<{ id: string }[]>`
      insert into orders (org_id, venue_id, guest_id, number, kind, status, name, phone, ready_at, items, subtotal_cents, total_cents, manage_token)
      values (${orgId}, ${venueId}, ${g.id}, 4821, 'pickup', 'placed', 'Olu Order', '+19545550222', ${NOW}, '[]', 2500, 2700, ${randomUUID()}) returning id`;
    const bad = await ask(host, [[toolUse("update_order_status", { order_number: 4821, status: "completed" })]]);
    expect(bad.cards).toHaveLength(0);
    expect(String(results(bad.seen)[0].error)).toContain("can't go to picked up");

    const { cards } = await ask(host, [[toolUse("update_order_status", { order_number: 4821, status: "accepted" })]]);
    expect(cards[0]).toMatchObject({ before: "Order 4821 · Olu Order · $27.00 · New", after: "Accepted", pillar: "ordering" });
    expect(await applyChange(sql, host, cards[0].id, NOW, { sender })).toEqual({ ok: true });
    expect((await sql<{ status: string }[]>`select status from orders where id = ${o.id}`)[0].status).toBe("accepted");
    const [l] = await sql<{ actor: string }[]>`select actor from change_log where org_id = ${orgId} and action = 'order.accepted'`;
    expect(l.actor).toBe("host@ca");

    // Ready: a stale card fails, a fresh one texts the guest.
    const stale = await ask(host, [[toolUse("update_order_status", { order_number: 4821, status: "ready" })]]);
    const fresh = await ask(host, [[toolUse("update_order_status", { order_number: 4821, status: "cancelled" })]]);
    expect(fresh.cards[0].reason).toContain("text that it's cancelled");
    expect(await applyChange(sql, host, stale.cards[0].id, NOW, { sender })).toEqual({ ok: true });
    expect(sent.at(-1)).toEqual({ to: "+19545550222", body: expect.stringContaining("order 4821 is ready") });
    expect(await applyChange(sql, host, fresh.cards[0].id, NOW, { sender })).toMatchObject({ ok: false, error: expect.stringContaining("changed since") });
  });

  it("add_team_member: needs manage_team to ask and to apply", async () => {
    const asked = await ask(manager, [[toolUse("add_team_member", { email: "New@Host.com", role: "host" })]]);
    expect(asked.cards).toHaveLength(0);
    expect(String(results(asked.seen)[0].error)).toContain("isn't allowed");

    const { cards } = await ask(owner, [[toolUse("add_team_member", { email: "New@Host.com", role: "host" })]]);
    expect(cards[0]).toMatchObject({ pillar: "team", before: "", after: expect.stringContaining("new@host.com · Host") });
    expect(await applyChange(sql, manager, cards[0].id, NOW)).toMatchObject({ ok: false });
    expect((await sql<{ status: string }[]>`select status from chat_changes where id = ${cards[0].id}`)[0].status).toBe("pending");
    expect(await applyChange(sql, owner, cards[0].id, NOW)).toEqual({ ok: true });
    expect(await sql`select role from org_members where org_id = ${orgId} and email = 'new@host.com'`).toEqual([{ role: "host" }]);
    const [l] = await sql<{ actor: string }[]>`select actor from change_log where org_id = ${orgId} and action = 'team.member_set'`;
    expect(l.actor).toBe("owner@ca");

    // Changing a role shows the role it was; dismissing does nothing.
    const { cards: promote } = await ask(owner, [[toolUse("add_team_member", { email: "new@host.com", role: "manager" })]]);
    expect(promote[0].before).toContain("Host");
    expect(await dismissChange(sql, owner, promote[0].id)).toBe(true);
    expect(await applyChange(sql, owner, promote[0].id, NOW)).toMatchObject({ ok: false });
    expect(await sql`select role from org_members where org_id = ${orgId} and email = 'new@host.com'`).toEqual([{ role: "host" }]);
  });

  it("lever changes still work and are marked as levers", async () => {
    const { cards } = await ask(owner, [[toolUse("change_setting", { pillar: "reservations", key: "max_party_online", value: "11", reason: "Asked." })]]);
    expect(cards[0]).toMatchObject({ kind: "lever", action: null, status: "applied", after: 11 });
    expect(await undoChange(sql, owner, cards[0].id)).toEqual({ ok: true });
  });
});
