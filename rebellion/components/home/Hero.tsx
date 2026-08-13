import Image from "next/image";
import Link from "next/link";
import { images, site } from "@/lib/site";
import { Reveal } from "@/components/ui/Reveal";
import { Bloom, InkSplatter } from "@/components/ui/Artwork";

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
      {/* An oxblood wash under the headline: it does the work of a scrim while
          reading as pigment rather than a black box. */}
      <Bloom
        variant="c"
        opacity={38}
        className="-bottom-40 -left-48 h-[820px] w-[900px] text-oxblood"
      />

      <div className="relative flex min-h-[86svh] flex-col justify-end px-6 pt-32 pb-14 md:min-h-[92svh] md:px-10 md:pb-20">
        <h1 className="display relative max-w-[15ch] text-[clamp(2.9rem,9vw,7.5rem)]">
          <Reveal index={0} className="block">
            Rebel Against
          </Reveal>
          <Reveal index={1} className="block">
            {/* The one loud mark on the page: ink thrown at the end of the
                line, anchored to the text so it lands there at any size. */}
            <span className="relative inline-block">
              The Ordinary
              <InkSplatter
                variant="b"
                opacity={95}
                className="-top-4 -right-8 h-14 w-14 text-signal md:-top-6 md:-right-14 md:h-24 md:w-24"
              />
            </span>
          </Reveal>
        </h1>

        <Reveal index={2} className="relative mt-8 flex flex-wrap gap-3">
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
