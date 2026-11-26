import type { Metadata } from "next";
import { CallToAction, ListBlock, PageHero, PageShell } from "@/components/pages";
import { Band } from "@/components/sections-a";
import { asset } from "@/lib/images";
import { AUTOMATION_PAGE, SERVICES_PAGE } from "@/lib/pages";
import { CONTROLS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Building automation systems — Orravan Mechanical",
  description: AUTOMATION_PAGE.lede,
};

/** Building automation, moved from orravan.ai/services/building-automation-systems. */
export default function AutomationPage() {
  const controls = SERVICES_PAGE.columns[0];
  return (
    <PageShell>
      <PageHero eyebrow={AUTOMATION_PAGE.eyebrow} head={AUTOMATION_PAGE.head} lede={AUTOMATION_PAGE.lede} />
      <Band>
        <div className="hidden lg:block" />
        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(240px,32%)] lg:pr-10">
          <div className="grid gap-4 text-[15px] leading-relaxed text-ink-soft">
            {AUTOMATION_PAGE.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <ListBlock title={controls.title} items={controls.items} sub={"sub" in controls ? controls.sub : undefined} />
        </div>
      </Band>
      <Band>
        <div>
          <p className="o-display text-[clamp(1.6rem,2.4vw,2.4rem)] leading-[0.9]">Drawn by our engineers.</p>
          <p className="mt-3 max-w-[34ch] text-[13.5px] leading-relaxed text-ink-soft">{CONTROLS.copy}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:pr-10">
          {CONTROLS.items.map((item) => (
            <figure key={item.name} className="o-ctl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset(item.src)} alt={item.alt} loading="lazy" decoding="async" />
              <figcaption>
                <span className="o-label text-[10px] text-ink">{item.name}</span>
                <span className="text-[12px] leading-snug text-ink-mute">{item.detail}</span>
              </figcaption>
            </figure>
          ))}
          <p className="text-[11px] text-ink-mute sm:col-span-2">{CONTROLS.note}</p>
          <a href={asset("/inventory")} className="o-label text-[10px] text-[var(--orravan-blue)] sm:col-span-2">
            Replacement parts in our inventory &rarr;
          </a>
        </div>
      </Band>
      <CallToAction />
    </PageShell>
  );
}
