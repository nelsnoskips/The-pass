/**
 * The assistant's script.
 *
 * This is a mock: nothing here calls a model or a dispatcher. It is a
 * small conversation tree that demonstrates what the live version would
 * do — take a service request, triage an after-hours emergency and page
 * the on-call technician, answer the questions people actually ask, and
 * look up a work order — so Orravan can feel the experience before
 * paying to build it.
 *
 * It shares its facts with the rest of the page. The work order it
 * "finds" is the one in the Client Record section; the technician it
 * pages is the one named there. A mock that contradicts the page it
 * sits on stops being convincing.
 */

export type Chip = { label: string; to: string };

export type Node = {
  id: string;
  /** Each string is one bubble, shown in sequence with a typing pause. */
  bot: string[];
  chips?: Chip[];
  /** Ask for typed input instead of, or as well as, chips. */
  input?: { placeholder: string; to: string; kind?: "text" | "tel" | "order" };
};

export const ASSIST = {
  name: "Orravan Assist",
  tag: "Preview",
  launcher: "Ask Orravan",
  status: "On-call desk · usually a minute",
  privacy: "This is a demonstration. Nothing typed here is sent anywhere.",
} as const;

export const SCRIPT: Record<string, Node> = {
  root: {
    id: "root",
    bot: [
      "Hi — this is the Orravan desk. I can take a service request, get an emergency to the on-call technician, or look something up.",
      "What do you need?",
    ],
    chips: [
      { label: "Request service", to: "service" },
      { label: "Emergency — after hours", to: "emergency" },
      { label: "Track a work order", to: "track" },
      { label: "Automation & controls", to: "automation" },
      { label: "Something else", to: "other" },
    ],
  },

  /* ------------------------------------------------- request service -- */
  service: {
    id: "service",
    bot: ["Sure. Which system is it?"],
    chips: [
      { label: "HVAC / comfort", to: "service-issue" },
      { label: "Chiller or central plant", to: "service-issue" },
      { label: "Controls / automation", to: "service-issue" },
      { label: "Not sure", to: "service-issue" },
    ],
  },
  "service-issue": {
    id: "service-issue",
    bot: ["Got it. Is anything down right now, or is this a planned visit?"],
    chips: [
      { label: "Something is down", to: "service-down" },
      { label: "Planned / maintenance", to: "service-planned" },
    ],
  },
  "service-down": {
    id: "service-down",
    bot: [
      "Then it goes to dispatch as a priority call, not a ticket.",
      "What's the best number to confirm a window with you?",
    ],
    input: { placeholder: "Your phone number", to: "service-done", kind: "tel" },
  },
  "service-planned": {
    id: "service-planned",
    bot: ["No problem. What's the best number for the office to reach you on?"],
    input: { placeholder: "Your phone number", to: "service-done", kind: "tel" },
  },
  "service-done": {
    id: "service-done",
    bot: [
      "Thanks. Dispatch has it and will call to confirm a window. You'll get a text with the technician's name when they're assigned.",
      "Anything else?",
    ],
    chips: [
      { label: "That's all", to: "bye" },
      { label: "Back to the start", to: "root" },
    ],
  },

  /* -------------------------------------------------------- emergency -- */
  emergency: {
    id: "emergency",
    bot: [
      "Okay. First — is anyone in danger, or is there a gas smell, smoke, or active flooding?",
    ],
    chips: [
      { label: "Yes", to: "emergency-911" },
      { label: "No, it's the equipment", to: "emergency-system" },
    ],
  },
  "emergency-911": {
    id: "emergency-911",
    bot: [
      "Call 911 now. Once everyone is safe, come back here or call (832) 817-0006 and we'll take it from there.",
    ],
    chips: [{ label: "Everyone is safe — continue", to: "emergency-system" }],
  },
  "emergency-system": {
    id: "emergency-system",
    bot: ["Which of these is closest?"],
    chips: [
      { label: "No cooling", to: "emergency-page" },
      { label: "No heat", to: "emergency-page" },
      { label: "Water leak from equipment", to: "emergency-page" },
      { label: "Alarm on the BAS", to: "emergency-page" },
    ],
  },
  "emergency-page": {
    id: "emergency-page",
    bot: [
      "Paging the on-call technician now…",
      "J. Martinez has acknowledged. Estimated on site in about 45 minutes.",
      "What number should J. call you on when they're close?",
    ],
    input: { placeholder: "Your phone number", to: "emergency-done", kind: "tel" },
  },
  "emergency-done": {
    id: "emergency-done",
    bot: [
      "Done. J. has your number and the building address on file. You'll get a text when they're ten minutes out.",
      "If anything changes before then, this line is open.",
    ],
    chips: [
      { label: "Thank you", to: "bye" },
      { label: "Back to the start", to: "root" },
    ],
  },

  /* ------------------------------------------------- track a work order -- */
  track: {
    id: "track",
    bot: ["What's the work order number? It starts with WO-."],
    input: { placeholder: "e.g. WO-267812", to: "track-found", kind: "order" },
  },
  "track-found": {
    id: "track-found",
    bot: [
      "WO-267812 — Zone 4B Temperature High.",
      "Detected 4/23 at 8:35 AM. Assigned to J. Martinez at 8:40. Reheat valve adjusted and sensor calibrated. Performance verified in range, and the record is complete with all documents uploaded.",
      "Want the full record?",
    ],
    chips: [
      { label: "Open the record", to: "track-open" },
      { label: "Back to the start", to: "root" },
    ],
  },
  "track-open": {
    id: "track-open",
    bot: ["It's the Client Record section just above the footer — I've scrolled you there."],
    chips: [{ label: "Back to the start", to: "root" }],
  },
  "track-miss": {
    id: "track-miss",
    bot: [
      "I can't find that one. In the live version I'd check it against ServiceTrade; for now the one on this page is WO-267812.",
    ],
    chips: [
      { label: "Try WO-267812", to: "track-found" },
      { label: "Back to the start", to: "root" },
    ],
  },

  /* ---------------------------------------------------------- automation -- */
  automation: {
    id: "automation",
    bot: [
      "Building automation has been in-house since 2016: DDC controls, integration, programming and support, across healthcare, education, data centres and commercial.",
      "The useful next step is a walkthrough of your building. Want one?",
    ],
    chips: [
      { label: "Book a walkthrough", to: "automation-book" },
      { label: "Just a question", to: "other" },
      { label: "Back to the start", to: "root" },
    ],
  },
  "automation-book": {
    id: "automation-book",
    bot: ["Great. Best number for the controls team to reach you?"],
    input: { placeholder: "Your phone number", to: "automation-done", kind: "tel" },
  },
  "automation-done": {
    id: "automation-done",
    bot: ["Thanks — someone from controls will call within one business day to set it up."],
    chips: [
      { label: "That's all", to: "bye" },
      { label: "Back to the start", to: "root" },
    ],
  },

  /* ------------------------------------------------------- everything else -- */
  other: {
    id: "other",
    bot: ["Go ahead — I'll get it to the right person."],
    input: { placeholder: "Type your question", to: "other-got", kind: "text" },
  },
  "other-got": {
    id: "other-got",
    bot: [
      "Got it. I'll pass that to the office. What's the best number or email to reply to?",
    ],
    input: { placeholder: "Phone or email", to: "other-done", kind: "text" },
  },
  "other-done": {
    id: "other-done",
    bot: ["Thanks. Someone will come back to you within one business day."],
    chips: [
      { label: "That's all", to: "bye" },
      { label: "Back to the start", to: "root" },
    ],
  },

  bye: {
    id: "bye",
    bot: ["Thanks for reaching out. The desk is here whenever you need it."],
    chips: [{ label: "Start again", to: "root" }],
  },
};

/** The one work order the mock knows. */
export const KNOWN_ORDER = /WO-?\s?267812/i;
