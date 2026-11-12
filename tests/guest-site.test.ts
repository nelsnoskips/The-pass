import { describe, expect, it } from "vitest";
import demo from "@/lib/sites/demo-content.json";
import { DEFAULT_SETTINGS, orderableItems, priceCart, type OrderingSettings } from "@/lib/ordering";
import { bookingIcs, icsText } from "@/lib/reservations/ics";
import { confirmationText } from "@/lib/reservations/notify";
import {
  cancelOutcome, cancelledDepositText, cancelledInTime, depositState, guestPolicy, policySentence, refundDeadline,
} from "@/lib/reservations/policy";
import { describeAvailability, menuServedAt, parseSiteContent, type SiteContent } from "@/lib/sites/content";
import { formatWhenZoned } from "@/lib/sites/format";

describe("cancellation policy is written from the refund rule", () => {
  it("names the cut-off and the deposit the refund code uses", () => {
    expect(policySentence(24, 4000)).toBe(
      "Cancel or change up to 24 hours before and your $40 deposit comes back in full. After that, it isn’t refunded.",
    );
    expect(policySentence(72, 2550)).toContain("up to 3 days before and your $25.50 deposit");
    expect(policySentence(1, 1000)).toContain("up to 1 hour before");
    expect(policySentence(0, 1000)).toBe("Cancel any time before your booking and your $10 deposit comes back in full.");
    expect(policySentence(24, 0)).toContain("at least 24 hours before");
    expect(policySentence(24, 0)).not.toMatch(/deposit/);
  });

  it("keeps the owner's note as an addition, never instead of the rule", () => {
    expect(guestPolicy(24, 4000, "  Please call for parties over 8. ")).toEqual({
      rule: policySentence(24, 4000), note: "Please call for parties over 8.",
    });
    expect(guestPolicy(24, 4000, "").note).toBeNull();
  });

  it("puts the rule (and a short note) in the confirmation text", () => {
    const text = confirmationText({
      reservation: { partySize: 4, depositCents: 4000 }, restaurant: "Santorini", when: "Fri, Nov 13 at 7:30 PM",
      manageUrl: "https://x/b/t", policy: { cutoffHours: 24, note: "Cancel by noon, please." },
    });
    expect(text).toBe(
      "Santorini: you're booked for 4 on Fri, Nov 13 at 7:30 PM. Cancel or change up to 24 hours before and your $40 deposit comes back in full. After that, it isn’t refunded. Cancel by noon, please. Change or cancel: https://x/b/t",
    );
    // Without a policy it reads as before.
    expect(confirmationText({ reservation: { partySize: 2, depositCents: 0 }, restaurant: "S", when: "W", manageUrl: "u" }))
      .toBe("S: you're booked for 2 on W. Change or cancel: u");
    // A long owner note stays on the booking page, not in the text.
    const long = confirmationText({ reservation: { partySize: 2, depositCents: 0 }, restaurant: "S", when: "W", manageUrl: "u",
      policy: { cutoffHours: 24, note: "x".repeat(200) } });
    expect(long).not.toContain("xxxx");
  });
});

describe("refund outcome before a guest cancels", () => {
  const startsAt = new Date("2026-11-13T00:30:00Z"); // Thu Nov 12, 7:30 PM New York
  const base = { startsAt, cutoffHours: 24, depositCents: 4000 };

  it("matches refundDepositIfDue: in time at exactly the cut-off, not a minute after", () => {
    const deadline = refundDeadline(startsAt, 24);
    expect(deadline.toISOString()).toBe("2026-11-12T00:30:00.000Z");
    expect(cancelledInTime(startsAt, 24, deadline)).toBe(true);
    expect(cancelledInTime(startsAt, 24, new Date(deadline.getTime() + 60_000))).toBe(false);
    expect(formatWhenZoned(deadline, "America/New_York")).toBe("Wed, Nov 11 at 7:30 PM EST");
  });

  it("says plainly what happens to the deposit", () => {
    expect(cancelOutcome({ ...base, depositStatus: "held", now: new Date("2026-11-11T12:00:00Z") }))
      .toEqual({ refund: true, text: "Your $40 deposit will be refunded in full." });
    expect(cancelOutcome({ ...base, depositStatus: "held", now: new Date("2026-11-12T12:00:00Z") }))
      .toEqual({ refund: false, text: "It’s past the 24-hour cut-off, so your $40 deposit won’t be refunded." });
    expect(cancelOutcome({ ...base, depositStatus: "pending", now: new Date("2026-11-12T12:00:00Z") }).text)
      .toBe("Your $40 deposit hasn’t been paid, so there’s nothing to refund.");
    expect(cancelOutcome({ ...base, depositCents: 0, depositStatus: "none", now: new Date() }).refund).toBe(false);
  });

  it("states the deposit outcome once cancelled", () => {
    expect(cancelledDepositText(4000, "refunded")).toMatch(/^Your \$40 deposit has been refunded/);
    expect(cancelledDepositText(4000, "held")).toMatch(/wasn’t refunded/);
    expect(cancelledDepositText(0, "none")).toBeNull();
    expect(depositState(4000, "captured")).toBe("paid");
    expect(depositState(4000, "pending")).toBe("due");
  });
});

