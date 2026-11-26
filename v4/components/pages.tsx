import { Assist } from "@/components/assist";
import { Footer, TopBar } from "@/components/chrome";
import { Band } from "@/components/sections-a";
import { asset } from "@/lib/images";
import { ORRAVAN } from "@/lib/site";

/**
 * The frame every inner page shares: the bar (shown from the start),
 * the page, the footer and the assistant.
 */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="o-below-bar">{children}</main>
      <Footer />
      <Assist />
    </>
  );
}

/** An inner page's opening: eyebrow, the two-line head, the lede. */
export function PageHero({
  eyebrow,
  head,
  lede,
  aside,
}: {
  eyebrow: string;
  head: readonly string[];
  lede: string;
  aside?: React.ReactNode;
}) {
  return (
    <Band className="o-page-hero">
      <div>
        <p className="o-label text-[10px] text-[var(--orravan-blue)]">{eyebrow}</p>
        <h1 className="o-display mt-3 text-[clamp(2.4rem,4.6vw,4.6rem)] leading-[0.88]">
          {head.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </h1>
      </div>
      <div className="grid content-start gap-6 lg:pr-10">
        <p className="max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">{lede}</p>
        {aside}
      </div>
    </Band>
  );
}

/** A titled list, as their services pages set them out. */
export function ListBlock({
  title,
  items,
  href,
  sub,
}: {
  title: string;
  items: readonly string[];
  href?: string;
  sub?: { title: string; items: readonly string[] };
}) {
  return (
    <div className="o-list-block">
      <p className="o-label text-[10px] text-ink">{title}</p>
      <ul>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      {sub && (
        <>
          <p className="o-label mt-5 text-[10px] text-ink-mute">{sub.title}</p>
          <ul>
            {sub.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </>
      )}
      {href && (
        <a href={asset(href)} className="o-label mt-5 inline-block text-[10px] text-[var(--orravan-blue)]">
          Learn more &rarr;
        </a>
      )}
    </div>
  );
}

/** The close every inner page ends on: quote, or a call. */
export function CallToAction({ line = "Tell us what your building needs." }: { line?: string }) {
  return (
    <Band dark>
      <h2 className="o-display text-[length:var(--head)] leading-[0.88]">
        <span className="block">Ready when</span>
        <span className="block">you are.</span>
      </h2>
      <div className="grid content-start gap-5 lg:pr-10">
        <p className="max-w-[48ch] text-[15px] leading-relaxed text-bone/70">{line}</p>
        <div className="flex flex-wrap gap-3">
          <a href={asset("/request-quote")} className="o-btn bg-[var(--orravan-blue)]">
            Request a quote
          </a>
          <a
            href={`tel:${ORRAVAN.phone.replace(/\D/g, "")}`}
            className="inline-flex min-h-[44px] items-center border border-bone/40 px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-bone transition-colors hover:bg-bone/10"
          >
            Call {ORRAVAN.phone}
          </a>
        </div>
      </div>
    </Band>
  );
}
