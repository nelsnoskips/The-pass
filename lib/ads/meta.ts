import type { Sql } from "postgres";
import { log } from "../reservations/repo";
import { open, seal } from "../integrations/secrets";
import { recordedSync, storeSync, windowDates, type AdCampaignRow, type AdDayRow } from "./store";

/**
 * Meta (Facebook and Instagram) ads, read-only: an owner signs in with
 * Facebook, we find their ad account, and every night re-read the last
 * 30 days of campaign insights.
 *
 *   META_APP_ID, META_APP_SECRET  (redirect URI:
 *     <site>/api/integrations/meta/callback; ads_read needs Advanced
 *     Access through App Review for accounts other than your own)
 *   META_API_VERSION  (optional, e.g. v23.0; Meta retires versions on a
 *     schedule, so it's set here rather than in code)
 *
 * Meta's long-lived user tokens last about 60 days. When one expires the
 * sync fails, the connection shows "needs attention", and the owner signs
 * in again.
 */

type Fetch = typeof fetch;
const ver = () => process.env.META_API_VERSION?.trim() || "v23.0";
const GRAPH = () => `https://graph.facebook.com/${ver()}`;

/**
 * Which Meta actions count as a result for a restaurant: bookings, leads,
 * purchases, and any custom conversion the restaurant set up. Page likes
 * and video views are deliberately not results.
 */
const RESULT_ACTIONS = new Set([
  "schedule", "onsite_web_schedule", "offsite_conversion.fb_pixel_schedule",
  "lead", "onsite_web_lead", "offsite_conversion.fb_pixel_lead",
  "purchase", "onsite_web_purchase", "offsite_conversion.fb_pixel_purchase",
  "onsite_conversion.messaging_conversation_started_7d",
]);
const isResult = (t: string) => RESULT_ACTIONS.has(t) || t.startsWith("offsite_conversion.custom.");

export function metaConfigured(): boolean {
  return Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim());
}

export function metaAuthorizeUrl(redirectUri: string, state: string): string {
  const u = new URL(`https://www.facebook.com/${ver()}/dialog/oauth`);
  u.searchParams.set("client_id", process.env.META_APP_ID ?? "");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("scope", "ads_read");
  u.searchParams.set("state", state);
  return u.toString();
}

async function json<T>(res: Response, what: string): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Meta ${what}: ${body.error?.message ?? res.status}`);
  return body;
}

export async function connectMeta(sql: Sql, orgId: string, code: string, redirectUri: string, actor: string, f: Fetch = fetch): Promise<string> {
  const app = { client_id: process.env.META_APP_ID ?? "", client_secret: process.env.META_APP_SECRET ?? "" };
  const short = await json<{ access_token: string }>(await f(`${GRAPH()}/oauth/access_token?${new URLSearchParams({ ...app, redirect_uri: redirectUri, code })}`), "token");
  const long = await json<{ access_token: string }>(await f(`${GRAPH()}/oauth/access_token?${new URLSearchParams({ ...app, grant_type: "fb_exchange_token", fb_exchange_token: short.access_token })}`), "long-lived token");
  const { data = [] } = await json<{ data?: { account_id: string; name: string }[] }>(
    await f(`${GRAPH()}/me/adaccounts?${new URLSearchParams({ fields: "account_id,name", access_token: long.access_token })}`), "ad accounts");
  if (!data[0]) throw new Error("This Facebook login doesn't have access to any ad accounts.");
  const acct = data[0];
  await sql`
    insert into org_integrations (org_id, provider, status, account_label, settings, secret, updated_by)
    values (${orgId}, 'meta_ads', 'connected', ${acct.name}, ${sql.json({ accountId: acct.account_id })}, ${seal(long.access_token)}, ${actor})
    on conflict (org_id, provider) do update set status = 'connected', account_label = excluded.account_label,
      settings = excluded.settings, secret = excluded.secret, updated_by = excluded.updated_by, updated_at = now(), error = null`;
  await log(sql, orgId, actor, "integration.connected", "integration", "meta_ads", { account: acct.name });
  return acct.name;
}

interface Insight {
  campaign_id: string; campaign_name: string; date_start: string;
  spend?: string; impressions?: string; clicks?: string; reach?: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

export async function syncMeta(sql: Sql, orgId: string, days = 30, f: Fetch = fetch, now = new Date()) {
  return recordedSync(sql, orgId, "meta", async () => {
    const [row] = await sql<{ secret: string | null; settings: { accountId: string }; status: string }[]>`
      select secret, settings, status from org_integrations where org_id = ${orgId} and provider = 'meta_ads'`;
    if (!row || row.status !== "connected" || !row.secret) throw new Error("Meta isn't connected.");
    const token = open(row.secret);
    const { since, until } = windowDates(days, now);
    let next: string | null = `${GRAPH()}/act_${row.settings.accountId}/insights?${new URLSearchParams({
      level: "campaign", time_increment: "1", limit: "500",
      time_range: JSON.stringify({ since, until }),
      fields: "campaign_id,campaign_name,spend,impressions,clicks,reach,actions,action_values",
      access_token: token,
    })}`;
    const insights: Insight[] = [];
    for (let page = 0; next && page < 50; page++) {
      const body: { data?: Insight[]; paging?: { next?: string } } = await json(await f(next), "insights");
      insights.push(...(body.data ?? []));
      next = body.paging?.next ?? null;
    }
    const campaigns = new Map<string, AdCampaignRow>();
    const dayRows: AdDayRow[] = insights.map((i) => {
      campaigns.set(i.campaign_id, { campaignId: i.campaign_id, name: i.campaign_name, status: null, channel: "meta" });
      const sum = (list?: { action_type: string; value: string }[]) =>
        (list ?? []).filter((a) => isResult(a.action_type)).reduce((s, a) => s + Number(a.value || 0), 0);
      return {
        campaignId: i.campaign_id, date: i.date_start,
        // Spend arrives as a decimal string in the account's currency.
        spendCents: Math.round(Number(i.spend ?? 0) * 100),
        impressions: Number(i.impressions ?? 0), clicks: Number(i.clicks ?? 0),
        reach: i.reach === undefined ? null : Number(i.reach),
        conversions: sum(i.actions),
        conversionValueCents: Math.round(sum(i.action_values) * 100),
      };
    });
    return storeSync(sql, { orgId, platform: "meta", accountId: row.settings.accountId, campaigns: [...campaigns.values()], days: dayRows, since, until });
  });
}
