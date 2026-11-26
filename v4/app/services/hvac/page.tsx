import type { Metadata } from "next";
import { CallToAction, ListBlock, PageHero, PageShell } from "@/components/pages";
import { Band } from "@/components/sections-a";
import { asset } from "@/lib/images";
import { HVAC_PAGE, SERVICES_PAGE } from "@/lib/pages";

export const metadata: Metadata = {
  title: "HVAC systems — Orravan Mechanical",
  description: HVAC_PAGE.lede,
};

/** HVAC systems, moved from orravan.ai/services/hvac-systems. */
export default function HvacPage() {
  const [, mechanical, chillers] = SERVICES_PAGE.columns;
  return (
    <PageShell>
      <PageHero eyebrow={HVAC_PAGE.eyebrow} head={HVAC_PAGE.head} lede={HVAC_PAGE.lede} />
      <Band>
        <div className="hidden lg:block" />
        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(260px,40%)] lg:pr-10">
          <div className="grid content-start gap-4 text-[15px] leading-relaxed text-ink-soft">
            {HVAC_PAGE.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset("/images/46-difference-tech-chiller.webp")}
            alt="An Orravan technician working at the base of a chiller"
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
        </div>
      </Band>
      <Band>
        <div className="hidden lg:block" />
        <div className="grid gap-3 md:grid-cols-2 lg:pr-10">
          <ListBlock title={mechanical.title} items={mechanical.items} />
          <ListBlock title={chillers.title} items={chillers.items} />
        </div>
      </Band>
      <CallToAction />
    </PageShell>
  );
}
