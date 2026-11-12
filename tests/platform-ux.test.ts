import { describe, expect, it } from "vitest";
import { formatLever, lever } from "@/lib/levers";
import { isStale, maskManageLinks, sendTiming } from "@/lib/platform/approvals";
import { dayRange, hoursFromPeriods } from "@/lib/platform/hours";
import { parseBookingQuery, statusLabel } from "@/lib/platform/search";
import { formatIn, venueTz } from "@/lib/platform/when";

const NY = "America/New_York";

describe("times in the restaurant's timezone", () => {
  // The process timezone is left as it is (UTC on Netlify and in CI);
  // the venue's zone is passed explicitly and must win.
  const instant = new Date("2026-11-12T23:31:00Z"); // 6:31 PM in New York

  it("formats a pickup pause in New York time, not the server's", () => {
    const def = lever("ordering", "paused")!;
    expect(formatLever(def, instant.toISOString(), undefined, NY)).toBe("Paused until 6:31 PM");
    expect(formatLever(def, instant.toISOString(), undefined, "America/Los_Angeles")).toBe("Paused until 3:31 PM");
    expect(formatLever(def, null, undefined, NY)).toBe("—");
  });

  it("formats dates and times through one helper", () => {
    expect(formatIn(instant, NY, "time")).toBe("6:31 PM");
    expect(formatIn(instant, NY, "datetime")).toBe("Nov 12, 6:31 PM");
    // 11:31 PM UTC on the 12th is still the 12th in New York, but 04:30 UTC on the 13th is the 12th too.
    expect(formatIn(new Date("2026-11-13T04:30:00Z"), NY, "date")).toBe("Nov 12, 2026");
    expect(formatIn(null, NY)).toBe("—");
    expect(venueTz([])).toBe(NY);
    expect(venueTz([{ timezone: "America/Chicago" }])).toBe("America/Chicago");
  });
});

describe("search words", () => {
  const now = new Date("2026-11-12T15:00:00Z"); // Thursday, 10 AM in New York

  it("reads times and days the way a host types them", () => {
    expect(parseBookingQuery("8pm", now, NY)).toEqual({ date: null, time: "20:00", rest: "" });
    expect(parseBookingQuery("tonight 7:30 pm", now, NY)).toEqual({ date: "2026-11-12", time: "19:30", rest: "" });
    expect(parseBookingQuery("tomorrow", now, NY)).toEqual({ date: "2026-11-13", time: null, rest: "" });
    expect(parseBookingQuery("Gia tomorrow at 8", now, NY).date).toBe("2026-11-13");
    expect(parseBookingQuery("smith fri 20:00", now, NY)).toEqual({ date: "2026-11-13", time: "20:00", rest: "smith" });
    expect(parseBookingQuery("sunday 12pm", now, NY)).toEqual({ date: "2026-11-15", time: "12:00", rest: "" });
    expect(parseBookingQuery("thu", now, NY).date).toBe("2026-11-12");
  });

  it("leaves names alone", () => {
    expect(parseBookingQuery("Monica", now, NY)).toEqual({ date: null, time: null, rest: "monica" });
    expect(parseBookingQuery("Pat Smith", now, NY)).toEqual({ date: null, time: null, rest: "pat smith" });
  });

  it("uses the restaurant's day near midnight", () => {
    const late = new Date("2026-11-13T03:30:00Z"); // 10:30 PM on the 12th in New York
    expect(parseBookingQuery("tonight", late, NY).date).toBe("2026-11-12");
  });

  it("names statuses in words", () => {
    expect(statusLabel("no_show")).toBe("No-show");
    expect(statusLabel("completed")).toBe("Finished");
    expect(statusLabel("accepted")).toBe("Being made");
    expect(statusLabel("something_new")).toBe("something new");
  });
});

describe("approvals", () => {
  it("marks proposals older than a day as stale", () => {
    const now = new Date("2026-11-12T15:00:00Z");
    expect(isStale(new Date("2026-11-11T14:00:00Z"), now)).toBe(true);
    expect(isStale(new Date("2026-11-11T16:00:00Z"), now)).toBe(false);
  });

  it("says when a text would go out, in the restaurant's hours", () => {
    expect(sendTiming(new Date("2026-11-12T15:00:00Z"), NY).now).toBe(true); // 10 AM
    expect(sendTiming(new Date("2026-11-13T02:00:00Z"), NY).now).toBe(false); // 9 PM
  });

  it("masks guests' private booking and order links", () => {
    const body = "Santorini: see you Fri at 7:30 PM. Can't make it? https://thepass.example/s/santorini/booking/3f2a9c1e-77aa-4b1e-9c11-2f0e5d6a7b8c Reply STOP";
    expect(maskManageLinks(body)).toBe("Santorini: see you Fri at 7:30 PM. Can't make it? …/booking/•••• Reply STOP");
    expect(maskManageLinks("Track it: /s/santorini/order/abcDEF123")).toBe("Track it: …/order/••••");
    expect(maskManageLinks("Nothing private here.")).toBe("Nothing private here.");
  });
});

describe("website hours from service periods", () => {
  it("groups days that share services, Monday first, with closed days", () => {
    const rows = hoursFromPeriods([
      { name: "Dinner", daysOfWeek: [2, 3, 4, 5, 6, 0], firstSeating: "17:00", lastSeating: "21:30" },
      { name: "Brunch", daysOfWeek: [6, 0], firstSeating: "10:30", lastSeating: "14:00" },
    ]);
    expect(rows).toEqual([
      { days: "Tue–Fri", hours: "Dinner 5 PM–9:30 PM" },
      { days: "Sat, Sun", hours: "Brunch 10:30 AM–2 PM · Dinner 5 PM–9:30 PM" },
      { days: "Mon", hours: "Closed" },
    ]);
    expect(rows.every((r) => r.hours.length <= 60 && r.days.length <= 60)).toBe(true);
  });

  it("writes day ranges", () => {
    expect(dayRange([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
    expect(dayRange([1, 3])).toBe("Mon, Wed");
    expect(dayRange([5, 6, 0])).toBe("Fri–Sun");
    expect(hoursFromPeriods([])).toEqual([]);
  });
});
