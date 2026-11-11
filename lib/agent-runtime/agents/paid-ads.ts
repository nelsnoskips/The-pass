import type { Sql } from "postgres";
import { NEVER_PAY_FOR } from "../../agents/searchTerms";
import { googleAdsMutate } from "../../ads/google-ads";
import { windowDates } from "../../ads/store";
import { log } from "../../reservations/repo";
import type { AgentSpec } from "../runner";
import { defineTool, type CheckResult } from "../tool";

/**
 * Paid Ads Agent: reads the last 30 days of real Google Ads and Meta
 * numbers (synced nightly into ad_daily), and proposes budget changes,
 * pauses and negative keywords on Google. Every write moves money, so
 * every one is approve-tier and needs approve_spend; the limits below are
 * enforced in code, whatever the model asks for.
 *
 * Findings are computed by fixed rules (the same thresholds as the
 * original rules agent), so each proposal traces back to numbers. The
 * model's job is to choose among them, size them within the limits, and
 * explain them plainly.
 */

/** Below this many results a cost per result is too noisy to move money on. */
export const MIN_RESULTS = 10;
/** Spend with no result that is worth a look. */
export const ZERO_RESULT_SPEND_CENTS = 2000;
/** Spending this share of budget, with good results, means budget-limited. */
export const BUDGET_LIMITED_SHARE = 0.9;
/** Clicks before a search term with no results is judged. */
export const MIN_CLICKS_FOR_NEGATIVE = 10;
/** Hard limits on one budget change. */
export const MAX_RAISE_SHARE = 0.5;
export const MAX_RAISE_CENTS = 10_000;
export const MIN_BUDGET_CENTS = 100;

export interface CampaignTotals {
  platform: "google" | "meta";
  campaignId: string;
  name: string;
  status: string | null;
  dailyBudgetCents: number | null;
  budgetShared: boolean;
  spendCents: number;
  clicks: number;
  conversions: number;
  conversionValueCents: number;
}

export interface TermTotals {
  campaignId: string;
  term: string;
  clicks: number;
  spendCents: number;
  conversions: number;
}

export type Finding =
  | { kind: "no_results"; campaignId: string; platform: string; name: string; spendCents: number; clicks: number }
  | { kind: "expensive"; campaignId: string; platform: string; name: string; costPerResultCents: number; bestName: string; bestCostPerResultCents: number; dailyBudgetCents: number | null }
  | { kind: "budget_limited"; campaignId: string; platform: string; name: string; avgDailySpendCents: number; dailyBudgetCents: number; costPerResultCents: number }
  | { kind: "wasted_term"; campaignId: string; term: string; clicks: number; spendCents: number; why: "never_pay_for" | "no_results" };

const words = (s: string) => ` ${s.toLowerCase().replace(/\s+/g, " ").trim()} `;

