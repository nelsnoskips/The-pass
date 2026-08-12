import { describe, expect, it } from "vitest";
import {
  changeSentiment,
  derive,
  emptyTotals,
  percentChange,
  sumDaily,
} from "@/lib/metrics";
import type { DailyCampaignMetrics } from "@/lib/types";

const day = (over: Partial<DailyCampaignMetrics>): DailyCampaignMetrics => ({
  campaignId: "c1",
  date: "2026-08-01",
  spendCents: 0,
  impressions: 0,
  clicks: 0,
  reach: null,
  conversions: 0,
  conversionValueCents: 0,
  revenueBasis: "estimated",
  ...over,
});

describe("derive", () => {
  it("computes the blueprint formulas", () => {
    const totals = {
      ...emptyTotals(),
      spendCents: 63642,
      impressions: 30281,
      clicks: 1276,
      conversions: 245,
      conversionValueCents: 1225000,
    };
    const d = derive(totals);
    expect(d.ctr).toBeCloseTo(4.21, 1);
    expect(d.costPerConversionCents).toBeCloseTo(259.76, 1);
    expect(d.roas).toBeCloseTo(19.25, 2);
    expect(d.conversionRate).toBeCloseTo(19.2, 1);
  });

  it("returns null (never zero) for ratios with zero denominators", () => {
    const d = derive(emptyTotals());
    expect(d.ctr).toBeNull();
    expect(d.cpcCents).toBeNull();
    expect(d.costPerConversionCents).toBeNull();
    expect(d.conversionRate).toBeNull();
    expect(d.roas).toBeNull();
    expect(d.frequency).toBeNull();
  });

  it("cost per conversion is null when spend exists but conversions are zero", () => {
    const d = derive({ ...emptyTotals(), spendCents: 6307, clicks: 124, impressions: 6825 });
    expect(d.costPerConversionCents).toBeNull();
  });
});

describe("sumDaily", () => {
  it("keeps reach null when no row reports reach", () => {
    const totals = sumDaily([day({ impressions: 10 }), day({ impressions: 5 })]);
    expect(totals.reach).toBeNull();
    expect(totals.impressions).toBe(15);
  });

  it("sums reach when present", () => {
    const totals = sumDaily([day({ reach: 100 }), day({ reach: 50 })]);
    expect(totals.reach).toBe(150);
  });
});

describe("percentChange", () => {
  it("handles zero and missing comparison values safely", () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(null, 10)).toBeNull();
    expect(percentChange(10, null)).toBeNull();
    expect(percentChange(120, 100)).toBeCloseTo(20);
    expect(percentChange(80, 100)).toBeCloseTo(-20);
  });
});

describe("changeSentiment", () => {
  it("treats rising cost per conversion as negative", () => {
    expect(changeSentiment(12, "lower_is_better")).toBe("negative");
    expect(changeSentiment(-12, "lower_is_better")).toBe("positive");
    expect(changeSentiment(12, "higher_is_better")).toBe("positive");
    expect(changeSentiment(null, "higher_is_better")).toBe("neutral");
    expect(changeSentiment(12, "neutral")).toBe("neutral");
  });
});
