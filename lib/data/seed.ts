import type {
  AppNotification,
  Brand,
  Campaign,
  CalendarItem,
  ConversionAction,
  IntegrationConnection,
  Location,
  ManagementActivity,
  Opportunity,
  PmaxSearchInsight,
  StrategistNote,
  SyncRun,
  User,
} from "../types";
import type { BlockTotals } from "./generate";
import { addDays } from "../dates";

/**
 * Seeded demo brand: Santorini by Georgios, with the exact Last-30-Days
 * campaign totals from Section 21 of the blueprint. Dates that need to be
 * "recent" are computed relative to an anchor date at query time.
 */

export const BRAND: Brand = {
  id: "brand_santorini",
  name: "Santorini by Georgios",
  currency: "USD",
  timezone: "America/New_York",
  weekStartsOn: 1,
  defaultConversionValues: {
    reservation: 5000,
    online_order: 3500,
    phone_call: 1800,
    direction_request: 0,
  },
};

export const LOCATIONS: Location[] = [
  {
    id: "loc_ftl",
    brandId: BRAND.id,
    name: "Fort Lauderdale",
    address: "620 E Las Olas Blvd",
    city: "Fort Lauderdale",
    state: "FL",
    zip: "33301",
    timezone: "America/New_York",
    phone: "(954) 555-0164",
    website: "https://santorinibygeorgios.com/fort-lauderdale",
    notes: "Flagship location. Strong weekend reservation demand.",
  },
  {
    id: "loc_mia",
    brandId: BRAND.id,
    name: "Miami Beach",
    address: "1120 Ocean Dr",
    city: "Miami Beach",
    state: "FL",
    zip: "33139",
    timezone: "America/New_York",
    phone: "(305) 555-0142",
    website: "https://santorinibygeorgios.com/south-beach",
    notes: "South Beach. Newer market — campaigns ramping since June.",
  },
];

export const CAMPAIGNS: Campaign[] = [
  {
    id: "cmp_ftl_search",
    brandId: BRAND.id,
    locationId: "loc_ftl",
    platform: "google",
    externalId: "20481930341",
    name: "Santorini by Georgios | Fort Lauderdale | Search",
    type: "search",
    status: "active",
    dailyBudgetCents: 2500,
    objectiveLabel: "Search",
  },
  {
    id: "cmp_sb_pmax",
    brandId: BRAND.id,
    locationId: "loc_mia",
    platform: "google",
    externalId: "20597218854",
    name: "Santorini by Georgios | South Beach | PMax",
    type: "performance_max",
    status: "active",
    dailyBudgetCents: 500,
    objectiveLabel: "Performance Max",
  },
  {
    id: "cmp_sb_meta",
    brandId: BRAND.id,
    locationId: "loc_mia",
    platform: "meta",
    externalId: "120211490331230578",
    name: "Santorini | South Beach | Reservations",
    type: "meta_reservations",
    status: "active",
    dailyBudgetCents: 300,
    objectiveLabel: "Reservations",
  },
  {
    id: "cmp_sb_search",
    brandId: BRAND.id,
    locationId: "loc_mia",
    platform: "google",
    externalId: "20601177432",
    name: "Santorini by Georgios | South Beach | Search",
    type: "search",
    status: "active",
    dailyBudgetCents: 800,
    objectiveLabel: "Search",
  },
];

/** Exact Last-30-Days totals per campaign (Section 21). Money in cents. */
export const CAMPAIGN_TOTALS: Record<string, BlockTotals> = {
  cmp_ftl_search: {
    spendCents: 56309,
    impressions: 22600,
    clicks: 1101,
    reach: null,
    conversions: 245,
    conversionValueCents: 1225000,
  },
  cmp_sb_pmax: {
    spendCents: 6307,
    impressions: 6825,
    clicks: 124,
    reach: null,
    conversions: 0,
    conversionValueCents: 0,
  },
  cmp_sb_meta: {
    spendCents: 949,
    impressions: 770,
    clicks: 49,
    reach: 689,
    conversions: 0,
    conversionValueCents: 0,
  },
  cmp_sb_search: {
    spendCents: 77,
    impressions: 86,
    clicks: 2,
    reach: null,
    conversions: 0,
    conversionValueCents: 0,
  },
};

