import { describe, expect, it } from "vitest";
import { toolsForPlan, planNote } from "@/lib/assistant";
import {
  FEATURE_INFO, foundingApplies, includes, notIncludedReason, planIncluding, stationFeature, type OrgPlan,
} from "@/lib/billing/entitlements";
import {
  dollars, FEATURES, FEE_PROMISES, PLANS, planPriceCents, smsCostCents, STATIONS, textsIncluded,
} from "@/lib/billing/plans";
import { invoicePreview, marketingWarning, monthIn, overage, projectTexts } from "@/lib/billing/usage";

const org = (plan: OrgPlan["plan"], extra: Partial<OrgPlan> = {}): OrgPlan => ({
  plan, founding: false, foundingLockedUntil: null, locations: 1, startedAt: null, updatedBy: null, updatedAt: null, isDefault: false, ...extra,
});

describe("plans", () => {
  it("prices and allowances match docs/company/04", () => {
    expect(PLANS.host).toMatchObject({ listCents: 19_900, foundingCents: 14_900, textsIncluded: 500 });
    expect(PLANS.the_pass).toMatchObject({ listCents: 59_900, foundingCents: 44_900, textsIncluded: 2_000 });
    expect(PLANS.group).toMatchObject({ listCents: 59_900, minLocations: 5 });
  });

  it("the includes matrix: Host is the dining room; The Pass and Group are everything", () => {
    for (const f of FEATURES) {
      expect(includes("host", f)).toBe(false);
      expect(includes("the_pass", f)).toBe(true);
      expect(includes("group", f)).toBe(true);
    }
    expect(STATIONS.filter((s) => includes("host", `station:${s}`))).toEqual(["reservations", "website"]);
    expect(STATIONS.every((s) => includes("the_pass", `station:${s}`) && includes("group", `station:${s}`))).toBe(true);
    expect(planIncluding("station:website")).toBe("host");
    expect(planIncluding("ordering")).toBe("the_pass");
    expect(stationFeature("paid_ads")).toBe("station:paid_ads");
    expect(stationFeature("assistant")).toBeNull();
    // Every feature has words for people.
    for (const f of [...FEATURES, ...STATIONS.map((s) => `station:${s}` as const)]) expect(FEATURE_INFO[f].does.length).toBeGreaterThan(20);
    expect(notIncludedReason("ordering")).toBe("Online ordering comes with The Pass plan. This restaurant is on Host, so it's switched off — nothing has been deleted.");
  });

  it("additional locations are 20% off; founding prices apply until the lock date", () => {
    expect(planPriceCents("the_pass", 1, false)).toEqual({ grossCents: 59_900, discountCents: 0, netCents: 59_900 });
    expect(planPriceCents("the_pass", 3, false)).toEqual({ grossCents: 179_700, discountCents: 23_960, netCents: 155_740 });
    expect(planPriceCents("host", 2, true)).toEqual({ grossCents: 29_800, discountCents: 2_980, netCents: 26_820 });
    expect(foundingApplies({ founding: true, foundingLockedUntil: "2028-11-30" }, "2028-11-01")).toBe(true);
    expect(foundingApplies({ founding: true, foundingLockedUntil: "2028-11-30" }, "2028-12-01")).toBe(false);
    expect(foundingApplies({ founding: false, foundingLockedUntil: null }, "2026-11-01")).toBe(false);
    expect(textsIncluded("the_pass", 3)).toBe(6_000);
  });

  it("texts over the allowance are billed at cost (~$0.013 each)", () => {
    expect(smsCostCents(240)).toBe(312);
    expect(overage(2_240, 2_000)).toEqual({ over: 240, cents: 312 });
    expect(overage(1_999, 2_000)).toEqual({ over: 0, cents: 0 });
    expect(projectTexts(600, { daysElapsed: 10, daysInMonth: 30 })).toBe(1_800);
    expect(dollars(312)).toBe("$3.12");
    expect(dollars(155_740)).toBe("$1,557.40");
    expect(dollars(-23_960)).toBe("−$239.60");
    expect(FEE_PROMISES.map((f) => f.t)).toContain("No per-cover fees");
  });

  it("the campaign warning counts only the texts that go over, and never blocks", () => {
    expect(marketingWarning(340, 1_900, 2_000)).toMatchObject({ over: 240, cents: 312, text: "~240 texts over your 2,000 — about $3.12 at cost." });
    expect(marketingWarning(100, 1_900, 2_000)).toBeNull();
    expect(marketingWarning(50, 2_100, 2_000)).toMatchObject({ over: 50, cents: 65 });
    expect(marketingWarning(50, 2_100, 2_000)!.text).toMatch(/already past your 2,000/);
  });

  it("the invoice preview: plan × locations, the discount, text overage at cost, card processing not ours", () => {
    const month = { label: "November 2026", firstDay: "2026-11-01" };
    const inv = invoicePreview(org("the_pass", { locations: 3, founding: true, foundingLockedUntil: "2028-11-30" }), 6_240, month);
    expect(inv.unitCents).toBe(44_900);
    expect(inv.founding).toBe(true);
    expect(inv.lines.map((l) => [l.label, l.cents])).toEqual([
      ["The Pass plan × 3 locations", 134_700],
      ["Additional-location discount", -17_960],
      ["Texts over the allowance, at cost", 312],
      ["Card processing", null],
    ]);
    expect(inv.lines[3].detail).toBe("Passed through by Stripe — not billed by The Pass");
    expect(inv.totalCents).toBe(134_700 - 17_960 + 312);
    // Lock passed: list price. One location: no discount line.
    const after = invoicePreview(org("host", { founding: true, foundingLockedUntil: "2026-10-31" }), 100, month);
    expect(after.unitCents).toBe(19_900);
    expect(after.lines.map((l) => l.label)).not.toContain("Additional-location discount");
    expect(after.totalCents).toBe(19_900);
  });

  it("month boundaries are the restaurant's, not UTC's", () => {
    const la = monthIn("America/Los_Angeles", new Date("2026-12-01T05:00:00Z")); // still Nov 30 in LA
    expect(la).toMatchObject({ label: "November 2026", firstDay: "2026-11-01", daysElapsed: 30, daysInMonth: 30 });
    expect(la.start.toISOString()).toBe("2026-11-01T07:00:00.000Z");
    expect(la.end.toISOString()).toBe("2026-12-01T08:00:00.000Z");
    const ny = monthIn("America/New_York", new Date("2026-12-01T05:00:00Z")); // Dec 1, 12 am in New York
    expect(ny).toMatchObject({ label: "December 2026", daysElapsed: 1, daysInMonth: 31 });
    expect(monthIn("UTC", new Date("2027-02-10T00:00:00Z")).daysInMonth).toBe(28);
  });

  it("the chat's tools follow the plan", () => {
    const names = (p: OrgPlan) => toolsForPlan(p).map((t) => t.name);
    expect(names(org("the_pass"))).toEqual(expect.arrayContaining(["list_open_orders", "update_order_status", "list_segments", "list_campaigns", "draft_campaign"]));
    const host = names(org("host"));
    for (const t of ["list_open_orders", "update_order_status", "list_segments", "list_campaigns", "draft_campaign"]) expect(host).not.toContain(t);
    expect(host).toEqual(expect.arrayContaining(["get_today", "get_settings", "change_setting", "create_booking", "cancel_booking", "find_guests"]));
    const enumOf = (p: OrgPlan, tool: string) =>
      (toolsForPlan(p).find((t) => t.name === tool)!.input_schema as unknown as { properties: { pillar: { enum: string[] } } }).properties.pillar.enum;
    expect(enumOf(org("host"), "get_settings")).toEqual(["reservations", "website", "all"]);
    expect(enumOf(org("the_pass"), "change_setting")).toEqual(["reservations", "ordering", "website", "loyalty", "app"]);
    expect(planNote(org("the_pass"))).toBe("");
    expect(planNote(org("host"))).toContain("Settings → Plan & billing");
  });
});
