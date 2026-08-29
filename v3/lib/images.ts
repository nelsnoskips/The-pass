/**
 * Every photograph on the page, addressed by slot.
 *
 * public/images is the shared client library (a symlink to the one copy
 * every Orravan version reads). Until a file exists at a slot's path,
 * the slot renders a composed placeholder, so the page is reviewable
 * before new artwork lands and dropping the file in is the whole
 * deployment step.
 *
 * `brief` says what the shot needs to be — the slots still carrying a
 * stand-in from the v2 library are marked "STAND-IN".
 */

/** Every asset URL goes through here so a based build stays whole. */
export const asset = (path: string) =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

export type Slot = { src: string; alt: string; brief: string };

export const IMAGES: Record<string, Slot> = {
  logo: {
    src: "/images/15-official-orravan-logo.png",
    alt: "Orravan",
    brief: "The official mark: checked O plus the wordmark, transparent PNG.",
  },

  /* --- the entrance ------------------------------------------------- */
  "entrance-building": {
    src: "/images/02-building-sectional-cutaway.png",
    alt: "",
    brief: "The building, faint behind the mark — its layers just readable through the blue.",
  },
  "entrance-leader": {
    src: "/images/07-response-facility-leader.png",
    alt: "A facility leader reading the building's status",
    brief: "The facility leader, cut out or on a clean ground: the nearer depth plane in the entrance.",
  },

  /* --- one view, every system --------------------------------------- */
  "view-building": {
    src: "/images/02-building-sectional-cutaway.png",
    alt: "A building in section: occupied floors, controls and plant",
    brief: "Sectional cutaway, floors legible, wide.",
  },

  /* --- less dashboard, more direction -------------------------------- */
  "signal-people": {
    src: "/images/04-intelligence-briefing-people.png",
    alt: "A facility leader and an Orravan specialist reading a signal together",
    brief: "STAND-IN. Wanted: two people at a tablet beside the app, warm daylight, Orravan polo on the specialist.",
  },

  /* --- from signal to decision --------------------------------------- */
  "decision-remote": {
    src: "/images/05-response-remote-specialist.png",
    alt: "A remote specialist reviewing the signal",
    brief: "Headset specialist at a multi-screen desk.",
  },
  "decision-field": {
    src: "/images/06-response-field-technician.png",
    alt: "A field technician on site",
    brief: "Technician working the equipment, hands on the system.",
  },
  "decision-client": {
    src: "/images/07-response-facility-leader.png",
    alt: "The client receiving confirmation",
    brief: "Client with phone or tablet, confirmation in hand.",
  },

  /* --- resolution you can see ---------------------------------------- */
  "resolution-people": {
    src: "/images/section-05-verified-lobby-continuous.jpg",
    alt: "An Orravan specialist and the facility leader, the work verified",
    brief: "STAND-IN. Wanted: the two of them seated together in the lobby, mid-conversation, the verified card sitting to their right.",
  },

  /* --- intelligence, applied ----------------------------------------- */
  "service-automation": {
    src: "/images/11-control-components.png",
    alt: "Controls hardware",
    brief: "STAND-IN. Wanted: a wall controller screen, straight on.",
  },
  "service-hvac": {
    src: "/images/03-equipment-room.png",
    alt: "Mechanical plant",
    brief: "Air handlers and piping, clean light.",
  },
  "service-monitoring": {
    src: "/images/09-remote-monitoring-room.png",
    alt: "The Orravan operations room",
    brief: "Specialist at the monitoring wall.",
  },
  "service-inventory": {
    src: "/images/10-inventory-technician.png",
    alt: "Parts pulled from inventory",
    brief: "Technician at the shelving, part in hand.",
  },

  /* --- software sees, experience decides ------------------------------ */
  "difference-software": {
    src: "/images/09-remote-monitoring-room.png",
    alt: "The monitoring wall",
    brief: "Ops room, screens carrying the room's light.",
  },
  "difference-experience": {
    src: "/images/12-on-site-technician.png",
    alt: "An Orravan technician on site",
    brief: "Technician in hard hat and Orravan polo, portrait crop.",
  },

  /* --- build what buildings become ------------------------------------ */
  team: {
    src: "/images/14-team-planning.png",
    alt: "The Orravan team around a set of drawings",
    brief: "The team at the table, wide, everyone head to hands.",
  },

  /* --- built for every industry --------------------------------------- */
  "industry-healthcare": {
    src: "/images/08-verified-lobby.png",
    alt: "A healthcare facility",
    brief: "STAND-IN. Wanted: patient room or clinical corridor.",
  },
  "industry-commercial": {
    src: "/images/section-05-verified-lobby-continuous.jpg",
    alt: "A commercial office",
    brief: "Occupied office floor, daylight.",
  },
  "industry-education": {
    src: "/images/04-intelligence-briefing-people.png",
    alt: "An education building",
    brief: "STAND-IN. Wanted: classroom or campus commons.",
  },
  "industry-hospitality": {
    src: "/images/07-response-facility-leader.png",
    alt: "A hospitality space",
    brief: "STAND-IN. Wanted: hotel lobby or restaurant floor.",
  },
  "industry-restaurants": {
    src: "/images/03-equipment-room.png",
    alt: "A restaurant's back of house",
    brief: "STAND-IN. Wanted: kitchen line or dining room.",
  },
  "industry-mission": {
    src: "/images/09-remote-monitoring-room.png",
    alt: "A mission-critical facility",
    brief: "Data hall or control room.",
  },

  /* --- the record ------------------------------------------------------ */
  "record-device": {
    src: "/images/07-response-facility-leader.png",
    alt: "The record, open on a tablet",
    brief: "STAND-IN. Wanted: a tablet held in hand showing the work order, cut out.",
  },
};
