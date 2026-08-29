/**
 * Orravan — direction 2: "The building knows. Now you do."
 *
 * The same company told as a product story: one signal (Zone 4B running
 * warm on 4/23) is detected, explained in plain language, assigned,
 * corrected, verified and documented — and the page is the record of
 * it. Every time, name and number below appears in the mock, so the
 * sections, the work order and the footer can never disagree.
 */

export const ORRAVAN = {
  name: "Orravan",
  fullName: "Orravan Mechanical",
  domain: "orravan.ai",
  phone: "(832) 817-0006",
  email: "hello@orravan.ai",
  license: "License No. 644288",
} as const;

export const NAV = {
  menus: ["Intelligence", "Services", "Industries", "Company"],
  quick: ["Automation", "HVAC", "Monitoring", "Inventory"],
  portal: "Service Portal",
  request: "Request Service",
} as const;

/** The entrance: blue plate, mark, two doors, then the headline. */
export const ENTRANCE = {
  cue: "Scroll to enter",
  headA: "The building",
  headB: "knows. Now you do.",
  body:
    "Orravan.ai unites building intelligence, automation and expert service to turn signal into action—so your people, your systems and your building perform at their best.",
  primary: "Start a project",
  secondary: "Request immediate service",
  /** Live conditions floating behind the mark. */
  chips: [
    { label: "Air quality", state: "Good" },
    { label: "AHU-3 supply fan", state: "Normal" },
    { label: "Chilled water plant", state: "Optimal" },
  ],
} as const;

export const VIEW = {
  head: ["One view.", "Every system."],
  layers: [
    { n: "01", label: "Occupied space", detail: "People and comfort" },
    { n: "02", label: "Controls", detail: "Automation and insight" },
    { n: "03", label: "Mechanical", detail: "Equipment and energy" },
  ],
} as const;

/** The signal the whole page follows. */
export const SIGNAL = {
  head: ["Less dashboard.", "More direction."],
  copy: "Plain language. Clear priorities. Recommended next steps.",
  cta: "See how it works",
  eyebrow: "Priority signal",
  title: "Zone 4B Temperature High",
  priority: "High",
  meaning:
    "Space temperature is above comfort range. Affecting occupied hours.",
  action:
    "Check air delivery position and reheat valve. Verify space sensor calibration.",
  buttons: ["View details", "Create work order"],
  nav: ["Overview", "Signals", "Systems", "Inventory", "Reports"],
} as const;

export const DECISION = {
  head: ["From signal", "to decision."],
  copy: "People. Process. Performance.",
  cta: "Our service approach",
  steps: [
    {
      n: "01",
      role: "Remote specialist",
      detail: "We review your signal and guide the path.",
      slot: "decision-remote",
    },
    {
      n: "02",
      role: "Field technician",
      detail: "On-site inspection. Documents findings. Restores performance.",
      slot: "decision-field",
    },
    {
      n: "03",
      role: "Client confirmation",
      detail: "You receive the action and full documentation.",
      slot: "decision-client",
    },
  ],
} as const;

export const RESOLUTION = {
  head: ["Resolution", "you can see."],
  copy: "Verified performance. Documented results. Confidence in every detail.",
  card: {
    status: "Verified",
    title: "Zone 4B Temperature High",
    state: "Resolved",
    note: "Temperature returned to comfort range.",
    stamp: "4/23/2025 8:41 AM",
    who: "Technician: J. Martinez",
  },
} as const;

export const SERVICES = {
  head: ["Intelligence,", "applied."],
  cta: "Explore services",
  items: [
    {
      name: "Building automation",
      detail: "Smarter controls. Better outcomes.",
      slot: "service-automation",
    },
    {
      name: "HVAC systems",
      detail: "Reliable systems. Efficient operation.",
      slot: "service-hvac",
    },
    {
      name: "Remote monitoring",
      detail: "24/7 coverage. Early issue detection.",
      slot: "service-monitoring",
    },
    {
      name: "Inventory & fabrication",
      detail: "Right parts. Right when you need them.",
      slot: "service-inventory",
    },
  ],
} as const;

export const DIFFERENCE = {
  head: ["Software sees.", "Experience decides."],
  copy: "Intelligence and field expertise—working together for your building.",
  cta: "Our difference",
} as const;

export const TEAM = {
  head: ["Build what", "buildings become."],
  copy: "Controls. Mechanical. Software. Service. One team. One purpose.",
  primary: "Meet the team",
  secondary: "Explore careers",
} as const;

export const INDUSTRIES = {
  head: ["Built for", "every industry."],
  tabs: [
    { name: "Healthcare", slot: "industry-healthcare" },
    { name: "Commercial", slot: "industry-commercial" },
    { name: "Education", slot: "industry-education" },
    { name: "Hospitality", slot: "industry-hospitality" },
    { name: "Restaurants", slot: "industry-restaurants" },
    { name: "Mission critical", slot: "industry-mission" },
  ],
} as const;

export const RECORD = {
  head: ["Client record.", "Complete.", "Verified."],
  order: "Work Order # WO-267812",
  subject: "Zone 4B Temperature High",
  cta: "View full history",
  steps: [
    {
      stage: "Detected",
      time: "4/23/2025 8:35 AM",
      detail: "System detected high temperature.",
    },
    {
      stage: "Assigned",
      time: "4/23/2025 8:40 AM",
      detail: "Assigned to J. Martinez.",
    },
    {
      stage: "Action taken",
      time: "4/23/2025 8:45 AM",
      detail: "Reheat valve adjusted. Sensor calibrated.",
    },
    {
      stage: "Verified",
      time: "4/23/2025 8:41 AM",
      detail: "Performance verified in the range.",
    },
    {
      stage: "Documents complete",
      time: "4/23/2025 8:46 AM",
      detail: "All documents uploaded. Record complete.",
    },
  ],
} as const;

export const CLOSE = {
  head: ["What could your", "building do better?"],
} as const;

export const FOOTER = {
  columns: [
    {
      title: "Solutions",
      links: ["Automation", "HVAC", "Monitoring", "Inventory"],
    },
    { title: "Company", links: ["About", "Our team", "Careers", "Contact"] },
  ],
  social: ["LinkedIn", "YouTube", "X"],
  copyright: "© 2025 Orravan.ai, Inc. All rights reserved.",
} as const;
