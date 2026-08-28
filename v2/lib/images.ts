/**
 * Every photograph on the page, addressed by slot.
 *
 * The asset library is uploaded into public/images/ — drop the files in
 * and map each slot's src here. Until a file exists at its path, the
 * slot renders a composed placeholder, so the page is reviewable with
 * the folder empty and uploading the library is the whole deployment
 * step.
 */

/** Every asset URL goes through here so a based build stays whole. */
export const asset = (path: string) =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

export type Slot = {
  src: string;
  alt: string;
  /** What the shot needs to be, for whoever is picking from the library. */
  brief: string;
};

export const IMAGES: Record<string, Slot> = {
  logo: {
    src: "/images/15-official-orravan-logo.png",
    alt: "Orravan",
    brief: "The script wordmark, transparent background. SVG or wide PNG.",
  },
  "hero-technician": {
    src: "/images/01-hero-safe-technician.png",
    alt: "An Orravan technician at an open controls panel, tablet in hand",
    brief: "Technician in black Orravan shirt at an open electrical/controls panel, tablet in hand, portrait-ish crop, light industrial interior.",
  },
  "building-section": {
    src: "/images/02-building-sectional-cutaway.png",
    alt: "Cross-section of an occupied building, floor by floor",
    brief: "Building cut-away / floor grid: occupied floors above, plant below. Dark, wide.",
  },
  "equipment-wide": {
    src: "/images/equipment-wide.jpg",
    alt: "The plant, wide: air falling from the duct, chillers, and the control racks",
    brief: "The mock's full section-02 panorama, regenerated at resolution: duct airflow left, plant center, racks right.",
  },
  "equipment-air": {
    src: "/images/03-equipment-room.png",
    alt: "An air handler, airflow made visible",
    brief: "The air layer of section 02.",
  },
  "equipment-plant": {
    src: "/images/03-equipment-room.png",
    alt: "Mechanical plant: pipes, pumps and air handlers",
    brief: "Dark mechanical room, chillers and piping, moody single-source light. Very wide.",
  },
  "equipment-racks": {
    src: "/images/03-equipment-room.png",
    alt: "A technician at the controls racks",
    brief: "Tech at glowing control racks, seen from behind/side. Tall crop.",
  },
  "briefing-viewers": {
    src: "/images/04-intelligence-briefing-people.png",
    alt: "A facility leader and specialist reading the service briefing",
    brief: "Two people in front of a large dark dashboard screen, warm office light.",
  },
  "response-remote": {
    src: "/images/05-response-remote-specialist.png",
    alt: "Remote specialist confirming the diagnosis",
    brief: "Specialist with headset at multi-screen desk, dark ops room.",
  },
  "response-field": {
    src: "/images/06-response-field-technician.png",
    alt: "Field technician correcting the equipment",
    brief: "Tech in cap working in an equipment bay, hands on the system.",
  },
  "response-leader": {
    src: "/images/07-response-facility-leader.png",
    alt: "Facility leader receiving confirmation",
    brief: "Facility leader with tablet in a bright lobby/office, relieved calm.",
  },
  "verified-office": {
    src: "/images/08-verified-lobby.png",
    alt: "A comfortable, working office",
    brief: "Bright occupied office, people working comfortably, daylight. Very wide.",
  },
  "verified-leader": {
    src: "/images/verified-leader.jpg",
    alt: "The facility leader, system verified",
    brief: "Person with tablet by a window, Orravan shirt, green-checked UI visible.",
  },
  "services-control": {
    src: "/images/09-remote-monitoring-room.png",
    alt: "The Orravan operations room",
    brief: "Ops room with several specialists at screens, dark, blue glow.",
  },
  "flow-warehouse": {
    src: "/images/10-inventory-technician.png",
    alt: "Emergency inventory being pulled",
    brief: "Warehouse tech pulling a part from shelving.",
  },
  "flow-parts": {
    src: "/images/11-control-components.png",
    alt: "Fabricated panels and parts",
    brief: "Panels/parts as product shots on dark ground.",
  },
  "flow-scan": {
    src: "/images/12-on-site-technician.png",
    alt: "A part scanned into the job",
    brief: "Hands scanning a labeled part with a phone.",
  },
  "flow-van": {
    src: "/images/13-service-van.png",
    alt: "An Orravan van on its way",
    brief: "White Orravan van, side view, on the move.",
  },
  "team-table": {
    src: "/images/14-team-planning.png",
    alt: "The Orravan team around a set of drawings",
    brief: "6-8 people in Orravan black around a big table of drawings, wide.",
  },
};
