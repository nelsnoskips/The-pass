import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { randomBytes, randomUUID } from "node:crypto";
import { connectGoogle, hoursFromPeriods, pullReviews, pushHours, replyToReview } from "@/lib/integrations/google";
import { open, readState, seal, signState } from "@/lib/integrations/secrets";

process.env.INTEGRATIONS_KEY = randomBytes(32).toString("base64");
process.env.GOOGLE_CLIENT_ID = "client";
process.env.GOOGLE_CLIENT_SECRET = "secret";

describe("secrets", () => {
  it("seals and opens; the sealed form doesn't contain the secret", () => {
    const s = seal("1//refresh-token");
    expect(s).not.toContain("refresh");
    expect(open(s)).toBe("1//refresh-token");
    expect(seal("x")).not.toBe(seal("x"));
  });
  it("rejects a tampered secret", () => {
    const parts = seal("abc").split(".");
    parts[3] = Buffer.from("zzz").toString("base64url");
    expect(() => open(parts.join("."))).toThrow();
  });
  it("signs OAuth state, and refuses tampering and old state", () => {
    const now = Date.now();
    const st = signState({ org: "santorini", provider: "google_business" }, now);
    expect(readState(st, now + 1000)).toEqual({ org: "santorini", provider: "google_business" });
    const [body, mac] = st.split(".");
    const forged = Buffer.from(JSON.stringify({ org: "someone-else", provider: "google_business", t: now })).toString("base64url");
    expect(readState(`${forged}.${mac}`, now)).toBeNull();
    expect(readState(`${body}.${mac}`, now + 16 * 60_000)).toBeNull();
  });
});

describe("hoursFromPeriods", () => {
  it("opens at first seating and closes 90 minutes after the last, crossing midnight", () => {
    expect(hoursFromPeriods([{ daysOfWeek: [5], firstSeating: "17:00", lastSeating: "21:30" }])).toEqual([
      { openDay: "FRIDAY", openTime: { hours: 17, minutes: 0 }, closeDay: "FRIDAY", closeTime: { hours: 23, minutes: 0 } },
    ]);
    expect(hoursFromPeriods([{ daysOfWeek: [6], firstSeating: "18:00", lastSeating: "23:00" }])[0]).toMatchObject({
      closeDay: "SUNDAY", closeTime: { hours: 0, minutes: 30 },
    });
  });
  it("lists split service (brunch and dinner) as two openings, in order", () => {
    const h = hoursFromPeriods([
      { daysOfWeek: [0], firstSeating: "17:00", lastSeating: "21:00" },
      { daysOfWeek: [0], firstSeating: "11:00", lastSeating: "14:00" },
    ]);
    expect(h.map((p) => `${p.openDay} ${p.openTime.hours}`)).toEqual(["SUNDAY 11", "SUNDAY 17"]);
  });
});

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("Google Business Profile against Postgres", () => {
  const sql = postgres(url ?? "postgres://unused", { prepare: false, max: 3, onnotice: () => {} });
  let orgId = "", venueId = "";
  const calls: { url: string; method: string; body: string }[] = [];
  const google = (async (input: string | URL | Request, init?: RequestInit) => {
    const u = String(input);
    calls.push({ url: u, method: init?.method ?? "GET", body: init?.body ? String(init.body) : "" });
    const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 });
    if (u.includes("oauth2.googleapis.com/token")) {
      return ok(String(init?.body).includes("authorization_code")
        ? { access_token: "at-1", refresh_token: "rt-secret" } : { access_token: "at-2" });
    }
    if (u.endsWith("/v1/accounts")) return ok({ accounts: [{ name: "accounts/111" }] });
    if (u.includes("/locations?readMask")) return ok({ locations: [{ name: "locations/222", title: "Santorini Las Olas" }] });
    if (u.includes("updateMask=regularHours")) return ok({});
    if (u.includes("/reviews?")) return ok({ reviews: [
      { reviewId: "r1", reviewer: { displayName: "Maria K." }, starRating: "FIVE", comment: "The saganaki!", createTime: "2026-11-01T20:00:00Z" },
      { reviewId: "r2", reviewer: { displayName: "Sam" }, starRating: "THREE", comment: "Slow on a Friday.", createTime: "2026-11-05T21:00:00Z",
        reviewReply: { comment: "Sorry, Sam.", updateTime: "2026-11-06T10:00:00Z" } },
    ] });
    if (u.endsWith("/reply")) return ok({});
    return new Response("{}", { status: 404 });
  }) as typeof fetch;

  beforeAll(async () => {
    const [o] = await sql<{ id: string }[]>`insert into orgs (name, slug) values ('G', ${`g-${randomUUID().slice(0, 8)}`}) returning id`;
    orgId = o.id;
    const [v] = await sql<{ id: string }[]>`insert into venues (org_id, name, slug) values (${orgId}, 'Main', 'main') returning id`;
    venueId = v.id;
    await sql`insert into service_periods (org_id, venue_id, name, days_of_week, first_seating, last_seating)
              values (${orgId}, ${venueId}, 'Dinner', '{2,3,4,5,6}', '17:00', '21:30')`;
  });
  afterAll(async () => { await sql`delete from orgs where id = ${orgId}`; await sql.end(); });

  it("connects: stores the location and only a sealed refresh token", async () => {
    expect(await connectGoogle(sql, orgId, "code-1", "https://pass.example/cb", "owner@g", google)).toBe("Santorini Las Olas");
    const [row] = await sql<{ status: string; secret: string; settings: { location: string } }[]>`
      select status, secret, settings from org_integrations where org_id = ${orgId} and provider = 'google_business'`;
    expect(row.status).toBe("connected");
    expect(row.secret).not.toContain("rt-secret");
    expect(open(row.secret)).toBe("rt-secret");
    expect(row.settings.location).toBe("locations/222");
  });

  it("pushes hours built from the service periods, with a fresh access token", async () => {
    calls.length = 0;
    expect(await pushHours(sql, orgId, venueId, google)).toBe(5);
    const patch = calls.find((c) => c.method === "PATCH")!;
    expect(patch.url).toContain("/v1/locations/222?updateMask=regularHours");
    expect(JSON.parse(patch.body).regularHours.periods[0]).toEqual({
      openDay: "TUESDAY", openTime: { hours: 17, minutes: 0 }, closeDay: "TUESDAY", closeTime: { hours: 23, minutes: 0 },
    });
    expect(calls[0].body).toContain("grant_type=refresh_token");
  });

  it("pulls reviews idempotently and posts a reply", async () => {
    expect(await pullReviews(sql, orgId, google)).toBe(2);
    await pullReviews(sql, orgId, google);
    const rows = await sql<{ id: string; external_id: string; rating: number; reply: string | null }[]>`
      select id, external_id, rating, reply from reviews where org_id = ${orgId} order by external_id`;
    expect(rows.map((r) => [r.external_id, r.rating, r.reply])).toEqual([["r1", 5, null], ["r2", 3, "Sorry, Sam."]]);
    await replyToReview(sql, orgId, rows[0].id, "Thank you, Maria!", "owner@g", google);
    const put = calls.at(-1)!;
    expect(put.method).toBe("PUT");
    expect(put.url).toContain("/v4/accounts/111/locations/222/reviews/r1/reply");
    const [after] = await sql<{ reply: string }[]>`select reply from reviews where id = ${rows[0].id}`;
    expect(after.reply).toBe("Thank you, Maria!");
  });

  it("refuses to act for a restaurant that hasn't connected", async () => {
    await expect(pushHours(sql, randomUUID(), venueId, google)).rejects.toThrow("isn't connected");
  });
});
