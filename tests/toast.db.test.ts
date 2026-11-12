import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { randomBytes, randomUUID } from "node:crypto";
import {
  clearToastTokens, connectToast, connectToastAs, disconnectToast, importToastMenu, itemIdFor, mapToastMenus,
  syncToast, syncToastAs, toastStatus, ToastError,
} from "@/lib/integrations/toast";
import { open } from "@/lib/integrations/secrets";
import { saveProgram } from "@/lib/guests/loyalty";
import { leverHistory } from "@/lib/levers";
import { getOrderingSettings, setKitchenState } from "@/lib/ordering";
import { parseSiteContent, type SiteContent } from "@/lib/sites/content";
import { getVersion, publishVersion, saveVersion, siteForOrg } from "@/lib/sites/repo";
import { Forbidden, type Tenant } from "@/lib/platform/tenant";

process.env.INTEGRATIONS_KEY ??= randomBytes(32).toString("base64");
delete process.env.TOAST_API_HOST;

const G = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const LOC = "6f1a7c2e-3b4d-4e5f-8a9b-0c1d2e3f4a5b";
const LOC_B = "7f1a7c2e-3b4d-4e5f-8a9b-0c1d2e3f4a5b";
const SECRET = "s3cr3t-value-never-shown";

describe("mapToastMenus", () => {
  it("maps menus, groups (nested too) and items with prices in cents and Toast ids", () => {
    const r = mapToastMenus([
      { guid: G(1), name: "Dinner", menuGroups: [
        { guid: G(2), name: "Mains", menuItems: [
          { guid: G(3), name: "Lamb chops", description: "Grilled", price: 32.5 },
          { guid: G(4), name: "Market fish", price: null },
          { guid: G(5), name: "  " },
        ], menuGroups: [{ guid: G(6), name: "Sides", menuItems: [{ guid: G(7), name: "Fries", price: 6 }] }] },
      ] },
      { guid: G(8), name: "Lunch", menuGroups: [{ guid: G(9), name: "Plates", menuItems: [{ guid: G(3), name: "Lamb chops", price: 28 }] }] },
    ]);
    expect(r.items).toBe(4);
    expect(r.skipped).toBe(1);
    expect(r.menus[0].sections.map((s) => s.name)).toEqual(["Mains", "Sides"]);
    expect(r.menus[0].sections[0].items[0]).toEqual({ id: itemIdFor(G(3)), name: "Lamb chops", description: "Grilled", priceCents: 3250, tags: [] });
    expect(r.menus[0].sections[0].items[1].priceCents).toBeNull();
    // The same dish on a second menu gets its own id, still traceable to the guid.
    expect(r.menus[1].sections[0].items[0].id).toBe(`${itemIdFor(G(3))}-2`);
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("Toast against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  let orgId = "", orgB = "", siteId = "", publishedId = "";
  let owner: Tenant, host: Tenant, ownerB: Tenant;
  const guests: Record<string, string> = {};
  const NOW = new Date("2026-11-11T12:00:00Z");

  // The Toast API, as documented, in memory.
  const api = {
    logins: 0, expiresIn: 3600, revoked: new Set<string>(), down: false,
    calls: [] as { url: string; headers: Headers; body: string }[],
    orders: [] as unknown[],
    menus: [] as unknown[],
    stock: [] as { guid: string; status: string; quantity: number | null }[],
  };
  let n = 0;
  const toast = (async (input: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(input));
    const headers = new Headers(init?.headers);
    api.calls.push({ url: u.toString(), headers, body: init?.body ? String(init.body) : "" });
    const json = (j: unknown, status = 200, h: Record<string, string> = {}) => new Response(JSON.stringify(j), { status, headers: h });
    expect(u.origin).toBe("https://ws-api.toasttab.com");
    if (u.pathname === "/authentication/v1/authentication/login") {
      const b = JSON.parse(String(init?.body));
      expect(b.userAccessType).toBe("TOAST_MACHINE_CLIENT");
      if (b.clientSecret !== SECRET) return json({ status: "ERROR", message: "Access denied" }, 401);
      api.logins++;
      return json({ "@class": ".SuccessfulResponse", status: "SUCCESS", token: { tokenType: "Bearer", accessToken: `tok-${++n}`, expiresIn: api.expiresIn } });
    }
    const token = headers.get("authorization")?.replace("Bearer ", "") ?? "";
    if (!token.startsWith("tok-") || api.revoked.has(token)) return json({ message: "expired" }, 401);
    const loc = headers.get("toast-restaurant-external-id");
    if (loc !== LOC && loc !== LOC_B) return json({ message: "no access" }, 403);
    if (u.pathname.startsWith("/restaurants/v1/restaurants/")) {
      if (u.pathname.endsWith(loc!)) return json({ guid: loc, general: { name: "Santorini", locationName: "Las Olas", timeZone: "America/New_York" } });
      return json({}, 403);
    }
    if (u.pathname === "/orders/v2/ordersBulk") {
      if (api.down) return json({ message: "boom" }, 500);
      const size = Number(u.searchParams.get("pageSize")), page = Number(u.searchParams.get("page"));
      const list = loc === LOC ? api.orders : [];
      const slice = list.slice((page - 1) * size, page * size);
      const more = page * size < list.length;
      return json(slice, 200, { Link: `<${u.origin}${u.pathname}?page=${page}>; rel="self"${more ? `, <${u.origin}${u.pathname}?page=${page + 1}>; rel="next"` : ""}` });
    }
    if (u.pathname === "/menus/v2/menus") return json({ restaurantGuid: loc, restaurantTimeZone: "America/New_York", menus: api.menus });
    if (u.pathname === "/stock/v1/inventory") {
      expect(u.searchParams.get("status")).toBe("OUT_OF_STOCK");
      return json(api.stock);
    }
    return json({}, 404);
  }) as typeof fetch;

  const check = (guid: string, o: Record<string, unknown> = {}) => ({
    guid, voided: false, deleted: false, paymentStatus: "CLOSED", closedDate: "2026-11-10T01:30:00.000+0000",
    amount: 40, totalAmount: 48.37, ...o,
  });
  const order = (guid: string, checks: unknown[], o: Record<string, unknown> = {}) => ({ guid, voided: false, deleted: false, numberOfGuests: 2, checks, ...o });

  const content: SiteContent = {
    brand: { name: "Santorini", tagline: "", cuisine: "Greek", priceRange: "$$" },
    theme: { paper: "#ffffff", ink: "#000000", accent: "#0000ff" },
    hero: { headline: "Greek, by the water", sub: "", image: null }, story: { heading: "", body: "" },
    menus: [{ id: "drinks", name: "Drinks", sections: [{ id: "wine", name: "Wine", note: "", items: [
      { id: "retsina", name: "Retsina", description: "", priceCents: 1200, tags: [] },
    ] }] }],
    hours: [], contact: { address: "", phone: "", email: "", mapUrl: "" }, announcement: "", social: { instagram: "" },
  };

  beforeAll(async () => {
    clearToastTokens();
    const slug = `toast-${randomUUID().slice(0, 8)}`;
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Toast', ${slug}) returning id`;
    orgId = o.id;
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug, timezone) values (${orgId}, 'Main', 'main', 'America/New_York') returning id`;
    const [s] = await sql<{ id: string }[]>`insert into sites (org_id, venue_id, slug) values (${orgId}, ${v.id}, ${slug}) returning id`;
    siteId = s.id;
    owner = { orgId, actor: "owner@toast", role: "owner", venueIds: null };
    host = { orgId, actor: "host@toast", role: "host", venueIds: null };
    const saved = await saveVersion(sql, owner, siteId, content, "first");
    if (!saved.ok) throw new Error(saved.errors.join());
    publishedId = saved.versionId;
    await publishVersion(sql, owner, siteId, publishedId);
    for (const [k, phone, email] of [["ana", "+19545550101", "ana@example.com"], ["ben", "+19545550102", "ben@example.com"]]) {
      const [g] = await sql<{ id: string }[]>`insert into guests (org_id, phone, name, email) values (${orgId}, ${phone}, ${k}, ${email}) returning id`;
      guests[k] = g.id;
    }
    expect(await saveProgram(sql, owner, { active: true, visitsRequired: 2, reward: "A dessert on us" })).toBeNull();

    const [b] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Other', ${`toastb-${randomUUID().slice(0, 8)}`}) returning id`;
    orgB = b.id;
    ownerB = { orgId: orgB, actor: "owner@other", role: "owner", venueIds: null };
  });
  afterAll(async () => { await sql`delete from orgs where id in (${orgId}, ${orgB})`; await sql.end(); });

  it("bad credentials surface a plain error and store nothing", async () => {
    const err = await connectToast(sql, orgId, { clientId: "cid", clientSecret: "wrong", restaurantGuid: LOC }, "owner@toast", toast, NOW).catch((e) => e);
    expect(err).toBeInstanceOf(ToastError);
    expect(err.message).toMatch(/didn't accept that Client ID and secret/);
    expect(err.message).not.toContain("wrong");
    const malformed = await connectToast(sql, orgId, { clientId: "cid", clientSecret: SECRET, restaurantGuid: "not-a-guid" }, "owner@toast", toast, NOW).catch((e) => e);
    expect(malformed.field).toBe("restaurantGuid");
    const [row] = await sql`select 1 from org_integrations where org_id = ${orgId} and provider = 'toast'`;
    expect(row).toBeUndefined();
  });

  it("a host can't connect, sync or import", async () => {
    await expect(connectToastAs(sql, host, { clientId: "cid", clientSecret: SECRET, restaurantGuid: LOC }, toast)).rejects.toBeInstanceOf(Forbidden);
    await expect(syncToastAs(sql, host, toast)).rejects.toBeInstanceOf(Forbidden);
    await expect(importToastMenu(sql, host, toast)).rejects.toBeInstanceOf(Forbidden);
    await expect(disconnectToast(sql, host)).rejects.toBeInstanceOf(Forbidden);
  });

  it("connect validates against Toast, seals the credentials, and never writes them anywhere readable", async () => {
    const spies = [vi.spyOn(console, "log"), vi.spyOn(console, "error"), vi.spyOn(console, "warn")];
    expect(await connectToastAs(sql, owner, { clientId: " cid ", clientSecret: SECRET, restaurantGuid: LOC.toUpperCase() }, toast)).toBe("Santorini — Las Olas");
    const [row] = await sql<{ settings: Record<string, unknown>; secret: string; account_label: string }[]>`
      select settings, secret, account_label from org_integrations where org_id = ${orgId} and provider = 'toast'`;
    expect(row.settings).toEqual({ restaurantGuid: LOC, restaurantName: "Santorini — Las Olas", timezone: "America/New_York" });
    expect(row.secret).not.toContain(SECRET);
    expect(JSON.parse(open(row.secret))).toEqual({ clientId: "cid", clientSecret: SECRET });
    const logs = await sql<{ detail: unknown }[]>`select detail from change_log where org_id = ${orgId}`;
    expect(JSON.stringify(logs)).not.toContain(SECRET);
    for (const s of spies) { expect(JSON.stringify(s.mock.calls)).not.toContain(SECRET); s.mockRestore(); }
    // Restaurant reads carry the location header.
    expect(api.calls.at(-1)!.headers.get("toast-restaurant-external-id")).toBe(LOC);
  });

  it("a location connected to one restaurant can't be claimed by another", async () => {
    const err = await connectToastAs(sql, ownerB, { clientId: "cid", clientSecret: SECRET, restaurantGuid: LOC }, toast).catch((e) => e);
    expect(err.message).toMatch(/already connected to another restaurant/);
    // A cached token is never reused for the same client ID with another secret.
    const guess = await connectToastAs(sql, ownerB, { clientId: "cid", clientSecret: "guess", restaurantGuid: LOC_B }, toast).catch((e) => e);
    expect(guess.message).toMatch(/didn't accept/);
  });

  it("syncs closed checks across pages, matches guests by phone or email, skips voided, and is idempotent", async () => {
    const filler = Array.from({ length: 140 }, (_, i) => order(`f-${i}`, [check(`fc-${i}`, { customer: null })]));
    api.orders = [
      order("o1", [check("c-ana", { customer: { firstName: "Ana", phone: "(954) 555-0101", email: null } })]),
      order("o2", [check("c-ben", { customer: { firstName: "Ben", phone: "", email: "BEN@example.com" }, totalAmount: 20, closedDate: "2026-11-09T01:00:00.000Z" })]),
      order("o3", [check("c-void", { voided: true, customer: { phone: "9545550101" } })]),
      order("o4", [check("c-del-order", { customer: { phone: "9545550101" } })], { deleted: true }),
      order("o5", [check("c-open", { paymentStatus: "OPEN", closedDate: null, customer: { phone: "9545550101" } })]),
      order("o6", [check("c-stranger", { customer: { firstName: "New", phone: "3055559999", email: "new@example.com" } })]),
      ...filler,
    ];
    const r = await syncToast(sql, orgId, toast, NOW);
    expect(r).toEqual({ ok: true, rows: 143, matched: 2 });
    const pages = api.calls.filter((c) => c.url.includes("ordersBulk"));
    expect(pages.map((c) => new URL(c.url).searchParams.get("page"))).toEqual(["1", "2"]);
    const first = new URL(pages[0].url).searchParams;
    expect(first.get("pageSize")).toBe("100");
    expect(first.get("startDate")).toBe("2026-10-12T12:00:00.000Z"); // 30 days back on the first sync
    expect(first.get("endDate")).toBe(NOW.toISOString());

    const g = await sql<{ id: string; visit_count: number; total_spend_cents: string }[]>`
      select id, visit_count, total_spend_cents from guests where org_id = ${orgId} order by name`;
    expect(g.map((x) => [x.visit_count, Number(x.total_spend_cents)])).toEqual([[1, 4837], [1, 2000]]);
    // Checks with no customer are kept for sales totals, on no guest; no guest is invented.
    const [{ unmatched }] = await sql<{ unmatched: number }[]>`
      select count(*)::int as unmatched from guest_checks where org_id = ${orgId} and source = 'toast' and guest_id is null`;
    expect(unmatched).toBe(141);
    const [{ count }] = await sql<{ count: number }[]>`select count(*)::int from guests where org_id = ${orgId}`;
    expect(count).toBe(2);
    const skipped = await sql`select 1 from guest_checks where org_id = ${orgId} and external_id in ('c-void', 'c-del-order', 'c-open')`;
    expect(skipped).toHaveLength(0);

    // Again: nothing doubles, and the window starts just before the last one ended.
    api.calls.length = 0;
    const later = new Date(NOW.getTime() + 3_600_000);
    expect(await syncToast(sql, orgId, toast, later)).toEqual({ ok: true, rows: 0, matched: 0 });
    expect(new URL(api.calls.find((c) => c.url.includes("ordersBulk"))!.url).searchParams.get("startDate")).toBe("2026-11-11T11:45:00.000Z");
    const [ana] = await sql<{ visit_count: number; total_spend_cents: string }[]>`select visit_count, total_spend_cents from guests where id = ${guests.ana}`;
    expect([ana.visit_count, Number(ana.total_spend_cents)]).toEqual([1, 4837]);
  });

  it("a later visit earns loyalty, exactly like Square", async () => {
    api.orders = [order("o7", [check("c-ana-2", { closedDate: "2026-11-11T13:00:00.000Z", customer: { phone: "+1 954 555 0101" } })])];
    expect(await syncToast(sql, orgId, toast, new Date("2026-11-11T14:00:00Z"))).toMatchObject({ ok: true, rows: 1, matched: 1 });
    const rewards = await sql`select reward from loyalty_rewards where guest_id = ${guests.ana}`;
    expect(rewards).toHaveLength(1);
  });

  it("caches the token until it expires, and signs in again on a 401", async () => {
    clearToastTokens();
    await syncToast(sql, orgId, toast, new Date("2026-11-11T14:05:00Z"));
    const before = api.logins;
    await syncToast(sql, orgId, toast, new Date("2026-11-11T14:10:00Z"));
    expect(api.logins).toBe(before); // still cached
    await syncToast(sql, orgId, toast, new Date("2026-11-11T16:00:00Z")); // past expiresIn
    expect(api.logins).toBe(before + 1);
    // Toast revokes the token early: one retry with a fresh one.
    const current = api.calls.at(-1)!.headers.get("authorization")!.replace("Bearer ", "");
    api.revoked.add(current);
    expect(await syncToast(sql, orgId, toast, new Date("2026-11-11T16:05:00Z"))).toMatchObject({ ok: true });
    expect(api.logins).toBe(before + 2);
  });

  it("a failed sync is recorded and flagged on the connection, then cleared by the next good one", async () => {
    api.down = true;
    const r = await syncToast(sql, orgId, toast, new Date("2026-11-11T17:00:00Z"));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Toast orders failed \(500\)/);
    const st = await toastStatus(sql, owner);
    expect(st.error).toBe(r.error);
    expect(st.lastSync).toMatchObject({ ok: false, error: r.error });
    api.down = false;
    expect((await syncToast(sql, orgId, toast, new Date("2026-11-11T17:05:00Z"))).ok).toBe(true);
    expect((await toastStatus(sql, owner)).error).toBeNull();
  });

  it("imports the menu as a valid draft and doesn't publish it", async () => {
    api.menus = [
      { guid: G(1), name: "Dinner", menuGroups: [{ guid: G(2), name: "Mains", menuItems: [
        { guid: G(3), name: "Lamb chops", description: "Grilled", price: 32.5 },
        { guid: G(4), name: "Moussaka", price: 24 },
      ] }] },
    ];
    const r = await importToastMenu(sql, owner, toast);
    if (!r.ok) throw new Error(r.error);
    expect(r).toMatchObject({ menus: 1, items: 2, skipped: 0 });
    const draft = await getVersion(sql, owner, r.versionId);
    expect(parseSiteContent(draft).ok).toBe(true);
    expect(draft!.menus[0].sections[0].items.map((i) => [i.id, i.priceCents])).toEqual([[itemIdFor(G(3)), 3250], [itemIdFor(G(4)), 2400]]);
    expect(draft!.hero.headline).toBe("Greek, by the water"); // the rest of the site is kept
    expect((await siteForOrg(sql, owner))!.publishedVersionId).toBe(publishedId);
    const [logged] = await sql`select 1 from change_log where org_id = ${orgId} and action = 'toast.menu_imported'`;
    expect(logged).toBeTruthy();
  });

  it("mirrors Toast's 86 list through the sold-out lever, keeping a manager's own 86s", async () => {
    // The owner publishes the imported menu, and 86s the retsina here by hand... on the old menu.
    const r = await importToastMenu(sql, owner, toast);
    if (!r.ok) throw new Error(r.error);
    const draft = (await getVersion(sql, owner, r.versionId))!;
    draft.menus.push(content.menus[0]);
    const saved = await saveVersion(sql, owner, siteId, draft, "with drinks");
    if (!saved.ok) throw new Error(saved.errors.join());
    await publishVersion(sql, owner, siteId, saved.versionId);
    await setKitchenState(sql, owner, { pausedUntil: null, soldOut: ["retsina"] });

    api.orders = [];
    api.stock = [{ guid: G(3), status: "OUT_OF_STOCK", quantity: null }, { guid: G(99), status: "OUT_OF_STOCK", quantity: null }];
    expect((await syncToast(sql, orgId, toast, new Date("2026-11-11T18:00:00Z"))).ok).toBe(true);
    expect((await getOrderingSettings(sql, orgId)).soldOut.sort()).toEqual([itemIdFor(G(3)), "retsina"].sort());
    const h = await leverHistory(sql, owner, "ordering");
    expect(h[0]).toMatchObject({ key: "sold_out", via: "Toast", actor: "agent:toast-sync" });

    // Back in stock in Toast: Toast's 86 lifts; the manager's stays.
    api.stock = [];
    await syncToast(sql, orgId, toast, new Date("2026-11-11T19:00:00Z"));
    expect((await getOrderingSettings(sql, orgId)).soldOut).toEqual(["retsina"]);
  });

  it("keeps each restaurant's data to itself", async () => {
    const stB = await toastStatus(sql, ownerB);
    expect(stB).toMatchObject({ connected: false, restaurantName: null, lastSync: null });
    await expect(syncToast(sql, orgB, toast, NOW)).resolves.toMatchObject({ ok: false, error: "Toast isn't connected." });
    const [{ count }] = await sql<{ count: number }[]>`select count(*)::int from guest_checks where org_id = ${orgB}`;
    expect(count).toBe(0);
    // B connects its own location; A's checks never reach it.
    await connectToastAs(sql, ownerB, { clientId: "cid", clientSecret: SECRET, restaurantGuid: LOC_B }, toast);
    expect((await syncToast(sql, orgB, toast, NOW)).rows).toBe(0);
  });

  it("disconnect deletes the sealed credentials", async () => {
    await disconnectToast(sql, owner);
    const [row] = await sql<{ status: string; secret: string | null }[]>`select status, secret from org_integrations where org_id = ${orgId} and provider = 'toast'`;
    expect(row).toEqual({ status: "disconnected", secret: null });
    expect((await syncToast(sql, orgId, toast, NOW)).ok).toBe(false);
  });
});
