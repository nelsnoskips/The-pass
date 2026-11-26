import type { Metadata } from "next";
import { CallToAction, PageHero, PageShell } from "@/components/pages";
import { Band } from "@/components/sections-a";
import { asset } from "@/lib/images";
import { SUPPORT_PAGE } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Support and remote monitoring — Orravan Mechanical",
  description: SUPPORT_PAGE.lede,
};

/** Support, moved from orravan.ai/services/support. */
export default function SupportPage() {
  const { monitoring, panels, techs, inventory } = SUPPORT_PAGE;
  return (
    <PageShell>
      <PageHero eyebrow={SUPPORT_PAGE.eyebrow} head={SUPPORT_PAGE.head} lede={SUPPORT_PAGE.lede} />
      <Band>
        <div className="hidden lg:block" />
        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(240px,34%)] lg:pr-10">
          <div>
            <p className="o-display text-[clamp(1.6rem,2.4vw,2.4rem)] leading-[0.9]">{monitoring.title}.</p>
            <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-ink-soft">{monitoring.text}</p>
            <ul className="o-ticks mt-6">
              {monitoring.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset("/images/45-difference-controls-panel.webp")}
            alt="An Orravan-built controls panel with two building controllers"
            className="aspect-[3/4] w-full object-cover"
            loading="lazy"
          />
        </div>
      </Band>
      <Band>
        <div className="hidden lg:block" />
        <div className="grid gap-px bg-[var(--rule)] md:grid-cols-3 lg:mr-10">
          {[panels, techs, inventory].map((b) => (
            <div key={b.title} className="bg-paper p-6">
              <p className="o-label text-[10px] text-ink">{b.title}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{b.text}</p>
              {b === inventory && (
                <a href={asset("/inventory")} className="o-label mt-4 inline-block text-[10px] text-[var(--orravan-blue)]">
                  See inventory &rarr;
                </a>
              )}
            </div>
          ))}
        </div>
      </Band>
      <CallToAction />
    </PageShell>
  );
}
