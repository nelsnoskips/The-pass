export type Comparison = {
  slug: string;
  competitor: string;
  /** How the competitor describes itself, stated fairly. */
  whatItIs: string;
  headline: string;
  subline: string;
  metaTitle: string;
  metaDescription: string;
  /** Factual, publicly observable mechanics — no editorializing. */
  shortfalls: { title: string; detail: string }[];
  /** The honesty section: when the competitor is genuinely the right call. */
  whenTheyAreRight: string;
  /** Table rows: [dimension, The Pass, competitor]. */
  table: [string, string, string][];
};

const SHARED_ROWS: ((c: string) => [string, string, string])[] = [
  () => [
    "Who owns the website",
    "You. The design, the code, and the domain are yours outright.",
    "The platform. Cancel the subscription and the site goes with it.",
  ],
  () => [
    "Design",
    "Custom, from a blank page — built around your food and your room.",
    "A template shared with the platform's other restaurant customers.",
  ],
  () => [
    "Cost shape",
    "One project fee (from $3,000–4,000). Optional care at $900/mo — cancel anytime.",
    "A subscription that never ends, whether or not anything improves.",
  ],
  () => [
    "SEO",
    "Titles, descriptions, and structured data written by hand for your restaurant and your city.",
    "Auto-generated metadata produced at platform scale.",
  ],
  () => [
    "If you ever leave",
    "Nothing happens. The site keeps running — it's yours.",
    "You start over from zero, including your search history's momentum.",
  ],
];

export const COMPARISONS: Comparison[] = [
  {
    slug: "spothopper",
    competitor: "SpotHopper",
    whatItIs:
      "SpotHopper is an all-in-one restaurant marketing platform: a subscription that bundles a website with social posts, flyers, and marketing tools.",
    headline: "Renting a template, or owning your site.",
    subline:
      "SpotHopper bundles a lot for the money. The website in that bundle is the part your guests actually see — and it's a template.",
    metaTitle: "The Pass vs SpotHopper — own your restaurant website",
    metaDescription:
      "Comparing SpotHopper's subscription template websites with a custom-built restaurant site you own. Design, SEO mechanics, cost shape, and what happens if you leave.",
    shortfalls: [
      {
        title: "Auto-generated SEO that isn't about you",
        detail:
          "On live SpotHopper sites we've reviewed, the page title Google displays is often produced by the platform — generic lines like “Best Breakfast & Brunch in CA,” and in some cases naming the wrong city for the restaurant's actual location. The one line of text every searcher sees isn't written about your restaurant.",
      },
      {
        title: "Duplicate microsites competing with your own domain",
        detail:
          "Some SpotHopper accounts run a second, platform-generated SEO domain carrying the same content as the main site. Search engines see two near-identical sites splitting the same queries.",
      },
      {
        title: "Stock structure, stock imagery",
        detail:
          "Menu pages arrive as the platform's standard modules with numeric-slug URLs, and template sections often ship with stock photography until someone swaps it. The room has a point of view; the template doesn't.",
      },
    ],
    whenTheyAreRight:
      "If what you need most is volume — somebody producing social posts, flyers, and emails every week for one predictable fee — and the website itself just needs to exist, SpotHopper's bundle can be a reasonable trade. Our argument is only about the website: the thing guests judge shouldn't be the template in the bundle.",
    table: [
      ...SHARED_ROWS.map((r) => r("SpotHopper")),
      [
        "The bundle",
        "We do one thing: the website, engineered to be found and to convert.",
        "Site plus social plus flyers — breadth over depth, one subscription.",
      ],
    ],
  },
  {
    slug: "owner",
    competitor: "Owner.com",
    whatItIs:
      "Owner.com is an online-ordering and marketing platform for restaurants; a website is included as the storefront for its commission-free ordering system.",
    headline: "A storefront for ordering, or a home for your restaurant.",
    subline:
      "Owner.com is built around the order button. Everything else about your restaurant — the story, the room, the reasons people choose you — rides in back.",
    metaTitle: "The Pass vs Owner.com — own your restaurant website",
    metaDescription:
      "Comparing Owner.com's ordering-first template sites with a custom restaurant website you own. Crawlability, design, cost shape, and ownership.",
    shortfalls: [
      {
        title: "Pages that search engines struggle to read",
        detail:
          "Owner.com sites we've reviewed deliver nearly all of their content through JavaScript, with only a thin HTML shell underneath. Search engines and AI answer engines do best with real, crawlable content — a JavaScript shell asks them to do extra work to see you at all.",
      },
      {
        title: "One template, ordering-first",
        detail:
          "The layout is the platform's, shared across its customers, and organized around the ordering funnel. A 50-year-old institution and a two-month-old ghost kitchen get the same skeleton.",
      },
      {
        title: "The trimmings aren't included",
        detail:
          "On Owner.com sites we've reviewed, restaurants often still run their public contact through a personal Gmail address — the platform's scope ends at the storefront.",
      },
    ],
    whenTheyAreRight:
      "If delivery and pickup volume are genuinely the whole business — a delivery-first concept where the site's only job is taking orders without third-party commissions — Owner.com's focus is a real strength. Keep it for ordering if it's working. Our argument is about everything else a website does: being found, telling the story, and filling the dining room.",
    table: [
      ...SHARED_ROWS.map((r) => r("Owner.com")),
      [
        "Ordering",
        "Your existing ordering (Toast, Square, or Owner itself) wired into a site built around the whole restaurant.",
        "The platform's ordering system, with the website as its checkout page.",
      ],
    ],
  },
  {
    slug: "bentobox",
    competitor: "BentoBox",
    whatItIs:
      "BentoBox is the most established restaurant-website platform: hospitality-specific templates with menus, events, and catering tools, sold as a subscription with setup.",
    headline: "The best rental on the market is still a rental.",
    subline:
      "Credit where due: BentoBox sites are professional. But professional and yours are different things — and the difference compounds every month you pay for it.",
    metaTitle: "The Pass vs BentoBox — own your restaurant website",
    metaDescription:
      "Comparing BentoBox's subscription templates with a custom restaurant website you own outright. A fair look at design, cost over time, and ownership.",
    shortfalls: [
      {
        title: "A theme thousands of restaurants share",
        detail:
          "BentoBox templates are well made, and recognizable — the same bones appear across its customer base. Your website ends up describing the platform's taste, not your room's.",
      },
      {
        title: "The vendor's name on your restaurant's site",
        detail:
          "BentoBox sites carry the platform's branding in the footer, and template defaults linger — live sites we've reviewed still expose stock URLs like “/menu/sample-menu/” years after launch.",
      },
      {
        title: "Subscription math",
        detail:
          "Setup plus a monthly fee, growing as you add modules. Two to three years of renting typically costs more than owning a custom site outright — with nothing owned at the end of it.",
      },
    ],
    whenTheyAreRight:
      "For a large group that wants an enterprise vendor — account management, many locations on one managed platform, procurement-friendly contracts — BentoBox is a legitimate choice, and the strongest of the template platforms. For an independent restaurant, you're paying enterprise rent for a template. Owning costs about the same in year one and nothing like it after.",
    table: [
      ...SHARED_ROWS.map((r) => r("BentoBox")),
      [
        "The footer",
        "Your name. Nothing else.",
        "“Powered by BentoBox.”",
      ],
    ],
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
