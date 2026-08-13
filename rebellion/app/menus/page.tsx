import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { BrushRule } from "@/components/ui/Artwork";
import { menuSections, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Menus",
  description:
    "Dinner, cocktails and wine at Rebellion Beachside Bar & Bistro — seasonal ingredients, big flavors, zero shortcuts.",
};

/**
 * Menus are HTML, not PDFs — they have to be indexable and readable on a phone
 * in a parking lot (blueprint §11, SEO/AEO).
 */
export default function MenusPage() {
  return (
    <PageShell
      eyebrow="Eat & Drink"
      title="Dinner without the usual script"
      intro="Seasonal ingredients, big flavors, zero shortcuts. The menu moves with the season, so a dish you loved may have been replaced by one you'll like more."
      image="table"
    >
      <nav
        aria-label="Menu sections"
        className="sticky top-20 z-30 border-b border-rule bg-bone/95 backdrop-blur-sm md:top-[88px]"
      >
        <ul className="no-scrollbar flex gap-6 overflow-x-auto px-6 py-4 md:px-10">
          {menuSections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="micro whitespace-nowrap text-ink-mute transition-colors hover:text-oxblood"
              >
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="paper-grain bg-bone">
        <div className="mx-auto max-w-[900px] px-6 py-16 md:px-10 lg:py-24">
          {menuSections.map((section) => (
            <Reveal
              as="section"
              key={section.id}
              id={section.id}
              className="mb-16 scroll-mt-40 last:mb-0"
            >
              <h2 className="display text-[clamp(1.8rem,3.2vw,2.6rem)]">
                {section.name}
              </h2>
              <p className="mt-2 text-sm text-ink-mute">{section.note}</p>
              <BrushRule className="mt-6 h-3 w-28 text-oxblood" variant={1} />

              <ul className="mt-8 divide-y divide-rule">
                {section.items.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-baseline gap-6 py-5"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="mt-1 text-sm text-ink-mute">{item.desc}</p>
                    </div>
                    <span className="micro shrink-0 text-oxblood">
                      {item.price === "MP" || item.price === "—"
                        ? item.price
                        : `$${item.price}`}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}

          <Reveal className="mt-16 border-t border-rule pt-10">
            <p className="text-sm text-ink-mute">
              Dietary needs, allergies, and large parties: tell us when you book
              or call{" "}
              <a href={site.phoneHref} className="text-oxblood underline underline-offset-4">
                {site.phone}
              </a>
              . Prices and dishes are illustrative while the live menu is
              connected.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={site.reserveUrl}
                className="micro bg-oxblood px-8 py-4 text-bone transition-colors duration-[var(--dur-micro)] hover:bg-[#8d343d]"
              >
                Reserve a table
              </Link>
              <Link
                href="/happenings"
                className="micro border border-ink/25 px-8 py-4 transition-colors duration-[var(--dur-micro)] hover:border-ink hover:bg-ink hover:text-bone"
              >
                Wine dinners &amp; classes
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </PageShell>
  );
}
