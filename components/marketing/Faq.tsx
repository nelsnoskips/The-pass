import { FAQS } from "@/lib/faq";

/**
 * The last objections, answered before the form.
 *
 * Native `<details>`, so every answer is in the HTML whether or not it
 * is open. A JavaScript accordion that mounts its answers on click
 * hides them from the crawler that this section exists to feed, which
 * would be an expensive kind of irony on a studio that sells search.
 * It also means the whole thing works with no JavaScript at all, and
 * keyboard and screen-reader behaviour is the browser's rather than
 * something reimplemented badly.
 *
 * The first one is open on arrival: a column of closed rows reads as a
 * support page, and one open answer shows the reader what the rest are.
 */
export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-24 bg-[#F1EDE5] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-[1400px]">
        <p className="mk-label text-[#4B1719]">Questions</p>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-20">
          <h2
            id="faq-heading"
            className="font-editorial text-[34px] leading-[1.08] text-[#0A0A09] sm:text-[46px]"
          >
            What owners ask{" "}
            <em className="italic text-[#4B1719]">before they start.</em>
          </h2>

          <div className="border-t border-[#0A0A09]/15">
            {FAQS.map((f, i) => (
              <details
                key={f.q}
                open={i === 0}
                className="mk-faq group border-b border-[#0A0A09]/15"
              >
                <summary className="flex cursor-pointer list-none items-baseline gap-4 py-5 text-[16px] leading-snug text-[#0A0A09] marker:hidden sm:text-[17px]">
                  <span className="mk-label mt-1 shrink-0 text-[#4B1719]/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 font-medium">{f.q}</span>
                  {/* A rule that becomes a minus. Cheaper to read than a
                      chevron, and it cannot point the wrong way. */}
                  <span
                    aria-hidden
                    className="relative mt-3 h-px w-4 shrink-0 bg-[#4B1719]/70 transition-transform duration-300 before:absolute before:left-1/2 before:top-0 before:h-4 before:w-px before:-translate-x-1/2 before:-translate-y-1/2 before:bg-[#4B1719]/70 before:transition-transform before:duration-300 group-open:before:scale-y-0"
                  />
                </summary>
                <p className="max-w-[62ch] pb-6 pl-[3.1rem] text-[14.5px] leading-relaxed text-[#1A1310]/75">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
