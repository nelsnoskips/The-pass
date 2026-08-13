import Image from "next/image";
import Link from "next/link";
import { bottles, collections, images, site } from "@/lib/site";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Module 06 — bottle shop feature (blueprint §07/§09). Leads with the edit and
 * makes fulfillment rules visible before anyone browses deeply.
 */
export function BottleShopFeature() {
  return (
    <section className="relative overflow-hidden bg-ink text-bone">
      <div className="grid lg:grid-cols-[1fr_1.05fr]">
        <Reveal className="relative min-h-[320px] lg:min-h-full">
          <Image
            src={images.bottleShop.src}
            alt={images.bottleShop.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-cover"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-transparent to-ink/70"
          />
        </Reveal>

        <div className="px-6 py-16 md:px-10 lg:py-24">
          <Reveal>
            <p className="micro text-signal">Bottle Shop</p>
            <h2 className="display mt-5 text-[clamp(2.2rem,4.4vw,3.8rem)]">
              Take the rebellion home
            </h2>
            <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-bone/70">
              Two dozen bottles we actually drink, with notes written like
              recommendations instead of distributor copy. Pickup at the bar, or
              local delivery in {site.address.city}.
            </p>
          </Reveal>

          <Reveal index={1} className="mt-8 flex flex-wrap gap-2">
            {collections.map((c) => (
              <Link
                key={c.name}
                href="/bottle-shop"
                className="micro border border-bone/25 px-4 py-2.5 text-bone/80 transition-colors duration-[var(--dur-micro)] hover:border-bone hover:bg-bone hover:text-ink"
              >
                {c.name}
                <span className="ml-2 text-bone/40">{c.count}</span>
              </Link>
            ))}
          </Reveal>

          <Reveal index={2} className="mt-10">
            <ul className="divide-y divide-rule-dark border-y border-rule-dark">
              {bottles.slice(0, 3).map((b) => (
                <li
                  key={b.name}
                  className="flex items-baseline gap-4 py-4 text-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{b.name}</span>
                    <span className="block text-bone/55">
                      {b.producer} · {b.region} · {b.vintage}
                    </span>
                  </span>
                  <span className="micro shrink-0 text-brass">${b.price}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal index={3} className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/bottle-shop"
              className="micro bg-bone px-8 py-4 text-ink transition-colors duration-[var(--dur-micro)] hover:bg-signal hover:text-bone"
            >
              Shop the drop
            </Link>
            <p className="text-xs text-bone/50">
              Pickup &amp; local delivery · 21+ with ID at handoff
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
