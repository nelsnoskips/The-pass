import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { periodsFor, periodsForOrg } from "@/lib/reports/period";
import { overviewReport } from "@/lib/reports/overview";
import { bookingsReport, guestsReport, ordersReport } from "@/lib/reports/sections";
import type { Tenant } from "@/lib/platform/tenant";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

/**
 * One restaurant in New York, "today" = Thu Nov 12 2026. The 7-day
 * period is Nov 6–12; the one before it Oct 30–Nov 5.
 */
const TZ = "America/New_York";
const P = periodsFor(7, "2026-11-12", TZ);

d("reporting against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 5, onnotice: () => {} });
  const orgs: string[] = [];
  let a: Tenant, b: Tenant, empty: Tenant;
  let g1 = "", g2 = "";

  const newOrg = async (name: string) => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values (${name}, ${`rep-${randomUUID().slice(0, 8)}`}) returning id`;
    orgs.push(o.id);
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug, timezone) values (${o.id}, ${name}, 'main', ${TZ}) returning id`;
    return { orgId: o.id, venueId: v.id };
  };
  const guest = (orgId: string, phone: string, name: string, created: string, visits = 0) =>
    sql<{ id: string }[]>`insert into guests (org_id, phone, name, created_at, visit_count) values (${orgId}, ${phone}, ${name}, ${created}, ${visits}) returning id`.then((r) => r[0].id);
  const booking = (orgId: string, venueId: string, guestId: string, party: number, at: string, status: string, source = "website") =>
    sql`insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, status, source, manage_token)
        values (${orgId}, ${venueId}, ${guestId}, ${party}, ${at}, ${at}::timestamptz + interval '90 minutes', ${status}, ${source}, ${randomUUID()})`;
  let orderNo = 2000;
  const order = (orgId: string, venueId: string, guestId: string, kind: string, status: string, payment: string, total: number, at: string, items: unknown[]) =>
    sql`insert into orders (org_id, venue_id, guest_id, number, kind, status, payment, name, phone, ready_at, items, subtotal_cents, total_cents, manage_token, created_at)
        values (${orgId}, ${venueId}, ${guestId}, ${orderNo++}, ${kind}, ${status}, ${payment}, 'Guest', '+13055550000', ${at}, ${sql.json(items as never)}, ${total}, ${total}, ${randomUUID()}, ${at})`;

  beforeAll(async () => {
    const A = await newOrg("Reports A");
    a = { orgId: A.orgId, actor: "owner@a", role: "viewer", venueIds: null };
    g1 = await guest(A.orgId, "+13055550101", "Regular Rae", "2026-10-01T12:00:00Z", 3);
    g2 = await guest(A.orgId, "+13055550102", "New Ned", "2026-11-07T12:00:00Z", 1);
    // Previous period: Rae's first visit.
    await booking(A.orgId, A.venueId, g1, 2, "2026-11-01T19:00:00-04:00", "completed");
    // This period.
    await booking(A.orgId, A.venueId, g1, 4, "2026-11-10T19:00:00-05:00", "completed", "website");
    await booking(A.orgId, A.venueId, g2, 2, "2026-11-11T20:00:00-05:00", "completed", "google");
    await booking(A.orgId, A.venueId, g2, 3, "2026-11-08T18:30:00-05:00", "no_show", "website");
    await booking(A.orgId, A.venueId, g2, 6, "2026-11-09T19:00:00-05:00", "cancelled", "website");
    await booking(A.orgId, A.venueId, g1, 2, "2026-11-12T12:15:00-05:00", "completed", "walk_in");
    // Orders.
    await order(A.orgId, A.venueId, g1, "pickup", "completed", "paid", 2500, "2026-11-10T18:00:00-05:00",
      [{ itemId: "b", name: "Burger", qty: 2, unitCents: 1000, lineCents: 2000, note: "" }, { itemId: "f", name: "Fries", qty: 1, unitCents: 500, lineCents: 500, note: "" }]);
    await order(A.orgId, A.venueId, g2, "catering", "accepted", "at_pickup", 10000, "2026-11-11T10:00:00-05:00",
      [{ itemId: "b", name: "Burger", qty: 5, unitCents: 1000, lineCents: 5000, note: "" }, { itemId: "s", name: "Salad", qty: 10, unitCents: 500, lineCents: 5000, note: "" }]);
    await order(A.orgId, A.venueId, g2, "pickup", "cancelled", "at_pickup", 999, "2026-11-11T11:00:00-05:00", [{ itemId: "x", name: "Ghost", qty: 99, lineCents: 999 }]);
    await order(A.orgId, A.venueId, g1, "pickup", "completed", "at_pickup", 1500, "2026-11-02T12:00:00-05:00", [{ itemId: "b", name: "Burger", qty: 1, lineCents: 1500 }]);
    // Messages: two went out, one never left (no provider).
    for (const status of ["sent", "sent", "dry_run"]) {
      await sql`insert into guest_messages (org_id, guest_id, kind, body, status, sent_by, created_at)
                values (${A.orgId}, ${g1}, 'transactional', 'See you soon', ${status}, 'system', '2026-11-09T15:00:00Z')`;
    }

    // Another restaurant with plenty going on, which A must never see.
    const B = await newOrg("Reports B");
    b = { orgId: B.orgId, actor: "owner@b", role: "owner", venueIds: null };
    const gb = await guest(B.orgId, "+13055550201", "Bea", "2026-11-08T12:00:00Z", 5);
    for (let i = 0; i < 5; i++) await booking(B.orgId, B.venueId, gb, 8, `2026-11-1${i % 3}T19:00:00-05:00`, "completed");
    await order(B.orgId, B.venueId, gb, "pickup", "completed", "paid", 77700, "2026-11-10T18:00:00-05:00", [{ name: "Lobster", qty: 7, lineCents: 77700 }]);
    await sql`insert into loyalty_programs (org_id, active, visits_required, reward) values (${B.orgId}, true, 5, 'Dessert')`;
    await sql`insert into loyalty_rewards (org_id, guest_id, reward, earned_at_visit, earned_at) values (${B.orgId}, ${gb}, 'Dessert', 5, '2026-11-10T20:00:00Z')`;
    await sql`insert into gift_cards (org_id, code, initial_cents, balance_cents, status, purchaser_name, purchaser_email, activated_at)
              values (${B.orgId}, ${`RPTB-${randomUUID().slice(0, 4).toUpperCase()}-0000`}, 5000, 5000, 'active', 'B', 'b@example.com', '2026-11-10T12:00:00Z')`;

    const E = await newOrg("Reports Empty");
    empty = { orgId: E.orgId, actor: "owner@e", role: "owner", venueIds: null };
  });
  afterAll(async () => {
    for (const id of orgs) await sql`delete from orgs where id = ${id}`;
    await sql.end();
  });

  const metrics = async (t: Tenant) => Object.fromEntries((await overviewReport(sql, t, P)).metrics.map((m) => [m.key, m]));

  it("periods follow the restaurant's own calendar", async () => {
    const p = await periodsForOrg(sql, a.orgId, 7, new Date("2026-11-13T03:30:00Z"));
    expect(p.tz).toBe(TZ);
    expect(p.cur.until).toBe("2026-11-12"); // still the 12th in New York
  });

  it("overview totals this period against the last one", async () => {
    const m = await metrics(a);
    expect([m.bookings.cur, m.bookings.prev]).toEqual([4, 1]);
    expect([m.covers.cur, m.covers.prev]).toEqual([8, 2]);
    // 1 no-show out of 3 bookings that came due (the walk-in is left out).
    expect(m.no_show_rate.cur).toBeCloseTo(100 / 3, 5);
    expect(m.no_show_rate.prev).toBe(0);
    expect([m.online_sales.cur, m.online_sales.prev]).toEqual([12500, 1500]);
    expect([m.orders.cur, m.orders.prev]).toEqual([2, 1]);
    expect([m.average_order.cur, m.average_order.prev]).toEqual([6250, 1500]);
    expect([m.new_guests.cur, m.new_guests.prev]).toEqual([1, 0]);
    // Rae came back, Ned was new: half of this period's guests had been before.
    expect(m.repeat_share.cur).toBe(50);
    expect(m.repeat_share.prev).toBe(0);
    expect([m.messages.cur, m.messages.prev]).toEqual([2, 0]);
  });

  it("shows — for what a restaurant hasn't set up", async () => {
    const m = await metrics(a);
    expect(m.rewards_earned.cur).toBeNull();
    expect(m.gift_sold.cur).toBeNull();
    const e = await metrics(empty);
    expect(e.online_sales.cur).toBeNull();
    expect(e.average_order.cur).toBeNull();
    expect(e.no_show_rate.cur).toBeNull();
    expect(e.repeat_share.cur).toBeNull();
    expect(e.covers.cur).toBe(0);
  });

  it("counts loyalty and gift cards where they exist, and keeps each restaurant to itself", async () => {
    const m = await metrics(b);
    expect(m.rewards_earned.cur).toBe(1);
    expect(m.rewards_redeemed.cur).toBe(0);
    expect(m.gift_sold.cur).toBe(5000);
    expect(m.gift_redeemed.cur).toBe(0);
    expect(m.online_sales.cur).toBe(77700);
    expect(m.covers.cur).toBe(40);
    // A's numbers above already exclude all of B's.
    const stranger: Tenant = { orgId: randomUUID(), actor: "x@y", role: "owner", venueIds: null };
    const s = await metrics(stranger);
    expect(s.bookings.cur).toBe(0);
    expect(s.online_sales.cur).toBeNull();
  });

  it("bookings by day, source, party size and hour", async () => {
    const r = await bookingsReport(sql, a, P);
    expect(r.days).toHaveLength(7);
    expect(r.days.map((x) => x.bookings)).toEqual([0, 0, 1, 0, 1, 1, 1]); // Nov 6..12
    expect(r.total).toEqual({ bookings: 4, covers: 11 });
    expect(r.prevTotal).toEqual({ bookings: 1, covers: 2 });
    expect(r.bySource).toEqual([
      { source: "website", bookings: 2, covers: 7 },
      { source: "google", bookings: 1, covers: 2 },
      { source: "walk_in", bookings: 1, covers: 2 },
    ]);
    expect(Object.fromEntries(r.byParty.map((x) => [x.size, x.bookings]))).toMatchObject({ "2": 2, "3": 1, "4": 1, "6": 0 });
    expect(r.heat[2][19]).toBe(1); // Tuesday 7pm
    expect(r.heat[0][18]).toBe(1); // Sunday 6:30pm
    expect(r.hours[0]).toBe(12);
    expect(r.hours[r.hours.length - 1]).toBe(20);
  });

  it("online orders: by day, pickup vs catering, payment and top items", async () => {
    const r = await ordersReport(sql, a, P);
    expect(r.total).toEqual({ orders: 2, salesCents: 12500 });
    expect(r.prevTotal).toEqual({ orders: 1, salesCents: 1500 });
    expect(r.days.find((x) => x.day === "2026-11-11")).toEqual({ day: "2026-11-11", orders: 1, salesCents: 10000 });
    expect(r.byKind).toEqual([{ kind: "pickup", orders: 1, salesCents: 2500 }, { kind: "catering", orders: 1, salesCents: 10000 }]);
    expect(r.byPayment).toEqual({ paidOnline: 1, paidOnlineCents: 2500, atPickup: 1, atPickupCents: 10000 });
    expect(r.topItems).toEqual([
      { name: "Salad", qty: 10, salesCents: 5000 },
      { name: "Burger", qty: 7, salesCents: 7000 },
      { name: "Fries", qty: 1, salesCents: 500 },
    ]);
  });

  it("guests: new vs returning, how often they come, and the regulars", async () => {
    const r = await guestsReport(sql, a, P);
    expect([r.firstTime, r.returning]).toEqual([1, 1]);
    expect([r.prevFirstTime, r.prevReturning]).toEqual([1, 0]);
    expect([r.newGuests, r.prevNewGuests]).toEqual([1, 0]);
    expect(Object.fromEntries(r.frequency.map((f) => [f.label, f.guests]))).toMatchObject({ "1 visit": 1, "3–4 visits": 1, "10+ visits": 0 });
    expect(r.neverVisited).toBe(0);
    expect(r.top.map((g) => [g.name, g.visits])).toEqual([["Regular Rae", 3], ["New Ned", 1]]);
    expect(r.top[0].spendCents).toBeNull(); // no checks recorded: —, not $0
  });
});
