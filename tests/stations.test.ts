import { describe, expect, it } from "vitest";
import { actionWords, actorLabel, AGENT_CARDS, agentName, stationName, wantsTo } from "@/lib/agent-runtime/catalog";
import { RUNNABLE_AGENTS } from "@/lib/agent-runtime/registry";
import { describeAction, dollars, num } from "@/lib/brief";
import { briefDue } from "@/lib/brief/send";

describe("one agent, many stations", () => {
  it("names stations without 'Agent', one per runnable agent id", () => {
    expect(AGENT_CARDS.map((a) => a.name)).toEqual(["Reservations", "Reviews", "Website", "Paid ads"]);
    expect(AGENT_CARDS.some((a) => /agent/i.test(a.name))).toBe(false);
    for (const a of AGENT_CARDS) expect(RUNNABLE_AGENTS[a.id]).toBeTypeOf("function");
  });

  it("signs a station's work as The Pass", () => {
    expect(stationName("reservations")).toBe("Reservations");
    expect(stationName("paid_ads")).toBe("Paid ads");
    expect(stationName("search_terms")).toBe("Search terms");
    expect(agentName("reservations")).toBe("The Pass · Reservations");
    expect(agentName("assistant")).toBe("The Pass");
  });

  it("shows stored actors the way people read them, without changing what's stored", () => {
    expect(actorLabel("agent:reservations")).toBe("The Pass (Reservations)");
    expect(actorLabel("agent:paid_ads")).toBe("The Pass (Paid ads)");
    expect(actorLabel("agent:website")).toBe("The Pass (Website)");
    expect(actorLabel("agent:assistant")).toBe("The Pass");
    expect(actorLabel("agent:brief")).toBe("The Pass (Morning pass)");
    expect(actorLabel("guest")).toBe("A guest");
    expect(actorLabel("owner@santorini.example")).toBe("owner@santorini.example");
    expect(actorLabel("sync:google_business")).toBe("Automatic sync");
    expect(actorLabel(null)).toBe("—");
  });

  it("says what a proposal wants to do, and what a station did, in words", () => {
    expect(wantsTo("Text 18 guests: “Tuesday”")).toBe("The Pass wants to text 18 guests: “Tuesday”");
    expect(wantsTo("Pause Brunch Search on Google")).toBe("The Pass wants to pause Brunch Search on Google");
    expect(actionWords("agent.proposed")).toBe("Asked for your approval");
    expect(actionWords("agent.settings_changed")).toBe("Station settings changed");
    expect(describeAction("guests.sms_marketing", { sent: 1, dry_run: 0 })).toBe("Texted 1 guest");
    expect(describeAction("guests.sms_marketing", { sent: 0, dry_run: 4 })).toBe("Texted 4 guests (recorded, not sent: texting is off)");
    expect(describeAction("ads.negative_added", { term: "free food" })).toBe("Blocked the search “free food”");
    expect(describeAction("ads.budget_changed", {})).toBe("Changed the Google budget from — to — a day");
  });

  it("renders missing numbers as —, never 0 or $0", () => {
    expect(num(null)).toBe("—");
    expect(num(0)).toBe("0");
    expect(dollars(null)).toBe("—");
    expect(dollars(4550)).toBe("$46");
  });

  it("is due from the send time for three hours, local time", () => {
    expect(briefDue("09:00", "08:59")).toBe(false);
    expect(briefDue("09:00", "09:00")).toBe(true);
    expect(briefDue("09:00:00", "11:59")).toBe(true);
    expect(briefDue("09:00", "12:00")).toBe(false);
    expect(briefDue("07:30", "08:00")).toBe(true);
  });
});
