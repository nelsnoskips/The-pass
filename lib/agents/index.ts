import type { DateRange } from "../dates";
import type { CampaignPerformanceRow, Keyword, SearchTerm, User } from "../types";
import { paidAdsProposals } from "./paidAds";
import { searchTermProposals } from "./searchTerms";
import type { AgentDefinition, AgentId, AgentProposal } from "./types";

export * from "./types";

/**
 * The roster. "planned" agents are listed so the team and clients can see
 * where the platform is going; they produce nothing until built, and the UI
 * says so plainly.
 */
export const AGENTS: AgentDefinition[] = [
  {
    id: "paid_ads",
    name: "Paid Ads Agent",
    summary: "Moves budget toward the campaigns that seat guests, and flags spend that isn't.",
    watches: "Google Ads + Meta spend, budgets, results",
    status: "live",
  },
  {
    id: "search_terms",
    name: "Search Terms Agent",
    summary: "Reads what guests actually searched. Blocks the waste, bids on the winners.",
    watches: "Search terms, keywords, match types",
    status: "live",
  },
  {
    id: "local_seo",
    name: "Local SEO Agent",
    summary: "Keeps your Google Business Profile complete, current and answering questions.",
    watches: "Google Business Profile, reviews, local rankings",
    status: "planned",
  },
  {
    id: "website",
    name: "Website Agent",
    summary: "Edit your site by describing the change: menus, hours, specials, events.",
    watches: "Your Pass-built website",
    status: "planned",
  },
  {
    id: "guest_marketing",
    name: "Guest Marketing Agent",
    summary: "Email and SMS to the right regulars at the right time, from your own guest list.",
    watches: "Reservations, orders, guest list",
    status: "planned",
  },
  {
    id: "guest_support",
    name: "Guest Support Agent",
    summary: "Answers guest questions on your site and texts — hours, parking, allergens, bookings.",
    watches: "Website chat, SMS",
    status: "planned",
  },
];

export function agentById(id: AgentId): AgentDefinition {
  return AGENTS.find((a) => a.id === id)!;
}

/** Who may approve or dismiss a proposal. Viewers and location managers
 *  can read the queue; changing spend is the marketer's or admin's call. */
export function canActOnProposals(user: User): boolean {
  return user.role === "admin" || user.role === "marketer";
}

export function runAgents(input: {
  rows: CampaignPerformanceRow[];
  range: DateRange;
  terms: SearchTerm[];
  keywords: Keyword[];
  campaignName: (id: string) => string;
}): AgentProposal[] {
  return [
    ...paidAdsProposals(input.rows, input.range),
    ...searchTermProposals(input.terms, input.keywords, input.campaignName),
  ].sort((a, b) => b.score - a.score);
}
