import type { Sql } from "postgres";
import { log } from "../reservations/repo";
import { open, seal } from "../integrations/secrets";
import { recordedSync, storeSync, windowDates, type AdCampaignRow, type AdDayRow, type AdSearchTermRow } from "./store";

/**
 * Google Ads: an owner signs in, we find their ad account, and every
 * night re-read the last 30 days of campaign numbers, budgets and search
 * terms. Writes (a budget, a pause, a negative keyword) happen only
 * through an approved Paid Ads Agent proposal — see `mutate` below.
 *
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  (the same OAuth client as
 *     Business Profile; add the Google Ads API and this redirect URI:
 *     <site>/api/integrations/google-ads/callback)
 *   GOOGLE_ADS_DEVELOPER_TOKEN  (Google Ads API Center; Basic access is
 *     needed for accounts other than test accounts)
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID  (optional: a manager account id when
 *     the restaurant's account is reached through one)
 *   GOOGLE_ADS_API_VERSION  (optional; Google retires versions about
 *     yearly — set the current one, e.g. v21, without a code change)
 */

type Fetch = typeof fetch;
const ver = () => process.env.GOOGLE_ADS_API_VERSION?.trim() || "v21";
const API = () => `https://googleads.googleapis.com/${ver()}`;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function googleAdsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim() && process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim());
}

export function googleAdsAuthorizeUrl(redirectUri: string, state: string): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "https://www.googleapis.com/auth/adwords");
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("state", state);
  return u.toString();
}

async function json<T>(res: Response, what: string): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } | string };
  if (!res.ok) {
    const e = body.error;
    throw new Error(`Google Ads ${what}: ${typeof e === "string" ? e : e?.message ?? res.status}`);
  }
  return body;
}

async function token(f: Fetch, fields: Record<string, string>) {
  return json<{ access_token: string; refresh_token?: string }>(await f(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", ...fields }),
  }), "token");
}

function headers(accessToken: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
    "Content-Type": "application/json",
  };
  const login = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/\D/g, "");
  if (login) h["login-customer-id"] = login;
  return h;
}

type Row = Record<string, Record<string, unknown>>;

async function search(f: Fetch, accessToken: string, customerId: string, query: string): Promise<Row[]> {
  const batches = await json<{ results?: Row[] }[]>(await f(`${API()}/customers/${customerId}/googleAds:searchStream`, {
    method: "POST", headers: headers(accessToken), body: JSON.stringify({ query }),
  }), "report");
  return batches.flatMap((b) => b.results ?? []);
}

export async function connectGoogleAds(sql: Sql, orgId: string, code: string, redirectUri: string, actor: string, f: Fetch = fetch): Promise<string> {
  const t = await token(f, { grant_type: "authorization_code", code, redirect_uri: redirectUri });
  if (!t.refresh_token) throw new Error("Google didn't return a refresh token. Remove The Pass from your Google account's connected apps and connect again.");
  const { resourceNames = [] } = await json<{ resourceNames?: string[] }>(
    await f(`${API()}/customers:listAccessibleCustomers`, { headers: headers(t.access_token) }), "accounts");
  // Prefer an account that actually runs campaigns (not a manager).
  let chosen: { id: string; name: string } | null = null;
  for (const rn of resourceNames.slice(0, 10)) {
    const id = rn.split("/")[1];
    const rows = await search(f, t.access_token, id, "SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1").catch(() => []);
    const c = rows[0]?.customer as { descriptiveName?: string; manager?: boolean } | undefined;
    if (c && !c.manager) { chosen = { id, name: c.descriptiveName || id }; break; }
  }
  if (!chosen) throw new Error("No Google Ads account with campaigns was found for this sign-in.");
  await sql`
    insert into org_integrations (org_id, provider, status, account_label, settings, secret, updated_by)
    values (${orgId}, 'google_ads', 'connected', ${chosen.name}, ${sql.json({ customerId: chosen.id })}, ${seal(t.refresh_token)}, ${actor})
    on conflict (org_id, provider) do update set status = 'connected', account_label = excluded.account_label,
      settings = excluded.settings, secret = excluded.secret, updated_by = excluded.updated_by, updated_at = now(), error = null`;
  await log(sql, orgId, actor, "integration.connected", "integration", "google_ads", { account: chosen.name });
  return chosen.name;
}

