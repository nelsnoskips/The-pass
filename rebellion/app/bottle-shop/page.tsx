import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { DeliveryChecker } from "@/components/shop/DeliveryChecker";
import { BottleGlyph } from "@/components/ui/Brand";
import { Bloom, Deckle } from "@/components/ui/Artwork";
import { bottles, collections, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Bottle Shop",
  description:
    "A merchant's edit of wine from Rebellion Beachside — pickup at the bar or local delivery in Cocoa Beach.",
};

/* PLACEHOLDER — commerce, inventory and fulfillment are blueprint §11
   decisions. Nothing here transacts. Delivery radius, minimums, windows, age
   verification and licensing must be confirmed with Florida ABT and counsel
   before this page can take an order (blueprint §10). */

export default function BottleShopPage() {
  return (
    <PageShell
      eyebrow="Bottle Shop"
      title="Take the rebellion home"
      intro="Two dozen bottles we actually drink, with notes written like recommendations instead of distributor copy."
      image="bottleShop"
      deckleTone="text-ink"
    >
      <div className="relative bg-ink px-6 py-4 text-center text-sm text-bone md:px-10">
        <Deckle edge="bottom" variant={2} className="text-bone" />
        <span className="relative">
        Local delivery + pickup available in {site.address.city} ·{" "}
        <span className="text-bone/60">21+ with ID at handoff</span>
        </span>
      </div>

      <section className="paper-grain relative overflow-hidden bg-bone">
        <Bloom variant="c" opacity={50} className="-top-32 -right-24 h-[460px] w-[500px] text-wash-sage" />
        <div className="relative mx-auto max-w-[1200px] px-6 py-16 md:px-10 lg:py-20">
          <Reveal>
            <DeliveryChecker />
          </Reveal>

          <Reveal index={1} className="mt-12">
            <h2 className="micro text-ink-mute">Collections</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {collections.map((c) => (
                <li key={c.name}>
                  <button
                    type="button"
                    className="micro border border-ink/20 px-4 py-2.5 transition-colors duration-[var(--dur-micro)] hover:border-ink hover:bg-ink hover:text-bone"
                  >
                    {c.name}
                    <span className="ml-2 text-ink-mute">{c.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>

          <ul className="mt-12 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-4">
            {bottles.map((b, i) => (
              <Reveal
                as="li"
                key={b.name}
                index={i}
                className="group flex flex-col bg-paper p-6"
              >
                {/* Bottle photography from shoot day 02 drops in here. */}
                <div className="mb-6 flex aspect-[3/4] items-center justify-center bg-bone">
                  <BottleGlyph className="h-[74%] transition-transform duration-[var(--dur-ui)] ease-[var(--ease-ui)] group-hover:-translate-y-1" />
                </div>
                <p className="micro text-oxblood">{b.style}</p>
                <h3 className="display-soft mt-2 text-xl">{b.name}</h3>
                <p className="mt-1 text-sm text-ink-mute">
                  {b.producer} · {b.region} · {b.vintage}
                </p>
                <p className="mt-4 flex-1 text-sm leading-relaxed">{b.note}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="display text-xl">${b.price}</span>
                  <button
                    type="button"
                    className="micro border border-ink/25 px-5 py-3 transition-colors duration-[var(--dur-micro)] hover:border-ink hover:bg-ink hover:text-bone"
                  >
                    Add
                  </button>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative bg-ink text-bone">
        <Deckle edge="top" variant={1} className="text-bone" />
        <div className="relative mx-auto grid max-w-[1200px] gap-10 px-6 py-20 md:grid-cols-2 md:px-10">
          <Reveal>
            <h2 className="display text-[clamp(1.8rem,3.2vw,2.6rem)]">
              The Wine Club
            </h2>
            <p className="mt-5 max-w-[42ch] text-[15px] leading-relaxed text-bone/70">
              Two or three bottles a month, chosen by the people who wrote the
              list. Member pricing on the shelf, first seats at wine dinners,
              and one class a quarter.
            </p>
            <button
              type="button"
              className="micro mt-8 bg-bone px-8 py-4 text-ink transition-colors duration-[var(--dur-micro)] hover:bg-signal hover:text-bone"
            >
              Join or gift
            </button>
          </Reveal>

          <Reveal index={1}>
            <h2 className="micro text-signal">How fulfillment works</h2>
            <ol className="mt-5 space-y-4 text-sm text-bone/70">
              {[
                "Check your address — we confirm the delivery radius, minimum, fee and available windows before you shop.",
                "Choose pickup at the bar or a local delivery window. Inventory is live; substitutions are your call, not ours.",
                "Attest you're 21+ at checkout. Photo ID is verified at handoff, and we never leave alcohol unattended.",
                "Get a receipt, reorder in a tap, and skip the line next time.",
              ].map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="display w-8 shrink-0 text-xl text-brass">
                    0{i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-xs text-bone/45">
              Local delivery only — not shipping. Final rules, license
              privileges, taxes and recordkeeping are pending confirmation with
              Florida ABT and counsel.
            </p>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
