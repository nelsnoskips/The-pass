import Image from "next/image";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingReserve } from "@/components/site/FloatingReserve";
import { images, type ImageName } from "@/lib/images";
import { Reveal } from "@/components/ui/Reveal";
import { BrushRule, Deckle, InkSplatter } from "@/components/ui/Artwork";

/** Standard interior page: overlay header, editorial masthead, footer. */
export function PageShell({
  eyebrow,
  title,
  intro,
  image,
  children,
  /** Colour of the paper tearing up into the masthead — match whatever
      surface follows it. */
  deckleTone = "text-bone",
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  image: ImageName;
  children: React.ReactNode;
  deckleTone?: string;
}) {
  const img = images[image];

  return (
    <>
      <Header overlay />
      <main id="main">
        <section className="relative flex min-h-[52svh] items-end overflow-hidden bg-ink text-bone">
          <Image
            src={img.src}
            alt={img.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-ink/92 via-ink/55 to-ink/40"
          />
          <InkSplatter
            variant="b"
            opacity={70}
            className="bottom-[18%] -left-20 h-[300px] w-[300px] text-oxblood md:h-[380px] md:w-[380px]"
          />
          <Deckle edge="bottom" variant={0} className={deckleTone} />

          <div className="relative w-full px-6 pt-36 pb-16 md:px-10 md:pb-20">
            <Reveal>
              <p className="micro text-signal">{eyebrow}</p>
              <BrushRule className="mt-3 w-16 text-signal" variant={1} />
              <h1 className="display mt-5 max-w-[18ch] text-[clamp(2.4rem,6.5vw,5rem)]">
                {title}
              </h1>
              {intro && (
                <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-bone/75">
                  {intro}
                </p>
              )}
            </Reveal>
          </div>
        </section>
        {children}
      </main>
      <Footer />
      <FloatingReserve />
    </>
  );
}
