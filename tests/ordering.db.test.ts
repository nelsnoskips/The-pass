import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import {
  DEFAULT_SETTINGS, orderByToken, ordersBoard, placeOrder, priceCart, readyTimes, saveOrderingSettings,
  setKitchenState, setOrderStatus, type OrderingSettings,
} from "@/lib/ordering";
import { applyStripeEvent } from "@/lib/payments/stripe";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";
import type { SiteContent } from "@/lib/sites/content";

const content = {
  brand: { name: "Santorini", tagline: "", cuisine: "Greek", priceRange: "$$" },
  theme: { paper: "#fff", ink: "#000", accent: "#00f" },
  hero: { headline: "", sub: "", image: null }, story: { heading: "", body: "" },
  menus: [{ id: "dinner", name: "Dinner", sections: [{ id: "mains", name: "Mains", note: "", items: [
    { id: "lamb", name: "Lamb chops", description: "", priceCents: 5200, tags: [] },
    { id: "gyro", name: "Gyro", description: "", priceCents: 1650, tags: [] },
    { id: "fish", name: "Whole fish", description: "", priceCents: null, tags: [] },
  ] }] }],
  hours: [], contact: { address: "", phone: "", email: "", mapUrl: "" }, announcement: "", social: { instagram: "" },
} as SiteContent;

const S = (o: Partial<OrderingSettings> = {}): OrderingSettings => ({ ...DEFAULT_SETTINGS, pickupEnabled: true, cateringEnabled: true, ...o });
const TZ = "America/New_York";
// Wednesday Nov 11 2026, 5:00 PM in New York.
const NOW = new Date("2026-11-11T22:00:00Z");
const periods = [{ daysOfWeek: [0, 1, 2, 3, 4, 5, 6], first: "17:00", last: "21:00" }];

