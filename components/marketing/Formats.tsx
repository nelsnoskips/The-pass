import Image from "next/image";

/**
 * Growth Across Every Format — casual dining leads; quick service and fine
 * dining support.
 *
 * NOTE: the stat overlays are PLACEHOLDERS for layout. Replace with real,
 * verifiable client results before launch — never publish sample numbers as
 * case studies.
 */

const FORMATS = [
  {
    label: "Casual Dining",
    image: "/images/casual-dining.jpg",
    alt: "A full dining room at dinner service, guests at the tables and the open kitchen behind",
    stats: [
      { value: "+156%", metric: "Reservations" },
      { value: "+112%", metric: "Revenue" },
    ],
    wide: true,
  },
  {
    label: "Quick Service",
    image: "/images/qsr-handoff.jpg",
    alt: "A team member handing a packaged order to a guest at a modern counter-service restaurant",
    stats: [{ value: "+87%", metric: "Revenue" }],
    wide: false,
  },
  {
    label: "Fine Dining",
    image: "/images/chef-pass.jpg",
    alt: "A chef finishing a plated dish beneath the pass lights",
    stats: [{ value: "+68%", metric: "Reservations" }],
    wide: false,
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
            Different models. Same system. Stronger results. From counter
            service to tasting menus, the discipline is identical: know the
            guest, connect every channel, measure what matters.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FORMATS.map((format) => (
            <figure
              key={format.label}
              className={`group relative overflow-hidden ${format.wide ? "lg:col-span-2" : ""}`}
            >
              <div className="relative aspect-[4/3] lg:aspect-[3/2.6]">
                <Image
                  src={format.image}
                  alt={format.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A09]/85 via-[#0A0A09]/15 to-transparent" />
              </div>
              <figcaption className="absolute inset-x-0 bottom-0 p-5">
                <p className="mk-label text-[#B79A68]">{format.label}</p>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                  {format.stats.map((stat) => (
                    <p key={stat.metric} className="text-[#F1EDE5]">
                      <span className="tnum font-editorial text-[28px]">{stat.value}</span>{" "}
                      <span className="text-[10.5px] uppercase tracking-[0.16em] text-[#F1EDE5]/60">
                        {stat.metric}
                      </span>
                    </p>
                  ))}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        <blockquote className="mx-auto mt-20 max-w-[720px] text-center">
          <p className="font-editorial italic text-[24px] leading-[1.4] text-[#F1EDE5] sm:text-[28px]">
            “The Pass gave us clarity, focus, and a system that drives results.
            It feels less like an agency and more like a partner in our
            growth.”
          </p>
          <footer className="mk-label mt-6 text-[#B79A68]">
            Multi-location client, Florida
            {/* PLACEHOLDER attribution — replace with a real, permissioned quote. */}
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
