import Image from "next/image";
import Link from "next/link";
import { hours, images, site } from "@/lib/site";
import { Reveal } from "@/components/ui/Reveal";
import { Bloom, BrushRule } from "@/components/ui/Artwork";

/**
 * Module 08 — visit (blueprint §07). Location, hours, parking and access sit
 * above the footer because they are the last thing a guest checks before
 * leaving the house.
 */
export function VisitBand() {
  return (
    <section className="paper-grain relative grid overflow-hidden bg-paper lg:grid-cols-2">
      <Bloom
        variant="b"
        opacity={40}
        className="-right-24 -bottom-32 h-[420px] w-[460px] text-wash-sky"
      />
      <Reveal className="art-frame relative min-h-[300px] lg:min-h-[440px]">
        <Image
          src={images.beachside.src}
          alt={images.beachside.alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </Reveal>

      <div className="relative px-6 py-14 md:px-10 lg:py-20">
        <Reveal>
          <p className="micro text-oxblood">Visit</p>
          <BrushRule className="mt-3 w-14 text-oxblood" variant={2} />
          <h2 className="display mt-4 text-[clamp(1.9rem,3.4vw,3rem)]">
            Two blocks from the water
          </h2>
        </Reveal>

        <Reveal index={1} className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="micro text-ink-mute">Address</h3>
            <address className="mt-3 text-sm leading-relaxed not-italic">
              {site.address.street}
              <br />
              {site.address.city}, {site.address.state} {site.address.zip}
              <br />
              <a href={site.phoneHref} className="mt-2 inline-block font-semibold">
                {site.phone}
              </a>
            </address>
          </div>
          <div>
            <h3 className="micro text-ink-mute">Hours</h3>
            <dl className="mt-3 space-y-1.5 text-sm">
              {hours.map((h) => (
                <div key={h.days} className="flex gap-5">
                  <dt className="w-20 shrink-0 text-ink-mute">{h.days}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>

        <Reveal index={2} className="mt-8 flex flex-wrap gap-3">
          <a
            href={site.mapUrl}
            target="_blank"
            rel="noreferrer"
            className="micro border border-ink/25 px-7 py-4 transition-colors duration-[var(--dur-micro)] hover:border-ink hover:bg-ink hover:text-bone"
          >
            Get directions
          </a>
          <Link
            href="/visit"
            className="micro border border-ink/25 px-7 py-4 transition-colors duration-[var(--dur-micro)] hover:border-ink hover:bg-ink hover:text-bone"
          >
            Parking &amp; accessibility
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
