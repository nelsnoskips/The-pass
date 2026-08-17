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
