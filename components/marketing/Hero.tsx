import { EmberField } from "./EmberField";
import { ScrubFilm } from "@/components/ScrubFilm";

/**
 * Cinematic hero: a pinned stage scrubbed by scroll. Act I, the wordmark
 * over the darkened room; Act II, the promise as the room comes to
 * light; Act III, the film resolves into the classic still hero, CTA
 * and all, and releases the page. Acts I and II exist only in cinematic
 * mode (.mk-cine): with no motion engine, the guest simply gets the
 * final frame. Layout for both modes lives in globals.css.
 */
export function Hero() {
  return (
    <section className="mk-stagewrap bg-[#0A0A09]">
      <div className="mk-stage bg-[#0A0A09]">
        {/* The pass, on film. Scroll is the playhead: the lamps come up
            and the room arrives at light as the guest scrubs — the studio
            doing on its own hero what it sells. The poster is the final,
            lit frame, so every no-motion path gets the finished pass as
            the still. This plane never transforms; the film is its only
            motion. */}
        <div className="mk-act-photo absolute inset-0 z-0" aria-hidden>
          <ScrubFilm
            src="/video/pass/pass-light-scrub.mp4"
            poster="/video/pass/pass-light-poster.jpg"
            wrapper=".mk-stagewrap"
            className="h-full w-full object-cover object-center"
          />
        </div>

        {/* Still-hero gradient: joins the copy field to the photograph.
            Hidden in cinematic mode, where the veil and the final act's
            shade take over. */}
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
          {/* Act I — the name (cinematic only). */}
          <div className="mk-act mk-act-title" aria-hidden>
            <p className="mk-rise mk-title-big font-editorial tracking-[0.12em] text-[#F1EDE5]">
              THE PASS
            </p>
            <p className="mk-rise mk-rise-2 mt-3 font-editorial italic text-[26px] text-[#B79A68] sm:text-[30px]">
              by Madison Four
            </p>
          </div>

          {/* Act II — the promise (cinematic only). */}
          <div className="mk-act mk-act-line1" aria-hidden>
            <p className="mk-line1-big font-editorial leading-[1.08] text-[#F1EDE5]">
              Restaurant websites,{" "}
              <em className="italic text-[#B79A68]">crafted.</em>
            </p>
            <p className="mk-sub mt-5 text-[15.5px] leading-relaxed text-[#F1EDE5]/70">
              The design studio for restaurants. Websites that carry your
              hospitality online and turn lookers into guests.
            </p>
          </div>

          {/* Act III — the resolution: the classic hero, and the page's
              real content in every mode. */}
          <div className="mk-act mk-act-final">
            <div
              className="mk-final-shade bg-gradient-to-r from-[#0A0A09] from-[26%] via-[#0A0A09]/78 via-[48%] to-[#0A0A09]/16"
              aria-hidden
            />
            <div className="mk-final-inner">
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
