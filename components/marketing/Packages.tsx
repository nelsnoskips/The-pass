const PACKAGES: {
  name: string;
  audience: string;
  price: string;
  cadence?: string;
  detail: string;
  includes: string[];
  timeline: string;
}[] = [
  {
    name: "The Opening",
    audience: "For new rooms and first proper websites",
    price: "$4,000",
    detail:
      "A complete custom website, designed and built from nothing. The site your restaurant deserves on the day the doors open.",
    includes: [
      "Custom design and build, no templates",
      "Menus, reservations, and ordering wired in",
      "Complete SEO and AEO setup included",
      "Analytics and launch support",
    ],
    timeline: "Two to three weeks",
  },
  {
    name: "The Refresh",
    audience: "For rooms whose website no longer does them justice",
    price: "$3,000",
    detail:
      "A full redesign on a custom foundation. Your menu, your story, and your guest journey, recomposed and rebuilt to convert.",
    includes: [
      "Full redesign, rebuilt from the ground up",
      "Menu and content restructured for guests",
      "Complete SEO and AEO setup included",
      "Speed and mobile pass",
    ],
    timeline: "Ten days to two weeks",
  },
  {
    name: "The Residency",
    audience: "For restaurants that want the site tended, always",
    price: "$900",
    cadence: "/month",
    detail:
      "Your website, looked after the way you look after the room. Care, updates, and steady tuning of how guests find you.",
    includes: [
      "Hosting, care, and security",
      "Menu and seasonal updates, handled",
      "Ongoing SEO and AI-visibility tuning",
      "A monthly note on what changed and why",
    ],
    timeline: "Month to month, step away anytime",
  },
];

/**
 * Packages — three named engagements with published floors and payment
 * terms in plain language. Editorial columns on fine rules, matching the
 * Disciplines idiom; no cards, no badges.
 */
export function Packages() {
  return (
    <section
      id="packages"
      className="scroll-mt-24 bg-[#F1EDE5] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-[1200px]">
        <p className="mk-label text-[#4B1719]">Engagements</p>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <h2 className="font-editorial text-[38px] leading-[1.06] text-[#0A0A09] sm:text-[52px]">
            Three ways to work
            <br />
            <em className="italic text-[#4B1719]">with the studio.</em>
          </h2>
          <p className="max-w-[420px] self-end text-[15px] leading-relaxed text-[#1A1310]/75">
            Every engagement includes the full search foundation, SEO and
            AEO, engineered in from the first line of code. Floors are
            published so you can plan; every project is quoted to the
            restaurant.
          </p>
        </div>

        <ol className="mt-16 grid gap-y-14 border-t border-[#0A0A09]/15 pt-12 lg:grid-cols-3 lg:gap-x-12">
          {PACKAGES.map((pkg, i) => (
            <li
              key={pkg.name}
              className="group lg:border-l lg:border-[#0A0A09]/15 lg:pl-10 lg:first:border-l-0 lg:first:pl-0"
            >
              <p className="mk-label text-[#0A0A09]">
                <span
                  aria-hidden
                  className="mr-2 font-editorial italic normal-case tracking-normal text-[#B79A68]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {pkg.audience}
              </p>
              <h3 className="mt-4 font-editorial text-[32px] leading-none text-[#0A0A09]">
                {pkg.name}
              </h3>
              <p className="mt-3 text-[15px] text-[#1A1310]/75">
                <span className="mk-label mr-2 text-[#1A1310]/50">From</span>
                <span className="font-editorial text-[26px] text-[#4B1719]">
                  {pkg.price}
                </span>
                {pkg.cadence && (
                  <span className="text-[14px] text-[#1A1310]/60">
                    {pkg.cadence}
                  </span>
                )}
              </p>
              <span
                aria-hidden
                className="mt-5 block h-px w-8 bg-[#B79A68]/60 transition-all duration-300 group-hover:w-full"
              />
              <p className="mt-5 text-[13.5px] leading-relaxed text-[#1A1310]/70">
                {pkg.detail}
              </p>
              <ul className="mt-6 space-y-2.5">
                {pkg.includes.map((line) => (
                  <li
                    key={line}
                    className="flex gap-3 text-[13px] leading-relaxed text-[#1A1310]/75"
                  >
                    <span aria-hidden className="mt-[9px] h-px w-3 shrink-0 bg-[#4B1719]/50" />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mk-label mt-7 text-[#1A1310]/50">{pkg.timeline}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 border-t border-[#0A0A09]/15 pt-8 lg:flex lg:items-baseline lg:justify-between lg:gap-16">
          <p className="mk-label shrink-0 text-[#4B1719]">How payment works</p>
          <p className="mt-4 max-w-[720px] text-[14px] leading-relaxed text-[#1A1310]/75 lg:mt-0">
            Forty percent reserves your place on the calendar and begins the
            work. Thirty percent when you approve your design direction. The
            final thirty percent at launch. No surprises, and nothing due
            you haven&apos;t already seen. The Residency is simply billed
            monthly.
          </p>
        </div>

        <div className="mt-8 border-t border-[#0A0A09]/15 pt-8 lg:flex lg:items-baseline lg:justify-between lg:gap-16">
          <p className="mk-label shrink-0 text-[#4B1719]">On timelines</p>
          <p className="mt-4 max-w-[720px] text-[14px] leading-relaxed text-[#1A1310]/75 lg:mt-0">
            Timelines run from the day we have your deposit and your
            content: menu, photography, and story. Send those promptly and
            we hold the dates. We move fast; we just can&apos;t plate what
            hasn&apos;t reached the kitchen.
          </p>
        </div>
      </div>
    </section>
  );
}
