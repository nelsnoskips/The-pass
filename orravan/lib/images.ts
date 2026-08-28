/**
 * Every photograph on the page, addressed by slot.
 *
 * The asset library is uploaded into public/images/ — drop the files in
 * and map each slot's src here. Until a file exists at its path, the
 * slot renders a composed placeholder, so the page is reviewable with
 * the folder empty and uploading the library is the whole deployment
 * step.
 */

export type Slot = {
  src: string;
  alt: string;
  /** What the shot needs to be, for whoever is picking from the library. */
  brief: string;
};

export const IMAGES: Record<string, Slot> = {
  logo: {
    src: "/images/logo-orravan.png",
    alt: "Orravan",
    brief: "The script wordmark, transparent background. SVG or wide PNG.",
  },
  "hero-technician": {
    src: "/images/hero-technician.jpg",
    alt: "An Orravan technician at an open controls panel, tablet in hand",
    brief: "Technician in black Orravan shirt at an open electrical/controls panel, tablet in hand, portrait-ish crop, light industrial interior.",
  },
  "building-section": {
    src: "/images/building-section.jpg",
    alt: "Cross-section of an occupied building, floor by floor",
    brief: "Building cut-away / floor grid: occupied floors above, plant below. Dark, wide.",
  },
  "equipment-plant": {
    src: "/images/equipment-plant.jpg",
    alt: "Mechanical plant: pipes, pumps and air handlers",
    brief: "Dark mechanical room, chillers and piping, moody single-source light. Very wide.",
  },
  "equipment-racks": {
    src: "/images/equipment-racks.jpg",
    alt: "A technician at the controls racks",
    brief: "Tech at glowing control racks, seen from behind/side. Tall crop.",
  },
  "briefing-viewers": {
    src: "/images/briefing-viewers.jpg",
    alt: "A facility leader and specialist reading the service briefing",
    brief: "Two people in front of a large dark dashboard screen, warm office light.",
  },
  "response-remote": {
    src: "/images/response-remote.jpg",
    alt: "Remote specialist confirming the diagnosis",
    brief: "Specialist with headset at multi-screen desk, dark ops room.",
  },
  "response-field": {
    src: "/images/response-field.jpg",
    alt: "Field technician correcting the equipment",
    brief: "Tech in cap working in an equipment bay, hands on the system.",
  },
  "response-leader": {
    src: "/images/response-leader.jpg",
    alt: "Facility leader receiving confirmation",
    brief: "Facility leader with tablet in a bright lobby/office, relieved calm.",
  },
  "verified-office": {
    src: "/images/verified-office.jpg",
    alt: "A comfortable, working office",
    brief: "Bright occupied office, people working comfortably, daylight. Very wide.",
  },
  "verified-leader": {
    src: "/images/verified-leader.jpg",
    alt: "The facility leader, system verified",
    brief: "Person with tablet by a window, Orravan shirt, green-checked UI visible.",
  },
  "services-control": {
    src: "/images/services-control.jpg",
    alt: "The Orravan operations room",
    brief: "Ops room with several specialists at screens, dark, blue glow.",
  },
  "flow-warehouse": {
    src: "/images/flow-warehouse.jpg",
    alt: "Emergency inventory being pulled",
    brief: "Warehouse tech pulling a part from shelving.",
  },
  "flow-parts": {
    src: "/images/flow-parts.jpg",
    alt: "Fabricated panels and parts",
    brief: "Panels/parts as product shots on dark ground.",
  },
  "flow-scan": {
    src: "/images/flow-scan.jpg",
    alt: "A part scanned into the job",
    brief: "Hands scanning a labeled part with a phone.",
  },
  "flow-van": {
    src: "/images/flow-van.jpg",
    alt: "An Orravan van on its way",
    brief: "White Orravan van, side view, on the move.",
  },
  "team-table": {
    src: "/images/team-table.jpg",
    alt: "The Orravan team around a set of drawings",
    brief: "6-8 people in Orravan black around a big table of drawings, wide.",
  },
};
