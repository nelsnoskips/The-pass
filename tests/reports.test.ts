import { describe, expect, it } from "vitest";
import { addDays, change, datesIn, parseDays, periodsFor, share } from "@/lib/reports/period";
import { changeText, count, money, pct } from "@/lib/reports/format";
import { toMetrics, type Raw } from "@/lib/reports/overview";
import { partyBucket } from "@/lib/reports/sections";
import { parseTxKind, parseTxStatus } from "@/lib/reports/financials";
import { parseTags } from "@/lib/guests/profile";

describe("report periods", () => {
  it("end today and compare with the same number of days before", () => {
    expect(periodsFor(7, "2026-11-12")).toMatchObject({ cur: { since: "2026-11-06", until: "2026-11-12" }, prev: { since: "2026-10-30", until: "2026-11-05" } });
    const p = periodsFor(30, "2026-03-01");
    expect(datesIn(p.cur)).toHaveLength(30);
    expect(datesIn(p.prev)).toHaveLength(30);
    expect(addDays(p.prev.until, 1)).toBe(p.cur.since);
  });
  it("only take 7, 30 or 90 days", () => {
    expect(parseDays("90")).toBe(90);
    expect(parseDays("45")).toBe(30);
    expect(parseDays(undefined, 7)).toBe(7);
  });
  it("leave a change or share empty when there is nothing to compare", () => {
    expect(change(12, 10)).toEqual({ delta: 2, pct: 20 });
    expect(change(5, 0)).toEqual({ delta: 5, pct: null });
    expect(change(null, 3)).toEqual({ delta: null, pct: null });
    expect(share(1, 4)).toBe(25);
    expect(share(0, 0)).toBeNull();
  });
});

describe("report formatting", () => {
  it("writes missing numbers as —, never $0", () => {
    expect(money(null)).toBe("—");
    expect(money(0)).toBe("$0");
    expect(money(123456)).toBe("$1,234.56");
    expect(money(-2500)).toBe("−$25");
    expect(pct(null)).toBe("—");
    expect(count(undefined)).toBe("—");
  });
  it("says how a number moved, in points for rates", () => {
    expect(changeText("money", 12000, 10000, 30)).toBe("↑ $20 (+20%) vs previous 30 days");
    expect(changeText("count", 3, 5, 7)).toBe("↓ 2 (−40%) vs previous 7 days");
    expect(changeText("pct", 6, 4, 7)).toBe("↑ 2.0 pts vs previous 7 days");
    expect(changeText("count", 4, 4, 7)).toBe("Same as the previous 7 days");
    expect(changeText("money", null, null, 7)).toBe("No data for the previous 7 days");
  });
});

const raw = (o: Partial<Raw> = {}): Raw => ({
  bookings: 0, covers: 0, noShows: 0, settled: 0, orders: 0, salesCents: 0, newGuests: 0, visitors: 0, returning: 0,
  messages: 0, rewardsEarned: 0, rewardsRedeemed: 0, giftSoldCents: 0, giftSold: 0, giftRedeemedCents: 0, ...o,
});

describe("overview metrics", () => {
  it("are — for what isn't set up, and for rates with nothing under them", () => {
    const m = Object.fromEntries(toMetrics(raw(), raw(), { ordering: false, loyalty: false, giftCards: false }).map((x) => [x.key, x]));
    expect(m.online_sales.cur).toBeNull();
    expect(m.average_order.cur).toBeNull();
    expect(m.rewards_earned.cur).toBeNull();
    expect(m.gift_sold.cur).toBeNull();
    expect(m.no_show_rate.cur).toBeNull();
    expect(m.repeat_share.cur).toBeNull();
    expect(m.covers.cur).toBe(0);
  });
  it("work out rates and averages", () => {
    const m = Object.fromEntries(toMetrics(raw({ orders: 4, salesCents: 10000, noShows: 1, settled: 4, visitors: 10, returning: 3 }), raw(), { ordering: true, loyalty: true, giftCards: true }).map((x) => [x.key, x]));
    expect(m.average_order.cur).toBe(2500);
    expect(m.average_order.prev).toBeNull();
    expect(m.no_show_rate.cur).toBe(25);
    expect(m.no_show_rate.upIsGood).toBe(false);
    expect(m.repeat_share.cur).toBe(30);
    expect(m.rewards_earned.cur).toBe(0);
    for (const x of Object.values(m)) expect(x.definition.length).toBeGreaterThan(10);
  });
});

describe("small parsers", () => {
  it("bucket party sizes", () => {
    expect([1, 2, 7, 8, 14].map(partyBucket)).toEqual(["1", "2", "7", "8+", "8+"]);
  });
  it("accept only known transaction kinds and statuses", () => {
    expect(parseTxKind("deposit")).toBe("deposit");
    expect(parseTxKind("drop table")).toBeNull();
    expect(parseTxStatus("redeemed")).toBe("redeemed");
    expect(parseTxStatus("")).toBeNull();
  });
  it("tidy guest tags", () => {
    expect(parseTags("regular, VIP,  vip , shellfish   allergy,,")).toEqual(["regular", "VIP", "shellfish allergy"]);
  });
});
