import Image from "next/image";

/**
 * Case studies — real client results, anonymized at the clients' request.
 * The lead metric is each engagement's headline number; `detail` grounds it
 * and `work` says what was actually done.
 */

const CASES = [
  {
    label: "Casual Dining · Sports Bar",
    descriptor: "4-location group · Northern California",
    image: "/images/casual-dining.jpg",
    alt: "A full dining room at dinner service, guests at the tables and the open kitchen behind",
    stats: [{ value: "+34.9%", metric: "Net Sales YoY" }],
    detail: "$486K → $655K record month — every location up 20%+",
    work: "Localized Google Ads by market, Meta retargeting, an event-driven happy-hour playbook.",
  },
  {
    label: "Casual Dining · Bar & Bistro",
    descriptor: "Beachside single location · Orlando",
    image: "/images/qsr-handoff.jpg",
    alt: "A team member handing an order across the counter of a busy bar and bistro",
    stats: [{ value: "+53.7%", metric: "Net Sales YoY" }],
    detail: "First-ever six-figure month ($68K → $105K), +500 guests",
    work: "Happy-hour campaign, custom landing page, guest winback offers.",
  },
  {
    label: "Fine Dining · French Bistro",
    descriptor: "Single location · Baton Rouge",
    image: "/images/chef-pass.jpg",
    alt: "A chef finishing a plated dish beneath the pass lights",
    stats: [{ value: "-75%", metric: "Cost per Reservation" }],
    detail: "$50+ → ~$12 on Meta — conversion campaigns now profitable",
    work: "Rebuilt reservation and conversion campaigns; refined the website and creative.",
  },
  {
    label: "Casual Dining · Speakeasy",
    descriptor: "Single location · Honolulu",
    image: null,
    alt: "",
    stats: [
      { value: "+39.5%", metric: "Net Sales YoY" },
      { value: "+37.9%", metric: "Guests" },
    ],
    detail: "912 → 1,258 guests in the strongest month since launch",
    work: "Full marketing framework and a retargeted brunch campaign.",
  },
];

export function Formats() {
  return (
    <section id="work" className="scroll-mt-24 bg-[#0A0A09] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:items-end">
          <div>
            <p className="mk-label text-[#B79A68]">Case Studies</p>
            <h2 className="mt-5 font-editorial text-[38px] leading-[1.06] text-[#F1EDE5] sm:text-[48px]">
              Growth across
              <br />
              every format.
            </h2>
          </div>
          <p className="max-w-[420px] text-[15px] leading-relaxed text-[#F1EDE5]/60 lg:justify-self-end">
            Different models. Same system. Stronger results. From neighborhood
            bars to tasting menus, the discipline is identical: know the guest,
            connect every channel, measure what matters.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {CASES.map((c) => (
            <figure key={c.label} className="group relative flex flex-col overflow-hidden">
              <div className="relative aspect-[4/3] lg:aspect-[3/2.6]">
                {c.image ? (
                  <>
                    <Image
                      src={c.image}
                      alt={c.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A09]/95 via-[#0A0A09]/35 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 border border-[#B79A68]/25 bg-[#141210]" />
                )}
                <figcaption className="absolute inset-x-0 bottom-0 p-5">
                  <p className="mk-label text-[#B79A68]">{c.label}</p>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                    {c.stats.map((stat) => (
                      <p key={stat.metric} className="text-[#F1EDE5]">
                        <span className="tnum font-editorial text-[28px]">{stat.value}</span>{" "}
                        <span className="text-[10.5px] uppercase tracking-[0.16em] text-[#F1EDE5]/60">
                          {stat.metric}
                        </span>
                      </p>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[12px] leading-snug text-[#F1EDE5]/70">{c.detail}</p>
                </figcaption>
              </div>
              <div className="border-x border-b border-[#B79A68]/15 px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#F1EDE5]/45">
                  {c.descriptor}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#F1EDE5]/60">{c.work}</p>
              </div>
            </figure>
          ))}
        </div>

        <p className="mt-8 text-center text-[11.5px] text-[#F1EDE5]/35">
          Real results from client engagements. Names withheld at our clients&rsquo; request.
        </p>
      </div>
    </section>
  );
}
