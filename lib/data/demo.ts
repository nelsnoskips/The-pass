import {
  BRAND,
  CAMPAIGNS,
  CAMPAIGN_TOTALS,
  CONVERSION_ACTIONS,
  CONVERSION_BREAKDOWN_SEEDS,
  KEYWORD_SEEDS,
  LOCATIONS,
  META_STRUCTURE,
  PMAX_INSIGHTS,
  SEARCH_TERM_SEEDS,
  calendarItems,
  integrationConnections,
  managementActivities,
  notifications,
  opportunities,
  strategistNotes,
  syncRuns,
} from "./seed";
import {
  type BlockTotals,
  type GeneratedDay,
  distributeInteger,
  generateDailyFacts,
} from "./generate";
import { addDays, todayInTimezone, type DateRange } from "../dates";
import { derive, emptyTotals, sumDaily } from "../metrics";
import type { FilterState } from "../filters";
import type {
  Campaign,
  CampaignPerformanceRow,
  ConversionAction,
  DailyCampaignMetrics,
  EntityMetrics,
  Keyword,
  Location,
  PmaxSearchInsight,
  SearchTerm,
  SeriesPoint,
  User,
} from "../types";

/**
 * Seeded demo implementation of the data-access layer.
 *
 * Live Google Ads / Meta Ads connectors must return the same normalized
 * types (see `lib/connectors/`). Pages and API routes only talk to this
 * module's query functions — never to raw platform payloads.
 *
 * Authorization is enforced here, in the data layer, not in the UI:
 * every query takes the requesting user and intersects the requested
 * location scope with the user's `locationIds` grant.
 */

/** Anchor = "today" in the brand timezone. Facts run through yesterday. */
export function demoAnchor(): string {
  return todayInTimezone(BRAND.timezone);
}

/* -------------------------------------------------------- fact caching --- */

const factCache = new Map<string, GeneratedDay[]>();

function factsFor(entityId: string, totals: BlockTotals, anchor: string): GeneratedDay[] {
  const key = `${entityId}:${anchor}`;
  let facts = factCache.get(key);
  if (!facts) {
    // Facts run through *yesterday* — today is always a partial, unsynced day.
    facts = generateDailyFacts(entityId, totals, addDays(anchor, -1));
    factCache.set(key, facts);
  }
  return facts;
}

function campaignFacts(campaignId: string, anchor: string): GeneratedDay[] {
  return factsFor(campaignId, CAMPAIGN_TOTALS[campaignId], anchor);
}

/* -------------------------------------------------------- authorization --- */

/** Locations the user may see, in seed order. */
export function authorizedLocations(user: User): Location[] {
  if (user.locationIds === null) return LOCATIONS;
  return LOCATIONS.filter((l) => user.locationIds!.includes(l.id));
}

/**
 * Intersect the requested filter scope with the user's grant. Requesting a
 * location outside the grant silently narrows to authorized locations only.
 */
export function effectiveLocationIds(user: User, filters: FilterState): string[] {
  const allowed = authorizedLocations(user).map((l) => l.id);
  if (!filters.locationIds) return allowed;
  return filters.locationIds.filter((id) => allowed.includes(id));
}

function scopedCampaigns(user: User, filters: FilterState): Campaign[] {
  const locationIds = effectiveLocationIds(user, filters);
  return CAMPAIGNS.filter((c) => {
    if (c.locationId === null) {
      // Unmapped campaigns are visible only to full-access roles.
      if (user.locationIds !== null) return false;
    } else if (!locationIds.includes(c.locationId)) {
      return false;
    }
    if (filters.platform !== "all" && c.platform !== filters.platform) return false;
    if (
      filters.platform === "google" &&
      filters.googleRefine !== "all" &&
      c.type !== filters.googleRefine
    ) {
      return false;
    }
    return true;
  });
}

/* ------------------------------------------------------------- queries --- */

export function getBrand() {
  return BRAND;
}

export function getLocations(user: User): Location[] {
  return authorizedLocations(user);
}

export function getCampaign(user: User, id: string): Campaign | null {
  const c = CAMPAIGNS.find((c) => c.id === id);
  if (!c) return null;
  if (
    c.locationId !== null &&
    user.locationIds !== null &&
    !user.locationIds.includes(c.locationId)
  ) {
    return null;
  }
  return c;
}

