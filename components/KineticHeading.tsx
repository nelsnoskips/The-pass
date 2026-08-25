import type { ElementType } from "react";

/**
 * Type that resolves as it enters the frame.
 *
 * The unit of motion is the word or the letter rather than the block:
 * each arrives on its own slightly later beat, so a line reads as being
 * set rather than sliding in. Sentences split by word — a forty-node
 * character split costs more than it returns and makes long copy feel
 * gimmicky. Short display type splits by character, which is where the
 * effect actually belongs.
 *
 * No animation library. The stagger is a per-unit offset into a view
 * progress timeline, so it runs on the compositor off the element's own
 * entry into the viewport and scrubs backwards when the guest scrolls
 * back up. Browsers without view timelines get the headline, set, with
 * nothing to wait for.
 *
 * `KineticText` is the inline splitter, because real headlines carry
 * emphasis and line breaks and cannot be handed over as one string. The
 * heading around it wears `kin kin-word` and an aria-label so a screen
 * reader is given the sentence rather than spelling it out; `start`
 * continues the count across segments so the stagger does not restart
 * at every `<em>`.
 */
export function KineticText({
  text,
  by = "word",
  start = 0,
}: {
  text: string;
  by?: "word" | "char";
  start?: number;
}) {
  const units =
    by === "char" ? Array.from(text) : text.split(/(\s+)/).filter(Boolean);

  let i = start;
  return (
    <>
      {units.map((u, k) =>
        // Whitespace keeps the line breaking normally and takes no beat
        // of its own, or the stagger stutters between words.
        /^\s+$/.test(u) ? (
          <span key={k} className="kin-gap"> </span>
        ) : (
          <span
            key={k}
            className="kin-u"
            style={{ ["--i" as string]: i++ }}
            aria-hidden
          >
            {u}
          </span>
        ),
      )}
    </>
  );
}

/** The simple case: a whole heading from one plain string. */
export function KineticHeading({
  text,
  as: Tag = "h2",
  by = "word",
  className = "",
}: {
  text: string;
  as?: ElementType;
  by?: "word" | "char";
  className?: string;
}) {
  return (
    <Tag className={`kin kin-${by} ${className}`.trim()} aria-label={text}>
      <KineticText text={text} by={by} />
    </Tag>
  );
}