/* ------------------------------------------------------------- keywords --- */

export interface KeywordSeed {
  id: string;
  campaignId: string;
  adGroup: string;
  text: string;
  matchType: "exact" | "phrase" | "broad";
  status: "enabled" | "paused";
  tags: string[];
  /** Relative share of the campaign's totals attributed to this keyword. */
  share: number;
}

export const KEYWORD_SEEDS: KeywordSeed[] = [
  { id: "kw_ftl_1", campaignId: "cmp_ftl_search", adGroup: "Brand", text: "santorini by georgios", matchType: "exact", status: "enabled", tags: ["Brand terms"], share: 0.24 },
  { id: "kw_ftl_2", campaignId: "cmp_ftl_search", adGroup: "Brand", text: "santorini restaurant fort lauderdale", matchType: "phrase", status: "enabled", tags: ["Brand terms", "Neighborhood/city terms"], share: 0.13 },
  { id: "kw_ftl_3", campaignId: "cmp_ftl_search", adGroup: "Near Me", text: "greek restaurant near me", matchType: "phrase", status: "enabled", tags: ["“Near me” terms", "Cuisine terms"], share: 0.19 },
  { id: "kw_ftl_4", campaignId: "cmp_ftl_search", adGroup: "Near Me", text: "restaurants near las olas", matchType: "broad", status: "enabled", tags: ["“Near me” terms", "Neighborhood/city terms"], share: 0.1 },
  { id: "kw_ftl_5", campaignId: "cmp_ftl_search", adGroup: "Cuisine", text: "greek food fort lauderdale", matchType: "phrase", status: "enabled", tags: ["Cuisine terms", "Neighborhood/city terms"], share: 0.11 },
  { id: "kw_ftl_6", campaignId: "cmp_ftl_search", adGroup: "Cuisine", text: "mediterranean restaurant fort lauderdale", matchType: "phrase", status: "enabled", tags: ["Cuisine terms"], share: 0.07 },
  { id: "kw_ftl_7", campaignId: "cmp_ftl_search", adGroup: "Occasions", text: "date night restaurant fort lauderdale", matchType: "phrase", status: "enabled", tags: ["Occasion terms"], share: 0.06 },
  { id: "kw_ftl_8", campaignId: "cmp_ftl_search", adGroup: "Occasions", text: "private dining fort lauderdale", matchType: "phrase", status: "enabled", tags: ["Occasion terms"], share: 0.03 },
  { id: "kw_ftl_9", campaignId: "cmp_ftl_search", adGroup: "Dishes", text: "best saganaki near me", matchType: "broad", status: "enabled", tags: ["Dish/menu-item terms", "“Near me” terms"], share: 0.04 },
  { id: "kw_ftl_10", campaignId: "cmp_ftl_search", adGroup: "Occasions", text: "happy hour las olas", matchType: "broad", status: "paused", tags: ["Occasion terms", "Neighborhood/city terms"], share: 0.03 },
  { id: "kw_sbs_1", campaignId: "cmp_sb_search", adGroup: "Brand", text: "santorini south beach", matchType: "exact", status: "enabled", tags: ["Brand terms"], share: 0.62 },
  { id: "kw_sbs_2", campaignId: "cmp_sb_search", adGroup: "Cuisine", text: "greek restaurant south beach", matchType: "phrase", status: "enabled", tags: ["Cuisine terms", "Neighborhood/city terms"], share: 0.38 },
];

export interface SearchTermSeed {
  id: string;
  campaignId: string;
  keywordId: string | null;
  text: string;
  /** Relative share of the campaign's totals attributed to this search term. */
  share: number;
}