/** The rules. Pure, so the thresholds are tested without a database. */
export function findAdIssues(campaigns: CampaignTotals[], terms: TermTotals[], days: number): Finding[] {
  const out: Finding[] = [];
  const live = campaigns.filter((c) => c.status === "enabled" || c.status === "active");
  const cpa = (c: CampaignTotals) => (c.conversions >= MIN_RESULTS ? c.spendCents / c.conversions : null);

  for (const platform of ["google", "meta"] as const) {
    const measured = live.filter((c) => c.platform === platform && cpa(c) !== null).sort((a, b) => cpa(a)! - cpa(b)!);
    const best = measured[0];
    const median = measured.length ? cpa(measured[Math.floor(measured.length / 2)])! : null;
    for (const c of measured.slice(1)) {
      if (cpa(c)! >= cpa(best)! * 1.5) {
        out.push({ kind: "expensive", campaignId: c.campaignId, platform, name: c.name, costPerResultCents: Math.round(cpa(c)!),
          bestName: best.name, bestCostPerResultCents: Math.round(cpa(best)!), dailyBudgetCents: c.dailyBudgetCents });
      }
    }
    for (const c of measured) {
      const avg = c.spendCents / Math.max(1, days);
      if (c.dailyBudgetCents && avg >= c.dailyBudgetCents * BUDGET_LIMITED_SHARE && median !== null && cpa(c)! <= median) {
        out.push({ kind: "budget_limited", campaignId: c.campaignId, platform, name: c.name, avgDailySpendCents: Math.round(avg),
          dailyBudgetCents: c.dailyBudgetCents, costPerResultCents: Math.round(cpa(c)!) });
      }
    }
  }
  for (const c of live) {
    if (c.spendCents >= ZERO_RESULT_SPEND_CENTS && c.conversions === 0) {
      out.push({ kind: "no_results", campaignId: c.campaignId, platform: c.platform, name: c.name, spendCents: c.spendCents, clicks: c.clicks });
    }
  }
  for (const t of terms) {
    if (t.conversions > 0) continue; // never block a search that brought a guest
    const junk = NEVER_PAY_FOR.some((w) => words(t.term).includes(words(w)));
    if (junk || t.clicks >= MIN_CLICKS_FOR_NEGATIVE) {
      out.push({ kind: "wasted_term", campaignId: t.campaignId, term: t.term, clicks: t.clicks, spendCents: t.spendCents, why: junk ? "never_pay_for" : "no_results" });
    }
  }
  return out;
}

async function loadTotals(sql: Sql, orgId: string, since: string, until: string) {
  const campaigns = await sql<{ platform: "google" | "meta"; campaign_id: string; name: string; status: string | null; daily_budget_cents: string | null;
    budget_shared: boolean; spend: string; clicks: string; conv: string; value: string }[]>`
    select c.platform, c.campaign_id, c.name, c.status, c.daily_budget_cents, c.budget_shared,
      coalesce(sum(d.spend_cents), 0) as spend, coalesce(sum(d.clicks), 0) as clicks,
      coalesce(sum(d.conversions), 0) as conv, coalesce(sum(d.conversion_value_cents), 0) as value
    from ad_campaigns c
    left join ad_daily d on d.org_id = c.org_id and d.platform = c.platform and d.campaign_id = c.campaign_id
      and d.date between ${since} and ${until}
    where c.org_id = ${orgId}
    group by c.platform, c.campaign_id, c.name, c.status, c.daily_budget_cents, c.budget_shared`;
  // A term already blocked, or waiting for a decision, isn't found again.
  const terms = await sql<{ campaign_id: string; term: string; clicks: string; spend: string; conv: string }[]>`
    select t.campaign_id, t.term, sum(t.clicks) as clicks, sum(t.spend_cents) as spend, sum(t.conversions) as conv
    from ad_search_terms t
    where t.org_id = ${orgId}
      and not exists (select 1 from agent_proposals p where p.org_id = t.org_id and p.tool = 'add_negative_keyword'
                      and p.status in ('pending', 'executed') and p.input->>'campaign_id' = t.campaign_id and p.input->>'term' = t.term)
    group by t.campaign_id, t.term`;
  return {
    campaigns: campaigns.map((c): CampaignTotals => ({
      platform: c.platform, campaignId: c.campaign_id, name: c.name, status: c.status,
      dailyBudgetCents: c.daily_budget_cents === null ? null : Number(c.daily_budget_cents), budgetShared: c.budget_shared,
      spendCents: Number(c.spend), clicks: Number(c.clicks), conversions: Number(c.conv), conversionValueCents: Number(c.value),
    })),
    terms: terms.map((t): TermTotals => ({ campaignId: t.campaign_id, term: t.term, clicks: Number(t.clicks), spendCents: Number(t.spend), conversions: Number(t.conv) })),
  };
}

