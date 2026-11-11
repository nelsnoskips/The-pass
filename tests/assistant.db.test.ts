import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import type { MessagesClient } from "@/lib/agent-runtime/runner";
import { applyChange, chat, dismissChange, newThread, undoChange, type ChangeRow } from "@/lib/assistant";
import { lever, leverHistory, parseLeverValue, readLevers, setLever, withLeverDiff } from "@/lib/levers";
import { saveVenueRules } from "@/lib/platform/settings";
import type { Tenant } from "@/lib/platform/tenant";

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

describe("lever values", () => {
  it("reads what people type, and refuses what's out of range", () => {
    expect(parseLeverValue(lever("reservations", "booking_window_days")!, "60 days")).toEqual({ ok: true, value: 60 });
    expect(parseLeverValue(lever("reservations", "booking_window_days")!, "400").ok).toBe(false);
    expect(parseLeverValue(lever("ordering", "tax_percent")!, "7.5%")).toEqual({ ok: true, value: 7.5 });
    expect(parseLeverValue(lever("ordering", "catering_minimum")!, "$250")).toEqual({ ok: true, value: 25000 });
    expect(parseLeverValue(lever("ordering", "pickup_enabled")!, "off")).toEqual({ ok: true, value: false });
    expect(parseLeverValue(lever("ordering", "pickup_enabled")!, "maybe").ok).toBe(false);
    expect(parseLeverValue(lever("ordering", "sold_out")!, "lamb, gyro, lamb")).toEqual({ ok: true, value: ["lamb", "gyro"] });
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("assistant and levers against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  let orgId = "", venueId = "";
  let owner: Tenant, host: Tenant, stranger: Tenant;
  const changes = (thread: string) => sql<ChangeRow[]>`select * from chat_changes where thread_id = ${thread} order by created_at`;
  const venue = async () => (await sql<{ booking_horizon_days: number; cancellation_policy: string }[]>`
    select booking_horizon_days, cancellation_policy from venues where id = ${venueId}`)[0];

  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Chat Co', ${`chat-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    const [v] = await sql<{ id: string }[]>`
      insert into venues (org_id, name, slug, timezone, booking_horizon_days, cancellation_policy)
      values (${orgId}, 'Main', 'main', 'America/New_York', 30, 'Cancel by 2pm.') returning id`;
    venueId = v.id;
    owner = { orgId, actor: "owner@chat", role: "owner", venueIds: null };
    host = { orgId, actor: "host@chat", role: "host", venueIds: null };
    stranger = { orgId: randomUUID(), actor: "x", role: "owner", venueIds: null };
  });
  afterAll(async () => { await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  it("a lever change goes through the pillar's own rules, with permission, and is recorded", async () => {
    expect(await setLever(sql, host, "reservations", "booking_window_days", "45", "settings")).toMatchObject({ ok: false });
    expect(await setLever(sql, owner, "reservations", "booking_window_days", "45", "settings")).toEqual({ ok: true, before: 30, after: 45 });
    expect(await setLever(sql, owner, "reservations", "booking_window_days", "45", "settings")).toMatchObject({ ok: false, error: expect.stringContaining("already") });
    // A host can pause pickups: an operational lever.
    expect(await setLever(sql, host, "ordering", "paused", "20", "settings")).toMatchObject({ ok: true, before: null });
    const h = await leverHistory(sql, owner, "reservations");
    expect(h[0]).toMatchObject({ label: "Booking window", before: 30, after: 45, actor: "owner@chat", via: "settings" });
  });

  it("chat applies an internal setting at once and shows it; a public one waits for Apply", async () => {
    const thread = await newThread(sql, owner, "Book further ahead");
    const { client, seen } = scripted([
      [toolUse("get_settings", { pillar: "reservations" })],
      [toolUse("change_setting", { pillar: "reservations", key: "booking_window_days", value: "60", reason: "Owner asked for 60 days." }),
       toolUse("change_setting", { pillar: "reservations", key: "cancellation_policy", value: "Cancel by noon, please.", reason: "Owner asked." })],
      [text("Guests can now book 60 days ahead. The new cancellation policy is waiting for your Apply.")],
    ]);
    const r = await chat(sql, owner, thread, "Let guests book 60 days ahead and change the cancellation policy to noon", client);
    expect(r.changes).toHaveLength(2);
    // The model saw the real settings, as the person's own permissions allow.
    expect(JSON.stringify(seen[1].messages)).toContain("Booking window");
    const [auto, confirm] = await changes(thread);
    expect(auto).toMatchObject({ lever: "booking_window_days", status: "applied", risk: "auto", before: 45, after: 60, requested_by: "owner@chat" });
    expect(confirm).toMatchObject({ lever: "cancellation_policy", status: "pending", risk: "confirm", before: "Cancel by 2pm.", after: "Cancel by noon, please." });
    expect(await venue()).toEqual({ booking_horizon_days: 60, cancellation_policy: "Cancel by 2pm." });
    // Both messages are kept, and the changes hang off the reply.
    const msgs = await sql<{ role: string }[]>`select role from chat_messages where thread_id = ${thread} order by created_at`;
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(auto.message_id).not.toBeNull();

    // Apply: the person presses it, under their own permissions.
    expect(await applyChange(sql, stranger, confirm.id)).toMatchObject({ ok: false });
    expect(await applyChange(sql, owner, confirm.id)).toEqual({ ok: true });
    expect((await venue()).cancellation_policy).toBe("Cancel by noon, please.");
    expect(await applyChange(sql, owner, confirm.id)).toMatchObject({ ok: false });

    // Undo the instant one: back to how it was, and the history says so.
    expect(await undoChange(sql, owner, auto.id)).toEqual({ ok: true });
    expect((await venue()).booking_horizon_days).toBe(45);
    const h = await leverHistory(sql, owner, "reservations");
    expect(h.map((x) => [x.label, x.via])).toEqual([
      ["Booking window", "assistant (undo)"], ["Cancellation policy", "assistant"], ["Booking window", "assistant"], ["Booking window", "settings"],
    ]);
  });

  it("refuses a stale Apply, a role that can't, and a setting that doesn't exist", async () => {
    const thread = await newThread(sql, owner, "x");
    const { client } = scripted([
      [toolUse("change_setting", { pillar: "reservations", key: "phone", value: "(954) 555-0100", reason: "r" }),
       toolUse("change_setting", { pillar: "reservations", key: "secret_lever", value: "1", reason: "r" })],
      [text("ok")],
    ]);
    await chat(sql, owner, thread, "change the phone", client);
    const [c] = await changes(thread);
    expect(c.status).toBe("pending");
    // Someone changes it by hand before Apply is pressed.
    await setLever(sql, owner, "reservations", "phone", "(954) 555-0199", "settings");
    expect(await applyChange(sql, owner, c.id)).toMatchObject({ ok: false, error: expect.stringContaining("changed since") });
    expect((await changes(thread))[0].status).toBe("failed");

    // A host asking the assistant can't get a manager's change made.
    const t2 = await newThread(sql, host, "y");
    const { client: c2 } = scripted([[toolUse("change_setting", { pillar: "reservations", key: "booking_window_days", value: "90", reason: "r" })], [text("Can't.")]]);
    await chat(sql, host, t2, "book 90 days ahead", c2);
    expect(await changes(t2)).toHaveLength(0);
    expect((await venue()).booking_horizon_days).toBe(45);
  });

  it("a change made in a settings form shows in the same history", async () => {
    const rules = { bookingHorizonDays: 21, minNoticeMinutes: 75, maxPartyOnline: 9, cancellationPolicy: "Cancel by noon, please.",
      cancelCutoffHours: 3, phone: "(954) 555-0199", address: "", timezone: "America/New_York" };
    const before = (await leverHistory(sql, owner, "reservations", 50)).length;
    await withLeverDiff(sql, owner, "reservations", "settings", () => saveVenueRules(sql, owner, venueId, rules));
    const h = await leverHistory(sql, owner, "reservations", 50);
    // Only what moved is recorded: the policy and phone were unchanged.
    expect(h.slice(0, h.length - before).map((x) => [x.label, x.after, x.via]).sort())
      .toEqual([["Booking window", 21, "settings"], ["Cancellation cut-off", 3, "settings"], ["Largest online party", 9, "settings"], ["Minimum notice", 75, "settings"]]);
  });

  it("dismissed changes never apply, and another restaurant sees none of it", async () => {
    const thread = await newThread(sql, owner, "z");
    const { client } = scripted([[toolUse("change_setting", { pillar: "reservations", key: "cancellation_policy", value: "No cancellations.", reason: "r" })], [text("ok")]]);
    await chat(sql, owner, thread, "x", client);
    const [c] = await changes(thread);
    expect(await dismissChange(sql, stranger, c.id)).toBe(false);
    expect(await dismissChange(sql, owner, c.id)).toBe(true);
    expect(await applyChange(sql, owner, c.id)).toMatchObject({ ok: false });
    expect(await leverHistory(sql, stranger, "reservations")).toEqual([]);
    expect(await readLevers(sql, stranger, "reservations")).toEqual([]);
  });
});
