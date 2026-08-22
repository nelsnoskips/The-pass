/**
 * Ambient luminosity for the dark sections.
 *
 * The pages this answers to are never still: something is always
 * breathing behind the type, and that — more than any single effect —
 * is what separates a page that feels alive from one that only moves
 * when you scroll it.
 *
 * They achieve it with a looping video composited on `screen`. This
 * paints the same light with gradients instead, because the blend is
 * the effect and the video is only a delivery mechanism for it. No
 * bytes, no decode, nothing for the LCP to wait on.
 *
 * It belongs on the dark connective sections and nowhere near a plated
 * dish: light thrown across food photography reads as a colour cast,
 * not as atmosphere.
 */
export function Ambience() {
  return (
    <div className="mk-ambience" aria-hidden>
      <i /><i /><i />
    </div>
  );
}
