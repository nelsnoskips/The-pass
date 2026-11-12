import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { periodsFor } from "@/lib/reports/period";
import { financialSummary, transactions } from "@/lib/reports/financials";
import type { Tenant } from "@/lib/platform/tenant";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

const TZ = "America/New_York";
const P = periodsFor(7, "2026-11-12", TZ); // Nov 6–12, previous Oct 30–Nov 5

d("financials against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 5, onnotice: () => {} });
  const orgs: string[] = [];
  let f: Tenant, empty: Tenant;
  let cardCode = "";

  const newOrg = async (name: string) => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values (${name}, ${`fin-${randomUUID().slice(0, 8)}`}) returning id`;
    orgs.push(o.id);
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug, timezone) values (${o.id}, ${name}, 'main', ${TZ}) returning id`;
    return { orgId: o.id, venueId: v.id };
  };
  const pay = (orgId: string, kind: string, amount: number, status: string, created: string, updated = created, links: { reservation?: string; order?: string; card?: string } = {}) =>
    sql`insert into payments (org_id, kind, amount_cents, status, provider, created_at, updated_at, reservation_id, order_id, gift_card_id)
        values (${orgId}, ${kind}, ${amount}, ${status}, 'stripe', ${created}, ${updated}, ${links.reservation ?? null}, ${links.order ?? null}, ${links.card ?? null})`;
  const card = (orgId: string, initial: number, balance: number, status: string, activated: string | null) => {
    const code = `FIN${randomUUID().slice(0, 1).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
    return sql<{ id: string; code: string }[]>`
      insert into gift_cards (org_id, code, initial_cents, balance_cents, status, purchaser_name, purchaser_email, recipient_name, activated_at)
      values (${orgId}, ${code}, ${initial}, ${balance}, ${status}, 'Pat Buyer', 'pat@example.com', 'Robin', ${activated}) returning id, code`.then((r) => r[0]);
  };

  beforeAll(async () => {
    const F = await newOrg("Fin");
    f = { orgId: F.orgId, actor: "viewer@fin", role: "viewer", venueIds: null };
    const [g] = await sql<{ id: string }[]>`insert into guests (org_id, phone, name) values (${F.orgId}, '+13055550301', 'Dana Deposit') returning id`;
    const [r] = await sql<{ id: string }[]>`
      insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, status, deposit_cents, deposit_status, manage_token)
      values (${F.orgId}, ${F.venueId}, ${g.id}, 4, '2026-11-14T19:00:00-05:00', '2026-11-14T21:00:00-05:00', 'booked', 5000, 'captured', ${randomUUID()}) returning id`;
    const [o] = await sql<{ id: string }[]>`
      insert into orders (org_id, venue_id, guest_id, number, kind, status, payment, name, phone, ready_at, items, subtotal_cents, total_cents, manage_token, created_at)
      values (${F.orgId}, ${F.venueId}, ${g.id}, 1042, 'pickup', 'completed', 'paid', 'Dana Deposit', '+13055550301', '2026-11-11T18:00:00-05:00', '[]'::jsonb, 2500, 2500, ${randomUUID()}, '2026-11-11T17:30:00-05:00') returning id`;
    // Paid at the counter: never touched The Pass.
    await sql`
      insert into orders (org_id, venue_id, number, kind, status, payment, name, phone, ready_at, items, subtotal_cents, total_cents, manage_token, created_at)
      values (${F.orgId}, ${F.venueId}, 1043, 'pickup', 'completed', 'at_pickup', 'Walk Up', '+13055550302', '2026-11-11T12:00:00-05:00', '[]'::jsonb, 1500, 1500, ${randomUUID()}, '2026-11-11T11:30:00-05:00')`;

    const live = await card(F.orgId, 5000, 2000, "active", "2026-11-09T15:00:00Z");
    cardCode = live.code;
    const voided = await card(F.orgId, 2500, 2500, "void", "2026-11-09T16:00:00Z");
    const unpaid = await card(F.orgId, 1000, 1000, "pending", null);
    await sql`insert into gift_card_redemptions (org_id, gift_card_id, amount_cents, redeemed_by, created_at)
              values (${F.orgId}, ${live.id}, 3000, 'host@fin', '2026-11-11T20:00:00Z')`;

    // This period.
    await pay(F.orgId, "deposit", 5000, "captured", "2026-11-10T14:00:00Z", "2026-11-10T14:00:00Z", { reservation: r.id });
    await pay(F.orgId, "order", 2500, "captured", "2026-11-11T22:30:00Z", "2026-11-11T22:30:00Z", { order: o.id });
    await pay(F.orgId, "gift_card", 5000, "captured", "2026-11-09T15:00:00Z", "2026-11-09T15:00:00Z", { card: live.id });
    await pay(F.orgId, "gift_card", 2500, "canceled", "2026-11-09T16:00:00Z", "2026-11-09T17:00:00Z", { card: voided.id });
    await pay(F.orgId, "gift_card", 1000, "pending", "2026-11-12T15:00:00Z", "2026-11-12T15:00:00Z", { card: unpaid.id });
    await pay(F.orgId, "no_show_fee", 2000, "failed", "2026-11-08T15:00:00Z");
    await pay(F.orgId, "deposit", 4000, "held", "2026-11-12T16:00:00Z");
    // Taken last period, refunded in this one.
    await pay(F.orgId, "deposit", 3000, "refunded", "2026-11-01T15:00:00Z", "2026-11-08T15:00:00Z");
    // Taken and refunded long ago: in neither period.
    await pay(F.orgId, "deposit", 9900, "refunded", "2026-09-01T15:00:00Z", "2026-09-02T15:00:00Z");

    const E = await newOrg("Fin Empty");
    empty = { orgId: E.orgId, actor: "owner@e", role: "owner", venueIds: null };
  });
  afterAll(async () => {
    for (const id of orgs) await sql`delete from orgs where id = ${id}`;
    await sql.end();
  });

  it("collected, refunded and net for the period and the one before", async () => {
    const s = await financialSummary(sql, f, P);
    expect(s.collectedCents).toBe(5000 + 2500 + 5000);
    expect(s.refundedCents).toBe(3000);
    expect(s.netCents).toBe(12500 - 3000);
    expect(s.prevCollectedCents).toBe(3000);
    expect(s.prevRefundedCents).toBe(0);
    expect(s.prevNetCents).toBe(3000);
    const deposit = s.byKind.find((k) => k.kind === "deposit")!;
    expect(deposit).toMatchObject({ collectedCents: 5000, refundedCents: 3000, netCents: 2000, count: 1 });
    expect(s.byKind.find((k) => k.kind === "no_show_fee")).toMatchObject({ collectedCents: 0, netCents: 0 });
    expect(s.byKind.reduce((t, k) => t + k.netCents, 0)).toBe(s.netCents);
  });

  it("held deposits, pending checkouts and counter-paid orders are shown apart", async () => {
    const s = await financialSummary(sql, f, P);
    expect([s.depositsHeldCents, s.depositsHeldCount]).toEqual([4000, 1]);
    expect([s.pendingCents, s.pendingCount, s.failedCount]).toEqual([1000, 1, 1]);
    expect([s.payAtPickupCents, s.payAtPickupCount]).toEqual([1500, 1]);
    expect(s.payoutsCents).toBeNull();
  });

  it("gift card liability is what's left on live cards: sold less redeemed", async () => {
    const s = await financialSummary(sql, f, P);
    expect(s.giftSoldCents).toBe(5000); // the voided card doesn't count
    expect(s.giftRedeemedCents).toBe(3000);
    expect(s.giftLiabilityCents).toBe(2000);
    expect(s.giftLiabilityCents).toBe(s.giftSoldCents! - s.giftRedeemedCents!);
    expect(s.giftCardsOutstanding).toBe(1);
  });

  it("a restaurant with no payments shows —, not $0", async () => {
    const s = await financialSummary(sql, empty, P);
    expect(s.hasPayments).toBe(false);
    expect(s.collectedCents).toBeNull();
    expect(s.netCents).toBeNull();
    expect(s.depositsHeldCents).toBeNull();
    expect(s.giftLiabilityCents).toBeNull();
    expect(s.payAtPickupCents).toBeNull();
    expect(s.payoutsCents).toBeNull();
  });

  it("transactions: the ledger with redemptions, filtered and paged", async () => {
    const all = await transactions(sql, f, { range: P.cur, tz: TZ });
    // 7 payments made in this period + 1 redemption (refunded deposits are dated when they were taken).
    expect(all.total).toBe(8);
    expect(all.rows[0].createdAt >= all.rows[all.rows.length - 1].createdAt).toBe(true);
    const dep = all.rows.find((x) => x.kind === "deposit" && x.status === "captured")!;
    expect(dep).toMatchObject({ who: "Dana Deposit", ref: "Booking Nov 14, party of 4", amountCents: 5000 });
    expect(all.rows.find((x) => x.kind === "order")).toMatchObject({ ref: "Order 1042" });
    expect(all.rows.find((x) => x.kind === "redemption")).toMatchObject({ status: "redeemed", amountCents: 3000, who: "Robin", ref: `Card ${cardCode}` });

    expect((await transactions(sql, f, { range: P.cur, tz: TZ, kind: "deposit" })).total).toBe(2);
    expect((await transactions(sql, f, { range: P.prev, tz: TZ, status: "refunded" })).rows.map((x) => x.amountCents)).toEqual([3000]);
    const p1 = await transactions(sql, f, { range: P.cur, tz: TZ, pageSize: 3, page: 1 });
    const p3 = await transactions(sql, f, { range: P.cur, tz: TZ, pageSize: 3, page: 3 });
    expect([p1.pages, p1.rows.length, p3.rows.length]).toEqual([3, 3, 2]);
    expect(new Set([...p1.rows, ...p3.rows].map((x) => x.id)).size).toBe(5);
    expect((await transactions(sql, f, { range: P.cur, tz: TZ, pageSize: 3, page: 99 })).page).toBe(3);
  });

  it("nothing from one restaurant reaches another", async () => {
    const stranger: Tenant = { orgId: empty.orgId, actor: "x@y", role: "owner", venueIds: null };
    expect((await transactions(sql, stranger, { range: P.cur, tz: TZ })).total).toBe(0);
    const s = await financialSummary(sql, stranger, P);
    expect(s.byKind.every((k) => k.collectedCents === 0)).toBe(true);
  });
});
