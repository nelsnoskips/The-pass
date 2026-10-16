/**
 * The assistant's script.
 *
 * A guided desk, not a model: a small conversation tree that takes a
 * service request, an after-hours emergency or a question, and sends it
 * to the Orravan team as a form submission. Alex chose this no-cost
 * version on 13 Oct; an AI version can come later. General requests go
 * to Noelia (ngodinez@orravan.ai) and emergencies to the on-call lead,
 * Simon Kang (skang@orravan.ai) — the addresses live in the form
 * notifications on the host, not in this file, so they never ship in
 * the page.
 *
 * Nothing here promises what the desk cannot do: no paging, no
 * technician names, no response times nobody agreed to. Work orders
 * live in the Service Portal, so the desk points there.
 */

export type Chip = { label: string; to?: string; href?: string };

/** What an answer is filed as in the submission. */
export type Field = "details" | "phone" | "message" | "contact";

export type Node = {
  id: string;
  /** Each string is one bubble, shown in sequence with a typing pause. */
  bot: string[];
  chips?: Chip[];
  /** Ask for typed input instead of, or as well as, chips. */
  input?: { placeholder: string; to: string; kind?: "text" | "tel"; field: Field };
  /** Reaching this node sends what the visitor has told us. */
  send?: "request" | "emergency";
};

export const PORTAL = "https://orravan.ai/service-portal/";

export const ASSIST = {
  name: "Orravan Assist",
  launcher: "Ask Orravan",
  status: "Orravan service desk",
  privacy: "What you send here goes to the Orravan team. In an emergency, call 911 first.",
  failed:
    "Sorry, that didn't go through. Please call us at (855) 677-2826 and we'll take it from there.",
} as const;

export const SCRIPT: Record<string, Node> = {
  root: {
    id: "root",
    bot: [
      "Hi, this is Orravan. I can take a service request, get an after-hours emergency to our on-call team, or point you to your work orders.",
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
      "Then we'll flag it as a priority.",
      "What's your name, and the address of the building?",
    ],
    input: { placeholder: "Name and building address", to: "service-phone", field: "details" },
  },
  "service-planned": {
    id: "service-planned",
    bot: ["No problem. What's your name, and the address of the building?"],
    input: { placeholder: "Name and building address", to: "service-phone", field: "details" },
  },
  "service-phone": {
    id: "service-phone",
    bot: ["And the best number to reach you?"],
    input: { placeholder: "Your phone number", to: "service-done", kind: "tel", field: "phone" },
  },
  "service-done": {
    id: "service-done",
    send: "request",
    bot: [
      "Thanks. Your request is with our service team, and someone will call you to confirm a time.",
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
      "Okay. First, is anyone in danger, or is there a gas smell, smoke, or active flooding?",
    ],
    chips: [
      { label: "Yes", to: "emergency-911" },
      { label: "No, it's the equipment", to: "emergency-system" },
    ],
  },
  "emergency-911": {
    id: "emergency-911",
    bot: [
      "Call 911 now. Once everyone is safe, come back here or call (855) 677-2826 and we'll take it from there.",
    ],
    chips: [{ label: "Everyone is safe — continue", to: "emergency-system" }],
  },
  "emergency-system": {
    id: "emergency-system",
    bot: ["Which of these is closest?"],
    chips: [
      { label: "No cooling", to: "emergency-details" },
      { label: "No heat", to: "emergency-details" },
      { label: "Water leak from equipment", to: "emergency-details" },
      { label: "Alarm on the BAS", to: "emergency-details" },
    ],
  },
  "emergency-details": {
    id: "emergency-details",
    bot: ["Understood. What's your name, and the address of the building?"],
    input: { placeholder: "Name and building address", to: "emergency-phone", field: "details" },
  },
  "emergency-phone": {
    id: "emergency-phone",
    bot: ["And the best number for our on-call technician to call you on?"],
    input: { placeholder: "Your phone number", to: "emergency-done", kind: "tel", field: "phone" },
  },
  "emergency-done": {
    id: "emergency-done",
    send: "emergency",
    bot: [
      "That's been sent to our on-call team, and they'll call you back.",
      "If you don't hear from us soon, call (855) 677-2826.",
    ],
    chips: [
      { label: "Thank you", to: "bye" },
      { label: "Back to the start", to: "root" },
    ],
  },

  /* ------------------------------------------------- track a work order -- */
  track: {
    id: "track",
    bot: [
      "Your work orders are in the Service Portal, where you can see the status of each one.",
      "No login yet? You can request one on the portal page.",
    ],
    chips: [
      { label: "Open the Service Portal", href: PORTAL },
      { label: "Back to the start", to: "root" },
    ],
  },

  /* ---------------------------------------------------------- automation -- */
  automation: {
    id: "automation",
    bot: [
      "Building automation has been in-house since 2016: DDC controls, integration, programming and support, across healthcare, education, data centers and commercial.",
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
    bot: ["Great. What's your name, and the address of the building?"],
    input: { placeholder: "Name and building address", to: "automation-phone", field: "details" },
  },
  "automation-phone": {
    id: "automation-phone",
    bot: ["And the best number for our controls team to reach you?"],
    input: { placeholder: "Your phone number", to: "automation-done", kind: "tel", field: "phone" },
  },
  "automation-done": {
    id: "automation-done",
    send: "request",
    bot: ["Thanks. Someone from our controls team will call you to set it up."],
    chips: [
      { label: "That's all", to: "bye" },
      { label: "Back to the start", to: "root" },
    ],
  },

  /* ------------------------------------------------------- everything else -- */
  other: {
    id: "other",
    bot: ["Go ahead, and I'll get it to the right person."],
    input: { placeholder: "Type your question", to: "other-got", field: "message" },
  },
  "other-got": {
    id: "other-got",
    bot: ["Got it. What's the best phone number or email to reply to?"],
    input: { placeholder: "Phone or email", to: "other-done", field: "contact" },
  },
  "other-done": {
    id: "other-done",
    send: "request",
    bot: ["Thanks. Someone from the office will get back to you."],
    chips: [
      { label: "That's all", to: "bye" },
      { label: "Back to the start", to: "root" },
    ],
  },

  bye: {
    id: "bye",
    bot: ["Thanks for reaching out. We're here whenever you need us."],
    chips: [{ label: "Start again", to: "root" }],
  },
};
