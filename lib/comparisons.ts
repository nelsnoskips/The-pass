export type Comparison = {
  slug: string;
  competitor: string;
  /**
   * The query the page answers, verbatim (e.g. "SpotHopper alternative").
   * AI Max reads landing-page copy as an ad-matching signal, so the exact
   * phrase must appear in the title and body, not just the ad.
   */
  searchPhrase: string;
  /** How the competitor describes itself, stated fairly. */
  whatItIs: string;
  headline: string;
  subline: string;
  metaTitle: string;
  metaDescription: string;
  /**
   * One-sentence extractable summary rendered above the table — the line
   * an answer engine can lift whole.
   */
  verdict: string;
  /** Factual, publicly observable mechanics — no editorializing. */
  shortfalls: { title: string; detail: string }[];
  /** The honesty section: when the competitor is genuinely the right call. */
  whenTheyAreRight: string;
  /** Table rows: [dimension, The Pass, competitor]. */
  table: [string, string, string][];
  /** Rendered on-page and mirrored in FAQPage structured data. */
  faqs: { q: string; a: string }[];
};

/** Stamped into visible copy and dateModified when the pages are re-audited. */
export const LAST_REVIEWED = "2026-08-25";

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
    searchPhrase: "SpotHopper alternative",
    whatItIs:
      "SpotHopper is an all-in-one restaurant marketing platform: a subscription that bundles a website with social posts, flyers, and marketing tools.",
    headline: "Renting a template, or owning your site.",
    subline:
      "If you're weighing a SpotHopper alternative, start with the part of the bundle your guests actually see. The website is a template — and it's carrying your restaurant's name.",
    metaTitle: "SpotHopper Alternative for Restaurant Websites — The Pass vs SpotHopper",
    metaDescription:
      "Looking for a SpotHopper alternative? An honest comparison of SpotHopper's subscription template websites with a custom-built restaurant site you own — design, SEO mechanics, cost shape, and what happens if you leave.",
    verdict:
      "The Pass builds custom restaurant websites you own outright for a one-time fee; SpotHopper rents you a template website inside a marketing subscription. Choose The Pass if the website itself matters most; choose SpotHopper if weekly social posts and flyers matter more than the site.",
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
    faqs: [
      {
        q: "Is The Pass a SpotHopper alternative?",
        a: "For the website, yes. The Pass replaces the template site in SpotHopper's bundle with a custom website you own outright. We don't replace the social posts and flyers — if that part of the bundle is earning its keep, you can keep a marketing service alongside a site you own.",
      },
      {
        q: "What does a custom restaurant website cost compared to SpotHopper?",
        a: "The Pass is a one-time project fee — from $3,000 for a rebuild of an existing site, from $4,000 for a new opening — with optional ongoing care at $900/mo you can cancel anytime. SpotHopper is a subscription that continues for as long as you want the website to exist.",
      },
      {
        q: "How long does switching from SpotHopper take?",
        a: "A rebuild typically takes ten days to two weeks; a full new site takes two to three weeks. Your current site stays live until the new one replaces it, so there's no gap.",
      },
      {
        q: "Do I lose my Google rankings if I leave SpotHopper?",
        a: "Not if the move is done properly. We rebuild on your own domain with page-by-page redirects, hand-written titles and structured data — which also retires any duplicate platform-generated SEO microsite competing with your main domain.",
      },
    ],
  },
  {
    slug: "owner",
    competitor: "Owner.com",
    searchPhrase: "Owner.com alternative",
    whatItIs:
      "Owner.com is an online-ordering and marketing platform for restaurants; a website is included as the storefront for its commission-free ordering system.",
    headline: "A storefront for ordering, or a home for your restaurant.",
    subline:
      "If you're looking for an Owner.com alternative, here's the honest frame: Owner.com is built around the order button. Everything else about your restaurant — the story, the room, the reasons people choose you — rides in back.",
    metaTitle: "Owner.com Alternative for Restaurant Websites — The Pass vs Owner.com",
    metaDescription:
      "Looking for an Owner.com alternative? An honest comparison of Owner.com's ordering-first template sites with a custom restaurant website you own — crawlability, design, cost shape, and ownership.",
    verdict:
      "The Pass builds a custom website around your whole restaurant and wires in whatever ordering you already use; Owner.com supplies a template storefront for its own ordering system. Choose The Pass to be found and to fill the dining room; choose Owner.com if delivery and pickup volume are the entire business.",
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
    faqs: [
      {
        q: "Is The Pass an Owner.com alternative?",
        a: "For the website, yes. The Pass builds a custom site around the whole restaurant — the room, the story, the search presence — instead of a storefront organized around an ordering funnel. If Owner.com's commission-free ordering is working for you, we can keep it and wire it into the new site.",
      },
      {
        q: "Can I keep commission-free online ordering with a custom website?",
        a: "Yes. We integrate the ordering you already run — Toast, Square, or Owner.com itself — into a site built around the whole restaurant, so the order button is present without being the entire architecture.",
      },
      {
        q: "What does a custom restaurant website cost compared to Owner.com?",
        a: "The Pass is a one-time project fee — from $3,000 for a rebuild, from $4,000 for a new opening — with optional care at $900/mo, cancel anytime. Owner.com is a monthly subscription for as long as the site exists.",
      },
      {
        q: "Why does crawlability matter for a restaurant website?",
        a: "Search engines and AI answer engines recommend restaurants from what they can read. Owner.com sites we've reviewed deliver nearly all content through JavaScript over a thin HTML shell; a custom site ships real, crawlable pages, so 'best pasta near me' can actually find you.",
      },
    ],
  },
  {
    slug: "bentobox",
    competitor: "BentoBox",
    searchPhrase: "BentoBox alternative",
    whatItIs:
      "BentoBox is the most established restaurant-website platform: hospitality-specific templates with menus, events, and catering tools, sold as a subscription with setup.",
    headline: "The best rental on the market is still a rental.",
    subline:
      "Most searches for a BentoBox alternative start from the same place: the sites are professional, but professional and yours are different things — and the difference compounds every month you pay for it.",
    metaTitle: "BentoBox Alternative for Restaurant Websites — The Pass vs BentoBox",
    metaDescription:
      "Looking for a BentoBox alternative? A fair comparison of BentoBox's subscription templates with a custom restaurant website you own outright — design, cost over time, and ownership.",
    verdict:
      "The Pass builds a custom restaurant website you own outright for a one-time fee; BentoBox rents polished, hospitality-specific templates on an open-ended subscription. Choose The Pass if you're an independent restaurant that wants to own its site; BentoBox suits large groups that want an enterprise vendor managing many locations.",
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
    faqs: [
      {
        q: "Is The Pass a BentoBox alternative?",
        a: "Yes — for independent restaurants, it's the ownership alternative. Instead of renting a hospitality template on subscription, The Pass designs and builds a custom website that belongs to you: the design, the code, and the domain.",
      },
      {
        q: "What does switching from BentoBox cost?",
        a: "A rebuild starts at $3,000 as a one-time fee; a new site from $4,000. Year one usually costs about the same as a year of BentoBox setup-plus-subscription — but at the end of it you own the site, and there's no required monthly fee after that. Optional care is $900/mo, cancel anytime.",
      },
      {
        q: "Do I lose my menus, photos, and Google rankings if I leave BentoBox?",
        a: "No. Your content is yours — we rebuild menus and pages on your own domain with page-by-page redirects so search momentum carries over, and the new pages get hand-written titles and structured data instead of template defaults.",
      },
      {
        q: "How long does a BentoBox replacement take?",
        a: "Ten days to two weeks for a rebuild of an existing site; two to three weeks for a full new build. The BentoBox site stays live until the new one takes over.",
      },
    ],
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
