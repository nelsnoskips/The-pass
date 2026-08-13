import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { Bloom } from "@/components/ui/Artwork";
import { hours, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Reserve",
  description: `Reserve a table at ${site.name} in Cocoa Beach.`,
};

/**
 * Reservation landing.
 *
 * The reservation platform embed drops into the panel below. Keeping a real
 * page here (rather than linking straight out) gives campaigns a landing path
 * that preserves parameters and gives us a conversion event to measure
 * (blueprint §06 measurement layer, §11 reservations).
 */
export default function ReservePage() {
  return (
    <PageShell
      eyebrow="Reservations"
      title="Hold the table"
      intro="Thursday through Saturday books up. The bar is first-come, always."
      image="gather"
    >
      <section className="paper-grain relative overflow-hidden bg-bone">
        <Bloom variant="a" opacity={50} className="-top-32 -right-24 h-[460px] w-[500px] text-wash-blush" />
        <div className="relative mx-auto grid max-w-[1100px] gap-12 px-6 py-16 md:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
          <Reveal>
            <div className="flex min-h-[360px] flex-col items-center justify-center border border-dashed border-ink/25 bg-paper p-10 text-center">
              <p className="micro text-oxblood">Reservation widget</p>
              <p className="mt-4 max-w-[38ch] text-sm leading-relaxed text-ink-mute">
                The live booking platform embeds here once the account is
                confirmed. Until then, call the restaurant and we&apos;ll write
                you into the book by hand.
              </p>
              <a
                href={site.phoneHref}
                className="micro mt-8 bg-oxblood px-8 py-4 text-bone transition-colors duration-[var(--dur-micro)] hover:bg-[#8d343d]"
              >
                Call {site.phone}
              </a>
            </div>
          </Reveal>

          <Reveal index={1}>
            <h2 className="micro text-ink-mute">Hours</h2>
            <dl className="mt-4 space-y-2 border-b border-rule pb-8">
              {hours.map((h) => (
                <div key={h.days} className="flex gap-5">
                  <dt className="w-20 shrink-0 text-ink-mute">{h.days}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>

            <h2 className="micro mt-8 text-ink-mute">Larger parties</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-mute">
              Groups over ten, celebrations and buyouts are handled by the
              events team so the room is set the way you want it.
            </p>
            <Link
              href="/private-events"
              className="micro mt-5 inline-flex border border-ink/25 px-7 py-3.5 transition-colors duration-[var(--dur-micro)] hover:border-ink hover:bg-ink hover:text-bone"
            >
              Plan an event
            </Link>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