const review = defineTool<Record<string, never>>({
  name: "get_ad_review",
  description:
    "The last 30 days of the restaurant's ads: every campaign on Google and Meta with spend, clicks, results, cost per result and daily budget (all money in integer cents); the findings the rules flagged; bookings in The Pass by source for the same days; and changes already waiting for approval. Call this first.",
  inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
  tier: "auto",
  requires: "view",
  async run(ctx) {
    const { since, until } = windowDates(30, ctx.now);
    const { campaigns, terms } = await loadTotals(ctx.sql, ctx.tenant.orgId, since, until);
    const [bookings, pending] = await Promise.all([
      ctx.sql<{ source: string; n: string }[]>`
        select coalesce(source, 'unknown') as source, count(*) as n from reservations
        where org_id = ${ctx.tenant.orgId} and status not in ('cancelled')
          and starts_at >= ${since}::date and starts_at < ${until}::date + 1
        group by 1 order by 2 desc`,
      ctx.sql<{ tool: string; title: string }[]>`
        select tool, title from agent_proposals where org_id = ${ctx.tenant.orgId} and agent_id = 'paid_ads' and status = 'pending'`,
    ]);
    return {
      window: { since, until, days: 30 },
      campaigns: campaigns.map((c) => ({
        ...c, costPerResultCents: c.conversions ? Math.round(c.spendCents / c.conversions) : null,
        writable: c.platform === "google" && (c.status === "enabled"),
      })),
      findings: findAdIssues(campaigns, terms, 30),
      bookingsInThePass: Object.fromEntries(bookings.map((b) => [b.source, Number(b.n)])),
      waitingForApproval: pending,
      note: "Only Google campaigns can be changed from here. For Meta, describe what you'd change in your final summary.",
    };
  },
});

async function googleCampaign(sql: Sql, orgId: string, campaignId: string) {
  const [c] = await sql<{ account_id: string; name: string; status: string | null; daily_budget_cents: string | null; budget_ref: string | null; budget_shared: boolean }[]>`
    select account_id, name, status, daily_budget_cents, budget_ref, budget_shared from ad_campaigns
    where org_id = ${orgId} and platform = 'google' and campaign_id = ${campaignId}`;
  return c;
}

const setBudget = defineTool<{ campaign_id: string; campaign_name: string; from_cents: number; to_cents: number; rationale: string }>({
  name: "set_daily_budget",
  description:
    "Change one Google campaign's daily budget. from_cents must be its current budget as get_ad_review reported it. A raise is limited to 50% and $100/day per change; lowering is allowed down to $1/day. Cite the numbers behind it in rationale, in plain language for an owner.",
  inputSchema: {
    type: "object",
    properties: {
      campaign_id: { type: "string" },
      campaign_name: { type: "string", description: "The campaign's name exactly as get_ad_review reported it." },
      from_cents: { type: "integer" },
      to_cents: { type: "integer" },
      rationale: { type: "string" },
    },
    required: ["campaign_id", "campaign_name", "from_cents", "to_cents", "rationale"],
    additionalProperties: false,
  },
  tier: "approve",
  requires: "approve_spend",
  title: (i) => `${i.to_cents > i.from_cents ? "Raise" : "Lower"} ${i.campaign_name}: $${(i.from_cents / 100).toFixed(2)} → $${(i.to_cents / 100).toFixed(2)} a day`,
  async check(ctx, i): Promise<CheckResult> {
    const c = await googleCampaign(ctx.sql, ctx.tenant.orgId, String(i.campaign_id));
    if (!c) return { ok: false, reason: "Unknown Google campaign." };
    if (c.name !== i.campaign_name) return { ok: false, reason: `That campaign is called “${c.name}”.` };
    if (c.status !== "enabled") return { ok: false, reason: "That campaign isn't running." };
    if (!c.budget_ref || c.daily_budget_cents === null) return { ok: false, reason: "No budget is known for that campaign yet." };
    if (c.budget_shared) return { ok: false, reason: "That budget is shared with other campaigns; change it in Google Ads." };
    const current = Number(c.daily_budget_cents);
    // The budget moved since the proposal (someone changed it in Google).
    if (current !== i.from_cents) return { ok: false, reason: `The budget is now $${(current / 100).toFixed(2)}, not $${(i.from_cents / 100).toFixed(2)}.` };
    if (!Number.isInteger(i.to_cents) || i.to_cents < MIN_BUDGET_CENTS) return { ok: false, reason: "A daily budget must be at least $1." };
    if (i.to_cents === current) return { ok: false, reason: "That's the current budget." };
    if (i.to_cents > current && (i.to_cents > current * (1 + MAX_RAISE_SHARE) || i.to_cents - current > MAX_RAISE_CENTS)) {
      return { ok: false, reason: "A raise can be at most 50% and $100 a day in one change." };
    }
    return { ok: true };
  },
  async run(ctx, i) {
    const c = (await googleCampaign(ctx.sql, ctx.tenant.orgId, i.campaign_id))!;
    await googleAdsMutate(ctx.sql, ctx.tenant.orgId, "campaignBudgets", [
      { update: { resourceName: c.budget_ref, amountMicros: String(i.to_cents * 10_000) }, updateMask: "amount_micros" },
    ]);
    await ctx.sql`update ad_campaigns set daily_budget_cents = ${i.to_cents}, updated_at = now()
                  where org_id = ${ctx.tenant.orgId} and platform = 'google' and campaign_id = ${i.campaign_id}`;
    await log(ctx.sql, ctx.tenant.orgId, ctx.tenant.actor, "ads.budget_changed", "ad_campaign", i.campaign_id,
      { name: c.name, from_cents: i.from_cents, to_cents: i.to_cents });
    return { changed: true };
  },
});

