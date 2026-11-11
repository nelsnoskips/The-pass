import type { Sql } from "postgres";
import { log } from "../reservations/repo";
import { open, seal } from "./secrets";

/**
 * Google Business Profile: OAuth, hours out, reviews in, replies out.
 *
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET — an OAuth client with the
 *   Business Profile APIs enabled. Redirect URI:
 *   <site>/api/integrations/google/callback
 *
 * Every call takes a fetch so the whole thing is testable without
 * Google, and every token lives sealed in org_integrations.secret.
 */

type Fetch = typeof fetch;
const SCOPE = "https://www.googleapis.com/auth/business.manage";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ACCOUNTS = "https://mybusinessaccountmanagement.googleapis.com/v1";
const INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";
const REVIEWS = "https://mybusiness.googleapis.com/v4";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function googleAuthorizeUrl(redirectUri: string, state: string): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPE);
  // offline + consent: Google only returns a refresh token this way.
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("state", state);
  return u.toString();
}

async function json<T>(res: Response, what: string): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } | string };
  if (!res.ok) {
    const msg = typeof body.error === "string" ? body.error : body.error?.message;
    throw new Error(`Google ${what}: ${msg ?? res.status}`);
  }
  return body;
}

async function token(f: Fetch, fields: Record<string, string>) {
  const res = await f(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      ...fields,
    }),
  });
  return json<{ access_token: string; refresh_token?: string }>(res, "token");
}

interface GbpSettings { account: string; location: string; title: string }

/**
 * Finish the OAuth round trip: trade the code for tokens, find the
 * restaurant's location, and store both. With several locations the
 * first is taken and named, so the studio can correct it.
 */
export async function connectGoogle(sql: Sql, orgId: string, code: string, redirectUri: string, actor: string, f: Fetch = fetch): Promise<string> {
  const t = await token(f, { grant_type: "authorization_code", code, redirect_uri: redirectUri });
  if (!t.refresh_token) throw new Error("Google didn't return a refresh token. Remove The Pass from your Google account's connected apps and connect again.");
  const auth = { Authorization: `Bearer ${t.access_token}` };
  const { accounts = [] } = await json<{ accounts?: { name: string }[] }>(await f(`${ACCOUNTS}/accounts`, { headers: auth }), "accounts");
  if (!accounts[0]) throw new Error("This Google account doesn't manage any business profiles.");
  const { locations = [] } = await json<{ locations?: { name: string; title: string }[] }>(
    await f(`${INFO}/${accounts[0].name}/locations?readMask=name,title`, { headers: auth }), "locations");
  if (!locations[0]) throw new Error("No locations found on this Google Business account.");
  const settings: GbpSettings = { account: accounts[0].name, location: locations[0].name, title: locations[0].title };
  await sql`
    insert into org_integrations (org_id, provider, status, account_label, settings, secret, updated_by)
    values (${orgId}, 'google_business', 'connected', ${settings.title}, ${sql.json(settings as never)}, ${seal(t.refresh_token)}, ${actor})
    on conflict (org_id, provider) do update set status = 'connected', account_label = excluded.account_label,
      settings = excluded.settings, secret = excluded.secret, updated_by = excluded.updated_by, updated_at = now(), error = null`;
  await log(sql, orgId, actor, "integration.connected", "integration", "google_business", { location: settings.title });
  return settings.title;
}

async function session(sql: Sql, orgId: string, f: Fetch): Promise<{ auth: Record<string, string>; s: GbpSettings }> {
  const [row] = await sql<{ secret: string | null; settings: GbpSettings; status: string }[]>`
    select secret, settings, status from org_integrations where org_id = ${orgId} and provider = 'google_business'`;
  if (!row || row.status !== "connected" || !row.secret) throw new Error("Google Business Profile isn't connected.");
  const t = await token(f, { grant_type: "refresh_token", refresh_token: open(row.secret) });
  return { auth: { Authorization: `Bearer ${t.access_token}` }, s: row.settings };
}

const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export interface GooglePeriod {
  openDay: string; openTime: { hours: number; minutes: number };
  closeDay: string; closeTime: { hours: number; minutes: number };
}

