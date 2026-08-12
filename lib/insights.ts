import { formatCents, formatPercent } from "./format";
import type { CampaignPerformanceRow } from "./types";

/**
 * Deterministic plain-language insights.
 *
 * Rules observe the scoped data and describe it — they never claim causation
 * and never assert revenue attribution beyond what the platform reported.
 */

export interface Insight {
  kind: "positive" | "warning" | "neutral";
  text: string;
}

export function buildInsights(rows: CampaignPerformanceRow[]): Insight[] {
  const insights: Insight[] = [];
  const totalSpend = rows.reduce((s, r) => s + r.totals.spendCents, 0);
  const totalConversions = rows.reduce((s, r) => s + r.totals.conversions, 0);

  // Search share of results vs share of spend.
  const search = rows.filter((r) => r.campaign.type === "search");
  const searchSpend = search.reduce((s, r) => s + r.totals.spendCents, 0);
  const searchConv = search.reduce((s, r) => s + r.totals.conversions, 0);
  if (totalConversions > 0 && totalSpend > 0 && search.length > 0 && search.length < rows.length) {
    const convShare = (searchConv / totalConversions) * 100;
    const spendShare = (searchSpend / totalSpend) * 100;
    insights.push({
      kind: "neutral",
      text: `Search campaigns generated ${convShare.toFixed(0)}% of conversions while using ${spendShare.toFixed(0)}% of spend.`,
    });
  }

  // Best cost per conversion by location.
  const byLocation = new Map<string, { spend: number; conversions: number }>();
  for (const r of rows) {
    if (!r.locationName) continue;
    const agg = byLocation.get(r.locationName) ?? { spend: 0, conversions: 0 };
    agg.spend += r.totals.spendCents;
    agg.conversions += r.totals.conversions;
    byLocation.set(r.locationName, agg);
  }
  let best: { name: string; cpa: number } | null = null;
  for (const [name, agg] of byLocation) {
    if (agg.conversions === 0) continue;
    const cpa = agg.spend / agg.conversions;
    if (!best || cpa < best.cpa) best = { name, cpa };
  }
  if (best && byLocation.size > 1) {
    insights.push({
      kind: "positive",
      text: `${best.name} had the lowest cost per conversion at ${formatCents(best.cpa)}.`,
    });
  }

  // Spend without tracked conversions — tracking warning, not a verdict.
  for (const r of rows) {
    if (r.totals.spendCents >= 2000 && r.totals.conversions === 0) {
      insights.push({
        kind: "warning",
        text: `${shortName(r)} spent ${formatCents(r.totals.spendCents)} without a tracked conversion. Confirm conversion tracking before changing budget.`,
      });
    }
  }

  // Standout CTR.
  const withCtr = rows.filter((r) => r.derived.ctr !== null && r.totals.impressions > 500);
  const top = withCtr.sort((a, b) => (b.derived.ctr ?? 0) - (a.derived.ctr ?? 0))[0];
  if (top && (top.derived.ctr ?? 0) > 3) {
    insights.push({
      kind: "positive",
      text: `${shortName(top)} is earning a ${formatPercent(top.derived.ctr)} click-through rate — well above typical restaurant search benchmarks.`,
    });
  }

  // Tiny-budget campaigns that can't learn.
  for (const r of rows) {
    if (r.totals.spendCents > 0 && r.totals.spendCents < 1500 && r.campaign.platform === "meta") {
      insights.push({
        kind: "neutral",
        text: `${shortName(r)} spent only ${formatCents(r.totals.spendCents)} this period — too little for Meta's delivery system to optimize.`,
      });
    }
  }

  return insights.slice(0, 5);
}

function shortName(row: CampaignPerformanceRow): string {
  const parts = row.campaign.name.split("|").map((p) => p.trim());
  return parts.length >= 3 ? `${parts[1]} ${parts[2]}` : row.campaign.name;
}