const pause = defineTool<{ campaign_id: string; campaign_name: string; rationale: string }>({
  name: "pause_campaign",
  description:
    "Pause one Google campaign. Only for a campaign that has spent with no results after its conversion tracking has been checked, or one that is far costlier than the restaurant's other campaigns for the same thing. Say which in rationale.",
  inputSchema: {
    type: "object",
    properties: { campaign_id: { type: "string" }, campaign_name: { type: "string", description: "The campaign's name exactly as get_ad_review reported it." }, rationale: { type: "string" } },
    required: ["campaign_id", "campaign_name", "rationale"],
    additionalProperties: false,
  },
  tier: "approve",
  requires: "approve_spend",
  title: (i) => `Pause ${i.campaign_name} on Google`,
  async check(ctx, i): Promise<CheckResult> {
    const c = await googleCampaign(ctx.sql, ctx.tenant.orgId, String(i.campaign_id));
    if (!c) return { ok: false, reason: "Unknown Google campaign." };
    if (c.name !== i.campaign_name) return { ok: false, reason: `That campaign is called “${c.name}”.` };
    if (c.status !== "enabled") return { ok: false, reason: "That campaign isn't running." };
    return { ok: true };
  },
  async run(ctx, i) {
    const c = (await googleCampaign(ctx.sql, ctx.tenant.orgId, i.campaign_id))!;
    await googleAdsMutate(ctx.sql, ctx.tenant.orgId, "campaigns", [
      { update: { resourceName: `customers/${c.account_id}/campaigns/${i.campaign_id}`, status: "PAUSED" }, updateMask: "status" },
    ]);
    await ctx.sql`update ad_campaigns set status = 'paused', updated_at = now()
                  where org_id = ${ctx.tenant.orgId} and platform = 'google' and campaign_id = ${i.campaign_id}`;
    await log(ctx.sql, ctx.tenant.orgId, ctx.tenant.actor, "ads.campaign_paused", "ad_campaign", i.campaign_id, { name: c.name });
    return { paused: true };
  },
});

