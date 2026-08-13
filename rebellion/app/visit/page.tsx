import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { Bloom, InkSplatter } from "@/components/ui/Artwork";
import { hours, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Visit",
  description:
    "Hours, parking, accessibility and directions for Rebellion Beachside Bar & Bistro in Cocoa Beach, Florida.",
};

/* PLACEHOLDER — every fact on this page needs client confirmation before
   launch (blueprint §15 source caution). */

const faqs = [
  {
    q: "Do you take reservations?",
    a: "Yes, and we recommend them Thursday through Saturday. Walk-ins are always welcome at the bar.",
  },
  {
    q: "Where do I park?",
    a: "There is an on-site lot, plus street parking on the surrounding blocks. Ride-share drop-off is at the front entrance.",
  },
  {
    q: "Is the restaurant accessible?",
    a: "Step-free entry, accessible restrooms, and space between tables for wheelchair access. Tell us what you need when you book and we will set the room accordingly.",
  },
  {
    q: "Are children welcome?",
    a: "Yes, before 8pm. We have a short menu for younger guests.",
  },
  {
    q: "Can I bring my own wine?",
    a: "Corkage is available for bottles we do not carry. Ask when you book.",
  },
  {
    q: "Do you host private events?",
    a: "The Annex at Rebellion handles groups from a dozen to a full buyout — start with an inquiry and we will reply the same business day.",
  },
];

export default function VisitPage() {
  return (
    <PageShell
      eyebrow="Visit"
      title="Two blocks from the water"
      intro="Hours, parking, access and the answers people ask for most."
      image="beachside"
    >
      <section className="paper-grain relative overflow-hidden bg-bone">
        <Bloom variant="c" opacity={50} className="-top-32 right-[6%] h-[440px] w-[480px] text-wash-sage" />
        <InkSplatter variant="spray" opacity={9} className="-bottom-8 left-[8%] hidden h-40 w-40 text-ink lg:block" />
        <div className="relative mx-auto max-w-[1100px] px-6 py-16 md:px-10 lg:py-24">
          <div className="grid gap-10 border-b border-rule pb-14 sm:grid-cols-3">
            <Reveal>
              <h2 className="micro text-ink-mute">Address</h2>
              <address className="mt-4 leading-relaxed not-italic">
                {site.address.street}
                <br />
                {site.address.city}, {site.address.state} {site.address.zip}
              </address>
              <a
                href={site.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="micro mt-4 inline-block text-oxblood underline underline-offset-4"
              >
                Get directions
              </a>
            </Reveal>

            <Reveal index={1}>
              <h2 className="micro text-ink-mute">Hours</h2>
              <dl className="mt-4 space-y-2">
                {hours.map((h) => (
                  <div key={h.days} className="flex gap-5">
                    <dt className="w-20 shrink-0 text-ink-mute">{h.days}</dt>
                    <dd>{h.time}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal index={2}>
              <h2 className="micro text-ink-mute">Contact</h2>
              <p className="mt-4">
                <a href={site.phoneHref} className="font-semibold">
                  {site.phone}
                </a>
                <br />
                <a
                  href={`mailto:${site.email}`}
                  className="text-ink-mute underline underline-offset-4"
                >
                  {site.email}
                </a>
              </p>
              <Link
                href={site.reserveUrl}
                className="micro mt-5 inline-flex bg-oxblood px-7 py-3.5 text-bone transition-colors duration-[var(--dur-micro)] hover:bg-[#8d343d]"
              >
                Reserve a table
              </Link>
            </Reveal>
          </div>

          <Reveal className="pt-14">
            <h2 className="display text-[clamp(1.8rem,3.2vw,2.6rem)]">
              Good to know
            </h2>
            <dl className="mt-8 divide-y divide-rule border-y border-rule">
              {faqs.map((f) => (
                <div key={f.q} className="grid gap-2 py-6 md:grid-cols-[0.9fr_1.4fr] md:gap-8">
                  <dt className="font-semibold">{f.q}</dt>
                  <dd className="text-sm leading-relaxed text-ink-mute">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
