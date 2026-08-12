import { describe, expect, it } from "vitest";
import { distributeInteger, generateDailyFacts } from "@/lib/data/generate";
import {
  effectiveLocationIds,
  getCampaignRows,
  getConversionRows,
  getTotals,
} from "@/lib/data/demo";
import { CAMPAIGN_TOTALS, USERS } from "@/lib/data/seed";
import { DEFAULT_FILTERS } from "@/lib/filters";
import { resolvePreset } from "@/lib/dates";
import { toCsv } from "@/lib/csv";

const ANCHOR = "2026-08-12";
const LAST_30 = resolvePreset("last_30", ANCHOR); // 2026-07-13 → 2026-08-11

const admin = USERS.find((u) => u.role === "admin")!;
const locationManager = USERS.find((u) => u.role === "location_manager")!;

describe("distributeInteger", () => {
  it("always sums exactly to the total", () => {
    const weights = [1.3, 0.2, 2.8, 1.1, 0.6];
    for (const total of [0, 1, 7, 245, 22600, 56309]) {
      const parts = distributeInteger(total, weights);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(parts.every((p) => p >= 0)).toBe(true);
    }
  });
});

describe("generateDailyFacts", () => {
  it("is deterministic (idempotent re-sync produces identical rows)", () => {
    const totals = CAMPAIGN_TOTALS.cmp_ftl_search;
    const a = generateDailyFacts("cmp_ftl_search", totals, "2026-08-11");
    const b = generateDailyFacts("cmp_ftl_search", totals, "2026-08-11");
    expect(a).toEqual(b);
  });

  it("block 0 sums exactly to the seeded totals", () => {
    const totals = CAMPAIGN_TOTALS.cmp_ftl_search;
    const facts = generateDailyFacts("cmp_ftl_search", totals, "2026-08-11");
    const recent = facts.filter((f) => f.date >= "2026-07-13" && f.date <= "2026-08-11");
    expect(recent).toHaveLength(30);
    expect(recent.reduce((s, f) => s + f.spendCents, 0)).toBe(totals.spendCents);
    expect(recent.reduce((s, f) => s + f.impressions, 0)).toBe(totals.impressions);
    expect(recent.reduce((s, f) => s + f.clicks, 0)).toBe(totals.clicks);
    expect(recent.reduce((s, f) => s + f.conversions, 0)).toBe(totals.conversions);
  });
});

describe("demo data source — blueprint totals", () => {
  it("Last 30 Days KPI totals match Section 21 exactly", () => {
    const { totals, derived } = getTotals(admin, DEFAULT_FILTERS, LAST_30, ANCHOR);
    expect(totals.spendCents).toBe(63642);
    expect(totals.impressions).toBe(30281);
    expect(totals.clicks).toBe(1276);
    expect(totals.conversions).toBe(245);
    expect(totals.conversionValueCents).toBe(1225000);
    expect(totals.reach).toBe(689);
    expect(derived.ctr).toBeCloseTo(4.21, 1);
    expect(derived.costPerConversionCents! / 100).toBeCloseTo(2.6, 1);
    expect(derived.roas).toBeCloseTo(19.25, 2);
  });

  it("campaign rows equal the sum of their daily facts", () => {
    const rows = getCampaignRows(admin, DEFAULT_FILTERS, LAST_30, ANCHOR);
    const ftl = rows.find((r) => r.campaign.id === "cmp_ftl_search")!;
    expect(ftl.totals.spendCents).toBe(56309);
    expect(ftl.totals.conversions).toBe(245);
    expect(ftl.derived.costPerConversionCents! / 100).toBeCloseTo(2.3, 1);
    const pmax = rows.find((r) => r.campaign.id === "cmp_sb_pmax")!;
    expect(pmax.totals.conversions).toBe(0);
    expect(pmax.derived.costPerConversionCents).toBeNull(); // — not $0.00
  });

  it("Google rows never report Meta-style reach", () => {
    const rows = getCampaignRows(admin, DEFAULT_FILTERS, LAST_30, ANCHOR);
    for (const row of rows.filter((r) => r.campaign.platform === "google")) {
      expect(row.totals.reach).toBeNull();
    }
    const meta = rows.find((r) => r.campaign.platform === "meta")!;
    expect(meta.totals.reach).toBe(689);
  });

  it("platform filter narrows totals", () => {
    const { totals } = getTotals(
      admin,
      { ...DEFAULT_FILTERS, platform: "meta" },
      LAST_30,
      ANCHOR,
    );
    expect(totals.spendCents).toBe(949);
    expect(totals.reach).toBe(689);
  });
});

describe("authorization in the data layer", () => {
  it("location manager only sees their assigned location", () => {
    const ids = effectiveLocationIds(locationManager, DEFAULT_FILTERS);
    expect(ids).toEqual(["loc_mia"]);
    const rows = getCampaignRows(locationManager, DEFAULT_FILTERS, LAST_30, ANCHOR);
    expect(rows.every((r) => r.campaign.locationId === "loc_mia")).toBe(true);
    expect(rows.map((r) => r.campaign.id)).not.toContain("cmp_ftl_search");
  });

  it("requesting an unauthorized location silently narrows to the grant", () => {
    const ids = effectiveLocationIds(locationManager, {
      ...DEFAULT_FILTERS,
      locationIds: ["loc_ftl", "loc_mia"],
    });
    expect(ids).toEqual(["loc_mia"]);
  });

  it("conversion rows are scoped too", () => {
    const rows = getConversionRows(locationManager, DEFAULT_FILTERS, LAST_30, ANCHOR);
    expect(rows.every((r) => r.campaign.locationId === "loc_mia")).toBe(true);
  });
});

describe("csv", () => {
  it("escapes quotes/commas and exports missing metrics as empty cells", () => {
    const csv = toCsv(
      ["Name", "Cost per Conversion"],
      [
        ['Santorini "Georgios", FTL', null],
        ["Plain", 2.3],
      ],
    );
    expect(csv).toBe(
      'Name,Cost per Conversion\r\n"Santorini ""Georgios"", FTL",\r\nPlain,2.3',
    );
  });
});
