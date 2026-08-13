import Image from "next/image";
import { images } from "@/lib/site";
import { ArrowLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Wash } from "@/components/ui/Brand";

/**
 * Module 04 — food + wine editorial (blueprint §07). Asymmetric on purpose:
 * the photograph carries more width than the copy, and the copy stops before
 * it becomes lore.
 */
export function EditorialSplit() {
  return (
    <section className="paper-grain relative overflow-hidden bg-paper">
      <Wash tone="sky" className="-right-24 -bottom-32 h-[460px] w-[520px]" />

      <div className="relative grid items-center gap-10 px-6 py-16 md:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-24">
        <Reveal>
          <p className="micro text-oxblood">The Kitchen</p>
          <h2 className="display-soft mt-5 text-[clamp(2rem,4vw,3.4rem)]">
            We cook like the rules are optional and the ingredients are not.
          </h2>
          <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-ink-mute">
            The menu moves with the boats, the farms, and whatever the chef
            argued about that morning. Wine is chosen the same way — by people
            who taste everything and refuse to pour anything they can&apos;t
            explain.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            <ArrowLink href="/menus">See the menus</ArrowLink>
            <ArrowLink href="/story">Meet the team</ArrowLink>
          </div>
        </Reveal>

        <Reveal index={1} className="grid grid-cols-5 gap-4">
          <figure className="relative col-span-3 aspect-[4/5] overflow-hidden">
            <Image
              src={images.featuredFood.src}
              alt={images.featuredFood.alt}
              fill
              sizes="(max-width: 1024px) 60vw, 34vw"
              className="object-cover"
            />
          </figure>
          <div className="col-span-2 flex flex-col gap-4">
            <figure className="relative aspect-square overflow-hidden">
              <Image
                src={images.board.src}
                alt={images.board.alt}
                fill
                sizes="(max-width: 1024px) 40vw, 22vw"
                className="object-cover"
              />
            </figure>
            <figure className="relative flex-1 overflow-hidden">
              <Image
                src={images.bar.src}
                alt={images.bar.alt}
                fill
                sizes="(max-width: 1024px) 40vw, 22vw"
                className="object-cover"
              />
            </figure>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
