import Image from "next/image";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingReserve } from "@/components/site/FloatingReserve";
import { images, type ImageName } from "@/lib/images";
import { Reveal } from "@/components/ui/Reveal";

/** Standard interior page: overlay header, editorial masthead, footer. */
export function PageShell({
  eyebrow,
  title,
  intro,
  image,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  image: ImageName;
  children: React.ReactNode;
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
          <div className="relative w-full px-6 pt-36 pb-12 md:px-10 md:pb-16">
            <Reveal>
              <p className="micro text-signal">{eyebrow}</p>
              <h1 className="display mt-4 max-w-[18ch] text-[clamp(2.4rem,6.5vw,5rem)]">
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
