import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, UtensilsCrossed, Wine } from "lucide-react";
import { experiences, images, site } from "@/lib/site";
import { ArrowLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Splatter, Wash } from "@/components/ui/Brand";

const icons = {
  dine: UtensilsCrossed,
  gather: Wine,
  "take-it-home": ShoppingBag,
} as const;

/**
 * Module 02 — "Choose your Rebellion" (blueprint §07): the editorial statement
 * and chef frame on the left, three tactile pathways on the right. Three
 * panels, no more; the site guides by intent, not by department.
 */
export function ChooseYourRebellion() {
  return (
    <section className="paper-grain relative overflow-hidden bg-bone">
      <Wash tone="mixed" className="-top-24 -left-32 h-[420px] w-[560px]" />
      <Splatter
        className="bottom-10 left-[6%] hidden h-16 w-16 opacity-70 lg:block"
        color="var(--wash-blush)"
      />

      <div className="relative grid lg:grid-cols-[0.92fr_1.08fr]">
        {/* Statement + chef */}
        <div className="grid items-stretch sm:grid-cols-[1.05fr_0.95fr]">
          <Reveal className="flex flex-col justify-center px-6 py-12 md:px-10 lg:py-16">
            <h2 className="display max-w-[16ch] text-[clamp(1.9rem,3.4vw,3rem)]">
              A chef-driven bistro, wine destination, and gathering place in Cocoa
              Beach.
            </h2>
            <p className="mt-6 max-w-[42ch] text-[15px] leading-relaxed text-ink-mute">
              {site.description}
            </p>
            <div className="mt-8">
              <ArrowLink href="/story">Our story</ArrowLink>
            </div>
          </Reveal>

          <Reveal index={1} className="relative min-h-[300px] lg:min-h-full">
            <Image
              src={images.chefPass.src}
              alt={images.chefPass.alt}
              fill
              sizes="(max-width: 640px) 100vw, 25vw"
              className="object-cover"
            />
          </Reveal>
        </div>

        {/* Three ways in */}
        <ul className="grid gap-px bg-rule sm:grid-cols-3">
          {experiences.map((exp, i) => {
            const Icon = icons[exp.key as keyof typeof icons];
            const img = images[exp.image];
            return (
              <Reveal
                as="li"
                key={exp.key}
                index={i}
                className="group relative bg-paper"
              >
                <Link
                  href={exp.href}
                  className="flex h-full flex-col transition-transform duration-[var(--dur-ui)] ease-[var(--ease-ui)] hover:-translate-y-[var(--lift)]"
                >
                  {/* The image absorbs any extra column height so the copy
                      block stays tight instead of stranding the CTA. */}
                  <span className="relative block aspect-[4/3] flex-1 overflow-hidden sm:aspect-auto sm:min-h-[190px]">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, 17vw"
                      className="object-cover transition-transform duration-[var(--dur-editorial)] ease-[var(--ease-expressive)] group-hover:scale-[1.04]"
                    />
                  </span>
                  <span className="flex flex-col p-6">
                    <span className="flex items-center gap-2.5">
                      <Icon
                        size={18}
                        aria-hidden
                        className="shrink-0 text-oxblood"
                      />
                      <span className="display text-2xl">{exp.title}</span>
                    </span>
                    <span className="mt-3 block max-w-[26ch] text-sm leading-relaxed text-ink-mute">
                      {exp.line}
                    </span>
                    <span className="micro mt-auto flex items-center gap-2 pt-6 text-oxblood">
                      <span className="border-b border-oxblood/40 pb-1">
                        {exp.cta}
                      </span>
                      <span
                        aria-hidden
                        className="transition-transform duration-[var(--dur-micro)] ease-[var(--ease-ui)] group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </span>
                  {/* Hover adds an outline; it never hides a required action. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 border border-transparent transition-colors duration-[var(--dur-ui)] group-hover:border-oxblood/45"
                  />
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