export const SEARCH_TERM_SEEDS: SearchTermSeed[] = [
  { id: "st_1", campaignId: "cmp_ftl_search", keywordId: "kw_ftl_1", text: "santorini by georgios", share: 0.16 },
  { id: "st_2", campaignId: "cmp_ftl_search", keywordId: "kw_ftl_1", text: "santorini by georgios las olas", share: 0.07 },
  { id: "st_3", campaignId: "cmp_ftl_search", keywordId: "kw_ftl_2", text: "santorini greek restaurant fort lauderdale", share: 0.1 },
  { id: "st_4", campaignId: "cmp_ftl_search", keywordId: "kw_ftl_3", text: "greek restaurant near me", share: 0.12 },
  { id: "st_5", campaignId: "cmp_ftl_search", keywordId: "kw_ftl_3", text: "greek food near me open now", share: 0.06 },
  { id: "st_6", campaignId: "cmp_ftl_search", keywordId: "kw_ftl_4", text: "best restaurants on las olas blvd", share: 0.08 },
  { id: "st_7", campaignId: "cmp_ftl_search", keywordId: "kw_ftl_4", text: "las olas dinner reservations", share: 0.05 },
  { id: "st_8", campaignId: "cmp_ftl_search", keywordId: "kw_ftl_5", text: "greek food fort lauderdale", share: 0.08 },
  { id: "st_9", campaignId: "cmp_ftl_search", keywordId: "kw_ftl_6", text: "mediterranean food fort lauderdale beach", share: 0.06 },
  { id: "st_10", campaignId: "cmp_ftl_search", keywordId: "kw_ftl_7", text: "romantic dinner fort lauderdale", share: 0.07 },
  { id: "st_11", campaignId: "cmp_ftl_search", keywordId: "kw_ftl_7", text: "anniversary dinner near las olas", share: 0.04 },
  { id: "st_12", campaignId: "cmp_ftl_search", keywordId: "kw_ftl_8", text: "private event space fort lauderdale restaurant", share: 0.04 },
  { id: "st_13", campaignId: "cmp_ftl_search", keywordId: "kw_ftl_9", text: "flaming saganaki fort lauderdale", share: 0.04 },
  { id: "st_14", campaignId: "cmp_ftl_search", keywordId: null, text: "opa greek taverna fort lauderdale", share: 0.03 },
  { id: "st_15", campaignId: "cmp_sb_search", keywordId: "kw_sbs_1", text: "santorini south beach miami", share: 0.62 },
  { id: "st_16", campaignId: "cmp_sb_search", keywordId: "kw_sbs_2", text: "greek restaurants ocean drive", share: 0.38 },
];

export const PMAX_INSIGHTS: PmaxSearchInsight[] = [
  { id: "pmi_1", campaignId: "cmp_sb_pmax", category: "greek restaurants miami beach", impressions: 2140, clicks: 41, conversions: 0 },
  { id: "pmi_2", campaignId: "cmp_sb_pmax", category: "restaurants on ocean drive", impressions: 1730, clicks: 33, conversions: 0 },
  { id: "pmi_3", campaignId: "cmp_sb_pmax", category: "mediterranean fine dining south beach", impressions: 1465, clicks: 28, conversions: 0 },
  { id: "pmi_4", campaignId: "cmp_sb_pmax", category: "dinner reservations south beach", impressions: 1490, clicks: 22, conversions: 0 },
];

/* --------------------------------------------------------- conversions --- */

export const CONVERSION_ACTIONS: ConversionAction[] = [
  {
    id: "ca_opentable",
    brandId: BRAND.id,
    platform: "google",
    rawName: "OpenTable Reservation Complete",
    category: "reservation",
    estimatedValueCents: 5000,
    attributionWindow: "Click-through 30d",
    includeInTotals: true,
  },
  {
    id: "ca_calls",
    brandId: BRAND.id,
    platform: "google",
    rawName: "Calls from ads",
    category: "phone_call",
    estimatedValueCents: 1800,
    attributionWindow: "Call duration ≥ 60s",
    includeInTotals: false,
  },
  {
    id: "ca_directions",
    brandId: BRAND.id,
    platform: "google",
    rawName: "Get directions",
    category: "direction_request",
    estimatedValueCents: null,
    attributionWindow: "Click-through 30d",
    includeInTotals: false,
  },
  {
    id: "ca_toast",
    brandId: BRAND.id,
    platform: "google",
    rawName: "Toast Purchase",
    category: "online_order",
    estimatedValueCents: 3500,
    attributionWindow: "Click-through 30d",
    includeInTotals: false,
  },
  {
    id: "ca_meta_reservation",
    brandId: BRAND.id,
    platform: "meta",
    rawName: "Website reservations (pixel)",
    category: "reservation",
    estimatedValueCents: 5000,
    attributionWindow: "7d click / 1d view",
    includeInTotals: true,
  },
];

