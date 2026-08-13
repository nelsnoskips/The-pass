import type { Metadata } from "next";
import Image from "next/image";
import { PageShell } from "@/components/site/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { Bloom, BrushRule } from "@/components/ui/Artwork";
import { ArrowLink } from "@/components/ui/Button";
import { images } from "@/lib/site";

export const metadata: Metadata = {
  title: "Story",
  description:
    "Cultured defiance in Cocoa Beach — the people, the point of view, and why Rebellion Beachside Bar & Bistro cooks the way it does.",
};

/* PLACEHOLDER copy — the real story, names and photography come out of the
   owner workshop and shoot day 01 (blueprint §12/§14). */

const pillars = [
  {
    title: "Defiance with taste",
    line: "We challenge convention through choices that are intelligent and edited — not loud for the sake of it.",
  },
  {
    title: "Hospitality with character",
    line: "Warm, observant service without scripts, stiffness, or performance.",
  },
  {
    title: "Curiosity, poured",
    line: "Wine, cocktails, food and classes exist to make discovery accessible.",
  },
  {
    title: "Local, never predictable",
    line: "We own the beachside setting without becoming a themed beach restaurant.",
  },
];

export default function StoryPage() {
  return (
    <PageShell
      eyebrow="Our Story"
      title="Cultured defiance"
      intro="Rebellion started with a simple objection: most nights out are forgettable, and they don't have to be."
      image="diningRoom"
    >
      <section className="paper-grain relative overflow-hidden bg-bone">
        <Bloom variant="a" opacity={55} className="-top-40 -left-32 h-[520px] w-[560px] text-wash-blush" />
        <Bloom variant="b" opacity={45} className="right-[4%] -bottom-40 h-[460px] w-[500px] text-wash-sky" />
        <div className="relative mx-auto max-w-[1100px] px-6 py-16 md:px-10 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <Reveal>
              <h2 className="display-soft text-[clamp(1.7rem,3vw,2.4rem)]">
                Every Rebellion experience carries a point of view — from the
                bottle to the plate to the room.
              </h2>
              <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-ink-mute">
                <p>
                  We are a chef- and wine-led house in Cocoa Beach, built for
                  people who want character without pretension. The kitchen
                  works with the season and the boats. The bar works with
                  whatever is ripe. The cellar is deep because somebody here
                  cannot stop reading about it.
                </p>
                <p>
                  The result is a room that feels considered and a little
                  surprising, and completely its own — the kind of place where a
                  Tuesday turns into a story.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                <ArrowLink href="/menus">See the menus</ArrowLink>
                <ArrowLink href="/visit">Plan a visit</ArrowLink>
              </div>
            </Reveal>

            <Reveal index={1} className="art-frame-portrait relative aspect-[4/5]">
              <Image
                src={images.chefPass.src}
                alt={images.chefPass.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </Reveal>
          </div>

          <Reveal className="mt-20">
            <h2 className="micro text-oxblood">What we stand on</h2>
            <BrushRule className="mt-3 w-16 text-oxblood" variant={0} />
            <ul className="mt-8 grid gap-px bg-rule sm:grid-cols-2">
              {pillars.map((p) => (
                <li key={p.title} className="bg-bone p-8">
                  <h3 className="display text-xl">{p.title}</h3>
                  <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-ink-mute">
                    {p.line}
                  </p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
