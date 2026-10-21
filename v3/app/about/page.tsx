import type { Metadata } from "next";
import { CallToAction, PageHero, PageShell } from "@/components/pages";
import { Band } from "@/components/sections-a";
import { asset } from "@/lib/images";
import { ABOUT } from "@/lib/pages";

export const metadata: Metadata = {
  title: "About us — Orravan Mechanical",
  description: ABOUT.lede,
};

/** About us, moved from orravan.ai/about-us. */
export default function AboutPage() {
  return (
    <PageShell>
      <PageHero eyebrow={ABOUT.eyebrow} head={ABOUT.head} lede={ABOUT.lede} aside={<p className="o-label text-[11px] leading-relaxed text-ink">{ABOUT.focus}</p>} />
      <Band>
        <div className="hidden lg:block" />
        <div className="grid gap-6 lg:pr-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset("/images/35-hero-slide-1-team.webp")}
            alt="The Orravan team and fleet outside the shop"
            className="aspect-[16/7] w-full object-cover"
            loading="lazy"
          />
          <div className="grid gap-px bg-[var(--rule)] sm:grid-cols-2">
            {ABOUT.blocks.map((b) => (
              <div key={b.title} className="bg-paper p-6">
                <p className="o-label text-[10px] text-ink">{b.title}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{b.text}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a href={asset("/team")} className="o-btn bg-[var(--orravan-blue)]">Meet the team</a>
            <a href={asset("/services")} className="o-label text-[10px] text-[var(--orravan-blue)]">Our services &rarr;</a>
          </div>
        </div>
      </Band>
      <CallToAction line={ABOUT.understand} />
    </PageShell>
  );
}
