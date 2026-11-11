import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { activateCard, createCard, newCode, normalizeCode, redeemCard, setCardStatus, validatePurchase } from "@/lib/giftcards";
import { applyStripeEvent, createGiftCardCheckout } from "@/lib/payments/stripe";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";

describe("gift card codes", () => {
  it("are 12 unambiguous characters in three groups", () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  });
  it("normalize how people type them", () => {
    expect(normalizeCode(" abcd efgh jkmn ")).toBe("ABCD-EFGH-JKMN");
    expect(normalizeCode("abcd-efgh-jkm")).toBeNull();
  });
  it("validate purchases", () => {
    const ok = { amountCents: 5000, purchaserName: "A", purchaserEmail: "a@b.co" };
    expect(validatePurchase(ok)).toBeNull();
    expect(validatePurchase({ ...ok, amountCents: 500 })).toMatch(/\$10 and \$500/);
    expect(validatePurchase({ ...ok, purchaserEmail: "nope" })).toMatch(/email/);
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("gift cards against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 5, onnotice: () => {} });
  let orgId = "";
  let host: Tenant, manager: Tenant, viewer: Tenant, stranger: Tenant;
  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('GC', ${`gc-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    host = { orgId, actor: "host@gc", role: "host", venueIds: null };
    manager = { orgId, actor: "mgr@gc", role: "manager", venueIds: null };
    viewer = { orgId, actor: "v@gc", role: "viewer", venueIds: null };
    stranger = { orgId: randomUUID(), actor: "x@y", role: "owner", venueIds: null };
  });
  afterAll(async () => { await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  const buy = () => createCard(sql, orgId, { amountCents: 5000, purchaserName: "Ana", purchaserEmail: "ana@example.com" });

  it("a pending card can't be spent; once active it spends down across visits", async () => {
    const c = await buy();
    expect(await redeemCard(sql, host, c.code, 1000)).toMatchObject({ ok: false, reason: "not_active" });
    expect(await activateCard(sql, c.id, "test")).toBe(true);
    expect(await activateCard(sql, c.id, "test")).toBe(false);
    expect(await redeemCard(sql, host, c.code.toLowerCase().replace(/-/g, " "), 3000)).toEqual({ ok: true, balanceCents: 2000 });
    expect(await redeemCard(sql, host, c.code, 2500)).toEqual({ ok: false, reason: "insufficient", balanceCents: 2000 });
    expect(await redeemCard(sql, host, c.code, 2000)).toEqual({ ok: true, balanceCents: 0 });
  });

  it("can't be spent twice by two hosts at once", async () => {
    const c = await buy();
    await activateCard(sql, c.id, "test");
    const results = await Promise.all([redeemCard(sql, host, c.code, 4000), redeemCard(sql, host, c.code, 4000)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const [row] = await sql<{ balance_cents: number }[]>`select balance_cents from gift_cards where id = ${c.id}`;
    expect(row.balance_cents).toBe(1000);
  });

  it("is invisible to other restaurants and to viewers' redemptions", async () => {
    const c = await buy();
    await activateCard(sql, c.id, "test");
    expect(await redeemCard(sql, stranger, c.code, 100)).toMatchObject({ ok: false, reason: "not_found" });
    await expect(redeemCard(sql, viewer, c.code, 100)).rejects.toBeInstanceOf(Forbidden);
    await expect(setCardStatus(sql, host, c.id, "void")).rejects.toBeInstanceOf(Forbidden);
    expect(await setCardStatus(sql, manager, c.id, "void")).toBe(true);
    expect(await redeemCard(sql, host, c.code, 100)).toMatchObject({ ok: false, reason: "not_active" });
  });

  it("Stripe: paying activates the card; an abandoned checkout voids it", async () => {
    const fake = (async () => new Response(JSON.stringify({ id: "cs_gc", url: "https://checkout.stripe.com/c/pay/cs_gc" }), { status: 200 })) as typeof fetch;
    const paid = await buy();
    const url1 = await createGiftCardCheckout(sql, "sk_test", { orgId, giftCardId: paid.id, amountCents: 5000, description: "GC gift card", returnUrl: "https://p.example/s/gc/gift-cards", email: "ana@example.com" }, fake);
    expect(url1).toMatch(/^https:\/\/checkout\.stripe\.com/);
    const [p1] = await sql<{ id: string }[]>`select id from payments where gift_card_id = ${paid.id}`;
    await applyStripeEvent(sql, { id: "e1", type: "checkout.session.completed", data: { object: { id: "cs_gc", payment_intent: "pi_gc", metadata: { payment_id: p1.id } } } });
    const abandoned = await buy();
    await createGiftCardCheckout(sql, "sk_test", { orgId, giftCardId: abandoned.id, amountCents: 5000, description: "x", returnUrl: "https://p.example/", email: "a@b.co" }, fake);
    const [p2] = await sql<{ id: string }[]>`select id from payments where gift_card_id = ${abandoned.id}`;
    await applyStripeEvent(sql, { id: "e2", type: "checkout.session.expired", data: { object: { id: "cs_gc", metadata: { payment_id: p2.id } } } });
    const rows = await sql<{ id: string; status: string }[]>`select id, status from gift_cards where id in (${paid.id}, ${abandoned.id})`;
    const by = Object.fromEntries(rows.map((r) => [r.id, r.status]));
    expect([by[paid.id], by[abandoned.id]]).toEqual(["active", "void"]);
  });
});