describe("add to calendar", () => {
  it("writes a valid event in UTC with escaped text and folded lines", () => {
    const ics = bookingIcs({
      uid: "abc@thepass", restaurant: "Santorini, by Georgios", partySize: 2,
      startsAt: new Date("2026-11-13T00:30:00Z"), endsAt: new Date("2026-11-13T02:30:00Z"),
      address: "1104 East Las Olas Boulevard; Fort Lauderdale, FL 33301", phone: "(954) 555-0142",
      manageUrl: "https://example.com/s/santorini/booking/" + "t".repeat(40), now: new Date("2026-11-12T10:00:00Z"),
    });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261113T003000Z\r\n");
    expect(ics).toContain("DTEND:20261113T023000Z\r\n");
    expect(ics).toContain("DTSTAMP:20261112T100000Z\r\n");
    expect(ics).toContain("SUMMARY:Santorini\\, by Georgios · table for 2 guests\r\n");
    expect(ics).toContain("LOCATION:1104 East Las Olas Boulevard\\; Fort Lauderdale\\, FL 33301");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    expect(icsText("a\nb")).toBe("a\\nb");
  });
});

describe("menu availability", () => {
  it("keeps existing content valid and parses the demo brunch window", () => {
    const parsed = parseSiteContent(demo);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.content.menus[0].availability).toBeUndefined();
    expect(parsed.content.menus[1].availability).toEqual({ days: [0, 6], from: "11:00", to: "14:30" });
    expect(describeAvailability(parsed.content.menus[1].availability!)).toBe("Sat & Sun, 11 AM–2:30 PM");
  });

  it("rejects a malformed window by path", () => {
    const bad = structuredClone(demo) as unknown as { menus: { availability?: unknown }[] };
    bad.menus[1].availability = { days: [7], from: "11:00", to: "14:30" };
    expect(parseSiteContent(bad)).toMatchObject({ ok: false, errors: ["menus[1].availability.days must list days 0 (Sunday) to 6 (Saturday)"] });
    bad.menus[1].availability = { days: [6], from: "15:00", to: "14:30" };
    expect(parseSiteContent(bad)).toMatchObject({ ok: false, errors: ["menus[1].availability.to must be after menus[1].availability.from"] });
    bad.menus[1].availability = { days: [6], from: "9am", to: "14:30" };
    expect(parseSiteContent(bad).ok).toBe(false);
  });

  it("is served only inside its days and hours", () => {
    const brunch = { availability: { days: [0, 6], from: "11:00", to: "14:30" } };
    expect(menuServedAt(brunch, "2026-11-14", "11:00")).toBe(true); // Saturday
    expect(menuServedAt(brunch, "2026-11-14", "14:30")).toBe(true);
    expect(menuServedAt(brunch, "2026-11-14", "17:00")).toBe(false);
    expect(menuServedAt(brunch, "2026-11-11", "12:00")).toBe(false); // Wednesday
    expect(menuServedAt({}, "2026-11-11", "20:30")).toBe(true);
  });
});

describe("orders name what can't be had", () => {
  const content = (parseSiteContent(demo) as { ok: true; content: SiteContent }).content;
  const S = (o: Partial<OrderingSettings> = {}): OrderingSettings => ({ ...DEFAULT_SETTINGS, pickupEnabled: true, ...o });

  it("returns every unavailable id and names the dishes", () => {
    const r = priceCart(content, S({ soldOut: ["baklava", "moussaka"] }), "pickup",
      [{ itemId: "tzatziki", qty: 1 }, { itemId: "baklava", qty: 2 }, { itemId: "moussaka", qty: 1 }]);
    expect(r).toEqual({ ok: false, error: "Baklava and Moussaka are no longer available. Please review your order.", unavailable: ["baklava", "moussaka"] });
    const one = priceCart(content, S({ soldOut: ["baklava"] }), "pickup", [{ itemId: "baklava", qty: 1 }]);
    expect(one).toMatchObject({ ok: false, error: "Baklava is no longer available. Please review your order.", unavailable: ["baklava"] });
    expect(priceCart(content, S(), "pickup", [{ itemId: "nope", qty: 1 }])).toMatchObject({ ok: false, unavailable: ["nope"] });
  });

  it("refuses a brunch dish for Wednesday dinner, and allows it for Saturday brunch", () => {
    const wed = { date: "2026-11-11", time: "20:30" };
    const sat = { date: "2026-11-14", time: "12:00" };
    expect(orderableItems(content, [], wed).has("bougatsa")).toBe(false);
    expect(orderableItems(content, [], wed).has("moussaka")).toBe(true);
    expect(orderableItems(content, [], sat).has("bougatsa")).toBe(true);
    expect(orderableItems(content).get("bougatsa")?.availability).toEqual([{ days: [0, 6], from: "11:00", to: "14:30" }]);
    expect(orderableItems(content).get("moussaka")?.availability).toBeNull();
    const r = priceCart(content, S(), "pickup", [{ itemId: "bougatsa", qty: 1 }, { itemId: "moussaka", qty: 1 }], 0, null, wed);
    expect(r).toEqual({ ok: false, error: "Bougatsa isn't served at that time. Please pick another time, or remove it.", unavailable: ["bougatsa"] });
    expect(priceCart(content, S(), "pickup", [{ itemId: "bougatsa", qty: 1 }], 0, null, sat).ok).toBe(true);
    // Without a time, as before.
    expect(priceCart(content, S(), "pickup", [{ itemId: "bougatsa", qty: 1 }]).ok).toBe(true);
  });
});
