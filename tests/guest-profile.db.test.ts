import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { guestProfile, updateGuest } from "@/lib/guests/profile";
import { searchEverything } from "@/lib/platform/search";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;
const NOW = new Date("2026-11-12T17:00:00Z");

d("guest profile against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 5, onnotice: () => {} });
  const orgs: string[] = [];
  let orgId = "", slug = "", guestId = "";
  let manager: Tenant, host: Tenant, other: Tenant;

  beforeAll(async () => {
    slug = `gp-${randomUUID().slice(0, 8)}`;
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Profile', ${slug}) returning id`;
    orgId = o.id; orgs.push(o.id);
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug) values (${orgId}, 'Main', 'main') returning id`;
    const [g] = await sql<{ id: string }[]>`
      insert into guests (org_id, phone, name, email, tags, notes, visit_count, no_show_count, sms_consent_at, sms_consent_source, email_consent_at, email_consent_source, created_at)
      values (${orgId}, '+13055550401', 'Gia Guest', 'Gia@Example.com', '{regular}', 'Window seat', 7, 1,
              '2026-10-02T12:00:00Z', 'booking form', '2026-10-03T12:00:00Z', 'gift card checkout', '2026-10-01T12:00:00Z') returning id`;
    guestId = g.id;
    const book = (at: string, status: string, party = 2) => sql`
      insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, status, manage_token, created_at)
      values (${orgId}, ${v.id}, ${guestId}, ${party}, ${at}, ${at}::timestamptz + interval '90 minutes', ${status}, ${randomUUID()}, '2026-10-01T12:00:00Z')`;
    await book("2026-11-20T19:00:00-05:00", "confirmed", 4);
    await book("2026-11-05T19:00:00-05:00", "completed");
    await book("2026-10-20T19:00:00-04:00", "no_show");
    await sql`insert into orders (org_id, venue_id, guest_id, number, kind, status, payment, name, phone, ready_at, items, subtotal_cents, total_cents, manage_token, created_at)
              values (${orgId}, ${v.id}, ${guestId}, 1500, 'pickup', 'completed', 'paid', 'Gia', '+13055550401', '2026-11-06T18:00:00Z', '[]'::jsonb, 3200, 3200, ${randomUUID()}, '2026-11-06T17:30:00Z')`;
    await sql`insert into gift_cards (org_id, code, initial_cents, balance_cents, status, purchaser_name, purchaser_email, recipient_name, activated_at, created_at)
              values (${orgId}, ${`GPRO-${randomUUID().slice(0, 4).toUpperCase()}-0001`}, 5000, 5000, 'active', 'Gia', 'gia@example.com', 'Sam', now(), '2026-11-07T12:00:00Z')`;
    await sql`insert into guest_messages (org_id, guest_id, channel, kind, body, status, sent_by, created_at)
              values (${orgId}, ${guestId}, 'sms', 'transactional', 'See you Friday', 'sent', 'system', '2026-11-04T12:00:00Z')`;
    await sql`insert into loyalty_programs (org_id, active, visits_required, reward) values (${orgId}, true, 5, 'Dessert')`;
    await sql`insert into loyalty_rewards (org_id, guest_id, reward, earned_at_visit, earned_at) values (${orgId}, ${guestId}, 'Dessert', 5, '2026-10-25T12:00:00Z')`;

    manager = { orgId, actor: "mgr@gp", role: "manager", venueIds: null };
    host = { orgId, actor: "host@gp", role: "host", venueIds: null };
    const [o2] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Elsewhere', ${`gp-${randomUUID().slice(0, 8)}`}) returning id`;
    orgs.push(o2.id);
    other = { orgId: o2.id, actor: "owner@else", role: "owner", venueIds: null };
  });
  afterAll(async () => {
    for (const id of orgs) await sql`delete from orgs where id = ${id}`;
    await sql.end();
  });

  it("brings everything about a guest together", async () => {
    const p = (await guestProfile(sql, host, guestId, NOW))!;
    expect(p.guest).toMatchObject({ name: "Gia Guest", tags: ["regular"], visitCount: 7, noShowCount: 1, smsConsentSource: "booking form" });
    expect(p.upcoming.map((b) => b.partySize)).toEqual([4]);
    expect(p.past.map((b) => b.status)).toEqual(["completed", "no_show"]);
    expect(p.orders.map((o) => o.number)).toEqual([1500]);
    expect(p.giftCards).toHaveLength(1);
    expect(p.giftCards[0].role).toBe("bought"); // matched on email, whatever its case
    expect(p.messages.map((m) => m.body)).toEqual(["See you Friday"]);
    expect(p.loyalty).toMatchObject({ visitsRequired: 5, towardNext: 2 });
    expect(p.rewards.map((r) => r.redeemedAt)).toEqual([null]);
    const times = p.timeline.map((e) => e.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(new Set(p.timeline.map((e) => e.kind))).toEqual(new Set(["joined", "consent", "booking", "visit", "no_show", "order", "gift_card", "message", "reward"]));
  });

  it("is invisible to another restaurant and to a bad id", async () => {
    expect(await guestProfile(sql, other, guestId, NOW)).toBeNull();
    expect(await guestProfile(sql, manager, "not-a-uuid", NOW)).toBeNull();
    expect(await guestProfile(sql, manager, randomUUID(), NOW)).toBeNull();
  });

  it("managers edit name, email, tags and notes, and it's logged; hosts can't", async () => {
    await expect(updateGuest(sql, host, guestId, { name: "X", email: "", tags: "", notes: "" })).rejects.toBeInstanceOf(Forbidden);
    expect(await updateGuest(sql, other, guestId, { name: "X", email: "", tags: "", notes: "" })).toEqual({ ok: false, error: "Guest not found." });
    expect(await updateGuest(sql, manager, guestId, { name: "Gia Guest", email: "nope", tags: "", notes: "" })).toMatchObject({ ok: false });

    const r = await updateGuest(sql, manager, guestId, { name: "Gia Guest", email: "Gia@Example.com", tags: "regular, VIP", notes: "Window seat. Shellfish allergy." });
    expect(r).toEqual({ ok: true, changed: ["email", "notes", "tags"] });
    const [log] = await sql<{ actor: string; detail: { fields: string[]; before: Record<string, unknown>; after: Record<string, unknown> } }[]>`
      select actor, detail from change_log where org_id = ${orgId} and entity = 'guest' and entity_id = ${guestId} order by id desc limit 1`;
    expect(log.actor).toBe("mgr@gp");
    expect(log.detail.after.tags).toEqual(["regular", "VIP"]);
    expect(log.detail.before.notes).toBe("Window seat");

    expect(await updateGuest(sql, manager, guestId, { name: "Gia Guest", email: "gia@example.com", tags: "regular,VIP", notes: "Window seat. Shellfish allergy." })).toEqual({ ok: true, changed: [] });
    const p = (await guestProfile(sql, manager, guestId, NOW))!;
    expect(p.timeline.some((e) => e.kind === "edit" && e.detail === "by mgr@gp")).toBe(true);
  });

  it("search sends guest hits to the profile", async () => {
    const hits = await searchEverything(sql, host, slug, "Gia", NOW);
    expect(hits.find((h) => h.kind === "guest")?.href).toBe(`/r/${slug}/guests/${guestId}`);
  });
});
