import { Reveal } from "@/components/ui/Reveal";
import { Splatter } from "@/components/ui/Brand";

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
      <Splatter
        className="top-8 right-[8%] hidden h-20 w-20 opacity-30 md:block"
        color="var(--wash-sky)"
      />
      <div className="relative px-6 py-16 md:px-10 lg:py-20">
        <Reveal>
          <p className="micro text-oxblood">In their words</p>
        </Reveal>
        <ul className="mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
          {quotes.map((q, i) => (
            <Reveal as="li" key={q.source} index={i}>
              <figure>
                <span aria-hidden className="ink-rule mb-6 block w-14 text-oxblood" />
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
