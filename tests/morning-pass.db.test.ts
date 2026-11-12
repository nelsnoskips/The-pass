import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { buildMorningPass, renderMorningPassText, usualLine } from "@/lib/brief";
import { sendDueBriefs, type BriefSender } from "@/lib/brief/send";
import { readBriefSettings, saveBriefSettings } from "@/lib/brief/settings";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";
import type { MessagesClient } from "@/lib/agent-runtime/runner";
import { chat, newThread } from "@/lib/assistant";

type Block = Anthropic.Beta.Messages.BetaContentBlock;
function scripted(turns: Block[][]) {
  const seen: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming[] = [];
  let i = 0;
  const client: MessagesClient = {
    beta: { messages: { async create(params) {
      seen.push(structuredClone(params));
      const content = turns[i++] ?? [{ type: "text", text: "Seven covers last night.", citations: null } as Block];
      return {
        id: "msg", type: "message", role: "assistant", model: params.model, content,
        stop_reason: content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn", stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      } as unknown as Anthropic.Beta.Messages.BetaMessage;
    } } },
  };
  return { client, seen };
}

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;
// Thursday Nov 12, 10:00 AM in New York (7:00 AM in Los Angeles).
const NOW = new Date("2026-11-12T15:00:00Z");

d("the morning pass against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 5, onnotice: () => {} });
  const orgs: string[] = [];
  let A: Tenant, B: Tenant, C: Tenant, hostA: Tenant;
  let slugA = "", slugB = "";

  const org = async (name: string, createdAt: string, tz: string) => {
    const slug = `mp-${randomUUID().slice(0, 8)}`;
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug, created_at) values (${name}, ${slug}, ${createdAt}) returning id`;
    orgs.push(o.id);
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug, timezone) values (${o.id}, ${name}, 'main', ${tz}) returning id`;
    return { orgId: o.id, venueId: v.id, slug };
  };
  let phoneN = 0;
  const guest = async (orgId: string, name: string, extra: { notes?: string; tags?: string[] } = {}) => {
    const [g] = await sql<{ id: string }[]>`
      insert into guests (org_id, phone, name, notes, tags) values (${orgId}, ${`+1305555${String(1000 + phoneN++).padStart(4, "0")}`}, ${name}, ${extra.notes ?? null}, ${extra.tags ?? []}) returning id`;
    return g.id;
  };
  const book = async (orgId: string, venueId: string, guestId: string, at: string, size: number, status = "booked", source = "website", notes: string | null = null) => {
    await sql`
      insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, status, source, notes, manage_token)
      values (${orgId}, ${venueId}, ${guestId}, ${size}, ${at}, ${at}::timestamptz + interval '90 minutes', ${status}, ${source}, ${notes}, ${randomUUID()})`;
  };

  beforeAll(async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.RESEND_API_KEY;
    const a = await org("Alpha Taverna", "2026-09-01T12:00:00Z", "America/New_York");
    slugA = a.slug;
    A = { orgId: a.orgId, actor: "owner@alpha.example", role: "owner", venueIds: null };
    hostA = { orgId: a.orgId, actor: "host@alpha.example", role: "host", venueIds: null };
    await sql`insert into org_members (org_id, email, role) values (${a.orgId}, 'owner@alpha.example', 'owner'), (${a.orgId}, 'host@alpha.example', 'host')`;
    const g = await guest(a.orgId, "Gia Regular");
    const h = await guest(a.orgId, "Hal Birthday");
    const s = await guest(a.orgId, "Sam Shellfish", { tags: ["shellfish allergy"] });
    const big = await guest(a.orgId, "Bea Bigparty");

    // Last night, Wednesday Nov 11 in New York.
    await book(a.orgId, a.venueId, g, "2026-11-12T00:00:00Z", 4, "completed");            // 7:00 PM Wed local, Thu UTC
    await book(a.orgId, a.venueId, h, "2026-11-11T23:00:00Z", 2, "no_show");              // 6:00 PM Wed
    await book(a.orgId, a.venueId, g, "2026-11-12T01:30:00Z", 3, "completed", "walk_in"); // 8:30 PM Wed
    await book(a.orgId, a.venueId, h, "2026-11-11T23:30:00Z", 5, "cancelled");            // doesn't count
    await book(a.orgId, a.venueId, g, "2026-11-11T03:00:00Z", 9, "completed");            // 10 PM Tue local: not last night
    await sql`insert into ordering_settings (org_id, pickup_enabled, paused_until) values (${a.orgId}, true, ${new Date(NOW.getTime() + 30 * 60_000)})`;
    const order = (at: string, cents: number, status = "placed") => sql`
      insert into orders (org_id, venue_id, number, kind, status, name, phone, ready_at, items, subtotal_cents, total_cents, manage_token, created_at)
      values (${a.orgId}, ${a.venueId}, ${Math.floor(Math.random() * 9000) + 1000}, 'pickup', ${status}, 'Olu', '+13055550999', ${at}, '[]'::jsonb, ${cents}, ${cents}, ${randomUUID()}, ${at})`;
    await order("2026-11-12T02:00:00Z", 4550);               // 9 PM Wed local
    await order("2026-11-12T02:10:00Z", 9999, "cancelled");  // not a sale
    await order("2026-11-12T06:00:00Z", 1200);               // 1 AM Thu local: today

    // Today, Thursday Nov 12 local.
    await book(a.orgId, a.venueId, h, "2026-11-12T22:30:00Z", 2, "booked", "website", "Birthday dinner, candle on dessert"); // 5:30 PM
    await book(a.orgId, a.venueId, big, "2026-11-13T00:00:00Z", 8, "confirmed");  // 7:00 PM
    await book(a.orgId, a.venueId, s, "2026-11-13T04:30:00Z", 2);                // 11:30 PM local, Fri in UTC
    await book(a.orgId, a.venueId, g, "2026-11-13T01:00:00Z", 4, "cancelled");
    // The last four Thursdays at 7 PM: 8, 10, 12, 10 covers → usual 10.
    for (const [day, n] of [["2026-11-06", 8], ["2026-10-30", 10], ["2026-10-23", 12], ["2026-10-16", 10]] as const) {
      await book(a.orgId, a.venueId, g, `${day}T00:00:00Z`, n, "completed");
    }

    // Waiting: two proposals and a chat change.
    await sql`insert into agent_proposals (org_id, agent_id, tool, input, title, rationale, created_at) values
      (${a.orgId}, 'reservations', 'send_guest_sms', '{}'::jsonb, 'Text 18 guests: “Tuesday is quiet”', '', '2026-11-12T13:00:00Z'),
      (${a.orgId}, 'reviews', 'post_review_reply', '{}'::jsonb, 'Reply to a review: “Thank you”', '', '2026-11-12T13:05:00Z')`;
    const [th] = await sql<{ id: string }[]>`insert into chat_threads (org_id, title, created_by) values (${a.orgId}, 'Hours', 'owner@alpha.example') returning id`;
    await sql`insert into chat_changes (org_id, thread_id, pillar, lever, label, value, before, after, risk, status, requested_by, created_at)
      values (${a.orgId}, ${th.id}, 'reservations', 'booking_window_days', 'Booking window', '90', '60'::jsonb, '90'::jsonb, 'confirm', 'pending', 'owner@alpha.example', '2026-11-12T13:10:00Z')`;

    // Yesterday's work, by station.
    const logAt = (actor: string, action: string, at: string, detail: object = {}) => sql`
      insert into change_log (org_id, actor, action, entity, detail, created_at) values (${a.orgId}, ${actor}, ${action}, 'x', ${sql.json(detail as never)}, ${at})`;
    await sql`insert into agent_proposals (org_id, agent_id, tool, input, title, rationale, status, decided_by, decided_at, created_at)
      values (${a.orgId}, 'reservations', 'send_guest_sms', '{}'::jsonb, 'Text 18 guests: “Come in Tuesday”', '', 'executed', 'owner@alpha.example', '2026-11-11T14:02:00Z', '2026-11-11T13:00:00Z')`;
    await logAt("agent:reservations", "guests.sms_marketing", "2026-11-11T14:02:05Z", { sent: 18, dry_run: 0, failed: 0, skipped: 2 });
    await logAt("agent:reviews", "agent.proposed", "2026-11-11T15:00:00Z");
    await logAt("agent:reviews", "agent.proposed", "2026-11-11T15:01:00Z");
    await logAt("agent:paid_ads", "ads.budget_changed", "2026-11-11T16:00:00Z", { name: "Brunch", from_cents: 4000, to_cents: 5500 });
    await logAt("agent:paid_ads", "agent.denied", "2026-11-11T16:05:00Z", { reason: "cap" });
    await logAt("owner@alpha.example", "site.published", "2026-11-11T17:00:00Z");     // a person, not The Pass
    await logAt("agent:website", "site.version_saved", "2026-11-10T17:00:00Z");       // two days ago
    await logAt("agent:website", "site.version_saved", "2026-11-12T05:30:00Z");       // 12:30 AM today local
    await sql`insert into org_integrations (org_id, provider, status, updated_by) values (${a.orgId}, 'google_business', 'error', 'x')`;

    // B: joined this morning, in Los Angeles. No history.
    const b = await org("Beta Bistro", "2026-11-12T12:00:00Z", "America/Los_Angeles");
    slugB = b.slug;
    B = { orgId: b.orgId, actor: "owner@beta.example", role: "owner", venueIds: null };
    await sql`insert into org_members (org_id, email, role) values (${b.orgId}, 'owner@beta.example', 'owner')`;
    await book(b.orgId, b.venueId, await guest(b.orgId, "Bo"), "2026-11-13T03:00:00Z", 3); // 7 PM Thu LA

    // C: here for months, nothing booked on recent Thursdays, doesn't sell online.
    const c = await org("Gamma Grill", "2026-01-01T12:00:00Z", "America/New_York");
    C = { orgId: c.orgId, actor: "owner@gamma.example", role: "owner", venueIds: null };
    await sql`insert into org_members (org_id, email, role) values (${c.orgId}, 'owner@gamma.example', 'owner')`;
  });

  afterAll(async () => {
    await sql`delete from orgs where id = any(${orgs}::uuid[])`;
    await sql.end();
  });

  it("counts last night and today in the venue's time, not UTC", async () => {
    const b = (await buildMorningPass(sql, A, NOW))!;
    expect(b.date).toBe("2026-11-12");
    expect(b.lastNight).toEqual({ date: "2026-11-11", covers: 7, bookings: 2, noShows: 1, walkIns: 1, onlineOrders: 1, onlineSalesCents: 4550 });
    expect(b.today.covers).toBe(12);
    expect(b.today.bookings).toBe(3);
    expect(b.today.firstBooking).toBe("5:30 PM");
    expect(b.today.largeParties).toEqual([{ time: "7:00 PM", name: "Bea Bigparty", size: 8 }]);
    expect(b.today.notes.map((n) => [n.time, n.name])).toEqual([["5:30 PM", "Hal Birthday"], ["11:30 PM", "Sam Shellfish"]]);
    expect(b.today.notes[0].note).toContain("Birthday");
    expect(b.today.notes[1].note).toBe("shellfish allergy");
  });

  it("compares today with the same weekday over the last four weeks", async () => {
    const b = (await buildMorningPass(sql, A, NOW))!;
    expect(b.today.vsUsual).toEqual({ usual: 10, delta: 2, weeks: 4 });
    expect(usualLine(b)).toBe("+2 on your usual Thursday (10)");
  });

  it("says — with no history, and never invents zeros for a night before the restaurant joined", async () => {
    const b = (await buildMorningPass(sql, B, NOW))!;
    expect(b.tz).toBe("America/Los_Angeles");
    expect(b.today.vsUsual).toBeNull();
    expect(usualLine(b)).toBe("—");
    expect(b.lastNight).toEqual({ date: "2026-11-11", covers: null, bookings: null, noShows: null, walkIns: null, onlineOrders: null, onlineSalesCents: null });
    expect(b.today).toMatchObject({ covers: 3, bookings: 1, firstBooking: "7:00 PM" });
    const c = (await buildMorningPass(sql, C, NOW))!;
    expect(c.today.vsUsual).toBeNull();
    expect(c.lastNight.covers).toBe(0); // known: it was open on The Pass, nothing booked
    expect(c.lastNight.onlineOrders).toBeNull(); // doesn't sell online: —, not $0
    const text = renderMorningPassText(b, "https://pass.example/r/x");
    expect(text).toContain("Last night: — covers");
    expect(text).not.toContain("$0");
  });

  it("lists what's waiting: proposals and chat changes, newest three", async () => {
    const b = (await buildMorningPass(sql, A, NOW))!;
    expect(b.waiting).toMatchObject({ count: 3, proposals: 2, changes: 1 });
    expect(b.waiting.top.map((w) => w.from)).toEqual(["Ask The Pass", "Reviews", "Reservations"]);
    expect(b.waiting.top[0].title).toBe("Booking window → 90 days");
    expect(b.waiting.top[0].href).toMatch(new RegExp(`^/r/${slugA}/chat\\?t=[0-9a-f-]+#c-`));
    expect(b.waiting.top[2].href).toMatch(new RegExp(`^/r/${slugA}/agents#p-`));
  });

  it("says what The Pass did yesterday, station by station, in words", async () => {
    const b = (await buildMorningPass(sql, A, NOW))!;
    expect(b.didYesterday.map((x) => `${x.station}: ${x.text}`)).toEqual([
      "Reviews: Drafted 2 things for your approval",
      "Reservations: Texted 18 guests (owner@alpha.example approved 9:02 AM)",
      "Paid ads: Changed the Brunch budget from $40.00 to $55.00 a day",
    ]);
  });

  it("raises heads-ups: texting off, ordering paused, a connection that stopped", async () => {
    const b = (await buildMorningPass(sql, A, NOW))!;
    expect(b.headsUps.map((h) => h.text)).toEqual([
      "Texting is off: booking confirmations and reminders aren't reaching guests.",
      "Online ordering is paused until 10:30 AM.",
      "Google Business Profile needs attention: it stopped connecting.",
    ]);
    expect(b.headsUps[1].href).toBe(`/r/${slugA}/orders`);
  });

  it("is scoped to its own restaurant", async () => {
    const b = (await buildMorningPass(sql, B, NOW))!;
    expect(b.waiting.count).toBe(0);
    expect(b.didYesterday).toEqual([]);
    expect(b.headsUps.map((h) => h.text)).not.toContain("Google Business Profile needs attention: it stopped connecting.");
    expect(b.org.slug).toBe(slugB);
    // A tenant limited to a venue it doesn't have sees nothing.
    expect(await buildMorningPass(sql, { ...A, venueIds: [randomUUID()] }, NOW)).toBeNull();
  });

  it("renders a short, scannable plain-text brief with a link home", async () => {
    const b = (await buildMorningPass(sql, A, NOW))!;
    const text = renderMorningPassText(b, `https://pass.example/r/${slugA}`);
    expect(text.split("\n")[0]).toBe("Your morning pass — Thursday, November 12");
    expect(text).toContain("Last night: 7 covers, 1 no-show, 1 walk-in, 1 online order ($46).");
    expect(text).toContain("Today: 12 covers in 3 bookings — +2 on your usual Thursday (10). First at 5:30 PM.");
    expect(text).toContain("  • 7:00 PM party of 8 — Bea Bigparty");
    expect(text).toContain("Waiting for you: 3.");
    expect(text).toContain(`Open The Pass: https://pass.example/r/${slugA}`);
    expect(text).toContain("The Pass doesn't touch your kitchen, payroll or point of sale.");
    const sms = renderMorningPassText(b, "https://pass.example/r/a", { short: true });
    expect(sms.split("\n").length).toBeLessThanOrEqual(6);
    expect(sms).toContain("https://pass.example/r/a");
  });

  it("lets Ask The Pass answer \"how did last night go?\" from the morning pass, speaking as The Pass", async () => {
    const { client, seen } = scripted([[{ type: "tool_use", id: "toolu_mp", name: "get_morning_pass", input: {} } as Block]]);
    const thread = await newThread(sql, A, "How did last night go?");
    const r = await chat(sql, A, thread, "How did last night go?", client, NOW);
    expect(r.reply).toBe("Seven covers last night.");
    const system = String(seen[0].system);
    expect(system).toMatch(/^You are The Pass/);
    expect(system).toContain("don't run the kitchen, payroll");
    expect(seen[0].tools!.map((t) => (t as { name: string }).name)).toContain("get_morning_pass");
    const result = (seen[1].messages.at(-1)!.content as { type: string; content: string }[])[0];
    const data = JSON.parse(result.content);
    expect(data.lastNight.covers).toBe(7);
    expect(data.today.vsUsual).toEqual({ usual: 10, delta: 2, weeks: 4 });
    expect(data.didYesterday[0]).toEqual({ station: "Reviews", did: "Drafted 2 things for your approval" });
  });

  describe("settings and sending", () => {
    type Call = { to: string; subject: string; text: string };
    const fake = () => {
      const calls: Call[] = [];
      const sender: BriefSender = async (to, subject, text) => { calls.push({ to, subject, text }); return { status: "sent", providerId: "x" }; };
      return { calls, sender };
    };
    const sends = (orgId: string) => sql<{ local_date: string; status: string; channel: string; recipients: { member: string; status: string }[]; body: string }[]>`
      select to_char(local_date, 'YYYY-MM-DD') as local_date, status, channel, recipients, body from brief_sends where org_id = ${orgId} order by local_date`;

    it("is off by default; only owners and managers change it; recipients must be on the team", async () => {
      expect(await readBriefSettings(sql, A)).toMatchObject({ enabled: false, sendAt: "09:00", channel: "email", recipients: [] });
      await expect(saveBriefSettings(sql, hostA, { enabled: true, sendAt: "09:00", channel: "email", recipients: ["owner@alpha.example"] })).rejects.toBeInstanceOf(Forbidden);
      expect(await saveBriefSettings(sql, A, { enabled: true, sendAt: "09:00", channel: "email", recipients: ["owner@alpha.example", "chef@elsewhere.example"] }))
        .toMatchObject({ ok: false, field: "recipients" });
      // Someone on another restaurant's team isn't on this one.
      expect(await saveBriefSettings(sql, A, { enabled: true, sendAt: "09:00", channel: "email", recipients: ["owner@beta.example"] }))
        .toMatchObject({ ok: false, field: "recipients" });
      expect(await saveBriefSettings(sql, A, { enabled: true, sendAt: "9am", channel: "email", recipients: ["owner@alpha.example"] }))
        .toMatchObject({ ok: false, field: "sendAt" });
      expect(await saveBriefSettings(sql, A, { enabled: true, sendAt: "09:00", channel: "email", recipients: [] }))
        .toMatchObject({ ok: false, field: "recipients" });
      expect(await saveBriefSettings(sql, A, { enabled: true, sendAt: "09:00", channel: "sms", recipients: ["owner@alpha.example"] }))
        .toMatchObject({ ok: false, field: "phone:owner@alpha.example" });
      const ok = await saveBriefSettings(sql, A, { enabled: true, sendAt: "09:00", channel: "email", recipients: ["OWNER@alpha.example", "host@alpha.example"] });
      expect(ok.ok).toBe(true);
      expect(await readBriefSettings(sql, A)).toMatchObject({ enabled: true, sendAt: "09:00", channel: "email", recipients: ["owner@alpha.example", "host@alpha.example"], updatedBy: "owner@alpha.example" });
      const [logged] = await sql<{ actor: string; detail: Record<string, unknown> }[]>`
        select actor, detail from change_log where org_id = ${A.orgId} and action = 'brief.settings_saved' order by id desc limit 1`;
      expect(logged.actor).toBe("owner@alpha.example");
      expect(logged.detail.enabled).toEqual({ before: false, after: true });
      // Texts need each person's mobile, kept on their team record.
      expect(await saveBriefSettings(sql, B, { enabled: true, sendAt: "09:00", channel: "sms", recipients: ["owner@beta.example"], phones: { "owner@beta.example": "(305) 555-0177" } }))
        .toMatchObject({ ok: true });
      const [m] = await sql<{ phone: string }[]>`select phone from org_members where org_id = ${B.orgId}`;
      expect(m.phone).toBe("+13055550177");
      await saveBriefSettings(sql, C, { enabled: false, sendAt: "06:00", channel: "email", recipients: ["owner@gamma.example"] });
    });

    it("sends at each restaurant's own local time, once a day, to team members only", async () => {
      const email = fake(), sms = fake();
      const senders = { email: email.sender, sms: sms.sender };
      // 8:59 AM in New York: not yet.
      await sendDueBriefs(sql, "https://pass.example", new Date("2026-11-12T13:59:00Z"), senders);
      expect(await sends(A.orgId)).toEqual([]);
      // 10:00 AM New York, 7:00 AM Los Angeles: Alpha is due, Beta isn't, Gamma is off.
      await Promise.all([
        sendDueBriefs(sql, "https://pass.example", NOW, senders),
        sendDueBriefs(sql, "https://pass.example", NOW, senders),
      ]);
      const mine = email.calls.filter((c) => c.to.endsWith("@alpha.example"));
      expect(mine.map((c) => c.to).sort()).toEqual(["host@alpha.example", "owner@alpha.example"]);
      expect(mine[0].subject).toBe("Your morning pass — Thursday, November 12");
      expect(mine[0].text).toContain(`https://pass.example/r/${slugA}`);
      const [sent] = await sends(A.orgId);
      expect(sent).toMatchObject({ local_date: "2026-11-12", status: "sent", channel: "email" });
      expect(sent.recipients.map((r) => r.member).sort()).toEqual(["host@alpha.example", "owner@alpha.example"]);
      expect(await sends(B.orgId)).toEqual([]);
      expect(await sends(C.orgId)).toEqual([]);
      // Later the same morning: already sent.
      await sendDueBriefs(sql, "https://pass.example", new Date("2026-11-12T16:00:00Z"), senders);
      expect(email.calls.filter((c) => c.to.endsWith("@alpha.example"))).toHaveLength(2);
      // 9:00 AM in Los Angeles: Beta, by text, to the owner's mobile.
      await sendDueBriefs(sql, "https://pass.example", new Date("2026-11-12T17:00:00Z"), senders);
      expect(sms.calls.filter((c) => c.to === "+13055550177")).toHaveLength(1);
      expect(sms.calls.find((c) => c.to === "+13055550177")!.text).toContain(`https://pass.example/r/${slugB}`);
      expect((await sends(B.orgId))[0]).toMatchObject({ status: "sent", channel: "sms" });
    });

    it("is a recorded dry run with no provider, skips people who left the team, and doesn't send hours late", async () => {
      await sql`delete from org_members where org_id = ${A.orgId} and email = 'host@alpha.example'`;
      // Friday 1 PM New York: past the three-hour window — not sent.
      await sendDueBriefs(sql, "https://pass.example", new Date("2026-11-13T18:00:00Z"));
      expect((await sends(A.orgId)).map((s) => s.local_date)).toEqual(["2026-11-12"]);
      // Saturday 9:30 AM: real senders, nothing configured → dry run, recorded.
      await sendDueBriefs(sql, "https://pass.example", new Date("2026-11-14T14:30:00Z"));
      const sat = (await sends(A.orgId)).find((s) => s.local_date === "2026-11-14")!;
      expect(sat.status).toBe("dry_run");
      expect(sat.recipients).toEqual([{ member: "owner@alpha.example", status: "dry_run" }]);
      expect(sat.body).toContain("Your morning pass — Saturday, November 14");
    });
  });
});
