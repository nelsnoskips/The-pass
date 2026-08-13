import Link from "next/link";
import { Facebook, Instagram, MapPin, Plus } from "lucide-react";
import { hours, site } from "@/lib/site";
import { Logotype } from "@/components/ui/Brand";
import { Deckle, InkSplatter } from "@/components/ui/Artwork";
import { NewsletterForm } from "@/components/site/NewsletterForm";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink text-bone">
      <Deckle edge="top" variant={2} className="text-paper" />
      <InkSplatter
        variant="spray"
        opacity={10}
        className="top-6 left-[38%] hidden h-36 w-36 text-bone lg:block"
      />

      {/* Oversized seal watermark — secondary texture, blueprint §05. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -bottom-20 w-[380px] opacity-[0.07] select-none"
      >
        <Logotype knockout />
      </div>

      <div className="relative mx-auto grid max-w-[1400px] gap-10 px-6 py-16 md:px-10 lg:grid-cols-[1.1fr_1fr_0.8fr_1.4fr_auto] lg:items-start lg:gap-12">
        <div>
          <h2 className="micro mb-4 flex items-center gap-2 text-signal">
            <MapPin size={14} aria-hidden /> Location
          </h2>
          <address className="text-sm leading-relaxed text-bone/75 not-italic">
            <a
              href={site.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-bone"
            >
              {site.address.street}
              <br />
              {site.address.city}, {site.address.state} {site.address.zip}
            </a>
            <br />
            <a
              href={site.phoneHref}
              className="mt-2 inline-block font-semibold text-bone"
            >
              {site.phone}
            </a>
          </address>
        </div>

        <div>
          <h2 className="micro mb-4">Hours</h2>
          <dl className="space-y-1.5 text-sm text-bone/75">
            {hours.map((h) => (
              <div key={h.days} className="flex gap-6">
                <dt className="w-20 shrink-0">{h.days}</dt>
                <dd>{h.time}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h2 className="micro mb-4">Follow Us</h2>
          <div className="flex gap-2">
            {[
              { href: site.social.instagram, label: "Instagram", Icon: Instagram },
              { href: site.social.facebook, label: "Facebook", Icon: Facebook },
            ].map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center border border-bone/25 transition-colors duration-[var(--dur-micro)] hover:border-bone hover:bg-bone hover:text-ink"
              >
                <span className="sr-only">{label}</span>
                <Icon size={16} aria-hidden />
              </a>
            ))}
            <Link
              href="/happenings"
              className="inline-flex h-9 w-9 items-center justify-center border border-bone/25 transition-colors duration-[var(--dur-micro)] hover:border-bone hover:bg-bone hover:text-ink"
            >
              <span className="sr-only">More ways to keep up</span>
              <Plus size={16} aria-hidden />
            </Link>
          </div>
        </div>

        <div>
          <h2 className="micro mb-4">News &amp; Updates</h2>
          <p className="mb-3 text-sm text-bone/70">Be the first to know.</p>
          <NewsletterForm />
        </div>

        <div className="lg:pt-8">
          <Link
            href={site.reserveUrl}
            className="micro inline-flex w-full items-center justify-center border border-bone/50 px-10 py-5 text-bone transition-colors duration-[var(--dur-micro)] hover:bg-bone hover:text-ink lg:w-auto"
          >
            Reserve a table
          </Link>
        </div>
      </div>

      <div className="relative border-t border-rule-dark">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-6 py-6 text-xs text-bone/45 md:flex-row md:items-center md:justify-between md:px-10">
          <p>
            © {new Date().getFullYear()} {site.parent}. All rights reserved.
          </p>
          <nav aria-label="Legal" className="flex gap-6">
            <Link href="/visit" className="hover:text-bone">
              Accessibility
            </Link>
            <Link href="/visit" className="hover:text-bone">
              Privacy
            </Link>
            <Link href="/bottle-shop" className="hover:text-bone">
              Delivery policy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
