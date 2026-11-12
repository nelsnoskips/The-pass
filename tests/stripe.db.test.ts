import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { createHmac, randomUUID } from "node:crypto";
import { applyStripeEvent, stripePayments, verifyStripeSignature } from "@/lib/payments/stripe";
import { manualPayments, refundDepositIfDue } from "@/lib/payments";
import { cancelOutcome, cancelledDepositText } from "@/lib/reservations/policy";
import { bookingByToken } from "@/lib/reservations/repo";

describe("verifyStripeSignature", () => {
  const secret = "whsec_test";
  const raw = '{"id":"evt_1"}';
  const sign = (t: number, body = raw, key = secret) => `t=${t},v1=${createHmac("sha256", key).update(`${t}.${body}`).digest("hex")}`;
  const now = 1_800_000_000;

  it("accepts a fresh, correct signature", () => {
    expect(verifyStripeSignature(raw, sign(now), secret, now)).toBe(true);
  });
  it("refuses a tampered body, a wrong secret, a replay, or no header", () => {
    expect(verifyStripeSignature('{"id":"evt_2"}', sign(now), secret, now)).toBe(false);
    expect(verifyStripeSignature(raw, sign(now, raw, "whsec_other"), secret, now)).toBe(false);
    expect(verifyStripeSignature(raw, sign(now - 600), secret, now)).toBe(false);
    expect(verifyStripeSignature(raw, null, secret, now)).toBe(false);
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("Stripe deposits against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  let orgId = "", venueId = "";
  const calls: { path: string; body: URLSearchParams; idem: string | null }[] = [];
  const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const path = String(input).replace("https://api.stripe.com/v1", "");
    calls.push({ path, body: init?.body as URLSearchParams, idem: new Headers(init?.headers).get("idempotency-key") });
    const json = path === "/checkout/sessions"
      ? { id: `cs_${calls.length}`, url: `https://checkout.stripe.com/c/pay/cs_${calls.length}` }
      : { id: `re_${calls.length}` };
    return new Response(JSON.stringify(json), { status: 200 });
  }) as typeof fetch;
  const stripe = stripePayments("sk_test_x", fakeFetch, () => new Date("2026-11-10T17:00:00Z"));

  async function reservation(hoursAhead: number) {
    const [g] = await sql<{ id: string }[]>`insert into guests (org_id, phone, name) values (${orgId}, ${`+1305555${Math.floor(1000 + Math.random() * 8999)}`}, 'Dep') returning id`;
    const [r] = await sql<{ id: string }[]>`
      insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, status, deposit_cents, deposit_status, manage_token)
      values (${orgId}, ${venueId}, ${g.id}, 2, now() + ${`${hoursAhead} hours`}::interval, now() + ${`${hoursAhead + 2} hours`}::interval, 'booked', 2000, 'pending', ${randomUUID()})
      returning id`;
    return r.id;
  }
  const event = (type: string, paymentId: string, extra: Record<string, unknown> = {}) =>
    ({ id: `evt_${randomUUID()}`, type, data: { object: { id: "cs_x", metadata: { payment_id: paymentId }, ...extra } } });

  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Pay', ${`pay-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug, cancel_cutoff_hours) values (${orgId}, 'Main', 'main', 24) returning id`;
    venueId = v.id;
  });
  afterAll(async () => { await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  it("creates a 30-minute Checkout Session with the deposit and an idempotency key", async () => {
    const rid = await reservation(72);
    const r = await stripe.createDeposit(sql, { orgId, reservationId: rid, amountCents: 2000, returnUrl: "https://pass.example/s/x/booking/t", description: "Santorini deposit" });
    expect(r.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com/);
    const c = calls.at(-1)!;
    expect(c.path).toBe("/checkout/sessions");
    expect(c.body.get("line_items[0][price_data][unit_amount]")).toBe("2000");
    expect(c.body.get("metadata[payment_id]")).toBe(r.paymentId);
    expect(c.body.get("success_url")).toBe("https://pass.example/s/x/booking/t?paid=1");
    expect(Number(c.body.get("expires_at"))).toBe(Math.floor(Date.parse("2026-11-10T17:30:00Z") / 1000));
    expect(c.idem).toBe(`deposit-${r.paymentId}`);
  });

  it("marks the deposit paid from the webhook, once", async () => {
    const rid = await reservation(72);
    const { paymentId } = await stripe.createDeposit(sql, { orgId, reservationId: rid, amountCents: 2000, returnUrl: "https://p.example/", description: "d" });
    const e = event("checkout.session.completed", paymentId, { payment_intent: "pi_123" });
    expect(await applyStripeEvent(sql, e)).toBe(true);
    expect(await applyStripeEvent(sql, e)).toBe(false);
    const [row] = await sql<{ status: string; provider_charge_ref: string; deposit_status: string }[]>`
      select p.status, p.provider_charge_ref, r.deposit_status from payments p join reservations r on r.id = p.reservation_id where p.id = ${paymentId}`;
    expect(row).toEqual({ status: "captured", provider_charge_ref: "pi_123", deposit_status: "captured" });
  });

  it("lets the table go when the deposit isn't paid in time", async () => {
    const rid = await reservation(72);
    await sql`insert into dining_tables (org_id, venue_id, label, max_covers) values (${orgId}, ${venueId}, ${`T${randomUUID().slice(0, 4)}`}, 2)`;
    const { paymentId } = await stripe.createDeposit(sql, { orgId, reservationId: rid, amountCents: 2000, returnUrl: "https://p.example/", description: "d" });
    expect(await applyStripeEvent(sql, event("checkout.session.expired", paymentId))).toBe(true);
    const [r] = await sql<{ status: string }[]>`select status from reservations where id = ${rid}`;
    expect(r.status).toBe("cancelled");
  });

  it("refunds a guest who cancels before the cut-off, not after; the restaurant always refunds", async () => {
    const early = await reservation(72);
    const late = await reservation(6);
    const theirFault = await reservation(6);
    for (const rid of [early, late, theirFault]) {
      const { paymentId } = await stripe.createDeposit(sql, { orgId, reservationId: rid, amountCents: 2000, returnUrl: "https://p.example/", description: "d" });
      await applyStripeEvent(sql, event("checkout.session.completed", paymentId, { payment_intent: `pi_${rid.slice(0, 6)}` }));
    }
    // Refunds go through the real provider selection, which needs the key.
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const realFetch = globalThis.fetch;
    globalThis.fetch = fakeFetch;
    try {
      expect(await refundDepositIfDue(sql, orgId, early, "guest")).toBe(true);
      expect(await refundDepositIfDue(sql, orgId, late, "guest")).toBe(false);
      expect(await refundDepositIfDue(sql, orgId, theirFault, "restaurant")).toBe(true);
      expect(await refundDepositIfDue(sql, orgId, early, "guest")).toBe(false);
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.STRIPE_SECRET_KEY;
    }
    const refunds = calls.filter((c) => c.path === "/refunds");
    expect(refunds).toHaveLength(2);
    expect(refunds[0].body.get("payment_intent")).toBe(`pi_${early.slice(0, 6)}`);
    const rows = await sql<{ id: string; deposit_status: string }[]>`select id, deposit_status from reservations where id in (${early}, ${late}, ${theirFault})`;
    const by = Object.fromEntries(rows.map((r) => [r.id, r.deposit_status]));
    expect([by[early], by[late], by[theirFault]]).toEqual(["refunded", "captured", "refunded"]);
  });

  it("ignores events for payments it doesn't know", async () => {
    expect(await applyStripeEvent(sql, event("checkout.session.completed", randomUUID()))).toBe(false);
    expect(await applyStripeEvent(sql, { id: "e", type: "x", data: { object: { id: "y" } } })).toBe(false);
  });

  it("manual deposits refund too", async () => {
    const rid = await reservation(72);
    const { paymentId } = await manualPayments.createDeposit(sql, { orgId, reservationId: rid, amountCents: 2000, returnUrl: "/", description: "d" });
    await sql`update payments set status = 'held' where id = ${paymentId}`;
    expect(await refundDepositIfDue(sql, orgId, rid, "guest")).toBe(true);
    const [p] = await sql<{ status: string }[]>`select status from payments where id = ${paymentId}`;
    expect(p.status).toBe("refunded");
  });

  it("what the guest is told before cancelling is what the refund does", async () => {
    for (const [hours, refunds] of [[30, true], [20, false]] as const) {
      const rid = await reservation(hours);
      const { paymentId } = await manualPayments.createDeposit(sql, { orgId, reservationId: rid, amountCents: 2000, returnUrl: "/", description: "d" });
      await sql`update payments set status = 'held' where id = ${paymentId}`;
      await sql`update reservations set deposit_status = 'held' where id = ${rid}`;
      const [{ manage_token: token }] = await sql<{ manage_token: string }[]>`select manage_token from reservations where id = ${rid}`;
      const b = (await bookingByToken(sql, token))!;
      expect(b).toMatchObject({ depositCents: 2000, depositStatus: "held", cancelCutoffHours: 24 });
      const told = cancelOutcome({ ...b, cutoffHours: b.cancelCutoffHours, now: new Date() });
      expect(told.refund).toBe(refunds);
      expect(told.text).toBe(refunds ? "Your $20 deposit will be refunded in full." : "It’s past the 24-hour cut-off, so your $20 deposit won’t be refunded.");
      expect(await refundDepositIfDue(sql, orgId, rid, "guest")).toBe(refunds);
      const after = (await bookingByToken(sql, token))!;
      expect(cancelledDepositText(after.depositCents, after.depositStatus)).toMatch(refunds ? /has been refunded/ : /wasn’t refunded/);
    }
  });
});
