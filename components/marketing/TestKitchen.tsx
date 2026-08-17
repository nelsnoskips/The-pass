import Image from "next/image";
import Link from "next/link";
import { WORK } from "@/lib/work";

/**
 * The Test Kitchen: concept rooms, presented honestly as concepts. A
 * new studio has no client list, and pretending otherwise is the one
 * mistake that ends a reputation; a kitchen where the menu gets proven
 * is both true and the right metaphor for this audience.
 */
export function TestKitchen() {
  return (
    <section
      id="work"
      className="scroll-mt-24 bg-[#1A1310] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-[1400px]">
        <p className="mk-label text-[#B79A68]">The Test Kitchen</p>
        <div className="mk-reveal mt-6 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <h2 className="font-editorial text-[38px] leading-[1.06] text-[#F1EDE5] sm:text-[52px]">
            Concept rooms, built
            <br />
            <em className="italic text-[#B79A68]">to show what is possible.</em>
          </h2>
          <p className="max-w-[420px] self-end text-[15px] leading-relaxed text-[#F1EDE5]/70">
            Every kitchen has a place where the menu gets proven before it
            reaches a guest. These are ours: complete restaurants we
            invented, designed, and built end to end, so you can see the
            work rather than read about it.
          </p>
        </div>

        <ul className="mt-16 space-y-16">
          {WORK.map((w) => (
            <li key={w.slug} className="mk-reveal">
              <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
                <Link
                  href={`/work/${w.slug}`}
                  className="group relative block aspect-[16/10] overflow-hidden"
                  aria-label={`${w.name}: ${w.tagline}`}
                >
                  <Image
                    src={w.cardImage}
                    alt={w.imageAlt}
                    fill
                    quality={86}
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover object-[46%_center] transition-transform duration-[1400ms] group-hover:scale-[1.04]"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-[#0A0A09]/80 via-transparent to-transparent"
                  />
                  <div aria-hidden className="absolute inset-0 ring-1 ring-inset ring-[#B79A68]/20" />
                </Link>

                <div>
                  <p className="mk-label text-[#F1EDE5]/45">
                    {w.segment} · {w.place}
                  </p>
                  <h3 className="mt-4 font-editorial text-[40px] leading-none tracking-[0.14em] text-[#F1EDE5]">
                    {w.name}
                  </h3>
                  <p className="mt-5 max-w-[420px] font-editorial text-[22px] italic leading-snug text-[#B79A68]">
                    {w.tagline}
                  </p>
                  <ul className="mt-7 space-y-2.5">
                    {w.proof.slice(0, 3).map((line) => (
                      <li
                        key={line}
                        className="flex gap-3 text-[13px] leading-relaxed text-[#F1EDE5]/70"
                      >
                        <span aria-hidden className="mt-[9px] h-px w-3 shrink-0 bg-[#B79A68]/60" />
                        {line}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap items-center gap-5">
                    <Link
                      href={`/work/${w.slug}`}
                      className="mk-label group inline-flex items-center gap-3 border border-[#B79A68]/70 px-6 py-3.5 text-[#F1EDE5] transition-colors hover:bg-[#B79A68] hover:text-[#0A0A09]"
                    >
                      Read the case
                      <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </Link>
                    <Link
                      href={w.liveUrl}
                      className="mk-label border-b border-[#B79A68]/30 pb-0.5 text-[#B79A68] transition-colors hover:border-[#B79A68]"
                    >
                      Open the site
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mk-label mt-14 text-[#F1EDE5]/40">
          More rooms in the kitchen. Yours could be the next one.
        </p>
      </div>
    </section>
  );
}