const negative = defineTool<{ campaign_id: string; campaign_name: string; term: string; match_type: "PHRASE" | "EXACT"; rationale: string }>({
  name: "add_negative_keyword",
  description:
    "Stop one Google campaign from showing for a search. Only for a term from get_ad_review's wasted_term findings, copied exactly. Use EXACT for that one search, PHRASE to block any search containing it (e.g. 'jobs'). Never for the restaurant's own name, cuisine or neighborhood.",
  inputSchema: {
    type: "object",
    properties: {
      campaign_id: { type: "string" },
      campaign_name: { type: "string", description: "The campaign's name exactly as get_ad_review reported it." },
      term: { type: "string" },
      match_type: { type: "string", enum: ["PHRASE", "EXACT"] },
      rationale: { type: "string" },
    },
    required: ["campaign_id", "campaign_name", "term", "match_type", "rationale"],
    additionalProperties: false,
  },
  tier: "approve",
  requires: "approve_spend",
  title: (i) => `Stop ${i.campaign_name} showing for “${i.term}”${i.match_type === "PHRASE" ? " (and searches containing it)" : ""}`,
  async check(ctx, i): Promise<CheckResult> {
    const c = await googleCampaign(ctx.sql, ctx.tenant.orgId, String(i.campaign_id));
    if (!c) return { ok: false, reason: "Unknown Google campaign." };
    if (c.name !== i.campaign_name) return { ok: false, reason: `That campaign is called “${c.name}”.` };
    // Only a search people actually made, in this campaign, that never
    // brought a result. The model can't invent a negative.
    const [t] = await ctx.sql<{ conv: string | null }[]>`
      select sum(conversions) as conv from ad_search_terms
      where org_id = ${ctx.tenant.orgId} and campaign_id = ${String(i.campaign_id)} and term = ${String(i.term)}`;
    if (t?.conv === null || t?.conv === undefined) return { ok: false, reason: "That search isn't in this campaign's search terms." };
    if (Number(t.conv) > 0) return { ok: false, reason: "That search has brought results; it won't be blocked." };
    const [org] = await ctx.sql<{ name: string }[]>`select name from orgs where id = ${ctx.tenant.orgId}`;
    const own = (org?.name ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (own.some((w) => words(String(i.term)).includes(` ${w} `))) return { ok: false, reason: "Never block a search for the restaurant's own name." };
    return { ok: true };
  },
  async run(ctx, i) {
    const c = (await googleCampaign(ctx.sql, ctx.tenant.orgId, i.campaign_id))!;
    await googleAdsMutate(ctx.sql, ctx.tenant.orgId, "campaignCriteria", [
      { create: { campaign: `customers/${c.account_id}/campaigns/${i.campaign_id}`, negative: true, keyword: { text: i.term, matchType: i.match_type } } },
    ]);
    await log(ctx.sql, ctx.tenant.orgId, ctx.tenant.actor, "ads.negative_added", "ad_campaign", i.campaign_id, { term: i.term, match: i.match_type });
    return { blocked: true };
  },
});

export const PAID_ADS_TOOLS = [review, setBudget, pause, negative];

export function paidAdsAgent(): AgentSpec {
  return {
    id: "paid_ads",
    name: "Paid Ads Agent",
    effort: "medium",
    maxTurns: 14,
    system: `You are the Paid Ads Agent for a restaurant, inside The Pass. Each run, call get_ad_review once, then propose the few changes that matter most. Every change waits for the owner's approval, so propose rather than ask.

How to decide:
- Work from the findings. Don't invent problems the numbers don't show, and don't propose anything for a campaign with too little data.
- no_results: if a campaign has spent with no tracked result, the likely cause is tracking, not the ads. Don't pause it on the first look; say in your summary that its conversion tracking should be checked. Pause only if the same campaign is already waiting or was reviewed before and is still at zero.
- expensive: lower its daily budget by about 20%, and say which campaign does the same job for less.
- budget_limited: raise its budget by about 20%, never beyond the tool's limits.
- wasted_term: block it with add_negative_keyword. PHRASE for intent no restaurant wants (jobs, recipes), EXACT for one specific search that didn't convert.
- Don't propose something already waiting for approval.
- At most five proposals per run. Fewer is better than noise.

Money is in integer cents in the data; write dollars for the owner. Rationale is for a restaurant owner: one or two sentences with the numbers that justify it. Results are what Google and Meta counted; never claim a booking came from an ad.

Finish with a short summary for the owner: what you proposed, anything on Meta you'd change (you can't change Meta yet), and any tracking to check.`,
    tools: PAID_ADS_TOOLS,
  };
}