/**
 * Per-campaign conversion-action counts for the latest 30-day block. Only
 * actions with `includeInTotals` count toward the campaign's headline
 * conversions (the FLL Search campaign's 245 reservations). Secondary actions
 * are reported but excluded from totals, mirroring Google's primary/secondary
 * conversion model.
 */
export const CONVERSION_BREAKDOWN_SEEDS: {
  campaignId: string;
  conversionActionId: string;
  count: number;
  valueCents: number;
}[] = [
  { campaignId: "cmp_ftl_search", conversionActionId: "ca_opentable", count: 245, valueCents: 1225000 },
  { campaignId: "cmp_ftl_search", conversionActionId: "ca_calls", count: 38, valueCents: 68400 },
  { campaignId: "cmp_ftl_search", conversionActionId: "ca_directions", count: 57, valueCents: 0 },
  { campaignId: "cmp_ftl_search", conversionActionId: "ca_toast", count: 11, valueCents: 38500 },
  { campaignId: "cmp_sb_pmax", conversionActionId: "ca_directions", count: 9, valueCents: 0 },
  { campaignId: "cmp_sb_meta", conversionActionId: "ca_meta_reservation", count: 0, valueCents: 0 },
  { campaignId: "cmp_sb_search", conversionActionId: "ca_opentable", count: 0, valueCents: 0 },
];

/* --------------------------------------------------------- integrations --- */

export function integrationConnections(anchor: string): IntegrationConnection[] {
  return [
    {
      id: "conn_google",
      brandId: BRAND.id,
      platform: "google",
      status: "connected",
      accountName: "Santorini Hospitality Group",
      accountExternalId: "734-201-8846",
      lastSyncAt: `${anchor}T11:42:00Z`,
      dataThrough: addDays(anchor, -1),
      mode: "demo",
    },
    {
      id: "conn_meta",
      brandId: BRAND.id,
      platform: "meta",
      status: "connected",
      accountName: "Santorini by Georgios (Business)",
      accountExternalId: "act_58312090114",
      lastSyncAt: `${anchor}T11:45:00Z`,
      dataThrough: addDays(anchor, -1),
      mode: "demo",
    },
  ];
}

export function syncRuns(anchor: string): SyncRun[] {
  const runs: SyncRun[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(anchor, -i);
    runs.push(
      {
        id: `sync_g_${i}`,
        connectionId: "conn_google",
        startedAt: `${day}T11:40:00Z`,
        finishedAt: `${day}T11:42:00Z`,
        status: i === 2 ? "partial" : "success",
        recordsUpserted: i === 2 ? 214 : 342,
        message:
          i === 2
            ? "Conversion lookback window rate-limited; retried and completed on next run."
            : "Incremental sync with 3-day attribution lookback.",
      },
      {
        id: `sync_m_${i}`,
        connectionId: "conn_meta",
        startedAt: `${day}T11:43:00Z`,
        finishedAt: `${day}T11:45:00Z`,
        status: "success",
        recordsUpserted: 96,
        message: "Incremental sync with 7-day attribution lookback.",
      },
    );
  }
  return runs;
}

/* ------------------------------------------------------- managed layer --- */

