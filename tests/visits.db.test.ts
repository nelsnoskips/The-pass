import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { recordCheck } from "@/lib/guests/visits";
import { openRewards, redeem, saveProgram } from "@/lib/guests/loyalty";
import { connectSquare, handleSquareEvent, verifySquareSignature } from "@/lib/integrations/square";
import { setStatus } from "@/lib/reservations/repo";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";

process.env.INTEGRATIONS_KEY ??= randomBytes(32).toString("base64");
process.env.SQUARE_APPLICATION_ID = "sq-app";
process.env.SQUARE_APPLICATION_SECRET = "sq-secret";

describe("verifySquareSignature", () => {
  const url = "https://pass.example/api/webhooks/square";
  const raw = '{"type":"payment.updated"}';
  const sig = createHmac("sha256", "key").update(url + raw).digest("base64");
  it("accepts Square's signature and refuses anything else", () => {
    expect(verifySquareSignature(raw, sig, url, "key")).toBe(true);
    expect(verifySquareSignature(raw + " ", sig, url, "key")).toBe(false);
    expect(verifySquareSignature(raw, sig, "https://evil.example/api/webhooks/square", "key")).toBe(false);
    expect(verifySquareSignature(raw, null, url, "key")).toBe(false);
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("visits, spend and loyalty against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  let orgId = "", venueId = "", guestId = "";
  let manager: Tenant, host: Tenant, viewer: Tenant;
  const day = (n: number) => new Date(Date.UTC(2026, 9, n, 23, 0));

  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('V', ${`v-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug) values (${orgId}, 'Main', 'main') returning id`;
    venueId = v.id;
    const [g] = await sql<{ id: string }[]>`insert into guests (org_id, phone, name, email) values (${orgId}, '+19545550500', 'Regular', 'reg@example.com') returning id`;
    guestId = g.id;
    manager = { orgId, actor: "mgr@v", role: "manager", venueIds: null };
    host = { orgId, actor: "host@v", role: "host", venueIds: null };
    viewer = { orgId, actor: "view@v", role: "viewer", venueIds: null };
    expect(await saveProgram(sql, manager, { active: true, visitsRequired: 3, reward: "A dessert on us" })).toBeNull();
  });
  afterAll(async () => { await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  it("matches a check by phone, adds spend, counts the visit, and is idempotent", async () => {
    const c = { orgId, source: "square" as const, externalId: "pay-1", amountCents: 8450, closedAt: day(1), phone: "(954) 555-0500" };
    expect(await recordCheck(sql, c)).toEqual({ recorded: true, guestId, countedVisit: true, reward: null });
    expect(await recordCheck(sql, c)).toEqual({ recorded: false, reason: "duplicate" });
    const [g] = await sql<{ visit_count: number; total_spend_cents: string }[]>`select visit_count, total_spend_cents from guests where id = ${guestId}`;
    expect([g.visit_count, Number(g.total_spend_cents)]).toEqual([1, 8450]);
  });

  it("a second check the same night adds spend, not a visit", async () => {
    const r = await recordCheck(sql, { orgId, source: "square", externalId: "pay-2", amountCents: 1200, closedAt: new Date(day(1).getTime() + 3_600_000), email: "REG@example.com" });
    expect(r).toMatchObject({ recorded: true, countedVisit: false });
  });

  it("never creates a guest from a check alone", async () => {
    const r = await recordCheck(sql, { orgId, source: "square", externalId: "pay-3", amountCents: 500, closedAt: day(2), phone: "+13055559999" });
    expect(r).toEqual({ recorded: true, guestId: null, countedVisit: false, reward: null });
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from guests where org_id = ${orgId}`;
    expect(n).toBe(1);
  });

  it("earns the reward on the 3rd visit — from a check or a completed booking — once, and redeems it once", async () => {
    await recordCheck(sql, { orgId, source: "square", externalId: "pay-4", amountCents: 6000, closedAt: day(5), phone: "+19545550500" });
    // Visit 3 comes from the host stand.
    const [r] = await sql<{ id: string }[]>`
      insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, status, manage_token)
      values (${orgId}, ${venueId}, ${guestId}, 2, ${day(9)}, ${new Date(day(9).getTime() + 5_400_000)}, 'seated', ${randomUUID()}) returning id`;
    expect(await setStatus(sql, host, r.id, "completed")).toBe("ok");
    const open = await openRewards(sql, host, [guestId]);
    expect(open.get(guestId)?.reward).toBe("A dessert on us");
    await expect(redeem(sql, viewer, open.get(guestId)!.id)).rejects.toBeInstanceOf(Forbidden);
    expect(await redeem(sql, host, open.get(guestId)!.id)).toBe(true);
    expect(await redeem(sql, host, open.get(guestId)!.id)).toBe(false);
    expect((await openRewards(sql, host, [guestId])).size).toBe(0);
  });

  it("validates the program", async () => {
    expect(await saveProgram(sql, manager, { active: true, visitsRequired: 1, reward: "x" })).toMatch(/between 2 and 50/);
    expect(await saveProgram(sql, manager, { active: true, visitsRequired: 5, reward: " " })).toBe("Say what the reward is.");
    await expect(saveProgram(sql, host, { active: true, visitsRequired: 5, reward: "x" })).rejects.toBeInstanceOf(Forbidden);
  });

  it("Square: connects, then a completed payment becomes a matched check", async () => {
    const square = (async (input: string | URL | Request) => {
      const u = String(input);
      const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 });
      if (u.endsWith("/oauth2/token")) return ok({ access_token: "sq-at", refresh_token: "sq-rt", merchant_id: "M1" });
      if (u.includes("/v2/merchants/M1")) return ok({ merchant: { business_name: "Santorini Las Olas" } });
      if (u.includes("/v2/customers/C1")) return ok({ customer: { phone_number: "+1 954-555-0500" } });
      return new Response("{}", { status: 404 });
    }) as typeof fetch;
    expect(await connectSquare(sql, orgId, "code", "mgr@v", square)).toBe("Santorini Las Olas");
    const event = (id: string, status = "COMPLETED") => ({
      merchant_id: "M1", type: "payment.updated",
      data: { object: { payment: { id, status, customer_id: "C1", total_money: { amount: 4200, currency: "USD" }, updated_at: day(20).toISOString() } } },
    });
    expect(await handleSquareEvent(sql, event("sq-pay-1", "APPROVED"), square)).toBe(false);
    expect(await handleSquareEvent(sql, event("sq-pay-1"), square)).toBe(true);
    expect(await handleSquareEvent(sql, event("sq-pay-1"), square)).toBe(false);
    expect(await handleSquareEvent(sql, { ...event("sq-pay-2"), merchant_id: "OTHER" }, square)).toBe(false);
    const [c] = await sql<{ guest_id: string; amount_cents: number }[]>`select guest_id, amount_cents from guest_checks where external_id = 'sq-pay-1'`;
    expect(c).toEqual({ guest_id: guestId, amount_cents: 4200 });

    // The same Square account can't be claimed by a second restaurant.
    const [o2] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('V2', ${`v2-${randomUUID().slice(0, 8)}`}) returning id`;
    await expect(connectSquare(sql, o2.id, "code", "x", square)).rejects.toThrow("already connected");
    await sql`delete from orgs where id = ${o2.id}`;
  });
});
