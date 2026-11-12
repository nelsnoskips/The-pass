import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomBytes, randomUUID } from "node:crypto";
import {
  campaignResults, getCampaign, listCampaigns, reach, runDueCampaigns, saveDraft, schedule, sendNow, unschedule,
} from "@/lib/marketing/campaigns";
import {
  choosePromotion, createPromotion, discountFor, listPromotions, setPromotionActive, type Promotion,
} from "@/lib/marketing/promotions";
import {
  createSegment, deleteSegment, describeRules, getSegment, parseRules, segmentCounts, segmentMembers,
} from "@/lib/marketing/segments";
import { smsParts } from "@/lib/marketing/sms-count";
import { DEFAULT_SETTINGS, placeOrder, priceCart, saveOrderingSettings, setOrderStatus, type OrderingSettings } from "@/lib/ordering";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";
import { localDate, localTime } from "@/lib/reservations/time";
import type { SiteContent } from "@/lib/sites/content";

process.env.INTEGRATIONS_KEY ??= randomBytes(32).toString("base64");
// Nothing here may need a provider: every send must be a dry run.
delete process.env.TWILIO_ACCOUNT_SID;
delete process.env.TWILIO_AUTH_TOKEN;
delete process.env.TWILIO_FROM;
delete process.env.RESEND_API_KEY;

const DAY = 86_400_000;

const content = {
  brand: { name: "Santorini", tagline: "", cuisine: "Greek", priceRange: "$$" },
  theme: { paper: "#fff", ink: "#000", accent: "#00f" },
  hero: { headline: "", sub: "", image: null }, story: { heading: "", body: "" },
  menus: [{ id: "dinner", name: "Dinner", sections: [{ id: "mains", name: "Mains", note: "", items: [
    { id: "lamb", name: "Lamb chops", description: "", priceCents: 5200, tags: [] },
    { id: "gyro", name: "Gyro", description: "", priceCents: 1650, tags: [] },
  ] }] }],
  hours: [], contact: { address: "", phone: "", email: "", mapUrl: "" }, announcement: "", social: { instagram: "" },
} as SiteContent;
const S = (o: Partial<OrderingSettings> = {}): OrderingSettings => ({ ...DEFAULT_SETTINGS, pickupEnabled: true, cateringEnabled: true, ...o });

const promo = (o: Partial<Promotion>): Promotion => ({
  id: randomUUID(), name: "Promo", code: "SAVE", kind: "percent_order", percent: 10, amountCents: null, itemId: null,
  minSubtotalCents: 0, startsAt: null, endsAt: null, maxUses: null, maxUsesPerPhone: null, active: true, uses: 0, phoneUses: 0, ...o,
});

/** An Etc/GMT zone where it is about `hour` o'clock right now. */
function zoneAtHour(hour: number, now = new Date()): string {
  const offset = ((hour - now.getUTCHours() + 36) % 24) - 12;
  return offset === 0 ? "Etc/GMT" : offset > 0 ? `Etc/GMT-${offset}` : `Etc/GMT+${-offset}`;
}

describe("segment rules", () => {
  it("describe themselves in plain English", () => {
    expect(describeRules({ minVisits: 3 })).toBe("Guests who have visited at least 3 times.");
    expect(describeRules({ minVisits: 2, lapsedDays: 45, smsConsent: true }))
      .toBe("Guests who have visited at least 2 times, haven't visited in 45 days and can get texts.");
    expect(describeRules({ minOnlineSpendCents: 5000, orderedOnline: true })).toBe("Guests who have ordered online and have spent $50 or more online.");
  });
  it("parse from a form, refusing nonsense", () => {
    expect(parseRules({ minVisits: "3", smsConsent: "on", minOnlineSpend: "$25" })).toEqual({ ok: true, rules: { minVisits: 3, smsConsent: true, minOnlineSpendCents: 2500 } });
    expect(parseRules({})).toMatchObject({ ok: false });
    expect(parseRules({ minVisits: "2.5" })).toMatchObject({ ok: false });
    expect(parseRules({ neverVisited: "on", minVisits: "2" })).toMatchObject({ ok: false });
    expect(parseRules({ lapsedDays: "60", visitedWithinDays: "30" })).toMatchObject({ ok: false });
  });
  it("count SMS characters and parts with the STOP line", () => {
    expect(smsParts("")).toEqual({ chars: 0, parts: 0, unicode: false });
    expect(smsParts("Hi")).toMatchObject({ chars: "Hi Reply STOP to opt out.".length, parts: 1 });
    expect(smsParts("x".repeat(150)).parts).toBe(2);
    expect(smsParts("Lamb is back 🐑").unicode).toBe(true);
  });
});

