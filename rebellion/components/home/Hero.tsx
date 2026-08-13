import Image from "next/image";
import Link from "next/link";
import { images, site } from "@/lib/site";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Module 01 — cinematic hero (blueprint §07).
 *
 * A still poster frame ships in the HTML and is the LCP element; the ambient
 * clip from shoot day 01 gets layered in here later, muted, behind the poster,
 * and only after the page is interactive. Headline reveals by line; the
 * reservation action never waits on any of it.
 */
export function Hero() {
  return (
    <section className="relative min-h-[86svh] overflow-hidden bg-ink text-bone md:min-h-[92svh]">
      <Image
        src={images.hero.src}
        alt={images.hero.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Two scrims: a bottom-left wedge for the headline, a top band so the
          transparent navigation keeps contrast in every frame. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-tr from-ink/90 via-ink/45 to-ink/10"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink/70 to-transparent"
      />

      <div className="relative flex min-h-[86svh] flex-col justify-end px-6 pt-32 pb-14 md:min-h-[92svh] md:px-10 md:pb-20">
        <h1 className="display max-w-[15ch] text-[clamp(2.9rem,9vw,7.5rem)]">
          <Reveal index={0} className="block">
            Rebel Against
          </Reveal>
          <Reveal index={1} className="block">
            The Ordinary
          </Reveal>
        </h1>

        <Reveal index={2} className="mt-8 flex flex-wrap gap-3">
          <Link
            href={site.reserveUrl}
            className="micro bg-oxblood px-9 py-5 text-bone transition-colors duration-[var(--dur-micro)] hover:bg-[#8d343d]"
          >
            Reserve a table
          </Link>
          <Link
            href="/menus"
            className="micro border border-bone/45 bg-ink/40 px-9 py-5 text-bone backdrop-blur-sm transition-colors duration-[var(--dur-micro)] hover:bg-bone hover:text-ink"
          >
            View menus
          </Link>
        </Reveal>
      </div>

      {/* Scroll affordance — decorative, keyboard users never need it. */}
      <div
        aria-hidden
        className="absolute right-6 bottom-16 hidden flex-col items-center gap-4 lg:flex"
      >
        <span className="micro [writing-mode:vertical-rl] text-bone/70">
          Scroll
        </span>
        <span className="h-16 w-px bg-bone/40" />
        <span className="h-2 w-2 rounded-full bg-bone/70" />
      </div>
    </section>
  );
}
