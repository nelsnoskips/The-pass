import Image from "next/image";

const IMAGE =
  "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=1200&q=75&fm=jpg";

/**
 * Digital Experiences — custom restaurant websites built to convert, found
 * on Google and in AI answers. A brighter, daytime moment to balance the
 * evening photography.
 */
export function DigitalExperiences() {
  return (
    <section
      id="digital-experiences"
      className="scroll-mt-24 bg-[#F1EDE5] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="mk-reveal">
          <p className="mk-label text-[#4B1719]">Digital Experiences</p>
          <h2 className="mt-5 font-editorial text-[38px] leading-[1.06] text-[#0A0A09] sm:text-[46px]">
            Websites guests find,
            <br />
            whether they search{" "}
            <em className="italic text-[#4B1719]">or ask.</em>
          </h2>
          <div className="mt-7 space-y-5 max-w-[440px] text-[15px] leading-relaxed text-[#1A1310]/75">
            <p>
              We design and build custom restaurant websites that carry your
              hospitality online: fast, beautiful, and built to convert
              lookers into covers.
            </p>
            <p>
              Every build is engineered for how guests actually discover
              restaurants now: structured for Google&apos;s rankings{" "}
              <span className="text-[#0A0A09]">and</span> legible to the AI
              assistants guests increasingly ask instead. Search engine
              optimization and answer engine optimization, one foundation.
            </p>
          </div>
          <dl className="mt-9 grid max-w-[440px] grid-cols-3 gap-6 border-t border-[#0A0A09]/15 pt-6">
            {[
              ["SEO", "Rankings & local intent"],
              ["AEO", "Present in AI answers"],
              ["CRO", "Bookings, orders, calls"],
            ].map(([term, def]) => (
              <div key={term}>
                <dt className="font-editorial text-[22px] text-[#0A0A09]">{term}</dt>
                <dd className="mt-1 text-[11.5px] leading-snug text-[#1A1310]/60">{def}</dd>
              </div>
            ))}
          </dl>
        </div>
        <figure className="relative aspect-[4/3] overflow-hidden lg:aspect-[4/4.4]">
          <Image
            src={IMAGE}
            alt="A bright, plant-filled dining room set for daytime service"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="mk-parallax object-cover"
          />
          <div aria-hidden className="absolute inset-0 ring-1 ring-inset ring-[#0A0A09]/10" />
        </figure>
      </div>
    </section>
  );
}
