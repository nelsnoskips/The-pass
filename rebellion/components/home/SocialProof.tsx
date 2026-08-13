import { Reveal } from "@/components/ui/Reveal";
import { Bloom, BrushRule, InkSplatter } from "@/components/ui/Artwork";

/* PLACEHOLDER — replace with real, attributed guest and press language before
   launch. Blueprint §07: selected review language, no generic logo wall. */
const quotes = [
  {
    quote:
      "The kind of place that ruins other restaurants for you. We came for one drink and left three hours later.",
    source: "Guest review",
  },
  {
    quote:
      "A wine list with actual opinions, run by people who want you to find something new.",
    source: "Local press",
  },
  {
    quote:
      "They hosted forty of us for a rehearsal dinner and made it feel like a private house party.",
    source: "Event host",
  },
];

export function SocialProof() {
  return (
    <section className="paper-grain relative overflow-hidden bg-bone">
      <Bloom
        variant="a"
        opacity={45}
        className="-top-40 right-[4%] h-[440px] w-[480px] text-wash-blush"
      />
      <InkSplatter
        variant="b"
        opacity={10}
        className="-bottom-10 left-[30%] hidden h-44 w-44 text-oxblood md:block"
      />
      <div className="relative px-6 py-20 md:px-10">
        <Reveal>
          <p className="micro text-oxblood">In their words</p>
        </Reveal>
        <ul className="mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
          {quotes.map((q, i) => (
            <Reveal as="li" key={q.source} index={i}>
              <figure>
                <BrushRule
                  variant={(i % 3) as 0 | 1 | 2}
                  className="mb-6 h-2.5 w-16 text-oxblood"
                />
                <blockquote className="display-soft text-[clamp(1.25rem,1.9vw,1.6rem)]">
                  {q.quote}
                </blockquote>
                <figcaption className="micro mt-5 text-ink-mute">
                  {q.source}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
