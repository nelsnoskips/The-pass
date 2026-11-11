/**
 * How each agent is presented to a restaurant: name, what it covers,
 * one line on what it does, and whether it acts alone or waits for a
 * person. Only agents that can actually run are listed.
 */
export interface AgentCard {
  id: string;
  name: string;
  tags: string[];
  does: string;
  /** Plain words on the approval rule, shown on every card. */
  approval: string;
  icon: string;
}

export const AGENT_CARDS: AgentCard[] = [
  {
    id: "reservations", name: "Reservations Agent", tags: ["Dining room", "Messaging"],
    does: "Spots quiet nights ahead and drafts a text to regulars who haven't been in.",
    approval: "Every text waits for your approval.",
    icon: "M4 19h16M6 19V9l6-4 6 4v10M10 19v-5h4v5",
  },
  {
    id: "reviews", name: "Reviews Agent", tags: ["Reviews", "Reputation"],
    does: "Drafts a reply to each new Google review in your voice.",
    approval: "Replies post only after you approve them.",
    icon: "M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4L4.2 9.7l5.4-.8z",
  },
  {
    id: "website", name: "Website Agent", tags: ["Website"],
    does: "Makes the change you describe to your site — prices, hours, specials — as a draft.",
    approval: "Nothing goes live until you publish.",
    icon: "M3 5h18v14H3zM3 9h18",
  },
  {
    id: "paid_ads", name: "Paid Ads Agent", tags: ["Ads", "Marketing"],
    does: "Reads your Google and Meta numbers weekly; proposes budget moves and blocks wasted searches.",
    approval: "Every change to spend waits for your approval.",
    icon: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  },
];

export const agentName = (id: string) => AGENT_CARDS.find((a) => a.id === id)?.name ?? id;

/** Change-log actions, in words, for activity feeds. */
const ACTIONS: Record<string, string> = {
  "agent.proposed": "Proposed an action for approval",
  "agent.denied": "Was stopped by a rule",
  "agent.proposal_approved": "Approved",
  "agent.proposal_rejected": "Dismissed",
  "ads.budget_changed": "Changed a Google budget",
  "ads.campaign_paused": "Paused a Google campaign",
  "ads.negative_added": "Blocked a wasted search",
  "review.replied": "Replied to a review",
  "site.version_saved": "Saved a website draft",
  "site.published": "Published the website",
};
export const actionWords = (a: string) => ACTIONS[a] ?? a.replace(/[._]/g, " ");
