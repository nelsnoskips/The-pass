import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WORK, getWork } from "@/lib/work";

export function generateStaticParams() {
  return WORK.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) return {};
  return {
    title: `${work.name} — a concept room by The Pass`,
    description: work.tagline,
    openGraph: { images: [work.image] },
  };
}

/**
 * A case page: the brief, the decisions worth explaining, and a way
 * into the live concept. Short on purpose — a restaurant owner reads
 * three decisions, then clicks.
 */
export default async function WorkCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) notFound();

  return (
    <>
      <section className="relative overflow-hidden bg-[#0A0A09]">
        <div className="absolute inset-0" aria-hidden>
          <Image
            src={work.image}
            alt=""
            fill
            priority
            quality={86}
            sizes="100vw"
            className="object-cover object-[70%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A09] via-[#0A0A09]/80 to-[#0A0A09]/30" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-5 pb-20 pt-36 sm:px-8 sm:pt-40">
          <Link
            href="/#work"
            className="mk-label text-[#F1EDE5]/50 transition-colors hover:text-[#F1EDE5]"
          >
            ← The Test Kitchen
          </Link>
          <p className="mk-label mt-10 text-[#B79A68]">
            {work.segment} · {work.place}
          </p>
          <h1 className="mt-5 font-editorial text-[clamp(44px,8vw,96px)] leading-none tracking-[0.14em] text-[#F1EDE5]">
            {work.name}
          </h1>
          <p className="mt-7 max-w-[520px] font-editorial text-[clamp(22px,2.6vw,30px)] italic leading-snug text-[#B79A68]">
            {work.tagline}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              href={work.liveUrl}
              className="mk-label group inline-flex items-center gap-3 border border-[#B79A68] px-7 py-4 text-[#F1EDE5] transition-colors hover:bg-[#B79A68] hover:text-[#0A0A09]"
            >
              Open the concept
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <a
              href="/#consultation"
              className="mk-label py-4 text-[#F1EDE5]/65 transition-colors hover:text-[#F1EDE5]"
            >
              Build one for your room
            </a>
          </div>
        </div>
      </section>

      {/* The brief */}
      <section className="bg-[#F1EDE5] px-5 py-24 text-[#0A0A09] sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
          <p className="mk-label text-[#4B1719]">The brief</p>
          <div>
            <p className="max-w-[620px] font-editorial text-[clamp(22px,2.6vw,32px)] leading-[1.28]">
              {work.brief}
            </p>
            <p className="mk-label mt-10 text-[#1A1310]/45">
              {work.package}
            </p>
          </div>
        </div>
      </section>

      {/* The decisions */}
      <section className="bg-[#F1EDE5] px-5 pb-28 text-[#0A0A09] sm:px-8">
        <div className="mx-auto max-w-[1200px] border-t border-[#0A0A09]/15 pt-14">
          <p className="mk-label text-[#4B1719]">Three decisions</p>
          <ol className="mt-12 grid gap-12 lg:grid-cols-3 lg:gap-10">
            {work.decisions.map((d, i) => (
              <li key={d.title}>
                <p className="font-editorial text-[22px] italic text-[#B79A68]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-4 font-editorial text-[26px] leading-[1.14] text-[#0A0A09]">
                  {d.title}
                </h2>
                <p className="mt-4 text-[13.5px] leading-relaxed text-[#1A1310]/72">
                  {d.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What is in it */}
      <section className="bg-[#1A1310] px-5 py-24 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
          <p className="mk-label text-[#B79A68]">What is in it</p>
          <div>
            <ul className="space-y-4">
              {work.proof.map((line) => (
                <li
                  key={line}
                  className="flex gap-4 border-b border-[#F1EDE5]/12 pb-4 text-[15px] leading-relaxed text-[#F1EDE5]/80"
                >
                  <span aria-hidden className="mt-[11px] h-px w-4 shrink-0 bg-[#B79A68]/70" />
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-12 flex flex-wrap items-center gap-5">
              <Link
                href={work.liveUrl}
                className="mk-label group inline-flex items-center gap-3 border border-[#B79A68] px-7 py-4 text-[#F1EDE5] transition-colors hover:bg-[#B79A68] hover:text-[#0A0A09]"
              >
                Open the concept
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <p className="text-[13px] text-[#F1EDE5]/50">
                A concept room, not a client. Built by the studio to show
                the work.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