export function opportunities(anchor: string): Opportunity[] {
  return [
    {
      id: "opp_pmax_tracking",
      brandId: BRAND.id,
      locationId: "loc_mia",
      title: "South Beach PMax is spending without conversion tracking",
      explanation:
        "The Performance Max campaign spent $63.07 over the last 30 days with 6,825 impressions and 124 clicks, but zero tracked conversions. Before judging or scaling this campaign, we need to confirm the reservation conversion tag fires on the South Beach booking page.",
      supportingMetric: "$63.07 spend · 124 clicks · 0 tracked conversions",
      estimatedImpact: null,
      recommendedAction:
        "Verify OpenTable conversion tag on the South Beach booking flow, then re-evaluate PMax after 2 weeks of clean data.",
      priority: "high",
      owner: "Alexis Romero",
      status: "in_progress",
      href: "/campaigns/cmp_sb_pmax",
      createdAt: addDays(anchor, -4),
    },
    {
      id: "opp_scale_ftl",
      brandId: BRAND.id,
      locationId: "loc_ftl",
      title: "Fort Lauderdale Search is constrained by budget",
      explanation:
        "Fort Lauderdale Search converts at $2.30 per reservation and is lost to budget on high-intent evenings (Thu–Sat). A modest budget increase should capture reservations we are currently missing at the same efficiency.",
      supportingMetric: "245 reservations at $2.30 each · 4.87% CTR",
      estimatedImpact: "+40–60 reservations/mo at similar cost per reservation",
      recommendedAction:
        "Raise daily budget from $25 to $32 and monitor cost per reservation for two weeks.",
      priority: "high",
      owner: "Alexis Romero",
      status: "new",
      href: "/campaigns/cmp_ftl_search",
      createdAt: addDays(anchor, -2),
    },
    {
      id: "opp_meta_underfunded",
      brandId: BRAND.id,
      locationId: "loc_mia",
      title: "Meta Reservations campaign is too small to learn",
      explanation:
        "The South Beach Meta campaign spent $9.49 in 30 days — too little for Meta's delivery system to exit the learning phase. Either fund it to a meaningful daily budget or pause it and consolidate spend into Search.",
      supportingMetric: "$9.49 spend · 770 impressions · 49 clicks",
      estimatedImpact: null,
      recommendedAction:
        "Decide: fund at $10/day for 4 weeks, or pause and revisit after PMax tracking is verified.",
      priority: "medium",
      owner: "Georgios (owner decision)",
      status: "reviewing",
      href: "/campaigns/cmp_sb_meta",
      createdAt: addDays(anchor, -6),
    },
  ];
}

export function managementActivities(anchor: string): ManagementActivity[] {
  return [
    {
      id: "act_1",
      brandId: BRAND.id,
      locationId: "loc_mia",
      title: "Began South Beach conversion-tag audit",
      category: "tracking_repair",
      completedBy: "Alexis Romero",
      completedAt: addDays(anchor, -1),
      why: "PMax spend has no tracked conversions; verifying the OpenTable tag before any budget decision.",
      impact: "Prevents budget changes based on incomplete data.",
    },
    {
      id: "act_2",
      brandId: BRAND.id,
      locationId: "loc_ftl",
      title: "Added 14 negative keywords to Fort Lauderdale Search",
      category: "negative_keywords",
      completedBy: "Alexis Romero",
      completedAt: addDays(anchor, -3),
      why: "Search terms report showed spend on unrelated queries (jobs, recipes, other cities).",
      impact: "Expected to trim ~4% wasted spend and improve CTR.",
    },
    {
      id: "act_3",
      brandId: BRAND.id,
      locationId: "loc_ftl",
      title: "Weekly campaign review completed",
      category: "campaign_review",
      completedBy: "Alexis Romero",
      completedAt: addDays(anchor, -5),
      why: "Standing Tuesday review of pacing, search terms, and conversion health across both locations.",
      impact: "Identified the PMax tracking gap now in progress.",
    },
    {
      id: "act_4",
      brandId: BRAND.id,
      locationId: "loc_ftl",
      title: "Launched 'Summer on Las Olas' promotion creative",
      category: "creative_launch",
      completedBy: "Dana Whitfield",
      completedAt: addDays(anchor, -8),
      why: "Seasonal promotion planned on the marketing calendar for July–August.",
      impact: "Supports the reservation push during the slower summer weeks.",
    },
    {
      id: "act_5",
      brandId: BRAND.id,
      locationId: null,
      title: "September marketing calendar drafted",
      category: "calendar_planning",
      completedBy: "Dana Whitfield",
      completedAt: addDays(anchor, -9),
      why: "Planning window for fall promotions, including Greek Wine Night and private dining push.",
      impact: "Calendar ready for owner approval this week.",
    },
  ];
}

