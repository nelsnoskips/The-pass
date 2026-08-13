import Image from "next/image";
import Link from "next/link";
import { features, images } from "@/lib/site";
import { Reveal } from "@/components/ui/Reveal";
import { BrushRule, Deckle } from "@/components/ui/Artwork";

const tones = {
  ink: "bg-ink",
  "ink-soft": "bg-ink-soft",
  oxblood: "bg-oxblood",
} as const;

/**
 * Modules 04–06 (blueprint §07) compressed into one dark band: food, cocktails,
 * private events. Each panel pairs a short headline with a single photograph —
 * earned drama, no paragraphs before the guest can act.
 */
export function FeatureTriptych() {
  return (
    <section className="relative grid text-bone lg:grid-cols-3">
      {/* Paper tears over the band at both ends, so the dark panels read as
          something laid onto the page rather than a rectangle of colour. */}
      <Deckle edge="top" variant={0} className="text-bone" />
      <Deckle edge="bottom" variant={2} className="text-bone" />

      {features.map((feature, i) => {
        const img = images[feature.image];
        return (
          <Reveal
            as="article"
            key={feature.key}
            index={i}
            className={`group relative grid grid-cols-2 ${tones[feature.tone]}`}
          >
            <div className="flex flex-col justify-center p-6 py-10 md:p-8 md:py-12">
              <h2 className="display max-w-[10ch] text-[clamp(1.5rem,2.2vw,2rem)]">
                {feature.eyebrow}
              </h2>
              <BrushRule variant={i % 3 === 0 ? 0 : ((i % 3) as 1 | 2)} className="mt-4 mb-5 w-12 text-signal" />
              <p className="max-w-[24ch] text-sm leading-relaxed text-bone/75">
                {feature.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
              <Link
                href={feature.href}
                className="micro mt-7 inline-flex items-center gap-2 self-start text-signal"
              >
                <span className="border-b border-signal/50 pb-1">
                  {feature.cta}
                </span>
                <span
                  aria-hidden
                  className="transition-transform duration-[var(--dur-micro)] ease-[var(--ease-ui)] group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>

            <div className="relative min-h-[240px] overflow-hidden">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 1024px) 50vw, 17vw"
                className="object-cover transition-transform duration-[var(--dur-editorial)] ease-[var(--ease-expressive)] group-hover:scale-[1.04]"
              />
              {/* Feathers the photograph into the panel colour. */}
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-ink/55 via-ink/10 to-transparent"
              />
            </div>
          </Reveal>
        );
      })}
    </section>
  );
}
