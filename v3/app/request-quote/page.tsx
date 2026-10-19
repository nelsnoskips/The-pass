import type { Metadata } from "next";
import { Assist } from "@/components/assist";
import { Footer, TopBar } from "@/components/chrome";
import { QuoteContact, QuoteForm } from "@/components/quote";
import { Band, Head } from "@/components/sections-a";
import { QUOTE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Request a quote — Orravan Mechanical",
  description:
    "Request a quote from Orravan Mechanical for commercial HVAC, building automation, retrofit and service work.",
};

/**
 * Request a quote: the page every "Request service" button opens,
 * replacing orravan.ai/request-quote on Orravan's current site.
 */
export default function RequestQuotePage() {
  return (
    <>
      <TopBar />
      <main>
        <Band id="quote" className="o-quote-band">
          <Head lines={QUOTE.head} copy={QUOTE.copy} aside={<QuoteContact />} />
          <div className="lg:pr-10">
            <QuoteForm />
          </div>
        </Band>
      </main>
      <Footer />
      <Assist />
    </>
  );
}
