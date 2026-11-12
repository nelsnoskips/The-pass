/**
 * The Pass is one agent. What used to be separate agents are its
 * stations — the way a kitchen has stations under one expo. This is how
 * each station is presented to a restaurant: name, what it covers, one
 * line on what it does, and whether it acts alone or waits for a person.
 * Only stations that can actually run are listed.
 *
 * Stored identifiers don't change: a station's id is the runtime agent
 * id, and change_log keeps the actor `agent:<id>`. Only what people read
 * changes, through `stationName`, `agentName` and `actorLabel`.
 */
export interface AgentCard {
  id: string;
  /** The station's name, without "Agent": "Reservations". */
  name: string;
  tags: string[];
  does: string;
  /** Plain words on the approval rule, shown on every card. */
  approval: string;
  icon: string;
}

export const AGENT_CARDS: AgentCard[] = [
  {
    id: "reservations", name: "Reservations", tags: ["Dining room", "Messaging"],
    does: "Spots quiet nights ahead and drafts a text to regulars who haven't been in.",
    approval: "Every text waits for your approval.",
    icon: "M4 19h16M6 19V9l6-4 6 4v10M10 19v-5h4v5",
  },
  {
    id: "reviews", name: "Reviews", tags: ["Reviews", "Reputation"],
    does: "Drafts a reply to each new Google review in your voice.",
    approval: "Replies post only after you approve them.",
    icon: "M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4L4.2 9.7l5.4-.8z",
  },
  {
    id: "website", name: "Website", tags: ["Website"],
    does: "Makes the change you describe to your site — prices, hours, specials — as a draft.",
    approval: "Nothing goes live until you publish.",
    icon: "M3 5h18v14H3zM3 9h18",
  },
  {
    id: "paid_ads", name: "Paid ads", tags: ["Ads", "Marketing"],
    does: "Reads your Google and Meta numbers weekly; proposes budget moves and blocks wasted searches.",
    approval: "Every change to spend waits for your approval.",
    icon: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  },
];

/** Work done outside a station card: the chat (just "The Pass"), and the morning pass. */
const OTHER_STATIONS: Record<string, string> = { assistant: "", brief: "Morning pass" };

/** "Reservations" for "reservations"; "" for the chat, which is just The Pass. */
export function stationName(id: string): string {
  const card = AGENT_CARDS.find((a) => a.id === id);
  if (card) return card.name;
  if (id in OTHER_STATIONS) return OTHER_STATIONS[id];
  return id.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** "The Pass · Reservations": how a station signs its activity and proposals. */
export function agentName(id: string): string {
  const s = stationName(id);
  return s ? `The Pass · ${s}` : "The Pass";
}

/**
 * Who did something, for people to read. Stored actors stay as they are
 * (`agent:reservations`, `guest`, an email); this is display only.
 *   agent:reservations → The Pass (Reservations)
 *   agent:assistant    → The Pass
 */
export function actorLabel(actor: string | null | undefined): string {
  if (!actor) return "—";
  if (actor.startsWith("agent:")) {
    const s = stationName(actor.slice(6));
    return s ? `The Pass (${s})` : "The Pass";
  }
  if (actor === "guest") return "A guest";
  if (actor === "scheduler") return "The Pass (on schedule)";
  if (actor.startsWith("sync:")) return "Automatic sync";
  return actor;
}

/** "Text 18 guests: …" → "The Pass wants to text 18 guests: …". */
export function wantsTo(title: string): string {
  const t = title.trim();
  if (!t) return "The Pass wants your approval";
  return `The Pass wants to ${t[0].toLowerCase()}${t.slice(1)}`;
}

/** Change-log actions, in words, for activity feeds. */
const ACTIONS: Record<string, string> = {
  "agent.proposed": "Asked for your approval",
  "agent.denied": "Was stopped by a rule",
  "agent.proposal_approved": "Approved",
  "agent.proposal_rejected": "Dismissed",
  "agent.proposal_blocked": "Blocked when approved",
  "agent.proposal_failed": "Failed when approved",
  "agent.proposals_dismissed_all": "Dismissed everything waiting",
  "ads.budget_changed": "Changed a Google budget",
  "ads.campaign_paused": "Paused a Google campaign",
  "ads.negative_added": "Blocked a wasted search",
  "review.replied": "Replied to a review",
  "site.version_saved": "Saved a website draft",
  "site.published": "Published the website",
  "agent.settings_changed": "Station settings changed",
  "guests.sms_marketing": "Texted guests",
  "campaign.drafted": "Drafted a campaign",
};
export const actionWords = (a: string) => ACTIONS[a] ?? a.replace(/[._]/g, " ");