describe("promotion pricing", () => {
  const NOW = new Date("2026-11-11T22:00:00Z");
  const cart = [{ itemId: "lamb", qty: 2 }, { itemId: "gyro", qty: 1 }]; // 12050
  const price = (p: Partial<Promotion>[], code: string | null = "SAVE", tip = 300) =>
    priceCart(content, S({ taxBps: 700 }), "pickup", cart, tip, { code, promotions: p.map(promo), now: NOW });

  it("percent off: tax on the discounted subtotal, then tip", () => {
    expect(price([{ percent: 10 }])).toMatchObject({ ok: true, subtotalCents: 12050, discountCents: 1205, taxCents: 759, tipCents: 300, totalCents: 12050 - 1205 + 759 + 300 });
  });
  it("amount off the order, and amount off each of one dish", () => {
    expect(price([{ kind: "amount_order", percent: null, amountCents: 1000 }])).toMatchObject({ ok: true, discountCents: 1000, taxCents: 774 });
    expect(price([{ kind: "amount_item", percent: null, amountCents: 500, itemId: "lamb" }])).toMatchObject({ ok: true, discountCents: 1000 });
    // Never more than the dish costs.
    expect(price([{ kind: "amount_item", percent: null, amountCents: 9999, itemId: "gyro" }])).toMatchObject({ ok: true, discountCents: 1650 });
    expect(price([{ kind: "amount_item", percent: null, amountCents: 500, itemId: "fish" }])).toMatchObject({ ok: false });
  });
  it("never takes the order below zero", () => {
    expect(price([{ kind: "amount_order", percent: null, amountCents: 1_000_000 }])).toMatchObject({ ok: true, discountCents: 12050, taxCents: 0, totalCents: 300 });
    expect(price([{ percent: 100 }])).toMatchObject({ ok: true, discountCents: 12050, totalCents: 300 });
  });
  it("minimum, dates, use limits, and unknown codes", () => {
    expect(price([{ minSubtotalCents: 20000 }])).toEqual({ ok: false, error: "That code is for orders of $200 or more." });
    expect(price([{ startsAt: new Date(NOW.getTime() + DAY) }])).toMatchObject({ ok: false, error: expect.stringContaining("isn't active yet") });
    expect(price([{ endsAt: NOW }])).toMatchObject({ ok: false, error: expect.stringContaining("expired") });
    expect(price([{ maxUses: 5, uses: 5 }])).toMatchObject({ ok: false, error: expect.stringContaining("used up") });
    expect(price([{ maxUsesPerPhone: 1, phoneUses: 1 }])).toMatchObject({ ok: false, error: expect.stringContaining("already used") });
    expect(price([{ active: false }])).toMatchObject({ ok: false });
    expect(price([{}], "nope")).toEqual({ ok: false, error: "That code isn't valid." });
    expect(price([{ code: "save" }], " Save ")).toMatchObject({ ok: true, discountCents: 1205 }); // case and spaces
  });
  it("automatic promotions apply without a code; the bigger discount wins", () => {
    const auto = { code: null, percent: 5 };
    expect(price([auto], null)).toMatchObject({ ok: true, discountCents: 603, promotion: { code: null } });
    expect(price([auto, { percent: 10 }], "SAVE")).toMatchObject({ discountCents: 1205, promotion: { code: "SAVE" } });
    expect(price([{ code: null, percent: 20 }, { percent: 10 }], "SAVE")).toMatchObject({ discountCents: 2410, promotion: { code: null } });
    expect(price([{ code: null, percent: 5, minSubtotalCents: 50000 }], null)).toMatchObject({ ok: true, discountCents: 0, promotion: null });
    expect(choosePromotion({ promotions: [], now: NOW }, [], 0)).toEqual({ ok: true, discountCents: 0, promotion: null });
    expect(discountFor(promo({ percent: 33 }), [], 100, NOW)).toEqual({ ok: true, discountCents: 33 });
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("marketing against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  const orgs: string[] = [];
  let A = "", B = "", Q = "", venueA = "";
  let owner: Tenant, manager: Tenant, host: Tenant, viewer: Tenant, ownerB: Tenant, ownerQ: Tenant;
  const g: Record<string, string> = {};
  const base = "https://example.test";

  async function org(name: string, tz: string) {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values (${name}, ${`mk-${randomUUID().slice(0, 8)}`}) returning id`;
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug, timezone) values (${o.id}, 'Main', 'main', ${tz}) returning id`;
    orgs.push(o.id);
    return { orgId: o.id, venueId: v.id };
  }
  async function guest(orgId: string, key: string, o: {
    visits?: number; lastDaysAgo?: number | null; noShows?: number; sms?: boolean; smsOut?: boolean; email?: boolean; createdDaysAgo?: number;
  }) {
    const now = Date.now();
    const [r] = await sql<{ id: string }[]>`
      insert into guests (org_id, phone, name, email, visit_count, no_show_count, last_visit_at, sms_consent_at, sms_opted_out_at,
                          email_consent_at, created_at)
      values (${orgId}, ${`+1305555${String(Object.keys(g).length).padStart(4, "0")}`}, ${`${key} Guest`},
              ${o.email ? `${key}@example.test` : null}, ${o.visits ?? 0}, ${o.noShows ?? 0},
              ${o.lastDaysAgo != null ? new Date(now - o.lastDaysAgo * DAY) : null},
              ${o.sms || o.smsOut ? new Date(now - 200 * DAY) : null}, ${o.smsOut ? new Date(now - 100 * DAY) : null},
              ${o.email ? new Date(now - 200 * DAY) : null}, ${new Date(now - (o.createdDaysAgo ?? 300) * DAY)})
      returning id`;
    g[key] = r.id;
    return r.id;
  }

  beforeAll(async () => {
    const a = await org("Marketing A", zoneAtHour(13));
    A = a.orgId; venueA = a.venueId;
    B = (await org("Marketing B", zoneAtHour(13))).orgId;
    Q = (await org("Marketing Quiet", zoneAtHour(2))).orgId;
    owner = { orgId: A, actor: "owner@mk", role: "owner", venueIds: null };
    manager = { orgId: A, actor: "manager@mk", role: "manager", venueIds: null };
    host = { orgId: A, actor: "host@mk", role: "host", venueIds: null };
    viewer = { orgId: A, actor: "viewer@mk", role: "viewer", venueIds: null };
    ownerB = { orgId: B, actor: "owner@b", role: "owner", venueIds: null };
    ownerQ = { orgId: Q, actor: "owner@q", role: "owner", venueIds: null };

    await guest(A, "regular", { visits: 5, lastDaysAgo: 10, sms: true, email: true });
    await guest(A, "lapsed", { visits: 3, lastDaysAgo: 60, sms: true });
    await guest(A, "optedout", { visits: 4, lastDaysAgo: 90, smsOut: true });
    await guest(A, "newbie", { createdDaysAgo: 2 });
    await guest(A, "noshow", { visits: 1, lastDaysAgo: 20, noShows: 2, email: true });
    await guest(A, "vip", { visits: 12, lastDaysAgo: 2, sms: true });
    await guest(A, "online", { createdDaysAgo: 5 });
    await guest(B, "other", { visits: 10, lastDaysAgo: 60, sms: true, email: true });
    await guest(Q, "night", { visits: 5, lastDaysAgo: 60, sms: true });

    await sql`insert into loyalty_rewards (org_id, guest_id, reward, earned_at_visit) values (${A}, ${g.vip}, 'Dessert', 10)`;
    const start = new Date(Date.now() - 10 * DAY);
    await sql`insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, status, manage_token)
              values (${A}, ${venueA}, ${g.regular}, 2, ${start}, ${new Date(start.getTime() + 7_200_000)}, 'completed', ${randomUUID()})`;
    await sql`insert into orders (org_id, venue_id, guest_id, number, kind, name, phone, ready_at, items, subtotal_cents, total_cents, manage_token)
              values (${A}, ${venueA}, ${g.online}, 1001, 'pickup', 'Online', '+13055550006', now(), '[]', 4500, 4500, ${randomUUID()})`;
  });
  afterAll(async () => {
    for (const id of orgs) await sql`delete from orgs where id = ${id}`;
    await sql.end();
  });

  it("built-in segments count from the guest list, and only this org's", async () => {
    const count = async (id: string) => (await segmentCounts(sql, owner, (await getSegment(sql, owner, id))!.rules)).members;
    expect(await count("regulars")).toBe(4); // regular, lapsed, optedout, vip
    expect(await count("lapsed")).toBe(2); // lapsed, optedout
    expect(await count("new")).toBe(2); // newbie, online
    expect(await count("textable")).toBe(3); // regular, lapsed, vip — not the opted-out one
    expect(await count("emailable")).toBe(2); // regular, noshow
    expect(await count("vip")).toBe(1);
    expect(await segmentCounts(sql, owner, { minVisits: 3 })).toEqual({ members: 4, sms: 3, email: 1 });
  });

  it("every rule selects the right guests", async () => {
    const who = async (rules: Parameters<typeof segmentMembers>[2]) =>
      (await segmentMembers(sql, owner, rules)).map((m) => Object.entries(g).find(([, id]) => id === m.id)![0]).sort();
    expect(await who({ neverVisited: true })).toEqual(["newbie", "online"]);
    expect(await who({ neverBooked: true, orderedOnline: true })).toEqual(["online"]);
    expect(await who({ minOnlineSpendCents: 4000 })).toEqual(["online"]);
    expect(await who({ minOnlineSpendCents: 5000 })).toEqual([]);
    expect(await who({ openReward: true })).toEqual(["vip"]);
    expect(await who({ minNoShows: 2 })).toEqual(["noshow"]);
    expect(await who({ visitedWithinDays: 15 })).toEqual(["regular", "vip"]);
    expect(await who({ lapsedDays: 45, smsConsent: true })).toEqual(["lapsed"]);
    expect(await who({ emailConsent: true, minVisits: 2 })).toEqual(["regular"]);
    expect((await segmentMembers(sql, owner, { joinedWithinDays: 3650 }, { page: 2, pageSize: 5 })).length).toBe(2);
  });

  it("saved segments: permission, change log, and isolation", async () => {
    await expect(createSegment(sql, host, "Mine", { minVisits: "2" })).rejects.toBeInstanceOf(Forbidden);
    expect(await createSegment(sql, owner, "", { minVisits: "2" })).toMatchObject({ ok: false });
    const r = await createSegment(sql, manager, "Two plus", { minVisits: "2" });
    if (!r.ok) throw new Error(r.error);
    expect((await getSegment(sql, viewer, r.id))?.name).toBe("Two plus");
    expect(await getSegment(sql, ownerB, r.id)).toBeNull();
    expect(await deleteSegment(sql, ownerB, r.id)).toBe(false);
    const [l] = await sql<{ actor: string }[]>`select actor from change_log where org_id = ${A} and action = 'segment.created' and entity_id = ${r.id}`;
    expect(l.actor).toBe("manager@mk");
    // B's own counts never include A's guests.
    expect((await segmentCounts(sql, ownerB, { minVisits: 1 })).members).toBe(1);
    expect(await deleteSegment(sql, owner, r.id)).toBe(true);
  });

  it("drafting needs message_guests; agents can draft but it's marked as theirs", async () => {
    const input = { name: "Back soon", channel: "sms", segment: "lapsed", body: "We miss you. The lamb is back on Thursday." };
    await expect(saveDraft(sql, viewer, input)).rejects.toBeInstanceOf(Forbidden);
    await expect(saveDraft(sql, host, input)).rejects.toBeInstanceOf(Forbidden);
    expect(await saveDraft(sql, owner, { ...input, body: "x".repeat(301) })).toMatchObject({ ok: false });
    expect(await saveDraft(sql, owner, { ...input, channel: "email" })).toMatchObject({ ok: false, error: expect.stringContaining("subject") });
    expect(await saveDraft(sql, owner, { ...input, segment: "nope" })).toMatchObject({ ok: false });
    const r = await saveDraft(sql, owner, input, { createdBy: "agent:assistant" });
    if (!r.ok) throw new Error(r.error);
    const c = (await getCampaign(sql, owner, r.id))!;
    expect(c).toMatchObject({ status: "draft", created_by: "agent:assistant", requested_by: "owner@mk", segment_name: "Lapsed 45+ days" });
    expect(await campaignResults(sql, owner, c)).toBeNull();
  });

  it("a send goes only to consented guests, as dry runs, exactly once, and needs confirming the count", async () => {
    const r = await saveDraft(sql, manager, { name: "Lapsed", channel: "sms", segment: "lapsed", body: "Thursday: the terrace opens. Come by." });
    if (!r.ok) throw new Error(r.error);
    const aud = (await reach(sql, owner, "lapsed", "sms"))!;
    expect(aud).toMatchObject({ members: 2, consented: 1, recentlyMessaged: 0 });
    expect(aud.recipients).toEqual([g.lapsed]);

    await expect(sendNow(sql, host, r.id, { baseUrl: base, expected: 1 })).rejects.toBeInstanceOf(Forbidden);
    expect(await sendNow(sql, ownerB, r.id, { baseUrl: base, expected: 1 })).toEqual({ ok: false, error: "Campaign not found." });
    expect(await sendNow(sql, owner, r.id, { baseUrl: base, expected: 5 })).toMatchObject({ ok: false, error: expect.stringContaining("audience changed") });
    expect((await getCampaign(sql, owner, r.id))!.status).toBe("draft");

    const sent = await sendNow(sql, owner, r.id, { baseUrl: base, expected: 1 });
    expect(sent).toEqual({ ok: true, sent: 0, dry_run: 1, failed: 0, skipped: 1 });
    const msgs = await sql<{ guest_id: string; status: string; body: string; sent_by: string }[]>`
      select guest_id, status, body, sent_by from guest_messages where campaign_id = ${r.id}`;
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ guest_id: g.lapsed, status: "dry_run", sent_by: "owner@mk", body: expect.stringContaining("Reply STOP") });
    expect(await sendNow(sql, owner, r.id, { baseUrl: base })).toMatchObject({ ok: false, error: expect.stringContaining("already gone out") });

    // The weekly cap: the lapsed guest isn't texted again this week.
    const aud2 = (await reach(sql, owner, "textable", "sms"))!;
    expect(aud2).toMatchObject({ members: 3, consented: 3, recentlyMessaged: 1 });
    expect(aud2.recipients.sort()).toEqual([g.regular, g.vip].sort());

    // Results: a booking after the send counts as "came back"; an opt-out after it counts too.
    const later = new Date(Date.now() + 3 * DAY);
    await sql`insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, manage_token)
              values (${A}, ${venueA}, ${g.lapsed}, 2, ${later}, ${new Date(later.getTime() + 7_200_000)}, ${randomUUID()})`;
    await sql`update guests set sms_opted_out_at = now() where id = ${g.lapsed}`;
    const c = (await getCampaign(sql, owner, r.id))!;
    expect(c).toMatchObject({ status: "sent", sent_by: "owner@mk", skipped: 1 });
    expect(await campaignResults(sql, viewer, c)).toEqual({
      recipients: 1, sent: 0, dryRun: 1, failed: 0, skipped: 1, optedOutSince: 1,
      cameBack: { guests: 1, bookings: 1, orders: 0, orderCents: 0 },
    });
    expect(await campaignResults(sql, ownerB, c)).toMatchObject({ recipients: 0 });
    const list = await listCampaigns(sql, owner);
    expect(list.find((x) => x.id === r.id)?.messages).toBe(1);
    expect((await listCampaigns(sql, ownerB)).length).toBe(0);
  });

  it("texts wait outside sending hours instead of going out", async () => {
    const r = await saveDraft(sql, ownerQ, { name: "Night", channel: "sms", segment: "textable", body: "Hello from the quiet hours." });
    if (!r.ok) throw new Error(r.error);
    expect(await sendNow(sql, ownerQ, r.id, { baseUrl: base, expected: 1 })).toMatchObject({ ok: false, later: true });
    expect((await getCampaign(sql, ownerQ, r.id))!.status).toBe("draft");
    const [m] = await sql<{ n: number }[]>`select count(*)::int as n from guest_messages where org_id = ${Q}`;
    expect(m.n).toBe(0);
  });

  it("the job sends due scheduled campaigns once, and only due ones", async () => {
    const now = new Date();
    const tz = zoneAtHour(13, now);
    const at = (ms: number) => { const t = new Date(now.getTime() + ms); return `${localDate(t, tz)}T${localTime(t, tz).slice(0, 5)}`; };
    const soon = await saveDraft(sql, owner, { name: "Soon", channel: "email", segment: "emailable", subject: "The terrace", body: "The terrace opens Thursday. Come by." });
    const far = await saveDraft(sql, owner, { name: "Far", channel: "email", segment: "emailable", subject: "Later", body: "Something for next week." });
    if (!soon.ok || !far.ok) throw new Error("drafts");
    await expect(schedule(sql, viewer, soon.id, at(10 * 60_000), now)).rejects.toBeInstanceOf(Forbidden);
    expect(await schedule(sql, owner, soon.id, at(60_000), now)).toMatchObject({ ok: false });
    expect(await schedule(sql, owner, soon.id, at(10 * 60_000), now)).toMatchObject({ ok: true });
    expect(await schedule(sql, owner, far.id, at(3 * DAY), now)).toMatchObject({ ok: true });

    const mine = (rs: { id: string }[]) => rs.filter((x) => x.id === soon.id || x.id === far.id);
    expect(mine(await runDueCampaigns(sql, { baseUrl: base, now }))).toEqual([]);
    const first = mine(await runDueCampaigns(sql, { baseUrl: base, now: new Date(now.getTime() + 3_600_000) }));
    expect(first).toEqual([{ id: soon.id, org: A, result: { ok: true, sent: 0, dry_run: 2, failed: 0, skipped: 0 } }]);
    expect(mine(await runDueCampaigns(sql, { baseUrl: base, now: new Date(now.getTime() + 3_600_000) }))).toEqual([]);

    const s = (await getCampaign(sql, owner, soon.id))!;
    expect(s).toMatchObject({ status: "sent", sent_by: "owner@mk" });
    const msgs = await sql<{ guest_id: string; status: string; channel: string }[]>`select guest_id, status, channel from guest_messages where campaign_id = ${soon.id}`;
    expect(msgs.map((m) => m.guest_id).sort()).toEqual([g.regular, g.noshow].sort());
    expect(msgs.every((m) => m.status === "dry_run" && m.channel === "email")).toBe(true);
    expect((await getCampaign(sql, owner, far.id))!.status).toBe("scheduled");
    expect(await unschedule(sql, owner, far.id)).toBe(true);
    expect((await getCampaign(sql, owner, far.id))!.status).toBe("draft");
  });

  it("a scheduled campaign nobody can receive is marked failed with the reason", async () => {
    const now = new Date();
    const tz = zoneAtHour(13, now);
    const t = new Date(now.getTime() + 10 * 60_000);
    const r = await saveDraft(sql, owner, { name: "Empty", channel: "sms", segment: "new", body: "Welcome!" });
    if (!r.ok) throw new Error(r.error);
    expect(await schedule(sql, owner, r.id, `${localDate(t, tz)}T${localTime(t, tz).slice(0, 5)}`, now)).toMatchObject({ ok: true });
    const out = (await runDueCampaigns(sql, { baseUrl: base, now: new Date(now.getTime() + 3_600_000) })).filter((x) => x.id === r.id);
    expect(out[0].result).toMatchObject({ ok: false });
    expect(await getCampaign(sql, owner, r.id)).toMatchObject({ status: "failed", last_error: expect.stringContaining("Nobody") });
  });

  describe("promotions on real orders", () => {
    const TZ = "America/New_York";
    const NOW = new Date("2026-11-11T22:00:00Z");
    let P = "", venueP = "";
    let ownerP: Tenant, hostP: Tenant;
    const order = (o: Record<string, unknown> = {}) => placeOrder(sql, {
      orgId: P, venueId: venueP, timezone: TZ, content, kind: "pickup", date: "2026-11-11", time: "18:00",
      name: "Ana", phone: "(305) 555-0199", now: NOW, payOnline: false, cart: [{ itemId: "gyro", qty: 2 }], ...o,
    });

    beforeAll(async () => {
      const p = await org("Promo Co", TZ);
      P = p.orgId; venueP = p.venueId;
      await sql`insert into service_periods (org_id, venue_id, name, days_of_week, first_seating, last_seating)
                values (${P}, ${venueP}, 'Dinner', '{0,1,2,3,4,5,6}', '17:00', '21:00')`;
      ownerP = { orgId: P, actor: "owner@p", role: "owner", venueIds: null };
      hostP = { orgId: P, actor: "host@p", role: "host", venueIds: null };
      expect(await saveOrderingSettings(sql, ownerP, S({ taxBps: 700 }))).toBeNull();
    });

    it("creating one needs manage_venue and sane input", async () => {
      const ok = { name: "Ten off", code: "ten", automatic: false, kind: "percent_order", percent: "10" };
      await expect(createPromotion(sql, hostP, ok)).rejects.toBeInstanceOf(Forbidden);
      expect(await createPromotion(sql, ownerP, { ...ok, percent: "150" })).toMatchObject({ ok: false });
      expect(await createPromotion(sql, ownerP, { ...ok, code: "a b" })).toMatchObject({ ok: false });
      expect(await createPromotion(sql, ownerP, { ...ok, kind: "amount_item", amount: "3", itemId: "fish" }, new Set(["lamb", "gyro"]))).toMatchObject({ ok: false });
      expect(await createPromotion(sql, ownerP, { ...ok, startsAt: NOW, endsAt: NOW })).toMatchObject({ ok: false });
      expect(await createPromotion(sql, ownerP, { ...ok, maxUses: "1", maxUsesPerPhone: "1" })).toMatchObject({ ok: true });
      expect(await createPromotion(sql, ownerP, ok)).toMatchObject({ ok: false, error: expect.stringContaining("already") });
    });

    it("a code is priced on the server, stored on the order, counted, and limited", async () => {
      const a = await order({ promoCode: "TEN" });
      if (!a.ok) throw new Error(a.error);
      // 3300 − 330 = 2970; tax 7% of 2970 = 208
      expect(a.totalCents).toBe(2970 + 208);
      const [o] = await sql<{ subtotal_cents: number; discount_cents: number; tax_cents: number; total_cents: number; promotion_id: string | null }[]>`
        select subtotal_cents, discount_cents, tax_cents, total_cents, promotion_id from orders where id = ${a.id}`;
      expect(o).toMatchObject({ subtotal_cents: 3300, discount_cents: 330, tax_cents: 208, total_cents: 3178 });
      expect(o.promotion_id).not.toBeNull();
      // One use in all: the next guest is refused, and told why.
      expect(await order({ promoCode: "ten", phone: "(305) 555-0100" })).toEqual({ ok: false, error: "That code has been used up." });
      // Cancelling gives the use back.
      expect(await setOrderStatus(sql, ownerP, a.id, "cancelled", { restaurant: "x", sender: async () => ({ status: "dry_run" }) })).toBe("ok");
      expect(await order({ promoCode: "TEN", phone: "(305) 555-0100" })).toMatchObject({ ok: true, totalCents: 3178 });
      const [stats] = (await listPromotions(sql, ownerP, NOW)).filter((p) => p.code === "TEN");
      expect(stats).toMatchObject({ uses: 1, orders: 1, revenueCents: 3178, discountCents: 330 });
    });

    it("per-guest limits, automatic promotions, and pausing", async () => {
      const r = await createPromotion(sql, ownerP, { name: "Once each", code: "ONCE", automatic: false, kind: "amount_order", amount: "5", maxUsesPerPhone: "1" });
      if (!r.ok) throw new Error(r.error);
      expect(await order({ promoCode: "ONCE", phone: "305-555-0111" })).toMatchObject({ ok: true, totalCents: 2800 + 196 });
      expect(await order({ promoCode: "ONCE", phone: "305-555-0111" })).toEqual({ ok: false, error: "You've already used that code." });
      expect(await order({ promoCode: "ONCE", phone: "305-555-0112" })).toMatchObject({ ok: true });

      const auto = await createPromotion(sql, ownerP, { name: "Lamb night", code: "", automatic: true, kind: "amount_item", amount: "4", itemId: "lamb", minSubtotal: "50" });
      if (!auto.ok) throw new Error(auto.error);
      // No lamb, no discount; lamb over the minimum, $4 off each.
      expect(await order()).toMatchObject({ ok: true, totalCents: 3300 + 231 });
      const withLamb = await order({ cart: [{ itemId: "lamb", qty: 2 }] });
      expect(withLamb).toMatchObject({ ok: true, totalCents: 10400 - 800 + 672 });
      await expect(setPromotionActive(sql, hostP, auto.id, false)).rejects.toBeInstanceOf(Forbidden);
      expect(await setPromotionActive(sql, ownerP, auto.id, false)).toBe(true);
      expect(await order({ cart: [{ itemId: "lamb", qty: 2 }] })).toMatchObject({ ok: true, totalCents: 10400 + 728 });
    });

    it("two guests racing for the last use: exactly one gets it", async () => {
      expect(await createPromotion(sql, ownerP, { name: "Last one", code: "LAST", automatic: false, kind: "amount_order", amount: "1", maxUses: "1" })).toMatchObject({ ok: true });
      const results = await Promise.all([
        order({ promoCode: "LAST", phone: "305-555-0121" }),
        order({ promoCode: "LAST", phone: "305-555-0122" }),
        order({ promoCode: "LAST", phone: "305-555-0123" }),
      ]);
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      const [{ n }] = await sql<{ n: number }[]>`
        select count(*)::int as n from orders o join promotions p on p.id = o.promotion_id where p.org_id = ${P} and p.code = 'LAST'`;
      expect(n).toBe(1);
    });

    it("another restaurant's code doesn't work here", async () => {
      const rb = await createPromotion(sql, ownerB, { name: "B only", code: "BONLY", automatic: false, kind: "percent_order", percent: "50" });
      expect(rb).toMatchObject({ ok: true });
      expect(await order({ promoCode: "BONLY" })).toEqual({ ok: false, error: "That code isn't valid." });
      expect((await listPromotions(sql, ownerP)).some((p) => p.code === "BONLY")).toBe(false);
      expect(await setPromotionActive(sql, ownerP, (rb as { id: string }).id, false)).toBe(false);
    });
  });
});
