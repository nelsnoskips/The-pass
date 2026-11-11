import type { Sql } from "postgres";

/**
 * Where both ad platforms' numbers land, in one shape. A sync writes a
 * whole window; rows are keyed on (org, platform, campaign, day), so
 * re-reading the last 30 days replaces late-arriving conversions instead
 * of adding them twice.
 */

export type AdPlatform = "google" | "meta";

export interface AdCampaignRow {
  campaignId: string;
  name: string;
  status: string | null;
  channel: string | null;
}

export interface AdDayRow {
  campaignId: string;
  date: string; // yyyy-mm-dd, in the ad account's own timezone
  spendCents: number;
  impressions: number;
  clicks: number;
  reach: number | null;
  conversions: number;
  conversionValueCents: number;
}

export async function storeSync(
  sql: Sql,
  input: { orgId: string; platform: AdPlatform; accountId: string; campaigns: AdCampaignRow[]; days: AdDayRow[]; since: string; until: string },
): Promise<number> {
  return sql.begin(async (tx) => {
    for (const c of input.campaigns) {
      await tx`
        insert into ad_campaigns (org_id, platform, account_id, campaign_id, name, status, channel)
        values (${input.orgId}, ${input.platform}, ${input.accountId}, ${c.campaignId}, ${c.name}, ${c.status}, ${c.channel})
        on conflict (org_id, platform, campaign_id) do update set
          name = excluded.name, status = excluded.status, channel = excluded.channel,
          account_id = excluded.account_id, updated_at = now()`;
    }
    // The platform's answer for this window is the whole truth for it:
    // a day that has since gone to zero (or a campaign removed) goes too.
    await tx`delete from ad_daily where org_id = ${input.orgId} and platform = ${input.platform}
             and date between ${input.since} and ${input.until}`;
    for (const d of input.days) {
      await tx`
        insert into ad_daily (org_id, platform, campaign_id, date, spend_cents, impressions, clicks, reach, conversions, conversion_value_cents)
        values (${input.orgId}, ${input.platform}, ${d.campaignId}, ${d.date}, ${d.spendCents}, ${d.impressions}, ${d.clicks},
                ${d.reach}, ${d.conversions}, ${d.conversionValueCents})
        on conflict (org_id, platform, campaign_id, date) do update set
          spend_cents = excluded.spend_cents, impressions = excluded.impressions, clicks = excluded.clicks,
          reach = excluded.reach, conversions = excluded.conversions,
          conversion_value_cents = excluded.conversion_value_cents, synced_at = now()`;
    }
    return input.days.length;
  });
}

/** Run a platform sync and record how it went, success or not. */
export async function recordedSync(
  sql: Sql, orgId: string, platform: AdPlatform, work: () => Promise<number>,
): Promise<{ ok: boolean; rows: number; error?: string }> {
  const [s] = await sql<{ id: number }[]>`
    insert into ad_syncs (org_id, platform, status) values (${orgId}, ${platform}, 'ok') returning id`;
  try {
    const rows = await work();
    await sql`update ad_syncs set rows = ${rows}, finished_at = now() where id = ${s.id}`;
    return { ok: true, rows };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await sql`update ad_syncs set status = 'failed', error = ${error}, finished_at = now() where id = ${s.id}`;
    await sql`update org_integrations set error = ${error}, updated_at = now()
              where org_id = ${orgId} and provider = ${platform === "google" ? "google_ads" : "meta_ads"}`;
    return { ok: false, rows: 0, error };
  }
}

export function windowDates(days: number, now = new Date()): { since: string; until: string } {
  const until = new Date(now.getTime() - 86_400_000);
  const since = new Date(until.getTime() - (days - 1) * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { since: iso(since), until: iso(until) };
}