function rowsInRange(facts: GeneratedDay[], range: DateRange): GeneratedDay[] {
  return facts.filter((f) => f.date >= range.start && f.date <= range.end);
}

function toDailyMetrics(campaign: Campaign, day: GeneratedDay): DailyCampaignMetrics {
  return {
    campaignId: campaign.id,
    date: day.date,
    spendCents: day.spendCents,
    impressions: day.impressions,
    clicks: day.clicks,
    reach: day.reach,
    conversions: day.conversions,
    conversionValueCents: day.conversionValueCents,
    revenueBasis: "estimated",
  };
}

export function getCampaignRows(
  user: User,
  filters: FilterState,
  range: DateRange,
  anchor = demoAnchor(),
): CampaignPerformanceRow[] {
  return scopedCampaigns(user, filters).map((campaign) => {
    const days = rowsInRange(campaignFacts(campaign.id, anchor), range).map((d) =>
      toDailyMetrics(campaign, d),
    );
    const totals = sumDaily(days);
    // Google does not report Meta-style reach; keep it null for Google rows.
    if (campaign.platform === "google") totals.reach = null;
    return {
      campaign,
      locationName:
        LOCATIONS.find((l) => l.id === campaign.locationId)?.name ?? null,
      totals,
      derived: derive(totals),
    };
  });
}

export function getTotals(
  user: User,
  filters: FilterState,
  range: DateRange,
  anchor = demoAnchor(),
) {
  const rows = getCampaignRows(user, filters, range, anchor);
  const totals = emptyTotals();
  let reachSeen = false;
  for (const row of rows) {
    totals.spendCents += row.totals.spendCents;
    totals.impressions += row.totals.impressions;
    totals.clicks += row.totals.clicks;
    totals.conversions += row.totals.conversions;
    totals.conversionValueCents += row.totals.conversionValueCents;
    if (row.totals.reach !== null) {
      totals.reach = (totals.reach ?? 0) + row.totals.reach;
      reachSeen = true;
    }
  }
  if (!reachSeen) totals.reach = null;
  return { totals, derived: derive(totals) };
}

