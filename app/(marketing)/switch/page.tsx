import type { Metadata } from "next";
import Link from "next/link";

/**
 * The Switch — an unlisted sales page for restaurants and groups paying
 * a platform every month. Not in the nav, footer, or sitemap; noindex.
 * Sent as a link mid-conversation, so it opens with the argument and
 * closes with the switch pricing. Platform facts here are the verified
 * ones from the Sept 2026 competitive research and our own site audits;
 * the general claims name the model, not a vendor.
 */
export const metadata: Metadata = {
  title: "The Switch — The Pass by Madison Four",
  description:
    "For restaurants paying a platform every month: a custom website you own, priced against what you already pay.",
  robots: { index: false, follow: false },
};

const PLATFORM_FACTS = [
  {
    title: "The site lives on their servers",
    detail:
      "Cancel and the website goes offline. On the biggest restaurant platforms, reservations, ordering, and menu pages often live on the platform's own subdomains — so years of Google equity build up on web addresses the restaurant never owned.",
  },
  {
    title: "The SEO is generated, not written",
    detail:
      "Platform sites we've audited expose as few as five to nine pages to Google, with menus locked inside widgets search engines can't read. We've found auto-generated page titles naming the wrong city for the restaurant's actual location.",
  },
  {
    title: "The math never ends",
    detail:
      "Real platform customers we've researched pay $250–$550 a month on auto-renewing annual contracts, plus setup fees, plus add-ons — roughly $11,000 over two years, owning nothing at the end. Some platforms even own the photography: buying your own photos back can cost $3,000.",
  },
];

const HOW_WE_DO_IT = [
  {
    title: "AI search is the new front door — we build for it",
    detail:
      "When someone asks ChatGPT, Google's AI, or Perplexity where to eat, the answer comes from what those engines can read and trust. This is answer-engine optimization (AEO), and it's our specialty: real crawlable pages, structured data that spells out who and where you are, entity signals AI models actually cite. Template platforms serve widgets AI can barely see; we build sites that get quoted.",
  },
  {
    title: "You own everything",
    detail:
      "The design, the code, the domain, the photography, the content. From the day it launches, the site is an asset on your side of the ledger. If we ever part ways, nothing happens — it keeps running.",
  },
  {
    title: "Every page is real and readable",
    detail:
      "Menus as actual web pages Google and AI search can read, not images or widgets. Titles and descriptions written by hand for your restaurant and your city. Structured data that tells search engines exactly who and where you are.",
  },
  {
    title: "Designed, not templated",
    detail:
      "Your site starts from a blank page and your room, not a theme shared with thousands of other restaurants. For groups: each concept keeps its own identity, on one platform your team controls.",
  },
  {
    title: "Fast, everywhere",
    detail:
      "Static, modern engineering. Platform sites we've tested score 50–65 on mobile speed; ours ship in the 90s — and speed is a ranking input Google actually measures.",
  },
];

/** [dimension, The Pass, the platform model] — figures from the Sept 2026 research. */
const TABLE: [string, string, string][] = [
  [
    "What you pay",
    "At least 25% under your current bill — e.g. $500/mo becomes $350/mo, build included. Five or more locations: $300/mo each.",
    "$250–$550/mo plus setup fees and add-ons. Negotiated in a demo; never published.",
  ],
  [
    "The contract",
    "Twelve months covers the build, then month to month. Cancel anytime after.",
    "12-month lock-in that quietly auto-renews for another full year.",
  ],
  [
    "Who owns the website",
    "You — the design, the code, the domain, the content.",
    "The platform. Cancel and the site goes offline.",
  ],
  [
    "Your photography",
    "Yours, always.",
    "Often the platform's — buying back your own shoot can cost $3,000.",
  ],
  [
    "Where your pages live",
    "Your domain. Every visit and link builds equity you keep.",
    "Ordering, reservations, and menus often sit on the platform's subdomains.",
  ],
  [
    "SEO",
    "Hand-written titles and descriptions, menus as real indexable pages, structured data for your restaurant and your city.",
    "Auto-generated metadata at platform scale; audited sites expose as few as 5–9 pages to Google.",
  ],
  [
    "AI search (AEO)",
    "Built to be the answer ChatGPT, Google AI, and Perplexity cite: crawlable content, structured data, entity signals. Our specialty.",
    "Menus and content locked in widgets and subdomains that AI engines can't read or won't credit to your restaurant.",
  ],
  [
    "Speed",
    "Modern static engineering — mobile scores in the 90s.",
    "Typically 50–65 on mobile, and speed is a ranking input.",
  ],
  [
    "Making changes",
    "Care plan covers updates and refreshes. No hourly meter running.",
    "Site changes capped at ~15 hours a year, then $150/hour.",
  ],
  [
    "If you leave",
    "Nothing happens. The site keeps running — it's yours.",
    "The site disappears and you rebuild from scratch, redirects and rankings included.",
  ],
];