/**
 * Opening hours as Google wants them, from the service periods guests
 * book against: open at first seating, close a kitchen's length after
 * the last. One source of truth — change the hours in Settings and
 * Google follows.
 */
export function hoursFromPeriods(
  periods: { daysOfWeek: number[]; firstSeating: string; lastSeating: string }[],
  closeAfterLastSeating = 90,
): GooglePeriod[] {
  const out: GooglePeriod[] = [];
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  for (const p of periods) {
    for (const day of [...p.daysOfWeek].sort()) {
      const open = toMin(p.firstSeating);
      const close = toMin(p.lastSeating) + closeAfterLastSeating;
      const closeDay = close >= 1440 ? (day + 1) % 7 : day;
      const c = close % 1440;
      out.push({
        openDay: DAYS[day], openTime: { hours: Math.floor(open / 60), minutes: open % 60 },
        closeDay: DAYS[closeDay], closeTime: { hours: Math.floor(c / 60), minutes: c % 60 },
      });
    }
  }
  return out.sort((a, b) => DAYS.indexOf(a.openDay) - DAYS.indexOf(b.openDay) || a.openTime.hours * 60 + a.openTime.minutes - (b.openTime.hours * 60 + b.openTime.minutes));
}

export async function pushHours(sql: Sql, orgId: string, venueId: string, f: Fetch = fetch): Promise<number> {
  const { auth, s } = await session(sql, orgId, f);
  const rows = await sql<{ days_of_week: number[]; first_seating: string; last_seating: string }[]>`
    select days_of_week, first_seating, last_seating from service_periods where venue_id = ${venueId} and org_id = ${orgId}`;
  const periods = hoursFromPeriods(rows.map((r) => ({ daysOfWeek: r.days_of_week.map(Number), firstSeating: r.first_seating, lastSeating: r.last_seating })));
  await json(await f(`${INFO}/${s.location}?updateMask=regularHours`, {
    method: "PATCH",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ regularHours: { periods } }),
  }), "update hours");
  await log(sql, orgId, "sync:google_business", "google.hours_pushed", "integration", "google_business", { periods: periods.length });
  return periods.length;
}

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export async function pullReviews(sql: Sql, orgId: string, f: Fetch = fetch): Promise<number> {
  const { auth, s } = await session(sql, orgId, f);
  const locId = s.location.split("/").pop();
  const res = await f(`${REVIEWS}/${s.account}/locations/${locId}/reviews?pageSize=50`, { headers: auth });
  const { reviews = [] } = await json<{ reviews?: {
    reviewId: string; reviewer?: { displayName?: string }; starRating?: string; comment?: string;
    createTime?: string; reviewReply?: { comment?: string; updateTime?: string };
  }[] }>(res, "reviews");
  for (const r of reviews) {
    await sql`
      insert into reviews (org_id, source, external_id, author, rating, body, reviewed_at, reply, replied_at)
      values (${orgId}, 'google', ${r.reviewId}, ${r.reviewer?.displayName ?? null}, ${STARS[r.starRating ?? ""] ?? null},
              ${r.comment ?? null}, ${r.createTime ?? null}, ${r.reviewReply?.comment ?? null}, ${r.reviewReply?.updateTime ?? null})
      on conflict (org_id, source, external_id) do update set
        body = excluded.body, rating = excluded.rating,
        reply = coalesce(excluded.reply, reviews.reply), replied_at = coalesce(excluded.replied_at, reviews.replied_at)`;
  }
  return reviews.length;
}

export async function replyToReview(sql: Sql, orgId: string, reviewId: string, comment: string, actor: string, f: Fetch = fetch): Promise<void> {
  const [r] = await sql<{ external_id: string }[]>`
    select external_id from reviews where id = ${reviewId} and org_id = ${orgId} and source = 'google'`;
  if (!r) throw new Error("Review not found.");
  const { auth, s } = await session(sql, orgId, f);
  const locId = s.location.split("/").pop();
  await json(await f(`${REVIEWS}/${s.account}/locations/${locId}/reviews/${r.external_id}/reply`, {
    method: "PUT",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  }), "reply");
  await sql`update reviews set reply = ${comment}, replied_at = now() where id = ${reviewId} and org_id = ${orgId}`;
  await log(sql, orgId, actor, "review.replied", "review", reviewId);
}
