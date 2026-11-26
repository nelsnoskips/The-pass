import type { Metadata } from "next";
import { ContactForm } from "@/components/contact";
import { PageShell } from "@/components/pages";
import { QuoteContact } from "@/components/quote";
import { Band, Head } from "@/components/sections-a";
import { asset } from "@/lib/images";
import { CONTACT_PAGE } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Contact — Orravan Mechanical",
  description: "Contact Orravan Mechanical in Long Beach: (855) 677-2826, info@orravan.ai, Monday to Friday 8am–5pm.",
};

/** Contact us, moved from orravan.ai/contact-us. */
export default function ContactPage() {
  return (
    <PageShell>
      <Band className="o-quote-band">
        <Head
          lines={CONTACT_PAGE.head}
          copy={CONTACT_PAGE.lede}
          aside={
            <>
              <QuoteContact />
              <a href={asset("/request-quote")} className="o-label mt-6 inline-block text-[10px] text-[var(--orravan-blue)]">
                Need a quote? Request one here &rarr;
              </a>
            </>
          }
        />
        <div className="lg:pr-10">
          <ContactForm />
        </div>
      </Band>
    </PageShell>
  );
}