export function strategistNotes(anchor: string): StrategistNote[] {
  return [
    {
      id: "note_1",
      brandId: BRAND.id,
      author: "Alexis Romero",
      postedAt: addDays(anchor, -1),
      visibility: "client",
      status: "published",
      body: "Fort Lauderdale continues to be the engine — $2.30 per reservation is excellent for this market. My focus this week is confirming South Beach conversion tracking so we can judge PMax on real data, then we'll bring you a budget recommendation for the fall.",
    },
    {
      id: "note_2",
      brandId: BRAND.id,
      author: "Alexis Romero",
      postedAt: addDays(anchor, -12),
      visibility: "internal",
      status: "published",
      body: "Internal: hold off proposing Meta scale-up until PMax tag audit is done — don't want two open tracking questions at once.",
    },
  ];
}

export function notifications(anchor: string): AppNotification[] {
  return [
    {
      id: "ntf_1",
      category: "opportunity",
      title: "New opportunity: Fort Lauderdale budget headroom",
      body: "Alexis identified an estimated +40–60 reservations/mo opportunity.",
      at: `${addDays(anchor, -2)}T14:05:00Z`,
      read: false,
      href: "/dashboard",
    },
    {
      id: "ntf_2",
      category: "strategist_note",
      title: "Strategist note posted",
      body: "Alexis posted this week's account note.",
      at: `${addDays(anchor, -1)}T15:30:00Z`,
      read: false,
      href: "/dashboard",
    },
    {
      id: "ntf_3",
      category: "calendar_approval",
      title: "September calendar needs approval",
      body: "Greek Wine Night and 3 other items are awaiting your approval.",
      at: `${addDays(anchor, -1)}T09:12:00Z`,
      read: true,
      href: "/calendar",
    },
    {
      id: "ntf_4",
      category: "monthly_review",
      title: "The Month in Review is ready",
      body: "July's executive review is available to read and share.",
      at: `${addDays(anchor, -7)}T13:00:00Z`,
      read: true,
      href: "/reports/month-in-review",
    },
  ];
}

/* ------------------------------------------------------------- calendar --- */

