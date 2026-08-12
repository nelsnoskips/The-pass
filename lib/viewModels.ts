import type { CampaignTableRow } from "@/components/campaigns/CampaignTable";
import type { KpiCardData } from "@/components/overview/KpiCards";
import {
  formatCents,
  formatCount,
  formatMultiple,
  formatPercent,
} from "./format";
import { percentChange } from "./metrics";
import type {
  CampaignPerformanceRow,
  CampaignType,
  DerivedMetrics,
  MetricTotals,
} from "./types";

export const TYPE_LABELS: Record<CampaignType, string> = {
  search: "Search",
  performance_max: "Performance Max",
  meta_reservations: "Reservations",
  meta_traffic: "Traffic",
  meta_awareness: "Awareness",
};

export function platformLabel(platform: "google" | "meta"): string {
  return platform === "google" ? "Google" : "Meta";
}

export function toTableRows(rows: CampaignPerformanceRow[]): CampaignTableRow[] {
  return rows.map((r) => ({
    id: r.campaign.id,
    name: r.campaign.name,
    status: r.campaign.status,
    location: r.locationName,
    platform: platformLabel(r.campaign.platform),
    type: TYPE_LABELS[r.campaign.type],
    spendCents: r.totals.spendCents,
    impressions: r.totals.impressions,
    clicks: r.totals.clicks,
    reach: r.totals.reach,
    ctr: r.derived.ctr,
    conversions: r.totals.conversions,
    costPerConversionCents: r.derived.costPerConversionCents,
    conversionRate: r.derived.conversionRate,
    revenueCents: r.totals.conversionValueCents,
    roas: r.derived.roas,
  }));
}

export function revenueLabel(totals: MetricTotals): string {
  return totals.revenueBasis === "tracked"
    ? "Tracked Revenue"
    : totals.revenueBasis === "mixed"
      ? "Tracked + Estimated Revenue"
      : "Estimated Marketing Revenue";
}

interface PeriodMetrics {
  totals: MetricTotals;
  derived: DerivedMetrics;
}

/** The eight default KPI cards, with business-framed change direction. */
export function buildKpiCards(
  current: PeriodMetrics,
  previous: PeriodMetrics | null,
): KpiCardData[] {
  const c = current;
  const p = previous;
  const revLabel = revenueLabel(c.totals);
  return [
    {
      key: "spend",
      label: "Amount Spent",
      value: formatCents(c.totals.spendCents),
      change: percentChange(c.totals.spendCents, p?.totals.spendCents ?? null),
      direction: "neutral",
      definition: "Platform-reported advertising cost in the selected period.",
    },
    {
      key: "impressions",
      label: "Ad Views",
      value: formatCount(c.totals.impressions),
      change: percentChange(c.totals.impressions, p?.totals.impressions ?? null),
      direction: "higher_is_better",
      definition: "Number of times your ads were served (impressions).",
    },
    {
      key: "clicks",
      label: "Ad Clicks",
      value: formatCount(c.totals.clicks),
      change: percentChange(c.totals.clicks, p?.totals.clicks ?? null),
      direction: "higher_is_better",
      definition:
        "Platform link/ad clicks. Google counts ad clicks; Meta counts link clicks.",
    },
    {
      key: "ctr",
      label: "CTR",
      value: formatPercent(c.derived.ctr),
      change: percentChange(c.derived.ctr, p?.derived.ctr ?? null),
      direction: "higher_is_better",
      definition: "Clicks divided by impressions × 100.",
    },
    {
      key: "conversions",
      label: "Total Conversions",
      value: formatCount(c.totals.conversions),
      change: percentChange(c.totals.conversions, p?.totals.conversions ?? null),
      direction: "higher_is_better",
      definition:
        "Sum of included, mapped conversion actions (reservations, orders, calls…).",
    },
    {
      key: "costPerConversion",
      label: "Cost per Conversion",
      value: formatCents(c.derived.costPerConversionCents),
      change: percentChange(
        c.derived.costPerConversionCents,
        p?.derived.costPerConversionCents ?? null,
      ),
      direction: "lower_is_better",
      definition:
        "Spend divided by conversions. Shows — when there are no conversions; a cost per conversion doesn't exist without a conversion.",
    },
    {
      key: "revenue",
      label: "Marketing Revenue",
      value: formatCents(c.totals.conversionValueCents),
      change: percentChange(
        c.totals.conversionValueCents,
        p?.totals.conversionValueCents ?? null,
      ),
      direction: "higher_is_better",
      definition:
        "Sum of conversion value. Estimated values are modeled from configured per-conversion values, not POS revenue.",
      qualifier: revLabel === "Estimated Marketing Revenue" ? "Estimated" : undefined,
    },
    {
      key: "roas",
      label: "Return on Ad Spend",
      value: formatMultiple(c.derived.roas),
      change: percentChange(c.derived.roas, p?.derived.roas ?? null),
      direction: "higher_is_better",
      definition: "Marketing revenue divided by spend.",
      qualifier: revLabel === "Estimated Marketing Revenue" ? "Estimated" : undefined,
    },
  ];
}
