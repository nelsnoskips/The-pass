import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomBytes, randomUUID } from "node:crypto";
import { connectGoogleAds, syncGoogleAds } from "@/lib/ads/google-ads";
import { connectMeta, syncMeta } from "@/lib/ads/meta";
import { adReport, derive } from "@/lib/ads/report";
import { windowDates } from "@/lib/ads/store";
import { open } from "@/lib/integrations/secrets";
import type { Tenant } from "@/lib/platform/tenant";

process.env.INTEGRATIONS_KEY ??= randomBytes(32).toString("base64");
process.env.GOOGLE_CLIENT_ID = "c";
process.env.GOOGLE_CLIENT_SECRET = "s";
process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "dev-token";
process.env.META_APP_ID = "app";
process.env.META_APP_SECRET = "secret";

const NOW = new Date("2026-11-11T12:00:00Z");

describe("report math", () => {
  it("never invents a ratio from nothing", () => {
    expect(derive({ spendCents: 0, impressions: 0, clicks: 0, conversions: 0, conversionValueCents: 0 }))
      .toEqual({ ctr: null, cpcCents: null, costPerResultCents: null, roas: null });
    expect(derive({ spendCents: 10000, impressions: 2000, clicks: 50, conversions: 8, conversionValueCents: 40000 }))
      .toEqual({ ctr: 2.5, cpcCents: 200, costPerResultCents: 1250, roas: 4 });
  });
  it("windows end yesterday", () => {
    // 30 days, inclusive, ending yesterday.
    expect(windowDates(30, NOW)).toEqual({ since: "2026-10-12", until: "2026-11-10" });
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("Google Ads and Meta reporting against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  let orgId = "", venueId = "";
  let owner: Tenant, stranger: Tenant;
  const seen: { url: string; headers: Headers; body: string }[] = [];
  let googleCost = "12500000"; // $12.50 in micros

  const google = (async (input: string | URL | Request, init?: RequestInit) => {
    const u = String(input);
    seen.push({ url: u, headers: new Headers(init?.headers), body: init?.body ? String(init.body) : "" });
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 });
    if (u.includes("oauth2.googleapis.com/token")) {
      return ok(String(init?.body).includes("authorization_code") ? { access_token: "at", refresh_token: "g-refresh" } : { access_token: "at2" });
    }
    if (u.endsWith("customers:listAccessibleCustomers")) return ok({ resourceNames: ["customers/111", "customers/222"] });
    if (u.includes("/customers/111/googleAds:searchStream") && String(init?.body).includes("FROM customer")) {
      return ok([{ results: [{ customer: { id: "111", descriptiveName: "Agency MCC", manager: true } }] }]);
    }
    if (u.includes("/customers/222/googleAds:searchStream") && String(init?.body).includes("FROM customer")) {
      return ok([{ results: [{ customer: { id: "222", descriptiveName: "Santorini Ads", manager: false } }] }]);
    }
    if (u.includes("/customers/222/googleAds:searchStream") && String(init?.body).includes("FROM search_term_view")) {
      return ok([{ results: [
        { searchTermView: { searchTerm: "Greek Restaurant Jobs" }, campaign: { id: "9001" }, adGroup: { id: "77" },
          metrics: { costMicros: "4200000", impressions: "90", clicks: "6", conversions: 0 } },
      ] }]);
    }
    if (u.includes("/customers/222/googleAds:searchStream")) {
      return ok([{ results: [
        { campaign: { id: "9001", name: "Search | Las Olas", status: "ENABLED", advertisingChannelType: "SEARCH" }, segments: { date: "2026-11-09" },
          campaignBudget: { resourceName: "customers/222/campaignBudgets/5", amountMicros: "25000000", explicitlyShared: false },
          metrics: { costMicros: googleCost, impressions: "1000", clicks: "40", conversions: 5, conversionsValue: 250 } },
        { campaign: { id: "9001", name: "Search | Las Olas", status: "ENABLED", advertisingChannelType: "SEARCH" }, segments: { date: "2026-11-10" },
          metrics: { costMicros: "7500000", impressions: "800", clicks: "30", conversions: 3, conversionsValue: 0 } },
      ] }]);
    }
    return new Response("{}", { status: 404 });
  }) as typeof fetch;

  const meta = (async (input: string | URL | Request) => {
    const u = String(input);
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 });
    if (u.includes("/oauth/access_token") && u.includes("fb_exchange_token=")) return ok({ access_token: "long-lived" });
    if (u.includes("/oauth/access_token")) return ok({ access_token: "short" });
    if (u.includes("/me/adaccounts")) return ok({ data: [{ account_id: "555", name: "Santorini Meta" }] });
    if (u.includes("/act_555/insights") && !u.includes("after=")) {
      return ok({
        data: [{ campaign_id: "m1", campaign_name: "Reservations | IG", date_start: "2026-11-10", spend: "20.40", impressions: "3000", clicks: "60", reach: "2400",
          actions: [{ action_type: "schedule", value: "4" }, { action_type: "post_engagement", value: "90" }, { action_type: "offsite_conversion.custom.123", value: "1" }],
          action_values: [{ action_type: "offsite_conversion.fb_pixel_purchase", value: "80.00" }] }],
        paging: { next: "https://graph.facebook.com/v23.0/act_555/insights?after=page2" },
      });
    }
    if (u.includes("after=page2")) {
      return ok({ data: [{ campaign_id: "m1", campaign_name: "Reservations | IG", date_start: "2026-11-09", spend: "10", impressions: "1000", clicks: "20", reach: "900", actions: [] }] });
    }
    return new Response("{}", { status: 404 });
  }) as typeof fetch;

  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('Ads', ${`ads-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug, timezone) values (${orgId}, 'Main', 'main', 'America/New_York') returning id`;
    venueId = v.id;
    owner = { orgId, actor: "owner@ads", role: "owner", venueIds: null };
    stranger = { orgId: randomUUID(), actor: "x", role: "owner", venueIds: null };
  });
  afterAll(async () => { await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  it("Google: connects to the account that runs campaigns, not the manager, and seals the token", async () => {
    expect(await connectGoogleAds(sql, orgId, "code", "https://p.example/cb", "owner@ads", google)).toBe("Santorini Ads");
    const [row] = await sql<{ secret: string; settings: { customerId: string } }[]>`
      select secret, settings from org_integrations where org_id = ${orgId} and provider = 'google_ads'`;
    expect(row.settings.customerId).toBe("222");
    expect(open(row.secret)).toBe("g-refresh");
    expect(seen.find((s) => s.url.includes("searchStream"))!.headers.get("developer-token")).toBe("dev-token");
  });

  it("Google: syncs micros to cents, and a re-sync replaces rather than adds", async () => {
    expect(await syncGoogleAds(sql, orgId, 30, google, NOW)).toEqual({ ok: true, rows: 2 });
    const q = seen.filter((s) => s.body.includes("FROM campaign")).at(-1)!;
    expect(q.body).toContain("BETWEEN '2026-10-12' AND '2026-11-10'");
    googleCost = "15000000"; // the platform revised the day
    await syncGoogleAds(sql, orgId, 30, google, NOW);
    const rows = await sql<{ date: string; spend_cents: string }[]>`
      select to_char(date, 'YYYY-MM-DD') as date, spend_cents from ad_daily where org_id = ${orgId} and platform = 'google' order by date`;
    expect(rows.map((r) => [r.date, Number(r.spend_cents)])).toEqual([["2026-11-09", 1500], ["2026-11-10", 750]]);
    const [c] = await sql<{ daily_budget_cents: string; budget_ref: string }[]>`
      select daily_budget_cents, budget_ref from ad_campaigns where org_id = ${orgId} and campaign_id = '9001'`;
    expect([Number(c.daily_budget_cents), c.budget_ref]).toEqual([2500, "customers/222/campaignBudgets/5"]);
    const terms = await sql<{ term: string; spend_cents: string }[]>`select term, spend_cents from ad_search_terms where org_id = ${orgId}`;
    expect(terms.map((t) => [t.term, Number(t.spend_cents)])).toEqual([["greek restaurant jobs", 420]]);
  });

  it("Meta: long-lived token, every page of insights, and only real results counted", async () => {
    expect(await connectMeta(sql, orgId, "code", "https://p.example/cb", "owner@ads", meta)).toBe("Santorini Meta");
    expect(await syncMeta(sql, orgId, 30, meta, NOW)).toEqual({ ok: true, rows: 2 });
    const rows = await sql<{ date: string; spend_cents: string; conversions: string; conversion_value_cents: string; reach: string }[]>`
      select to_char(date, 'YYYY-MM-DD') as date, spend_cents, conversions, conversion_value_cents, reach
      from ad_daily where org_id = ${orgId} and platform = 'meta' order by date`;
    expect(rows.map((r) => [r.date, Number(r.spend_cents), Number(r.conversions), Number(r.conversion_value_cents), Number(r.reach)]))
      .toEqual([["2026-11-09", 1000, 0, 0, 900], ["2026-11-10", 2040, 5, 8000, 2400]]);
  });

  it("a failed sync is recorded and flagged, not thrown", async () => {
    const broken = (async () => new Response(JSON.stringify({ error: { message: "Token expired" } }), { status: 400 })) as typeof fetch;
    const r = await syncMeta(sql, orgId, 30, broken, NOW);
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("Token expired") });
    const [i] = await sql<{ error: string }[]>`select error from org_integrations where org_id = ${orgId} and provider = 'meta_ads'`;
    expect(i.error).toContain("Token expired");
  });

  it("reports both platforms beside bookings, and nothing to another restaurant", async () => {
    const [g] = await sql<{ id: string }[]>`insert into guests (org_id, phone, name) values (${orgId}, '+13055550123', 'B') returning id`;
    await sql`insert into reservations (org_id, venue_id, guest_id, party_size, starts_at, ends_at, status, source, manage_token)
              values (${orgId}, ${venueId}, ${g.id}, 4, '2026-11-10 19:00-05', '2026-11-10 21:00-05', 'completed', 'website', ${randomUUID()})`;
    const r = await adReport(sql, owner, "2026-11-01", "2026-11-10");
    expect(r.total.spendCents).toBe(1500 + 750 + 1000 + 2040);
    expect(r.platforms.google?.conversions).toBe(8);
    expect(r.campaigns.map((c) => c.name)).toEqual(["Reservations | IG", "Search | Las Olas"]);
    expect(r.bookingsTotal).toBe(1);
    expect(r.coversTotal).toBe(4);
    expect(r.bookingsBySource).toEqual({ website: 1 });
    expect((await adReport(sql, stranger, "2026-11-01", "2026-11-10")).total.spendCents).toBe(0);
  });
});
