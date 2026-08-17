/**
 * The Test Kitchen: concept rooms the studio builds to show what is
 * possible, presented as concepts rather than client work. Each entry
 * drives both the homepage section and its case page.
 */

export type Decision = { title: string; detail: string };

export type ConceptWork = {
  slug: string;
  name: string;
  /** One line, said the way the studio would say it. */
  tagline: string;
  segment: string;
  place: string;
  /** What the fictional brief asked for. */
  brief: string;
  /** The three decisions worth explaining on a sales call. */
  decisions: Decision[];
  proof: string[];
  package: string;
  liveUrl: string;
  image: string;
  /** Warmer frame for the homepage card; the hero can be darker. */
  cardImage: string;
  imageAlt: string;
  /** Set once the concept is built and linkable. */
  live: boolean;
};

export const WORK: ConceptWork[] = [
  {
    slug: "house-issue",
    name: "HOUSE ISSUE",
    tagline: "A deli that publishes everything it makes.",
    segment: "Neighborhood deli, rotisserie and goods",
    place: "Los Angeles, California",
    brief:
      "A counter open daily, selling sandwiches to people in a hurry and rotisserie chickens to people going home. It needed the opposite of a showpiece: hours, menu and phone number in reach immediately, and a reason for the same neighbours to come back next week.",
    decisions: [
      {
        title: "The conceit sits under the basics, never in front",
        detail:
          "Address, hours, phone and ordering are fixed in the bar directly beneath the masthead, before a word of personality. A hungry person at noon reaches the menu in one tap; the editorial idea is what they find if they stay.",
      },
      {
        title: "Everything is published as an issue",
        detail:
          "Seasonal menus, collaborations and runs of goods are numbered, dated and archived, each at a permanent address. A deli site usually has nothing worth returning to; this one accumulates, and last August's menu stays a record of what August tasted like.",
      },
      {
        title: "Restraint is the design",
        detail:
          "No pinned film, no veils, no motion at all: newsprint typography, dotted leaders, and photography set in ruled plates. The same studio that built SEREIN's scroll film chose none of it here, because the room is different.",
      },
    ],
    proof: [
      "Hours, address, phone and ordering above the fold",
      "Issue system with a permanent URL per issue and a full archive",
      "Goods shop tied to the issue each product came from",
      "No animation, no libraries: the page is the performance budget",
    ],
    package: "The Opening",
    liveUrl: "/house-issue",
    image: "/images/house/hero-storefront.jpg",
    cardImage: "/images/house/plate-rotisserie.jpg",
    imageAlt:
      "HOUSE ISSUE: a rotisserie chicken and crispy potatoes on a metal tray",
    live: true,
  },
  {
    slug: "serein",
    name: "SEREIN",
    tagline: "A tasting room that loses its light as you scroll.",
    segment: "Coastal tasting room",
    place: "Santa Barbara, California",
    brief:
      "A thirty-seat room serving ten courses at $210, one seating a night, beginning as the sun reaches the water. The site had to sell anticipation rather than convenience, and it had to make a stranger feel the room before booking it.",
    decisions: [
      {
        title: "The hero is a film the guest scrubs",
        detail:
          "Three graded frames of one composition dissolve from golden hour through dusk into candlelight while the camera dollies in, so the page darkens exactly the way dinner does. It resolves into a conventional, clickable hero, and a guest who arrives ready to book can reserve from the first frame.",
      },
      {
        title: "The clock is the sun, and it is real",
        detail:
          "Every seating time on the site, including each date in the reservation calendar, is computed from the actual Santa Barbara sunset. No API, no data feed, no maintenance: the hour moves with the season on its own.",
      },
      {
        title: "A members' circle, not a loyalty scheme",
        detail:
          "The Blue Hour gives the room recurring revenue and a waitlist, with dues credited against what members eat. It carries its own accent within the same house type, so it reads as a sibling brand rather than a page.",
      },
    ],
    proof: [
      "Cinematic hero in two engines, plus a still frame under reduced motion",
      "Reservation flow with live sunset-driven availability",
      "Membership brand, three tiers, request flow",
      "No JavaScript animation libraries; transform and opacity only",
    ],
    package: "The Opening, with the signature treatment",
    liveUrl: "/serein",
    image: "/images/serein/serein-night.jpg",
    cardImage: "/images/serein/room.png",
    imageAlt:
      "SEREIN: a candlelit stone sill looking out over the Pacific after sunset",
    live: true,
  },
];

export function getWork(slug: string): ConceptWork | undefined {
  return WORK.find((w) => w.slug === slug);
}
