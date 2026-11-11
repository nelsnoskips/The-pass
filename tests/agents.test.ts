import { describe, expect, it } from "vitest";
import { getCampaignRows, getKeywords, getSearchTerms } from "@/lib/data/demo";
import { CAMPAIGNS, USERS } from "@/lib/data/seed";
import { DEFAULT_FILTERS } from "@/lib/filters";
import { resolvePreset } from "@/lib/dates";
import { runAgents, canActOnProposals } from "@/lib/agents";
import { paidAdsProposals } from "@/lib/agents/paidAds";
import { searchTermProposals } from "@/lib/agents/searchTerms";
import type { CampaignPerformanceRow, SearchTerm } from "@/lib/types";
import { derive } from "@/lib/metrics";

const ANCHOR = "2026-08-12";
const LAST_30 = resolvePreset("last_30", ANCHOR);
const admin = USERS.find((u) => u.role === "admin")!;
const viewer = USERS.find((u) => u.role === "viewer");
const name = (id: string) => CAMPAIGNS.find((c) => c.id === id)?.name ?? id;

function demoProposals() {
  return runAgents({
    rows: getCampaignRows(admin, DEFAULT_FILTERS, LAST_30, ANCHOR),
    range: LAST_30,
    terms: getSearchTerms(admin, DEFAULT_FILTERS, LAST_30, ANCHOR),
    keywords: getKeywords(admin, DEFAULT_FILTERS, LAST_30, ANCHOR),
    campaignName: name,
  });
}

function row(over: Partial<CampaignPerformanceRow["campaign"]>, t: Partial<CampaignPerformanceRow["totals"]>): CampaignPerformanceRow {
  const totals = { spendCents: 0, impressions: 1000, clicks: 100, reach: null, conversions: 0, conversionValueCents: 0, revenueBasis: "estimated" as const, ...t };
  return {
    campaign: { id: "c", brandId: "b", locationId: "loc", platform: "google", externalId: "1", name: "Brand | Loc | Search", type: "search", status: "active", dailyBudgetCents: 1000, objectiveLabel: "", ...over },
    locationName: "Loc",
    totals,
    derived: derive(totals),
  };
}

describe("Pass Agents on demo data", () => {
  it("is deterministic with stable, unique ids", () => {
    const a = demoProposals();
    const b = demoProposals();
    expect(a).toEqual(b);
    expect(new Set(a.map((p) => p.id)).size).toBe(a.length);
  });

  it("flags the zero-result PMax spend as a tracking check, not a pause", () => {
    const p = demoProposals().find((x) => x.id === "paid_ads:check_tracking:cmp_sb_pmax");
    expect(p).toBeDefined();
    expect(p!.impact).toBeNull();
  });

  it("is sorted highest score first", () => {
    const scores = demoProposals().map((p) => p.score);
    expect([...scores].sort((x, y) => y - x)).toEqual(scores);
  });
});

describe("paidAdsProposals", () => {
  it("shifts budget only within a location, from worse CPA to better", () => {
    const good = row({ id: "good", name: "B | L | Good" }, { spendCents: 30000, conversions: 100 });
    const bad = row({ id: "bad", name: "B | L | Bad" }, { spendCents: 30000, conversions: 20 });
    const other = row({ id: "other", locationId: "elsewhere", name: "B | X | Other" }, { spendCents: 30000, conversions: 10 });
    const out = paidAdsProposals([good, bad, other], LAST_30);
    const shifts = out.filter((p) => p.kind === "shift_budget");
    expect(shifts.map((p) => p.id)).toEqual(["paid_ads:shift_budget:bad->good"]);
  });

  it("does not move money on a CPA built from too few results", () => {
    const good = row({ id: "good" }, { spendCents: 3000, conversions: 9 });
    const bad = row({ id: "bad" }, { spendCents: 30000, conversions: 9 });
    expect(paidAdsProposals([good, bad], LAST_30).some((p) => p.kind === "shift_budget")).toBe(false);
  });

  it("proposes a raise only for a budget-limited, converting campaign", () => {
    const capped = row({ dailyBudgetCents: 1000 }, { spendCents: 29000, conversions: 50 });
    const roomy = row({ id: "r", dailyBudgetCents: 5000 }, { spendCents: 29000, conversions: 50 });
    expect(paidAdsProposals([capped], LAST_30).some((p) => p.kind === "raise_budget")).toBe(true);
    expect(paidAdsProposals([roomy], LAST_30).some((p) => p.kind === "raise_budget")).toBe(false);
  });

  it("ignores paused campaigns", () => {
    const paused = row({ status: "paused" }, { spendCents: 50000, conversions: 0 });
    expect(paidAdsProposals([paused], LAST_30)).toEqual([]);
  });
});

describe("searchTermProposals", () => {
  const term = (id: string, text: string, clicks: number, conversions: number, spendCents: number, keywordId: string | null = "kw"): SearchTerm => ({
    id, campaignId: "c", keywordId, text,
    metrics: { impressions: clicks * 10, clicks, spendCents, conversions, conversionValueCents: 0 },
  });

  it("blocks junk intent regardless of volume", () => {
    const out = searchTermProposals([term("t1", "greek restaurant jobs", 2, 0, 300)], [], name);
    expect(out[0].kind).toBe("add_negative");
    expect(out[0].confidence).toBe("high");
  });

  it("does not match junk words inside other words", () => {
    // "jobs" must not fire on "jobsite cafe"
    const out = searchTermProposals([term("t1", "jobsite cafe", 2, 1, 300)], [], name);
    expect(out).toEqual([]);
  });

  it("negates clicks that never convert, promotes converting non-keywords", () => {
    const out = searchTermProposals(
      [term("bad", "free greek food", 12, 0, 1500), term("good", "greek brunch las olas", 30, 8, 1600)],
      [],
      name,
    );
    expect(out.map((p) => p.kind).sort()).toEqual(["add_keyword", "add_negative"]);
  });

  it("does not promote a term that is already a keyword", () => {
    const out = searchTermProposals(
      [term("t", "greek food fort lauderdale", 30, 8, 1600)],
      [{ id: "kw", campaignId: "c", adGroup: "", text: "Greek food fort lauderdale", matchType: "phrase", status: "enabled", tags: [], metrics: { impressions: 0, clicks: 0, spendCents: 0, conversions: 0, conversionValueCents: 0 } }],
      name,
    );
    expect(out).toEqual([]);
  });
});

describe("canActOnProposals", () => {
  it("lets admins act and keeps viewers read-only", () => {
    expect(canActOnProposals(admin)).toBe(true);
    if (viewer) expect(canActOnProposals(viewer)).toBe(false);
  });
});

describe("search term promotion limits", () => {
  const term = (id: string, text: string, conversions: number, spendCents: number, keywordId: string | null): SearchTerm => ({
    id, campaignId: "c", keywordId, text,
    metrics: { impressions: 1000, clicks: 100, spendCents, conversions, conversionValueCents: 0 },
  });

  it("does not split out a matched term converting at the campaign's rate", () => {
    const terms = [term("a", "greek dinner", 10, 2000, "kw"), term("b", "greek lunch", 10, 2000, "kw")];
    expect(searchTermProposals(terms, [], name)).toEqual([]);
  });

  it("caps promotions per campaign", () => {
    const terms = Array.from({ length: 6 }, (_, i) => term(`u${i}`, `unmatched term ${i}`, 5, 1000, null));
    const out = searchTermProposals(terms, [], name);
    expect(out.filter((p) => p.kind === "add_keyword")).toHaveLength(3);
  });
});
