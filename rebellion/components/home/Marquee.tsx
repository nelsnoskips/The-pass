import { marqueeWords } from "@/lib/site";
import { Deckle } from "@/components/ui/Artwork";

/**
 * Editorial marquee (blueprint §08): slow, decorative, and paused on hover or
 * focus. The words are `aria-hidden` — they carry pacing and personality, not
 * information, so nothing is lost to assistive tech or to reduced motion.
 */
export function Marquee() {
  const run = [...marqueeWords, ...marqueeWords, ...marqueeWords];

  return (
    <div
      aria-hidden
      className="marquee relative overflow-hidden bg-ink py-8 select-none"
    >
      <Deckle edge="top" variant={2} className="text-bone" />
      <Deckle edge="bottom" variant={0} className="text-paper" />
      <div className="marquee-track flex w-max items-center gap-8 pr-8">
        {[...run, ...run].map((word, i) => (
          <span key={`${word}-${i}`} className="flex items-center gap-8">
            <span className="display text-2xl text-bone/85 md:text-3xl">
              {word}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-signal" />
          </span>
        ))}
      </div>
    </div>
  );
}