describe("ordering rules", () => {
  it("prices from the menu, never from the browser, with tax rounded per order", () => {
    const r = priceCart(content, S({ taxBps: 700 }), "pickup", [{ itemId: "lamb", qty: 2 }, { itemId: "gyro", qty: 1, note: "no onions" }], 300);
    expect(r).toMatchObject({ ok: true, subtotalCents: 12050, taxCents: 844, tipCents: 300, totalCents: 13194 });
  });
  it("refuses unpriced, sold-out and unknown items, silly quantities and typo tips", () => {
    expect(priceCart(content, S(), "pickup", [{ itemId: "fish", qty: 1 }]).ok).toBe(false);
    expect(priceCart(content, S({ soldOut: ["lamb"] }), "pickup", [{ itemId: "lamb", qty: 1 }]).ok).toBe(false);
    expect(priceCart(content, S(), "pickup", [{ itemId: "nope", qty: 1 }]).ok).toBe(false);
    expect(priceCart(content, S(), "pickup", [{ itemId: "gyro", qty: 51 }]).ok).toBe(false);
    expect(priceCart(content, S(), "catering", [{ itemId: "gyro", qty: 120 }]).ok).toBe(true);
    expect(priceCart(content, S(), "pickup", [{ itemId: "gyro", qty: 1 }], 5000).ok).toBe(false);
    expect(priceCart(content, S({ cateringMinCents: 50000 }), "catering", [{ itemId: "gyro", qty: 10 }]).ok).toBe(false);
  });
  it("pickup times start after prep time, inside service hours; a pause pushes them back", () => {
    const t = readyTimes(periods, TZ, NOW, S({ leadMinutes: 25 }), "pickup");
    expect(t[0]).toMatchObject({ date: "2026-11-11", time: "17:30" });
    expect(t.filter((x) => x.date === "2026-11-11")).toHaveLength(15); // 17:30 … 21:00
    const paused = readyTimes(periods, TZ, NOW, S({ pausedUntil: new Date("2026-11-11T23:40:00Z") }), "pickup");
    expect(paused[0].time).toBe("18:45");
    // Catering: 48 hours' notice by default.
    expect(readyTimes(periods, TZ, NOW, S(), "catering")[0]).toMatchObject({ date: "2026-11-13", time: "17:00" });
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("online ordering against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  let orgId = "", venueId = "";
  let owner: Tenant, host: Tenant, viewer: Tenant, stranger: Tenant;
  const texts: { to: string; body: string }[] = [];
  const sender = async (to: string, body: string) => { texts.push({ to, body }); return { status: "dry_run" as const }; };
  const base = () => ({
    orgId, venueId, timezone: TZ, content, kind: "pickup" as const, date: "2026-11-11", time: "18:00",
    name: "Ana Perez", phone: "(305) 555-0199", now: NOW, payOnline: false,
    cart: [{ itemId: "gyro", qty: 2, priceCents: 1 } as never],
  });

  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Order Co', ${`ord-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug, timezone) values (${orgId}, 'Main', 'main', ${TZ}) returning id`;
    venueId = v.id;
    await sql`insert into service_periods (org_id, venue_id, name, days_of_week, first_seating, last_seating)
              values (${orgId}, ${venueId}, 'Dinner', '{0,1,2,3,4,5,6}', '17:00', '21:00')`;
    owner = { orgId, actor: "owner@o", role: "owner", venueIds: null };
    host = { orgId, actor: "host@o", role: "host", venueIds: null };
    viewer = { orgId, actor: "viewer@o", role: "viewer", venueIds: null };
    stranger = { orgId: randomUUID(), actor: "x", role: "owner", venueIds: null };
  });
  afterAll(async () => { await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  it("is off until the restaurant turns it on, and only managers can", async () => {
    expect(await placeOrder(sql, base())).toEqual({ ok: false, error: "Online ordering is off right now." });
    await expect(saveOrderingSettings(sql, host, S())).rejects.toBeInstanceOf(Forbidden);
    expect(await saveOrderingSettings(sql, owner, S({ taxBps: 700 }))).toBeNull();
  });

  it("places an order priced on the server, numbered, and tied to the guest", async () => {
    const a = await placeOrder(sql, base());
    const b = await placeOrder(sql, { ...base(), name: "Sam", phone: "305-555-0100" });
    if (!a.ok || !b.ok) throw new Error("expected orders");
    expect([a.number, b.number]).toEqual([1001, 1002]);
    expect(a.totalCents).toBe(3300 + 231);
    const o = (await orderByToken(sql, a.token))!;
    expect(o).toMatchObject({ status: "placed", payment: "at_pickup", phone: "+13055550199", subtotalCents: 3300 });
    const [g] = await sql<{ n: number }[]>`select count(*)::int as n from guests where org_id = ${orgId} and phone = '+13055550199'`;
    expect(g.n).toBe(1);
    expect(await placeOrder(sql, { ...base(), time: "17:15" })).toMatchObject({ ok: false }); // inside prep time
  });

  it("moves through the kitchen in order, texts the guest when ready, and refuses skips", async () => {
    const r = await placeOrder(sql, { ...base(), phone: "305-555-0177" });
    if (!r.ok) throw new Error("expected order");
    const opts = { restaurant: "Santorini", sender };
    await expect(setOrderStatus(sql, viewer, r.id, "accepted", opts)).rejects.toBeInstanceOf(Forbidden);
    expect(await setOrderStatus(sql, host, r.id, "ready", opts)).toBe("invalid");
    expect(await setOrderStatus(sql, host, r.id, "accepted", opts)).toBe("ok");
    expect(await setOrderStatus(sql, host, r.id, "ready", opts)).toBe("ok");
    expect(texts.at(-1)).toEqual({ to: "+13055550177", body: `Santorini: order ${r.number} is ready for pickup.` });
    expect(await setOrderStatus(sql, host, r.id, "cancelled", opts)).toBe("invalid");
    expect(await setOrderStatus(sql, stranger, r.id, "completed", opts)).toBe("not_found");
    expect(await setOrderStatus(sql, host, r.id, "completed", opts)).toBe("ok");
    const [m] = await sql<{ n: number }[]>`select count(*)::int as n from guest_messages where org_id = ${orgId} and kind = 'transactional'`;
    expect(m.n).toBe(1);
  });

  it("a paid order reaches the kitchen only when Stripe says it's paid", async () => {
    const r = await placeOrder(sql, { ...base(), payOnline: true, phone: "305-555-0166" });
    if (!r.ok) throw new Error("expected order");
    const [p] = await sql<{ id: string }[]>`
      insert into payments (org_id, order_id, kind, amount_cents, provider) values (${orgId}, ${r.id}, 'order', ${r.totalCents}, 'stripe') returning id`;
    expect((await ordersBoard(sql, host, NOW)).some((o) => o.id === r.id)).toBe(false);
    const ev = { id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_1", payment_intent: "pi_1", metadata: { payment_id: p.id } } } };
    expect(await applyStripeEvent(sql, ev)).toBe(true);
    expect(await applyStripeEvent(sql, ev)).toBe(false); // replay
    expect((await ordersBoard(sql, host, NOW)).find((o) => o.id === r.id)).toMatchObject({ status: "placed", payment: "paid" });
  });

  it("an abandoned payment closes the order; sold-out and pause are floor controls", async () => {
    const r = await placeOrder(sql, { ...base(), payOnline: true, phone: "305-555-0155" });
    if (!r.ok) throw new Error("expected order");
    const [p] = await sql<{ id: string }[]>`
      insert into payments (org_id, order_id, kind, amount_cents, provider) values (${orgId}, ${r.id}, 'order', ${r.totalCents}, 'stripe') returning id`;
    await applyStripeEvent(sql, { id: "evt_2", type: "checkout.session.expired", data: { object: { id: "cs_2", metadata: { payment_id: p.id } } } });
    expect((await orderByToken(sql, r.token))!.status).toBe("cancelled");

    await setKitchenState(sql, host, { pausedUntil: null, soldOut: ["gyro"] });
    expect(await placeOrder(sql, base())).toMatchObject({ ok: false, error: expect.stringContaining("no longer available") });
    await expect(setKitchenState(sql, viewer, { pausedUntil: null, soldOut: [] })).rejects.toBeInstanceOf(Forbidden);
    expect((await ordersBoard(sql, stranger, NOW))).toEqual([]);
  });
});
