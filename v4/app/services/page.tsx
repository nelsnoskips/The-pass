import type { Metadata } from "next";
import { CallToAction, ListBlock, PageHero, PageShell } from "@/components/pages";
import { Band } from "@/components/sections-a";
import { SERVICES_PAGE } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Services — Orravan Mechanical",
  description: SERVICES_PAGE.lede,
};

/** What we do, moved from orravan.ai/services. */
export default function ServicesPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow={SERVICES_PAGE.eyebrow}
        head={SERVICES_PAGE.head}
        lede={SERVICES_PAGE.lede}
        aside={
          <div>
            <p className="o-label text-[10px] text-ink-mute">Efficient control systems for</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SERVICES_PAGE.served.map((s) => (
                <li key={s} className="o-chip">{s}</li>
              ))}
            </ul>
          </div>
        }
      />
      <Band>
        <div className="hidden lg:block" />
        <div className="grid gap-3 md:grid-cols-3 lg:pr-10">
          {SERVICES_PAGE.columns.map((c) => (
            <ListBlock key={c.title} title={c.title} items={c.items} href={c.href} sub={"sub" in c ? c.sub : undefined} />
          ))}
        </div>
      </Band>
      <Band>
        <div className="hidden lg:block" />
        <div className="grid gap-px bg-[var(--rule)] sm:grid-cols-2 xl:grid-cols-4 lg:mr-10">
          {SERVICES_PAGE.strengths.map((s) => (
            <div key={s.title} className="bg-paper p-6">
              <p className="o-label text-[10px] text-ink">{s.title}</p>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">{s.text}</p>
            </div>
          ))}
        </div>
      </Band>
      <CallToAction line={SERVICES_PAGE.call} />
    </PageShell>
  );
}
