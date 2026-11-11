import { describe, expect, it } from "vitest";
import demo from "@/lib/sites/demo-content.json";
import { formatPrice, parseSiteContent } from "@/lib/sites/content";
import { formatClock, formatWhen, readableOn } from "@/lib/sites/format";

const clone = () => structuredClone(demo) as Record<string, unknown> & typeof demo;

describe("parseSiteContent", () => {
  it("accepts the demo site unchanged", () => {
    const r = parseSiteContent(demo);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.content).toEqual(demo);
  });

  it("drops keys it doesn't know", () => {
    const c = clone();
    (c as Record<string, unknown>).script = "<script>alert(1)</script>";
    (c.brand as Record<string, unknown>).admin = true;
    const r = parseSiteContent(c);
    expect(r.ok && "script" in r.content).toBe(false);
    expect(r.ok && "admin" in r.content.brand).toBe(false);
  });

  it("reports every problem by path", () => {
    const c = clone();
    c.brand.name = "";
    c.theme.accent = "blue";
    c.menus[0].sections[0].items[0].priceCents = 12.5 as never;
    c.menus[0].sections[0].items[1].id = c.menus[0].sections[0].items[0].id;
    c.hero.image = "javascript:alert(1)";
    const r = parseSiteContent(c);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual(expect.arrayContaining([
      "brand.name is required",
      "theme.accent must be a hex colour like #1a2b3c",
      "menus[0].sections[0].items[0].priceCents must be a whole number of cents",
      expect.stringContaining("is used twice"),
      "hero.image must be an https link",
    ]));
  });

  it("rejects the wrong shapes outright", () => {
    expect(parseSiteContent(null).ok).toBe(false);
    expect(parseSiteContent("a site").ok).toBe(false);
    const c = clone();
    (c as Record<string, unknown>).menus = "none";
    expect(parseSiteContent(c).ok).toBe(false);
  });

  it("bounds sizes so one save can't bloat a page", () => {
    const c = clone();
    c.story.body = "x".repeat(5000);
    const r = parseSiteContent(c);
    expect(!r.ok && r.errors[0]).toContain("story.body is longer than");
  });
});

describe("formatting", () => {
  it("prices: whole dollars bare, cents kept, null as market price", () => {
    expect(formatPrice(4800)).toBe("48");
    expect(formatPrice(1250)).toBe("12.50");
    expect(formatPrice(null)).toBe("MP");
  });

  it("clock and when, in the venue's timezone", () => {
    expect(formatClock("19:30")).toBe("7:30 PM");
    expect(formatClock("00:15")).toBe("12:15 AM");
    expect(formatClock("12:00")).toBe("12:00 PM");
    expect(formatWhen(new Date("2026-11-14T00:30:00Z"), "America/New_York")).toBe("Fri, Nov 13 at 7:30 PM");
  });

  it("picks readable text for a button colour", () => {
    expect(readableOn("#1f4f8f")).toBe("#ffffff");
    expect(readableOn("#f2d15c")).toBe("#111111");
  });
});
