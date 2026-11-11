import { daySpan, type DateRange } from "../dates";
import { formatCents, formatCount, formatMultiple } from "../format";
import type { CampaignPerformanceRow } from "../types";
import type { AgentProposal } from "./types";

/**
 * Paid Ads Agent: watches spend against results across every campaign in
 * scope and proposes budget and structure changes.
 *
 * Thresholds are deliberately conservative. A restaurant account is small;
 * a rule that fires on noise teaches the owner to ignore the queue.
 */

/** Below this many conversions a CPA is too noisy to move money on. */
const MIN_CONVERSIONS_FOR_CPA = 10;
/** Spend with no tracked result that is worth a look. */
const ZERO_CONVERSION_SPEND_CENTS = 2000;
/** Meta needs room to learn; below this per period it can't. */
const META_LEARNING_FLOOR_CENTS = 1500;
/** Share of daily budget a campaign must spend to count as budget-limited. */
const BUDGET_LIMITED_SHARE = 0.9;
/** Share of daily budget below which a campaign is under-delivering. */
const UNDER_DELIVERY_SHARE = 0.2;
/** Fraction of a weaker campaign's budget proposed to move. */
const SHIFT_FRACTION = 0.2;

export function paidAdsProposals(
  rows: CampaignPerformanceRow[],
  range: DateRange,
): AgentProposal[] {
  const days = Math.max(1, daySpan(range));
  const active = rows.filter((r) => r.campaign.status === "active");
  const out: AgentProposal[] = [];

  // 1. Shift budget from a weaker to a stronger campaign — same location
  //    only. Moving money between rooms is an owner's call, not an agent's.
  const byLocation = groupBy(active, (r) => r.campaign.locationId ?? "none");
  for (const group of byLocation.values()) {
    const measured = group.filter(
      (r) =>
        r.totals.conversions >= MIN_CONVERSIONS_FOR_CPA &&
        r.derived.costPerConversionCents !== null &&
        r.campaign.dailyBudgetCents !== null,
    );
    if (measured.length < 2) continue;
    const sorted = [...measured].sort(
      (a, b) => a.derived.costPerConversionCents! - b.derived.costPerConversionCents!,
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const bestCpa = best.derived.costPerConversionCents!;
    const worstCpa = worst.derived.costPerConversionCents!;
    if (worstCpa < bestCpa * 1.5) continue;

    const shiftDaily = Math.round(worst.campaign.dailyBudgetCents! * SHIFT_FRACTION);
    const shift30 = shiftDaily * 30;
    const gained = shift30 / bestCpa - shift30 / worstCpa;
    out.push({
      id: `paid_ads:shift_budget:${worst.campaign.id}->${best.campaign.id}`,
      agent: "paid_ads",
      kind: "shift_budget",
      title: `Move ${formatCents(shiftDaily)}/day from ${short(worst)} to ${short(best)}`,
      rationale: `Both campaigns serve ${worst.locationName ?? "the same location"}. ${short(best)} is producing results at ${formatCents(bestCpa)} each; ${short(worst)} at ${formatCents(worstCpa)}.`,
      action: `Lower ${worst.campaign.name} daily budget ${formatCents(worst.campaign.dailyBudgetCents)} → ${formatCents(worst.campaign.dailyBudgetCents! - shiftDaily)}; raise ${best.campaign.name} ${formatCents(best.campaign.dailyBudgetCents)} → ${formatCents(best.campaign.dailyBudgetCents! + shiftDaily)}.`,
      evidence: [
        { label: `${short(best)} cost / result`, value: formatCents(bestCpa) },
        { label: `${short(worst)} cost / result`, value: formatCents(worstCpa) },
      ],
      impact: `About ${Math.max(0, Math.round(gained))} more guest actions over 30 days at the same total spend, if current rates hold.`,
      confidence: Math.min(best.totals.conversions, worst.totals.conversions) >= 30 ? "high" : "medium",
      href: `/campaigns/${worst.campaign.id}`,
      score: 80 + Math.min(15, gained),
    });
  }

  for (const r of active) {
    const budget = r.campaign.dailyBudgetCents;
    const dailySpend = r.totals.spendCents / days;

    // 2. A converting campaign that is spending its whole budget is leaving
    //    guests on the table.
    if (
      budget !== null &&
      dailySpend >= budget * BUDGET_LIMITED_SHARE &&
      r.totals.conversions >= MIN_CONVERSIONS_FOR_CPA &&
      r.derived.costPerConversionCents !== null
    ) {
      const raise = Math.round(budget * 0.2);
      out.push({
        id: `paid_ads:raise_budget:${r.campaign.id}`,
        agent: "paid_ads",
        kind: "raise_budget",
        title: `Raise ${short(r)} budget by ${formatCents(raise)}/day`,
        rationale: `It is spending ${Math.round((dailySpend / budget) * 100)}% of its daily budget and producing results at ${formatCents(r.derived.costPerConversionCents)} each. It is likely being held back by budget, not demand.`,
        action: `Daily budget ${formatCents(budget)} → ${formatCents(budget + raise)}.`,
        evidence: [
          { label: "Avg daily spend", value: formatCents(Math.round(dailySpend)) },
          { label: "Daily budget", value: formatCents(budget) },
          { label: "Return on ad spend", value: formatMultiple(r.derived.roas) },
        ],
        impact: `Up to ${Math.round((raise * 30) / r.derived.costPerConversionCents)} more guest actions over 30 days if the extra spend converts at today's rate (it usually converts a little worse).`,
        confidence: "medium",
        href: `/campaigns/${r.campaign.id}`,
        score: 75,
      });
    }

    // 3. Spend with no tracked result: check tracking before touching money.
    if (r.totals.spendCents >= ZERO_CONVERSION_SPEND_CENTS && r.totals.conversions === 0) {
      out.push({
        id: `paid_ads:check_tracking:${r.campaign.id}`,
        agent: "paid_ads",
        kind: "check_tracking",
        title: `Verify conversion tracking on ${short(r)}`,
        rationale: `${formatCents(r.totals.spendCents)} spent and ${formatCount(r.totals.clicks)} clicks with no tracked guest action. That is either a tracking gap or a campaign that isn't working — the fix is different, so tracking comes first.`,
        action: `Confirm the reservation, order and call conversion actions are attached to ${r.campaign.name}. If tracking is sound after 7 more days, pause it and move its ${budget === null ? "budget" : `${formatCents(budget)}/day`} to the best-performing campaign.`,
        evidence: [
          { label: "Spend", value: formatCents(r.totals.spendCents) },
          { label: "Clicks", value: formatCount(r.totals.clicks) },
          { label: "Tracked results", value: "0" },
        ],
        impact: null,
        confidence: "high",
        href: `/campaigns/${r.campaign.id}`,
        score: 70 + Math.min(20, r.totals.spendCents / 1000),
      });
    }

    // 4. Meta campaigns too small to exit learning.
    if (
      r.campaign.platform === "meta" &&
      r.totals.spendCents > 0 &&
      r.totals.spendCents < META_LEARNING_FLOOR_CENTS
    ) {
      out.push({
        id: `paid_ads:consolidate:${r.campaign.id}`,
        agent: "paid_ads",
        kind: "consolidate",
        title: `Give ${short(r)} enough budget to learn, or fold it in`,
        rationale: `It spent ${formatCents(r.totals.spendCents)} this period. Meta's delivery needs around 50 results a week per ad set to optimize; at this spend it is guessing.`,
        action: `Either raise the daily budget to at least $15/day for a 14-day test, or pause it and fold the audience into an existing ad set.`,
        evidence: [
          { label: "Spend", value: formatCents(r.totals.spendCents) },
          { label: "Daily budget", value: formatCents(budget) },
        ],
        impact: null,
        confidence: "medium",
        href: `/campaigns/${r.campaign.id}`,
        score: 50,
      });
    }

    // 5. Google campaigns spending a sliver of budget: the targeting is too
    //    narrow to find anyone, not too expensive.
    if (
      r.campaign.platform === "google" &&
      budget !== null &&
      dailySpend < budget * UNDER_DELIVERY_SHARE &&
      r.totals.spendCents < ZERO_CONVERSION_SPEND_CENTS
    ) {
      out.push({
        id: `paid_ads:under_delivery:${r.campaign.id}`,
        agent: "paid_ads",
        kind: "consolidate",
        title: `${short(r)} is barely serving — widen what it targets`,
        rationale: `It is spending ${formatCents(Math.round(dailySpend))} of a ${formatCents(budget)} daily budget (${pct(dailySpend / budget)}). Too few searches match its keywords for it to show.`,
        action: `Add phrase-match cuisine and neighborhood keywords (e.g. the ones converting at the other location), and confirm location targeting isn't set to "presence" only.`,
        evidence: [
          { label: "Avg daily spend", value: formatCents(Math.round(dailySpend)) },
          { label: "Daily budget", value: formatCents(budget) },
          { label: "Impressions", value: formatCount(r.totals.impressions) },
        ],
        impact: null,
        confidence: "medium",
        href: `/campaigns/${r.campaign.id}`,
        score: 45,
      });
    }
  }

  return out;
}

function pct(ratio: number): string {
  const v = ratio * 100;
  return v < 1 ? "under 1%" : `${Math.round(v)}%`;
}

export function short(row: CampaignPerformanceRow): string {
  const parts = row.campaign.name.split("|").map((p) => p.trim());
  return parts.length >= 3 ? `${parts[1]} ${parts[2]}` : row.campaign.name;
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    m.set(k, [...(m.get(k) ?? []), it]);
  }
  return m;
}
