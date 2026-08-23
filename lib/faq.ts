/**
 * The questions a restaurant owner actually types, answered from what
 * the studio actually offers.
 *
 * One source for both the visible section and the FAQPage schema.
 * Google requires the markup to match the copy on the page, and two
 * hand-maintained copies of the same nine answers drift the first time
 * a price changes — so the section renders from this and the schema is
 * generated from this.
 *
 * Answers lead with the answer. An assistant lifting one of these into
 * a reply will take the first sentence and little else, so the first
 * sentence has to be able to stand alone.
 */
export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: "How much does a restaurant website cost?",
    a: "A complete custom restaurant website from The Pass is $4,000, and a full redesign of an existing site is $3,000. Ongoing care, hosting and search tuning is $900 a month and is optional. Payment runs forty percent to reserve the calendar, thirty percent when you approve the design direction, and thirty percent at launch.",
  },
  {
    q: "How long does it take to build a restaurant website?",
    a: "Two to three weeks for a new site, and ten days to two weeks for a redesign. Timelines run from the day the deposit and your content are in hand, not from the first conversation.",
  },
  {
    q: "Do you use templates like Squarespace, Wix or WordPress?",
    a: "No. Every site is designed and built from nothing, with no templates and nothing off the shelf. A template makes your restaurant look like every other restaurant that bought it, and it puts a ceiling on speed and on what the site can be made to do.",
  },
  {
    q: "Do I still need a website if my restaurant is on Instagram and Google?",
    a: "Yes, because those are rented and a website is owned. A social profile cannot take a reservation on your terms, cannot be found for the searches that matter, and can change its rules or its reach without asking you. Your site is the one place where the menu, the hours and the booking are yours.",
  },
  {
    q: "Will my restaurant show up in AI answers like ChatGPT or Google's AI Overviews?",
    a: "That is what answer engine optimisation is for, and it is included in every build rather than sold separately. Assistants answer from structured, machine-readable facts — your menu, hours, location and dishes marked up so they can be quoted — which is a different job from ranking on a page of blue links.",
  },
  {
    q: "Can guests book a table or order directly from the website?",
    a: "Yes. Menus, reservations and ordering are wired into every build, so a guest can go from finding you to holding a table without leaving the site. Conversion is designed into each page rather than added at the end.",
  },
  {
    q: "Who updates the menu after the site launches?",
    a: "The Residency covers it at $900 a month: menu and seasonal updates handled, hosting and security, ongoing search and AI-visibility tuning, and a monthly note on what changed and why. It is month to month, and you can step away at any time.",
  },
  {
    q: "What do you need from me to get started?",
    a: "Your menu, your photography if you have it, and an hour of your time to talk about the room. Everything else is the studio's job. Requesting a consultation is answered within one business day.",
  },
  {
    q: "Do you redesign an existing restaurant website, or only build new ones?",
    a: "Both. The Refresh is a full redesign rebuilt from the ground up on a custom foundation, with the menu and content restructured for guests and a speed and mobile pass, for $3,000.",
  },
];
