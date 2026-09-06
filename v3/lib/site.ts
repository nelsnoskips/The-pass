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
  headA: "Delivering senior level",
  headB: "service since 2014.",
  /* Service delivery leads. The intelligence is how the work gets done,
     not what is being sold — that ordering is the whole reposition. */
  body:
    "Commercial mechanical and HVAC, delivered by trained trades who stay with the job to resolution. Retrofit, automation, service and maintenance, backed by the intelligence to see what a building needs before it asks.",
  primary: "Request service",
  secondary: "Start a project",
  anchor: "Who we are",
} as const;

/**
 * The four pillars, directly below the hero.
 *
 * They replace the three live-condition chips that used to float beside
 * the mark. Those read as a product demo at the moment the page should
 * be saying what Orravan does — and a visitor who wants HVAC service
 * should not have to infer it from a supply-fan status.
 */
export const PILLARS = [
  {
    name: "Retrofit",
    detail: "Mechanical retrofits that lift performance, reliability and comfort in buildings already running.",
  },
  {
    name: "Automation",
    detail: "Building automation and DDC controls: upgrades, integration, programming and support.",
  },
  {
    name: "Service",
    detail: "Commercial HVAC service with people who know the building before they arrive.",
  },
  {
    name: "Maintenance",
    detail: "Planned maintenance that finds the problem while it is still small.",
  },
] as const;

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
  copy: "Healthcare to mission critical. The building changes; the standard does not.",
  /* `focus` is the vertical object-position for each plate, chosen one
     photograph at a time from rendered crops at the live band aspect
     (see README, "Matching a mock"). The band is far wider than the
     source, so a single shared value clips somebody in every frame. */
  tabs: [
    { name: "Healthcare", slot: "industry-healthcare", focus: "50%" },
    { name: "Commercial", slot: "industry-commercial", focus: "70%" },
    { name: "Education", slot: "industry-education", focus: "45%" },
    { name: "Hospitality", slot: "industry-hospitality", focus: "50%" },
    { name: "Restaurants", slot: "industry-restaurants", focus: "32%" },
    { name: "Mission critical", slot: "industry-mission", focus: "40%" },
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

/**
 * The FAQ. Orravan's own answers, supplied 3 Sep 2026, edited only for
 * punctuation. Rendered as an accordion and, separately, as FAQPage
 * structured data — the second is what actually feeds Google's rich
 * results and the AI answer engines, and is the substance behind the
 * SEO/AEO line in the agreement rather than a talking point.
 */
export const FAQ = {
  head: ["Questions,", "answered."],
  copy: "The things people ask before they call. If yours is not here, call it in.",
  items: [
    {
      q: "What services does Orravan Mechanical provide?",
      a: "Orravan Mechanical provides commercial mechanical and HVAC services, including mechanical retrofits, building automation and controls, HVAC service, maintenance, and project support.",
    },
    {
      q: "What types of facilities does Orravan Mechanical work on?",
      a: "We work with commercial and institutional facilities — healthcare, hospitality, education, government, data centers and more — and provide customized mechanical solutions based on each building's operational needs.",
    },
    {
      q: "Does Orravan Mechanical provide HVAC retrofits?",
      a: "Yes. We specialize in mechanical retrofit projects designed to improve system performance, reliability, efficiency, and overall building comfort.",
    },
    {
      q: "Does Orravan Mechanical provide building automation and controls services?",
      a: "Yes. Our team provides building automation and controls solutions, including system upgrades, DDC controls, equipment integration, programming, and support.",
    },
    {
      q: "Does Orravan Mechanical offer preventative maintenance and service?",
      a: "Yes. We offer ongoing mechanical service and support to help maintain HVAC equipment, improve reliability, and identify potential issues before they become major problems.",
    },
    {
      q: "Does Orravan Mechanical work with general contractors?",
      a: "Yes. We regularly collaborate with general contractors, owners, engineers, and other project stakeholders throughout the construction process.",
    },
    {
      q: "How does Orravan Mechanical prioritize safety?",
      a: "Orravan Mechanical is committed to maintaining safe job sites through proper planning, training, communication, and adherence to industry safety standards. We work to protect our employees, clients, project partners, and the facilities we serve while delivering every project safely and reliably.",
    },
    {
      q: "What makes Orravan Mechanical different?",
      a: "Orravan Mechanical focuses on delivering reliable outcomes through technical expertise, strong communication, safety, accountability, and a commitment to long-term client relationships.",
    },
    {
      q: "Does Orravan Mechanical provide residential HVAC services?",
      a: "No. Orravan Mechanical specializes in commercial mechanical and HVAC services and does not provide residential HVAC services.",
    },
  ],
} as const;