export function getSeries(
  user: User,
  filters: FilterState,
  range: DateRange,
  anchor = demoAnchor(),
): SeriesPoint[] {
  const byDate = new Map<string, SeriesPoint>();
  for (const campaign of scopedCampaigns(user, filters)) {
    for (const day of rowsInRange(campaignFacts(campaign.id, anchor), range)) {
      let point = byDate.get(day.date);
      if (!point) {
        point = {
          date: day.date,
          spendCents: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          conversionValueCents: 0,
        };
        byDate.set(day.date, point);
      }
      point.spendCents += day.spendCents;
      point.impressions += day.impressions;
      point.clicks += day.clicks;
      point.conversions += day.conversions;
      point.conversionValueCents += day.conversionValueCents;
    }
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/* ---------------------------------------------- keywords & search terms --- */

interface EntityShareSeed {
  id: string;
  campaignId: string;
  share: number;
}

/**
 * Split a campaign's exact block totals across child entities (keywords or
 * search terms) by share, with largest-remainder rounding so children sum
 * exactly to the parent.
 */
function childBlockTotals(seeds: EntityShareSeed[], campaignId: string): Map<string, BlockTotals> {
  const children = seeds.filter((s) => s.campaignId === campaignId);
  const parent = CAMPAIGN_TOTALS[campaignId];
  const weights = children.map((c) => c.share);
  const spend = distributeInteger(parent.spendCents, weights);
  const impressions = distributeInteger(parent.impressions, weights);
  const clicks = distributeInteger(parent.clicks, weights);
  const conversions = distributeInteger(parent.conversions, weights);
  const value = distributeInteger(parent.conversionValueCents, weights);
  const map = new Map<string, BlockTotals>();
  children.forEach((c, i) => {
    map.set(c.id, {
      spendCents: spend[i],
      impressions: impressions[i],
      clicks: clicks[i],
      reach: null,
      conversions: conversions[i],
      conversionValueCents: value[i],
    });
  });
  return map;
}

const childTotalsCache = new Map<string, Map<string, BlockTotals>>();

function childTotals(kind: "kw" | "st", campaignId: string): Map<string, BlockTotals> {
  const key = `${kind}:${campaignId}`;
  let map = childTotalsCache.get(key);
  if (!map) {
    map = childBlockTotals(kind === "kw" ? KEYWORD_SEEDS : SEARCH_TERM_SEEDS, campaignId);
    childTotalsCache.set(key, map);
  }
  return map;
}

function entityMetricsInRange(
  entityId: string,
  totals: BlockTotals,
  range: DateRange,
  anchor: string,
): EntityMetrics {
  const days = rowsInRange(factsFor(entityId, totals, anchor), range);
  const sum = sumDaily(
    days.map((d) => ({
      campaignId: entityId,
      date: d.date,
      spendCents: d.spendCents,
      impressions: d.impressions,
      clicks: d.clicks,
      reach: null,
      conversions: d.conversions,
      conversionValueCents: d.conversionValueCents,
      revenueBasis: "estimated" as const,
    })),
  );
  return {
    impressions: sum.impressions,
    clicks: sum.clicks,
    spendCents: sum.spendCents,
    conversions: sum.conversions,
    conversionValueCents: sum.conversionValueCents,
  };
}

export function getKeywords(
  user: User,
  filters: FilterState,
  range: DateRange,
  anchor = demoAnchor(),
): Keyword[] {
  const campaigns = scopedCampaigns(user, filters).filter((c) => c.type === "search");
  const out: Keyword[] = [];
  for (const campaign of campaigns) {
    const totalsMap = childTotals("kw", campaign.id);
    for (const seed of KEYWORD_SEEDS.filter((k) => k.campaignId === campaign.id)) {
      out.push({
        id: seed.id,
        campaignId: seed.campaignId,
        adGroup: seed.adGroup,
        text: seed.text,
        matchType: seed.matchType,
        status: seed.status,
        tags: seed.tags,
        metrics: entityMetricsInRange(seed.id, totalsMap.get(seed.id)!, range, anchor),
      });
    }
  }
  return out;
}

export function getSearchTerms(
  user: User,
  filters: FilterState,
  range: DateRange,
  anchor = demoAnchor(),
): SearchTerm[] {
  const campaigns = scopedCampaigns(user, filters).filter((c) => c.type === "search");
  const out: SearchTerm[] = [];
  for (const campaign of campaigns) {
    const totalsMap = childTotals("st", campaign.id);
    for (const seed of SEARCH_TERM_SEEDS.filter((s) => s.campaignId === campaign.id)) {
      out.push({
        id: seed.id,
        campaignId: seed.campaignId,
        keywordId: seed.keywordId,
        text: seed.text,
        metrics: entityMetricsInRange(seed.id, totalsMap.get(seed.id)!, range, anchor),
      });
    }
  }
  return out;
}

export function getPmaxInsights(user: User, filters: FilterState): PmaxSearchInsight[] {
  const ids = scopedCampaigns(user, filters)
    .filter((c) => c.type === "performance_max")
    .map((c) => c.id);
  return PMAX_INSIGHTS.filter((i) => ids.includes(i.campaignId));
}

/* -------------------------------------------------- conversion breakdown --- */

export interface ConversionRow {
  action: ConversionAction;
  campaign: Campaign;
  locationName: string | null;
  count: number;
  valueCents: number;
  /** Spend of the owning campaign over the range (for cost-per context). */
  campaignSpendCents: number;
}

export function getConversionRows(
  user: User,
  filters: FilterState,
  range: DateRange,
  anchor = demoAnchor(),
): ConversionRow[] {
  const campaigns = scopedCampaigns(user, filters);
  const out: ConversionRow[] = [];
  for (const campaign of campaigns) {
    const spend = sumDaily(
      rowsInRange(campaignFacts(campaign.id, anchor), range).map((d) =>
        toDailyMetrics(campaign, d),
      ),
    ).spendCents;
    for (const seed of CONVERSION_BREAKDOWN_SEEDS.filter(
      (s) => s.campaignId === campaign.id,
    )) {
      const action = CONVERSION_ACTIONS.find((a) => a.id === seed.conversionActionId)!;
      const totals: BlockTotals = {
        spendCents: 0,
        impressions: 0,
        clicks: 0,
        reach: null,
        conversions: seed.count,
        conversionValueCents: seed.valueCents,
      };
      const metrics = entityMetricsInRange(
        `${campaign.id}:${action.id}`,
        totals,
        range,
        anchor,
      );
      out.push({
        action,
        campaign,
        locationName:
          LOCATIONS.find((l) => l.id === campaign.locationId)?.name ?? null,
        count: metrics.conversions,
        valueCents: metrics.conversionValueCents,
        campaignSpendCents: spend,
      });
    }
  }
  return out;
}

export function getConversionActions(): ConversionAction[] {
  return CONVERSION_ACTIONS;
}

/* -------------------------------------------------------- managed layer --- */

export function getOpportunities(user: User, anchor = demoAnchor()) {
  const allowed = authorizedLocations(user).map((l) => l.id);
  return opportunities(anchor).filter(
    (o) => o.locationId === null || allowed.includes(o.locationId),
  );
}

export function getManagementActivities(user: User, anchor = demoAnchor()) {
  const allowed = authorizedLocations(user).map((l) => l.id);
  return managementActivities(anchor).filter(
    (a) => a.locationId === null || allowed.includes(a.locationId),
  );
}

export function getStrategistNotes(user: User, anchor = demoAnchor()) {
  // Internal notes stay agency-side: only the marketer (agency) role sees them.
  return strategistNotes(anchor).filter(
    (n) => n.visibility === "client" || user.role === "marketer",
  );
}

export function getNotifications(anchor = demoAnchor()) {
  return notifications(anchor);
}

export function getCalendarItems(user: User, anchor = demoAnchor()) {
  const allowed = authorizedLocations(user).map((l) => l.id);
  return calendarItems(anchor).filter((item) =>
    item.locationIds.some((id) => allowed.includes(id)),
  );
}

export function getIntegrationConnections(anchor = demoAnchor()) {
  return integrationConnections(anchor);
}

export function getSyncRuns(anchor = demoAnchor()) {
  return syncRuns(anchor);
}

/* ------------------------------------------------- campaign-scoped views --- */

export function getCampaignSeries(
  campaignId: string,
  range: DateRange,
  anchor = demoAnchor(),
): SeriesPoint[] {
  return rowsInRange(campaignFacts(campaignId, anchor), range).map((d) => ({
    date: d.date,
    spendCents: d.spendCents,
    impressions: d.impressions,
    clicks: d.clicks,
    conversions: d.conversions,
    conversionValueCents: d.conversionValueCents,
  }));
}

export interface MetaStructureRow {
  adSet: string;
  ad: string;
  spendCents: number;
  impressions: number;
  clicks: number;
  reach: number | null;
  conversions: number;
}

/**
 * Meta campaign → ad set → ad breakdown, split from the campaign's period
 * totals by seeded shares (largest-remainder, so rows sum to the campaign).
 */
export function getMetaStructure(
  user: User,
  campaignId: string,
  range: DateRange,
  anchor = demoAnchor(),
): MetaStructureRow[] {
  const campaign = getCampaign(user, campaignId);
  if (!campaign || campaign.platform !== "meta") return [];
  const totals = sumDaily(
    rowsInRange(campaignFacts(campaignId, anchor), range).map((d) =>
      toDailyMetrics(campaign, d),
    ),
  );
  const weights = META_STRUCTURE.map((s) => s.share);
  const spend = distributeInteger(totals.spendCents, weights);
  const impressions = distributeInteger(totals.impressions, weights);
  const clicks = distributeInteger(totals.clicks, weights);
  const reach =
    totals.reach === null ? null : distributeInteger(totals.reach, weights);
  const conversions = distributeInteger(totals.conversions, weights);
  return META_STRUCTURE.map((s, i) => ({
    adSet: s.adSet,
    ad: s.ad,
    spendCents: spend[i],
    impressions: impressions[i],
    clicks: clicks[i],
    reach: reach === null ? null : reach[i],
    conversions: conversions[i],
  }));
}