export function calendarItems(anchor: string): CalendarItem[] {
  const d = (offset: number) => addDays(anchor, offset);
  return [
    {
      id: "cal_1",
      brandId: BRAND.id,
      locationIds: ["loc_ftl"],
      title: "Summer on Las Olas — prix fixe promotion",
      startDate: d(-8),
      endDate: d(12),
      timezone: "America/New_York",
      type: "promotion",
      status: "live",
      channels: ["Google Search", "Email", "Organic social"],
      details: "3-course prix fixe Sun–Thu, $59. Push reservations during slower summer weeks.",
      budgetCents: 60000,
      owner: "Dana Whitfield",
      linkedCampaignIds: ["cmp_ftl_search"],
    },
    {
      id: "cal_2",
      brandId: BRAND.id,
      locationIds: ["loc_mia"],
      title: "South Beach tracking verification",
      startDate: d(-1),
      endDate: d(4),
      timezone: "America/New_York",
      type: "internal_task",
      status: "in_production",
      channels: [],
      details: "Verify OpenTable conversion tag on booking flow before PMax budget decision.",
      budgetCents: null,
      owner: "Alexis Romero",
      linkedCampaignIds: ["cmp_sb_pmax"],
    },
    {
      id: "cal_3",
      brandId: BRAND.id,
      locationIds: ["loc_ftl", "loc_mia"],
      title: "Greek Wine Night",
      startDate: d(23),
      endDate: d(23),
      timezone: "America/New_York",
      type: "event",
      status: "planned",
      channels: ["Meta", "Email", "In-restaurant"],
      details: "Ticketed tasting with sommelier. Needs owner approval and creative by two weeks prior.",
      budgetCents: 90000,
      owner: "Dana Whitfield",
      linkedCampaignIds: [],
      notes: "Awaiting approval.",
    },
    {
      id: "cal_4",
      brandId: BRAND.id,
      locationIds: ["loc_ftl", "loc_mia"],
      title: "Greek Wine Night — creative due",
      startDate: d(9),
      endDate: d(9),
      timezone: "America/New_York",
      type: "creative_due",
      status: "scheduled",
      channels: [],
      details: "Menu card, Meta ad set, email hero image.",
      budgetCents: null,
      owner: "Dana Whitfield",
      linkedCampaignIds: [],
    },
    {
      id: "cal_5",
      brandId: BRAND.id,
      locationIds: ["loc_mia"],
      title: "New menu item: whole-roasted branzino",
      startDate: d(16),
      endDate: d(16),
      timezone: "America/New_York",
      type: "new_menu_item",
      status: "planned",
      channels: ["Organic social", "Email"],
      details: "Launch photography scheduled; feature in September email.",
      budgetCents: null,
      owner: "Georgios",
      linkedCampaignIds: [],
    },
    {
      id: "cal_6",
      brandId: BRAND.id,
      locationIds: ["loc_ftl"],
      title: "Labor Day weekend push",
      startDate: d(19),
      endDate: d(22),
      timezone: "America/New_York",
      type: "google_campaign",
      status: "planned",
      channels: ["Google Search"],
      details: "Seasonal ad copy + budget bump pending approval of the Fort Lauderdale budget opportunity.",
      budgetCents: 40000,
      owner: "Alexis Romero",
      linkedCampaignIds: ["cmp_ftl_search"],
    },
    {
      id: "cal_7",
      brandId: BRAND.id,
      locationIds: ["loc_ftl", "loc_mia"],
      title: "August email newsletter",
      startDate: d(2),
      endDate: d(2),
      timezone: "America/New_York",
      type: "email_sms",
      status: "scheduled",
      channels: ["Email"],
      details: "Prix fixe feature + wine night save-the-date.",
      budgetCents: null,
      owner: "Dana Whitfield",
      linkedCampaignIds: [],
    },
  ];
}

/* ---------------------------------------------------------------- users --- */

export const USERS: User[] = [
  {
    id: "user_georgios",
    name: "Georgios Stavros",
    email: "georgios@santorinibygeorgios.com",
    role: "admin",
    locationIds: null,
  },
  {
    id: "user_alexis",
    name: "Alexis Romero",
    email: "alexis@thepass.agency",
    role: "marketer",
    locationIds: null,
  },
  {
    id: "user_maria",
    name: "Maria Kostas",
    email: "maria@santorinibygeorgios.com",
    role: "location_manager",
    locationIds: ["loc_mia"],
  },
  {
    id: "user_viewer",
    name: "Sam Ellis",
    email: "sam@santorinibygeorgios.com",
    role: "viewer",
    locationIds: ["loc_ftl"],
  },
];

export const STRATEGIST = {
  name: "Alexis Romero",
  role: "Senior Marketing Strategist",
  email: "alexis@thepass.agency",
  phone: "(305) 555-0177",
};

/* ------------------------------------------------------- meta structure --- */

/**
 * Meta campaign → ad set → ad hierarchy for the demo Meta campaign, as
 * relative shares of the campaign's totals.
 */
export interface MetaAdSeed {
  adSet: string;
  ad: string;
  share: number;
}

export const META_STRUCTURE: MetaAdSeed[] = [
  { adSet: "Prospecting — South Beach 5mi", ad: "Terrace Sunset (video)", share: 0.38 },
  { adSet: "Prospecting — South Beach 5mi", ad: "Georgios Welcome (carousel)", share: 0.26 },
  { adSet: "Retargeting — Engaged 30d", ad: "Reserve Tonight (single image)", share: 0.36 },
];
