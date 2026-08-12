import type { CampaignPerformanceRow } from "./types";

/**
 * The Pass Score — a transparent 0–100 marketing health score.
 *
 * Never an unexplained proprietary number: each component carries its own
 * score, weight, and a plain-language reason, and the UI shows the complete
 * breakdown. Components are computed deterministically from the same scoped
 * data the rest of the dashboard uses.
 */

export interface ScoreComponent {
  key: string;
  label: string;
  /** 0–100 */
  score: number;
  /** Relative weight; weights sum to 1 across components. */
  weight: number;
  reason: string;
}

export interface PassScore {
  total: number;
  components: ScoreComponent[];
}

export function computePassScore(input: {
  rows: CampaignPerformanceRow[];
  conversionsChange: number | null;
  calendarPlannedCount: number;
  locationCount: number;
}): PassScore {
  const { rows, conversionsChange, calendarPlannedCount, locationCount } = input;

  const totalSpend = rows.reduce((s, r) => s + r.totals.spendCents, 0);
  const totalConversions = rows.reduce((s, r) => s + r.totals.conversions, 0);
  

  // 1. Conversion efficiency — blended cost per conversion vs. a $12
  //    restaurant benchmark (lower is better; $2.60 scores near 100).
  let efficiency = 0;
  let efficiencyReason = "No conversions recorded in this period.";
  if (totalConversions > 0 && totalSpend > 0) {
    const cpa = totalSpend / totalConversions / 100;
    efficiency = Math.max(0, Math.min(100, Math.round(100 - (cpa / 12) * 50)));
    efficiencyReason = `Blended cost per conversion is $${cpa.toFixed(2)} against a $12 benchmark for restaurant guest actions.`;
  }

  // 2. Growth — conversions vs. the comparison period.
  let growth = 50;
  let growthReason = "No comparison period selected.";
  if (conversionsChange !== null) {
    growth = Math.max(0, Math.min(100, Math.round(50 + conversionsChange * 2)));
    growthReason = `Conversions ${conversionsChange >= 0 ? "up" : "down"} ${Math.abs(conversionsChange).toFixed(1)}% vs. the comparison period.`;
  }

  // 3. Tracking health — share of spend in campaigns with tracked conversions.
  const spendWithTracking = rows
    .filter((r) => r.totals.conversions > 0)
    .reduce((s, r) => s + r.totals.spendCents, 0);
  const trackedShare = totalSpend > 0 ? spendWithTracking / totalSpend : 1;
  const tracking = Math.round(trackedShare * 100);
  const untrackedRows = rows.filter(
    (r) => r.totals.conversions === 0 && r.totals.spendCents > 0,
  );
  const trackingReason =
    untrackedRows.length > 0
      ? `${untrackedRows.length} campaign${untrackedRows.length > 1 ? "s are" : " is"} spending without a tracked conversion — verify tracking before scaling.`
      : "Every spending campaign has tracked conversions.";

  // 4. Budget pacing — campaigns spending far below budget can't learn.
  const paced = rows.filter((r) => {
    if (!r.campaign.dailyBudgetCents || r.totals.spendCents === 0) return false;
    const days = 30;
    return r.totals.spendCents / days >= r.campaign.dailyBudgetCents * 0.3;
  });
  const spendingRows = rows.filter((r) => r.totals.spendCents > 0);
  const pacing =
    spendingRows.length > 0
      ? Math.round((paced.length / spendingRows.length) * 100)
      : 50;
  const pacingReason =
    spendingRows.length - paced.length > 0
      ? `${spendingRows.length - paced.length} campaign${spendingRows.length - paced.length > 1 ? "s are" : " is"} pacing under 30% of daily budget.`
      : "All active campaigns are pacing against their budgets.";

  // 5. Campaign coverage — does every location have active spend?
  const coveredLocations = new Set(
    rows.filter((r) => r.totals.spendCents > 0).map((r) => r.campaign.locationId),
  );
  const coverage =
    locationCount > 0
      ? Math.round((Math.min(coveredLocations.size, locationCount) / locationCount) * 100)
      : 0;
  const coverageReason =
    coveredLocations.size >= locationCount
      ? "Every location has active campaigns."
      : `${locationCount - coveredLocations.size} location(s) without active campaign spend.`;

  // 6. Calendar readiness — upcoming planned marketing.
  const calendar = Math.max(0, Math.min(100, calendarPlannedCount * 25));
  const calendarReason =
    calendarPlannedCount > 0
      ? `${calendarPlannedCount} upcoming item${calendarPlannedCount > 1 ? "s" : ""} planned on the marketing calendar.`
      : "No upcoming marketing is planned on the calendar.";

  const components: ScoreComponent[] = [
    { key: "efficiency", label: "Conversion efficiency", score: efficiency, weight: 0.25, reason: efficiencyReason },
    { key: "growth", label: "Growth", score: growth, weight: 0.15, reason: growthReason },
    { key: "tracking", label: "Tracking health", score: tracking, weight: 0.25, reason: trackingReason },
    { key: "pacing", label: "Budget pacing", score: pacing, weight: 0.1, reason: pacingReason },
    { key: "coverage", label: "Campaign coverage", score: coverage, weight: 0.15, reason: coverageReason },
    { key: "calendar", label: "Calendar readiness", score: calendar, weight: 0.1, reason: calendarReason },
  ];

  const total = Math.round(
    components.reduce((sum, c) => sum + c.score * c.weight, 0),
  );
  return { total, components };
}

export function scoreLabel(total: number): string {
  if (total >= 80) return "Healthy";
  if (total >= 60) return "Solid, with open items";
  if (total >= 40) return "Needs attention";
  return "At risk";
}
