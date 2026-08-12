import type {
  DailyCampaignMetrics,
  DerivedMetrics,
  MetricTotals,
} from "./types";

/**
 * Metric formulas from the blueprint (Section 14). Every ratio returns `null`
 * — rendered as `—` — when its denominator is zero. Nothing here fabricates a
 * zero for an unsupported or undefined value.
 */

export function emptyTotals(): MetricTotals {
  return {
    spendCents: 0,
    impressions: 0,
    clicks: 0,
    reach: null,
    conversions: 0,
    conversionValueCents: 0,
    revenueBasis: "estimated",
  };
}

/** Aggregate daily fact rows into period totals. */
export function sumDaily(rows: DailyCampaignMetrics[]): MetricTotals {
  const totals = emptyTotals();
  const bases = new Set<string>();
  for (const row of rows) {
    totals.spendCents += row.spendCents;
    totals.impressions += row.impressions;
    totals.clicks += row.clicks;
    totals.conversions += row.conversions;
    totals.conversionValueCents += row.conversionValueCents;
    if (row.reach !== null) {
      totals.reach = (totals.reach ?? 0) + row.reach;
    }
    if (row.conversionValueCents > 0) bases.add(row.revenueBasis);
  }
  totals.revenueBasis =
    bases.size > 1 ? "mixed" : bases.has("tracked") ? "tracked" : "estimated";
  return totals;
}

export function derive(totals: MetricTotals): DerivedMetrics {
  const { spendCents, impressions, clicks, conversions, reach } = totals;
  return {
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpcCents: clicks > 0 ? spendCents / clicks : null,
    costPerConversionCents: conversions > 0 ? spendCents / conversions : null,
    conversionRate: clicks > 0 ? (conversions / clicks) * 100 : null,
    roas: spendCents > 0 ? totals.conversionValueCents / spendCents : null,
    frequency:
      reach !== null && reach > 0 ? impressions / reach : null,
  };
}

/**
 * Percentage change between a current and comparison value.
 * Returns `null` when no meaningful comparison exists (missing or zero base).
 */
export function percentChange(
  current: number | null,
  previous: number | null,
): number | null {
  if (current === null || previous === null) return null;
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type MetricDirection = "higher_is_better" | "lower_is_better" | "neutral";

/**
 * Business framing for a change: an increase in cost per conversion is bad,
 * an increase in conversions is good. Never color every increase green.
 */
export function changeSentiment(
  change: number | null,
  direction: MetricDirection,
): "positive" | "negative" | "neutral" {
  if (change === null || change === 0 || direction === "neutral") return "neutral";
  const improved = direction === "higher_is_better" ? change > 0 : change < 0;
  return improved ? "positive" : "negative";
}

export const METRIC_DIRECTIONS: Record<string, MetricDirection> = {
  spend: "neutral",
  impressions: "higher_is_better",
  clicks: "higher_is_better",
  ctr: "higher_is_better",
  conversions: "higher_is_better",
  costPerConversion: "lower_is_better",
  cpc: "lower_is_better",
  conversionRate: "higher_is_better",
  revenue: "higher_is_better",
  roas: "higher_is_better",
  reach: "higher_is_better",
  frequency: "neutral",
};
