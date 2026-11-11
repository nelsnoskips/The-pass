import { formatCents, formatCount } from "../format";
import type { Keyword, SearchTerm } from "../types";
import type { AgentProposal } from "./types";

/**
 * Search Terms Agent: reads what guests actually typed and proposes
 * keyword and negative-keyword changes. Restaurant search accounts leak
 * money on terms like "jobs", "recipe" or a competitor's name, and miss
 * money on exact phrases guests already convert on.
 */

/** Clicks before a term with no results is judged. */
const MIN_CLICKS_FOR_NEGATIVE = 10;
/** Results before a term is worth its own keyword. */
const MIN_CONVERSIONS_FOR_KEYWORD = 3;
/** A term already served by a keyword must beat the campaign by this much
 *  to earn its own: at parity, splitting it out is busywork. */
const PROMOTE_IF_CPA_BELOW = 0.85;
/** Most promotions proposed per campaign, best first. */
const MAX_PROMOTIONS_PER_CAMPAIGN = 3;

/** Intent no restaurant ad should pay for, whatever the numbers say. */
export const NEVER_PAY_FOR = [
  "job", "jobs", "hiring", "career", "careers", "salary",
  "recipe", "recipes", "how to make", "calories", "nutrition",
  "menu prices pdf", "coupon code", "wholesale",
];

export function searchTermProposals(
  terms: SearchTerm[],
  keywords: Keyword[],
  campaignName: (id: string) => string,
): AgentProposal[] {
  const out: AgentProposal[] = [];
  const promotions: { campaignId: string; proposal: AgentProposal }[] = [];
  const keywordTexts = new Set(keywords.map((k) => normalize(k.text)));

  // Campaign-level cost per result, the bar a term has to clear.
  const campaignCpa = new Map<string, number | null>();
  for (const t of terms) {
    if (campaignCpa.has(t.campaignId)) continue;
    const inCampaign = terms.filter((x) => x.campaignId === t.campaignId);
    const spend = inCampaign.reduce((s, x) => s + x.metrics.spendCents, 0);
    const conv = inCampaign.reduce((s, x) => s + x.metrics.conversions, 0);
    campaignCpa.set(t.campaignId, conv > 0 ? spend / conv : null);
  }

  for (const t of terms) {
    const m = t.metrics;
    const text = normalize(t.text);
    const bar = campaignCpa.get(t.campaignId) ?? null;
    const cpa = m.conversions > 0 ? m.spendCents / m.conversions : null;
    const blocked = NEVER_PAY_FOR.find((w) => containsWord(text, w));

    // Negatives: junk intent, or clicks that never become guests.
    if (blocked || (m.clicks >= MIN_CLICKS_FOR_NEGATIVE && m.conversions === 0)) {
      out.push({
        id: `search_terms:add_negative:${t.id}`,
        agent: "search_terms",
        kind: "add_negative",
        title: `Stop paying for “${t.text}”`,
        rationale: blocked
          ? `“${blocked}” is not a guest looking for a table or an order.`
          : `${formatCount(m.clicks)} clicks and no reservation, order or call.`,
        action: `Add [${t.text}] as an exact-match negative in ${campaignName(t.campaignId)}.`,
        evidence: [
          { label: "Clicks", value: formatCount(m.clicks) },
          { label: "Spend", value: formatCents(m.spendCents) },
          { label: "Results", value: formatCount(m.conversions) },
        ],
        impact: m.spendCents > 0 ? `Saves about ${formatCents(m.spendCents)} per period to spend on terms that convert.` : null,
        confidence: blocked ? "high" : m.clicks >= 25 ? "high" : "medium",
        href: `/keywords?tab=terms`,
        score: 60 + Math.min(25, m.spendCents / 200),
      });
      continue;
    }

    // Promote: a converting term that isn't its own keyword yet.
    if (
      m.conversions >= MIN_CONVERSIONS_FOR_KEYWORD &&
      !keywordTexts.has(text) &&
      cpa !== null &&
      // Unmatched terms earn a keyword on results alone; matched ones only
      // when they clearly beat the campaign.
      (t.keywordId === null || bar === null || cpa <= bar * PROMOTE_IF_CPA_BELOW)
    ) {
      promotions.push({ campaignId: t.campaignId, proposal: {
        id: `search_terms:add_keyword:${t.id}`,
        agent: "search_terms",
        kind: "add_keyword",
        title: `Bid on “${t.text}” directly`,
        rationale: t.keywordId
          ? `Guests typing this convert at ${formatCents(cpa)} each, well under the campaign's ${formatCents(bar === null ? null : Math.round(bar))}, but it only shows through a looser keyword. Its own exact keyword gives it its own bid and its own ad.`
          : `It matched no keyword in the account yet produced ${formatCount(m.conversions)} results. Make it deliberate — unless it is another restaurant's name, in which case bidding on it is a choice to make on purpose, not by default.`,
        action: `Add [${t.text}] as an exact-match keyword in ${campaignName(t.campaignId)}.`,
        evidence: [
          { label: "Results", value: formatCount(m.conversions) },
          { label: "Cost / result", value: formatCents(cpa) },
          { label: "Campaign cost / result", value: formatCents(bar === null ? null : Math.round(bar)) },
        ],
        impact: `Protects ${formatCount(m.conversions)} results per period from match-type drift, and usually lowers their cost.`,
        confidence: t.keywordId !== null && m.conversions >= 10 ? "high" : "medium",
        href: `/keywords?tab=terms`,
        score: 40 + Math.min(30, m.conversions),
      } });
    }
  }

  // Cap promotions per campaign so one healthy account doesn't bury the
  // queue in near-identical cards.
  const perCampaign = new Map<string, number>();
  promotions.sort((a, b) => b.proposal.score - a.proposal.score);
  for (const { campaignId, proposal } of promotions) {
    const n = perCampaign.get(campaignId) ?? 0;
    if (n >= MAX_PROMOTIONS_PER_CAMPAIGN) continue;
    perCampaign.set(campaignId, n + 1);
    out.push(proposal);
  }

  return out;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function containsWord(text: string, word: string): boolean {
  return ` ${text} `.includes(` ${word} `);
}
