"use client";

import { useState } from "react";
import { FAQ } from "@/lib/site";
import { Band, Head } from "./sections-a";

/**
 * The FAQ, twice.
 *
 * Once as an accordion for people, once as FAQPage structured data for
 * machines. The second is not decoration: it is the thing that lets a
 * search engine or an AI answer engine quote Orravan's own answer to
 * "does Orravan do residential HVAC" instead of guessing — and it is
 * the concrete substance behind the SEO/AEO commitment. Both are
 * rendered from the same array, so they cannot drift apart.
 */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <Band id="faq">
      <Head lines={FAQ.head} copy={FAQ.copy} />

      <div className="o-faq">
        {FAQ.items.map((it, i) => {
          const on = open === i;
          return (
            <div key={it.q} className="o-faq-item" data-on={on || undefined}>
              <h3>
                <button
                  type="button"
                  aria-expanded={on}
                  aria-controls={`faq-a-${i}`}
                  id={`faq-q-${i}`}
                  onClick={() => setOpen(on ? null : i)}
                >
                  <span className="o-label o-faq-n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="o-faq-q">{it.q}</span>
                  <span className="o-faq-mark" aria-hidden>{on ? "\u2212" : "+"}</span>
                </button>
              </h3>
              <div
                id={`faq-a-${i}`}
                role="region"
                aria-labelledby={`faq-q-${i}`}
                className="o-faq-a"
                hidden={!on}
              >
                <p>{it.a}</p>
              </div>
            </div>
          );
        })}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
    </Band>
  );
}
