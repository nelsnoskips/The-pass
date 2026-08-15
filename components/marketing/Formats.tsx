import Image from "next/image";

/**
 * Case studies — real client results, anonymized at the clients' request.
 * Narrative lines are in Madison Four's own voice (not client quotes);
 * `headline` leads the story, `narrative` grounds the numbers.
 */

const CASES = [
  {
    label: "Casual Dining · Sports Bar",
    descriptor: "4-location group · Northern California",
    image: "/images/casual-dining.jpg",
    alt: "A full dining room at dinner service, guests at the tables and the open kitchen behind",
    stats: [{ value: "+34.9%", metric: "Net Sales YoY" }],
    headline: "Four locations. One record-breaking month.",
    narrative:
      "Net sales grew 34.9% year over year — from $486K to $655K — with every location up more than 20%.",
    work: "Localized Google Ads by market, Meta retargeting, an event-driven happy-hour playbook.",
  },
  {
    label: "Casual Dining · Bar & Bistro",
    descriptor: "Beachside single location · Orlando",
    image: "/images/qsr-handoff.jpg",
    alt: "A team member handing an order across the counter of a busy bar and bistro",
    stats: [{ value: "+53.7%", metric: "Net Sales YoY" }],
    headline: "From a $68K month to the first six-figure month.",
    narrative:
      "$105K in net sales and 500 additional guests, year over year.",
    work: "Happy-hour campaign, custom landing page, guest winback offers.",
  },
  {
    label: "Fine Dining · French Bistro",
    descriptor: "Single location · Baton Rouge",
    image: "/images/chef-pass.jpg",
    alt: "A chef finishing a plated dish beneath the pass lights",
    stats: [{ value: "-75%", metric: "Cost per Reservation" }],
    headline: "Meta, turned into a profitable channel.",
    narrative:
      "Cost per reservation dropped from more than $50 to roughly $12 — a 75% reduction.",
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
    headline: "The strongest month since launch.",
    narrative:
      "Net sales up 39.5% while guest traffic grew from 912 to 1,258.",
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
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A09]/95 via-[#0A0A09]/30 to-transparent" />
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
                </figcaption>
              </div>
              <div className="flex flex-1 flex-col border-x border-b border-[#B79A68]/15 px-5 py-5">
                <p className="font-editorial text-[19px] leading-snug text-[#F1EDE5]">
                  {c.headline}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-[#F1EDE5]/65">{c.narrative}</p>
                <div className="mt-auto pt-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#F1EDE5]/45">
                    {c.descriptor}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#F1EDE5]/55">{c.work}</p>
                </div>
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
