import type { Sql } from "postgres";
import { assertCan, type Tenant } from "../platform/tenant";

/**
 * Ad reporting for one restaurant over a date range: totals by platform,
 * by campaign and by day, next to what actually happened in the room —
 * bookings and covers from The Pass in the same days.
 *
 * Rules carried over from the original reporting: money in integer
 * cents; a ratio with nothing under it is null (shown as —), never $0.
 */

export interface Totals {
  spendCents: number; impressions: number; clicks: number; conversions: number; conversionValueCents: number;
}

export interface Derived { ctr: number | null; cpcCents: number | null; costPerResultCents: number | null; roas: number | null }

export function derive(t: Totals): Derived {
  return {
    ctr: t.impressions ? (t.clicks / t.impressions) * 100 : null,
    cpcCents: t.clicks ? Math.round(t.spendCents / t.clicks) : null,
    costPerResultCents: t.conversions ? Math.round(t.spendCents / t.conversions) : null,
    roas: t.spendCents ? t.conversionValueCents / t.spendCents : null,
  };
}

const num = (v: unknown) => Number(v ?? 0);
const toTotals = (r: Record<string, unknown>): Totals => ({
  spendCents: num(r.spend), impressions: num(r.impressions), clicks: num(r.clicks),
  conversions: num(r.conversions), conversionValueCents: num(r.value),
});

export async function adReport(sql: Sql, t: Tenant, since: string, until: string) {
  assertCan(t, "view");
  const [byPlatform, byCampaign, byDay, bookings, lastSync] = await Promise.all([
    sql`select platform, sum(spend_cents) spend, sum(impressions) impressions, sum(clicks) clicks,
               sum(conversions) conversions, sum(conversion_value_cents) value
        from ad_daily where org_id = ${t.orgId} and date between ${since} and ${until} group by platform`,
    sql`select d.platform, d.campaign_id, coalesce(c.name, d.campaign_id) as name, c.status, c.channel,
               sum(d.spend_cents) spend, sum(d.impressions) impressions, sum(d.clicks) clicks,
               sum(d.conversions) conversions, sum(d.conversion_value_cents) value
        from ad_daily d left join ad_campaigns c
          on c.org_id = d.org_id and c.platform = d.platform and c.campaign_id = d.campaign_id
        where d.org_id = ${t.orgId} and d.date between ${since} and ${until}
        group by d.platform, d.campaign_id, c.name, c.status, c.channel
        order by sum(d.spend_cents) desc`,
    sql`select to_char(date, 'YYYY-MM-DD') as day, sum(spend_cents) spend, sum(conversions) conversions
        from ad_daily where org_id = ${t.orgId} and date between ${since} and ${until} group by date order by date`,
    sql`select to_char(r.starts_at at time zone v.timezone, 'YYYY-MM-DD') as day, r.source,
               count(*)::int as bookings, sum(r.party_size)::int as covers
        from reservations r join venues v on v.id = r.venue_id
        where r.org_id = ${t.orgId} and r.status in ('booked','confirmed','seated','completed')
          and (r.starts_at at time zone v.timezone)::date between ${since}::date and ${until}::date
        group by 1, 2`,
    sql`select platform, max(finished_at) filter (where status = 'ok') as ok_at,
               (array_agg(error order by started_at desc))[1] as last_error,
               (array_agg(status order by started_at desc))[1] as last_status
        from ad_syncs where org_id = ${t.orgId} group by platform`,
  ]);

  const platforms = Object.fromEntries(byPlatform.map((r) => [r.platform as string, toTotals(r)])) as Partial<Record<"google" | "meta", Totals>>;
  const all = (["google", "meta"] as const).reduce<Totals>((s, p) => {
    const x = platforms[p];
    return x ? { spendCents: s.spendCents + x.spendCents, impressions: s.impressions + x.impressions, clicks: s.clicks + x.clicks, conversions: s.conversions + x.conversions, conversionValueCents: s.conversionValueCents + x.conversionValueCents } : s;
  }, { spendCents: 0, impressions: 0, clicks: 0, conversions: 0, conversionValueCents: 0 });

  const bookingsByDay = new Map<string, { bookings: number; covers: number }>();
  const bySource = new Map<string, number>();
  for (const b of bookings) {
    const d = bookingsByDay.get(b.day as string) ?? { bookings: 0, covers: 0 };
    d.bookings += b.bookings as number; d.covers += b.covers as number;
    bookingsByDay.set(b.day as string, d);
    bySource.set(b.source as string, (bySource.get(b.source as string) ?? 0) + (b.bookings as number));
  }

  return {
    total: all,
    totalDerived: derive(all),
    platforms,
    campaigns: byCampaign.map((r) => ({
      platform: r.platform as "google" | "meta", campaignId: r.campaign_id as string, name: r.name as string,
      status: r.status as string | null, channel: r.channel as string | null, ...toTotals(r), derived: derive(toTotals(r)),
    })),
    days: byDay.map((r) => ({ day: r.day as string, spendCents: num(r.spend), conversions: num(r.conversions), ...(bookingsByDay.get(r.day as string) ?? { bookings: 0, covers: 0 }) })),
    bookingsBySource: Object.fromEntries(bySource),
    bookingsTotal: [...bookingsByDay.values()].reduce((s, d) => s + d.bookings, 0),
    coversTotal: [...bookingsByDay.values()].reduce((s, d) => s + d.covers, 0),
    sync: Object.fromEntries(lastSync.map((r) => [r.platform as string, { okAt: r.ok_at as Date | null, lastStatus: r.last_status as string, lastError: r.last_error as string | null }])),
  };
}
