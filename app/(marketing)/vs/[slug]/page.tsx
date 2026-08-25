import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPARISONS, getComparison } from "@/lib/comparisons";

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cmp = getComparison(slug);
  if (!cmp) return {};
  return {
    title: cmp.metaTitle,
    description: cmp.metaDescription,
    alternates: { canonical: `https://madisonfour.com/vs/${cmp.slug}` },
  };
}

/**
 * A comparison page doubles as an ad landing page for "[platform]
 * alternative" searches and as sales collateral mid-conversation. It
 * stays scrupulously factual: publicly observable mechanics, a table,
 * and an honesty section conceding when the platform is the right call.
 */
export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cmp = getComparison(slug);
  if (!cmp) notFound();

  return (
    <>
      {/* Dark typographic hero */}
      <section className="bg-[#0A0A09]">
        <div className="mx-auto max-w-[1200px] px-5 pb-20 pt-36 sm:px-8 sm:pt-40">
          <p className="mk-label text-[#B79A68]">
            The Pass vs {cmp.competitor}
          </p>
          <h1 className="mt-5 max-w-[900px] font-editorial text-[clamp(38px,6vw,72px)] leading-[1.04] text-[#F1EDE5]">
            {cmp.headline}
          </h1>
          <p className="mt-7 max-w-[560px] text-[16px] leading-relaxed text-[#F1EDE5]/70">
            {cmp.subline}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              href="/book"
              className="mk-label group inline-flex items-center gap-3 border border-[#B79A68] px-7 py-4 text-[#F1EDE5] transition-colors hover:bg-[#B79A68] hover:text-[#0A0A09]"
            >
              Book a free First Look
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
            <a
              href="/#work"
              className="mk-label py-4 text-[#F1EDE5]/65 transition-colors hover:text-[#F1EDE5]"
            >
              See the work
            </a>
          </div>
        </div>
      </section>

      {/* What it is — stated fairly */}
      <section className="bg-[#F1EDE5] px-5 py-20 text-[#0A0A09] sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
          <p className="mk-label text-[#4B1719]">What {cmp.competitor} is</p>
          <p className="max-w-[620px] font-editorial text-[clamp(20px,2.2vw,28px)] leading-[1.32]">
            {cmp.whatItIs}
          </p>
        </div>
      </section>

      {/* Observed shortfalls */}
      <section className="bg-[#F1EDE5] px-5 pb-24 text-[#0A0A09] sm:px-8 sm:pb-28">
        <div className="mx-auto max-w-[1200px]">
          <p className="mk-label text-[#4B1719]">
            What we see on live {cmp.competitor} sites
          </p>
          <div className="mt-10 grid gap-x-14 gap-y-12 lg:grid-cols-3">
            {cmp.shortfalls.map((s, i) => (
              <div key={s.title} className="border-t border-[#0A0A09]/15 pt-6">
                <p className="mk-label text-[#1A1310]/45">0{i + 1}</p>
                <h2 className="mt-3 font-editorial text-[22px] leading-snug">
                  {s.title}
                </h2>
                <p className="mt-4 text-[14.5px] leading-relaxed text-[#1A1310]/75">
                  {s.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-[#0A0A09] px-5 py-24 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <p className="mk-label text-[#B79A68]">Side by side</p>
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
                    {cmp.competitor}
                  </th>
                </tr>
              </thead>
              <tbody>
                {cmp.table.map(([dim, us, them]) => (
                  <tr key={dim} className="border-b border-[#F1EDE5]/10 align-top">
                    <th className="w-[22%] py-5 pr-6 text-[13.5px] font-semibold text-[#F1EDE5]">
                      {dim}
                    </th>
                    <td className="w-[39%] py-5 pr-6 text-[14px] leading-relaxed text-[#F1EDE5]/85">
                      {us}
                    </td>
                    <td className="w-[39%] py-5 text-[14px] leading-relaxed text-[#F1EDE5]/55">
                      {them}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* The honesty section */}
      <section className="bg-[#F1EDE5] px-5 py-20 text-[#0A0A09] sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
          <p className="mk-label text-[#4B1719]">
            When {cmp.competitor} is the right call
          </p>
          <p className="max-w-[620px] text-[15.5px] leading-relaxed text-[#1A1310]/80">
            {cmp.whenTheyAreRight}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0A0A09] px-5 py-24 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-[1200px] text-center">
          <h2 className="mx-auto max-w-[720px] font-editorial text-[clamp(30px,4.5vw,52px)] leading-[1.08] text-[#F1EDE5]">
            Fifteen minutes on your website.
            <br />
            <em className="italic text-[#B79A68]">
              What&apos;s working, what isn&apos;t, what we&apos;d do.
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
          <p className="mx-auto mt-14 max-w-[640px] text-[11.5px] leading-relaxed text-[#F1EDE5]/35">
            {cmp.competitor} is a trademark of its respective owner. The Pass by
            Madison Four is independent and not affiliated with or endorsed by{" "}
            {cmp.competitor}. Observations describe publicly available websites
            reviewed in August 2026 and general platform mechanics; individual
            sites vary.
          </p>
        </div>
      </section>
    </>
  );
}
