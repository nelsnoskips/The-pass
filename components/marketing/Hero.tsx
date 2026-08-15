import Image from "next/image";
import { EmberField } from "./EmberField";

const HERO_IMAGE = "/images/hero-pass.jpg";

/**
 * Split-composition hero: ink field with the brand statement on the left,
 * warm evening service photography bleeding right, joined by a gradient —
 * never two unrelated rectangles. The pass-line motif runs beneath the CTA.
 */
export function Hero() {
  return (
    <section className="relative flex min-h-[92vh] items-stretch overflow-hidden bg-[#0A0A09]">
      {/* Photography: absolute, right-weighted, slow cinematic drift. */}
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute inset-y-0 left-[24%] right-0 lg:left-[34%]">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            quality={90}
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="mk-drift object-cover object-center"
          />
        </div>
        {/* Gradient joins copy field to photograph. */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A09] from-[26%] via-[#0A0A09]/78 via-[48%] to-[#0A0A09]/16" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0A0A09] to-transparent" />
        {/* Embers drift over the photograph, never over the copy field. */}
        <EmberField className="absolute inset-y-0 left-[24%] right-0 h-full w-auto lg:left-[30%]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col justify-center px-5 pb-24 pt-36 sm:px-8">
        <div className="max-w-[620px]">
          <p className="mk-rise font-editorial text-[15vw] leading-[0.94] tracking-[0.12em] text-[#F1EDE5] sm:text-[92px]">
            THE PASS
          </p>
          <p className="mk-rise mk-rise-2 mt-3 font-editorial italic text-[26px] text-[#B79A68] sm:text-[30px]">
            by Madison Four
          </p>

          <h1 className="mk-rise mk-rise-3 mt-10 font-editorial text-[34px] leading-[1.08] text-[#F1EDE5] sm:text-[44px]">
            Restaurant websites,{" "}
            <em className="italic text-[#B79A68]">crafted.</em>
          </h1>
          <p className="mk-rise mk-rise-3 mt-5 max-w-[440px] text-[15.5px] leading-relaxed text-[#F1EDE5]/70">
            The design studio for restaurants. Websites that carry your
            hospitality online and turn lookers into guests.
          </p>

          <div className="mk-rise mk-rise-4 mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#consultation"
              className="mk-label group inline-flex items-center gap-3 border border-[#B79A68] bg-transparent px-6 py-4 text-[#F1EDE5] transition-colors hover:bg-[#B79A68] hover:text-[#0A0A09]"
            >
              Request a Private Consultation
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </a>
            <a
              href="#craft"
              className="mk-label py-4 text-[#F1EDE5]/65 transition-colors hover:text-[#F1EDE5]"
            >
              Explore the Craft
            </a>
          </div>

          {/* The pass line: preparation moving toward the guest. */}
          <div className="mk-rise mk-rise-4 mt-14 max-w-[440px]">
            <div className="mk-passline h-px bg-[#B79A68]/25" />
            <div className="mt-3 flex justify-between text-[10px] font-medium uppercase tracking-[0.22em] text-[#F1EDE5]/40">
              <span>Design</span>
              <span>Build</span>
              <span>Launch</span>
              <span>Guest</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
