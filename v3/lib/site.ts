/**
 * Orravan — one building, one service thread.
 *
 * Building services (automation, HVAC, monitoring, inventory) sold on a
 * single promise: every signal a building emits gets a next move, and
 * the thread from detection to verified resolution never breaks.
 *
 * Everything the page says lives here, so the sections, the service
 * record and the footer can never disagree about a time or a name. The
 * mock's worked example — AHU-3's supply-air drift, caught at 6:42 and
 * verified by 9:22 — runs the whole page.
 */

export const ORRAVAN = {
  name: "Orravan",
  fullName: "Orravan Mechanical",
  tagline: "One building / One service thread",
  place: "Long Beach, CA",
  phone: "562.421.7378",
  license: "License No. 644288",
  descriptor: "Building automation · HVAC · Monitoring · Inventory",
} as const;

export const NAV = {
  menus: ["Intelligence", "Services", "Industries", "Company"],
  quick: ["Automation", "HVAC", "Monitoring", "Inventory"],
} as const;

export const HERO = {
  eyebrow: "One building / One service thread",
  headA: "Every signal",
  headB: "has a next move.",
  body: "Orravan connects the person servicing the system to the intelligence operating the building—and stays with it through resolution.",
  primary: "Follow the response",
  secondary: "Request service",
} as const;

/** The day the page walks through. One incident, start to verified. */
export const INCIDENT = {
  what: "AHU-3 supply air temperature drifting above setpoint",
  since: "Since 6:42 AM today",
  why: ["Comfort may be degraded on Level 3", "Efficiency at risk if unaddressed"],
  response: "Inspect and calibrate supply air sensor and re-balance airflow",
  priority: "Medium",
  specialist: { name: "Miguel Santos", role: "Senior Controls Specialist" },
  status: "In progress",
} as const;

export const SPACES = [
  { label: "Occupied space", detail: "People and operations", icon: "space" },
  { label: "Controls", detail: "The building's brain", icon: "controls" },
  { label: "Mechanical", detail: "Systems in motion", icon: "mechanical" },
  { label: "Monitored", detail: "Always connected", icon: "monitored" },
] as const;

export const RESPONSE = [
  { time: "6:45 AM", who: "Remote specialist", did: "Confirms the diagnosis", slot: "response-remote" },
  { time: "8:12 AM", who: "Field technician", did: "Corrects the equipment", slot: "response-field" },
  { time: "9:20 AM", who: "Facility leader", did: "Receives confirmation", slot: "response-leader" },
] as const;

export const VERIFIED = {
  time: "9:22 AM",
  note: "All conditions normal. System balanced.",
  chips: ["Comfort restored", "Condition verified", "Service documented"],
} as const;

export const SERVICES = [
  {
    name: "Building automation systems",
    detail: "Open, secure and integrated controls that connect people, equipment and data.",
    cta: "Explore automation",
  },
  { name: "HVAC systems", detail: "Design, service and optimization for the systems that move air and water.", cta: "Explore HVAC" },
  { name: "Remote monitoring", detail: "Conditions watched continuously, with a specialist on the other end.", cta: "Explore monitoring" },
] as const;

export const FLOW = {
  bullets: ["Emergency inventory", "Panel fabrication", "On-site support"],
  cta: "View inventory",
  stops: ["flow-warehouse", "flow-parts", "flow-scan", "flow-van"],
} as const;

export const TEAM = {
  copy: "Senior-level expertise across software, controls and mechanical systems. Join the people building what buildings become.",
  primary: "Meet the team",
  secondary: "Explore careers",
} as const;

export const RECORD = {
  timeline: [
    { stage: "Detected", time: "6:42 AM" },
    { stage: "Assigned", time: "6:45 AM" },
    { stage: "Action taken", time: "8:12 AM" },
    { stage: "Verified", time: "9:22 AM" },
    { stage: "Documents", time: "Complete" },
  ],
  rows: [
    { event: "Detected", details: "AHU-3 supply air temp high", by: "System", time: "6:42 AM" },
    { event: "Assigned", details: "Miguel Santos", by: "Intelligence", time: "6:45 AM" },
    { event: "Action taken", details: "Calibrated sensor and balanced airflow", by: "Field tech", time: "8:12 AM" },
    { event: "Verified", details: "All conditions normal", by: "Miguel Santos", time: "9:22 AM" },
    { event: "Documents", details: "Work order, photos, report", by: "System", time: "9:23 AM" },
  ],
  documents: [
    { name: "Work Order #82317", kind: "PDF" },
    { name: "Photos", kind: "ZIP" },
    { name: "Service Report", kind: "PDF" },
    { name: "Trend Log", kind: "CSV" },
  ],
} as const;

export const CLOSE = {
  copy: "Every event. Every action. Every document—one service record.",
  primary: "Start a project",
  secondary: "Request immediate service",
  tertiary: "Client access",
} as const;

export const FOOTER = {
  columns: [
    { title: "Intelligence", links: ["Automation", "HVAC", "Monitoring", "Inventory"] },
    { title: "Services", links: ["Building automation", "HVAC systems", "Remote monitoring", "Inventory & fabrication"] },
    { title: "Industries", links: ["Healthcare", "Offices", "Hospitality", "Education", "Restaurants"] },
    { title: "Company", links: ["About us", "Our team", "Careers", "Contact"] },
  ],
} as const;
