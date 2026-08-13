import Image from "next/image";
import Link from "next/link";
import { images, occasions, venueFacts } from "@/lib/site";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Module 05 — private-events reveal (blueprint §07/§08). The attached venue has
 * to feel bookable before it opens, so the homepage carries the proof points
 * that qualify a lead: capacity, occasions, and a response-time promise.
 */
export function PrivateEventsReveal() {
  return (
    <section className="relative overflow-hidden bg-oxblood text-bone">
      <div className="grid lg:grid-cols-[1.05fr_1fr]">
        <div className="px-6 py-16 md:px-10 lg:py-24">
          <Reveal>
            <p className="micro text-bone/70">The Annex at Rebellion</p>
            <h2 className="display mt-5 text-[clamp(2.2rem,4.4vw,3.8rem)]">
              Gather differently
            </h2>
            <p className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-bone/75">
              A room of its own, attached to the bistro — for rehearsal dinners,
              milestone celebrations, corporate gatherings, and full buyouts.
              Same kitchen. Same cellar. Nobody else in the room.
            </p>
          </Reveal>

          <Reveal index={1}>
            <dl className="mt-9 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-bone/20 pt-8 sm:grid-cols-4">
              {venueFacts.map((f) => (
                <div key={f.label}>
                  <dt className="micro text-bone/55">{f.label}</dt>
                  <dd className="display mt-2 text-xl">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal index={2}>
            <ul className="mt-9 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {occasions.map((o) => (
                <li key={o.title} className="text-sm">
                  <span className="font-semibold">{o.title}</span>
                  <span className="block text-bone/60">{o.line}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal index={3} className="mt-10">
            <Link
              href="/private-events"
              className="micro inline-flex bg-bone px-8 py-4 text-ink transition-colors duration-[var(--dur-micro)] hover:bg-ink hover:text-bone"
            >
              Plan your event
            </Link>
          </Reveal>
        </div>

        <Reveal index={1} className="relative min-h-[340px] lg:min-h-full">
          <Image
            src={images.annexRoom.src}
            alt={images.annexRoom.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 48vw"
            className="object-cover"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-oxblood/70 to-transparent"
          />
        </Reveal>
      </div>
    </section>
  );
}