export default function SwitchPage() {
  return (
    <>
      {/* Dark hero */}
      <section className="bg-[#0A0A09]">
        <div className="mx-auto max-w-[1200px] px-5 pb-20 pt-36 sm:px-8 sm:pt-40">
          <p className="mk-label text-[#B79A68]">The Switch · By invitation</p>
          <h1 className="mt-5 max-w-[900px] font-editorial text-[clamp(38px,6vw,72px)] leading-[1.04] text-[#F1EDE5]">
            Stop renting your website.
            <br />
            <em className="italic text-[#B79A68]">Pay less. Own it.</em>
          </h1>
          <p className="mt-7 max-w-[560px] text-[16px] leading-relaxed text-[#F1EDE5]/70">
            If your restaurant pays a platform every month for a template it
            will never own, this page is the honest version of that
            arrangement — and the way out.
          </p>
        </div>
      </section>

      {/* The platform model, factually */}
      <section className="bg-[#F1EDE5] px-5 py-20 text-[#0A0A09] sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1200px]">
          <p className="mk-label text-[#4B1719]">
            What the monthly platform model actually is
          </p>
          <div className="mt-10 grid gap-x-14 gap-y-12 lg:grid-cols-3">
            {PLATFORM_FACTS.map((f, i) => (
              <div key={f.title} className="border-t border-[#0A0A09]/15 pt-6">
                <p className="mk-label text-[#1A1310]/45">0{i + 1}</p>
                <h2 className="mt-3 font-editorial text-[22px] leading-snug">
                  {f.title}
                </h2>
                <p className="mt-4 text-[14.5px] leading-relaxed text-[#1A1310]/75">
                  {f.detail}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-10 max-w-[720px] text-[12.5px] leading-relaxed text-[#1A1310]/50">
            Observations from our audits of live platform-built restaurant
            websites and from published customer records, contracts, and
            reviews, researched September 2026. Individual platforms and plans
            vary; bring your contract and we&rsquo;ll read it with you.
          </p>
        </div>
      </section>

      {/* How we do it */}
      <section className="bg-[#0A0A09] px-5 py-24 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <p className="mk-label text-[#B79A68]">How we do it instead</p>
          <div className="mt-10 grid gap-x-14 gap-y-12 sm:grid-cols-2">
            {HOW_WE_DO_IT.map((f) => (
              <div key={f.title} className="border-t border-[#B79A68]/30 pt-6">
                <h2 className="font-editorial text-[24px] leading-snug text-[#F1EDE5]">
                  {f.title}
                </h2>
                <p className="mt-4 max-w-[480px] text-[14.5px] leading-relaxed text-[#F1EDE5]/70">
                  {f.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Side by side */}
      <section className="bg-[#0A0A09] px-5 pb-24 sm:px-8 sm:pb-28">
        <div className="mx-auto max-w-[1200px]">
          <p className="mk-label border-t border-[#B79A68]/20 pt-14 text-[#B79A68]">
            Side by side
          </p>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#B79A68]/30">
                  <th className="mk-label py-4 pr-6 font-normal text-[#F1EDE5]/45">
                    &nbsp;
                  </th>
                  <th className="mk-label py-4 pr-6 font-normal text-[#B79A68]">
                    The Pass
                  </th>
                  <th className="mk-label py-4 font-normal text-[#F1EDE5]/45">
                    The all-in-one platforms
                  </th>
                </tr>
              </thead>
              <tbody>
                {TABLE.map(([dim, us, them]) => (
                  <tr key={dim} className="border-b border-[#F1EDE5]/10 align-top">
                    <th className="w-[20%] py-5 pr-6 text-[13.5px] font-semibold text-[#F1EDE5]">
                      {dim}
                    </th>
                    <td className="w-[40%] py-5 pr-6 text-[14px] leading-relaxed text-[#F1EDE5]/85">
                      {us}
                    </td>
                    <td className="w-[40%] py-5 text-[14px] leading-relaxed text-[#F1EDE5]/55">
                      {them}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-8 max-w-[720px] text-[11.5px] leading-relaxed text-[#F1EDE5]/35">
            Platform figures from published customer records, contracts, and
            reviews of leading all-in-one restaurant marketing platforms,
            researched September 2026. Plans vary — bring yours and
            we&rsquo;ll do this table with your real numbers.
          </p>
        </div>
      </section>

      {/* The switch pricing */}
      <section className="bg-[#F1EDE5] px-5 py-20 text-[#0A0A09] sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1200px]">
          <p className="mk-label text-[#4B1719]">The switch, priced simply</p>
          <div className="mt-10 grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
            <div>
              <h2 className="max-w-[560px] font-editorial text-[clamp(26px,3.4vw,40px)] leading-[1.15]">
                We price against what you already pay — and the build is
                included.
              </h2>
              <div className="mt-8 space-y-5 text-[15.5px] leading-relaxed text-[#1A1310]/80">
                <p>
                  Paying a platform <strong>$500 a month</strong>? With us
                  it&rsquo;s <strong>$350 a month</strong> — and that includes
                  designing and building your custom website from scratch. No
                  separate project fee, no setup fee. Whatever your platform
                  bill is, we come in at least 25% under it.
                </p>
                <p>
                  <strong>Groups:</strong> five or more locations and the rate
                  drops to <strong>$300 a month per location</strong> — each
                  concept with its own custom site, its own identity, and its
                  own ownership.
                </p>
                <p>
                  Twelve months covers the build. At the end of it,{" "}
                  <strong>the site is yours outright</strong> — keep us on
                  month to month for care and search work, or walk away with
                  everything. Either way, you own it, which is the part no
                  platform will ever offer.
                </p>
                <p>
                  Bring your current statement to the first conversation.
                  Whatever a platform charges you, our number is lower — and it
                  buys ownership, not rent.
                </p>
              </div>
            </div>
            <div className="border border-[#0A0A09]/15 bg-white/40 p-8">
              <p className="mk-label text-[#4B1719]">Worked example</p>
              <dl className="mt-6 space-y-4 text-[14.5px]">
                <div className="flex justify-between gap-4 border-b border-[#0A0A09]/10 pb-3">
                  <dt className="text-[#1A1310]/70">Platform, 2 years</dt>
                  <dd className="font-semibold">≈ $11,000+ · own nothing</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-[#0A0A09]/10 pb-3">
                  <dt className="text-[#1A1310]/70">The Switch, year one</dt>
                  <dd className="font-semibold">$4,200 · build included</dd>
                </div>
                <div className="flex justify-between gap-4 pb-1">
                  <dt className="text-[#1A1310]/70">Year two and after</dt>
                  <dd className="font-semibold">
                    You own the site. Care optional.
                  </dd>
                </div>
              </dl>
              <p className="mt-6 text-[12.5px] leading-relaxed text-[#1A1310]/50">
                Example priced against a $500/month platform bill. Five or
                more locations: $300/month per location, each site owned
                outright at month twelve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0A0A09] px-5 py-24 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-[1200px] text-center">
          <h2 className="mx-auto max-w-[720px] font-editorial text-[clamp(30px,4.5vw,52px)] leading-[1.08] text-[#F1EDE5]">
            Bring your platform bill.
            <br />
            <em className="italic text-[#B79A68]">
              We&rsquo;ll bring the number that beats it.
            </em>
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
            <Link
              href="/book"
              className="mk-label group inline-flex items-center gap-3 border border-[#B79A68] px-7 py-4 text-[#F1EDE5] transition-colors hover:bg-[#B79A68] hover:text-[#0A0A09]"
            >
              Book the First Look
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
            <a
              href="mailto:hello@madisonfour.com"
              className="mk-label py-4 text-[#F1EDE5]/65 transition-colors hover:text-[#F1EDE5]"
            >
              hello@madisonfour.com
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
