import Image from "next/image";
import { EmberField } from "./EmberField";

const HERO_IMAGE = "/images/hero-pass.jpg";

/**
 * Cinematic hero: a pinned stage scrubbed by scroll. Act I, the wordmark
 * over the darkened room; Act II, the promise as the room comes to
 * light; Act III, the invitation. When no motion engine is available
 * (no JS, reduced motion) the same markup renders as a classic still
 * hero: left-aligned column over the photograph. Layout for both modes
 * lives in globals.css under .mk-stagewrap / .mk-cine.
 */
export function Hero() {
  return (
    <section className="mk-stagewrap bg-[#0A0A09]">
      <div className="mk-stage bg-[#0A0A09]">
        {/* The room. */}
        <div className="mk-act-photo absolute inset-0 z-0" aria-hidden>
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            quality={90}
            sizes="100vw"
            className="mk-drift object-cover object-center"
          />
        </div>

        {/* Still-hero gradient: joins the copy field to the photograph.
            Hidden in cinematic mode, replaced by the lifting veil. */}
        <div
          className="mk-veil-static absolute inset-0 z-[1] bg-gradient-to-r from-[#0A0A09] from-[26%] via-[#0A0A09]/78 via-[48%] to-[#0A0A09]/16"
          aria-hidden
        />
        <div className="mk-act-veil bg-[#0A0A09]" aria-hidden />
        <div
          className="absolute inset-x-0 bottom-0 z-[2] h-40 bg-gradient-to-t from-[#0A0A09] to-transparent"
          aria-hidden
        />
        <EmberField className="absolute inset-0 z-[3] h-full w-full" />

        <div className="mk-acts">
          {/* Act I — the name. */}
          <div className="mk-act mk-act-title">
            <p className="mk-rise mk-title-big font-editorial text-[15vw] leading-[0.94] tracking-[0.12em] text-[#F1EDE5] sm:text-[92px]">
              THE PASS
            </p>
            <p className="mk-rise mk-rise-2 mt-3 font-editorial italic text-[26px] text-[#B79A68] sm:text-[30px]">
              by Madison Four
            </p>
          </div>

          {/* Act II — the promise. */}
          <div className="mk-act mk-act-line1">
            <h1 className="mk-rise mk-rise-3 font-editorial text-[34px] leading-[1.08] text-[#F1EDE5] sm:text-[44px]">
              Restaurant websites,{" "}
              <em className="italic text-[#B79A68]">crafted.</em>
            </h1>
            <p className="mk-sub mk-rise mk-rise-3 mt-5 max-w-[440px] text-[15.5px] leading-relaxed text-[#F1EDE5]/70">
              The design studio for restaurants. Websites that carry your
              hospitality online and turn lookers into guests.
            </p>
          </div>

          {/* Act III — the invitation. */}
          <div className="mk-act mk-act-cta">
            <div className="mk-ctarow mk-rise mk-rise-4 flex flex-wrap items-center gap-4">
              <a
                href="#consultation"
                className="mk-label group inline-flex items-center gap-3 border border-[#B79A68] bg-transparent px-6 py-4 text-[#F1EDE5] transition-colors hover:bg-[#B79A68] hover:text-[#0A0A09]"
              >
                Request a Private Consultation
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
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
            <div className="mk-passwrap mk-rise mk-rise-4 mt-14 w-full max-w-[440px]">
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

        {/* Scroll hint, cinematic mode only. */}
        <div className="mk-act-hint" aria-hidden>
          <span className="mk-label flex items-center gap-2 text-[#F1EDE5]/60">
            Scroll
            <span className="font-editorial text-[16px] leading-none">↓</span>
          </span>
        </div>
      </div>
    </section>
  );
}