/** Re-read the last `days` days of campaign numbers. */
export async function syncGoogleAds(sql: Sql, orgId: string, days = 30, f: Fetch = fetch, now = new Date()) {
  return recordedSync(sql, orgId, "google", async () => {
    const [row] = await sql<{ secret: string | null; settings: { customerId: string }; status: string }[]>`
      select secret, settings, status from org_integrations where org_id = ${orgId} and provider = 'google_ads'`;
    if (!row || row.status !== "connected" || !row.secret) throw new Error("Google Ads isn't connected.");
    const t = await token(f, { grant_type: "refresh_token", refresh_token: open(row.secret) });
    const { since, until } = windowDates(days, now);
    const results = await search(f, t.access_token, row.settings.customerId, `
      SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
             campaign_budget.resource_name, campaign_budget.amount_micros, campaign_budget.explicitly_shared,
             segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks,
             metrics.conversions, metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${since}' AND '${until}'`);
    const campaigns = new Map<string, AdCampaignRow>();
    const dayRows: AdDayRow[] = [];
    for (const r of results) {
      const c = r.campaign as { id: string; name: string; status?: string; advertisingChannelType?: string };
      const m = r.metrics as { costMicros?: string; impressions?: string; clicks?: string; conversions?: number; conversionsValue?: number };
      const s = r.segments as { date: string };
      const b = r.campaignBudget as { resourceName?: string; amountMicros?: string; explicitlyShared?: boolean } | undefined;
      const prev = campaigns.get(c.id);
      campaigns.set(c.id, {
        campaignId: c.id, name: c.name, status: c.status?.toLowerCase() ?? null, channel: c.advertisingChannelType?.toLowerCase() ?? null,
        dailyBudgetCents: b?.amountMicros ? Math.round(Number(b.amountMicros) / 10_000) : prev?.dailyBudgetCents ?? null,
        budgetRef: b?.resourceName ?? prev?.budgetRef ?? null, budgetShared: b ? Boolean(b.explicitlyShared) : prev?.budgetShared ?? false,
      });
      dayRows.push({
        campaignId: c.id, date: s.date,
        // Money arrives in micros (millionths of the currency unit).
        spendCents: Math.round(Number(m.costMicros ?? 0) / 10_000),
        impressions: Number(m.impressions ?? 0), clicks: Number(m.clicks ?? 0), reach: null,
        conversions: Number(m.conversions ?? 0),
        conversionValueCents: Math.round(Number(m.conversionsValue ?? 0) * 100),
      });
    }
    // Search terms, totalled over the window: what the Search Terms rules read.
    const termRows = await search(f, t.access_token, row.settings.customerId, `
      SELECT search_term_view.search_term, campaign.id, ad_group.id,
             metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
      FROM search_term_view
      WHERE segments.date BETWEEN '${since}' AND '${until}' AND metrics.clicks > 0`);
    const terms: AdSearchTermRow[] = termRows.map((r) => {
      const m = r.metrics as { costMicros?: string; impressions?: string; clicks?: string; conversions?: number };
      return {
        term: String((r.searchTermView as { searchTerm: string }).searchTerm).toLowerCase().trim(),
        campaignId: String((r.campaign as { id: string }).id), adGroupId: String((r.adGroup as { id: string }).id),
        impressions: Number(m.impressions ?? 0), clicks: Number(m.clicks ?? 0),
        spendCents: Math.round(Number(m.costMicros ?? 0) / 10_000), conversions: Number(m.conversions ?? 0),
      };
    });
    return storeSync(sql, { orgId, platform: "google", accountId: row.settings.customerId, campaigns: [...campaigns.values()], days: dayRows, since, until, terms });
  });
}

/**
 * One write to the restaurant's Google Ads account. Only called from an
 * approved proposal (lib/agent-runtime/agents/paid-ads.ts), never from a
 * page or a model directly.
 */
export async function googleAdsMutate(
  sql: Sql, orgId: string, resource: "campaignBudgets" | "campaigns" | "campaignCriteria",
  operations: Record<string, unknown>[], f: Fetch = fetch,
): Promise<{ customerId: string; results: { resourceName: string }[] }> {
  const [row] = await sql<{ secret: string | null; settings: { customerId: string }; status: string }[]>`
    select secret, settings, status from org_integrations where org_id = ${orgId} and provider = 'google_ads'`;
  if (!row || row.status !== "connected" || !row.secret) throw new Error("Google Ads isn't connected.");
  const t = await token(f, { grant_type: "refresh_token", refresh_token: open(row.secret) });
  const out = await json<{ results?: { resourceName: string }[] }>(await f(`${API()}/customers/${row.settings.customerId}/${resource}:mutate`, {
    method: "POST", headers: headers(t.access_token), body: JSON.stringify({ operations }),
  }), "change");
  return { customerId: row.settings.customerId, results: out.results ?? [] };
}
