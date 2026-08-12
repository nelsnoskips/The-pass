/**
 * Normalized domain types for The Pass.
 *
 * Every data source — the seeded demo source and the future live Google Ads /
 * Meta Ads connectors — must return these types. Raw platform identifiers are
 * always stored as strings; money is stored in integer cents; metrics that a
 * platform does not support are `null`, never zero.
 */

export type Platform = "google" | "meta";

export type CampaignType =
  | "search"
  | "performance_max"
  | "meta_reservations"
  | "meta_traffic"
  | "meta_awareness";

export type CampaignStatus = "active" | "paused" | "ended" | "removed";

export type ConversionCategory =
  | "reservation"
  | "online_order"
  | "phone_call"
  | "direction_request"
  | "website_action"
  | "lead_form"
  | "coupon"
  | "other";

export type RevenueBasis = "estimated" | "tracked";

export interface Brand {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  weekStartsOn: 0 | 1;
  /** Default estimated value per conversion category, in cents. */
  defaultConversionValues: Partial<Record<ConversionCategory, number>>;
}

export interface Location {
  id: string;
  brandId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  timezone: string;
  phone: string;
  website: string;
  notes?: string;
}

export interface Campaign {
  id: string;
  brandId: string;
  /** null = unmapped; surfaces under "Unassigned" with an admin warning. */
  locationId: string | null;
  platform: Platform;
  /** Raw external identifier, always a string. */
  externalId: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  /** Daily budget in cents, when known. */
  dailyBudgetCents: number | null;
  objectiveLabel: string;
}

/**
 * One row of the daily campaign fact table. All ranges aggregate from these.
 * `date` is an ISO yyyy-mm-dd in the location's timezone.
 */
export interface DailyCampaignMetrics {
  campaignId: string;
  date: string;
  spendCents: number;
  impressions: number;
  clicks: number;
  /** Unique reach — Meta only. Google reports `null`, shown as `—`. */
  reach: number | null;
  conversions: number;
  /** Conversion value in cents with its basis preserved. */
  conversionValueCents: number;
  revenueBasis: RevenueBasis;
}

export interface Keyword {
  id: string;
  campaignId: string;
  adGroup: string;
  text: string;
  matchType: "exact" | "phrase" | "broad";
  status: "enabled" | "paused";
  /** Internal tags added in The Pass; never written back to Google Ads. */
  tags: string[];
  metrics: EntityMetrics;
}

export interface SearchTerm {
  id: string;
  campaignId: string;
  keywordId: string | null;
  text: string;
  metrics: EntityMetrics;
}

/** Google-provided PMax search category insight — explicitly not a keyword list. */
export interface PmaxSearchInsight {
  id: string;
  campaignId: string;
  category: string;
  impressions: number;
  clicks: number;
  conversions: number;
}

/** Period metrics attached to keyword/search-term rows (already scoped to range). */
export interface EntityMetrics {
  impressions: number;
  clicks: number;
  spendCents: number;
  conversions: number;
  conversionValueCents: number;
}

export interface ConversionAction {
  id: string;
  brandId: string;
  platform: Platform;
  /** Raw platform action name, preserved verbatim. */
  rawName: string;
  category: ConversionCategory;
  /** Fixed estimated value per conversion in cents, when configured. */
  estimatedValueCents: number | null;
  attributionWindow: string;
  includeInTotals: boolean;
}

/** Daily conversion facts broken down by action, per campaign. */
export interface DailyConversionMetrics {
  campaignId: string;
  conversionActionId: string;
  date: string;
  count: number;
  valueCents: number;
  revenueBasis: RevenueBasis;
}

export interface IntegrationConnection {
  id: string;
  brandId: string;
  platform: Platform;
  status: "connected" | "action_required" | "not_connected";
  accountName: string;
  accountExternalId: string;
  lastSyncAt: string | null;
  dataThrough: string | null;
  mode: "demo" | "live";
}

export interface SyncRun {
  id: string;
  connectionId: string;
  startedAt: string;
  finishedAt: string | null;
  status: "success" | "partial" | "failed" | "running";
  recordsUpserted: number;
  message: string;
}

export type CalendarItemType =
  | "promotion"
  | "holiday"
  | "event"
  | "new_menu_item"
  | "email_sms"
  | "organic_social"
  | "google_campaign"
  | "meta_campaign"
  | "creative_due"
  | "internal_task";

export type CalendarItemStatus =
  | "idea"
  | "planned"
  | "in_production"
  | "scheduled"
  | "live"
  | "completed"
  | "canceled";

export interface CalendarItem {
  id: string;
  brandId: string;
  locationIds: string[];
  title: string;
  startDate: string;
  endDate: string;
  timezone: string;
  type: CalendarItemType;
  status: CalendarItemStatus;
  channels: string[];
  details: string;
  budgetCents: number | null;
  owner: string;
  linkedCampaignIds: string[];
  notes?: string;
}

export type OpportunityStatus =
  | "new"
  | "reviewing"
  | "approved"
  | "in_progress"
  | "completed"
  | "dismissed";

export interface Opportunity {
  id: string;
  brandId: string;
  locationId: string | null;
  title: string;
  explanation: string;
  supportingMetric: string;
  estimatedImpact: string | null;
  recommendedAction: string;
  priority: "high" | "medium" | "low";
  owner: string;
  status: OpportunityStatus;
  href: string;
  createdAt: string;
}

export interface ManagementActivity {
  id: string;
  brandId: string;
  locationId: string | null;
  title: string;
  category:
    | "campaign_review"
    | "budget_change"
    | "negative_keywords"
    | "creative_launch"
    | "tracking_repair"
    | "calendar_planning"
    | "reporting_note";
  completedBy: string;
  completedAt: string;
  why: string;
  impact: string;
}

export interface StrategistNote {
  id: string;
  brandId: string;
  author: string;
  postedAt: string;
  visibility: "client" | "internal";
  status: "draft" | "published";
  body: string;
}

export interface AppNotification {
  id: string;
  category:
    | "sync_failure"
    | "opportunity"
    | "campaign_launched"
    | "goal_reached"
    | "calendar_approval"
    | "monthly_review"
    | "strategist_note";
  title: string;
  body: string;
  at: string;
  read: boolean;
  href: string;
}

/* ---------------------------------------------------------------- roles --- */

export type Role = "admin" | "marketer" | "location_manager" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** null = access to all brand locations. */
  locationIds: string[] | null;
}

/* ----------------------------------------------------------- aggregates --- */

/** KPI totals for a period. Derived rates live in `DerivedMetrics`. */
export interface MetricTotals {
  spendCents: number;
  impressions: number;
  clicks: number;
  /** null when no included row reports reach (e.g. Google-only scope). */
  reach: number | null;
  conversions: number;
  conversionValueCents: number;
  revenueBasis: RevenueBasis | "mixed";
}

export interface DerivedMetrics {
  /** Percent, e.g. 4.21 — null when impressions are 0. */
  ctr: number | null;
  /** Cents — null when clicks are 0. */
  cpcCents: number | null;
  /** Cents — null when conversions are 0 (shown as `—`, never $0.00). */
  costPerConversionCents: number | null;
  /** Percent — null when clicks are 0. */
  conversionRate: number | null;
  /** Multiple, e.g. 19.25 — null when spend is 0. */
  roas: number | null;
  /** Meta only — null when reach unavailable. */
  frequency: number | null;
}

export interface CampaignPerformanceRow {
  campaign: Campaign;
  locationName: string | null;
  totals: MetricTotals;
  derived: DerivedMetrics;
}

export interface SeriesPoint {
  date: string;
  spendCents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValueCents: number;
}
